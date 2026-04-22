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

こんにちは、凛です。GASを本格的に運用すると必ずぶつかるのが**Quota（クォータ）超過エラー**。今日は主要な制限の種類と対処法を実例付きで解説します。

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

## 関連記事

- [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/)
- [GASよく出るエラー10選と解決コード集](/blog/gas-error-exception/)
- [GAS失敗時のリトライ処理を実装する完全版](/blog/gas-retry-exponential/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。
