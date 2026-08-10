---
title: "GASで作るLINE返信Bot最小コード30行"
description: "Google Apps ScriptとLINE Messaging APIで作る返信Botの作り方を、コピペできる最小コードで解説。Webhookの受け取り、replyTokenでの返信、ウェブアプリのデプロイ設定、URLが変わる罠、ログが見えないときのデバッグ方法までまとめました。"
pubDate: "2026-05-16T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas","line","bot"]
tagNames: ["GAS","LINE","Bot"]
readingTime: 13
---

「LINE Botって、サーバーを借りないと作れないんでしょう？」

私もそう思っていました。実際は違って、**GASだけで、サーバー代0円で動きます**。しかも返信するだけなら本当に30行ほどです。

この記事では、話しかけたら返事をする最小のBotを作ります。そのうえで、私が実際につまずいた「デプロイでURLが変わる」「ログが見えない」といった罠も先に書いておきます。

## 完成するもの

LINEでBotに話しかけると返事が返ってくる、いちばん基本の形です。

```text
自分：こんにちは
Bot ：こんにちは！ 何かご用ですか？

自分：今日の天気は？
Bot ：「今日の天気は？」って言いましたね。
```

ここまでできれば、あとは中身を差し替えるだけで「シートを検索して答えるBot」「家計簿に記録するBot」に育てられます。

## 仕組み

```text
[LINEで発言] → [LINEのサーバー] → Webhook → [GASのウェブアプリ(doPost)]
                                                    ↓
              [LINEに返信] ← reply API ← [返す文章を組み立てる]
```

ポイントは**Webhook（ウェブフック）**です。「誰かが話しかけたら、この住所に知らせてね」とLINEに登録しておく仕組みで、その住所がGASのウェブアプリURLになります。

## 準備1：LINE公式アカウントを作る

1. [LINE Developers](https://developers.line.biz/ja/) にログイン
2. プロバイダーを作成
3. 「新規チャネル作成」→ **Messaging API**
4. チャネル名などを入力して作成
5. 「Messaging API設定」タブを開く
6. 下部の **チャネルアクセストークン（長期）** を発行してコピー
7. 同じ画面のQRコードで、**自分でこのBotを友だち追加**

### 先に切っておく設定

同じ画面の「応答設定」で、次のようにしておきます。

- **応答メッセージ：オフ**（オンのままだと定型文が勝手に返り、Botの返事と二重になります）
- **あいさつメッセージ：任意**
- **Webhook：オン**

ここを直さずに「返事が2つ来る」と悩む人がとても多いです。私も最初にやりました。

## 準備2：トークンをスクリプトプロパティに入れる

GASエディタの「プロジェクトの設定（⚙）」→「スクリプト プロパティ」で、次を登録します。

| プロパティ名 | 値 |
|---|---|
| `LINE_TOKEN` | チャネルアクセストークン（長期） |

トークンは、他人に知られると**あなたのBotから勝手にメッセージを送れてしまう鍵**です。コードに直接書かないでください。

## コード全文（これで動きます）

```javascript
/** LINEからの通知を受け取る入口 */
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const events = body.events || [];

    events.forEach(function (event) {
      // テキストメッセージ以外（スタンプ・画像・友だち追加など）は無視する
      if (event.type !== 'message' || event.message.type !== 'text') return;

      const userText = event.message.text;
      const reply    = buildReply_(userText);
      replyToLine_(event.replyToken, reply);
    });
  } catch (err) {
    console.log('doPostでエラー: ' + err.message);
  }
  // LINEには必ず200を返す（返さないと再送されてくる）
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 返す文章を決める（ここを育てていく） */
function buildReply_(text) {
  if (/こんにちは|はじめまして/.test(text)) return 'こんにちは！ 何かご用ですか？';
  if (/ありがとう/.test(text))              return 'どういたしまして😊';
  if (/ヘルプ|help/i.test(text))            return '「こんにちは」「ありがとう」に反応します。';
  return '「' + text + '」って言いましたね。';
}

/** replyTokenを使って返信する */
function replyToLine_(replyToken, text) {
  const token = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: text.slice(0, 4900) }]
    }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    console.log('返信エラー: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
}
```

## 準備3：ウェブアプリとしてデプロイする

ここが最大の関門です。順番どおりにやってください。

1. エディタ右上の「**デプロイ**」→「**新しいデプロイ**」
2. 歯車アイコン →「**ウェブアプリ**」を選ぶ
3. 次のユーザーとして実行：**自分**
4. アクセスできるユーザー：**全員**
5. 「デプロイ」を押す
6. 表示された **ウェブアプリのURL**（末尾が `/exec`）をコピー

4番を「自分のみ」にすると、LINEからのアクセスが弾かれてBotは絶対に動きません。ここが最頻出のつまずきポイントです。

### LINE側にURLを登録する

LINE Developersの「Messaging API設定」→ **Webhook URL** に、コピーしたURLを貼って「更新」。その下の「**検証**」ボタンを押して、成功と出れば接続完了です。

「Webhookの利用」がオンになっているかも、あわせて確認してください。

## 動作確認

自分のLINEからBotに「こんにちは」と送ってみてください。返事が返ってきたら成功です。

## つまずきポイント

### 1. 再デプロイしたらURLが変わって動かなくなった

コードを直したあと「新しいデプロイ」を選ぶと、**URLが新しくなります**。LINE側に登録したURLは古いままなので、Botは沈黙します。

正しい手順は、「**デプロイを管理**」→ 対象のデプロイの**鉛筆アイコン**→ バージョンを「**新バージョン**」にして更新。これならURLは変わりません。

私はこれを知らず、更新のたびにWebhook URLを貼り替えていました。

### 2. 返事が2通くる

LINE側の「応答メッセージ」がオンのままです。Messaging API設定の応答設定でオフにしてください。

### 3. ログが見えない

`doPost` はLINEのサーバーから呼ばれるので、エディタの実行ログには出ません。**左メニューの「実行数」**を開くと、`doPost` の実行履歴とログが確認できます。ここを知らないと、デバッグが完全に手探りになります。

### 4. 何も返ってこない

確認する順番はこれが速いです。

1. LINE Developersの「検証」ボタンは成功するか（→ 失敗ならデプロイ設定）
2. 「実行数」に `doPost` の記録があるか（→ 無ければWebhookが届いていない）
3. 記録があってエラーなら、その内容を読む（→ たいていトークン間違い）

### 5. `e.postData` が undefined になる

エディタから `doPost` を直接実行すると、LINEからのデータが無いので必ずこのエラーになります。**doPostは手動実行できません。**テストは実際にLINEから話しかけて行います。

### 6. 401 Unauthorized

チャネルアクセストークンが違います。スクリプトプロパティの値に余計な空白が混ざっていないか確認してください。

## 応用1：受け取った内容をスプレッドシートに記録する

「LINEに送るだけで家計簿に記録される」といった仕組みは、この延長で作れます。

```javascript
function buildReply_(text) {
  // 例：「1200 昼食」のような入力を家計簿に記録する
  const m = text.match(/^(\d+)\s+(.+)$/);
  if (m) {
    const sheet = SpreadsheetApp.openById('スプレッドシートのID').getSheetByName('家計簿');
    sheet.appendRow([new Date(), Number(m[1]), m[2]]);
    return '記録しました：' + m[2] + ' ' + Number(m[1]).toLocaleString() + '円';
  }
  return '「金額 内容」の形で送ってください（例：1200 昼食）';
}
```

レシートを財布に貯めなくなり、家計簿の入力が「その場で1行送るだけ」になりました。

## 応用2：署名を検証して安全にする

ウェブアプリのURLは「全員」に公開されるため、URLを知られると誰でもデータを送れてしまいます。個人利用なら実害は少ないですが、気になる場合は**署名検証**を入れます。

```javascript
function isValidSignature_(e) {
  const secret = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_SECRET');
  const signature = (e.parameter && e.parameter.signature) || '';  // ヘッダーが取れない環境向けの簡易版
  const hash = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(e.postData.contents, secret, Utilities.Charset.UTF_8)
  );
  return hash === signature;
}
```

なお、**GASのウェブアプリではリクエストヘッダーを直接読めません**。厳密な署名検証（`x-line-signature` ヘッダーの照合）が必要な用途では、GAS以外の実行環境を検討してください。ここはGASの割り切りポイントです。

## まとめ

- LINE Botは**GASだけ・サーバー代0円**で作れる
- デプロイ設定は「実行するユーザー：自分」「アクセス：**全員**」
- コード修正後は「**デプロイを管理 → 新バージョン**」でURLを変えずに更新
- 応答メッセージを**オフ**にしないと返事が二重になる
- `doPost` は手動実行できない。ログは「**実行数**」で見る
- ヘッダーが読めないため、厳密な署名検証はGASでは難しい

まずは30行で「返事が来た！」を体験してみてください。そこから先は、`buildReply_` の中身を書き換えるだけで、いくらでも育てられます。

## 関連記事

- [GASでLINEに毎朝「今日の予定・天気・タスク」を自動通知する仕組み](/blog/gas-line-morning-notification/)
- [GASをWebアプリとして公開する手順](/blog/gas-webapp-deploy/)
- [GASよく出るエラー10選と解決コード集｜辞書代わりに使える完全版](/blog/gas-error-exception/)

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。
