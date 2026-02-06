#!/bin/bash
# Verification script for PRD Item: infra-01
# AWS Account Setup & IAM

set -e

echo "========================================="
echo "Verificación: infra-01 - AWS Account Setup & IAM"
echo "========================================="
echo ""

# 1. Verificar AWS CLI instalado
echo "[1/5] Verificando AWS CLI..."
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI no está instalado"
    echo "Instalar: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi
echo "✅ AWS CLI instalado: $(aws --version)"
echo ""

# 2. Verificar credenciales configuradas
echo "[2/5] Verificando credenciales AWS..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Credenciales AWS no configuradas"
    echo "Ejecutar: aws configure"
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "eu-west-1")
AWS_USER=$(aws sts get-caller-identity --query Arn --output text)

echo "✅ Credenciales configuradas:"
echo "   Account: $AWS_ACCOUNT"
echo "   Region: $AWS_REGION"
echo "   User: $AWS_USER"
echo ""

# 3. Verificar CDK instalado
echo "[3/5] Verificando AWS CDK..."
if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK no está instalado"
    echo "Instalar: npm install -g aws-cdk"
    exit 1
fi
echo "✅ AWS CDK instalado: $(cdk --version)"
echo ""

# 4. Verificar CDK bootstrapped
echo "[4/5] Verificando CDK bootstrap..."
BOOTSTRAP_STACK=$(aws cloudformation describe-stacks \
    --stack-name CDKToolkit \
    --region $AWS_REGION \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$BOOTSTRAP_STACK" == "NOT_FOUND" ]; then
    echo "⚠️  CDK no está bootstrapped"
    echo "Ejecutar: cd backend/infra && cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION"
else
    echo "✅ CDK bootstrapped: $BOOTSTRAP_STACK"
fi
echo ""

# 5. Verificar estructura de proyecto CDK
echo "[5/5] Verificando estructura de proyecto CDK..."
REQUIRED_FILES=(
    "backend/infra/cdk.json"
    "backend/infra/cdk-app.ts"
    "backend/infra/stacks/database-stack.ts"
    "backend/infra/stacks/storage-stack.ts"
    "backend/infra/stacks/api-stack.ts"
    "backend/infra/stacks/lambda-stack.ts"
    "backend/infra/stacks/step-functions-stack.ts"
)

ALL_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Falta: $file"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = true ]; then
    echo "✅ Todos los archivos de CDK existen"
else
    echo "❌ Faltan archivos de CDK"
    exit 1
fi
echo ""

# Resumen
echo "========================================="
echo "✅ infra-01 VERIFICADO CORRECTAMENTE"
echo "========================================="
echo ""
echo "Siguiente paso:"
echo "  cd backend/infra"
echo "  cdk synth     # Sintetizar templates"
echo "  cdk deploy ConsultIA-Database  # Deploy primer stack"
echo ""
