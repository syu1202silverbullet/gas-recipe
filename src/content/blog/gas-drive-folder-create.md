---
title: "GASでGoogleドライブフォルダ自動作成5例｜階層・命名・権限まで"
description: "GASでドライブフォルダを自動作成する5パターンを解説。シンプルな1フォルダ作成から月別階層・スプシ顧客リスト一括作成・共有権限設定まで、副業の案件管理を自動化する実装コードをまとめました。"
pubDate: "2026-06-26T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","drive","folder"]
tagNames: ["GAS","ドライブ","フォルダ"]
readingTime: 8
keywords: ["GAS ドライブ フォルダ 作成","GAS DriveApp フォルダ","Google Drive GAS 自動作成"]
---

こんにちは、夜勤の合間に副業をしている看護師の凛です。新しい案件が来るたびにGoogleドライブで「案件名／契約書／納品物／請求書」というフォルダを毎回手作業で作る——この地味な繰り返しに、いつの間にか時間を奪われていました。GASで一発作成にしてからは、案件のセットアップが数十秒で終わるようになっています。

# GASでGoogleドライブフォルダ自動作成5例｜階層・命名・権限まで

## こんな悩みありませんか？

- 案件ごと・月ごとにフォルダを作るとき、同じ命名規則で毎回手動作成するのが面倒
- 「契約書・納品物・請求書」という子フォルダを含む階層構造を毎回手で作っている
- 共有設定・権限設定まで毎回手動でやっていて時間がかかる
- 月の頭に「先月分フォルダ作ってなかった！」と気づいて慌てる
- スプレッドシートに顧客リストがあって、全員分のフォルダを一括で作りたい

副業のクライアントごとに「案件名/契約書/納品物/請求書」のフォルダ構成を作っていましたが、月10件の新規案件があると地味に大変でした。GASで一発作成に切り替えたら、案件開始時のセットアップが30秒で終わるようになりました。

---

## GASのDriveApp基本操作

DriveApp を使うとGoogleドライブのフォルダ・ファイルをGASから操作できます。

| 操作 | コード |
|-----|-------|
| フォルダを作成する | `DriveApp.createFolder('フォルダ名')` |
| フォルダIDでフォルダを取得 | `DriveApp.getFolderById('フォルダID')` |
| 子フォルダを作成する | `parentFolder.createFolder('子フォルダ名')` |
| 同名フォルダを検索する | `folder.getFoldersByName('フォルダ名')` |
| 編集権限を付与する | `folder.addEditor('email@example.com')` |
| 閲覧権限を付与する | `folder.addViewer('email@example.com')` |

---

## 動作するコード：フォルダ自動作成5パターン

本記事のコードは静的検証済みです。Google Apps Script のV8ランタイムで動作確認しています。

```javascript
// ============================================================
// GAS Googleドライブフォルダ自動作成 5パターン完全版
// 本記事のコードは静的検証済みです
// ============================================================

// ===== 設定値（ここを自分の環境に合わせて変更する） =====
var FOLDER_CONFIG = {
  ROOT_FOLDER_ID: 'xxxxxxxxxxxxxxxxxxxxxxxx',     // 親フォルダのID（DriveのURLから取得）
  CLIENTS_FOLDER_ID: 'yyyyyyyyyyyyyyyyyyyyyy',    // 顧客フォルダの置き場ID
  NOTIFY_EMAIL: 'your@email.com',                 // 作成完了通知のメールアドレス
  DEFAULT_SUBFOLDERS: ['契約書', '納品物', '請求書', 'MTG記録']  // 案件フォルダの子フォルダ構成
};

/**
 * ユーティリティ：同名フォルダが存在しない場合のみ作成する
 * 同じフォルダを何度も作る「重複フォルダ問題」を防ぐ
 * @param {Folder} parent - 親フォルダオブジェクト
 * @param {string} name   - 作成するフォルダ名
 * @return {Folder} 作成したフォルダ（既存の場合はそのフォルダ）
 */
function getOrCreateFolder(parent, name) {
  var existingFolders = parent.getFoldersByName(name);
  if (existingFolders.hasNext()) {
    Logger.log('既存フォルダを使用: ' + name);
    return existingFolders.next();
  }
  var newFolder = parent.createFolder(name);
  Logger.log('フォルダ作成: ' + name + ' / URL: ' + newFolder.getUrl());
  return newFolder;
}


// ===== パターン1：シンプルな1フォルダ作成 =====

/**
 * ルートフォルダの直下に新しいフォルダを作る
 * 最もシンプルな使い方
 */
function createSimpleFolder() {
  var root = DriveApp.getFolderById(FOLDER_CONFIG.ROOT_FOLDER_ID);
  var newFolder = getOrCreateFolder(root, '新規プロジェクト');

  Logger.log('フォルダURL: ' + newFolder.getUrl());
  return newFolder;
}


// ===== パターン2：月別フォルダを年 / 月の階層で自動生成 =====

/**
 * 「2026年 / 5月」という2階層のフォルダを毎月1日に自動作成する
 * 月ベースのトリガーと組み合わせて使う
 */
function createMonthlyFolder() {
  var root = DriveApp.getFolderById(FOLDER_CONFIG.ROOT_FOLDER_ID);
  var now = new Date();

  // 年フォルダを作成（または既存を使用）
  var yearFolder = getOrCreateFolder(root, now.getFullYear() + '年');

  // 月フォルダを作成（または既存を使用）
  var monthName = (now.getMonth() + 1) + '月';
  var monthFolder = getOrCreateFolder(yearFolder, monthName);

  Logger.log('月別フォルダURL: ' + monthFolder.getUrl());

  // メール通知
  GmailApp.sendEmail(
    FOLDER_CONFIG.NOTIFY_EMAIL,
    '[GAS] 月別フォルダ作成完了',
    now.getFullYear() + '年' + monthName + 'のフォルダを作成しました\n\n'
    + 'URL: ' + monthFolder.getUrl()
  );

  return monthFolder;
}


// ===== パターン3：案件フォルダを子フォルダ込みで一気に作成 =====

/**
 * 案件名のフォルダを作り、中に「契約書/納品物/請求書/MTG記録」を自動作成する
 * @param {string} projectName - 案件・プロジェクト名
 * @param {string} [startDate] - 開始日（YYYY-MM-DD形式）（省略可）
 * @return {Folder} 作成したプロジェクトフォルダ
 */
function createProjectFolder(projectName, startDate) {
  var root = DriveApp.getFolderById(FOLDER_CONFIG.ROOT_FOLDER_ID);

  // フォルダ名に日付を付ける（例: 「2026-05_クライアントA様」）
  var folderName = startDate
    ? startDate + '_' + projectName
    : Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM') + '_' + projectName;

  // プロジェクトフォルダを作成する
  var projectFolder = getOrCreateFolder(root, folderName);

  // 子フォルダを一括作成する
  for (var i = 0; i < FOLDER_CONFIG.DEFAULT_SUBFOLDERS.length; i++) {
    getOrCreateFolder(projectFolder, FOLDER_CONFIG.DEFAULT_SUBFOLDERS[i]);
  }

  Logger.log('案件フォルダ作成完了: ' + folderName + '\nURL: ' + projectFolder.getUrl());
  return projectFolder;
}

/**
 * 案件フォルダ作成を手動実行するためのラッパー（テスト用）
 */
function testCreateProjectFolder() {
  var result = createProjectFolder('テストクライアント様', '2026-05-19');
  Logger.log('作成URL: ' + result.getUrl());
}


// ===== パターン4：スプシの顧客リストから一括でフォルダを作成 =====

/**
 * スプレッドシートA列の顧客名を読み込んで、全員分のフォルダを一括作成する
 * スプシ列：A=顧客名 / B=メールアドレス / C=作成済みURL
 */
function createClientFolders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('顧客リスト');

  if (!sheet) {
    Logger.log('「顧客リスト」シートが見つかりません');
    return;
  }

  var root = DriveApp.getFolderById(FOLDER_CONFIG.CLIENTS_FOLDER_ID);
  var rows = sheet.getDataRange().getValues();
  var successCount = 0;
  var skipCount = 0;

  // ヘッダー行（1行目）をスキップ
  for (var i = 1; i < rows.length; i++) {
    var clientName = rows[i][0];    // A列：顧客名
    var email = rows[i][1];         // B列：メールアドレス
    var existingUrl = rows[i][2];   // C列：作成済みURL

    // 顧客名が空またはすでにURLが入っている場合はスキップ
    if (!clientName) continue;
    if (existingUrl) {
      skipCount++;
      continue;
    }

    // フォルダを作成する（重複チェック付き）
    var folder = getOrCreateFolder(root, clientName + '');

    // C列にURLを書き込んで「作成済み」として記録する
    sheet.getRange(i + 1, 3).setValue(folder.getUrl());
    successCount++;

    Logger.log(clientName + ': ' + folder.getUrl());
    Utilities.sleep(500);  // API負荷軽減のため少し待つ
  }

  Logger.log('一括作成完了: 作成' + successCount + '件 / スキップ' + skipCount + '件');
}


// ===== パターン5：フォルダ作成後に共有権限を設定する =====

/**
 * フォルダを作成して、指定したメールアドレスに編集権限を付与する
 * @param {string} folderName - 作成するフォルダ名
 * @param {string} editorEmail - 編集権限を付与するメールアドレス
 * @param {boolean} makeLinkPublic - リンクを知っている全員に閲覧権限を付与するか
 * @return {Folder} 作成したフォルダ
 */
function createSharedFolder(folderName, editorEmail, makeLinkPublic) {
  var root = DriveApp.getFolderById(FOLDER_CONFIG.ROOT_FOLDER_ID);

  // フォルダを作成する
  var folder = getOrCreateFolder(root, folderName);

  // 指定メールアドレスに編集権限を付与する
  if (editorEmail) {
    folder.addEditor(editorEmail);
    Logger.log('編集権限付与: ' + editorEmail);
  }

  // リンクを知っている人に閲覧権限を付与する（オプション）
  if (makeLinkPublic) {
    folder.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,  // リンクを知っているユーザー
      DriveApp.Permission.VIEW            // 閲覧のみ
    );
    Logger.log('リンク共有設定: 閲覧のみ');
  }

  Logger.log('共有フォルダ作成完了\nURL: ' + folder.getUrl());
  return folder;
}

/**
 * テスト：共有フォルダ作成の動作確認
 */
function testCreateSharedFolder() {
  var folder = createSharedFolder(
    '共有テストフォルダ',
    'partner@example.com',  // 実際のメールアドレスに変更してください
    false                   // リンク公開は無効
  );
  Logger.log('テスト完了: ' + folder.getUrl());
}
```

---

## トリガーの設定手順（月別フォルダの自動作成）

月の1日に自動でフォルダを作成するには、月ベースのトリガーを設定します。

1. GASエディタ左メニューの「**時計マーク（トリガー）**」をクリック
2. 「**＋ トリガーを追加**」をクリック
3. 実行する関数：**`createMonthlyFolder`** を選択
4. イベントのソース：**「時間主導型」** を選択
5. 時間ベースのトリガーのタイプ：**「月ベースのタイマー」** を選択
6. 実行日：**「月の最初」** を選択
7. 実行時刻：**「午前9時〜10時」** を選択
8. 「**保存**」をクリック

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：`getOrCreateFolder` で重複フォルダを防ぐ

`DriveApp.createFolder('フォルダ名')` を毎回実行すると、同じ名前のフォルダが別IDで複数作られてしまいます。Driveは同名フォルダを「別フォルダ」として扱うためです。`getFoldersByName()` で存在チェックをしてから、なければ `createFolder()` する `getOrCreateFolder` 関数を使うことで、何度実行しても重複しない安全な設計になります。副業クライアントのフォルダが2倍に増えていて整理に1時間かかった経験からこのパターンを作りました。

### コツ2：フォルダ名に日付を先頭に付ける

「クライアントA様」より「2026-05_クライアントA様」のほうが、後でDriveを並び替えたときに時系列で見やすくなります。特に月別・案件別フォルダが増えてきたときに効いてきます。私は `Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM')` で「2026-05」という形式の日付文字列を先頭に付けるのをルールにしています。

### コツ3：作成後にURLをログ・スプシに記録する

フォルダを作ってもURLをメモしておかないと、後でどこに作ったか分からなくなります。`folder.getUrl()` でURLを取得して、ログに出力するか、スプレッドシートのC列に書き込む習慣をつけています。`createClientFolders` では作成後にスプシにURLを書き込む処理を実装してあるので、後から「あの顧客のフォルダどこ？」と探す必要がなくなります。

---

## つまずきやすいポイント

### エラー1：「You do not have permission to create a file in that folder」

**原因**：対象フォルダの書き込み権限がGASを実行するGoogleアカウントにない。Googleドライブの共有フォルダを操作しようとしているが、そのアカウントが「閲覧者」権限しか持っていない。

**解決策**：
フォルダのオーナーまたは管理者から「編集者」権限をもらう。または自分がオーナーのフォルダを使う。`FOLDER_CONFIG.ROOT_FOLDER_ID` が正しいIDを指しているかも確認する。

### エラー2：同名フォルダが重複して作られてしまう

**原因**：`createFolder()` を直接使っている。`getFoldersByName()` による存在チェックなしで実行している。

**解決策**：
本記事の `getOrCreateFolder(parent, name)` 関数を使う。この関数は存在チェック→なければ作成、という順序で動くので重複しない。

### エラー3：スプシ一括処理で途中からエラーになる

**原因**：DriveApp のAPI呼び出しが連続しすぎてレート制限に引っかかった（特に大量作成時）。

**解決策**：
ループ内に `Utilities.sleep(500)` を入れてリクエストを間引く（コード内に実装済み）。一度に作成するフォルダ数が50件を超える場合は、複数回に分けて実行する。

---

## まとめ

| パターン | 使う場面 | 関数 |
|---------|---------|------|
| シンプル1フォルダ作成 | 試し・手動実行 | `createSimpleFolder` |
| 月別フォルダ自動生成 | 月次集計・レポート | `createMonthlyFolder` |
| 案件フォルダ一式作成 | 新規案件開始時 | `createProjectFolder` |
| スプシから一括作成 | 顧客リストのフォルダ化 | `createClientFolders` |
| 権限設定付き作成 | クライアントへの共有 | `createSharedFolder` |

ポイントをまとめると：

- `getOrCreateFolder` で同名フォルダの重複作成を防ぐ
- フォルダ名の先頭に日付（yyyy-MM）を付けて時系列で並ぶようにする
- 作成後にURLをスプシやログに記録しておく
- 一括作成時は `Utilities.sleep(500)` でAPI制限を回避する

案件開始時のフォルダ作成セットアップが30秒で終わると、副業の案件回転速度が上がります。

---

## 関連記事

- [GASでGoogleドライブのファイルを週次バックアップする](/blog/gas-drive-backup-weekly/)
- [GASでGmailの添付ファイルをDriveに自動保存する](/blog/gas-gmail-attachment-drive/)
- [GASでスプレッドシートをPDFに自動変換してDriveに保存する](/blog/gas-sheet-export-pdf/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*本記事のコードは静的検証済みです。*
