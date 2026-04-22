---
title: "GASよく出るエラー10選と解決コード集｜TypeError・Quota・権限"
description: "GASでよく遭遇する10種類のエラー（TypeError・Exceeded・認証・Quota超過など）の原因と具体的な解決コードを網羅。新規コードを書く前にブックマーク推奨の一覧です。"
pubDate: "2026-04-25T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas", "error", "troubleshooting"]
tagNames: ["GAS", "エラー", "トラブル解決"]
readingTime: 7
---
GASで開発していると必ず遭遇する「赤い文字のエラー」。本記事では、私が看護師の副業でGASを使い始めてからの1年で実際に遭遇した**ベスト10のエラー**と、その解決方法をまとめました。

「何回も検索するのが面倒」という方は、ぜひブックマークしてください。

## エラー1: TypeError: Cannot read properties of null

最頻出エラー。原因は「**存在しないセル・シートを参照している**」。

```javascript
// NG
const sheet = ss.getSheetByName('存在しないシート');
sheet.getRange('A1').getValue();  // ← ここでエラー

// OK
const sheet = ss.getSheetByName('データ');
if (!sheet) {
  Logger.log('シートが見つかりません');
  return;
}
sheet.getRange('A1').getValue();
```

**null チェック**を習慣に。

## エラー2: Exceeded maximum execution time

**6分制限**に引っかかるエラー。

```javascript
// NG: 10000行を一気に処理
for (let i = 0; i < 10000; i++) {
  processRow(i);
}

// OK: バッチ分割 + PropertiesServiceで進捗保存
const props = PropertiesService.getScriptProperties();
const start = Number(props.getProperty('lastIndex') || 0);
for (let i = start; i < start + 1000; i++) {
  processRow(i);
}
props.setProperty('lastIndex', String(start + 1000));
```

1回1000件ずつ処理して次回に続きを。

## エラー3: You do not have permission to call...

初回実行時に必ず出る権限エラー。

**解決**: メニューから「実行」をクリック → 権限確認ダイアログで「許可」。1回通せば以降は出ません。

## エラー4: Quota exceeded

Gmail送信・URL取得・カレンダー操作などには**1日の上限**があります（無料枠：1日100通程度）。

```javascript
// NG: ループで300通送信
for (const email of emails) {
  GmailApp.sendEmail(email, subject, body);  // 途中で停止
}

// OK: 上限チェック＋分割
const remaining = MailApp.getRemainingDailyQuota();
const batch = emails.slice(0, remaining);
for (const email of batch) {
  GmailApp.sendEmail(email, subject, body);
}
```

## エラー5: Service Spreadsheets failed while accessing document

**スプレッドシートとGASが紐付いていない**、または**他人の閲覧専用シート**を編集しようとした場合に発生。

**解決**: 自分が編集権限を持つファイルか確認。コンテナバインドのスクリプトか確認。

## エラー6: Array index out of bounds

```javascript
// NG
const row = data[10][5];  // 行が11個未満だとエラー

// OK
if (data.length > 10 && data[10].length > 5) {
  const row = data[10][5];
}
```

空行・欠損データに備えてチェック。

## エラー7: Invalid argument: url

`UrlFetchApp.fetch()` で URL が空・不正な場合。

```javascript
// OK
const url = 'https://example.com/api';
if (!url || !url.startsWith('http')) {
  throw new Error('無効なURL');
}
const response = UrlFetchApp.fetch(url);
```

## エラー8: The script completed but did not return anything

`doGet` / `doPost`（Webアプリ）で `return` を書き忘れ。

```javascript
// NG
function doGet(e) {
  Logger.log('Hello');
}

// OK
function doGet(e) {
  return ContentService.createTextOutput('Hello');
}
```

## エラー9: Too many triggers for this user

1ユーザーあたり**20個まで**のトリガー制限。

**解決**: 不要なトリガーを削除。

```javascript
function deleteAllTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
}
```

## エラー10: TypeError: X is not a function

よくあるのが**タイポ**と**スコープミス**。

```javascript
// NG
const range = sheet.getRage('A1');  // getRage（typo）

// OK
const range = sheet.getRange('A1');
```

エディタの補完機能（Ctrl+Space）を活用するとタイポが減ります。

## ありがちなトラブルシューティングの流れ

1. エラーの**1行目**を読む（何が原因か大抵書いてある）
2. **Logger.log** で処理の途中経過を出力して、どこで止まっているか特定
3. コードを**10行ずつコメントアウト**して、どの範囲がおかしいか絞り込む
4. 公式ドキュメントで該当メソッドのスペルを確認

これで8割のエラーは自己解決できます。

## それでも詰まった時

GASの場合、「どう書けば意図通り動くのか」を、自分の頭の中だけで組み立てるのが意外と難しい分野です。独学で何時間も悩むくらいなら、サポート付きの学習環境で短期集中する方が結果的に早いケースも。

- [侍エンジニア]：専任メンター付き、オーダーメイドカリキュラム
- [テックアカデミー]：短期集中、講師のSlackサポート
- Udemyの「GAS完全マスター」：セール時1,500円程度

※リンクは順次更新予定。

## まとめ

GASのエラーは、**パターンが限られている**のが救いです。本記事の10個を押さえておけば、8〜9割のエラーは3分以内に解決できます。

困ったらこのページをブックマークして、検索窓代わりに使ってください。

関連記事: [GASトリガー設定完全ガイド](/blog/gas-trigger-setup/)
