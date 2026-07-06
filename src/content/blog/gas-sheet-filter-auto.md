---
title: "スプシ自動フィルタをGASで3秒セット"
description: "スプレッドシートのフィルタ設定をGASで自動化する方法を解説。基本フィルタ・フィルタビューの使い分けと、完了行を隠す条件フィルタの実装手順をまとめました。"
pubDate: "2026-05-22T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","filter","sheet"]
tagNames: ["GAS","フィルタ","シート"]
readingTime: 8
keywords: ["GAS フィルタ 自動","GAS フィルタ設定","スプレッドシート フィルタ GAS"]
---

こんにちは、凛と申します。現役の看護師をしながら、すきま時間にGASで副業をしています。

今日はいきなり失敗談から始めさせてください。副業クライアントと勤務シフトの集計表を共有していた頃の話です。私が自分の作業用に「未完了の行だけ」へ絞り込むたびに、クライアントから「画面からデータが消えたんですけど……」と連絡が来ていました。こちらはただフィルタを掛けただけ。なのに相手の画面まで同じように行が隠れて、そのたびに無用な心配をさせてしまっていたんです。

# スプシ自動フィルタをGASで3秒セット

## 原因は「基本フィルタは全員に効く」仕様だった

調べてみると、原因は単純でした。スプレッドシートのフィルタには大きく2種類あって、性質がまったく違うんです。

| 種類 | 特徴 | 向いている場面 |
|------|------|--------------|
| 基本フィルタ（Filter） | シートに1つだけ・全員の画面に適用される | 自分1人で使うシート |
| フィルタビュー（FilterView） | 自分専用・名前が付けられる・複数保存可能 | 共有シートで自分だけ絞り込みたい |

私が掛けていたのは前者の基本フィルタ。これは「シートを開いている全員の画面」に効いてしまいます。看護師仲間とシフト表を共有しているような場面では、フィルタビューを使うのが正解でした。逆に、自分だけが使う家計簿なら基本フィルタで十分です。

もうひとつ白状すると、当時の私はデータを貼り替えるたびにフィルタ範囲を手作業で作り直していました。「完了以外だけ」のような条件も毎朝手で選び直し。集計を始める前に毎回数分のロス。振り返ると、この地味な操作こそ一番の時間泥棒だったかもしれません。

## 解決：フィルタを一発でセット・解除するGASコード

そこで書いたのが次のコードです。基本フィルタの設定・解除から、共有シート用のフィルタビュー作成、コードが苦手な同僚向けのカスタムメニューまで一式入れてあります。構文チェックのうえで掲載していますが、シート名や列番号はお使いの環境に合わせて `FILTER_CONFIG` を書き換えてください。

```javascript
// ============================================================
// GAS フィルタ自動設定 完全版
// 本記事のコードは静的検証済みです
// ============================================================

// ===== 設定値（ここを自分の環境に合わせて変更する） =====
var FILTER_CONFIG = {
  SHEET_NAME: '勤務シフト',   // フィルタを掛けるシート名
  STATUS_COL: 5,              // ステータス列の番号（A=1、B=2、…E=5）
  HIDDEN_VALUE: '完了',       // 非表示にする値
  FILTER_VIEW_TITLE: '凛専用' // フィルタビューの名前
};

/**
 * 既存の基本フィルタを削除する（先に外してからセットし直す）
 * @param {Sheet} sheet - 対象シート
 */
function resetFilter(sheet) {
  var currentFilter = sheet.getFilter();
  if (currentFilter) {
    currentFilter.remove();  // 既存フィルタを削除
    Logger.log('既存フィルタを削除しました');
  } else {
    Logger.log('フィルタは掛かっていませんでした（スキップ）');
  }
}

/**
 * 指定した値を隠す基本フィルタを設定する
 * 「完了」行を非表示にして未完了タスクだけを表示するなどに使う
 */
function filterNotDone() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FILTER_CONFIG.SHEET_NAME);

  if (!sheet) {
    Logger.log('シートが見つかりません: ' + FILTER_CONFIG.SHEET_NAME);
    return;
  }

  // 1. まず既存フィルタを外す（先に外さないとエラーになる）
  resetFilter(sheet);

  // 2. データ範囲全体を取得する（空白行の前まで自動取得）
  var dataRange = sheet.getDataRange();

  // 3. フィルタを作成する
  var filter = dataRange.createFilter();

  // 4. フィルタ条件を作る（「完了」を非表示にする）
  var criteria = SpreadsheetApp.newFilterCriteria()
    .setHiddenValues([FILTER_CONFIG.HIDDEN_VALUE])  // この値の行を隠す
    .build();

  // 5. 指定した列にフィルタ条件を適用する
  filter.setColumnFilterCriteria(FILTER_CONFIG.STATUS_COL, criteria);

  Logger.log('フィルタを設定しました（「' + FILTER_CONFIG.HIDDEN_VALUE + '」行を非表示）');
}

/**
 * 基本フィルタをリセットして全行を表示する（デフォルトに戻す）
 */
function resetFilterDefault() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FILTER_CONFIG.SHEET_NAME);

  if (!sheet) {
    Logger.log('シートが見つかりません: ' + FILTER_CONFIG.SHEET_NAME);
    return;
  }

  resetFilter(sheet);
  Logger.log('フィルタを解除しました（全行表示）');
}

/**
 * 指定した値だけを表示するフィルタ（setVisibleValues版）
 * 「対応中」の行だけ表示したいときなどに使う
 */
function filterVisibleOnly() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FILTER_CONFIG.SHEET_NAME);

  if (!sheet) return;

  resetFilter(sheet);

  var dataRange = sheet.getDataRange();
  var filter = dataRange.createFilter();

  // 「対応中」だけを表示する（非表示と逆の指定）
  var criteria = SpreadsheetApp.newFilterCriteria()
    .setVisibleValues(['対応中'])  // この値の行だけ表示する
    .build();

  filter.setColumnFilterCriteria(FILTER_CONFIG.STATUS_COL, criteria);
  Logger.log('フィルタ設定完了（「対応中」行のみ表示）');
}

/**
 * 特定キーワードを含む行だけを表示するフィルタ（条件式版）
 * 部分一致で絞り込みたいときに使う
 */
function filterByKeyword(keyword) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FILTER_CONFIG.SHEET_NAME);

  if (!sheet) return;

  resetFilter(sheet);

  var dataRange = sheet.getDataRange();
  var filter = dataRange.createFilter();

  // キーワードを含む行だけ表示する（条件式で部分一致）
  var criteria = SpreadsheetApp.newFilterCriteria()
    .whenTextContains(keyword)  // キーワードを含む行だけ表示
    .build();

  filter.setColumnFilterCriteria(FILTER_CONFIG.STATUS_COL, criteria);
  Logger.log('フィルタ設定完了（「' + keyword + '」を含む行のみ表示）');
}

/**
 * フィルタビューを作成する（共有シートで自分専用フィルタを使う）
 * Sheets APIが必要：サービスから「Google Sheets API」を有効化してから使う
 */
function createMyFilterView() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FILTER_CONFIG.SHEET_NAME);

  if (!sheet) {
    Logger.log('シートが見つかりません');
    return;
  }

  var ssId = ss.getId();
  var sheetId = sheet.getSheetId();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  // フィルタビューの設定（Sheets API形式）
  var filterViewRequest = {
    requests: [{
      addFilterView: {
        filter: {
          title: FILTER_CONFIG.FILTER_VIEW_TITLE,  // フィルタビューの名前
          range: {
            sheetId: sheetId,
            startRowIndex: 0,       // 1行目から（0始まり）
            endRowIndex: lastRow,
            startColumnIndex: 0,    // A列から
            endColumnIndex: lastCol
          },
          // フィルタ条件（ステータス列で「完了」を非表示）
          filterSpecs: [{
            columnIndex: FILTER_CONFIG.STATUS_COL - 1,  // 0始まりなので-1
            filterCriteria: {
              hiddenValues: [FILTER_CONFIG.HIDDEN_VALUE]
            }
          }]
        }
      }
    }]
  };

  // Sheets API を呼び出してフィルタビューを作成する
  Sheets.Spreadsheets.batchUpdate(filterViewRequest, ssId);
  Logger.log('フィルタビュー「' + FILTER_CONFIG.FILTER_VIEW_TITLE + '」を作成しました');
}

/**
 * カスタムメニューを追加する（スプレッドシートを開いたとき自動実行）
 * コードが苦手な同僚でもメニューから操作できるようにする
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('フィルタ管理')
    .addItem('完了を隠す', 'filterNotDone')
    .addItem('全部表示', 'resetFilterDefault')
    .addSeparator()
    .addItem('対応中のみ表示', 'filterVisibleOnly')
    .addItem('フィルタビュー作成', 'createMyFilterView')
    .addToUi();
}
```

### Sheets API の有効化（フィルタビューを使う場合のみ）

`createMyFilterView` 関数を使うには、Google Sheets API を有効化する必要があります。

1. GASエディタ画面の左メニューから「**サービス（＋マーク）**」をクリック
2. 一覧から「**Google Sheets API**」を探してクリック
3. 「**追加**」ボタンをクリック
4. 左メニューの「サービス」の下に「Sheets」が追加されたのを確認
5. コード中で `Sheets.Spreadsheets.batchUpdate(...)` が使えるようになる

基本フィルタ（`filterNotDone`・`resetFilterDefault`）だけ使う場合は、この手順は不要です。

### カスタムメニューで同僚も使えるようにする

`onOpen` 関数を使ってスプレッドシート上にメニューを追加する手順です。

1. GASエディタ画面で `onOpen` 関数が書かれていることを確認
2. 左メニューから「**トリガー（時計マーク）**」をクリック
3. 「**＋ トリガーを追加**」をクリック
4. 実行する関数：**`onOpen`** を選択
5. イベントのソース：**「スプレッドシートから」** を選択
6. イベントの種類：**「起動時」** を選択
7. 「**保存**」をクリック

設定後にスプレッドシートを開き直すと、メニューバーに「フィルタ管理」が追加されます。

## 導入してから変わったこと

クライアントからの「画面が変わった」連絡は、フィルタビューに切り替えて以来ゼロになりました。冒頭の失敗はまさにフィルタビューを知らなかったせいで、あれ以来「共有シートで絞り込むなら自分専用のビュー」が私の中のマナーになっています。

毎朝のフィルタ設定も、メニューから「完了を隠す」を選ぶだけ。文字どおり3秒です。数分×毎日と考えると、コードを書いた時間はとっくに回収できました。

とはいえ、ここに至るまでに私自身がつまずいたポイントもあります。

### 既存フィルタは「先に外す」が鉄則

フィルタが既に掛かっているシートで `createFilter()` を呼ぶと「Exception: The range already has a filter.」というエラーが出ます。私は最初この仕組みを知らず、何回スクリプトを実行してもエラーになって30分ハマりました。それ以来、フィルタを掛ける関数の最初には必ず `resetFilter(sheet)` を入れるルールにしています。「まず既存のものを外してから新しく設定する」——病院での処置と同じ発想です。

### 列番号の数え方が2種類ある罠

`setColumnFilterCriteria` に渡す列番号は「A列が1、B列が2」という通し番号です。配列のインデックス（0始まり）と混同しやすいので注意してください。一方で `createMyFilterView` 内の `filterSpecs.columnIndex` は0始まり（A=0）になります。Sheets API と SpreadsheetApp で仕様が違うのがGAS初心者の罠で、私も最初に両方混同して「1列ずれたフィルタ」を作ってしまいました。コメントに「A=1」「A=0」と書いておくのがおすすめです。

## うまく動かないときのチェックポイント

### 「The range already has a filter.」が出る

**原因**：すでに基本フィルタが設定されているシートで `createFilter()` を実行した。

**解決策**：
`filterNotDone()` などの関数内で `resetFilter(sheet)` を最初に呼び出すようにする。本記事のコードには既に実装済みです。手動でフィルタを掛けたまま関数を実行した場合にも発生するので、スクリプト実行前にスプレッドシート上でフィルタを手動で外しておくのも有効です。

### 「Exception: ReferenceError: Sheets is not defined」が出る

**原因**：`createMyFilterView()` を実行したが、Google Sheets API がサービスに追加されていない。

**解決策**：
GASエディタの左メニュー「サービス（＋マーク）」から「Google Sheets API」を追加する。前述「Sheets API の有効化」の手順1〜4を実施する。

### フィルタは掛かるのに条件が反映されない

**原因**：`setColumnFilterCriteria` に渡した列番号がデータの実際の列とずれている。

**解決策**：
`FILTER_CONFIG.STATUS_COL` の値を確認する。A列が1、B列が2という数え方で、スプレッドシートのヘッダー行を目で確認して列番号を数え直す。フィルタを一度削除して、Logger.log でシートの getLastColumn() と STATUS_COL の値を出力して比較するのが確実です。

## おわりに

どの関数をどの場面で使うか、私の使い分けはこの表のとおりです。

| 場面 | 使う方法 | 関数 |
|------|---------|------|
| 自分専用シートで絞り込む | 基本フィルタ | `filterNotDone` |
| 全行を表示に戻す | フィルタ削除 | `resetFilterDefault` |
| 共有シートで自分だけ絞り込む | フィルタビュー | `createMyFilterView` |
| コードが苦手な同僚も使えるように | カスタムメニュー | `onOpen` |
| 既存フィルタを安全に外す | リセット関数 | `resetFilter` |

正直なところ、最初は「フィルタくらい手でやればいい」と思っていました。でも毎日触るシートのフィルタ操作が3秒で終わるようになると、それだけで一日の作業テンポが変わります。共有相手を驚かせてしまった私のような失敗をする前に、まずはフィルタビューだけでも試してみてください。

---

## 関連記事

- [GASでスプレッドシートのデータを自動ソートする方法](/blog/gas-sheet-sort-multi/)
- [GASで条件付き書式を一括設定する10例](/blog/gas-sheet-conditional-format/)
- [GASで編集日時を自動記録するタイムスタンプを実装する](/blog/gas-sheet-timestamp-auto/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*掲載コードは構文とAPI仕様を確認したうえで載せています。実際の動作はお使いのシートで一度お試しください。*
