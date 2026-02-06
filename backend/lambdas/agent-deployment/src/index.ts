/**
 * Lambda: Agent Deployment
 *
 * Handles agent deployment for Step Functions workflow.
 *
 * Actions:
 * - create-agent: Create agent in ElevenLabs
 * - provision-number: Provision phone number from Twilio
 * - link-number: Link Twilio number to ElevenLabs agent
 * - update-database: Mark agent as active in database
 */

import { query, getApiKeys } from 'consultia-shared-nodejs';
import { createAgent } from './create-agent';
import { provisionNumber } from './provision-number';
import { linkNumber } from './link-number';
import { updateDatabase } from './update-database';

interface DeploymentEvent {
  action: 'create-agent' | 'provision-number' | 'link-number' | 'update-database';
  customer_id: string;
  agent_id: string;
  voice_id?: string;
  voice_name?: string;
  business?: {
    name: string;
    address?: string;
    industry?: string;
    services?: string[];
    hours?: Record<string, string>;
    contacts?: any;
  };
  knowledge_base?: {
    kb_id: string;
    structured_data: any;
  };
  // Passed between steps
  elevenlabs_agent_id?: string;
  webhook_url?: string;
  phone_number?: string;
  twilio_sid?: string;
  phone_id?: string;
}

export const handler = async (event: DeploymentEvent): Promise<any> => {
  console.log('[Agent Deployment] Event:', JSON.stringify(event));

  const { action } = event;

  try {
    switch (action) {
      case 'create-agent':
        return await createAgent(event);

      case 'provision-number':
        return await provisionNumber(event);

      case 'link-number':
        return await linkNumber(event);

      case 'update-database':
        return await updateDatabase(event);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error(`[Agent Deployment] Error in ${action}:`, error);

    // Return error for Step Functions to handle
    throw error;
  }
};
