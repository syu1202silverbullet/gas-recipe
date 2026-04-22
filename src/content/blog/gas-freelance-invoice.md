---
title: "フリーランス請求書をGASで毎月自動発行する仕組み"
description: "GASで請求書PDFを毎月自動生成・メール送信する仕組みを丸ごと解説。看護師副業ママが確定申告まで楽にしている実例コード付きです。"
pubDate: "2026-05-02T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "side-business"
categoryName: "副業・確定申告"
tagSlugs: ["gas", "invoice", "freelance"]
tagNames: ["GAS", "請求書", "フリーランス"]
readingTime: 9
---
こんにちは、看護師のみっちゃんです。今日は私がGAS副業を始めてから一番やってよかったと感じている「請求書の自動発行」について、仕組みを丸ごとお見せします。

## こんな悩みありませんか？

- 毎月末の請求書作成が地味に面倒
- 送り忘れて入金が翌々月にずれ込んだ
- 確定申告時に請求書データを探すのが辛い
- 夜勤続きだと月末処理なんてやる気にならない

私もフリーランスを始めた頃、手作業で請求書を作って添付して送って…を繰り返していました。3社以上になった月は本当にキツく、「これ自動化できないの？」と思ってGASで組んだのが今回の仕組みです。

## 全体像

仕組みはシンプルに3つのパーツでできています。

1. **請求元データ**をスプシの1シートに集約
2. **請求書テンプレート**をGoogleドキュメントで用意
3. **GAS**がシートを読み、テンプレをコピー→値を差し込み→PDF化→メール送信→記録更新

月1回、毎月25日に自動実行にすれば、あとは届いたPDFを確認してクライアントへ送るだけ（自分自身の最終確認のステップは残します）。

## スプレッドシートの設計

請求管理シートに以下の列を用意します。

| 列 | 内容 |
| --- | --- |
| A | クライアント名 |
| B | 宛先メール |
| C | 単価 |
| D | 稼働時間 |
| E | 件名 |
| F | 振込先 |
| G | 今月送付済み(TRUE/FALSE) |
| H | 最終送付日 |

これだけで十分運用できます。

## テンプレートドキュメントの用意

Googleドキュメントで請求書テンプレを作り、差し込みたい場所に`{{クライアント名}}`や`{{金額}}`といったプレースホルダーを入れておきます。私は「稼働報告書つき請求書」として、病棟の勤務記録感覚で項目を並べています。

## 請求書を自動生成するコード

```javascript
const CONFIG = {
  SHEET_ID: 'スプシID',
  TEMPLATE_DOC_ID: 'テンプレドキュメントID',
  OUTPUT_FOLDER_ID: '出力用フォルダID',
  FROM_NAME: '佐藤',
  MY_EMAIL: 'you@example.com'
};

function issueMonthlyInvoices() {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const header = data.shift();
  const today = new Date();
  const ym = Utilities.formatDate(today, 'JST', 'yyyyMM');

  data.forEach((row, i) => {
    const [client, email, price, hours, subject, bank, sent] = row;
    if (sent || !client) return;

    const amount = price * hours;
    const tax = Math.floor(amount * 0.1);
    const total = amount + tax;

    const pdf = buildInvoicePdf({
      client, amount, tax, total, hours, price, bank, ym
    });

    sendInvoiceMail(email, client, subject, pdf);

    sheet.getRange(i + 2, 7).setValue(true);
    sheet.getRange(i + 2, 8).setValue(today);
  });
}
```

## PDF生成と差し込み処理

```javascript
function buildInvoicePdf(params) {
  const folder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
  const copy = DriveApp.getFileById(CONFIG.TEMPLATE_DOC_ID)
    .makeCopy(`請求書_${params.client}_${params.ym}`, folder);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();

  body.replaceText('{{クライアント名}}', params.client);
  body.replaceText('{{年月}}', params.ym);
  body.replaceText('{{単価}}', params.price.toLocaleString());
  body.replaceText('{{時間}}', params.hours);
  body.replaceText('{{小計}}', params.amount.toLocaleString());
  body.replaceText('{{消費税}}', params.tax.toLocaleString());
  body.replaceText('{{合計}}', params.total.toLocaleString());
  body.replaceText('{{振込先}}', params.bank);

  doc.saveAndClose();
  const pdfBlob = copy.getAs('application/pdf')
    .setName(`請求書_${params.client}_${params.ym}.pdf`);
  folder.createFile(pdfBlob);
  return pdfBlob;
}
```

## メール送信

```javascript
function sendInvoiceMail(to, client, subject, pdf) {
  GmailApp.createDraft(to, `【請求書】${subject}`,
    `${client} 様\n\nお世話になっております。${CONFIG.FROM_NAME}です。\n`
    + '今月分の請求書をお送りいたします。ご確認のほど、よろしくお願いいたします。',
    {
      attachments: [pdf],
      name: CONFIG.FROM_NAME,
      cc: CONFIG.MY_EMAIL
    }
  );
}
```

いきなり`sendEmail`にせず、まずは`createDraft`で下書きに保存するのがポイント。夜勤明けでも最終チェックだけはして、自分で送信ボタンを押す運用にしています。看護の世界でも最終確認は人間がやる、それと同じ感覚です。

## 押さえておきたい3つのポイント

### ポイント1: 下書き保存で最終確認を残す

自動送信は事故のもと。私は「生成は自動、送信だけ手動」のハイブリッド運用にしています。

### ポイント2: 送付済みフラグで二重送信防止

シートのG列に`TRUE`を立てることで、同月内にスクリプトを誤って再実行しても請求書が二重で作られません。

### ポイント3: 出力フォルダを年月で分ける

```javascript
function getMonthFolder(parent, ym) {
  const folders = parent.getFoldersByName(ym);
  return folders.hasNext() ? folders.next() : parent.createFolder(ym);
}
```

年月ごとにサブフォルダに整理しておくと、確定申告時の証憑探しが圧倒的に楽になります。

## 応用:確定申告用CSVまで自動化

マネーフォワード確定申告に取り込めるCSVも、同じデータから自動出力できます。

```javascript
function exportTaxCsv(year) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  data.shift();
  const rows = [['日付','借方勘定科目','金額','取引先','摘要']];
  data.forEach(r => {
    const [client, , price, hours, , , , sentDate] = r;
    if (!sentDate) return;
    const d = new Date(sentDate);
    if (d.getFullYear() !== year) return;
    rows.push([
      Utilities.formatDate(d,'JST','yyyy/MM/dd'),
      '売掛金',
      price * hours,
      client,
      'GAS開発業務'
    ]);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  DriveApp.createFile(`tax_${year}.csv`, csv, 'text/csv');
}
```

私は毎年1月にこれを実行して、そのまま取り込み。2月の確定申告がほぼ「確認するだけ」になりました。

## まとめ

- スプシ+Docsテンプレ+GASで請求書フローは完全自動化できる
- `createDraft`で最終チェックの余地を残すのが安心運用
- 送付済みフラグで二重送信防止
- 年月フォルダで証憑を整理、確定申告用CSVも自動化

看護師として病棟に立ちながら副業を続けるには、「考えなくても回る仕組み」が不可欠です。毎月の請求書発行は、まさに自動化の恩恵を一番感じやすい領域。ぜひあなたの副業にも取り入れてみてください。

## 関連記事

- [GAS setValuesで1000行を一括書き込む高速化テクニック](/blog/gas-sheet-setvalues-bulk/)
- [スプシ重複行を自動削除するGAS完全版コード](/blog/gas-sheet-dedupe/)
- [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)
