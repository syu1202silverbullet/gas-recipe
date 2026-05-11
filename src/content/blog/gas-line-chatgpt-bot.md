---
title: "ChatGPTé£æºLINE BotãGASã§ä½ã50è¡ï½OpenAI APIã»Messaging APIå®å¨å®è£"
description: "GASã§ChatGPTé£æºã®LINE Botãæç­50è¡ã§ä½ãå®å¨å®è£ã¬ã¤ããOpenAI APIã»LINE Messaging APIè¨­å®ããããã­ã¤ã¾ã§ãçè­·å¸«Ãå¯æ¥­Webã¨ã³ã¸ãã¢ã®åãã³ããå¯è½ãªã³ã¼ãã§è§£èª¬ãã¾ãã"
pubDate: "2026-05-04T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "line"
categoryName: "LINEé£æº"
tagSlugs: ["gas","line","chatgpt","openai","bot"]
tagNames: ["GAS","LINE","ChatGPT","OpenAI","Bot"]
readingTime: 11
keywords: ["GAS LINE ChatGPT","GAS ChatGPT Bot","LINE Bot GAS","ChatGPT LINE é£æº"]
---

ããã«ã¡ã¯ãåã§ããé½åã§çè­·å¸«ãããªãããå¯æ¥­ã§Webã¨ã³ã¸ãã¢ããã¦ãã¾ãããChatGPTãLINEããæè»½ã«ä½¿ããããã¨ããã®ã¯2025å¹´æ¥ãã£ã¨éè¦ãé«ããã¼ããä»æ¥ã¯**GASã§ChatGPTé£æºLINE Botã50è¡ã§ä½ã**å®å¨å®è£ãè§£èª¬ãã¾ãã

ãGAS LINE ChatGPTãã§æ¤ç´¢ãã¦ããã«æ¥ãæ¹ããèª­ã¿çµãã£ãç´å¾ã«Botã¨LINEã§ä¼è©±ã§ããã¬ãã«ã§æ¸ãã¦ãã¾ãã

## ãããªæ©ã¿ããã¾ãããï¼

- ãChatGPT Plusæ3000åã¯é«ããããAPIå¾éèª²éã§å®ãä½¿ãããã
- ãå®¶æãåäººã«ãChatGPTå±æããããã©ãã­ã°ã¤ã³ç®¡çãé¢åã
- ãLINE Botã§ä½ãä½ã£ã¦ã¿ããåãã­ã¸ã§ã¯ãã«æé©ã
- ãOpenAI APIã¨LINE APIãç¹ããä¾ãå°ãªãã

ç§ãChatGPT Plusã«æ3000åæãã®ãæãããªããèªåBotãGASã§æ§ç¯ãææ°ç¾åã§å®¶æã¿ããªã§ä½¿ãã¦ã¾ãã

## å¨ä½åï¼3ã¤ã®APIãé£çµï¼

```
LINE â Webhook â GAS doPost â OpenAI API â è¿ç­ãã­ã¹ã â LINE Reply API â ã¦ã¼ã¶ã¼
```

å¿è¦ãªãã®ï¼
1. **LINE Developers ã¢ã«ã¦ã³ã**ï¼ç¡æï¼
2. **OpenAI APIã­ã¼**ï¼å¾éèª²éãææ°ç¾åãï¼
3. **GASãã­ã¸ã§ã¯ã**

## Step 1: LINE Developers ã§ãã£ãã«ä½æ

1. https://developers.line.biz/ ã«ã­ã°ã¤ã³
2. ãã­ãã¤ãä½æ â Messaging APIãã£ãã«æ°è¦ä½æ
3. ã**ãã£ãã«ã¢ã¯ã»ã¹ãã¼ã¯ã³**ããçºè¡ï¼å¾ã§ä½¿ãï¼
4. ãWebhook URLãè¨­å®ï¼å¾ã§GASã®URLãå¥ããï¼
5. ãWebhookã®å©ç¨ãONããå¿ç­ã¡ãã»ã¼ã¸ãOFF

## Step 2: OpenAI APIã­ã¼åå¾

1. https://platform.openai.com/api-keys ã«ã­ã°ã¤ã³
2. Create new secret key â ååä»ãã¦çºè¡
3. **ã­ã¼ã¯1åº¦ããè¡¨ç¤ºãããªã**ã®ã§ã¡ã¢
4. èª²éè¨­å®ï¼ã¯ã¬ã¸ããã«ã¼ãç»é²ï¼å¿é 

## Step 3: GASã«ç°å¢å¤æ°ãè¨­å®

GASã¨ãã£ã¿ â ãã­ã¸ã§ã¯ãã®è¨­å® â ã¹ã¯ãªãããã­ããã£ ã§ä»¥ä¸è¿½å ï¼

```
LINE_CHANNEL_ACCESS_TOKEN: <Step1ã§çºè¡ãããã¼ã¯ã³>
OPENAI_API_KEY: <Step2ã§çºè¡ããã­ã¼>
```

ããã§ã³ã¼ãåã«ç´æ¸ãããã«æ¸ã¿ã¾ãï¼GitHubæ¼æ´©å¯¾ç­ï¼ã

## Step 4: GASæ¬ä½ã³ã¼ãï¼50è¡ï¼

```javascript
const PROPS = PropertiesService.getScriptProperties();
const LINE_TOKEN = PROPS.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
const OPENAI_KEY = PROPS.getProperty('OPENAI_API_KEY');

function doPost(e) {
  const event = JSON.parse(e.postData.contents).events[0];
  if (!event || event.type !== 'message' || event.message.type !== 'text') {
    return ContentService.createTextOutput('OK');
  }

  const userMessage = event.message.text;
  const replyToken = event.replyToken;

  // ChatGPT APIå¼ã³åºã
  const aiReply = askChatGPT(userMessage);

  // LINEã«è¿ä¿¡
  replyToLine(replyToken, aiReply);

  return ContentService.createTextOutput('OK');
}

function askChatGPT(prompt) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: 'gpt-4o-mini',  // ã³ã¹ãæå¼·ã¢ãã«
    messages: [
      { role: 'system', content: 'ããªãã¯è¦ªåãªã¢ã·ã¹ã¿ã³ãã§ããç°¡æ½ã«æ¥æ¬èªã§ç­ãã¦ãã ããã' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 500
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + OPENAI_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const res = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(res.getContentText());
  return data.choices[0].message.content;
}

function replyToLine(replyToken, text) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  const payload = {
    replyToken: replyToken,
    messages: [{ type: 'text', text: text }]
  };
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + LINE_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}
```

ããã§50è¡ã§å®çµã`gpt-4o-mini` ãæå®ãã¦ããã®ã§**1åããã0.01åç¨åº¦**ã§ãã

## Step 5: ããã­ã¤ï¼Webhook URLè¨­å®

1. GASã¨ãã£ã¿ã§ã**ããã­ã¤**ãâã**æ°ããããã­ã¤**ãâ ã¦ã§ãã¢ããª
2. ã¢ã¯ã»ã¹ã§ããã¦ã¼ã¶ã¼: **å¨å¡ï¼å¿åã¢ã¯ã»ã¹å¯ï¼**
3. çºè¡ãããURLãã³ãã¼
4. LINE Developers ã® Webhook URL ã«è²¼ã
5. ãæ¤è¨¼ããã¿ã³ã§çéç¢ºèª

## åä½ç¢ºèª

LINEå¬å¼ã¢ã«ã¦ã³ããåéè¿½å ãã¦ãã¡ãã»ã¼ã¸ãéãã10ç§ä»¥åã«ChatGPTããã®è¿ç­ãè¿ã£ã¦ãã¾ãã

## ã«ã¹ã¿ãã¤ãºã¢ã¤ãã¢

### system ãã­ã³ãããå¤ãã¦å°éBotå

```javascript
{ role: 'system', content: 'ããªãã¯çè­·å¸«åãã®å»çæå ±ã¢ã·ã¹ã¿ã³ãã§ããä¸è¬çãªå»çæå ±ã®ã¿æä¾ããè¨ºæ­ã¯ãã¾ããã' }
```

### ä¼è©±å±¥æ­´ãä¿æãã¦æèããå¯¾è©±ã«

ã¹ãã·ãDBä»£ããã«ä½¿ããã¦ã¼ã¶ã¼IDãã¨ã«éå»Nä»¶ã®çºè¨ãä¿å­âæ¬¡åã®messagesã«å«ããã

### ç»åå¥åå¯¾å¿ï¼GPT-4oï¼

`event.message.type === 'image'` ã®å ´åãLINEããç»åãåå¾ãã¦base64ã§APIã«éä¿¡ã

## â ï¸ ã³ã¹ãç®¡ç

| ã¢ãã« | 1åãããã³ã¹ãç®å® |
|---|---:|
| gpt-4o-mini | ç´0.01å |
| gpt-4o | ç´0.5å |
| gpt-4-turbo | ç´1ã3å |

å®¶æ3äººã§æ100åãã¤ä½¿ã£ã¦ã**æ30åç¨åº¦**ãOpenAIã®ç®¡çç»é¢ã§**æäºç®ä¸é**ãè¨­å®ãã¦ããã°æ´èµ°é²æ­¢ã§ãã¾ãã

## ããããã¨ã©ã¼

### LINE Webhookæ¤è¨¼ã§ãfailedã

Webhook URLãééã£ã¦ãããã¾ãã¯ãã¢ã¯ã»ã¹ã§ããã¦ã¼ã¶ã¼ããå¿åã¢ã¯ã»ã¹å¯ã«ãªã£ã¦ããªãã

### OpenAIãã 429 Too Many Requests

ç¡ææ ãä½¿ãåã£ãããã¬ã¼ãå¶éãã¯ã¬ã«ç»é²ã¾ãã¯æéãç©ºãã¦åè©¦è¡ã

### è¿ç­ãæ¥ãªã

GASã®å®è¡ã­ã°ãç¢ºèªã`muteHttpExceptions: true` ãå¥ãã¦ããã®ã§ãã¹ãã¼ã¿ã¹ã³ã¼ãã `res.getResponseCode()` ã§ã­ã°åºåããã¨åå ããããã¾ãã

## ã¾ã¨ã

- LINE Developers ã§ãã£ãã«ä½æ â ãã¼ã¯ã³åå¾
- OpenAI APIã­ã¼åå¾ â ã¹ã¯ãªãããã­ããã£ã«ä¿å­
- doPost ã§ LINEâChatGPTâLINE ã®æµããå®è£
- ãæ°ãããã¼ã¸ã§ã³ãããã­ã¤ã§URLåºå®
- gpt-4o-mini ãªãææ°ç¾åã§å®¶æå±æå¯è½

ChatGPTèª²éãç¯ç´ããªãããèªåå°ç¨ã«ã¹ã¿ãã¤ãºBotãæã«å¥ãã¾ãããã­ã³ãããå¤ããã°ãæçã¢ã·ã¹ã¿ã³ãããè±èªå­¦ç¿Botããã³ã¼ãã¬ãã¥ã¼Botããªã©ä½ã§ãä½ãã¾ããã

## é¢é£è¨äº

- [LINE Messaging APIã¨GASé£æºããæç­3ã¹ããã](/blog/gas-line-messaging-api-setup/)
- [GASã§ä½ãLINEè¿ä¿¡Botæå°ã³ã¼ã30è¡](/blog/gas-line-reply-bot/)
- [GAS Webã¢ããªå¬éæç­5ã¹ããã](/blog/gas-webapp-deploy/)
- [Webhookåä¿¡ã§GASå³æå®è¡ããè¨­å®æ¹æ³](/blog/gas-trigger-webhook/)

---

### ãã®è¨äºãæ¸ããäººï¼å

æ±äº¬ã§çè­·å¸«ãããªãããå¯æ¥­ã§Webã¨ã³ã¸ãã¢ããã¦ããåã§ããçæ£ã®äºåä»äºãä¸ã¤ãã¤GASã§èªååãã¦ããçµé¨ããã¨ã«ããéã¨ã³ã¸ãã¢ã§ãèª­ããå®åç®ç·ã®GASè§£èª¬ããã¢ããã¼ã«çºä¿¡ãã¦ãã¾ããèªå¼µãªãã»å®åãã¼ã¹ã§ãä»æ¥ããä½¿ããã¬ã·ãããå±ããã¾ãã
