import Stripe from 'stripe';
import { query } from 'consultia-shared-nodejs';

/**
 * Handle invoice.payment_succeeded
 *
 * Fired when a subscription payment is successful. We use this
 * to confirm that the subscription is active and update billing periods.
 */
export async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const stripeSubscriptionId = invoice.subscription as string;
  const stripeCustomerId = invoice.customer as string;

  console.log('[Stripe] Payment succeeded', {
    invoice_id: invoice.id,
    subscription: stripeSubscriptionId,
    amount: invoice.amount_paid,
  });

  if (!stripeSubscriptionId) {
    console.log('[Stripe] Invoice not tied to subscription, skipping');
    return;
  }

  // Update subscription status and billing period
  await query(
    `UPDATE subscriptions
     SET status = 'active',
         current_period_start = to_timestamp($1),
         current_period_end = to_timestamp($2)
     WHERE stripe_subscription_id = $3`,
    [
      invoice.period_start,
      invoice.period_end,
      stripeSubscriptionId,
    ]
  );

  console.log('[Stripe] Subscription updated to active', { stripeSubscriptionId });
}

/**
 * Handle invoice.payment_failed
 *
 * Fired when a payment attempt fails. Mark the subscription as past_due.
 */
export async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const stripeSubscriptionId = invoice.subscription as string;

  console.log('[Stripe] Payment failed', {
    invoice_id: invoice.id,
    subscription: stripeSubscriptionId,
    attempt: invoice.attempt_count,
  });

  if (!stripeSubscriptionId) return;

  await query(
    `UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId]
  );

  // If past_due, pause the agent to prevent usage accumulation
  await query(
    `UPDATE agents SET status = 'inactive'
     WHERE customer_id = (
       SELECT customer_id FROM subscriptions WHERE stripe_subscription_id = $1
     )`,
    [stripeSubscriptionId]
  );

  console.log('[Stripe] Subscription marked past_due, agent paused', { stripeSubscriptionId });
}

/**
 * Handle customer.subscription.updated
 *
 * Fired when subscription is modified (plan change, cancel_at_period_end, etc.)
 */
export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log('[Stripe] Subscription updated', {
    subscription_id: subscription.id,
    status: subscription.status,
  });

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'unpaid',
    trialing: 'trialing',
  };

  const ourStatus = statusMap[subscription.status] || 'active';

  await query(
    `UPDATE subscriptions
     SET status = $1,
         current_period_start = to_timestamp($2),
         current_period_end = to_timestamp($3),
         trial_end = $4
     WHERE stripe_subscription_id = $5`,
    [
      ourStatus,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      subscription.id,
    ]
  );

  // Re-activate or deactivate agent based on subscription status
  if (ourStatus === 'active' || ourStatus === 'trialing') {
    await query(
      `UPDATE agents SET status = 'active'
       WHERE customer_id = (
         SELECT customer_id FROM subscriptions WHERE stripe_subscription_id = $1
       ) AND status = 'inactive'`,
      [subscription.id]
    );
  }

  console.log('[Stripe] Subscription status synced', {
    stripe_id: subscription.id,
    status: ourStatus,
  });
}

/**
 * Handle customer.subscription.deleted
 *
 * Fired when a subscription is fully cancelled (end of billing period).
 */
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log('[Stripe] Subscription deleted', { subscription_id: subscription.id });

  // Mark subscription as cancelled
  await query(
    `UPDATE subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = $1`,
    [subscription.id]
  );

  // Deactivate the agent
  await query(
    `UPDATE agents SET status = 'inactive'
     WHERE customer_id = (
       SELECT customer_id FROM subscriptions WHERE stripe_subscription_id = $1
     )`,
    [subscription.id]
  );

  // Update customer status
  await query(
    `UPDATE customers SET status = 'cancelled'
     WHERE customer_id = (
       SELECT customer_id FROM subscriptions WHERE stripe_subscription_id = $1
     )`,
    [subscription.id]
  );

  console.log('[Stripe] Customer and agent deactivated', { subscription_id: subscription.id });
}
