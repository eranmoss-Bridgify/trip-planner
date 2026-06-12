# ── Subscription & shared-infra names (must match the chatbot stack) ────
variable "subscription_id" {
  type        = string
  description = "Azure subscription ID (default: 'Azure subscription - Credits')"
  default     = "088b6c2e-c3bf-4723-93d9-fd05b55c6fb1"
}

variable "resource_group" {
  type    = string
  default = "Bridgify-rg-caio-devtest-frc"
}

variable "acr_name" {
  type    = string
  default = "bridgifycaiodevtestacr"
}

variable "env_name" {
  type    = string
  default = "cae-caio-devtest-frc"
}

# ── This app ────────────────────────────────────────────────────────────
variable "app_name" {
  type    = string
  default = "ca-caio-tripplanner-devtest"
}

variable "image_name" {
  type    = string
  default = "caio-tripplanner"
}

variable "image_tag" {
  type        = string
  description = "Image tag to deploy (deploy.sh sets a unique tag per build)"
  default     = "latest"
}

# ── Backend coupling ─────────────────────────────────────────────────────
# With DJANGO_API_URL set, middleware.ts proxies ALL /api/* to the Django API
# (deployed from tos-hub/trip-planner-api). The Next.js API routes are dormant.
variable "django_api_url" {
  type        = string
  description = "URL of the trip-planner Django API Container App"
  default     = "https://ca-caio-tripplanner-api-devtest.salmongrass-96e36b30.francecentral.azurecontainerapps.io"
}
