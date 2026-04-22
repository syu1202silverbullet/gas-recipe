---
title: "GAS変数const/letの違いと使い分け3パターン"
description: "GASのconstとletの違いを現役ナースのみっちゃんママがやさしく解説。3つの使い分けパターンで、もう変数宣言で迷わない。"
pubDate: "2026-05-03T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","basics","variable"]
tagNames: ["GAS","入門","変数"]
readingTime: 5
keywords: ["GAS const let 違い"]
---

こんにちは、みっちゃんママです。三姉妹を育てながら夜勤ナースをして、すき間時間にGASをコツコツ書いている副業プログラマーです。今日は、GASを触り始めた人がほぼ必ずつまずく「`const`と`let`の違い」について、病棟の申し送りばりにわかりやすくお話しますね。

## こんな悩みありませんか？

- 「`const`と`let`、結局どっちを使えばいいの？」
- 「`var`って書いてるサンプルもあるけど、今も使っていいの？」
- 「書き換えようとしたら急にエラーが出て詰まった」

私も最初はぜんぶ`var`で書いてて、ある日スプレッドシートの自動集計スクリプトが「Assignment to constant variable」って怒ってきて、白衣のポケットでスマホを握りしめたまま固まりました。でも仕組みを知ってしまえば、もう迷いません。

## 全体像：GASの変数宣言3兄弟

GAS（正確にはV8ランタイムのJavaScript）で使う変数宣言は、次の3つです。

| 宣言 | 再代入 | 再宣言 | スコープ |
|------|:----:|:----:|---------|
| `const` | できない | できない | ブロック |
| `let` | できる | できない | ブロック |
| `var` | できる | できる | 関数 |

ざっくり言うと、**中身を書き換えないなら`const`、書き換えるなら`let`、`var`はもう使わない**、これだけ覚えておけば日常業務の9割は回ります。

```javascript
const SHEET_NAME = '勤怠';     // 後から変えない名前
let rowCount = 0;              // ループの中でカウントアップする
// var oldStyle = 'もう使わない'; // V8以降はlet/const推奨
```

## ポイント3つ：使い分けパターン

### パターン1：固定値・設定値は`const`

シート名、列番号、APIのURLなど、一度決めたら動かさない値はすべて`const`にします。コードを読み返したときに「これは定数だな」と一目で分かるのが大きい。

```javascript
const SPREADSHEET_ID = '1abcXXXXXXXX';
const SHEET_NAME = '患者リスト';
const HEADER_ROW = 1;

function openSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(SHEET_NAME);
}
```

ちなみに`const`でもオブジェクトや配列の**中身**は書き換え可能です。再代入ができないだけ。ここ、テストに出ます（出ません）。

```javascript
const users = [];
users.push('みっちゃん'); // OK、中身を足しているだけ
// users = ['別配列']; // NG、再代入はできない
```

### パターン2：ループカウンタ・一時値は`let`

`for`文のカウンタ、途中で条件分岐して中身が変わる変数には`let`。ブロックスコープなので、`for`の外には漏れません。

```javascript
function sumColumn(values) {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    total += values[i];
  }
  return total;
}
```

`let i`と書くことで、この`i`は`for`ブロックの中だけの存在になります。病棟のカルテみたいに、担当範囲がハッキリしていると事故が減ります。

### パターン3：関数の引数は基本そのまま（再代入は避ける）

関数の引数は、できれば書き換えずに新しい変数に入れ直すのが読みやすいです。

```javascript
function formatName(rawName) {
  const name = rawName.trim(); // 加工した結果はconstへ
  return name;
}
```

引数を直接いじると、呼び出し元と食い違ったときに原因追跡がツラい。新しい`const`に入れてしまえば平和です。

## 応用：迷ったら`const`ファースト

現場のコツとして、**まず`const`で書いてみて、どうしても再代入が必要になったら`let`に書き換える**という順序がおすすめです。

- `const`で書く → エラーが出たら`let`へ
- ループの中だけで使う変数は`let`
- グローバルに置く設定値は全部`const`で大文字命名

この順で書くと、後から読み返したときに「ここは変わる値／ここは固定値」が自然に整理されます。三姉妹のお弁当作りと同じで、容器を先に決めてから中身を詰めると失敗しません。

### `var`を避ける理由だけメモ

`var`は関数スコープで、ブロックを突き抜けてしまいます。ループの`i`が外に漏れて別の`i`を書き換えた、なんて事故のもと。V8ランタイムのGASでは`let`/`const`が素直に使えるので、新規コードで`var`を選ぶ理由はほぼありません。

## まとめ

- 書き換えないなら`const`、書き換えるなら`let`
- `var`は新規では使わない
- 迷ったら`const`ファーストで書いて、必要になったら`let`に直す
- `const`でもオブジェクトの中身は変えられることだけ覚えておく

最初のうちは「全部`const`でいいの？」と不安になりますが、むしろ再代入が必要な場面は意外と少ないです。ナース仲間にも「書き換える予定があるものだけ`let`」って教えると、だいたい一発で腑に落ちてもらえます。

## 関連記事

- [GAS関数の書き方7例とreturn徹底解説](/blog/gas-function-basic/)
- [GASループfor文5種類使い分け完全マスター](/blog/gas-for-loop-5/)
- [GAS配列操作push/map/filter早見表15個](/blog/gas-array-basic/)

---

### この記事を書いた人：みっちゃんママ

三姉妹の母で現役ナース、夜勤明けにGASを書いている副業プログラマーです。病棟の事務仕事をGASで片っ端から自動化してきた経験をもとに、「コードが苦手なママでも読めるGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
