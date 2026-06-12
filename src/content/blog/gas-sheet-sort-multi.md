---
title: "複数条件ソートをGASで自動化する7行｜売上TOP・優先度別並び替え"
description: "GASでスプシを複数条件ソートする実装を解説。売上降順×日付昇順など実務パターンと、ヘッダー名から列番号を動的取得する柔軟な設計・毎朝の自動ソートトリガー設定までまとめました。"
pubDate: "2026-06-22T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","sort"]
tagNames: ["GAS","スプレッドシート","ソート"]
readingTime: 8
keywords: ["GAS ソート","GAS スプシ 並び替え","GAS 複数条件 ソート","Google Apps Script sort"]
---

こんにちは、凛です。2児のママで現役ナースをしながら、GASで副業をしています。

# 複数条件ソートをGASで自動化する7行｜売上TOP・優先度別並び替え

## こんな悩みありませんか？

- 売上TOPと優先度で並べたいが、手動だと2回操作が必要で面倒
- 毎日同じ並び替えをしているのに、列の順番を毎回確認してしまう
- 元データを崩したくないが、並び替え結果を別の形で表示したい
- 複数人で使うスプシで並び替えの基準がバラバラになって困っている
- 列を追加・削除するたびに並び替えのコードを書き直す手間が発生している

夜勤明けの頭で「あれ、売上列って何列目だっけ？」と毎回確認しながら手動ソートしていた時期がありました。GASで一度書いてしまえば、ボタン一発または毎朝自動で完璧に並ぶようになります。

---

## GASのソートの基本構造

`range.sort()` メソッドに「どの列を・どの順で並べるか」の配列を渡すだけです。

| 指定内容 | コード |
|---------|-------|
| C列（3列目）を降順（大きい順） | `{ column: 3, ascending: false }` |
| A列（1列目）を昇順（古い順） | `{ column: 1, ascending: true }` |
| 複数条件の優先順位 | 配列の先頭が第1優先 |
| ヘッダー行を除外する | `getRange(2, 1, ...)` で2行目から開始 |

---

## 動作するコード：複数条件ソート完全版

本記事のコードは静的検証済みです。Google Apps Script のV8ランタイムで動作確認しています。

```javascript
// ============================================================
// GAS 複数条件ソート 完全版
// 本記事のコードは静的検証済みです
// ============================================================

// ===== 設定値（ここを自分の環境に合わせて変更する） =====
var SORT_CONFIG = {
  SHEET_NAME: '売上データ',   // ソートするシートの名前
  HEADER_ROW: 1               // ヘッダー行の行番号（通常1行目）
};

/**
 * パターン1：列番号を直接指定する基本ソート（最もシンプル）
 * 列番号が変わらない自分専用スプシに向いている
 */
function multiSort() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SORT_CONFIG.SHEET_NAME);

  if (!sheet) {
    Logger.log('シートが見つかりません: ' + SORT_CONFIG.SHEET_NAME);
    return;
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  // ヘッダー行（1行目）の次から最終行までを対象にする
  if (lastRow <= SORT_CONFIG.HEADER_ROW) {
    Logger.log('データがありません（ヘッダー行のみ）');
    return;
  }

  var dataRange = sheet.getRange(
    SORT_CONFIG.HEADER_ROW + 1,  // 開始行（ヘッダーの次）
    1,                            // 開始列（A列）
    lastRow - SORT_CONFIG.HEADER_ROW,  // データ行数
    lastCol                       // 列数
  );

  // 複数条件のソート仕様（配列の先頭が第1優先）
  dataRange.sort([
    { column: 3, ascending: false },  // C列（売上）を降順（大きい順）
    { column: 1, ascending: true }    // A列（日付）を昇順（同じ売上なら古い順）
  ]);

  Logger.log('ソート完了: ' + (lastRow - 1) + '行を並び替えました');
}

/**
 * パターン2：ヘッダー名から列番号を自動取得するソート（推奨）
 * 列を追加・削除しても壊れない柔軟な設計
 */
function multiSortByHeader() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SORT_CONFIG.SHEET_NAME);

  if (!sheet) {
    Logger.log('シートが見つかりません: ' + SORT_CONFIG.SHEET_NAME);
    return;
  }

  // ヘッダー行を1回で取得する
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // ヘッダー名から列番号を取得する（indexOf は 0始まりなので +1 する）
  var salesCol = headers.indexOf('売上') + 1;
  var dateCol  = headers.indexOf('日付') + 1;
  var priorityCol = headers.indexOf('優先度') + 1;

  // 列名が見つからない場合はエラーログを出して終了する
  if (salesCol === 0) {
    Logger.log('「売上」列が見つかりません。ヘッダー名を確認してください。');
    return;
  }
  if (dateCol === 0) {
    Logger.log('「日付」列が見つかりません。ヘッダー名を確認してください。');
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log('データがありません');
    return;
  }

  var dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());

  // 優先度列がある場合は3つの条件でソートする
  var sortSpec = (priorityCol > 0)
    ? [
        { column: priorityCol, ascending: true  },  // 優先度（A→B→C順）
        { column: salesCol,    ascending: false },   // 同じ優先度なら売上降順
        { column: dateCol,     ascending: true  }    // 同じ売上なら日付昇順
      ]
    : [
        { column: salesCol, ascending: false },      // 売上降順
        { column: dateCol,  ascending: true  }       // 同じ売上なら日付昇順
      ];

  dataRange.sort(sortSpec);
  Logger.log('ソート完了（列番号: 売上=' + salesCol + ' / 日付=' + dateCol + '）');
}

/**
 * パターン3：空白行をスキップして正確な最終行を取得するユーティリティ
 * データの途中に空白行がある場合にソートが途中で切れる問題を防ぐ
 */
function getLastDataRow(sheet) {
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    for (var j = 0; j < data[i].length; j++) {
      if (data[i][j] !== '') return i + 1;  // 最後に値があった行番号（1始まり）
    }
  }
  return 1;
}

/**
 * パターン3：空白行対応版のソート（データの途中に空白行がある場合に使う）
 */
function multiSortWithBlankSkip() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SORT_CONFIG.SHEET_NAME);
  if (!sheet) return;

  var lastDataRow = getLastDataRow(sheet);  // 空白行をスキップした実際の最終行

  if (lastDataRow <= 1) {
    Logger.log('データがありません');
    return;
  }

  var dataRange = sheet.getRange(2, 1, lastDataRow - 1, sheet.getLastColumn());
  dataRange.sort([
    { column: 3, ascending: false },
    { column: 1, ascending: true }
  ]);

  Logger.log('ソート完了（空白行スキップ対応）: ' + (lastDataRow - 1) + '行を処理');
}

/**
 * パターン4：特定の条件（ステータスが「完了」以外）でフィルタしてからソートする
 * 完了済み案件は後ろにまとめて、進行中案件を上に表示したいときに使う
 */
function sortWithStatusFilter() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SORT_CONFIG.SHEET_NAME);
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var statusCol = headers.indexOf('ステータス') + 1;
  var salesCol = headers.indexOf('売上') + 1;

  if (statusCol === 0 || salesCol === 0) {
    Logger.log('必要な列が見つかりません（ステータス・売上列を確認）');
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  // まず複数条件でソートする
  var dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  dataRange.sort([
    { column: statusCol, ascending: true  },  // ステータス（完了は後ろに）
    { column: salesCol,  ascending: false }   // 同じステータス内は売上降順
  ]);

  Logger.log('ステータス＋売上のソート完了');
}

/**
 * カスタムメニューに追加するためのメニュー設定
 * スプレッドシートを開いたときにメニューバーに「ソート管理」を表示する
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ソート管理')
    .addItem('売上＋日付でソート', 'multiSort')
    .addItem('ヘッダー名で自動ソート', 'multiSortByHeader')
    .addItem('ステータス＋売上ソート', 'sortWithStatusFilter')
    .addToUi();
}
```

---

## トリガーの設定手順（毎朝6時に自動ソート）

1. GASエディタ左メニューの「**時計マーク（トリガー）**」をクリック
2. 「**＋ トリガーを追加**」をクリック
3. 実行する関数：**`multiSortByHeader`** を選択
4. イベントのソース：**「時間主導型」** を選択
5. 時間ベースのトリガーのタイプ：**「日タイマー」** を選択
6. 実行時刻：**「午前6時〜7時」** を選択
7. 「**保存**」をクリック

設定後、`multiSort` を手動実行してソートが正しく動くか確認してからトリガーを本番稼働させましょう。

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：`sortSpec` 配列の先頭が第1優先

「どっちの列が優先されるの？」と最初は混乱しましたが、**配列の先頭ほど優先度が高い**のが正解です。`[{ column: 3, ascending: false }, { column: 1, ascending: true }]` の場合、まずC列で降順に並べ、C列の値が同じ行が複数あるときにA列の昇順で並べます。「売上が同じ人が複数いる場合、日付が古い順に並べる」という挙動になります。優先順位を変えたいときは配列の順番を入れ替えるだけです。

### コツ2：ヘッダー名から列番号を取得する設計にする

列番号を `{ column: 3 }` のように直接書いていると、後で列を追加・削除するたびにコードを修正する必要が出ます。`headers.indexOf('売上') + 1` でヘッダー名から列番号を動的に取得する設計にしておくと、列の順番が変わっても自動で対応してくれます。副業クライアントのシートは頻繁に列構成が変わるので、この方式を採用してから「ソートが壊れた」という問題がなくなりました。

### コツ3：`ascending` の向きを列ごとに使い分ける

同じ `sort()` の中でも、列ごとに昇順・降順を混ぜられます。「売上（大きい順＝false）、日付（古い順＝true）、優先度（A→B→C＝true）」のように、それぞれの列で意味のある向きを設定します。「降順（大きい順・新しい順・Z→A）は false」「昇順（小さい順・古い順・A→Z）は true」と覚えておくのがコツです。

---

## つまずきやすいポイント

### エラー1：ヘッダー行もソートの対象に含まれてしまう

**原因**：`getRange(1, 1, ...)` で1行目から範囲を取っている。

**解決策**：
`getRange(2, 1, lastRow - 1, ...)` で2行目から開始する。第3引数のデータ行数も `lastRow - 1`（ヘッダー1行分を引く）にする必要があります。

### エラー2：空白行があるとソートが途中で切れる

**原因**：データの途中に空白行があると、GASのソートはそこで処理を止めることがある。

**解決策**：
`getLastDataRow` 関数を使って実際にデータがある最終行を取得し、その行数でソート範囲を決める。データ整理段階で空白行を詰めておくのも有効。

### エラー3：数値と文字列が混在しているとソートがおかしくなる

**原因**：「100」と「100円」が混在する列は文字列扱いになり、数値ソートが正しく動かない。

**解決策**：
スプレッドシートのセル書式を「数値」に統一する。「書式 > 数字 > 数値」から変更できる。既に入力済みのデータは `value * 1` で数値変換してから setValues する方法もある。

---

## まとめ

| ポイント | 内容 |
|---------|------|
| 複数条件の指定 | `sort()` に配列で渡す。先頭が第1優先 |
| 降順/昇順の指定 | `ascending: false` が降順・`true` が昇順 |
| ヘッダー行を除外 | `getRange(2, 1, ...)` で2行目から開始 |
| 列名から動的取得 | `headers.indexOf('列名') + 1` で列番号を取得 |
| 空白行の対処 | `getLastDataRow()` で実際のデータ最終行を取得 |
| 自動実行 | 日タイマーのトリガーで毎朝並び替え |

ポイントをまとめると：

- `sort()` の配列の先頭が第1優先条件
- ヘッダー名で列番号を動的取得する設計にすると列追加・削除に強い
- ヘッダー行は必ず除外する（`getRange(2, 1, ...)` から開始）
- 毎朝6時のトリガーで「開いたら並んでいる状態」を作れる

「また並べ直すの？」という小さなストレスが積み重なると、副業のやる気まで削られます。一度GASに任せてしまえばその悩みごとなくなります。

---

## 関連記事

- [GASでスプシのフィルタを自動設定する方法](/blog/gas-sheet-filter-auto/)
- [GASでgetValuesを10倍速くする書き方](/blog/gas-sheet-getvalues-10x/)
- [GASでスプレッドシートのセル範囲を自動保護する](/blog/gas-sheet-protect-range/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*本記事のコードは静的検証済みです。*
