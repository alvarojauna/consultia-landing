import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  initializePool,
  createErrorResponse,
  createCorsResponse,
  logRequest,
  validateUUID,
  getCustomerIdFromAuth,
  ValidationError,
} from 'consultia-shared-nodejs';

import { getOverview } from './routes/overview';
import { getCalls } from './routes/calls';
import { getAgentSettings, updateAgentSettings, pauseAgent, resumeAgent } from './routes/agent-settings';
import { getBilling } from './routes/billing';

/**
 * Dashboard API Lambda handler
 *
 * Routes:
 * GET    /dashboard/:customerId/overview
 * GET    /dashboard/:customerId/calls
 * GET    /dashboard/:customerId/agent
 * PATCH  /dashboard/:customerId/agent
 * POST   /dashboard/:customerId/agent/pause
 * POST   /dashboard/:customerId/agent/resume
 * GET    /dashboard/:customerId/billing
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  if (event.httpMethod === 'OPTIONS') {
    return createCorsResponse();
  }

  logRequest(event, requestId);

  try {
    await initializePool();

    const { httpMethod, path } = event;
    const rawCustomerId = event.pathParameters?.customerId;

    if (!rawCustomerId) {
      return createErrorResponse('INVALID_REQUEST', 'customerId is required', 400, null, requestId);
    }

    // Validate customerId is a proper UUID to prevent path traversal / injection
    const customerId = validateUUID(rawCustomerId, 'customerId');

    // Authorization: verify the authenticated user owns this customerId
    const authUserId = getCustomerIdFromAuth(event);
    if (authUserId !== customerId) {
      return createErrorResponse('FORBIDDEN', 'You do not have access to this resource', 403, null, requestId);
    }

    // ========================================
    // Overview
    // ========================================
    if (httpMethod === 'GET' && path.match(/^\/dashboard\/[^/]+\/overview$/)) {
      return await getOverview(customerId, requestId);
    }

    // ========================================
    // Call History
    // ========================================
    if (httpMethod === 'GET' && path.match(/^\/dashboard\/[^/]+\/calls$/)) {
      const query = event.queryStringParameters || {};
      return await getCalls(customerId, query, requestId);
    }

    // ========================================
    // Agent Settings
    // ========================================
    if (httpMethod === 'GET' && path.match(/^\/dashboard\/[^/]+\/agent$/)) {
      return await getAgentSettings(customerId, requestId);
    }

    if (httpMethod === 'PATCH' && path.match(/^\/dashboard\/[^/]+\/agent$/)) {
      return await updateAgentSettings(customerId, event.body, requestId);
    }

    if (httpMethod === 'POST' && path.match(/^\/dashboard\/[^/]+\/agent\/pause$/)) {
      return await pauseAgent(customerId, requestId);
    }

    if (httpMethod === 'POST' && path.match(/^\/dashboard\/[^/]+\/agent\/resume$/)) {
      return await resumeAgent(customerId, requestId);
    }

    // ========================================
    // Billing
    // ========================================
    if (httpMethod === 'GET' && path.match(/^\/dashboard\/[^/]+\/billing$/)) {
      return await getBilling(customerId, requestId);
    }

    return createErrorResponse('ROUTE_NOT_FOUND', `Route not found: ${httpMethod} ${path}`, 404, null, requestId);
  } catch (error: any) {
    // Return 400 for validation errors, 500 for everything else
    if (error instanceof ValidationError) {
      return createErrorResponse('VALIDATION_ERROR', error.message, 400, null, requestId);
    }

    console.error('[Dashboard Error]', { requestId, message: error.message });
    return createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500,
      null,
      requestId
    );
  }
};
