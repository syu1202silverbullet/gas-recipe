---
title: "GAS setValuesで1000行を一括書き込みする高速化テクニック"
description: "GASでスプレッドシートへの書き込みが遅いときの直し方を解説。setValueの繰り返しが遅い理由、setValuesでまとめて書く方法、二次元配列の作り方、よく出る「行数と列数が一致しません」エラーの対処、実行時間6分の壁を超えないための書き方までまとめました。"
pubDate: "2026-05-18T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","performance"]
tagNames: ["GAS","スプレッドシート","高速化"]
readingTime: 12
---

病棟で働きながらGASの副業を続けています。今日は、最初にぶつかって、そして乗り越えた壁の話です。

はじめて1,000行のデータを扱うスクリプトを書いたとき、**実行が終わりませんでした**。5分待っても終わらず、最後は「Script took too long」で強制終了。焦って処理を減らそうとしましたが、原因はデータ量ではなく**書き方**でした。

直したら、数分かかっていた処理が**2秒**で終わりました。この記事では、その直し方を具体的に説明します。

## なぜ遅いのか

まず、遅いコードを見てください。

```javascript
// ❌ 遅い書き方
function slowWrite() {
  const sheet = SpreadsheetApp.getActiveSheet();
  for (let i = 1; i <= 1000; i++) {
    sheet.getRange(i, 1).setValue(i);          // 1回目のやりとり
    sheet.getRange(i, 2).setValue('データ' + i); // 2回目のやりとり
  }
}
```

このコードは、スプレッドシートと**2,000回**やりとりしています。

GASのコードは Googleのサーバーで動き、スプレッドシートは別のサービスです。`setValue()` を呼ぶたびに、この2つの間で通信が発生します。1回あたりは短くても、2,000回積み重なれば数分になります。

**遅さの原因は計算量ではなく、往復の回数**です。ここが分かると、直し方も見えてきます。

## 速い書き方：まとめて1回で書く

```javascript
// ✅ 速い書き方
function fastWrite() {
  const sheet = SpreadsheetApp.getActiveSheet();

  // まずメモリ上で二次元配列を作る
  const rows = [];
  for (let i = 1; i <= 1000; i++) {
    rows.push([i, 'データ' + i]);
  }

  // 書き込みは1回だけ
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}
```

やりとりは**1回**です。配列を組み立てる部分はGAS内部の処理なので、ほぼ一瞬で終わります。

私の環境で1,000行×2列を試したときは、`setValue` を繰り返すやり方が**数分**、`setValues` でまとめる書き方が**2秒前後**でした。桁が変わります。

## 読み取りも同じ

書き込みだけでなく、読み取りも同じ考え方です。

```javascript
// ❌ 遅い
for (let i = 1; i <= lastRow; i++) {
  const name = sheet.getRange(i, 1).getValue();
  // …
}

// ✅ 速い
const values = sheet.getDataRange().getValues();   // 1回で全部読む
values.forEach(function (row) {
  const name = row[0];
  // …
});
```

**「1回で読んで、配列で処理して、1回で書く」**。GASでシートを扱うときの基本形はこれだけです。

## setValuesを使うときのルール

### ルール1：必ず二次元配列を渡す

`setValues` に渡すのは「行の配列」で、各行が「列の配列」です。

```javascript
const rows = [
  ['田中', 30, '内科'],   // 1行目
  ['佐藤', 25, '外科'],   // 2行目
];
sheet.getRange(1, 1, 2, 3).setValues(rows);   // 2行3列
```

1行だけ書くときも、配列の入れ子にする必要があります。

```javascript
sheet.getRange(1, 1, 1, 3).setValues([['田中', 30, '内科']]);   // ← 二重の括弧
```

### ルール2：範囲の大きさと配列の形を合わせる

`getRange(行, 列, 行数, 列数)` の**行数・列数**と、渡す配列の形が一致していないとエラーになります。

```javascript
// 行数は rows.length、列数は rows[0].length を使えば間違えない
sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
```

### ルール3：各行の長さを揃える

```javascript
// ❌ これはエラーになる（列数がバラバラ）
const bad = [
  ['田中', 30, '内科'],
  ['佐藤', 25],          // 2つしかない
];
```

途中に短い行があると失敗します。作るときに空文字で埋めておきます。

```javascript
const rows = data.map(function (d) {
  return [d.name || '', d.age || '', d.dept || ''];   // 必ず3つ返す
});
```

## よく出るエラーと対処

### 「データの行数が範囲の行数と一致しません」

範囲の大きさと配列の形が違います。よくある原因は3つ。

- 行数を固定値で書いている（`getRange(1, 1, 100, 3)` なのにデータが98行）
- 途中に長さの違う行がある
- 二重の括弧を忘れている（1行だけ書くとき）

### 「Range not found」／空のシートで落ちる

データが0件のとき `getRange(1, 1, 0, 3)` になり、行数0は指定できないためエラーになります。書き込む前に件数を確認します。

```javascript
if (rows.length === 0) {
  console.log('書き込むデータがありません');
  return;
}
sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
```

### 数字が文字列になってしまう

配列に `'1000'` のように文字列で入れると、シート上でも文字列になり、合計が計算できません。数値として書きたいときは `Number()` で変換します。

```javascript
rows.push([Number(price), name]);
```

### 日付がおかしくなる

日付は `new Date()` のDateオブジェクトのまま渡します。文字列で渡すと、シート側の書式によっては別の日付に解釈されることがあります。

## 追記のときの書き方

行を末尾に足したいときは `appendRow` が手軽ですが、**これも1回のやりとり**です。何十行も足すなら、まとめて書くほうが速くなります。

```javascript
// ❌ 100行を1つずつ追記
rows.forEach(function (r) { sheet.appendRow(r); });

// ✅ まとめて追記
const start = sheet.getLastRow() + 1;
sheet.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
```

数行なら `appendRow` で十分です。**数十行を超えたらまとめる**、くらいの感覚で使い分けています。

## 書式もまとめて設定する

値だけでなく、背景色や文字色も一括で指定できます。

```javascript
// 行ごとに色を変える（値と同じ形の二次元配列を渡す）
const colors = rows.map(function (r) {
  return r.map(function () { return Number(r[1]) < 0 ? '#ffe5e5' : null; });
});
sheet.getRange(1, 1, rows.length, rows[0].length).setBackgrounds(colors);
```

`setBackgrounds` `setFontColors` `setNumberFormats` など、**複数形のメソッド**はどれも一括版です。1セルずつ `setBackground` を呼ぶと、値のときと同じように遅くなります。

## それでも6分を超えるとき

まとめ書きにしても終わらないほどデータが多い場合は、処理を分割します。どこまで終わったかを記録して、次の実行で続きから始める形です。

```javascript
function chunkedProcess() {
  const props  = PropertiesService.getScriptProperties();
  const start  = Number(props.getProperty('nextRow') || '2');
  const sheet  = SpreadsheetApp.getActiveSheet();
  const values = sheet.getDataRange().getValues();
  const end    = Math.min(start + 1000, values.length);

  const rows = [];
  for (let i = start; i < end; i++) {
    rows.push([process_(values[i])]);   // 何らかの処理
  }
  if (rows.length > 0) sheet.getRange(start + 1, 5, rows.length, 1).setValues(rows);

  if (end >= values.length) {
    props.deleteProperty('nextRow');
    console.log('全件完了');
  } else {
    props.setProperty('nextRow', String(end));
    console.log(end + '行目まで完了');
  }
}
```

これを5分おきのトリガーで回せば、何万行でも順番に片付きます。

## まとめ

- GASが遅いのは計算ではなく、**シートとのやりとりの回数**
- **1回で読んで、配列で処理して、1回で書く**が基本形
- `setValues` には**二次元配列**を渡し、範囲の大きさと形を合わせる
- 各行の長さを揃える。件数0のときは書き込まない
- 書式も複数形のメソッドで一括指定できる
- どうしても終わらないときは、**続きから再開できる形**に分割する

私はこれを覚えてから、「GASは遅い」と思わなくなりました。遅いのはGASではなく、自分の書き方だったという話です。

## 関連記事

- [GASで条件に合う行を安全に一括削除する（下から回す鉄則）](/blog/gas-sheet-delete-rows-condition/)
- [スプレッドシートを毎朝自動で整える｜GASトリガーを使い倒す基本テクニック](/blog/gas-spreadsheet-daily-auto/)
- [GASよく出るエラー10選と解決コード集｜辞書代わりに使える完全版](/blog/gas-error-exception/)

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。
