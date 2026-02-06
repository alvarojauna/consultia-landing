-- ========================================
-- Migration 001: Create enterprises table
-- ========================================
-- Multi-tenant root: ConsultIA enterprise account

CREATE TABLE IF NOT EXISTS enterprises (
  enterprise_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  elevenlabs_enterprise_id VARCHAR(255) UNIQUE,
  twilio_account_sid VARCHAR(255),
  stripe_platform_account_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_enterprises_name ON enterprises(name);

-- Insert default ConsultIA enterprise
INSERT INTO enterprises (
  enterprise_id,
  name
) VALUES (
  'e0000000-0000-0000-0000-000000000001'::UUID,
  'ConsultIA'
) ON CONFLICT (enterprise_id) DO NOTHING;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enterprises_updated_at
  BEFORE UPDATE ON enterprises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE enterprises IS 'Multi-tenant root: Stores enterprise accounts like ConsultIA';
