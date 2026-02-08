/**
 * Shared TypeScript types for ConsultIA backend
 */

// ========================================
// Database Models
// ========================================

export interface Enterprise {
  enterprise_id: string;
  name: string;
  elevenlabs_enterprise_id?: string;
  twilio_account_sid?: string;
  stripe_platform_account_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Customer {
  customer_id: string;
  enterprise_id: string;
  email: string;
  cognito_user_id?: string;
  business_name?: string;
  business_website?: string;
  business_address?: string;
  business_phone?: string;
  industry?: string;
  onboarding_status: OnboardingStatus;
  onboarding_step: number;
  status: CustomerStatus;
  created_at: Date;
  completed_at?: Date;
  updated_at: Date;
}

export type OnboardingStatus =
  | 'business_info'
  | 'confirm'
  | 'voice'
  | 'kb_upload'
  | 'deploy'
  | 'payment'
  | 'complete';

export type CustomerStatus = 'onboarding' | 'active' | 'suspended' | 'cancelled';

export interface Agent {
  agent_id: string;
  customer_id: string;
  elevenlabs_agent_id: string;
  agent_name?: string;
  voice_id: string;
  voice_name?: string;
  system_prompt?: string;
  conversation_config?: Record<string, any>;
  webhook_url?: string;
  status: AgentStatus;
  error_message?: string;
  deployed_at?: Date;
  last_active_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type AgentStatus = 'deploying' | 'active' | 'inactive' | 'error' | 'deleted';

export interface KnowledgeBase {
  kb_id: string;
  customer_id: string;
  agent_id?: string;
  structured_data?: StructuredKnowledgeData;
  processing_status: ProcessingStatus;
  total_sources: number;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface StructuredKnowledgeData {
  services?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  policies?: Record<string, string>;
  hours?: Record<string, string>;
  contacts?: {
    emails?: string[];
    phones?: string[];
  };
  locations?: Array<{
    address: string;
    city?: string;
    country?: string;
  }>;
}

export type ProcessingStatus = 'pending' | 'processing' | 'complete' | 'error';

export interface KBSource {
  source_id: string;
  kb_id: string;
  source_type: 'pdf' | 'docx' | 'txt' | 'manual_text' | 'scraped_web';
  file_name?: string;
  s3_key?: string;
  file_size_bytes?: number;
  raw_text?: string;
  extracted_data?: any;
  processing_status: ProcessingStatus;
  error_message?: string;
  uploaded_at: Date;
  processed_at?: Date;
}

export interface PhoneNumber {
  phone_id: string;
  customer_id: string;
  agent_id?: string;
  phone_number: string;
  twilio_sid: string;
  country_code: string;
  status: 'active' | 'inactive' | 'released';
  provisioned_at: Date;
  released_at?: Date;
  updated_at: Date;
}

export interface Subscription {
  subscription_id: string;
  customer_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  plan_tier: 'starter' | 'professional' | 'enterprise';
  billing_period: 'monthly' | 'yearly';
  minutes_included: number;
  price_eur: number;
  status: 'active' | 'past_due' | 'cancelled' | 'trialing' | 'unpaid';
  current_period_start?: Date;
  current_period_end?: Date;
  trial_end?: Date;
  created_at: Date;
  cancelled_at?: Date;
  updated_at: Date;
}

export interface UsageRecord {
  usage_id: string;
  subscription_id?: string;
  customer_id: string;
  agent_id?: string;
  usage_type: 'call_minutes' | 'api_requests';
  quantity: number;
  unit_price_eur?: number;
  total_cost_eur?: number;
  call_sid?: string;
  stripe_usage_record_id?: string;
  billing_period_start: Date;
  billing_period_end: Date;
  recorded_at: Date;
}

export interface TestCall {
  test_call_id: string;
  customer_id: string;
  agent_id?: string;
  test_phone_number: string;
  call_sid?: string;
  status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'no-answer';
  duration_seconds?: number;
  recording_url?: string;
  transcript?: string;
  created_at: Date;
  completed_at?: Date;
}

export interface BusinessInfo {
  info_id: string;
  customer_id: string;
  scraped_data?: any;
  services?: string[];
  hours?: Record<string, string>;
  locations?: any[];
  contacts?: any;
  scraped_at: Date;
  confirmed: boolean;
  confirmed_at?: Date;
  updated_at: Date;
}

// ========================================
// API Request/Response Types
// ========================================

export interface BusinessInfoRequest {
  website: string;
  country_code: string;
}

export interface BusinessInfoResponse {
  customer_id: string;
  scraping_job_id: string;
}

export interface ConfirmBusinessRequest {
  business_name: string;
  business_address?: string;
  business_phone?: string;
  industry?: string;
  services?: string[];
  hours?: Record<string, string>;
}

export interface SelectVoiceRequest {
  voice_id: string;
  voice_name: string;
}

export interface KnowledgeBaseUploadResponse {
  source_id: string;
  s3_key: string;
  upload_url?: string; // Presigned URL for direct upload
}

export interface KnowledgeBaseTextRequest {
  manual_text: string;
  category?: string;
}

export interface DeployAgentResponse {
  execution_arn: string; // Step Functions execution ARN
  agent_id: string;
}

export interface TestCallRequest {
  test_phone_number: string;
}

export interface TestCallResponse {
  test_call_id: string;
  call_sid: string;
  status: string;
}

export interface SelectPlanRequest {
  plan_tier: 'starter' | 'professional' | 'enterprise';
  billing_period: 'monthly' | 'yearly';
  minutes_included: number;
}

export interface CompletePaymentRequest {
  stripe_payment_method_id: string;
  stripe_customer_id?: string;
  plan_tier: 'starter' | 'professional' | 'enterprise';
  billing_period: 'monthly' | 'yearly';
}

// ========================================
// API Response Wrapper
// ========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    request_id?: string;
  };
}

// ========================================
// Lambda Event Types
// ========================================

export interface APIGatewayProxyEventExtended {
  body: string;
  headers: Record<string, string>;
  httpMethod: string;
  path: string;
  pathParameters: Record<string, string> | null;
  queryStringParameters: Record<string, string> | null;
  requestContext: {
    requestId: string;
    authorizer?: {
      claims: {
        sub: string; // Cognito user ID
        email: string;
        [key: string]: any;
      };
    };
  };
}

// ========================================
// External API Types (ElevenLabs, Twilio, etc.)
// ========================================

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url?: string;
  description?: string;
}

export interface ElevenLabsAgentCreateRequest {
  name: string;
  voice_id: string;
  prompt: {
    system: string;
    context?: any;
  };
  language: string;
  conversation_config: {
    turn_timeout: number;
    max_duration: number;
    initial_message: string;
  };
  webhook_url?: string;
}

export interface ElevenLabsAgentCreateResponse {
  agent_id: string;
  inbound_phone_call_webhook_url: string;
}

export interface TwilioPhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
}

export interface TwilioCallStatusWebhook {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: 'initiated' | 'ringing' | 'answered' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
  Direction: 'inbound' | 'outbound-api';
  Duration?: string;
  RecordingUrl?: string;
}
