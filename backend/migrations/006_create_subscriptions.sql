-- ========================================
-- Migration 006: Create subscriptions and usage tables
-- ========================================

-- Subscriptions (Stripe)
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,

  -- Stripe information
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,

  -- Plan details
  plan_tier VARCHAR(50) NOT NULL CHECK (
    plan_tier IN ('starter', 'professional', 'enterprise')
  ),
  billing_period VARCHAR(50) NOT NULL CHECK (
    billing_period IN ('monthly', 'yearly')
  ),
  minutes_included INTEGER NOT NULL, -- 150, 300, 500, 750, etc.
  price_eur DECIMAL(10, 2) NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (
    status IN ('active', 'past_due', 'cancelled', 'trialing', 'unpaid')
  ),

  -- Billing periods
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_end TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS usage_records (
  usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(agent_id) ON DELETE SET NULL,

  -- Usage details
  usage_type VARCHAR(50) NOT NULL CHECK (
    usage_type IN ('call_minutes', 'api_requests')
  ),
  quantity DECIMAL(10, 3), -- Minutes with 3 decimals (0.001 min = 0.06 sec)
  unit_price_eur DECIMAL(10, 4), -- €0.15 per minute over quota
  total_cost_eur DECIMAL(10, 2),

  -- Metadata
  call_sid VARCHAR(255), -- Twilio call SID for traceability
  stripe_usage_record_id VARCHAR(255), -- Stripe metered billing record ID

  -- Billing period
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,

  -- Timestamp
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test calls (before payment)
CREATE TABLE IF NOT EXISTS test_calls (
  test_call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(agent_id) ON DELETE SET NULL,

  -- Call details
  test_phone_number VARCHAR(50), -- User's phone to receive test call
  call_sid VARCHAR(255) UNIQUE, -- Twilio call SID
  status VARCHAR(50) CHECK (
    status IN ('initiated', 'ringing', 'answered', 'completed', 'failed', 'no-answer')
  ),

  -- Call results
  duration_seconds INTEGER,
  recording_url VARCHAR(500),
  transcript TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_stripe_cust ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE INDEX idx_usage_records_subscription ON usage_records(subscription_id);
CREATE INDEX idx_usage_records_customer ON usage_records(customer_id);
CREATE INDEX idx_usage_records_agent ON usage_records(agent_id);
CREATE INDEX idx_usage_records_billing_period ON usage_records(billing_period_start, billing_period_end);
CREATE INDEX idx_usage_records_recorded_at ON usage_records(recorded_at DESC);

CREATE INDEX idx_test_calls_customer ON test_calls(customer_id);
CREATE INDEX idx_test_calls_agent ON test_calls(agent_id);
CREATE INDEX idx_test_calls_call_sid ON test_calls(call_sid);

-- Triggers
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set cancelled_at
CREATE OR REPLACE FUNCTION set_subscription_cancelled_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_subscription_cancelled_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_subscription_cancelled_at();

-- Trigger to set test call completed_at
CREATE OR REPLACE FUNCTION set_test_call_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed', 'no-answer') AND OLD.status NOT IN ('completed', 'failed', 'no-answer') THEN
    NEW.completed_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_test_call_completed_at
  BEFORE UPDATE ON test_calls
  FOR EACH ROW
  EXECUTE FUNCTION set_test_call_completed_at();

-- Comments
COMMENT ON TABLE subscriptions IS 'Stripe subscriptions for customers';
COMMENT ON COLUMN subscriptions.minutes_included IS 'Monthly included minutes in plan';
COMMENT ON TABLE usage_records IS 'Usage tracking for billing (minutes, API calls)';
COMMENT ON COLUMN usage_records.quantity IS 'Quantity in minutes (3 decimal precision)';
COMMENT ON TABLE test_calls IS 'Test calls made before payment (Step 5 of onboarding)';
