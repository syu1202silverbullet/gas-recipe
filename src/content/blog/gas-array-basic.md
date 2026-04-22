---
title: "GAS配列操作push/map/filter早見表15個"
description: "GASでよく使う配列メソッド15個を早見表形式で整理。push・map・filterなど現役ナースみっちゃんママが実務例つきで解説。"
pubDate: "2026-05-06T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","array","map"]
tagNames: ["GAS","配列","map"]
readingTime: 6
keywords: ["GAS 配列"]
---

こんにちは、みっちゃんママです。GASを触るとほぼ必ず向き合うのが「配列」。スプレッドシートのデータは`getValues()`を叩いた瞬間に2次元配列になって返ってくるので、配列を制する者がGASを制すと言っても大げさじゃありません。今日は、実務で出番が多い配列メソッド15個を早見表でサクッと整理します。

## こんな悩みありませんか？

- 「配列メソッドがありすぎて、どれを使えばいいかわからない」
- 「for文で頑張ってるけど、`map`や`filter`のほうが速いって聞いた」
- 「2次元配列の扱いでいつも迷子になる」

私も最初は全部`for`でゴリ押しで、30行かけて書いていた処理が`map`と`filter`で3行になったときには感動で涙ぐみました。知っているだけで、コードの読みやすさが段違いなんです。

## 全体像：配列メソッド早見表15個

| # | メソッド | 用途 |
|---|---------|------|
| 1 | `push` | 末尾に追加 |
| 2 | `pop` | 末尾を取り出す |
| 3 | `shift` | 先頭を取り出す |
| 4 | `unshift` | 先頭に追加 |
| 5 | `concat` | 配列を結合 |
| 6 | `slice` | 部分コピー |
| 7 | `splice` | 削除／挿入 |
| 8 | `indexOf` | 位置を探す |
| 9 | `includes` | 含むか判定 |
| 10 | `join` | 文字列に結合 |
| 11 | `map` | 要素を変換 |
| 12 | `filter` | 要素を絞り込む |
| 13 | `find` | 最初の1件を探す |
| 14 | `reduce` | 集計する |
| 15 | `sort` | 並び替える |

この15個で実務の9割はカバーできます。

## ポイント3つ：主役メソッドを押さえる

### ポイント1：要素の出し入れ（push/pop/shift/unshift）

```javascript
const nurses = ['みっちゃん', 'さとみ'];
nurses.push('ゆき');          // 末尾追加：['みっちゃん','さとみ','ゆき']
const last = nurses.pop();     // 末尾取り出し：lastは'ゆき'
nurses.unshift('師長');        // 先頭追加
const head = nurses.shift();   // 先頭取り出し
```

**GASで一番出番が多いのは`push`**。スプレッドシートに書き込む行データを組み立てるときに頻出です。

```javascript
const rows = [];
for (const user of users) {
  rows.push([user.name, user.age, user.shift]);
}
sheet.getRange(2, 1, rows.length, 3).setValues(rows);
```

### ポイント2：加工系3兄弟（map/filter/find）

- `map`：各要素を変換して**新しい配列**を返す
- `filter`：条件に合うものだけ残した**新しい配列**を返す
- `find`：条件に合う**最初の1件**を返す

```javascript
const prices = [100, 200, 300];

const withTax = prices.map((p) => Math.round(p * 1.1));
// [110, 220, 330]

const expensive = prices.filter((p) => p >= 200);
// [200, 300]

const first200 = prices.find((p) => p >= 200);
// 200
```

**元の配列は変わらない**のがポイント。副作用がないのでバグりにくいです。

### ポイント3：集計は`reduce`、並び替えは`sort`

```javascript
const total = prices.reduce((sum, p) => sum + p, 0);
// 600

const sorted = [...prices].sort((a, b) => b - a); // 降順
// [300, 200, 100]
```

`sort`は**元の配列を書き換える**ので、触りたくないときは`[...array].sort()`でコピーしてから。

## 応用：2次元配列とよく使うパターン

スプレッドシートから取った`values`は2次元配列（`[[行1], [行2], ...]`）です。

### パターン1：ヘッダーを除いてフィルタ

```javascript
const values = sheet.getDataRange().getValues();
const header = values.shift(); // ヘッダーを取り除く
const activeRows = values.filter((row) => row[2] === '有効');
```

### パターン2：特定列だけ抜き出す

```javascript
const names = values.map((row) => row[0]); // 1列目だけ
```

### パターン3：重複排除

```javascript
const unique = [...new Set(names)];
```

`Set`は厳密には配列メソッドじゃないですが、セットで覚えると便利。

### パターン4：集計

```javascript
const total = values.reduce((sum, row) => sum + row[1], 0);
```

勤怠の合計時間、売上の合計など、`reduce`が一発で片付けてくれます。

### 困ったときの小さなコツ

- `map`で条件分岐したくなったら、まず`filter`で絞ってから`map`するとスッキリ
- `indexOf`より`includes`のほうが読みやすい（`-1`比較が不要）
- `splice`は副作用があるので、できれば`slice`＋`concat`で代替

## まとめ

- 出し入れは`push`/`pop`/`shift`/`unshift`
- 加工は`map`/`filter`/`find`、集計は`reduce`
- 2次元配列は`shift`でヘッダー除去→`filter`/`map`が鉄板
- 元の配列を壊さないメソッドを優先すると、バグりにくい

15個すべてを一度に覚えなくて大丈夫。まずは`push`・`map`・`filter`・`reduce`の4つから始めれば、コードがグッとモダンになります。

## 関連記事

- [GAS変数const/letの違いと使い分け3パターン](/blog/gas-variable-const-let/)
- [GAS関数の書き方7例とreturn徹底解説](/blog/gas-function-basic/)
- [GASループfor文5種類使い分け完全マスター](/blog/gas-for-loop-5/)

---

### この記事を書いた人：みっちゃんママ

三姉妹の母で現役ナース、夜勤明けにGASを書いている副業プログラマーです。病棟の事務仕事をGASで片っ端から自動化してきた経験をもとに、「コードが苦手なママでも読めるGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
