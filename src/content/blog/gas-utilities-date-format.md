---
title: "GASのUtilities.formatDateで日付整形をマスターする（タイムゾーンの落とし穴つき）"
description: "GASのUtilities.formatDateで日付整形を完全マスター。書式トークンの一覧、タイムゾーンで9時間ズレる落とし穴、ファイル名やメール件名への応用まで、初心者向けにやさしく解説します。"
pubDate: "2026-08-14T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","basics","date"]
tagNames: ["GAS","日付","フォーマット"]
readingTime: 8
keywords: ["GAS 日付 フォーマット","GAS formatDate","GAS タイムゾーン"]
---

凛です。夜勤明けのぼんやりした頭で、スプレッドシートに日付を自動で書き込むGASを組んでいたときのこと。ちゃんと動いたはずなのに、記録された時刻がなぜか9時間も前になっていて、しばらく「私、朝の5時に何をしてたっけ…？」と本気で悩みました。

原因は日付整形の関数に渡していたタイムゾーンの指定ミス。それに気づいたときは、思わず子どもが起きる前のコーヒーを一気飲みしてしまいました。この「9時間ズレる」問題は、GASで日付を扱いはじめた人がほぼ全員ハマる関門です。

でも安心してください。日付整形の主役 `Utilities.formatDate` の仕組みと、いくつかのトークンのルールさえ押さえれば、日付は自由自在に整えられるようになります。この記事では、私が実際につまずいたポイントを全部さらけ出しながら、順番にマスターしていきましょう。

# GASのUtilities.formatDateで日付整形をマスターする

日付を「2026/08/14 19:00:00」のような読みやすい文字列に変える。たったこれだけのことなのに、最初はどう書けばいいのか本当に分かりませんでした。ここでは基本の形から丁寧に見ていきます。

## Utilities.formatDateとは何をする関数か

まずは主役の関数がどんな働きをするのかを知るところから始めましょう。難しく考える必要はありません。

### 3つの引数を渡すだけのシンプルな関数

`Utilities.formatDate` は、日付オブジェクトを好きな形の文字列に変換してくれる関数です。渡す引数は3つだけです。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function formatBasic() {
  const now = new Date();                                    // 今この瞬間の日時を取得
  const formatted = Utilities.formatDate(                    // 日付を文字列に整形する
    now,                                                     // 第1引数：整形したい日付オブジェクト
    'Asia/Tokyo',                                            // 第2引数：タイムゾーン（日本時間）
    'yyyy/MM/dd HH:mm:ss'                                    // 第3引数：出力の書式パターン
  );
  Logger.log(formatted);                                     // 例：2026/08/14 19:00:00
}
```

第1引数に整形したい日付、第2引数にタイムゾーン、第3引数に「どんな形にしたいか」を書式パターンで指定します。この3つの意味さえ覚えれば、あとは書式パターンを変えるだけで、いろんな形の日付が作れます。

### 戻り値は「文字列」であることを意識する

ここで一つ大事なポイントがあります。`Utilities.formatDate` が返すのは、あくまで「文字列」です。日付として計算に使えるものではありません。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function checkReturnType() {
  const now = new Date();                                    // 日付オブジェクト
  const text = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd'); // 文字列に変換
  Logger.log(typeof now);                                    // object（日付オブジェクト）
  Logger.log(typeof text);                                   // string（ただの文字列）
}
```

つまり「日付の足し算をしたい」「◯日後を計算したい」といった処理は、整形する前の日付オブジェクトの段階でやっておく必要があります。整形は「最後の見た目を整える仕上げ」だと覚えておくと混乱しません。

## 書式パターンで使えるトークン一覧

日付整形の心臓部が、第3引数に書く「書式パターン」です。`yyyy` や `MM` といった文字（トークン）を並べることで、出力の形を自由に決められます。

### よく使うトークンの早見表

GASの `Utilities.formatDate` は、Java の SimpleDateFormat という仕組みの書式パターンを使います。難しそうに聞こえますが、よく使うのは限られています。まずはこの表を手元に置いておけば大丈夫です。

| トークン | 意味 | 出力例 |
|---|---|---|
| `yyyy` | 4桁の年 | 2026 |
| `MM` | 2桁ゼロ埋めの月 | 08 |
| `M` | ゼロ埋めなしの月 | 8 |
| `dd` | 2桁ゼロ埋めの日 | 14 |
| `d` | ゼロ埋めなしの日 | 14 |
| `HH` | 24時間制の時 | 19 |
| `hh` | 12時間制の時 | 07 |
| `mm` | 分 | 05 |
| `ss` | 秒 | 09 |
| `EEE` | 曜日（英語の略称） | Thu |
| `a` | 午前／午後（英語） | PM |

たとえば `yyyy年MM月dd日` と書けば「2026年08月14日」になりますし、`HH:mm` と書けば「19:05」になります。トークンの前後に「年」「月」「:」などの文字をそのまま入れられるのが便利なところです。

### 大文字と小文字で意味が変わる最大のハマりどころ

ここが、この記事で一番伝えたいポイントです。書式トークンは、大文字と小文字で意味がまったく変わります。ここを見落とすと、冒頭の私のように謎のズレに悩まされます。

- `MM`（大文字）は「月」、`mm`（小文字）は「分」
- `HH`（大文字）は「24時間制の時」、`hh`（小文字）は「12時間制の時」

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function caseSensitiveTrap() {
  const now = new Date();                                    // 現在日時を取得
  // 正しい：MM=月、mm=分、HH=24時間制
  const correct = Utilities.formatDate(now, 'Asia/Tokyo', 'MM月 mm分 HH時');
  Logger.log(correct);                                       // 例：08月 05分 19時（正しい）

  // 間違い：mm を月のつもりで使うと「分」が出てしまう
  const wrong = Utilities.formatDate(now, 'Asia/Tokyo', 'mm月');
  Logger.log(wrong);                                         // 例：05月（実際は5分なのに月に見える）
}
```

「月を出したいのに `mm` と書いてしまい、分の数字が月として表示される」というのは、本当によくある失敗です。月は大文字の `MM`、分は小文字の `mm`。時間も、24時間表記なら大文字の `HH`。この対応だけは指を折ってでも覚えておきましょう。

## よく使う日付フォーマットの実例集

トークンが分かったら、あとは組み合わせるだけです。ここでは私が実際のGASでよく使っている、定番の形をまとめておきます。コピーして使ってもらってOKです。

### 表示向け・ファイル名向けの定番パターン

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function formatSamples() {
  const now = new Date();                                    // 現在日時
  const tz = 'Asia/Tokyo';                                   // 日本時間を使い回す

  // 画面表示向け：曜日つきの和風表記
  Logger.log(Utilities.formatDate(now, tz, 'yyyy年MM月dd日(EEE)')); // 2026年08月14日(Thu)

  // ファイル名向け：記号を使わずくっつける
  Logger.log(Utilities.formatDate(now, tz, 'yyyyMMdd_HHmmss'));     // 20260814_190509

  // データ管理向け：ハイフン区切りの国際標準っぽい形
  Logger.log(Utilities.formatDate(now, tz, 'yyyy-MM-dd'));          // 2026-08-14

  // 時刻だけ欲しいとき
  Logger.log(Utilities.formatDate(now, tz, 'HH:mm'));              // 19:05
}
```

ポイントは用途で使い分けることです。人が読む画面には `yyyy年MM月dd日(EEE)` のような読みやすい形を、ファイル名には記号を避けた `yyyyMMdd_HHmmss` を使います。ファイル名に `/` や `:` を入れるとエラーになったり、意図しない挙動になったりするので、ファイル名はアンダースコアや数字だけで組むのが安全です。

### 12時間制で「午前・午後」を出したいとき

12時間制の時計のように「午後7時」と出したい場合は、小文字の `hh` と `a` を組み合わせます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function twelveHourFormat() {
  const now = new Date();                                    // 現在日時
  // hh=12時間制の時、a=AM/PM。英語で AM / PM が付く
  const result = Utilities.formatDate(now, 'Asia/Tokyo', 'a hh:mm');
  Logger.log(result);                                        // 例：PM 07:05
}
```

ただし `a` が出すのは英語の「AM／PM」です。日本語で「午前・午後」と出したい場合は、この結果を後で置き換えるか、時（hour）の数字を見て自分で判定する必要があります。ここは少し手間なので、無理せず英語のまま使うか、次に紹介する曜日と同じ考え方で自作するのが現実的です。

## タイムゾーンの落とし穴で9時間ズレる問題

さて、いよいよ冒頭の「9時間ズレ事件」の正体です。ここはGAS初心者が最も転びやすいところなので、しっかり押さえましょう。

### GMTを指定すると日本時間から9時間ずれる

第2引数のタイムゾーンを省略したり、`'GMT'` を指定したりすると、日本時間から9時間ずれた結果になります。日本（Asia/Tokyo）はGMTより9時間進んでいるためです。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function timezoneTrap() {
  const now = new Date();                                    // 例：日本時間で 2026-08-14 19:00

  // 正しい：日本時間で表示される
  const jst = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  Logger.log(jst);                                           // 2026/08/14 19:00

  // 危険：GMT指定だと9時間戻ってしまう
  const gmt = Utilities.formatDate(now, 'GMT', 'yyyy/MM/dd HH:mm');
  Logger.log(gmt);                                           // 2026/08/14 10:00（9時間前！）
}
```

同じ瞬間の日付なのに、タイムゾーン指定を変えるだけで表示が9時間ずれます。私がやってしまったのは、まさにこの `GMT` 相当の指定ミスでした。日本向けのGASを書くなら、第2引数には必ず `'Asia/Tokyo'` を明示するのが鉄則です。

### スクリプトのタイムゾーンを確認する方法

「そもそも今のスクリプトは何時間帯で動いているの？」という確認は、`Session.getScriptTimeZone()` でできます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function checkScriptTimeZone() {
  const tz = Session.getScriptTimeZone();                    // スクリプトの設定タイムゾーンを取得
  Logger.log(tz);                                            // 例：Asia/Tokyo

  // スクリプトの設定に合わせて整形したいとき
  const now = new Date();
  const formatted = Utilities.formatDate(now, tz, 'yyyy/MM/dd HH:mm:ss');
  Logger.log(formatted);                                     // スクリプト設定の時間帯で表示
}
```

これを実行して `Asia/Tokyo` 以外が返ってきたら、その分ズレる可能性があるということです。私は「あれ？」と思ったら、まずこの1行で今の設定を確認するようにしています。

### appsscript.jsonのtimeZoneを日本に揃える

プロジェクト全体のタイムゾーンは、`appsscript.json` というマニフェストファイルで設定されています。エディタの「プロジェクトの設定」から「appsscript.json マニフェスト ファイルをエディタで表示する」にチェックを入れると、この中身が見られます。

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

ここの `timeZone` が `Asia/Tokyo` になっていれば、`Session.getScriptTimeZone()` も日本時間を返します。とはいえ、この設定に頼りきるより、`Utilities.formatDate` の第2引数に毎回 `'Asia/Tokyo'` を書く方が、あとで自分がコードを読み返したときに迷いません。私は「安全のために毎回明示派」です。

## 曜日を日本語にしたいときの工夫

「Thu」ではなく「木」と出したい。日本語のブログや家計簿では、やっぱり漢字の曜日がしっくりきますよね。ところが、ここにも小さな落とし穴があります。

### EEEは英語の曜日しか出せない

先ほどの表にあった `EEE` は、残念ながら英語の略称（Mon, Tue, Wed…）しか出しません。日本語の「月・火・水」を直接出す書式トークンは用意されていないのです。ここは正直にお伝えしておきます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function englishWeekday() {
  const now = new Date();                                    // 現在日時
  const result = Utilities.formatDate(now, 'Asia/Tokyo', 'EEE'); // 英語の曜日
  Logger.log(result);                                        // 例：Thu（木曜日でも英語）
}
```

### 配列とgetDay()で日本語曜日を自作する

そこで、日本語の曜日は自分で作ります。`Date` オブジェクトの `getDay()` は、日曜を0、月曜を1…土曜を6として数字を返してくれます。この数字を、曜日の配列の番号として使えばOKです。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function japaneseWeekday() {
  const now = new Date();                                    // 現在日時
  const week = ['日', '月', '火', '水', '木', '金', '土'];   // 0〜6に対応する曜日
  const dayOfWeek = week[now.getDay()];                      // getDay()は0(日)〜6(土)を返す

  // 日付本体は formatDate で、曜日だけ自作の文字列を差し込む
  const dateText = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy年MM月dd日');
  const result = dateText + '(' + dayOfWeek + ')';           // 文字列を結合
  Logger.log(result);                                        // 例：2026年08月14日(木)
}
```

`getDay()` が返す数字を、`['日','月',...]` の何番目かとして取り出しているだけです。これで「2026年08月14日(木)」のように、きれいな日本語曜日つきの日付が完成します。私の家計簿シートも、この方法で漢字の曜日を入れています。

## 文字列から日付に戻すときの注意点

ここまでは「日付 → 文字列」の話でした。では逆に「文字列 → 日付」に戻したいときはどうするのでしょうか。ここは特に誤解が多いので、正直に整理しておきます。

### formatDateは逆変換（parse）はできない

まず大事なこと。`Utilities.formatDate` は「日付を文字列にする」専用の関数です。文字列を日付に戻す機能（いわゆるparse）はありません。ここを勘違いして「formatDateで文字列から日付に変換できないの？」と探し回る人がいますが、答えは「できません」です。

### new Dateや分解で日付オブジェクトを作る

文字列を日付に戻したいときは、`new Date()` に文字列を渡すか、自分で年・月・日を分解して組み立てます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function stringToDate() {
  // 方法1：スラッシュ区切りの文字列を new Date に渡す
  const d1 = new Date('2026/08/14');                         // 日付オブジェクトになる
  Logger.log(Utilities.formatDate(d1, 'Asia/Tokyo', 'yyyy年MM月dd日')); // 2026年08月14日

  // 方法2：文字列を自分で分解して組み立てる（確実）
  const text = '2026-08-14';                                 // 元の文字列
  const parts = text.split('-');                             // ['2026','08','14'] に分割
  const year = Number(parts[0]);                             // 数値に変換
  const month = Number(parts[1]) - 1;                        // 月は0始まりなので1引く
  const day = Number(parts[2]);                              // 日
  const d2 = new Date(year, month, day);                     // 年・月・日から日付を作る
  Logger.log(Utilities.formatDate(d2, 'Asia/Tokyo', 'yyyy/MM/dd')); // 2026/08/14
}
```

ここで一つ注意点。`new Date(year, month, day)` の月は「0始まり」です。8月を作りたいなら `8` ではなく `7` を渡します。だから上のコードでは `Number(parts[1]) - 1` と1を引いています。この0始まりルールも、地味にハマる落とし穴なので覚えておいてください。

## 失敗しやすいポイントと回避策まとめ

私が実際にやらかした失敗を、回避策とセットで並べておきます。同じ轍を踏まないための、いわば「先輩ナースの申し送り」だと思ってください。

### よくある失敗と対処法の一覧

| 失敗 | 症状 | 回避策 |
|---|---|---|
| `mm` を月に使う | 月のはずが分の数字が出る | 月は大文字 `MM`、分は小文字 `mm` |
| `hh` を24時間で使う | 19時なのに07と出る | 24時間制は大文字 `HH` |
| タイムゾーン省略・GMT指定 | 9時間ずれる | 第2引数に `'Asia/Tokyo'` を明示 |
| formatDateで文字列を変換 | エラーになる | 逆変換は `new Date()` を使う |
| `new Date(y, m, d)` の月 | 1か月ずれる | 月は0始まり。1を引く |

### 迷ったら「明示」する

トラブルを防ぐいちばんの近道は、とにかく明示することです。タイムゾーンは省略せず毎回 `'Asia/Tokyo'` と書く。書式トークンは表を見ながら大文字小文字を確認する。この2つを徹底するだけで、日付まわりのバグはほとんど消えます。

私は今でも、新しいGASを書くときは書式トークンの表を横に置いています。「暗記しなきゃ」と気負う必要はありません。困ったら見返せる場所に置いておけば十分です。

## ファイル名やメール件名への応用例

最後に、実際の副業GASでどう使っているか、具体例を紹介します。日付整形は「バックアップ」「通知」「記録」の3つの場面で本当に重宝します。

### バックアップファイルに日時を付ける

スプレッドシートのバックアップを作るとき、ファイル名に日時を入れておくと、あとから「いつのデータか」がひと目で分かります。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function makeBackupName() {
  const now = new Date();                                    // 現在日時
  const stamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyyMMdd_HHmmss'); // 記号なしの刻印
  const fileName = '家計簿バックアップ_' + stamp;             // ファイル名を組み立て
  Logger.log(fileName);                                      // 例：家計簿バックアップ_20260814_190509
}
```

`yyyyMMdd_HHmmss` のように記号を使わない形にしておくのがコツです。ファイル名に `:` や `/` を入れると不具合の原因になるので避けましょう。

### メール件名に日付を入れて自動送信する

毎朝の自動メールに日付を入れると、受信ボックスで整理しやすくなります。GmailAppと組み合わせた例です。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function sendDailyMail() {
  const now = new Date();                                    // 現在日時
  const dateLabel = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy年MM月dd日'); // 件名用の日付
  const subject = '【日次レポート】' + dateLabel;            // 件名を組み立て
  const body = dateLabel + ' の作業記録です。';              // 本文にも日付を入れる

  // 自分宛てに送信（宛先は自分のアドレスに置き換えてください）
  GmailApp.sendEmail('example@example.com', subject, body);  // メール送信
  Logger.log('送信しました：' + subject);                     // ログで確認
}
```

件名に日付が入るだけで、後から「◯月◯日のレポートどこだっけ」と探す時間がぐっと減ります。私はこの仕組みで、毎朝の副業タスクの記録を自動化しています。細切れ時間しか取れない身には、この「自動で日付が入る」ありがたさが身にしみます。

## 自分でも作れるようになりたい方へ

ここまで読んでくださって、ありがとうございます。日付整形は、GASでできることの入り口にすぎません。でも、この「自分の手で時間を自動で整える」感覚を一度味わうと、他にもいろんなものを自動化したくなってきます。

私も最初は、コードなんて自分に書けるはずがないと思っていました。それでも、夜勤明けの眠い頭で少しずつ手を動かすうちに、気づけば家計簿もメールも自動で回るようになっていました。看護師でもコードは書けます。もし「私も自分の手でツールを作ってみたい」と思ったら、体系立てて学べる環境に頼ってみるのも、遠回りに見えて実は近道です。

<a href="https://h.accesstrade.net/sp/cc?rk=0100knoa00orcn" rel="nofollow" referrerpolicy="no-referrer-when-downgrade">Dive into Code（未経験からエンジニアを目指すプログラミングスクール）</a><img src="https://h.accesstrade.net/sp/rr?rk=0100knoa00orcn" width="1" height="1" border="0" alt="">

## 関連記事（あわせて読みたい）

- [/blog/gas-sheet-timestamp-auto/](/blog/gas-sheet-timestamp-auto/) — スプレッドシートに入力したその瞬間の時刻を、自動で記録する方法を解説しています。今回学んだ日付整形とセットで使うと便利です。
- [/blog/gas-calendar-event-create/](/blog/gas-calendar-event-create/) — Googleカレンダーの予定をGASから自動で作成する方法です。日付の扱いに慣れたら挑戦してみてください。
- [/blog/gas-trigger-clock-every-day/](/blog/gas-trigger-clock-every-day/) — 毎日決まった時刻にGASを自動実行するトリガーの設定方法です。日次レポートの自動送信に欠かせません。

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

掲載コードは構文とAPI仕様を確認して載せていますが、お使いの環境に合わせて調整してください。
