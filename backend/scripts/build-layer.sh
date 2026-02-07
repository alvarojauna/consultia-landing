#!/usr/bin/env bash
# build-layer.sh — Assembles Lambda Layer + bundles Lambda node_modules into dist/.
#
# Part 1: Lambda Layer
#   Lambda expects layers unpacked to /opt, so a Node.js layer must have:
#     nodejs/node_modules/<package-name>/...
#   Creates: shared/layer-build/nodejs/node_modules/{consultia-shared-nodejs, pg, ...}
#   Includes aws-sdk (NOT in Node.js 18+ runtime), pg, and shared lib
#
# Part 2: Lambda dist bundling
#   CDK deploys only each Lambda's dist/ folder. Runtime deps (joi, stripe, etc.)
#   must be copied into dist/node_modules/ so they're available at /var/task/.
#   EXCLUDES: @types/*, packages already in the layer (aws-sdk, pg, etc.)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SHARED_SRC="$BACKEND_DIR/shared/nodejs"
LAYER_DIR="$BACKEND_DIR/shared/layer-build"
TARGET="$LAYER_DIR/nodejs/node_modules"

# Packages to skip everywhere (dev-only)
SKIP_ALWAYS=(".package-lock.json" "typescript")

should_skip_always() {
  local name="$1"
  for skip in "${SKIP_ALWAYS[@]}"; do
    [ "$name" = "$skip" ] && return 0
  done
  # Skip @types/* (dev-only type definitions)
  [[ "$name" == @types ]] && return 0
  return 1
}

# ============================================================
# Part 1: Build Lambda Layer
# ============================================================
echo "==> [Layer] Cleaning old layer-build..."
rm -rf "$LAYER_DIR"

echo "==> [Layer] Creating layer structure..."
mkdir -p "$TARGET/consultia-shared-nodejs"

echo "==> [Layer] Copying shared lib package.json + dist/..."
cp "$SHARED_SRC/package.json" "$TARGET/consultia-shared-nodejs/"
cp -r "$SHARED_SRC/dist" "$TARGET/consultia-shared-nodejs/"

echo "==> [Layer] Copying runtime dependencies (excluding aws-sdk, @types)..."
if [ -d "$SHARED_SRC/node_modules" ]; then
  for pkg in "$SHARED_SRC/node_modules"/*; do
    base="$(basename "$pkg")"
    should_skip_always "$base" && continue
    cp -r "$pkg" "$TARGET/"
  done
fi

echo "==> [Layer] Done."
du -sh "$LAYER_DIR" 2>/dev/null || true

# Collect layer package names for exclusion in Part 2
declare -A LAYER_PKGS
for pkg in "$TARGET"/*; do
  LAYER_PKGS["$(basename "$pkg")"]=1
done

# ============================================================
# Part 2: Bundle each Lambda's node_modules into dist/
# ============================================================
LAMBDAS_DIR="$BACKEND_DIR/lambdas"
NODE_LAMBDAS=("onboarding-api" "dashboard-api" "webhook-api" "agent-deployment")

for LAMBDA_NAME in "${NODE_LAMBDAS[@]}"; do
  LAMBDA_DIR="$LAMBDAS_DIR/$LAMBDA_NAME"
  DIST_DIR="$LAMBDA_DIR/dist"

  if [ ! -d "$DIST_DIR" ]; then
    echo "==> [Lambda] WARNING: $LAMBDA_NAME/dist not found, skipping"
    continue
  fi

  echo "==> [Lambda] Bundling node_modules into $LAMBDA_NAME/dist/..."
  rm -rf "$DIST_DIR/node_modules"

  if [ -d "$LAMBDA_DIR/node_modules" ]; then
    mkdir -p "$DIST_DIR/node_modules"
    count=0
    for pkg in "$LAMBDA_DIR/node_modules"/*; do
      base="$(basename "$pkg")"
      # Skip always-excluded packages
      should_skip_always "$base" && continue
      # Skip packages already provided by the Layer
      [ "${LAYER_PKGS[$base]+exists}" ] && continue
      # Skip consultia-shared-nodejs (comes from Layer)
      [ "$base" = "consultia-shared-nodejs" ] && continue
      cp -r "$pkg" "$DIST_DIR/node_modules/"
      count=$((count + 1))
    done
    echo "    Bundled $count packages"
    du -sh "$DIST_DIR/node_modules" 2>/dev/null || true
  else
    echo "    WARNING: no node_modules found in $LAMBDA_NAME"
  fi
done

echo ""
echo "==> Build complete! Ready for cdk deploy."
