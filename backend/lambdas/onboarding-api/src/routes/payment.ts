import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  query,
  transaction,
  createSuccessResponse,
  createErrorResponse,
  parseBody,
  getCustomerIdFromPath,
  getApiKeys,
  SelectPlanRequest,
  CompletePaymentRequest,
} from 'consultia-shared-nodejs';
import Joi from 'joi';
import axios from 'axios';

// Validation schemas
const selectPlanSchema = Joi.object({
  plan_tier: Joi.string().valid('starter', 'professional', 'enterprise').required(),
  billing_period: Joi.string().valid('monthly', 'yearly').required(),
  minutes_included: Joi.number().required(),
});

const completePaymentSchema = Joi.object({
  stripe_payment_method_id: Joi.string().required(),
  stripe_customer_id: Joi.string().optional(),
  plan_tier: Joi.string().valid('starter', 'professional', 'enterprise').required(),
  billing_period: Joi.string().valid('monthly', 'yearly').required(),
});

// Plan pricing (matches frontend)
const PLANS = {
  starter: {
    monthly: { price_eur: 29, minutes: 150 },
    yearly: { price_eur: 290, minutes: 150 },
  },
  professional: {
    monthly: { price_eur: 79, minutes: 300 },
    yearly: { price_eur: 790, minutes: 300 },
  },
  enterprise: {
    monthly: { price_eur: 199, minutes: 750 },
    yearly: { price_eur: 1990, minutes: 750 },
  },
};

/**
 * POST /onboarding/:customerId/select-plan
 *
 * Step 6a: Select subscription plan
 */
export async function handleSelectPlan(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const customerId = getCustomerIdFromPath(event);
    const body = parseBody<SelectPlanRequest>(event.body);

    // Validate request
    const { error, value } = selectPlanSchema.validate(body);
    if (error) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        error.details[0].message,
        400,
        { field: error.details[0].path[0] },
        requestId
      );
    }

    const { plan_tier, billing_period, minutes_included } = value;

    // Validate plan exists
    const planPricing = PLANS[plan_tier as keyof typeof PLANS]?.[billing_period as keyof typeof PLANS['starter']];
    if (!planPricing) {
      return createErrorResponse(
        'INVALID_PLAN',
        'Invalid plan tier or billing period',
        400,
        null,
        requestId
      );
    }

    console.log('[Select Plan]', { customerId, plan_tier, billing_period });

    // Store selected plan (temporary - will create subscription in complete-payment)
    await query(
      `UPDATE customers
       SET onboarding_status = 'payment',
           onboarding_step = 6
       WHERE customer_id = $1`,
      [customerId]
    );

    return createSuccessResponse(
      {
        plan_tier,
        billing_period,
        minutes_included,
        price_eur: planPricing.price_eur,
        message: 'Plan selected successfully',
      },
      200,
      requestId
    );
  } catch (error: any) {
    console.error('[Select Plan Error]', { requestId, message: error.message });

    return createErrorResponse(
      'SELECT_PLAN_ERROR',
      'Failed to select plan',
      500,
      null,
      requestId
    );
  }
}

/**
 * POST /onboarding/:customerId/complete-payment
 *
 * Step 6b: Complete payment and activate subscription
 */
export async function handleCompletePayment(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const customerId = getCustomerIdFromPath(event);
    const body = parseBody<CompletePaymentRequest>(event.body);

    // Validate request
    const { error, value } = completePaymentSchema.validate(body);
    if (error) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        error.details[0].message,
        400,
        { field: error.details[0].path[0] },
        requestId
      );
    }

    const { stripe_payment_method_id, stripe_customer_id, plan_tier, billing_period } = value;

    console.log('[Complete Payment]', { customerId, plan_tier, billing_period });

    // Get customer info
    const customerResult = await query(
      'SELECT customer_id, email, business_name FROM customers WHERE customer_id = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return createErrorResponse(
        'CUSTOMER_NOT_FOUND',
        'Customer not found',
        404,
        null,
        requestId
      );
    }

    const customer = customerResult.rows[0];

    // Get Stripe secret key
    const { STRIPE_SECRET_KEY } = await getApiKeys();

    // Create or get Stripe customer
    let stripeCustomerId = stripe_customer_id;

    if (!stripeCustomerId) {
      console.log('[Complete Payment] Creating Stripe customer');

      const createCustomerResponse = await axios.post(
        'https://api.stripe.com/v1/customers',
        new URLSearchParams({
          email: customer.email,
          name: customer.business_name || customer.email,
          payment_method: stripe_payment_method_id,
          invoice_settings: JSON.stringify({
            default_payment_method: stripe_payment_method_id,
          }),
        }),
        {
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      stripeCustomerId = createCustomerResponse.data.id;
      console.log('[Complete Payment] Stripe customer created', { stripeCustomerId });
    }

    // Look up server-side pricing (never trust client-sent prices)
    const planPricing = PLANS[plan_tier as keyof typeof PLANS]?.[billing_period as keyof typeof PLANS['starter']];
    if (!planPricing) {
      return createErrorResponse('INVALID_PLAN', 'Invalid plan or billing period', 400, null, requestId);
    }

    // Create Stripe subscription
    console.log('[Complete Payment] Creating Stripe subscription');

    // First, create a price in Stripe (or use existing price ID)
    const createPriceResponse = await axios.post(
      'https://api.stripe.com/v1/prices',
      new URLSearchParams({
        currency: 'eur',
        unit_amount: (planPricing.price_eur * 100).toString(), // Convert to cents
        recurring: JSON.stringify({
          interval: billing_period === 'yearly' ? 'year' : 'month',
        }),
        product_data: JSON.stringify({
          name: `ConsultIA ${plan_tier.charAt(0).toUpperCase() + plan_tier.slice(1)} Plan`,
          metadata: {
            minutes_included: planPricing.minutes.toString(),
            plan_tier,
          },
        }),
      }),
      {
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const priceId = createPriceResponse.data.id;

    // Create subscription
    const createSubscriptionResponse = await axios.post(
      'https://api.stripe.com/v1/subscriptions',
      new URLSearchParams({
        customer: stripeCustomerId,
        items: JSON.stringify([{ price: priceId }]),
        payment_behavior: 'default_incomplete',
        payment_settings: JSON.stringify({
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        }),
        expand: JSON.stringify(['latest_invoice.payment_intent']),
      }),
      {
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const subscription = createSubscriptionResponse.data;

    console.log('[Complete Payment] Stripe subscription created', {
      subscription_id: subscription.id,
      status: subscription.status,
    });

    // Save subscription to database
    await transaction(async (client) => {
      // Create subscription record
      await client.query(
        `INSERT INTO subscriptions (
          customer_id,
          stripe_subscription_id,
          stripe_customer_id,
          plan_tier,
          billing_period,
          minutes_included,
          price_eur,
          status,
          current_period_start,
          current_period_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          customerId,
          subscription.id,
          stripeCustomerId,
          plan_tier,
          billing_period,
          planPricing.minutes,
          planPricing.price_eur,
          subscription.status,
          new Date(subscription.current_period_start * 1000),
          new Date(subscription.current_period_end * 1000),
        ]
      );

      // Update customer status to active
      await client.query(
        `UPDATE customers
         SET status = 'active',
             onboarding_status = 'complete',
             onboarding_step = 6,
             completed_at = CURRENT_TIMESTAMP
         WHERE customer_id = $1`,
        [customerId]
      );

      // Update agent status to active
      await client.query(
        `UPDATE agents
         SET status = 'active'
         WHERE customer_id = $1 AND status = 'deploying'`,
        [customerId]
      );
    });

    console.log('[Complete Payment] Payment completed successfully', { customerId });

    return createSuccessResponse(
      {
        subscription_id: subscription.id,
        status: subscription.status,
        client_secret: subscription.latest_invoice?.payment_intent?.client_secret,
        message: 'Payment completed successfully',
        dashboard_url: `${process.env.FRONTEND_URL}/dashboard`,
      },
      201,
      requestId
    );
  } catch (error: any) {
    console.error('[Complete Payment Error]', error);

    // Handle Stripe API errors (expose Stripe user-facing message, not internals)
    if (error.response?.data?.error) {
      const stripeError = error.response.data.error;
      console.error('[Stripe Error]', { requestId, type: stripeError.type, code: stripeError.code });
      return createErrorResponse(
        'PAYMENT_FAILED',
        stripeError.message || 'Payment failed. Please try again.',
        400,
        null,
        requestId
      );
    }

    console.error('[Complete Payment Error]', { requestId, message: error.message });
    return createErrorResponse(
      'COMPLETE_PAYMENT_ERROR',
      'Payment processing failed',
      500,
      null,
      requestId
    );
  }
}
