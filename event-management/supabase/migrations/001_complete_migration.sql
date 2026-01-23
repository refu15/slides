-- ========================================
-- Complete Database Migration
-- Events, Auth, and Role-Based Access
-- ========================================

-- ========================================
-- 1. イベント関連テーブル
-- ========================================

-- イベントテーブル
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- イベントデータテーブル
CREATE TABLE IF NOT EXISTS event_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  venues JSONB DEFAULT '[]',
  categories JSONB DEFAULT '[]',
  participants JSONB DEFAULT '[]',
  check_in_logs JSONB DEFAULT '[]',
  sessions JSONB DEFAULT '[]',
  notification_logs JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id)
);

-- ========================================
-- 2. 認証・ユーザー関連テーブル
-- ========================================

-- ユーザープロファイルテーブル
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- イベントロールテーブル（ユーザーとイベントの関連）
CREATE TABLE IF NOT EXISTS event_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- 招待トークンテーブル
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 3. Row Level Security (RLS)
-- ========================================

-- イベントテーブルのRLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_data ENABLE ROW LEVEL SECURITY;

-- 誰でも読める（公開イベント）
CREATE POLICY "Anyone can read events" ON events FOR SELECT USING (true);
CREATE POLICY "Anyone can read event_data" ON event_data FOR SELECT USING (true);

-- 認証ユーザーは作成可能
CREATE POLICY "Authenticated users can create events" ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create event_data" ON event_data FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- イベント作成者・管理者のみ更新可能
CREATE POLICY "Event admins can update events" ON events FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM event_roles
    WHERE event_roles.event_id = events.id
    AND event_roles.user_id = auth.uid()
    AND event_roles.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Event admins can update event_data" ON event_data FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM event_roles
    WHERE event_roles.event_id = event_data.event_id
    AND event_roles.user_id = auth.uid()
    AND event_roles.role IN ('owner', 'admin')
  )
);

-- イベント作成者のみ削除可能
CREATE POLICY "Event owners can delete events" ON events FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM event_roles
    WHERE event_roles.event_id = events.id
    AND event_roles.user_id = auth.uid()
    AND event_roles.role = 'owner'
  )
);

-- ユーザープロファイルのRLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- 自分のプロファイルは読み書き可能
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- イベントロールの閲覧（自分が所属するイベントのみ）
CREATE POLICY "Users can view their event roles" ON event_roles FOR SELECT USING (auth.uid() = user_id);

-- イベントロールは招待経由で挿入可能
CREATE POLICY "Users can insert their own event roles" ON event_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 招待トークンは誰でも読める（検証のため）
CREATE POLICY "Anyone can read invite tokens for validation" ON invite_tokens FOR SELECT USING (true);

-- 招待トークンの管理（管理者・オーナーのみ）
CREATE POLICY "Admins can create invite tokens" ON invite_tokens FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_roles
    WHERE event_roles.event_id = invite_tokens.event_id
    AND event_roles.user_id = auth.uid()
    AND event_roles.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins can update invite tokens" ON invite_tokens FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM event_roles
    WHERE event_roles.event_id = invite_tokens.event_id
    AND event_roles.user_id = auth.uid()
    AND event_roles.role IN ('owner', 'admin')
  )
);

-- ========================================
-- 4. トリガーと関数
-- ========================================

-- 関数: ユーザープロファイルの自動作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー: 新規ユーザー作成時にプロファイル自動生成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
