---
title: "Zoomリンクを自動付与する予定作成GAS｜会議招待を1コマンドで完結"
description: "Googleカレンダーの予定作成時にZoomリンクを自動付与するGAS実装を凛が解説。Zoom OAuth連携・APIキー設定・カスタム会議URL対応まで完全ガイド。"
pubDate: "2026-06-13T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","zoom","calendar","meeting"]
tagNames: ["GAS","Zoom","カレンダー","会議"]
readingTime: 6
keywords: ["GAS Zoom","GAS Zoom カレンダー","Zoom リンク 自動"]
---

こんにちは、凛です。打ち合わせ予定を作るたびにZoom URL作成→コピペは地味に時間食う。GASで自動化しちゃいましょう。

## 必要なもの

1. Zoom Developer アカウント (無料)
2. Server-to-Server OAuth App 作成
3. Account ID, Client ID, Client Secret 取得

スクリプトプロパティに保存：
```
ZOOM_ACCOUNT_ID
ZOOM_CLIENT_ID
ZOOM_CLIENT_SECRET
```

## アクセストークン取得

```javascript
function getZoomToken() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ZOOM_CLIENT_ID');
  const secret = props.getProperty('ZOOM_CLIENT_SECRET');
  const account = props.getProperty('ZOOM_ACCOUNT_ID');
  const auth = Utilities.base64Encode(`${id}:${secret}`);

  const res = UrlFetchApp.fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${account}`, {
    method: 'post',
    headers: { Authorization: 'Basic ' + auth }
  });
  return JSON.parse(res.getContentText()).access_token;
}
```

## Zoom会議URL作成

```javascript
function createZoomMeeting(topic, startTime, durationMin) {
  const token = getZoomToken();
  const res = UrlFetchApp.fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      topic: topic,
      type: 2, // 予約済み
      start_time: startTime.toISOString(),
      duration: durationMin,
      timezone: 'Asia/Tokyo',
      settings: { join_before_host: true, mute_upon_entry: true }
    })
  });
  return JSON.parse(res.getContentText()).join_url;
}
```

## カレンダー予定作成と組み合わせ

```javascript
function createMeetingWithZoom(title, startTime, endTime) {
  const duration = (endTime - startTime) / 60000;
  const zoomUrl = createZoomMeeting(title, startTime, duration);

  CalendarApp.getDefaultCalendar().createEvent(title, startTime, endTime, {
    description: `Zoom URL: ${zoomUrl}\n\n会議室に入る前にミュート確認をお願いします。`,
    location: zoomUrl
  });
}

// 使い方
createMeetingWithZoom('週次MTG', new Date('2026-05-10 14:00'), new Date('2026-05-10 15:00'));
```

## スプシ予定リスト一括化

スプシA列に「タイトル, 開始, 終了」を書いておく：

```javascript
function bulkCreateMeetings() {
  const data = SpreadsheetApp.getActiveSheet().getDataRange().getValues();
  data.shift(); // ヘッダー
  data.forEach(([title, start, end]) => {
    createMeetingWithZoom(title, new Date(start), new Date(end));
  });
}
```

10件の打ち合わせを1分でセット完了。

## まとめ

- Zoom OAuth → アクセストークン → meetings APIでURL生成
- カレンダー予定の location/description にURL埋め込み
- スプシ一括処理で大量予定を瞬殺

## 関連記事
- [GASでGoogleカレンダーに予定登録する最短10行](/blog/gas-calendar-event-create/)
- [スプシの予定リストをカレンダー一括同期GAS](/blog/gas-calendar-spreadsheet-sync/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
