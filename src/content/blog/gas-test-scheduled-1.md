---
title: "GASスプレッドシート自動バックアップ設定方法"
description: "GASでスプレッドシートを毎日自動バックアップする方法を解説。トリガー設定からDriveへの保存まで実務コード付きで紹介します。"
pubDate: "2026-05-12T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","spreadsheet","backup","trigger"]
tagNames: ["GAS","スプレッドシート","バックアップ","トリガー"]
readingTime: 8
keywords: ["GAS バックアップ","GAS スプレッドシート","GAS 自動化"]
---

## はじめに

GASを使えばスプレッドシートの自動バックアップが簡単に実現できます。

## 実装コード

```javascript
function backupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const folder = DriveApp.getFolderById('YOUR_FOLDER_ID');
  const name = ss.getName() + '_' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
  ss.copy(name).moveTo(folder);
  Logger.log('バックアップ完了: ' + name);
}
```

## トリガー設定

1. スクリプトエディタを開く
2. 時計アイコン（トリガー）をクリック
3. 時間ベースのトリガーを追加（毎日実行）
