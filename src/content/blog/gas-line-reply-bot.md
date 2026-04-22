---
title: "GASで作るLINE返信Bot最小コード30行"
description: "Google Apps ScriptとLINE Messaging APIで作る返信Botの最小サンプル。Webhookの受け取りから返信まで30行で、看護師ママが副業で培ったコツを添えてやさしく解説します。"
pubDate: "2026-05-16T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas","line","bot"]
tagNames: ["GAS","LINE","Bot"]
readingTime: 7
keywords: ["GAS","LINE Bot","Messaging API","Webhook","自動返信"]
---

## こんな悩みありませんか？

「LINE Botって難しそう」「サーバー借りないとできないんでしょ？」——そう思って手が出ていない方、多いんじゃないでしょうか。

みっちゃんママも最初は同じでした。でも、**GAS（Google Apps Script）+ LINE Messaging API**の組み合わせなら、サーバー契約なし・お金もかからずに、30行ほどで返信Botが作れてしまいます。

この記事では、最小構成の返信Botを動かすまでの流れを、看護師ママの言葉でやさしく解説します。三姉妹の「ごはん何？」にBotが答える構成を例に、読了時間7分でまとめました。

## 全体像：LINE公式アカウント × GAS × Webhook

仕組みの全体像は次の通りです。

1. **LINE Developersコンソール**でMessaging APIチャネルを作る
2. **GASでWebhook用のエンドポイント**（doPost関数）を用意する
3. **GASをウェブアプリとして公開**し、そのURLをLINE側のWebhookに登録
4. ユーザーがBotにメッセージ送信 → LINE → GAS doPost → 返信API → ユーザー、という往復

つまり**LINEからのメッセージをGASで受けて、返信を送り返す**往復処理を作るだけ。専門的に言うとPOSTリクエストを受けて、POSTで返すだけのお仕事です。

## ポイント3つ

### ポイント1：doPost関数でWebhookを受ける

GASの`doPost(e)`関数が、LINEからのイベントを受け取る入口です。ウェブアプリとしてデプロイすると、外部からHTTP POSTで呼び出せるようになります。

```javascript
const TOKEN = 'あなたのチャネルアクセストークン';
const REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const event = data.events[0];
  if (!event || event.type !== 'message') return;

  const replyToken = event.replyToken;
  const userText = event.message.text;
  const reply = buildReply(userText);

  sendReply(replyToken, reply);
}
```

`replyToken`はLINEが発行する一度きりの鍵で、受け取ってから短時間以内に返信しないと無効になります。レスポンスは早めに返すのがコツ。

### ポイント2：返信ロジックを関数で切り出す

メッセージの内容に応じた返答は、別関数に分けておくと後々のメンテが楽です。

```javascript
function buildReply(text) {
  if (text.includes('ごはん')) return '今日は肉じゃがだよ〜';
  if (text.includes('天気')) return 'カレンダーで確認してね';
  return 'ママはいま仕事中。夜にお返事するね';
}
```

キーワードを増やしていくだけで、手軽に賢くなります。家族向けBotなら「しりとり」「本日の献立」「ゴミの日」など、生活に直結するテーマが重宝しますよ。

### ポイント3：UrlFetchAppで返信を送る

返信はLINEの返信APIにPOSTします。`UrlFetchApp`を使うのが定番。

```javascript
function sendReply(replyToken, text) {
  UrlFetchApp.fetch(REPLY_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + TOKEN },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: text }]
    })
  });
}
```

`TOKEN`はLINE Developers管理画面の「チャネルアクセストークン（長期）」を発行してコピペします。**トークンは他人に見せない**のが鉄則。Gitで共有するソースに書くのは避けて、GASの「プロパティサービス」に保存するのが安全です。

```javascript
const TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
```

### デプロイ手順のミニメモ

- GASエディタ右上の「デプロイ」→「新しいデプロイ」→種類「ウェブアプリ」
- アクセス権限は「全員」を選ぶ（匿名ユーザーからのPOSTを受けるため）
- 発行されたURLをLINE DevelopersのWebhook URL欄に貼り付け、Webhook送信を有効化

## 応用：スプレッドシート連携で「記録するBot」へ

単なる返信Botから一歩進めて、**メッセージ内容をスプレッドシートに記録**すれば、家族のちょっとしたやり取りや買い物メモを自動ログできます。

```javascript
function logToSheet(userId, text) {
  const sheet = SpreadsheetApp.openById('シートID').getSheetByName('LINE');
  sheet.appendRow([new Date(), userId, text]);
}
```

みっちゃんママは、家族が「牛乳ない」「おむつ買って」と送ったら自動で買い物リストシートに追記するBotを運用中。会話しているうちに、**いつの間にか買い物リストが完成**しているのが地味に助かっています。

Botに「献立を返す」「買い物を追加する」など役割を切り替えるだけで、活用範囲がぐっと広がりますよ。

## まとめ

GAS×LINE Messaging APIで作る返信Botは、**doPostで受けて、ロジックで判断して、UrlFetchAppで返す**。この基本フロー30行さえ理解すれば、あとは応用次第で暮らしに直結するツールに化けます。

サーバー契約ゼロ円、GASで完結、しかも30行。副業としてクライアントに提案する最初の一歩にもぴったりです。

まずはLINE Developersの登録から。トークンの管理だけは慎重に、楽しくBot育てていきましょうね。

## 関連記事

- [毎朝ToDoをLINEに届けるGASリマインダー](/blog/gas-line-reminder-daily/)
- [スプシの予定リストをカレンダー一括同期GAS](/blog/gas-calendar-spreadsheet-sync/)
- [Gmail未読を条件検索してラベル付与するGAS](/blog/gas-gmail-search-label/)

---

### この記事を書いた人：みっちゃんママ

三姉妹の母で現役ナース、夜勤の合間に副業でGASプログラマーをしています。「看護記録と家事の自動化でわかったコツ」を、同じように忙しい人へシェアするのが日課。専門用語は最小限、コピペで動くレシピ中心でお届けしています。

