#!/bin/bash
set -euo pipefail

# ============================================
# ConsultIA — Production Deployment Script
# ============================================
# Deploys all CDK stacks in correct dependency order.
# Usage: ./scripts/deploy.sh [--skip-build] [--dry-run]
#
# Flags:
#   --skip-build   Skip building Lambda code (useful for infra-only changes)
#   --dry-run      Run cdk diff instead of deploy (preview changes)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/backend/infra"

SKIP_BUILD=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

echo "============================================"
echo "  ConsultIA Production Deployment"
echo "============================================"
echo ""

# ---- Pre-deploy checks ----
echo "[1/5] Running pre-deploy checks..."

# Check required tools
for cmd in node npm npx aws; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "ERROR: '$cmd' is not installed or not in PATH"
    exit 1
  fi
done

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
  echo "ERROR: AWS credentials not configured. Run 'aws configure' or set AWS_PROFILE."
  exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${CDK_DEFAULT_REGION:-eu-west-1}
echo "  Account: $AWS_ACCOUNT"
echo "  Region:  $AWS_REGION"

# Check required secrets exist
echo "  Checking Secrets Manager..."
for secret in "consultia/database/credentials" "consultia/production/api-keys"; do
  if ! aws secretsmanager describe-secret --secret-id "$secret" --region "$AWS_REGION" &> /dev/null; then
    echo "ERROR: Required secret '$secret' not found in Secrets Manager."
    echo "  Create it with: aws secretsmanager create-secret --name '$secret' --region $AWS_REGION"
    exit 1
  fi
done

echo "  Pre-deploy checks passed."
echo ""

# ---- Build Lambda code ----
if [ "$SKIP_BUILD" = false ]; then
  echo "[2/5] Building Lambda code..."

  # Build Node.js shared layer
  echo "  Building shared layer..."
  (cd "$PROJECT_ROOT/backend/shared/nodejs" && npm ci && npm run build)

  # Build Node.js Lambdas
  for lambda_dir in onboarding-api dashboard-api webhook-api agent-deployment; do
    echo "  Building $lambda_dir..."
    (cd "$PROJECT_ROOT/backend/lambdas/$lambda_dir" && npm ci && npm run build)
  done

  # Install Python Lambda dependencies
  echo "  Installing knowledge-base-processor dependencies..."
  (cd "$PROJECT_ROOT/backend/lambdas/knowledge-base-processor" && pip install -r requirements.txt -t . --quiet)

  echo "  Installing business-scraper dependencies..."
  (cd "$PROJECT_ROOT/backend/lambdas/business-scraper" && pip install -r requirements.txt -t . --quiet)

  echo "  Build complete."
else
  echo "[2/5] Skipping build (--skip-build flag)"
fi
echo ""

# ---- Install CDK dependencies ----
echo "[3/5] Installing CDK dependencies..."
(cd "$INFRA_DIR" && npm ci)
echo ""

# ---- CDK Bootstrap (if needed) ----
echo "[4/5] Checking CDK bootstrap..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region "$AWS_REGION" &> /dev/null; then
  echo "  CDK not bootstrapped. Running bootstrap..."
  (cd "$INFRA_DIR" && npx cdk bootstrap "aws://$AWS_ACCOUNT/$AWS_REGION")
else
  echo "  CDK already bootstrapped."
fi
echo ""

# ---- Deploy stacks ----
echo "[5/5] Deploying CDK stacks..."
echo ""

CDK_CMD="deploy"
if [ "$DRY_RUN" = true ]; then
  CDK_CMD="diff"
  echo "  (DRY RUN — showing diff only)"
  echo ""
fi

# Stacks in dependency order
STACKS=(
  "ConsultIA-Database"
  "ConsultIA-Storage"
  "ConsultIA-Api"
  "ConsultIA-Lambda"
  "ConsultIA-StepFunctions"
  "ConsultIA-Monitoring"
)

for stack in "${STACKS[@]}"; do
  echo "  ▸ $CDK_CMD: $stack"
  if ! (cd "$INFRA_DIR" && npx cdk "$CDK_CMD" "$stack" \
    --require-approval broadening \
    --region "$AWS_REGION" \
    2>&1 | sed 's/^/    /'); then
    echo ""
    echo "  ERROR: Failed to $CDK_CMD $stack. Stopping deployment."
    echo "  Fix the issue and re-run the script."
    exit 1
  fi
  echo ""
done

echo "============================================"
if [ "$DRY_RUN" = true ]; then
  echo "  Dry run complete. Review changes above."
else
  echo "  Deployment complete!"
  echo ""
  echo "  Next steps:"
  echo "  1. Subscribe to alarms: aws sns subscribe --topic-arn <AlarmTopicArn> --protocol email --notification-endpoint your@email.com"
  echo "  2. Verify API: curl https://api.consultia.es/plans"
  echo "  3. Check dashboard: https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=ConsultIA-Production"
fi
echo "============================================"
