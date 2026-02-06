# Status: infra-01 - AWS Account Setup & IAM

## Pasos del PRD

### ✅ Paso 1: Crear cuenta AWS para ConsultIA (o usar existente)
**Estado**: Manual - Requiere acción del usuario
**Instrucciones**:
- Si NO tienes cuenta AWS: Ir a https://aws.amazon.com/ → "Create an AWS Account"
- Si YA tienes cuenta: Usar cuenta existente
**Verificación**: Ejecutar `aws sts get-caller-identity`

### ✅ Paso 2: Configurar IAM roles para Lambda, Step Functions, API Gateway
**Estado**: Implementado en CDK
**Ubicación**:
- `stacks/lambda-stack.ts` - IAM roles automáticos para Lambda
- `stacks/step-functions-stack.ts` - IAM roles para Step Functions
- `stacks/api-stack.ts` - IAM roles para API Gateway
**Verificación**: Los roles se crean automáticamente al hacer `cdk deploy`

### ✅ Paso 3: Crear VPC, subnets, security groups para region eu-west-1
**Estado**: Implementado en CDK
**Ubicación**: `stacks/database-stack.ts` líneas 18-42
```typescript
const vpc = new ec2.Vpc(this, 'ConsultIA-VPC', {
  maxAzs: 2, // Multi-AZ
  natGateways: 1,
  subnetConfiguration: [
    { name: 'public', subnetType: ec2.SubnetType.PUBLIC },
    { name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    { name: 'isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
  ],
});
```
**Verificación**: Después de `cdk deploy ConsultIA-Database`, verificar VPC creada

### ✅ Paso 4: Setup AWS CDK project structure en backend/infra/
**Estado**: Completo
**Archivos creados**:
- ✅ `backend/infra/cdk.json` - Configuración CDK
- ✅ `backend/infra/cdk-app.ts` - App principal
- ✅ `backend/infra/package.json` - Dependencias
- ✅ `backend/infra/tsconfig.json` - TypeScript config
- ✅ `backend/infra/stacks/database-stack.ts` - Stack de base de datos
- ✅ `backend/infra/stacks/storage-stack.ts` - Stack de almacenamiento
- ✅ `backend/infra/stacks/api-stack.ts` - Stack de API
- ✅ `backend/infra/stacks/lambda-stack.ts` - Stack de Lambda
- ✅ `backend/infra/stacks/step-functions-stack.ts` - Stack de Step Functions

### ✅ Paso 5: Configurar AWS CLI y credenciales locales
**Estado**: Manual - Requiere acción del usuario
**Instrucciones**:
```bash
# Instalar AWS CLI (si no está instalado)
# Windows: https://awscli.amazonaws.com/AWSCLIV2.msi
# Mac: brew install awscli
# Linux: curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

# Configurar credenciales
aws configure
# AWS Access Key ID: (tu key)
# AWS Secret Access Key: (tu secret)
# Default region name: eu-west-1
# Default output format: json
```
**Verificación**: Ejecutar `aws sts get-caller-identity` debe mostrar tu cuenta

---

## Scripts de Verificación

### Setup Automático
```bash
cd backend
bash scripts/setup-infra-01.sh
```

### Verificación
```bash
cd backend
bash scripts/verify-infra-01.sh
```

---

## Criterios de Aceptación (Passes)

Para marcar `infra-01` como `passes: true`, deben cumplirse:

- [x] CDK project structure creado
- [x] 5 stacks de CDK implementados
- [x] VPC configuration en database-stack
- [x] IAM roles configurados en cada stack
- [ ] **AWS CLI configurado localmente** (manual)
- [ ] **CDK bootstrapped** (manual: `cdk bootstrap`)
- [ ] **Synth funciona sin errores** (`cdk synth`)

---

## Próximo Paso

Una vez `infra-01` esté completo (todos los checkboxes marcados):

1. Ejecutar `cdk synth` para verificar que no hay errores
2. Actualizar `planning/prd.json`:
   ```json
   {
     "id": "infra-01",
     "passes": true,
     "progress": 100
   }
   ```
3. Hacer commit:
   ```bash
   git add .
   git commit -m "feat(infra): complete infra-01 - AWS Account Setup & IAM"
   ```
4. Continuar con `infra-02` (Database Setup)
