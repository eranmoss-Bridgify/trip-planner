output "app_url" {
  description = "Public HTTPS URL of the trip-planner Container App"
  value       = "https://${azurerm_container_app.app.ingress[0].fqdn}"
}

output "app_name" {
  value = azurerm_container_app.app.name
}
