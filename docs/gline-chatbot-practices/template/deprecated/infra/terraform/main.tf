# ============================================================
# G-LINE Chatbot Infrastructure
#   AWS RDS PostgreSQL (東京) + Secrets Manager + Cloudflare Hyperdrive
#
# 使用方法:
#   terraform init
#   terraform plan  -var="db_password=$(openssl rand -base64 24)"
#   terraform apply -var="db_password=$(openssl rand -base64 24)"
# ============================================================

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.40"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project   = "gline-chatbot"
      ManagedBy = "terraform"
      Env       = var.env
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# ============================================================
# VPC
# ============================================================
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "gline-vpc-${var.env}" }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
  tags = { Name = "gline-public-a-${var.env}" }
}

resource "aws_subnet" "public_c" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}c"
  map_public_ip_on_launch = true
  tags = { Name = "gline-public-c-${var.env}" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = { Name = "gline-igw-${var.env}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "gline-rt-public-${var.env}" }
}

resource "aws_route_table_association" "a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "c" {
  subnet_id      = aws_subnet.public_c.id
  route_table_id = aws_route_table.public.id
}

resource "aws_db_subnet_group" "main" {
  name       = "gline-db-subnets-${var.env}"
  subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_c.id]
  tags = { Name = "gline-db-subnets-${var.env}" }
}

# ============================================================
# Security Group（Hyperdrive 及び管理IPから PostgreSQL 5432 のみ許可）
# ============================================================
resource "aws_security_group" "db" {
  name        = "gline-db-sg-${var.env}"
  description = "G-LINE RDS access"
  vpc_id      = aws_vpc.main.id

  # Cloudflare Hyperdrive からの接続（Cloudflare IPs は動的なので広めに許可）
  # 本番では Hyperdrive の固定 IP レンジを追跡することを推奨
  ingress {
    description = "PostgreSQL from Cloudflare Hyperdrive"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_db_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "gline-db-sg-${var.env}" }
}

# ============================================================
# RDS PostgreSQL 16（db.t4g.micro、20GB gp3、東京）
# ============================================================
resource "aws_db_parameter_group" "pg16" {
  name        = "gline-pg16-${var.env}"
  family      = "postgres16"
  description = "G-LINE PostgreSQL 16 with pgvector"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
    apply_method = "pending-reboot"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "gline-db-${var.env}"
  engine         = "postgres"
  engine_version = "16.4"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "gline_chatbot"
  username = "gline_admin"
  password = var.db_password
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  parameter_group_name   = aws_db_parameter_group.pg16.name

  publicly_accessible = true
  multi_az            = var.env == "production" ? true : false

  backup_retention_period = 7
  backup_window           = "18:00-19:00"   # UTC 03:00-04:00 JST
  maintenance_window      = "sun:19:00-sun:20:00"
  deletion_protection     = var.env == "production" ? true : false
  skip_final_snapshot     = var.env != "production"

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  tags = { Name = "gline-db-${var.env}" }
}

# ============================================================
# IAM role for RDS enhanced monitoring
# ============================================================
resource "aws_iam_role" "rds_monitoring" {
  name = "gline-rds-monitoring-${var.env}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ============================================================
# Secrets Manager（DATABASE_URL、APPLICANT_ENC_KEY）
# ============================================================
resource "random_password" "applicant_enc_key" {
  length  = 48
  special = true
}

resource "aws_secretsmanager_secret" "db_url" {
  name = "gline/db-url-${var.env}"
  recovery_window_in_days = var.env == "production" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id = aws_secretsmanager_secret.db_url.id
  secret_string = "postgresql://${aws_db_instance.main.username}:${var.db_password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}?sslmode=require"
}

resource "aws_secretsmanager_secret" "enc_key" {
  name = "gline/applicant-enc-key-${var.env}"
  recovery_window_in_days = var.env == "production" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "enc_key" {
  secret_id     = aws_secretsmanager_secret.enc_key.id
  secret_string = random_password.applicant_enc_key.result
}

# ============================================================
# Cloudflare Hyperdrive（AWS RDS への接続プール）
# ============================================================
resource "cloudflare_hyperdrive_config" "main" {
  account_id = var.cloudflare_account_id
  name       = "gline-pg-${var.env}"

  origin = {
    database = aws_db_instance.main.db_name
    host     = aws_db_instance.main.address
    port     = 5432
    scheme   = "postgres"
    user     = aws_db_instance.main.username
    password = var.db_password
  }

  caching = {
    disabled             = false
    max_age              = 30
    stale_while_revalidate = 15
  }
}
