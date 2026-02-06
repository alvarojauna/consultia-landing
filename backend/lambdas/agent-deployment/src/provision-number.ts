/**
 * Step 2: Provision Phone Number from Twilio
 */

import { Twilio } from 'twilio';
import { query, getApiKeys } from 'consultia-shared-nodejs';

interface ProvisionNumberEvent {
  customer_id: string;
  agent_id: string;
  elevenlabs_agent_id: string;
  webhook_url: string;
  [key: string]: any;
}

/**
 * Provision phone number from Twilio
 */
export async function provisionNumber(event: ProvisionNumberEvent): Promise<any> {
  console.log('[Provision Number] Starting', {
    customer_id: event.customer_id,
    agent_id: event.agent_id,
  });

  // Get Twilio credentials
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = await getApiKeys();

  // Initialize Twilio client
  const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  // Search for available +34 (Spain) phone numbers
  console.log('[Provision Number] Searching for available +34 numbers');

  const availableNumbers = await twilioClient.availablePhoneNumbers('ES').local.list({
    limit: 10,
    voiceEnabled: true,
  });

  if (availableNumbers.length === 0) {
    throw new Error('No available Spanish phone numbers found');
  }

  const selectedNumber = availableNumbers[0];

  console.log('[Provision Number] Found available number', {
    phone_number: selectedNumber.phoneNumber,
    locality: selectedNumber.locality,
  });

  // Purchase the phone number with recording enabled
  const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
    phoneNumber: selectedNumber.phoneNumber,
    voiceUrl: event.webhook_url, // ElevenLabs webhook
    voiceMethod: 'POST',
    statusCallback: `${process.env.API_BASE_URL}/webhooks/twilio/call-status`,
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    friendlyName: `ConsultIA - ${event.customer_id}`,
  });

  console.log('[Provision Number] Number purchased', {
    phone_number: purchasedNumber.phoneNumber,
    twilio_sid: purchasedNumber.sid,
  });

  // Store in database
  const result = await query(
    `INSERT INTO phone_numbers (
      customer_id,
      agent_id,
      phone_number,
      twilio_sid,
      country_code,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING phone_id`,
    [
      event.customer_id,
      event.agent_id,
      purchasedNumber.phoneNumber,
      purchasedNumber.sid,
      '+34',
      'active',
    ]
  );

  const phone_id = result.rows[0].phone_id;

  // Return data for next step
  return {
    ...event,
    phone_number: purchasedNumber.phoneNumber,
    twilio_sid: purchasedNumber.sid,
    phone_id,
  };
}
