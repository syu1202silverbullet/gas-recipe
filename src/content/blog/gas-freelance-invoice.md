---
title: "フリーランス請求書をGASで毎月自動発行する仕組み"
description: "フリーランス・副業実践者向けに、毎月の請求書を自動発行するGoogle Apps Script実装を解説。テンプレ流し込み・PDF生成・メール送信までを全自動化するコード付き。"
pubDate: "2026-05-02T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "side-business"
categoryName: "副業・確定申告"
tagSlugs: ["gas", "invoice", "freelance"]
tagNames: ["GAS", "請求書", "フリーランス"]
readingTime: 6
---
「毎月末、請求書をWordで作って、取引先ごとにメール添付して送る」。フリーランスなら誰もが経験するこの作業、**GASで全自動化**できます。

本記事では、Googleスプレッドシートをテンプレートに、取引先ごとの請求書を**自動生成 → PDF化 → メール送信**までを一気通貫で行う仕組みを解説します。

## この仕組みでできること

- 毎月末に請求書を自動発行
- 取引先別に金額・品目を自動流し込み
- PDF化してメール添付
- 発行履歴をスプシに自動記録

所要時間: **月10分の作業が、月0分**になります。

## 全体構成

1. **テンプレートスプシ**: 請求書のフォーマット（宛名・金額・日付が差し替えられる）
2. **顧客マスタスプシ**: 取引先名・メアド・月額・品目
3. **GAS**: マスタを読み、テンプレを複製、PDF化、メール送信

## ステップ1: テンプレート準備

Googleスプレッドシートで請求書テンプレを作成。以下のような感じ:

```
請求書
発行日: {{date}}
宛先: {{company}} 様
件名: {{item}}
金額: {{amount}}円
```

`{{...}}` の部分を後からGASで置換します。

## ステップ2: 顧客マスタシート

| 会社名 | メール | 品目 | 月額 |
|---|---|---|---|
| A社 | a@example.com | Web保守 | 30000 |
| B社 | b@example.com | ライティング | 50000 |

## ステップ3: 自動化コード

```javascript
const TEMPLATE_ID = 'テンプレスプシのID';
const MASTER_ID = 'マスタスプシのID';
const OUTPUT_FOLDER_ID = '保存先フォルダのID';

function issueInvoices() {
  const master = SpreadsheetApp.openById(MASTER_ID).getActiveSheet();
  const customers = master.getDataRange().getValues();
  customers.shift();  // ヘッダー除外

  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');
  const yearMonth = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMM');

  customers.forEach(([company, email, item, amount]) => {
    // テンプレを複製
    const copy = DriveApp.getFileById(TEMPLATE_ID).makeCopy(
      `請求書_${yearMonth}_${company}`,
      DriveApp.getFolderById(OUTPUT_FOLDER_ID)
    );

    // 値を差し込み
    const ss = SpreadsheetApp.openById(copy.getId());
    const sheet = ss.getSheets()[0];
    const replacements = {
      '{{date}}': today,
      '{{company}}': company,
      '{{item}}': item,
      '{{amount}}': amount.toLocaleString()
    };
    Object.entries(replacements).forEach(([k, v]) => {
      sheet.createTextFinder(k).replaceAllWith(v);
    });

    // PDF化
    const pdf = copy.getAs('application/pdf').setName(`請求書_${yearMonth}_${company}.pdf`);
    DriveApp.getFolderById(OUTPUT_FOLDER_ID).createFile(pdf);

    // メール送信
    GmailApp.sendEmail(
      email,
      `【請求書】${yearMonth} ${item}のご請求`,
      `${company} ご担当者様\n\n今月分の請求書を添付いたします。\nご確認のほど、よろしくお願いいたします。`,
      { attachments: [pdf] }
    );
  });
}
```

## ステップ4: トリガー設定

毎月末に自動実行:

- 実行関数: `issueInvoices`
- 時間主導型: 月次
- 日付: 月末（28-31のどこか）
- 時刻: 午前10時

## 抑えておきたい3つのポイント

### ポイント1: テンプレ複製で元を汚さない

直接テンプレを編集してPDF化すると、翌月以降の差し替えが面倒。**必ず複製してから差し替え**。

### ポイント2: 送信履歴をスプシに記録

あとで「いつ誰に送った？」を追跡できるように、マスタに「送信日」列を追加：

```javascript
master.getRange(i + 2, 5).setValue(today);  // 5列目に送信日
```

### ポイント3: ドラフト保存にして最終確認

初回はいきなり送信せず、まず**ドラフト保存**で確認。

```javascript
GmailApp.createDraft(email, subject, body, { attachments: [pdf] });
```

問題なければ `sendEmail` に書き換え。

## 応用：源泉徴収・消費税計算

```javascript
const subtotal = amount;
const tax = Math.floor(subtotal * 0.1);
const total = subtotal + tax;
const withholding = Math.floor(subtotal * 0.1021);  // 源泉徴収10.21%
const payable = total - withholding;
```

## 応用：請求書番号の自動連番

```javascript
const props = PropertiesService.getScriptProperties();
const lastNo = Number(props.getProperty('lastInvoiceNo') || 0);
const nextNo = lastNo + 1;
const invoiceNo = `INV-${yearMonth}-${String(nextNo).padStart(3, '0')}`;
props.setProperty('lastInvoiceNo', String(nextNo));
```

## トラブル：「PDFが崩れる」

- **テンプレのフォント**がロケール依存フォントだと崩れる → 標準フォントに
- **グラフや画像**は印刷範囲を明示的に設定
- **PDF化時のシート選択**を明示

## 看護師×副業ライターの私の使い方

ライター業で月数社の取引先がいるので、**月末にワンクリックで全社分の請求書が送られる**仕組みを構築しました。夜勤続きの月でも請求書漏れがなくなり、入金もスムーズに。

さらに**freee連携**も追加し、発行した請求書を自動で会計ソフトに記帳しています。確定申告の時期に「あの案件、請求書送ったっけ？」と記憶を辿る時間がゼロに。

## まとめ

請求書自動発行は、**フリーランス・副業勢の時間を最も確実に取り戻す**GAS活用の代表例です。月末のルーティン作業から解放されるのは、本当に精神衛生上も良い変化でした。

おすすめクラウド会計ソフト:
- [freee会計]（請求書連携に強い）
- [マネーフォワードクラウド]（家計とも一元管理したい方向け）

※リンクは順次更新予定。

関連記事: [レシートOCR自動集計](/blog/gas-receipt-ocr-tax/) / [スプシ毎朝自動整え](/blog/gas-spreadsheet-daily-auto/)
