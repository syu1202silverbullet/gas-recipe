---
title: "GASでGoogleドライブフォルダ自動作成5例｜階層・命名・権限まで"
description: "GASでドライブフォルダを自動作成する5パターンを凛が解説。プロジェクト別・月別・顧客別フォルダ構造の自動生成。"
pubDate: "2026-06-26T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","drive","folder"]
tagNames: ["GAS","ドライブ","フォルダ"]
readingTime: 5
keywords: ["GAS ドライブ フォルダ 作成"]
---

## 例1: 単一フォルダ作成

```javascript
const folder = DriveApp.createFolder('新規プロジェクト');
```

## 例2: 親フォルダ指定

```javascript
const parent = DriveApp.getFolderById('PARENT_ID');
const child = parent.createFolder('サブフォルダ');
```

## 例3: 月別フォルダ自動生成

```javascript
function createMonthlyFolder() {
  const root = DriveApp.getFolderById('ROOT_ID');
  const yearFolder = getOrCreate(root, new Date().getFullYear() + '');
  const monthFolder = getOrCreate(yearFolder, (new Date().getMonth() + 1) + '月');
  return monthFolder;
}

function getOrCreate(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}
```

## 例4: スプシ顧客リスト→フォルダ一括生成

```javascript
function createClientFolders() {
  const data = SpreadsheetApp.getActiveSheet().getDataRange().getValues();
  data.shift();
  const root = DriveApp.getFolderById('CLIENTS_ROOT');
  data.forEach(([clientName]) => {
    if (!root.getFoldersByName(clientName).hasNext()) {
      root.createFolder(clientName);
    }
  });
}
```

## 例5: 共有設定付き作成

```javascript
const folder = parent.createFolder('共有用');
folder.addEditor('partner@example.com');
folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
```

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
