import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TwilioCallStatusWebhook } from 'consultia-shared-nodejs';
import { validateTwilioSignature, parseTwilioBody } from './validate-signature';
import { handleCallStatus, handleTestCallStatus } from './call-status';

/**
 * Twilio Webhook Lambda Handler
 *
 * Routes:
 *   POST /webhooks/twilio/call-status              - General call status updates
 *   POST /webhooks/twilio/test-call-status/:customerId - Test call status (Step 5)
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

    const isValid = await validateTwilioSignature(signature, webhookUrl, params);

    if (!isValid) {
      console.error('[Twilio Webhook] Invalid signature', {
        path: event.path,
        signature: signature.substring(0, 10) + '...',
      });

      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid Twilio signature' }),
      };
    }

    const twilioData = params as unknown as TwilioCallStatusWebhook;

    // Route based on path
    if (event.path.includes('/test-call-status/')) {
      // Test call status: /webhooks/twilio/test-call-status/:customerId
      const customerId = event.pathParameters?.customerId;

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
