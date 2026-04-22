---
title: "LINE Messaging APIとGAS連携する最短3ステップ"
description: "GASとLINE Messaging APIを連携して通知Botを作る手順を3ステップで解説。看護師が家族のスケジュール共有に使っている実例付きです。"
pubDate: "2026-04-28T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas", "line", "messaging-api", "bot"]
tagNames: ["GAS", "LINE", "Messaging API", "Bot"]
readingTime: 9
---
こんにちは、看護師のみっちゃんです。今日は私が副業でも家庭でも愛用している「GAS×LINE Messaging API」について、最短でBotを動かすまでの手順を紹介します。

## こんな悩みありませんか？

- スプシの更新を自分や家族にLINEで知らせたい
- メール通知だと見落として夫に怒られる
- Webhookとか難しそうで一歩踏み出せない
- 夜勤シフトが変わったら家族に自動でLINEしたい

私も最初はWebhookの設定で挫折しかけました。でも実は「送信するだけ」なら驚くほど簡単です。今回はまず「GASからLINEにメッセージを送る」ところまでを最短で構築します。

## 全体像

やることは大きく3つだけ。

1. LINE Developersでチャネル作成→アクセストークン取得
2. 自分のユーザーIDを取得（またはグループIDを準備）
3. GASで`UrlFetchApp`を使ってPush APIを叩く

Webhook（受信）は後から追加で構築可能なので、まずは送信だけ動かして成功体験を積みましょう。

## ステップ1: チャネル作成とトークン取得

LINE Developersコンソール（developers.line.biz）にログインし、以下を進めます。

1. プロバイダーを新規作成（会社名や個人名でOK）
2. 「Messaging API」のチャネルを作成
3. チャネル詳細画面の「Messaging API設定」タブを開く
4. 下部の「チャネルアクセストークン（長期）」を発行してコピー
5. 同じ画面に表示されるQRコードから、自分のLINEでBotを友だち追加

トークンは外部に漏らさないように注意。私はセキュリティのため、GASのスクリプトプロパティに保存しています。

```javascript
function saveToken() {
  PropertiesService.getScriptProperties().setProperty(
    'LINE_TOKEN',
    'ここに長期トークンを貼る'
  );
}
```

一度実行したら、この関数は削除しておきましょう。

## ステップ2: ユーザーIDを取得

Push APIで個別にメッセージを送るには、送信先のユーザーIDが必要です。一番簡単なのは、Webhookを使ってBotに話しかけた相手のIDをログに出す方法です。

```javascript
function doPost(e) {
  const events = JSON.parse(e.postData.contents).events;
  for (const event of events) {
    console.log('userId:', event.source.userId);
  }
  return ContentService.createTextOutput('ok');
}
```

これをウェブアプリとしてデプロイ（アクセス:全員、実行:自分）し、URLをLINE DevelopersのWebhook URLに設定。自分でBotに「hello」と送ればログにIDが表示されます。

## ステップ3: Push APIでメッセージ送信

いよいよメインです。シンプルな送信関数がこちら。

```javascript
function sendLine(message) {
  const token = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  const userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');

  const payload = {
    to: userId,
    messages: [{
      type: 'text',
      text: message
    }]
  };

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function test() {
  sendLine('GASからこんにちは！');
}
```

`test`を実行してLINEに通知が来たら成功です。私は初めて成功した時、夜勤前のロッカーで小さくガッツポーズしました。

## 押さえておきたい3つのポイント

### ポイント1: トークンはスクリプトプロパティに保存

GitHubに公開する可能性がある副業案件では、トークンをコードにベタ書きしないのは鉄則です。

### ポイント2: muteHttpExceptionsでデバッグしやすく

`muteHttpExceptions: true`にしておくと、エラー時もレスポンスが取得できるので原因調査が楽です。

```javascript
const res = UrlFetchApp.fetch(url, options);
console.log(res.getResponseCode(), res.getContentText());
```

### ポイント3: Push APIは無料枠に注意

LINE公式アカウントのフリープランでは、月の送信数に上限があります。大量通知するなら、自分だけに送る個人利用か、有料プランの検討が必要です。

## 応用:シフト通知の自動化

私が実際に使っているのが、Googleカレンダーに入れた夜勤シフトを前日21時に家族LINEグループへ送る仕組みです。

```javascript
function notifyShift() {
  const cal = CalendarApp.getDefaultCalendar();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const events = cal.getEventsForDay(tomorrow);

  const shifts = events
    .filter(e => e.getTitle().includes('夜勤'))
    .map(e => `${e.getTitle()} ${Utilities.formatDate(e.getStartTime(),'JST','HH:mm')}〜`);

  if (shifts.length > 0) {
    sendLine('【明日のシフト】\n' + shifts.join('\n'));
  }
}
```

これを時間トリガーで毎日21時に実行。夫が「明日迎えいる？」と聞いてくる回数が激減しました。

## まとめ

- LINE Developersでチャネル作成→長期トークン取得
- ユーザーIDはWebhookログで取得
- `UrlFetchApp`でPush APIを叩くだけ
- トークンはスクリプトプロパティで安全管理
- 応用でシフト通知や家族との情報共有が自動化できる

看護師の私にとって、家族との時間を守るための第一歩がこの自動通知でした。まずは送信だけでも十分実用的なので、ぜひ試してみてください。

## 関連記事

- [GAS setValuesで1000行を一括書き込む高速化テクニック](/blog/gas-sheet-setvalues-bulk/)
- [スプシ重複行を自動削除するGAS完全版コード](/blog/gas-sheet-dedupe/)
- [フリーランス請求書をGASで毎月自動発行する仕組み](/blog/gas-freelance-invoice/)
