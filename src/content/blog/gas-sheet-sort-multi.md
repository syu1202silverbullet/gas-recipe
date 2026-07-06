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

こんにちは、病棟勤務のかたわらGASをいじっている凛です。売上や優先度の表を「まず降順にして、そのあと日付順で…」と並べ替えているうちに、あれ、売上って何列目だっけ、と手が止まる。夜勤明けの火曜の朝、そんな自分に少しうんざりしていました。一度GASに任せてしまってからは、表を開くたびに完璧に並んでいるのが当たり前になって、あの小さなストレスがまるごと消えました。

# 複数条件ソートをGASで自動化する7行｜売上TOP・優先度別並び替え

複数条件ソートを実際に組んでいると、細かいところで「あれ、これどうなるんだっけ」と手が止まる場面がいくつも出てきます。この記事では、私がその都度つまずいて調べたことを、質問と答えの形で並べておきました。上から順に読んでもいいですし、気になった見出しだけ拾ってもらっても大丈夫です。

## そもそもGASのソートって、どう書くの？

`range.sort()` に「どの列を・どの順で並べるか」の指示を渡すだけです。難しい構文はありません。

たとえばC列（3列目）を大きい順に並べたいなら `{ column: 3, ascending: false }`、A列を古い順なら `{ column: 1, ascending: true }`。これを配列にして渡すと、先頭に書いた条件から優先して並びます。ヘッダー行を巻き込みたくないときは、範囲を2行目から取るのがポイント。ここを押さえておけば、あとは応用です。

## 実際に動くコードが欲しいのですが？

はい、これがそのまま使える完全版です。列番号を直接書くシンプルなパターンから、ヘッダー名で列を自動判定する実務向けまで、4パターン入れてあります。自分の使い方に近いものを選んでください。

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

## 毎朝、自動で並んでいる状態にできますか？

できます。時間ベースのトリガーを一度だけ登録しておけば、指定した時刻に勝手にソートが走ります。

1. GASエディタ左メニューの「**時計マーク（トリガー）**」をクリック
2. 「**＋ トリガーを追加**」をクリック
3. 実行する関数：**`multiSortByHeader`** を選択
4. イベントのソース：**「時間主導型」** を選択
5. 時間ベースのトリガーのタイプ：**「日タイマー」** を選択
6. 実行時刻：**「午前6時〜7時」** を選択
7. 「**保存**」をクリック

いきなり本番で回すのは少し怖いので、私は最初に `multiSort` を手動で1回実行して、意図どおりに並ぶか確かめてからトリガーをオンにしています。ここを飛ばすと、朝起きて表がぐちゃぐちゃになっていた、ということが起こりかねません。

## 複数条件のとき、どっちの列が優先されるの？

ここが最初にいちばん混乱したところでした。答えは、**配列の先頭ほど優先度が高い**です。

`[{ column: 3, ascending: false }, { column: 1, ascending: true }]` と書いた場合、まずC列で大きい順に並べます。そのうえで、C列の値が同じ行が複数あったときだけ、A列の古い順で並べる。つまり「売上が同じ人が何人かいたら、その中では日付が古い順」という動きです。優先順位を入れ替えたければ、配列の並びを差し替えるだけ。ここが腑に落ちると、あとの設計がぐっと楽になります。

## 列を追加したらソートが壊れました。どうすれば？

列番号を `{ column: 3 }` のように直接書いていると、列を1つ挿入した瞬間に狙いがズレます。これはもう、避けようがありません。

そこで `headers.indexOf('売上') + 1` のように、ヘッダー名から列番号を取り出す書き方にしておきます。列の順番が変わっても名前で探しにいくので、勝手に追従してくれる。副業クライアントのシートは本当に頻繁に列構成が変わるので、私はこの方式に切り替えてから「ソートが壊れた」という連絡が来なくなりました。正直、最初は面倒に感じて列番号べた書きで済ませていたのですが、切り替えて正解でした。

### 昇順と降順の向きが毎回わからなくなります

同じ `sort()` の中でも、列ごとに向きを混ぜられます。売上は大きい順（false）、日付は古い順（true）、優先度はA→B→C（true）、といった具合です。

覚え方はシンプルで、**大きい順・新しい順・Z→Aが `false`**、**小さい順・古い順・A→Zが `true`**。私は最初これを逆に覚えていて、並びが上下ひっくり返るたびに首をかしげていました。一度この対応を紙に書いて貼っておくと、しばらくは迷いません。

## ソートしたのに変な並びになるのはなぜ？

ここは詰まりやすいので、代表的な3パターンを挙げておきます。

### ヘッダー行まで一緒に並んでしまう

原因は `getRange(1, 1, ...)` のように1行目から範囲を取っていること。ヘッダーもデータの一部として並べ替えられてしまいます。`getRange(2, 1, lastRow - 1, ...)` と2行目から取り、行数もヘッダー1行分を引いた `lastRow - 1` にすると解決します。

### 途中の空白行でソートが切れる

データの間に空っぽの行が挟まっていると、GASのソートがそこで打ち切られることがあります。上のコードに入れた `getLastDataRow` 関数で、実際に値が入っている最終行を取り直してから範囲を決めてください。そもそも空白行を詰めておくのも地味に効きます。

### 数値なのに文字みたいに並ぶ

「100」と「100円」が同じ列に混ざっていると、その列は文字列として扱われて数値の大小が正しく効きません。セル書式を「書式 → 数字 → 数値」で揃えるのが基本です。すでに入ってしまったデータは、`value * 1` で数値化してから書き戻す手もあります。

## ここまでやって思うこと

「また並べ直すの？」という一手間は、ひとつひとつは数秒でも、積み重なると副業のやる気そのものを削っていきます。私にとってはまさにそれが地味な負担でした。

もし迷ったら、まずはパターン2のヘッダー名で列を取る書き方から入るのがおすすめです。列構成の変化に強く、長く使っても壊れにくい。手を動かしてみると、思っていたより早く「開いたら並んでいる」状態にたどり着けるはずです。

---

## 関連記事

- [GASでスプシのフィルタを自動設定する方法](/blog/gas-sheet-filter-auto/)
- [GASでgetValuesを10倍速くする書き方](/blog/gas-sheet-getvalues-10x/)
- [GASでスプレッドシートのセル範囲を自動保護する](/blog/gas-sheet-protect-range/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*掲載コードは構文チェックのうえ載せていますが、お使いのシート構成に合わせて調整してください。*
