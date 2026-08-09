---
title: "Google Apps Scriptでできること10選｜無料で毎日使える自動化アイデア集"
description: "Google Apps Script（GAS）で自動化できることを、実際に動かしているコード例つきで10個紹介します。スプレッドシート集計・Gmail自動処理・カレンダー登録・LINE通知・OCR・Webアプリまで。無料でできる範囲と、GASが苦手なこともあわせて解説します。"
pubDate: "2026-04-15"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas", "basics", "automation"]
tagNames: ["GAS", "入門", "自動化"]
readingTime: 14
---

「Google Apps Scriptって聞いたことあるけど、結局これで何ができるの？」

私がGASを始めたときに、いちばん知りたかったのがこれでした。難しい説明よりも、**実際に動いている例**を見るほうが早いはずです。

この記事では、私が今も毎日動かしているものを中心に、GASでできることを10個、短いコード付きで紹介します。最後に「GASが苦手なこと」も正直に書きました。できないことを先に知っておくほうが、遠回りせずに済みます。

## GASとは何か（3行で）

- Googleが無料で提供している**プログラミングの実行環境**
- スプレッドシート・Gmail・カレンダー・ドライブなどを**コードから操作**できる
- 書いたコードは**Googleのサーバーで動く**ので、パソコンを閉じても動き続ける

サーバーを借りる必要も、パソコンに何かをインストールする必要もありません。ブラウザとGoogleアカウントだけで完結します。言語はJavaScriptです。

## 1. スプレッドシートの集計を自動化する

「毎朝、前日分を集計して1行にまとめる」といった定型作業を任せられます。関数（SUMIFなど）と違うのは、**条件分岐や外部との連携を書ける**点です。

```javascript
function summarize() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('明細');
  const rows  = sheet.getDataRange().getValues().slice(1);   // 見出しを除く
  const total = rows.reduce((sum, r) => sum + (Number(r[2]) || 0), 0);
  SpreadsheetApp.getActive().getSheetByName('集計').appendRow([new Date(), rows.length, total]);
}
```

**コツ**：1行ずつ `getValue()` で読むと遅くなります。`getDataRange().getValues()` で一度に配列として取り出すのが基本です。

## 2. Gmailの振り分け・自動返信

Gmailの標準フィルタでは書けない条件も、GASなら自由に書けます。「本文に金額が書かれていて、かつ差出人が特定ドメイン」のような複合条件も可能です。

```javascript
function labelInvoices() {
  const label = GmailApp.getUserLabelByName('請求書') || GmailApp.createLabel('請求書');
  GmailApp.search('subject:(請求 OR 御請求) newer_than:30d -label:請求書', 0, 20)
    .forEach(thread => thread.addLabel(label));
}
```

検索の書き方は、Gmailの検索窓とまったく同じです。`from:` `subject:` `newer_than:7d` `-label:` などがそのまま使えます。

## 3. 予約メールをカレンダーへ自動登録

美容室・歯科・レストランの予約確認メールから日時を読み取り、カレンダーに予定を作ります。転記の手間と入れ忘れが同時になくなります。

```javascript
function addEventFromMail() {
  const thread  = GmailApp.search('subject:予約 newer_than:1d', 0, 1)[0];
  if (!thread) return;
  const body    = thread.getMessages()[0].getPlainBody();
  const m       = body.match(/(\d{1,2})月(\d{1,2})日.*?(\d{1,2})[:時](\d{2})?/);
  if (!m) return;   // 読めなければ登録しない（これが大事）

  const y = new Date().getFullYear();
  const start = new Date(y, Number(m[1]) - 1, Number(m[2]), Number(m[3]), Number(m[4] || 0));
  CalendarApp.getDefaultCalendar().createEvent('📩 予約', start, new Date(start.getTime() + 3600000));
}
```

**注意**：日時が読み取れなかったときに「とりあえず登録」は絶対にしないこと。間違った予定ほど厄介なものはありません。

## 4. LINEやSlackへ毎朝まとめて通知する

その日の予定・天気・やることを1通にまとめて自分に送ります。朝にアプリを3つ開く必要がなくなります。

```javascript
function pushLine(text) {
  const token = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ to: '自分のユーザーID', messages: [{ type: 'text', text }] })
  });
}
```

**注意**：以前よく使われていた「LINE Notify」は2025年3月に終了しました。今から作るならLINE Messaging APIです。トークンはコードに直書きせず、スクリプトプロパティに入れます。

## 5. Webサイトの情報を定期的に取ってくる

公開されているデータを取得して、スプレッドシートに記録できます。為替レート、気象庁の天気、公的機関が出しているオープンデータなどです。

```javascript
function logExchangeRate() {
  const res  = UrlFetchApp.fetch('https://api.example.com/rate', { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return;
  const rate = JSON.parse(res.getContentText()).usd_jpy;
  SpreadsheetApp.getActive().getSheetByName('為替').appendRow([new Date(), rate]);
}
```

**注意**：取得先の利用規約は必ず確認してください。多くのサイトは自動取得を禁止しています。API として公開されているもの、または利用が明示的に許可されているデータを使うのが前提です。

## 6. 画像から文字を読み取る（OCR）

Googleドライブは、画像をGoogleドキュメントに変換するときに文字起こしをします。この仕組みを使えば、追加費用ゼロでOCRができます。

```javascript
function ocr(fileId) {
  const doc = Drive.Files.copy(
    { name: 'ocr', mimeType: MimeType.GOOGLE_DOCS },
    fileId,
    { ocrLanguage: 'ja' }
  );
  const text = DocumentApp.openById(doc.id).getBody().getText();
  DriveApp.getFileById(doc.id).setTrashed(true);
  return text;
}
```

レシートの日付と金額を抜き出してシートに貯めれば、確定申告前の入力作業が激減します（事前に「サービス」からDrive APIの追加が必要です）。

## 7. スマホから使えるWebアプリを作る

GASは**URLを1つ発行するだけでWebアプリを公開**できます。買い物リスト、簡易な記録アプリ、社内の申請フォームなど、個人や小さなチーム用途なら十分です。

```javascript
function doGet() {
  return HtmlService.createHtmlOutput('<h1>買い物リスト</h1>');
}
```

サーバー代もドメイン代もかかりません。公開範囲を「自分のみ」にすれば、他人からは開けません。

## 8. Googleフォームの回答を自動処理する

フォーム送信をきっかけに処理を走らせられます（フォーム送信時トリガー）。回答内容で分岐して、担当者にメールしたり、シートを振り分けたりできます。

```javascript
function onFormSubmit(e) {
  const answers = e.namedValues;
  const type = (answers['お問い合わせ種別'] || [''])[0];
  if (type === '見積依頼') {
    GmailApp.sendEmail('sales@example.com', '見積依頼が届きました', JSON.stringify(answers, null, 2));
  }
}
```

**注意**：`e.namedValues['項目名']` は、回答が無いと `undefined` になります。任意項目があるフォームでは、必ず存在チェックを入れてください。

## 9. サービスをまたいだ処理をつなぐ

GASの一番の強みはここだと思っています。「Gmailで受け取る → スプレッドシートに記録 → カレンダーに登録 → LINEで通知」が**1つのスクリプトの中で全部書ける**ためです。

自動化サービス（ZapierやIFTTT）で有料プランが必要になる連携も、GASなら無料枠でまかなえることが多いです。そのかわり、動かないときは自分で直す必要があります。

## 10. 定期実行で「勝手に動く」状態にする

ここまでの処理は、トリガーを付けて初めて自動化になります。

```javascript
function setup() {
  ScriptApp.newTrigger('summarize').timeBased().atHour(8).everyDays(1).create();
}
```

毎朝・毎週月曜・毎月1日といった指定ができます。ただし日単位の指定は「8時〜9時のどこか」という**1時間の幅**があります。分単位のきっちりした指定はできません。

## 無料でどこまでできる？（制限のはなし）

無料のGoogleアカウントで使う場合、主な上限は次のとおりです。

| 項目 | 目安 |
|---|---|
| 1回の実行時間 | 6分 |
| 1日の合計実行時間 | 90分 |
| メール送信 | 1日100通 |
| URL取得（UrlFetch） | 1日20,000回 |
| トリガーの合計実行時間 | 1日90分 |

個人の自動化で困ることはまずありません。ぶつかるとしたら「1回6分」です。数千行を1行ずつ処理すると簡単に超えるので、まとめて読み書きする書き方を覚えるのが対策になります。

（上限は変更されることがあります。最新は[Google公式のQuotasページ](https://developers.google.com/apps-script/guides/services/quotas)で確認してください）

## GASが苦手なこと

正直に書いておきます。次のような用途には向きません。

- **重い計算・大量データの処理**：6分の壁があるため、数十万行の集計などはBigQueryなど別の道具が向いています
- **常時監視・秒単位の反応**：最短でも1分おきです。秒単位の即時処理はできません
- **本格的なWebサービス**：同時アクセスが多いサービスには不向きです
- **利用規約で禁止されているスクレイピング**：技術的にできても、やってはいけません

「Googleサービス周りの、ちょっとした面倒を消す」——ここがGASの得意分野です。

## 最初の一歩をどう踏み出すか

私は看護師で、プログラミングの経験はゼロから始めました。最初にやったのは、**自分が毎日困っていること1つ**をGASで解決することでした。教材を最初から順に読むより、こちらのほうが続きます。

おすすめの順番はこうです。

1. スプレッドシートのメニューから「拡張機能」→「Apps Script」を開く
2. `console.log('こんにちは')` を書いて実行してみる（これだけで第一歩）
3. 自分のシートの値を1つ読んで表示してみる
4. 毎日やっている作業を1つ選んで、書いてみる

分からないことは、公式の[Apps Script リファレンス](https://developers.google.com/apps-script/reference)が結局いちばん正確です。日本語の解説記事と併用すると理解が早くなります。

## まとめ

- GASは**Googleサービスを自動で動かす無料の道具**
- 集計・メール・カレンダー・通知・OCR・Webアプリまで、ひととおりできる
- 無料枠は個人利用なら十分。気をつけるのは**1回6分**の制限
- 苦手なこともある。向いていない用途に無理をしない
- 始め方は「自分が毎日困っていること1つ」から

このブログでは、実際に動かしているコードを、失敗したところも含めて書いていきます。まずは1つ、動くものを作ってみてください。動いた瞬間の「おおっ」という感覚が、いちばんの燃料になります。

## 関連記事

- [GAS入門｜5分で書ける最初の1行コード完全解説](/blog/gas-beginner-5min/)
- [GASでLINEに毎朝「今日の予定・天気・タスク」を自動通知する仕組み](/blog/gas-line-morning-notification/)
- [GASよく出るエラー10選と解決コード集｜辞書代わりに使える完全版](/blog/gas-error-exception/)
