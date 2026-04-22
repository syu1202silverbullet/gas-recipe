---
title: "スプシ重複行を自動削除するGAS完全版｜条件指定もOK"
description: "スプレッドシートの重複行をGoogle Apps Scriptで自動削除する方法を、シンプル版・列指定版・差分削除版の3パターンで解説。大量データでも高速に動くコード付き。"
pubDate: "2026-04-26T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas", "spreadsheet", "data-cleaning"]
tagNames: ["GAS", "スプレッドシート", "データ整理"]
readingTime: 5
---
「フォームで集めたアンケートが同じメアドで何件も来てる」「仕入れデータに重複がある」。手作業で削除するのは現実的じゃないですよね。

本記事では、**スプレッドシートの重複行をGASで自動削除する3パターン**を、実際に動くコード付きで紹介します。

## パターン1: 全列一致の重複を削除

最もシンプルなケース。「1行まるごと同じ」なら1つだけ残して他を削除。

```javascript
function dedupeAll() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const seen = new Set();
  const uniqueRows = [];

  data.forEach(row => {
    const key = row.join('|');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    }
  });

  sheet.clearContents();
  sheet.getRange(1, 1, uniqueRows.length, uniqueRows[0].length).setValues(uniqueRows);
}
```

**処理の流れ**:
1. 全データを配列で取得
2. 各行を文字列キーに変換（`join('|')`）
3. Setに登録しながら新しいものだけ残す
4. シートをクリアして新配列を書き戻す

## パターン2: 特定列（例：メアド）で重複判定

アンケートなら「メアドが重複している行を統合」がよくある要件。

```javascript
function dedupeByColumn() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const header = data.shift();

  const emailCol = header.indexOf('メールアドレス');
  if (emailCol === -1) throw new Error('メールアドレス列が見つかりません');

  const seen = new Set();
  const uniqueRows = data.filter(row => {
    const email = row[emailCol];
    if (seen.has(email)) return false;
    seen.add(email);
    return true;
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  if (uniqueRows.length > 0) {
    sheet.getRange(2, 1, uniqueRows.length, header.length).setValues(uniqueRows);
  }
}
```

**ポイント**:
- `header.indexOf('メールアドレス')` で列番号を取得
- `filter()` で条件に合う行だけ残す
- 最初の出現が残り、2回目以降は削除される

## パターン3: 後から入った重複だけ別シートへ退避

「削除するのは怖い、別シートに逃がしたい」というニーズも多いです。

```javascript
function separateDuplicates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const main = ss.getActiveSheet();
  let dupSheet = ss.getSheetByName('重複データ');
  if (!dupSheet) dupSheet = ss.insertSheet('重複データ');

  const data = main.getDataRange().getValues();
  const header = data.shift();

  const seen = new Set();
  const unique = [];
  const duplicates = [];

  data.forEach(row => {
    const key = row.join('|');
    if (seen.has(key)) {
      duplicates.push(row);
    } else {
      seen.add(key);
      unique.push(row);
    }
  });

  main.clearContents();
  main.getRange(1, 1, 1, header.length).setValues([header]);
  if (unique.length > 0) {
    main.getRange(2, 1, unique.length, header.length).setValues(unique);
  }

  dupSheet.clear();
  dupSheet.getRange(1, 1, 1, header.length).setValues([header]);
  if (duplicates.length > 0) {
    dupSheet.getRange(2, 1, duplicates.length, header.length).setValues(duplicates);
  }
}
```

## 抑えておくべき3つのポイント

### ポイント1: 必ずバックアップ

重複削除は取り返しがつきません。実行前に `ファイル → コピーを作成` でバックアップを。

### ポイント2: 大量データは getValues/setValues で一気に

1セルずつ `getValue()` で回すと爆遅。**一括で配列に取り出して処理**が鉄則です。

### ポイント3: ヘッダー行を必ず分離

`data.shift()` でヘッダーを退避しないと、「列名」まで重複削除候補に入って事故ります。

## 自動化する：トリガーで毎日深夜に実行

フォームで毎日データが追加されるサイトなら、**毎日深夜2時に自動重複削除**するのが便利。

```javascript
function setupDailyDedupe() {
  ScriptApp.newTrigger('dedupeByColumn')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();
}
```

## トラブル：「何度実行しても重複が消えない」

よくある原因は **見えないスペース**。

```
"tanaka@example.com"
"tanaka@example.com " ← 末尾スペース
```

この場合、文字列としては別物扱いされて重複判定から外れます。

```javascript
const email = String(row[emailCol]).trim().toLowerCase();
```

`trim()` と `toLowerCase()` で正規化してから比較するのがコツ。

## まとめ

スプレッドシート重複削除は、**GASを使えば全自動化が可能**です。手作業で何時間もかけていた作業が、一度書けば今後永久に自動化されます。

関連記事: [スプレッドシート毎朝自動整え](/blog/gas-spreadsheet-daily-auto/) / [GASトリガー完全ガイド](/blog/gas-trigger-setup/)
