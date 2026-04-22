---
title: "Webhook受信でGAS即時実行する設定方法"
description: "時間トリガーじゃ遅すぎる…そんなときに使えるのがWebhook経由の即時実行。doPostの基本から安全な受け取り方まで、看護師目線でまとめました。"
pubDate: "TBD"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas", "webhook", "doPost"]
tagNames: ["GAS", "Webhook", "doPost"]
mainKeyword: "GAS Webhook"
readingTime: 6
author: "凛"
---

# Webhook受信でGAS即時実行する設定方法

## こんな悩みありませんか？

- 5分に1回の時間トリガーだと、反応がワンテンポ遅くて困る
- 他サービス（Slack、Stripe、LINE、Googleフォームなど）の更新を拾って、すぐに処理したい
- 「Webhook」「doPost」って単語は知ってるけど、具体的に何をどう書けばいいのかピンとこない

時間トリガーは便利だけど、待ってる間に処理が遅れるのがつらい。私も最初、Googleフォームの申し込みが入ったらすぐLINEに飛ばしたいのに、5分ごとポーリングで回していた時期がありました。それ、Webhookにしたら一瞬で解決します。

この記事では、GASをWebhook受信口として使う方法を、設定→実装→運用の順にまとめます。

## Webhook受信の全体像

Webhookとは、「何かイベントが起きたときに、指定のURLにHTTPリクエストを投げてもらう」仕組みのこと。GASはウェブアプリとしてデプロイすると、公開URLをもらえて、そこに外部からPOSTされたデータを `doPost(e)` 関数で受け取れます。

処理の流れをざっくり書くと：

1. GASに `doPost(e)` を書く
2. 「ウェブアプリとしてデプロイ」して公開URLを取得
3. 外部サービスのWebhook設定欄にそのURLを貼る
4. イベント発生 → GASが即起動 → 処理してスプレッドシートに記録 など

ポイントは「公開URLになる」という部分。誰でも叩けてしまうので、合言葉（シークレット）で身元確認するクセをつけておくと安心です。

## ポイント3つ：Webhook受信GASの書き方

### ポイント1：doPostの基本形

まずは最小構成。外部から送られてきたJSONを受け取って、スプレッドシートに1行追記するだけの形です。

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('log');
  sheet.appendRow([new Date(), data.event, data.user]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

`e.postData.contents` にリクエストボディの文字列が入ってきます。相手がJSONで送ってくる前提ならそのままパース、`application/x-www-form-urlencoded` なら `e.parameter` から読む、という使い分けです。

### ポイント2：ウェブアプリとしてデプロイする手順

コードを書いただけでは外からアクセスできません。必ずデプロイが必要です。

1. エディタ右上の「デプロイ」→「新しいデプロイ」
2. 種類で「ウェブアプリ」を選ぶ
3. 次のユーザーとして実行：**自分**
4. アクセスできるユーザー：**全員**（Webhook送信元が匿名の場合）
5. デプロイ → 出てきたURLをコピー

「全員」を選ぶのがちょっと怖く感じますが、これがWebhook用途の標準設定です。代わりに後述のシークレットで守ります。

また、コードを更新したら「新しいデプロイ」ではなく「デプロイを管理」→ 対象を編集 → バージョン「新しいバージョン」で上書きすると、URLを変えずに更新できます。URLが変わると外部サービス側の設定も全部書き換えになるので、ここは要注意ポイントです。

### ポイント3：シークレットで送信元を確認する

URLさえ知っていれば誰でも叩けてしまうので、合言葉を付けて「正しい送信元だけ処理する」ようにします。

```javascript
const SECRET = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.secret !== SECRET) {
    return ContentService.createTextOutput('unauthorized');
  }
  // 認証OKのときだけ処理する
  handleEvent(data);
  return ContentService.createTextOutput('ok');
}
```

シークレットはコードに直書きせず、**スクリプトプロパティ**に保存しておくのが鉄則。GitHubに公開したコード、スクショ撮ってブログに載せたコードから漏れる事故を防げます。

## 応用：実務で使える3つのレシピ

- **Googleフォーム → LINE通知**：フォーム送信をトリガーに `doPost` 相当の処理を走らせ、LINE Notifyへ転送。申し込みが入った瞬間に気づける
- **外部ダッシュボード → スプレッドシート**：SaaSが吐くWebhookで、ユーザー行動を自動ロギング。BIツールで使える素材に整えておける
- **IFTTTやZapierの代わり**：GAS1本で受ければ無料枠内に収まるケース多数

副業タスク管理なら、「Notionの特定DBが更新されたらGASに飛ばして、朝のLINE通知メッセージに自動追加」みたいな使い方もできます。時間トリガーとWebhookを組み合わせると、「拾うのは即時、配るのは朝イチ」というキレイな分業ができて、通知が多すぎてスマホが鳴りやまない…みたいな事故も防げます。

ひとつだけ注意点。WebhookのPOSTは失敗しても再送してくれないサービスが多いので、重要データを受け取る場合は「受信ログをまず書く → それから処理」の順にして、後から手動でリカバリできるようにしておくのが安全です。

## まとめ

- Webhook受信の正体は「公開URL + doPost」の組み合わせ
- デプロイ時は「全員アクセス可」を選び、代わりにシークレットで守る
- コード更新は「新しいバージョン」で上書きしてURLを固定する

時間トリガーの「待ち時間ストレス」から解放されるだけで、自動化の世界観はかなり変わります。申し込みがあった瞬間に気づけるって、想像以上に快適ですよ。

## 関連記事

- [GAS6分制限を回避する3パターン完全解説](./gas-trigger-6min-limit)
- [副業タスクをGASで毎朝LINEに届ける仕組み](./gas-side-business-tasklist)
- [確定申告レシートをOCR記帳するGAS実装](./gas-kakutei-receipt-ocr)

---

### この記事を書いた人：凛

都内で看護師をしながら、副業でWebエンジニア、夜勤の合間に副業でGASプログラミングをしています。「自分が楽になるための自動化」をモットーに、看護師目線でGASレシピを発信中。難しいコードより、明日の自分が助かる仕組みが好きです。
