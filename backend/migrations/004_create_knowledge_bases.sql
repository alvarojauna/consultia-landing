-- ========================================
-- Migration 004: Create knowledge bases tables
-- ========================================

-- Main knowledge base table
CREATE TABLE IF NOT EXISTS knowledge_bases (
  kb_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(agent_id) ON DELETE CASCADE,

  -- Structured data extracted by Bedrock Claude
  structured_data JSONB, -- { services, faqs, policies, hours, contacts, locations }

  -- Processing status
  processing_status VARCHAR(50) DEFAULT 'pending' CHECK (
    processing_status IN ('pending', 'processing', 'complete', 'error')
  ),
  total_sources INTEGER DEFAULT 0,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base sources (individual files)
CREATE TABLE IF NOT EXISTS kb_sources (
  source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id UUID NOT NULL REFERENCES knowledge_bases(kb_id) ON DELETE CASCADE,

  -- Source information
  source_type VARCHAR(50) CHECK (
    source_type IN ('pdf', 'docx', 'txt', 'manual_text', 'scraped_web')
  ),
  file_name VARCHAR(255),
  s3_key VARCHAR(500), -- s3://consultia-knowledge-bases/{customer_id}/{file}
  file_size_bytes BIGINT,

  -- Extracted content
  raw_text TEXT, -- Extracted text before structuring
  extracted_data JSONB, -- Structured data from this specific source

  -- Processing
  processing_status VARCHAR(50) DEFAULT 'pending' CHECK (
    processing_status IN ('pending', 'processing', 'complete', 'error')
  ),
  error_message TEXT,

  -- Timestamps
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_kb_customer ON knowledge_bases(customer_id);
CREATE INDEX idx_kb_agent ON knowledge_bases(agent_id);
CREATE INDEX idx_kb_status ON knowledge_bases(processing_status);

CREATE INDEX idx_kb_sources_kb ON kb_sources(kb_id);
CREATE INDEX idx_kb_sources_status ON kb_sources(processing_status);
CREATE INDEX idx_kb_sources_s3_key ON kb_sources(s3_key);

-- Triggers
CREATE TRIGGER update_knowledge_bases_updated_at
  BEFORE UPDATE ON knowledge_bases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set processed_at when status becomes 'complete'
CREATE OR REPLACE FUNCTION set_kb_source_processed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.processing_status = 'complete' AND OLD.processing_status != 'complete' THEN
    NEW.processed_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_kb_source_processed_at
  BEFORE UPDATE ON kb_sources
  FOR EACH ROW
  EXECUTE FUNCTION set_kb_source_processed_at();

-- Comments
COMMENT ON TABLE knowledge_bases IS 'Knowledge bases for AI agents (aggregated structured data)';
COMMENT ON COLUMN knowledge_bases.structured_data IS 'Structured JSON output from Bedrock Claude extraction';
COMMENT ON TABLE kb_sources IS 'Individual knowledge base sources (PDFs, docs, manual text)';
COMMENT ON COLUMN kb_sources.raw_text IS 'Extracted plain text before Bedrock processing';
