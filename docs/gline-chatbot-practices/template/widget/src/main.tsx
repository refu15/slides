// ============================================================
// G-LINE Chatbot Widget エントリポイント
//
// 任意サイトに以下の1行で埋め込み可能:
//   <script src="https://widget.example.com/widget.js"
//           data-tenant="g-line-001" async></script>
// ============================================================

import { render } from 'preact'
import { ChatbotApp } from './widget'
import './widget.css'

declare const __API_URL__: string

// 設定抽出
const script = (document.currentScript as HTMLScriptElement | null)
  ?? document.querySelector('script[data-tenant]') as HTMLScriptElement | null

const config = {
  apiUrl: script?.dataset.apiUrl ?? __API_URL__,
  tenantId: script?.dataset.tenant ?? 'default',
  primaryColor: script?.dataset.primaryColor ?? '#0f3460',
  accentColor: script?.dataset.accentColor ?? '#e94560',
}

// ルート要素注入（body 末尾）
function bootstrap() {
  if (document.getElementById('gline-chatbot-root')) return

  const root = document.createElement('div')
  root.id = 'gline-chatbot-root'
  root.style.cssText = `
    --gline-primary: ${config.primaryColor};
    --gline-accent: ${config.accentColor};
  `
  document.body.appendChild(root)

  render(<ChatbotApp apiUrl={config.apiUrl} tenantId={config.tenantId} />, root)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap)
} else {
  bootstrap()
}
