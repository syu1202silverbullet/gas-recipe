---
title: "毎朝ToDoをLINEに届けるGASリマインダー"
description: "スプレッドシートで管理したToDoを、毎朝LINEに自動送信するGASの作り方。期限つきタスク・毎週の繰り返し・繰り越し回数の表示まで対応したコードをコピペで紹介します。溜まったタスクを見える化する運用のコツも解説。"
pubDate: "2026-05-17T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas","line","reminder","morning"]
tagNames: ["GAS","LINE","リマインダー","朝活"]
readingTime: 12
---

朝の家事、子どもの支度、出勤準備。バタバタしているうちに、今日やるはずだったことが頭から抜ける。職場に着いてから「あ、あれ出すの忘れた」と気づく——これを何度も繰り返していました。

対策としてToDoアプリをいくつも試しましたが、**アプリを開かないと意味がない**という当たり前のことに気づきました。だから、開かなくても届く形にしました。毎朝、LINEに今日のぶんだけ流れてきます。

この記事では、その仕組みを作ります。単に一覧を送るだけでなく、**期限つき・毎週の繰り返し・何日繰り越したか**まで面倒を見る形にしました。

## 用意するシート

シート名は `ToDo`。1行目に見出しを置きます。

| A：やること | B：期限 | C：繰り返し | D：状態 | E：繰越回数 |
|---|---|---|---|---|
| 保育園の提出書類 | 2026/05/18 | | | 0 |
| 燃えるゴミを出す | | 月,木 | | 0 |
| 請求書を送る | 2026/05/20 | | | 0 |
| 資源ゴミ | | 火 | | 0 |
| face-to-faceの面談準備 | 2026/05/17 | | 済 | 2 |

- **B：期限**が今日以前なら送ります（未来の予定はまだ送らない）
- **C：繰り返し**に曜日を書くと、その曜日に毎週送ります
- **D：状態**が「済」の行は送りません
- **E：繰越回数**は自動で増えます（放置しているタスクが一目で分かる）

## コード全文

```javascript
// ===== 設定 =====
const SS_ID      = 'スプレッドシートのID';
const SHEET_NAME = 'ToDo';
const TIMEZONE   = 'Asia/Tokyo';
const WEEK       = ['日', '月', '火', '水', '木', '金', '土'];

/** 毎朝トリガーで実行する */
function sendDailyTodo() {
  const sheet  = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const today  = new Date();
  const todayLabel = Utilities.formatDate(today, TIMEZONE, 'M月d日') + '（' + WEEK[today.getDay()] + '）';

  const dueToday = [];   // 今日やること
  const overdue  = [];   // 期限を過ぎているもの

  for (let i = 1; i < values.length; i++) {
    const [task, limit, repeat, status, carried] = values[i];
    if (!task || status === '済') continue;

    // ① 曜日の繰り返し
    if (repeat && String(repeat).indexOf(WEEK[today.getDay()]) !== -1) {
      dueToday.push('・' + task);
      continue;
    }

    // ② 期限つき
    if (limit) {
      const due = new Date(limit);
      if (isNaN(due.getTime())) continue;
      const diffDays = Math.floor((stripTime_(today) - stripTime_(due)) / 86400000);

      if (diffDays === 0) {
        dueToday.push('・' + task + '（今日まで）');
      } else if (diffDays > 0) {
        overdue.push('・' + task + '（' + diffDays + '日超過）');
        // 繰り越し回数を1つ増やす
        sheet.getRange(i + 1, 5).setValue(Number(carried || 0) + 1);
      }
      continue;
    }

    // ③ 期限も繰り返しも無いものは、毎日そっと出す
    dueToday.push('・' + task);
  }

  const message = buildMessage_(todayLabel, dueToday, overdue);
  pushLine_(message);
  console.log('送信しました：今日 ' + dueToday.length + '件 / 超過 ' + overdue.length + '件');
}

/** 送る文章を組み立てる */
function buildMessage_(todayLabel, dueToday, overdue) {
  const lines = ['☀ おはようございます　' + todayLabel, ''];

  if (dueToday.length === 0 && overdue.length === 0) {
    lines.push('今日のタスクはありません。ゆっくりいきましょう。');
    return lines.join('\n');
  }
  if (dueToday.length > 0) {
    lines.push('✅ 今日やること（' + dueToday.length + '件）', dueToday.join('\n'), '');
  }
  if (overdue.length > 0) {
    lines.push('⚠ 期限を過ぎています（' + overdue.length + '件）', overdue.join('\n'), '');
  }
  lines.push('終わったらシートのD列に「済」と入れてください。');
  return lines.join('\n');
}

/** 時刻を落として日付だけにする */
function stripTime_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** LINEに送る */
function pushLine_(text) {
  const props  = PropertiesService.getScriptProperties();
  const token  = props.getProperty('LINE_TOKEN');
  const userId = props.getProperty('LINE_USER_ID');

  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ to: userId, messages: [{ type: 'text', text: text.slice(0, 4900) }] }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    console.log('送信エラー: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
}

/** 毎朝7時のトリガーを作る（1回だけ実行） */
function createTodoTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDailyTodo') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDailyTodo').timeBased().atHour(7).everyDays(1).create();
  console.log('毎朝7時台のトリガーを作成しました');
}
```

## 送信の準備（LINE側）

送信にはLINE Messaging APIを使います。かつて広く使われていた**LINE Notifyは2025年3月末で提供を終了**しているので、今から作る場合はこちらです。

1. [LINE Developers](https://developers.line.biz/ja/) でMessaging APIのチャネルを作る
2. **チャネルアクセストークン（長期）**を発行
3. 同じ画面の**あなたのユーザーID**を控える
4. QRコードから**自分でそのBotを友だち追加**
5. GASの「プロジェクトの設定（⚙）」→ スクリプトプロパティに `LINE_TOKEN` と `LINE_USER_ID` を登録

トークンは鍵なので、**コードに直接書かないでください**。

## 動かす手順

1. `SS_ID` を自分のシートIDに変える
2. `sendDailyTodo` を手動実行し、権限を許可する
3. LINEに届いたら `createTodoTrigger` を1回だけ実行

これで、毎朝7時台に自動で届くようになります。

## この設計にした理由

### 「済」を消さずに残す

終わったタスクは行ごと削除せず、D列に「済」と入れるだけにしています。**削除してしまうと、何をやったかの記録が消える**からです。月末に眺めると「今月こんなにやってたんだ」と分かって、地味に励みになります。

行が増えて重くなってきたら、月に一度「済」の行だけ別シートへ移せば十分です。

### 繰り越し回数を数える

期限を過ぎたタスクは、送るたびにE列の数字が増えていきます。この数字が5を超えたものは、だいたい**そもそもやらなくていいタスク**でした。

「終わらない」のではなく「本当は必要ない」。数字で見えると、思い切って消す決断ができます。

### 曜日の繰り返しはシンプルに

ゴミ出しのような予定は、C列に `月,木` と書くだけにしました。複雑な繰り返し（第2火曜など）に対応しようとすると設定が難しくなり、家族に「これ何？」と聞かれる仕組みになってしまいます。**自分以外も読める簡単さ**を優先しました。

## よくあるつまずき

### 届かない

まずGASの「実行数」画面を開いて、`sendDailyTodo` が実行され、失敗していないか確認します。実行はできているのに届かない場合は、**Botを友だち追加していない**か、`LINE_USER_ID` が違います。

### 期限が「今日まで」なのに送られない

B列が文字列として入っていると `new Date()` で読めないことがあります。セルの表示形式を「日付」にして入力し直してください。シートの左上のセル書式でも確認できます。

### 毎朝きっちり7時に来ない

GASの時間主導型トリガーは「7時〜8時のどこか」で動く仕様です。分単位の指定はできません。私は7時台で問題なかったので、そのまま使っています。

### 文字数が多すぎる

LINEのテキストは1通5,000文字までです。コードでは4,900文字で切っていますが、タスクが多すぎて切れる場合は、**そもそも減らすサイン**かもしれません。

## 応用：終わったタスクをLINEから「済」にする

返信Botの仕組みと組み合わせると、LINEで「済 保育園」と送るだけでシートに「済」を入れられます。

```javascript
function markDone_(keyword) {
  const sheet  = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] && String(values[i][0]).indexOf(keyword) !== -1 && values[i][3] !== '済') {
      sheet.getRange(i + 1, 4).setValue('済');
      return '「' + values[i][0] + '」を済にしました';
    }
  }
  return '「' + keyword + '」に一致するタスクが見つかりませんでした';
}
```

シートを開かなくても完了にできるので、通勤中でも処理できます。

## まとめ

- ToDoは**シートに書いて、朝にLINEで受け取る**のが続きやすい
- 期限つき・曜日の繰り返し・繰越回数の3つがあれば実用に足りる
- 終わったタスクは**消さずに「済」**。記録が残るほうが励みになる
- 繰越回数が増え続けるタスクは、**やらない決断**をするサイン
- LINE Notifyは終了済み。今から作るならMessaging API

朝の「あれ忘れた」が減るだけで、1日の始まりの気分がずいぶん変わります。まずは今抱えているタスクを5つ、シートに書くところからどうぞ。

## 関連記事

- [GASでLINEに毎朝「今日の予定・天気・タスク」を自動通知する仕組み](/blog/gas-line-morning-notification/)
- [GASで作るLINE返信Bot最小コード30行](/blog/gas-line-reply-bot/)
- [GASトリガー設定完全ガイド｜画像付き手順と失敗しないコツ2026](/blog/gas-trigger-setup/)

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。
