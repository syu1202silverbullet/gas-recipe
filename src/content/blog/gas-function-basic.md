---
title: "GAS関数の書き方7例とreturn徹底解説"
description: "GAS関数の基本形から無名関数・アロー関数まで、7つの具体例で学ぶ入門ガイド。returnの役割も現役ナースがやさしく解説。"
pubDate: "2026-05-04T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","function","basics"]
tagNames: ["GAS","関数","入門"]
readingTime: 6
keywords: ["GAS 関数 書き方"]
---

こんにちは、みっちゃんママです。三姉妹の母で、夜勤明けの朝にコーヒー片手にGASを書いています。今日は「GASの関数の書き方」について、7つのパターンと`return`の役割を、焦らずじっくりお話しますね。

## こんな悩みありませんか？

- 「`function`って書くけど、これって何者？」
- 「`return`って書く時と書かない時があるけど、ルールがわからない」
- 「アロー関数と普通の関数、どっちで書けばいいの？」

私も最初は`function myFunction()`の中に全部ベタ書きしてました。でも勤怠集計スクリプトが500行を超えたあたりで「これは関数を分けないと死ぬ」と悟り、関数の書き方を勉強し直したんですよね。

## 全体像：関数は「小さな仕事の単位」

関数は、ある入力を受け取って何かを返す（または実行する）、小さな仕事の単位です。病棟で言うと「検温ルーチン」「与薬ルーチン」みたいな、決まった手順のかたまり。

```javascript
function 関数名(引数) {
  // 処理
  return 返す値; // 任意
}
```

GASではこの関数が、トリガー・カスタム関数・メニュー呼び出しなど色々な場面で動きます。

## ポイント3つ：基本を押さえる

### ポイント1：基本形＋引数なし／あり

まずは一番シンプルな2つ。

```javascript
// 例1：引数なし
function sayHello() {
  console.log('こんにちは');
}

// 例2：引数あり
function greet(name) {
  console.log('こんにちは、' + name + 'さん');
}
```

引数は「この関数に渡す材料」です。材料が変わるたびに関数を量産しなくていいので、再利用できます。

### ポイント2：`return`で値を返す

`return`は関数の「お返事」です。呼び出した側に結果を返します。

```javascript
// 例3：returnあり
function addTax(price) {
  return Math.round(price * 1.1);
}

const total = addTax(1000); // total は 1100
```

**`return`を書かない関数は`undefined`を返します。** つまり「お返事なし」。画面表示や書き込みだけして結果を返さない関数も立派にアリです。

```javascript
// 例4：returnなし（副作用だけの関数）
function writeLog(message) {
  console.log('[LOG] ' + message);
  // returnなし → undefinedが返る
}
```

### ポイント3：複数引数・デフォルト引数

引数は複数渡せますし、デフォルト値も設定できます。

```javascript
// 例5：複数引数
function multiply(a, b) {
  return a * b;
}

// 例6：デフォルト引数
function greetWithTitle(name, title = 'さん') {
  return name + title + 'こんにちは';
}

greetWithTitle('みっちゃん');        // 「みっちゃんさんこんにちは」
greetWithTitle('院長', '先生');      // 「院長先生こんにちは」
```

デフォルト引数、知っているだけで`if`文が1つ減ります。

## 応用：無名関数・アロー関数

### 例7：アロー関数

GASはV8ランタイムなので、アロー関数も使えます。短くて便利。

```javascript
const double = (n) => n * 2;
const sum = (a, b) => a + b;

// 配列と組み合わせると真価を発揮
const prices = [100, 200, 300];
const withTax = prices.map((p) => Math.round(p * 1.1));
```

**普通の関数とアロー関数の使い分けの目安：**

- トリガーから呼ばれる関数、スプレッドシートのカスタム関数は`function`宣言で
- `map`/`filter`の中や短い補助関数はアロー関数で

トリガーから呼ぶ関数をアロー関数で書くと呼び出せないケースがあるので、**トップレベルの関数は`function`宣言**が無難です。

### `return`にまつわる小ワザ

- **途中で抜けるreturn**：エラー時に早期リターンするとネストが浅くなって読みやすい

```javascript
function processRow(row) {
  if (!row || row.length === 0) return; // 空行は処理しない
  // 本処理
}
```

- **複数の値を返したい**：オブジェクトか配列にまとめる

```javascript
function parseUser(row) {
  return {
    name: row[0],
    age: row[1],
    shift: row[2]
  };
}
```

## まとめ

- 関数は「小さな仕事の単位」。引数で材料を受け、`return`で結果を返す
- `return`を書かない関数は`undefined`を返す。副作用だけの関数もアリ
- デフォルト引数で`if`が減る、早期リターンでネストが浅くなる
- トップレベルは`function`宣言、補助はアロー関数、が迷わないコツ

関数を適切に分けると、夜勤明けの頭でも「ここが何をしているか」が一目でわかります。三姉妹のお弁当も、おかずを小分けにすると詰めやすいのと同じ理屈ですね。

## 関連記事

- [GAS変数const/letの違いと使い分け3パターン](/blog/gas-variable-const-let/)
- [GASループfor文5種類使い分け完全マスター](/blog/gas-for-loop-5/)
- [GASログ出力console.logでデバッグ完全版](/blog/gas-console-log-debug/)

---

### この記事を書いた人：みっちゃんママ

三姉妹の母で現役ナース、夜勤明けにGASを書いている副業プログラマーです。病棟の事務仕事をGASで片っ端から自動化してきた経験をもとに、「コードが苦手なママでも読めるGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
