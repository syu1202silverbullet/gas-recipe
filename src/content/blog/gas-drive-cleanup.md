---
title: "古いファイルを自動削除するドライブGAS｜容量圧迫回避"
description: "ドライブの古いファイルを自動でゴミ箱移動するGAS実装を凛が解説。最終更新N日経過で自動アーカイブ。"
pubDate: "2026-06-28T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","drive","cleanup"]
tagNames: ["GAS","ドライブ","削除"]
readingTime: 4
keywords: ["GAS ドライブ 削除 自動"]
---

```javascript
function autoCleanup() {
  const FOLDER_ID = 'TARGET_FOLDER_ID';
  const DAYS_OLD = 365; // 1年経過したら削除
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_OLD);

  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFiles();
  let deleted = 0;
  while (files.hasNext()) {
    const f = files.next();
    if (f.getLastUpdated() < cutoff) {
      f.setTrashed(true);
      deleted++;
    }
  }

  console.log(`${deleted}件をゴミ箱に移動`);
}
```

`setTrashed(true)` はゴミ箱に入るだけで30日後に自動完全削除。誤削除リカバリ可能。

毎月1回トリガーで運用。ドライブ容量カツカツの方は試す価値大。

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
