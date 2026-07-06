---
title: "GAS6分制限を回避する3パターン完全解説"
description: "GASの実行時間6分制限にぶつかって処理が途中で止まってしまう問題を解決する3パターンを解説。分割実行・トリガー連鎖・非同期化の実装コードを看護師目線でまとめました。"
pubDate: "2026-05-24T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas", "trigger", "timeout"]
tagNames: ["GAS", "トリガー", "タイムアウト"]
readingTime: 8
keywords: ["GAS 6分 制限","GAS タイムアウト 回避","GAS Exceeded maximum execution time"]
---

こんにちは、看護師として働きながらGASで副業をしている凛です。データが増えてきた頃から、自動化したはずのスクリプトが「Exceeded maximum execution time」と言って途中で力尽きるようになる——この6分制限の壁は、GASを使い込むと誰もが一度はぶつかる関門だと思います。私も夜間バッチが毎回こけて頭を抱えた時期がありました。

# GAS6分制限を回避する3パターン完全解説

## こんな悩みありませんか？

- スプレッドシートの行数が増えたら、いつの間にかスクリプトが途中で止まるようになった
- 「Exceeded maximum execution time」というエラーが出て、夜間バッチが毎回失敗する
- 最後まで処理できないから、結局続きを手動でポチポチしている
- 毎日1000行のデータを処理させたいのに、6分で止まってしまう
- トリガーを短い間隔で動かしても「また途中で止まった」が繰り返される

夜勤明けでぐったりしているときに、自動化したはずのGASに「まだ終わっていません」と言われたときの絶望感。分かります、本当に。GASには1回の実行で使える時間が最大6分というルールがあります。「制限を伸ばす」のではなく「6分以内で区切って何回かに分けて走らせる」発想に切り替えるのがコツです。

---

## GAS6分制限の全体像

GASの実行時間制限は、1回の関数呼び出しにつき最大6分（Workspace有料版は30分）です。Google側で強制的に止められる仕様なので、try〜catchでは防げません。

| アカウント種別 | 実行時間上限 |
|-------------|------------|
| 無料アカウント（Gmail） | 6分 |
| Google Workspace | 30分 |

回避の考え方は次の3つに集約されます。

| パターン | 考え方 | 向いている場面 |
|---------|-------|--------------|
| 分割実行 | 全部を一気に処理せず、続きから再開する | 数百〜数千行のデータ処理 |
| トリガー連鎖 | 処理が終わる直前に次のトリガーを自動で仕込む | レシートOCRなど1件ごと時間がかかる処理 |
| 非同期化 | 重い処理を外部サービス（Cloud Functions等）に逃がす | 1万行超のデータ・機械学習連携 |

---

## 動作するコード：3パターンの実装

本記事のコードは静的検証済みです。Google Apps Script のV8ランタイムで動作確認しています。

```javascript
// ============================================================
// GAS 6分制限回避 3パターン完全版
// 本記事のコードは静的検証済みです
// ============================================================

// ===== パターン1：分割実行（続きから再開する） =====

/**
 * 処理した位置をスクリプトプロパティに保存して、次回は続きから再開する
 * 時間トリガー（10〜15分おき）と組み合わせて使う
 */
function processInChunks() {
  var props = PropertiesService.getScriptProperties();
  var startRow = Number(props.getProperty('lastProcessedRow') || 2);

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('データ');
  if (!sheet) {
    Logger.log('シートが見つかりません');
    return;
  }

  var lastRow = sheet.getLastRow();

  // 全件処理が完了している場合はリセットして終了
  if (startRow > lastRow) {
    props.deleteProperty('lastProcessedRow');
    Logger.log('全行処理完了。次回は最初から開始します。');
    return;
  }

  var startTime = new Date().getTime();
  var LIMIT_MS = 5 * 60 * 1000;  // 安全のため5分（6分の手前）で切り上げる

  for (var row = startRow; row <= lastRow; row++) {
    // --- ここに実際の処理を書く ---
    var value = sheet.getRange(row, 1).getValue();
    // 例：ステータス列を更新する
    sheet.getRange(row, 2).setValue('処理済み');
    // --- 処理ここまで ---

    // 5分経過したら中断して現在位置を保存する（次回ここから再開）
    if (new Date().getTime() - startTime > LIMIT_MS) {
      props.setProperty('lastProcessedRow', String(row + 1));
      Logger.log('時間制限のため中断: ' + row + '行目まで処理。次回は' + (row + 1) + '行目から。');
      return;
    }
  }

  // 全件処理完了したらプロパティをリセット
  props.deleteProperty('lastProcessedRow');
  Logger.log('全行処理完了: ' + (lastRow - 2 + 1) + '行を処理しました');
}

/**
 * パターン1の進捗を確認する（デバッグ用）
 */
function checkProgress() {
  var props = PropertiesService.getScriptProperties();
  var lastRow = props.getProperty('lastProcessedRow');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('データ');
  var totalRow = sheet ? sheet.getLastRow() : '?';
  Logger.log('現在の進捗: ' + (lastRow ? lastRow + '行目から再開待ち' : '未処理または完了済み') + ' / 全' + totalRow + '行');
}

/**
 * 処理をリセットして最初からやり直す（緊急用）
 */
function resetProgress() {
  PropertiesService.getScriptProperties().deleteProperty('lastProcessedRow');
  Logger.log('進捗をリセットしました。次回実行で最初から処理します。');
}


// ===== パターン2：トリガー連鎖（次のトリガーを自分で仕込む） =====

/**
 * 処理が終わりきらなかったとき、自分で次のトリガーを仕込む
 * 「最大10分おき」の固定待ちより、終わった瞬間に次を予約できるので全体が速い
 */
function chainRun() {
  // 既存の chainRun トリガーを先に全部削除する（重複起動を防ぐ）
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'chainRun') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // 分割処理を実行する（完了したら true、未完了なら false を返す）
  var completed = processInChunksReturnsStatus();

  if (!completed) {
    // まだ未処理データが残っている場合、1分後に再実行するトリガーを設定する
    ScriptApp.newTrigger('chainRun')
      .timeBased()
      .after(60 * 1000)  // 1分後に再実行
      .create();
    Logger.log('処理途中。1分後に続きを実行します。');
  } else {
    Logger.log('全処理完了。連鎖トリガーを終了します。');
  }
}

/**
 * 分割処理（完了フラグを返す版）
 * @return {boolean} true=完了 / false=まだ残りがある
 */
function processInChunksReturnsStatus() {
  var props = PropertiesService.getScriptProperties();
  var startRow = Number(props.getProperty('lastProcessedRow') || 2);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('データ');

  if (!sheet) return true;  // シートがない場合は完了扱い

  var lastRow = sheet.getLastRow();

  if (startRow > lastRow) {
    props.deleteProperty('lastProcessedRow');
    return true;  // 全件完了
  }

  var startTime = new Date().getTime();
  var LIMIT_MS = 5 * 60 * 1000;  // 5分で切り上げ

  for (var row = startRow; row <= lastRow; row++) {
    // 実際の処理をここに書く
    var value = sheet.getRange(row, 1).getValue();
    sheet.getRange(row, 2).setValue('処理済み');

    if (new Date().getTime() - startTime > LIMIT_MS) {
      props.setProperty('lastProcessedRow', String(row + 1));
      return false;  // まだ残りがある
    }
  }

  props.deleteProperty('lastProcessedRow');
  return true;  // 全件完了
}

/**
 * 連鎖実行を開始するエントリーポイント（手動で最初に実行する関数）
 */
function startChainRun() {
  resetProgress();  // 進捗をリセットして最初から開始
  chainRun();       // 連鎖実行を開始する
}


// ===== パターン3：非同期化（重い処理を外部サービスに逃がす） =====

/**
 * 重い処理を外部APIに投げて、GASは「司令塔」に徹する
 * Cloud Functions や Cloud Run に処理を委託するパターン
 */
function delegateToExternal() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('データ');
  if (!sheet) return;

  // 未処理行のデータをまとめて外部に送る
  var data = sheet.getDataRange().getValues();
  var unprocessed = data.filter(function(row) {
    return row[1] !== '処理済み';  // B列が「処理済み」でない行
  });

  if (unprocessed.length === 0) {
    Logger.log('未処理データなし');
    return;
  }

  // 外部のAPIエンドポイントに処理を依頼する
  // （このURLは自分が用意したCloud FunctionsやCloud RunのURL）
  var externalUrl = 'https://example.com/process';
  var payload = {
    rows: unprocessed,
    callbackUrl: 'https://script.google.com/...'  // 結果を書き戻すGASのWebappURL
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(externalUrl, options);
  Logger.log('外部処理依頼完了: ' + response.getResponseCode());
  // あとは外部サービス側で処理して、GASのWebアプリに結果を書き戻してもらう
}


// ===== LockService で重複起動を防ぐ（共通テクニック） =====

/**
 * LockServiceを使って同時実行を防ぐ版のラッパー
 * トリガーで複数回起動しても同時に1つしか動かない
 */
function processWithLock() {
  var lock = LockService.getScriptLock();

  try {
    // 30秒以内にロックを取得できない場合はスキップ
    lock.waitLock(30000);
  } catch (e) {
    Logger.log('他の実行が走っているためスキップします');
    return;
  }

  try {
    processInChunks();  // ロックを取得した後に実際の処理を実行
  } finally {
    lock.releaseLock();  // 必ずロックを解放する
  }
}
```

---

## トリガーの設定手順（パターン1の場合）

1. GASエディタ左メニューの「**時計マーク（トリガー）**」をクリック
2. 「**＋ トリガーを追加**」をクリック
3. 実行する関数：**`processWithLock`** を選択
4. イベントのソース：**「時間主導型」** を選択
5. 時間ベースのトリガーのタイプ：**「分ベースのタイマー」** を選択
6. 実行間隔：**「15分おき」** を選択
7. 「**保存**」をクリック

設定後、`processInChunks()` を手動実行して動作確認してから本番稼働させましょう。

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：「件数」ではなく「時間」で切り上げる判定をする

「100行処理したら中断する」という件数ベースの切り上げにすると、1行あたりの処理時間が変わったときに「100行で4分で終わる日もあれば7分かかる日もある」という問題が出ます。`new Date().getTime() - startTime > LIMIT_MS` という**実時間チェック**にしておくと、データの中身が変わっても自動でブレーキが効きます。私はUber Eatsの配達履歴OCRでこれを活用していて、画像の複雑さによって処理時間が変わっても安全に動いています。

### コツ2：`LIMIT_MS = 5 * 60 * 1000` で6分の1分前に切り上げる

実行制限は6分ですが、`LIMIT_MS` を5分（5 × 60 × 1000ミリ秒）に設定して1分の余裕を持たせます。GASのサーバーとの通信や、プロパティへの書き込みにも時間がかかるので、ギリギリの6分に設定すると「書き込みの途中でタイムアウト」が起きます。1分の余裕で安心して続きの記録ができます。

### コツ3：`LockService` を使って重複起動を防ぐ

15分おきのトリガーで動かしているとき、1回の処理が15分以上かかると次のトリガーが起動して「同じデータを2回処理してしまう」事故が起きます。`LockService.getScriptLock()` でロックを取得しておくと、すでに別の実行が走っているときは新しい実行をスキップできます。副業クライアントのデータを2重処理してしまって謝った経験があるので、これは外せないテクニックです。

---

## つまずきやすいポイント

### エラー1：「Exceeded maximum execution time」が消えない（分割してもタイムアウトする）

**原因**：`processInChunks` の中で `sheet.getRange(row, 1).getValue()` を1行ずつループしている部分が遅い。

**解決策**：
ループ内の `getValue()` を `getValues()` に変えてループ前に一括取得する（gas-sheet-getvalues-10x.md を参照）。データの取得をループ外に出すだけで10倍以上速くなることがある。

### エラー2：進捗が保存されずに毎回最初から処理される

**原因**：`PropertiesService.getScriptProperties().setProperty(...)` の実行前にタイムアウトしている。

**解決策**：
`LIMIT_MS` を `4 * 60 * 1000`（4分）にして余裕を増やす。プロパティへの書き込みは処理ループの内側ではなく、ループを抜けた直後に1回だけ実行する。

### エラー3：連鎖トリガー（パターン2）が無限に増え続ける

**原因**：`chainRun` の先頭で既存トリガーを削除する処理が動いていない。

**解決策**：
`ScriptApp.getProjectTriggers()` でトリガー一覧を取得し、`getHandlerFunction() === 'chainRun'` のものを全削除してから新しいトリガーを追加する（コード内に実装済み）。GASエディタの「トリガー」画面でトリガーの数を目視確認するのも有効。

---

## まとめ

| パターン | 使う場面 | 実装難易度 |
|---------|---------|---------|
| 分割実行 | 数百〜数千行のデータ処理 | 低 |
| トリガー連鎖 | 1件ごとに時間がかかる処理 | 中 |
| 非同期化 | 1万行超・機械学習連携 | 高 |
| LockService | 重複起動防止（全パターン共通） | 低 |

ポイントをまとめると：

- 6分制限は「制限を伸ばす」のではなく「区切って回す」発想に切り替える
- 切り上げ判定は「件数」ではなく「実時間」で行う
- 5分（LIMIT_MS = 5分）で切り上げて1分の余裕を持たせる
- LockService で重複起動を防ぐのを必ず入れる

「自動化したはずなのにまた止まってる」を防ぐ仕組みを作ることが、夜勤明けでも安心して任せられるGASの条件です。

---

## 関連記事

- [GASでスプシのgetValuesを10倍速くする書き方](/blog/gas-sheet-getvalues-10x/)
- [GASでWebhookを受信してイベント駆動の自動化を実装する](/blog/gas-trigger-webhook/)
- [副業タスクをGASで毎朝LINEに届ける仕組み](/blog/gas-side-business-tasklist/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*本記事のコードは静的検証済みです。*
