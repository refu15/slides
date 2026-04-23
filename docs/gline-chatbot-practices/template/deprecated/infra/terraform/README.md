# Infrastructure (Terraform)

AWS RDS PostgreSQL (東京) + Secrets Manager + Cloudflare Hyperdrive を一括プロビジョニング。

## 事前準備

1. [Terraform CLI](https://developer.hashicorp.com/terraform/downloads) 1.6+ をインストール
2. AWS CLI 認証設定済み（`aws configure` or SSO）
3. Cloudflare API Token 発行（Hyperdrive 作成権限）

## 環境別デプロイ

```bash
cd infra/terraform
terraform init

# DB パスワード自動生成
export TF_VAR_db_password=$(openssl rand -base64 32)
export TF_VAR_cloudflare_account_id="YOUR_CF_ACCOUNT_ID"
export TF_VAR_cloudflare_api_token="YOUR_CF_API_TOKEN"

# dev
terraform workspace new dev 2>/dev/null || terraform workspace select dev
terraform plan  -var="env=dev"
terraform apply -var="env=dev"

# production
terraform workspace new production 2>/dev/null || terraform workspace select production
terraform plan  -var="env=production" -var="db_instance_class=db.t4g.micro"
terraform apply -var="env=production"
```

## Outputs

```bash
terraform output db_endpoint         # RDS 接続先
terraform output hyperdrive_id       # wrangler.toml の [[hyperdrive]].id に貼付
terraform output db_url_secret_arn   # Workers から参照する Secrets Manager ARN
```

## 料金試算

| リソース | 月額（東京） |
|---|---|
| RDS db.t4g.micro | $10.22 |
| gp3 ストレージ 20GB | $2.30 |
| バックアップ 20GB（無料枠内） | $0 |
| Secrets Manager × 2 | $0.80 |
| Hyperdrive | $0（無料枠 500万クエリ/月） |
| **合計** | **約 $13.32 / 月** |

※ 新規 AWS アカウントは 12ヶ月 `db.t4g.micro` + 20GB 無料。

## 本番運用時の推奨変更

- `allowed_db_cidrs` を **Cloudflare の公開 IP レンジ**に絞る
  - 参考: https://www.cloudflare.com/ips/
- `multi_az = true`（本コードは `var.env == "production"` で自動）
- RDS Parameter Group で `shared_preload_libraries` に `pg_stat_statements` 追加済み
- pgvector 有効化は SQL で `CREATE EXTENSION vector;`（schema.sql に記載済み）

## 破棄

```bash
terraform destroy -var="env=dev"
# production は deletion_protection=true のため、先に無効化が必要
```
