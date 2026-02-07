import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler as stripeHandler } from './stripe/index';
import { handler as twilioHandler } from './twilio/index';

/**
 * Unified Webhook Lambda Handler
 *
 * Routes:
 *   POST /webhooks/stripe/*   → Stripe webhook handler
 *   POST /webhooks/twilio/*   → Twilio webhook handler
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { path } = event;

  if (path.startsWith('/webhooks/stripe')) {
    return stripeHandler(event);
  }

  if (path.startsWith('/webhooks/twilio')) {
    return twilioHandler(event);
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: `Unknown webhook path: ${path}` }),
  };
};
