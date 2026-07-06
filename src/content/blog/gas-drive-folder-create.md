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

こんにちは、夜勤の合間に副業をしている看護師の凛です。

ある日、副業のクライアントフォルダを整理していて手が止まりました。「クライアントA様」というフォルダが、同じ名前で2つ並んでいたんです。よく見ると、契約書も納品物も微妙に分散していて、どっちが本物か分からない。結局その日は、フォルダの中身を突き合わせて統合するだけで1時間くらい溶けました。

# GASでGoogleドライブフォルダ自動作成5例｜階層・命名・権限まで

## 手作業でフォルダを作っていた頃の失敗

原因ははっきりしていました。新しい案件が来るたびに、私は手作業で「案件名／契約書／納品物／請求書」という同じ構成のフォルダを作っていたんです。月に10件くらい新規案件があると、これがけっこう地味に効いてくる。しかも急いでいると、うっかり同じ名前でもう一度作ってしまう。Googleドライブは同じ名前のフォルダを「別のフォルダ」として平気で並べてくれるので、気づいたときには重複だらけ、というわけです。

月初に「そういえば先月分の集計フォルダ作ってなかった」と慌てるのも、毎回でした。ぜんぶ手作業だったからです。

この繰り返しをGASの一発作成に切り替えてから、案件開始時のセットアップは30秒で終わるようになりました。重複フォルダの整理に1時間、みたいなこともなくなっています。

## なぜ重複してしまうのか

`DriveApp` を使うと、GoogleドライブのフォルダやファイルをGASから操作できます。ただ、素直に `createFolder()` を書くだけだと、さっきの重複問題にそのままハマります。

ここでよく使う操作を先にまとめておきます。

| 操作 | コード |
|-----|-------|
| フォルダを作成する | `DriveApp.createFolder('フォルダ名')` |
| フォルダIDでフォルダを取得 | `DriveApp.getFolderById('フォルダID')` |
| 子フォルダを作成する | `parentFolder.createFolder('子フォルダ名')` |
| 同名フォルダを検索する | `folder.getFoldersByName('フォルダ名')` |
| 編集権限を付与する | `folder.addEditor('email@example.com')` |
| 閲覧権限を付与する | `folder.addViewer('email@example.com')` |

ポイントは `getFoldersByName()` です。これで「同じ名前のフォルダがもうあるか」を先に調べてから作れば、重複は起きません。私が作った失敗の逆をやればいい、という単純な話でした。

## 解決コード：フォルダ自動作成5パターン

下のコードは構文チェックのうえ掲載しています。Google Apps Script のV8ランタイムを前提にしていますが、フォルダIDやメールアドレスはお使いの環境に合わせて置き換えてください。

冒頭にある `getOrCreateFolder` が、さっきの重複問題への答えです。存在チェックをしてから、なければ作る。これを土台にして、5つのパターンを組み立てています。

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

### 月初の作り忘れをなくすトリガー設定

月別フォルダのパターン2は、トリガーと組み合わせて初めて「作り忘れゼロ」になります。私が月初にバタバタしていた原因そのものなので、ここは自動化しておくのがおすすめです。

1. GASエディタ左メニューの「**時計マーク（トリガー）**」をクリック
2. 「**＋ トリガーを追加**」をクリック
3. 実行する関数：**`createMonthlyFolder`** を選択
4. イベントのソース：**「時間主導型」** を選択
5. 時間ベースのトリガーのタイプ：**「月ベースのタイマー」** を選択
6. 実行日：**「月の最初」** を選択
7. 実行時刻：**「午前9時〜10時」** を選択
8. 「**保存**」をクリック

これで毎月1日の朝に、当月のフォルダが勝手にできています。

## 運用して効いてきた3つのコツ

### 重複を防ぐ `getOrCreateFolder` は最初から入れる

冒頭でお話しした「1時間の整理」を二度とやらないために、私はこの関数を全パターンの土台にしています。`getFoldersByName()` で存在チェックをしてから、なければ `createFolder()` する。たったこれだけで、何度実行しても重複しない設計になります。失敗から生まれた関数なので、個人的にはいちばん手放せません。

### フォルダ名の先頭に日付を付ける

「クライアントA様」より「2026-05_クライアントA様」のほうが、後でDriveを並び替えたときに時系列で見やすくなります。案件が増えてくると、この差がじわじわ効いてくるんですよね。私は `Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM')` で「2026-05」という形の文字列を先頭に付けるのをルールにしています。

### 作ったらURLを必ずどこかに記録する

フォルダを作ってもURLをメモし忘れると、後で「あの顧客のフォルダどこだっけ」と探す羽目になります。`folder.getUrl()` でURLを取って、ログに出すかスプシのC列に書き込む。パターン4の `createClientFolders` は作成と同時にスプシへ書き戻すようにしてあるので、探し物の時間がまるごと消えました。

## ハマりやすいポイント

正直、最初はエラーメッセージを見ても何が悪いのか分かりませんでした。よく出会う3つだけ、原因と対処を残しておきます。

### 「You do not have permission to create a file in that folder」

対象フォルダの書き込み権限が、GASを実行しているGoogleアカウントに無いときに出ます。共有フォルダを触ろうとしているのに、自分が「閲覧者」止まりだった、というパターンが多いです。フォルダのオーナーから「編集者」権限をもらうか、自分がオーナーのフォルダを使ってください。`FOLDER_CONFIG.ROOT_FOLDER_ID` が正しいIDを指しているかも、あわせて確認を。

### 同名フォルダが重複して作られる

これは私がやらかしたやつです。`createFolder()` を存在チェックなしで直に呼んでいるのが原因。本記事の `getOrCreateFolder(parent, name)` を使えば、チェック→なければ作成の順で動くので重複しません。

### 一括処理が途中でエラーになる

大量に作るとき、DriveのAPI呼び出しが連続しすぎてレート制限に引っかかることがあります。ループ内の `Utilities.sleep(500)` でリクエストを間引くのが対策で、コードにはすでに入れてあります。一度に50件を超えそうなら、何回かに分けて実行してください。

## ここまでやって思うこと

5つのパターンを一覧にすると、こんな使い分けです。

| パターン | 使う場面 | 関数 |
|---------|---------|------|
| シンプル1フォルダ作成 | 試し・手動実行 | `createSimpleFolder` |
| 月別フォルダ自動生成 | 月次集計・レポート | `createMonthlyFolder` |
| 案件フォルダ一式作成 | 新規案件開始時 | `createProjectFolder` |
| スプシから一括作成 | 顧客リストのフォルダ化 | `createClientFolders` |
| 権限設定付き作成 | クライアントへの共有 | `createSharedFolder` |

案件のセットアップが30秒で終わるようになると、副業の回転そのものが少し軽くなります。もし今、手作業でフォルダを作っていて重複に悩んでいるなら、まずは `getOrCreateFolder` だけでも入れてみてください。あの1時間の整理をしなくて済むだけで、じゅうぶん元が取れます。

---

## 関連記事

- [GASでGoogleドライブのファイルを週次バックアップする](/blog/gas-drive-backup-weekly/)
- [GASでGmailの添付ファイルをDriveに自動保存する](/blog/gas-gmail-attachment-drive/)
- [GASでスプレッドシートをPDFに自動変換してDriveに保存する](/blog/gas-sheet-export-pdf/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*コードは構文チェックのうえ掲載していますが、お使いの環境に合わせて調整してください。*
