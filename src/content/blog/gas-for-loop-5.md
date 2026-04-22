---
title: "GASループfor文5種類使い分け完全マスター"
description: "GASで使えるfor/for…of/for…in/forEach/whileの5種類を、現役ナースみっちゃんママが実務目線で使い分け解説。"
pubDate: "2026-05-05T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","loop","forEach"]
tagNames: ["GAS","ループ","forEach"]
readingTime: 5
keywords: ["GAS for文"]
---

こんにちは、みっちゃんママです。今日は「GASのfor文」について、5種類の書き方とその使い分けをお話します。ループが書けるようになると、スプレッドシートの自動処理が一気に楽になりますよ。

## こんな悩みありませんか？

- 「`for`文は書けるけど、`forEach`との違いがモヤっとしてる」
- 「`for...of`と`for...in`ってどっちを使えばいいの？」
- 「ループの書き方が毎回同じで、コードがダサい気がする」

私も昔は全部`for (var i = 0; ...)`でゴリ押ししてました。でも配列操作ばかりの勤怠集計を書くうちに、「これ`forEach`にしたほうが読みやすいな」と気づいたんです。

## 全体像：GASで使える5種類のループ

| 書き方 | 向いている場面 |
|------|-------------|
| `for` | インデックスが必要／途中でbreakしたい |
| `for...of` | 配列の要素を順に使いたい |
| `for...in` | オブジェクトのキーを回したい |
| `forEach` | 配列に対して関数を適用したい |
| `while` | 終了条件が回数で決まらない |

全部使えるようになる必要はありませんが、**目的に合ったものを選べる**と書きやすさが段違いです。

## ポイント3つ：主役3種類の使い分け

### ポイント1：古典的な`for`（インデックスが主役）

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

`i`というインデックスが使えるので、「最初の行だけスキップ」「途中で`break`」みたいな制御も自由自在。ヘッダー行を飛ばしたいなら`i = 1`から始めればOK。

```javascript
for (let i = 1; i < values.length; i++) {
  // ヘッダーを除いて処理
}
```

### ポイント2：`for...of`（要素が主役）

インデックスが要らないときは`for...of`がスッキリ。

```javascript
const names = ['長女', '次女', '三女'];
for (const name of names) {
  console.log(name + 'のお弁当を詰める');
}
```

`for`より短くて読みやすい。`break`や`continue`も使えるので、途中で抜ける処理もOKです。

### ポイント3：`forEach`（関数型っぽく書く）

配列のメソッドとして関数を渡す書き方。

```javascript
const prices = [100, 200, 300];
prices.forEach((price, index) => {
  console.log(`${index}番目：${price}円`);
});
```

`forEach`の注意点として、**途中で`break`できません**。最後まで回します。途中で止めたいなら`for`や`for...of`を選びましょう。

## 応用：残り2つと注意点

### `for...in`はオブジェクト向け

```javascript
const user = { name: 'みっちゃん', role: 'ナース' };
for (const key in user) {
  console.log(key + ': ' + user[key]);
}
```

配列に使うと順番が保証されないケースがあるので、配列には`for...of`や`forEach`を推奨。オブジェクトのキー列挙専用と覚えるのが安全です。

### `while`は条件ループ

回数が決まっていない処理に。

```javascript
let row = 1;
while (sheet.getRange(row, 1).getValue() !== '') {
  row++;
}
// 最初の空セルの行番号がrowに入る
```

スプレッドシートで「値がある行だけ処理」みたいなケースで使えます。ただし、**無限ループには本当に注意**。ナイトシフトで無限ループを仕込んでスクリプトが6分で強制終了した経験、私あります。

### 実務で迷ったときの選び方

- 2次元配列を行ごとに回す → `for` でインデックスを使う
- 配列の中身だけ見る → `for...of`
- 各要素に同じ処理を適用する → `forEach`
- 回数が決まっていない → `while`
- オブジェクトのキーが欲しい → `for...in`

**GASあるある：`getValues()`で取った2次元配列は、`for...of`で1行ずつ取り出すのが一番読みやすい**ですよ。

```javascript
const values = sheet.getDataRange().getValues();
for (const row of values) {
  const [name, age, shift] = row;
  console.log(`${name}（${age}）: ${shift}`);
}
```

## まとめ

- インデックスが欲しいなら`for`、いらないなら`for...of`
- 要素に処理を適用するだけなら`forEach`（ただし`break`不可）
- オブジェクトのキーは`for...in`、条件で回すなら`while`
- 2次元配列には`for...of`＋分割代入がスッキリ

5種類と聞くと身構えますが、実務で日常的に使うのは`for`/`for...of`/`forEach`の3つ。まずはこの3つを使いこなせるようになると、コードがグッと読みやすくなります。

## 関連記事

- [GAS変数const/letの違いと使い分け3パターン](/blog/gas-variable-const-let/)
- [GAS配列操作push/map/filter早見表15個](/blog/gas-array-basic/)
- [GASログ出力console.logでデバッグ完全版](/blog/gas-console-log-debug/)

---

### この記事を書いた人：みっちゃんママ

三姉妹の母で現役ナース、夜勤明けにGASを書いている副業プログラマーです。病棟の事務仕事をGASで片っ端から自動化してきた経験をもとに、「コードが苦手なママでも読めるGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
