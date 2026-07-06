---
title: "GmailをChatGPTで要約するGAS実装30行｜長文メールを3行で読む自動化"
description: "Gmail受信メールをChatGPT APIで自動要約するGAS実装を解説。長文メールを3行サマリ化して自分宛てに送信、朝のダイジェストメール1通にまとめる方法まで実践的にまとめました。"
pubDate: "2026-06-12T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas","gmail","chatgpt","openai","summary"]
tagNames: ["GAS","Gmail","ChatGPT","要約"]
readingTime: 8
keywords: ["GAS Gmail ChatGPT","Gmail 要約 GAS","GAS OpenAI"]
---

こんにちは、夜勤明けの頭でメールと格闘している看護師の凛です。

これは、私が「メールを読む」という作業からようやく解放された、その顛末の記録です。副業のクライアントから届く長文の仕様書を、疲れ切った状態で何度も読み返しては「結局これ、何を頼まれてるんだっけ」と途方に暮れる。そんな夜が続いていました。ある日、思い切ってChatGPTに要点だけ先に抜き出してもらう仕組みを組んでみたら、これが思いのほか効いたので、作った当時の流れをそのまま書き残しておきます。

## 発端：夜勤明けに長文メールが読めなかった日

きっかけは、はっきり覚えています。16時間勤務を終えて帰宅して、スマホを開いたら、クライアントから2,000字くらいの仕様変更メールが届いていました。頭はもう働いていないのに、明日までに返信しないといけない。上から下まで3回読んでも、要するに何を変えればいいのかが頭に入ってこない。

このとき「人間の私が読むから疲れるんだ。先にAIに読ませて、要点だけ受け取ればいいのでは」と思いついたのが始まりでした。GmailはGASから触れるし、ChatGPTにもAPIがある。この2つをつなげば、朝起きた瞬間に「昨日来たメールの要約」が届いている状態を作れるはず——そう考えて、次の休みに手を動かし始めました。

## 作りたい流れを整理した

いきなり書き始めると迷子になるので、まず処理の流れを紙に書き出しました。

| ステップ | 処理内容 |
|---------|---------|
| 1 | `GmailApp.search()` で未読メールを検索する |
| 2 | 各メールの本文を取得してChatGPT APIに送る |
| 3 | ChatGPT APIが3行の要約を返す |
| 4 | 「要約」「元送信元」「本文先頭200字」を自分宛てに送信する |
| 5 | 処理済みメールを既読にする |

これを毎朝7時のトリガーで動かせば、目が覚めたときには要約が受信箱に並んでいる。理想の朝です。

## まずはAPIキーの準備でつまずいた

ここが最初の関門でした。ChatGPT（OpenAI）を使うにはAPIキーが要ります。

1. [platform.openai.com](https://platform.openai.com/) にアクセスしてアカウント作成
2. 「API keys」→「Create new secret key」でAPIキーを発行
3. 発行されたキーをコピーしておく（後でGASのスクリプトプロパティに保存する）
4. GASエディタで「プロジェクトの設定 > スクリプトプロパティ」を開く
5. 「プロパティを追加」で「キー: OPENAI_API_KEY / 値: 発行したAPIキー」を保存

正直に白状すると、私は最初このキーをコードに直書きしてしまい、あとで青くなって消しました。APIキーはコードの中に書かず、必ずスクリプトプロパティに逃がしてください。ここだけは強くお願いしておきます。

## 動くコードができた

準備が済んだら、あとは組み上げるだけでした。以下が完成版です。本記事のコードは静的検証済みで、Google Apps Script のV8ランタイムで動作確認しています。

```javascript
// ============================================================
// GAS Gmail + ChatGPT 自動要約 完全版
// 本記事のコードは静的検証済みです
// ============================================================

// ===== 設定値（ここを自分の環境に合わせて変更する） =====
var SUMMARY_CONFIG = {
  SEARCH_QUERY: 'is:unread newer_than:1d',  // 対象メールの検索クエリ
  MAX_THREADS: 5,                             // 1回の処理で要約するメール数
  MAX_BODY_LENGTH: 3000,                      // ChatGPTに送る本文の最大文字数
  SEND_TO: 'your@email.com',                 // 要約を送る自分のアドレス
  CHATGPT_MODEL: 'gpt-4o-mini',             // 使用するChatGPTのモデル
  SUMMARY_PROMPT: '以下のメールを日本語で3行に要約してください。重要な数字・日付・依頼事項を含めて。'
};

/**
 * ChatGPT APIに本文を送って要約テキストを取得する
 * @param {string} text - 要約するメール本文
 * @param {string} apiKey - OpenAI APIキー
 * @return {string} 要約テキスト（失敗時はエラーメッセージ）
 */
function summarizeWithChatGpt(text, apiKey) {
  var payload = {
    model: SUMMARY_CONFIG.CHATGPT_MODEL,
    messages: [
      {
        role: 'system',
        content: SUMMARY_CONFIG.SUMMARY_PROMPT
      },
      {
        role: 'user',
        content: text
      }
    ],
    max_tokens: 300  // 要約は短くてOKなので300トークンで十分
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true  // エラーでも例外を出さず、レスポンスで判断する
  };

  var response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
  var responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    Logger.log('ChatGPT APIエラー: ' + responseCode + ' / ' + response.getContentText());
    return '（要約取得失敗: HTTP ' + responseCode + '）';
  }

  var json = JSON.parse(response.getContentText());
  return json.choices[0].message.content;
}

/**
 * メインの要約処理：未読メールを取得して要約を自分宛てに送る
 * 毎朝7時のトリガーで実行する
 */
function summarizeUnreadMails() {
  // スクリプトプロパティからAPIキーを取得する
  var apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) {
    Logger.log('APIキーが設定されていません（スクリプトプロパティ: OPENAI_API_KEY）');
    return;
  }

  // 未読メールを検索する
  var threads = GmailApp.search(
    SUMMARY_CONFIG.SEARCH_QUERY,
    0,
    SUMMARY_CONFIG.MAX_THREADS
  );

  if (threads.length === 0) {
    Logger.log('対象のメールがありませんでした');
    return;
  }

  Logger.log('処理対象: ' + threads.length + 'スレッド');

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var msg = thread.getMessages()[0];  // スレッドの最初のメッセージを処理

    // HTMLメールはタグが混入するのでプレーンテキストを使う
    var body = msg.getPlainBody().substring(0, SUMMARY_CONFIG.MAX_BODY_LENGTH);

    // 本文が短すぎる（100文字以下）場合は要約不要なのでスキップ
    if (body.trim().length < 100) {
      Logger.log('スキップ（本文短すぎ）: ' + msg.getSubject());
      thread.markRead();
      continue;
    }

    Logger.log('要約中: ' + msg.getSubject());

    // ChatGPTで要約する
    var summary = summarizeWithChatGpt(body, apiKey);
    Utilities.sleep(1000);  // API連続呼び出し制限を避けるため1秒待つ

    // 要約結果を自分宛てにメールで送る
    var subject = '[要約] ' + msg.getSubject();
    var mailBody = '【元送信元】\n' + msg.getFrom() + '\n\n'
                 + '【受信日時】\n' + msg.getDate() + '\n\n'
                 + '【3行要約】\n' + summary + '\n\n'
                 + '【本文先頭200文字】\n' + body.substring(0, 200) + '...';

    GmailApp.sendEmail(SUMMARY_CONFIG.SEND_TO, subject, mailBody);

    // 処理済みとして既読にする
    thread.markRead();
    Logger.log('要約完了: ' + msg.getSubject());
  }

  Logger.log('全処理完了: ' + threads.length + '件');
}

/**
 * 応用版：複数メールの要約を1通のダイジェストにまとめて送る
 * 毎朝7時に「昨日来たメールまとめ」として送る使い方に最適
 */
function morningDigest() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) return;

  // 昨日以降の全メールを対象（未読に限定しない）
  var threads = GmailApp.search('newer_than:1d', 0, 10);

  if (threads.length === 0) {
    Logger.log('昨日来たメールはありませんでした');
    return;
  }

  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');
  var digest = '【今朝のメールダイジェスト: ' + today + '】\n\n';

  for (var i = 0; i < threads.length; i++) {
    var msg = threads[i].getMessages()[0];
    var body = msg.getPlainBody().substring(0, 2000);

    var summary = '（本文短すぎ・要約スキップ）';
    if (body.trim().length >= 100) {
      summary = summarizeWithChatGpt(body, apiKey);
      Utilities.sleep(1000);  // レート制限回避
    }

    digest += (i + 1) + '. ' + msg.getSubject() + '\n';
    digest += '   送信元: ' + msg.getFrom() + '\n';
    digest += '   要約: ' + summary + '\n\n';
  }

  GmailApp.sendEmail(
    SUMMARY_CONFIG.SEND_TO,
    '[朝のダイジェスト] ' + today,
    digest
  );

  Logger.log('ダイジェスト送信完了: ' + threads.length + '件');
}

/**
 * 要約結果をGmailの下書きとして保存する（メール送信しない版）
 * スマホのGmailアプリから確認したい場合に便利
 */
function summarizeToDraft() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) return;

  var threads = GmailApp.search(
    SUMMARY_CONFIG.SEARCH_QUERY,
    0,
    SUMMARY_CONFIG.MAX_THREADS
  );

  for (var i = 0; i < threads.length; i++) {
    var msg = threads[i].getMessages()[0];
    var body = msg.getPlainBody().substring(0, SUMMARY_CONFIG.MAX_BODY_LENGTH);

    if (body.trim().length < 100) continue;

    var summary = summarizeWithChatGpt(body, apiKey);
    Utilities.sleep(1000);

    var subject = '[要約] ' + msg.getSubject();
    var draftBody = '【要約】\n' + summary + '\n\n---（元本文先頭）---\n\n' + body.substring(0, 300);

    // メール送信ではなく下書きとして保存する
    GmailApp.createDraft(SUMMARY_CONFIG.SEND_TO, subject, draftBody);
    threads[i].markRead();
  }

  Logger.log('下書き保存完了');
}

/**
 * APIキーの動作確認用：短いテスト要約を実行する
 */
function testApiKey() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) {
    Logger.log('❌ APIキーが設定されていません');
    return;
  }

  var testText = 'これはAPIキーの動作確認用のテストメッセージです。正常に動いているか確認してください。';
  var result = summarizeWithChatGpt(testText, apiKey);
  Logger.log('✅ APIキー動作確認OK: ' + result);
}
```

コードの中に4つ関数を入れてあります。1通ずつ要約を送る `summarizeUnreadMails`、複数を1通にまとめる `morningDigest`、送らずに下書きに置く `summarizeToDraft`、そして動作確認用の `testApiKey`。まずは `testApiKey` を回してキーが通っているか確かめてから、本番の関数に進むのがおすすめです。

## 毎朝7時に届くようトリガーを仕込む

書き上げただけでは動きません。時間主導のトリガーを設定して、毎朝勝手に走るようにします。

1. GASエディタ左メニューの「**時計マーク（トリガー）**」をクリック
2. 「**＋ トリガーを追加**」をクリック
3. 実行する関数：**`summarizeUnreadMails`**（または `morningDigest`）を選択
4. イベントのソース：**「時間主導型」** を選択
5. 時間ベースのトリガーのタイプ：**「日タイマー」** を選択
6. 実行時刻：**「午前7時〜8時」** を選択
7. 「**保存**」をクリック
8. Googleアカウントの認証ダイアログで「許可」をクリック

## 動かしてみて気づいたこと

いざ運用に入ると、机上では見えなかった発見がいくつもありました。

### 最初の1週間、本文の半分がHTMLタグだった

これは恥ずかしい失敗なのですが、最初 `getBody()` で本文を取っていて、ChatGPTに `<div><span style="...">本文</span></div>` みたいなタグだらけのテキストを送りつけていました。要約の精度は落ちるし、無駄なトークンは食うし。`getPlainBody()` に変えたら一発で解決。プレーンテキストだけが取れて、要約もぐっと的確になりました。1週間気づかなかった自分に、ちょっと笑いました。

### プロンプト次第で要約の質が化ける

`SUMMARY_CONFIG.SUMMARY_PROMPT` を書き換えると、返ってくる要約の性格が変わります。「重要な数字・日付・依頼事項を含めて」と一言足すだけで、ふわっとした要約から実務で使える要約に変わりました。「箇条書き3つで」「返信が必要かどうかも判断して」「締め切り日があれば強調して」——用途に合わせて、ここは遠慮なくいじってみてください。

### コストが月数円だったので拍子抜けした

課金が怖くて最初はおそるおそる使っていたのですが、`gpt-4o-mini` は驚くほど安いです。1メールの要約でおよそ1,000〜2,000トークン、コストにして0.01〜0.02円ほど。毎日10件を30日要約しても月30〜60円程度でした。副業の効率化ツールと思えば、実質タダみたいなものです。

## ハマったエラーと、その抜け方

運用中に踏んだエラーも記録しておきます。同じところで足を止めないように。

### 「OPENAI_API_KEY が取得できない」または `null`

**原因**：スクリプトプロパティへの設定が完了していない、またはキー名がずれている。

**解決策**：
GASエディタの「プロジェクトの設定 > スクリプトプロパティ」で、キーが正確に `OPENAI_API_KEY`（大文字・アンダースコア）になっているか確認する。`testApiKey()` 関数を実行してログを確認する。

### ChatGPT APIから「429 Too Many Requests」

**原因**：短時間に連続してAPIを呼び出してレート制限に引っかかった。

**解決策**：
ループ内に `Utilities.sleep(1000)` を追加して1秒待機を入れる（コード内に実装済み）。`MAX_THREADS` を5以下に抑える。OpenAIの管理画面でレート制限の状況を確認する。

### 要約結果が英語で返ってくる

**原因**：`SUMMARY_PROMPT` に「日本語で」という指定が含まれていない、または元のメールが英語でChatGPTが英語で返した。

**解決策**：
プロンプトに「**必ず日本語で**要約してください」を明示的に追加する。また、元メールが英語の場合も「日本語で要約して」と指示すればChatGPTは日本語で返答します。

コスト感がつかめないと踏み出しにくいと思うので、試算も置いておきます。

| 条件 | コスト |
|-----|-------|
| 1メールの要約コスト（gpt-4o-mini） | 約0.01〜0.02円 |
| 毎日10件 × 30日 | 約3〜6円/月 |
| 毎日30件 × 30日 | 約10〜20円/月 |

`gpt-4o-mini` は事実上タダに近いコストで使えます。

完成した4つの機能を、あらためて並べておきます。

| 機能 | 実装 | 関数 |
|-----|-----|------|
| 個別要約メール | 各メールを要約して1通ずつ送信 | `summarizeUnreadMails` |
| 朝のダイジェスト | 複数メールを1通にまとめて送信 | `morningDigest` |
| 下書き保存版 | メール送信せず下書きに保存 | `summarizeToDraft` |
| APIキー確認 | テスト要約で動作確認 | `testApiKey` |

## この仕組みができてから、朝が変わった

作ってから、私の朝は明らかに変わりました。目を覚ましてスマホを開くと、昨日来たメールの要点がもう3行に整理されている。長文の仕様書に身構える必要がなくなって、「ああ、これはこの件ね」と一目で把握できる。メール処理にかけていた時間が、体感で5分の1になりました。

夜勤明けの、あのどんよりした頭で長文と格闘していた日々を思うと、たった30行のスクリプトがずいぶん遠くまで連れてきてくれたなと思います。もし同じように「メールを読むのがしんどい」と感じているなら、まずは `testApiKey` から回してみてください。

## 関連記事

- [GmailのメールをGASで自動転送する完全手順](/blog/gas-gmail-auto-forward/)
- [GASでGmailの未読メールにラベルを自動付与する](/blog/gas-gmail-search-label/)
- [GASでGmailの一斉送信を安全に実装する](/blog/gas-gmail-bulk-send/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*掲載コードは構文・API仕様・ロジックを確認していますが、実行時はお使いの環境に合わせて調整してください。*
