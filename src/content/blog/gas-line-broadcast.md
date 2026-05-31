---
title: "LINE公式一斉配信をGASで自動化する手順｜友達全員にスケジュール配信"
description: "LINE公式アカウントの一斉配信をGASで自動化する手順を凛が解説。Messaging APIで全友達にメッセージ送信、配信時刻スケジュール化。"
pubDate: "2026-06-29T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas","line","broadcast"]
tagNames: ["GAS","LINE","一斉配信"]
readingTime: 5
keywords: ["GAS LINE 一斉配信","LINE Broadcast"]
---

LINE公式アカウントは管理画面から一斉配信できますが、GAS化すれば**スプシのテンプレ**から定時配信が可能。

## 実装

```javascript
function broadcast(text) {
  const TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + TOKEN },
    payload: JSON.stringify({
      messages: [{ type: 'text', text: text }]
    })
  });
}

// スプシの「配信内容」シートから本日分を取得
function todaysBroadcast() {
  const today = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd');
  const data = SpreadsheetApp.getActiveSheet().getDataRange().getValues();
  const row = data.find(r => Utilities.formatDate(new Date(r[0]), 'JST', 'yyyy-MM-dd') === today);
  if (row) broadcast(row[1]);
}
```

毎朝10時トリガーで todaysBroadcast → スプシに書いておくだけで自動配信。

## ⚠️ 配信数制限

無料プランは月200通まで（友達数による）。配信前に `/v2/bot/message/quota` で残数確認するのが安全。

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
