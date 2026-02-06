import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  query,
  createSuccessResponse,
  createErrorResponse,
  parseBody,
  getCustomerIdFromPath,
  getApiKeys,
  TestCallRequest,
  TestCallResponse,
} from 'consultia-shared-nodejs';
import Joi from 'joi';
import axios from 'axios';

// Validation schema
const testCallSchema = Joi.object({
  test_phone_number: Joi.string()
    .pattern(/^\+\d{7,15}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format (e.g., +34666777888)',
    }),
});

/**
 * POST /onboarding/:customerId/test-call
 *
 * Step 5c: Initiate test call to user's phone
 */
export async function handleTestCall(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const customerId = getCustomerIdFromPath(event);
    const body = parseBody<TestCallRequest>(event.body);

    // Validate request
    const { error, value } = testCallSchema.validate(body);
    if (error) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        error.details[0].message,
        400,
        { field: error.details[0].path[0] },
        requestId
      );
    }

    const { test_phone_number } = value;

    console.log('[Test Call]', { customerId, test_phone_number });

    // Get agent and phone number
    const agentResult = await query(
      `SELECT a.agent_id, a.elevenlabs_agent_id, a.webhook_url,
              p.phone_number, p.phone_id
       FROM agents a
       LEFT JOIN phone_numbers p ON p.agent_id = a.agent_id
       WHERE a.customer_id = $1 AND a.status = 'active'
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [customerId]
    );

    if (agentResult.rows.length === 0 || !agentResult.rows[0].phone_number) {
      return createErrorResponse(
        'AGENT_NOT_READY',
        'Agent is not deployed yet. Please complete deployment first.',
        400,
        null,
        requestId
      );
    }

    const agent = agentResult.rows[0];

    // Get Twilio credentials
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = await getApiKeys();

    // Make outbound call via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;

    const callData = new URLSearchParams({
      To: test_phone_number,
      From: agent.phone_number,
      Url: agent.webhook_url, // ElevenLabs webhook
      StatusCallback: `${process.env.API_BASE_URL}/webhooks/twilio/test-call-status/${customerId}`,
      StatusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'].join(','),
      StatusCallbackMethod: 'POST',
      Record: 'true', // Record the call for testing
    });

    console.log('[Test Call] Initiating Twilio call', {
      from: agent.phone_number,
      to: test_phone_number,
    });

    const twilioResponse = await axios.post(twilioUrl, callData.toString(), {
      auth: {
        username: TWILIO_ACCOUNT_SID,
        password: TWILIO_AUTH_TOKEN,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const call = twilioResponse.data;

    console.log('[Test Call] Call initiated', {
      call_sid: call.sid,
      status: call.status,
    });

    // Create test_calls record
    const testCallResult = await query(
      `INSERT INTO test_calls (
        customer_id,
        agent_id,
        test_phone_number,
        call_sid,
        status
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING test_call_id`,
      [customerId, agent.agent_id, test_phone_number, call.sid, call.status]
    );

    const test_call_id = testCallResult.rows[0].test_call_id;

    const response: TestCallResponse = {
      test_call_id,
      call_sid: call.sid,
      status: call.status,
    };

    return createSuccessResponse(response, 201, requestId);
  } catch (error: any) {
    console.error('[Test Call Error]', error);

    // Handle Twilio API errors
    if (error.response?.data) {
      return createErrorResponse(
        'TWILIO_ERROR',
        error.response.data.message || 'Failed to initiate call',
        500,
        { twilio_error: error.response.data },
        requestId
      );
    }

    return createErrorResponse(
      'TEST_CALL_ERROR',
      error.message,
      500,
      null,
      requestId
    );
  }
}

/**
 * GET /onboarding/:customerId/test-call/:callSid/status
 *
 * Get test call status
 */
export async function getTestCallStatus(
  customerId: string,
  callSid: string,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const result = await query(
      `SELECT test_call_id, call_sid, status, duration_seconds,
              recording_url, transcript, created_at, completed_at
       FROM test_calls
       WHERE customer_id = $1 AND call_sid = $2`,
      [customerId, callSid]
    );

    if (result.rows.length === 0) {
      return createErrorResponse(
        'TEST_CALL_NOT_FOUND',
        'Test call not found',
        404,
        null,
        requestId
      );
    }

    const testCall = result.rows[0];

    return createSuccessResponse(
      {
        test_call_id: testCall.test_call_id,
        call_sid: testCall.call_sid,
        status: testCall.status,
        duration_seconds: testCall.duration_seconds,
        recording_url: testCall.recording_url,
        transcript: testCall.transcript,
        created_at: testCall.created_at,
        completed_at: testCall.completed_at,
      },
      200,
      requestId
    );
  } catch (error: any) {
    console.error('[Test Call Status Error]', error);

    return createErrorResponse(
      'TEST_CALL_STATUS_ERROR',
      error.message,
      500,
      null,
      requestId
    );
  }
}
