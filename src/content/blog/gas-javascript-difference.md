---
title: "GASとJavaScriptの違い7つ初心者向け図解｜V8ランタイムで何が変わった？"
description: "Google Apps ScriptとブラウザJavaScriptの7つの違いを、看護師×副業Webエンジニアの凛が初心者にもわかる図解付きで解説。V8ランタイム移行で使えるようになった文法と、GAS特有の制約・グローバル関数もカバー。"
pubDate: "2026-05-29T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","javascript","v8","runtime"]
tagNames: ["GAS","JavaScript","V8","ランタイム"]
readingTime: 9
keywords: ["GAS JavaScript 違い","GAS V8","GAS JavaScript","GAS ランタイム"]
---

こんにちは、看護師をしながら副業案件でGASを書いている凛です。

GASを教えていると、JavaScript経験者の方から本当によく同じ質問を受けます。「JSができればGASもできるんですよね？」「fetchが使えないって本当ですか？」——実は私自身、GASを書き始めた頃に「この違い、先に知っておきたかった……」と思った点がいくつもありました。そこで今日は、よく聞かれる質問にそのまま答えていくQ&A形式で、**GASとJavaScriptの違い7つ**を初心者向けにまとめます。

## Q. JavaScriptができれば、GASもすぐ書けますか？

**A. ほぼ書けます。ただし「7つの違い」を知らないと最初に必ずつまずきます。**

かくいう私も最初の頃、ブラウザJSの癖で `localStorage.setItem()` と書いて「ReferenceError」を食らったことがあります。まずは全体像を早見表でどうぞ。

| 観点 | ブラウザJavaScript | GAS (V8) |
|---|---|---|
| 1. 実行環境 | ブラウザ | Googleサーバー |
| 2. DOM/Window | あり | **なし** |
| 3. HTTP通信 | `fetch` | `UrlFetchApp.fetch` |
| 4. グローバル関数 | `alert`/`console` | `Logger.log`/`console.log` |
| 5. Googleサービス | なし | **SpreadsheetApp等が使える** |
| 6. 非同期処理 | `async/await` | **同期処理のみ** |
| 7. 実行時間 | 無制限 | **6分制限** |

この7つが頭に入っていれば、JSの知識はほぼそのままGASで使えます。以下、一つずつ質問に答える形で見ていきましょう。

## Q. GASのコードって、どこで動いているんですか？（違い1）

**A. あなたのPCではなく、Googleのサーバー上です。**

ブラウザJSはユーザーのPC上で動きますが、GASは違います。

```
ブラウザJS:  ユーザーPC → ブラウザ内で実行
GAS:        リクエスト → Googleサーバーで実行 → 結果を返す
```

つまりGASは**サーバーサイドJS**。Node.jsに近い立ち位置です。この違いから、クライアント情報（マウス位置・ウィンドウサイズ等）は取得できませんし、ユーザーの入力をリアルタイムで受けたいならWebアプリ化という別の仕組みが必要になります。その代わり、Googleアカウント連携が当然のようにできる。ここがGASの土俵です。

## Q. document や localStorage が使えないのはなぜ？（違い2）

**A. サーバー上で動くので、ブラウザの部品（DOM・Window）がそもそも存在しないからです。**

ブラウザJSの主役であるDOM操作は、GASでは一切できません。

```javascript
// ブラウザJS：DOMを触る
document.getElementById('button').addEventListener('click', ...);

// GAS：そもそも document が存在しない
document.getElementById(...); // ReferenceError!
```

私が食らったReferenceErrorの正体もこれでした。`document`・`window`・`localStorage`・`sessionStorage`は全部なし。データを永続保存したいときは、代わりに`PropertiesService`を使います。

```javascript
// GASでの localStorage 代替
PropertiesService.getScriptProperties().setProperty('key', 'value');
const v = PropertiesService.getScriptProperties().getProperty('key');
```

使い分けの基本パターンも覚えておくと便利です。スクリプトプロパティはAPIキーや設定値の保存に、ユーザープロパティは実行ごとの状態保存に使う、というのが定石です。

## Q. fetch が使えないって本当ですか？（違い3）

**A. 本当です。代わりに `UrlFetchApp.fetch` を使います。**

```javascript
// ブラウザJS
const res = await fetch('https://api.example.com/data');
const data = await res.json();

// GAS
const res = UrlFetchApp.fetch('https://api.example.com/data');
const data = JSON.parse(res.getContentText());
```

見た目は似ていますが、GASのほうは**同期処理**で返ってきます（awaitは不要）。認証ヘッダは`headers`オプションで渡し、タイムアウトやリトライは自前で実装します。

ブラウザJSでPromiseのチェーンを書き慣れている人ほど戸惑うポイントですが、実は移行は簡単で、awaitを取り除いて直接返り値を使うだけでほぼ同じコードが動きます。

## Q. alert や setTimeout の代わりは何を使えばいい？（違い4）

**A. 対応表で覚えてしまうのが早いです。**

| やりたいこと | ブラウザJS | GAS |
|---|---|---|
| ログ出力 | `console.log` | `console.log`（V8で可） or `Logger.log` |
| アラート表示 | `alert` | `Browser.msgBox`（シート限定） |
| タイマー | `setTimeout` | **なし**（代わりに`Utilities.sleep`） |
| JSON解析 | `JSON.parse` | `JSON.parse`（共通） |

V8ランタイム以降、`console.log`は使えるようになりました。`alert`は完全に無し。ユーザーに通知するなら`SpreadsheetApp.getUi().alert()`などを使います。

## Q. 逆に、GASにしかない強みは？（違い5）

**A. Googleサービスが「最初から繋がった状態」で使えることです。これがGAS最大の魅力です。**

```javascript
// スプレッドシートを操作
const ss = SpreadsheetApp.getActiveSpreadsheet();

// Gmailを送る
GmailApp.sendEmail('to@example.com', '件名', '本文');

// カレンダーに予定登録
CalendarApp.getDefaultCalendar().createEvent('申し送り', new Date(), new Date());

// Driveにファイル作成
DriveApp.createFile('test.txt', 'content');
```

ブラウザJSでこれをやろうとすると、OAuth認証・APIキー管理・CORSエラー対応……と大仕事。GASは最初からGoogleアカウント連携済みなので、この面倒が全部消えます。

## Q. async/await は書けますか？（違い6）

**A. 構文としては書けます。でも意味がありません。GASのAPIはすべて同期だからです。**

```javascript
// GASのAPIは同期で返ってくる
const values = sheet.getDataRange().getValues(); // await不要

// UrlFetchApp も同期
const res = UrlFetchApp.fetch(url);
```

並列実行もなし。処理は上から下へ直線的に進みます。

ブラウザJSに慣れていると「awaitがないと不便」と感じるかもしれません。でも私は、これはむしろメリットだと思っています。全て同期で返ってくるのでawaitを書く必要がなく、コードがシンプルになる。asyncを使わずに書けるぶん、初心者にとっては学習コストが低いとも言えます。

### どうしても並列処理っぽいことがしたいときは？

`UrlFetchApp.fetchAll()`を使うと、複数HTTPリクエストを並列で叩けます。ただし一般の関数を並列実行する仕組みはないので、大量データは別トリガーに分割するのが定石です。

## Q. 「6分制限」って本当にあるんですか？（違い7）

**A. あります。GASには「1回の実行で6分まで」という制限があります（Google Workspace有料版は30分）。**

これを超えるとトリガーは強制終了し、以降の処理は失われます。ブラウザJSには実行時間制限がないため、移行組が一番忘れがちなポイントです。

対策は、一度に処理するデータ量を小さく分割すること、スクリプトプロパティに進捗を保存して次回トリガーで続きから実行すること、そして`Utilities.sleep`の濫用を避けること（待ち時間も6分にカウントされます）。ループで大量のデータを処理するコードを書くときは、最初から「1回の実行で何件まで」を意識した分割設計にしましょう。

詳しくは [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/) で。

## Q. V8ランタイムで何が変わったんですか？

**A. モダンJSの文法が、ほぼそのまま使えるようになりました。**

GASは2020年にV8ランタイムに対応しています。

| 文法 | V8以前 | V8以降 |
|---|:---:|:---:|
| `const` / `let` | ❌ | ✅ |
| アロー関数 | ❌ | ✅ |
| テンプレートリテラル | ❌ | ✅ |
| 分割代入 | ❌ | ✅ |
| デフォルト引数 | ❌ | ✅ |
| `class`構文 | ❌ | ✅ |
| `async/await`構文 | ❌ | ✅（書けるがAPIは同期） |
| スプレッド構文 | ❌ | ✅ |

2020年以前の古いサンプルコードは`var`ベースで書かれていることが多いですが、2026年の現役プロジェクトは全部V8前提でOKです。

一つだけ注意を。古いプロジェクトを引き継いだときは、Rhinoランタイム（旧環境）のままになっていることがあります。「プロジェクトの設定」の「Chrome V8ランタイムを有効にする」がオンになっているか、最初に確認する癖をつけてください。V8にすると、const/let/アロー関数などのモダン構文が使えるようになります。

## Q. 他に、移行組がハマりやすい落とし穴は？

**A. 私や周りの経験だと、タイムゾーンのズレが代表格です。**

`new Date()`をそのまま使うと、GASのサーバーのタイムゾーン（UTC）で動くことがあります。「日付が1日ずれてる！」の原因はだいたいこれ。日本時間で処理したい場合は、プロジェクト設定のタイムゾーンを`Asia/Tokyo`にするか、`Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm')`のようにタイムゾーンを明示的に指定しましょう。

あとは繰り返しになりますが、fetchの代替（awaitを外すだけ）と6分制限の意識。この2つとタイムゾーンを押さえておけば、ブラウザJS経験者がGASでつまずくポイントはほぼ潰せます。

## おわりに

質問に答える形で7つの違いを見てきました。GASは「ブラウザJSの変種」ではなく、**「Googleインフラ前提のJSサーバーサイドランタイム」**と捉えると理解が早いです。Node.jsに近いけれど、デプロイ不要・インフラ意識不要で手軽に動く。そう考えると、DOMがないことも6分制限も「そういう土俵なんだ」と腑に落ちるはずです。

違いさえ押さえれば、JS経験者は即戦力。ぜひ今日、スプレッドシートを一枚開いて最初のスクリプトを書いてみてください。

## 関連記事

- [GAS変数const/letの違いと使い分け3パターン](/blog/gas-variable-const-let/)
- [GAS関数の書き方7例とreturn徹底解説](/blog/gas-function-basic/)
- [GASトリガー設定完全ガイド](/blog/gas-trigger-setup/)
- [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/)

## 自分でも作れるようになりたい方へ

GASを体系的に学びたい方には、現役エンジニアから直接学べるプログラミングスクールがおすすめです。副業で稼ぐための実践的なカリキュラムが充実しています。

<a href="https://h.accesstrade.net/sp/cc?rk=0100knoa00orcn" rel="nofollow" referrerpolicy="no-referrer-when-downgrade">Dive into Code（プログラミングスクール）</a><img src="https://h.accesstrade.net/sp/rr?rk=0100knoa00orcn" width="1" height="1" border="0" alt="">

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。掲載コードは構文とAPI仕様を確認したうえで載せています。
