import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TwilioCallStatusWebhook } from 'consultia-shared-nodejs';
import { validateTwilioSignature, parseTwilioBody } from './validate-signature';
import { handleCallStatus, handleTestCallStatus } from './call-status';
import { handleVoiceWebhook } from './voice-handler';

/**
 * Twilio Webhook Lambda Handler
 *
 * Routes:
 *   POST /webhooks/twilio/call-status                  - General call status updates
 *   POST /webhooks/twilio/test-call-status/:customerId - Test call status (Step 5)
 *   POST /webhooks/twilio/voice/:customerId            - Voice webhook for outbound calls
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext?.requestId || 'unknown';

  console.log('[Twilio Webhook]', {
    path: event.path,
    method: event.httpMethod,
    requestId,
  });

  try {
    // Parse the URL-encoded body
    const params = parseTwilioBody(event.body || '');

    // Validate Twilio signature
    const signature = event.headers['X-Twilio-Signature'] || event.headers['x-twilio-signature'] || '';
    const webhookUrl = `${process.env.API_BASE_URL}${event.path}`;

    console.log('[Twilio Webhook] Validating signature', {
      hasSignature: !!signature,
      webhookUrl,
      apiBaseUrl: process.env.API_BASE_URL,
    });

    const isValid = await validateTwilioSignature(signature, webhookUrl, params);

    console.log('[Twilio Webhook] Signature validation result', { isValid });

    if (!isValid) {
      console.error('[Twilio Webhook] Invalid signature', {
        path: event.path,
        signature: signature.substring(0, 10) + '...',
        webhookUrl,
      });

      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid Twilio signature' }),
      };
    }

    const twilioData = params as unknown as TwilioCallStatusWebhook;

    // Route based on path
    // Voice webhook for outbound calls - returns TwiML
    if (event.path.includes('/voice/')) {
      // Extract customerId from path: /webhooks/twilio/voice/{customerId}
      const pathMatch = event.path.match(/\/voice\/([a-f0-9-]+)/i);
      const customerId = pathMatch ? pathMatch[1] : null;

      console.log('[Twilio Webhook] Voice route matched', {
        customerId,
        path: event.path,
        pathParameters: event.pathParameters,
      });

      if (!customerId) {
        console.error('[Twilio Webhook] Missing customerId in path');
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing customerId' }),
        };
      }

      // Voice handler returns its own response with TwiML
      console.log('[Twilio Webhook] Calling handleVoiceWebhook');
      const voiceResult = await handleVoiceWebhook(customerId, params as any);
      console.log('[Twilio Webhook] Voice handler returned', {
        statusCode: voiceResult.statusCode,
        bodyLength: voiceResult.body?.length,
      });
      return voiceResult;
    }

    if (event.path.includes('/test-call-status/')) {
      // Test call status: /webhooks/twilio/test-call-status/{customerId}
      // Extract customerId from path since we use proxy+ integration
      const pathMatch = event.path.match(/\/test-call-status\/([a-f0-9-]+)/i);
      const customerId = pathMatch ? pathMatch[1] : null;

      if (!customerId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing customerId' }),
        };
      }

      await handleTestCallStatus(customerId, twilioData);
    } else if (event.path.includes('/call-status')) {
      // General call status
      await handleCallStatus(twilioData);
    } else {
      console.warn('[Twilio Webhook] Unknown path', event.path);
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unknown webhook path' }),
      };
    }

    // Twilio expects a 200 with TwiML or empty response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: '<Response/>',
    };
  } catch (error: any) {
    console.error('[Twilio Webhook Error]', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
}
