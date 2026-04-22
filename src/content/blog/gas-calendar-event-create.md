---
title: "GASでGoogleカレンダーに予定登録する最短10行コード"
description: "スプレッドシートの予定リストをGoogleカレンダーに一括登録するGAS（Google Apps Script）コードを解説。繰り返し予定・複数カレンダー指定・終日予定などのパターンも網羅。"
pubDate: "2026-04-29T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas", "calendar", "event"]
tagNames: ["GAS", "カレンダー", "予定登録"]
readingTime: 5
---
「来月の家族の予定を、スプシにまとめて書いてあるけどカレンダーに1件ずつ入れるのが面倒」。こんな時こそGASの出番。

本記事では、**スプレッドシート→Googleカレンダー**の一括登録を、最短10行のコードで実現する方法を紹介します。

## この仕組みでできること

- 学校行事・部活スケジュールを一気に取り込み
- 出張予定・会議予定の一括登録
- 月次予定を毎月自動複製
- 誕生日・記念日を毎年自動登録

## 最短10行の登録コード

スプレッドシートに「日付」「タイトル」の2列があるとして、1行ずつカレンダーに登録：

```javascript
function importToCalendar() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  data.shift();  // ヘッダー除外
  const calendar = CalendarApp.getDefaultCalendar();
  data.forEach(([date, title]) => {
    if (date && title) {
      calendar.createAllDayEvent(title, new Date(date));
    }
  });
}
```

これを保存して実行するだけで、スプシ全行がカレンダーに登録されます。

## 時刻指定の予定を登録

```javascript
function importTimeEvents() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  data.shift();
  const calendar = CalendarApp.getDefaultCalendar();

  data.forEach(([date, startTime, endTime, title]) => {
    if (!date || !title) return;
    const start = new Date(`${date} ${startTime}`);
    const end = new Date(`${date} ${endTime}`);
    calendar.createEvent(title, start, end);
  });
}
```

スプシの列構成: `日付 / 開始時刻 / 終了時刻 / タイトル`

## 抑えておきたい3つのポイント

### ポイント1: タイムゾーンに注意

カレンダーの日時は**ロケール依存**。プロジェクト設定で `Asia/Tokyo` にしていないと、UTCズレが発生します。

### ポイント2: 重複登録防止

同じスクリプトを2回実行すると、同じ予定が2回入ります。**スプシにフラグ列**を設けて：

```javascript
data.forEach(([date, title, done], i) => {
  if (done === '済') return;
  calendar.createAllDayEvent(title, new Date(date));
  sheet.getRange(i + 2, 3).setValue('済');  // C列にフラグ
});
```

### ポイント3: 特定カレンダーに登録したい

デフォルトではなく「家族」カレンダーに入れたい場合：

```javascript
const calendars = CalendarApp.getAllCalendars();
const target = calendars.find(c => c.getName() === '家族');
target.createAllDayEvent(title, date);
```

## 応用：繰り返し予定・リマインダー設定

### 毎週月曜の予定

```javascript
calendar.createEventSeries(
  '週次ミーティング',
  new Date('2026-05-04 10:00'),
  new Date('2026-05-04 11:00'),
  CalendarApp.newRecurrence().addWeeklyRule().onlyOnWeekday(CalendarApp.Weekday.MONDAY)
);
```

### 1時間前にメール通知

```javascript
const event = calendar.createEvent(title, start, end);
event.addPopupReminder(60);  // 60分前
event.addEmailReminder(24 * 60);  // 24時間前
```

## 逆パターン：カレンダーからスプシへ

「今月の予定を月末にレポート化」したい時は、逆方向。

```javascript
function exportCalendarToSheet() {
  const events = CalendarApp.getDefaultCalendar().getEvents(new Date('2026-04-01'), new Date('2026-04-30'));
  const rows = events.map(e => [
    Utilities.formatDate(e.getStartTime(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    Utilities.formatDate(e.getEndTime(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    e.getTitle(),
    e.getLocation()
  ]);
  const sheet = SpreadsheetApp.getActiveSheet();
  sheet.getRange(2, 1, rows.length, 4).setValues(rows);
}
```

## トラブル：「予定が登録されない・重複する」

- `new Date(date)` で`Invalid Date`が出る → スプシの日付列が**文字列**になっている可能性。セル書式を「日付」に変換
- 同じ予定が何件も入る → フラグ列で処理済みを管理

## 看護師の私の使い方

病院の勤務表が月末にエクセルで配られるので、**GASでGoogleカレンダーに一括インポート**するようにしました。家族にも共有しているので、夜勤日・日勤日が一目でわかる状態です。

子供の学校行事も、配布されたプリントをスプシに入力→GASで一発登録。手書きで1件ずつカレンダーに入れていた頃の時間が戻ってくれば、と何度思ったか。

## まとめ

カレンダー自動登録は、**日々の予定管理にかかる地味な時間**を劇的に減らしてくれます。一度仕組みを作れば、今後の人生で何度も助けられます。

関連記事: [Gmail予約メールをカレンダーに自動登録](/blog/gas-gmail-to-calendar/) / [GASでできること10選](/blog/gas-can-do-10-things/)
