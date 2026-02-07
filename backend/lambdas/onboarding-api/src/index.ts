import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  initializePool,
  query,
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
  logRequest,
  validateUUID,
  ValidationError,
} from 'consultia-shared-nodejs';

// Route handlers
import { handleBusinessInfo } from './routes/business-info';
import { handleConfirmBusiness } from './routes/confirm-business';
import { handleSelectVoice } from './routes/voice-selection';
import { handleKnowledgeBaseUpload, getKnowledgeBaseStatus } from './routes/knowledge-base';
import { handleDeployAgent, getDeployStatus } from './routes/agent-deployment';
import { handleTestCall, getTestCallStatus } from './routes/test-call';
import { handleSelectPlan, handleCreateCheckout, handleCompletePayment } from './routes/payment';

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
  const requestId = event.requestContext.requestId;

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createCorsResponse();
  }

  // Log request
  logRequest(event, requestId);

  try {
    // Initialize database connection pool (cached across invocations)
    await initializePool();

    const { httpMethod, path } = event;

    // Validate customerId for all routes that include it in the path.
    // Public routes (/onboarding/business-info, /voices, /plans) skip this.
    const rawCustomerId = event.pathParameters?.customerId;
    if (rawCustomerId) {
      validateUUID(rawCustomerId, 'customerId');
    }

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
      if (!rawCustomerId) {
        return createErrorResponse('INVALID_REQUEST', 'customerId is required', 400, null, requestId);
      }

      // Query business_info for scraping results
      const biResult = await query(
        `SELECT scraped_data, services, hours, contacts, confirmed, scraped_at
         FROM business_info WHERE customer_id = $1`,
        [rawCustomerId]
      );

      if (biResult.rows.length === 0) {
        return createSuccessResponse({ status: 'pending', scraped_data: null }, 200, requestId);
      }

      const bi = biResult.rows[0];
      const sd = bi.scraped_data || {};

      // Check if scraper returned an error
      if (sd.error || sd.status === 'error') {
        return createSuccessResponse({
          status: 'complete',
          scraped_data: { error: sd.error || 'Scraping failed' },
        }, 200, requestId);
      }

      // Check if scraper populated real data (has business_name beyond initial website/country_code)
      if (sd.business_name) {
        return createSuccessResponse({
          status: 'complete',
          scraped_data: {
            business_name: sd.business_name,
            address: sd.address || '',
            phone: sd.phone || '',
            email: sd.email || '',
            services: bi.services || sd.services || [],
            hours: bi.hours || sd.hours || {},
            industry: sd.industry || '',
            description: sd.description || '',
            social_media: sd.social_media || {},
          },
        }, 200, requestId);
      }

      // Scraper hasn't finished yet — still only initial {website, country_code}
      return createSuccessResponse({ status: 'pending', scraped_data: null }, 200, requestId);
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
      if (!rawCustomerId) {
        return createErrorResponse('INVALID_REQUEST', 'customerId is required', 400, null, requestId);
      }
      return await getKnowledgeBaseStatus(rawCustomerId, requestId);
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
      if (!rawCustomerId) {
        return createErrorResponse('INVALID_REQUEST', 'customerId is required', 400, null, requestId);
      }
      return await getDeployStatus(rawCustomerId, requestId);
    }

    if (
      httpMethod === 'GET' &&
      path.match(/^\/onboarding\/[^/]+\/test-call\/[^/]+\/status$/)
    ) {
      const callSid = event.pathParameters?.callSid;
      if (!rawCustomerId || !callSid) {
        return createErrorResponse('INVALID_REQUEST', 'customerId and callSid are required', 400, null, requestId);
      }
      return await getTestCallStatus(rawCustomerId, callSid, requestId);
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
        [
          {
            id: 'plan_starter',
            name: 'Starter',
            tier: 'starter',
            minutes_included: 150,
            price_monthly: 29,
            price_yearly: 290,
            features: ['150 minutos/mes', 'Agente AI personalizado', 'Número de teléfono dedicado', 'Soporte por email'],
          },
          {
            id: 'plan_professional',
            name: 'Professional',
            tier: 'professional',
            minutes_included: 300,
            price_monthly: 79,
            price_yearly: 790,
            features: ['300 minutos/mes', 'Agente AI personalizado', 'Número de teléfono dedicado', 'Base de conocimiento avanzada', 'Analíticas detalladas', 'Soporte prioritario'],
          },
          {
            id: 'plan_enterprise',
            name: 'Enterprise',
            tier: 'enterprise',
            minutes_included: 750,
            price_monthly: 199,
            price_yearly: 1990,
            features: ['750 minutos/mes', 'Agente AI personalizado', 'Número de teléfono dedicado', 'Base de conocimiento ilimitada', 'Analíticas avanzadas', 'Soporte 24/7', 'API access'],
          },
        ],
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
      path.match(/^\/onboarding\/[^/]+\/create-checkout$/)
    ) {
      return await handleCreateCheckout(event, requestId);
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
    if (error instanceof ValidationError) {
      return createErrorResponse('VALIDATION_ERROR', error.message, 400, null, requestId);
    }

    console.error('[Lambda Error]', { requestId, message: error.message });

    return createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500,
      null,
      requestId
    );
  }
};
