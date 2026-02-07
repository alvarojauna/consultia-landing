# ConsultIA Backend - Agent Creation System

Backend serverless para el sistema de creación de agentes de IA. Construido con AWS Lambda, API Gateway, Aurora PostgreSQL y servicios externos (ElevenLabs, Twilio, Stripe).

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY                            │
│  REST API: https://api.consultia.es                        │
│  Authorizer: Cognito User Pools                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   AWS LAMBDA FUNCTIONS                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ onboarding-api (Node.js 20.x)                        │  │
│  │ - POST /onboarding/business-info                     │  │
│  │ - POST /onboarding/:id/confirm-business              │  │
│  │ - POST /onboarding/:id/select-voice                  │  │
│  │ - POST /onboarding/:id/knowledge-base/upload         │  │
│  │ - POST /onboarding/:id/deploy-agent                  │  │
│  │ - POST /onboarding/:id/complete-payment              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ knowledge-base-processor (Python 3.12)               │  │
│  │ - Extrae texto de PDFs (PyPDF2)                      │  │
│  │ - Estructura con Bedrock Claude 3.5 Sonnet          │  │
│  │ - Guarda en knowledge_bases table                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ agent-deployment (Node.js 20.x)                      │  │
│  │ - Crea agentes en ElevenLabs                         │  │
│  │ - Provisiona números de Twilio                       │  │
│  │ - Enlaza número con agente                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────┐  ┌──────────────┐  ┌─────────────────┐
│ Aurora PostgreSQL  │  │  DynamoDB    │  │  S3 Buckets     │
│ 13 tables          │  │  call_logs   │  │  kb-files       │
│ Multi-tenant       │  │  sessions    │  │  recordings     │
└────────────────────┘  └──────────────┘  └─────────────────┘
```

---

## 📁 Estructura del Proyecto

```
backend/
├── .env.example              # Template de variables de entorno
├── README.md                 # Este archivo
├── package.json              # Dependencias Node.js del proyecto
├── tsconfig.json             # Configuración TypeScript
│
├── infra/                    # Infraestructura como código (AWS CDK)
│   ├── cdk-app.ts           # App principal CDK
│   ├── stacks/
│   │   ├── database-stack.ts       # Aurora + DynamoDB
│   │   ├── api-stack.ts            # API Gateway + Cognito
│   │   ├── lambda-stack.ts         # Lambda functions
│   │   ├── storage-stack.ts        # S3 buckets
│   │   └── step-functions-stack.ts # Deploy agent workflow
│   └── lib/
│       ├── lambda-construct.ts     # Reusable Lambda construct
│       └── secrets-construct.ts    # Secrets Manager setup
│
├── migrations/               # Database migrations
│   ├── 001_create_enterprises.sql
│   ├── 002_create_customers.sql
│   ├── 003_create_agents.sql
│   └── ...
│
├── lambdas/                  # Lambda functions source code
│   │
│   ├── onboarding-api/       # API endpoints para onboarding
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts           # Handler principal
│   │   │   ├── routes/
│   │   │   │   ├── business-info.ts
│   │   │   │   ├── voice-selection.ts
│   │   │   │   ├── knowledge-base.ts
│   │   │   │   ├── agent-deployment.ts
│   │   │   │   └── payment.ts
│   │   │   ├── services/
│   │   │   │   ├── database.ts    # PostgreSQL client
│   │   │   │   └── validation.ts  # Input validation
│   │   │   └── utils/
│   │   │       ├── response.ts    # Standard responses
│   │   │       └── logger.ts      # CloudWatch logging
│   │   └── tests/
│   │
│   ├── knowledge-base-processor/  # PDF extraction + Bedrock
│   │   ├── requirements.txt      # PyPDF2, boto3, python-docx
│   │   ├── lambda_function.py    # Handler principal
│   │   ├── extractors/
│   │   │   ├── pdf_extractor.py
│   │   │   ├── docx_extractor.py
│   │   │   └── txt_extractor.py
│   │   ├── bedrock_client.py     # Llamadas a Claude 3.5 Sonnet
│   │   └── tests/
│   │
│   ├── agent-deployment/     # ElevenLabs + Twilio
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── elevenlabs.ts     # Create agent
│   │   │   ├── twilio.ts         # Provision number
│   │   │   └── prompt-generator.ts # System prompt
│   │   └── tests/
│   │
│   ├── usage-tracker/        # Tracking de minutos consumidos
│   │   ├── requirements.txt
│   │   ├── lambda_function.py
│   │   └── tests/
│   │
│   └── business-scraper/     # Scraping de websites
│       ├── requirements.txt  # BeautifulSoup4, requests
│       ├── lambda_function.py
│       └── tests/
│
└── shared/                   # Código compartido entre Lambdas
    ├── nodejs/               # Para Node.js Lambdas
    │   ├── package.json
    │   └── src/
    │       ├── database.ts   # PostgreSQL connection pool
    │       ├── secrets.ts    # AWS Secrets Manager client
    │       └── types.ts      # TypeScript types
    └── python/               # Para Python Lambdas
        ├── requirements.txt
        └── db_client.py      # PostgreSQL connection
```

---

## 🚀 Setup Inicial

### 1. Prerrequisitos

```bash
# Node.js 20.x
node --version  # v20.x.x

# Python 3.12
python3 --version  # 3.12.x

# AWS CLI configurado
aws configure
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region: eu-west-1
# Default output format: json

# Verificar acceso
aws sts get-caller-identity
```

### 2. Instalar Dependencias

```bash
# Instalar AWS CDK globalmente
npm install -g aws-cdk

# Instalar dependencias del proyecto
cd backend
npm install

# Instalar dependencias de cada Lambda
cd lambdas/onboarding-api && npm install && cd ../..
cd lambdas/dashboard-api && npm install && cd ../..
cd lambdas/webhook-api && npm install && cd ../..
cd lambdas/agent-deployment && npm install && cd ../..

# Para Lambdas Python, las dependencias se empaquetan en deploy
```

### 3. Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env

# Editar con tus credenciales
nano .env
```

**Valores necesarios:**

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...

# ElevenLabs
ELEVENLABS_API_KEY=...

# Anthropic (opcional si usas API directa)
ANTHROPIC_API_KEY=sk-ant-...

# Database (después de deploy)
DB_HOST=consultia-db.cluster-xyz.eu-west-1.rds.amazonaws.com
DB_PASSWORD=...
```

### 4. Deploy Infraestructura (AWS CDK)

```bash
cd infra

# Bootstrap CDK (solo primera vez por cuenta/región)
cdk bootstrap aws://ACCOUNT_ID/eu-west-1

# Sintetizar CloudFormation templates
cdk synth

# Desplegar todos los stacks
cdk deploy --all

# O desplegar stack por stack (en orden de dependencia)
cdk deploy ConsultIA-Database
cdk deploy ConsultIA-Storage
cdk deploy ConsultIA-ApiLambda
cdk deploy ConsultIA-StepFunctions
cdk deploy ConsultIA-Monitoring
```

**Outputs importantes después del deploy:**
```
DatabaseStack.AuroraClusterEndpoint = consultia-db.cluster-xyz.eu-west-1.rds.amazonaws.com
ApiStack.ApiGatewayUrl = https://abc123.execute-api.eu-west-1.amazonaws.com/prod
ApiStack.CognitoUserPoolId = eu-west-1_xyz123
StorageStack.KnowledgeBaseBucket = consultia-knowledge-bases-abc123
```

### 5. Ejecutar Migraciones de Base de Datos

```bash
# Conectar a Aurora (usando bastion host o VPN)
psql -h consultia-db.cluster-xyz.eu-west-1.rds.amazonaws.com \
     -U admin \
     -d consultia \
     -f migrations/001_create_enterprises.sql

# O usar herramienta de migraciones
npm run migrate:up
```

### 6. Poblar Secretos en AWS Secrets Manager

```bash
# Crear secreto con todas las API keys
aws secretsmanager create-secret \
  --name consultia/production/api-keys \
  --secret-string '{
    "STRIPE_SECRET_KEY": "sk_live_...",
    "TWILIO_AUTH_TOKEN": "...",
    "ELEVENLABS_API_KEY": "...",
    "ANTHROPIC_API_KEY": "sk-ant-...",
    "DB_PASSWORD": "..."
  }' \
  --region eu-west-1
```

---

## 🧪 Testing Local

### Probar Lambda Localmente con SAM

```bash
# Instalar AWS SAM CLI
pip install aws-sam-cli

# Invocar función localmente
sam local invoke knowledge-base-processor \
  --event test-events/kb-upload.json \
  --env-vars env.json

# Ejemplo de test-events/kb-upload.json:
{
  "Records": [
    {
      "s3": {
        "bucket": { "name": "consultia-knowledge-bases" },
        "object": { "key": "customer-123/sample.pdf" }
      }
    }
  ]
}
```

### Testing de API Endpoints

```bash
# Usar curl o Postman
curl -X POST https://abc123.execute-api.eu-west-1.amazonaws.com/prod/onboarding/business-info \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <cognito_jwt_token>" \
  -d '{
    "website": "https://clinicaveterinaria.es",
    "country_code": "+34"
  }'
```

### Unit Tests

```bash
# Node.js Lambdas (usando Jest)
cd lambdas/onboarding-api
npm test

# Python Lambdas (usando pytest)
cd lambdas/knowledge-base-processor
pytest tests/
```

---

## 📊 Monitoreo y Logs

### CloudWatch Logs

```bash
# Ver logs de una Lambda
aws logs tail /aws/lambda/onboarding-api --follow

# Buscar errores en últimas 2 horas
aws logs filter-log-events \
  --log-group-name /aws/lambda/onboarding-api \
  --start-time $(date -u -d '2 hours ago' +%s)000 \
  --filter-pattern "ERROR"
```

### CloudWatch Metrics

Dashboard personalizado con:
- Invocaciones por Lambda
- Errores (4xx, 5xx)
- Duración de ejecución
- Latencia de API Gateway
- Conexiones de Aurora
- Lecturas/escrituras de DynamoDB

### Alertas

```bash
# Crear alarma para errores Lambda > 10 en 5 minutos
aws cloudwatch put-metric-alarm \
  --alarm-name onboarding-api-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=onboarding-api \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:eu-west-1:xxx:alerts
```

---

## 🔧 Debugging Common Issues

### 1. Lambda Timeout

**Error:** Task timed out after 30.00 seconds

**Solución:**
```typescript
// En CDK, aumentar timeout
const lambda = new Function(this, 'MyFunction', {
  timeout: Duration.seconds(60) // Aumentar de 30 a 60
});
```

### 2. Database Connection Pool Exhausted

**Error:** Connection pool exhausted

**Solución:**
```javascript
// Reutilizar conexiones entre invocaciones
let pool; // Global scope

exports.handler = async (event) => {
  if (!pool) {
    pool = new Pool({
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }

  const client = await pool.connect();
  try {
    // Usar conexión
  } finally {
    client.release();
  }
};
```

### 3. ElevenLabs API Rate Limit

**Error:** 429 Too Many Requests

**Solución:** Implementar exponential backoff:
```javascript
async function createAgentWithRetry(data, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.post('https://api.elevenlabs.io/v1/convai/agents', data);
    } catch (error) {
      if (error.response?.status === 429 && i < retries - 1) {
        await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
        continue;
      }
      throw error;
    }
  }
}
```

### 4. Twilio Webhook Signature Validation Failed

**Error:** Invalid signature

**Solución:**
```javascript
const twilio = require('twilio');

// URL DEBE coincidir exactamente con la configurada en Twilio
const url = 'https://api.consultia.es/webhooks/twilio/call-status';

const isValid = twilio.validateRequest(
  process.env.TWILIO_AUTH_TOKEN,
  event.headers['x-twilio-signature'],
  url,
  event.body // Debe ser string, NO parseado a JSON
);
```

---

## 🔄 Workflow de Desarrollo

1. **Crear feature branch**
   ```bash
   git checkout -b feature/add-sms-notifications
   ```

2. **Desarrollar localmente**
   - Escribir código
   - Agregar tests
   - Probar con SAM local

3. **Deploy a staging**
   ```bash
   cdk deploy --all --context env=staging
   ```

4. **Testing en staging**
   - Ejecutar tests end-to-end
   - Verificar logs

5. **Pull request + review**

6. **Deploy a production**
   ```bash
   cdk deploy --all --context env=production
   ```

---

## 📚 Referencias

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
- [ElevenLabs API Reference](https://elevenlabs.io/docs/api-reference/agents)
- [Twilio Voice API](https://www.twilio.com/docs/voice)
- [Stripe API](https://stripe.com/docs/api)

---

## 👥 Equipo

Mantenido por el equipo de ConsultIA.

Para preguntas o problemas, abrir issue en el repositorio o contactar a soporte@consultia.es
