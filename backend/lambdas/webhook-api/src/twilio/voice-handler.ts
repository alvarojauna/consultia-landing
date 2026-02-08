import { APIGatewayProxyResult } from 'aws-lambda';
import { query, getApiKeys } from 'consultia-shared-nodejs';
import axios from 'axios';

interface TwilioVoiceWebhook {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  Caller: string;
  Called: string;
}

/**
 * Handle voice webhook for outbound calls.
 *
 * When Twilio initiates an outbound call and the recipient answers,
 * this webhook is triggered. We need to:
 * 1. Look up the agent by the From phone number
 * 2. Call ElevenLabs register_call API
 * 3. Return the TwiML that ElevenLabs provides
 *
 * Path: /webhooks/twilio/voice/:customerId
 */
export async function handleVoiceWebhook(
  customerId: string,
  params: TwilioVoiceWebhook
): Promise<APIGatewayProxyResult> {
  console.log('[Voice Webhook] ENTERING handleVoiceWebhook', {
    customerId,
    params: JSON.stringify(params).substring(0, 200),
  });

  const { CallSid, From, To, Direction } = params;

  console.log('[Voice Webhook]', { customerId, CallSid, From, To, Direction });

  try {
    // Get agent info by customer ID and From phone number
    const agentResult = await query(
      `SELECT a.agent_id, a.elevenlabs_agent_id, a.agent_name,
              p.phone_number
       FROM agents a
       JOIN phone_numbers p ON p.agent_id = a.agent_id
       WHERE a.customer_id = $1 AND a.status = 'active'
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [customerId]
    );

    if (agentResult.rows.length === 0) {
      console.error('[Voice Webhook] Agent not found for customer', customerId);
      return errorTwiml('Agent not found');
    }

    const agent = agentResult.rows[0];

    if (!agent.elevenlabs_agent_id) {
      console.error('[Voice Webhook] Agent has no ElevenLabs ID', agent.agent_id);
      return errorTwiml('Agent not configured');
    }

    console.log('[Voice Webhook] Found agent', {
      agent_id: agent.agent_id,
      elevenlabs_agent_id: agent.elevenlabs_agent_id,
    });

    // Call ElevenLabs register_call API
    // For outbound calls, we use register-call with direction: 'outbound'
    const { ELEVENLABS_API_KEY } = await getApiKeys();

    console.log('[Voice Webhook] Calling ElevenLabs register-call', {
      agent_id: agent.elevenlabs_agent_id,
      from_number: From,
      to_number: To,
    });

    const registerResponse = await axios.post(
      'https://api.elevenlabs.io/v1/convai/twilio/register-call',
      {
        agent_id: agent.elevenlabs_agent_id,
        from_number: From, // The number calling from (agent's Twilio number)
        to_number: To, // The number being called (user's phone)
        direction: 'outbound',
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    // ElevenLabs should return TwiML in the response
    const twiml = registerResponse.data;

    console.log('[Voice Webhook] ElevenLabs register_call success', {
      status: registerResponse.status,
      hasData: !!twiml,
    });

    // If ElevenLabs returns TwiML as a string, return it directly
    if (typeof twiml === 'string') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: twiml,
      };
    }

    // If it returns an object with twiml property
    if (twiml?.twiml) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: twiml.twiml,
      };
    }

    // If it returns a websocket URL, we need to construct TwiML
    if (twiml?.websocket_url || twiml?.stream_url) {
      const streamUrl = twiml.websocket_url || twiml.stream_url;
      const streamTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>`;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: streamTwiml,
      };
    }

    console.error('[Voice Webhook] Unexpected response format from ElevenLabs', twiml);
    return errorTwiml('Unexpected response from voice service');
  } catch (error: any) {
    console.error('[Voice Webhook] Error:', {
      message: error.message,
      response: JSON.stringify(error.response?.data, null, 2),
      status: error.response?.status,
    });

    // Return error TwiML
    return errorTwiml('Error connecting to voice service');
  }
}

/**
 * Generate error TwiML that plays a message and hangs up
 */
function errorTwiml(message: string): APIGatewayProxyResult {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="es-ES">Lo sentimos, ha ocurrido un error. Por favor, inténtelo de nuevo más tarde.</Say>
  <Hangup/>
</Response>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twiml,
  };
}
