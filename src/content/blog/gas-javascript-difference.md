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

こんにちは、凛です。都内で看護師をしながら、副業でWebエンジニアをしています。ふだん案件でReact/Node.jsを書いていて、GASにも触れると「**この違い、最初に知っておきたかった…**」と思う場面が多々あります。今日は**GASとJavaScriptの違い7つ**を、初心者向けに図解ベースでまとめます。

「GAS JavaScript 違い」で検索してここに来た方が、読み終わった直後にすぐ手を動かせるレベルで書いています。

## こんな悩みありませんか？

- 「JavaScriptができればGASもできるって聞いたけど、本当？」
- 「ブラウザのJSと同じ感覚で書くと動かないことがある」
- 「`fetch`が使えないって本当？」
- 「V8ランタイムにしたけど、何が変わったのかイマイチわからない」
- 「GASのサンプルコードで出てくる`SpreadsheetApp`って何者？」

私も最初の頃、ブラウザJSの癖で `localStorage.setItem()` と書いて「ReferenceError」を食らったことがあります。7つの違いさえ頭に入れておけば、JS経験者はGASでもすぐに戦力化できます。

## 違い全体像：早見表

| 観点 | ブラウザJavaScript | GAS (V8) |
|---|---|---|
| 1. 実行環境 | ブラウザ | Googleサーバー |
| 2. DOM/Window | あり | **なし** |
| 3. HTTP通信 | `fetch` | `UrlFetchApp.fetch` |
| 4. グローバル関数 | `alert`/`console` | `Logger.log`/`console.log` |
| 5. Googleサービス | なし | **SpreadsheetApp等が使える** |
| 6. 非同期処理 | `async/await` | **同期処理のみ** |
| 7. 実行時間 | 無制限 | **6分制限** |

この7つが頭に入っていれば、JSの知識はほぼそのままGASで使えます。

## 違い1：実行環境が違う（サーバーサイド）

ブラウザJSはユーザーのPC上で動きますが、**GASはGoogleのサーバー上で動きます**。

```
ブラウザJS:  ユーザーPC → ブラウザ内で実行
GAS:        リクエスト → Googleサーバーで実行 → 結果を返す
```

つまりGASは**サーバーサイドJS**。Node.jsに近い立ち位置です。

### 何が変わる？
- **クライアント情報（マウス位置・ウィンドウサイズ等）は取得不可**
- ユーザーの入力をリアルタイムで受ける仕組みは別途必要（Webアプリ化）
- 代わりにGoogleアカウント連携が当然のようにできる

## 違い2：DOM・Windowオブジェクトが存在しない

ブラウザJSの主役であるDOM操作はGASでは一切できません。

```javascript
// ブラウザJS：DOMを触る
document.getElementById('button').addEventListener('click', ...);

// GAS：そもそも document が存在しない
document.getElementById(...); // ReferenceError!
```

- `document`・`window`・`localStorage`・`sessionStorage`も**全部なし**
- 代わりに`PropertiesService`で永続データ保存

```javascript
// GASでの localStorage 代替
PropertiesService.getScriptProperties().setProperty('key', 'value');
const v = PropertiesService.getScriptProperties().getProperty('key');
```

## 違い3：HTTP通信は`UrlFetchApp`

ブラウザの`fetch`はGASでは使えません。代わりに`UrlFetchApp.fetch`を使います。

```javascript
// ブラウザJS
const res = await fetch('https://api.example.com/data');
const data = await res.json();

// GAS
const res = UrlFetchApp.fetch('https://api.example.com/data');
const data = JSON.parse(res.getContentText());
```

- **同期処理**で返ってくる（awaitは不要）
- 認証ヘッダは`headers`オプション
- タイムアウトやリトライは自前で実装

## 違い4：グローバル関数が違う

| やりたいこと | ブラウザJS | GAS |
|---|---|---|
| ログ出力 | `console.log` | `console.log`（V8で可） or `Logger.log` |
| アラート表示 | `alert` | `Browser.msgBox`（シート限定） |
| タイマー | `setTimeout` | **なし**（代わりに`Utilities.sleep`） |
| JSON解析 | `JSON.parse` | `JSON.parse`（共通） |

V8ランタイム以降、`console.log`は使えるようになりました。`alert`は完全に無し。ユーザーに通知するなら`SpreadsheetApp.getUi().alert()`などを使います。

## 違い5：Googleサービスが自然に使える

これがGAS最大の魅力。

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

ブラウザJSでこれをやろうとすると、OAuth認証・APIキー管理・CORSエラー対応…と大仕事。**GASは最初からGoogleアカウント連携済み**なので、この面倒が全部消えます。

## 違い6：非同期処理がない（全部同期）

V8ランタイムで`async/await`構文は書けるようになりましたが、**GASのAPIはすべて同期**です。

```javascript
// GASのAPIは同期で返ってくる
const values = sheet.getDataRange().getValues(); // await不要

// UrlFetchApp も同期
const res = UrlFetchApp.fetch(url);
```

並列実行もなし。処理は上から下へ直線的に進みます。

### 裏技：Promise.all風の並列処理が欲しい時
`UrlFetchApp.fetchAll()`を使うと、複数HTTPリクエストを並列で叩けます。ただし一般の関数を並列実行する仕組みはないので、大量データは別トリガーに分割するのが定石。

## 違い7：6分の実行時間制限

**GASには「1回の実行で6分まで」という制限**があります（Google Workspace有料版は30分）。

これを超えるとトリガーは強制終了し、以降の処理は失われます。

### 対策
- 一度に処理するデータ量を小さく分割
- スクリプトプロパティに進捗を保存して、次回トリガーで続きから実行
- `Utilities.sleep`の濫用を避ける（待ち時間も6分にカウント）

詳しくは [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/) で。

## V8ランタイム移行で何が変わった？

GASは2020年にV8ランタイム対応で**モダンJSほぼそのまま使えるようになりました**。

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

2020年以前の古いサンプルコードは`var`ベースで書かれていることが多いですが、**2026年の現役プロジェクトは全部V8前提でOK**です。

## まとめ

- GASはサーバーサイドJS。DOM/Window/localStorageは使えない
- `fetch`の代わりに`UrlFetchApp`、`alert`の代わりに`Browser.msgBox`
- Googleサービス（Spreadsheet/Gmail/Calendar/Drive）が自然に使える
- V8ランタイムで`const`/`let`/アロー関数/分割代入等のモダン文法OK
- APIは全て同期。6分制限は必ず意識
- ブラウザJSとの違いさえ押さえれば、JS経験者は即戦力

GASは「ブラウザJSの変種」ではなく、**「Googleインフラ前提のJSサーバーサイドランタイム」**と捉えると理解が早いです。Node.jsに近いけれど、デプロイ不要・インフラ意識不要で手軽に動く、と考えると強みが見えてきます。


## 📚 さらに学ぶための参考書籍

<div class="ad-block">
<p class="ad-label">PR：本記事には広告（楽天市場）が含まれます</p>

GASやJavaScriptを体系的に学びたい方は、書籍も併用するのが効率的です。
日本語の解説書が複数出ているので、自分のレベルに合うものを選んでみてください。

👉 <a href="//af.moshimo.com/af/c/click?a_id=5501673&p_id=54&pc_id=54&pl_id=621" rel="nofollow sponsored" referrerpolicy="no-referrer-when-downgrade" target="_blank">楽天市場</a> で「Google Apps Script」または「JavaScript 入門」を検索
<img src="//i.moshimo.com/af/i/impression?a_id=5501673&p_id=54&pc_id=54&pl_id=621" width="1" height="1" style="border:none;" loading="lazy" alt="" />
</div>

## 関連記事

- [GAS変数const/letの違いと使い分け3パターン](/blog/gas-variable-const-let/)
- [GAS関数の書き方7例とreturn徹底解説](/blog/gas-function-basic/)
- [GASトリガー設定完全ガイド](/blog/gas-trigger-setup/)
- [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
