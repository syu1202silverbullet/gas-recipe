---
title: "トリガー失敗時に自動エラーメール通知GAS｜try-catch + 通知の実装パターン"
description: "GASのトリガー実行が失敗した時、自動でエラーメールを自分に送る実装を凛が解説。try-catchでエラー捕捉→Gmail送信、Slack通知、エラーログ記録までカバーします。"
pubDate: "2026-06-09T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","trigger","error","notification"]
tagNames: ["GAS","トリガー","エラー","通知"]
readingTime: 5
keywords: ["GAS トリガー エラー メール","GAS エラー通知","GAS try catch"]
---

こんにちは、凛です。看護師の仕事の傍ら、GASで業務の自動化をいくつも組んでいます。

今日は、私が一度やらかした失敗の話から始めさせてください。副業のクライアント向けに、毎週レポートを自動送信するGASを組んでいた時期がありました。設定してしまえばあとは放置でいい——そう思って安心しきっていたのですが、ある日クライアントから「最近レポート届いてないよ」と連絡が来て、血の気が引きました。確認したら、なんと2週間も前からトリガーが失敗して止まっていたんです。

止まっていたこと自体より、「2週間気づかなかった」という事実のほうがこたえました。GASの実行ログを毎日開いて確認するなんて、正直やっていられません。夜勤明けの朝はそんな余裕はないですし。動いているつもりで実は止まっている——自動化の一番怖いところがまさにこれだと、身をもって知りました。

## なぜ止まったことに気づけなかったのか

原因はシンプルで、「失敗したときに何も起きない」設計になっていたからです。

GASのトリガーは、処理の途中でエラーが出ると、そこで静かに止まります。エラーはGAS側のログには残るのですが、こちらから見に行かないかぎり誰も教えてくれません。成功しても失敗しても、私のスマホには何の通知も来ない。だから「動いているだろう」という思い込みだけが残り続けていたわけです。

自動化の目的は「放っておいても動く」ことにありますが、それと同じくらい「放っておいても、止まったら気づける」ことが大事なんだと、このとき痛感しました。この2つがそろって、はじめて自動化は完成すると思っています。

## 解決策：エラーが出たら自分にメールを飛ばす

やったことは拍子抜けするほど単純で、処理を `try-catch` で囲って、`catch` に入ったら自分宛にメールを送るだけです。

```javascript
function myTriggerFunction() {
  try {
    // 本来の処理
    doRealWork();
  } catch (e) {
    notifyError(e, 'myTriggerFunction');
    throw e; // 再スロー（GAS側のログにも残す）
  }
}

function notifyError(error, funcName) {
  const subject = `[GASエラー] ${funcName}`;
  const body = `
時刻: ${new Date().toLocaleString('ja-JP')}
関数: ${funcName}
エラー: ${error.message}

スタックトレース:
${error.stack}
  `;
  GmailApp.sendEmail('your@email.com', subject, body);
}
```

これでエラーが起きた瞬間に、スマホにメールが届きます。夜勤中に処理が転んでも、休憩時間にスマホを見て「あ、止まってる」とすぐわかる。あの2週間の悪夢はもう繰り返さずに済むようになりました。

### 全部の関数に同じ仕掛けを入れたい

トリガーに登録する関数が増えてくると、一つひとつに `try-catch` を書くのが面倒になってきます。そんなときは、既存の関数を包んでくれるラッパーを一つ用意しておくと楽です。

```javascript
function withErrorNotify(fn, name) {
  return function() {
    try {
      return fn.apply(this, arguments);
    } catch (e) {
      notifyError(e, name);
      throw e;
    }
  };
}

// 使い方
const safeMyTask = withErrorNotify(myTask, 'myTask');
// トリガーには safeMyTask を登録
```

トリガーには、元の関数ではなく、包んだあとの `safeMyTask` のほうを登録します。これで、新しいタスクを追加するたびに `try-catch` を書き忘れる、という事故がなくなります。

### チームで運用するならSlackのほうが見落としにくい

一人で使うぶんにはメールで十分ですが、チームで運用しているなら、Slackに飛ばすほうが誰かの目に留まりやすいです。

```javascript
function notifyErrorSlack(error, funcName) {
  const SLACK_WEBHOOK = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK');
  const payload = {
    text: `🚨 *GASエラー: ${funcName}*\n${error.message}\n\`\`\`${error.stack}\`\`\``
  };
  UrlFetchApp.fetch(SLACK_WEBHOOK, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}
```

Slack Incoming Webhookのを使うパターンです。Webhook URLはコードに直書きせず、スクリプトプロパティに入れておきましょう。

### スプシにも履歴を残しておくと後で効く

メール通知に加えて、エラーの内容をスプレッドシートに記録しておくと、あとから振り返るときに便利です。

```javascript
function logError(error, funcName) {
  const sheet = SpreadsheetApp.openById('LOG_SHEET_ID').getSheetByName('errors');
  sheet.appendRow([new Date(), funcName, error.message, error.stack]);
}
```

メールは「今すぐ気づく」ため、スプシは「あとで傾向を見る」ため。この二段構えにしておくと、運用が一気に安定します。

## 運用してみて分かったコツ

仕込んでからしばらく運用するうちに、「これはやっておいてよかった」と思ったポイントがいくつかあります。

### 短い関数ほどtry-catchを省略したくなる、でも省略しない

エラーが起きるのは、たいてい「この関数はシンプルだから大丈夫だろう」と油断した場所です。経験上、`try-catch` を省きたくなるのは決まってコードが数行しかない関数のときなのですが、短くてもエラーは平気で起きます。もう考えるのをやめて、トリガーに登録する関数には例外なく全部入れる——そう習慣にしてしまうのが一番ラクでした。

### メールには関数名・エラーメッセージ・時刻を必ず入れる

`error.message` と `error.stack` を本文に入れておくと、原因の特定が一瞬で済みます。件名に「GASエラー」と決まった文字を入れておけば、Gmailの検索で過去のエラー履歴をまとめて追えるのも地味に助かります。`label:エラー` のフィルタを作っておくと、さらに管理がしやすいですよ。

タイムスタンプも忘れずに。「いつ起きたのか」がわかると、何時のトリガー実行でこけたのかを追いかけられます。

### 1ヶ月分のログを眺めると根本原因が見えてくる

スプシに `日時 / 関数名 / エラー内容` を貯めていくと、しばらく経ってから面白いことに気づきます。特定の曜日や時間帯にエラーが集中していたり、ある日を境に急に増えていたり。それが「外部APIが落ちやすい時間帯」だったり「先方がデータの形式を変えた日」だったりするわけです。私はこのログのおかげで、クライアント側のシステム改修のタイミングを事前に察知できたことがありました。

## ハマりやすいところ

いざ運用に入ると、通知の仕組みそのものが原因でつまずくこともあります。私が実際に踏んだ落とし穴を3つ挙げておきます。

### メール送信枠を一気に使い切ってしまう

MailAppは1日100件までしか送れません。無限ループやデータ件数の多い処理でエラーが連発すると、1分間に何十通もエラーメールが飛んで、あっという間に送信枠を食い潰します。そうなると本当に送りたいメールも送れなくなる。

これを防ぐには、「一度通知したら、しばらくは黙る」というクールダウンを入れておきます。

```javascript
const props = PropertiesService.getScriptProperties();
const lastNotified = props.getProperty('lastErrorNotified');
const now = new Date().getTime();
// 1時間以内に通知済みならスキップ
if (lastNotified && now - Number(lastNotified) < 3600000) return;
props.setProperty('lastErrorNotified', String(now));
```

これを入れておくだけで、同じエラーで受信箱が埋め尽くされる悲劇を避けられます。

### catchの中でさらにエラーが起きる

通知メールを送ろうとした瞬間に、また別のエラーが起きることがあります。たとえば送信上限に達している状態でエラーメールを送ろうとすると、当然そこでもエラーになる。そうなると `notifyError` 自体が転んで、肝心のメイン処理のエラーが握りつぶされてしまいます。

```javascript
try {
  GmailApp.sendEmail(email, subject, body);
} catch (mailErr) {
  console.error('エラーメール送信に失敗:', mailErr.message);
}
```

通知処理も `try-catch` で二重に守っておく。地味ですが、いざというときにこの安全装置が効いてきます。

### throw e を忘れるとGASのログに残らない

これは私も最初やってしまったのですが、`catch` の中でメールだけ送って `throw e` を書かずに終わらせると、GASの実行履歴の上では「正常終了」に見えてしまいます。あとから「あの日の実行、結局どうだったんだっけ」と確認したいときに困るので、通知したうえで必ず再スローしておきましょう。

```javascript
catch (e) {
  notifyError(e, 'funcName');
  throw e; // これを忘れない
}
```

通知方法は、用途に応じて選んでください。私の場合は個人の副業なのでGmailとスプシの二段構えに落ち着きましたが、目安はこんな感じです。

| 通知方法 | 特徴 | おすすめ用途 |
|---|---|---|
| Gmail通知 | 設定簡単・スマホで受け取れる | 個人運用・副業 |
| Slack通知 | チームに共有しやすい | チーム運用 |
| スプシログ | 過去履歴を一覧で確認できる | 長期運用・分析 |
| 二段構え（Gmail+スプシ） | 見落としゼロ・傾向分析もできる | 本番環境推奨 |

## あの2週間を経て思うこと

エラー通知を仕込んでから、私の自動化との付き合い方は明らかに変わりました。前は「動いてるといいな」と祈るような気持ちで放置していたのが、今は「何かあれば必ず教えてくれる」と信じて任せられる。この安心感の差は大きいです。

自動化のスクリプトは、こちらが眠っている間も、夜勤で病棟にいる間も、勝手に動き続けます。だからこそ、転んだときに黙って倒れられるのが一番こわい。`try-catch` と通知をセットで入れておくだけで、自動化の信頼性はまるで別物になります。あの青ざめた朝を、あなたには味わってほしくないので、ぜひ全部のGASに仕込んでおいてください。

## 関連記事（あわせて読みたい）

GASのトリガー・自動化基礎をもっと深めたい方は、以下の記事もおすすめです。

- [GASで毎日決まった時間に実行する時間主導型トリガー](/blog/gas-trigger-clock-every-day/) — トリガー設定の基本
- [GASで6分制限を回避する方法](/blog/gas-trigger-6min-limit/) — 長時間処理のテクニック
- [GAS実行上限Quota超過の原因と対処法](/blog/gas-error-quota/) — クォータエラーの対策
- [GASでSlack通知を送る最短レシピ](/blog/gas-slack-notify/) — Slackと連携した通知設計

これらと組み合わせると、GASの自動運用が安定します。

---

### この記事を書いた人：凛
2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。コードは構文とAPI仕様を確認のうえ掲載していますが、実行はお使いの環境に合わせて調整してください。
