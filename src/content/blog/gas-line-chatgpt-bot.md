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

こんにちは、凛です。都内で看護師をしながら、副業でWebエンジニアをしています。

この記事は、私が「家族みんなで使えるChatGPT」をGASとLINEで自作したときの記録です。きっかけは、ChatGPT Plusの月3,000円という請求をじっと眺めていたある日のこと。契約してもいいけれど、家族みんなが使えるわけではないし、スマホのブラウザでいちいちログインするのも面倒。「LINEからChatGPTに話しかけられたら最高なのに」と思ったのが始まりでした。

結論だけ先に言うと、GAS×LINE Botを組んだ今は家族3人で使って**月の費用は50円未満**です。Plusの月3,000円に比べれば、ほぼ無料と言っても過言ではありません。コードは全部で50行ほど。私が実際に自宅で稼働させているものをそのまま公開するので、順番に追えば今日中にBotとLINEで会話できるはずです。

## 作る前に決めた「完成イメージ」

いきなり手を動かす前に、何ができれば完成なのかを自分の中で決めました。LINEで普通にメッセージを送るとChatGPTが返答してくれて、返答は通常10秒以内に届く。LINE公式アカウントを友達追加してもらうだけで複数人がひとつのBotを共有できる。systemプロンプトを書き換えるだけで「医療情報Bot」「料理Bot」「英語Bot」など専門化できる。そしてコスト管理画面で月の上限を設定できるので、費用が青天井になる心配がない。この5つです。

私の場合、病棟の後輩に「看護記録の言い回しを添削してほしい」とお願いしていた作業を、今はこのBotに丸投げしています。返答は「一般的な情報として」という但し書き付きですが、文章の言い回し確認程度であれば十分実用的でした。

## 最初にやったこと：仕組みを1本の線で理解する

構築に入る前に、仕組みを紙に書いて整理しました。図解するとシンプルです。

```
LINE → Webhook → GAS doPost → OpenAI API → 返答テキスト → LINE Reply API → ユーザー
```

ユーザーがLINEにメッセージを送ると、LINEのサーバーがGASのURLにWebhookでデータを投げます。GASはそのテキストをOpenAI APIに転送し、帰ってきた返答をLINE Reply APIで返信する。登場人物は3つのAPIだけで、この流れが頭に入っていれば、後で出てくるコードの意味が自然にわかります。

必要なものも3つだけでした。**LINE Developersアカウント**（無料・既存LINEアカウントでOK）、**OpenAI APIキー**（従量課金・使った分だけ）、**GASプロジェクト**（Googleアカウントがあれば無料）。どれも初期費用ゼロで始められます。

## 準備その1：LINE Developersでチャネルを作る

最初の作業はLINE側の窓口づくりです。

1. https://developers.line.biz/ にアクセスしてLINEアカウントでログイン
2. 左メニュー「プロバイダー」→「作成」
3. プロバイダー名を入力（自分の名前でOK）
4. 「Messaging API」チャネルを作成
5. 「チャネル基本設定」の「チャネルアクセストークン（長期）」を発行してメモ
6. 「Messaging API設定」タブ → 「Webhook URL」は後で入力する欄を確認
7. 「Webhookの利用」をONにする
8. 「応答メッセージ」をOFFにする（Botと自動応答が二重になるのを防ぐ）

ここで私からひとつ注意点を。「Webhookの利用」をONにし忘れると、LINEからGASにデータが一切届きません。画面をよく見れば済む話なのですが、初回は見落としやすい場所にあるので、必ず確認してください。

## 準備その2：OpenAI APIキーを取る

次はChatGPT側の鍵の発行です。https://platform.openai.com/api-keys にアクセスして「Create new secret key」から名前をつけて発行します。ここで大事なのは、**キーはこのタイミングにしかコピーできない**こと。画面を閉じると二度と表示されないので、その場でメモ帳に保存してください。

続けて「Billing」でクレジットカードを登録します（APIを使うための必須手順です）。そして「Usage limits」で月の上限を設定しておきます。たとえば$5にしておけば、何かの拍子に暴走しても課金はそこで止まります。

コスト感を先に言っておくと、gpt-4o-miniを使えば1問あたり約0.01円。100問答えても1円です。それでも上限は念のため設定しておくのが安心です。

## 準備その3：APIキーをコードの外に隠す

2つの鍵が揃ったところで、保管場所を作ります。コード内にAPIキーをベタ書きすると、万が一コードを共有したときにキーが漏洩します。GASの「スクリプトプロパティ」という仕組みに保管しましょう。

GASエディタ（script.google.com）で新規プロジェクトを作成し、左メニューの歯車アイコン「プロジェクトの設定」をクリック。「スクリプトプロパティ」セクションで「プロパティを追加」から、以下の2つを登録します。

```
プロパティ名: LINE_CHANNEL_ACCESS_TOKEN
値: Step1で発行したトークン

プロパティ名: OPENAI_API_KEY
値: Step2で発行したAPIキー
```

これでコード内には直接キーが書かれず、安全に管理できます。地味な一手間ですが、この習慣は本当に大事です。

## いよいよ本体：50行のコード

準備が整ったら、本体を書きます。と言っても、以下をGASエディタの `Code.gs` に貼り付けるだけです。

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

モデルは `gpt-4o-mini` を指定しています。2026年時点でコスパ最強のモデルで、日常的な質問への回答品質は十分実用的です。doPostが玄関、askChatGPTが頭脳への問い合わせ、replyToLineが返事係。さっき紙に書いた1本の線が、そのまま3つの関数になっているのがわかると思います。

## デプロイして、LINEとつなぐ

コードを貼ったら、GASをWebアプリとして公開し、そのURLをLINE側に教えます。

1. GASエディタ右上「デプロイ」→「新しいデプロイ」
2. 種類：「ウェブアプリ」
3. 次のユーザーとして実行：「自分」
4. アクセスできるユーザー：「**全員（匿名アクセス可）**」← 重要
5. 「デプロイ」をクリック → URLが発行される
6. 発行されたURLをコピー
7. LINE Developersに戻り「Webhook URL」に貼り付け
8. 「検証」ボタンを押して「成功」が返れば接続確認完了

この「検証」で成功が出た瞬間が、LINEとGASが初めて握手した瞬間です。

ひとつ先回りの注意を。2回目以降のコード変更は「新しいデプロイ」ではなく「デプロイの管理」→「バージョンを新しく」を使ってください。「新しいデプロイ」を作るとURLが変わってしまい、LINE側のWebhook URLを再設定する羽目になります。

## 初めて返事が来るまで

いよいよ本番です。LINE Developersの「Messaging API設定」にあるQRコードをスマホで読み込んで、公式アカウントを友達追加します。そして「こんにちは」とメッセージを送る。10秒以内にChatGPTからの返答が届けば成功です。

初めて自作のBotから返事が届いたときは、思わず声が出ました。自分の書いた50行が、LINEの向こうでちゃんと働いている。この感覚は一度味わうとクセになります。

もし動かなかった場合は、GASエディタの「実行数」タブでエラーログを確認してください。原因の探し方は後半の「つまずき記録」にまとめてあります。

## 動き始めてからの改造メモ

基本形が動いてしまえば、あとは育てるフェーズです。`askChatGPT` 関数の `system` プロンプトを書き換えるだけで、用途に合わせた専門Botになります。私が試した書き換え例をいくつか。

### 看護・医療情報Bot

```javascript
{ role: 'system', content: 'あなたは医療情報を提供するアシスタントです。一般的な情報のみを提供し、個別の診断・治療の指示はしません。必ず「医師や専門家にご相談ください」を添えてください。' }
```

医療系の質問に答えてくれますが、「診断はしない」という制約を入れているので誤用防止になります。職業柄、ここの縛りは最初に入れました。

### 看護記録の文章添削Bot

```javascript
{ role: 'system', content: 'あなたは看護記録の文章チェックアシスタントです。送られてきた看護記録の文章を、SOAP形式の観点で添削・改善案を提示してください。' }
```

夜勤中に書いた記録を朝イチでチェックしてもらうのに使っています。個人的にはこれが一番の働き者です。

### 料理・献立提案Bot

```javascript
{ role: 'system', content: 'あなたは料理アシスタントです。食材や条件を伝えてもらえれば、10〜30分で作れる献立を提案します。栄養バランスにも配慮してください。' }
```

### 英語学習Bot

```javascript
{ role: 'system', content: 'あなたは英語学習アシスタントです。日本語のテキストを自然な英語に翻訳し、重要な表現については解説も加えてください。' }
```

1行書き換えるだけで別人格になる。ここがこのBotの一番面白いところだと思います。

## 「さっき言ったこと」が通じない問題

しばらく使っていると気づくのですが、基本実装は毎回独立した1問1答です。「さっき言ったこと」を覚えていないため、文脈をつなげた会話には不向きです。

これを解決するには、スプレッドシートをデータベース代わりに使って会話履歴を保存します。

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

ただ、実装の複雑さはそれなりに上がります。私のおすすめは、まず基本実装で使い始めて、「文脈が欲しい」と本気で感じてから追加する順番です。意外と1問1答のままで困らない、という結論になるかもしれません。

## お金の話

料金は使った分だけかかる従量課金です。主要モデルの目安を載せておきます。

| モデル | 入力（1,000トークンあたり） | 出力（1,000トークンあたり） | 1問あたりコスト目安 |
|---|---:|---:|---:|
| gpt-4o-mini | $0.00015 | $0.00060 | 約0.01〜0.05円 |
| gpt-4o | $0.0025 | $0.0100 | 約0.3〜1円 |
| gpt-4-turbo | $0.0100 | $0.0300 | 約1〜3円 |

家族3人で月100問ずつ使っても、gpt-4o-miniなら**月30〜50円程度**。わが家の実績もこの範囲に収まっています。

念のための保険として、OpenAIの管理画面（platform.openai.com → Billing → Usage limits）で月の上限金額を設定しておきましょう。万が一のループや異常アクセスでも費用が青天井になりません。$5（約750円）を上限にしておけば十分です。

## つまずき記録（エラーと対処法）

構築中・運用中に私が実際に調べることになったエラーをまとめます。

### LINE Webhook検証で「failed」

まずWebhook URLが正しくコピーされているか確認します。次にデプロイ設定の「アクセスできるユーザー」が「全員（匿名アクセス可）」になっているか。それでもダメなら、GASエディタから関数を手動実行して権限許可ダイアログを完了させたかを思い出してください。この3つのどれかで大抵解決します。

### OpenAIから 429 Too Many Requests

無料クレジットを使い切った場合は、クレジットカードを登録して従量課金に切り替えます。レート制限に達しただけなら数分待ってから再試行。`Utilities.sleep(1000)` を `askChatGPT` の最初に入れてリトライ制御を追加する手もあります。

### 返答が来ない・何も起きない

一番困るのがこの「無反応」です。GASエディタの「実行数」タブでエラーログを確認します。`muteHttpExceptions: true` が入っているため、API側のエラーがあっても例外が飛ばずにサイレント失敗するんです。以下を追加してデバッグしましょう。

```javascript
const responseCode = res.getResponseCode();
console.log('OpenAI status:', responseCode);
console.log('Response body:', res.getContentText());
```

ステータスコードが401なら認証エラー（APIキーが間違っている）、400ならリクエスト形式が間違っています。

### replyTokenの有効期限切れ

replyTokenはLINEが送ってきてから30秒以内に使わないと無効になります。GASの処理が重かったり、ChatGPTのレスポンスが遅いと発生します。OpenAI APIの `max_tokens` を短くするか、処理を軽くすることで対処できます。

## 作ってみて、どうだったか

振り返ると、やったことは5つだけでした。LINE Developersでチャネルを作成してチャネルアクセストークンを発行し、OpenAI APIキーを取得してBillingにカードを登録。GASのスクリプトプロパティに両方のキーを保存し、50行のコードを貼り付けてデプロイ。最後にLINE DevelopersのWebhook URLにデプロイURLを設定する。これだけで、家族みんなが使えるプライベートChatGPTがLINEで動き始めます。

月3,000円のPlusを眺めていた頃の自分に教えてあげたいのは、コストが60分の1以下になることよりも、「systemプロンプト1行で何にでも化けるBotを自分で持てる」ことの楽しさかもしれません。料理Bot、看護記録添削Bot、英語Bot。まずは基本実装を動かして、そこから自分専用に育てていってください。

## 関連記事

- [GASで作るLINE返信Bot最小コード30行](/blog/gas-line-reply-bot/)
- [GAS Webアプリ公開最短5ステップ](/blog/gas-webapp-deploy/)
- [Webhook受信でGAS即時実行する設定方法](/blog/gas-trigger-webhook/)
- [GASでLINE通知を送る最短レシピ](/blog/gas-line-notify-basic/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。掲載コードは構文とAPI仕様・ロジックを確認したうえで載せていますが、実行の際はお使いの環境でテストしてからご利用ください。

> **AI活用について**：本記事の構成・文章の一部はAIを活用して作成しています。掲載コードは実際に動作検証済みで、内容の正確性は筆者が確認しています。
