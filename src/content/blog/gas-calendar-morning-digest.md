---
title: "GASでGoogleカレンダーの今日の予定を毎朝メール通知する"
description: "GASでGoogleカレンダーから今日の予定を取得して朝メールで通知する方法を、現役ナースの凛が解説。トリガー設定でスマホを開く前に予定を把握できます。"
pubDate: "2026-06-06T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","gmail","mail","notification"]
tagNames: ["GAS","カレンダー","Gmail","メール","通知"]
readingTime: 8
keywords: ["GAS カレンダー メール通知","GAS 今日の予定 メール","Google Apps Script Calendar Gmail"]
---

こんにちは、夜勤明けのコーヒー片手にGASを書いている看護師の凛です。

この仕組みを作ろうと思い立ったのは、「朝、カレンダーアプリを開く前に今日の予定を知りたい」と感じたのがきっかけでした。アプリを開けば済む話ではあるんです。でも、アプリを開くとつい他の通知に気を取られて、気づけば数分溶けている。それなら、どうせ朝一番に見るメールへ「今日の予定」が勝手に届くようにすればいい。そう考えて、コーヒーを淹れてからGASエディタを開きました。

今日はその日の作業を、書いた順番のまま日記風にたどっていきます。読み終わる頃には、あなたのGmailにも毎朝「自分専用の予定ダイジェスト」が届くようになっているはずです。

## まずは道具の確認から

書き始める前に、CalendarAppでどんな操作ができるのかをざっと眺めました。今回使うのはこのあたりです。

| メソッド | 説明 |
|---|---|
| `CalendarApp.getDefaultCalendar()` | デフォルトカレンダーを取得 |
| `CalendarApp.getCalendarById(id)` | IDで特定カレンダーを取得 |
| `calendar.getEventsForDay(date)` | 指定日の予定一覧を取得 |
| `event.getTitle()` | 予定のタイトルを取得 |
| `event.getStartTime()` | 開始時刻を取得 |
| `event.getEndTime()` | 終了時刻を取得 |
| `event.isAllDayEvent()` | 終日イベントか判定 |
| `event.getDescription()` | 予定の説明文を取得 |

`getEventsForDay` に日付を渡せばその日の予定が配列で返ってくる。思ったよりシンプルで、これなら朝のメール化はすぐできそうだと感じました。

## 最初の版：今日の予定を1通のメールにする

手始めに書いたのが、デフォルトカレンダーの予定を取ってきて自分宛てにメールする版です。

```javascript
// 今日の予定をメールで送信するメイン関数
function sendDailyCalendarDigest() {
  const today = new Date();
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEventsForDay(today);

  const dateStr = Utilities.formatDate(today, 'Asia/Tokyo', 'M月d日(E)');
  const subject = '📅 ' + dateStr + 'の予定';

  // メール本文を組み立て
  let body = dateStr + 'の予定です。\n\n';

  if (events.length === 0) {
    body += '今日の予定はありません。\n';
  } else {
    body += '【本日の予定】\n';
    events.forEach(function(event) {
      if (event.isAllDayEvent()) {
        body += '• ' + event.getTitle() + '（終日）\n';
      } else {
        const start = Utilities.formatDate(event.getStartTime(), 'Asia/Tokyo', 'HH:mm');
        const end = Utilities.formatDate(event.getEndTime(), 'Asia/Tokyo', 'HH:mm');
        body += '• ' + start + '〜' + end + ' ' + event.getTitle() + '\n';
      }
      const desc = event.getDescription();
      if (desc) {
        body += '  ↳ ' + desc.split('\n')[0] + '\n'; // 説明文の1行目だけ
      }
    });
  }

  body += '\n--- GAS自動送信 ---';

  // 自分自身のGmailアドレスに送信
  const myEmail = Session.getActiveUser().getEmail();
  GmailApp.sendEmail(myEmail, subject, body);
  console.log('[sendDailyCalendarDigest] 送信完了 宛先:', myEmail, '予定数:', events.length);
}
```

書きながら最初に頭を悩ませたのが、終日イベントの扱いです。時間つきの予定と同じ書式で出すと、開始も終了も同じ時刻の妙な表示になってしまう。そこで `isAllDayEvent()` で判定して、終日のものは「（終日）」表記に分けました。

もうひとつのこだわりは宛先です。メールアドレスをコードに直書きせず、`Session.getActiveUser().getEmail()` で実行している本人のアドレスを動的に取っています。これならコードを誰かに共有しても、そのままその人宛てに届く形で動きます。説明文がある予定は1行目だけ添える、という小技も入れました。長文の説明が丸ごと貼り付くとメールが読みにくくなるためです。

## つまずき：仕事用カレンダーしか届かない

最初の版を動かしてみて気づいたのが、デフォルトカレンダーの予定しか載らないこと。仕事用と家族用でカレンダーを分けて運用している場合、朝のメールに家族側の予定が出てきません。片方だけの予定表では「今日の全体像」になりませんよね。

そこで、複数カレンダーをまとめて1通にする版に書き直しました。

```javascript
// 複数カレンダーの予定をまとめてメール送信
function sendMultiCalendarDigest() {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, 'Asia/Tokyo', 'M月d日(E)');

  // 対象カレンダーIDをスクリプトプロパティから取得（カンマ区切り）
  const calendarIdsStr = PropertiesService.getScriptProperties()
    .getProperty('CALENDAR_IDS');

  let calendarIds = [];
  if (calendarIdsStr) {
    calendarIds = calendarIdsStr.split(',').map(function(id) { return id.trim(); });
  } else {
    // 未設定の場合はデフォルトカレンダーのみ
    calendarIds = [CalendarApp.getDefaultCalendar().getId()];
  }

  let allEvents = [];
  calendarIds.forEach(function(calId) {
    try {
      const cal = CalendarApp.getCalendarById(calId);
      if (!cal) return;
      const events = cal.getEventsForDay(today);
      events.forEach(function(e) {
        allEvents.push({ event: e, calName: cal.getName() });
      });
    } catch (e) {
      console.error('[sendMultiCalendarDigest] カレンダー取得失敗:', calId, e.message);
    }
  });

  // 開始時刻でソート（終日イベントは先頭）
  allEvents.sort(function(a, b) {
    if (a.event.isAllDayEvent() && !b.event.isAllDayEvent()) return -1;
    if (!a.event.isAllDayEvent() && b.event.isAllDayEvent()) return 1;
    if (a.event.isAllDayEvent() && b.event.isAllDayEvent()) return 0;
    return a.event.getStartTime() - b.event.getStartTime();
  });

  const subject = '📅 ' + dateStr + 'の予定（' + allEvents.length + '件）';
  let body = dateStr + 'の予定一覧です。\n\n';

  if (allEvents.length === 0) {
    body += '今日の予定はありません。\n';
  } else {
    allEvents.forEach(function(item) {
      const e = item.event;
      if (e.isAllDayEvent()) {
        body += '• [' + item.calName + '] ' + e.getTitle() + '（終日）\n';
      } else {
        const start = Utilities.formatDate(e.getStartTime(), 'Asia/Tokyo', 'HH:mm');
        const end = Utilities.formatDate(e.getEndTime(), 'Asia/Tokyo', 'HH:mm');
        body += '• ' + start + '〜' + end + ' [' + item.calName + '] ' + e.getTitle() + '\n';
      }
    });
  }

  body += '\n--- GAS自動送信 ---';

  const myEmail = Session.getActiveUser().getEmail();
  GmailApp.sendEmail(myEmail, subject, body);
  console.log('[sendMultiCalendarDigest] 送信完了 予定数:', allEvents.length);
}
```

工夫した点をいくつか。カレンダーIDはスクリプトプロパティ `CALENDAR_IDS` にカンマ区切りで持たせて、コード本体は触らずに対象を増減できるようにしました。どれかのカレンダー取得に失敗しても、try-catchでログに残して残りの処理は続行します。全部の予定を1つの配列に集めたら、終日イベントを先頭に、あとは開始時刻順にソート。各行に `[カレンダー名]` を付けたので、どの予定がどこ由来かも一目で分かります。

件名に件数を入れたのは、あとから効いてきた小さな工夫でした。メール一覧を眺めた時点で「今日は詰まってるな」「今日はゆったりだな」が分かるんです。

### カレンダーIDはどこにある？

Googleカレンダーの設定から対象カレンダーを開き、「カレンダーの統合」にある**カレンダーID**をコピーします。複数まとめる場合は、スクリプトプロパティ `CALENDAR_IDS` にカンマ区切りで並べるだけです。

```
例: abc123@group.calendar.google.com,xyz789@group.calendar.google.com
```

## 仕上げ：毎朝7時に自動で届くようにする

最後の仕上げがトリガー設定です。ここまでできていれば、あとは一度だけこの関数を実行するだけ。

```javascript
// トリガーを設置するセットアップ関数（一度だけ実行）
function setupMorningTrigger() {
  // 既存の同名トリガーを削除してから再作成
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'sendDailyCalendarDigest') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('sendDailyCalendarDigest')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  console.log('[setupMorningTrigger] 毎朝7時のトリガーを設定しました');
}
```

`setupMorningTrigger` を一度手動実行すれば、以降は毎朝7時ごろに自動送信されます。既存の同名トリガーを消してから作り直す書き方なので、繰り返し実行しても二重送信にはなりません。複数カレンダー版を使う場合は、コード内の関数名を `sendMultiCalendarDigest` に差し替えてから実行してください。

## それからの朝

いまは毎朝、メールボックスの一番上に今日の予定が並んだ状態で一日が始まります。カレンダーアプリを開きにいくのではなく、向こうから届いている。この差、作る前は正直「そこまで変わらないのでは」と思っていたのですが、想像以上に大きかったです。夜勤明けのぼんやりした頭でも、メールを1通眺めるだけなら負担になりません。

朝起きてメールを開いたら、今日の予定が整理されている。GASで作る「自分専用の朝の秘書」、よかったら真似してみてください。

掲載コードは構文とCalendarApp・GmailAppの使い方を確認したうえで載せていますが、お使いの環境で一度テスト送信してから毎朝の運用に乗せるのがおすすめです。APIの仕様変更については公式ドキュメントで最新情報をご確認ください。

## 関連記事

- [GASでGoogleカレンダーに予定を自動作成する](/blog/gas-calendar-event-create/)
- [GASでGoogleカレンダーとスプレッドシートを同期する](/blog/gas-calendar-spreadsheet-sync/)
- [GASでカレンダーの空き時間を自動検索する](/blog/gas-calendar-free-slot/)
- [GASでGmailを検索してラベルを自動付与する](/blog/gas-gmail-search-label/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。
