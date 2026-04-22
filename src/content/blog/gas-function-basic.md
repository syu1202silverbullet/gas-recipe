---
title: "GAS関数の書き方7例とreturn徹底解説｜アロー関数・早期リターン・複数戻り値まで"
description: "GAS関数の基本形から無名関数・アロー関数・デフォルト引数・分割代入まで、7つの具体例で学ぶ入門ガイド。returnの役割と早期リターンのコツも現役ナース副業プログラマーがやさしく解説します。"
pubDate: "TBD"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","function","basics","arrow-function","return"]
tagNames: ["GAS","関数","入門","アロー関数","return"]
readingTime: 9
keywords: ["GAS 関数 書き方","GAS function","GAS return","GAS アロー関数"]
---

こんにちは、凛です。夜勤明けの朝にコーヒー片手にGASを書いている看護師×副業Webエンジニアです。今日は「**GAS関数の書き方**」について、7つの具体パターンと`return`の役割を、焦らずじっくりお話しますね。「GAS 関数 書き方」で検索してここに来た方が、読み終わった直後にすぐコードに戻れるレベルで書いています。

## こんな悩みありませんか？

- 「`function`って書くけど、そもそもこれって何者？」
- 「`return`って書く時と書かない時があるけど、明確なルールがわからない」
- 「アロー関数と普通の関数、どっちで書けばいいのかわからない」
- 「1つの関数から複数の値を返したいけど、やり方がわからない」

私も最初は`function myFunction()`の中に200行くらいベタ書きしていました。でも勤怠集計スクリプトが500行を超えたあたりで「これは関数を分けないと本当に死ぬ」と悟り、関数の書き方を勉強し直したんですよね。**関数を使いこなせると、コードの見通しが劇的に良くなります**。

## GAS関数の全体像：関数は「小さな仕事の単位」

関数は、ある入力（引数）を受け取って何かを返す（または実行する）、**小さな仕事の単位**です。病棟で言うと「検温ルーチン」「与薬ルーチン」みたいに、決まった手順を名前でまとめたもの。

```javascript
function 関数名(引数) {
  // 処理
  return 返す値; // 任意
}
```

GASではこの関数が、次の様々な場面で動きます。

- **トリガー**から呼ばれる関数（時間主導・編集時・フォーム送信時）
- スプレッドシートの**カスタム関数**（セルに`=myFunc()`と書くやつ）
- カスタム**メニュー**から呼ばれる関数
- `function`同士が**互いに呼び出し合う**内部関数

「小さな関数を組み合わせて大きな仕組みを作る」という考え方は、GAS以外のプログラミングにも共通する基本です。

## 7つの書き方：コピペで覚える実用例

### 例1：引数なしの最小構成

トリガーから呼ばれる関数はこの形が多いです。

```javascript
function sayHello() {
  console.log('こんにちは');
}
```

GASエディタの再生ボタンで実行すると、実行ログに「こんにちは」と出ます。

### 例2：引数1つ

引数は「この関数に渡す材料」です。材料を変えれば、関数を量産しなくても使い回せます。

```javascript
function greet(name) {
  console.log('こんにちは、' + name + 'さん');
}

greet('佐藤'); // こんにちは、佐藤さん
greet('師長');       // こんにちは、師長さん
```

### 例3：returnで値を返す

`return`は関数の「お返事」です。呼び出した側に結果を返します。

```javascript
function addTax(price) {
  return Math.round(price * 1.1);
}

const total = addTax(1000); // total は 1100
```

**`return`を書かない関数は`undefined`を返します**。つまり「お返事なし」。画面表示やシート書き込みだけして結果を返さない関数も、立派な「副作用関数」としてアリです。

```javascript
function writeLog(message) {
  console.log('[LOG] ' + message);
  // returnなし → undefinedが返る
}
```

### 例4：複数引数

引数はカンマ区切りで何個でも渡せます。

```javascript
function multiply(a, b) {
  return a * b;
}

multiply(3, 4); // 12
```

ただし引数が5個を超えてくると、呼び出し側で順番を覚えきれなくなります。そんなときはオブジェクト1つにまとめて渡す方法が便利です（下で紹介）。

### 例5：デフォルト引数

省略された引数にデフォルト値を与えられます。

```javascript
function greetWithTitle(name, title = 'さん') {
  return name + title + 'こんにちは';
}

greetWithTitle('佐藤');        // 佐藤さんこんにちは
greetWithTitle('院長', '先生');      // 院長先生こんにちは
```

デフォルト引数を知っているだけで、関数冒頭の `if (title === undefined) title = 'さん';` が丸ごと要らなくなります。

### 例6：アロー関数（短く書く）

GASはV8ランタイムなのでアロー関数が使えます。短くて便利。

```javascript
const double = (n) => n * 2;
const sum = (a, b) => a + b;

// 配列と組み合わせると真価を発揮
const prices = [100, 200, 300];
const withTax = prices.map((p) => Math.round(p * 1.1));
```

`return`を省略できるのがアロー関数の強み。`{ }`で囲むと通常関数と同じく`return`が必要です。

```javascript
const doubleVerbose = (n) => {
  const result = n * 2;
  return result; // ブロックで囲んだら return 必須
};
```

### 例7：オブジェクト引数（引数が多いとき）

引数が4つ5つになったら、オブジェクト1つにまとめるのが定石です。

```javascript
function createEvent({ title, date, duration = 60, attendees = [] }) {
  // ...予定を作る処理
}

createEvent({
  title: '申し送り',
  date: new Date(),
  attendees: ['佐藤', '師長']
});
```

`{ title, date, ... }` の**分割代入**で、呼び出し側は「名前付き引数」っぽく書けます。順番を気にしなくていいので、後から引数が増えても壊れにくいのが嬉しいポイント。

## 普通の関数とアロー関数の使い分け

迷ったらこの基準で選べばOKです。

| シーン | 選ぶもの |
|---|---|
| トリガーから呼ばれる関数 | **`function`宣言** |
| スプシのカスタム関数 `=myFunc()` | **`function`宣言** |
| メニューから呼ばれる関数 | **`function`宣言** |
| `map`/`filter`の中の補助関数 | アロー関数 |
| 短い計算・変換関数 | アロー関数 |

**トップレベルの関数はfunction宣言**が無難です。アロー関数で書くと、トリガーから呼び出せないケースや、`this`の挙動が異なるケースがあるため。

## `return`にまつわる重要テクニック

### 早期リターンでネストを浅くする

エラー時や対象外データはすぐにリターンすると、コードが横に広がらずスッキリします。

```javascript
function processRow(row) {
  if (!row || row.length === 0) return;      // 空行は処理しない
  if (row[2] === '無効') return;             // 無効データも処理しない
  // 本処理（ここはインデントが浅い）
}
```

「正常ルートだけをインデント最小で書く」のは読みやすいコードの王道です。

### 複数の値を返したいとき

関数は1つの値しか返せませんが、**オブジェクトか配列にまとめれば実質複数返せます**。

```javascript
function parseUser(row) {
  return {
    name: row[0],
    age: row[1],
    shift: row[2]
  };
}

const user = parseUser(['佐藤', 38, '夜勤']);
console.log(user.name); // 佐藤
```

呼び出し側で分割代入すると、さらに読みやすい。

```javascript
const { name, shift } = parseUser(row);
console.log(`${name}さんのシフトは${shift}です`);
```

### returnの後は実行されない

`return`を書くとそこで関数が終わります。後ろに処理を書いても実行されません。

```javascript
function test() {
  return 'A';
  console.log('ここは実行されない'); // デッドコード
}
```

デバッグで「あれ、このログが出ない…」となったら、手前の`return`を疑いましょう。

## よくあるエラーと解決法

### `SyntaxError: Unexpected token`

関数定義の`{ }`や`( )`の数が合っていないと出ます。エディタの左側にエラー行が出るので、対応する括弧をたどって修正します。

### `ReferenceError: 〇〇 is not defined`

呼び出した関数名のタイプミス、もしくは関数が定義されていない。GASでは**ファイルを跨いでも関数は呼び出せる**ので、関数名さえ合っていれば問題なく動きます。

### 関数から戻り値が来ない

`return`を書き忘れているケースがほとんど。特にアロー関数で`{ }`を使った瞬間に`return`必須になることをお忘れなく。

## まとめ

- 関数は「小さな仕事の単位」。引数で材料を受け、`return`で結果を返す
- `return`を書かない関数は`undefined`を返す。副作用だけの関数もアリ
- デフォルト引数で`if`が減り、早期リターンでネストが浅くなる
- 引数が多いときはオブジェクト引数＋分割代入
- トップレベルは`function`宣言、補助はアロー関数、で迷わない
- 複数戻り値はオブジェクトか配列にまとめる

関数を適切に分けると、夜勤明けの頭でも「ここが何をしているか」が一目でわかります。料理でおかずを小分けにすると詰めやすいのと同じ理屈ですね。

## 関連記事

- [GAS変数const/letの違いと使い分け3パターン](/blog/gas-variable-const-let/)
- [GASループfor文5種類使い分け完全マスター](/blog/gas-for-loop-5/)
- [GAS配列操作push/map/filter早見表15個](/blog/gas-array-basic/)
- [GASログ出力console.logでデバッグ完全版](/blog/gas-console-log-debug/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
