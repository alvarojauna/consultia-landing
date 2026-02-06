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

// Individual event types for each action
type CreateAgentEvent = DeploymentEvent & {
  action: 'create-agent';
  voice_id: string;
  voice_name: string;
};

type ProvisionNumberEvent = DeploymentEvent & {
  action: 'provision-number';
  elevenlabs_agent_id: string;
  webhook_url: string;
};

type LinkNumberEvent = DeploymentEvent & {
  action: 'link-number';
  phone_number: string;
  twilio_sid: string;
};

type UpdateDatabaseEvent = DeploymentEvent & {
  action: 'update-database';
  elevenlabs_agent_id: string;
  phone_number: string;
};

export const handler = async (event: DeploymentEvent): Promise<any> => {
  console.log('[Agent Deployment] Event:', JSON.stringify(event));

  const { action } = event;

  try {
    switch (action) {
      case 'create-agent':
        if (!event.voice_id) throw new Error('voice_id is required for create-agent');
        return await createAgent(event as any);

      case 'provision-number':
        if (!event.elevenlabs_agent_id) throw new Error('elevenlabs_agent_id is required for provision-number');
        return await provisionNumber(event as any);

      case 'link-number':
        if (!event.phone_number) throw new Error('phone_number is required for link-number');
        return await linkNumber(event as any);

      case 'update-database':
        if (!event.elevenlabs_agent_id) throw new Error('elevenlabs_agent_id is required for update-database');
        return await updateDatabase(event as any);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error(`[Agent Deployment] Error in ${action}:`, error);

    // Return error for Step Functions to handle
    throw error;
  }
};
