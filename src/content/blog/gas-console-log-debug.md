---
title: "GASログ出力console.logでデバッグ完全版｜Logger.logとの違い・応用テク10選"
description: "GASのconsole.logを使ったデバッグ手法を、現役ナース副業プログラマーが実務目線で解説。Logger.logとの違い・時間計測・条件付きログ・本番ログ最適化まで完全ガイドします。"
pubDate: "2026-05-14T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","debug","logging","console-log","logger"]
tagNames: ["GAS","デバッグ","ログ","console.log","Logger"]
readingTime: 9
keywords: ["GAS console.log","GAS ログ","GAS デバッグ","GAS Logger.log"]
---

エラーは出ていないのに、結果だけがおかしい。そんなとき、あなたならまず何をしますか？

こんにちは、凛です。看護師をしながら副業でWebエンジニアをしています。冒頭の問いは、GASを書き始めた頃の私が毎週のようにぶつかっていた壁です。コードを上から下まで何度も読み返して、画面とにらめっこして、「なぜ…なぜ動かない…」とつぶやく。夜勤明けの頭だと、だいたい1回は「なんで動かないの？！」って叫びます。

答えを先に言ってしまうと、読み返すより先に`console.log`で**中身を見る**のが正解でした。コードを目で追って間違いを探すのは、実は上級者でも当たりません。変数の中に「いま実際に何が入っているか」をログに吐かせて確認するほうが、圧倒的に早くて確実。私の場合、ログを出す習慣がついてから、トラブル解決の時間が体感1/3くらいになりました。

この記事では、その`console.log`の使い方を、Logger.logとの違いから実務テクまで掘り下げてお話しますね。

## で、ログはどこに出るの？——まず2系統を整理

GASには伝統的に2つのログ方法があります。ここが最初の分かれ道です。

| 方法 | 見る場所 | 特徴 | 2026年の推奨度 |
|------|---------|------|:---:|
| `console.log` | 実行ログ（Cloud Logging） | 構造化ログ・レベル別表示 | ◎ |
| `Logger.log` | 実行ログ | 昔ながらの方法。現在も動く | △ |

「どっちを使えばいいの？」という疑問への答えはシンプルで、**2026年から新しく覚えるなら`console.log`一択**です。`Logger.log`も動きますが、新しいコードは`console.log`で統一すると一貫性が出て、Cloud Loggingとの連携もスムーズ。

### `console.log`と`Logger.log`は何が違う？

```javascript
console.log('佐藤');        // 推奨：レベル別、構造化、複数引数
Logger.log('佐藤');          // 昔ながら：単純な文字列ログ
Logger.log('名前: %s', '佐藤'); // フォーマット指定もできる
```

`Logger.log`は単純な文字列ログ向け。`console.log`はレベル分け・複数引数・構造化出力ができるので、**どちらか迷ったら`console`**と覚えましょう。

### 出したログはどこで見る？

GASエディタの左メニューから「**実行数**」、または関数実行後に下部に表示される「**実行ログ**」パネルです。トリガー経由で動いた場合も、実行数の履歴から個別実行のログを開けます。

ちなみにスマホのGoogle Apps ScriptアプリからもCloud Loggingが見えるので、外出先から夜勤中のGASの様子を確認できるのは地味に便利です。

## `console.log`には何をどう渡せばいい？

場所がわかったら、次は「何を出すか」。基本は3つだけです。

### 値はそのまま、複数ならカンマ区切り

一番よく使うのがコレ。

```javascript
function checkValue() {
  const name = '佐藤';
  const age = 38;
  console.log(name);
  console.log('年齢:', age);
}
```

**カンマ区切りで複数の値を並べられる**のが`console.log`の強み。テンプレートリテラルも便利です。

```javascript
console.log(`名前: ${name} / 年齢: ${age}`);
```

### オブジェクト・配列は`+`で連結しない

ここ、初心者時代の私が一番泣いたところです。文字列連結で`+`すると`[object Object]`になって中身が見えません。**オブジェクトはそのまま渡しましょう**。

```javascript
const user = { name: '佐藤', shift: '夜勤' };

console.log('ダメな例: ' + user);        // [object Object] ← 泣く
console.log(user);                        // ✅ 構造化されて表示される
console.log(JSON.stringify(user));        // 文字列化したいときはこれ
console.log(JSON.stringify(user, null, 2)); // インデント付きで超見やすい
```

スプレッドシートから取ってきた2次元配列の中身を確認するときも、`JSON.stringify`が地味に便利。

```javascript
const values = sheet.getDataRange().getValues();
console.log(JSON.stringify(values, null, 2));
```

### レベル分けって必要？

必要になる日が来ます。`console`には`log`以外にもレベル別のメソッドがあるんです。

```javascript
console.log('通常の情報');
console.info('参考情報');
console.warn('警告：値が空でした');
console.error('エラー：処理を中断します');
```

実行ログではレベルごとに色が変わるので、**重要な警告・エラーが一目で見つかります**。とはいえ最初から全部使い分ける必要はなくて、普段は`log`だけで十分。問題の切り分け時に`warn`・`error`を足す、くらいの温度感でいいと思います。

## じゃあ実務ではどう仕込む？——私の定番テク7つ

ここからが深掘りです。「ログを出せるようになった」と「ログでバグを仕留められる」の間には少し距離があって、それを埋めるのが仕込み方のパターン。私が勤怠集計やシート自動化で実際に使っている7つを紹介します。

### テク1：関数の入口と出口にログを置く

どこまで動いて、どこで止まったかが一発でわかります。

```javascript
function fetchUsers() {
  console.log('[fetchUsers] 開始');
  // 処理...
  console.log('[fetchUsers] 終了 件数:', users.length);
  return users;
}
```

**`[関数名]`を先頭に付けておく**と、実行ログが長くなったときにCmd+Fで検索しやすいです。

### テク2：ループの中は条件付きで

全部出すとログが溢れるので、怪しい行だけピンポイントに。

```javascript
values.forEach((row, i) => {
  if (row[0] === '') {
    console.warn(`[row ${i}] 空行を検出`);
  }
});
```

### テク3：時間計測で「遅い犯人」を特定

処理が遅いときの原因特定に。

```javascript
const start = new Date();
// 重い処理
const elapsed = new Date() - start;
console.log(`処理時間: ${elapsed}ms`);
```

`console.time` / `console.timeEnd` でもっと簡潔に書けます。

```javascript
console.time('fetch');
// 重い処理
console.timeEnd('fetch'); // 「fetch: 1234ms」と出る
```

**GASには6分制限があるので、時間計測は早めに仕込んでおく**と、後で「なぜか止まる」という悲劇が減ります。

### テク4：本番ではログを減らす

ログが多すぎると、肝心の情報が埋もれます。開発中は盛大に、本番は要点だけ。フラグで切り替える手もあります。

```javascript
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

// 呼び出し側はいつも通り
debugLog('デバッグ情報', someValue);
```

本番リリース時に`DEBUG = false`にするだけで、デバッグログが全部止まります。

### テク5：エラーはcatchしてログに残す

```javascript
try {
  // 失敗するかもしれない処理
  const sheet = SpreadsheetApp.openById('unknown');
} catch (e) {
  console.error('[エラー]', e.message, e.stack);
}
```

`e.stack`まで出すと、どこでコケたか行番号まで追えます。

### テク6：条件分岐のどこを通ったか可視化する

```javascript
function route(value) {
  if (value > 100) {
    console.log('[route] A分岐');
  } else if (value > 50) {
    console.log('[route] B分岐');
  } else {
    console.log('[route] C分岐');
  }
}
```

「思っていない分岐を通っている」というバグ、意外と多いんですよね。分岐のたびにログを仕込むと発見が早いです。

### テク7：区切り文字でログをグループ化する

```javascript
console.log('=== 集計開始 ===');
console.log('売上:', total);
console.log('件数:', count);
console.log('=== 集計終了 ===');
```

長い実行ログの中から「ここだ」と見つけるとき、区切り文字があると目で追えます。地味ですが効きます。

## それでもログが出ない・読めないときは？

仕込んだのに出ない、出たけど読めない。そんなときにチェックしてほしいポイントをまとめておきます。

- **ログが出ない時**：トリガー実行なら「実行数」から該当実行をクリック。エディタの実行ログには出ないので注意
- **古いログが残る**：GASのログは個別実行ごとに記録されるので、過去分と混同しないよう時刻を確認
- **大量出力の注意**：ループの中で毎回`console.log`すると、ログが数千行になって読めなくなる
- **Logger.logとの併用**：混在すると見づらいので、プロジェクト内では`console`に統一するのが吉

特に1つ目は本当によく聞かれます。「トリガーで動いたログはエディタに出ない」——これを知らずに30分溶かした人を、私は何人も知っています（私含む）。

## おわりに：ログは現場の証拠

デバッグって、探偵の仕事に似ているなと思います。**ログは現場の証拠**。ちゃんと残しておくと、犯人（バグ）はたいてい自分で出てきます。

冒頭の問いに戻ると、「エラーが出ないのに結果がおかしい」ときにやるべきことは、コードを読み返すことではなく、証拠を集めること。まずは怪しい関数の入口と出口に`console.log`を2行置くところから始めてみてください。夜勤明けの頭でも安心して追えるように、少しずつログ文化を育てていきましょう。

なお、掲載しているコードは構文を確認のうえ載せていますが、お使いのシートや環境に合わせて調整してくださいね。

## 関連記事

- [GAS変数const/letの違いと使い分け3パターン](/blog/gas-variable-const-let/)
- [GAS関数の書き方7例とreturn徹底解説](/blog/gas-function-basic/)
- [GAS配列操作push/map/filter早見表15個](/blog/gas-array-basic/)
- [GASよく出るエラー10選と解決コード集](/blog/gas-error-exception/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
