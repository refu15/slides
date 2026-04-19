# Wix / STUDIO / Jimdo 等ノーコードへの埋め込み

## Wix

1. Wix エディタで対象ページを開く
2. 左メニュー「追加 (+)」→「埋め込み」→「カスタムコードの埋め込み」
3. 以下を貼り付け：

```html
<script
  src="https://widget.example.com/widget.js"
  data-tenant="g-line-001"
  async
></script>
```

4. 「Body 終わり」に配置を指定
5. サイト公開

## STUDIO

1. ダッシュボード → 「設定」 → 「head タグ」または「body タグ」
2. 「body タグの最後に追加」を選択
3. 以下を貼り付け：

```html
<script
  src="https://widget.example.com/widget.js"
  data-tenant="g-line-001"
  async
></script>
```

4. 保存 → 公開

## Jimdo

1. 管理画面 → 「サイトを編集」 → 「ウィジェット/HTML」ブロックを追加
2. 以下を貼り付け：

```html
<script
  src="https://widget.example.com/widget.js"
  data-tenant="g-line-001"
  async
></script>
```

3. 保存 → 公開

## Ameba Ownd

1. デザイン → カスタム HTML 編集
2. `</body>` の直前に以下を追加：

```html
<script
  src="https://widget.example.com/widget.js"
  data-tenant="g-line-001"
  async
></script>
```

3. 保存

## 共通の注意点

- ノーコードツールによっては **独自ドメイン（有料プラン）** でないと `<script>` タグが使えない場合があります
- ツール標準のチャットウィジェット（Wix Chat 等）と併用すると見た目が重なるため、どちらかを無効化してください
- モバイルプレビューで右下のボタンが表示されることを必ず確認
