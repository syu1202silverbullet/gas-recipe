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

こんにちは、夜勤明けのコーヒー片手にGASを書いている看護師の凛です。夜勤明けの朝、その日の予定をサッと確認したいですよね。今日は**GASでGoogleカレンダーの今日の予定を毎朝メールで受け取る方法**を紹介します。

「GAS カレンダー メール通知」で検索してここに来た方が、読み終わったらすぐ動かせるレベルで書いています。

## こんな悩みありませんか？

- 「カレンダーアプリを開くのが面倒、メールで届けてほしい」
- 「家族や職場の複数カレンダーをまとめて一覧で確認したい」
- 「朝の通勤中にメールで今日の予定を把握したい」

GASで毎朝7時に「今日の予定」メールを自動送信する仕組みを作れば、カレンダーアプリを開かなくても一日のスケジュールが把握できます。

## CalendarAppで使える主な操作

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

## GASコード（静的検証済み）

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

**静的検証結果：**
- `CalendarApp.getDefaultCalendar().getEventsForDay(date)`：✅ CalendarApp APIの正しい使い方
- `event.isAllDayEvent()` で終日イベントを判定：✅ 終日イベント混在時も正しく処理
- `Session.getActiveUser().getEmail()` で自分のアドレスを動的取得：✅ メアドをコードに直書きしない安全設計
- `GmailApp.sendEmail`：✅ 構文正しい

## 複数カレンダーをまとめて通知

仕事用・家族用など複数カレンダーをまとめてメール通知できます。

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

## カレンダーIDの確認方法

Googleカレンダーの設定 → 対象カレンダー →「カレンダーの統合」にある**カレンダーID**をコピーします。

複数カレンダーをまとめる場合、スクリプトプロパティ `CALENDAR_IDS` にカンマ区切りで設定します。

```
例: abc123@group.calendar.google.com,xyz789@group.calendar.google.com
```

## 毎朝自動送信のトリガー設定

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

`setupMorningTrigger` を一度手動実行するだけで、以降は毎朝7時に自動送信されます。

## まとめ

- `CalendarApp.getEventsForDay` で今日の予定を全件取得
- 終日イベントは `isAllDayEvent()` で判定して表示を分ける
- 複数カレンダーはIDをスクリプトプロパティで管理
- トリガーで毎朝自動送信すれば完全放置でOK

朝起きてメールを開いたら今日の予定が整理されている。GASで作る「自分専用の朝の秘書」です。

## 関連記事

- [GASでGoogleカレンダーに予定を自動作成する](/blog/gas-calendar-event-create/)
- [GASでGoogleカレンダーとスプレッドシートを同期する](/blog/gas-calendar-spreadsheet-sync/)
- [GASでカレンダーの空き時間を自動検索する](/blog/gas-calendar-free-slot/)
- [GASでGmailを検索してラベルを自動付与する](/blog/gas-gmail-search-label/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。CalendarApp APIの仕様変更は公式ドキュメントで最新情報をご確認ください。
