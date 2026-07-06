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

こんにちは、凛です。GASとSlackをつなぐ話をする前に、つなぐ前後で日常がどう変わるかを並べてみます。

**Before：** GASのバッチが動いたかどうかは、GASエディタを開いて実行ログを見に行かないとわからない。スプシが更新されたことは、誰かがシートを開くまで誰も知らない。エラーが起きていても、気づくのは翌日、下手をすると数日後。

**After：** 処理が終わった瞬間、チームのSlackチャンネルに「✅ バッチ完了」が自動で流れる。エラーが起きたら「🚨 エラー発生」がすぐ届く。夜勤中でも、スマホのSlackをちらっと見れば処理状況がわかる。

この差を生むのに必要なのは、Slack公式の**Incoming Webhook**という機能と、GASの `UrlFetchApp.fetch` だけです。無料プランで使えて、URLにJSONをPOSTするだけでチャンネルにメッセージが投稿される。仕組みとしてはこれ以上ないくらい単純で、実装は本当に5分クラスです。今日はその手順を最初から最後まで通します。

## 手順1：Incoming Webhook URLを取得する

まずSlack側の準備から。「アプリを作る」と聞くと大ごとに感じるかもしれませんが、画面を5回進むだけです。

1. [Slack API](https://api.slack.com/apps) にアクセス → 「Create New App」
2. 「From scratch」を選択、アプリ名とワークスペースを設定
3. 左メニュー「Incoming Webhooks」→ 「Activate Incoming Webhooks」をON
4. 「Add New Webhook to Workspace」→ 投稿先チャンネルを選択
5. 表示されたWebhook URLをコピー（`https://hooks.slack.com/services/...`）

ここで手に入る長いURLが、Slackチャンネルへの「投函口」です。複数のワークスペースに参加している方は、手順2でどのワークスペースを選んだか確認しておいてください。あとで「テスト投稿がどこにも出ない」と探し回る原因の定番が、ワークスペースの選び間違いです。

## 手順2：Webhook URLをスクリプトプロパティに保存する

コピーしたURLは、コードに直書きせずGASのスクリプトプロパティに入れます。このURLを知っている人は誰でもあなたのチャンネルに投稿できてしまうので、扱いはパスワード並みに慎重に。スクリプトを人に見せた拍子に漏れた、を防ぐための一手間です。

1. GASエディタ左の歯車アイコン「プロジェクトの設定」
2. 「スクリプトプロパティ」→「プロパティを追加」
3. プロパティ名：`SLACK_WEBHOOK_URL`、値：コピーしたWebhook URL
4. 「保存」

## 手順3：GASコードを貼る

準備が済んだら本体です。

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

`sendSlackNotify('テスト')` を実行して、選んだチャンネルにメッセージが出れば完成です。

コードは構文とSlack Webhookの仕様（JSONボディの形式・Content-Type）を突き合わせて確認したものを載せていますが、実行環境での最終確認はご自身でお願いします。

### コードの補足を少しだけ

`muteHttpExceptions: true` は、送信失敗時にスクリプト全体がクラッシュしないようにするための設定です。ただし副作用として、失敗が例外にならない＝**黙って失敗する**ようになります。だからレスポンスコードを確認して、200以外ならログに残す処理を必ずセットにしています。ここを省くと「実は届いていなかった」に気づけません。地味な数行ですけど、この数行が運用の信頼性を支えています。

## 手順が済んだら：Afterの世界を作り込む

`sendSlackNotify` という部品ができたので、あとはどこから呼ぶかの話です。冒頭のAfterを実現するパターンを並べます。

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

メイン処理を try-catch で包んで、成功でも失敗でも一報が飛ぶ形。エラー本文つきで届くので、Slackを見た時点で原因の当たりがつけられます。

### スプレッドシート更新通知

```javascript
function updateAndNotify() {
  const sheet = SpreadsheetApp.getActiveSheet();
  // ... シート更新処理 ...
  const rows = sheet.getLastRow();
  sendSlackNotify('📊 シート更新完了\n最終行: ' + rows + '行\n' + new Date().toLocaleString('ja-JP'));
}
```

「シート見といて」と口頭で伝える文化が、「チャンネルに流れてくるから見ればわかる」に変わります。

ここでひとつ、通知を仕込みはじめた人が必ず通る落とし穴を。楽しくなって全部の処理に通知を付けると、チャンネルが通知だらけになって、本当に重要なアラートが埋もれます。私のおすすめは「エラー発生時のみ」または「長時間処理の完了時のみ」への絞り込みです。通知は少ないほど、一通の重みが出ます。

## 応用：Block Kitで見やすくする

単純なテキストで十分実用になりますが、Slackの「Block Kit」を使うと、見出し・本文・区切り線で構成されたリッチなメッセージを送れます。週次レポートのような「読ませる通知」に向いています。

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

処理件数・完了時刻・ステータスが構造化されて表示されるので、流し見でも状況が頭に入ります。まずはテキスト通知で運用を始めて、定着してからBlock Kitに格上げする、という順番でいいと思います。

## うまくいかないときのチェックポイント

### Webhook URLがそもそも作れていない

Incoming Webhookは、Slack APIでアプリを作成してWebhookを有効化する手順を踏まないと発行されません。ワークスペースの設定画面をいくら探してもURLは見つからないので、必ず api.slack.com の「Create New App」→「From scratch」から始めてください。

### 投稿先ワークスペースの選び間違い

先ほども触れましたが、複数ワークスペースに参加している場合の定番ミスです。Webhook作成時に選んだワークスペース・チャンネルにしか投稿されません。「届かない」ときは、まず別のワークスペースに届いていないか疑ってみてください。

### 失敗が握りつぶされている

`muteHttpExceptions: true` の仕様上、エラーレスポンスが返っても例外は発生しません。掲載コードのようにレスポンスコードをチェックしてログに残していれば、GASの実行ログから失敗の痕跡を追えます。もし自分で書き換える場合も、このチェックだけは残すことを強くおすすめします。

## おわりに

GASとSlackの連携は、費用ゼロ・実装5分のわりに、チームの情報の流れ方が目に見えて変わります。「確認しに行く」から「向こうから知らせてくる」への転換ですね。まずは完了通知1本から。動いているのを1週間眺めてみると、次に通知させたいものが自然と見えてくるはずです。

## 関連記事

- [GASでLINE通知を送る最短レシピ](/blog/gas-line-notify-basic/)
- [GASのWebhook受信で即時実行する設定方法](/blog/gas-trigger-webhook/)
- [GASでフォーム送信者へ自動返信メールを送る](/blog/gas-form-auto-reply/)
- [GASでGoogleドライブのファイルを自動整理する](/blog/gas-drive-auto-organize/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。掲載コードは構文・API仕様・ロジックの机上確認を行ったものです。動作はお使いの環境でご確認のうえ、Slack APIの仕様変更は公式ドキュメントで最新情報をご確認ください。
