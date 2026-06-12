terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

# ── Shared platform infra, OWNED by the chatbot stack — referenced READ-ONLY ──
# Same pattern as the hub: we only read these so the app lands in the same
# resource group / registry / environment. The chatbot stack creates them first.
data "azurerm_resource_group" "rg" {
  name = var.resource_group
}

data "azurerm_container_registry" "acr" {
  name                = var.acr_name
  resource_group_name = data.azurerm_resource_group.rg.name
}

data "azurerm_container_app_environment" "env" {
  name                = var.env_name
  resource_group_name = data.azurerm_resource_group.rg.name
}

# ── The trip-planner Next.js Container App — INDEPENDENT lifecycle ────────────
# UI only: all /api/* traffic is proxied server-side to the Django API
# (middleware.ts), so this app holds no DB or Bridgify credentials. The
# NEXT_PUBLIC_* values are baked in at image build time (deploy.sh build args).
resource "azurerm_container_app" "app" {
  name                         = var.app_name
  container_app_environment_id = data.azurerm_container_app_environment.env.id
  resource_group_name          = data.azurerm_resource_group.rg.name
  revision_mode                = "Single"

  # Pull from the shared ACR with its admin password (same pattern as the other stacks).
  registry {
    server               = data.azurerm_container_registry.acr.login_server
    username             = data.azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = data.azurerm_container_registry.acr.admin_password
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "auto"
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 1
    max_replicas = 2

    container {
      name   = "tripplanner"
      image  = "${data.azurerm_container_registry.acr.login_server}/${var.image_name}:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "DJANGO_API_URL"
        value = var.django_api_url
      }
    }
  }
}
