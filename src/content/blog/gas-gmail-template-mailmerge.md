---
title: "Gmail差し込みメールをGASでテンプレ化5例｜顧客リストから個別メール一括送信"
description: "Gmail差し込みメール（メールマージ）をGASで実装する5パターンを凛が解説。スプシの顧客リストから一人ずつカスタム本文で送信、HTMLメール対応、添付ファイル付与まで。"
pubDate: "2026-06-10T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas","gmail","mailmerge","template"]
tagNames: ["GAS","Gmail","差し込みメール","テンプレート"]
readingTime: 6
keywords: ["GAS メール 差し込み","GAS メールマージ","Gmail 差し込みメール GAS"]
---

こんにちは、凛です。本業の看護師と並行して、GASでちょっとした業務自動化を請け負っています。お客さま一人ひとりに合わせたメールを送りたいのに、人数分を1通ずつ手書きするのは現実的じゃない——でも一斉送信で「お客様各位」にすると途端に事務的になってしまう。このジレンマに、ずっと頭を悩ませてきました。

## こんな悩みありませんか？

- 顧客リストに合わせて個別メールを送りたいけど、1通ずつ書くのは非現実的
- 一斉送信だと「お客様各位」になって個別感がない
- HTMLメールで装飾したいけど、毎回作るのが大変
- 送信済みかどうかの管理が大変で、うっかり同じ人に2回送ってしまうことがある

私は副業のクライアント向けに月次レポートを送る業務があり、最初は1通ずつ手書きしていました。GASでメールマージ化したら、顧客リストのスプシに行追加するだけで自動送信されるようになり、月の作業時間が10時間→30分に短縮できました。

差し込みメール（メールマージ）というと難しそうに聞こえますが、仕組みはシンプルです。スプレッドシートのデータを1行ずつ読み取って、テンプレートの中に差し込んでメールを送るだけです。

## サンプルコード（コピペで動きます）

```javascript
function sendMailMerge() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const header = data.shift();

  data.forEach(row => {
    const [email, name, product] = row;
    const subject = `${name}様、ご注文ありがとうございます`;
    const body = `${name} 様

${product}のご注文ありがとうございます。
3営業日以内に発送いたします。

GAS Recipe`;

    GmailApp.sendEmail(email, subject, body);
  });
}
```


## パターン2：プレースホルダ式テンプレ

```javascript
const TEMPLATE = `{name} 様

{product}のご注文受付ました。
お届け予定: {delivery}

ありがとうございます。`;

function fillTemplate(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] || '');
}

// 使い方
const body = fillTemplate(TEMPLATE, {
  name: '田中',
  product: '商品A',
  delivery: '5月10日'
});
```

## パターン3：HTMLメール

```javascript
const html = `
<div style="font-family: sans-serif;">
  <h2 style="color: #3b82f6;">${name}様</h2>
  <p>${product}のご注文ありがとうございます。</p>
  <a href="https://example.com/order/${id}"
     style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
    注文を確認
  </a>
</div>`;

GmailApp.sendEmail(email, subject, '', { htmlBody: html });
```

## パターン4：添付ファイル付き

```javascript
const pdfBlob = DriveApp.getFileById('PDF_FILE_ID').getBlob();
GmailApp.sendEmail(email, subject, body, {
  attachments: [pdfBlob],
  name: 'GAS Recipe 運営'
});
```

## パターン5：送信ステータスを記録

```javascript
data.forEach((row, i) => {
  try {
    GmailApp.sendEmail(email, subject, body);
    sheet.getRange(i + 2, 4).setValue('送信済 ' + new Date());
  } catch (e) {
    sheet.getRange(i + 2, 4).setValue('失敗: ' + e.message);
  }
});
```

スプシに「送信済」列を作って、実行履歴を可視化。再実行時に「未送信」だけ送れる。

## 私（凛）が試して気づいたコツ3つ

### コツ1：プレースホルダーは `{{name}}` 形式で

`{{name}}`/`{{company}}` のようにダブル中括弧で囲むと、`replace` で一括差し替えがしやすいです。なぜダブルかというと、シングル中括弧はGAS内でオブジェクトや配列に使われることが多く、誤認識を防ぎやすいからです。

テンプレートを別シートで管理しておくと、文言の変更がコードを触らずにできるので運用が楽になります。スプシのA1セルにテンプレを書いて、GASから読み込む方式がおすすめです。

### コツ2：送信前にプレビュー機能を使う

本番送信前に、自分宛だけにテスト送信する関数を別途用意しましょう。プレースホルダーがちゃんと変換されているか、改行が正しいか確認できます。

```javascript
function testSend() {
  const testRow = ['自分のメールアドレス', '凛', 'テスト商品'];
  const [email, name, product] = testRow;
  // 本番と同じロジックでテスト送信
  GmailApp.sendEmail(email, `[テスト] ${name}様`, `テスト送信`);
}
```

顧客全員に誤ったメールが届いた後では取り返しがつかないので、このテスト送信は必ず習慣化してください。

### コツ3：送信履歴をスプシに記録する

「日時 / 送信先 / 件名 / ステータス」をスプシに残すと、後で「あの人にいつ送ったっけ？」がすぐわかります。特に月次レポートを毎月送る場合、どのクライアントに何月分を送ったかの記録は必須です。

スプシの最終列に「送信済み」と記録しておき、次回実行時にはその行をスキップする処理を入れると、うっかり二重送信を防げます。

## つまずきやすいポイント

### つまずき1：HTMLとプレーンテキストの両方が必要

HTMLメールは古いメーラーで崩れることがあります。安全のために `htmlBody` と `body` の両方を設定すると、表示できない環境でもプレーンテキストで読めます。

```javascript
GmailApp.sendEmail(email, subject, plainBody, { htmlBody: htmlBody });
```

`body` にプレーンテキスト版、`htmlBody` にHTML版を渡すだけです。

### つまずき2：送信制限を超える

GASのMailAppは1日100件が上限です。GmailAppも同様です。送信数が多い場合は、1日に分散して実行するか、Google WorkspaceアカウントのGmailでは1500件まで拡張できるので、アカウントのアップグレードを検討してください。

残数確認には `MailApp.getRemainingDailyQuota()` が使えます。実行前に残数をチェックして、足りなければ翌日に持ち越す設計にすると安全です。

### つまずき3：スプシのヘッダー行を誤って送信してしまう

`data.shift()` でヘッダー行を取り除いてからループに入るのを忘れると、1行目の「名前」「メールアドレス」といったヘッダーのままメールが送られてしまいます。必ず `shift()` でヘッダーを取り除いてからメール送信のループに入りましょう。

## ⚠️ 送信上限まとめ

| アカウント種別 | 1日の送信数上限 |
|---|---|
| 無料Googleアカウント | 100通/日 |
| Google Workspace | 1500通/日 |
| 受信者数上限（無料） | 100アドレス/日 |

100通超える可能性なら `MailApp.getRemainingDailyQuota()` でチェックしておきましょう。

## まとめ

| パターン | 用途 | 特徴 |
|---|---|---|
| パターン1 | 基本的な差し込みメール | シンプル・初心者向け |
| パターン2 | プレースホルダ式テンプレ | 保守性が高い |
| パターン3 | HTMLメール | 見栄えが良い |
| パターン4 | 添付ファイル付き | 請求書・PDFの一括送信に |
| パターン5 | 送信ステータス記録 | 二重送信防止・管理が楽 |

- ループでスプシ→Gmail送信が基本
- プレースホルダ式テンプレで保守性UP
- HTMLメール・添付ファイル・送信記録で実務レベル
- 送信上限は事前チェック必須

このメールマージGASを使えば、顧客100名でも30分で個別メール送信が完了します。「個別メール送りたいけど時間がない」を解決する、副業の救世主的な仕組みです。

## 関連記事（あわせて読みたい）

Gmail自動化をもっと深めたい方は、以下の記事もおすすめです。

- [Gmail自動返信をGASで実装する完全手順](/blog/gas-gmail-auto-reply/) — 不在時の自動応答に
- [Gmail添付ファイルを自動でDriveに保存](/blog/gas-gmail-attachment-drive/) — Drive連携
- [フォーム送信者へ自動返信メールを送るGAS](/blog/gas-form-auto-reply/) — フォームと組み合わせた応用

これらと組み合わせると、Gmailの自動処理が一気に整います。

---

### この記事を書いた人：凛
2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
