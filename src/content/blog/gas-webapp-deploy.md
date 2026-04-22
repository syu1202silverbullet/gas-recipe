---
title: "GAS Webアプリ公開最短5ステップ｜doGet/doPost・URL発行・更新時の罠まで"
description: "Google Apps ScriptをWebアプリとして公開する最短手順を、看護師×副業Webエンジニアの凛が画像付きで5ステップ解説。doGet/doPostの基本、再デプロイ時にURLが変わる罠、認証設定の使い分けまでカバーします。"
pubDate: "2026-05-03T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","webapp","deploy","doGet","doPost"]
tagNames: ["GAS","Webアプリ","デプロイ","doGet","doPost"]
readingTime: 9
keywords: ["GAS Webアプリ","GAS doGet","GAS doPost","GAS Webアプリ デプロイ"]
---

こんにちは、凛です。都内で看護師をしながら、副業でWebエンジニアをしています。GASで作ったスクリプトを「自分以外の人にもURLで使ってもらいたい」と思ったら、Webアプリとして公開する一手があります。今日はGASのWebアプリ公開を**最短5ステップ**で解説します。

「GAS Webアプリ」で検索してここに来た方が、読み終わった直後にURL発行まで到達できるレベルで書いています。

## こんな悩みありませんか？

- 「GASのスクリプトを家族や同僚にも使ってほしいけど、コードを見せたくない」
- 「Webアプリにしたいけど、`doGet` `doPost` の役割がわからない」
- 「デプロイしたらURLが変わって、以前のリンクが死んだ」
- 「アクセス権限の設定（自分のみ・全員）の違いがわからない」

私も最初は「Webアプリ」というだけで身構えてました。でも実は5ステップで誰でも公開できます。

## GAS Webアプリの全体像

```
ユーザー → URL → GAS の doGet/doPost → HTML or JSON 返却
```

GASをWebアプリ化すると、**Webサーバー不要・完全無料**で動的なURLを発行できます。

| 用途 | doGet で返すもの |
|---|---|
| 単純な情報表示 | HTMLサービスでHTML |
| 簡易API | `ContentService` でJSON |
| データ送信受付 | `doPost` で受信 |
| 動的ダッシュボード | HTML+JS+APIサービス |

## 最短5ステップ

### Step 1: doGet 関数を書く

```javascript
function doGet(e) {
  return ContentService
    .createTextOutput('Hello, World!')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

`doGet(e)` という関数名は予約済み。GASがWebアプリのGETリクエスト時に自動的に呼びます。

### Step 2: HTMLを返したい場合

```javascript
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('My GAS App');
}
```

`HtmlService.createHtmlOutputFromFile('index')` は、GASエディタで作った `index.html` を読み込みます（メニュー → ファイル → HTML）。

### Step 3: doPost でデータ受信

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  // dataを処理...
  return ContentService
    .createTextOutput(JSON.stringify({success: true}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

外部からPOSTリクエストでデータを送信できます。フォーム送信の受け口や、Slack/LINE Webhookの受信に使います。

### Step 4: デプロイ実行

GASエディタ右上の「**デプロイ**」→「**新しいデプロイ**」をクリック。

設定：
- **種類**: ウェブアプリ
- **説明**: v1.0 等の任意
- **次のユーザーとして実行**: 「自分」（推奨）
- **アクセスできるユーザー**: 「全員」または「Googleアカウントを持つ全員」

「デプロイ」をクリックすると、Webアプリの**URL**が発行されます。

### Step 5: 動作確認

発行されたURL（`https://script.google.com/macros/s/XXXX/exec`）を**シークレットウィンドウ**で開いて動作確認。自分のブラウザだとキャッシュされたままで挙動が見づらいことが多いです。

## アクセス権限の使い分け

| 設定 | 用途 |
|---|---|
| **自分のみ** | 個人用ツール、テスト中 |
| **Googleアカウントを持つ全員** | 社内ツール、特定グループ |
| **全員（匿名アクセス可）** | 完全公開Webアプリ、Webhook受け口 |

「次のユーザーとして実行」は通常「自分」のままでOK。GASからGoogleサービス（スプシ・Gmail等）にアクセスする際、自分の権限で動きます。

## ⚠️ 再デプロイ時の最重要罠：URLが変わる

**「新しいデプロイ」を毎回作ると、URLが毎回変わります**。これで以前のリンクが全部切れて泣いた経験、私もあります。

**対策**：2回目以降は「**デプロイの管理**」から「**新しいバージョン**」を作る。これだとURL不変で内容だけ更新されます。

```
新しいデプロイ ❌ → URLが新規発行される（旧URLは古い内容のまま）
新しいバージョン ✅ → 同じURLで内容だけ更新
```

## doGet で URL パラメータを受ける

```javascript
function doGet(e) {
  const name = e.parameter.name || 'ゲスト';
  const html = `<h1>こんにちは、${name}さん</h1>`;
  return HtmlService.createHtmlOutput(html);
}
```

URLに `?name=凛` を付けてアクセスすると、「こんにちは、凛さん」と表示されます。簡易な動的ページが作れます。

## doPost で外部からの通知を受ける

```javascript
function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.openById('XXX').getActiveSheet();
  sheet.appendRow([new Date(), params.name, params.message]);
  return ContentService.createTextOutput('OK');
}
```

LINE Bot・Slack・Webhook受け口として最強の使い方。

## よくあるエラーと解決法

### `Script function not found: doGet`

doGet関数が定義されていないか、別のファイルにある。同じプロジェクトの.gsファイルに `function doGet(e) { ... }` を書く。

### URLにアクセスして「許可が必要」と出る

「アクセスできるユーザー」が「自分のみ」になってる可能性。デプロイ管理から設定変更。

### スプシ書込でエラー

「次のユーザーとして実行」が「アクセスしているユーザー」だと、相手の権限不足でこける。基本「自分」のままがおすすめ。

## まとめ

- doGet/doPostを書く → デプロイ → URL発行の3段階
- HTMLを返すなら `HtmlService`、JSONなら `ContentService`
- 再デプロイは「新しいバージョン」（URL固定）が鉄則
- アクセス権限は用途に応じて3パターンから選ぶ

GAS Webアプリは**サーバー不要・完全無料・15分で立ち上がる**最強のミニWebサーバーです。ちょっとしたツール公開、簡易API、Webhook受け口として大活躍します。

## 関連記事

- [GASトリガー設定完全ガイド](/blog/gas-trigger-setup/)
- [Webhook受信でGAS即時実行する設定方法](/blog/gas-trigger-webhook/)
- [GASでWebアプリにログイン機能を付ける方法](/blog/gas-webapp-login/)
- [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
