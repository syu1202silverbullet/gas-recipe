---
title: "GAS setValuesで1000行を一括書き込む高速化テクニック"
description: "GASのsetValuesを使えばスプレッドシートへの書き込みが劇的に速くなります。看護師が夜勤明けでも続けられる業務効率化の実体験とコード例を紹介します。"
pubDate: "2026-05-01T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas", "spreadsheet", "performance"]
tagNames: ["GAS", "スプレッドシート", "高速化"]
readingTime: 9
---
こんにちは、看護師のみっちゃんです。今日は私が副業で受けている「データ入力系のGAS案件」で一番最初にぶつかった壁、そして乗り越えた経験についてお話しします。

## こんな悩みありませんか？

- スプレッドシートに大量データを書き込むスクリプトが毎回タイムアウトする
- 1行ずつsetValueで書いているけど「実行時間の上限を超えました」と怒られる
- 夜勤明けでぼんやりした頭でもメンテできるコードにしたい

私も最初は1000行の転記処理を1行ずつ`setValue`で書いていて、実行に7分以上かかっていました。「これは病棟の引き継ぎより時間かかる…」と泣きそうになった記憶があります。

でも`setValues`（複数形）を使った一括書き込みに書き直したら、同じ処理が**15秒以下**で終わるようになりました。今回はその全体像を共有します。

## なぜsetValuesが速いのか？全体像

GASとスプレッドシートは、実は「別サーバー」で動いています。そのため`getValue`や`setValue`を呼ぶたびに、ネットワーク越しの通信が発生します。

1行ずつ処理すると、1000行なら1000回の通信。これが遅さの正体です。

一方で`setValues`は、二次元配列をまとめて1回の通信で送ります。だから圧倒的に速い。

```javascript
// 遅い書き方(NG例)
function slowWrite() {
  const sheet = SpreadsheetApp.getActiveSheet();
  for (let i = 1; i <= 1000; i++) {
    sheet.getRange(i, 1).setValue('行' + i);
    sheet.getRange(i, 2).setValue(new Date());
  }
}
```

これを下のように書き換えるだけで劇的に速くなります。

```javascript
// 速い書き方(推奨)
function fastWrite() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = [];
  for (let i = 1; i <= 1000; i++) {
    data.push(['行' + i, new Date()]);
  }
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}
```

ポイントは「配列をメモリ上で組み立てて、最後に1回だけ書き込む」という考え方です。

## 高速化のための3つのポイント

### ポイント1: getValuesで一括読み込み→配列で処理

書き込みだけでなく、読み込みも一括にすることで相乗効果が出ます。

```javascript
function processData() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const values = sheet.getRange(1, 1, lastRow, 3).getValues();

  const result = values.map(row => {
    const [name, price, qty] = row;
    return [name, price, qty, price * qty];
  });

  sheet.getRange(1, 1, result.length, result[0].length).setValues(result);
}
```

私は病棟勤務でナースコール対応の合間にスマホでコードを確認することもあるんですが、この形式なら処理の流れが直感的でわかりやすいんですよね。

### ポイント2: 配列の「形」を絶対に揃える

`setValues`に渡す配列は、**全ての行で列数が同じ**でないとエラーになります。

```javascript
// NG:列数がバラバラ
const ng = [
  ['A', 1],
  ['B', 2, 3],  // ここで死ぬ
  ['C']
];

// OK:列数を揃える
const ok = [
  ['A', 1, ''],
  ['B', 2, 3],
  ['C', '', '']
];
```

夜勤明けで頭が回らない時、ここでハマって1時間溶かしたことがあります。空文字`''`やnullで埋めてでも、必ず揃えましょう。

### ポイント3: 書き込み範囲のサイズを配列と一致させる

`getRange(row, col, numRows, numCols)`の`numRows`と`numCols`は、渡す配列のサイズと完全に一致させます。

```javascript
const data = [
  ['A', 1],
  ['B', 2],
  ['C', 3]
];
// 3行2列の配列なので、レンジも3行2列
sheet.getRange(1, 1, 3, 2).setValues(data);
// または data.length, data[0].length で自動化
sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
```

ハードコードよりも`data.length`で動的に指定するほうが、データが増減しても壊れません。

## 応用:大量データの分割書き込み

10万行レベルになると、さすがにメモリ使用量が気になります。そんな時はチャンク分割が有効です。

```javascript
function writeInChunks(sheet, data, chunkSize = 5000) {
  let startRow = 1;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    sheet.getRange(startRow, 1, chunk.length, chunk[0].length)
         .setValues(chunk);
    startRow += chunk.length;
    SpreadsheetApp.flush();
  }
}
```

`SpreadsheetApp.flush()`を入れておくと、途中でタイムアウトした時も書き込み済みのデータが残るので、家族の夕食時間までに終わらせたい夜勤明けの私にはとてもありがたい保険になっています。

## まとめ

看護師をしながらGAS副業をしていると、「限られた時間で確実に動くコード」が命です。`setValues`による一括処理は、学習コストが低いわりに効果が絶大なので、最初に身につけるべきテクニックだと断言できます。

- `setValue`を`setValues`に変えるだけで数十倍速くなる
- 配列の形（列数）を必ず揃える
- レンジサイズは`data.length`で動的指定
- 大量データはチャンク分割+flushで安全に

私自身、このテクニックを覚えてから、副業の納期に追われることがほぼなくなりました。夜勤明けの2時間でサクッと案件を終わらせて、子どもとの時間を確保できるようになったのが一番の収穫です。

## 関連記事

- [スプシ重複行を自動削除するGAS完全版コード](/blog/gas-sheet-dedupe/)
- [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)
- [フリーランス請求書をGASで毎月自動発行する仕組み](/blog/gas-freelance-invoice/)
