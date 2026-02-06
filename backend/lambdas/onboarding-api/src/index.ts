import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  initializePool,
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
  logRequest,
} from 'consultia-shared-nodejs';

// Route handlers
import { handleBusinessInfo } from './routes/business-info';
import { handleConfirmBusiness } from './routes/confirm-business';
import { handleSelectVoice } from './routes/voice-selection';
import { handleKnowledgeBaseUpload, getKnowledgeBaseStatus } from './routes/knowledge-base';
import { handleDeployAgent, getDeployStatus } from './routes/agent-deployment';
import { handleTestCall, getTestCallStatus } from './routes/test-call';
import { handleSelectPlan, handleCompletePayment } from './routes/payment';

/**
 * Main Lambda handler for onboarding API
 *
 * Routes:
 * POST   /onboarding/business-info
 * GET    /onboarding/:customerId/business-status
 * POST   /onboarding/:customerId/confirm-business
 *
 * GET    /voices
 * POST   /onboarding/:customerId/select-voice
 *
 * POST   /onboarding/:customerId/knowledge-base/upload
 * POST   /onboarding/:customerId/knowledge-base/text
 * GET    /onboarding/:customerId/knowledge-base/status
 *
 * POST   /onboarding/:customerId/deploy-agent
 * GET    /onboarding/:customerId/deploy-status
 * POST   /onboarding/:customerId/test-call
 * GET    /onboarding/:customerId/test-call/:callSid/status
 *
 * GET    /plans
 * POST   /onboarding/:customerId/select-plan
 * POST   /onboarding/:customerId/complete-payment
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createCorsResponse();
  }

  // Log request
  logRequest(event);

  try {
    // Initialize database connection pool (cached across invocations)
    await initializePool();

    const { httpMethod, path } = event;
    const requestId = event.requestContext.requestId;

    // Route to appropriate handler
    // ========================================
    // Step 1: Business Information
    // ========================================
    if (httpMethod === 'POST' && path === '/onboarding/business-info') {
      return await handleBusinessInfo(event, requestId);
    }

    if (
      httpMethod === 'GET' &&
      path.match(/^\/onboarding\/[^/]+\/business-status$/)
    ) {
      const customerId = event.pathParameters?.customerId;
      if (!customerId) {
        return createErrorResponse(
          'INVALID_REQUEST',
          'customerId is required',
          400,
          null,
          requestId
        );
      }
      // TODO: Implement getBusinessStatus handler
      return createSuccessResponse(
        { status: 'pending', message: 'Not implemented yet' },
        200,
        requestId
      );
    }

    // ========================================
    // Step 2: Confirm Business
    // ========================================
    if (
      httpMethod === 'POST' &&
      path.match(/^\/onboarding\/[^/]+\/confirm-business$/)
    ) {
      return await handleConfirmBusiness(event, requestId);
    }

    // ========================================
    // Step 3: Voice Selection
    // ========================================
    if (httpMethod === 'GET' && path === '/voices') {
      // Public endpoint - no auth required
      return await handleSelectVoice(event, requestId);
    }

    if (
      httpMethod === 'POST' &&
      path.match(/^\/onboarding\/[^/]+\/select-voice$/)
    ) {
      return await handleSelectVoice(event, requestId);
    }

    // ========================================
    // Step 4: Knowledge Base Upload
    // ========================================
    if (
      httpMethod === 'POST' &&
      path.match(/^\/onboarding\/[^/]+\/knowledge-base\/upload$/)
    ) {
      return await handleKnowledgeBaseUpload(event, requestId);
    }

    if (
      httpMethod === 'POST' &&
      path.match(/^\/onboarding\/[^/]+\/knowledge-base\/text$/)
    ) {
      return await handleKnowledgeBaseUpload(event, requestId);
    }

    if (
      httpMethod === 'GET' &&
      path.match(/^\/onboarding\/[^/]+\/knowledge-base\/status$/)
    ) {
      const customerId = event.pathParameters?.customerId;
      if (!customerId) {
        return createErrorResponse(
          'INVALID_REQUEST',
          'customerId is required',
          400,
          null,
          requestId
        );
      }
      return await getKnowledgeBaseStatus(customerId, requestId);
    }

    // ========================================
    // Step 5: Deploy Agent & Test Call
    // ========================================
    if (
      httpMethod === 'POST' &&
      path.match(/^\/onboarding\/[^/]+\/deploy-agent$/)
    ) {
      return await handleDeployAgent(event, requestId);
    }

    if (
      httpMethod === 'GET' &&
      path.match(/^\/onboarding\/[^/]+\/deploy-status$/)
    ) {
      const customerId = event.pathParameters?.customerId;
      if (!customerId) {
        return createErrorResponse(
          'INVALID_REQUEST',
          'customerId is required',
          400,
          null,
          requestId
        );
      }
      return await getDeployStatus(customerId, requestId);
    }

    if (
      httpMethod === 'GET' &&
      path.match(/^\/onboarding\/[^/]+\/test-call\/[^/]+\/status$/)
    ) {
      const customerId = event.pathParameters?.customerId;
      const callSid = event.pathParameters?.callSid;
      if (!customerId || !callSid) {
        return createErrorResponse(
          'INVALID_REQUEST',
          'customerId and callSid are required',
          400,
          null,
          requestId
        );
      }
      return await getTestCallStatus(customerId, callSid, requestId);
    }

    if (
      httpMethod === 'POST' &&
      path.match(/^\/onboarding\/[^/]+\/test-call$/)
    ) {
      return await handleTestCall(event, requestId);
    }

    // ========================================
    // Step 6: Payment
    // ========================================
    if (httpMethod === 'GET' && path === '/plans') {
      // Public endpoint - return plan tiers
      return createSuccessResponse(
        {
          plans: [
            {
              tier: 'starter',
              minutes_included: 150,
              price_monthly_eur: 29,
              price_yearly_eur: 290,
            },
            {
              tier: 'professional',
              minutes_included: 300,
              price_monthly_eur: 79,
              price_yearly_eur: 790,
            },
            {
              tier: 'enterprise',
              minutes_included: 750,
              price_monthly_eur: 199,
              price_yearly_eur: 1990,
            },
          ],
        },
        200,
        requestId
      );
    }

    if (
      httpMethod === 'POST' &&
      path.match(/^\/onboarding\/[^/]+\/select-plan$/)
    ) {
      return await handleSelectPlan(event, requestId);
    }

    if (
      httpMethod === 'POST' &&
      path.match(/^\/onboarding\/[^/]+\/complete-payment$/)
    ) {
      return await handleCompletePayment(event, requestId);
    }

    // ========================================
    // Route not found
    // ========================================
    return createErrorResponse(
      'ROUTE_NOT_FOUND',
      `Route not found: ${httpMethod} ${path}`,
      404,
      null,
      requestId
    );
  } catch (error: any) {
    console.error('[Lambda Error]', error);

    return createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      error.message || 'An unexpected error occurred',
      500,
      { stack: error.stack },
      event.requestContext.requestId
    );
  }
};
