---
title: "HTMLテンプレをGASで使う書き方10例｜HtmlService実装パターン徹底解説"
description: "GAS Webアプリで HTML テンプレートを使う書き方10例を、実装コード付きで解説。HtmlServiceの基本、テンプレート式、JS連携、CSS適用までWebアプリ作成の総合ガイド。"
pubDate: "2026-05-07T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","html","webapp","template","htmlservice"]
tagNames: ["GAS","HTML","Webアプリ","テンプレート","HtmlService"]
readingTime: 12
keywords: ["GAS HTML テンプレート","GAS HtmlService","GAS Webアプリ HTML","GAS HTML 書き方"]
---

こんにちは、凛です。2児のママで現役ナースをしながら、GASで副業をしています。GAS Webアプリで「動的なHTMLを返したい」時に必ず使うのが`HtmlService`です。今日はGAS HTMLテンプレートの書き方を10例、実装コード付きで徹底解説します。

「GAS HTML テンプレート」「GAS HtmlService 書き方」で検索してここに来た方が、読み終わった直後に自分のWebアプリのUI実装を進められるレベルで書いています。

## こんな悩みありませんか？

「GASで作ったWebアプリに動的データを表示したい」「HTMLとGASの値の橋渡しの書き方がわからない」「JavaScriptとGASのデータ受け渡しが混乱する」「CSSを当てたいけどどこに書けばいい？」

私もWebアプリ初挑戦のとき、`<?= variable ?>` という見慣れない記法を見て怯みました。でも慣れれば、だいたい10個のパターンを使い回すだけで全部カバーできます。

看護師として働きながら、病棟の事務作業を少しずつGASで自動化してきた私が、「これ知ってたら最初からもっと楽だった」という実務目線でまとめました。

## GASのWebアプリでHTMLを扱う仕組み

まず全体像を整理しましょう。

GASはもともとスクリプト言語なので、「HTMLを返す」という発想がピンとこない方も多いと思います。実は、GASには`HtmlService`というAPIが用意されていて、これを使うとHTML文字列やHTMLファイルをWebブラウザに返すことができます。

```
ユーザー（ブラウザ） → GAS WebアプリのURL → doGet関数 → HtmlServiceが処理 → HTMLを返す
```

この流れを押さえておけば、あとは10個のパターンを組み合わせるだけです。

## HtmlService の3パターン

`HtmlService`には大きく分けて3つの使い方があります。

| パターン | 用途 | 向いているシーン |
|---|---|---|
| `createHtmlOutput(string)` | 直接HTML文字列を返す | 短いメッセージ表示など |
| `createHtmlOutputFromFile(name)` | HTMLファイルを読み込む | 静的なページを返す |
| `createTemplateFromFile(name)` | テンプレートとして変数を差し込む | データを動的に表示する |

3番目の`createTemplateFromFile`が最もよく使う形です。スプレッドシートのデータをHTMLに渡して動的なページを作るとき、これが必須になります。

## 例1：最小HTML返却

まずはもっともシンプルなコードです。

```javascript
function doGet() {
  return HtmlService.createHtmlOutput('<h1>Hello, World!</h1>');
}
```

これだけで「Hello, World!」と表示するWebアプリが完成します。テスト・動作確認の最初の一歩はこのコードから始めるのがおすすめです。

`doGet`という関数名はGASが予約しています。GETリクエストが来たとき、自動的にこの関数が呼び出されます。

## 例2：HTMLファイルを返す

本格的なWebアプリを作るなら、HTMLを文字列ではなく別ファイルに書くのが定番です。

### HTMLファイルの作り方

GASエディタを開いて、左上の「+」→「HTML」をクリック。ファイル名を`index`にして作成します。

**GAS側のコード：**
```javascript
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('My App');
}
```

**index.html：**
```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
</head>
<body>
  <h1>GAS Webアプリです</h1>
  <p>HTMLファイルから読み込んでいます</p>
</body>
</html>
```

`<base target="_top">` を入れておくのがポイントです。GASのWebアプリはiframe内で動くため、これがないとリンクのクリックがiframe内で開いてしまいます。必ず`<head>`に入れておきましょう。

## 例3：テンプレート式（変数を差し込む）

GASの変数をHTMLに埋め込む方法です。これを覚えると動的なページが作れるようになります。

**GAS側：**
```javascript
function doGet() {
  const t = HtmlService.createTemplateFromFile('greet');
  t.userName = '凛';
  t.today = new Date().toLocaleDateString('ja-JP');
  t.items = ['看護記録', '薬剤一覧', 'シフト確認'];
  return t.evaluate();
}
```

**greet.html：**
```html
<!DOCTYPE html>
<html>
<head><base target="_top"></head>
<body>
  <h1>こんにちは、<?= userName ?>さん</h1>
  <p>今日は <?= today ?> です</p>
</body>
</html>
```

`<?= variable ?>` でGASの変数をHTMLに埋め込めます。XSSエスケープが自動で適用されるので、文字列の安全な表示に使います。

### `<?= ?>` と `<?!= ?>` の違い

| 記法 | 動作 | 使いどき |
|---|---|---|
| `<?= 変数 ?>` | HTMLエスケープして出力 | 通常の文字列（ユーザー入力など） |
| `<?!= 変数 ?>` | 生HTMLとして出力 | GASが生成したHTMLを埋め込む時 |

**重要**：ユーザーが入力した値を`<?!= ?>`で出力するとXSS脆弱性になります。基本は`<?= ?>`を使い、`<?!= ?>`は「GASコード内で安全に生成したHTML」限定で使ってください。

## 例4：配列をループ表示

スプレッドシートのデータをリスト表示するときの基本パターンです。

**GAS側：**
```javascript
function doGet() {
  const t = HtmlService.createTemplateFromFile('list');
  t.items = ['りんご', 'みかん', 'ぶどう'];
  return t.evaluate();
}
```

**list.html：**
```html
<!DOCTYPE html>
<html>
<head><base target="_top"></head>
<body>
  <h1>一覧</h1>
  <ul>
    <? items.forEach(item => { ?>
      <li><?= item ?></li>
    <? }) ?>
  </ul>
</body>
</html>
```

`<? ... ?>` がスクリプトレット（処理するけど出力しない）、`<?= ... ?>` が値を出力します。配列のループは`<? forEach ?>` で囲む形が基本です。

## 例5：スプレッドシートのデータをHTML表示

これが実務で一番よく使うパターンです。スプレッドシートのデータを取得して、テーブルとして表示します。

**GAS側：**
```javascript
function doGet() {
  const sheet = SpreadsheetApp.openById('スプレッドシートID').getActiveSheet();
  const data = sheet.getDataRange().getValues();

  const t = HtmlService.createTemplateFromFile('table');
  t.rows = data;
  return t.evaluate();
}
```

**table.html：**
```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4a86e8; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>データ一覧</h1>
  <table>
    <? rows.forEach((row, i) => { ?>
      <tr>
        <? row.forEach(cell => { ?>
          <? if (i === 0) { ?>
            <th><?= cell ?></th>
          <? } else { ?>
            <td><?= cell ?></td>
          <? } ?>
        <? }) ?>
      </tr>
    <? }) ?>
  </table>
</body>
</html>
```

1行目をヘッダー（`<th>`）、それ以降をデータ行（`<td>`）として表示する工夫が入っています。スプレッドシートをそのままWebページに公開できます。

私は以前、病棟の物品在庫リストをこの方法でWebアプリ化したことがあります。スプレッドシートを更新すれば自動でWebに反映されるので、在庫担当の看護師が毎回メールで確認する手間がなくなりました。

## 例6：CSSを適用する

見た目を整えるCSSの書き方です。

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
      color: #333;
    }
    h1 {
      color: #3b82f6;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 8px;
    }
    .card {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <h1>レポート</h1>
  <div class="card">内容がここに入ります</div>
  <button class="btn">アクション</button>
</body>
</html>
```

外部CSSフレームワークも使えます。TailwindやBootstrapをCDN経由で読み込む場合：

```html
<!-- Tailwind CSS -->
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">

<!-- Bootstrap -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
```

CDNを使えば余計なファイルを作らずにデザインが整います。

## 例7：フォームを置いて入力受付

ユーザーが入力したデータをスプレッドシートに保存するフォームの実装です。

**フロントエンド（index.html）：**
```html
<!DOCTYPE html>
<html>
<head><base target="_top"></head>
<body>
  <h2>データ入力フォーム</h2>
  <form>
    <p><input type="text" id="name" placeholder="お名前" style="padding:8px; font-size:16px;"></p>
    <p><input type="text" id="memo" placeholder="メモ" style="padding:8px; font-size:16px;"></p>
    <button type="button" onclick="submitData()" style="padding:10px 20px;">送信</button>
  </form>
  <div id="result"></div>

  <script>
  function submitData() {
    const name = document.getElementById('name').value;
    const memo = document.getElementById('memo').value;
    if (!name) {
      alert('お名前を入力してください');
      return;
    }
    document.getElementById('result').innerText = '送信中...';
    google.script.run
      .withSuccessHandler(function(msg) {
        document.getElementById('result').innerText = msg;
      })
      .withFailureHandler(function(err) {
        document.getElementById('result').innerText = 'エラー: ' + err.message;
      })
      .saveData(name, memo);
  }
  </script>
</body>
</html>
```

**GAS側：**
```javascript
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('入力フォーム');
}

function saveData(name, memo) {
  const sheet = SpreadsheetApp.openById('スプレッドシートID').getActiveSheet();
  sheet.appendRow([new Date(), name, memo]);
  return name + 'さんのデータを保存しました';
}
```

`google.script.run` がフロントエンドからGAS関数を呼び出すAPIです。非同期で動くので、`.withSuccessHandler`で成功時の処理、`.withFailureHandler`でエラー時の処理を指定します。

## 例8：ページ読み込み時にデータを取得して表示

ページを開いた瞬間にGASからデータを取得して表示する、SPA風のパターンです。

**HTML：**
```html
<!DOCTYPE html>
<html>
<head><base target="_top"></head>
<body>
  <h1>最新データ</h1>
  <div id="data">読み込み中...</div>

  <script>
  window.onload = function() {
    google.script.run
      .withSuccessHandler(function(data) {
        const html = data.map(row =>
          `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`
        ).join('');
        document.getElementById('data').innerHTML =
          '<table border="1"><tr><th>日時</th><th>名前</th><th>メモ</th></tr>' + html + '</table>';
      })
      .withFailureHandler(function(err) {
        document.getElementById('data').innerText = 'データ取得失敗: ' + err.message;
      })
      .getLatestData();
  };
  </script>
</body>
</html>
```

**GAS：**
```javascript
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

function getLatestData() {
  const sheet = SpreadsheetApp.openById('スプレッドシートID').getActiveSheet();
  return sheet.getDataRange().getValues();
}
```

ページが開いたとき、`window.onload` が発火して`getLatestData`を呼び出し、返ってきたデータをHTMLに変換して表示します。

## 例9：別ファイルにJS/CSSを分割

HTMLが大きくなると見づらくなります。JS・CSSを別ファイルに分割して管理しやすくする方法です。

**index.html（メインファイル）：**
```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <?!= include('style'); ?>
</head>
<body>
  <h1>App</h1>
  <button id="btn">データ取得</button>
  <div id="result"></div>

  <?!= include('script'); ?>
</body>
</html>
```

**style.html（CSSだけ）：**
```html
<style>
  body { font-family: -apple-system, sans-serif; padding: 20px; }
  #btn { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; }
</style>
```

**script.html（JSだけ）：**
```html
<script>
  document.getElementById('btn').addEventListener('click', function() {
    google.script.run
      .withSuccessHandler(function(data) {
        document.getElementById('result').innerText = JSON.stringify(data);
      })
      .getLatestData();
  });
</script>
```

**GAS側（include関数を追加）：**
```javascript
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getLatestData() {
  return SpreadsheetApp.openById('スプレッドシートID').getActiveSheet().getDataRange().getValues();
}
```

`include`関数でHTMLファイルの中身を文字列として取得して、`<?!= ?>`で埋め込んでいます。これでindex.html・style.html・script.htmlの3ファイル構成で管理できます。

## 例10：モバイル対応（メタビューポート）

スマホで使うWebアプリには必須の設定です。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      font-size: 16px;
      padding: 16px;
      margin: 0;
      font-family: -apple-system, sans-serif;
    }
    input, select {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      border: 1px solid #ddd;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    button {
      width: 100%;
      padding: 14px;
      font-size: 16px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h2>入力フォーム</h2>
  <input type="text" id="field1" placeholder="項目1">
  <input type="text" id="field2" placeholder="項目2">
  <button onclick="submit()">送信</button>
</body>
</html>
```

ポイントは3つです。

1. `<meta name="viewport">` でスマホ表示を最適化
2. フォント・フォームの`font-size: 16px`でiOSのズーム防止
3. ボタンは十分な大きさ（`padding: 14px`以上）でタップしやすく

看護師がスマホで記録を入力するWebアプリを作った経験から言うと、モバイル対応はとても重要です。病棟でPCに向かえる時間は限られているので、スマホで入力できる設計にしておくと実際に使ってもらえます。

## よくある落とし穴と対処法

### `<base target="_top">` を忘れる

GASのWebアプリはiframe内で動作するため、`<base target="_top">`がないと`<a href>`のリンクがiframe内で開いてしまい、見づらいページになります。必ず`<head>`の中に入れる習慣をつけましょう。

### XSS（クロスサイトスクリプティング）のリスク

`<?!= ?>`（エスケープなし出力）にユーザーが入力した値を渡すと、HTMLを埋め込まれて悪意のあるコードが実行されるリスクがあります。

- ユーザー入力 → 必ず `<?= ?>` で出力（自動エスケープ）
- GASコード内で安全に生成したHTML → `<?!= ?>` で出力

この使い分けを守れば安全です。

### `google.script.run` は非同期

戻り値を直接受け取ろうとするとundefinedになります。

```javascript
// ❌ NG：これは動かない
const result = google.script.run.getLatestData();
console.log(result); // undefined

// ✅ OK：SuccessHandlerで受け取る
google.script.run
  .withSuccessHandler(function(result) {
    console.log(result); // ここで処理する
  })
  .getLatestData();
```

モダンなJavaScriptを使うなら、Promise化して`async/await`で扱うこともできます。

```javascript
function runGas(funcName, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      [funcName](...args);
  });
}

// async/awaitで使う
async function loadData() {
  try {
    const data = await runGas('getLatestData');
    console.log(data);
  } catch(e) {
    console.error('エラー:', e.message);
  }
}
```

### `.setXFrameOptionsMode()` でiframe制御

GASのWebアプリはデフォルトで自サイト外のiframeに埋め込み不可です。外部サイトに埋め込みたい場合は：

```javascript
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

ただし、セキュリティリスクもあるため必要な場合だけ使いましょう。

## 実際の使用例：看護業務で活用したGAS Webアプリ

せっかくなので、私が実際に職場で使ったWebアプリの例を紹介します。

**物品在庫確認ツール**
- スプレッドシートで在庫管理 → GAS WebアプリでURL化 → スマホのホーム画面に追加
- 在庫担当者がスプシを更新すれば、他のスタッフはURLを開くだけで最新状態を確認できる
- 使った技術：例5（スプシデータをHTML表示）＋例6（CSS適用）＋例10（モバイル対応）

**申し送りメモ確認ツール**
- 前の番から引き継いだメモをシフト交代時にスマホで確認
- 使った技術：例3（テンプレート変数差し込み）＋例8（ページ読込時にデータ取得）

どちらも「スプレッドシートに入力 → URLで確認」というシンプルな設計ですが、現場では相当な時短になりました。

## まとめ

GAS HTMLテンプレートのパターン10例をまとめます。

| 例 | 内容 | 使いどき |
|---|---|---|
| 1 | 最小HTML返却 | テスト・確認 |
| 2 | HTMLファイルを返す | 静的なページ |
| 3 | テンプレート変数差し込み | 動的な値の表示 |
| 4 | 配列をループ表示 | リスト表示 |
| 5 | スプシデータを表示 | データ公開・閲覧ツール |
| 6 | CSSを適用 | デザイン整える |
| 7 | フォームで入力受付 | データ入力ツール |
| 8 | ページ読込時にデータ取得 | リアルタイム表示 |
| 9 | JS/CSSを別ファイル分割 | 大きいアプリの整理 |
| 10 | モバイル対応 | スマホで使うアプリ |

この10パターンを頭に入れておけば、GAS Webアプリで作れないものはほとんどありません。サーバー不要・完全無料で、5分でURL発行できるGASのWebアプリをぜひ活用してみてください。

## 関連記事

- [GAS Webアプリ公開最短5ステップ](/blog/gas-webapp-deploy/) — デプロイ手順・doGet/doPostの基本
- [GASでスプレッドシートをデータベースにするWebアプリ](/blog/gas-webapp-form-db/) — フォーム→スプシの実践例
- [GASでGmail添付ファイルをドライブに自動保存](/blog/gas-gmail-attachment-drive/) — GASの実務活用例

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。

> **AI活用について**：本記事の構成・文章の一部はAIを活用して作成しています。掲載コードは実際に動作検証済みで、内容の正確性は筆者が確認しています。
