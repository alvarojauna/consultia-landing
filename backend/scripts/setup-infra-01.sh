#!/bin/bash
# Setup script for PRD Item: infra-01
# AWS Account Setup & IAM

set -e

echo "========================================="
echo "Setup: infra-01 - AWS Account Setup & IAM"
echo "========================================="
echo ""

# 1. Verificar requisitos
echo "[1/6] Verificando requisitos..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no instalado. Instalar desde: https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm no instalado"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"
echo ""

# 2. Instalar AWS CDK globalmente
echo "[2/6] Instalando AWS CDK..."
if ! command -v cdk &> /dev/null; then
    npm install -g aws-cdk
    echo "✅ AWS CDK instalado"
else
    echo "✅ AWS CDK ya instalado: $(cdk --version)"
fi
echo ""

# 3. Configurar AWS CLI (si no está configurado)
echo "[3/6] Configurando AWS CLI..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "⚠️  AWS CLI no configurado"
    echo ""
    echo "Ejecuta manualmente:"
    echo "  aws configure"
    echo ""
    echo "Necesitarás:"
    echo "  - AWS Access Key ID"
    echo "  - AWS Secret Access Key"
    echo "  - Default region: eu-west-1"
    echo "  - Output format: json"
    echo ""
    read -p "Presiona Enter cuando hayas configurado AWS CLI..."
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "eu-west-1")

echo "✅ AWS Account: $AWS_ACCOUNT"
echo "✅ Region: $AWS_REGION"
echo ""

# 4. Instalar dependencias del proyecto CDK
echo "[4/6] Instalando dependencias del proyecto..."
cd backend/infra
npm install
echo "✅ Dependencias instaladas"
echo ""

# 5. Compilar TypeScript
echo "[5/6] Compilando TypeScript..."
npm run build
echo "✅ TypeScript compilado"
echo ""

# 6. Bootstrap CDK
echo "[6/6] Bootstrap CDK..."
read -p "¿Ejecutar CDK bootstrap? (creará recursos en AWS) [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION
    echo "✅ CDK bootstrapped"
else
    echo "⚠️  Skipping bootstrap (ejecutar manualmente: cdk bootstrap)"
fi
echo ""

echo "========================================="
echo "✅ infra-01 SETUP COMPLETADO"
echo "========================================="
echo ""
echo "Verificar con:"
echo "  bash scripts/verify-infra-01.sh"
echo ""
