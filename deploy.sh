#!/usr/bin/env bash
# Deploy / redeploy the trip-planner Next.js app as an INDEPENDENT Container App.
#
# Reuses the shared ACR + Container App Environment (read-only data sources) and
# manages only its own app + Terraform state. Tear down anytime with:
#   cd terraform && terraform destroy
# ...without touching the chatbot, the hub, or the Django API.
#
# Deploy ORDER: tos-hub/trip-planner-api first (this app proxies /api/* to it).
#
#   ./deploy.sh           build a fresh image (timestamp tag) + apply
#   ./deploy.sh v3        use tag "v3"
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$ROOT/terraform"
ACR="bridgifycaiodevtestacr"
IMAGE_NAME="caio-tripplanner"
TAG="${1:-$(date +%Y%m%d%H%M%S)}"

# NEXT_PUBLIC_* are inlined into the JS bundle at BUILD time — read them from
# .env.local and pass as build args. APP_URL must be the deployed URL, not localhost.
ENV_SRC="$ROOT/.env.local"
val() { grep -E "^$1=" "$ENV_SRC" | head -1 | cut -d= -f2- | sed 's/^"//; s/"$//'; }
TENANT_ID="$(val NEXT_PUBLIC_TENANT_ID)"
AUTH_ENABLED="$(val NEXT_PUBLIC_AUTH_ENABLED)"
APP_URL="https://ca-caio-tripplanner-devtest.salmongrass-96e36b30.francecentral.azurecontainerapps.io"

echo "▶ Deploying trip-planner image tag: $TAG"

# 1) Build + push the image IN THE CLOUD (no local Docker). Context = this folder.
echo "▶ Step 1/2: build & push image (az acr build)"
az acr build --registry "$ACR" --image "${IMAGE_NAME}:${TAG}" "$ROOT" \
  --build-arg NEXT_PUBLIC_TENANT_ID="$TENANT_ID" \
  --build-arg NEXT_PUBLIC_AUTH_ENABLED="$AUTH_ENABLED" \
  --build-arg NEXT_PUBLIC_APP_URL="$APP_URL"

# 2) Apply — creates/updates the Container App against the shared infra.
echo "▶ Step 2/2: deploy container app"
cd "$TF_DIR"
terraform init -input=false
terraform apply -input=false -auto-approve -var "image_tag=${TAG}"

echo ""
echo "✅ trip-planner deployed. URL:"
terraform output -raw app_url
echo ""
