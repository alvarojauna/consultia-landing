"""
Lambda Function: Usage Tracker

Tracks call minutes consumed by each customer and reports overage
to Stripe metered billing.

Triggered by: SQS message from twilio-webhook when a call completes.

Flow:
1. Receive call completion data (customer_id, duration, call_sid)
2. Insert usage_records row
3. Check if customer has exceeded included minutes
4. If over quota, report overage to Stripe metered billing
"""

import json
import logging
import math
import os
import time
import boto3
import psycopg2
import stripe
from decimal import Decimal
from typing import Dict, Any, Optional, Tuple

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
secretsmanager = boto3.client('secretsmanager', region_name='eu-west-1')

# Database connection (reused across invocations)
db_conn = None

# Stripe client (initialized once)
stripe_initialized = False

# Cost per overage minute in EUR
OVERAGE_PRICE_PER_MINUTE = Decimal('0.15')

# Calls shorter than this are hangups/accidents and not billed
MIN_BILLABLE_DURATION_SECONDS = 3


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


def init_stripe():
    """Initialize Stripe with API key from Secrets Manager"""
    global stripe_initialized

    if stripe_initialized:
        return

    secret_name = os.environ.get('API_KEYS_SECRET_NAME', 'consultia/production/api-keys')

    try:
        response = secretsmanager.get_secret_value(SecretId=secret_name)
        secrets = json.loads(response['SecretString'])
        stripe.api_key = secrets['STRIPE_SECRET_KEY']
        stripe_initialized = True
        logger.info("[Stripe] Client initialized")

    except Exception as e:
        logger.error(f"[Stripe] Init error: {e}")
        raise


def get_subscription_info(customer_id: str) -> Optional[Dict[str, Any]]:
    """Get active subscription and current period usage for a customer"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get active subscription
    cursor.execute("""
        SELECT subscription_id, stripe_subscription_id, stripe_customer_id,
               plan_tier, minutes_included, current_period_start, current_period_end
        FROM subscriptions
        WHERE customer_id = %s AND status IN ('active', 'trialing')
        ORDER BY created_at DESC
        LIMIT 1
    """, (customer_id,))

    sub = cursor.fetchone()
    if not sub:
        cursor.close()
        return None

    subscription_id, stripe_sub_id, stripe_cust_id, plan_tier, minutes_included, period_start, period_end = sub

    # Get total minutes used in current billing period
    cursor.execute("""
        SELECT COALESCE(SUM(quantity), 0)
        FROM usage_records
        WHERE customer_id = %s
          AND billing_period_start = %s
          AND billing_period_end = %s
    """, (customer_id, period_start, period_end))

    total_used = cursor.fetchone()[0]
    cursor.close()

    return {
        'subscription_id': subscription_id,
        'stripe_subscription_id': stripe_sub_id,
        'stripe_customer_id': stripe_cust_id,
        'plan_tier': plan_tier,
        'minutes_included': minutes_included,
        'total_minutes_used': float(total_used),
        'period_start': period_start,
        'period_end': period_end,
    }


def get_metered_subscription_item(stripe_subscription_id: str) -> Optional[str]:
    """
    Find the metered subscription item ID for reporting usage to Stripe.
    The metered item is the one with usage_type='metered'.
    """
    init_stripe()

    try:
        subscription = stripe.Subscription.retrieve(
            stripe_subscription_id,
            expand=['items.data']
        )

        for item in subscription['items']['data']:
            price = item.get('price', {})
            if price.get('recurring', {}).get('usage_type') == 'metered':
                return item['id']

        logger.warning(f"[Stripe] No metered item found for {stripe_subscription_id}")
        return None

    except Exception as e:
        logger.error(f"[Stripe] Error fetching subscription items: {e}")
        return None


def record_usage(
    customer_id: str,
    agent_id: str,
    call_sid: str,
    duration_seconds: int,
    sub_info: Dict[str, Any]
) -> Tuple[str, float]:
    """
    Insert a usage_records row and return (usage_id, overage_minutes).

    Args:
        customer_id: Customer UUID
        agent_id: Agent UUID
        call_sid: Twilio call SID
        duration_seconds: Call duration in seconds
        sub_info: Subscription info dict

    Returns:
        Tuple of (usage_id, overage_minutes)
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Convert to minutes with 3 decimal precision
    quantity_minutes = round(duration_seconds / 60.0, 3)
    minutes_included = sub_info['minutes_included']

    # Use atomic CTE to prevent race conditions when concurrent calls
    # arrive — the SUM is computed inside the INSERT so another concurrent
    # insert will block on the row lock until this transaction commits.
    cursor.execute("""
        WITH current_usage AS (
            SELECT COALESCE(SUM(quantity), 0) AS total_used
            FROM usage_records
            WHERE customer_id = %s
              AND billing_period_start = %s
              AND billing_period_end = %s
            FOR UPDATE
        ),
        overage_calc AS (
            SELECT
                CASE
                    WHEN (cu.total_used + %s) > %s THEN
                        CASE
                            WHEN cu.total_used >= %s THEN %s
                            ELSE ROUND(((cu.total_used + %s) - %s)::numeric, 3)
                        END
                    ELSE 0.0
                END AS overage_minutes
            FROM current_usage cu
        )
        INSERT INTO usage_records (
            subscription_id, customer_id, agent_id,
            usage_type, quantity, unit_price_eur, total_cost_eur,
            call_sid, billing_period_start, billing_period_end
        )
        SELECT %s, %s, %s, 'call_minutes', %s,
               CASE WHEN oc.overage_minutes > 0 THEN %s ELSE 0 END,
               ROUND((oc.overage_minutes * %s)::numeric, 2),
               %s, %s, %s
        FROM overage_calc oc
        RETURNING usage_id, total_cost_eur
    """, (
        # current_usage CTE
        customer_id, sub_info['period_start'], sub_info['period_end'],
        # overage_calc CTE
        quantity_minutes, minutes_included,  # total + qty > included?
        minutes_included, quantity_minutes,  # already over: full qty
        quantity_minutes, minutes_included,  # crosses threshold: partial
        # INSERT values
        sub_info['subscription_id'], customer_id, agent_id,
        quantity_minutes,
        float(OVERAGE_PRICE_PER_MINUTE),  # unit_price if overage
        float(OVERAGE_PRICE_PER_MINUTE),  # for cost calc
        call_sid, sub_info['period_start'], sub_info['period_end'],
    ))

    row = cursor.fetchone()
    usage_id = row[0]
    total_cost = float(row[1])
    conn.commit()

    # Calculate overage for Stripe reporting (from returned cost)
    overage_minutes = round(total_cost / float(OVERAGE_PRICE_PER_MINUTE), 3) if total_cost > 0 else 0.0
    cursor.close()

    logger.info(f"[Usage] Recorded {quantity_minutes} min for {customer_id} "
                f"(overage: {overage_minutes} min, cost: €{total_cost})")

    return str(usage_id), overage_minutes


def report_overage_to_stripe(
    stripe_subscription_id: str,
    overage_minutes: float,
    usage_id: str
) -> Optional[str]:
    """
    Report overage minutes to Stripe metered billing.

    Stripe accumulates usage records and includes them in the next invoice.
    We round up to the nearest minute for billing.
    """
    if overage_minutes <= 0:
        return None

    init_stripe()

    metered_item_id = get_metered_subscription_item(stripe_subscription_id)
    if not metered_item_id:
        logger.error("[Stripe] Cannot report usage — no metered subscription item")
        return None

    # Round up to nearest minute for billing
    billable_minutes = math.ceil(overage_minutes)

    try:
        usage_record = stripe.SubscriptionItem.create_usage_record(
            metered_item_id,
            quantity=billable_minutes,
            timestamp=int(time.time()),
            action='increment',
        )

        stripe_usage_id = usage_record.get('id')

        # Update our record with Stripe's usage record ID
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE usage_records SET stripe_usage_record_id = %s WHERE usage_id = %s",
            (stripe_usage_id, usage_id)
        )
        conn.commit()
        cursor.close()

        logger.info(f"[Stripe] Reported {billable_minutes} overage min "
                     f"(raw: {overage_minutes}), record: {stripe_usage_id}")

        return stripe_usage_id

    except Exception as e:
        logger.error(f"[Stripe] Error reporting usage: {e}")
        return None


def lambda_handler(event, context):
    """
    Main Lambda handler.

    Triggered by SQS message with:
    {
        "customer_id": "uuid",
        "agent_id": "uuid",
        "call_sid": "CA...",
        "duration_seconds": 187,
        "caller_number": "+34...",
        "direction": "inbound",
        "recording_url": "https://..."
    }
    """
    logger.info(f"[Lambda] Event: {json.dumps(event)}")

    try:
        for record in event.get('Records', []):
            message = json.loads(record['body'])

            customer_id = message['customer_id']
            agent_id = message['agent_id']
            call_sid = message['call_sid']
            duration_seconds = int(message['duration_seconds'])

            logger.info(f"[Usage] Processing call {call_sid}: "
                        f"{duration_seconds}s for customer {customer_id}")

            # Skip very short calls (likely hangups/accidents)
            if duration_seconds < MIN_BILLABLE_DURATION_SECONDS:
                logger.info(f"[Usage] Skipping short call ({duration_seconds}s)")
                continue

            # Get subscription info
            sub_info = get_subscription_info(customer_id)

            if not sub_info:
                logger.warning(f"[Usage] No active subscription for {customer_id}, skipping billing")
                continue

            # Record usage in database
            usage_id, overage_minutes = record_usage(
                customer_id, agent_id, call_sid, duration_seconds, sub_info
            )

            # Report overage to Stripe if over quota
            if overage_minutes > 0:
                report_overage_to_stripe(
                    sub_info['stripe_subscription_id'],
                    overage_minutes,
                    usage_id
                )

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Usage tracking completed'})
        }

    except Exception as e:
        logger.error(f"[Lambda] Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
