# Supabase設定ガイド

## 1. Google OAuth設定

### Supabase Studioでの設定手順

1. **Supabase Studioにアクセス**
   - https://app.supabase.com にアクセス
   - プロジェクト `xtukixcihrscosxfwrfl` を選択

2. **Google Providerを有効化**
   - 左サイドバーから `Authentication` > `Providers` を選択
   - `Google` を探してクリック
   - `Enable Sign in with Google` をONにする

3. **認証情報を入力**
   ```
   Client ID: YOUR_GOOGLE_CLIENT_ID
   Client Secret: YOUR_GOOGLE_CLIENT_SECRET
   ```

4. **Redirect URLを確認**
   - 以下のURLが表示されているはずです:
   ```
   https://xtukixcihrscosxfwrfl.supabase.co/auth/v1/callback
   ```
   - このURLをコピー

5. **Google Cloud Consoleで設定**
   - https://console.cloud.google.com にアクセス
   - OAuth 2.0クライアントIDの設定画面を開く
   - 「承認済みのリダイレクトURI」に上記URLを追加（既に追加済みの場合はスキップ）

6. **保存**
   - Supabase Studioで `Save` をクリック

---

## 2. データベーステーブル作成

### SQL Editorでマイグレーションを実行

1. **SQL Editorを開く**
   - 左サイドバーから `SQL Editor` を選択
   - `New query` をクリック

2. **マイグレーションSQLを実行**
   - `supabase/migrations/001_auth_tables.sql` の内容をコピー
   - SQL Editorに貼り付け
   - `Run` をクリック

3. **テーブル確認**
   - 左サイドバーから `Table Editor` を選択
   - 以下のテーブルが作成されていることを確認:
     - `user_profiles`
     - `event_roles`
     - `invite_tokens`

---

## 3. 環境変数の設定

### ローカル開発環境

`.env.local` ファイルを更新:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xtukixcihrscosxfwrfl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4EYpcgJoULLqwG--Yii7YQ_Z53rV2cx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercelデプロイ時

Vercelプロジェクトの環境変数に以下を設定:
- `NEXT_PUBLIC_SUPABASE_URL`: https://xtukixcihrscosxfwrfl.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: sb_publishable_4EYpcgJoULLqwG--Yii7YQ_Z53rV2cx
- `NEXT_PUBLIC_APP_URL`: https://your-app.vercel.app

---

## 4. 動作確認

### テスト手順

1. **ローカルサーバー起動**
   ```bash
   npm run dev
   ```

2. **Google認証テスト**
   - ブラウザで http://localhost:3000 にアクセス
   - 「Googleでログイン」ボタンをクリック
   - Googleアカウントで認証
   - リダイレクトされることを確認

3. **招待URLテスト**
   - イベントを作成
   - 管理画面で招待URLを生成
   - 別のブラウザ（シークレットモード）で招待URLにアクセス
   - Google認証後、ロールが付与されることを確認

---

## トラブルシューティング

### Google認証が失敗する場合
- Google Cloud ConsoleでリダイレクトURIが正しく設定されているか確認
- Supabase StudioでClient IDとSecretが正しいか確認
- ブラウザのキャッシュをクリア

### テーブルが作成されない場合
- SQL Editorでエラーメッセージを確認
- `events` テーブルが先に作成されているか確認（Supabase統合の前提）

### 招待URLが機能しない場合
- `invite_tokens` テーブルにデータが挿入されているか確認
- RLSポリシーが正しく設定されているか確認
- ブラウザの開発者ツールでネットワークエラーを確認
