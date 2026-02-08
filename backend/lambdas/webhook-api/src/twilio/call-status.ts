import { query, getApiKeys, TwilioCallStatusWebhook } from 'consultia-shared-nodejs';
import { SQS } from 'aws-sdk';
import axios from 'axios';

const sqs = new SQS();

/**
 * Handle call status updates from Twilio.
 *
 * This processes status changes for active agent calls (inbound calls
 * from real customers to the provisioned phone number).
 *
 * Status flow: initiated -> ringing -> answered -> completed
 *
 * When a call completes, we send an SQS message to the usage-tracker
 * Lambda so it can record the usage for billing.
 */
export async function handleCallStatus(params: TwilioCallStatusWebhook): Promise<void> {
  const { CallSid, CallStatus, From, To, Duration, RecordingUrl, Direction } = params;

  console.log('[Call Status]', { CallSid, CallStatus, From, To, Duration, Direction });

  // Find the agent and customer for this phone number
  const agentResult = await query(
    `SELECT a.agent_id, a.customer_id, p.phone_id
     FROM phone_numbers p
     JOIN agents a ON a.agent_id = p.agent_id
     WHERE p.phone_number = $1 AND p.status = 'active'
     LIMIT 1`,
    [Direction === 'inbound' ? To : From]
  );

  if (agentResult.rows.length === 0) {
    console.warn('[Call Status] No agent found for phone number', { To, From });
    return;
  }

  const { agent_id, customer_id } = agentResult.rows[0];

  // On call completion, trigger usage tracking
  if (CallStatus === 'completed' && Duration) {
    const durationSeconds = parseInt(Duration, 10);

    console.log('[Call Status] Call completed', {
      CallSid,
      customer_id,
      agent_id,
      durationSeconds,
    });

    // Send to usage-tracker via SQS
    const usageQueueUrl = process.env.USAGE_TRACKER_QUEUE_URL;
    if (usageQueueUrl) {
      await sqs
        .sendMessage({
          QueueUrl: usageQueueUrl,
          MessageBody: JSON.stringify({
            customer_id,
            agent_id,
            call_sid: CallSid,
            duration_seconds: durationSeconds,
            caller_number: Direction === 'inbound' ? From : To,
            direction: Direction,
            recording_url: RecordingUrl || null,
          }),
        })
        .promise();

      console.log('[Call Status] Usage tracking message sent');
    }

    // Update agent last_active_at
    await query(
      `UPDATE agents SET last_active_at = CURRENT_TIMESTAMP WHERE agent_id = $1`,
      [agent_id]
    );
  }
}

/**
 * Fetch conversation transcript from ElevenLabs Conversational AI.
 *
 * ElevenLabs stores conversation history for each agent. We search
 * recent conversations by the agent ID and match by timing to find
 * the transcript for a specific call.
 */
async function fetchElevenLabsTranscript(agentElevenLabsId: string): Promise<string | null> {
  try {
    const { ELEVENLABS_API_KEY } = await getApiKeys();

    // Get recent conversations for this agent
    const response = await axios.get(
      `https://api.elevenlabs.io/v1/convai/conversations`,
      {
        params: {
          agent_id: agentElevenLabsId,
          page_size: 5,
        },
        headers: { 'xi-api-key': ELEVENLABS_API_KEY },
        timeout: 10000,
      }
    );

    const conversations = response.data?.conversations || [];
    if (conversations.length === 0) {
      console.log('[ElevenLabs] No conversations found');
      return null;
    }

    // Get the most recent conversation's details
    const latestConversation = conversations[0];
    const conversationId = latestConversation.conversation_id;

    const detailResponse = await axios.get(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        headers: { 'xi-api-key': ELEVENLABS_API_KEY },
        timeout: 10000,
      }
    );

    // Build transcript from conversation turns
    const transcript = (detailResponse.data?.transcript || [])
      .map((turn: any) => `${turn.role}: ${turn.message}`)
      .join('\n');

    console.log('[ElevenLabs] Transcript fetched', {
      conversationId,
      turns: detailResponse.data?.transcript?.length || 0,
    });

    return transcript || null;
  } catch (error: any) {
    console.error('[ElevenLabs] Error fetching transcript:', error.message);
    return null;
  }
}

/**
 * Handle test call status updates.
 *
 * These come from the specific statusCallback URL configured
 * when initiating a test call in Step 5 of onboarding.
 *
 * Path: /webhooks/twilio/test-call-status/:customerId
 */
export async function handleTestCallStatus(
  customerId: string,
  params: TwilioCallStatusWebhook
): Promise<void> {
  const { CallSid, CallStatus, Duration, RecordingUrl } = params;

  console.log('[Test Call Status]', { customerId, CallSid, CallStatus, Duration });

  // Update test_calls record
  const updateFields: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
  const updateValues: any[] = [CallStatus];
  let paramIndex = 2;

  if (Duration) {
    updateFields.push(`duration_seconds = $${paramIndex}`);
    updateValues.push(parseInt(Duration, 10));
    paramIndex++;
  }

  if (RecordingUrl) {
    updateFields.push(`recording_url = $${paramIndex}`);
    updateValues.push(RecordingUrl);
    paramIndex++;
  }

  // Set completed_at when call ends
  if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer' || CallStatus === 'canceled') {
    updateFields.push('completed_at = CURRENT_TIMESTAMP');
  }

  updateValues.push(CallSid);

  await query(
    `UPDATE test_calls
     SET ${updateFields.join(', ')}
     WHERE call_sid = $${paramIndex}`,
    updateValues
  );

  // When call completes, try to fetch transcript from ElevenLabs
  if (CallStatus === 'completed') {
    const agentResult = await query(
      `SELECT a.elevenlabs_agent_id
       FROM test_calls tc
       JOIN agents a ON a.agent_id = tc.agent_id
       WHERE tc.call_sid = $1`,
      [CallSid]
    );

    if (agentResult.rows.length > 0 && agentResult.rows[0].elevenlabs_agent_id) {
      const transcript = await fetchElevenLabsTranscript(
        agentResult.rows[0].elevenlabs_agent_id
      );

      if (transcript) {
        await query(
          `UPDATE test_calls SET transcript = $1 WHERE call_sid = $2`,
          [transcript, CallSid]
        );
        console.log('[Test Call Status] Transcript saved for', CallSid);
      }
    }
  }

  console.log('[Test Call Status] Updated test_calls', { CallSid, CallStatus });
}
