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

こんにちは、凛です。看護師の仕事の傍ら、GASで業務の自動化をいくつも組んでいます。自動化の一番怖いところは、「動いているつもり」で実は止まっていても、誰も教えてくれないことです。私自身、定期送信していたレポートが2週間も止まっていたのに気づかず、相手から指摘されて青ざめた経験があります。

## こんな悩みありませんか？

- トリガー実行が失敗していたのに2週間気づかなかった経験がある
- GASエラーログを毎日確認するのは現実的じゃない
- 「自動化したつもりが動いていなかった」事故を防ぎたい
- 夜勤中に処理が止まっても、翌朝すぐに気づけるようにしたい

私は副業の自動レポート送信が止まっていることに2週間気づかず、クライアントから「最近レポート来てないよ」と指摘されて青ざめたことがあります。GASエラー時の自動メール通知を仕込んでからは、即気づいて即修正できる体制になりました。

GASで自動化する目的は「放っておいても動く」ことにありますが、「放っておいても気づける」仕組みまでセットで作ることが、本当の意味での自動化の完成です。

## サンプルコード（コピペで動きます）

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


これでエラー発生 → 即メール届く。

## 全関数に共通でラップする方法

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

## Slack通知バージョン

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

Slack Incoming Webhook URLを使うパターン。チームで運用するならSlackの方が見落としにくい。

## ログをスプシに残す

```javascript
function logError(error, funcName) {
  const sheet = SpreadsheetApp.openById('LOG_SHEET_ID').getSheetByName('errors');
  sheet.appendRow([new Date(), funcName, error.message, error.stack]);
}
```

メール+スプシ記録の二段構えで運用すると、長期トレンドも見えて便利。

## 私（凛）が試して気づいたコツ3つ

### コツ1：全関数をtry-catchで囲む

エラーが発生してもGAS実行は止まりますが、`catch` 内でメール送信を入れておけば、失敗時にだけ通知が届く仕組みになります。全てのトリガー登録関数に例外なく入れることが大切です。「この関数はシンプルだから大丈夫」と省略すると、必ずそこでエラーが起きます。

経験上、try-catchを省略したくなるのはコードが短い関数のときが多いのですが、短くてもエラーは起きます。全部入れる習慣をつけてしまうのが一番です。

### コツ2：エラー本文に関数名・エラーメッセージを記載

`GmailApp.sendEmail(me, '【エラー】関数A', e.message + '\n' + e.stack)` のように詳細を含めると、原因特定が一瞬で済みます。

メールの件名に「GASエラー」と入れておくと、Gmailの検索で過去のエラー履歴を追いやすくなります。`label:エラー` フィルタを作っておくとさらに管理しやすいです。

タイムスタンプも必ず入れましょう。「いつ起きたのか」がわかると、何時のトリガー実行で何が起きたかを追跡できます。

### コツ3：エラーログをスプシにも残す

メール通知に加えて、スプシに `日時 / 関数名 / エラー内容` をログ化すると、後でパターン分析できます。

1ヶ月分のエラーログを眺めると、特定の時間帯や曜日にエラーが集中している、といった傾向がわかります。それが「外部APIが落ちやすい時間帯」だったり「特定のデータフォーマットが変わった日」だったりと、根本対策につながります。私はこのログのおかげで、副業クライアントのシステム改修タイミングを事前に察知できたことがあります。

## つまずきやすいポイント

### つまずき1：メール送信制限を使い切る

MailAppは1日100件まで。エラーが連発すると送信枠を食い潰すので、`onceADay` フラグで制御推奨です。無限ループやデータ件数が多い処理でエラーが起きると、1分間に何十回もトリガーが実行されてメール送信上限に達することがあります。

```javascript
const props = PropertiesService.getScriptProperties();
const lastNotified = props.getProperty('lastErrorNotified');
const now = new Date().getTime();
// 1時間以内に通知済みならスキップ
if (lastNotified && now - Number(lastNotified) < 3600000) return;
props.setProperty('lastErrorNotified', String(now));
```

このクールダウン処理を入れておくと、同じエラーで大量のメールが届くことを防げます。

### つまずき2：catch内でさらにエラーが起きる

通知メール送信時にもエラーが起きる可能性があるので、二重try-catchで安全装置を設けましょう。たとえばGmailの送信上限に達している状態でエラーメールを送ろうとすると、また別のエラーが発生します。

```javascript
try {
  GmailApp.sendEmail(email, subject, body);
} catch (mailErr) {
  console.error('エラーメール送信に失敗:', mailErr.message);
}
```

notifyError関数自体が失敗しても、メイン処理のエラーが握りつぶされないように設計することが大切です。

### つまずき3：throw e を忘れてGASのログに残らない

catch内で処理をして `throw e` を書かずに終わらせると、GASの実行ログ上では「正常終了」に見えてしまいます。エラーはGASのダッシュボードにも記録しておくと、後から「あの日の実行はどうだった?」を確認できるので必ず再スローしましょう。

```javascript
catch (e) {
  notifyError(e, 'funcName');
  throw e; // これを忘れない
}
```

## まとめ

| 通知方法 | 特徴 | おすすめ用途 |
|---|---|---|
| Gmail通知 | 設定簡単・スマホで受け取れる | 個人運用・副業 |
| Slack通知 | チームに共有しやすい | チーム運用 |
| スプシログ | 過去履歴を一覧で確認できる | 長期運用・分析 |
| 二段構え（Gmail+スプシ） | 見落としゼロ・傾向分析もできる | 本番環境推奨 |

- try-catchでエラー捕捉→自分にメール送信
- 全関数共通ラッパーで漏れなくカバー
- Slack/スプシログと組み合わせて多層通知
- 必ず`throw e;`でGAS実行ログにも残す
- メール送信制限対策のクールダウン処理も忘れずに

「いつの間にか止まってた」を防ぐ最重要パターンです。副業の自動化スクリプトは自分が夜勤中でも動き続けるので、何か起きたときの通知がないと気づくのが遅れます。この try-catch + 通知パターンを全GASに仕込むだけで、自動化の信頼性が劇的に上がります。

## 関連記事（あわせて読みたい）

GASのトリガー・自動化基礎をもっと深めたい方は、以下の記事もおすすめです。

- [GASで毎日決まった時間に実行する時間主導型トリガー](/blog/gas-trigger-clock-every-day/) — トリガー設定の基本
- [GASで6分制限を回避する方法](/blog/gas-trigger-6min-limit/) — 長時間処理のテクニック
- [GAS実行上限Quota超過の原因と対処法](/blog/gas-error-quota/) — クォータエラーの対策
- [GASでSlack通知を送る最短レシピ](/blog/gas-slack-notify/) — Slackと連携した通知設計

これらと組み合わせると、GASの自動運用が安定します。

---

### この記事を書いた人：凛
2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
