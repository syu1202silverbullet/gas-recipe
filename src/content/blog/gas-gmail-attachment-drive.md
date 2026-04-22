---
title: "Gmail添付ファイルをGoogleドライブに自動保存するGAS"
description: "毎日届くPDF請求書・領収書をGASで自動的にGoogleドライブに整理保存する仕組みを解説。年月フォルダ自動生成・重複防止・処理済みラベル管理も含む完全版コード付き。"
pubDate: "2026-04-30T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas", "gmail", "drive", "attachment"]
tagNames: ["GAS", "Gmail", "Drive", "添付ファイル"]
readingTime: 5
---
「毎月届くクレカ明細PDF」「取引先からの請求書」「子供の学校からのお便りPDF」。これらをGmailから1つずつダウンロードしてドライブに整理…もう手作業はやめましょう。

本記事では、**Gmailの特定メールに添付されているファイルを、自動でGoogleドライブの指定フォルダに保存する**GASコードを紹介します。

## この仕組みでできること

- 毎月のクレカ明細PDFを「明細/2026年」フォルダに自動保存
- 請求書メールの添付を「請求書/取引先別」で仕分け
- 学校からのプリントを「学校/月別」に整理
- 確定申告用の領収書を「経費/年月別」に自動分類

## 基本コード

```javascript
function saveAttachmentsToDrive() {
  const query = 'has:attachment from:kaden@card.co.jp -label:保存済 newer_than:30d';
  const threads = GmailApp.search(query, 0, 20);

  const rootFolder = DriveApp.getFoldersByName('明細').next();

  threads.forEach(thread => {
    thread.getMessages().forEach(msg => {
      const attachments = msg.getAttachments();
      const yearMonth = Utilities.formatDate(msg.getDate(), 'Asia/Tokyo', 'yyyy-MM');

      // 年月フォルダを作成 or 取得
      let yearMonthFolder;
      const folders = rootFolder.getFoldersByName(yearMonth);
      if (folders.hasNext()) {
        yearMonthFolder = folders.next();
      } else {
        yearMonthFolder = rootFolder.createFolder(yearMonth);
      }

      attachments.forEach(att => {
        yearMonthFolder.createFile(att);
      });
    });

    // 処理済みラベル付与
    const label = GmailApp.getUserLabelByName('保存済') || GmailApp.createLabel('保存済');
    thread.addLabel(label);
  });
}
```

## コードの仕組み

1. **Gmail検索** で「添付あり × 特定差出人 × 未処理」を絞り込む
2. 各メッセージの**添付ファイル全て**を取得
3. メールの日付から**年月フォルダを作成**（既存ならそれを使用）
4. フォルダにファイルを保存
5. スレッドに**「保存済」ラベル**を付与して重複防止

## 抑えておきたい3つのポイント

### ポイント1: 検索クエリを厳密に

広すぎるクエリだと関係ないメールの添付まで保存してしまいます。

```javascript
// NG（広すぎ）
const query = 'has:attachment';

// OK（差出人＋ラベル除外＋期間で絞り込み）
const query = 'has:attachment from:kaden@card.co.jp -label:保存済 newer_than:30d';
```

### ポイント2: 年月フォルダで整理する

何ヶ月分もまとめて1フォルダに入れると後で探すのが大変。日付から `yyyy-MM` 形式のサブフォルダを自動生成するのが鉄板。

### ポイント3: 処理済みラベルを必ず使う

ラベルがないと、実行のたびに全てのメールを再処理してしまいます。

## 応用：差出人ごとに別フォルダへ振り分け

```javascript
const rules = [
  { from: 'amazon.co.jp', folder: '通販' },
  { from: 'kaden.co.jp', folder: 'クレカ明細' },
  { from: '@school.jp', folder: '学校' },
];

threads.forEach(thread => {
  const from = thread.getMessages()[0].getFrom();
  const rule = rules.find(r => from.includes(r.from));
  if (!rule) return;
  const rootFolder = DriveApp.getFoldersByName(rule.folder).next();
  // ...保存処理
});
```

## 応用：ファイル名を日付＋元ファイル名に変更

```javascript
const date = Utilities.formatDate(msg.getDate(), 'Asia/Tokyo', 'yyyyMMdd');
const newName = `${date}_${att.getName()}`;
yearMonthFolder.createFile(att.copyBlob().setName(newName));
```

これで同じ「領収書.pdf」が複数あっても上書きされません。

## トリガー設定：毎日深夜2時に自動実行

1. GASエディタ → ⏰トリガー → ＋追加
2. 関数: `saveAttachmentsToDrive`
3. 時間主導型: 日付ベース、午前2〜3時

これで毎日自動で、前日までの添付がドライブに整理されます。

## トラブル：容量オーバー

Gmail+ドライブは合計15GB無料。添付が多いと意外と早く埋まります。

**対策**:
- 保存後、元メールの添付を削除する（自動）
- 古いファイルを定期削除する仕組みを併用

## 看護師の私の使い方

介護用品・医療用品の領収書を大量に受け取るので、それらを**「経費_年月」フォルダに自動振り分け**しています。確定申告の時期に「あのレシートどこだっけ…」と探す時間がゼロになりました。副業ブログのサーバー代とかも同じ仕組みで自動整理。

## まとめ

添付ファイルの自動整理は、**家計管理・確定申告・仕事の書類管理**すべてに効く超万能自動化です。一度作れば半永久的に動くので、早めに仕組み化することをおすすめします。

関連記事: [レシートOCR自動集計](/blog/gas-receipt-ocr-tax/) / [トリガー完全ガイド](/blog/gas-trigger-setup/)
