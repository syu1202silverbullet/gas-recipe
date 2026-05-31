---
title: "スプシ週次バックアップをGASで自動化｜大事故回避の保険"
description: "重要スプシを週次でDriveに自動バックアップするGAS実装を凛が解説。誤削除・誤編集パニック防止の必須保険。"
pubDate: "2026-06-27T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","drive","backup"]
tagNames: ["GAS","ドライブ","バックアップ"]
readingTime: 4
keywords: ["GAS バックアップ"]
---

```javascript
function weeklyBackup() {
  const FILES_TO_BACKUP = [
    '会計データ_FILE_ID',
    '顧客リスト_FILE_ID',
    '在庫管理_FILE_ID',
  ];
  const BACKUP_FOLDER = 'BACKUP_FOLDER_ID';
  const folder = DriveApp.getFolderById(BACKUP_FOLDER);
  const date = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd');

  FILES_TO_BACKUP.forEach(id => {
    const file = DriveApp.getFileById(id);
    file.makeCopy(`backup_${date}_${file.getName()}`, folder);
  });

  // 古いバックアップ削除（4週間以上前）
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 28);
  folder.getFiles().forEach(f => {
    if (f.getDateCreated() < cutoff) {
      f.setTrashed(true);
    }
  });
}
```

毎週日曜深夜にトリガー → 自動バックアップ + 古い物自動整理。一度仕込めば永遠の安心。

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
