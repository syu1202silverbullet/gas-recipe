---
title: "GAS Gmail自動返信の設定方法｜不在通知から条件分岐まで"
description: "GASでGmailの自動返信を実装する方法を解説。基本の不在通知から、件名・送信者による条件分岐まで実務コード付きで紹介します。"
pubDate: "2026-05-13T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "gmail"
categoryName: "Gmail"
tagSlugs: ["gas","gmail","auto-reply"]
tagNames: ["GAS","Gmail","自動返信"]
readingTime: 7
keywords: ["GAS Gmail","GAS 自動返信","Gmail 自動化"]
---

## はじめに

Gmailの自動返信をGASで実装すると、不在時の対応を自動化できます。

## 実装コード

```javascript
function autoReply() {
  const threads = GmailApp.search('is:unread -label:auto-replied', 0, 10);
  threads.forEach(thread => {
    const msg = thread.getMessages()[0];
    msg.reply('お問い合わせありがとうございます。2営業日以内にご返信します。');
    thread.addLabel(GmailApp.getUserLabelByName('auto-replied'));
  });
}
```

## トリガー設定

時間ベースのトリガーで毎時実行に設定してください。
