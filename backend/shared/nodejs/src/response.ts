import { ApiResponse } from './types';

/**
 * Create standardized success response for API Gateway
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200,
  requestId?: string
): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'https://consultia.es',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    },
    body: JSON.stringify(response),
  };
}

/**
 * Create standardized error response for API Gateway
 */
export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any,
  requestId?: string
): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'https://consultia.es',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    },
    body: JSON.stringify(response),
  };
}

/**
 * Handle CORS preflight requests
 */
export function createCorsResponse(): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'https://consultia.es',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    },
    body: '',
  };
}

/**
 * Parse and validate JSON body from API Gateway event
 */
export function parseBody<T>(body: string | null): T {
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
 * Extract customer ID from Cognito authorizer context
 */
export function getCustomerIdFromAuth(event: any): string {
  const cognitoSub = event.requestContext?.authorizer?.claims?.sub;

  if (!cognitoSub) {
    throw new Error('No Cognito user ID found in request context');
  }

  return cognitoSub;
}

/**
 * Extract customer ID from path parameters
 */
export function getCustomerIdFromPath(event: any): string {
  const customerId = event.pathParameters?.customerId;

  if (!customerId) {
    throw new Error('customerId not found in path parameters');
  }

  return customerId;
}

/**
 * Log request for debugging
 */
export function logRequest(event: any): void {
  console.log('[API Request]', {
    method: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    requestId: event.requestContext?.requestId,
    sourceIp: event.requestContext?.identity?.sourceIp,
  });
}
