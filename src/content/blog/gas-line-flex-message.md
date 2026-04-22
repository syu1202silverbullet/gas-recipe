---
title: "Flexメッセージを3分で作るGASテンプレ｜LINEで凝った見た目を簡単に"
description: "LINE FlexメッセージをGASで送る最短テンプレを凛が解説。商品カード・予約確認・ニュースカードのコピペ実装。"
pubDate: "2026-06-30T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas","line","flex-message"]
tagNames: ["GAS","LINE","Flex"]
readingTime: 5
keywords: ["GAS LINE Flex"]
---

LINEで「画像+タイトル+ボタン」のリッチなメッセージを送れるFlex Message。GASからの送信例。

```javascript
function sendFlex(userId, title, body, imageUrl, buttonUrl) {
  const TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  const flex = {
    type: 'bubble',
    hero: {
      type: 'image',
      url: imageUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: title, weight: 'bold', size: 'xl' },
        { type: 'text', text: body, wrap: true, margin: 'md' }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [{
        type: 'button',
        style: 'primary',
        action: { type: 'uri', label: '詳細を見る', uri: buttonUrl }
      }]
    }
  };

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + TOKEN },
    payload: JSON.stringify({
      to: userId,
      messages: [{ type: 'flex', altText: title, contents: flex }]
    })
  });
}
```

## デザインはシミュレータで作ると楽

[LINE Flex Message Simulator](https://developers.line.biz/flex-simulator/) でビジュアル編集 → JSON出力 → GASに貼り付け、が最短。

商品紹介・予約確認・ニュース配信などUIにこだわりたい時に。

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。実務ベースのGASレシピを発信中。
