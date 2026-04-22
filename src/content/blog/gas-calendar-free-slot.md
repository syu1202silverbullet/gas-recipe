---
title: "空き時間をカレンダーから自動抽出するGAS｜会議調整・予約ページ生成に"
description: "Googleカレンダーから空き時間を自動抽出するGAS実装を凛が解説。会議調整の工数削減・予約ページ生成のベース実装に。"
pubDate: "2026-06-18T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","free-slot","scheduling"]
tagNames: ["GAS","カレンダー","空き時間"]
readingTime: 5
keywords: ["GAS カレンダー 空き時間"]
---

カレンダーから「9-18時の中で空いてる時間帯」を抽出するGAS。

```javascript
function findFreeSlots(date) {
  const startHour = 9, endHour = 18;
  const dayStart = new Date(date); dayStart.setHours(startHour, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(endHour, 0, 0, 0);

  const events = CalendarApp.getDefaultCalendar()
    .getEvents(dayStart, dayEnd)
    .sort((a, b) => a.getStartTime() - b.getStartTime());

  const free = [];
  let cursor = dayStart;
  events.forEach(e => {
    if (e.getStartTime() > cursor) {
      free.push({ start: new Date(cursor), end: e.getStartTime() });
    }
    if (e.getEndTime() > cursor) cursor = e.getEndTime();
  });
  if (cursor < dayEnd) free.push({ start: cursor, end: dayEnd });

  return free.filter(s => (s.end - s.start) >= 30 * 60000); // 30分以上
}

function showTomorrowSlots() {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const slots = findFreeSlots(tomorrow);
  let msg = '【明日の空き時間】\n';
  slots.forEach(s => {
    msg += `${s.start.toLocaleTimeString('ja-JP', {hour:'2-digit',minute:'2-digit'})} 
〜 ${s.end.toLocaleTimeString('ja-JP', {hour:'2-digit',minute:'2-digit'})}\n`;
  });
  console.log(msg);
}
```

予約システム自作のベースにもなります。

## 関連記事
- [GASでGoogleカレンダーに予定登録する最短10行](/blog/gas-calendar-event-create/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
