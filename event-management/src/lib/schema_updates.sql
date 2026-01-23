-- =====================================================
-- チェックイン/アウト対応の修正スキーマ
-- 既存のcheckinsテーブルを拡張する形で適用
-- =====================================================

-- 既存のcheckinsテーブルを削除して再作成する場合
-- DROP TABLE IF EXISTS public.checkins CASCADE;

-- CHECK_IN_LOGS: 入退室ログ（チェックイン/アウト/途中退出対応）
CREATE TABLE IF NOT EXISTS public.check_in_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  attendee_id uuid REFERENCES public.attendees(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  action text CHECK (action IN ('checkin', 'checkout', 'temporary_exit', 'return')) NOT NULL,
  processed_by uuid REFERENCES public.profiles(id), -- NULLならセルフサービス
  method text CHECK (method IN ('qr', 'manual', 'self')) DEFAULT 'self',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_check_in_logs_attendee ON public.check_in_logs(attendee_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_event ON public.check_in_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_created_at ON public.check_in_logs(created_at DESC);

-- RLSを有効化
ALTER TABLE public.check_in_logs ENABLE ROW LEVEL SECURITY;

-- セッション/企画にフィードバック用のカラムを追加（任意）
-- 既存のsub_eventsテーブルに追加
-- ALTER TABLE public.sub_events ADD COLUMN IF NOT EXISTS allow_feedback boolean DEFAULT true;
-- ALTER TABLE public.sub_events ADD COLUMN IF NOT EXISTS speaker text;
-- ALTER TABLE public.sub_events ADD COLUMN IF NOT EXISTS description text;

-- 通知設定テーブル（任意）
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  discord_webhook_url text,
  line_notify_token text,
  slack_webhook_url text,
  notify_on_vip_checkin boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(event_id)
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
