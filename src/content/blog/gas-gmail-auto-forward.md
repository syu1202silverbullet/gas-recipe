---
title: "Gmail条件転送をGASで自動化する完全手順｜特定キーワード・送信元別の振り分け"
description: "Gmail条件転送をGASで自動化する手順を凛が解説。Gmail標準フィルタを超える柔軟な転送ロジック・Slack連携・スプシ転記まで。"
pubDate: "2026-06-11T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas","gmail","forward","automation"]
tagNames: ["GAS","Gmail","転送","自動化"]
readingTime: 5
keywords: ["GAS Gmail 自動転送","Gmail 条件転送 GAS"]
---

こんにちは、凛です。Gmail標準の転送ルールでは「件名にXがあれば」程度しかできない。GASなら**本文の内容や添付ファイルの有無まで条件にできます**。

## 基本実装

```javascript
function autoForward() {
  const threads = GmailApp.search('is:unread label:重要 -label:転送済');
  const FORWARD_TO = 'team@example.com';
  const label = GmailApp.getUserLabelByName('転送済') || GmailApp.createLabel('転送済');

  threads.forEach(thread => {
    thread.getMessages().forEach(msg => {
      if (msg.getBody().includes('注文')) {
        msg.forward(FORWARD_TO);
      }
    });
    thread.addLabel(label);
  });
}
```

5分おきトリガーで動かせば、未読＋特定条件のメールを自動転送。

## カスタマイズ例

### 送信元ドメインで分岐

```javascript
const from = msg.getFrom();
if (from.includes('@partner-a.com')) {
  msg.forward('team-a@example.com');
} else if (from.includes('@partner-b.com')) {
  msg.forward('team-b@example.com');
}
```

### 添付ファイルだけ転送

```javascript
const attachments = msg.getAttachments();
if (attachments.length > 0) {
  GmailApp.sendEmail(FORWARD_TO, '添付転送: ' + msg.getSubject(), '元: ' + msg.getFrom(), {
    attachments: attachments
  });
}
```

### Slack/Discordに転送

```javascript
function forwardToSlack(msg) {
  const payload = {
    text: `📧 *${msg.getSubject()}*\n送信元: ${msg.getFrom()}\n${msg.getPlainBody().substring(0, 500)}`
  };
  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}
```

## まとめ

- GmailApp.search で柔軟な検索
- 本文・添付・送信元で詳細条件分岐
- ラベルで二重転送防止
- Slack/Discord連携も簡単

## 関連記事
- [GASでGmail自動返信を5分で作る最短レシピ](/blog/gas-gmail-auto-reply/)
- [Gmail未読を条件検索してラベル付与するGAS](/blog/gas-gmail-search-label/)
- [Gmail添付ファイルをドライブ自動保存](/blog/gas-gmail-attachment-drive/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
