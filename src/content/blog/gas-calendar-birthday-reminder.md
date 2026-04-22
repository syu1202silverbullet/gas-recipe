---
title: "誕生日を毎年カレンダー自動登録するGAS｜家族・取引先の記念日漏れゼロに"
description: "誕生日や記念日を毎年自動でGoogleカレンダーに登録するGAS実装を凛が解説。1週間前にLINE通知も。家族・取引先の記念日管理に。"
pubDate: "2026-06-19T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","birthday","reminder"]
tagNames: ["GAS","カレンダー","誕生日","リマインド"]
readingTime: 5
keywords: ["GAS 誕生日 自動","GAS 記念日 リマインド"]
---

家族・取引先の誕生日をスプシ管理→自動カレンダー登録。

## スプシ構造

| 名前 | 月 | 日 | 関係 |
|---|---|---|---|
| 田中 | 5 | 10 | 家族 |
| 佐藤 | 6 | 22 | 仕事 |

## 実装

```javascript
function registerBirthdays() {
  const data = SpreadsheetApp.getActiveSheet().getDataRange().getValues();
  data.shift();
  const year = new Date().getFullYear();
  const cal = CalendarApp.getDefaultCalendar();

  data.forEach(([name, month, day, relation]) => {
    const date = new Date(year, month - 1, day);
    cal.createAllDayEvent(`🎂 ${name}さん誕生日 (${relation})`, date);
  });
}
```

## 1週間前リマインド

```javascript
function birthdayReminder() {
  const data = SpreadsheetApp.getActiveSheet().getDataRange().getValues();
  data.shift();
  const today = new Date();
  const target = new Date(today.getTime() + 7 * 86400000);

  data.forEach(([name, month, day]) => {
    if (target.getMonth() + 1 === month && target.getDate() === day) {
      pushLineFamily(`🎁 1週間後に${name}さんの誕生日です。プレゼント準備を！`);
    }
  });
}
```

毎朝トリガーで誕生日忘れゼロ。

## 関連記事
- [記念日を家族LINEに自動通知するGAS](/blog/gas-anniversary-gift-reminder/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
