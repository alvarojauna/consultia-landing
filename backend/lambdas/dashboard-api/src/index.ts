import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  initializePool,
  createErrorResponse,
  createCorsResponse,
  logRequest,
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

  logRequest(event);

  try {
    await initializePool();

    const { httpMethod, path } = event;
    const customerId = event.pathParameters?.customerId;

    if (!customerId) {
      return createErrorResponse('INVALID_REQUEST', 'customerId is required', 400, null, requestId);
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
    console.error('[Dashboard Error]', error);
    return createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      error.message || 'An unexpected error occurred',
      500,
      null,
      requestId
    );
  }
};
