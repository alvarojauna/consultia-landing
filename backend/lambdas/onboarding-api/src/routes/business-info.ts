import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  query,
  createSuccessResponse,
  createErrorResponse,
  parseBody,
  BusinessInfoRequest,
  BusinessInfoResponse,
} from 'consultia-shared-nodejs';
import Joi from 'joi';
import { SQS } from 'aws-sdk';

const sqs = new SQS();

// Validation schema
const businessInfoSchema = Joi.object({
  website: Joi.string().uri().required(),
  country_code: Joi.string()
    .pattern(/^\+\d{1,4}$/)
    .required(),
});

/**
 * POST /onboarding/business-info
 *
 * Step 1: Create customer and initiate business info scraping
 */
export async function handleBusinessInfo(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Parse and validate request body
    const body = parseBody<BusinessInfoRequest>(event.body);

    const { error, value } = businessInfoSchema.validate(body);
    if (error) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        error.details[0].message,
        400,
        { field: error.details[0].path[0] },
        requestId
      );
    }

    const { website, country_code } = value;

    // Get Cognito user from authorizer (if authenticated)
    // For initial signup, this might be a public endpoint
    const cognitoUserId = event.requestContext?.authorizer?.claims?.sub;
    const email =
      event.requestContext?.authorizer?.claims?.email || `temp_${Date.now()}@consultia.es`;

    console.log('[Business Info] Creating customer', {
      email,
      website,
      country_code,
    });

    // Create customer record
    const customerResult = await query<{ customer_id: string }>(
      `INSERT INTO customers (
        enterprise_id,
        email,
        cognito_user_id,
        business_website,
        onboarding_status,
        onboarding_step,
        status
      ) VALUES (
        'e0000000-0000-0000-0000-000000000001'::UUID,
        $1,
        $2,
        $3,
        'business_info',
        1,
        'onboarding'
      )
      RETURNING customer_id`,
      [email, cognitoUserId || null, website]
    );

    const customer_id = customerResult.rows[0].customer_id;

    // Create business_info record (pending scraping)
    await query(
      `INSERT INTO business_info (
        customer_id,
        scraped_data
      ) VALUES ($1, $2)`,
      [customer_id, JSON.stringify({ website, country_code })]
    );

    // Trigger async scraping job (SQS message to scraper Lambda)
    const scrapingJobId = `scrape_${customer_id}_${Date.now()}`;

    try {
      await sqs
        .sendMessage({
          QueueUrl: process.env.SCRAPING_QUEUE_URL!,
          MessageBody: JSON.stringify({
            customer_id,
            website,
            job_id: scrapingJobId,
          }),
          MessageAttributes: {
            customer_id: {
              DataType: 'String',
              StringValue: customer_id,
            },
          },
        })
        .promise();

      console.log('[Business Info] Scraping job queued', { scrapingJobId });
    } catch (sqsError) {
      console.error('[Business Info] Failed to queue scraping job', sqsError);
      // Continue anyway - user can retry scraping later
    }

    const response: BusinessInfoResponse = {
      customer_id,
      scraping_job_id: scrapingJobId,
    };

    return createSuccessResponse(response, 201, requestId);
  } catch (error: any) {
    if (error.name === 'ValidationError') throw error;
    console.error('[Business Info Error]', error);

    return createErrorResponse(
      'BUSINESS_INFO_ERROR',
      error.message,
      500,
      null,
      requestId
    );
  }
}
