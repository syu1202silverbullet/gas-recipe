---
title: "GASループfor文5種類使い分け完全マスター｜for/for…of/forEach/while徹底比較"
description: "GASで使えるfor・for…of・for…in・forEach・whileの5種類を、現役ナース副業プログラマーの凛が実務目線で使い分け解説。2次元配列のループや無限ループ対策まで網羅します。"
pubDate: "TBD"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","loop","forEach","for-of","while"]
tagNames: ["GAS","ループ","forEach","for...of","while"]
readingTime: 8
keywords: ["GAS for文","GAS forEach","GAS ループ","GAS for of"]
---

こんにちは、凛です。都内で看護師をしながら、副業でWebエンジニアをしています。今日は「**GASのfor文**」について、5種類の書き方とその使い分けをがっつり解説します。ループが書けるようになると、スプレッドシートの自動処理が一気に楽になりますよ。

「GAS for文」で検索してここに来た方が、読み終わったあとすぐコードに戻れるレベルを意識して書いています。

## こんな悩みありませんか？

- 「`for`文は書けるけど、`forEach`との違いがモヤっとしてる」
- 「`for...of`と`for...in`ってどっちを使えばいいの？」
- 「ループの書き方が毎回同じで、コードがダサい気がする」
- 「`forEach`で途中で抜けたいのに`break`が効かない」
- 「無限ループになってGASが強制終了した…」

私も昔は全部`for (var i = 0; i < arr.length; i++)`でゴリ押ししてました。でも配列操作ばかりの勤怠集計を書くうちに、「これ`forEach`にしたほうが読みやすいな」「これは`for...of`が自然だな」と気づいたんです。

## GASで使える5種類のループ全体像

| 書き方 | 向いている場面 | break/continue |
|------|-------------|:---:|
| `for` | インデックスが必要／途中でbreakしたい | ✅ |
| `for...of` | 配列の要素を順に使いたい | ✅ |
| `for...in` | オブジェクトのキーを回したい | ✅ |
| `forEach` | 配列に対して関数を適用したい | ❌ |
| `while` | 終了条件が回数で決まらない | ✅ |

全部使えるようになる必要はありません。実務で日常的に使うのは **`for` / `for...of` / `forEach` の3つ**で十分です。まずはこの3つを使いこなせるようになると、コードがグッと読みやすくなります。

## 主役3種類の使い分け

### 1. 古典的な`for`：インデックスが主役

スプレッドシートの2次元配列を回すときの定番。

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

#### `for`で`break`と`continue`

途中で抜けたいときは`break`、その回だけスキップしたいなら`continue`。

```javascript
for (let i = 0; i < values.length; i++) {
  if (values[i][0] === '') continue; // 空行はスキップ
  if (values[i][0] === 'END') break;  // ENDで打ち切り
  // 本処理
}
```

### 2. `for...of`：要素が主役

インデックスが要らないときは`for...of`がスッキリ。

```javascript
const names = ['長女', '次女', '三女'];
for (const name of names) {
  console.log(name + 'さんに連絡する');
}
```

`for`より短くて読みやすい。`break`や`continue`も使えるので、途中で抜ける処理もOKです。

#### 2次元配列×分割代入が最強コンビ

スプレッドシートから取った`values`は2次元配列なので、`for...of`＋分割代入で1行ずつ取り出すのが一番読みやすいです。

```javascript
const values = sheet.getDataRange().getValues();
for (const [name, age, shift] of values) {
  console.log(`${name}（${age}）: ${shift}`);
}
```

列名で取り出せるので、`row[0]`・`row[1]`みたいな数字だらけのコードから卒業できます。

### 3. `forEach`：関数型っぽく書く

配列のメソッドとして関数を渡す書き方。

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

## 残り2つ：`for...in`と`while`

### `for...in`はオブジェクト向け

```javascript
const user = { name: '佐藤', role: 'ナース', shift: '夜勤' };
for (const key in user) {
  console.log(key + ': ' + user[key]);
}
```

**配列に使うと順番が保証されないケースがある**ので、配列には`for...of`や`forEach`を推奨。`for...in`はオブジェクトのキー列挙専用と覚えるのが安全です。

### `while`は条件ループ

回数が決まっていない処理に。

```javascript
let row = 1;
while (sheet.getRange(row, 1).getValue() !== '') {
  row++;
}
// 最初の空セルの行番号がrowに入る
```

スプレッドシートで「値がある行だけ処理」みたいなケースで使えます。

## 無限ループ対策：GASの6分制限とセットで覚える

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

## 実務で迷ったときの選び方フローチャート

| 状況 | 選ぶループ |
|---|---|
| 2次元配列を行ごとに回す | `for`（インデックスが要るとき）or `for...of`＋分割代入 |
| 配列の中身だけ見る | `for...of` |
| 各要素に同じ処理を適用する | `forEach` |
| 途中で抜けたい | `for` か `for...of`（`forEach`は不可） |
| 回数が決まっていない | `while` |
| オブジェクトのキーが欲しい | `for...in` |

## パフォーマンスの豆知識

大量データを扱うときは **ループ内でSpreadsheet APIを叩かない**のが鉄則です。

```javascript
// ❌ 遅い：ループの中で毎回 setValue
for (let i = 0; i < data.length; i++) {
  sheet.getRange(i + 1, 1).setValue(data[i]); // 毎回API呼び出し
}

// ✅ 速い：配列にまとめて最後に setValues
const output = data.map((v) => [v]);
sheet.getRange(1, 1, output.length, 1).setValues(output); // 1回だけ
```

1,000行あれば、前者は数十秒、後者は1秒以下で終わります。**GASのAPI呼び出しは1回あたりのオーバーヘッドが大きい**ことを覚えておきましょう。

## まとめ

- インデックスが欲しいなら`for`、いらないなら`for...of`
- 要素に処理を適用するだけなら`forEach`（ただし`break`不可）
- オブジェクトのキーは`for...in`、条件で回すなら`while`
- 2次元配列には`for...of`＋分割代入が鉄板
- `while`は必ず脱出保険を入れる。6分制限に注意
- 大量データは**ループ内でAPIを叩かず、最後に一括`setValues`**

5種類と聞くと身構えますが、日常で使うのは`for`/`for...of`/`forEach`の3つです。ここさえ押さえれば、GASのループで困ることはまずありません。

## 関連記事

- [GAS変数const/letの違いと使い分け3パターン](/blog/gas-variable-const-let/)
- [GAS関数の書き方7例とreturn徹底解説](/blog/gas-function-basic/)
- [GAS配列操作push/map/filter早見表15個](/blog/gas-array-basic/)
- [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
