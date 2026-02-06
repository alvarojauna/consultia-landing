import {
  query,
  createSuccessResponse,
  createErrorResponse,
  parseBody,
  validateString,
  sanitizeString,
} from 'consultia-shared-nodejs';

interface UpdateAgentPayload {
  agent_name?: string;
  system_prompt?: string;
  voice_id?: string;
  voice_name?: string;
}

/**
 * GET /dashboard/:customerId/agent
 *
 * Returns the agent's full settings including prompt, voice, and knowledge base summary.
 */
export async function getAgentSettings(customerId: string, requestId: string) {
  const result = await query(
    `SELECT
       a.agent_id, a.elevenlabs_agent_id, a.agent_name,
       a.voice_id, a.voice_name, a.system_prompt,
       a.conversation_config, a.status, a.deployed_at,
       kb.structured_data, kb.processing_status AS kb_status,
       kb.total_sources AS kb_total_sources
     FROM agents a
     LEFT JOIN knowledge_bases kb ON kb.customer_id = a.customer_id
     WHERE a.customer_id = $1
     ORDER BY a.created_at DESC LIMIT 1`,
    [customerId]
  );

  if (result.rows.length === 0) {
    return createErrorResponse('NOT_FOUND', 'Agent not found for this customer', 404, null, requestId);
  }

  const agent = result.rows[0];

  // Summarize knowledge base instead of returning full structured_data
  let kbSummary = null;
  if (agent.structured_data) {
    const sd = agent.structured_data;
    kbSummary = {
      status: agent.kb_status,
      total_sources: agent.kb_total_sources,
      services_count: Array.isArray(sd.services) ? sd.services.length : 0,
      faqs_count: Array.isArray(sd.faqs) ? sd.faqs.length : 0,
      has_policies: !!sd.policies,
      has_hours: !!sd.hours,
    };
  }

  return createSuccessResponse(
    {
      agent_id: agent.agent_id,
      elevenlabs_agent_id: agent.elevenlabs_agent_id,
      agent_name: agent.agent_name,
      voice_id: agent.voice_id,
      voice_name: agent.voice_name,
      system_prompt: agent.system_prompt,
      conversation_config: agent.conversation_config,
      status: agent.status,
      deployed_at: agent.deployed_at,
      knowledge_base: kbSummary,
    },
    200,
    requestId
  );
}

/**
 * PATCH /dashboard/:customerId/agent
 *
 * Update agent settings. Only provided fields are updated.
 * If system_prompt changes, the ElevenLabs agent should be updated too
 * (handled async via SQS in production).
 */
export async function updateAgentSettings(
  customerId: string,
  body: string | null,
  requestId: string
) {
  const payload = parseBody<UpdateAgentPayload>(body);

  const updates: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (payload.agent_name !== undefined) {
    const name = sanitizeString(validateString(payload.agent_name, 'agent_name', { minLength: 1, maxLength: 200 }));
    updates.push(`agent_name = $${paramIdx}`);
    params.push(name);
    paramIdx++;
  }

  if (payload.system_prompt !== undefined) {
    const prompt = sanitizeString(validateString(payload.system_prompt, 'system_prompt', { maxLength: 50000 }));
    updates.push(`system_prompt = $${paramIdx}`);
    params.push(prompt);
    paramIdx++;
  }

  if (payload.voice_id !== undefined) {
    const voiceId = sanitizeString(validateString(payload.voice_id, 'voice_id', { maxLength: 200 }));
    updates.push(`voice_id = $${paramIdx}`);
    params.push(voiceId);
    paramIdx++;
  }

  if (payload.voice_name !== undefined) {
    const voiceName = sanitizeString(validateString(payload.voice_name, 'voice_name', { maxLength: 200 }));
    updates.push(`voice_name = $${paramIdx}`);
    params.push(voiceName);
    paramIdx++;
  }

  if (updates.length === 0) {
    return createErrorResponse('INVALID_REQUEST', 'No fields to update', 400, null, requestId);
  }

  updates.push('updated_at = NOW()');
  params.push(customerId);

  const result = await query(
    `UPDATE agents SET ${updates.join(', ')} WHERE customer_id = $${paramIdx} RETURNING agent_id, agent_name, status`,
    params
  );

  if (result.rows.length === 0) {
    return createErrorResponse('NOT_FOUND', 'Agent not found', 404, null, requestId);
  }

  return createSuccessResponse(
    { updated: true, agent: result.rows[0] },
    200,
    requestId
  );
}

/**
 * POST /dashboard/:customerId/agent/pause
 *
 * Sets the agent status to 'inactive', effectively stopping it
 * from answering calls. The Twilio number stays provisioned.
 */
export async function pauseAgent(customerId: string, requestId: string) {
  const result = await query(
    `UPDATE agents SET status = 'inactive', updated_at = NOW()
     WHERE customer_id = $1 AND status = 'active'
     RETURNING agent_id, agent_name`,
    [customerId]
  );

  if (result.rows.length === 0) {
    return createErrorResponse(
      'INVALID_STATE',
      'No active agent found to pause',
      400,
      null,
      requestId
    );
  }

  return createSuccessResponse(
    { paused: true, agent: result.rows[0] },
    200,
    requestId
  );
}

/**
 * POST /dashboard/:customerId/agent/resume
 *
 * Reactivates a paused agent.
 */
export async function resumeAgent(customerId: string, requestId: string) {
  const result = await query(
    `UPDATE agents SET status = 'active', updated_at = NOW()
     WHERE customer_id = $1 AND status = 'inactive'
     RETURNING agent_id, agent_name`,
    [customerId]
  );

  if (result.rows.length === 0) {
    return createErrorResponse(
      'INVALID_STATE',
      'No paused agent found to resume',
      400,
      null,
      requestId
    );
  }

  return createSuccessResponse(
    { resumed: true, agent: result.rows[0] },
    200,
    requestId
  );
}
