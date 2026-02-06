import { APIGatewayProxyEvent } from 'aws-lambda';
import { getSecret } from './secrets';
import { createErrorResponse } from './response';

/**
 * Parse JSON body from API Gateway event
 */
export function parseBody<T = any>(body: string | null): T {
  if (!body) {
    throw new Error('Request body is empty');
  }

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
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
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'https://consultia.es',
      'Access-Control-Allow-Credentials': 'true',
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
