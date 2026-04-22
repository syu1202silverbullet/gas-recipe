---
title: "HTMLテンプレをGASで使う書き方10例｜HtmlService実装パターン徹底解説"
description: "GAS Webアプリで HTML テンプレートを使う書き方10例を、看護師×副業Webエンジニアの凛が実装コード付きで解説。HtmlServiceの基本、テンプレート式、JS連携、CSS適用までWebアプリ作成の総合ガイド。"
pubDate: "2026-05-07T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","html","webapp","template","htmlservice"]
tagNames: ["GAS","HTML","Webアプリ","テンプレート","HtmlService"]
readingTime: 9
keywords: ["GAS HTML テンプレート","GAS HtmlService","GAS Webアプリ HTML","GAS HTML 書き方"]
---

こんにちは、凛です。都内で看護師をしながら、副業でWebエンジニアをしています。GAS Webアプリで「動的なHTMLを返したい」時、必ず使うのが`HtmlService`。今日はGAS HTMLテンプレートの書き方10例を実装コード付きで解説します。

「GAS HTML テンプレート」で検索してここに来た方が、読み終わった直後にWebアプリのUI実装を進められるレベルで書いています。

## こんな悩みありませんか？

- 「GASで作ったWebアプリに動的データを表示したい」
- 「HTMLとGASの値の橋渡しの書き方がわからない」
- 「JavaScript と GAS のデータ受け渡しが混乱する」
- 「CSSを当てたいけどどこに書く？」

私もWebアプリ初挑戦時、`<?= variable ?>` の書き方を見て怯みました。慣れれば書けるパターンが10個くらいで全カバーできます。

## HtmlService の3パターン

| パターン | 用途 |
|---|---|
| `createHtmlOutput(string)` | 直接HTML文字列を返す |
| `createHtmlOutputFromFile(name)` | HTMLファイルを読み込む |
| `createTemplateFromFile(name)` | テンプレートとして変数差し込み |

## 例1: 最小HTML返却

```javascript
function doGet() {
  return HtmlService.createHtmlOutput('<h1>Hello, World!</h1>');
}
```

## 例2: HTMLファイルを返す

GASエディタで「ファイル → HTML」で `index.html` を新規作成 →

```javascript
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('My App');
}
```

`index.html` 例：
```html
<!DOCTYPE html>
<html>
<head><base target="_top"></head>
<body>
  <h1>GAS Webアプリです</h1>
</body>
</html>
```

`<base target="_top">` を入れるとGASのiframeを抜けてリンクが正しく動きます。

## 例3: テンプレート式（変数差し込み）

GAS側：
```javascript
function doGet() {
  const t = HtmlService.createTemplateFromFile('greet');
  t.userName = '凛';
  t.today = new Date().toLocaleDateString('ja-JP');
  return t.evaluate();
}
```

`greet.html`：
```html
<h1>こんにちは、<?= userName ?>さん</h1>
<p>今日は <?= today ?> です</p>
```

`<?= variable ?>` でGASの値をHTMLに埋め込めます（XSSエスケープ自動）。

## 例4: 配列をループ表示

```javascript
function doGet() {
  const t = HtmlService.createTemplateFromFile('list');
  t.items = ['りんご', 'みかん', 'ぶどう'];
  return t.evaluate();
}
```

`list.html`：
```html
<ul>
  <? items.forEach(item => { ?>
    <li><?= item ?></li>
  <? }) ?>
</ul>
```

`<? ... ?>` がスクリプトレット（出力なし）、`<?= ... ?>` が出力。

## 例5: スプシのデータをHTML表示

```javascript
function doGet() {
  const sheet = SpreadsheetApp.openById('XXX').getActiveSheet();
  const data = sheet.getDataRange().getValues();

  const t = HtmlService.createTemplateFromFile('table');
  t.rows = data;
  return t.evaluate();
}
```

`table.html`：
```html
<table border="1">
  <? rows.forEach(row => { ?>
    <tr>
      <? row.forEach(cell => { ?>
        <td><?= cell ?></td>
      <? }) ?>
    </tr>
  <? }) ?>
</table>
```

スプシをWebに即公開できる最短コード。

## 例6: CSSを適用

`<style>`タグで直接書くか、別ファイルにして読み込み。

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 20px; }
    h1 { color: #3b82f6; border-bottom: 2px solid #3b82f6; }
    .card { background: #f3f4f6; padding: 15px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>レポート</h1>
  <div class="card">内容</div>
</body>
</html>
```

外部CDN（Tailwind, Bootstrap）も `<link>` で読み込めます。

## 例7: フォームを置いて入力受付

```html
<form id="myForm">
  <input type="text" id="name" placeholder="お名前">
  <button type="button" onclick="submit()">送信</button>
</form>
<div id="result"></div>

<script>
function submit() {
  const name = document.getElementById('name').value;
  google.script.run
    .withSuccessHandler(showResult)
    .saveData(name);
}
function showResult(msg) {
  document.getElementById('result').innerText = msg;
}
</script>
```

GAS側：
```javascript
function saveData(name) {
  const sheet = SpreadsheetApp.openById('XXX').getActiveSheet();
  sheet.appendRow([new Date(), name]);
  return `${name}さんのデータを保存しました`;
}
```

`google.script.run` がGAS関数呼び出しのキー。非同期で動きます。

## 例8: GAS関数からデータ取得して表示

```html
<div id="data">読込中...</div>
<script>
window.onload = function() {
  google.script.run
    .withSuccessHandler(showData)
    .getLatestData();
};
function showData(data) {
  document.getElementById('data').innerHTML = JSON.stringify(data);
}
</script>
```

GAS：
```javascript
function getLatestData() {
  return SpreadsheetApp.openById('XXX').getActiveSheet().getDataRange().getValues();
}
```

ページ読込時にデータ取得→表示。SPA風UIの基本パターン。

## 例9: 別ファイルにJS/CSSを分割

巨大なHTMLになると見づらいので分割：

`index.html`：
```html
<?!= include('style'); ?>
<body>
  <h1>App</h1>
  <?!= include('script'); ?>
</body>
```

`style.html`：
```html
<style>
  body { font-family: sans-serif; }
</style>
```

`script.html`：
```html
<script>
  console.log('loaded');
</script>
```

GAS：
```javascript
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

## 例10: モバイル対応（メタビューポート）

```html
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-size: 16px; padding: 16px; }
    button { padding: 12px 24px; font-size: 16px; }
  </style>
</head>
```

スマホで使うWebアプリは必ずビューポート設定。タップしやすい大きめのボタンに。

## ⚠️ よくある落とし穴

### `<base target="_top">` を忘れる

`<a href>`が iframe 内で開いて見づらい。`<head>`に必須。

### XSS 対策

`<?= ?>` は自動エスケープされるが、`<?!= ?>` は生HTML出力。ユーザー入力を生HTMLで出すと XSS リスク。

### `google.script.run` は非同期

戻り値を直接受け取れない。`.withSuccessHandler(fn)` か Promise化して扱う。

```javascript
// Promise化（モダン推奨）
function callGas(funcName, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      [funcName](...args);
  });
}

async function loadData() {
  const data = await callGas('getLatestData');
  console.log(data);
}
```

## まとめ

- `HtmlService.createHtmlOutputFromFile` でHTMLファイル読み込み
- `createTemplateFromFile` で変数差し込み（`<?= ?>` `<? ?>`）
- `google.script.run` でフロントエンドからGAS関数呼び出し
- CSS/JSは別ファイル分割で保守性UP
- `<base target="_top">` とビューポート設定は必須
- `<?= ?>` 自動エスケープで XSS 対策

GAS Webアプリは「サーバー不要・無料・5分で公開」の最強プロトタイピング環境です。10個のパターンを使い回せば、簡易CRMから社内ダッシュボードまで何でも作れます。

## 関連記事

- [GAS Webアプリ公開最短5ステップ](/blog/gas-webapp-deploy/)
- [スプシをDB化するWebアプリGASサンプル](/blog/gas-webapp-form-db/)
- [GAS Webアプリにログイン機能を付ける方法](/blog/gas-webapp-login/)
- [スプシにサイドバーを追加するGAS完全版](/blog/gas-sidebar-custom/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
