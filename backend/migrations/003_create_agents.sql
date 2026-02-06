-- ========================================
-- Migration 003: Create agents table
-- ========================================
-- AI Agents (ElevenLabs Conversational AI)

CREATE TABLE IF NOT EXISTS agents (
  agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,

  -- ElevenLabs Integration
  elevenlabs_agent_id VARCHAR(255) UNIQUE NOT NULL,
  agent_name VARCHAR(255),
  voice_id VARCHAR(255) NOT NULL,
  voice_name VARCHAR(100),

  -- Configuration
  system_prompt TEXT,
  conversation_config JSONB, -- turn_timeout, max_duration, initial_message
  webhook_url VARCHAR(500), -- ElevenLabs inbound phone call webhook

  -- Status
  status VARCHAR(50) DEFAULT 'deploying' CHECK (
    status IN ('deploying', 'active', 'inactive', 'error', 'deleted')
  ),
  error_message TEXT,

  -- Timestamps
  deployed_at TIMESTAMP,
  last_active_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_agents_customer ON agents(customer_id);
CREATE INDEX idx_agents_elevenlabs ON agents(elevenlabs_agent_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_last_active ON agents(last_active_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set deployed_at when status becomes 'active'
CREATE OR REPLACE FUNCTION set_agent_deployed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status = 'deploying' THEN
    NEW.deployed_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_agent_deployed_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION set_agent_deployed_at();

-- Add comments
COMMENT ON TABLE agents IS 'AI agents created via ElevenLabs Conversational AI API';
COMMENT ON COLUMN agents.elevenlabs_agent_id IS 'Agent ID from ElevenLabs API response';
COMMENT ON COLUMN agents.voice_id IS 'ElevenLabs voice ID (e.g., 21m00Tcm4TlvDq8ikWAM for Rachel)';
COMMENT ON COLUMN agents.system_prompt IS 'Generated system prompt with business context and knowledge base';
COMMENT ON COLUMN agents.conversation_config IS 'ElevenLabs conversation configuration (JSON)';
COMMENT ON COLUMN agents.webhook_url IS 'Webhook URL for inbound calls (connects Twilio to ElevenLabs)';
