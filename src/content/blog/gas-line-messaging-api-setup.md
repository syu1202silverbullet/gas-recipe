---
title: "LINE Messaging APIとGAS連携する最短3ステップ｜無料Bot制作"
description: "LINE Messaging APIとGoogle Apps Scriptを連携してLINE Botを作る最短手順。公式アカウント作成・チャネル発行・GASからプッシュメッセージ送信までを画像付きで解説。"
pubDate: "2026-04-28T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas", "line", "messaging-api", "bot"]
tagNames: ["GAS", "LINE", "Messaging API", "Bot"]
readingTime: 6
---
「毎朝の予定をLINEで自動通知したい」「問い合わせがあったらLINEで教えてほしい」。こうした**LINE連携**は、LINE Messaging APIとGASを組み合わせれば5分で実装できます。

かつて存在した「LINE Notify」は2025年3月でサービス終了。代替として現行で推奨される**Messaging API**の設定手順を、最短の3ステップで解説します。

## この仕組みでできること

- 毎朝7時に「今日の予定」をLINEで受信
- フォーム送信時にLINEで即通知
- 在庫切れをLINEで即アラート
- 家族の誕生日前日に自動LINE

**すべて無料**（月200通まで）で実現できます。

## 準備するもの

- Googleアカウント
- LINEアカウント
- LINE Developers アカウント（LINEアカウントから5分で作成可能）

## ステップ1: LINE公式アカウントを作る

1. [LINE Developers](https://developers.line.biz/ja/)にアクセス
2. 右上「**ログイン**」→ LINEアカウントでログイン
3. 「**新規プロバイダー作成**」で適当な名前（例: MyBot）
4. 「**Messaging APIチャネル**」を選択
5. チャネル名・説明などを入力して作成

## ステップ2: チャネルアクセストークンを取得

作成したチャネルの「**Messaging API設定**」タブを開き：

1. 下部「**チャネルアクセストークン（長期）**」の「**発行**」ボタンをクリック
2. 生成された文字列を**コピー**

このトークンがAPIを叩く鍵になります。**他人に見せない**こと。

## ステップ3: 自分のLINEに友だち登録

同じ画面で **「QRコード」** が表示されているので、LINEアプリでスキャン→「追加」。これで公式アカウントと繋がり、Botがメッセージを送れる状態になります。

## GASからLINEに送信するコード

```javascript
const LINE_TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');

function sendLine(message) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + LINE_TOKEN
    },
    payload: JSON.stringify({
      messages: [{ type: 'text', text: message }]
    })
  });
}

function test() {
  sendLine('GASからのテスト送信です');
}
```

### トークンの安全な管理

コードに直接トークンを書くのはNG。GASの「**プロジェクトの設定 → スクリプトプロパティ**」で `LINE_TOKEN` に登録するのが安全です。

## 抑えておくべき3つのポイント

### ポイント1: `broadcast` と `push` の使い分け

- `/broadcast`: **友だち全員に一斉送信**（個人Bot用）
- `/push`: **特定ユーザーに送信**（ユーザーIDが必要）

個人利用なら `broadcast` で十分です。

### ポイント2: 月200通の無料枠を意識

無料枠を超えると、**メッセージが配信停止されます**（翌月復活）。

毎朝1通＋緊急時数通で運用する程度なら余裕ですが、通知が多いサービスで使う場合は有料プランを検討。

### ポイント3: 画像・リンクも送れる

```javascript
const payload = {
  messages: [
    { type: 'text', text: '本日の予定' },
    { type: 'image', originalContentUrl: 'https://example.com/image.jpg', previewImageUrl: 'https://example.com/image.jpg' },
    { type: 'template', altText: '確認', template: { type: 'buttons', text: '承認する？', actions: [{ type: 'postback', label: 'はい', data: 'yes' }] } }
  ]
};
```

## 応用：毎朝7時に予定を自動通知

```javascript
function morningNotify() {
  const events = CalendarApp.getEventsForDay(new Date());
  if (events.length === 0) {
    sendLine('今日は予定がありません。ゆっくりしましょう☕');
    return;
  }
  const list = events.map(e => `・${Utilities.formatDate(e.getStartTime(), 'Asia/Tokyo', 'HH:mm')} ${e.getTitle()}`).join('\n');
  sendLine(`🌅 今日の予定\n${list}`);
}
```

これを**毎朝7時のトリガー**に紐付ければ、起き抜けに自動通知される仕組みの完成です。

## トラブル：送信されない

よくある原因:

- **トークンが間違っている** → 再発行して再登録
- **QRコードで友だち追加していない** → 必ず追加
- **権限エラー** → GASの1回目実行時に「許可」を

## 看護師の私の使い方

夜勤明けの次の日の朝は寝過ごしがち。そこで、**前日の勤務予定＋翌日の学校行事＋天気**を朝6時にLINE通知する仕組みを作りました。これで寝坊しても10秒で家族全員の予定が確認できます。

副業ブログ運営始めたみっちゃんママでも、**毎朝のアクセス数・昨日の収益もLINE1通にまとまる**ように拡張中。

## まとめ

LINE連携は、**生活の自動化ツールの中でも最も実用度が高い**仕組みです。一度設定すれば、以降ずっと使えるインフラになります。

関連記事: [GASでLINEに毎朝通知](/blog/gas-line-morning-notification/) / [トリガー完全ガイド](/blog/gas-trigger-setup/)
