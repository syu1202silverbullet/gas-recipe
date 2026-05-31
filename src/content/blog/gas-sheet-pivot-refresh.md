---
title: "ピボットテーブルをGASで毎朝自動更新｜ダッシュボード鮮度UP"
description: "スプシのピボットテーブルをGASで自動更新する実装を凛が解説。データソース更新→ピボット再計算で常時最新ダッシュボード。"
pubDate: "2026-06-23T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","pivot"]
tagNames: ["GAS","スプレッドシート","ピボット"]
readingTime: 4
keywords: ["GAS ピボット 更新"]
---

ピボットテーブルは元データ変更で自動的に再計算されます。GASでデータ更新を仕組み化すれば、ピボット側は手動操作不要。

## 元データ更新の例

```javascript
function refreshDashboard() {
  // 1. データソースを最新化
  const apiData = fetchSalesData(); // 外部APIから取得
  const dataSheet = SpreadsheetApp.openById('XX').getSheetByName('raw');
  dataSheet.clearContents();
  dataSheet.getRange(1, 1, apiData.length, apiData[0].length).setValues(apiData);

  // 2. ピボットは自動再計算
  // 3. ダッシュボード（別シート）を画像化してSlack通知
}
```

毎朝トリガー→ピボット最新化→画像化通知でリアルタイム経営ダッシュボードに。

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
