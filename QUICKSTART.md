# 🚀 QuickStart Guide - ConsultIA Backend

## ⚠️ IMPORTANTE: Seguridad de Credenciales

Has indicado que pusiste las credenciales de Stripe, Anthropic, AWS, ElevenLabs y Twilio en `frontend/.env.example`.

**ESTO ES UN RIESGO DE SEGURIDAD CRÍTICO** si incluye claves secretas (sk_test_, auth_token, etc.).

### ✅ Solución Implementada

He creado la estructura correcta con separación frontend/backend:

```
nuevo-proyecto/
├── frontend/
│   └── .env.local.example    ← SOLO claves PÚBLICAS (pk_test_, Cognito IDs)
│
└── backend/
    └── .env.example          ← TODAS las claves SECRETAS (sk_test_, auth_token, etc.)
```

---

## 📋 Checklist de Setup

### 1️⃣ Revisar Credenciales en Frontend

```bash
cd frontend
cat .env.example  # O el archivo donde pusiste las credenciales
```

**Verificar:**
- ❌ Si ves `STRIPE_SECRET_KEY=sk_test_...` → **ELIMINAR INMEDIATAMENTE**
- ❌ Si ves `TWILIO_AUTH_TOKEN=...` → **ELIMINAR**
- ❌ Si ves `ELEVENLABS_API_KEY=...` → **ELIMINAR**
- ❌ Si ves `ANTHROPIC_API_KEY=sk-ant-...` → **ELIMINAR**
- ❌ Si ves `AWS_SECRET_ACCESS_KEY=...` → **ELIMINAR**

**✅ Lo que SÍ puede estar en frontend:**
```bash
# frontend/.env.local (copiar de .env.local.example)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...  # ← Empieza con pk_
NEXT_PUBLIC_API_URL=https://api.consultia.es
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_abc123
```

### 2️⃣ Mover Claves Secretas al Backend

```bash
cd backend
cp .env.example .env
nano .env  # O tu editor favorito
```

**Pegar las claves SECRETAS aquí:**

```bash
# backend/.env
STRIPE_SECRET_KEY=sk_test_51...  # ← Tu clave secreta de Stripe
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
ELEVENLABS_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

### 3️⃣ Verificar que .gitignore está Correcto

```bash
cat .gitignore
```

Debe incluir:
```
.env
.env.local
.env.production
*.key
credentials.json
```

### 4️⃣ Si Ya Subiste Secretos a Git

**⚠️ URGENTE:** Si ya hiciste `git commit` de archivos con secretos:

```bash
# 1. Eliminar del historial
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch frontend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# 2. Forzar push (CUIDADO: reescribe historial)
git push origin --force --all

# 3. ROTAR INMEDIATAMENTE todas las credenciales
# - Stripe: https://dashboard.stripe.com/apikeys → Eliminar y crear nuevas
# - Twilio: https://console.twilio.com → Regenerar auth token
# - ElevenLabs: Contactar soporte para rotar API key
# - AWS: aws iam delete-access-key && aws iam create-access-key
```

---

## 🏗️ Arquitectura de Seguridad

```
┌──────────────────────────────────────┐
│         NAVEGADOR DEL USUARIO        │
│  (Cualquiera puede ver el código JS) │
└──────────────────────────────────────┘
                 ↓
         ✅ SOLO PÚBLICAS
┌──────────────────────────────────────┐
│            FRONTEND                  │
│  Next.js en Amplify (HTML/JS/CSS)   │
│                                      │
│  Variables expuestas:                │
│  - pk_test_... (Stripe publishable) │
│  - User Pool IDs                     │
│  - API URLs                          │
└──────────────────────────────────────┘
                 ↓ HTTPS
         ❌ NUNCA SECRETAS
┌──────────────────────────────────────┐
│         API GATEWAY                  │
│  Autenticación: JWT de Cognito      │
└──────────────────────────────────────┘
                 ↓
         ✅ TODAS LAS SECRETAS
┌──────────────────────────────────────┐
│       BACKEND (Lambda)               │
│  Código PRIVADO en AWS               │
│                                      │
│  Variables secretas:                 │
│  - sk_test_... (Stripe secret)      │
│  - Auth tokens                       │
│  - API keys                          │
│  - DB passwords                      │
└──────────────────────────────────────┘
```

---

## 🔍 Cómo Distinguir Pública vs Secreta

| Tipo | Ejemplo | Dónde | Por qué |
|------|---------|-------|---------|
| **Pública** | `pk_test_51...` | Frontend | Solo permite crear PaymentIntents, no cobrar |
| **Secreta** | `sk_test_51...` | Backend | Permite cobrar, reembolsar, ver datos privados |
| **Pública** | User Pool ID | Frontend | Solo identifica el pool, no permite acceso |
| **Secreta** | Auth Token | Backend | Permite hacer llamadas, enviar SMS |
| **Pública** | API URL | Frontend | Solo la dirección del servidor |
| **Secreta** | API Key | Backend | Permite usar el servicio externo |

**Regla general:**
- Si **empieza con `sk_`** o **contiene `secret/token/auth`** → **BACKEND**
- Si **empieza con `pk_`** o **es un ID/URL pública** → **FRONTEND**

---

## 📝 Ejemplo Real: Crear Agente ElevenLabs

### ❌ MAL (Frontend llama directamente a ElevenLabs)

```javascript
// frontend/components/onboarding/Step5.tsx
const createAgent = async () => {
  // PELIGRO: Expones tu API key en el navegador
  const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY // ← VULNERABLE
    },
    body: JSON.stringify({ name: 'Agent', voice_id: '...' })
  });
};
```

**Problema:** Cualquier persona puede abrir DevTools → Network → Ver tu API key → Usarla para crear agentes en tu cuenta.

### ✅ BIEN (Frontend llama a TU backend, backend llama a ElevenLabs)

```javascript
// frontend/components/onboarding/Step5.tsx
const createAgent = async () => {
  // Llama a TU API (autenticado con JWT de Cognito)
  const response = await fetch('https://api.consultia.es/api/onboarding/deploy-agent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cognitoJwtToken}`,  // ← Seguro
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ customer_id: '123', voice_id: '...' })
  });
};
```

```javascript
// backend/lambdas/agent-deployment/src/index.ts
export const handler = async (event) => {
  // Verificar autenticación (API Gateway + Cognito)
  const customerId = event.requestContext.authorizer.claims.sub;

  // Obtener secreto de AWS Secrets Manager
  const secrets = await getSecret('consultia/production/api-keys');

  // Llamar a ElevenLabs con clave secreta (NUNCA expuesta)
  const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
    method: 'POST',
    headers: {
      'xi-api-key': secrets.ELEVENLABS_API_KEY  // ← Seguro (backend only)
    },
    body: JSON.stringify({ name: 'Agent', voice_id: '...' })
  });

  return { statusCode: 200, body: JSON.stringify(response.data) };
};
```

**Ventajas:**
1. ✅ API key NUNCA se expone al navegador
2. ✅ Solo usuarios autenticados pueden crear agentes
3. ✅ Control total sobre quién crea qué
4. ✅ Puedes agregar límites de rate (1 agente por cliente, etc.)

---

## 🧪 Test de Seguridad

Después de configurar correctamente:

```bash
# 1. Build del frontend
cd frontend
npm run build

# 2. Buscar secretos en el bundle
grep -r "sk_test" .next/
grep -r "auth_token" .next/
grep -r "ELEVENLABS_API_KEY" .next/

# ✅ No debería encontrar NADA
# ❌ Si encuentra algo, tienes un leak de secretos
```

---

## 📞 Próximos Pasos

Una vez que las credenciales estén correctamente separadas:

1. **Deploy infraestructura AWS**
   ```bash
   cd backend/infra
   cdk deploy --all
   ```

2. **Subir secretos a AWS Secrets Manager**
   ```bash
   aws secretsmanager create-secret \
     --name consultia/production/api-keys \
     --secret-string file://secrets.json
   ```

3. **Probar endpoints localmente**
   ```bash
   sam local invoke agent-deployment --event test-event.json
   ```

4. **Deploy frontend**
   ```bash
   cd frontend
   npm run build
   # Deployes con Amplify automáticamente
   ```

---

## 🆘 ¿Necesitas Ayuda?

- **Seguridad:** Lee `SECURITY.md` completo
- **Backend:** Lee `backend/README.md`
- **Arquitectura:** Lee `planning/proceso_creacion_agente/README.md`
- **PRD:** Lee `planning/prd.json` (38 items a implementar)

---

## 🎯 Resumen de Acción Inmediata

```bash
# 1. REVISAR frontend/.env.example
cat frontend/.env.example

# 2. Si hay secretos (sk_, auth_token):
#    a) COPIARLOS a backend/.env
#    b) ELIMINARLOS de frontend/.env.example
#    c) Solo dejar NEXT_PUBLIC_* en frontend

# 3. CREAR backend/.env con todos los secretos
cp backend/.env.example backend/.env
nano backend/.env  # Pegar credenciales

# 4. VERIFICAR .gitignore incluye .env
cat .gitignore | grep .env

# 5. Si ya subiste secretos a git, ROTAR TODAS las credenciales
```

**¿Todo claro? Avísame si necesitas ayuda con algún paso específico.**
