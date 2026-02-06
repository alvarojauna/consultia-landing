import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  query,
  createSuccessResponse,
  createErrorResponse,
  getCustomerIdFromPath,
  DeployAgentResponse,
} from 'consultia-shared-nodejs';
import { StepFunctions } from 'aws-sdk';

const stepFunctions = new StepFunctions();

/**
 * POST /onboarding/:customerId/deploy-agent
 *
 * Step 5a: Trigger Step Functions workflow to deploy agent
 *
 * Workflow steps:
 * 1. CreateElevenLabsAgent - Create agent in ElevenLabs
 * 2. ProvisionTwilioNumber - Purchase phone number from Twilio
 * 3. LinkNumberToAgent - Configure number to route to agent
 * 4. UpdateDatabase - Mark agent as active
 */
export async function handleDeployAgent(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const customerId = getCustomerIdFromPath(event);

    console.log('[Deploy Agent] Starting deployment', { customerId });

    // Get customer info
    const customerResult = await query(
      `SELECT c.customer_id, c.business_name, c.business_address, c.industry,
              bi.services, bi.hours, bi.contacts
       FROM customers c
       LEFT JOIN business_info bi ON bi.customer_id = c.customer_id
       WHERE c.customer_id = $1`,
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

    // Get agent info (voice selection from Step 3)
    const agentResult = await query(
      `SELECT agent_id, voice_id, voice_name
       FROM agents
       WHERE customer_id = $1 AND status = 'deploying'
       ORDER BY created_at DESC
       LIMIT 1`,
      [customerId]
    );

    if (agentResult.rows.length === 0) {
      return createErrorResponse(
        'AGENT_NOT_FOUND',
        'No agent found for customer. Please select a voice first.',
        400,
        null,
        requestId
      );
    }

    const agent = agentResult.rows[0];

    // Get knowledge base (optional - may not exist if user skipped)
    const kbResult = await query(
      `SELECT kb_id, structured_data
       FROM knowledge_bases
       WHERE customer_id = $1 AND processing_status = 'complete'
       LIMIT 1`,
      [customerId]
    );

    const knowledge_base = kbResult.rows.length > 0 ? kbResult.rows[0] : null;

    // Prepare input for Step Functions
    const sfInput = {
      customer_id: customerId,
      agent_id: agent.agent_id,
      voice_id: agent.voice_id,
      voice_name: agent.voice_name,
      business: {
        name: customer.business_name,
        address: customer.business_address,
        industry: customer.industry,
        services: customer.services || [],
        hours: customer.hours || {},
        contacts: customer.contacts || {},
      },
      knowledge_base: knowledge_base
        ? {
            kb_id: knowledge_base.kb_id,
            structured_data: knowledge_base.structured_data,
          }
        : null,
      request_id: requestId,
    };

    console.log('[Deploy Agent] Starting Step Functions execution', {
      customerId,
      agent_id: agent.agent_id,
    });

    // Start Step Functions execution
    const execution = await stepFunctions
      .startExecution({
        stateMachineArn: process.env.DEPLOY_AGENT_STATE_MACHINE_ARN!,
        input: JSON.stringify(sfInput),
        name: `deploy-${customerId}-${Date.now()}`,
      })
      .promise();

    console.log('[Deploy Agent] Execution started', {
      execution_arn: execution.executionArn,
    });

    // Update customer onboarding progress
    await query(
      `UPDATE customers
       SET onboarding_status = 'deploy',
           onboarding_step = 5
       WHERE customer_id = $1`,
      [customerId]
    );

    const response: DeployAgentResponse = {
      execution_arn: execution.executionArn,
      agent_id: agent.agent_id,
    };

    return createSuccessResponse(response, 202, requestId); // 202 Accepted
  } catch (error: any) {
    console.error('[Deploy Agent Error]', error);

    return createErrorResponse(
      'DEPLOY_AGENT_ERROR',
      error.message,
      500,
      { details: error },
      requestId
    );
  }
}

/**
 * GET /onboarding/:customerId/deploy-status
 *
 * Step 5b: Check deployment status
 */
export async function getDeployStatus(
  customerId: string,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Get agent status
    const agentResult = await query(
      `SELECT a.agent_id, a.elevenlabs_agent_id, a.status, a.error_message,
              a.deployed_at, p.phone_number
       FROM agents a
       LEFT JOIN phone_numbers p ON p.agent_id = a.agent_id
       WHERE a.customer_id = $1
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [customerId]
    );

    if (agentResult.rows.length === 0) {
      return createSuccessResponse(
        {
          status: 'not_started',
          agent_id: null,
          phone_number: null,
        },
        200,
        requestId
      );
    }

    const agent = agentResult.rows[0];

    return createSuccessResponse(
      {
        status: agent.status,
        agent_id: agent.agent_id,
        elevenlabs_agent_id:
          agent.elevenlabs_agent_id?.startsWith('temp_') ? null : agent.elevenlabs_agent_id,
        phone_number: agent.phone_number,
        deployed_at: agent.deployed_at,
        error_message: agent.error_message,
      },
      200,
      requestId
    );
  } catch (error: any) {
    console.error('[Deploy Status Error]', error);

    return createErrorResponse(
      'DEPLOY_STATUS_ERROR',
      error.message,
      500,
      null,
      requestId
    );
  }
}
