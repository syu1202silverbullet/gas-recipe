---
title: "GASループfor文5種類使い分け完全マスター｜for/for…of/forEach/while徹底比較"
description: "GASで使えるfor・for…of・for…in・forEach・whileの5種類を、現役ナース副業プログラマーの凛が実務目線で使い分け解説。2次元配列のループや無限ループ対策まで網羅します。"
pubDate: "2026-05-17T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","loop","forEach","for-of","while"]
tagNames: ["GAS","ループ","forEach","for...of","while"]
readingTime: 8
keywords: ["GAS for文","GAS forEach","GAS ループ","GAS for of"]
---

こんにちは、凛です。都内で看護師をしながら、副業でWebエンジニアをしています。

まず、同じ仕事をする2つのコードを見比べてください。スプレッドシートにデータを書き込む処理です。

```javascript
// ❌ 遅い：ループの中で毎回 setValue
for (let i = 0; i < data.length; i++) {
  sheet.getRange(i + 1, 1).setValue(data[i]); // 毎回API呼び出し
}

// ✅ 速い：配列にまとめて最後に setValues
const output = data.map((v) => [v]);
sheet.getRange(1, 1, output.length, 1).setValues(output); // 1回だけ
```

1,000行あれば、前者は数十秒、後者は1秒以下で終わります。**GASのAPI呼び出しは1回あたりのオーバーヘッドが大きい**ので、「ループ内でSpreadsheet APIを叩かない」は鉄則。つまり、ループの書き方ひとつで処理速度もコードの読みやすさも大きく変わるんです。

私も昔は全部`for (var i = 0; i < arr.length; i++)`でゴリ押ししてました。でも配列操作ばかりの勤怠集計を書くうちに、「これ`forEach`にしたほうが読みやすいな」「これは`for...of`が自然だな」と気づいたんです。この記事では、GASで使える5種類のループを、そんな実務目線で順番に整理していきます。

## 5種類のループを一望する

| 書き方 | 向いている場面 | break/continue |
|------|-------------|:---:|
| `for` | インデックスが必要／途中でbreakしたい | ✅ |
| `for...of` | 配列の要素を順に使いたい | ✅ |
| `for...in` | オブジェクトのキーを回したい | ✅ |
| `forEach` | 配列に対して関数を適用したい | ❌ |
| `while` | 終了条件が回数で決まらない | ✅ |

全部使えるようになる必要はありません。実務で日常的に使うのは **`for` / `for...of` / `forEach` の3つ**で十分です。まずはこの3つ、順にいきましょう。

## ステップ1：古典的な`for`——インデックスが主役

スプレッドシートの2次元配列を回すときの定番です。

```javascript
function sumColumn(values) {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    total += values[i][0]; // 1列目を合計
  }
  return total;
}
```

`i`というインデックスが使えるので、**「最初の行だけスキップ」「途中で`break`」**みたいな制御も自由自在。ヘッダー行を飛ばしたいなら`i = 1`から始めればOK。

```javascript
for (let i = 1; i < values.length; i++) {
  // ヘッダーを除いて処理
}
```

### `break`と`continue`で流れを制御する

途中で抜けたいときは`break`、その回だけスキップしたいなら`continue`。

```javascript
for (let i = 0; i < values.length; i++) {
  if (values[i][0] === '') continue; // 空行はスキップ
  if (values[i][0] === 'END') break;  // ENDで打ち切り
  // 本処理
}
```

## ステップ2：`for...of`——要素が主役

インデックスが要らないときは`for...of`がスッキリ。

```javascript
const names = ['長女', '次女', '三女'];
for (const name of names) {
  console.log(name + 'さんに連絡する');
}
```

`for`より短くて読みやすい。`break`や`continue`も使えるので、途中で抜ける処理もOKです。

### 2次元配列×分割代入が最強コンビ

スプレッドシートから取った`values`は2次元配列なので、`for...of`＋分割代入で1行ずつ取り出すのが一番読みやすいです。

```javascript
const values = sheet.getDataRange().getValues();
for (const [name, age, shift] of values) {
  console.log(`${name}（${age}）: ${shift}`);
}
```

列名で取り出せるので、`row[0]`・`row[1]`みたいな数字だらけのコードから卒業できます。冒頭で「昔の私はvarでゴリ押し」と書きましたが、Before/Afterで一番差が出るのがここ。数字の添字が並んだコードは、1週間後の自分がもう読めません。

## ステップ3：`forEach`——関数型っぽく書く

配列のメソッドとして関数を渡す書き方です。

```javascript
const prices = [100, 200, 300];
prices.forEach((price, index) => {
  console.log(`${index}番目：${price}円`);
});
```

第2引数に`index`が取れるので、「何番目の要素か」も扱えます。

**最大の注意点：`forEach`は`break`できません**。最後まで回し切ります。途中で止めたいなら`for`か`for...of`を選びましょう。`return`を書いても、その1回分がスキップされるだけで次の要素に進みます。

```javascript
prices.forEach((price) => {
  if (price > 200) return; // その回だけスキップ（continueと同等）
  console.log(price);
});
// breakはできないので、大きな配列を途中で切り上げたい時は不向き
```

## 補欠の2人：`for...in`と`while`

主役3つに比べると出番は少ないですが、知らないと困る場面があります。

### `for...in`はオブジェクト専用と割り切る

```javascript
const user = { name: '佐藤', role: 'ナース', shift: '夜勤' };
for (const key in user) {
  console.log(key + ': ' + user[key]);
}
```

**配列に使うと順番が保証されないケースがある**ので、配列には`for...of`や`forEach`を推奨。`for...in`はオブジェクトのキー列挙専用と覚えるのが安全です。

### `while`は「回数が決まらない」ときに

```javascript
let row = 1;
while (sheet.getRange(row, 1).getValue() !== '') {
  row++;
}
// 最初の空セルの行番号がrowに入る
```

スプレッドシートで「値がある行だけ処理」みたいなケースで使えます。ただし、`while`には応用編で触れる大きな罠があります。

## 応用編1：無限ループ対策——6分制限とセットで覚える

**`while`は本当に無限ループに注意**。ナイトシフトで無限ループを仕込んでGASが6分で強制終了した経験、私あります…。

対策は3つ。

1. **最大回数を必ず用意する**

```javascript
let count = 0;
while (condition) {
  if (count++ > 10000) break; // 保険
  // 処理
}
```

2. **条件に確実に変化する処理を書く**：ループ内で条件変数が更新されるか毎回確認

3. **開発中は`console.log`で周回数を確認**

```javascript
while (condition) {
  console.log('loop count:', count);
  count++;
}
```

GASには**6分の実行時間上限**があるので、無限ループは即トリガー失敗になります。詳しくは [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/) で。

## 応用編2：迷ったときの選び方早見表

ここまでの内容を、実務で迷ったとき用に1枚にまとめておきます。

| 状況 | 選ぶループ |
|---|---|
| 2次元配列を行ごとに回す | `for`（インデックスが要るとき）or `for...of`＋分割代入 |
| 配列の中身だけ見る | `for...of` |
| 各要素に同じ処理を適用する | `forEach` |
| 途中で抜けたい | `for` か `for...of`（`forEach`は不可） |
| 回数が決まっていない | `while` |
| オブジェクトのキーが欲しい | `for...in` |

そして速度で迷ったら、冒頭のBefore/Afterを思い出してください。どのループを選ぶかより、**ループの中でAPIを叩いていないか**のほうが、体感速度への影響はずっと大きいです。書き込みは配列に溜めて、最後に一括`setValues`。これだけで「遅いGAS」の悩みの半分は消えます。

## おわりに

5種類と聞くと身構えますが、日常で使うのは`for`/`for...of`/`forEach`の3つです。ここさえ押さえれば、GASのループで困ることはまずありません。

個人的なおすすめは、今度書くスクリプトで`row[0]`と書きそうになったら、一度手を止めて`for...of`＋分割代入に置き換えてみること。最初はまどろっこしく感じるかもしれませんが、読み返したときの楽さが全然違います。掲載コードは構文を確認して載せていますが、実行の際はお手元のシート構成に合わせて調整してくださいね。

## 関連記事

- [GAS変数const/letの違いと使い分け3パターン](/blog/gas-variable-const-let/)
- [GAS関数の書き方7例とreturn徹底解説](/blog/gas-function-basic/)
- [GAS配列操作push/map/filter早見表15個](/blog/gas-array-basic/)
- [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
