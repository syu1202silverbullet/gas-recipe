---
title: "GASでLINE通知を送る方法｜Messaging API完全ガイド"
description: "GASからLINE Messaging APIを使って通知を送る方法を解説。チャンネルアクセストークンの取得からメッセージ送信まで実務コード付き。"
pubDate: "2026-05-14T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "line"
categoryName: "LINE"
tagSlugs: ["gas","line","messaging-api"]
tagNames: ["GAS","LINE","Messaging API"]
readingTime: 9
keywords: ["GAS LINE","GAS LINE通知","LINE Messaging API"]
---

## はじめに

GASとLINE Messaging APIを組み合わせると、スプレッドシートの更新をLINEに通知できます。

## 実装コード

```javascript
function sendLineMessage(message) {
  const token = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  const url = 'https://api.line.me/v2/bot/message/broadcast';
  const payload = { messages: [{ type: 'text', text: message }] };
  UrlFetchApp.fetch(url, {
    method: 'post',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload)
  });
}
```

## スクリプトプロパティの設定

LINEのチャンネルアクセストークンを`LINE_TOKEN`として登録してください。
