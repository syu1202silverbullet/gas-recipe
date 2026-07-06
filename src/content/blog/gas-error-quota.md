---
title: "GAS実行上限Quota超過の原因と対処法｜送信数・実行時間・API呼び出し制限を読み解く"
description: "GAS実行上限Quota超過エラーの原因と対処法を、看護師×副業Webエンジニアの凛が完全解説。Gmail送信数・スクリプト実行時間・API呼び出し回数の上限と、回避するためのコードパターン10選を紹介します。"
pubDate: "2026-06-07T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","quota","error","limit"]
tagNames: ["GAS","Quota","エラー","制限"]
readingTime: 8
keywords: ["GAS 制限","GAS Quota","GAS 上限","GAS Service invoked too many times"]
---

こんにちは、ナース業のかたわらGASで月数万円を稼いでいる凛です。GASを本格的に運用すると必ずぶつかるのが**Quota（クォータ）超過エラー**。今日は主要な制限の種類と対処法を実例付きで解説します。

## こんな悩みありませんか？

- 「`Service invoked too many times for one day` って何回まで？」
- 「`Script took too long` で6分制限に毎回引っかかる」
- 「GASでメール一斉送信したらエラーで止まった」
- 「無料版とWorkspace版の制限差がよくわからない」

## GAS主要な制限早見表（2026年）

| 項目 | 無料版 | Workspace |
|---|---:|---:|
| **スクリプト実行時間** | 6分 | 30分 |
| **トリガー実行時間（1日累積）** | 90分 | 6時間 |
| **Gmail送信数（1日）** | 100通 | 1500通 |
| **メール受信者数（1日）** | 100アドレス | 1500アドレス |
| **UrlFetchApp呼び出し（1日）** | 20,000回 | 100,000回 |
| **トリガー（1ユーザー）** | 20件 | 20件 |
| **同時実行数** | 30 | 30 |

## 主要エラーと対処法

### 1. `Service invoked too many times for one day`

```
Service invoked too many times for one day: email
```

→ Gmail送信上限超過。残数確認＆翌日に回す：

```javascript
const remaining = MailApp.getRemainingDailyQuota();
if (remaining < recipients.length) {
  console.log(`残${remaining}通、明日に回します`);
  PropertiesService.getScriptProperties().setProperty('pending', JSON.stringify(remaining));
  return;
}
```

### 2. `Script took too long to execute`

6分制限に到達。バッチ分割で対処：

```javascript
function batchProcess() {
  const startTime = new Date().getTime();
  const TIME_LIMIT = 5.5 * 60 * 1000; // 5分30秒で打ち切り
  const props = PropertiesService.getScriptProperties();
  let lastRow = Number(props.getProperty('lastRow') || 0);

  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = lastRow; i < data.length; i++) {
    if (new Date().getTime() - startTime > TIME_LIMIT) {
      props.setProperty('lastRow', String(i));
      console.log(`${i}行目で中断、次回再開`);
      return;
    }
    // 1行ずつ処理
    processRow(data[i]);
  }

  props.deleteProperty('lastRow');
  console.log('全件完了');
}
```

5分30秒で中断→次のトリガー実行で続きから。

### 3. `Service using too much computer time for one day`

1日の累積実行時間（無料90分）に到達。

→ トリガー頻度を見直す：
```
❌ 1分おきトリガー（1日1440回実行）
✅ 5〜10分おきトリガー（1日144〜288回）
```

### 4. `Rate Limit Exceeded`

UrlFetchApp等の連打。指数バックオフで再試行：

```javascript
function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = UrlFetchApp.fetch(url, options);
      if (res.getResponseCode() < 500) return res;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
    }
    Utilities.sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s...
  }
}
```

## Quota超過を未然に防ぐ実装パターン

### パターン1：getRemainingDailyQuota で事前チェック

```javascript
const quota = MailApp.getRemainingDailyQuota();
console.log(`今日の残メール送信数: ${quota}`);
```

### パターン2：処理を分散実行

1万件のレコード処理を：
- ❌ 1回のトリガーで全件 → 6分超過
- ✅ 1回100件×100回トリガー → 安全

### パターン3：API呼び出しをバッチ化

```javascript
// ❌ ループ内で毎回API呼び出し
for (const id of ids) {
  const data = UrlFetchApp.fetch(`api.example.com/${id}`);
}

// ✅ fetchAllで一括並列実行
const requests = ids.map(id => ({ url: `api.example.com/${id}` }));
const responses = UrlFetchApp.fetchAll(requests);
```

### パターン4：キャッシュ活用

```javascript
const cache = CacheService.getScriptCache();
let data = cache.get('myData');
if (!data) {
  data = expensiveApiCall();
  cache.put('myData', data, 600); // 10分キャッシュ
}
```

## ⚠️ Quotaリセットのタイミング

- 1日制限（メール・実行時間等）: **太平洋時間 0:00**（日本時間 16:00 or 17:00）にリセット
- 「24時間制限」ではないので、夜の作業で使い切ってもすぐ翌日朝には戻る

## まとめ

- `Service invoked too many times` → 残数確認＋翌日繰越
- `Script took too long` → バッチ分割＋進捗保存
- `Rate Limit` → 指数バックオフ
- 大量処理は最初から分散設計
- リセットは太平洋時間 0:00（日本時間夕方）

Quotaは「制限」ではなく「設計のヒント」と思うと付き合いやすくなります。

## 私（凛）が試して気づいたコツ3つ

### コツ1：最初から分散設計で組む

大量データを処理するスクリプトを書くとき、最初から「1回の実行で何件処理するか」を決めておく習慣をつけましょう。後からリファクタリングするのは大変なので、設計段階で分割を前提にします。私は100件を1バッチとして、毎回の実行で100件ずつ処理する設計を基本にしています。

### コツ2：エラー通知を先に仕込む

Quota超過エラーが起きたとき、GASのエラーログだけでは気づくのが遅れます。try-catchでエラーを捕捉してGmailやLINEに通知する仕組みを先に入れておくと、Quota超過に即気づいて対応できます。

夜勤中に処理が止まっても、翌朝にはスマホに通知が届いていて状況を把握できる状態が理想です。

### コツ3：実行ログを記録する

スプシにエラーログを記録しておくと、「今週は何曜日に何回エラーが起きたか」が一目でわかります。パターンが見えてくると、「毎月1日にデータが多くてQuota超過している」などの根本原因の特定につながります。

## つまずきやすいポイント

### つまずき1：トリガーの頻度を上げすぎる

「もっと頻繁に処理したい」と思って1分おきのトリガーにすると、1日1440回実行されて累積実行時間（無料90分）をあっという間に使い切ります。多くのケースで5〜10分おきで十分です。

### つまずき2：エラーを無視してリトライを繰り返す

エラーが起きたとき、エラーを無視してリトライし続けるコードを書いてしまうと、失敗するたびにAPI呼び出し回数が消費されていきます。一定回数試して失敗したら処理を止めて通知する設計が正解です。

### つまずき3：APIを1件ずつ呼び出す設計

UrlFetchApp.fetch を1件ずつループで呼び出すと、呼び出し回数がどんどん積み上がります。可能であれば fetchAll でまとめて並列実行するか、キャッシュを活用して同じデータを再取得しないようにしましょう。

## まとめ

| エラー | 原因 | 対策 |
|---|---|---|
| Service invoked too many times | Gmail送信数上限 | 残数チェック＋翌日繰越 |
| Script took too long | 6分実行制限 | バッチ分割＋進捗保存 |
| Service using too much computer time | 累積90分制限 | トリガー頻度を下げる |
| Rate Limit Exceeded | API連打 | 指数バックオフでリトライ |

## 関連記事

- [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/)
- [GASよく出るエラー10選と解決コード集](/blog/gas-error-exception/)
- [GAS失敗時のリトライ処理を実装する完全版](/blog/gas-retry-exponential/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
