import Stripe from 'stripe';
import { getSecret } from 'consultia-shared-nodejs';

let stripeInstance: Stripe | null = null;

/**
 * Get cached Stripe instance with API key from Secrets Manager.
 */
export async function getStripe(): Promise<Stripe> {
  if (stripeInstance) return stripeInstance;

  const secrets = await getSecret(
    process.env.API_KEYS_SECRET_NAME || 'consultia/production/api-keys'
  );

  stripeInstance = new Stripe(secrets.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });

  return stripeInstance;
}

/**
 * Validate Stripe webhook signature and construct the event.
 *
 * Stripe uses HMAC-SHA256 to sign webhooks. The `constructEvent` method
 * validates the signature and returns the parsed event object.
 */
export async function validateAndParseStripeEvent(
  rawBody: string,
  signature: string
): Promise<Stripe.Event> {
  const stripe = await getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable not set');
  }

  // constructEvent validates the signature and parses in one step
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
