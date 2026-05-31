---
title: "範囲保護をGASで動的に掛ける実務テク｜編集禁止セルの自動管理"
description: "GASでスプシの範囲保護を動的に設定する実務テクを凛が解説。役割別保護・期間限定編集ロックなど。"
pubDate: "2026-06-24T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","protection"]
tagNames: ["GAS","スプレッドシート","保護"]
readingTime: 4
keywords: ["GAS シート 保護"]
---

```javascript
function protectRange() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getRange('A1:C10');
  const protection = range.protect().setDescription('編集禁止: 集計式');

  // 自分以外を編集不可に
  const me = Session.getEffectiveUser();
  protection.removeEditors(protection.getEditors());
  if (protection.canDomainEdit()) protection.setDomainEdit(false);
  protection.addEditor(me);
}

function unprotectAll() {
  SpreadsheetApp.getActiveSheet()
    .getProtections(SpreadsheetApp.ProtectionType.RANGE)
    .forEach(p => p.remove());
}
```

「月次締めの後はデータ編集禁止」みたいな運用に便利。

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
