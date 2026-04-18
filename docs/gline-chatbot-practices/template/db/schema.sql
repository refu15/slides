-- ============================================================
-- G-LINE 採用チャットボット DB スキーマ（Neon PostgreSQL）
-- 実行順序:
--   1) psql $DATABASE_URL -f db/schema.sql
--   2) psql $DATABASE_URL -f db/migrations/0002_rls_policies.sql
--   3) psql $DATABASE_URL -f db/seed.sql   -- 任意
-- ============================================================

-- pgvector 拡張（Neon で有効化）
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- UUID 生成用
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- 日本語曖昧検索用

-- ============================================================
-- 1. applicants ── 応募者情報（個人情報・厳格保護）
-- ============================================================
CREATE TABLE IF NOT EXISTS applicants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_enc        BYTEA        NOT NULL,       -- 氏名（pgcrypto で暗号化）
  email_enc       BYTEA        NOT NULL,       -- メール（pgcrypto で暗号化）
  email_hash      TEXT         NOT NULL,       -- 検索用ハッシュ (SHA-256)
  phone_enc       BYTEA,                        -- 電話（pgcrypto で暗号化）
  preferred_date  DATE,
  notes           TEXT,
  requested_deletion BOOLEAN   NOT NULL DEFAULT FALSE,  -- GDPR 削除要求
  deleted_at      TIMESTAMPTZ,                  -- 論理削除
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_applicants_email_hash ON applicants(email_hash);
CREATE INDEX IF NOT EXISTS idx_applicants_deleted_at ON applicants(deleted_at);

-- ============================================================
-- 2. appointments ── 面接予約
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id    UUID         NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ  NOT NULL,
  location        TEXT         NOT NULL DEFAULT '対面（本社）',
  status          TEXT         NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notified_at     TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ============================================================
-- 3. conversations ── 会話ログ（匿名化・90日TTL）
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id              BIGSERIAL PRIMARY KEY,
  session_id      TEXT         NOT NULL,       -- 匿名ハッシュ（応募者IDと紐付けしない）
  turn_index      INT          NOT NULL,       -- 同一セッション内の順序
  role            TEXT         NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT         NOT NULL,
  model           TEXT,                         -- 使用モデル名
  provider        TEXT,                         -- google/openai/anthropic
  tokens_in       INT          NOT NULL DEFAULT 0,
  tokens_out      INT          NOT NULL DEFAULT 0,
  latency_ms      INT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id, turn_index);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

-- ============================================================
-- 4. rag_chunks ── RAG ベクトルインデックス
--   Gemini text-embedding-004 = 768次元
-- ============================================================
CREATE TABLE IF NOT EXISTS rag_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT         NOT NULL,       -- 'book' / 'website' / 'recruitment' / 'autobiography'
  source_ref      TEXT,                         -- 章番号や URL
  chunk_text      TEXT         NOT NULL,
  embedding       VECTOR(768)  NOT NULL,
  tokens          INT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- HNSW インデックス（pgvector 0.7+、Neon 対応）
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding
  ON rag_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_chunks(source);

-- ============================================================
-- 5. faq ── FAQ マスタ（Notion から同期 or 手動編集）
-- ============================================================
CREATE TABLE IF NOT EXISTS faq (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT         NOT NULL,
  question        TEXT         NOT NULL,
  answer          TEXT         NOT NULL,
  keywords        TEXT[]       NOT NULL DEFAULT '{}',
  priority        INT          NOT NULL DEFAULT 100,
  published       BOOLEAN      NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_faq_category_published ON faq(category, published);
CREATE INDEX IF NOT EXISTS idx_faq_question_trgm ON faq USING gin (question gin_trgm_ops);

-- ============================================================
-- 6. events ── KPI イベント（週次集計用）
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id              BIGSERIAL PRIMARY KEY,
  session_id      TEXT         NOT NULL,
  event_type      TEXT         NOT NULL
                    CHECK (event_type IN (
                      'chat_open', 'ask', 'answer', 'escalate',
                      'apply_click', 'appointment_created', 'rag_hit', 'rag_miss'
                    )),
  metadata        JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_type_created ON events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);

-- ============================================================
-- 7. escalations ── 人間引き継ぎキュー
-- ============================================================
CREATE TABLE IF NOT EXISTS escalations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      TEXT         NOT NULL,
  applicant_id    UUID         REFERENCES applicants(id) ON DELETE SET NULL,
  reason          TEXT         NOT NULL,        -- 'salary_negotiation' / 'unknown' / 'gdpr_deletion' etc.
  trigger_message TEXT         NOT NULL,
  status          TEXT         NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'resolved', 'dropped')),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_created ON escalations(created_at);

-- ============================================================
-- 監査用ビュー（分析ロールに公開）
-- ============================================================
CREATE OR REPLACE VIEW v_anonymized_conversations AS
SELECT
  id, session_id, turn_index, role,
  LEFT(content, 500) AS content_preview,      -- 長文を切る
  model, provider, tokens_in, tokens_out, latency_ms, created_at
FROM conversations
WHERE created_at > NOW() - INTERVAL '90 days';

CREATE OR REPLACE VIEW v_kpi_weekly AS
SELECT
  DATE_TRUNC('week', created_at) AS week,
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'chat_open') AS unique_users,
  COUNT(*) FILTER (WHERE event_type = 'ask') AS total_questions,
  COUNT(*) FILTER (WHERE event_type = 'apply_click') AS apply_clicks,
  COUNT(*) FILTER (WHERE event_type = 'escalate') AS escalations,
  COUNT(*) FILTER (WHERE event_type = 'appointment_created') AS appointments_made,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'apply_click')
         / NULLIF(COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'chat_open'), 0),
    2
  ) AS apply_conversion_pct
FROM events
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

-- ============================================================
-- 更新タイムスタンプトリガー
-- ============================================================
CREATE OR REPLACE FUNCTION tg_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applicants_touch ON applicants;
CREATE TRIGGER trg_applicants_touch BEFORE UPDATE ON applicants
  FOR EACH ROW EXECUTE FUNCTION tg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_faq_touch ON faq;
CREATE TRIGGER trg_faq_touch BEFORE UPDATE ON faq
  FOR EACH ROW EXECUTE FUNCTION tg_touch_updated_at();
