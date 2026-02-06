-- ========================================
-- Migration 007: Create business_info table
-- ========================================
-- Business information scraped from website

CREATE TABLE IF NOT EXISTS business_info (
  info_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,

  -- Scraped data
  scraped_data JSONB, -- Raw scraped data from website
  services TEXT[], -- Array of services offered
  hours JSONB, -- { "mon-fri": "09:00-20:00", "sat": "10:00-14:00", "sun": "closed" }
  locations JSONB[], -- Array of location objects
  contacts JSONB, -- { emails: [...], phones: [...] }

  -- Metadata
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_business_info_customer ON business_info(customer_id);
CREATE INDEX idx_business_info_confirmed ON business_info(confirmed);

-- Trigger
CREATE TRIGGER update_business_info_updated_at
  BEFORE UPDATE ON business_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set confirmed_at
CREATE OR REPLACE FUNCTION set_business_info_confirmed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmed = TRUE AND OLD.confirmed = FALSE THEN
    NEW.confirmed_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_business_info_confirmed_at
  BEFORE UPDATE ON business_info
  FOR EACH ROW
  EXECUTE FUNCTION set_business_info_confirmed_at();

-- Comments
COMMENT ON TABLE business_info IS 'Business information scraped from customer websites (Step 1 & 2)';
COMMENT ON COLUMN business_info.scraped_data IS 'Raw JSON data from web scraper';
COMMENT ON COLUMN business_info.confirmed IS 'User confirmed this information in Step 2';
