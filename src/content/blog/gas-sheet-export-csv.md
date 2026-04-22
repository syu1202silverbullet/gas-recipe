---
title: "スプシをCSV出力してドライブ保存するGAS｜会計ソフト連携の定番"
description: "スプシを自動でCSV化してDriveに保存するGAS実装を凛が解説。会計ソフトインポート・データ受け渡しに。"
pubDate: "2026-06-25T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","csv","export","drive"]
tagNames: ["GAS","スプレッドシート","CSV","出力"]
readingTime: 5
keywords: ["GAS CSV 出力","GAS スプシ CSV"]
---

```javascript
function exportToCsv() {
  const sheet = SpreadsheetApp.openById('SHEET_ID').getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const csv = data.map(row =>
    row.map(cell => {
      const s = String(cell).replace(/"/g, '""');
      return /[,\n"]/.test(s) ? `"${s}"` : s;
    }).join(',')
  ).join('\n');

  const blob = Utilities.newBlob('\uFEFF' + csv, 'text/csv', `export_${Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd')}.csv`);
  DriveApp.getFolderById('FOLDER_ID').createFile(blob);
}
```

`\uFEFF` はBOM（Excelで文字化け防止）。

毎月末トリガー → 月次CSV自動生成 → 会計ソフトに取り込み、まで自動化可能。

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
