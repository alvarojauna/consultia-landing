# 🔒 Security Guidelines - ConsultIA

## ⚠️ Critical: Separación Frontend/Backend

### El Problema

Si pones **credenciales secretas** en el frontend, se exponen públicamente cuando la aplicación se despliega. Cualquier persona puede:

1. Abrir DevTools del navegador → Ver código fuente
2. Encontrar tus credenciales en `_next/static/.../*.js`
3. Usar tus claves para hacer cobros, llamadas, etc. a tu cuenta

### La Solución: Arquitectura de Dos Capas

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  Next.js (Deploy estático en Amplify)                      │
│  ✅ SOLO credenciales PÚBLICAS                              │
│  - pk_test_... (Stripe publishable key)                    │
│  - Cognito User Pool ID                                    │
│  - API URL                                                  │
│                                                              │
│  ❌ NUNCA credenciales SECRETAS                             │
│  - sk_test_... (Stripe secret key) ← PELIGRO              │
│  - Auth tokens, API keys ← PELIGRO                         │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY                            │
│  https://api.consultia.es                                  │
│  Autenticación: Cognito JWT tokens                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Lambda)                         │
│  ✅ TODAS las credenciales SECRETAS                         │
│  Almacenadas en AWS Secrets Manager                        │
│  - STRIPE_SECRET_KEY                                        │
│  - TWILIO_AUTH_TOKEN                                        │
│  - ELEVENLABS_API_KEY                                       │
│  - ANTHROPIC_API_KEY                                        │
│  - DB_PASSWORD                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Distribución de Credenciales

### Frontend (`.env.local`)

**SOLO variables que empiezan con `NEXT_PUBLIC_`** - Next.js las expone al navegador.

```bash
# ✅ SEGURO - Claves públicas
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_abc123
NEXT_PUBLIC_API_URL=https://api.consultia.es

# ❌ PELIGRO - NO hacer esto:
STRIPE_SECRET_KEY=sk_test_...  # ← Esto se filtrará en el bundle de JS
```

**Cómo funciona:**
- El frontend llama a `https://api.consultia.es/api/onboarding/business-info`
- El **backend** usa las credenciales secretas para llamar a ElevenLabs, Twilio, Stripe
- El frontend **nunca** conoce las claves secretas

### Backend (`.env` o AWS Secrets Manager)

**TODAS las credenciales secretas.**

```bash
# ✅ SECRETOS - Van en backend
STRIPE_SECRET_KEY=sk_test_51...
TWILIO_AUTH_TOKEN=abc123def456
ELEVENLABS_API_KEY=xyz789
ANTHROPIC_API_KEY=sk-ant-...
DB_PASSWORD=super_secret_password
```

**En producción:** No usar archivos `.env`, usar **AWS Secrets Manager**:

```javascript
// Lambda function
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const result = await secretsManager.getSecretValue({
    SecretId: secretName
  }).promise();

  return JSON.parse(result.SecretString);
}

// Uso:
const secrets = await getSecret('consultia/production/api-keys');
const stripeKey = secrets.STRIPE_SECRET_KEY;
```

---

## 🔐 Mejores Prácticas

### 1. Validar Origen de Peticiones

```javascript
// Lambda function: twilio-webhook
exports.handler = async (event) => {
  const signature = event.headers['x-twilio-signature'];
  const url = `https://api.consultia.es/webhooks/twilio/call-status`;

  // Verificar que la petición viene de Twilio
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    event.body
  );

  if (!isValid) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  // Procesar webhook...
};
```

### 2. CORS Restrictivo

```javascript
// API Gateway
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://consultia.es', // No usar '*'
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};
```

### 3. Rate Limiting

```javascript
// API Gateway settings
{
  "throttle": {
    "burstLimit": 2000,
    "rateLimit": 1000  // 1000 requests/sec por customer
  }
}
```

### 4. Autenticación en Todas las Rutas

```javascript
// API Gateway Authorizer (Cognito)
const authorizer = {
  type: 'COGNITO_USER_POOLS',
  providerARNs: ['arn:aws:cognito-idp:eu-west-1:xxx:userpool/eu-west-1_abc123']
};

// El frontend envía token JWT en cada petición:
const response = await fetch('https://api.consultia.es/api/dashboard/calls', {
  headers: {
    'Authorization': `Bearer ${cognitoToken}`
  }
});
```

### 5. Validación de Input

```javascript
// Lambda: onboarding-api
const Joi = require('joi');

const businessInfoSchema = Joi.object({
  website: Joi.string().uri().required(),
  country_code: Joi.string().pattern(/^\+\d{1,4}$/).required()
});

exports.handler = async (event) => {
  const { error, value } = businessInfoSchema.validate(JSON.parse(event.body));

  if (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.details[0].message })
    };
  }

  // Procesar input validado...
};
```

---

## 🚨 Checklist de Seguridad

Antes de cada deploy:

- [ ] **Credenciales secretas solo en backend** (AWS Secrets Manager)
- [ ] **Frontend solo tiene claves públicas** (pk_test_, user pool IDs)
- [ ] **CORS configurado restrictivamente** (no `*`)
- [ ] **Rate limiting activado** en API Gateway
- [ ] **Autenticación requerida** en todas las rutas (excepto públicas)
- [ ] **Validación de webhooks** (Stripe, Twilio signatures)
- [ ] **Input validation** en todos los endpoints
- [ ] **HTTPS obligatorio** (rechazar HTTP)
- [ ] **Logs no contienen secretos** (no logear tokens completos)
- [ ] **IAM roles con mínimos privilegios** (Lambda solo puede acceder a lo necesario)

---

## 🛡️ Gestión de Secretos en AWS

### Desarrollo Local

```bash
# backend/.env (no subir a git)
STRIPE_SECRET_KEY=sk_test_51...
```

### Staging/Production

```bash
# Crear secreto en AWS Secrets Manager
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

# Lambda IAM policy para acceder al secreto
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:eu-west-1:xxx:secret:consultia/production/api-keys-*"
    }
  ]
}
```

### Rotación de Secretos

```bash
# Rotar secreto cada 90 días
aws secretsmanager rotate-secret \
  --secret-id consultia/production/api-keys \
  --rotation-lambda-arn arn:aws:lambda:eu-west-1:xxx:function:rotate-api-keys \
  --rotation-rules AutomaticallyAfterDays=90
```

---

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
- [Stripe Security](https://stripe.com/docs/security/guide)
- [Twilio Security](https://www.twilio.com/docs/security)

---

## ❓ FAQ

**Q: ¿Puedo poner `ELEVENLABS_API_KEY` en el frontend si lo necesito para llamar a la API?**

**A:** ❌ NO. El frontend debe llamar a **tu backend**, y el backend llama a ElevenLabs.

```javascript
// ❌ MAL - Frontend llama directamente a ElevenLabs
const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
  headers: { 'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY } // ← EXPUESTO
});

// ✅ BIEN - Frontend llama a tu backend
const response = await fetch('https://api.consultia.es/api/onboarding/deploy-agent', {
  headers: { 'Authorization': `Bearer ${cognitoToken}` }
});

// Backend (Lambda) llama a ElevenLabs con clave secreta
const secrets = await getSecret('consultia/production/api-keys');
const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
  headers: { 'xi-api-key': secrets.ELEVENLABS_API_KEY } // ← SEGURO
});
```

**Q: ¿Cómo sé si una clave es pública o secreta?**

**A:** Regla general:
- **Pública**: `pk_`, `publishable`, user pool IDs, URLs, configuración visual
- **Secreta**: `sk_`, `secret`, `token`, `password`, `auth`, cualquier cosa que permita hacer acciones o leer datos privados

**Q: ¿Y si uso variables de entorno sin `NEXT_PUBLIC_`?**

**A:** Next.js NO las expone al navegador, pero tampoco estarán disponibles en el código del cliente. Solo funcionan en server-side code (API routes, getServerSideProps). Para Lambda backend, no hay restricción.

