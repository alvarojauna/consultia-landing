/**
 * Step 4: Update Database - Mark Agent as Active
 */

import { query } from 'consultia-shared-nodejs';

interface UpdateDatabaseEvent {
  customer_id: string;
  agent_id: string;
  elevenlabs_agent_id: string;
  phone_number: string;
  [key: string]: any;
}

/**
 * Mark agent as active in database
 */
export async function updateDatabase(event: UpdateDatabaseEvent): Promise<any> {
  console.log('[Update Database] Starting', {
    customer_id: event.customer_id,
    agent_id: event.agent_id,
  });

  // Update agent status to active
  await query(
    `UPDATE agents
     SET status = 'active',
         deployed_at = CURRENT_TIMESTAMP,
         last_active_at = CURRENT_TIMESTAMP
     WHERE agent_id = $1`,
    [event.agent_id]
  );

  console.log('[Update Database] Agent marked as active', {
    agent_id: event.agent_id,
  });

  // Return final result
  return {
    customer_id: event.customer_id,
    agent_id: event.agent_id,
    elevenlabs_agent_id: event.elevenlabs_agent_id,
    phone_number: event.phone_number,
    status: 'active',
    deployed_at: new Date().toISOString(),
  };
}
