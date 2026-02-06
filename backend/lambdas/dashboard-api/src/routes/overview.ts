import { query, createSuccessResponse, createErrorResponse } from 'consultia-shared-nodejs';

/**
 * GET /dashboard/:customerId/overview
 *
 * Returns a consolidated view of the customer's agent, phone number,
 * subscription status, and usage stats for the current billing period.
 */
export async function getOverview(customerId: string, requestId: string) {
  // Fetch customer + agent + phone number in a single query
  const customerResult = await query(
    `SELECT
       c.customer_id, c.business_name, c.industry, c.status AS customer_status,
       a.agent_id, a.agent_name, a.status AS agent_status,
       a.voice_name, a.deployed_at, a.last_active_at,
       p.phone_number, p.country_code
     FROM customers c
     LEFT JOIN agents a ON a.customer_id = c.customer_id
     LEFT JOIN phone_numbers p ON p.customer_id = c.customer_id AND p.status = 'active'
     WHERE c.customer_id = $1`,
    [customerId]
  );

  if (customerResult.rows.length === 0) {
    return createErrorResponse('NOT_FOUND', 'Customer not found', 404, null, requestId);
  }

  const customer = customerResult.rows[0];

  // Fetch subscription info
  const subResult = await query(
    `SELECT subscription_id, plan_tier, billing_period, minutes_included,
            price_eur, status, current_period_start, current_period_end, trial_end
     FROM subscriptions
     WHERE customer_id = $1 AND status IN ('active', 'trialing')
     ORDER BY created_at DESC LIMIT 1`,
    [customerId]
  );

  const subscription = subResult.rows[0] || null;

  // Fetch usage stats for current billing period
  let usageStats = { total_calls: 0, total_minutes: 0, total_cost: 0 };

  if (subscription) {
    const usageResult = await query(
      `SELECT
         COUNT(*) AS total_calls,
         COALESCE(SUM(quantity), 0) AS total_minutes,
         COALESCE(SUM(total_cost_eur), 0) AS total_cost
       FROM usage_records
       WHERE customer_id = $1
         AND billing_period_start = $2
         AND billing_period_end = $3`,
      [customerId, subscription.current_period_start, subscription.current_period_end]
    );

    const stats = usageResult.rows[0];
    usageStats = {
      total_calls: parseInt(stats.total_calls, 10),
      total_minutes: parseFloat(stats.total_minutes),
      total_cost: parseFloat(stats.total_cost),
    };
  }

  // Fetch recent calls count (last 7 days)
  const recentResult = await query(
    `SELECT COUNT(*) AS recent_calls
     FROM usage_records
     WHERE customer_id = $1 AND recorded_at >= NOW() - INTERVAL '7 days'`,
    [customerId]
  );

  return createSuccessResponse(
    {
      customer: {
        customer_id: customer.customer_id,
        business_name: customer.business_name,
        industry: customer.industry,
        status: customer.customer_status,
      },
      agent: customer.agent_id
        ? {
            agent_id: customer.agent_id,
            agent_name: customer.agent_name,
            status: customer.agent_status,
            voice_name: customer.voice_name,
            deployed_at: customer.deployed_at,
            last_active_at: customer.last_active_at,
          }
        : null,
      phone_number: customer.phone_number
        ? {
            number: customer.phone_number,
            country_code: customer.country_code,
          }
        : null,
      subscription: subscription
        ? {
            plan_tier: subscription.plan_tier,
            billing_period: subscription.billing_period,
            minutes_included: subscription.minutes_included,
            price_eur: parseFloat(subscription.price_eur),
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            trial_end: subscription.trial_end,
          }
        : null,
      usage: {
        ...usageStats,
        minutes_remaining: subscription
          ? Math.max(0, subscription.minutes_included - usageStats.total_minutes)
          : 0,
        usage_percentage: subscription
          ? Math.min(100, (usageStats.total_minutes / subscription.minutes_included) * 100)
          : 0,
      },
      recent_calls_7d: parseInt(recentResult.rows[0].recent_calls, 10),
    },
    200,
    requestId
  );
}
