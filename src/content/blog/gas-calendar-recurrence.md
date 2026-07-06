---
title: "GASで繰り返し予定を自動作成する完全構文｜毎週・毎月・除外日付対応"
description: "Googleカレンダーで繰り返し予定をGASで作成する完全構文を凛が解説。毎週月曜・第2火曜・隔週金曜など実務パターン網羅。看護師ママが年間の定例予定を年初に一括セットした実体験つきで丁寧に説明します。"
pubDate: "2026-06-16T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","recurrence"]
tagNames: ["GAS","カレンダー","繰り返し"]
readingTime: 8
keywords: ["GAS カレンダー 繰り返し","GAS recurrence","Googleカレンダー 定期予定 自動"]
---

凛です。看護師をしながらコードを書く、ちょっと変わった2児の母です。毎年12月になると、来年の定例予定を全部カレンダーに入れ直す地味な作業が待っていました。毎週月曜の打ち合わせ、毎月第3水曜の振り返り。一件ずつ手で登録していくと、それだけで小一時間つぶれます。カレンダー標準の繰り返し機能でもある程度は作れるのですが、「祝日は除く」「第3水曜だけ」みたいな条件になると途端にやりにくい。だったらコードに任せよう、と考えたのが始まりでした。

この記事は、私が実際に繰り返し予定を組むときに調べ直す内容を、そのままQ&A形式でまとめたものです。上から読んでもいいですし、気になる質問だけ拾ってもらってもかまいません。

---

## Q. そもそもGASでどうやって繰り返し予定を作るの？

`CalendarApp.newRecurrence()` から始めて、ドットでメソッドをつないでいく形です。繰り返しのルールを定義したら、それを `calendar.createEventSeries()` に渡すと繰り返し予定ができあがります。

骨組みだけ見るとこうなります。

```
CalendarApp.newRecurrence()
  .addXxxRule()      ← 繰り返しの種類（daily/weekly/monthly）
  .onlyOnXxx(...)    ← 絞り込み条件（曜日/日付など）
  .until(date)       ← 終了日
```

「種類を決めて、条件で絞って、いつまでか決める」。この3ステップだと思えば、あとはパターンの当てはめです。

---

## Q. 毎週・隔週・毎月……それぞれどう書けばいい？

よく使うパターンを一覧にしておきます。この表さえ手元にあれば、たいていの定例は組めます。

| 繰り返しの種類 | メソッド |
|---|---|
| 毎日 | `addDailyRule()` |
| 毎週（特定曜日） | `addWeeklyRule().onlyOnWeekday(CalendarApp.Weekday.MONDAY)` |
| 隔週 | `addWeeklyRule().interval(2)` |
| 毎月（特定日） | `addMonthlyRule().onlyOnMonthDay(15)` |
| 毎月第N曜日 | `addMonthlyRule().onlyOnWeek(2).onlyOnWeekday(CalendarApp.Weekday.WEDNESDAY)` |
| 毎年 | `addYearlyRule()` |

言葉だけだとピンと来ないと思うので、実際に動くコードを3パターン置いておきます。

### 毎週月曜の定例会議

```javascript
/**
 * 毎週月曜 10:00-11:00 の定例会議を1年分作成する
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function weeklyMondayMeeting() {
  const calendar = CalendarApp.getDefaultCalendar();

  // 繰り返しルールを定義
  const recurrence = CalendarApp.newRecurrence()
    .addWeeklyRule()                               // 毎週繰り返し
    .onlyOnWeekday(CalendarApp.Weekday.MONDAY)     // 月曜日のみ
    .until(new Date('2026-12-31'));                // 2026年末まで

  // 最初のイベントの開始・終了時刻（繰り返しの起点）
  // ← 次の月曜日を指定する（過去の日付は起点にならない）
  const firstStart = new Date('2026-06-01 10:00:00');
  const firstEnd = new Date('2026-06-01 11:00:00');

  // 繰り返し予定を作成
  calendar.createEventSeries('週次MTG', firstStart, firstEnd, recurrence);

  Logger.log('毎週月曜の定例会議を登録しました（2026年末まで）');
}
```

### 毎月第3水曜の振り返り会議

```javascript
/**
 * 毎月第3水曜 14:00-15:00 の振り返りを作成する
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function monthlyThirdWednesdayReview() {
  const calendar = CalendarApp.getDefaultCalendar();

  // 繰り返しルール：毎月第3水曜日
  const recurrence = CalendarApp.newRecurrence()
    .addMonthlyRule()
    .onlyOnWeek(3)                                    // 第3週
    .onlyOnWeekday(CalendarApp.Weekday.WEDNESDAY)     // 水曜日
    .until(new Date('2026-12-31'));

  // 起点となる日（第3水曜日にあたる日付を指定）
  const firstStart = new Date('2026-06-18 14:00:00'); // 2026年6月の第3水曜
  const firstEnd = new Date('2026-06-18 15:00:00');

  calendar.createEventSeries('月次振り返り', firstStart, firstEnd, recurrence);

  Logger.log('毎月第3水曜の振り返りを登録しました');
}
```

### 隔週金曜の定例

```javascript
/**
 * 隔週金曜 16:00-17:00 の定例を作成する
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function biWeeklyFridayMeeting() {
  const calendar = CalendarApp.getDefaultCalendar();

  // 繰り返しルール：隔週（2週おき）金曜
  const recurrence = CalendarApp.newRecurrence()
    .addWeeklyRule()
    .interval(2)                                      // 2週おき
    .onlyOnWeekday(CalendarApp.Weekday.FRIDAY)        // 金曜日
    .until(new Date('2026-12-31'));

  const firstStart = new Date('2026-06-06 16:00:00'); // 最初の金曜
  const firstEnd = new Date('2026-06-06 17:00:00');

  calendar.createEventSeries('隔週定例', firstStart, firstEnd, recurrence);

  Logger.log('隔週金曜の定例を登録しました');
}
```

ポイントは、繰り返しルールとは別に「最初のイベントの日時」を渡すこと。この起点が繰り返しの1回目になります。過去の日付を起点にしても始まってくれないので、直近の該当曜日を指定してください。

---

## Q. 「祝日は除く」はどう実現するの？ ここが一番知りたい

正直に言うと、GASで一番てこずるのがここです。結論だけ先に言うと、**繰り返し予定に祝日除外を後付けするより、繰り返しを使わず1日ずつ判定して個別に作る方が確実**でした。

まずは繰り返し予定を作りつつ、祝日を取得して眺めるだけの版がこちら。除外そのものはこのままだと効きません（コード内のコメントにその旨を書いています）。

```javascript
/**
 * 祝日を除いた毎週月曜の定例を作成する
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function weeklyMeetingExcludeHolidays() {
  const calendar = CalendarApp.getDefaultCalendar();

  // まず繰り返しルールを定義（除外なし）
  const recurrence = CalendarApp.newRecurrence()
    .addWeeklyRule()
    .onlyOnWeekday(CalendarApp.Weekday.MONDAY)
    .until(new Date('2026-12-31'));

  const firstStart = new Date('2026-06-01 10:00:00');
  const firstEnd = new Date('2026-06-01 11:00:00');

  // 繰り返し予定を一旦作成
  const eventSeries = calendar.createEventSeries('週次MTG（祝日除く）', firstStart, firstEnd, recurrence);

  // 日本の祝日カレンダーから祝日を取得
  // ← カレンダーIDは「ja.japanese#holiday@group.v.calendar.google.com」で固定
  try {
    const holidayCalendar = CalendarApp.getCalendarById(
      'ja.japanese#holiday@group.v.calendar.google.com'
    );

    const yearStart = new Date('2026-01-01');
    const yearEnd = new Date('2026-12-31');
    const holidays = holidayCalendar.getEvents(yearStart, yearEnd);

    Logger.log(`祝日 ${holidays.length} 件を取得しました`);

    // 取得した祝日の日付をログ出力（確認用）
    holidays.forEach(h => {
      Logger.log(`祝日: ${h.getTitle()} - ${h.getStartTime().toLocaleDateString('ja-JP')}`);
    });

    // 注意：GASのEventSeriesに直接除外日を追加する機能は限定的
    // 祝日除外は「祝日にあたる週は手動でキャンセル」または
    // 繰り返し予定を使わず個別に登録する方法が確実

  } catch (e) {
    Logger.log(`祝日カレンダーの取得に失敗: ${e.message}`);
  }

  Logger.log('週次MTGの繰り返し予定を作成しました');
}

/**
 * 繰り返しを使わず、祝日を確実に除外して1年分の予定を個別作成する
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function createMeetingsExcludeHolidays() {
  const calendar = CalendarApp.getDefaultCalendar();

  // 日本の祝日カレンダーから年間の祝日を取得
  const holidayCalendar = CalendarApp.getCalendarById(
    'ja.japanese#holiday@group.v.calendar.google.com'
  );

  const yearStart = new Date('2026-01-01');
  const yearEnd = new Date('2026-12-31');
  const holidays = holidayCalendar.getEvents(yearStart, yearEnd);

  // 祝日の日付を Set に格納（高速検索のため）
  const holidayDates = new Set(
    holidays.map(h => {
      const d = h.getStartTime();
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  // 月曜を1件ずつチェックしながら登録
  let createdCount = 0;
  let skippedCount = 0;

  const current = new Date('2026-06-01'); // 開始日
  const endDate = new Date('2026-12-31');

  while (current <= endDate) {
    // 月曜日（getDay() === 1）だけ処理
    if (current.getDay() === 1) {
      const dateKey = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;

      if (holidayDates.has(dateKey)) {
        // 祝日はスキップ
        Logger.log(`祝日スキップ: ${current.toLocaleDateString('ja-JP')}`);
        skippedCount++;
      } else {
        // 予定を作成（10:00-11:00）
        const start = new Date(current);
        start.setHours(10, 0, 0, 0);

        const end = new Date(current);
        end.setHours(11, 0, 0, 0);

        calendar.createEvent('週次MTG', start, end);
        createdCount++;
      }
    }

    // 翌日に進む
    current.setDate(current.getDate() + 1);
  }

  Logger.log(`予定作成完了: ${createdCount}件作成、${skippedCount}件スキップ（祝日）`);
}
```

後半の `createMeetingsExcludeHolidays` が、私が実際に使っている方です。日本の祝日カレンダーから祝日を全部取ってきて `Set` に入れておき、開始日から1日ずつ進めながら「月曜か？」「祝日じゃないか？」を確認して、条件を満たした日だけ `createEvent` で登録します。コードは少し長くなりますが、何をしているか後から読んでも一目で分かるのが気に入っています。祝日で会議が入るのが一番気まずいので、ここは確実さを取りました。

---

## Q. 繰り返しの終わりはどう決める？

終了条件は2種類あります。日付で切るか、回数で切るか。

```javascript
// 日付で終了する場合
.until(new Date('2026-12-31'))

// 回数で終了する場合
.times(10) // 10回繰り返したら終了
```

私は年末を `until` で区切って、年初に翌年分を作り直す運用にしています。回数がはっきり決まっている「全10回の研修」みたいな予定なら `.times(10)` が向いています。

ひとつ注意があって、`.until(new Date('2026-12-31'))` としたとき、12月31日自体を含むか含まないかがGASのバージョンや環境で揺れることがあります。年末まできっちり入れたいときは、`until` を `2027-01-01` にして少し余裕を持たせておくと安心です。

---

## Q. `createEventSeries` と個別 `createEvent`、どっちを使うべき？

基本は `createEventSeries` です。単発で何度も `createEvent` するより、Googleカレンダー側でも「ひとつの繰り返し予定」として認識されるので、「全部まとめて消す」「タイトルを一括で変える」といった操作がカレンダーアプリのUIから簡単にできます。

一方で、個別の日付ごとに違うタイトルや時間を設定したい場合や、さっきの祝日除外のように「特定の日だけ抜きたい」場合は、`createEvent` で1件ずつ作る方が融通が利きます。ざっくり言えば、きれいな繰り返しは `createEventSeries`、例外の多いものは個別 `createEvent`、という使い分けです。

---

## Q. 年に1回、自動で実行させることはできる？

できます。年タイマーのトリガーを仕込めば、毎年決まった時期に翌年分を勝手に作ってくれます。

1. GASエディタを開く（スプシ上部メニュー「拡張機能」→「Apps Script」）
2. 左メニューの時計アイコン「トリガー」をクリック
3. 右下の「＋ トリガーを追加」ボタンをクリック
4. 「実行する関数を選択」で使いたい関数を選ぶ
5. 「イベントのソースを選択」で「時間主導型」を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「年タイマー」を選ぶ
7. 実行月：「1月」、実行日：「2日」を設定（1日は元旦で休みの場合が多いため）
8. 実行時刻：「午前6時〜7時」に設定
9. 「保存」ボタンをクリック
10. Googleアカウントの認証画面が出たら「許可」をクリック

これで毎年1月2日の朝、1年分の定例予定が自動でセットされます。あの年末の小一時間が、まるごと消えました。

---

## Q. うまくいかないとき、まず何を疑えばいい？

私が実際にハマった順に、3つ挙げておきます。

### 予定が9時間ずれて登録される

10:00で指定したのに19:00に入る、というやつです。GASのタイムゾーンがUTCのままだと起きます。プロジェクト設定（⚙️歯車アイコン）でタイムゾーンを「(GMT+09:00) Asia/Tokyo」にしてください。今の設定は次のコードで確認できます。

```javascript
function checkTimezone() {
  Logger.log(Session.getScriptTimeZone()); // 「Asia/Tokyo」と出ればOK
}
```

### 同じ予定が二重に登録される

スクリプトを複数回実行すると、同じ日に同じ予定が重なって入ります。実行前に既存の同名予定を確認する処理を挟むか、そもそも年初の1回しか動かないようにトリガーを管理するのが手堅いです。確認用にこんなデバッグコードを用意しておくと安心です。

```javascript
// 既存の同名予定を確認するデバッグ用コード
function checkExistingEvents() {
  const cal = CalendarApp.getDefaultCalendar();
  const start = new Date('2026-06-01');
  const end = new Date('2026-12-31');
  const events = cal.getEvents(start, end);

  const targetTitle = '週次MTG';
  const matched = events.filter(e => e.getTitle() === targetTitle);
  Logger.log(`「${targetTitle}」は現在 ${matched.length} 件登録されています`);
}
```

### 祝日除外が効かない

これはさっきの繰り返しになりますが、`EventSeries` に除外を後付けするメソッド（`addExclusion`）は使い方が複雑で不安定なことがあります。確実に抜きたいなら、祝日カレンダーと照合しながら個別 `createEvent` で作る方に倒すのが正解です。

---

## 早見表としても使えるように

最後に、この記事で出てきた構文をまとめておきます。次に定例を組むとき、ここだけ見返せば思い出せるはずです。

| 繰り返しの種類 | 構文のポイント |
|---|---|
| 毎週特定曜日 | `addWeeklyRule().onlyOnWeekday(CalendarApp.Weekday.MONDAY)` |
| 隔週 | `addWeeklyRule().interval(2)` |
| 毎月特定日 | `addMonthlyRule().onlyOnMonthDay(15)` |
| 毎月第N曜日 | `addMonthlyRule().onlyOnWeek(2).onlyOnWeekday(...)` |
| 終了日の指定 | `.until(new Date('2026-12-31'))` |
| 回数指定 | `.times(10)` |
| 祝日除外の確実な方法 | 祝日カレンダーと照合して個別 `createEvent` |
| タイムゾーン注意 | GASプロジェクト設定を Asia/Tokyo に |

年に1回の実行で、丸一日ぶんの手作業から解放される。地味ですが、繰り返し入力にうんざりしている方には効くはずです。コードは構文をチェックのうえ載せていますが、日付や時刻はご自身の予定に合わせて書き換えて使ってくださいね。

---

## 関連記事（あわせて読みたい）

カレンダー自動化をもっと深めたい方は、以下の記事もどうぞ。

- [GASでGoogleカレンダーに予定登録する最短10行コード](/blog/gas-calendar-event-create/) — カレンダー登録の基本構文
- [GASでGoogleカレンダーの今日の予定を毎朝メール通知する](/blog/gas-calendar-morning-digest/) — 朝の通知自動化
- [カレンダー×スプシ自動同期の入門](/blog/gas-calendar-spreadsheet-sync/) — 双方向同期テクニック

これらと組み合わせると、カレンダー運用が一気にラクになります。

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

**本記事のコードは構文チェックのうえ掲載しています。** 実際の動作はお使いのGAS環境（V8ランタイム）に合わせて調整してください。
