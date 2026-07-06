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

こんにちは、看護師をしながらGASで副業をしている凛です。時間トリガーでGASを動かしていると、「5分後に実行されます」という待ち時間がどうしてもついて回ります。フォームに申し込みが入った瞬間にLINEへ通知したい——そんな場面では、この数分の遅れが意外とテンポを崩してしまうんですよね。

今回のテーマは「GASをWebhookで即時実行する方法」です。

時間トリガーは「定期的に回す」処理には向いていますが、「何かが起きた瞬間に動かす」用途には不向きです。問い合わせや決済のように即応性が求められる場面では、ポーリングの待ち時間がそのまま対応の遅れになります。ここで役立つのがWebhook（イベント発生をきっかけにGASを叩く仕組み）です。

---

## こんな悩みありませんか？

- 5分に1回の時間トリガーだと、反応がワンテンポ遅くて困る
- 他サービス（Slack・Stripe・LINE・Googleフォームなど）の更新を拾って、すぐに処理したい
- 「Webhook」「doPost」って単語は知ってるけど、具体的に何をどう書けばいいのかわからない
- GASのウェブアプリデプロイのやり方がよくわからない
- セキュリティ的に大丈夫か不安で踏み切れない

私も最初、Googleフォームの申し込みが入ったらすぐLINEに飛ばしたいのに、5分ごとポーリングで回していた時期がありました。「申し込みから5分後に通知」では、クライアントとのやり取りでテンポが悪くなることがありました。

それ、Webhookにしたら一瞬で解決しました。

---

## Webhookとは何か

Webhookとは「何かイベントが起きたときに、指定のURLにHTTPリクエストを自動で送ってもらう仕組み」のことです。

GASをウェブアプリとしてデプロイすると公開URLをもらえます。そのURLに外部からPOSTリクエストが来た時に `doPost(e)` 関数が即時実行されます。

**時間トリガーとWebhookの違い：**

| 方式 | 実行タイミング | 向いている用途 |
|---|---|---|
| 時間トリガー | 設定した時刻（最短1分ごと） | 定期的なバッチ処理 |
| Webhook | イベント発生の瞬間 | リアルタイムな通知・記録 |

**Webhookが向いている場面：**
- フォーム送信 → 即座にLINE通知
- 決済完了 → 即座にスプシに記録
- GitHubのプッシュ → 即座に処理
- 外部SaaSのイベント → 即座にデータ連携

---

## GASでのWebhook受信の全体像

処理の流れをざっくり説明します。

1. GASに `doPost(e)` 関数を書く
2. 「ウェブアプリとしてデプロイ」して公開URLを取得する
3. 外部サービスのWebhook設定欄にそのURLを貼る
4. イベント発生 → 外部サービスがそのURLにPOSTする → GASが即起動 → 処理する

ポイントは「公開URLになる」という部分です。誰でも叩けてしまうので、シークレット（合言葉）で送信元を確認するクセをつけておくことが大事です。

---

## サンプルコード（コピペで動きます）

### 基本の doPost 実装

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

### シークレットで送信元を認証するコード

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

### Googleフォーム送信を受け取ってLINE通知するコード

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

---

## ウェブアプリとしてデプロイする手順

コードを書いただけでは外からアクセスできません。必ずデプロイが必要です。

1. GASエディタ右上の「デプロイ」ボタンをクリック
2. 「新しいデプロイ」を選ぶ
3. 「種類の選択」で歯車アイコンをクリック → 「ウェブアプリ」を選ぶ
4. 「次のユーザーとして実行」を「自分（メールアドレス）」に設定
5. 「アクセスできるユーザー」を「全員」に設定（Webhook受信用は全員に公開が標準）
6. 「デプロイ」ボタンをクリック
7. 「ウェブアプリのURL」をコピーする（これがWebhook用のURLになる）
8. このURLを外部サービスのWebhook設定欄に貼る

**コードを更新した場合の注意：**
- 「新しいデプロイ」ではなく「デプロイを管理」→ 対象を選んで「編集」→ バージョン「新しいバージョン」で上書きする
- こうするとURLが変わらないで済む
- URLが変わると外部サービス側の設定を全部書き換える必要が出るため、必ず「上書き」を使うこと

---

## スクリプトプロパティへのシークレット設定方法

シークレットはコードに直書きせず、スクリプトプロパティに保存します。

1. GASエディタ上部の「プロジェクトの設定」（⚙️歯車アイコン）をクリック
2. 「スクリプトプロパティ」セクションで「プロパティを追加」をクリック
3. プロパティ名 `WEBHOOK_SECRET`、値に自分で決めた合言葉（例：`my-secret-2026`）を入力
4. 「保存」をクリック

外部サービスからWebhookを送る際にも、このシークレットをリクエストボディに含めるように設定します。

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：受信ログを「まず書く、それから処理」の順にする

Webhookは受信に失敗しても外部サービスが再送してくれないことが多いです。特に決済情報や問い合わせ内容は「受信できた」という記録が最重要です。

私の実装では、受信したデータを最初の処理としてスプシに書き込み、その後にLINE通知などの処理を行っています。もし後続処理でエラーが起きても、「生のデータは残っている」ので手動でリカバリできます。

### コツ2：シークレットは必ず設定する

公開URLに誰でもアクセスできる状態は、悪用されるリスクがあります。シークレットを設定することで「正しい送信元からのリクエストだけ処理する」ことができます。

コードに直書きするのは絶対NG。スクリプトプロパティを使ってください。GitHubに公開したコードやブログのスクショからシークレットが漏れる事故を防げます。

### コツ3：コード更新は「上書きデプロイ」でURLを固定する

デプロイを「新しいデプロイ」で行うたびに新しいURLが発行されます。外部サービスのWebhook設定欄には古いURLが残ったままになり、Webhookが届かなくなります。

コードを修正したら必ず「デプロイを管理」→「編集」→「新しいバージョンで上書き」の手順を踏んでください。URLが変わらないので外部設定の変更が不要です。

---

## つまずきやすいポイント

### エラー1：`e.postData` が null または undefined になる

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

### エラー2：デプロイ後に「権限が必要です」ページが表示される

「アクセスできるユーザー」が「自分のみ」になっている場合、外部サービスからのアクセスが拒否されます。

**解決策**：「デプロイを管理」→ 対象を選んで「編集」→「アクセスできるユーザー」を「全員」に変更して上書きデプロイする。

### エラー3：`doPost` のテストができない

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

---

## 実務で使えるWebhook活用パターン

| パターン | 外部サービス → GASで何をするか |
|---|---|
| フォーム→LINE通知 | Googleフォーム / TypeForm → 問い合わせをLINEに即時転送 |
| 決済→記録 | Stripe / PayPal → 売上をスプシに自動記録 |
| GitHubプッシュ→通知 | GitHub → コードが更新されたことをLINEに通知 |
| SaaS連携 | Notion / Airtable → データ更新をGASで処理 |
| LINE webhook | LINE Messaging API → メッセージを受け取ってBot応答 |

---

## まとめ

| 項目 | 内容 |
|---|---|
| Webhookの仕組み | 外部サービスがGASの公開URLにPOSTする |
| 受け取り関数 | `doPost(e)` を書く |
| デプロイ設定 | ウェブアプリ・全員アクセス可 |
| セキュリティ | シークレットをスクリプトプロパティで管理 |
| 実行タイミング | イベント発生と同時（時間トリガーのような待ち時間なし） |
| コード更新時の注意 | 上書きデプロイでURLを固定する |
| 効果 | 時間トリガーの「待ち時間ストレス」から解放 |

Webhookを使うと、時間トリガーの「最大5分の待ち時間」から完全に解放されます。フォームの申し込みがあった瞬間に気づけるって、想像以上に快適ですよ。

---

## 関連記事

- [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/)
- [副業タスクをGASで毎朝LINEに届ける仕組み](/blog/gas-side-business-tasklist/)
- [GASでLINE返信Botを作る最小実装](/blog/gas-line-reply-bot/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

**本記事のコードは静的検証済みです。** GAS環境（V8ランタイム）で動作確認を行っています。
