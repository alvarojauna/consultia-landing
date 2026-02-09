import { APIGatewayProxyEvent } from 'aws-lambda';
import { getSecret } from './secrets';
import { createErrorResponse } from './response';
import { ValidationError } from './validation';

/**
 * Parse JSON body from API Gateway event.
 *
 * Handles base64-encoded bodies (event.isBase64Encoded).
 */
export function parseBody<T = any>(body: string | null, isBase64Encoded?: boolean): T {
  if (!body) {
    throw new ValidationError('Request body is empty');
  }

  let raw = isBase64Encoded
    ? Buffer.from(body, 'base64').toString('utf-8')
    : body;

  // Strip UTF-8 BOM if present
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[parseBody] Failed to parse JSON', {
      isBase64Encoded,
      bodyLength: body.length,
      rawLength: raw.length,
      rawPreview: raw.substring(0, 200),
      rawCharCodes: Array.from(raw.substring(0, 20)).map(c => c.charCodeAt(0)),
    });
    throw new ValidationError('Invalid JSON in request body');
  }
}

/**
 * Extract customer ID from path parameters
 */
export function getCustomerIdFromPath(event: APIGatewayProxyEvent): string {
  const customerId = event.pathParameters?.customerId;

  if (!customerId) {
    throw new Error('Customer ID not found in path parameters');
  }

  return customerId;
}

/**
 * Get API keys from AWS Secrets Manager
 */
export async function getApiKeys(): Promise<{
  STRIPE_SECRET_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  ELEVENLABS_API_KEY: string;
  ANTHROPIC_API_KEY?: string;
  TEST_PHONE_NUMBER?: string;
}> {
  const secretName = process.env.API_KEYS_SECRET_NAME || 'consultia/production/api-keys';
  return await getSecret(secretName);
}

/**
 * Create CORS response for OPTIONS requests
 */
export function createCorsResponse() {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    },
    body: '',
  };
}

/**
 * Log request information
 */
export function logRequest(event: APIGatewayProxyEvent, requestId: string): void {
  console.log('[Request]', {
    requestId,
    method: event.httpMethod,
    path: event.path,
    sourceIp: event.requestContext.identity.sourceIp,
    userAgent: event.requestContext.identity.userAgent,
  });
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields<T extends Record<string, any>>(
  body: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields = requiredFields.filter(field => !body[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
}

/**
 * Get user ID from JWT token (Cognito)
 */
export function getUserIdFromEvent(event: APIGatewayProxyEvent): string | null {
  try {
    const claims = event.requestContext.authorizer?.claims;
    return claims?.sub || null;
  } catch (error) {
    return null;
  }
}
