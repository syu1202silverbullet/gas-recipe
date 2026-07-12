---
title: "GASで日本の祝日を判定して営業日を数える方法｜祝日カレンダー活用"
description: "GASで日本の祝日を判定し営業日を計算する方法を初心者向けに解説します。CalendarAppと祝日カレンダーを使い、土日祝を除いた営業日数のカウントやN営業日後の算出まで、動くコード付きで丁寧にまとめました。"
pubDate: "2026-07-15T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "calendar"
categoryName: "カレンダー"
tagSlugs: ["gas","calendar","business-days"]
tagNames: ["GAS","カレンダー","営業日"]
readingTime: 9
keywords: ["GAS 祝日 判定","GAS 営業日 計算","GAS 祝日カレンダー"]
---

凛です。先日、勤務先の物品発注をまとめる当番が回ってきたとき、「発注日から3営業日後に届くので、その日は在庫を空けておいて」というメモを見て、ふと手が止まりました。3営業日後って、土日をまたいだらいつ？祝日が挟まったら？と、指を折りながら数えていたら、隣の先輩に「凛ちゃん、それ毎回やってるの?」と笑われてしまったんです。

夜勤明けの帰り道、ぼんやりカレンダーを眺めながら、「これ、GASで自動化できるんじゃない?」とひらめきました。Googleカレンダーには「日本の祝日」カレンダーがあるので、それを使えば祝日判定もできそう。家に帰ってコーヒーを淹れて、うとうとする前にちょっとだけ触ってみたら、思ったよりずっと簡単に営業日が数えられて感動しました。

今日は、そのとき私がつまずいたポイントも含めて、GASで日本の祝日を判定し、営業日を数える方法を初心者向けにまとめます。締め日の計算やリマインドにもそのまま使える、地味だけど一生モノのテクニックです。

# GASで日本の祝日を判定して営業日を数える方法

Google Apps Script（GAS）は、Googleカレンダーの情報をコードから読み取れます。日本の祝日は「日本の祝日」という公式カレンダーにまとまっているので、これを使えば「この日は祝日かどうか」を機械的に判定できます。あとは土日を足し合わせれば、営業日（＝土日祝を除いた平日）が求められる、という流れです。

この記事では、まず祝日カレンダーの取得方法をおさえたうえで、次のステップで組み立てていきます。

- ある日が祝日かどうかを判定する `isHoliday(date)`
- 土日を判定して、営業日かどうかを判定する `isBusinessDay(date)`
- 期間内の営業日数を数える `countBusinessDays(start, end)`
- 「N営業日後」を求める `addBusinessDays(date, n)`

順番に、動くコードを見ながら進めましょう。

## まずは日本の祝日カレンダーを取得する

営業日を数える前に、「日本の祝日」の情報をどこから取ってくるか、が出発点です。GASでは `CalendarApp` というサービスを使ってカレンダーを操作できます。

### 祝日カレンダーのIDを指定して取得する

Googleが公開している「日本の祝日」カレンダーには、決まったカレンダーIDがあります。次のコードで取得できます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function getHolidayCalendar() {
  // 日本の祝日カレンダーのID（Google公式の共有カレンダー）
  const HOLIDAY_CALENDAR_ID = 'ja.japanese#holiday@group.v.calendar.google.com';

  // IDを指定してカレンダーオブジェクトを取得する
  const cal = CalendarApp.getCalendarById(HOLIDAY_CALENDAR_ID);

  // 取得できなかった場合は null が返るので、その時点で気づけるようにする
  if (!cal) {
    throw new Error('祝日カレンダーが取得できませんでした。カレンダーの購読設定を確認してください。');
  }

  // 取得できたカレンダー名をログに出しておく（確認用）
  Logger.log('取得したカレンダー: ' + cal.getName());
  return cal;
}
```

このコードを実行して、ログに「日本の祝日」といった名前が表示されれば成功です。ここでいきなりつまずく人が多いので、次の項目で正直に説明します。

### 「カレンダーが取得できない」ときの正直な注意点

私が最初にハマったのがここでした。上のコードを実行したのに `cal` が `null` になって、エラーが出たんです。

理由はシンプルで、**あなたのGoogleカレンダーに「日本の祝日」カレンダーが追加（購読）されていないと、GASからも取得できない**からです。`getCalendarById` は「自分がアクセスできるカレンダー」しか返してくれません。

解決策は、先に自分のGoogleカレンダーで祝日カレンダーを購読しておくことです。手順は次のとおりです。

1. パソコンでGoogleカレンダー（calendar.google.com）を開く
2. 左側メニューの「他のカレンダー」の横にある「＋」をクリック
3. 「関心のあるカレンダーを探す」を選ぶ
4. 「地域限定の祝日」から「日本の祝日」にチェックを入れる

これで自分のカレンダーに祝日が表示されるようになり、GASからも `getCalendarById` で取得できるようになります。私はこれに気づかず30分ほど悩んだので、同じところで止まらないように最初にお伝えしておきますね。

## ある日が祝日かどうかを判定する

祝日カレンダーが取得できたら、次は「ある日が祝日かどうか」を判定するヘルパー関数を作ります。ここがこの記事の核になる部分です。

### getEventsForDayで祝日イベントを調べる

カレンダーには、その日のイベント（予定）を取得する `getEventsForDay(date)` というメソッドがあります。祝日カレンダーの場合、祝日の日にはその祝日名のイベントが入っているので、「イベントが1件以上あれば祝日」と判定できます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function isHoliday(date) {
  // 祝日カレンダーを取得する
  const cal = CalendarApp.getCalendarById('ja.japanese#holiday@group.v.calendar.google.com');
  if (!cal) {
    // カレンダーが取得できない場合はエラーにして気づけるようにする
    throw new Error('祝日カレンダーが取得できません。購読設定を確認してください。');
  }

  // その日のイベント（祝日）を取得する
  const events = cal.getEventsForDay(date);

  // イベントが1件以上あれば祝日と判定する
  return events.length > 0;
}
```

使い方はこんな感じです。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function testIsHoliday() {
  // 2026年5月5日（こどもの日）を作る（月は0始まりなので4を指定）
  const target = new Date(2026, 4, 5);

  // 祝日かどうかを判定してログに出す
  if (isHoliday(target)) {
    Logger.log('この日は祝日です'); // こどもの日なので、こちらが出る
  } else {
    Logger.log('この日は祝日ではありません');
  }
}
```

`new Date(2026, 4, 5)` の「4」が5月を表しているのは、GAS（JavaScript）では月が0始まりだからです。1月が0、12月が11になります。ここは初心者がよく間違えるポイントなので、覚えておくと安心です。

### 祝日名も取り出してみる

「祝日かどうか」だけでなく、「何の祝日か」も知りたいときがあります。イベントのタイトルを取り出せば祝日名がわかります。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function getHolidayName(date) {
  const cal = CalendarApp.getCalendarById('ja.japanese#holiday@group.v.calendar.google.com');
  if (!cal) {
    throw new Error('祝日カレンダーが取得できません。');
  }

  // その日のイベントを取得する
  const events = cal.getEventsForDay(date);

  // イベントが無ければ空文字（祝日ではない）を返す
  if (events.length === 0) {
    return '';
  }

  // 先頭イベントのタイトル（祝日名）を返す
  return events[0].getTitle();
}
```

たとえば1月1日を渡すと「元日」、5月5日を渡すと「こどもの日」といった文字列が返ってきます。リマインドメールに「本日は◯◯（祝日）のためお休みです」と入れたいときに便利です。

## 土日も含めて営業日かどうかを判定する

祝日判定ができたら、あとは土日を足し合わせるだけで営業日判定が完成します。営業日とは、ここでは「平日（月〜金）かつ祝日ではない日」と定義します。

### 曜日から土日を判定する

日付から曜日を取るには `getDay()` を使います。返り値は0が日曜、1が月曜……6が土曜です。つまり0か6なら週末（土日）です。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function isWeekend(date) {
  // getDay() は 0=日曜, 6=土曜 を返す
  const day = date.getDay();

  // 日曜(0)または土曜(6)なら週末とみなす
  return day === 0 || day === 6;
}
```

### 平日かつ祝日でない日を営業日とする

週末判定と祝日判定を組み合わせれば、営業日判定の完成です。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function isBusinessDay(date) {
  // 週末（土日）なら営業日ではない
  if (isWeekend(date)) {
    return false;
  }

  // 祝日なら営業日ではない
  if (isHoliday(date)) {
    return false;
  }

  // 週末でも祝日でもなければ営業日
  return true;
}
```

これで「その日が営業日かどうか」を一発で判定できるようになりました。次の項目からは、この関数を使って「営業日数を数える」「N営業日後を求める」といった実用的な計算に進みます。

## 期間内の営業日数を数える

「今月は何営業日あるんだろう?」「この2週間で稼働日は何日?」といった集計は、締め日計算やシフト管理でよく出てきます。期間の開始日から終了日まで1日ずつ進めて、営業日だけを数えれば求められます。

### 1日ずつ進めて営業日をカウントする

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function countBusinessDays(start, end) {
  let count = 0; // 営業日のカウント用

  // 開始日をコピーして、元の日付を壊さないようにする
  const current = new Date(start.getTime());

  // current が end を超えるまで1日ずつ進める
  while (current <= end) {
    // その日が営業日ならカウントを1増やす
    if (isBusinessDay(current)) {
      count++;
    }
    // 翌日に進める（日付に1を足す）
    current.setDate(current.getDate() + 1);
  }

  return count;
}
```

使い方の例です。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function testCountBusinessDays() {
  const start = new Date(2026, 4, 1);  // 2026年5月1日
  const end = new Date(2026, 4, 31);   // 2026年5月31日

  // 期間内の営業日数を数える
  const days = countBusinessDays(start, end);
  Logger.log('この期間の営業日数: ' + days + '日');
}
```

`new Date(start.getTime())` で開始日をコピーしているのがポイントです。これをしないと、渡された `start` そのものを書き換えてしまい、呼び出し元の日付が変わってしまう事故が起きます。日付オブジェクトは「参照」で渡されるので、コピーして使う習慣をつけると安全です。

### スプレッドシートのセルと組み合わせる

集計結果をスプレッドシートに書き込めば、そのまま業務で使えます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function writeBusinessDaysToSheet() {
  // 現在アクティブなシートを取得する
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  const start = new Date(2026, 4, 1);  // 2026年5月1日
  const end = new Date(2026, 4, 31);   // 2026年5月31日

  // 営業日数を計算する
  const days = countBusinessDays(start, end);

  // A1に見出し、B1に結果を書き込む
  sheet.getRange('A1').setValue('5月の営業日数');
  sheet.getRange('B1').setValue(days);
}
```

## N営業日後の日付を求める

「発注から3営業日後に届く」「申請から5営業日以内に返信」といった計算は、営業日ベースの締め日でよく使います。今日から数えてN営業日進んだ日付を求めてみましょう。

### 1営業日ずつ進めてカウントする

考え方はシンプルで、「営業日だった日だけカウントし、指定した回数に達したら止める」という進め方です。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function addBusinessDays(date, n) {
  // 元の日付を壊さないようにコピーする
  const result = new Date(date.getTime());
  let added = 0; // 進めた営業日数

  // n営業日進むまでループする
  while (added < n) {
    // まず翌日に進める
    result.setDate(result.getDate() + 1);

    // 進めた先が営業日なら1営業日ぶんカウントする
    if (isBusinessDay(result)) {
      added++;
    }
  }

  return result;
}
```

使い方の例です。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function testAddBusinessDays() {
  const today = new Date(2026, 4, 1); // 2026年5月1日（金）を起点にする

  // 3営業日後を求める
  const deadline = addBusinessDays(today, 3);

  // 日付を読みやすい文字列にして出力する（タイムゾーンは東京）
  const text = Utilities.formatDate(deadline, 'Asia/Tokyo', 'yyyy年MM月dd日');
  Logger.log('3営業日後: ' + text);
}
```

5月1日（金）を起点にすると、翌日以降のゴールデンウィーク（土日と祝日）が飛ばされて、営業日だけがカウントされます。手で数えるとゴールデンウィークのような連休が絡むと本当にややこしいので、こういう計算こそGASの得意分野です。

### 締め日・リマインドに応用する

`addBusinessDays` と後述のトリガーを組み合わせれば、「締め日の前営業日にリマインドメールを送る」といった自動化ができます。締め日の計算部分だけこの関数に任せて、あとはメール送信の処理を足すだけです。応用の幅が広い関数なので、コピーして手元に持っておくと重宝します。

## よくある失敗と回避策

私自身が実際にやらかした失敗も含めて、つまずきやすいポイントと対処法をまとめておきます。

### カレンダーが取得できない・空になる

一番多いのが、前述の「祝日カレンダーを購読していない」ケースです。`getCalendarById` が `null` を返す、あるいは祝日なのに `isHoliday` が `false` になる場合は、まず自分のGoogleカレンダーに「日本の祝日」が表示されているか確認してください。表示されていなければ購読設定から追加します。

### 日付オブジェクトを書き換えてしまう

`countBusinessDays` や `addBusinessDays` で、渡された日付を直接 `setDate` すると、呼び出し元の変数まで変わってしまいます。これは日付オブジェクトが参照渡しになるためです。必ず `new Date(元の日付.getTime())` でコピーしてから操作しましょう。

### カレンダーAPIのクォータに触れる

`isHoliday` は毎回 `getEventsForDay` でカレンダーへアクセスします。1日ずつ営業日を判定する関数の中でこれを呼ぶと、長い期間を処理するときにカレンダーへのアクセス回数が一気に増え、GASのカレンダーAPIの利用上限（クォータ）に触れることがあります。

回避策は、**期間ぶんの祝日をまとめて一度に取得し、Setに入れておく**ことです。次のように書き換えると、カレンダーへのアクセスが1回で済みます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function countBusinessDaysFast(start, end) {
  const cal = CalendarApp.getCalendarById('ja.japanese#holiday@group.v.calendar.google.com');
  if (!cal) {
    throw new Error('祝日カレンダーが取得できません。');
  }

  // 期間内の祝日イベントをまとめて一度だけ取得する
  const events = cal.getEvents(start, end);

  // 祝日の日付を「yyyy-MM-dd」の文字列にしてSetに入れる（高速に判定するため）
  const holidaySet = new Set();
  events.forEach(function (ev) {
    const key = Utilities.formatDate(ev.getStartTime(), 'Asia/Tokyo', 'yyyy-MM-dd');
    holidaySet.add(key);
  });

  let count = 0;
  const current = new Date(start.getTime()); // 開始日をコピー

  while (current <= end) {
    const day = current.getDay(); // 0=日, 6=土
    const isWeekend = (day === 0 || day === 6);

    // その日をキー文字列にする
    const key = Utilities.formatDate(current, 'Asia/Tokyo', 'yyyy-MM-dd');

    // 平日 かつ 祝日Setに無ければ営業日
    if (!isWeekend && !holidaySet.has(key)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
```

こうしておくと、たとえ100日ぶんを処理してもカレンダーへのアクセスは1回だけです。件数が多いときや、トリガーで定期実行するときはこちらの書き方をおすすめします。

### 祝日カレンダーは取得できる年の範囲に注意

祝日カレンダーには前後の年の祝日も含まれていますが、あまりに遠い未来（数年先）の祝日はまだ登録されていないことがあります。翌年ぶんくらいまでは問題なく取れますが、遠い将来の営業日を厳密に計算したいときは、祝日データが入っているかを一度ログで確認してから使うと安心です。

## 判定ロジックの早見表

ここまで出てきた判定を、一覧表にまとめました。手元のメモ代わりにどうぞ。

| 判定したいこと | 使うメソッド・書き方 | 営業日？ |
|---|---|---|
| 日曜日か | `date.getDay() === 0` | 営業日ではない |
| 土曜日か | `date.getDay() === 6` | 営業日ではない |
| 祝日か | `cal.getEventsForDay(date).length > 0` | 営業日ではない |
| 平日かつ祝日でない | `!isWeekend(date) && !isHoliday(date)` | 営業日 |
| 期間内の営業日数 | `countBusinessDays(start, end)` | ― |
| N営業日後 | `addBusinessDays(date, n)` | ― |

この表の一番下2つが、実務で一番使う「集計」と「締め日計算」です。上の4つの判定を組み合わせれば作れるので、部品として覚えておくと応用が効きます。

## 自分でも作れるようになりたい方へ

ここまで読んで「自分でもこういう業務の自動化をやってみたい」と思ってくださった方へ。私も最初はコードなんて全く書けない、ただの看護師でした。でも、こうした「手で数えていた作業」をひとつずつGASに置き換えていくうちに、少しずつ書けるようになっていきました。

営業日の計算は、締め日リマインド・シフト管理・請求書の期日計算など、応用先がとても多いテーマです。まずはこの記事のコードをそのままコピーして、自分のカレンダーで動かしてみるところから始めてみてください。動いた瞬間の「できた!」が、次の一歩につながります。

もし独学だと不安、体系的に学びたいという方は、無料で試せるプログラミング学習サービスから始めてみるのもおすすめです。

<a href="https://h.accesstrade.net/sp/cc?rk=0100knoa00orcn" rel="nofollow" referrerpolicy="no-referrer-when-downgrade">Dive into Code（未経験からエンジニアを目指すプログラミングスクール）</a><img src="https://h.accesstrade.net/sp/rr?rk=0100knoa00orcn" width="1" height="1" border="0" alt="">

## 関連記事（あわせて読みたい）

- [/blog/gas-calendar-event-create/](/blog/gas-calendar-event-create/) … GASでGoogleカレンダーに予定を自動作成する方法。営業日計算で求めた締め日を、そのまま予定として登録したいときに役立ちます。
- [/blog/gas-trigger-clock-every-day/](/blog/gas-trigger-clock-every-day/) … 毎日決まった時刻にGASを自動実行するトリガーの設定方法。締め日リマインドを自動で回すなら必読です。
- [/blog/gas-calendar-weekly-report/](/blog/gas-calendar-weekly-report/) … カレンダーの予定を集計して週次レポートを作る方法。営業日判定と組み合わせると集計の精度が上がります。

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

掲載コードは構文とAPI仕様を確認して載せていますが、お使いの環境に合わせて調整してください。
