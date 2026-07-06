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

こんにちは、ナース業のかたわらGASで月数万円を稼いでいる凛です。

GASを本格的に運用し始めると、ある日突然スクリプトがエラーで止まります。犯人はたいてい**Quota（クォータ）**、つまりGoogleが決めている利用上限です。私自身も何度もぶつかってきたので、この記事ではQuotaまわりの疑問を、実際に調べたり試したりした順にQ&A形式でまとめていきます。気になる質問だけ拾い読みしてもらっても大丈夫です。

## Q. そもそもGASの上限ってどれくらいなんですか？

まずは全体像から。主要な制限を表にしておきます（2026年時点）。

| 項目 | 無料版 | Workspace |
|---|---:|---:|
| **スクリプト実行時間** | 6分 | 30分 |
| **トリガー実行時間（1日累積）** | 90分 | 6時間 |
| **Gmail送信数（1日）** | 100通 | 1500通 |
| **メール受信者数（1日）** | 100アドレス | 1500アドレス |
| **UrlFetchApp呼び出し（1日）** | 20,000回 | 100,000回 |
| **トリガー（1ユーザー）** | 20件 | 20件 |
| **同時実行数** | 30 | 30 |

個人の無料アカウントで特に引っかかりやすいのが「実行時間6分」「トリガー累積90分」「メール100通」の3つです。以下のQ&Aも、ほぼこの3つを巡る話になります。

## Q. 「Service invoked too many times for one day」と出ました。どうすれば？

```
Service invoked too many times for one day: email
```

これはGmailの1日送信上限を超えたサインです。無料版なら100通。対処としては、送信前に残数を確認して、足りなければ翌日に回すのが定石です。

```javascript
const remaining = MailApp.getRemainingDailyQuota();
if (remaining < recipients.length) {
  console.log(`残${remaining}通、明日に回します`);
  PropertiesService.getScriptProperties().setProperty('pending', JSON.stringify(remaining));
  return;
}
```

「エラーが出てから考える」のではなく「出る前に引き返す」設計にしておくと、送信リストの途中で止まって中途半端な状態になる事故を防げます。

## Q. 「Script took too long to execute」で毎回止まります。6分制限は回避できますか？

正面からは回避できませんが、**処理を分割して続きから再開する**ことで実質的に突破できます。私がよく使うのはこの形です。

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

6分ギリギリまで粘らず、5分30秒で自主的に中断して「どこまで進んだか」をスクリプトプロパティに保存する。次のトリガー実行で続きの行から再開する、という仕組みです。強制終了される前に自分から店じまいするのがコツです。

## Q. 「Service using too much computer time for one day」は何が悪いんですか？

1日の累積実行時間（無料版は90分）を使い切ったエラーです。多くの場合、原因はトリガーの頻度にあります。

```
❌ 1分おきトリガー（1日1440回実行）
✅ 5〜10分おきトリガー（1日144〜288回）
```

「もっと頻繁にチェックしたい」という気持ちで1分おきにすると、1日1440回も実行されて累積時間があっという間に尽きます。冷静に考えると、5〜10分おきで困る用途は実はそれほど多くありません。まずは頻度を落とせないか検討してみてください。

## Q. 「Rate Limit Exceeded」が出たら？

短時間にAPIを連打したときのエラーです。UrlFetchAppでよく起きます。対処は**指数バックオフ**、つまり失敗するたびに待ち時間を倍にしながら再試行する方法が定番です。

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

1秒→2秒→4秒と間隔を空けて3回まで再試行し、それでもダメなら諦めてエラーを投げます。「失敗したら即リトライ」を無限に繰り返すコードは、呼び出し回数を無駄に消費するだけなのでやめておきましょう。

## Q. そもそも超過しないように書くには？

エラーが出てから対処するより、最初から超過しにくい書き方をしておくほうがずっと楽です。私が普段意識しているのは次の4つ。

### 送る前に残数を見る

```javascript
const quota = MailApp.getRemainingDailyQuota();
console.log(`今日の残メール送信数: ${quota}`);
```

たった2行ですが、これをメール系スクリプトの冒頭に入れておくだけで「途中で息切れ」がなくなります。

### 大量処理は最初から小分けにする

たとえば1万件のレコードを1回のトリガーで処理しようとすると、まず6分制限に激突します。1回100件×100回のトリガー実行に分ければ安全です。あとからバッチ分割にリファクタリングするのはかなり大変なので、設計の段階で「1回の実行で何件処理するか」を決めておく。私は100件を1バッチにする設計を基本にしています。

### API呼び出しはまとめる

```javascript
// ❌ ループ内で毎回API呼び出し
for (const id of ids) {
  const data = UrlFetchApp.fetch(`api.example.com/${id}`);
}

// ✅ fetchAllで一括並列実行
const requests = ids.map(id => ({ url: `api.example.com/${id}` }));
const responses = UrlFetchApp.fetchAll(requests);
```

1件ずつループで `fetch` すると呼び出し回数がどんどん積み上がります。`fetchAll` でまとめて並列実行できるなら、そちらが速いうえに回数の節約にもなります。

### 同じデータを取り直さない

```javascript
const cache = CacheService.getScriptCache();
let data = cache.get('myData');
if (!data) {
  data = expensiveApiCall();
  cache.put('myData', data, 600); // 10分キャッシュ
}
```

変化の少ないデータを毎回APIから取るのはもったいない。CacheServiceに10分ほど置いておくだけで、呼び出し回数が目に見えて減ります。

## Q. 使い切った上限はいつ戻りますか？

1日単位の制限（メール送信数・累積実行時間など）は、**太平洋時間の0:00**、日本時間だと16:00か17:00ごろにリセットされます。「使った瞬間から24時間」ではないんですね。なので、夜の作業で使い切ってしまっても、翌日の夕方ではなく翌朝の時点ではもう回復しています。ここを勘違いして丸一日待ってしまうのはもったいないです。

## Q. Quota超過に早く気づくには？

GASのエラーログだけを頼りにすると、気づくのがどうしても遅れます。おすすめは2段構えです。

まず、try-catchでエラーを捕捉してGmailやLINEに通知する仕組みを先に入れておくこと。夜勤中に処理が止まっても、翌朝スマホの通知で状況を把握できる状態が理想です。

もうひとつは、スプレッドシートに実行ログを記録しておくこと。「今週は何曜日に何回エラーが起きたか」が一目で分かるようになると、「毎月1日はデータ量が多くてQuota超過している」といったパターンが見えてきて、根本原因の特定につながります。

## Q. 逆に、やりがちな失敗は？

これまで見てきた内容の裏返しですが、あらためて3つ挙げておきます。

ひとつ目は、トリガーの頻度を上げすぎること。1分おきトリガーは累積90分をあっという間に食い尽くします。ふたつ目は、エラーを無視してリトライし続けるコード。失敗するたびにAPI呼び出し回数が消費されていくので、一定回数で止めて通知する設計が正解です。みっつ目は、APIを1件ずつ呼ぶ設計のまま件数が増えていくパターン。`fetchAll` やキャッシュの出番です。

どれも「動いているうちは気づかない」タイプの落とし穴なんですよね。データ量が増えた頃に突然発症するので、小さいうちから対策しておくのが吉です。

## 上限と喧嘩しないために

最後に、エラー別の対処を一枚にまとめておきます。

| エラー | 原因 | 対策 |
|---|---|---|
| Service invoked too many times | Gmail送信数上限 | 残数チェック＋翌日繰越 |
| Script took too long | 6分実行制限 | バッチ分割＋進捗保存 |
| Service using too much computer time | 累積90分制限 | トリガー頻度を下げる |
| Rate Limit Exceeded | API連打 | 指数バックオフでリトライ |

Quotaは「嫌がらせの制限」ではなく「設計のヒント」だと思うようになってから、付き合い方がだいぶ楽になりました。上限を意識して書いたスクリプトは、結果的に無駄がなくて壊れにくいものになります。エラーに出会ったら、この記事のQ&Aから該当する項目を探してみてください。

なお、記事中のコードは構文とAPIの使い方を確認して掲載していますが、Quotaの具体的な数値はGoogleの方針で変わることがあります。運用前に公式ドキュメントの最新値も確認しておくと確実です。

## 関連記事

- [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/)
- [GASよく出るエラー10選と解決コード集](/blog/gas-error-exception/)
- [GAS失敗時のリトライ処理を実装する完全版](/blog/gas-retry-exponential/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。
