-- ========================================
-- Migration 002: Create customers table
-- ========================================
-- Business customers (multi-tenant rows)

CREATE TABLE IF NOT EXISTS customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(enterprise_id) ON DELETE CASCADE,

  -- Authentication
  email VARCHAR(255) UNIQUE NOT NULL,
  cognito_user_id VARCHAR(255) UNIQUE,

  -- Business Information
  business_name VARCHAR(255),
  business_website VARCHAR(500),
  business_address TEXT,
  business_phone VARCHAR(50),
  industry VARCHAR(100), -- veterinary, dental, automotive, etc.

  -- Onboarding Progress
  onboarding_status VARCHAR(50) DEFAULT 'business_info' CHECK (
    onboarding_status IN (
      'business_info',
      'confirm',
      'voice',
      'kb_upload',
      'deploy',
      'payment',
      'complete'
    )
  ),
  onboarding_step INTEGER DEFAULT 1 CHECK (onboarding_step BETWEEN 1 AND 6),

  -- Status
  status VARCHAR(50) DEFAULT 'onboarding' CHECK (
    status IN ('onboarding', 'active', 'suspended', 'cancelled')
  ),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX idx_customers_enterprise ON customers(enterprise_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_cognito ON customers(cognito_user_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_onboarding_status ON customers(onboarding_status);

-- Trigger to update updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set completed_at when status becomes 'active'
CREATE OR REPLACE FUNCTION set_customer_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    NEW.completed_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_customer_completed_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_completed_at();

-- Add comments
COMMENT ON TABLE customers IS 'Business customers: Each customer creates and manages their own AI agents';
COMMENT ON COLUMN customers.onboarding_status IS 'Current step in onboarding flow (6 steps total)';
COMMENT ON COLUMN customers.onboarding_step IS 'Integer step number (1-6) for progress tracking';
COMMENT ON COLUMN customers.industry IS 'Business industry for prompt customization';
