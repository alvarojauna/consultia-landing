import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Stripe from 'stripe';
import { validateAndParseStripeEvent } from './validate-signature';
import {
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from './subscription-events';

/**
 * Stripe Webhook Lambda Handler
 *
 * Route: POST /webhooks/stripe/events
 *
 * Handles Stripe subscription lifecycle events:
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext?.requestId || 'unknown';

  console.log('[Stripe Webhook]', { requestId, path: event.path });

  try {
    // Stripe requires the raw body for signature validation
    const rawBody = event.body || '';
    const signature =
      event.headers['Stripe-Signature'] || event.headers['stripe-signature'] || '';

    if (!signature) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing Stripe-Signature header' }),
      };
    }

    // Validate signature and parse event
    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = await validateAndParseStripeEvent(rawBody, signature);
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature validation failed', err.message);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
      };
    }

    console.log('[Stripe Webhook] Event received', {
      type: stripeEvent.type,
      id: stripeEvent.id,
    });

    // Route event to appropriate handler
    switch (stripeEvent.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object as Stripe.Subscription);
        break;

      default:
        console.log('[Stripe Webhook] Unhandled event type', stripeEvent.type);
    }

    // Stripe expects a 200 to acknowledge receipt
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ received: true }),
    };
  } catch (error: any) {
    console.error('[Stripe Webhook Error]', error);

    // Return 500 so Stripe retries the webhook
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
}
