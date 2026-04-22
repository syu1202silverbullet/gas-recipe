---
title: "スプシ重複行を自動削除するGAS完全版コード"
description: "スプレッドシートに溜まった重複行をGASで自動削除する方法を完全解説。看護師副業ママが実案件で使ったコードをそのまま公開します。"
pubDate: "2026-04-26T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas", "spreadsheet", "data-cleaning"]
tagNames: ["GAS", "スプレッドシート", "データ整理"]
readingTime: 9
---
こんにちは、看護師のみっちゃんです。今日は副業先のクライアントから一番多い相談「スプシに重複行が増えすぎて見づらい」を解決するGASコードを紹介します。

## こんな悩みありませんか？

- フォーム回答やCSVインポートで重複行が混ざって困っている
- 手動で削除しているけど、件数が多くて半日かかる
- 「重複の削除」メニューだと条件を細かく指定できない
- 夜勤明けの30分でも処理を回せる「ほったらかし」にしたい

私も最初のGAS案件で、5000行のリードリストから重複を消す作業を頼まれました。手作業では無理だと判断してGASで組んだら、15秒で終わって時給換算が跳ね上がった経験があります。

## 重複削除の全体像

GASでの重複削除は、基本的に以下の流れです。

1. シートのデータを`getValues`で配列として取得
2. 「重複判定のキー」を決める（1列だけ？複数列の組み合わせ？）
3. `Set`や`Map`で重複をフィルタ
4. `clear`してから`setValues`で書き戻す

スプレッドシート標準の「重複を削除」機能と違って、GASなら「メールアドレスだけで判定するが、最新の更新日を残す」といった条件が自由に組めます。

## 完全版コード

### 基本版: 特定列で重複判定

メールアドレス（1列目）が同じ行を重複とみなして削除します。

```javascript
function dedupeByColumn() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const header = data.shift();

  const seen = new Set();
  const unique = [];

  for (const row of data) {
    const key = row[0];
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  }

  sheet.clearContents();
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  if (unique.length > 0) {
    sheet.getRange(2, 1, unique.length, unique[0].length).setValues(unique);
  }
}
```

`Set`は重複を自動で弾いてくれるJavaScriptのデータ構造で、これを使うと`includes`でループするより圧倒的に速くなります。

### 応用版: 複数列で重複判定+最新行を残す

「名前+メール」が同じなら重複とみなし、その中で「更新日が最も新しい行だけ残す」ケース。実際の案件で一番多いパターンです。

```javascript
function dedupeByMultiColumns() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const header = data.shift();

  // 列インデックス(0始まり)
  const NAME_COL = 0;
  const EMAIL_COL = 1;
  const UPDATED_COL = 3;

  const map = new Map();
  for (const row of data) {
    const key = `${row[NAME_COL]}__${row[EMAIL_COL]}`;
    const current = map.get(key);
    if (!current || new Date(row[UPDATED_COL]) > new Date(current[UPDATED_COL])) {
      map.set(key, row);
    }
  }

  const unique = Array.from(map.values());

  sheet.clearContents();
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  if (unique.length > 0) {
    sheet.getRange(2, 1, unique.length, unique[0].length).setValues(unique);
  }
}
```

## 押さえておきたい3つのポイント

### ポイント1: キーの作り方で精度が決まる

複数列を結合する時は、区切り文字を工夫します。単純に`+`で繋ぐと「山田+太郎」と「山+田太郎」が同一判定されてしまうからです。

```javascript
const key = `${row[0]}__${row[1]}__${row[2]}`;
```

私はアンダースコア2つ`__`を愛用しています。人名やメアドに出てこない記号を選ぶのがコツです。

### ポイント2: 元データは必ずバックアップ

`clearContents`は取り返しがつきません。本番シートで実行する前には、必ずコピーを取っておきましょう。

```javascript
function backupBeforeDedupe() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const source = ss.getActiveSheet();
  const backupName = source.getName() + '_backup_' +
    Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmm');
  source.copyTo(ss).setName(backupName);
}
```

看護の世界でもダブルチェックは鉄則。コードでも「消す前にコピー」を習慣にしています。

### ポイント3: 大量データはSetでO(1)検索

行数が1万を超えると、`includes`や`indexOf`でのループはどんどん遅くなります。`Set`や`Map`は検索が高速なので、規模が大きいほど差が出ます。

## 応用:トリガーで毎朝自動実行

フォーム回答が溜まるシートなら、時間ベースのトリガーで毎朝自動的に重複を消せます。

```javascript
function setupDailyDedupe() {
  ScriptApp.newTrigger('dedupeByColumn')
    .timeBased()
    .atHour(5)
    .everyDays(1)
    .create();
}
```

私は朝5時に実行するようにしていて、夜勤明けに帰宅した時にはもう綺麗になっているのが嬉しいポイントです。

## まとめ

- `Set`/`Map`で重複判定するのが一番速くて読みやすい
- 複数列キーは区切り文字に工夫を
- 本番前のバックアップは必須
- トリガーと組み合わせれば完全自動化

重複削除は、クライアントから見れば魔法のように見える処理です。でも中身はとてもシンプル。看護師の合間時間でも十分習得できるので、ぜひチャレンジしてみてください。

## 関連記事

- [GAS setValuesで1000行を一括書き込む高速化テクニック](/blog/gas-sheet-setvalues-bulk/)
- [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)
- [フリーランス請求書をGASで毎月自動発行する仕組み](/blog/gas-freelance-invoice/)
