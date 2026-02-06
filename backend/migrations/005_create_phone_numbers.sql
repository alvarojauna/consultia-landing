-- ========================================
-- Migration 005: Create phone_numbers table
-- ========================================
-- Phone numbers provisioned via Twilio

CREATE TABLE IF NOT EXISTS phone_numbers (
  phone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(agent_id) ON DELETE SET NULL,

  -- Twilio information
  phone_number VARCHAR(50) UNIQUE NOT NULL, -- E.164 format: +34944123456
  twilio_sid VARCHAR(255) UNIQUE NOT NULL, -- Twilio phone number SID
  country_code VARCHAR(10) DEFAULT '+34',

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'released')
  ),

  -- Timestamps
  provisioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_phone_numbers_customer ON phone_numbers(customer_id);
CREATE INDEX idx_phone_numbers_agent ON phone_numbers(agent_id);
CREATE INDEX idx_phone_numbers_phone ON phone_numbers(phone_number);
CREATE INDEX idx_phone_numbers_twilio ON phone_numbers(twilio_sid);
CREATE INDEX idx_phone_numbers_status ON phone_numbers(status);

-- Trigger
CREATE TRIGGER update_phone_numbers_updated_at
  BEFORE UPDATE ON phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set released_at when status becomes 'released'
CREATE OR REPLACE FUNCTION set_phone_released_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'released' AND OLD.status != 'released' THEN
    NEW.released_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_phone_released_at
  BEFORE UPDATE ON phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION set_phone_released_at();

-- Comments
COMMENT ON TABLE phone_numbers IS 'Twilio phone numbers provisioned for customers';
COMMENT ON COLUMN phone_numbers.phone_number IS 'Phone number in E.164 format (+34944123456)';
COMMENT ON COLUMN phone_numbers.twilio_sid IS 'Twilio phone number SID (PN...)';
COMMENT ON COLUMN phone_numbers.agent_id IS 'Linked agent (NULL if not yet linked)';
