---
title: "今日の予定を毎朝LINEで届けるGAS完全版｜カレンダー要約Bot実装"
description: "Googleカレンダーの今日の予定を毎朝LINEで自分に通知するGASを凛が解説。スケジュール忘れゼロ・通勤前の心構えに最適。"
pubDate: "2026-06-14T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","line","notification","reminder"]
tagNames: ["GAS","カレンダー","LINE","通知"]
readingTime: 5
keywords: ["GAS カレンダー LINE 通知","GAS 今日の予定"]
---

朝起きて「今日何の予定だっけ」をスマホで確認する手間、GASで自動化できます。

## 実装

```javascript
function morningCalendarLine() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  tomorrow.setHours(0, 0, 0, 0);

  const events = CalendarApp.getDefaultCalendar().getEvents(now, tomorrow);
  if (events.length === 0) {
    pushLine('今日は予定なし、ゆっくり過ごせます☕');
    return;
  }

  let msg = '【今日の予定】\n\n';
  events.forEach(e => {
    const time = Utilities.formatDate(e.getStartTime(), 'Asia/Tokyo', 'HH:mm');
    msg += `${time} ${e.getTitle()}\n`;
  });
  pushLine(msg);
}

function pushLine(text) {
  const TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  const USER_ID = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + TOKEN },
    payload: JSON.stringify({ to: USER_ID, messages: [{ type: 'text', text: text }] })
  });
}
```

毎朝7時トリガーで設定して、通知開始。

## カスタマイズ

- **複数カレンダー対応**: `CalendarApp.getCalendarsByName('仕事')` で別カレンダー取得
- **明日の予定も含める**: `tomorrow` を48時間後に
- **天気予報も合わせて**: OpenWeatherMap APIと組み合わせ

## 関連記事
- [毎朝ToDoをLINEに届けるGASリマインダー](/blog/gas-line-reminder-daily/)
- [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
