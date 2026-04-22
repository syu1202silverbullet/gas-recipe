---
title: "GASよく出るエラー10選と解決コード集｜辞書代わりに使える完全版"
description: "GASエラーに悩む初心者向けに、undefined・権限・タイムアウトなど頻出10種を実体験ベースで解決。コピペで使える解決コードと、原因の見分け方を網羅します。"
pubDate: "2026-04-25T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas", "error", "troubleshooting"]
tagNames: ["GAS", "エラー", "トラブル解決"]
readingTime: 7
---
## こんな悩みありませんか？

「実行ボタンを押したら赤字のエラーが出た…英語で読めない」
「昨日は動いたのに今日は動かない、なぜ？」
「`undefined` ってなに？どこを直せばいい？」

GASを触り始めて最初の1週間、私はこのエラー地獄で何度も心が折れました。公式ドキュメントは丁寧ですが、初心者向けではなく「そもそも用語がわからない」問題にぶつかります。

この記事では、私が実際に踏み抜いた**エラー10選**と、その解決コードをまとめました。エラーメッセージをブックマーク代わりに使えるよう、検索しやすい形で並べています。

## エラー解決の基本フロー

```
[エラー発生] → [メッセージ全文をコピー] → [該当行を確認] → [型と値をログ出力] → [修正] → [再実行]
```

いきなりコードを直そうとせず、**まず状態を見える化**するのが近道です。`console.log` で変数の中身を出すだけで8割は解決します。

## 頻出エラー10選と解決コード

### 1. `TypeError: Cannot read properties of undefined`

もっとも遭遇するエラー。存在しないプロパティを読もうとしています。

```javascript
function getUser() {
  const data = { name: "太郎" };
  console.log(data.profile.age); // profileが無いので落ちる
}
```

**解決**: オプショナルチェーンで回避。

```javascript
console.log(data.profile?.age ?? "未設定");
```

### 2. `ReferenceError: XXX is not defined`

変数名や関数名のタイプミス、または `const` 宣言忘れです。

**解決**: スペルチェックと宣言の有無を確認。GASエディタの自動補完を活用すると減ります。

### 3. `Exception: Service Spreadsheets failed`

スプレッドシート側の同時編集や、シート名の変更で起きます。

```javascript
const sheet = SpreadsheetApp.getActive().getSheetByName("売上");
if (!sheet) throw new Error("シートが見つかりません");
```

**解決**: シート取得直後にnullチェックを入れる。

### 4. `Exception: Authorization is required`

権限が未承認です。初回実行で必ず出ます。

**解決**: 手動実行で一度承認を通します。自動実行だけでは承認ダイアログが出ないので注意。

### 5. `Exception: Service invoked too many times`

1日あたりのAPI呼び出し上限超過。メール送信なら100通/日など。

**解決**: `Utilities.sleep(1000)` で間隔を空けるか、処理を分割。

### 6. `Exception: Script took too long`

実行時間の上限（無料枠6分）を超えた場合に発生します。

```javascript
function heavyTask() {
  const data = fetchHugeData();
  data.forEach(row => processRow(row)); // 10万件あると死ぬ
}
```

**解決**: バッチ分割＋トリガー再起動。

```javascript
function chunkedRun() {
  const startRow = getSavedIndex();
  const batch = data.slice(startRow, startRow + 1000);
  batch.forEach(row => processRow(row));
  saveIndex(startRow + 1000);
}
```

### 7. `SyntaxError: Unexpected token`

カンマ忘れ、括弧の閉じ忘れなど構文ミス。

**解決**: エディタの赤波線をたどって該当行を修正。私は初期、`;` の抜けで2時間溶かしました。

### 8. `Exception: Range not found`

`getRange("A1:Z")` のような無効な範囲指定で発生。

**解決**: 明示的に数値指定。

```javascript
sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
```

### 9. `TypeError: XXX.map is not a function`

配列だと思った変数が配列じゃない典型パターン。

**解決**: 配列化を挟む。

```javascript
const arr = Array.isArray(result) ? result : [result];
arr.map(item => item.name);
```

### 10. `Exception: Rate Limit Exceeded`

外部APIコール（UrlFetchAppなど）での連打エラー。

**解決**: 指数バックオフ（失敗時に待機時間を倍々にする）で再試行。

```javascript
function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try { return UrlFetchApp.fetch(url); }
    catch (e) { Utilities.sleep(1000 * Math.pow(2, i)); }
  }
}
```

## GASエラー対処のメリット

エラーと仲良くなると、次のような実感が得られます。

- **再利用可能なコード**が手元に溜まる（次の案件で即使える）
- **バグの原因推定が速く**なる（勘所がつく）
- **他人のコードもデバッグできる**ようになる（地味に評価される）

私の場合、エラー対処ノートを自分用Notionに貯めておいたら、3か月後には誰かに教えられるレベルになっていました。

## よくある失敗パターン

### 失敗1: エラーメッセージを読まずにググる

「エラーが出た」で検索するより、メッセージ全文をコピペする方が100倍速く解決します。

### 失敗2: 修正後にキャッシュで古いコードが動く

GASではたまに、保存したつもりのコードが反映されないことがあります。`Ctrl+S` で明示保存してから実行してください。

### 失敗3: ログを仕込まずに勘で直す

`console.log` を5か所に仕込めば、原因は必ず見つかります。感覚に頼ると無限に時間が溶けます。

## 発展例：自作エラーハンドラ

頻発する処理はtry-catchで囲み、失敗時にメール通知すると運用が楽になります。

```javascript
function safeRun(fn) {
  try { fn(); }
  catch (e) {
    GmailApp.sendEmail("me@example.com", "GASエラー", e.message);
  }
}
```

## 独学で限界を感じたら

エラー対処はパターン認識の世界です。独学で粘るのも尊いですが、**体系的な学習**で基礎が固まると、未知のエラーにも勘が働くようになります。

オンラインのプログラミングスクールでは、現役エンジニアにエラーを直接相談できるサポートが付いていることも多く、無料カウンセリングで自分の学習戦略を見直すだけでも得るものがあります。

## まとめ

- エラーメッセージは全文読む
- `console.log` でまず状態を見える化
- 10選のうち6つは型チェックで防げる
- 自作エラーハンドラで運用品質が上がる

エラーは敵ではなく、コードが教えてくれるヒントです。次のエラーに出会ったら、ぜひこの記事に戻ってきてください。

関連記事:
- [GAS入門｜5分で書ける最初の1行コード徹底解説](/blog/gas-beginner-5min/)
- [GASトリガー設定完全ガイド](/blog/gas-trigger-setup/)
- [GASでできること10選](/blog/gas-can-do-10-things/)
