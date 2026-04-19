# WordPress への埋め込み

## 方法A：子テーマの footer.php に追加（推奨）

`wp-content/themes/YOUR_CHILD_THEME/footer.php` の `</body>` 直前に追加。

```php
<?php if (is_front_page() || is_page('recruit') || is_page('about')) : ?>
  <script
    src="https://widget.example.com/widget.js"
    data-tenant="g-line-001"
    async
  ></script>
<?php endif; ?>
```

特定ページにのみ表示する場合は `is_page()` の条件を調整してください。

## 方法B：functions.php で `wp_footer` フック

```php
add_action('wp_footer', function() {
  if (!is_front_page() && !is_page(['recruit', 'about'])) return;
  ?>
  <script
    src="https://widget.example.com/widget.js"
    data-tenant="g-line-001"
    async
  ></script>
  <?php
});
```

## 方法C：プラグイン「Insert Headers and Footers」等を使用

ノーコードで追加したい場合、以下プラグインのいずれかを使用：

- **Insert Headers and Footers (WPCode)**
- **Head, Footer and Post Injections**
- **Header and Footer Scripts**

「Footer」セクションに以下を貼り付け：

```html
<script
  src="https://widget.example.com/widget.js"
  data-tenant="g-line-001"
  async
></script>
```

## 注意点

- **キャッシュ系プラグイン（WP Super Cache / W3 Total Cache）**使用時はキャッシュクリアを忘れずに
- **Cloudflare APO** 等を使っている場合はキャッシュパージが必要
- **Contact Form 7** 等の既存フォームと CSS クラスが衝突しないよう、当ウィジェットは `.gline-` プレフィックスを使用しています
