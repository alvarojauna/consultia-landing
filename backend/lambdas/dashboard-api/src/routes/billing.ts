import { query, createSuccessResponse, createErrorResponse, getApiKeys } from 'consultia-shared-nodejs';
import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

async function getStripe(): Promise<Stripe> {
  if (stripeInstance) return stripeInstance;
  const secrets = await getApiKeys();
  stripeInstance = new Stripe(secrets.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  return stripeInstance;
}

/**
 * GET /dashboard/:customerId/billing
 *
 * Returns the customer's subscription details, current period usage
 * breakdown, and recent invoices from Stripe.
 */
export async function getBilling(customerId: string, requestId: string) {
  // Get subscription
  const subResult = await query(
    `SELECT subscription_id, stripe_subscription_id, stripe_customer_id,
            plan_tier, billing_period, minutes_included, price_eur,
            status, current_period_start, current_period_end, trial_end,
            created_at
     FROM subscriptions
     WHERE customer_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [customerId]
  );

  if (subResult.rows.length === 0) {
    return createErrorResponse('NOT_FOUND', 'No subscription found', 404, null, requestId);
  }

  const sub = subResult.rows[0];

  // Get usage breakdown for current period
  const usageResult = await query(
    `SELECT
       COUNT(*) AS total_calls,
       COALESCE(SUM(quantity), 0) AS total_minutes,
       COALESCE(SUM(CASE WHEN total_cost_eur > 0 THEN quantity ELSE 0 END), 0) AS overage_minutes,
       COALESCE(SUM(total_cost_eur), 0) AS overage_cost
     FROM usage_records
     WHERE customer_id = $1
       AND billing_period_start = $2
       AND billing_period_end = $3`,
    [customerId, sub.current_period_start, sub.current_period_end]
  );

  const usage = usageResult.rows[0];

  // Get daily usage for chart data (last 30 days)
  const dailyResult = await query(
    `SELECT
       DATE(recorded_at) AS date,
       COUNT(*) AS calls,
       COALESCE(SUM(quantity), 0) AS minutes
     FROM usage_records
     WHERE customer_id = $1 AND recorded_at >= NOW() - INTERVAL '30 days'
     GROUP BY DATE(recorded_at)
     ORDER BY date ASC`,
    [customerId]
  );

  // Fetch recent invoices from Stripe
  let invoices: any[] = [];
  if (sub.stripe_customer_id) {
    try {
      const stripe = await getStripe();
      const stripeInvoices = await stripe.invoices.list({
        customer: sub.stripe_customer_id,
        limit: 10,
      });

      invoices = stripeInvoices.data.map((inv) => ({
        invoice_id: inv.id,
        number: inv.number,
        status: inv.status,
        amount_eur: (inv.amount_due || 0) / 100,
        amount_paid_eur: (inv.amount_paid || 0) / 100,
        period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
        period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
        invoice_url: inv.hosted_invoice_url,
        pdf_url: inv.invoice_pdf,
        created_at: new Date(inv.created * 1000).toISOString(),
      }));
    } catch (err) {
      console.error('[Billing] Error fetching Stripe invoices:', err);
      // Don't fail the entire request if Stripe is unreachable
    }
  }

  const totalMinutes = parseFloat(usage.total_minutes);
  const minutesIncluded = sub.minutes_included;

  return createSuccessResponse(
    {
      subscription: {
        subscription_id: sub.subscription_id,
        plan_tier: sub.plan_tier,
        billing_period: sub.billing_period,
        minutes_included: minutesIncluded,
        price_eur: parseFloat(sub.price_eur),
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        trial_end: sub.trial_end,
        created_at: sub.created_at,
      },
      usage: {
        total_calls: parseInt(usage.total_calls, 10),
        total_minutes: totalMinutes,
        minutes_included: minutesIncluded,
        minutes_remaining: Math.max(0, minutesIncluded - totalMinutes),
        usage_percentage: Math.min(100, (totalMinutes / minutesIncluded) * 100),
        overage_minutes: parseFloat(usage.overage_minutes),
        overage_cost_eur: parseFloat(usage.overage_cost),
      },
      daily_usage: dailyResult.rows.map((row: any) => ({
        date: row.date,
        calls: parseInt(row.calls, 10),
        minutes: parseFloat(row.minutes),
      })),
      invoices,
    },
    200,
    requestId
  );
}
