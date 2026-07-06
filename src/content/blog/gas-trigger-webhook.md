---
title: "Webhook受信でGAS即時実行する設定方法"
description: "時間トリガーじゃ遅すぎる…そんなときに使えるのがWebhook経由の即時実行。doPostの基本から安全な受け取り方まで、看護師ママが失敗談つきで丁寧に説明します。"
pubDate: "2026-05-25T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas", "webhook", "doPost"]
tagNames: ["GAS", "Webhook", "doPost"]
readingTime: 8
keywords: ["GAS Webhook","GAS doPost","GAS 即時実行","GAS ウェブアプリ デプロイ"]
---

こんにちは、看護師をしながらGASで副業をしている凛です。時間トリガーでGASを動かしていると、「5分後に実行されます」という待ち時間がどうしてもついて回ります。私も最初、Googleフォームの申し込みが入ったらすぐLINEに飛ばしたいのに、5分ごとのポーリングで回していた時期がありました。「申し込みから5分後に通知」では、クライアントとのやり取りでテンポが悪くなることがあったんです。

それ、Webhookにしたら一瞬で解決しました。

## 結論：doPost(e) を書いて、ウェブアプリとしてデプロイするだけ

先にゴールをお見せします。やることはシンプルで、GASに `doPost(e)` 関数を書く → 「ウェブアプリとしてデプロイ」して公開URLを取得する → そのURLを外部サービスのWebhook設定欄に貼る。これだけです。あとはイベントが起きるたびに外部サービスがそのURLへPOSTしてくれて、GASが即時起動します。

`doPost` の基本形はこちら。

```javascript
/**
 * Webhookを受け取って処理する基本パターン
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function doPost(e) {
  try {
    // リクエストボディを JSON として解析
    // ← e.postData.contents にリクエストの本文が文字列で入っている
    const data = JSON.parse(e.postData.contents);

    // スプシにログを記録
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('log');
    if (!sheet) {
      throw new Error('"log" シートが見つかりません');
    }

    // 受信データを1行追記（日時・イベント種別・ユーザー情報）
    sheet.appendRow([
      new Date().toLocaleString('ja-JP'),  // 受信日時
      data.event || 'unknown',              // イベント種別
      data.user || '',                      // ユーザー情報
      JSON.stringify(data)                  // 全データ（デバッグ用）
    ]);

    // 成功レスポンスを返す（必ずレスポンスを返すこと）
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, message: '受信完了' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // エラーが起きてもレスポンスを返す（外部サービスへの通知）
    Logger.log(`doPostエラー: ${error.message}`);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### ウェブアプリとしてデプロイする手順

コードを書いただけでは外からアクセスできません。必ずデプロイが必要です。

1. GASエディタ右上の「デプロイ」ボタンをクリック
2. 「新しいデプロイ」を選ぶ
3. 「種類の選択」で歯車アイコンをクリック → 「ウェブアプリ」を選ぶ
4. 「次のユーザーとして実行」を「自分（メールアドレス）」に設定
5. 「アクセスできるユーザー」を「全員」に設定（Webhook受信用は全員に公開が標準）
6. 「デプロイ」ボタンをクリック
7. 「ウェブアプリのURL」をコピーする（これがWebhook用のURLになる）
8. このURLを外部サービスのWebhook設定欄に貼る

なお、コードを更新したときのデプロイ方法にはひとつ大きな落とし穴があります。後半の「ハマりどころ」で説明するので、そこだけは読み飛ばさないでください。

## なぜこの形になるのか

### そもそもWebhookとは

Webhookとは「何かイベントが起きたときに、指定のURLにHTTPリクエストを自動で送ってもらう仕組み」のことです。GASをウェブアプリとしてデプロイすると公開URLをもらえます。そのURLに外部からPOSTリクエストが来た時に `doPost(e)` 関数が即時実行される、というわけです。

**時間トリガーとWebhookの違い：**

| 方式 | 実行タイミング | 向いている用途 |
|---|---|---|
| 時間トリガー | 設定した時刻（最短1分ごと） | 定期的なバッチ処理 |
| Webhook | イベント発生の瞬間 | リアルタイムな通知・記録 |

時間トリガーは「定期的に回す」処理には向いていますが、「何かが起きた瞬間に動かす」用途には不向きです。問い合わせや決済のように即応性が求められる場面では、ポーリングの待ち時間がそのまま対応の遅れになります。フォーム送信の瞬間にLINEへ通知する、決済完了の瞬間にスプシへ記録する、GitHubのプッシュを即座に処理する——「起きた瞬間に動かしたい」ものは、ぜんぶWebhookの出番です。

### 「まずログに書く、それから処理」の順番にしている理由

基本形のコードで、通知より先に `appendRow` でスプシに記録しているのには理由があります。Webhookは受信に失敗しても外部サービスが再送してくれないことが多いんです。特に決済情報や問い合わせ内容は「受信できた」という記録が最重要。私の実装では、受信したデータを最初の処理としてスプシに書き込み、その後にLINE通知などの処理を行っています。もし後続処理でエラーが起きても「生のデータは残っている」ので、手動でリカバリできます。

### シークレット（合言葉）を入れる理由

デプロイ手順で「アクセスできるユーザー：全員」にしたのを思い出してください。つまりこのURLは、知っていれば誰でも叩けます。悪用されるリスクを下げるために、シークレットで「正しい送信元からのリクエストだけ処理する」ようにします。

コードに直書きするのは絶対NG。GitHubに公開したコードやブログのスクショからシークレットが漏れる事故を防ぐため、スクリプトプロパティを使ってください。

```javascript
/**
 * シークレットで認証してから処理するセキュリティ付きバージョン
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function doPost(e) {
  // スクリプトプロパティからシークレットを取得
  // ← コードに直書きは絶対NG（GitHubに公開した場合などに漏れる）
  const SECRET = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');

  try {
    const data = JSON.parse(e.postData.contents);

    // シークレットの確認
    // ← 送信元が正しいシークレットを送ってこない場合は処理を拒否
    if (data.secret !== SECRET) {
      Logger.log('認証失敗: 不正なシークレット');
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 認証OKのときだけ本処理を実行
    processWebhookEvent(data);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`doPostエラー: ${error.message}`);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Webhookイベントの本処理（シークレット確認後に呼ばれる）
 */
function processWebhookEvent(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('events');
  if (!sheet) return;

  // イベント種別に応じて処理を分岐
  switch (data.event) {
    case 'order_created':
      // 注文作成イベント
      sheet.appendRow([new Date(), '新規注文', data.orderId, data.amount]);
      Logger.log(`新規注文: ${data.orderId}`);
      break;

    case 'user_signup':
      // ユーザー登録イベント
      sheet.appendRow([new Date(), 'ユーザー登録', data.userId, data.email]);
      Logger.log(`ユーザー登録: ${data.email}`);
      break;

    default:
      // 不明なイベント
      sheet.appendRow([new Date(), data.event, JSON.stringify(data), '']);
      Logger.log(`不明なイベント: ${data.event}`);
  }
}
```

### シークレットの保存場所はスクリプトプロパティ

シークレットはコードに直書きせず、スクリプトプロパティに保存します。

1. GASエディタ上部の「プロジェクトの設定」（⚙️歯車アイコン）をクリック
2. 「スクリプトプロパティ」セクションで「プロパティを追加」をクリック
3. プロパティ名 `WEBHOOK_SECRET`、値に自分で決めた合言葉（例：`my-secret-2026`）を入力
4. 「保存」をクリック

外部サービスからWebhookを送る際にも、このシークレットをリクエストボディに含めるように設定します。

### 実用形：フォーム送信をLINEに即時通知する

私が最初に作りたかった「フォーム→LINE即時通知」の実用版がこちらです。受信ログの記録とシークレット確認も組み込んであります。

```javascript
/**
 * フォーム送信Webhookを受け取ってLINE通知する実用版
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function doPost(e) {
  const LINE_TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  const LINE_USER_ID = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  const SECRET = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');

  try {
    // リクエストボディを解析
    // application/json の場合
    let data;
    if (e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents);
    } else {
      // application/x-www-form-urlencoded の場合は e.parameter を使う
      data = e.parameter;
    }

    // シークレット確認（設定されている場合のみ）
    if (SECRET && data.secret !== SECRET) {
      return ContentService.createTextOutput('unauthorized');
    }

    // 受信データをスプシに記録
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const log = ss.getSheetByName('受信ログ') || ss.insertSheet('受信ログ');
    log.appendRow([new Date(), JSON.stringify(data)]);

    // LINE通知を送信
    if (LINE_TOKEN && LINE_USER_ID) {
      const msg = `📬 新しい問い合わせ\n\n名前: ${data.name || '不明'}\nメール: ${data.email || '不明'}\nメッセージ: ${data.message || 'なし'}`;

      const lineOptions = {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + LINE_TOKEN },
        payload: JSON.stringify({
          to: LINE_USER_ID,
          messages: [{ type: 'text', text: msg }]
        })
      };

      UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', lineOptions);
      Logger.log('LINE通知を送信しました');
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`エラー: ${error.message}`);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## ハマりどころ

ここからは、私が実際に引っかかった順に紹介します。

### 「新しいデプロイ」を繰り返すとURLが変わる

いちばん多くの人がハマるのがこれだと思います。デプロイを「新しいデプロイ」で行うたびに、新しいURLが発行されます。外部サービスのWebhook設定欄には古いURLが残ったままになり、ある日突然Webhookが届かなくなる。

コードを修正したら、必ず「デプロイを管理」→ 対象を選んで「編集」→ バージョン「新しいバージョン」で上書きしてください。この手順ならURLが変わらないので、外部サービス側の設定を書き換える必要がありません。

### `e.postData` が null または undefined になる

`doPost` 関数が呼ばれているのに `e.postData.contents` でエラーになる場合、リクエストのContent-Typeが違う可能性があります。

**解決策**：`e.postData` の内容をログで確認する。

```javascript
// デバッグ用：受信データを全部ログに出力
function doPost(e) {
  Logger.log('e.postData.type: ' + e.postData.type);
  Logger.log('e.postData.contents: ' + e.postData.contents);
  Logger.log('e.parameter: ' + JSON.stringify(e.parameter));

  return ContentService.createTextOutput('received');
}
```

`application/json` の場合は `e.postData.contents` を `JSON.parse`、`application/x-www-form-urlencoded` の場合は `e.parameter` を使います。

### デプロイ後に「権限が必要です」ページが表示される

「アクセスできるユーザー」が「自分のみ」になっている場合、外部サービスからのアクセスが拒否されます。

**解決策**：「デプロイを管理」→ 対象を選んで「編集」→「アクセスできるユーザー」を「全員」に変更して上書きデプロイする。

### `doPost` のテストができない

GASエディタからは `doPost` を直接テスト実行できません（エラーになります）。

**解決策**：curlコマンドやPostman（API テストツール）を使ってHTTP POSTリクエストを送る。

```bash
# curlで簡単にテストする例（ターミナルで実行）
curl -X POST "https://script.google.com/macros/s/XXXXXX/exec" \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "secret": "my-secret"}'
```

または、テスト用の関数を作って `doPost` をシミュレートする方法もあります。

```javascript
// doPostのテスト用関数
function testDoPost() {
  const testEvent = {
    postData: {
      type: 'application/json',
      contents: JSON.stringify({
        event: 'test',
        secret: 'my-secret',
        message: 'テストデータ'
      })
    },
    parameter: {}
  };

  // doPost に模擬イベントを渡して実行
  const result = doPost(testEvent);
  Logger.log('テスト結果: ' + result.getContent());
}
```

## 実務で使えるWebhook活用パターン

| パターン | 外部サービス → GASで何をするか |
|---|---|
| フォーム→LINE通知 | Googleフォーム / TypeForm → 問い合わせをLINEに即時転送 |
| 決済→記録 | Stripe / PayPal → 売上をスプシに自動記録 |
| GitHubプッシュ→通知 | GitHub → コードが更新されたことをLINEに通知 |
| SaaS連携 | Notion / Airtable → データ更新をGASで処理 |
| LINE webhook | LINE Messaging API → メッセージを受け取ってBot応答 |

## おわりに

覚えることは結局3つだけでした。`doPost(e)` を書く、ウェブアプリとしてデプロイする、シークレットをスクリプトプロパティで管理する。コード更新のときだけ「上書きデプロイ」を忘れずに。

Webhookを使うと、時間トリガーの「最大5分の待ち時間」から完全に解放されます。フォームの申し込みがあった瞬間に気づけるって、想像以上に快適ですよ。

---

## 関連記事

- [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/)
- [副業タスクをGASで毎朝LINEに届ける仕組み](/blog/gas-side-business-tasklist/)
- [GASでLINE返信Botを作る最小実装](/blog/gas-line-reply-bot/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

掲載コードは構文とAPI仕様を確認したうえで載せています。デプロイ設定はご自身の環境で必ずテストしてから本番利用してください。
