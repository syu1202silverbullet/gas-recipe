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

こんにちは、凛です。GASのトリガーが裏で失敗していて、気付かず数日経ってた経験ありませんか？今日は**トリガー失敗時に自動でエラーメールを送る**実装を解説します。

## 問題：GASトリガー失敗は気付きにくい

通常GASエディタの「実行」タブを見ないとエラーがわからない。トリガー実行は裏で動くので、気付くまで数日かかることも。

## 最短実装：try-catch + メール通知

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

## まとめ

- try-catchでエラー捕捉→自分にメール送信
- 全関数共通ラッパーで漏れなくカバー
- Slack/スプシログと組み合わせて多層通知
- 必ず`throw e;`でGAS実行ログにも残す

「いつの間にか止まってた」を防ぐ最重要パターンです。

## 関連記事
- [GASよく出るエラー10選と解決コード集](/blog/gas-error-exception/)
- [GAS失敗時のリトライ処理を実装する完全版](/blog/gas-retry-exponential/)
- [GASログ出力console.logでデバッグ完全版](/blog/gas-console-log-debug/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事をGASで自動化してきた経験をもとに、実務ベースのGASレシピを発信中。
