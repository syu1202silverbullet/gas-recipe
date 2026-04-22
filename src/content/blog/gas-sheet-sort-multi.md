---
title: "複数条件ソートをGASで自動化する7行｜売上TOP・優先度別並び替え"
description: "GASでスプシを複数条件ソートする実装を凛が解説。売上降順×日付昇順など実務パターン。"
pubDate: "2026-06-22T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","sort"]
tagNames: ["GAS","スプレッドシート","ソート"]
readingTime: 4
keywords: ["GAS ソート","GAS スプシ 並び替え"]
---

```javascript
function multiSort() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  range.sort([
    { column: 3, ascending: false }, // 3列目（売上）降順
    { column: 1, ascending: true }   // 同売上なら1列目（日付）昇順
  ]);
}
```

## 動的に列を選ぶ場合

```javascript
// ヘッダーから「売上」列を探す
const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
const salesCol = header.indexOf('売上') + 1;
range.sort({ column: salesCol, ascending: false });
```

毎日トリガーで自動並び替え→ダッシュボードが綺麗に。

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
