output "db_endpoint" {
  description = "RDS endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "RDS address (host only)"
  value       = aws_db_instance.main.address
}

output "db_url_secret_arn" {
  description = "Secrets Manager ARN for DATABASE_URL"
  value       = aws_secretsmanager_secret.db_url.arn
}

output "enc_key_secret_arn" {
  description = "Secrets Manager ARN for APPLICANT_ENC_KEY"
  value       = aws_secretsmanager_secret.enc_key.arn
}

output "hyperdrive_id" {
  description = "Cloudflare Hyperdrive ID (wrangler.toml へ貼付)"
  value       = cloudflare_hyperdrive_config.main.id
}
