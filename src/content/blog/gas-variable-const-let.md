---
title: "GAS変数const/letの違いと使い分け3パターン｜初心者がハマる落とし穴も解説"
description: "GASの変数宣言でつまずきやすいconstとletの違いを、現役ナース副業プログラマーの凛がやさしく解説。3つの使い分けパターンと、よくあるエラーの直し方までコピペ例付きで紹介します。"
pubDate: "2026-06-06T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","basics","variable","const","let"]
tagNames: ["GAS","入門","変数","const","let"]
readingTime: 8
keywords: ["GAS const let 違い","GAS 変数","GAS var"]
---

こんにちは、凛です。都内で看護師をしながら、副業でWebエンジニアをしていて、すき間時間にGAS（Google Apps Script）で病棟の事務仕事を自動化していますです。今日は、GASを触り始めた人がほぼ確実に一度はつまずく「**`const`と`let`の違い**」について、病棟の申し送りばりにわかりやすくお話しますね。

「GAS const let 違い」で検索してここに来た方が、読み終わったあとすぐにコードに戻れるレベルを意識して書いています。

## こんな悩みありませんか？

- 「`const`と`let`、結局どっちを使えばいいのか毎回悩む」
- 「サンプルコードに`var`って書いてあるけど、2026年も使っていいの？」
- 「書き換えようとしたら急に `Assignment to constant variable` って赤字で怒られた」
- 「`for`文のカウンタは`let`って聞いたけど、なんで`const`じゃダメなのか説明できない」

私も最初は全部`var`で書いていて、ある日スプレッドシートの自動集計スクリプトが突然エラーで止まったとき、白衣のポケットでスマホを握りしめたまま固まりました。でも仕組みを知ってしまえば、もう迷うことはありません。むしろ**「迷ったらconst」というシンプルなルール**で日常のGAS業務はほぼ回ります。

## GASの変数宣言3兄弟の全体像

GAS（正確にはV8ランタイムのJavaScript）で使う変数宣言は、次の3つです。

| 宣言 | 再代入 | 再宣言 | スコープ | 2026年の推奨度 |
|------|:----:|:----:|---------|:----:|
| `const` | できない | できない | ブロック | ◎ まず使う |
| `let` | できる | できない | ブロック | ○ 必要なら使う |
| `var` | できる | できる | 関数 | △ 新規では使わない |

ざっくり言うと、**中身を書き換えないなら`const`、書き換えるなら`let`、`var`はもう使わない**、これだけ覚えておけば十分です。

```javascript
const SHEET_NAME = '勤怠';     // 後から変えない名前 → const
let rowCount = 0;              // ループの中で増えていく → let
// var oldStyle = 'もう使わない'; // V8以降はlet/const推奨
```

### ブロックスコープってそもそも何？

病棟で例えるなら「担当する患者さんの範囲」です。`let`と`const`は **波括弧 `{ }` の中**で生まれた変数が、そのブロックの外には出ていけません。`var`は病棟全体（＝関数まるごと）が担当になってしまうので、他のループに漏れて事故ります。

```javascript
function demo() {
  for (let i = 0; i < 3; i++) {
    // この i は for の中だけの存在
  }
  // console.log(i); // エラー：i は外からは見えない
}
```

この「見える範囲が狭い」ことが、後々のバグを減らす最大の理由です。

## 使い分け3パターン：迷ったらここを見る

### パターン1：固定値・設定値はすべて`const`

シート名、列番号、APIのURL、スプレッドシートのID…一度決めたら動かさない値はすべて`const`にします。**コードを読み返したときに「これは定数だな」と一目でわかる**のが一番大きなメリットです。

```javascript
const SPREADSHEET_ID = '1abcXXXXXXXXXXXXXXXXXXXX';
const SHEET_NAME = '患者リスト';
const HEADER_ROW = 1;
const API_ENDPOINT = 'https://example.com/api';

function openSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(SHEET_NAME);
}
```

定数は慣習として **大文字＋アンダースコア（SCREAMING_SNAKE_CASE）** で書くと、さらに読みやすくなります。チームでGASを触るときにも「これは絶対に触らないで」という合図になります。

#### `const`でも中身は書き換えられるワナ

ここが初心者の最大のハマりポイント。`const`で宣言した配列やオブジェクトは、**再代入はできないけれど中身は書き換え可能**です。

```javascript
const users = [];
users.push('佐藤'); // ✅ OK：配列に要素を追加しているだけ
users[0] = '変更';        // ✅ OK：中身を書き換えているだけ
// users = ['別配列'];    // ❌ NG：再代入はできない
```

「`const`だから中身も変わらない」と思い込んで、意図せず配列の中身が書き換わってバグった…というのは副業でGASを教えた生徒さんからもよく聞きます。**`const`が守ってくれるのは「名前と中身の結びつき」だけ**、と覚えておきましょう。

### パターン2：ループカウンタ・一時値は`let`

`for`文のカウンタや、途中で中身が変わる変数には`let`を使います。

```javascript
function sumColumn(values) {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    total += values[i];
  }
  return total;
}
```

ここで `const i` と書くと「ループを1周して i++しようとした瞬間」にエラーで止まります。再代入できないのが`const`の仕事なので、当然の挙動ですね。

もうひとつ`let`の出番は、**条件分岐で値が変わる変数**です。

```javascript
function selectMessage(hour) {
  let message = 'おつかれさまです';
  if (hour < 10) {
    message = 'おはようございます';
  } else if (hour >= 18) {
    message = 'お疲れ様でした、お気をつけてお帰りください';
  }
  return message;
}
```

`if`で値を差し替える用途は、`let`の王道です。

### パターン3：関数の引数は加工して`const`に入れ直す

関数の引数は技術的には書き換え可能ですが、**直接いじらず新しい`const`に入れ直す**のが読みやすさの面で圧倒的におすすめです。

```javascript
function formatPatientName(rawName) {
  const name = rawName.trim();                  // 前後の空白除去
  const normalized = name.replace(/\s+/g, ' '); // 全角半角空白をまとめる
  return normalized;
}
```

引数を直接上書きすると、呼び出し元と食い違ったときに原因追跡がツラくなります。**入り口を汚さず、加工ステップごとに新しい`const`を積み上げる**と、半年後の自分が助かります。

## `var`を避けるべき3つの理由

「`var`でも動くなら、別にいいのでは？」という質問もよくいただきます。結論、新規コードでは`var`を使わない方が安全です。

1. **ブロックを突き抜けてしまう**：`for`の中で宣言した`var i`が外まで見えて、意図せず別の場所で書き換わる
2. **再宣言できてしまう**：同じ名前を何度でも宣言できるため、タイプミスに気づきにくい
3. **巻き上げ（hoisting）の挙動が直感に反する**：宣言前に参照しても`undefined`になり、エラーで気づけない

GAS（V8ランタイム）は`let`/`const`が素直に使えるので、`var`を選ぶ理由がもう残っていません。古いサンプルコードに`var`が出てきたら、写経するときに`const`/`let`に書き換える練習をするくらいがちょうど良いです。

## よくあるエラーと解決法

### `Assignment to constant variable.`

もっともよく見るエラー。`const`で宣言した変数に再代入しようとしたときに出ます。

```javascript
const count = 0;
count = count + 1; // ❌ Assignment to constant variable.
```

**対処**：再代入したいなら`let`に変える。再代入したくないなら、ロジックを見直して別の`const`を作る。

```javascript
let count = 0;
count = count + 1; // ✅ letなのでOK
```

### `SyntaxError: Identifier '〇〇' has already been declared.`

同じ名前を2回`const`/`let`で宣言すると出ます。

```javascript
const name = '佐藤';
const name = 'ママ'; // ❌ 同じ名前は2回宣言できない
```

**対処**：違う名前を付けるか、再代入にするなら`let`に統一します。`var`時代の「同じ名前で何度でも宣言OK」のクセが残っている人は要注意。

## 迷ったら「const → let」の順で書く

現場のコツとして、**まず`const`で書いてみて、どうしても再代入が必要になったら`let`に書き換える**という順序を強くおすすめします。

- `const`で書き始める
- エラーが出て再代入が必要とわかったら`let`に変える
- ループの中だけで使う変数は最初から`let`
- グローバルに置く設定値は全部`const`で大文字命名

この順で書くと、後から読み返したときに「ここは変わる値／ここは固定値」が自然に整理されます。料理でおかずを小分けにするのと同じで、**容器を先に決めてから中身を詰めると失敗しない**んですよね。

## まとめ

- 書き換えないなら`const`、書き換えるなら`let`、`var`は新規では使わない
- `const`は再代入を禁止するだけで、配列・オブジェクトの中身は変えられる
- `let`の出番はループカウンタと条件分岐での値差し替え
- 迷ったら`const`ファーストで書いて、必要になったら`let`に直す
- エラー `Assignment to constant variable.` が出たらそれはlet案件

GAS初心者のうちは「全部`const`にして大丈夫？」と不安になるのですが、実際に書いてみると**再代入が必要な場面は意外と少ない**ことに気づきます。ナース仲間にも「変数は基本const、ループと条件分岐だけlet」と教えると、だいたい一発で腑に落ちてもらえます。

次は [GAS関数の書き方7例とreturn徹底解説](/blog/gas-function-basic/) で、関数の中での変数スコープをもう一歩深く見ていくのがおすすめです。

## 関連記事

- [GAS関数の書き方7例とreturn徹底解説](/blog/gas-function-basic/)
- [GASループfor文5種類使い分け完全マスター](/blog/gas-for-loop-5/)
- [GAS配列操作push/map/filter早見表15個](/blog/gas-array-basic/)
- [GASよく出るエラー10選と解決コード集](/blog/gas-error-exception/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
