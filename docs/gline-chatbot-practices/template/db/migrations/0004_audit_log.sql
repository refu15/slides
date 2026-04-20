-- ============================================================
-- Migration 0004: 監査ログ (audit_log)
--
-- 目的: PII を扱う全ての管理画面操作を記録し、APPI・ISO27001 監査に対応。
--
-- 記録対象:
-- - 応募者情報の閲覧 (view_applicant / decrypt_pii)
-- - GDPR 削除実行 (gdpr_delete)
-- - FAQ 編集・公開停止 (faq_edit)
-- - エスカレーション状態変更 (escalation_update)
-- - ペルソナ PR 採用/却下 (persona_approve / persona_reject)
-- - モデル設定変更 (model_config_change)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id             BIGSERIAL PRIMARY KEY,
  actor_email    TEXT        NOT NULL,
  action         TEXT        NOT NULL,
  resource_type  TEXT,
  resource_id    TEXT,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON audit_log(actor_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource
  ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_action
  ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created
  ON audit_log(created_at DESC);

COMMENT ON TABLE audit_log IS
  'APPI/ISO27001 監査用。管理画面からの PII 操作を全て記録する。';
COMMENT ON COLUMN audit_log.action IS
  'view_applicant / decrypt_pii / gdpr_delete / faq_edit / escalation_update / persona_approve / persona_reject / model_config_change 等';

-- ------------------------------------------------------------
-- RLS ポリシー
-- ------------------------------------------------------------
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- app_admin: 全権限（書き込みは Server Action から、読み込みは admin UI から）
DROP POLICY IF EXISTS app_admin_all_audit ON audit_log;
CREATE POLICY app_admin_all_audit ON audit_log
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

-- app_analytics: 読み取りのみ（compliance 分析用）
DROP POLICY IF EXISTS app_analytics_read_audit ON audit_log;
CREATE POLICY app_analytics_read_audit ON audit_log
  FOR SELECT TO app_analytics USING (true);

-- app_public には一切権限なし（デフォルト拒否）

GRANT SELECT, INSERT ON audit_log TO app_admin;
GRANT USAGE, SELECT ON SEQUENCE audit_log_id_seq TO app_admin;
GRANT SELECT ON audit_log TO app_analytics;

-- ------------------------------------------------------------
-- audit_log 自体は TTL 不要（法令上 3年以上保管推奨）
-- ただし、6ヶ月超の古いログは別ストレージにアーカイブする運用を想定
-- ------------------------------------------------------------
