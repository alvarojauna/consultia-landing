import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  query,
  transaction,
  createSuccessResponse,
  createErrorResponse,
  parseBody,
  getCustomerIdFromPath,
  ConfirmBusinessRequest,
} from 'consultia-shared-nodejs';
import Joi from 'joi';

// Validation schema
const confirmBusinessSchema = Joi.object({
  business_name: Joi.string().required(),
  business_address: Joi.string().optional(),
  business_phone: Joi.string().optional(),
  industry: Joi.string().optional(),
  services: Joi.array().items(Joi.string()).optional(),
  hours: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
});

/**
 * POST /onboarding/:customerId/confirm-business
 *
 * Step 2: Confirm scraped business information
 */
export async function handleConfirmBusiness(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const customerId = getCustomerIdFromPath(event);
    const body = parseBody<ConfirmBusinessRequest>(event.body);

    // Validate request
    const { error, value } = confirmBusinessSchema.validate(body);
    if (error) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        error.details[0].message,
        400,
        { field: error.details[0].path[0] },
        requestId
      );
    }

    const {
      business_name,
      business_address,
      business_phone,
      industry,
      services,
      hours,
    } = value;

    console.log('[Confirm Business]', {
      customerId,
      business_name,
      industry,
    });

    // Use transaction to update both customers and business_info atomically
    await transaction(async (client) => {
      // Update customer record with confirmed business info
      await client.query(
        `UPDATE customers
         SET business_name = $1,
             business_address = $2,
             business_phone = $3,
             industry = $4,
             onboarding_status = 'voice',
             onboarding_step = 3
         WHERE customer_id = $5`,
        [business_name, business_address, business_phone, industry, customerId]
      );

      // Update business_info with confirmed data
      await client.query(
        `UPDATE business_info
         SET services = $1,
             hours = $2,
             confirmed = TRUE,
             confirmed_at = CURRENT_TIMESTAMP
         WHERE customer_id = $3`,
        [services || [], JSON.stringify(hours || {}), customerId]
      );
    });

    console.log('[Confirm Business] Successfully updated', { customerId });

    return createSuccessResponse(
      {
        customer_id: customerId,
        onboarding_status: 'voice',
        onboarding_step: 3,
        message: 'Business information confirmed successfully',
      },
      200,
      requestId
    );
  } catch (error: any) {
    console.error('[Confirm Business Error]', error);

    return createErrorResponse(
      'CONFIRM_BUSINESS_ERROR',
      error.message,
      500,
      null,
      requestId
    );
  }
}
