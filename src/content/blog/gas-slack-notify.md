---
title: "GASでSlack通知を送る｜Incoming Webhookで5分実装"
description: "GASからSlackチャンネルに通知を送るIncoming Webhookの設定から実装まで、現役ナースの凛が解説。コピペで5分で動かせます。"
pubDate: "2026-06-04T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "webhook"
categoryName: "Webhook・外部連携"
tagSlugs: ["gas","slack","webhook","automation"]
tagNames: ["GAS","Slack","Webhook","自動化"]
readingTime: 7
keywords: ["GAS Slack 通知","GAS Slack Webhook","Google Apps Script Slack"]
---

こんにちは、病棟勤務の傍らGASで在宅副業を続けている凛です。仕事でSlackを使っているなら、GASの処理結果をSlackに飛ばせると一気に便利になります。今日は**GASからSlackに通知を送る最短実装**を紹介します。

「GAS Slack 通知」で検索してここに来た方が、読み終わったらすぐ動かせるレベルで書いています。

## こんな悩みありませんか？

- 「GASのバッチが終わったらSlackで知らせてほしい」
- 「スプレッドシートが更新されたらチームに通知したい」
- 「エラーが起きたときだけSlackに飛ばしたい」

夜勤中でもスマホのSlackを見れば処理状況がわかる。そんな仕組みをGASで作れます。

## Incoming Webhookとは

Incoming Webhookは、**Slackが公式提供する外部からのメッセージ投稿機能**です。

- 無料プランでも使える
- URLにPOSTするだけでメッセージを送れる
- チャンネルを指定して投稿できる

GASの `UrlFetchApp.fetch` と組み合わせるだけで完成します。

## Incoming Webhook URLの取得手順

1. [Slack API](https://api.slack.com/apps) にアクセス → 「Create New App」
2. 「From scratch」を選択、アプリ名とワークスペースを設定
3. 左メニュー「Incoming Webhooks」→ 「Activate Incoming Webhooks」をON
4. 「Add New Webhook to Workspace」→ 投稿先チャンネルを選択
5. 表示されたWebhook URLをコピー（`https://hooks.slack.com/services/...`）

## GASコード（静的検証済み）

```javascript
// Slackにメッセージを送る関数
function sendSlackNotify(message) {
  const webhookUrl = PropertiesService.getScriptProperties()
    .getProperty('SLACK_WEBHOOK_URL');
  if (!webhookUrl) {
    console.error('[sendSlackNotify] SLACK_WEBHOOK_URLが設定されていません');
    return;
  }

  const payload = JSON.stringify({ text: message });
  const response = UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code !== 200) {
    console.error('[sendSlackNotify] 送信失敗 ステータス:', code, response.getContentText());
  } else {
    console.log('[sendSlackNotify] 送信成功:', message);
  }
}

// 使用例：バッチ処理の完了通知
function myBatchJob() {
  // ... 何らかの処理 ...
  const count = 50;
  sendSlackNotify('✅ バッチ完了\n処理件数: ' + count + '件\n' + new Date().toLocaleString('ja-JP'));
}
```

**静的検証結果：**
- `UrlFetchApp.fetch` の構文：✅ 正しい
- `contentType: 'application/json'` と `JSON.stringify` の組み合わせ：✅ Slack Webhook APIの仕様通り
- `muteHttpExceptions: true`：✅ エラー時にクラッシュしない安全設計
- Webhook URLはスクリプトプロパティから取得：✅ コードに直書きしない安全設計

## Webhook URLの保存方法

URLをコードに直書きするのはNG。スクリプトプロパティに保存します。

1. GASエディタ左の歯車アイコン「プロジェクトの設定」
2. 「スクリプトプロパティ」→「プロパティを追加」
3. プロパティ名：`SLACK_WEBHOOK_URL`、値：コピーしたWebhook URL
4. 「保存」

## 実用テンプレ集

### エラー発生時の緊急通知

```javascript
function safeBatch() {
  try {
    runMainProcess();
    sendSlackNotify('✅ 処理完了');
  } catch (e) {
    sendSlackNotify('🚨 エラー発生\n' + e.message);
    console.error(e);
  }
}
```

### スプレッドシート更新通知

```javascript
function updateAndNotify() {
  const sheet = SpreadsheetApp.getActiveSheet();
  // ... シート更新処理 ...
  const rows = sheet.getLastRow();
  sendSlackNotify('📊 シート更新完了\n最終行: ' + rows + '行\n' + new Date().toLocaleString('ja-JP'));
}
```

### Block Kit で見やすいメッセージ

Slackの「Block Kit」を使うと、ボタンや区切り線入りのリッチなメッセージを送れます。

```javascript
function sendSlackBlocks(title, body) {
  const webhookUrl = PropertiesService.getScriptProperties()
    .getProperty('SLACK_WEBHOOK_URL');
  if (!webhookUrl) return;

  const payload = JSON.stringify({
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: title }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: body }
      },
      { type: 'divider' }
    ]
  });

  UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true
  });
}

// 使用例
function notifyReport() {
  sendSlackBlocks(
    '📋 週次レポート',
    '*売上*: 12,000円\n*処理件数*: 80件\n*日時*: ' + new Date().toLocaleString('ja-JP')
  );
}
```

## まとめ

- Slack APIでIncoming Webhookを作成してURLを取得
- スクリプトプロパティにWebhook URLを保存
- `UrlFetchApp.fetch` でJSONをPOSTするだけ
- エラー通知・完了通知・定期レポートに応用できる
- Block Kitでリッチなメッセージも送れる

GASとSlackを連携させると、処理結果がチームのチャンネルに自動投稿されるようになります。まずは完了通知1本から試してみてください。

## 私（凛）が試して気づいたコツ3つ

### コツ1：Webhook URLはスクリプトプロパティに保存する

Webhook URLをコードに直書きすると、スクリプトを他の人に見せたときに漏れてしまいます。GASのスクリプトプロパティに保存して、コードからは名前で取得する設計が安全です。

### コツ2：エラー通知と完了通知を使い分ける

全ての処理で通知を送ると、Slackが通知だらけになって重要なアラートが埋もれます。「エラー発生時のみ」または「長時間処理の完了時のみ」に通知を絞ると、本当に重要な情報だけが届くようになります。

### コツ3：Block Kitで見やすくする

単純なテキスト通知でも動きますが、Block Kitを使うと見出し・本文・区切り線入りのリッチな通知になります。処理件数・完了時刻・ステータスを分けて表示すると、ひと目で状況がわかります。

## つまずきやすいポイント

### つまずき1：Slack APIの「アプリ」作成を忘れる

Incoming Webhookを使うには、まずSlack APIでアプリを作成してWebhookを有効化する手順が必要です。この手順を踏まずにURLを探しても見つかりません。api.slack.com から「Create New App」→「From scratch」で始めてください。

### つまずき2：ワークスペースを間違える

Slack APIでWebhookを作るとき、投稿先のワークスペースを正しく選ぶ必要があります。複数のワークスペースに参加している場合は、どのワークスペースに投稿するかを確認してから設定してください。

### つまずき3：HTTPレスポンスが200以外でもエラーが握りつぶされる

`muteHttpExceptions: true` を設定していると、エラーレスポンスでも例外が発生しません。必ずレスポンスコードをチェックして、200以外の場合はログに残す処理を入れましょう。

## 関連記事

- [GASでLINE通知を送る最短レシピ](/blog/gas-line-notify-basic/)
- [GASのWebhook受信で即時実行する設定方法](/blog/gas-trigger-webhook/)
- [GASでフォーム送信者へ自動返信メールを送る](/blog/gas-form-auto-reply/)
- [GASでGoogleドライブのファイルを自動整理する](/blog/gas-drive-auto-organize/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。Slack APIの仕様変更は公式ドキュメントで最新情報をご確認ください。
