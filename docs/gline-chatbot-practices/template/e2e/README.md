# G-LINE 採用チャットボット E2E

`template/e2e/` 配下で Playwright による E2E テストを実行するための構成です。  
デフォルトは Playwright の route interception で Workers API を完全モックするため、オフラインでも動作します。

## 対象テスト

- `tests/chat-flow.spec.ts`
  - FAB クリック
  - 質問入力
  - 送信
  - 応答表示
  - 3 ターン後に `.gline-apply-btn` 表示

- `tests/guardrail.spec.ts`
  - `salary_negotiation`
  - `confidential_request`
  - `gdpr_deletion`
  - `system_prompt_probe`
  - すべて `.gline-msg-assistant.escalated` を確認

- `tests/apply-flow.spec.ts`
  - `fixtures/test-page.html` の応募フォームから `/api/apply` を直叩き

- `tests/gdpr-flow.spec.ts`
  - `/api/gdpr` 成功レスポンス確認
  - `TEST_DATABASE_URL` 指定時のみ `postgres.js` で補助 DB 検証

- `tests/accessibility.spec.ts`
  - `@axe-core/playwright` + `axe-playwright`
  - WCAG 2.1 AA 違反ゼロを確認

- `tests/performance.spec.ts`
  - widget FAB 初期表示が 500ms 以内
  - Chromium で安定計測

## セットアップ

```bash
cd template/e2e
npm install
npm run install:browsers
npm run typecheck
npm run test:e2e
