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

こんにちは、家事と育児と看護師業の合間にGASを楽しんでいる凛です。

最初に白状します。私のGoogleドライブは、長いあいだ「第二のダウンロードフォルダ」でした。PDFも画像もスプレッドシートも、とりあえず全部ルートに放り込む。「あとで整理しよう」と思ったまま数か月。目当てのファイルを探すのに検索窓が手放せなくて、スクロールしながら小さくため息をつく毎日でした。

一念発起して手動で整理したことも、実はあります。フォルダを作って、ドラッグして、名前を揃えて。最初の30分は気持ちいいんです。でも、続きませんでした。しばらくすると、また元通り。

## 散らからない仕組みは「意志力」では作れない

原因を考えてみると単純で、ファイル整理って「今やらなくても困らない作業」なんですよね。疲れている日ほど後回しになる。後回しにした分だけ散らかって、ますます手を付けたくなくなる。完全に悪循環です。

そこで発想を変えました。自分が整理するのをやめて、GASに任せる。整理のルールを一度だけコードに書いておけば、あとは寝ている間に勝手に片付けてくれます。この記事では、そのまま使える形で「種類別」「年月別」「アーカイブ」の3パターンの整理スクリプトを載せておきます。

## 今回使うDriveAppの操作

コードに入る前に、登場するメソッドだけ先にまとめておきます。ここは読み飛ばして、あとで辞書代わりに戻ってきてもらっても大丈夫です。

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

## パターン1：種類別にフォルダへ振り分ける

まずは一番わかりやすい「PDFはPDFフォルダへ、画像は画像フォルダへ」という整理から。

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

ポイントは2つあります。1つ目は、振り分け先のフォルダを `getFoldersByName` で探して、なければ作る `getOrCreateFolder` ヘルパー。これがないと、実行のたびに同じ名前のフォルダが量産されてしまいます。2つ目は、対象フォルダのIDをコードに直書きせず、スクリプトプロパティ `SOURCE_FOLDER_ID` から読んでいること。対象フォルダを変えたくなったときにコードを触らずに済みますし、コードを人に見せるときも安全です。

MIMEタイプと振り分け先の対応は `typeMap` で決めています。ここはお好みで自由に足してください。マッピングにない種類のファイルは「その他」フォルダに入る設計です。

## パターン2：年月フォルダで時系列に整理する

種類よりも「いつのファイルか」で探すことが多い人には、こちらが合います。

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

ファイルの作成日時を `getDateCreated` で取って、`Utilities.formatDate` で「2026-06」の形に整え、それをフォルダ名にしています。実行するだけで、散らばっていたファイルが年月の棚にすっと収まっていく。「あの書類、たしか先月あたりに保存したはず」という探し方ができるようになるのが、この方式のいいところです。

## パターン3：90日触っていないファイルはアーカイブへ

「消すのは怖いけれど、もう使っていないファイル」ってありますよね。それらを一か所に退避させるのがこのスクリプトです。

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

最終更新日が90日より前のファイルだけを「アーカイブ」フォルダへ移動します。削除ではなく移動なので、必要になったら検索すればちゃんと出てきます。期間を変えたいときは `ARCHIVE_DAYS` の数字を書き換えるだけです。

## 動かすまでの準備

### フォルダIDはURLの末尾にある

整理したいフォルダをブラウザで開くと、URLがこうなっています。

```
https://drive.google.com/drive/folders/★ここがフォルダID★
```

この末尾部分がフォルダIDです。GASエディタの「プロジェクトの設定」からスクリプトプロパティを開いて、プロパティ名 `SOURCE_FOLDER_ID`・値にこのIDを保存すれば準備完了。

### 毎週日曜の深夜に自動で走らせる

手動実行でも十分便利ですが、真価を発揮するのはトリガーを仕込んでからです。

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

`setupWeeklyTrigger` を一度だけ手動実行すれば、以降は毎週日曜の午前3時に `organizeByMonth` が自動で動きます。既存のトリガーを消してから作り直す書き方にしてあるので、うっかり2回実行して二重登録になる心配もありません。種類別で回したい場合は、コード内の `organizeByMonth` を `organizeByType` に差し替えてから実行してください。

## GASに任せてみて変わったこと

導入してからは、ドライブを「整理しなきゃ」と思うこと自体がなくなりました。日曜の深夜にGASが黙々と片付けてくれて、月曜の朝はスッキリした状態から一週間が始まる。散らかしても週末にはリセットされると分かっているので、平日は気兼ねなくファイルを放り込めます。

正直なところ、最初は「整理くらい自分でやればいい」と思っていたんです。でも、やらなくていい作業がひとつ減ると、その分だけ気持ちが軽くなるんですよね。ドライブの散らかりに心当たりのある方は、まずパターン1をコピペして、テスト用フォルダで一度動かしてみてください。

なお、掲載コードは構文とDriveApp APIの使い方を確認したうえで載せていますが、実行環境での動作まで保証するものではありません。DriveAppの仕様は変わることがあるので、様子がおかしいときは公式ドキュメントも合わせて確認してもらえると安心です。

## 関連記事

- [GASでGoogleドライブをバックアップする週次スクリプト](/blog/gas-drive-backup-weekly/)
- [GASでGoogleドライブにフォルダを自動作成する](/blog/gas-drive-folder-create/)
- [GASで不要ファイルをドライブからまとめて削除する](/blog/gas-drive-cleanup/)
- [GASでSlack通知を送る](/blog/gas-slack-notify/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。
