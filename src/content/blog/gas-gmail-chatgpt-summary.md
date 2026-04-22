---
title: "GmailをChatGPTで要約するGAS実装30行｜長文メールを3行で読む自動化"
description: "Gmail受信メールをChatGPTで自動要約するGAS実装を凛が30行コードで解説。長文メールを3行サマリ化、Slackに飛ばす、毎朝ダイジェストまで。"
pubDate: "2026-06-12T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas","gmail","chatgpt","openai","summary"]
tagNames: ["GAS","Gmail","ChatGPT","要約"]
readingTime: 6
keywords: ["GAS Gmail ChatGPT","Gmail 要約 GAS","GAS OpenAI"]
---

こんにちは、凛です。長いメールを毎日たくさん受け取る方、ChatGPTで3行要約させて時短しませんか？

## 30行で動く実装

スクリプトプロパティに `OPENAI_API_KEY` 設定済み前提：

```javascript
function summarizeUnreadMails() {
  const threads = GmailApp.search('is:unread newer_than:1d', 0, 5);
  const OPENAI_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  threads.forEach(thread => {
    const msg = thread.getMessages()[0];
    const body = msg.getPlainBody().substring(0, 3000);
    const summary = chatgptSummarize(body, OPENAI_KEY);

    GmailApp.sendEmail('your@email.com',
      `[要約] ${msg.getSubject()}`,
      `【元送信元】${msg.getFrom()}\n\n【3行要約】\n${summary}\n\n【元本文先頭】\n${body.substring(0, 200)}...`
    );
    thread.markRead();
  });
}

function chatgptSummarize(text, key) {
  const res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + key },
    payload: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '以下のメールを日本語で3行に要約してください。重要な数字・日付・依頼事項を含めて。' },
        { role: 'user', content: text }
      ],
      max_tokens: 300
    })
  });
  return JSON.parse(res.getContentText()).choices[0].message.content;
}
```

毎朝7時トリガーで動かせば、起きた瞬間に「昨日来たメール5本の要約」が読める。

## 応用：朝のダイジェスト1通にまとめる

5本それぞれメールせずに、1通に集約：

```javascript
function morningDigest() {
  const threads = GmailApp.search('newer_than:1d', 0, 10);
  let digest = `【今朝のメールダイジェスト】\n\n`;

  threads.forEach((thread, i) => {
    const msg = thread.getMessages()[0];
    const summary = chatgptSummarize(msg.getPlainBody().substring(0, 2000));
    digest += `${i+1}. ${msg.getSubject()}\n   送信元: ${msg.getFrom()}\n   要約: ${summary}\n\n`;
  });

  GmailApp.sendEmail('your@email.com', '[朝のダイジェスト]', digest);
}
```

## コスト試算

- gpt-4o-mini: 1メール要約 約0.01円
- 毎日10メール × 30日 = 月3円

事実上タダ。

## まとめ

- 30行でGmail+ChatGPT要約完成
- 朝ダイジェストで1通にまとめると効率最強
- gpt-4o-miniなら月数円で運用可能

## 関連記事
- [ChatGPT連携LINE BotをGASで作る50行](/blog/gas-line-chatgpt-bot/)
- [GASでGmail自動返信を5分で作る最短レシピ](/blog/gas-gmail-auto-reply/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
