---
title: "GASログ出力console.logでデバッグ完全版"
description: "GASのconsole.logを使ったデバッグ手法を、現役ナースみっちゃんママが実務目線で解説。ログの見方・応用テクまで完全ガイド。"
pubDate: "2026-05-07T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","debug","logging"]
tagNames: ["GAS","デバッグ","ログ"]
readingTime: 5
keywords: ["GAS console.log"]
---

こんにちは、みっちゃんママです。夜勤明けにGASを書くと、だいたい1回は「なんで動かないの？！」って叫びます。そんなときの頼れる相棒が`console.log`。今日は、GASでのデバッグの基本を、私の失敗談交えてお話しますね。

## こんな悩みありませんか？

- 「エラーが出ないのに、なぜか結果がおかしい」
- 「`Logger.log`と`console.log`、どっちを使えばいいの？」
- 「ログをどこで見るのかわからない」

私も最初は画面とにらめっこで「なぜ…なぜ動かない…」ってやってました。ログをちゃんと出す習慣がつくと、トラブル解決の時間が体感1/3くらいになります。

## 全体像：GASのログは2系統ある

GASには伝統的に2つのログ方法があります。

| 方法 | 見る場所 | 特徴 |
|------|---------|------|
| `console.log` | 実行ログ（Cloud Logging） | 推奨。構造化ログも扱える |
| `Logger.log` | 実行ログ | 昔ながらの方法。現在も動く |

**今から覚えるなら`console.log`一択**でOKです。`Logger.log`も動きますが、新しいコードは`console.log`で統一すると一貫性が出ます。

### ログはどこで見る？

GASエディタの左メニューから「実行数」または関数実行後に表示される「実行ログ」パネル。トリガー経由で動いた場合も、実行数の履歴から個別実行のログを開けます。

## ポイント3つ：使いこなしの基本

### ポイント1：値の中身を見る

一番よく使うのがコレ。

```javascript
function checkValue() {
  const name = 'みっちゃん';
  const age = 38;
  console.log(name);
  console.log('年齢:', age);
}
```

カンマ区切りで複数の値を並べられます。テンプレートリテラルも便利。

```javascript
console.log(`名前: ${name} / 年齢: ${age}`);
```

### ポイント2：オブジェクト・配列はそのまま投げる

文字列連結で`+`すると`[object Object]`になって泣きます。オブジェクトはそのまま渡しましょう。

```javascript
const user = { name: 'みっちゃん', shift: '夜勤' };

console.log(user);                    // 構造化されて表示される
console.log(JSON.stringify(user));     // 文字列化したいときはこれ
```

2次元配列の中身を確認するときも、`JSON.stringify`が地味に便利。

```javascript
const values = sheet.getDataRange().getValues();
console.log(JSON.stringify(values));
```

### ポイント3：ログレベルを使い分ける

`console`には`log`以外にもレベル別のメソッドがあります。

```javascript
console.log('通常の情報');
console.info('参考情報');
console.warn('警告：値が空でした');
console.error('エラー：処理を中断します');
```

実行ログではレベルごとに色が変わるので、重要な警告・エラーが一目で見つかります。普段は`log`だけで十分、問題の切り分け時に`warn`・`error`を使う、くらいの温度感で。

## 応用：実務で効くデバッグテク

### テク1：関数の入口と出口にログを置く

どこまで動いて、どこで止まったかが一発でわかる。

```javascript
function fetchUsers() {
  console.log('[fetchUsers] 開始');
  // 処理...
  console.log('[fetchUsers] 終了');
  return users;
}
```

`[関数名]`を先頭に付けておくと、実行ログが長くなったときに検索しやすいです。

### テク2：ループの中で条件付きログ

全部出すとログが溢れるので、怪しい行だけ。

```javascript
values.forEach((row, i) => {
  if (row[0] === '') {
    console.warn(`[row ${i}] 空行を検出`);
  }
});
```

### テク3：時間計測

処理が遅いときの原因特定に。

```javascript
const start = new Date();
// 重い処理
const elapsed = new Date() - start;
console.log(`処理時間: ${elapsed}ms`);
```

`console.time`/`console.timeEnd`も使えます。

```javascript
console.time('fetch');
// 重い処理
console.timeEnd('fetch'); // 「fetch: 1234ms」と出る
```

### テク4：本番ではログを減らす

ログが多すぎると、肝心の情報が埋もれます。開発中は盛大に、本番は要点だけに絞るのが吉。フラグで切り替える手もあります。

```javascript
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log(...args);
}
```

### ハマりがちなポイント

- **ログが出ない時**：トリガー実行なら「実行数」から該当実行をクリック
- **古いログが残る**：GASのログは個別実行ごとに記録されるので、過去分と混同しないよう時刻を確認
- **大量出力の注意**：ループの中で毎回出すとログが数千行になることがあります

## まとめ

- 新規コードは`console.log`で統一、`Logger.log`は過去の遺産
- オブジェクトはそのまま渡す、配列は`JSON.stringify`が楽
- `log`/`info`/`warn`/`error`でレベル分け
- 関数の入口・出口ログで「どこまで動いたか」を可視化

デバッグは探偵の仕事に似ています。ログは現場の証拠。ちゃんと残しておくと、犯人（バグ）はたいてい自分で出てきます。夜勤明けの頭でも安心して追えるように、ログ文化を育てていきましょう。

## 関連記事

- [GAS変数const/letの違いと使い分け3パターン](/blog/gas-variable-const-let/)
- [GAS関数の書き方7例とreturn徹底解説](/blog/gas-function-basic/)
- [GAS配列操作push/map/filter早見表15個](/blog/gas-array-basic/)

---

### この記事を書いた人：みっちゃんママ

三姉妹の母で現役ナース、夜勤明けにGASを書いている副業プログラマーです。病棟の事務仕事をGASで片っ端から自動化してきた経験をもとに、「コードが苦手なママでも読めるGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
