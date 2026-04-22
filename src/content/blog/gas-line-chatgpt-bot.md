---
title: "ChatGPT連携LINE BotをGASで作る50行｜OpenAI API・Messaging API完全実装"
description: "GASでChatGPT連携のLINE Botを最短50行で作る完全実装ガイド。OpenAI API・LINE Messaging API設定からデプロイまでを看護師×副業Webエンジニアの凛がコピペ可能なコードで解説します。"
pubDate: "2026-05-04T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas","line","chatgpt","openai","bot"]
tagNames: ["GAS","LINE","ChatGPT","OpenAI","Bot"]
readingTime: 11
keywords: ["GAS LINE ChatGPT","GAS ChatGPT Bot","LINE Bot GAS","ChatGPT LINE 連携"]
---

こんにちは、凛です。都内で看護師をしながら、副業でWebエンジニアをしています。「ChatGPTをLINEから手軽に使いたい」というのは2025年来ずっと需要が高いテーマ。今日は**GASでChatGPT連携LINE Botを50行で作る**完全実装を解説します。

「GAS LINE ChatGPT」で検索してここに来た方が、読み終わった直後にBotとLINEで会話できるレベルで書いています。

## こんな悩みありませんか？

- 「ChatGPT Plus月3000円は高いから、API従量課金で安く使いたい」
- 「家族や友人にもChatGPT共有したいけど、ログイン管理が面倒」
- 「LINE Botで何か作ってみたい初プロジェクトに最適」
- 「OpenAI APIとLINE APIを繋げる例が少ない」

私もChatGPT Plusに月3000円払うのが惜しくなり、自前BotをGASで構築。月数百円で家族みんなで使えてます。

## 全体像（3つのAPIを連結）

```
LINE → Webhook → GAS doPost → OpenAI API → 返答テキスト → LINE Reply API → ユーザー
```

必要なもの：
1. **LINE Developers アカウント**（無料）
2. **OpenAI APIキー**（従量課金、月数百円〜）
3. **GASプロジェクト**

## Step 1: LINE Developers でチャネル作成

1. https://developers.line.biz/ にログイン
2. プロバイダ作成 → Messaging APIチャネル新規作成
3. 「**チャネルアクセストークン**」を発行（後で使う）
4. 「Webhook URL」設定（後でGASのURLを入れる）
5. 「Webhookの利用」ON、「応答メッセージ」OFF

## Step 2: OpenAI APIキー取得

1. https://platform.openai.com/api-keys にログイン
2. Create new secret key → 名前付けて発行
3. **キーは1度しか表示されない**のでメモ
4. 課金設定（クレジットカード登録）必須

## Step 3: GASに環境変数を設定

GASエディタ → プロジェクトの設定 → スクリプトプロパティ で以下追加：

```
LINE_CHANNEL_ACCESS_TOKEN: <Step1で発行したトークン>
OPENAI_API_KEY: <Step2で発行したキー>
```

これでコード内に直書きせずに済みます（GitHub漏洩対策）。

## Step 4: GAS本体コード（50行）

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

  // ChatGPT API呼び出し
  const aiReply = askChatGPT(userMessage);

  // LINEに返信
  replyToLine(replyToken, aiReply);

  return ContentService.createTextOutput('OK');
}

function askChatGPT(prompt) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: 'gpt-4o-mini',  // コスパ最強モデル
    messages: [
      { role: 'system', content: 'あなたは親切なアシスタントです。簡潔に日本語で答えてください。' },
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
    payload: JSON.stringify(payload)
  });
}
```

これで50行で完結。`gpt-4o-mini` を指定しているので**1問あたり0.01円程度**です。

## Step 5: デプロイ＆Webhook URL設定

1. GASエディタで「**デプロイ**」→「**新しいデプロイ**」→ ウェブアプリ
2. アクセスできるユーザー: **全員（匿名アクセス可）**
3. 発行されたURLをコピー
4. LINE Developers の Webhook URL に貼る
5. 「検証」ボタンで疎通確認

## 動作確認

LINE公式アカウントを友達追加して、メッセージを送る。10秒以内にChatGPTからの返答が返ってきます。

## カスタマイズアイデア

### system プロンプトを変えて専門Bot化

```javascript
{ role: 'system', content: 'あなたは看護師向けの医療情報アシスタントです。一般的な医療情報のみ提供し、診断はしません。' }
```

### 会話履歴を保持して文脈ある対話に

スプシをDB代わりに使い、ユーザーIDごとに過去N件の発言を保存→次回のmessagesに含める。

### 画像入力対応（GPT-4o）

`event.message.type === 'image'` の場合、LINEから画像を取得してbase64でAPIに送信。

## ⚠️ コスト管理

| モデル | 1問あたりコスト目安 |
|---|---:|
| gpt-4o-mini | 約0.01円 |
| gpt-4o | 約0.5円 |
| gpt-4-turbo | 約1〜3円 |

家族3人で月100問ずつ使っても**月30円程度**。OpenAIの管理画面で**月予算上限**を設定しておけば暴走防止できます。

## よくあるエラー

### LINE Webhook検証で「failed」

Webhook URLが間違っている、または「アクセスできるユーザー」が匿名アクセス可になっていない。

### OpenAIから 429 Too Many Requests

無料枠を使い切ったか、レート制限。クレカ登録または時間を空けて再試行。

### 返答が来ない

GASの実行ログを確認。`muteHttpExceptions: true` を入れているので、ステータスコードを `res.getResponseCode()` でログ出力すると原因がわかります。

## まとめ

- LINE Developers でチャネル作成 → トークン取得
- OpenAI APIキー取得 → スクリプトプロパティに保存
- doPost で LINE→ChatGPT→LINE の流れを実装
- 「新しいバージョン」デプロイでURL固定
- gpt-4o-mini なら月数百円で家族共有可能

ChatGPT課金を節約しながら、自分専用カスタマイズBotが手に入ります。プロンプトを変えれば「料理アシスタント」「英語学習Bot」「コードレビューBot」など何でも作れますよ。

## 関連記事

- [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)
- [GASで作るLINE返信Bot最小コード30行](/blog/gas-line-reply-bot/)
- [GAS Webアプリ公開最短5ステップ](/blog/gas-webapp-deploy/)
- [Webhook受信でGAS即時実行する設定方法](/blog/gas-trigger-webhook/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
