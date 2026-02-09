import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  query,
  createSuccessResponse,
  createErrorResponse,
  parseBody,
  getCustomerIdFromPath,
  getApiKeys,
  SelectVoiceRequest,
} from 'consultia-shared-nodejs';
import Joi from 'joi';
import axios from 'axios';

// Validation schema
const selectVoiceSchema = Joi.object({
  voice_id: Joi.string().required(),
  voice_name: Joi.string().required(),
});

/**
 * GET /voices
 *
 * Get available ElevenLabs voices (public endpoint)
 */
async function getVoices(requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const { ELEVENLABS_API_KEY } = await getApiKeys();

    console.log('[Get Voices] Fetching from ElevenLabs API');

    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    // Filter to only show high-quality Spanish/Castilian voices suitable for phone calls
    const voices = response.data.voices
      .filter((v: any) => {
        // Filtrar por categoría
        if (v.category !== 'premade' && v.category !== 'professional') return false;

        // Filtrar por idioma español/castellano
        const labels = v.labels || {};
        const language = (labels.language || '').toLowerCase();
        const accent = (labels.accent || '').toLowerCase();

        return language === 'es' ||
               language.includes('spanish') ||
               language.includes('español') ||
               accent.includes('spanish') ||
               accent.includes('castilian') ||
               accent.includes('castellano');
      })
      .map((v: any) => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category,
        preview_url: v.preview_url,
        description: v.description,
        labels: v.labels,
      }))
      .slice(0, 10); // Return top 10 Spanish voices

    console.log(`[Get Voices] Returning ${voices.length} Spanish voices`);

    return createSuccessResponse(
      voices,
      200,
      requestId
    );
  } catch (error: any) {
    console.error('[Get Voices Error]', error.response?.data || error.message);

    return createErrorResponse(
      'GET_VOICES_ERROR',
      'Failed to fetch voices from ElevenLabs',
      500,
      { details: error.response?.data },
      requestId
    );
  }
}

/**
 * POST /onboarding/:customerId/select-voice
 *
 * Step 3: Save selected voice for customer
 */
async function selectVoice(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const customerId = getCustomerIdFromPath(event);
    const body = parseBody<SelectVoiceRequest>(event.body, event.isBase64Encoded);

    // Validate request
    const { error, value } = selectVoiceSchema.validate(body);
    if (error) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        error.details[0].message,
        400,
        { field: error.details[0].path[0] },
        requestId
      );
    }

    const { voice_id, voice_name } = value;

    console.log('[Select Voice]', { customerId, voice_id, voice_name });

    // Create a temporary agent record with selected voice
    // (actual agent creation happens in Step 5)
    const result = await query(
      `INSERT INTO agents (
        customer_id,
        elevenlabs_agent_id,
        voice_id,
        voice_name,
        agent_name,
        status
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'deploying'
      )
      ON CONFLICT (elevenlabs_agent_id)
      DO UPDATE SET
        voice_id = EXCLUDED.voice_id,
        voice_name = EXCLUDED.voice_name
      RETURNING agent_id`,
      [
        customerId,
        `temp_${customerId}`, // Temporary ID until ElevenLabs creation
        voice_id,
        voice_name,
        `Agent - ${voice_name}`,
      ]
    );

    // Update customer onboarding progress
    await query(
      `UPDATE customers
       SET onboarding_status = 'kb_upload',
           onboarding_step = 4
       WHERE customer_id = $1`,
      [customerId]
    );

    const agent_id = result.rows[0]?.agent_id;

    console.log('[Select Voice] Voice selected', { customerId, agent_id });

    return createSuccessResponse(
      {
        customer_id: customerId,
        agent_id,
        voice_id,
        voice_name,
        onboarding_status: 'kb_upload',
        onboarding_step: 4,
        message: 'Voice selected successfully',
      },
      200,
      requestId
    );
  } catch (error: any) {
    if (error.name === 'ValidationError') throw error;
    console.error('[Select Voice Error]', error);

    return createErrorResponse(
      'SELECT_VOICE_ERROR',
      'Failed to select voice',
      500,
      null,
      requestId
    );
  }
}

/**
 * Main handler - route to GET or POST
 */
export async function handleSelectVoice(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'GET') {
    return await getVoices(requestId);
  } else if (event.httpMethod === 'POST') {
    return await selectVoice(event, requestId);
  }

  return createErrorResponse(
    'METHOD_NOT_ALLOWED',
    'Method not allowed',
    405,
    null,
    requestId
  );
}
