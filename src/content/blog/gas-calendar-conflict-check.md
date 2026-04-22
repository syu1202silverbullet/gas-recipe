---
title: "カレンダー予定のダブルブッキング検知GAS｜重複検出と通知"
description: "Googleカレンダーで予定が重複していないかGASで自動チェックする実装を凛が解説。会議室・人員のダブルブッキング防止に。"
pubDate: "2026-06-15T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","conflict","check"]
tagNames: ["GAS","カレンダー","重複","チェック"]
readingTime: 4
keywords: ["GAS カレンダー 重複","GAS ダブルブッキング"]
---

「打ち合わせを入れたつもりが既存予定と被ってた」を防ぐGAS。

## 実装

```javascript
function checkConflicts() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7); // 1週間先まで

  const events = CalendarApp.getDefaultCalendar().getEvents(start, end);
  const conflicts = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (events[i].getEndTime() > events[j].getStartTime() &&
          events[i].getStartTime() < events[j].getEndTime()) {
        conflicts.push([events[i].getTitle(), events[j].getTitle(),
                       events[i].getStartTime()]);
      }
    }
  }

  if (conflicts.length > 0) {
    let msg = '【重複検出】\n';
    conflicts.forEach(c => msg += `${c[2].toLocaleString('ja-JP')} ${c[0]} ⇔ ${c[1]}\n`);
    GmailApp.sendEmail('your@email.com', '[警告] カレンダー重複', msg);
  }
}
```

毎朝8時に走らせて、その日含む1週間の重複をチェック→メール通知。

## 関連記事
- [GASでGoogleカレンダーに予定登録する最短10行](/blog/gas-calendar-event-create/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
