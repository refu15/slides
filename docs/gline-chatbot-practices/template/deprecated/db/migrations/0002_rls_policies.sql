-- ============================================================
-- Migration 0002: Row Level Security ポリシー
-- ロール分離:
--   app_public    : 応募フォームからの INSERT のみ
--   app_admin     : 採用担当・代表。全権限。
--   app_analytics : Metabase 接続用。匿名化ビューのみ。
-- ============================================================

-- ------------------------------------------------------------
-- ロール作成
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_public') THEN
    CREATE ROLE app_public NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_analytics') THEN
    CREATE ROLE app_analytics NOLOGIN;
  END IF;
END
$$;

-- ------------------------------------------------------------
-- 基本権限（スキーマ・テーブル）
-- ------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO app_public, app_admin, app_analytics;

-- public: 応募フォームで applicants へ INSERT、予約へ INSERT、ログ書込
GRANT INSERT ON applicants, appointments, conversations, events, escalations TO app_public;
GRANT SELECT ON faq TO app_public;              -- FAQ 読込は公開
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_public;

-- admin: 全権限
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_admin;

-- analytics: 匿名化ビューと faq/events のみ SELECT
GRANT SELECT ON v_anonymized_conversations, v_kpi_weekly, faq, events TO app_analytics;

-- ------------------------------------------------------------
-- RLS 有効化
-- ------------------------------------------------------------
ALTER TABLE applicants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations    ENABLE ROW LEVEL SECURITY;

-- applicants: public は自分が今 INSERT した行のみ一時的に参照可（返却用）
DROP POLICY IF EXISTS app_public_insert_applicants ON applicants;
CREATE POLICY app_public_insert_applicants ON applicants
  FOR INSERT TO app_public WITH CHECK (true);

DROP POLICY IF EXISTS app_admin_all_applicants ON applicants;
CREATE POLICY app_admin_all_applicants ON applicants
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

-- appointments: public INSERT のみ。admin 全権限。
DROP POLICY IF EXISTS app_public_insert_appointments ON appointments;
CREATE POLICY app_public_insert_appointments ON appointments
  FOR INSERT TO app_public WITH CHECK (true);

DROP POLICY IF EXISTS app_admin_all_appointments ON appointments;
CREATE POLICY app_admin_all_appointments ON appointments
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

-- conversations: public INSERT、analytics は SELECT（匿名ビュー経由）、admin 全権限
DROP POLICY IF EXISTS app_public_insert_conv ON conversations;
CREATE POLICY app_public_insert_conv ON conversations
  FOR INSERT TO app_public WITH CHECK (true);

DROP POLICY IF EXISTS app_admin_all_conv ON conversations;
CREATE POLICY app_admin_all_conv ON conversations
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

-- escalations: public INSERT、admin 全権限
DROP POLICY IF EXISTS app_public_insert_esc ON escalations;
CREATE POLICY app_public_insert_esc ON escalations
  FOR INSERT TO app_public WITH CHECK (true);

DROP POLICY IF EXISTS app_admin_all_esc ON escalations;
CREATE POLICY app_admin_all_esc ON escalations
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- コメント（運用メモ）
-- ------------------------------------------------------------
COMMENT ON ROLE app_public    IS 'Cloudflare Workers / Edge 用。応募フォーム INSERT 専用';
COMMENT ON ROLE app_admin     IS '採用担当・代表用。DB 全権限';
COMMENT ON ROLE app_analytics IS 'Metabase Cloud 接続用。匿名化ビューのみ';
