---
title: "GAS×LINE Messaging API設定ガイド｜最短でBotを動かす手順"
description: "GASからLINEにメッセージを送るための設定を最初から解説。チャネル作成、アクセストークンとユーザーIDの取得、応答設定の落とし穴、push・reply・broadcastの使い分け、無料枠200通の数え方、画像やボタン付きメッセージの送り方までまとめました。"
pubDate: "2026-05-14T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas","line","setup"]
tagNames: ["GAS","LINE","初期設定"]
readingTime: 13
---

2児の母で、現役のナースです。今日は、GASからLINEに通知を送るための**土台の設定**をまとめます。

「毎朝の予定をLINEに送る」「在庫が減ったら知らせる」——こういう仕組みは、どれも同じ土台の上に建っています。ここさえ通しておけば、あとは中身を変えるだけで何本でも作れます。

逆に、ここでつまずくと何も進みません。私自身、最初にトークンの種類を取り違えて2時間溶かしました。同じ穴に落ちないよう、順番どおりに進めます。

## 前提：LINE Notifyは使えません

以前は「LINE Notify」という手軽な仕組みがあり、多くの解説記事がこれを使っていました。**2025年3月31日で提供終了**しています。

古い記事のコード（`https://notify-api.line.me/api/notify` を叩くもの）をコピーしても動きません。今から作るなら **LINE Messaging API** 一択です。

## Step1：チャネルを作る

1. [LINE Developers](https://developers.line.biz/ja/) にLINEアカウントでログイン
2. 「プロバイダー」を新規作成（自分が分かる名前でOK。例：`personal`）
3. そのプロバイダーの中で「**新規チャネル作成**」→ **Messaging API** を選択
4. チャネル名・説明・大業種・小業種・メールアドレスを入力して作成

チャネル名はLINE上での表示名になります。あとから変更できます。

## Step2：3つの値を控える

作ったチャネルの「**Messaging API設定**」タブを開き、次を取得します。

| 名前 | どこにあるか | 何に使うか |
|---|---|---|
| **チャネルアクセストークン（長期）** | Messaging API設定の最下部（発行ボタン） | 送信の認証 |
| **あなたのユーザーID** | 同タブの上部 | 自分宛に送るときの宛先 |
| チャネルシークレット | 「チャネル基本設定」タブ | 署名検証（使わないことも多い） |

**間違えやすい点**：チャネルID（数字）とチャネルシークレットとアクセストークンは全部別物です。送信に使うのは**アクセストークン**です。

### 自分でBotを友だち追加する

同じ画面にQRコードがあります。**必ず自分で友だち追加してください。**友だちでない相手には送信できません。「エラーは出ないのに届かない」の原因の大半がこれです。

## Step3：応答設定を直す

同じ画面の「応答設定」で、次のようにします。

- **応答メッセージ：オフ**（オンだとLINEの定型文が自動で返り、自作の返信と二重になります）
- **あいさつメッセージ：お好みで**
- **Webhook：オン**（返信Botを作る場合。通知を送るだけなら不要）

ここを直さずに「返事が2回くる」と悩む人がとても多いです。

## Step4：トークンをスクリプトプロパティに入れる

GASエディタで「プロジェクトの設定（⚙）」→「スクリプト プロパティ」を開き、登録します。

| プロパティ名 | 値 |
|---|---|
| `LINE_TOKEN` | チャネルアクセストークン（長期） |
| `LINE_USER_ID` | あなたのユーザーID |

**コードに直接書かないでください。**トークンは、知られると自分のBotから勝手に送信されてしまう鍵です。GitHubに上げたコードから漏れる事故も実際に起きています。

## Step5：送ってみる

```javascript
/** 自分宛にメッセージを送る（動作確認用） */
function testPush() {
  pushLine_('テスト送信です。届きましたか？');
}

/** LINEにテキストを送る共通関数 */
function pushLine_(text) {
  const props  = PropertiesService.getScriptProperties();
  const token  = props.getProperty('LINE_TOKEN');
  const userId = props.getProperty('LINE_USER_ID');

  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: String(text).slice(0, 4900) }]
    }),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  if (code !== 200) {
    console.log('送信エラー ' + code + '：' + res.getContentText());
  } else {
    console.log('送信しました');
  }
  return code === 200;
}
```

`testPush` を実行して、初回の権限を許可すれば、LINEに届きます。ここまで通れば土台は完成です。

## 送信方法は4種類ある

用途によって使い分けます。

| 種類 | エンドポイント | 用途 | 無料枠の消費 |
|---|---|---|---|
| **reply** | `/v2/bot/message/reply` | 相手の発言への返信 | **消費しない** |
| **push** | `/v2/bot/message/push` | こちらから任意のタイミングで送る | 消費する |
| multicast | `/v2/bot/message/multicast` | 複数人にまとめて | 人数分消費 |
| broadcast | `/v2/bot/message/broadcast` | 友だち全員へ | 人数分消費 |

**replyは無料枠を消費しません。**これは大きな違いです。返信Botとして使うぶんには、通数を気にする必要がほとんどありません。

replyは相手の発言に付いてくる `replyToken` が必要で、**1回しか使えず、発行から時間が経つと無効**になります。

## 無料枠の数え方

LINE公式アカウントの無料プラン（コミュニケーションプラン）では、**pushできるのは月200通**です。

数え方で誤解しやすいのが「1通」の定義です。

- **1回のAPI呼び出しで3つのメッセージ**を送ると、**3通**として数えられます
- 送信先が5人なら、**5通**（人数分）です

自分1人に毎朝1通なら、月31通。まったく問題ありません。**家族4人に毎朝送ると月124通**で、これでも収まります。ただし「毎朝＋帰宅時＋寝る前」と増やしていくと、あっという間に届かなくなります。

上限に達したときは、こんなエラーが返ります。

```text
The monthly limit of the free plan has been exceeded.
```

翌月になれば自動で回復します。プラン内容は変わることがあるので、最新は[LINEヤフー for Businessの料金ページ](https://www.lycbiz.com/jp/service/line-official-account/plan/)で確認してください。

## テキスト以外も送れる

### 画像

```javascript
function pushImage_(originalUrl, previewUrl) {
  sendMessages_([{
    type: 'image',
    originalContentUrl: originalUrl,   // HTTPS必須・最大10MB
    previewImageUrl: previewUrl        // HTTPS必須・最大1MB
  }]);
}
```

画像は**外部から見えるHTTPSのURL**が必要です。Googleドライブの共有リンクは形式が合わないことが多いので、そのままでは使えない点に注意してください。

### ボタン付きメッセージ（テンプレート）

```javascript
function pushButtons_() {
  sendMessages_([{
    type: 'template',
    altText: '今日のタスク',   // 通知やPCで表示される代替テキスト（必須）
    template: {
      type: 'buttons',
      title: '今日のタスク',
      text: '終わったら押してください',
      actions: [
        { type: 'message', label: '完了', text: '済 タスク1' },
        { type: 'uri',     label: 'シートを開く', uri: 'https://docs.google.com/...' }
      ]
    }
  }]);
}

/** メッセージ配列を送る共通部分 */
function sendMessages_(messages) {
  const props = PropertiesService.getScriptProperties();
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + props.getProperty('LINE_TOKEN') },
    payload: JSON.stringify({ to: props.getProperty('LINE_USER_ID'), messages: messages }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) console.log(res.getContentText());
}
```

`altText` は必須です。忘れると400エラーになります。

## エラーの読み方

`muteHttpExceptions: true` を付けておくと、エラーの中身が読めます。よく出るものは次の3つです。

### 401 Unauthorized

トークンが違います。前後の空白、再発行後に古い値が残っている、チャネルシークレットと取り違えている——このどれかです。

### 400 Bad Request

送信先IDの形式が違うか、メッセージの組み立てが不正です。返ってくるJSONに `message` として理由が書かれているので、そこを読んでください。「property, messages[0].altText is required」のように、どこが足りないか教えてくれます。

### 429 Too Many Requests

短時間に送りすぎです。ループの中で連続送信している場合は、`Utilities.sleep(500)` を挟むか、1通にまとめてください。

## つまずいたら確認する順番

1. **自分でBotを友だち追加したか**（最頻出）
2. トークンは「チャネルアクセストークン（長期）」か
3. 送信先は `U` から始まるユーザーIDか
4. GASの「実行数」画面にエラーが出ていないか
5. 無料枠の200通を超えていないか

この5つで、ほとんどの「届かない」は解決します。

## まとめ

- LINE Notifyは終了。今は **Messaging API**
- 使うのは**チャネルアクセストークン（長期）**と**ユーザーID**の2つ
- **自分でBotを友だち追加**しないと届かない
- 「応答メッセージ」をオフにしないと**返事が二重**になる
- **replyは無料枠を消費しない**。pushは月200通まで
- トークンは**スクリプトプロパティ**へ。コードに直書きしない

土台さえ通れば、あとは送る中身を変えるだけです。次は「毎朝の予定を送る」あたりから作ってみると、効果が実感しやすいと思います。

## 関連記事

- [GASでLINEに毎朝「今日の予定・天気・タスク」を自動通知する仕組み](/blog/gas-line-morning-notification/)
- [GASで作るLINE返信Bot最小コード30行](/blog/gas-line-reply-bot/)
- [毎朝ToDoをLINEに届けるGASリマインダー](/blog/gas-line-reminder-daily/)

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。
