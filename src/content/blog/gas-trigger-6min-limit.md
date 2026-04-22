---
title: "GAS6分制限を回避する3パターン完全解説"
description: "GASの実行時間6分制限にぶつかって処理が途中で止まってしまう…そんなとき使える3つの回避パターンを、看護師の現場目線でやさしく整理しました。"
pubDate: "2026-05-18T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas", "trigger", "timeout"]
tagNames: ["GAS", "トリガー", "タイムアウト"]
mainKeyword: "GAS 6分 制限"
readingTime: 6
author: "凛"
---

# GAS6分制限を回避する3パターン完全解説

## こんな悩みありませんか？

- スプレッドシートの行数が増えたら、いつの間にかスクリプトが途中で止まるようになった
- 「Exceeded maximum execution time」というエラーが出て、夜間バッチが毎回失敗する
- 最後まで処理できないから、結局手動で続きをポチポチしている

夜勤明けでぐったりしている私が、自動化したはずのGASに「まだ終わってません」と言われたときの絶望感。わかります、ほんと。

GAS（Google Apps Script）には、1回の実行で使える時間が最大6分までというルールがあります。無料アカウントの場合この制限は変えられないので、「制限を伸ばす」のではなく「6分以内で区切って、何回かに分けて走らせる」発想に切り替えるのがコツです。

この記事では、現場で私が実際に使っている回避テクを3パターンに整理しました。

## GAS6分制限の全体像

GASの実行時間制限は、1回の関数呼び出しにつき6分（Workspace有料版は30分）と決まっています。Google側で強制的に止められる仕様なので、try〜catchでは防げません。

ざっくり言うと、回避の考え方は次の3つに集約されます。

1. **分割実行**：全部を一気に処理せず、毎回続きから再開する
2. **トリガー連鎖**：1回目が終わる直前に2回目のトリガーを自分でセットする
3. **非同期化**：重い処理を外部サービス（Cloud Functions など）に逃がす

どれを選ぶかは「データ量」「処理内容」「難易度」で変わります。看護師のトリアージと同じで、まず状態を見極めてから手を出すのが安全です。

## ポイント3つ：パターン別の使い分け

### パターン1：続きから再開する「分割実行」

一番わかりやすいのがこれ。処理した位置をスクリプトプロパティに保存しておいて、次回起動したときは続きから読み込むやり方です。

```javascript
function processInChunks() {
  const props = PropertiesService.getScriptProperties();
  const startRow = Number(props.getProperty('lastRow') || 2);
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();

  const startTime = new Date().getTime();
  const LIMIT_MS = 5 * 60 * 1000; // 5分で安全に切り上げ

  for (let row = startRow; row <= lastRow; row++) {
    // 1行ずつの処理
    doSomething(sheet.getRange(row, 1).getValue());

    // 5分経ったら中断して位置を保存
    if (new Date().getTime() - startTime > LIMIT_MS) {
      props.setProperty('lastRow', String(row + 1));
      return;
    }
  }
  // 全部終わったら位置をリセット
  props.deleteProperty('lastRow');
}
```

時間トリガー（例：10分おき）で回せば、放っておいても少しずつ進んでいきます。私はUber Eatsの配達履歴集計でこのやり方を使っていて、3000行くらいまでなら問題なく回っています。

### パターン2：自分で次のトリガーを仕込む「トリガー連鎖」

分割実行の発展系で、処理が終わりきらなかったときに「次は1分後に起こしてね」と自分でトリガーを追加するやり方です。

```javascript
function chainRun() {
  // 既存の同名トリガーを片付ける
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'chainRun') ScriptApp.deleteTrigger(t);
  });

  const done = processInChunks(); // 上のパターン1を改造して、完了時にtrueを返す形に

  if (!done) {
    ScriptApp.newTrigger('chainRun')
      .timeBased()
      .after(60 * 1000) // 1分後に再実行
      .create();
  }
}
```

「最大10分おき」みたいな固定間隔だと無駄な待ち時間が出ますが、連鎖方式なら終わった瞬間に次を予約できるので、全体の消化時間を短くできます。レシートOCRみたいに画像1枚ずつで時間がかかる処理と相性がいいです。

### パターン3：重い処理を外に逃がす「非同期化」

GASだけで無理やり戦うのをやめて、重い計算や大量データの整形は Cloud Functions や Cloud Run、外部APIに投げてしまうパターンです。GASは「司令塔」「受け取り役」に徹します。

```javascript
function delegateToExternal() {
  const payload = { rows: readRowsFromSheet() };
  UrlFetchApp.fetch('https://example.com/process', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
  // あとは外部側で処理して、結果をスプレッドシートに書き戻してもらう
}
```

初期設定のハードルは上がりますが、1万行を超えるようなデータや、機械学習を使った仕分けをやりたいときはこの方向が現実的です。

## 応用：3パターンをどう組み合わせるか

実務では「1本の処理で全部パターン1」みたいに潔く分かれないことが多いです。私がよくやる組み合わせをひとつ紹介します。

- **朝のGmail処理（軽い）**：パターン1（分割実行）で十分
- **昼のレシートOCR（重め）**：パターン2（トリガー連鎖）
- **月末の全件集計（超重い）**：パターン3（外部委託）に一部だけ逃がす

大事なのは「時間で測って早めに切り上げる」という共通ルールです。処理件数ではなく実時間で判定するクセをつけておくと、データ量が急に増えても自動でブレーキが効きます。

また、LockServiceを併用すると、重複起動で同じ行を二度処理してしまう事故を防げるのでおすすめです。

## まとめ

- GASの6分制限は消せない。**区切って回す**発想に切り替える
- 手軽な順に：パターン1（分割）→パターン2（連鎖）→パターン3（外部化）
- 時間で測って早めに撤退、続きはスクリプトプロパティで記憶

夜勤明けの脳みそでも安全に動かせるのが、いい自動化の条件だと思っています。まずはパターン1から、明日の自分を助ける形で導入してみてくださいね。

## 関連記事

- [Webhook受信でGAS即時実行する設定方法](./gas-trigger-webhook)
- [副業タスクをGASで毎朝LINEに届ける仕組み](./gas-side-business-tasklist)
- [Uber Eats配達記録をMF会計CSV化するGAS](./gas-ubereats-csv-mf)

---

### この記事を書いた人：凛

都内で看護師をしながら、副業でWebエンジニア、夜勤の合間に副業でGASプログラミングをしています。「自分が楽になるための自動化」をモットーに、看護師目線でGASレシピを発信中。難しいコードより、明日の自分が助かる仕組みが好きです。
