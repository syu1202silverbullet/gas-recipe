---
title: "GASからLINEに通知を送る最短レシピ｜Messaging APIでコピペ実装"
description: "GASからLINE Messaging APIで自分のスマホに通知を送る最短実装を、現役ナースの凛が解説。チャネル作成からGASコードまでコピペで動かせます。"
pubDate: "2026-06-01T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "line"
categoryName: "LINE自動化"
tagSlugs: ["gas","line","messaging-api","automation"]
tagNames: ["GAS","LINE","通知","自動化"]
readingTime: 8
keywords: ["GAS LINE 通知","GAS LINE Messaging API","Google Apps Script LINE"]
---

こんにちは、ナースとして働きながら趣味と実益を兼ねてGASを書いている凛です。GASで作った自動化スクリプト、動いたかどうかをスマホでサクッと確認したいですよね。今日は**GASからLINEに通知を送る最短レシピ**を紹介します。

「GAS LINE 通知」で検索してここに来た方が、読み終わったらすぐ動かせるレベルで書いています。

## こんな悩みありませんか？

- 「GASのバッチ処理、夜中に動いてるか確認したい」
- 「スプレッドシートの集計が終わったらスマホに知らせてほしい」
- 「毎朝のリマインダーをLINEで受け取りたい」

夜勤明けにPC開かなくても「動いた」「終わった」がLINEで届けば、ぐっすり眠れます。

## 通知の送り方は「LINE Messaging API」が現役

GASからLINEに通知を送る方法として、以前は「LINE Notify」という無料サービスがよく使われていました。**ただしLINE Notifyは2025年3月末でサービスを終了しています。** これから新しく作るなら、LINE公式の**LINE Messaging API**を使います。

Messaging APIは、

- LINE Developersでチャネル（Bot）を1つ作るだけで使える
- 無料プランで**月200通まで**メッセージ送信可能（自分への通知なら十分）
- GASから `UrlFetchApp.fetch` で1回叩くだけで届く

という、Notifyの代わりにそのまま使える仕組みです。本記事ではこのMessaging APIで「自分のLINEに通知を送る」最短ルートを作ります。

## 事前準備：チャネル作成とトークン取得

Messaging APIを使うには、LINE Developersで「チャネル（Bot）」を作り、

1. **チャネルアクセストークン（長期）**
2. **自分のユーザーID**

の2つを取得します。手順は別記事で丁寧に解説しているので、まだの方はこちらを先に進めてください。

→ [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)

ここまで終わっていれば、あとはGASにコードを貼るだけです。

## GASコード（静的検証済み）

```javascript
// LINE Messaging APIで自分にメッセージを送る関数
function sendLine(message) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  const userId = props.getProperty('LINE_USER_ID');

  if (!token || !userId) {
    console.error('[sendLine] トークンまたはユーザーIDが未設定です');
    return;
  }

  const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    payload: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: message }]
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code !== 200) {
    console.error('[sendLine] 送信失敗 ステータス:', code, response.getContentText());
  } else {
    console.log('[sendLine] 送信成功:', message);
  }
}

// 使用例：バッチ処理の完了通知
function myBatchJob() {
  // ... 何らかの処理 ...
  const count = 100; // 処理件数（例）
  sendLine('✅ バッチ完了\n処理件数: ' + count + '件\n' + new Date().toLocaleString('ja-JP'));
}
```

**静的検証結果：**
- `UrlFetchApp.fetch` の構文：✅ 正しい
- エンドポイント `https://api.line.me/v2/bot/message/push`：✅ Messaging APIのPush API仕様通り
- `Content-Type: application/json` ＋ `JSON.stringify`：✅ Push APIはJSONボディが必須
- `messages` は配列で最大5件まで：✅ 仕様通り（今回は1件）
- `muteHttpExceptions: true`：✅ エラー時にクラッシュしない安全設計
- トークン・ユーザーIDはスクリプトプロパティから取得：✅ コードに直書きしない安全設計

## トークンの保存方法

チャネルアクセストークンやユーザーIDをコードに直書きするのは絶対NG。スクリプトプロパティに保存します。

1. GASエディタ左の歯車アイコン「プロジェクトの設定」
2. 「スクリプトプロパティ」→「プロパティを追加」
3. 下記2つを登録して「保存」

| プロパティ名 | 値 |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developersで発行した長期トークン |
| `LINE_USER_ID` | 自分のユーザーID（Uから始まる文字列） |

## 実用テンプレ集

### 毎朝のおはようメッセージ

```javascript
function morningMessage() {
  const now = new Date();
  const dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'M月d日(E)');
  sendLine('☀️ おはようございます\n' + dateStr + 'のGASが起動しました');
}
```

時間主導トリガーで毎朝7時に設定すれば、GASが動いているかの確認にもなります。

### エラー発生時の緊急通知

```javascript
function safeBatch() {
  try {
    // メイン処理
    runMainProcess();
  } catch (e) {
    sendLine('🚨 エラー発生\n' + e.message);
    console.error(e);
  }
}
```

夜勤中にエラーが起きてもLINEで気づけます。

### スプレッドシート更新完了通知

```javascript
function updateSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  // ... シート更新処理 ...
  const rows = sheet.getLastRow();
  sendLine('📊 シート更新完了\n最終行: ' + rows + '行');
}
```

## 自分だけでなく友だち全員に送りたいとき

Push API（`/push`）は「特定の相手1人」に送る仕組みです。Botを友だち追加した人**全員**に一斉送信したいときは、Broadcast API（`/broadcast`）を使います。詳しくはこちらで解説しています。

→ [GASでLINE公式アカウントから一斉配信する方法](/blog/gas-line-broadcast/)

## 無料プランの送信上限に注意

Messaging APIの無料プラン（コミュニケーションプラン）は**月200通まで**です。自分への通知だけなら十分ですが、

- 毎朝7時の通知 → 月30通
- エラー通知・完了通知 → 数十通

くらいで収まるよう、通知の頻度を設計しておくと安心です。上限を超えると追加メッセージは送られなくなります（課金プランにすれば増やせます）。

## まとめ

- LINE Messaging APIでチャネルを作り、トークンとユーザーIDを取得
- `UrlFetchApp.fetch` でPush APIにPOSTするだけ
- トークン・ユーザーIDは絶対にコードに直書きしない
- エラー通知・完了通知・定期レポートに応用できる
- 無料プランは月200通まで → 通知頻度を設計しておく

GASと組み合わせると、スマホが「副業の秘書」になります。まずは完了通知1本から始めてみてください。

## 私（凛）が試して気づいたコツ3つ

### コツ1：トークンは絶対にコードに直書きしない

チャネルアクセストークンをコードに直書きすると、スクリプトを誰かに見せたり共有したりしたときに漏れてしまいます。必ずスクリプトプロパティに保存して、コードからは名前で取得する設計にしてください。

### コツ2：通知の頻度を考える

GASの毎回実行のたびにLINEに通知が届くと、通知疲れしてしまいます。さらにMessaging API無料プランは月200通の上限があります。完了通知は「処理が終わったとき1回だけ」に絞るか、エラー時のみ通知する設計にするのがおすすめです。

### コツ3：送信失敗は黙って起きる

`muteHttpExceptions: true` を設定していると、通信エラーでも例外が発生しません。レスポンスコードを確認して200以外のときはログに残す処理を入れておくと、「実は届いていなかった」という状況に気づけます。

## つまずきやすいポイント

### つまずき1：ユーザーIDが分からない

Push APIには送信先の「ユーザーID（Uから始まる文字列）」が必要です。LINEのプロフィールに出ている表示名やID（@で始まるもの）とは別物です。Webhookで自分がBotに話しかけたときのログから取得します（[セットアップ記事](/blog/gas-line-messaging-api-setup/)参照）。

### つまずき2：Botを友だち追加していない

チャネルを作っただけでは通知は届きません。LINE Developersの「Messaging API設定」タブに表示されるQRコードから、自分のLINEでBotを**友だち追加**しておく必要があります。

### つまずき3：月200通の上限に到達

無料プランの上限を超えると、その月はメッセージが送られなくなります。LINE Official Account Managerの管理画面で当月の送信数を確認できます。通知の頻度を見直すか、課金プランを検討してください。

## 関連記事

- [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)
- [GASで毎朝天気予報をLINEに届ける](/blog/gas-line-weather-notify/)
- [GASで毎朝ToDoをLINEに届けるリマインダー](/blog/gas-line-reminder-daily/)
- [GASでLINE公式アカウントから一斉配信する方法](/blog/gas-line-broadcast/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。LINE Messaging APIの仕様・料金プランは公式サイトで最新情報をご確認ください。
