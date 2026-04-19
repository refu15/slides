# G-LINE メール通知テンプレート

React Email + Resend で実装された 5種類のメール通知テンプレート。

## テンプレート一覧

| ファイル | 用途 | 宛先 |
|---|---|---|
| `apply-received.tsx` | 応募受付完了 | 応募者 |
| `apply-notify-admin.tsx` | 新規応募通知 | info@g-line.co.jp |
| `appointment-confirmed.tsx` | 面接日時確定 | 応募者 |
| `gdpr-acknowledged.tsx` | 削除要求受領 | 応募者 |
| `reminder-d1.tsx` | 面接前日リマインダー | 応募者 |

## セットアップ

```bash
cd template/emails
npm install
```

## プレビュー（ローカル）

```bash
npm run dev
# → http://localhost:3001 で React Email Studio が起動
```

各テンプレートを5種類すべて確認できます。

## 使い方（Workers や Next.js から）

```ts
import { sendApplyReceived } from './emails/lib/send'

await sendApplyReceived('yamada@example.com', {
  name: '山田 太郎',
  preferredDate: '2026-05-10 14:00',
})
```

## 環境変数

```bash
RESEND_API_KEY=re_xxxxx
```

## デザイン

- ブランドカラー: primary `#0f3460` / accent `#e94560`
- 差出人: `G-LINE 採用 <no-reply@example.jp>`
- 件名プレフィックス: `【G-LINE 採用】`
- インラインCSS（Gmail / Outlook / iPhone Mail 対応）
- 日本語フォント: Hiragino / Noto Sans JP / Yu Gothic
