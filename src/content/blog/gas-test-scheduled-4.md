---
title: "GASでGoogle Formsの回答を自動集計する方法"
description: "GASでGoogleフォームの回答をスプレッドシートに自動集計・整形する方法を解説。送信トリガーを使ったリアルタイム処理も紹介します。"
pubDate: "2026-05-15T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","forms","spreadsheet"]
tagNames: ["GAS","Googleフォーム","スプレッドシート"]
readingTime: 8
keywords: ["GAS フォーム","GAS 自動集計","Google Forms GAS"]
---

## はじめに

GoogleフォームとGASを組み合わせると、回答の自動集計・通知が実現できます。

## 実装コード

```javascript
function onFormSubmit(e) {
  const response = e.response;
  const items = response.getItemResponses();
  const sheet = SpreadsheetApp.getActiveSheet();
  const row = items.map(item => item.getResponse());
  sheet.appendRow([new Date(), ...row]);
  MailApp.sendEmail('admin@example.com', '新しい回答が届きました', row.join(', '));
}
```

## フォーム送信トリガーの設定

フォームの「送信時」トリガーを設定して、回答が届くたびに自動処理が走ります。
