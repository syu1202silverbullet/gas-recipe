---
title: "GASでGoogleドライブのファイルを自動整理する"
description: "GASでGoogleドライブ内のファイルを種類・日付でフォルダ分けして自動整理する方法を、現役ナースの凛が解説。コピペで使えるコード付き。"
pubDate: "2026-06-05T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "drive"
categoryName: "Googleドライブ"
tagSlugs: ["gas","drive","automation","organize"]
tagNames: ["GAS","Googleドライブ","自動化","ファイル整理"]
readingTime: 8
keywords: ["GAS ドライブ 自動整理","GAS Googleドライブ フォルダ分け","Google Apps Script Drive"]
---

こんにちは、家事と育児と看護師業の合間にGASを楽しんでいる凛です。Googleドライブ、気づいたらファイルが散らかり放題になっていませんか？今日は**GASでGoogleドライブのファイルを自動整理する方法**を紹介します。

「GAS ドライブ 自動整理」で検索してここに来た方が、読み終わったらすぐ動かせるレベルで書いています。

## こんな悩みありませんか？

- 「ダウンロードフォルダのようにドライブがカオスになってきた」
- 「月ごと・種類ごとにフォルダ分けしたいけど手動は面倒」
- 「毎週バックアップしたファイルを自動で整頓したい」

夜勤明けにドライブを開いたら、ファイルが綺麗に整理されている。そんな状態をGASで作れます。

## DriveAppで使える主な操作

| メソッド | 説明 |
|---|---|
| `DriveApp.getFolderById(id)` | IDでフォルダを取得 |
| `DriveApp.getFileById(id)` | IDでファイルを取得 |
| `folder.getFiles()` | フォルダ内のファイル一覧 |
| `folder.createFolder(name)` | サブフォルダを作成 |
| `file.moveTo(folder)` | ファイルを別フォルダに移動 |
| `file.getName()` | ファイル名を取得 |
| `file.getMimeType()` | MIMEタイプを取得 |
| `file.getDateCreated()` | 作成日時を取得 |

## GASコード（静的検証済み）

### 基本：拡張子でフォルダ分け

```javascript
// 指定フォルダ内のファイルを種類別に自動整理する
function organizeByType() {
  // 整理対象フォルダのID（DriveのURLの末尾）
  const sourceFolderId = PropertiesService.getScriptProperties()
    .getProperty('SOURCE_FOLDER_ID');
  if (!sourceFolderId) {
    console.error('[organizeByType] SOURCE_FOLDER_IDが設定されていません');
    return;
  }

  const sourceFolder = DriveApp.getFolderById(sourceFolderId);
  const files = sourceFolder.getFiles();

  // MIMEタイプ → 振り分け先フォルダ名のマッピング
  const typeMap = {
    'application/pdf': 'PDF',
    'image/jpeg': '画像',
    'image/png': '画像',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/vnd.google-apps.spreadsheet': 'スプレッドシート',
    'application/vnd.google-apps.document': 'ドキュメント'
  };

  let movedCount = 0;
  while (files.hasNext()) {
    const file = files.next();
    const mimeType = file.getMimeType();
    const folderName = typeMap[mimeType] || 'その他';

    // 振り分け先フォルダを取得または作成
    const destFolder = getOrCreateFolder(sourceFolder, folderName);
    file.moveTo(destFolder);
    movedCount++;
    console.log('[organizeByType] 移動:', file.getName(), '→', folderName);
  }

  console.log('[organizeByType] 完了 移動ファイル数:', movedCount);
}

// フォルダを取得（なければ作成）するヘルパー
function getOrCreateFolder(parentFolder, folderName) {
  const existing = parentFolder.getFoldersByName(folderName);
  if (existing.hasNext()) {
    return existing.next();
  }
  return parentFolder.createFolder(folderName);
}
```

**静的検証結果：**
- `DriveApp.getFolderById` / `getFiles` / `moveTo`：✅ DriveApp APIの正しい使い方
- `getFoldersByName` でフォルダ存在確認 → なければ `createFolder`：✅ 重複フォルダを作らない安全設計
- フォルダIDはスクリプトプロパティから取得：✅ コードに直書きしない安全設計

### 応用：日付（年月）でフォルダ分け

```javascript
// ファイルの作成日時で「2026-06」のような年月フォルダに整理する
function organizeByMonth() {
  const sourceFolderId = PropertiesService.getScriptProperties()
    .getProperty('SOURCE_FOLDER_ID');
  if (!sourceFolderId) {
    console.error('[organizeByMonth] SOURCE_FOLDER_IDが設定されていません');
    return;
  }

  const sourceFolder = DriveApp.getFolderById(sourceFolderId);
  const files = sourceFolder.getFiles();
  let movedCount = 0;

  while (files.hasNext()) {
    const file = files.next();
    const created = file.getDateCreated();
    const folderName = Utilities.formatDate(created, 'Asia/Tokyo', 'yyyy-MM');

    const destFolder = getOrCreateFolder(sourceFolder, folderName);
    file.moveTo(destFolder);
    movedCount++;
    console.log('[organizeByMonth] 移動:', file.getName(), '→', folderName);
  }

  console.log('[organizeByMonth] 完了 移動ファイル数:', movedCount);
}
```

### 実用：古いファイルをアーカイブフォルダに移動

```javascript
// 指定日数以上更新されていないファイルをアーカイブフォルダへ
function archiveOldFiles() {
  const sourceFolderId = PropertiesService.getScriptProperties()
    .getProperty('SOURCE_FOLDER_ID');
  if (!sourceFolderId) {
    console.error('[archiveOldFiles] SOURCE_FOLDER_IDが設定されていません');
    return;
  }

  const ARCHIVE_DAYS = 90; // 90日以上更新がないファイルをアーカイブ
  const now = new Date();
  const threshold = new Date(now.getTime() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000);

  const sourceFolder = DriveApp.getFolderById(sourceFolderId);
  const archiveFolder = getOrCreateFolder(sourceFolder, 'アーカイブ');
  const files = sourceFolder.getFiles();
  let archivedCount = 0;

  while (files.hasNext()) {
    const file = files.next();
    const lastUpdated = file.getLastUpdated();
    if (lastUpdated < threshold) {
      file.moveTo(archiveFolder);
      archivedCount++;
      console.log('[archiveOldFiles] アーカイブ:', file.getName(),
        '最終更新:', lastUpdated.toLocaleDateString('ja-JP'));
    }
  }

  console.log('[archiveOldFiles] 完了 アーカイブ数:', archivedCount);
}
```

## フォルダIDの確認方法

GoogleドライブでフォルダをブラウザでURL確認します。

```
https://drive.google.com/drive/folders/★ここがフォルダID★
```

このIDをスクリプトプロパティ `SOURCE_FOLDER_ID` に保存します。

## 自動実行の設定

毎週日曜日に自動整理を走らせる設定例：

```javascript
// トリガーを設置するセットアップ関数（一度だけ実行）
function setupWeeklyTrigger() {
  // 既存のトリガーを削除してから再作成
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'organizeByMonth') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('organizeByMonth')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(3)
    .create();

  console.log('[setupWeeklyTrigger] 週次トリガーを設定しました');
}
```

`setupWeeklyTrigger` を一度手動実行するだけで、以降は毎週日曜3時に自動整理されます。

## まとめ

- `DriveApp` でフォルダ・ファイルの取得・移動ができる
- `getOrCreateFolder` ヘルパーで重複フォルダを防ぐ
- 種類別・日付別・更新日別など目的に合わせて整理ルールを選ぶ
- トリガーで定期自動実行すれば完全放置でドライブが整理される

毎週日曜の深夜にGASが自動でドライブを整理してくれる。月曜の朝は常にスッキリした状態から始められます。

## 関連記事

- [GASでGoogleドライブをバックアップする週次スクリプト](/blog/gas-drive-backup-weekly/)
- [GASでGoogleドライブにフォルダを自動作成する](/blog/gas-drive-folder-create/)
- [GASで不要ファイルをドライブからまとめて削除する](/blog/gas-drive-cleanup/)
- [GASでSlack通知を送る](/blog/gas-slack-notify/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。DriveApp APIの仕様変更は公式ドキュメントで最新情報をご確認ください。
