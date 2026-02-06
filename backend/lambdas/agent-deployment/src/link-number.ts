/**
 * Step 3: Link Twilio Number to ElevenLabs Agent
 */

import { query } from 'consultia-shared-nodejs';

interface LinkNumberEvent {
  customer_id: string;
  agent_id: string;
  phone_number: string;
  phone_id: string;
  [key: string]: any;
}

/**
 * Link phone number to agent (already done in provision step)
 * This step verifies the linkage and could add additional configuration
 */
export async function linkNumber(event: LinkNumberEvent): Promise<any> {
  console.log('[Link Number] Starting', {
    customer_id: event.customer_id,
    agent_id: event.agent_id,
    phone_number: event.phone_number,
  });

  // Verify phone_numbers record exists and is linked
  const result = await query(
    `SELECT phone_id FROM phone_numbers
     WHERE phone_id = $1 AND agent_id = $2 AND status = 'active'`,
    [event.phone_id, event.agent_id]
  );

  if (result.rows.length === 0) {
    throw new Error('Phone number not linked to agent');
  }

  console.log('[Link Number] Phone number verified and linked', {
    phone_id: event.phone_id,
    agent_id: event.agent_id,
  });

  // Could add additional Twilio configuration here if needed
  // (e.g., SMS capabilities, call recording settings, etc.)

  return event;
}
