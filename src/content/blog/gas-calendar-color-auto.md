---
title: "カレンダー色分けをGASで自動化するコード例｜タイトル別自動カラーリング"
description: "Googleカレンダー予定をタイトルキーワードに応じて自動色分けするGAS実装を凛が解説。会議・作業・休憩等の見える化に。"
pubDate: "2026-06-17T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","color"]
tagNames: ["GAS","カレンダー","色"]
readingTime: 4
keywords: ["GAS カレンダー 色 自動"]
---

カレンダー予定タイトルに応じて自動で色を変えるGAS。

```javascript
function autoColorEvents() {
  const calendar = CalendarApp.getDefaultCalendar();
  const start = new Date();
  const end = new Date(); end.setDate(end.getDate() + 14);
  const events = calendar.getEvents(start, end);

  events.forEach(e => {
    const title = e.getTitle();
    if (title.includes('MTG') || title.includes('会議')) {
      e.setColor(CalendarApp.EventColor.PALE_BLUE);
    } else if (title.includes('作業') || title.includes('集中')) {
      e.setColor(CalendarApp.EventColor.GREEN);
    } else if (title.includes('休憩') || title.includes('ランチ')) {
      e.setColor(CalendarApp.EventColor.YELLOW);
    }
  });
}
```

毎朝1回トリガー実行で、新しい予定も自動色分け。

## 利用可能カラー

| 定数 | 色 |
|---|---|
| PALE_BLUE | 薄青 |
| PALE_GREEN | 薄緑 |
| MAUVE | モーブ |
| PALE_RED | 薄赤 |
| YELLOW | 黄 |
| ORANGE | オレンジ |
| CYAN | シアン |
| GRAY | グレー |
| BLUE | 青 |
| GREEN | 緑 |
| RED | 赤 |

## 関連記事
- [GASでGoogleカレンダーに予定登録する最短10行](/blog/gas-calendar-event-create/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
