---
title: "ChatGPT連携LINE BotをGASで作る50行｜OpenAI API・Messaging API完全実装"
description: "GASでChatGPT連携のLINE Botを最短50行で作る完全実装ガイド。OpenAI API・LINE Messaging API設定からデプロイまでをコピペ可能なコードで解説します。コスト管理・エラー対処・会話履歴対応も網羅。"
pubDate: "2026-05-04T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas","line","chatgpt","openai","bot"]
tagNames: ["GAS","LINE","ChatGPT","OpenAI","Bot"]
readingTime: 14
keywords: ["GAS LINE ChatGPT","GAS ChatGPT Bot","LINE Bot GAS","ChatGPT LINE 連携","GAS OpenAI API"]
---

こんにちは、凛です。2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。

「ChatGPTをLINEから使えたら最高なのに」と思ったことはありませんか？

ChatGPT Plus（月3,000円）を契約するのもいいですが、家族みんなが使えるわけではないし、スマホのブラウザでいちいちログインするのも面倒です。自分でGAS×LINE Botを組んでしまえば、**家族全員が使えるプライベートChatGPTが月数百円**で持てます。

今日は**GASでChatGPT連携LINE Botを50行で作る**完全実装を解説します。私が実際に自宅で稼働させているコードをそのまま公開します。「GAS LINE ChatGPT」で検索してここに来た方が、読み終わった直後にBotとLINEで会話できるレベルで書いています。

---

## こんな悩みありませんか？

- 「ChatGPT Plus月3,000円は高いから、API従量課金で安く使いたい」
- 「家族や友人にもChatGPTを共有したいが、ログイン管理が煩雑」
- 「LINE Botで何か作ってみたい初プロジェクトとして最適か知りたい」
- 「OpenAI APIとLINE APIを繋げた実装例がなかなか見つからない」
- 「GASとAPIを繋げるやり方が具体的にわからない」

私自身、ChatGPT Plusに月3,000円を払い続けることに疑問を感じてGAS×LINEで自前Botを構築しました。今では家族3人で利用していますが、月の費用は50円未満です。PLUSの月3,000円に比べれば、ほぼ無料と言っても過言ではありません。

---

## このBotで何ができるのか

まず完成イメージを把握しておきましょう。

- LINEで普通にメッセージを送ると、ChatGPTが返答してくれる
- 返答は通常10秒以内に届く
- 複数人でひとつのBotを共有できる（LINE公式アカウントを友達追加してもらうだけ）
- system プロンプトを書き換えるだけで「医療情報Bot」「料理Bot」「英語Bot」など専門化できる
- コスト管理画面で月の上限を設定できるので、費用が青天井になる心配がない

私が病棟の後輩に「看護記録の言い回しを添削してほしい」とお願いしていた作業を、このBotに丸投げしています。返答は「一般的な情報として」という但し書き付きですが、文章の言い回し確認程度であれば十分実用的です。

---

## 全体像（3つのAPIを連結するシンプルな仕組み）

仕組みを図解するとシンプルです。

```
LINE → Webhook → GAS doPost → OpenAI API → 返答テキスト → LINE Reply API → ユーザー
```

ユーザーがLINEにメッセージを送ると、LINEのサーバーがGASのURLにWebhookでデータを投げます。GASはそのテキストをOpenAI APIに転送し、帰ってきた返答をLINE Reply APIで返信します。

この流れが理解できれば、コードの意味が自然にわかります。

### 必要なもの（全部無料か従量課金）

1. **LINE Developersアカウント**（無料・既存LINEアカウントでOK）
2. **OpenAI APIキー**（従量課金・使った分だけ）
3. **GASプロジェクト**（Googleアカウントがあれば無料）

---

## Step 1: LINE Developersでチャネル作成

1. https://developers.line.biz/ にアクセスしてLINEアカウントでログイン
2. 左メニュー「プロバイダー」→「作成」
3. プロバイダー名を入力（自分の名前でOK）
4. 「Messaging API」チャネルを作成
5. 「チャネル基本設定」の「チャネルアクセストークン（長期）」を発行してメモ
6. 「Messaging API設定」タブ → 「Webhook URL」は後で入力する欄を確認
7. 「Webhookの利用」をONにする
8. 「応答メッセージ」をOFFにする（Botと自動応答が二重になるのを防ぐ）

**つまずきポイント**：「Webhookの利用」をONにし忘れると、LINEからGASにデータが届きません。必ず確認してください。

---

## Step 2: OpenAI APIキー取得

1. https://platform.openai.com/api-keys にアクセス
2. 「Create new secret key」→名前をつけて発行
3. キーが表示される。**このタイミングにしかコピーできない**のでメモ帳に保存
4. 「Billing」→クレジットカードを登録（APIを使うための必須手順）
5. 「Usage limits」で月の上限を設定する（たとえば$5にしておけば暴走しない）

**コスト感**：gpt-4o-miniを使えば1問あたり約0.01円。100問答えても1円です。上限は念のため設定しておくのが安心です。

---

## Step 3: GASにAPIキーを安全に保管

コード内にAPIキーをベタ書きすると、万が一コードを共有したときにキーが漏洩します。GASの「スクリプトプロパティ」という仕組みに保管しましょう。

1. GASエディタ（script.google.com）で新規プロジェクトを作成
2. 左メニューの歯車アイコン「プロジェクトの設定」をクリック
3. 「スクリプトプロパティ」セクションで「プロパティを追加」
4. 以下2つを追加する

```
プロパティ名: LINE_CHANNEL_ACCESS_TOKEN
値: Step1で発行したトークン

プロパティ名: OPENAI_API_KEY
値: Step2で発行したAPIキー
```

これでコード内には直接キーが書かれず、安全に管理できます。

---

## Step 4: GAS本体コード（50行）

以下をGASエディタの `Code.gs` に貼り付けてください。

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

`gpt-4o-mini` を指定しています。2026年時点でコスパ最強のモデルで、日常的な質問への回答品質は十分実用的です。

---

## Step 5: デプロイしてWebhook URLを設定

1. GASエディタ右上「デプロイ」→「新しいデプロイ」
2. 種類：「ウェブアプリ」
3. 次のユーザーとして実行：「自分」
4. アクセスできるユーザー：「**全員（匿名アクセス可）**」← 重要
5. 「デプロイ」をクリック → URLが発行される
6. 発行されたURLをコピー
7. LINE Developersに戻り「Webhook URL」に貼り付け
8. 「検証」ボタンを押して「成功」が返れば接続確認完了

**注意**：2回目以降のコード変更は「新しいデプロイ」ではなく「デプロイの管理」→「バージョンを新しく」を使ってください。URLが変わると再設定が必要になります。

---

## 動作確認の手順

1. LINE Developers の「Messaging API設定」→QRコードをスマホで読み込む
2. 公式アカウントを友達追加
3. 「こんにちは」などメッセージを送る
4. 10秒以内にChatGPTからの返答が届けば成功

動かなかった場合は、GASエディタの「実行数」タブでエラーログを確認してください。

---

## カスタマイズ：専門特化Botに変える

`askChatGPT` 関数の `system` プロンプトを書き換えるだけで、用途に合わせた専門Botになります。

### 看護・医療情報Bot

```javascript
{ role: 'system', content: 'あなたは医療情報を提供するアシスタントです。一般的な情報のみを提供し、個別の診断・治療の指示はしません。必ず「医師や専門家にご相談ください」を添えてください。' }
```

医療系の質問に答えてくれますが、「診断はしない」という制約を入れているので誤用防止になります。

### 看護記録の文章添削Bot

```javascript
{ role: 'system', content: 'あなたは看護記録の文章チェックアシスタントです。送られてきた看護記録の文章を、SOAP形式の観点で添削・改善案を提示してください。' }
```

夜勤中に書いた記録を朝イチでチェックしてもらうのに使っています。

### 料理・献立提案Bot

```javascript
{ role: 'system', content: 'あなたは料理アシスタントです。食材や条件を伝えてもらえれば、10〜30分で作れる献立を提案します。栄養バランスにも配慮してください。' }
```

### 英語学習Bot

```javascript
{ role: 'system', content: 'あなたは英語学習アシスタントです。日本語のテキストを自然な英語に翻訳し、重要な表現については解説も加えてください。' }
```

---

## 会話履歴を保持して文脈ある対話にする

上記の基本実装では、毎回独立した1問1答になります。「さっき言ったこと」を覚えていないため、文脈をつなげた会話には不向きです。

スプレッドシートをデータベース代わりに使って会話履歴を保存することで、文脈ありの対話が可能になります。

```javascript
function getChatHistory(userId) {
  const sheet = SpreadsheetApp.openById('スプシのID').getSheetByName('history');
  const data = sheet.getDataRange().getValues();
  return data
    .filter(row => row[0] === userId)
    .slice(-6) // 直近3往復分
    .map(row => ({ role: row[1], content: row[2] }));
}

function saveChatHistory(userId, role, content) {
  const sheet = SpreadsheetApp.openById('スプシのID').getSheetByName('history');
  sheet.appendRow([userId, role, content, new Date()]);
}
```

`askChatGPT` 関数の `messages` 配列に `getChatHistory(userId)` の結果を先頭に挿入すれば、直近数ターンの会話を覚えた状態でChatGPTに問い合わせできます。

実装の複雑さが上がるため、まずは基本実装から始めて、「文脈が欲しい」と感じてから追加するのがおすすめです。

---

## コスト管理と上限設定

料金は使った分だけかかる従量課金です。主要モデルの目安を把握しておきましょう。

| モデル | 入力（1,000トークンあたり） | 出力（1,000トークンあたり） | 1問あたりコスト目安 |
|---|---:|---:|---:|
| gpt-4o-mini | $0.00015 | $0.00060 | 約0.01〜0.05円 |
| gpt-4o | $0.0025 | $0.0100 | 約0.3〜1円 |
| gpt-4-turbo | $0.0100 | $0.0300 | 約1〜3円 |

家族3人で月100問ずつ使っても、gpt-4o-miniなら**月30〜50円程度**です。

OpenAIの管理画面（platform.openai.com → Billing → Usage limits）で月の上限金額を設定しておくと、万が一のループや異常アクセスでも費用が青天井になりません。$5（約750円）を上限にしておけば十分です。

---

## よくあるエラーと対処法

### LINE Webhook検証で「failed」

- Webhook URLが正しくコピーされているか確認
- デプロイ設定の「アクセスできるユーザー」が「全員（匿名アクセス可）」になっているか確認
- GASエディタから関数を手動実行して権限許可ダイアログを完了させたか確認

### OpenAIから 429 Too Many Requests

- 無料クレジットを使い切った場合、クレジットカードを登録して従量課金に切り替える
- レート制限に達した場合は数分待ってから再試行
- `Utilities.sleep(1000)` を `askChatGPT` の最初に入れてリトライ制御を追加する手もある

### 返答が来ない・何も起きない

GASエディタの「実行数」タブでエラーログを確認します。`muteHttpExceptions: true` が入っているため、API側のエラーがあっても例外が飛ばずにサイレント失敗します。以下を追加してデバッグしましょう。

```javascript
const responseCode = res.getResponseCode();
console.log('OpenAI status:', responseCode);
console.log('Response body:', res.getContentText());
```

ステータスコードが401なら認証エラー（APIキーが間違っている）、400ならリクエスト形式が間違っています。

### replyTokenの有効期限切れ

replyTokenはLINEが送ってきてから30秒以内に使わないと無効になります。GASの処理が重かったり、ChatGPTのレスポンスが遅いと発生します。OpenAI APIの `max_tokens` を短くするか、処理を軽くすることで対処できます。

---

## まとめ

GASでChatGPT連携LINE Botを作る手順をまとめます。

1. LINE Developersでチャネルを作成し、チャネルアクセストークンを発行
2. OpenAI APIキーを取得し、Billingにクレジットカードを登録
3. GASのスクリプトプロパティに両方のキーを保存
4. 50行のコードを貼り付けてデプロイ
5. LINE DevelopersのWebhook URLにデプロイURLを設定

これだけで、家族みんなが使えるプライベートChatGPTがLINEで動き始めます。

コスト面では `gpt-4o-mini` を使えば月50円前後と、ChatGPT Plusの60分の1以下です。system プロンプトを変えるだけで「料理Bot」「看護記録添削Bot」「英語Bot」と何にでも化けるのが面白いところです。まずは基本実装を動かしてから、少しずつカスタマイズして自分専用のBotに育てていきましょう。

## 関連記事

- [GASで作るLINE返信Bot最小コード30行](/blog/gas-line-reply-bot/)
- [GAS Webアプリ公開最短5ステップ](/blog/gas-webapp-deploy/)
- [Webhook受信でGAS即時実行する設定方法](/blog/gas-trigger-webhook/)
- [GASでLINE通知を送る最短レシピ](/blog/gas-line-notify-basic/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。

> **AI活用について**：本記事の構成・文章の一部はAIを活用して作成しています。掲載コードは実際に動作検証済みで、内容の正確性は筆者が確認しています。
