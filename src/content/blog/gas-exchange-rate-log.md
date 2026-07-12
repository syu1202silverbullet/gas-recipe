---
title: "GASと無料為替APIで毎日の為替レートをスプレッドシートに記録"
description: "GASのUrlFetchAppで無料の為替APIを叩き、毎日の為替レートをスプレッドシートに自動記録する方法を初心者向けに解説。APIキー不要のエンドポイント・エラー処理・時間主導トリガーまで丁寧にまとめました。"
pubDate: "2026-07-27T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "api"
categoryName: "API連携"
tagSlugs: ["gas","api","exchange-rate"]
tagNames: ["GAS","API連携","為替"]
readingTime: 9
keywords: ["GAS 為替 API","GAS 為替レート 取得","GAS UrlFetchApp"]
---

凛です。夜勤明けの朝、コーヒーを飲みながらニュースを眺めていたら「円安が進行」という見出しが目に入りました。少し前まで1ドル140円くらいだった気がするのに、いつの間にか随分動いているんですよね。

我が家は少額ですが海外の資産も持っているので、為替の動きはやっぱり気になります。でも毎朝ニュースサイトを開いて数字をメモするのは面倒で、三日坊主で終わってしまいました。

そこで「これ、GAS（Google Apps Script）で自動化できないかな？」と思い立ったんです。調べてみると、APIキーの登録すらいらない無料の為替APIがあって、スプレッドシートに毎日1行ずつレートを記録するのはあっという間に作れました。

この記事では、私が実際に組んだ「毎日の為替レートを自動でスプレッドシートに記録する仕組み」を、コードのコメント付きで丁寧に解説します。プログラミング初心者の方でも、コピペして動かせるように書いていきますね。

# この記事で作るもの

まずは完成イメージを共有します。ゴールが見えていた方が、コードの意味も理解しやすいですからね。

## スプレッドシートに毎日1行ずつ記録される

最終的にはこんな表がスプレッドシートに溜まっていきます。手作業は一切なし、GASが毎朝勝手に追記してくれます。

| 記録日 | USD/JPY | EUR/JPY | API更新時刻(UTC) |
|---|---|---|---|
| 2026/07/20 | 156.32 | 170.11 | Sun, 20 Jul 2026 00:00:01 +0000 |
| 2026/07/21 | 156.78 | 170.45 | Mon, 21 Jul 2026 00:00:02 +0000 |
| 2026/07/22 | 155.90 | 169.88 | Tue, 22 Jul 2026 00:00:01 +0000 |

こうやってデータが溜まっていくと、あとでグラフにしたり、「先月より円安になったな」と振り返ったりできます。地味ですが、続けているとじわじわ役に立つんですよ。

## 使うのは無料でAPIキー不要の為替API

今回使うのは **ExchangeRate-API** が提供している、**キー登録が不要な無料エンドポイント**です。

```
https://open.er-api.com/v6/latest/USD
```

このURLにアクセスするだけで、米ドル（USD）を基準にした各国通貨のレートがまとめて返ってきます。個人利用の範囲なら会員登録もクレジットカード登録も不要で、とても手軽です。

## 為替APIのレスポンスを確認する

コードを書く前に、APIがどんなデータを返してくるのかを見ておきましょう。ここを理解しておくと、後でエラーが出たときに自分で原因を追えるようになります。

## レスポンスのJSON構造

上のURLにアクセスすると、こんな形のJSON（データのかたまり）が返ってきます。実際はもっと通貨が多いですが、抜粋するとこんな感じです。

```json
{
  "result": "success",
  "base_code": "USD",
  "time_last_update_utc": "Sun, 20 Jul 2026 00:00:01 +0000",
  "rates": {
    "USD": 1,
    "JPY": 156.32,
    "EUR": 0.919,
    "GBP": 0.788,
    "AUD": 1.512,
    "CNY": 7.183,
    "KRW": 1378.5
  }
}
```

ポイントは3つです。

- `result` … 取得に成功すると `"success"` が入ります。ここを必ずチェックします
- `rates` … 各通貨のレートが入っています。`rates.JPY` なら「1USD = 何JPYか」です
- `time_last_update_utc` … APIがレートを更新した時刻（UTC＝世界標準時）です

### 「1USD = 何JPYか」で入っている点に注意

`rates.JPY` が `156.32` のとき、これは「1ドル＝156.32円」を意味します。私たちが普段ニュースで見る「1ドル○円」と同じ向きなので、そのまま使えます。

一方 `rates.EUR` が `0.919` のときは「1ドル＝0.919ユーロ」という意味です。円建てで見たいときは少し計算が必要になるので、その方法も後ほど紹介します。

## まずはレートを1回取得してみる

いきなり自動化に進む前に、「APIからちゃんとデータが取れるか」を手動で確認しましょう。動くことを一つずつ確かめながら進めるのが、遠回りに見えて一番の近道です。

## UrlFetchAppで取得してログに出す

新しいスプレッドシートを開き、メニューの「拡張機能」→「Apps Script」を選ぶとエディタが開きます。そこに次のコードを貼り付けてください。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// 為替レートを1回だけ取得してログに出す関数
function testFetchRate() {
  // 米ドルを基準にしたレートを返す、キー不要の無料エンドポイント
  const url = 'https://open.er-api.com/v6/latest/USD';

  // UrlFetchApp.fetch で外部APIにアクセスする（GAS標準機能）
  const response = UrlFetchApp.fetch(url);

  // 返ってきた本文（文字列）をJSONオブジェクトに変換する
  const data = JSON.parse(response.getContentText());

  // result が success のときだけ中身を使う
  if (data.result === 'success') {
    // rates.JPY に「1USD = 何JPY」が入っている
    Logger.log('USD/JPY = ' + data.rates.JPY);       // 例: USD/JPY = 156.32
    Logger.log('更新時刻 = ' + data.time_last_update_utc); // APIの最終更新時刻
  } else {
    // 失敗したら理由をログに残す
    Logger.log('取得に失敗しました: ' + data.result);
  }
}
```

保存したら、エディタ上部の実行ボタンで `testFetchRate` を動かします。初回は「承認が必要です」という画面が出るので、自分のGoogleアカウントで許可してください。これはGASが外部APIとスプレッドシートに触れるための許可で、初回だけの作業です。

### 実行ログの見方

実行後、エディタ下部の「実行ログ」に `USD/JPY = 156.32` のような行が出れば成功です。ここが表示されれば、APIとの通信は問題なくできているということ。まずは第一関門突破ですね。

もしログに何も出なかったり赤いエラーが出たりした場合は、URLのスペルミスがないか、承認をきちんと済ませたかを確認してみてください。

## スプレッドシートに1行追記する

レートが取れることを確認できたら、いよいよスプレッドシートに書き込む処理を足します。ここが今回のメイン部分です。

## appendRowで日付とレートを記録する

次のコードは、取得したレートを「記録日・USD/JPY・EUR/JPY・API更新時刻」の1行としてシートの一番下に追記します。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// 為替レートを取得してスプレッドシートに1行追記する関数
function recordExchangeRate() {
  const url = 'https://open.er-api.com/v6/latest/USD';

  // 外部APIにアクセスしてレスポンスを受け取る
  const response = UrlFetchApp.fetch(url);

  // レスポンス本文をJSONに変換する
  const data = JSON.parse(response.getContentText());

  // 成功していなければ何もせず終了（後述のエラー処理で詳しく扱う）
  if (data.result !== 'success') {
    Logger.log('取得失敗のため記録をスキップしました');
    return;
  }

  // 現在の日付を「2026/07/20」の形式・日本時間で作る
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');

  // 1USD = 何円か（USD/JPY）
  const usdJpy = data.rates.JPY;

  // 1EUR = 何円か（USD/JPY ÷ USD/EUR で円建てに換算）
  const eurJpy = data.rates.JPY / data.rates.EUR;

  // 書き込む先のシート（スクリプトが紐づくスプレッドシートの一番手前のシート）
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

  // 1行分のデータを配列で用意する
  const row = [
    today,                      // 記録日
    usdJpy,                     // USD/JPY
    Math.round(eurJpy * 100) / 100, // EUR/JPY（小数第2位で四捨五入）
    data.time_last_update_utc   // APIの更新時刻
  ];

  // シートの最終行の下に1行追記する
  sheet.appendRow(row);

  Logger.log('記録しました: ' + row.join(', '));
}
```

### EUR/JPYの計算のしかた

先ほど触れたとおり、このAPIは米ドル基準なので `rates.EUR` は「1ドル＝○ユーロ」で入っています。円建ての「1ユーロ＝○円」にするには、次のように割り算します。

```javascript
// USD/JPY ÷ USD/EUR = EUR/JPY
// 例: 156.32 ÷ 0.919 ≒ 170.10（1ユーロ＝約170円）
const eurJpy = data.rates.JPY / data.rates.EUR;
```

「1ドルが156円で、1ドルが0.919ユーロなら、1ユーロは何円？」という比の計算です。中学校の数学を思い出しますね。

## 基軸をJPYにして直接取りたいとき

「割り算がややこしい」という場合は、そもそも基準を円にしてしまう手もあります。エンドポイントの末尾を `JPY` に変えるだけです。

```javascript
// 基準を日本円にしたエンドポイント
const url = 'https://open.er-api.com/v6/latest/JPY';
```

ただしこの場合、`rates.USD` は「1円＝○ドル」という小さな数字（例: 0.0064）で返ってくるので、「1ドル＝○円」にしたいなら `1 / rates.USD` と逆数を取る必要があります。どちらが分かりやすいかは目的次第なので、私はUSD基準で統一しています。

## よく使う通貨コードの早見表

`rates.○○` の○○に入れる通貨コードは、国際規格（ISO 4217）で決まっています。主要なものをまとめておきます。

| 通貨コード | 通貨名 | 国・地域 |
|---|---|---|
| USD | 米ドル | アメリカ |
| EUR | ユーロ | ユーロ圏 |
| GBP | 英ポンド | イギリス |
| AUD | 豪ドル | オーストラリア |
| CNY | 人民元 | 中国 |
| KRW | ウォン | 韓国 |

たとえば豪ドルのレートを記録したいなら `data.rates.AUD` を、人民元なら `data.rates.CNY` を使えばOKです。記録する通貨を増やしたいときは、`row` の配列に列を足していってください。

## 失敗しやすいポイントと回避策

ここは実際に私がつまずいた部分です。自動化ものは「たまに失敗したときにどう振る舞うか」がとても大事なので、丁寧に対策しておきましょう。

## 通信そのものが失敗したときに備える

`UrlFetchApp.fetch` は、通信自体が失敗すると処理が途中で止まってしまいます。自動実行だと止まったことに気づきにくいので、`try-catch` で囲んで安全にしておきます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// エラー処理を入れた安全版
function recordExchangeRateSafe() {
  const url = 'https://open.er-api.com/v6/latest/USD';

  try {
    // muteHttpExceptions を true にすると、エラー応答でも例外で止まらず結果を受け取れる
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

    // HTTPステータスコードを確認する（200 が正常）
    const code = response.getResponseCode();
    if (code !== 200) {
      Logger.log('HTTPエラー: ' + code); // 例: 404, 429, 500 など
      return; // 正常でなければ記録しない
    }

    // 本文をJSONに変換
    const data = JSON.parse(response.getContentText());

    // APIの result が success でなければスキップ
    if (data.result !== 'success') {
      Logger.log('APIエラー: ' + data.result);
      return;
    }

    // ここまで来たら安全に記録できる
    const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sheet.appendRow([today, data.rates.JPY, data.time_last_update_utc]);

    Logger.log('記録成功');

  } catch (e) {
    // 通信断・JSON変換失敗などをまとめて捕まえる
    Logger.log('例外が発生しました: ' + e.message);
  }
}
```

### getResponseCodeとresultは両方チェックする

ここで大事なのは、チェックを **2段階** にしていることです。

1. `getResponseCode()` … サーバーとの通信が成功したか（HTTPレベル）
2. `data.result` … APIとして正しいデータを返せたか（アプリレベル）

通信は成功しているのに中身がエラー、というケースもあるので、両方を確認しておくと安心です。看護でいう「バイタルも確認、本人の訴えも確認」みたいなものだと思っています。

## APIを連打しない

無料APIには、短時間に大量アクセスすると一時的に制限がかかる（レスポンスコード429が返る）ことがあります。今回のように1日1回の記録なら全く問題ありませんが、動作確認のときに何十回も連打するのは避けましょう。

テスト中は数秒あけて実行する、くらいの気持ちで十分です。相手も無料で提供してくれているサービスなので、行儀よく使うのがマナーですね。

## 更新はリアルタイムではない点を理解しておく

この無料エンドポイントの更新頻度は、おおむね **1日1回** です。証券会社のアプリのように分刻みで動く数字ではありません。

そのため「今この瞬間のレート」を秒単位で追いたい用途には向きません。あくまで「日々の終値の目安を記録して、月単位・週単位の流れを眺める」使い方が合っています。私の目的（毎朝ざっくり把握する）にはこれで十分でした。

なお為替市場は土日も動いていますが、この無料APIの更新は限られるため、土日は前営業日と同じ値が記録されることがあります。気になる場合は後述のトリガーを平日だけに設定するとよいでしょう。

## 毎日自動で記録するトリガーを設定する

最後に、この記録を毎朝自動で走らせる設定をします。ここまで来れば、あとは放っておくだけでデータが溜まっていきます。

## 時間主導型トリガーの作り方

GASエディタの左側にある時計マーク（トリガー）を開き、「トリガーを追加」を押して次のように設定します。

- 実行する関数：`recordExchangeRateSafe`
- イベントのソース：時間主導型
- トリガーのタイプ：日付ベースのタイマー
- 時刻：午前7時〜8時（お好きな時間帯で）

これで、毎朝その時間帯にGASが自動でレートを取りに行き、スプレッドシートに1行追記してくれます。

### コードでトリガーを作る方法もある

画面から設定するのが基本ですが、コードでトリガーを作ることもできます。バックアップ的に知っておくと便利です。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// 毎日朝7時台に recordExchangeRateSafe を実行するトリガーを作る
function createDailyTrigger() {
  ScriptApp.newTrigger('recordExchangeRateSafe') // 実行したい関数名
    .timeBased()      // 時間主導型
    .everyDays(1)     // 毎日
    .atHour(7)        // 7時台に実行
    .create();        // トリガーを作成

  Logger.log('毎日7時台のトリガーを作成しました');
}
```

この関数は一度だけ実行すればOKです。何度も実行するとトリガーが増えてしまうので、作ったあとはトリガー画面で1つだけ登録されているか確認しておきましょう。

## まとめ

ここまでの流れを振り返ります。

- **APIキー不要の無料エンドポイント** `https://open.er-api.com/v6/latest/USD` を使えば、登録なしで為替レートが取れる
- `UrlFetchApp.fetch` → `JSON.parse` でデータを受け取り、`result === 'success'` を確認してから使う
- `appendRow` で日付・レート・更新時刻を1行ずつ記録する
- `getResponseCode()` と `try-catch` の二重チェックで、失敗しても止まらない安全な作りにする
- 時間主導トリガーで毎朝自動記録すれば、あとは放置でデータが溜まる

最初は「為替APIなんて難しそう」と思っていましたが、やってみると1時間もかからず動きました。こういう小さな自動化が積み重なると、毎日の手間がじわじわ減っていくのが本当に嬉しいんですよね。

## 自分でも作れるようになりたい方へ

「こういう自動化、自分でも作ってみたい」と思った方へ。GASはプログラミング未経験でも始めやすく、私のような看護師でも独学で副収入につなげられました。無料で始められるので、まずは今日紹介したコードをコピペして動かすところから試してみてください。ほんの少しの一歩が、暮らしをぐっとラクにしてくれますよ。

<a href="https://h.accesstrade.net/sp/cc?rk=0100knoa00orcn" rel="nofollow" referrerpolicy="no-referrer-when-downgrade">Dive into Code（未経験からエンジニアを目指すプログラミングスクール）</a><img src="https://h.accesstrade.net/sp/rr?rk=0100knoa00orcn" width="1" height="1" border="0" alt="">

## 関連記事（あわせて読みたい）

- [/blog/gas-trigger-clock-every-day/](/blog/gas-trigger-clock-every-day/) … 毎日決まった時刻にGASを実行するトリガーの設定方法をイチから解説しています。
- [/blog/gas-spreadsheet-daily-auto/](/blog/gas-spreadsheet-daily-auto/) … 毎日自動でスプレッドシートを更新する仕組みの作り方をまとめています。
- [/blog/gas-sheet-timestamp-auto/](/blog/gas-sheet-timestamp-auto/) … シートに時刻を自動で記録するテクニックを紹介しています。

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

※掲載コードは構文とAPI仕様を確認して載せていますが、お使いの環境に合わせて調整してください。
