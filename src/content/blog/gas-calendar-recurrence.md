---
title: "GASで繰り返し予定を自動作成する完全構文｜毎週・毎月・除外日付対応"
description: "Googleカレンダーで繰り返し予定をGASで作成する完全構文を凛が解説。毎週月曜・第2火曜・隔週金曜など実務パターン網羅。"
pubDate: "2026-06-16T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","recurrence"]
tagNames: ["GAS","カレンダー","繰り返し"]
readingTime: 5
keywords: ["GAS カレンダー 繰り返し","GAS recurrence"]
---

毎週/毎月の決まった予定をGASで一括作成。

## 基本：毎週月曜の予定

```javascript
function weeklyMondayMeeting() {
  const recurrence = CalendarApp.newRecurrence().addWeeklyRule()
    .onlyOnWeekday(CalendarApp.Weekday.MONDAY)
    .until(new Date('2026-12-31'));

  CalendarApp.getDefaultCalendar().createEventSeries(
    '週次MTG',
    new Date('2026-05-04 10:00'),
    new Date('2026-05-04 11:00'),
    recurrence
  );
}
```

## パターン早見表

| 周期 | 構文 |
|---|---|
| 毎日 | `addDailyRule()` |
| 毎週 | `addWeeklyRule().onlyOnWeekday(...)` |
| 隔週 | `addWeeklyRule().interval(2)` |
| 毎月 | `addMonthlyRule().onlyOnMonthDay(15)` |
| 第N曜日 | `addMonthlyRule().onlyOnWeek(2).onlyOnWeekday(...)` |

## 終了条件

- `.until(new Date('2026-12-31'))` 期日まで
- `.times(10)` 10回繰り返し

## 除外日

```javascript
.addExclusion(CalendarApp.newRecurrence().addDate(new Date('2026-08-13')))
```

お盆など特定日を除外。

## 関連記事
- [GASでGoogleカレンダーに予定登録する最短10行](/blog/gas-calendar-event-create/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
