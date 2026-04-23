-- ============================================================
-- Migration 0003: GDPR cascade delete 対応
--
-- 目的: 応募者の削除要求時に、関連する会話ログ・イベント・エスカレーション
--       を first_session_id 経由で物理削除できるようにする。
--
-- 設計方針:
-- - applicants に first_session_id カラムを追加
-- - 応募者登録時（/api/apply）に、応募時点の session_id を記録
-- - GDPR 削除時は lib/db.ts の requestDeletion() が
--   applicants を論理削除しつつ first_session_id を集約して関連テーブルを削除
-- ============================================================

-- applicants に session_id を追加
ALTER TABLE applicants
  ADD COLUMN IF NOT EXISTS first_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_applicants_first_session
  ON applicants(first_session_id)
  WHERE first_session_id IS NOT NULL;

COMMENT ON COLUMN applicants.first_session_id IS
  'GDPR 削除時に関連 conversations/events/escalations を削除するためのリンク。応募時点の session_id（ハッシュ済み）。';
