# ConsultIA - Agent Creation Process

## Overview

This document describes the complete **6-step onboarding flow** for creating and deploying AI phone agents on the ConsultIA platform. The system enables businesses to self-serve create a custom AI receptionist powered by ElevenLabs Conversational AI, provision a Spanish phone number via Twilio, and test the agent before payment.

**Technology Stack:**
- **Frontend**: Next.js 14 (already deployed at consultia.es)
- **Backend**: AWS Lambda + API Gateway (serverless)
- **Database**: Aurora PostgreSQL (relational) + DynamoDB (call logs)
- **AI Agent**: ElevenLabs Conversational AI
- **Phone Numbers**: Twilio Programmable Voice
- **Payments**: Stripe Subscriptions (with usage-based metering)
- **Knowledge Extraction**: Amazon Bedrock (Claude 3.5 Sonnet)

**Business Model**: Multi-tenant SaaS where ConsultIA (enterprise account) hosts multiple business customers. Each customer gets their own AI agent, phone number, and subscription.

---

## 6-Step Onboarding Flow

### Step 1: Business Information

**Screenshot**: `0_business_information.png`

**User Inputs:**
- Business website URL
- Country code for phone number (defaults to +34 Spain)

**Backend Actions:**
```
POST /api/onboarding/business-info
{
  "website": "https://clinicaveterinaria.es",
  "country_code": "+34"
}
```

**What Happens:**
1. Create `customer` record in database with UUID
2. Trigger Lambda function `business-scraper` to fetch and parse website
3. Extract business name, address, services, hours, contact info
4. Store in `business_info` table with status "pending_confirmation"
5. Return `customer_id` and `scraping_job_id` to frontend

**Database Tables Used:**
- `customers` (INSERT new row)
- `business_info` (INSERT with scraped data)

---

### Step 2: Confirm Business Details

**Screenshot**: `1_confirm_business.png`

**User Actions:**
- Reviews scraped business information
- Edits any incorrect details
- Clicks "Confirm" or "Re-scrape"

**Backend Actions:**
```
GET /api/onboarding/:customerId/business-status
→ Returns: { status: "complete", scraped_data: {...} }

POST /api/onboarding/:customerId/confirm-business
{
  "business_name": "Clínica Veterinaria San Sebastián",
  "address": "Calle Mayor 123, 48001 Bilbao",
  "services": ["Consultas", "Vacunación", "Cirugía", "Urgencias 24h"],
  "hours": {
    "mon-fri": "09:00-20:00",
    "sat": "10:00-14:00",
    "sun": "Cerrado"
  },
  "phone": "+34944123456",
  "email": "info@vetbilbao.es"
}
```

**What Happens:**
1. Update `business_info.confirmed = true` and `business_info.confirmed_at = NOW()`
2. Update `customers.onboarding_step = 2`
3. Update `customers.onboarding_status = 'confirm'`
4. Store confirmed data in JSONB column

**Database Tables Used:**
- `business_info` (UPDATE confirmation)
- `customers` (UPDATE step)

---

### Step 3: Select Voice

**Screenshot**: `2_select_voice.png`

**User Actions:**
- Browse gallery of 7+ AI voices
- Click play button to preview each voice
- Select preferred voice for their agent

**Backend Actions:**
```
GET /api/voices
→ Returns ElevenLabs voice catalog (cached 5 min)
[
  {
    "voice_id": "21m00Tcm4TlvDq8ikWAM",
    "name": "Rachel",
    "gender": "female",
    "age": "young",
    "accent": "american",
    "description": "Calm and professional",
    "preview_url": "https://storage.googleapis.com/..."
  },
  ...
]

POST /api/onboarding/:customerId/select-voice
{
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "voice_name": "Rachel"
}
```

**What Happens:**
1. Store `voice_id` in `customers` table
2. Update `customers.onboarding_step = 3`
3. Update `customers.onboarding_status = 'voice'`
4. Voice will be used later when creating ElevenLabs agent in Step 5

**Database Tables Used:**
- `customers` (UPDATE voice_id, step)

---

### Step 4: Upload Knowledge Base ⭐ NEW

**Visual Design:**
```
┌──────────────────────────────────────────────────┐
│  📄 Añade información adicional sobre tu negocio │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │  📤 Arrastra archivos aquí o haz clic    │    │
│  │     Formatos: PDF, Word, TXT             │    │
│  └─────────────────────────────────────────┘    │
│                                                   │
│  O escribe manualmente:                          │
│  ┌─────────────────────────────────────────┐    │
│  │ Políticas de cancelación:                │    │
│  │ - 24 horas antes: reembolso completo     │    │
│  │ - Menos de 24h: cargo del 50%           │    │
│  └─────────────────────────────────────────┘    │
│                                                   │
│  Archivos subidos (2):                           │
│  ✅ servicios-veterinarios.pdf (1.2 MB)         │
│  ✅ preguntas-frecuentes.docx (850 KB)          │
│                                                   │
│  [Procesar información] →                        │
└──────────────────────────────────────────────────┘
```

**User Actions:**
- Upload PDF/DOCX/TXT files (drag & drop or click)
- OR manually type additional business information
- Click "Procesar información" to start extraction

**Backend Actions:**

**4a) Upload Files:**
```
POST /api/onboarding/:customerId/knowledge-base/upload
Content-Type: multipart/form-data

Files: [file1.pdf, file2.docx]
```

**Processing Pipeline:**
1. Lambda uploads files to S3: `s3://consultia-knowledge-bases/{customer_id}/{timestamp}/file.pdf`
2. Store record in `kb_sources` table (status: "pending")
3. Send SQS message to trigger `knowledge-base-processor` Lambda
4. Lambda downloads file from S3
5. Extract text using PyPDF2 (for PDF) or python-docx (for DOCX)
6. Call Amazon Bedrock with Claude 3.5 Sonnet:

```python
# Bedrock prompt to structure extracted text
prompt = """
Eres un asistente que estructura información de negocios.

Negocio: Clínica Veterinaria San Sebastián
Industria: veterinary

Analiza el siguiente texto y extrae información en JSON:

<extracted_text>
Servicios de Consulta Veterinaria
Ofrecemos consultas generales de lunes a viernes...
Vacunaciones: 45€
Cirugías: desde 200€
Política de cancelación: 24 horas de antelación...
</extracted_text>

Extrae:
- "services": lista de servicios con precios
- "faqs": preguntas frecuentes con respuestas
- "policies": políticas (cancelación, pago, reembolsos)
- "hours": horarios detallados
- "contacts": emails y teléfonos adicionales

Responde SOLO con JSON válido.
"""

# Bedrock returns structured JSON
{
  "services": [
    {"name": "Consulta general", "price": "45€", "description": "..."},
    {"name": "Vacunaciones", "price": "45€", "duration": "30min"}
  ],
  "faqs": [
    {"question": "¿Atienden urgencias?", "answer": "Sí, 24/7 llamando al..."}
  ],
  "policies": {
    "cancellation": "24 horas de antelación o cargo del 50%",
    "payment": "Efectivo, tarjeta, Bizum"
  }
}
```

7. Store structured JSON in `knowledge_bases.structured_data` (JSONB column)
8. Update `kb_sources.processing_status = 'complete'`
9. Update `knowledge_bases.processing_status = 'complete'`

**4b) Manual Text Entry:**
```
POST /api/onboarding/:customerId/knowledge-base/text
{
  "manual_text": "Políticas de cancelación: 24 horas antes sin cargo...",
  "category": "policies"
}
```

**4c) Check Processing Status:**
```
GET /api/onboarding/:customerId/knowledge-base/status
→ Returns: {
  "status": "processing",  // "pending" | "processing" | "complete" | "error"
  "progress": 75,  // Percentage 0-100
  "total_sources": 2,
  "processed_sources": 1,
  "structured_data_preview": { ... }  // When complete
}
```

**Database Tables Used:**
- `knowledge_bases` (INSERT with customer_id)
- `kb_sources` (INSERT for each file/text)

**S3 Buckets Used:**
- `consultia-knowledge-bases/{customer_id}/{timestamp}/`

**External APIs:**
- Amazon Bedrock (Claude 3.5 Sonnet for extraction)

**Cost per Document:**
- Bedrock: ~$0.03 per PDF (5000 input tokens + 1000 output tokens)

---

### Step 5: Deploy Agent & Test Call ⭐ NEW

**Visual Design:**
```
┌──────────────────────────────────────────────────┐
│  🤖 Tu agente está listo!                        │
│                                                   │
│  ✅ Agente de IA creado                          │
│  ✅ Número asignado: +34 944 123 456             │
│  ✅ Base de conocimiento configurada             │
│                                                   │
│  ┌────────────────────────────────────────┐     │
│  │  🎙️ Agente: "Recepcionista María"      │     │
│  │  📞 Número: +34 944 123 456             │     │
│  │  📚 Documentos procesados: 2            │     │
│  │  🧠 FAQs extraídas: 47                  │     │
│  └────────────────────────────────────────┘     │
│                                                   │
│  Prueba tu agente ahora:                         │
│  ┌────────────────────────────────────────┐     │
│  │  📞 Ingresa tu número para recibir      │     │
│  │     una llamada de prueba               │     │
│  │                                          │     │
│  │  +34 [___] [___] [___]                  │     │
│  │                                          │     │
│  │  [Recibir llamada de prueba] →          │     │
│  └────────────────────────────────────────┘     │
│                                                   │
│  [Continuar al pago] →                           │
└──────────────────────────────────────────────────┘
```

**Backend Actions:**

**5a) Deploy Agent:**
```
POST /api/onboarding/:customerId/deploy-agent
```

**Step Functions Workflow** (orchestrates 4 Lambda functions):

```
DeployAgentWorkflow (AWS Step Functions)
├─ CreateElevenLabsAgent (Lambda)
│  └─ Creates agent in ElevenLabs with custom prompt
├─ ProvisionTwilioNumber (Lambda)
│  └─ Searches and purchases +34 Spanish number
├─ LinkNumberToAgent (Lambda)
│  └─ Configures Twilio number to route to ElevenLabs
└─ UpdateDatabase (Lambda)
   └─ Stores agent_id, phone_number, webhook URLs
```

**Step 1: CreateElevenLabsAgent Lambda**
```javascript
// Fetch customer data and knowledge base
const customer = await db.customers.findById(customerId);
const kb = await db.knowledge_bases.findByCustomerId(customerId);

// Generate system prompt with knowledge base
const systemPrompt = `
Eres la recepcionista virtual de ${customer.business_name},
ubicado en ${customer.address}.

TU MISIÓN:
1. Responder preguntas sobre servicios, horarios, ubicación
2. Agendar citas (pedir nombre, teléfono, fecha/hora)
3. Filtrar spam (vendedores, encuestas)

INFORMACIÓN DEL NEGOCIO:
${JSON.stringify(kb.structured_data, null, 2)}

INSTRUCCIONES:
- Sé amable, profesional y eficiente
- Si no sabes algo, ofrece transferir a un humano
- Para agendar, confirma todos los datos antes de finalizar
- Si detectas spam, educadamente finaliza la llamada
`;

// Call ElevenLabs API
const response = await axios.post(
  'https://api.elevenlabs.io/v1/convai/agents',
  {
    name: `${customer.business_name} - Recepcionista`,
    voice_id: customer.voice_id,
    prompt: {
      system: systemPrompt,
      context: kb.structured_data
    },
    language: 'es',
    conversation_config: {
      turn_timeout: 10,
      max_duration: 1800,  // 30 minutes
      initial_message: `Hola, bienvenido a ${customer.business_name}. ¿En qué puedo ayudarte?`
    },
    webhook_url: `https://api.consultia.es/webhooks/elevenlabs/call-events`
  },
  {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
  }
);

// Store agent_id in database
await db.agents.create({
  agent_id: uuidv4(),
  customer_id: customerId,
  elevenlabs_agent_id: response.data.agent_id,
  webhook_url: response.data.inbound_phone_call_webhook_url,
  status: 'deploying'
});
```

**Step 2: ProvisionTwilioNumber Lambda**
```javascript
// Search for available Spanish numbers
const availableNumbers = await twilio.availablePhoneNumbers('ES')
  .local
  .list({ limit: 10 });

// Purchase first available
const purchasedNumber = await twilio.incomingPhoneNumbers.create({
  phoneNumber: availableNumbers[0].phoneNumber,
  voiceUrl: agent.webhook_url,  // ElevenLabs webhook from Step 1
  voiceMethod: 'POST',
  statusCallback: `https://api.consultia.es/webhooks/twilio/call-status`,
  statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
});

// Store in database
await db.phone_numbers.create({
  phone_id: uuidv4(),
  customer_id: customerId,
  phone_number: purchasedNumber.phoneNumber,
  twilio_sid: purchasedNumber.sid,
  country_code: '+34',
  status: 'active'
});
```

**5b) Check Deployment Status:**
```
GET /api/onboarding/:customerId/deploy-status
→ Returns: {
  "status": "complete",  // "creating_agent" | "provisioning_number" | "complete" | "error"
  "agent_id": "ag_abc123",
  "phone_number": "+34944123456",
  "webhook_url": "https://..."
}
```

**5c) Test Call:**
```
POST /api/onboarding/:customerId/test-call
{
  "test_phone_number": "+34666777888"
}
```

**Test Call Flow:**
1. Twilio initiates outbound call from agent's number to user's phone
2. User answers, call routes to ElevenLabs agent via webhook
3. Agent greets: "Hola, bienvenido a Clínica Veterinaria San Sebastián. ¿En qué puedo ayudarte?"
4. User can test conversation
5. Twilio webhooks send call status updates (ringing, answered, completed)
6. Frontend receives real-time updates via WebSocket
7. After call ends, display recording URL and duration

**Database Tables Used:**
- `agents` (INSERT with elevenlabs_agent_id)
- `phone_numbers` (INSERT with twilio_sid)
- `test_calls` (INSERT with call_sid, status, duration)

**External APIs:**
- ElevenLabs Conversational AI API (create agent)
- Twilio API (provision number, initiate call)

**Real-Time Updates:**
- WebSocket connection: `wss://api.consultia.es/ws/test-call/:customerId`
- Pushes: `{"status": "ringing"}`, `{"status": "answered"}`, `{"status": "completed", "duration": 127}`

---

### Step 6: Payment Information

**Screenshot**: `3_payment_information.png`

**User Actions:**
- Select billing period (monthly/yearly)
- Choose plan tier (Starter 29€, Professional 79€, Enterprise 199€)
- Enter credit card details via Stripe Elements
- Click "Empezar" to complete payment

**Backend Actions:**
```
POST /api/onboarding/:customerId/select-plan
{
  "plan_tier": "professional",
  "billing_period": "monthly",
  "minutes_included": 300
}

POST /api/onboarding/:customerId/complete-payment
{
  "stripe_payment_method_id": "pm_xxx",
  "stripe_customer_id": "cus_xxx"
}
```

**What Happens:**
1. Create Stripe customer: `stripe.customers.create({ email, metadata: { customer_id } })`
2. Create Stripe subscription with 2 line items:
   - **Fixed**: Plan tier (29€/79€/199€ per month)
   - **Metered**: Extra minutes beyond quota (€0.15 per minute)
3. Store in `subscriptions` table
4. Update `agents.status = 'active'` (agent goes live!)
5. Send confirmation email with dashboard link
6. Return `{ dashboard_url: '/dashboard/:customerId' }`

**Stripe Subscription Structure:**
```javascript
{
  customer: 'cus_abc',
  items: [
    {
      price: 'price_professional_monthly',  // 79€/month
      quantity: 1
    },
    {
      price: 'price_minutes_metered',  // €0.15 per minute over 300
      quantity: 0  // Usage reported later
    }
  ],
  trial_period_days: 14,  // Optional 14-day trial
  metadata: {
    customer_id: 'cust_abc123',
    agent_id: 'ag_xyz',
    phone_number: '+34944123456'
  }
}
```

**Database Tables Used:**
- `subscriptions` (INSERT with stripe_subscription_id)
- `agents` (UPDATE status to 'active')
- `customers` (UPDATE onboarding_status to 'complete')

**External APIs:**
- Stripe API (create customer, subscription)

---

## Database Schema

### PostgreSQL (Aurora Serverless v2)

**13 Core Tables:**

1. **enterprises** - Multi-tenant root (ConsultIA)
2. **customers** - Business customers (PYMEs)
3. **agents** - ElevenLabs AI agents (1 per customer)
4. **knowledge_bases** - Structured knowledge JSONB
5. **kb_sources** - Individual PDF/DOCX files
6. **phone_numbers** - Twilio numbers (1+ per customer)
7. **subscriptions** - Stripe subscriptions
8. **usage_records** - Call minutes tracking
9. **test_calls** - Pre-payment test calls
10. **business_info** - Scraped business data
11. **call_logs** → **Moved to DynamoDB** (high throughput)
12. **agent_sessions** → **Moved to DynamoDB**

**Key Relationships:**
```
enterprises (1) ──┬──> customers (N)
                  │
customers (1) ────┼──> agents (1)
                  │
customers (1) ────┼──> knowledge_bases (1) ──> kb_sources (N)
                  │
customers (1) ────┼──> phone_numbers (N)
                  │
customers (1) ────┼──> subscriptions (1) ──> usage_records (N)
                  │
customers (1) ────┴──> test_calls (N)
```

**Example Row (customers table):**
```sql
{
  customer_id: 'cust_abc123',
  enterprise_id: 'ent_consultia',
  email: 'admin@vetbilbao.es',
  business_name: 'Clínica Veterinaria San Sebastián',
  business_website: 'https://vetbilbao.es',
  industry: 'veterinary',
  onboarding_status: 'complete',
  onboarding_step: 6,
  status: 'active',
  created_at: '2025-01-15T10:30:00Z'
}
```

### DynamoDB (High-Throughput Data)

**Table: call_logs**
- **Partition Key**: `customer_id` (STRING)
- **Sort Key**: `call_timestamp` (NUMBER) - Unix timestamp
- **TTL**: 90 days (auto-delete old logs)

**Example Item:**
```json
{
  "customer_id": "cust_abc123",
  "call_timestamp": 1735689600000,
  "call_sid": "CA1234567890",
  "agent_id": "ag_xyz",
  "phone_number": "+34944123456",
  "caller_number": "+34666777888",
  "direction": "inbound",
  "status": "completed",
  "duration_seconds": 187,
  "transcript": "Cliente preguntó por horarios de vacunación...",
  "summary": "Agendó cita para vacunación el 2025-01-20 a las 15:00",
  "recording_url": "https://api.twilio.com/recordings/RE123",
  "cost_eur": 0.47
}
```

**Table: agent_sessions**
- **Partition Key**: `agent_id` (STRING)
- **Sort Key**: `session_timestamp` (NUMBER)

**Purpose**: Track conversation sessions for analytics (turns, entities extracted, outcomes)

---

## API Endpoints

### Authentication
```
POST /auth/register        - Create new customer account
POST /auth/login           - Login with email/password
POST /auth/refresh-token   - Refresh JWT token
POST /auth/logout          - Logout and invalidate token
```

### Onboarding Flow
```
POST   /onboarding/business-info
GET    /onboarding/:customerId/business-status
POST   /onboarding/:customerId/confirm-business

GET    /voices (public)
POST   /onboarding/:customerId/select-voice

POST   /onboarding/:customerId/knowledge-base/upload
POST   /onboarding/:customerId/knowledge-base/text
GET    /onboarding/:customerId/knowledge-base/status
DELETE /onboarding/:customerId/knowledge-base/source/:sourceId

POST   /onboarding/:customerId/deploy-agent
GET    /onboarding/:customerId/deploy-status
POST   /onboarding/:customerId/test-call
GET    /onboarding/:customerId/test-call/:callSid/status

GET    /plans (public)
POST   /onboarding/:customerId/select-plan
POST   /onboarding/:customerId/create-payment-intent
POST   /onboarding/:customerId/complete-payment
```

### Dashboard (Post-Onboarding)
```
GET    /dashboard/:customerId/overview
GET    /dashboard/:customerId/agent
PATCH  /dashboard/:customerId/agent/settings
POST   /dashboard/:customerId/agent/pause
POST   /dashboard/:customerId/agent/resume

GET    /dashboard/:customerId/calls
GET    /dashboard/:customerId/calls/:callSid
GET    /dashboard/:customerId/calls/:callSid/recording
GET    /dashboard/:customerId/calls/:callSid/transcript

GET    /dashboard/:customerId/usage
GET    /dashboard/:customerId/billing
GET    /dashboard/:customerId/invoices

PATCH  /dashboard/:customerId/subscription
POST   /dashboard/:customerId/subscription/cancel
```

### Webhooks (External Services)
```
POST /webhooks/twilio/call-status              - Twilio call status updates
POST /webhooks/twilio/test-call-status/:customerId
POST /webhooks/elevenlabs/call-events          - ElevenLabs conversation events
POST /webhooks/stripe/events                   - Stripe subscription webhooks
```

---

## AWS Architecture

```
FRONTEND (Next.js 14)
https://consultia.es
        ↓
API GATEWAY (REST + WebSocket)
https://api.consultia.es
Authorization: Cognito JWT
        ↓
LAMBDA FUNCTIONS (7 total)
├─ onboarding-api (Node.js 20.x, 512MB, 30s)
├─ agent-deployment (Node.js 20.x, 512MB, 60s)
├─ knowledge-base-processor (Python 3.12, 3GB, 900s)
├─ twilio-webhook (Node.js 20.x, 256MB, 10s)
├─ stripe-webhook (Node.js 20.x, 256MB, 10s)
├─ usage-tracker (Python 3.12, 256MB, 15s)
└─ business-scraper (Python 3.12, 1GB, 60s)
        ↓
STEP FUNCTIONS
DeployAgentWorkflow (orchestrates Step 5)
        ↓
DATABASES & STORAGE
├─ Aurora PostgreSQL (13 tables, 0.5-16 ACU)
├─ DynamoDB (call_logs, agent_sessions)
└─ S3 (knowledge-bases, call-recordings)
        ↓
EXTERNAL APIs
├─ ElevenLabs (agent creation, voice synthesis)
├─ Twilio (phone provisioning, call routing)
├─ Stripe (subscriptions, metered billing)
└─ Amazon Bedrock (Claude 3.5 Sonnet for extraction)
```

---

## Cost Estimates (10 Customers, Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| **AWS** | | |
| Aurora Serverless | 0.5-2 ACU avg | $50-200 |
| DynamoDB | On-demand | $25 |
| Lambda | 100K invocations | $5 |
| S3 | 100 GB storage | $3 |
| API Gateway | 1M requests | $4 |
| Cognito | 10 users | Free |
| Step Functions | 100 executions | $0.30 |
| CloudWatch | Logs | $10 |
| **AWS Total** | | **$100-250** |
| | | |
| **External Services** | | |
| ElevenLabs | 10 agents, 5000 min | $500-1000 |
| Twilio Numbers | 10 x $1.15 | $11.50 |
| Twilio Calls | 5000 min x $0.013 | $65 |
| Stripe Fees | 2.9% + €0.25 | $25 |
| **External Total** | | **$600-1100** |
| | | |
| **GRAND TOTAL** | | **$700-1350** |

**Revenue (10 Customers):**
- 5 Starter (29€) + 3 Professional (79€) + 2 Enterprise (199€) = **€782/month**
- **Break-even**: 15-20 customers

---

## Implementation Phases

### Phase 1: Infrastructure (Weeks 1-2)
- Setup AWS account, IAM roles, VPC
- Deploy Aurora PostgreSQL + DynamoDB
- Create S3 buckets, Cognito, API Gateway
- Deploy Lambda function scaffolds

### Phase 2: Steps 1-3 (Weeks 3-4)
- Business scraper Lambda
- Voice selection API (ElevenLabs integration)
- Frontend components for Steps 1-3

### Phase 3: Step 4 - Knowledge Base (Weeks 5-6)
- File upload to S3
- PDF/DOCX extraction Lambda
- Bedrock integration for structuring
- Frontend upload component

### Phase 4: Step 5 - Agent Deployment (Weeks 7-8)
- Step Functions workflow
- ElevenLabs agent creation Lambda
- Twilio phone provisioning Lambda
- Test call functionality
- Frontend test component

### Phase 5: Step 6 - Payment (Week 9)
- Stripe integration
- Usage tracking Lambda
- Agent activation
- Frontend payment component

### Phase 6: Dashboard (Week 10)
- Dashboard overview page
- Call history, billing, settings
- Agent pause/resume functionality

### Phase 7: Polish & Launch (Week 10)
- Error handling, security audit
- Load testing (100 concurrent onboardings)
- Documentation, monitoring alerts
- Launch to 10 beta customers in Bilbao

---

## Testing Guide

### Local Development
```bash
# Setup environment
cp .env.example .env
npm install

# Start local API
npm run dev:api

# Run database migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Test Lambda functions locally
sam local invoke knowledge-base-processor --event events/test-pdf.json
```

### Integration Testing
```bash
# ElevenLabs
curl -X POST https://api.elevenlabs.io/v1/convai/agents \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -d '{"name": "Test Agent", "voice_id": "..."}'

# Twilio
node scripts/test-twilio-number.js

# Stripe (test mode)
stripe listen --forward-to localhost:3000/webhooks/stripe/events
```

### End-to-End Testing
1. Run through all 6 onboarding steps in staging
2. Upload test PDF for knowledge base
3. Deploy agent and make test call
4. Complete payment with Stripe test card `4242 4242 4242 4242`
5. Verify agent status changes to 'active' in database
6. Make real call to provisioned number, verify it connects to agent

---

## Deployment

### Prerequisites
- AWS account with billing enabled
- ElevenLabs account (Pro or Enterprise tier)
- Twilio account with Spanish phone numbers enabled
- Stripe account (with Connect enabled for platform)

### Deploy to Production
```bash
# Build and deploy infrastructure
cd backend/infra
cdk deploy --all

# Deploy Lambda functions
cd ../lambdas
npm run deploy

# Deploy frontend to Amplify
git push origin main
# (Amplify auto-deploys on push)
```

### Post-Deployment Checklist
- [ ] Custom domain configured (api.consultia.es)
- [ ] SSL certificates verified (Amplify + API Gateway)
- [ ] Cognito user pool configured
- [ ] Environment variables set in Lambda
- [ ] ElevenLabs API key in Secrets Manager
- [ ] Twilio credentials in Secrets Manager
- [ ] Stripe webhook secret configured
- [ ] CloudWatch alarms configured
- [ ] Monitoring dashboard created

---

## Troubleshooting

### Agent Not Created (Step 5)
```bash
# Check Step Functions execution
aws stepfunctions describe-execution --execution-arn arn:...

# Check Lambda logs
aws logs tail /aws/lambda/agent-deployment-handler --follow

# Verify ElevenLabs API key
curl -H "xi-api-key: $KEY" https://api.elevenlabs.io/v1/voices
```

### Phone Number Not Provisioned
```bash
# Check Twilio account balance
twilio api:core:accounts:fetch

# Check available Spanish numbers
twilio api:core:available-phone-numbers:local:list --country-code ES

# Verify webhook URL is accessible
curl -X POST https://api.consultia.es/webhooks/twilio/call-status
```

### Knowledge Base Processing Failed
```bash
# Check S3 upload
aws s3 ls s3://consultia-knowledge-bases/{customer_id}/

# Check SQS queue
aws sqs get-queue-attributes --queue-url ... --attribute-names All

# Check Bedrock permissions
aws bedrock list-foundation-models

# Retry processing
POST /api/onboarding/:customerId/knowledge-base/retry
```

### Test Call Not Working
- Verify Twilio number has correct `voiceUrl` pointing to ElevenLabs
- Check ElevenLabs agent status is "active"
- Verify webhook URLs are publicly accessible (not localhost)
- Check Twilio call logs in console
- Ensure phone number format is correct (+34XXXXXXXXX)

---

## Security Considerations

### Multi-Tenant Isolation
- **Row-level security**: All queries filter by `customer_id` at application layer
- **Database**: Foreign keys with `ON DELETE CASCADE` for data consistency
- **API**: JWT tokens include `customer_id` claim, validated on every request

### Secrets Management
- **AWS Secrets Manager**: Store ElevenLabs API key, Twilio credentials, Stripe secret
- **Lambda Environment Variables**: No secrets, only ARNs to Secrets Manager
- **Frontend**: No API keys exposed, all sensitive calls go through backend

### Data Protection (RGPD/GDPR Compliance)
- **Region**: All data stored in `eu-west-1` (Ireland)
- **Encryption**: At-rest (AES-256) and in-transit (TLS 1.2+)
- **Data Retention**: Call recordings deleted after 7 years, call logs after 90 days
- **User Rights**: Provide API endpoints for data export and deletion on request

### Input Validation
- File uploads: Max 10MB, validate MIME types (PDF, DOCX, TXT only)
- Phone numbers: Regex validation for E.164 format
- SQL injection: Use parameterized queries (Prisma ORM)
- XSS: Sanitize all user inputs in frontend

---

## Support

### For Developers
- **API Documentation**: https://api.consultia.es/docs (Swagger)
- **Architecture Diagrams**: See `planning/deliverable.md`
- **PRD**: See `planning/prd.json` for all implementation items

### For Business Customers
- **Onboarding Guide**: https://consultia.es/docs/getting-started
- **FAQs**: https://consultia.es/faq
- **Support Email**: soporte@consultia.es
- **Dashboard**: https://consultia.es/dashboard (after completing onboarding)

---

## Roadmap

### Q1 2025 (MVP)
- [x] Landing page deployed
- [ ] Backend infrastructure (Phases 1-3)
- [ ] Onboarding flow Steps 1-4
- [ ] Agent deployment Step 5
- [ ] Payment Step 6
- [ ] Beta launch with 10 customers in Bilbao

### Q2 2025 (Enhancements)
- [ ] Dashboard with call history and analytics
- [ ] Multi-language support (Catalan, Basque, Galician)
- [ ] Advanced agent customization (custom prompts, workflows)
- [ ] Appointment integration (Google Calendar, Calendly, Doctoralia)
- [ ] CRM integration (Salesforce, HubSpot)

### Q3 2025 (Scale)
- [ ] White-label solution for agencies
- [ ] Multi-agent support (1 business → N agents)
- [ ] Advanced analytics and reporting
- [ ] Mobile app for iOS/Android

---

**Last Updated**: 2025-01-06
**Version**: 1.0
**Author**: ConsultIA Development Team
