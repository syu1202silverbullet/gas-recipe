---
title: "スプレッドシートを毎朝自動で整える｜GASトリガーを使い倒す基本テクニック"
description: "毎朝の集計・月初のシート複製・古いデータの退避を、GASの時間主導型トリガーで自動化する方法をコピペコード付きで解説。トリガーの作り方と削除、タイムゾーンのずれ、実行時間6分の壁、同時実行のロックまで実務でつまずく所を全部まとめました。"
pubDate: "2026-04-19"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas", "spreadsheet", "trigger", "automation"]
tagNames: ["GAS", "スプレッドシート", "トリガー", "自動化"]
readingTime: 13
---

「朝いちばんにシートを開いて、前日分を集計して、色を消して、新しい行を足す」。この5分の作業を、私は半年くらい毎日やっていました。5分×20日で月100分。年にすると20時間です。

GASの**時間主導型トリガー**を1つ仕掛けたら、この作業は永久に自分の手から離れました。この記事では、実際に動いているコードを見せながら、トリガーの作り方とつまずきどころをまとめます。

## トリガーとは「時間が来たら自動で関数を呼ぶ仕掛け」

GASのトリガーは大きく2種類あります。

| 種類 | いつ動くか | 例 |
|---|---|---|
| **時間主導型** | 決めた時刻・間隔 | 毎朝9時、5分おき、毎月1日 |
| イベント型 | 操作をきっかけに | シートを開いた時、フォーム送信時、編集時 |

この記事で扱うのは前者です。時間主導型で選べる間隔は次のとおりです。

- 分ベース：1分・5分・10分・15分・30分おき
- 時間ベース：1・2・4・6・8・12時間おき
- 日ベース：毎日（時刻は「9時〜10時」のように**1時間の幅**で指定）
- 週ベース：曜日＋時刻
- 月ベース：日付＋時刻

**分単位の時刻指定はできません。**「毎朝9時ちょうど」ではなく「9時台のどこか」で動きます。ここは最初に知っておかないと「9:00に来ない！」と悩みます。

## 例1：前日データを集計して日次シートに追記する

売上ログのような明細シートから、前日分を集計して1行にまとめる処理です。

```javascript
const SS_ID = 'スプレッドシートのID';
const TIMEZONE = 'Asia/Tokyo';

/** 毎朝、前日分を集計して「日次集計」シートに1行足す */
function summarizeYesterday() {
  const ss  = SpreadsheetApp.openById(SS_ID);
  const log = ss.getSheetByName('明細');
  const out = ss.getSheetByName('日次集計');

  // 昨日の0時〜今日の0時の範囲を作る
  const today     = new Date();
  const start     = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const end       = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateLabel = Utilities.formatDate(start, TIMEZONE, 'yyyy/MM/dd');

  // 二重登録の防止：同じ日付がすでにあれば何もしない
  const existing = out.getRange(1, 1, Math.max(out.getLastRow(), 1), 1).getDisplayValues().flat();
  if (existing.indexOf(dateLabel) !== -1) {
    console.log(dateLabel + ' はすでに集計済みです');
    return;
  }

  // A列=日時、B列=商品、C列=金額 を想定
  const rows = log.getDataRange().getValues().slice(1);
  const target = rows.filter(function (r) {
    const d = r[0] instanceof Date ? r[0] : new Date(r[0]);
    return d >= start && d < end;
  });

  const total = target.reduce(function (sum, r) { return sum + (Number(r[2]) || 0); }, 0);
  out.appendRow([dateLabel, target.length, total]);
  console.log(dateLabel + '：' + target.length + '件 / 合計' + total + '円');
}
```

ポイントは**二重登録の防止**です。トリガーは何かの拍子に2回動くことがあります（手動実行と重なる、など）。「もう集計済みなら何もしない」を最初に入れておくと、数字が倍になる事故を防げます。

## 例2：月初にテンプレートシートを複製する

毎月1日、テンプレートから「2026-04」のような新しいシートを作ります。

```javascript
/** 毎月1日、テンプレートから当月シートを作る */
function createMonthlySheet() {
  const ss = SpreadsheetApp.openById(SS_ID);
  const template = ss.getSheetByName('テンプレート');
  const name = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM');

  if (ss.getSheetByName(name)) {
    console.log(name + ' はすでに存在します');
    return;
  }

  const copied = template.copyTo(ss).setName(name);
  ss.setActiveSheet(copied);
  ss.moveActiveSheet(1); // 先頭に移動して開いたらすぐ見えるように
  copied.getRange('A1').setValue(name + ' 実績');
  console.log(name + ' シートを作成しました');
}
```

`copyTo` で複製したシートは「テンプレートのコピー」という名前になるので、その場で `setName` します。

## 例3：古い行を「過去データ」へ退避する

明細が数千行になると、シートが重くなって開くのも遅くなります。90日より古い行を別シートへ移す処理です。

```javascript
/** 90日より古い明細を「過去データ」シートへ移す */
function archiveOldRows() {
  const ss   = SpreadsheetApp.openById(SS_ID);
  const log  = ss.getSheetByName('明細');
  const arch = ss.getSheetByName('過去データ') || ss.insertSheet('過去データ');

  const limit = new Date();
  limit.setDate(limit.getDate() - 90);

  const values = log.getDataRange().getValues();
  const header = values[0];
  const rows   = values.slice(1);

  const keep = [], move = [];
  rows.forEach(function (r) {
    const d = r[0] instanceof Date ? r[0] : new Date(r[0]);
    (isNaN(d.getTime()) || d >= limit ? keep : move).push(r);
  });

  if (move.length === 0) { console.log('退避対象なし'); return; }

  // 退避先に追記
  arch.getRange(arch.getLastRow() + 1, 1, move.length, move[0].length).setValues(move);

  // 明細を書き直す（1行ずつ削除するより圧倒的に速い）
  log.clearContents();
  const rewrite = [header].concat(keep);
  log.getRange(1, 1, rewrite.length, header.length).setValues(rewrite);

  console.log(move.length + '行を過去データへ退避しました');
}
```

行を消すとき `deleteRow` を1行ずつ呼ぶと、1000行で数分かかることもあります。**残す行だけを配列に集めて一気に書き直す**のが速さの秘訣です。

## トリガーの作り方（2通り）

### 画面から作る

1. Apps Scriptエディタ左メニューの**時計アイコン（トリガー）**をクリック
2. 右下の「トリガーを追加」
3. 実行する関数（例：`summarizeYesterday`）を選ぶ
4. イベントのソース＝**時間主導型**
5. 「日付ベースのタイマー」→「午前8時〜9時」などを選ぶ
6. **エラー通知設定を「今すぐ通知を受け取る」に変更**して保存

### コードから作る

同じことをコードでもできます。設定を人に渡すときはこちらが確実です。

```javascript
/** 一式のトリガーをまとめて作り直す（1回だけ実行） */
function setupTriggers() {
  // 同名関数の既存トリガーを消してから作る（重複防止）
  const targets = ['summarizeYesterday', 'createMonthlySheet', 'archiveOldRows'];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (targets.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('summarizeYesterday').timeBased().atHour(8).everyDays(1).create();
  ScriptApp.newTrigger('createMonthlySheet').timeBased().onMonthDay(1).atHour(1).create();
  ScriptApp.newTrigger('archiveOldRows').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(3).create();

  console.log('トリガーを3件作成しました');
}
```

**必ず「消してから作る」**でセットにしてください。作るだけのコードを何度か実行して、同じトリガーが5個並んでいた……というのはよくある失敗です（そのぶん処理も5回動きます）。

## つまずきポイント5つ

### 1. タイムゾーンがずれている

「9時に設定したのに深夜に動く」場合は、スクリプトのタイムゾーンが米国時間のままです。エディタの**「プロジェクトの設定（⚙）」→「タイムゾーン」**で「(GMT+09:00) 日本標準時 – 東京」を選んでください。

古い記事にある「ファイル→プロジェクトのプロパティ」は現在のエディタには存在しません（旧エディタの案内です）。

### 2. 実行時間6分の壁

GASの1回の実行は**最大6分**です（無料アカウントの場合）。数千行を1行ずつ処理していると簡単に超えます。

- `getValues()` でまとめて読み、配列で処理して `setValues()` でまとめて書く
- それでも足りなければ、1回の処理件数に上限を設けて続きは次回にする

この2つでほとんど解決します。

### 3. エラーに気づかない

トリガーは静かに失敗します。**エラー通知を「今すぐ受け取る」にしておく**のが最低条件です。加えて、処理の最後に `console.log` を必ず1行入れておくと、実行数（左メニューの「実行数」）で成功／失敗の履歴が追えます。

### 4. 同じ時間に2つ動いて衝突する

同じシートを触る処理が同時に走ると、書き込みが混ざることがあります。心配なときはロックを使います。

```javascript
function safeRun() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10 * 1000)) {   // 10秒待って取れなければ諦める
    console.log('他の処理が実行中のためスキップしました');
    return;
  }
  try {
    summarizeYesterday();
  } finally {
    lock.releaseLock();
  }
}
```

### 5. 手動実行では動くのにトリガーだと落ちる

多いのは `SpreadsheetApp.getActiveSpreadsheet()` を使っているケースです。トリガー実行時は「開いているシート」が存在しないため `null` になります。**トリガーで動かす関数では `openById()` を使う**のが鉄則です。

## どこから自動化するか

全部いっぺんに作ろうとすると挫折します。私がうまくいったのは、次の順番でした。

1. **毎日やっていて、失敗しても被害が小さい作業**（集計の転記など）
2. 慣れてきたら月次のテンプレ作成
3. 最後にデータの移動・削除を伴うもの（怖いので最後）

削除を伴う処理は、最初は「削除」ではなく「別シートにコピー」だけにして、数日ログを眺めてから本番に切り替えると安心です。

## まとめ

- 時間主導型トリガーは「毎日9時台」まで。**分単位の指定はできない**
- 二重実行に備えて、**すでに処理済みなら何もしない**を必ず入れる
- 大量データは `getValues` → 配列処理 → `setValues` でまとめて扱う
- トリガーはコードで「消してから作る」。エラー通知は必ずON
- トリガー実行の関数では `getActiveSpreadsheet()` を使わない

1つ作れば、あとは同じ型の使い回しです。毎朝の5分が消えると、その5分より大きいものが返ってきます。

## 関連記事

- [GASで毎月1日に月次シートを自動複製する仕組み](/blog/gas-monthly-sheet-duplicate/)
- [GAS setValuesで1000行を一括書き込みする高速化テクニック](/blog/gas-sheet-setvalues-bulk/)
- [GASよく出るエラー10選と解決コード集｜辞書代わりに使える完全版](/blog/gas-error-exception/)
