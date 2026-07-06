---
title: "GASからLINEに通知を送る最短レシピ｜Messaging APIでコピペ実装"
description: "GASからLINE Messaging APIで自分のスマホに通知を送る最短実装を、現役ナースの凛が解説。チャネル作成からGASコードまでコピペで動かせます。"
pubDate: "2026-06-01T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "line"
categoryName: "LINE自動化"
tagSlugs: ["gas","line","messaging-api","automation"]
tagNames: ["GAS","LINE","通知","自動化"]
readingTime: 8
keywords: ["GAS LINE 通知","GAS LINE Messaging API","Google Apps Script LINE"]
---

こんにちは、凛です。今日は前置きを短くして、いきなり結論のコードから貼ります。GASで動かした処理の結果を自分のLINEに飛ばすなら、これだけで届きます。

私自身、夜中に動かしているバッチ処理が「ちゃんと動いたのか」をベッドの中から確認したくてこの形に落ち着きました。夜勤明けにわざわざPCを開かなくても、LINEに「終わったよ」の一言が届いていればぐっすり眠れるんですよね。

## 結論：このコードで届きます

```javascript
// LINE Messaging APIで自分にメッセージを送る関数
function sendLine(message) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  const userId = props.getProperty('LINE_USER_ID');

  if (!token || !userId) {
    console.error('[sendLine] トークンまたはユーザーIDが未設定です');
    return;
  }

  const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    payload: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: message }]
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code !== 200) {
    console.error('[sendLine] 送信失敗 ステータス:', code, response.getContentText());
  } else {
    console.log('[sendLine] 送信成功:', message);
  }
}

// 使用例：バッチ処理の完了通知
function myBatchJob() {
  // ... 何らかの処理 ...
  const count = 100; // 処理件数（例）
  sendLine('✅ バッチ完了\n処理件数: ' + count + '件\n' + new Date().toLocaleString('ja-JP'));
}
```

コードは構文とAPI仕様（エンドポイント・ヘッダー・ボディの形式）を照らし合わせて確認したうえで掲載していますが、実行環境での動作保証まではできません。お使いの環境に合わせて調整してください。

### 動かす前に必要な2つの値

このコードは、スクリプトプロパティに保存された「チャネルアクセストークン（長期）」と「自分のユーザーID」を読みに行きます。この2つは LINE Developers でチャネル（Bot）を作ると手に入ります。取得手順はそれなりに画面遷移が多いので、別記事に切り出してあります。まだの方はこちらを先にどうぞ。

→ [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)

取得できたら、GASエディタ左の歯車アイコン「プロジェクトの設定」→「スクリプトプロパティ」→「プロパティを追加」で、次の2つを登録して保存します。

| プロパティ名 | 値 |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developersで発行した長期トークン |
| `LINE_USER_ID` | 自分のユーザーID（Uから始まる文字列） |

これで `sendLine('テスト')` を実行すれば、自分のLINEにメッセージが届くはずです。

## なぜこう書いているのか

コピペで動くとはいえ、「なんでこの書き方なの？」が分かっていると応用が利きます。ポイントを3つに絞って説明させてください。

### なぜLINE Notifyではなく Messaging API なのか

GASからLINEに通知を送る方法として、以前は「LINE Notify」という無料サービスが定番でした。ネットで検索すると今でもNotifyの解説記事がたくさん出てきます。**ただしLINE Notifyは2025年3月末でサービスを終了しています。** 古い記事の手順どおりに進めても、もう動きません。

これから新しく作るなら、LINE公式の**LINE Messaging API**一択です。LINE Developersでチャネル（Bot）を1つ作るだけで使えて、無料プランでも**月200通まで**送信できます。自分への通知用途なら十分な枠ですし、GASからは `UrlFetchApp.fetch` で1回叩くだけ。Notifyでやっていたことは、そのままこちらで置き換えられます。

### なぜトークンをコードに直書きしないのか

チャネルアクセストークンやユーザーIDをコードにそのまま書くのは絶対NGです。スクリプトを誰かに見せたり、コピーして共有したりした瞬間に漏れます。トークンが漏れると、他人があなたのBotから自由にメッセージを送れる状態になってしまいます。

だからこのコードでは、値そのものではなく `PropertiesService` 経由で「名前」で取得する設計にしています。スクリプトプロパティはコードと別枠で保管されるので、コードだけ共有しても秘密は守られます。ひと手間ですが、最初からこの形で書く癖をつけておくのがおすすめです。

### なぜ muteHttpExceptions を付けているのか

`muteHttpExceptions: true` を付けると、APIがエラーを返してもスクリプトが例外で止まらなくなります。夜中の自動実行でクラッシュされると困るので、安全側に倒した設定です。

ただし、これには裏があります。**送信失敗が「黙って」起きるようになる**んです。例外が飛ばない代わりに、失敗しても何事もなかったかのように処理が進む。だからこそ、レスポンスコードを確認して200以外ならログに残す処理をセットで入れています。ここを省くと「実は先週から届いていなかった」に後で気づくことになります。私はレスポンスチェックだけは削らないと決めています。

## 普段使っている形をいくつか

`sendLine` さえ作ってしまえば、あとは呼び出し方の工夫だけです。実際に使い勝手のよかったパターンを載せておきます。

### 毎朝のおはようメッセージ

```javascript
function morningMessage() {
  const now = new Date();
  const dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'M月d日(E)');
  sendLine('☀️ おはようございます\n' + dateStr + 'のGASが起動しました');
}
```

時間主導トリガーで毎朝7時に設定すれば、GASが動いているかの生存確認にもなります。届かない朝があったら、何かが止まっているサインです。

### エラー発生時の緊急通知

```javascript
function safeBatch() {
  try {
    // メイン処理
    runMainProcess();
  } catch (e) {
    sendLine('🚨 エラー発生\n' + e.message);
    console.error(e);
  }
}
```

夜勤中にエラーが起きても、休憩でスマホを見たときに気づけます。

### スプレッドシート更新完了通知

```javascript
function updateSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  // ... シート更新処理 ...
  const rows = sheet.getLastRow();
  sendLine('📊 シート更新完了\n最終行: ' + rows + '行');
}
```

ひとつ注意点があるとすれば、通知の出しすぎです。GASが実行されるたびにLINEが鳴ると、数日で通知疲れします。しかも無料プランは月200通の上限つき。完了通知は「処理が終わったとき1回だけ」、あるいはエラーのときだけに絞る設計が長続きします。毎朝7時の通知で月30通、エラー・完了通知で数十通、くらいの配分に収めておくと安心です。上限を超えるとその月は追加のメッセージが送られなくなります（課金プランにすれば増やせます）。当月の送信数は LINE Official Account Manager の管理画面で確認できますよ。

## 友だち全員に送りたくなったら

今回使ったPush API（`/push`）は「特定の相手1人」に送る仕組みです。Botを友だち追加してくれた人**全員**に一斉送信したい場合は、Broadcast API（`/broadcast`）という別の口を使います。用途が変わるので、こちらも別記事にまとめています。

→ [GASでLINE公式アカウントから一斉配信する方法](/blog/gas-line-broadcast/)

## ハマりどころ3つ

私がセットアップ手順を人に説明していて、質問が集中するのはこの3点です。

### ユーザーIDが分からない

一番多いつまずきがこれ。Push APIに必要な「ユーザーID」は**Uから始まる文字列**で、LINEのプロフィールに表示される名前やID（@で始まるもの）とはまったくの別物です。自分で探しても見つかりません。Webhookで自分がBotに話しかけたときのログから取得します。手順は[セットアップ記事](/blog/gas-line-messaging-api-setup/)に書いてあります。

### Botを友だち追加していない

チャネルを作ってトークンも取った、コードも書いた、なのに届かない——という場合、Botを友だち追加し忘れていることが結構あります。LINE Developersの「Messaging API設定」タブに表示されるQRコードを自分のLINEで読み取って、**友だち追加**しておいてください。追加していない相手には届きません。

### 月200通の上限に到達

無料プランの上限200通を超えると、その月はメッセージが送られなくなります。エラーも出ないので、静かに止まって見えるのが厄介なところ。管理画面で当月の送信数を確認しつつ、通知の頻度を見直すか、必要なら課金プランを検討してください。

## 最後に

自分のスマホに「終わったよ」が届くだけで、GASの自動化はぐっと生活に馴染みます。私はこれを「副業の秘書」と呼んでいます。大げさなものを最初から作る必要はなくて、完了通知1本からで十分。そこから「エラーのときだけ」「毎朝の定期便」と育てていくのが楽しいところです。

## 関連記事

- [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)
- [GASで毎朝天気予報をLINEに届ける](/blog/gas-line-weather-notify/)
- [GASで毎朝ToDoをLINEに届けるリマインダー](/blog/gas-line-reminder-daily/)
- [GASでLINE公式アカウントから一斉配信する方法](/blog/gas-line-broadcast/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。掲載コードは構文とAPI仕様を照合して確認していますが、実行環境での動作はご自身でご確認ください。LINE Messaging APIの仕様・料金プランは公式サイトで最新情報をご確認ください。
