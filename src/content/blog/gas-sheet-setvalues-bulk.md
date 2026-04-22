---
title: "GAS setValuesで1000行一括書き込み｜100倍速くなる書き方"
description: "Google Apps Scriptのスプシ書き込みを高速化する「setValuesによる一括書き込み」の使い方を解説。ループで1セルずつ書くと100倍遅くなる理由と、その回避コード付き。"
pubDate: "2026-05-01T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas", "spreadsheet", "performance"]
tagNames: ["GAS", "スプレッドシート", "高速化"]
readingTime: 5
---
「スプレッドシートにデータを書き込むGASが、毎日タイムアウトする」。

多くの人がハマる原因は、**セルを1つずつ書き込んでいる**こと。実は`setValues()`で一括書き込みに変えるだけで、**50〜100倍高速化**します。

本記事では、書き込み速度を劇的に改善するテクニックを具体コードで解説します。

## なぜ遅い？2つの書き方の違い

### 悪い例：ループで1セルずつ

```javascript
// 1000行の処理に約3〜5分かかる
for (let i = 0; i < 1000; i++) {
  sheet.getRange(i + 1, 1).setValue(data[i]);
}
```

### 良い例：配列で一括

```javascript
// 1000行の処理が1秒以内
const values = data.map(d => [d]);  // 2次元配列化
sheet.getRange(1, 1, values.length, 1).setValues(values);
```

**原因**: `setValue()` はスプシに毎回APIコールが飛びます。1000回ループすると1000回通信。これが遅さの正体。

## 正しいsetValuesの書き方

### パターン1: 1列に書き込む

```javascript
const data = ['A', 'B', 'C', 'D'];
const values = data.map(v => [v]);  // [[A],[B],[C],[D]]
sheet.getRange(1, 1, values.length, 1).setValues(values);
```

### パターン2: 複数列に書き込む

```javascript
const data = [
  ['田中', '東京', 30],
  ['佐藤', '大阪', 25],
  ['鈴木', '福岡', 28]
];
sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
```

## 抑えておきたい3つのポイント

### ポイント1: 配列は必ず2次元

`setValues()` は2次元配列しか受け付けません。

```javascript
// NG
sheet.getRange('A1:A5').setValues([1,2,3,4,5]);  // エラー

// OK
sheet.getRange('A1:A5').setValues([[1],[2],[3],[4],[5]]);
```

### ポイント2: 範囲と配列サイズを一致

`getRange(行,列,高さ,幅)` の `高さ×幅` が配列のサイズと一致している必要があります。

```javascript
// 3行2列の範囲に3行2列の配列
sheet.getRange(1, 1, 3, 2).setValues([['A','B'],['C','D'],['E','F']]);
```

### ポイント3: getValuesも同じく一括取得

読み込みも `getValue` ループより `getValues` 一発が速い。

```javascript
// 遅い
for (let i = 1; i <= 1000; i++) {
  const v = sheet.getRange(i, 1).getValue();
}

// 速い
const data = sheet.getRange(1, 1, 1000, 1).getValues();
data.forEach(row => { ... });
```

## 応用：既存データを加工して一括更新

例: 「A列の値を2倍にしてB列に書き込む」

```javascript
function doubleValues() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const src = sheet.getRange(1, 1, lastRow, 1).getValues();
  const result = src.map(([v]) => [v * 2]);
  sheet.getRange(1, 2, result.length, 1).setValues(result);
}
```

## 応用：大量データをバッチ分割

10万行以上のデータは、GASの6分制限に引っかかる可能性があるので分割実行が推奨。

```javascript
function processBatch() {
  const props = PropertiesService.getScriptProperties();
  const start = Number(props.getProperty('startIndex') || 0);
  const batchSize = 5000;

  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getRange(start + 1, 1, batchSize, 3).getValues();
  // データ加工
  const result = data.map(row => [row[0], row[1], row[0] + row[1]]);
  sheet.getRange(start + 1, 1, result.length, 3).setValues(result);

  props.setProperty('startIndex', String(start + batchSize));
}
```

これを**5分おきトリガー**に紐付ければ、10万行でも数十分で完了します。

## 速度比較の実測

| 方法 | 1000行 | 10000行 |
|---|---|---|
| ループ setValue | 約180秒 | タイムアウト |
| 配列 setValues | 約1秒 | 約6秒 |

**100倍以上の差**。これを知っているだけで実装のクオリティが別次元になります。

## トラブル：「setValues でエラーが出る」

よくある原因:
- **配列の長さが不均一**（ある行だけ列数が違う）
- **範囲と配列サイズの不一致**
- **undefined や null を含む行**

```javascript
// 必ず正規化
const cleaned = data.map(row => row.map(v => v ?? ''));
```

## 看護師の私の使い方

病院のデータを扱うわけではないですが、副業でメルカリの売上データ（月数百件）をスプシで管理する時、`setValues` に切り替えて処理が15分→20秒に。毎月の締め日の夜が楽になりました。

## まとめ

スプシを扱うGASで、**`setValue`（単数）ループを見かけたら赤信号**。`setValues`（複数）に置き換えるだけで劇的に速くなります。

関連記事: [スプレッドシート毎朝自動整え](/blog/gas-spreadsheet-daily-auto/) / [スプシ重複行を自動削除](/blog/gas-sheet-dedupe/)
