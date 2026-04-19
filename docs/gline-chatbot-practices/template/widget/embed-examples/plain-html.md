# 素の HTML への埋め込み

どんなサーバーの HTML にもこの1行を追加するだけで動きます。`</body>` の直前がベスト。

```html
<script
  src="https://widget.example.com/widget.js"
  data-tenant="g-line-001"
  data-primary-color="#0f3460"
  data-accent-color="#e94560"
  async
></script>
```

## data 属性一覧

| 属性 | 用途 | デフォルト |
|---|---|---|
| `data-tenant` | テナントID（マルチテナント時） | `default` |
| `data-api-url` | API サーバー URL（開発時オーバーライド） | ビルド時定数 |
| `data-primary-color` | プライマリカラー | `#0f3460` |
| `data-accent-color` | アクセントカラー | `#e94560` |

## 動作確認

1. HTML を保存してブラウザで開く
2. 右下に「💬 採用のご質問はこちら」ボタンが表示される
3. クリックしてチャットウィンドウが開けば OK
