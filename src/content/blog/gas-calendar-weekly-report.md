---
title: "カレンダー稼働時間を週次レポート出力GAS｜工数集計・客先報告に"
description: "Googleカレンダーから稼働時間を週次集計してレポート化するGAS実装を凛が解説。客先別・案件別の工数を自動集計。"
pubDate: "2026-06-20T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","report","timesheet"]
tagNames: ["GAS","カレンダー","レポート","工数"]
readingTime: 5
keywords: ["GAS カレンダー 工数"]
---

カレンダー予定を「客先名で集計」して週次レポート化。

```javascript
function weeklyReport() {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 86400000);
  const events = CalendarApp.getDefaultCalendar().getEvents(start, end);

  const summary = {};
  events.forEach(e => {
    const title = e.getTitle();
    const hours = (e.getEndTime() - e.getStartTime()) / 3600000;
    // タイトル冒頭の【客先名】を抽出
    const match = title.match(/【(.+?)】/);
    const client = match ? match[1] : 'その他';
    summary[client] = (summary[client] || 0) + hours;
  });

  let report = `【先週の稼働サマリ】\n${start.toLocaleDateString()} 〜 ${end.toLocaleDateString()}\n\n`;
  Object.entries(summary)
    .sort(([, a], [, b]) => b - a)
    .forEach(([client, hours]) => {
      report += `${client}: ${hours.toFixed(1)}h\n`;
    });

  GmailApp.sendEmail('your@email.com', '[週次] 工数レポート', report);
}
```

毎週月曜朝7時にトリガー設定→先週の工数が自動でメール届く。

## 関連記事
- [GASでGoogleカレンダーに予定登録する最短10行](/blog/gas-calendar-event-create/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
