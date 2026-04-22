---
title: "GAS配列操作push/map/filter早見表15個｜2次元配列もこれで攻略"
description: "GASでよく使う配列メソッド15個を早見表で整理。push・map・filter・reduce・find・sortなど、2次元配列でのスプシ自動化例まで現役ナース副業プログラマーが実務コード付きで解説します。"
pubDate: "TBD"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","array","map","filter","reduce"]
tagNames: ["GAS","配列","map","filter","reduce"]
readingTime: 10
keywords: ["GAS 配列","GAS map","GAS filter","GAS reduce"]
---

こんにちは、みっちゃんママです。三姉妹の母で、夜勤明けにGASを書いている副業プログラマーです。GASを触るとほぼ必ず向き合うのが「**配列**」。スプレッドシートのデータは `getValues()` を叩いた瞬間に2次元配列になって返ってくるので、**配列を制する者がGASを制す**と言っても大げさじゃありません。今日は、実務で出番が多い配列メソッド15個を早見表でサクッと整理します。

「GAS 配列」で検索してここに来た方が、読み終わったあと即コードに戻れるレベルで書いています。

## こんな悩みありませんか？

- 「配列メソッドがありすぎて、どれを使えばいいかわからない」
- 「`for`文で頑張ってるけど、`map`や`filter`のほうが速くて読みやすいって聞いた」
- 「2次元配列の扱いでいつも迷子になる」
- 「`sort`で元の配列が書き換わってバグった」

私も最初は全部`for`でゴリ押しで、30行かけて書いていた処理が`map`と`filter`で3行になったときは感動で涙ぐみました。**知っているだけで、コードの読みやすさが段違い**なんです。

## 全体像：GAS配列メソッド早見表15個

| # | メソッド | 用途 | 元配列を書き換える？ |
|---|---------|------|:---:|
| 1 | `push` | 末尾に追加 | ✅ |
| 2 | `pop` | 末尾を取り出す | ✅ |
| 3 | `shift` | 先頭を取り出す | ✅ |
| 4 | `unshift` | 先頭に追加 | ✅ |
| 5 | `concat` | 配列を結合（新配列） | ❌ |
| 6 | `slice` | 部分コピー（新配列） | ❌ |
| 7 | `splice` | 削除／挿入 | ✅ |
| 8 | `indexOf` | 位置を探す | ❌ |
| 9 | `includes` | 含むか判定 | ❌ |
| 10 | `join` | 文字列に結合 | ❌ |
| 11 | `map` | 要素を変換（新配列） | ❌ |
| 12 | `filter` | 要素を絞り込む（新配列） | ❌ |
| 13 | `find` | 最初の1件を探す | ❌ |
| 14 | `reduce` | 集計する | ❌ |
| 15 | `sort` | 並び替える | ✅ |

**「元配列を書き換えるかどうか」は超重要**。バグの8割はここに起因します。書き換える系（✅）は破壊的、書き換えない系（❌）は非破壊的と呼びます。

この15個で実務の9割はカバーできます。

## 主役メソッドを押さえる

### 1. 要素の出し入れ：push / pop / shift / unshift

```javascript
const nurses = ['みっちゃん', 'さとみ'];
nurses.push('ゆき');           // 末尾追加：['みっちゃん','さとみ','ゆき']
const last = nurses.pop();      // 末尾取り出し：lastは'ゆき'
nurses.unshift('師長');         // 先頭追加
const head = nurses.shift();    // 先頭取り出し
```

**GASで一番出番が多いのは`push`**。スプレッドシートに書き込む行データを組み立てるときに頻出です。

```javascript
const rows = [];
for (const user of users) {
  rows.push([user.name, user.age, user.shift]);
}
sheet.getRange(2, 1, rows.length, 3).setValues(rows);
```

### 2. 加工系3兄弟：map / filter / find

- `map`：各要素を変換して**新しい配列**を返す
- `filter`：条件に合うものだけ残した**新しい配列**を返す
- `find`：条件に合う**最初の1件**を返す（見つからなければ`undefined`）

```javascript
const prices = [100, 200, 300];

const withTax = prices.map((p) => Math.round(p * 1.1));
// [110, 220, 330]

const expensive = prices.filter((p) => p >= 200);
// [200, 300]

const first200 = prices.find((p) => p >= 200);
// 200
```

**元の配列は変わらない**のがポイント。副作用がないのでバグりにくく、組み合わせも簡単です。

```javascript
// filterでからmapへチェーン：条件で絞って変換
const highPriceWithTax = prices
  .filter((p) => p >= 200)
  .map((p) => Math.round(p * 1.1));
// [220, 330]
```

### 3. 集計は`reduce`、並び替えは`sort`

```javascript
const total = prices.reduce((sum, p) => sum + p, 0);
// 600

const sorted = [...prices].sort((a, b) => b - a); // 降順
// [300, 200, 100]
```

**`sort`は元の配列を書き換える**ので、触りたくないときは `[...array].sort()` でコピーしてから。忘れると「なぜか元のデータが並び替わってた」というバグに直結します。

`reduce`は慣れるまで難しく見えますが、第2引数が「スタート値」と覚えるだけで一気に使えるようになります。

```javascript
// オブジェクトに集計することも可能
const shiftCount = nurses.reduce((acc, n) => {
  acc[n.shift] = (acc[n.shift] || 0) + 1;
  return acc;
}, {});
// { 夜勤: 3, 日勤: 5 }
```

## 2次元配列でよく使うパターン

スプレッドシートから取った`values`は2次元配列（`[[行1], [行2], ...]`）です。GAS配列の実戦はここから。

### パターン1：ヘッダーを除いてフィルタ

```javascript
const values = sheet.getDataRange().getValues();
const header = values.shift(); // ヘッダーを取り除く（valuesが書き換わる点に注意）
const activeRows = values.filter((row) => row[2] === '有効');
```

`shift`は破壊的なので、**元配列を守りたいなら`slice(1)`を使う**のが安全です。

```javascript
const activeRows = values.slice(1).filter((row) => row[2] === '有効');
```

### パターン2：特定列だけ抜き出す

```javascript
const names = values.map((row) => row[0]); // 1列目だけ

// 分割代入と組み合わせるとさらに読みやすい
const names2 = values.map(([name]) => name);
```

### パターン3：重複排除

```javascript
const unique = [...new Set(names)];
```

`Set`は厳密には配列メソッドじゃないですが、**重複排除は圧倒的にこれが速くて短い**のでセットで覚えましょう。

### パターン4：合計・集計

```javascript
const total = values.reduce((sum, row) => sum + row[1], 0);
```

勤怠の合計時間、売上の合計など、`reduce`が一発で片付けてくれます。

### パターン5：2次元配列を1次元に平坦化

```javascript
const flat = values.flat(); // [['a','b'],['c','d']] → ['a','b','c','d']
```

`flat()`はV8ランタイムで使えます。地味に便利。

## 困ったときの小さなコツ

- `map`で条件分岐したくなったら、まず`filter`で絞ってから`map`するとスッキリ
- `indexOf`より`includes`のほうが読みやすい（`-1`比較が不要）
- `splice`は副作用があるので、できれば`slice`＋`concat`で代替
- 元配列を壊したくないときは `[...array]` で毎回コピー
- 空配列判定は `array.length === 0` がシンプル

## よくあるエラーと解決法

### `TypeError: Cannot read properties of undefined (reading 'xxx')`

空配列や存在しないインデックスにアクセスしたときに出ます。

```javascript
const first = arr[0];
console.log(first.name); // arrが空だとエラー
```

オプショナルチェーン `?.` で安全に。

```javascript
console.log(arr[0]?.name); // arrが空でもundefinedになるだけ
```

### `find`で見つからないのに処理が続く

`find`は見つからないと`undefined`を返します。そのままプロパティアクセスするとエラーに。

```javascript
const target = users.find((u) => u.id === 99);
if (!target) {
  console.log('見つかりませんでした');
  return;
}
console.log(target.name); // 安全
```

## まとめ

- 出し入れは`push`/`pop`/`shift`/`unshift`（全部破壊的なので注意）
- 加工は`map`/`filter`/`find`、集計は`reduce`（全部非破壊）
- 2次元配列は`slice(1)`でヘッダー除去→`filter`/`map`が鉄板
- `sort`/`splice`/`shift`は破壊的なので、`[...array]`でコピーしてから使う
- 迷ったら**元配列を書き換えないメソッドを優先**すると、バグりにくい

15個すべてを一度に覚えなくて大丈夫。まずは **`push`・`map`・`filter`・`reduce` の4つ**から始めれば、コードがグッとモダンになります。慣れてきたら`find`・`sort`・`flat`を足していけば、実務はほぼ何でも書けるようになります。

## 関連記事

- [GAS変数const/letの違いと使い分け3パターン](/blog/gas-variable-const-let/)
- [GAS関数の書き方7例とreturn徹底解説](/blog/gas-function-basic/)
- [GASループfor文5種類使い分け完全マスター](/blog/gas-for-loop-5/)
- [GAS setValuesで1000行を一括書き込む高速化テクニック](/blog/gas-sheet-setvalues-bulk/)

---

### この記事を書いた人：みっちゃんママ

三姉妹の母で現役ナース、夜勤明けにGASを書いている副業プログラマーです。病棟の事務仕事をGASで片っ端から自動化してきた経験をもとに、「コードが苦手なママでも読めるGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
