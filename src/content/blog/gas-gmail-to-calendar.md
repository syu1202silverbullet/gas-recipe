---
title: "Gmail予約メールをGoogleカレンダーに自動登録する仕組み｜GASで手作業ゼロに"
description: "美容室・病院・レストランの予約確認メールが届いたら、自動でGoogleカレンダーに予定を入れる仕組みをGoogle Apps Scriptで作る方法。Gmail検索の書き方、日時を抜き出す正規表現、二重登録を防ぐラベル運用、キャンセルメールへの対応までコード付きで解説します。"
pubDate: "2026-04-16"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas", "gmail", "calendar", "automation"]
tagNames: ["GAS", "Gmail", "カレンダー", "自動化"]
readingTime: 12
---

歯医者の予約確認メールを見て「あとでカレンダーに入れよう」と思ったまま忘れ、当日の昼に電話が来たことがあります。夜勤明けの頭では、こういう転記作業がいちばん先に抜け落ちます。

この「メールを見てカレンダーに手で写す」作業は、**Google Apps Script（GAS）でほぼ丸ごと自動化**できます。しかも使うのはGmailとカレンダーの標準機能だけ。外部サービスも課金もいりません。

この記事では、コピペで動くコードと、実際に運用してみて分かったつまずきポイントをまとめます。

## この仕組みでできること

- 予約確認メールが届くと、**5分以内にカレンダーへ予定が入る**
- 同じメールを二重に登録しない
- 予定には**メールへのリンク**が入るので、後から詳細を確認できる
- 対応していない書き方のメールは、**勝手に登録せず**ログに残して知らせる

最後の項目が大事です。日時が読めなかったのに適当な時間で登録されると、かえって危険だからです。

## 仕組みの全体像

1. 5分おきのトリガーでGASが起動
2. Gmailを「予約」「確認」などのキーワードで検索
3. すでに処理したメールは**ラベルで除外**
4. 本文から日時を正規表現で抽出
5. Googleカレンダーに予定を作成
6. 処理したメールに `CAL登録済` ラベルを付ける

## 準備：Gmail側にラベルを作る

Gmailの左メニュー下部「＋新しいラベルを作成」から、次の2つを作ります。

- `CAL登録済`（登録が終わったメールに付く）
- `CAL要確認`（日時が読めなかったメールに付く）

コードからも自動作成できますが、先に作っておくと動きが見えて安心です。

## コード全文

Googleドライブから「新規」→「その他」→「Google Apps Script」で新しいプロジェクトを作り、以下を貼り付けます。

```javascript
// ===== 設定 =====
const SEARCH_QUERY = '(予約 OR ご予約 OR 予約確認) newer_than:7d -label:CAL登録済 -label:CAL要確認';
const DONE_LABEL   = 'CAL登録済';
const CHECK_LABEL  = 'CAL要確認';
const DEFAULT_MINUTES = 60;   // 終了時刻が書かれていないときの所要時間
const TIMEZONE = 'Asia/Tokyo';

/** メインの処理（トリガーで5分おきに実行） */
function importReservationMails() {
  const doneLabel  = getOrCreateLabel_(DONE_LABEL);
  const checkLabel = getOrCreateLabel_(CHECK_LABEL);
  const calendar   = CalendarApp.getDefaultCalendar();

  const threads = GmailApp.search(SEARCH_QUERY, 0, 20);

  threads.forEach(function (thread) {
    const message = thread.getMessages()[thread.getMessageCount() - 1]; // 最新の1通を見る
    const subject = message.getSubject();
    const body    = message.getPlainBody();

    const parsed = parseDateTime_(body);

    if (!parsed) {
      thread.addLabel(checkLabel);
      console.log('日時を読み取れませんでした：' + subject);
      return;
    }

    const end = parsed.end || new Date(parsed.start.getTime() + DEFAULT_MINUTES * 60 * 1000);

    calendar.createEvent(buildTitle_(subject), parsed.start, end, {
      description: '差出人：' + message.getFrom() + '\n' +
                   'メールを開く：' + thread.getPermalink() + '\n\n' +
                   body.slice(0, 800)
    });

    thread.addLabel(doneLabel);
    console.log('登録しました：' + subject + ' → ' +
      Utilities.formatDate(parsed.start, TIMEZONE, 'M/d HH:mm'));
  });
}

/** 本文から日時を取り出す。読めなければ null を返す */
function parseDateTime_(body) {
  const text = body.replace(/\s+/g, ' '); // 改行や全角スペースを普通の空白に揃える
  const now  = new Date();

  // 例）2026年4月20日 14:30 ／ 2026/4/20 14:30 ／ 4月20日(月) 14:30
  const full = text.match(
    /(?:(20\d{2})[年\/\-\.]\s*)?(\d{1,2})[月\/\-\.]\s*(\d{1,2})日?\s*(?:\([月火水木金土日]\))?\s*(?:午前|午後)?\s*(\d{1,2})[:時]\s*(\d{1,2})?/
  );
  if (!full) return null;

  const year   = full[1] ? Number(full[1]) : now.getFullYear();
  const month  = Number(full[2]) - 1;
  const day    = Number(full[3]);
  let   hour   = Number(full[4]);
  const minute = full[5] ? Number(full[5]) : 0;

  // 「午後2時」のような表記に対応
  if (/午後/.test(text) && hour < 12) hour += 12;

  const start = new Date(year, month, day, hour, minute);
  if (isNaN(start.getTime())) return null;

  // 年が書かれておらず、日付が過去になる場合は来年とみなす
  if (!full[1] && start.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
    start.setFullYear(year + 1);
  }

  // 終了時刻（「〜15:30」「-15:30」形式）があれば拾う
  let end = null;
  const endMatch = text.match(new RegExp(hour + '[:時]\\s*' + (minute || 0) + '\\s*[〜~\\-–]\\s*(\\d{1,2})[:時]\\s*(\\d{1,2})?'));
  if (endMatch) {
    end = new Date(start.getTime());
    end.setHours(Number(endMatch[1]), endMatch[2] ? Number(endMatch[2]) : 0);
  }

  return { start: start, end: end };
}

/** 件名から予定タイトルを作る（【】や「Re:」を削って読みやすく） */
function buildTitle_(subject) {
  const cleaned = subject
    .replace(/^(Re:|Fwd?:)\s*/i, '')
    .replace(/【[^】]*】/g, '')
    .trim();
  return '📩 ' + (cleaned || '予約');
}

/** ラベルを取得。なければ作る */
function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

/** 5分おきのトリガーを作る（1回だけ実行） */
function createMailTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'importReservationMails') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('importReservationMails').timeBased().everyMinutes(5).create();
  console.log('5分おきのトリガーを作成しました');
}
```

## 動かす手順

1. コードを貼り付けて保存する
2. `importReservationMails` を実行し、権限を許可する
3. 実行ログを見て、登録された件数と内容を確認する
4. カレンダーに予定が入っていたら `createMailTrigger` を1回だけ実行

最初は必ず**手動実行でログを確認**してください。いきなりトリガーで回すと、想定外のメールを大量に登録してしまうことがあります。

## Gmail検索クエリの書き方が9割

この仕組みの精度は、`SEARCH_QUERY` でほぼ決まります。GASの `GmailApp.search()` には、Gmailの検索窓と**まったく同じ書き方**が使えます。

| 書き方 | 意味 |
|---|---|
| `from:info@example.com` | 特定の差出人だけ |
| `subject:予約` | 件名に「予約」を含む |
| `newer_than:7d` | 直近7日以内 |
| `-label:CAL登録済` | このラベルが付いたものを除く |
| `(A OR B)` | どちらかを含む |

最初は広く拾いすぎるので、実際に届いた予約メールを見ながら**差出人で絞る**のがおすすめです。

```javascript
const SEARCH_QUERY = '(from:reserve@hairsalon.example OR from:info@clinic.example) newer_than:7d -label:CAL登録済';
```

行きつけの店を数件登録しておけば、誤登録はほぼゼロになります。私はこの形に落ち着きました。

## コードのポイント解説

### 二重登録はラベルで防ぐ

同じメールを何度も登録しないよう、処理が終わったら `CAL登録済` を付け、検索条件で `-label:CAL登録済` として除外しています。

スクリプトプロパティに「処理済みメールID」を貯めていく方法もありますが、ラベル方式なら**Gmailの画面で目視できる**のが利点です。おかしな登録があったとき、ラベルを外せば次の実行で再処理されます。

### 読めなかったら登録しない

`parseDateTime_` が `null` を返したメールは、カレンダーに入れずに `CAL要確認` ラベルを付けます。

ここを「とりあえず今日の12時で登録」みたいにしてしまうと、間違った予定がカレンダーに残ります。**自動化で一番怖いのは、失敗が静かに成功のふりをすること**です。読めなかったものは正直に分けます。

### 年がないメールへの対応

「4月20日 14:30」のように年が書かれていない予約メールは珍しくありません。そのまま今年として解釈すると、12月に届いた「1月5日」の予約が**去年の日付**になってしまいます。

コードでは「年の記載がなく、日付が1日以上前になる場合は来年」と判断しています。

### 予定にメールへのリンクを入れる

`thread.getPermalink()` でそのメールへの直リンクが取れます。予定の説明欄に入れておくと、カレンダーから1タップで元のメールを開けます。持ち物や住所を確認したいときに便利です。

## 応用：キャンセルメールで予定を消す

キャンセル確認メールを拾って、対応する予定を削除することもできます。

```javascript
function removeCancelledEvents() {
  const threads = GmailApp.search('(キャンセル OR 取消) newer_than:7d -label:CAL登録済', 0, 10);
  const calendar = CalendarApp.getDefaultCalendar();

  threads.forEach(function (thread) {
    const message = thread.getMessages()[0];
    const parsed  = parseDateTime_(message.getPlainBody());
    if (!parsed) return;

    // その日の予定のうち、メールから作ったもの（📩付き）だけを対象にする
    const events = calendar.getEventsForDay(parsed.start);
    events.forEach(function (e) {
      if (e.getTitle().indexOf('📩') === 0 &&
          Math.abs(e.getStartTime().getTime() - parsed.start.getTime()) < 60 * 60 * 1000) {
        e.deleteEvent();
        console.log('キャンセルにより削除：' + e.getTitle());
      }
    });
    thread.addLabel(getOrCreateLabel_(DONE_LABEL));
  });
}
```

削除は取り返しがつかない操作なので、**この仕組みで作った予定（タイトルが📩で始まるもの）だけ**を対象にしています。手で入れた大事な予定を巻き込まないための保険です。

## よくあるエラーと対処

### 「Invalid date」でエラーになる

`new Date(year, month, day, ...)` に想定外の値が入っています。月は**0始まり**（4月なら`3`）という点と、正規表現で拾った文字列が数値になっているかを確認してください。コードでは `isNaN` でチェックして、おかしければ登録しないようにしています。

### 予定が9時間ずれる

スクリプトのタイムゾーンが日本時間になっていません。エディタの「プロジェクトの設定（⚙）」で、タイムゾーンが「(GMT+09:00) 日本標準時」かどうか確認してください。

### 実行が多すぎて制限に当たる

GASには1日あたりの実行時間の上限があります（無料アカウントで90分程度）。5分おきの実行は1日288回なので、1回が数秒で終わる限り問題ありません。ただし `GmailApp.search` の取得件数を大きくしすぎると重くなるので、上のコードでは20件に制限しています。

### 関係ないメールまで登録される

検索クエリが広すぎます。`subject:` や `from:` で絞り込んでください。誤登録された予定は、カレンダーで📩付きのものを探せばまとめて消せます。

## まとめ

- Gmail検索クエリは**検索窓と同じ書き方**。差出人で絞ると精度が一気に上がる
- 二重登録は**ラベル**で防ぐ。目で見えるのが利点
- 日時が読めなかったメールは**登録せず、ラベルで隔離する**
- 年の記載がないメールは、過去日になったら来年と判断する
- 予定の説明にメールリンクを入れておくと後が楽

一度作ってしまえば、あとは予約メールが来るたびに勝手に予定が増えていきます。「カレンダーに入れ忘れる」という失敗そのものが消えるのが、この自動化のいちばんの価値でした。

## 関連記事

- [GASでGoogleカレンダーに予定登録する最短10行コード](/blog/gas-calendar-event-create/)
- [カレンダー予定のダブルブッキング検知GAS｜重複検出と通知](/blog/gas-calendar-conflict-check/)
- [GASでLINEに毎朝「今日の予定・天気・タスク」を自動通知する仕組み](/blog/gas-line-morning-notification/)
