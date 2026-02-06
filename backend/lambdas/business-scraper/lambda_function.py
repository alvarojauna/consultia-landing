"""
Lambda Function: Business Scraper

Scrapes a business website and uses Amazon Bedrock (Claude) to extract
structured business information. LLM-first approach — no HTML parsing
libraries, the LLM interprets the raw HTML directly.

Triggered by: SQS message from onboarding-api (Step 1)

Flow:
1. Receive SQS message with { customer_id, website, job_id }
2. Fetch website HTML with requests
3. Send HTML to Bedrock Claude 3.5 Sonnet for extraction
4. Store structured data in business_info table
"""

import json
import logging
import os
import re
import boto3
import requests
import psycopg2
from typing import Dict, Any, Optional

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
bedrock = boto3.client('bedrock-runtime', region_name='eu-west-1')
secretsmanager = boto3.client('secretsmanager', region_name='eu-west-1')

# Database connection (reused across invocations)
db_conn = None

# HTTP session (reused for connection pooling)
http_session = None

# Maximum HTML size to send to the LLM (chars)
MAX_HTML_LENGTH = 80000


def get_db_connection():
    """Get PostgreSQL connection (with caching)"""
    global db_conn

    if db_conn and not db_conn.closed:
        return db_conn

    secret_name = os.environ.get('DB_SECRET_NAME', 'consultia/database/credentials')

    try:
        response = secretsmanager.get_secret_value(SecretId=secret_name)
        secret = json.loads(response['SecretString'])

        db_conn = psycopg2.connect(
            host=secret['host'],
            port=secret.get('port', 5432),
            database=secret.get('dbname', 'consultia'),
            user=secret['username'],
            password=secret['password'],
            sslmode='require'
        )

        logger.info("[DB] Connected to PostgreSQL")
        return db_conn

    except Exception as e:
        logger.error(f"[DB] Connection error: {e}")
        raise


def get_http_session() -> requests.Session:
    """Get HTTP session with sensible defaults"""
    global http_session

    if http_session is None:
        http_session = requests.Session()
        http_session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; ConsultIA Bot/1.0; +https://consultia.es)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.5',
        })

    return http_session


def strip_html_noise(html: str) -> str:
    """
    Remove scripts, styles, and excessive whitespace to reduce token usage.
    Keeps the actual content tags that the LLM needs.
    """
    # Remove script tags and content
    html = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', html, flags=re.IGNORECASE)
    # Remove style tags and content
    html = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', html, flags=re.IGNORECASE)
    # Remove HTML comments
    html = re.sub(r'<!--[\s\S]*?-->', '', html)
    # Remove SVG blocks
    html = re.sub(r'<svg[^>]*>[\s\S]*?</svg>', '', html, flags=re.IGNORECASE)
    # Remove noscript
    html = re.sub(r'<noscript[^>]*>[\s\S]*?</noscript>', '', html, flags=re.IGNORECASE)
    # Collapse multiple whitespace/newlines
    html = re.sub(r'\s+', ' ', html)
    # Remove data attributes to save tokens
    html = re.sub(r'\s+data-[\w-]+="[^"]*"', '', html)

    return html.strip()


def fetch_website(url: str) -> str:
    """
    Fetch website HTML content.

    Args:
        url: The URL to fetch

    Returns:
        Cleaned HTML string

    Raises:
        Exception on network errors or non-200 responses
    """
    session = get_http_session()

    # Normalize URL
    if not url.startswith(('http://', 'https://')):
        url = f'https://{url}'

    logger.info(f"[Scraper] Fetching {url}")

    response = session.get(url, timeout=20, allow_redirects=True)
    response.raise_for_status()

    # Get encoding from response or default to utf-8
    response.encoding = response.apparent_encoding or 'utf-8'
    raw_html = response.text

    logger.info(f"[Scraper] Fetched {len(raw_html)} chars from {response.url}")

    # Strip noise and truncate
    cleaned = strip_html_noise(raw_html)

    if len(cleaned) > MAX_HTML_LENGTH:
        logger.info(f"[Scraper] Truncating HTML from {len(cleaned)} to {MAX_HTML_LENGTH} chars")
        cleaned = cleaned[:MAX_HTML_LENGTH]

    return cleaned


def extract_business_info_with_bedrock(html: str, website_url: str) -> Dict[str, Any]:
    """
    Use Amazon Bedrock Claude 3.5 Sonnet to extract structured business
    information from raw HTML.

    Args:
        html: Cleaned HTML content
        website_url: Original URL for context

    Returns:
        Structured business data as dict
    """
    prompt = f"""Eres un asistente experto en extraer información de negocios desde páginas web.

Analiza el siguiente HTML de la web {website_url} y extrae toda la información del negocio.

<html_content>
{html}
</html_content>

Extrae la siguiente información (devuelve null si no está disponible):

1. "business_name": Nombre del negocio
2. "industry": Tipo de negocio/industria (ej: veterinary, dental, hair_salon, restaurant, auto_repair, etc.)
3. "address": Dirección física completa
4. "city": Ciudad
5. "postal_code": Código postal
6. "country": País (por defecto "España")
7. "phone": Teléfono principal
8. "email": Email de contacto
9. "services": Lista de servicios ofrecidos (array de strings, máximo 20)
10. "hours": Horarios de atención (objeto con claves para cada día o rango: "mon-fri", "sat", "sun", etc.)
11. "description": Breve descripción del negocio (1-2 frases)
12. "additional_phones": Otros teléfonos (array)
13. "additional_emails": Otros emails (array)
14. "social_media": Redes sociales encontradas (objeto con claves: facebook, instagram, twitter, etc.)

IMPORTANTE:
- Responde SOLO con JSON válido, sin texto adicional.
- Si no encuentras un dato, usa null.
- Los servicios deben ser strings cortos y descriptivos.
- Los horarios deben usar formato 24h (ej: "09:00-20:00").
- Si el sitio está en español, mantén los datos en español."""

    model_id = 'anthropic.claude-3-5-sonnet-20241022-v2:0'

    request_body = {
        'anthropic_version': 'bedrock-2023-05-31',
        'max_tokens': 4096,
        'messages': [
            {
                'role': 'user',
                'content': prompt
            }
        ],
        'temperature': 0.0
    }

    logger.info(f"[Bedrock] Calling {model_id} for business extraction")

    response = bedrock.invoke_model(
        modelId=model_id,
        body=json.dumps(request_body)
    )

    response_body = json.loads(response['body'].read())
    content_blocks = response_body.get('content', [])

    if not content_blocks:
        raise ValueError("No content in Bedrock response")

    response_text = content_blocks[0].get('text', '')

    # Try to extract JSON from the response (handle potential markdown fencing)
    json_match = re.search(r'\{[\s\S]*\}', response_text)
    if json_match:
        response_text = json_match.group(0)

    structured_data = json.loads(response_text)

    logger.info(f"[Bedrock] Extracted business info: {list(structured_data.keys())}")

    return structured_data


def update_business_info(customer_id: str, scraped_data: Dict[str, Any], status: str = 'complete', error_msg: Optional[str] = None):
    """Update business_info record with scraped data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build the update based on extracted fields
        services = scraped_data.get('services')
        hours = scraped_data.get('hours')
        contacts = {
            'emails': list(filter(None, [scraped_data.get('email')] + (scraped_data.get('additional_emails') or []))),
            'phones': list(filter(None, [scraped_data.get('phone')] + (scraped_data.get('additional_phones') or []))),
        }
        locations = [{
            'address': scraped_data.get('address'),
            'city': scraped_data.get('city'),
            'postal_code': scraped_data.get('postal_code'),
            'country': scraped_data.get('country', 'España'),
        }] if scraped_data.get('address') else None

        cursor.execute("""
            UPDATE business_info
            SET scraped_data = %s,
                services = %s,
                hours = %s,
                contacts = %s,
                locations = %s,
                scraped_at = CURRENT_TIMESTAMP
            WHERE customer_id = %s
        """, (
            json.dumps(scraped_data),
            services,
            json.dumps(hours) if hours else None,
            json.dumps(contacts),
            [json.dumps(loc) for loc in locations] if locations else None,
            customer_id
        ))

        # Also update customer record with key business info
        cursor.execute("""
            UPDATE customers
            SET business_name = COALESCE(%s, business_name),
                business_address = COALESCE(%s, business_address),
                business_phone = COALESCE(%s, business_phone),
                industry = COALESCE(%s, industry)
            WHERE customer_id = %s
        """, (
            scraped_data.get('business_name'),
            scraped_data.get('address'),
            scraped_data.get('phone'),
            scraped_data.get('industry'),
            customer_id
        ))

        conn.commit()
        cursor.close()

        logger.info(f"[DB] Updated business_info for customer {customer_id}")

    except Exception as e:
        logger.error(f"[DB] Error updating business_info: {e}")
        if db_conn and not db_conn.closed:
            db_conn.rollback()
        raise


def update_scraping_error(customer_id: str, error_message: str):
    """Mark scraping as failed"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE business_info
            SET scraped_data = %s,
                scraped_at = CURRENT_TIMESTAMP
            WHERE customer_id = %s
        """, (
            json.dumps({'error': error_message, 'status': 'error'}),
            customer_id
        ))

        conn.commit()
        cursor.close()

        logger.info(f"[DB] Marked scraping as failed for customer {customer_id}")

    except Exception as e:
        logger.error(f"[DB] Error updating scraping error: {e}")
        if db_conn and not db_conn.closed:
            db_conn.rollback()


def lambda_handler(event, context):
    """
    Main Lambda handler

    Triggered by SQS message with:
    {
        "customer_id": "uuid",
        "website": "https://example.com",
        "job_id": "scrape_uuid_timestamp"
    }
    """
    logger.info(f"[Lambda] Event: {json.dumps(event)}")

    try:
        for record in event.get('Records', []):
            message = json.loads(record['body'])
            customer_id = message['customer_id']
            website = message['website']
            job_id = message.get('job_id', 'unknown')

            logger.info(f"[Scraper] Processing job {job_id} for customer {customer_id}: {website}")

            try:
                # Step 1: Fetch the website HTML
                html = fetch_website(website)

                # Step 2: Extract business info using Bedrock LLM
                business_data = extract_business_info_with_bedrock(html, website)

                # Step 3: Store in database
                update_business_info(customer_id, business_data)

                logger.info(f"[Scraper] Successfully scraped {website} for customer {customer_id}")

            except requests.exceptions.Timeout:
                error_msg = f"Timeout fetching {website} (20s limit)"
                logger.error(f"[Scraper] {error_msg}")
                update_scraping_error(customer_id, error_msg)

            except requests.exceptions.SSLError as e:
                error_msg = f"SSL error for {website}: {str(e)[:200]}"
                logger.error(f"[Scraper] {error_msg}")
                update_scraping_error(customer_id, error_msg)

            except requests.exceptions.ConnectionError as e:
                error_msg = f"Connection error for {website}: {str(e)[:200]}"
                logger.error(f"[Scraper] {error_msg}")
                update_scraping_error(customer_id, error_msg)

            except requests.exceptions.HTTPError as e:
                error_msg = f"HTTP {e.response.status_code} for {website}"
                logger.error(f"[Scraper] {error_msg}")
                update_scraping_error(customer_id, error_msg)

            except json.JSONDecodeError as e:
                error_msg = f"Failed to parse LLM response as JSON: {str(e)[:200]}"
                logger.error(f"[Scraper] {error_msg}")
                update_scraping_error(customer_id, error_msg)

            except Exception as e:
                error_msg = f"Unexpected error: {str(e)[:200]}"
                logger.error(f"[Scraper] {error_msg}")
                update_scraping_error(customer_id, error_msg)

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Scraping completed'})
        }

    except Exception as e:
        logger.error(f"[Lambda] Fatal error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
