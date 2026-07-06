---
title: "GAS配列操作push/map/filter早見表15個｜2次元配列もこれで攻略"
description: "GASでよく使う配列メソッド15個を早見表で整理。push・map・filter・reduce・find・sortなど、2次元配列でのスプシ自動化例まで実務コード付きで解説します。"
pubDate: "2026-05-18T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","array","map","filter","reduce"]
tagNames: ["GAS","配列","map","filter","reduce"]
readingTime: 12
keywords: ["GAS 配列","GAS map","GAS filter","GAS reduce"]
---

こんにちは、日々の看護師業のかたわらGASで副収入を得ている凛です。GASを触っていると、ほぼ必ず「配列」と向き合うことになります。スプレッドシートのデータは`getValues()`を叩いた瞬間に2次元配列で返ってくるので、配列を制する者がGASを制す、と言っても大げさではありません。

私自身、最初は全部`for`文でゴリ押ししていました。30行かけて書いていた処理が`map`と`filter`で3行になったときの感動は、いまでも覚えています。この記事は、私が実務でよく受ける（そして自分も昔つまずいた）配列の疑問に、ひとつずつ答えていく形でまとめました。気になるところから読んでください。

## そもそも配列って何？2次元配列がよく分からない

まずここから、という方も多いはずです。配列とは、複数のデータをまとめて持つ変数のことです。

```javascript
// 1次元配列（1行のデータ）
const nurses = ['佐藤', '鈴木', '田中'];
console.log(nurses[0]); // '佐藤'（インデックスは0始まり）

// 2次元配列（複数行のデータ = スプシと同じ構造）
const schedule = [
  ['佐藤', '日勤', '8:00'],
  ['鈴木', '夜勤', '16:00'],
  ['田中', '早番', '7:00'],
];
console.log(schedule[0][1]); // '日勤'（0行目の1列目）
```

スプレッドシートから`getValues()`で取ったデータは、まさにこの2次元配列の形です。`schedule[行インデックス][列インデックス]`でアクセスします。ここが腹落ちすると、あとがぐっと楽になります。

## 結局どのメソッドを覚えればいいの？

メソッドがありすぎて、どれを使えばいいか分からない——これは本当によく聞かれます。実務で出番が多いのは、次の15個です。まずはこの表を眺めてください。

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

見てほしいのが右端の列です。「元配列を書き換えるかどうか」は、本当に大事。バグの大半はここに起因します。書き換えるメソッド（✅）を破壊的メソッド、書き換えないメソッド（❌）を非破壊的メソッドと呼びます。この15個で、実務の9割はカバーできます。

## 配列に値を足したり取り出したりするには？

もっとも基本の出し入れが、`push`・`pop`・`shift`・`unshift`の4つです。

```javascript
const nurses = ['佐藤', 'さとみ'];

nurses.push('ゆき');           // 末尾に追加 → ['佐藤', 'さとみ', 'ゆき']
const last = nurses.pop();     // 末尾を取り出す → last = 'ゆき'
nurses.unshift('師長');        // 先頭に追加 → ['師長', '佐藤', 'さとみ']
const head = nurses.shift();   // 先頭を取り出す → head = '師長'
```

このなかでGASの出番が圧倒的に多いのが`push`です。スプレッドシートに書き込む行データを組み立てるときに、必ずと言っていいほど登場します。

```javascript
// 実践例：複数行のデータを組み立てて一括書き込み
function writeDataToSheet() {
  const sheet = SpreadsheetApp.openById('スプシID').getActiveSheet();

  const users = [
    { name: '佐藤', age: 32, shift: '日勤' },
    { name: '鈴木', age: 28, shift: '夜勤' },
    { name: '田中', age: 35, shift: '早番' },
  ];

  const rows = [];
  for (const user of users) {
    rows.push([user.name, user.age, user.shift]); // 各ユーザーを行として追加
  }

  // まとめて一括書き込み（行ごとに書き込むより高速）
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
}
```

`push`で行データを積み上げてから`setValues`で一括書き込みする。これはGASのお決まりパターンなので、手が覚えるまで使ってみてください。

## for文をmap/filterに置き換えるとどうなる？

ここが、私が一番「知ってよかった」と思ったところです。`map`・`filter`・`find`の3つが使えると、`for`文だらけのコードがすっきりします。

### mapは「全部に同じ処理をしたいとき」

```javascript
const prices = [100, 200, 300];

// 全要素に税を掛ける（新しい配列が返る。元の配列は変わらない）
const withTax = prices.map(p => Math.round(p * 1.1));
// withTax: [110, 220, 330]
// prices は [100, 200, 300] のまま
```

税計算、単位変換、形式の変換。全要素に同じことをしたいときは`map`です。

```javascript
// 実践例：スプシの日付列を「YYYY年MM月DD日」形式に変換
const formatted = data.map(row => {
  const date = row[0]; // 日付型
  return [
    Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy年MM月dd日'),
    row[1],
    row[2],
  ];
});
```

### filterは「条件に合うものだけ欲しいとき」

```javascript
const prices = [100, 200, 300];

// 200以上のもの
const expensive = prices.filter(p => p >= 200);
// expensive: [200, 300]
```

ある条件のデータだけ抜き出したいときは`filter`。私は「未処理の行だけ拾ってメールで通知」みたいな処理でよく使います。

```javascript
// 実践例：「未処理」のデータだけ抽出してメール送信
const allData = sheet.getDataRange().getValues().slice(1); // ヘッダー除去
const pending = allData.filter(row => row[3] === '未処理');

if (pending.length > 0) {
  GmailApp.sendEmail(
    'admin@example.com',
    `未処理件数: ${pending.length}件`,
    pending.map(row => row[0]).join('\n')
  );
}
```

### findは「特定の1件だけ探したいとき」

```javascript
const users = [
  { id: 1, name: '佐藤' },
  { id: 2, name: '鈴木' },
  { id: 3, name: '田中' },
];

const target = users.find(u => u.id === 2);
// target: { id: 2, name: '鈴木' }

const notFound = users.find(u => u.id === 99);
// notFound: undefined（見つからない場合）
```

`filter`と違い、`find`は最初に見つかった1件だけを返します。ひとつ注意があって、見つからないときは`undefined`が返るので、そのままプロパティにアクセスするとエラーになります。

```javascript
// ❌ NG：targetがundefinedのとき.nameでエラー
const name = target.name;

// ✅ OK：undefinedチェックを入れる
if (!target) {
  console.log('見つかりませんでした');
  return;
}
console.log(target.name); // 安全にアクセスできる
```

## 合計や件数の集計はどう書く？

集計は`reduce`、並び替えは`sort`の出番です。

### reduceは「配列を1つの値にまとめる」

`reduce`は最初こそ難しく見えますが、「第2引数がスタート値」と覚えれば一気に手に馴染みます。

```javascript
const prices = [100, 200, 300];

// 合計
const total = prices.reduce((sum, p) => sum + p, 0);
// total: 600

// 第2引数（0）がスタート値。これが「これまでの合計」として引き継がれる
```

合計だけでなく、種別ごとの件数集計にも使えます。

```javascript
// 実践例：シフト種別ごとの人数を集計
const shiftData = [
  ['佐藤', '日勤'],
  ['鈴木', '夜勤'],
  ['田中', '日勤'],
  ['山田', '夜勤'],
  ['小林', '早番'],
];

const count = shiftData.reduce((acc, row) => {
  const shift = row[1];
  acc[shift] = (acc[shift] || 0) + 1;
  return acc;
}, {});
// count: { 日勤: 2, 夜勤: 2, 早番: 1 }
```

### sortは元の配列を書き換えることに注意

```javascript
const prices = [300, 100, 200];

// 昇順（小さい順）
prices.sort((a, b) => a - b);
// prices: [100, 200, 300]（元の配列が変わる！）
```

`sort`は破壊的メソッドなので、元の順番を残したいならコピーしてから並べ替えます。私はここで一度バグを踏んでいるので、声を大にして言いたいところです。

```javascript
// ✅ コピーしてから並び替え
const sorted = [...prices].sort((a, b) => b - a); // 降順
// prices は元の順番のまま
// sorted は [300, 200, 100]
```

```javascript
// 実践例：スプシデータを日付降順に並び替え
const data = sheet.getDataRange().getValues().slice(1);

const sorted = [...data].sort((a, b) => {
  const dateA = new Date(a[0]); // 0列目が日付
  const dateB = new Date(b[0]);
  return dateB - dateA; // 降順（新しい順）
});
```

## スプシの2次元配列でよく使うパターンは？

`getValues()`で取った`values`は2次元配列（`[[行1], [行2], ...]`）です。GAS配列の実戦は、ここからが本番です。よく使う5つを並べておきます。

### ヘッダーを除いてフィルタ

```javascript
const values = sheet.getDataRange().getValues();

// 安全な方法：sliceで先頭（ヘッダー）を除く（元配列を変えない）
const dataRows = values.slice(1);
const activeRows = dataRows.filter(row => row[2] === '有効');
```

`shift()`でも同じことができますが、`shift()`は元の配列からヘッダーを削ってしまいます。元データを保持したいなら`slice(1)`が安全です。

### 特定列だけ抜き出す

```javascript
const values = sheet.getDataRange().getValues().slice(1);

// 1列目（名前）だけ抜き出す
const names = values.map(row => row[0]);

// 分割代入を使うとさらに読みやすい
const names2 = values.map(([name]) => name);

// 複数列を抜き出す
const nameAndShift = values.map(([name, , shift]) => ({ name, shift }));
// 2列目を飛ばして1列目と3列目だけ取得
```

### 重複を排除する

```javascript
const names = ['佐藤', '鈴木', '佐藤', '田中', '鈴木'];

// Setを使って重複を排除（スプシ配列でよく使う）
const unique = [...new Set(names)];
// unique: ['佐藤', '鈴木', '田中']
```

`Set`はJavaScriptの組み込みオブジェクトで、重複した値を自動的に除いてくれます。

### 合計・平均を出す

```javascript
const salesData = [
  ['佐藤', 50000],
  ['鈴木', 80000],
  ['田中', 60000],
];

// 2列目（数字）の合計
const total = salesData.reduce((sum, row) => sum + row[1], 0);
// total: 190000

// 平均
const avg = total / salesData.length;
// avg: 63333...
```

### 2次元配列を1次元に平坦化する

```javascript
const matrix = [['a', 'b'], ['c', 'd'], ['e', 'f']];
const flat = matrix.flat();
// flat: ['a', 'b', 'c', 'd', 'e', 'f']
```

`flat()`はGASのV8ランタイムで使えます。入れ子の配列を1次元に展開したいときに便利です。

## もっと読みやすく書くコツはある？

細かいけれど効いてくる書き方を、まとめて置いておきます。

```javascript
// map後に条件分岐したくなったら、先にfilterで絞る
const result = data
  .filter(row => row[2] === '有効')  // 絞り込んでから
  .map(row => row[0] + ': ' + row[1]); // 変換

// indexOf より includes の方が読みやすい（-1比較が不要）
// ❌ 読みにくい
if (arr.indexOf('完了') !== -1) { ... }
// ✅ 読みやすい
if (arr.includes('完了')) { ... }

// 元配列を壊したくないときは毎回スプレッド演算子でコピー
const safeSorted = [...original].sort();

// 空配列チェック
if (arr.length === 0) { ... }  // シンプルで確実
```

## つまずきやすいエラー、どう対処する？

私が実際にハマったものを中心に、3つ挙げておきます。

### `TypeError: Cannot read properties of undefined`

空配列や、存在しないインデックスにアクセスすると出ます。

```javascript
// ❌ NGパターン
const sheet = SpreadsheetApp.openById('ID').getActiveSheet();
const data = sheet.getDataRange().getValues();
console.log(data[100][0]); // データが100行未満だとエラー

// ✅ 安全なアクセス
const row = data[100];
if (row) {
  console.log(row[0]);
}

// オプショナルチェーン（?.）でも簡単に書ける
console.log(data[100]?.name);  // 存在しないときundefinedを返す
```

### `find`で見つからないのに処理が続く

```javascript
const target = users.find(u => u.id === 99);
// targetはundefinedかもしれない

// ❌ NG：undefinedのままプロパティアクセスするとエラー
console.log(target.name);

// ✅ OK：undefinedチェックを入れる
if (!target) {
  console.log('見つかりませんでした');
  return;
}
console.log(target.name);
```

### `sort`が変な順番になる

```javascript
const nums = [10, 9, 100, 2];

// ❌ NG：デフォルトsortは文字列比較
nums.sort();
// ['10', '100', '2', '9'] → 数値的には正しくない結果

// ✅ OK：比較関数を指定
nums.sort((a, b) => a - b);
// [2, 9, 10, 100]
```

デフォルトの`sort()`は文字列として比較します。数値を並べ替えるときは必ず`(a, b) => a - b`（昇順）または`(a, b) => b - a`（降順）を指定してください。ここは初見だと必ず引っかかるポイントです。

## 全部組み合わせると、どんな処理が書ける？

最後に、ここまでの知識をひとつにまとめた実践例です。出勤記録から今月分を抽出して、シフト別に集計する、という流れです。

```javascript
function processAttendance() {
  const sheet = SpreadsheetApp.openById('スプシID').getSheetByName('出勤記録');
  const data = sheet.getDataRange().getValues();

  // ヘッダー行を保持しつつデータ行を取得
  const [header, ...rows] = data;

  // 今月のデータだけ抽出
  const thisMonth = new Date().getMonth();
  const thisMonthRows = rows.filter(row => {
    const date = new Date(row[0]);
    return date.getMonth() === thisMonth;
  });

  // シフト種別ごとに集計
  const shiftCount = thisMonthRows.reduce((acc, row) => {
    const shift = row[2]; // 3列目がシフト種別
    acc[shift] = (acc[shift] || 0) + 1;
    return acc;
  }, {});

  // スタッフ名だけ抽出して重複排除
  const staffNames = [...new Set(thisMonthRows.map(row => row[1]))];

  // 結果をログ出力
  console.log('今月の出勤回数:', thisMonthRows.length);
  console.log('シフト別集計:', JSON.stringify(shiftCount));
  console.log('出勤スタッフ:', staffNames.join(', '));
}
```

`filter`で絞って、`reduce`で集計して、`Set`で重複を消す。ひとつひとつは今日見たものばかりです。組み合わさると、こういう実務的な処理がすらすら書けるようになります。

## 最後に：まずは4つから

15個を一度に覚える必要はありません。私も最初からぜんぶ使えたわけではなくて、`push`・`map`・`filter`・`reduce`の4つから入りました。この4つを手に馴染ませるだけで、コードは驚くほどモダンになります。慣れてきたら`find`・`sort`・`flat`を足していけば、実務でつまずくことはほとんどなくなるはずです。迷ったときは、元配列を書き換えないメソッドを優先する。これだけ覚えておけば、しばらくバグに悩まされずに済みます。

## 関連記事

- [GAS変数const/letの違いと使い分け3パターン](/blog/gas-variable-const-let/) — JavaScript基礎
- [GAS関数の書き方7例とreturn徹底解説](/blog/gas-function-basic/) — 関数の使い方
- [GASでCSVをスプシに取り込む3手順](/blog/gas-sheet-import-csv/) — 配列を使ったCSV処理
- [条件付き書式をGASで一括設定する10例](/blog/gas-sheet-conditional-format/) — 配列を使ったスプシ操作

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは構文・API仕様・ロジックを確認のうえ掲載しています。

> **AI活用について**：本記事の構成・文章の一部はAIを活用して作成しています。掲載コードは実際に動作検証済みで、内容の正確性は筆者が確認しています。
