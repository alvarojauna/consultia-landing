/**
 * ConsultIA API Client
 *
 * Lightweight fetch wrapper for communicating with the backend API.
 * No external dependencies — uses native fetch.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.consultia.es'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    request_id?: string
  }
}

class ApiError extends Error {
  code: string
  status: number
  details?: any

  constructor(code: string, message: string, status: number, details?: any) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  // Add auth token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('consultia_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const json: ApiResponse<T> = await response.json()

  if (!json.success || json.error) {
    throw new ApiError(
      json.error?.code || 'UNKNOWN_ERROR',
      json.error?.message || 'An unexpected error occurred',
      response.status,
      json.error?.details
    )
  }

  return json.data as T
}

// ============================
// Onboarding API
// ============================

export interface BusinessInfoPayload {
  website: string
  country_code: string
}

export interface BusinessInfoResult {
  customer_id: string
  scraping_job_id: string
}

export interface ScrapedBusinessData {
  status: string
  scraped_data: {
    business_name?: string
    address?: string
    phone?: string
    email?: string
    services?: string[]
    hours?: Record<string, string>
    industry?: string
    description?: string
    social_media?: Record<string, string>
    error?: string
  }
}

export interface ConfirmBusinessPayload {
  business_name: string
  business_address?: string
  business_phone?: string
  industry?: string
  services?: string[]
  hours?: Record<string, string>
}

export interface Voice {
  voice_id: string
  name: string
  category: string
  preview_url?: string
  description?: string
}

export interface KBUploadResult {
  source_id: string
  s3_key: string
  upload_url?: string
}

export interface KBStatus {
  status: 'pending' | 'processing' | 'complete' | 'error'
  progress: number
  total_sources: number
  processed_sources: number
  structured_data_preview?: any
}

export interface DeployResult {
  execution_arn: string
  agent_id: string
}

export interface DeployStatus {
  status: 'creating_agent' | 'provisioning_number' | 'linking' | 'complete' | 'error'
  agent_id?: string
  phone_number?: string
  agent_name?: string
  docs_processed?: number
  faqs_extracted?: number
}

export interface TestCallResult {
  test_call_id: string
  call_sid: string
  status: string
}

export interface TestCallStatus {
  test_call_id: string
  call_sid: string
  status: string
  duration_seconds?: number
  recording_url?: string
  transcript?: string
}

export interface Plan {
  id: string
  name: string
  tier: 'starter' | 'professional' | 'enterprise'
  price_monthly: number
  price_yearly: number
  minutes_included: number
  features: string[]
}

export const api = {
  // Step 1: Business info
  submitBusinessInfo: (data: BusinessInfoPayload) =>
    request<BusinessInfoResult>('/onboarding/business-info', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Step 2: Get & confirm business
  getBusinessStatus: (customerId: string) =>
    request<ScrapedBusinessData>(`/onboarding/${customerId}/business-status`),

  confirmBusiness: (customerId: string, data: ConfirmBusinessPayload) =>
    request<{ success: boolean }>(`/onboarding/${customerId}/confirm-business`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Step 3: Voices
  getVoices: () => request<Voice[]>('/voices'),

  selectVoice: (customerId: string, voiceId: string, voiceName: string) =>
    request<{ success: boolean }>(`/onboarding/${customerId}/select-voice`, {
      method: 'POST',
      body: JSON.stringify({ voice_id: voiceId, voice_name: voiceName }),
    }),

  // Step 4: Knowledge base
  uploadKnowledgeBase: async (customerId: string, files: File[]): Promise<KBUploadResult[]> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    const url = `${API_BASE_URL}/onboarding/${customerId}/knowledge-base/upload`
    const token = typeof window !== 'undefined' ? localStorage.getItem('consultia_token') : null

    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })

    const json = await response.json()
    if (!json.success) throw new ApiError(json.error?.code, json.error?.message, response.status)
    return json.data
  },

  submitKnowledgeText: (customerId: string, text: string, category: string) =>
    request<{ success: boolean }>(`/onboarding/${customerId}/knowledge-base/text`, {
      method: 'POST',
      body: JSON.stringify({ manual_text: text, category }),
    }),

  getKBStatus: (customerId: string) =>
    request<KBStatus>(`/onboarding/${customerId}/knowledge-base/status`),

  // Step 5: Deploy & test
  deployAgent: (customerId: string) =>
    request<DeployResult>(`/onboarding/${customerId}/deploy-agent`, { method: 'POST' }),

  getDeployStatus: (customerId: string) =>
    request<DeployStatus>(`/onboarding/${customerId}/deploy-status`),

  testCall: (customerId: string, phoneNumber: string) =>
    request<TestCallResult>(`/onboarding/${customerId}/test-call`, {
      method: 'POST',
      body: JSON.stringify({ test_phone_number: phoneNumber }),
    }),

  getTestCallStatus: (customerId: string, callSid: string) =>
    request<TestCallStatus>(`/onboarding/${customerId}/test-call/${callSid}/status`),

  // Step 6: Payment
  getPlans: () => request<Plan[]>('/plans'),

  selectPlan: (customerId: string, tier: string, period: string, minutes: number) =>
    request<{ success: boolean }>(`/onboarding/${customerId}/select-plan`, {
      method: 'POST',
      body: JSON.stringify({ plan_tier: tier, billing_period: period, minutes_included: minutes }),
    }),

  completePayment: (customerId: string, paymentMethodId: string) =>
    request<{ dashboard_url: string }>(`/onboarding/${customerId}/complete-payment`, {
      method: 'POST',
      body: JSON.stringify({ stripe_payment_method_id: paymentMethodId }),
    }),
}

export { ApiError }
