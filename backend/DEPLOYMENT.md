# 🚀 Deployment Guide - ConsultIA Backend

## Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Amplify)                         │
│  Next.js 14 - https://consultia.es                             │
└─────────────────────────────────────────────────────────────────┘
                           ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│              API GATEWAY + COGNITO (api-stack)                  │
│  REST API: https://api.consultia.es                            │
│  Auth: Cognito User Pools (JWT tokens)                         │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    LAMBDA FUNCTIONS (lambda-stack)              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ onboarding-api (Node.js 20.x)                            │  │
│  │ - POST /onboarding/business-info                         │  │
│  │ - POST /onboarding/:id/confirm-business                  │  │
│  │ - POST /onboarding/:id/select-voice                      │  │
│  │ - POST /onboarding/:id/knowledge-base/upload             │  │
│  │ - POST /onboarding/:id/deploy-agent                      │  │
│  │ - POST /onboarding/:id/test-call                         │  │
│  │ - POST /onboarding/:id/complete-payment                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ knowledge-base-processor (Python 3.12)                   │  │
│  │ - Extract text from PDF/DOCX (PyPDF2, python-docx)      │  │
│  │ - Structure with Bedrock Claude 3.5 Sonnet              │  │
│  │ - Store in PostgreSQL knowledge_bases table              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ agent-deployment (Node.js 20.x) - 4 funciones:           │  │
│  │ 1. create-agent: ElevenLabs agent creation               │  │
│  │ 2. provision-number: Twilio number purchase              │  │
│  │ 3. link-number: Link number to agent                     │  │
│  │ 4. update-database: Mark agent as active                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│          STEP FUNCTIONS WORKFLOW (step-functions-stack)         │
│  DeployAgentStateMachine:                                       │
│  CreateAgent → ProvisionNumber → LinkNumber → UpdateDB         │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                                 │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Aurora           │  │  DynamoDB    │  │  S3 Buckets     │  │
│  │ PostgreSQL 15    │  │  call_logs   │  │  kb-files       │  │
│  │ 13 tables        │  │  sessions    │  │  recordings     │  │
│  └──────────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Pre-requisitos

### 1. Software Instalado

```bash
# Node.js 20.x
node --version  # v20.x.x

# Python 3.12
python3 --version  # 3.12.x

# AWS CLI configurado
aws --version
aws configure list

# AWS CDK
npm install -g aws-cdk
cdk --version  # 2.147.3+
```

### 2. Credenciales de Servicios Externos

Necesitas cuentas y API keys de:

- ✅ **Stripe** (sk_test_... y webhook secret)
- ✅ **Twilio** (Account SID y Auth Token)
- ✅ **ElevenLabs** (API Key)
- ✅ **Anthropic** (API Key - opcional si usas Bedrock)
- ✅ **AWS** (Cuenta con permisos de administrador)

---

## 🔧 Setup Inicial

### Paso 1: Instalar Dependencias

```bash
cd backend

# Instalar dependencias del proyecto root
npm install

# Instalar dependencias de cada Lambda
cd lambdas/onboarding-api && npm install && cd ../..
cd lambdas/agent-deployment && npm install && cd ../..

# Instalar dependencias de Python (para knowledge-base-processor)
cd lambdas/knowledge-base-processor
pip install -r requirements.txt -t .
cd ../..

# Instalar shared layer
cd shared/nodejs && npm install && cd ../..
```

### Paso 2: Compilar TypeScript

```bash
# Compilar todo el código TypeScript
npm run build

# O compilar cada parte individualmente
cd infra && tsc && cd ..
cd lambdas/onboarding-api && npm run build && cd ../..
cd lambdas/agent-deployment && npm run build && cd ../..
cd shared/nodejs && npm run build && cd ../..
```

### Paso 3: Configurar Secrets en AWS

**CRÍTICO**: Antes de deployar, crea los secretos en AWS Secrets Manager:

```bash
# 1. Crear secreto con API keys
aws secretsmanager create-secret \
  --name consultia/production/api-keys \
  --secret-string '{
    "STRIPE_SECRET_KEY": "sk_live_...",
    "TWILIO_ACCOUNT_SID": "AC...",
    "TWILIO_AUTH_TOKEN": "...",
    "ELEVENLABS_API_KEY": "...",
    "ANTHROPIC_API_KEY": "sk-ant-..."
  }' \
  --region eu-west-1

# 2. El secreto de base de datos se crea automáticamente por CDK
# (no necesitas crearlo manualmente)
```

---

## 🚢 Deployment con AWS CDK

### Bootstrap (Solo Primera Vez)

```bash
cd infra

# Bootstrap CDK en tu cuenta/región
cdk bootstrap aws://ACCOUNT_ID/eu-west-1
```

### Deploy All Stacks

```bash
# Sintetizar CloudFormation templates
cdk synth

# Deploy todos los stacks en orden
cdk deploy --all --require-approval never

# O deploy stack por stack (recomendado para primera vez)
cdk deploy ConsultIA-Database
cdk deploy ConsultIA-Storage
cdk deploy ConsultIA-Api
cdk deploy ConsultIA-Lambda
cdk deploy ConsultIA-StepFunctions
```

**Tiempo estimado de deployment**: ~25-30 minutos total

### Deploy Individual Stacks

```bash
# Solo base de datos
cdk deploy ConsultIA-Database

# Solo Lambda functions
cdk deploy ConsultIA-Lambda

# Solo Step Functions
cdk deploy ConsultIA-StepFunctions
```

---

## 📊 Post-Deployment

### 1. Verificar Outputs

Después del deploy, CDK mostrará outputs importantes:

```
ConsultIA-Database.AuroraClusterEndpoint = consultia-db.cluster-xyz.eu-west-1.rds.amazonaws.com
ConsultIA-Database.DatabaseSecretArn = arn:aws:secretsmanager:...
ConsultIA-Api.ApiGatewayUrl = https://abc123.execute-api.eu-west-1.amazonaws.com/prod
ConsultIA-Api.UserPoolId = eu-west-1_xyz123
ConsultIA-StepFunctions.DeployAgentStateMachineArn = arn:aws:states:...
```

**IMPORTANTE**: Guarda estos valores en `backend/.env` para desarrollo local.

### 2. Ejecutar Migraciones de Base de Datos

```bash
# Conectar a Aurora PostgreSQL
psql -h consultia-db.cluster-xyz.eu-west-1.rds.amazonaws.com \
     -U postgres \
     -d consultia \
     -f migrations/001_create_enterprises.sql

# O ejecutar todas las migraciones
for file in migrations/*.sql; do
  psql -h <AURORA_ENDPOINT> -U postgres -d consultia -f "$file"
done
```

### 3. Verificar Lambda Functions

```bash
# Listar todas las funciones
aws lambda list-functions --region eu-west-1 | grep consultia

# Invocar función de prueba
aws lambda invoke \
  --function-name consultia-onboarding-api \
  --region eu-west-1 \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  response.json

cat response.json
```

### 4. Probar API Gateway

```bash
# Obtener URL de API Gateway
API_URL=$(aws cloudformation describe-stacks \
  --stack-name ConsultIA-Api \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)

echo "API URL: $API_URL"

# Test endpoint público (planes)
curl "$API_URL/plans"
```

---

## 🧪 Testing

### Test Local con SAM

```bash
# Instalar SAM CLI
pip install aws-sam-cli

# Invocar Lambda localmente
sam local invoke consultia-kb-processor \
  --event test-events/kb-upload.json \
  --env-vars env.json
```

### Test End-to-End

```bash
# 1. Crear usuario en Cognito
aws cognito-idp sign-up \
  --client-id <USER_POOL_CLIENT_ID> \
  --username test@example.com \
  --password Test1234! \
  --region eu-west-1

# 2. Confirmar usuario (para testing)
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id <USER_POOL_ID> \
  --username test@example.com \
  --region eu-west-1

# 3. Obtener token JWT
# (usar frontend o curl a Cognito)

# 4. Test onboarding flow
curl -X POST "$API_URL/onboarding/business-info" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "website": "https://example.com",
    "country_code": "+34"
  }'
```

---

## 📈 Monitoring & Logs

### CloudWatch Logs

```bash
# Ver logs de Lambda
aws logs tail /aws/lambda/consultia-onboarding-api --follow

# Ver logs de Step Functions
aws logs tail /aws/stepfunctions/consultia-deploy-agent --follow

# Buscar errores en últimas 2 horas
aws logs filter-log-events \
  --log-group-name /aws/lambda/consultia-onboarding-api \
  --start-time $(date -u -d '2 hours ago' +%s)000 \
  --filter-pattern "ERROR"
```

### CloudWatch Dashboards

```bash
# Crear dashboard personalizado
aws cloudwatch put-dashboard \
  --dashboard-name ConsultIA-Metrics \
  --dashboard-body file://dashboard.json
```

---

## 🔄 Updates & Redeploy

```bash
# Después de cambios en código
cd backend
npm run build

# Redeploy solo Lambda functions
cdk deploy ConsultIA-Lambda

# Redeploy todo
cdk deploy --all
```

---

## 🗑️ Cleanup (Eliminar Todo)

**⚠️ CUIDADO: Esto eliminará TODA la infraestructura**

```bash
cd infra

# Eliminar todos los stacks
cdk destroy --all

# Eliminar secretos manualmente
aws secretsmanager delete-secret \
  --secret-id consultia/production/api-keys \
  --force-delete-without-recovery \
  --region eu-west-1
```

---

## 🆘 Troubleshooting

### Error: "Stack is in UPDATE_ROLLBACK_COMPLETE state"

```bash
# Eliminar el stack fallido y recrear
cdk destroy ConsultIA-Lambda
cdk deploy ConsultIA-Lambda
```

### Error: "User does not have permission to invoke Lambda"

```bash
# Verificar que API Gateway tiene permisos
aws lambda get-policy \
  --function-name consultia-onboarding-api \
  --region eu-west-1
```

### Error: "Database connection timeout"

```bash
# Verificar security groups de Aurora
# La Lambda debe estar en la misma VPC o tener acceso
```

### Error: "ElevenLabs API rate limit"

Implementar exponential backoff en `create-agent.ts` (ya incluido).

---

## 📚 Recursos

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [ElevenLabs API Docs](https://elevenlabs.io/docs/api-reference/agents)
- [Twilio Voice API](https://www.twilio.com/docs/voice)
- [Stripe API](https://stripe.com/docs/api)
- [Amazon Bedrock](https://docs.aws.amazon.com/bedrock/)

---

## ✅ Checklist de Deployment

- [ ] Cuentas creadas (Stripe, Twilio, ElevenLabs)
- [ ] AWS CLI configurado
- [ ] CDK bootstrapped
- [ ] Secretos creados en Secrets Manager
- [ ] Dependencias instaladas (`npm install` en todos los directorios)
- [ ] Código compilado (`npm run build`)
- [ ] CDK deploy exitoso (todos los stacks)
- [ ] Migraciones de base de datos ejecutadas
- [ ] Outputs guardados en `.env`
- [ ] Test de API Gateway funcionando
- [ ] Frontend configurado con Cognito User Pool ID
- [ ] Primer test de onboarding completo
