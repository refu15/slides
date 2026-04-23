variable "aws_region" {
  description = "AWS region (Tokyo)"
  type        = string
  default     = "ap-northeast-1"
}

variable "env" {
  description = "Environment name (dev | staging | production)"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev", "staging", "production"], var.env)
    error_message = "env must be dev, staging, or production"
  }
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_password" {
  description = "Master password for RDS"
  type        = string
  sensitive   = true
}

variable "allowed_db_cidrs" {
  description = "CIDR ranges allowed to connect to RDS 5432. Cloudflare IPs recommended for production."
  type        = list(string)
  default     = ["0.0.0.0/0"]   # 開発用。本番では Cloudflare IP レンジに絞る
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token (Hyperdrive 作成権限)"
  type        = string
  sensitive   = true
}
