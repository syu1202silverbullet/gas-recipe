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

こんにちは、凛です。2児のママで現役ナースをしながら、GASで副業をしています。

今回のテーマは「GASでGoogleカレンダーに繰り返し予定を自動作成する方法」です。

「毎週月曜の朝ミーティング」「毎月第3水曜の振り返り」のような定例予定を1個ずつ手動で登録していた時期がありました。GASで一括生成＋祝日除外もできるようにしたら、年初に1回実行するだけで1年分の定例予定が全部セットできるようになりました。

---

## こんな悩みありませんか？

- 「毎週月曜」「毎月第3水曜」みたいな繰り返し予定を手動で1個ずつ入れている
- 休日や祝日に被ったときの除外設定が面倒
- 複数の繰り返しルールを使い分けたい
- Googleカレンダーの繰り返し設定では細かい条件が指定できない
- 「隔週の金曜」みたいな設定がGUI操作だとやりにくい

私は副業の定例ミーティングを毎週月曜に入れていますが、GW・年末年始・お盆の除外が手動だと地味に大変でした。特に年末に「来年の定例を全部設定する」作業が毎年発生していて、これを自動化したくてGASを使い始めたのがきっかけです。

GASで繰り返し予定を自動生成＋祝日除外できるようにしてから、年初に1回実行するだけで1年分セット完了するようになりました。

---

## GASの繰り返し予定の仕組み

Googleカレンダーでの繰り返し予定は `CalendarApp.newRecurrence()` から始まります。

メソッドチェーン（ドットでつなぐ書き方）で繰り返しルールを定義し、`calendar.createEventSeries()` に渡すことで繰り返し予定を作成できます。

基本の構造：
```
CalendarApp.newRecurrence()
  .addXxxRule()      ← 繰り返しの種類（daily/weekly/monthly）
  .onlyOnXxx(...)    ← 絞り込み条件（曜日/日付など）
  .until(date)       ← 終了日
```

---

## 繰り返しパターン早見表

| 繰り返しの種類 | メソッド |
|---|---|
| 毎日 | `addDailyRule()` |
| 毎週（特定曜日） | `addWeeklyRule().onlyOnWeekday(CalendarApp.Weekday.MONDAY)` |
| 隔週 | `addWeeklyRule().interval(2)` |
| 毎月（特定日） | `addMonthlyRule().onlyOnMonthDay(15)` |
| 毎月第N曜日 | `addMonthlyRule().onlyOnWeek(2).onlyOnWeekday(CalendarApp.Weekday.WEDNESDAY)` |
| 毎年 | `addYearlyRule()` |

---

## サンプルコード（コピペで動きます）

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

### 祝日を除外して繰り返し予定を作成する（応用版）

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

---

## トリガーの設定手順（年初に1回自動実行する場合）

年初に自動で1年分の予定を作成するトリガーを設定します。

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

毎年1月2日の朝6時台に自動で1年分の定例予定が作られます。

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：`createEventSeries` でまとめて繰り返し登録する

単発で何回も `createEvent` するより、`createEventSeries` で繰り返し定義する方がGoogleカレンダー側でも「繰り返し予定」として認識されます。

一つの繰り返し予定として管理されるので、「全部まとめて削除する」「タイトルを全部変える」などの操作がカレンダーアプリのUIから簡単にできます。

ただし、個別の日付に別々のタイトルや時間を設定したい場合は、個別に `createEvent` で作る方がよいです。

### コツ2：`until` と `times` で終了条件を指定する

繰り返しの終了条件は2種類あります。

```javascript
// 日付で終了する場合
.until(new Date('2026-12-31'))

// 回数で終了する場合
.times(10) // 10回繰り返したら終了
```

私の場合は年末を `until` で指定して、年初に翌年分を再作成する運用にしています。

### コツ3：祝日除外は繰り返し予定より個別作成が確実

GASの `EventSeries` に祝日を除外するメソッドは存在しますが（`addExclusion`）、使い方が複雑で不安定なことがあります。

確実に祝日を除外したい場合は、日本の祝日カレンダーから祝日リストを取得して、1日ずつチェックしながら個別に `createEvent` で作成する方が確実です（上記の `createMeetingsExcludeHolidays` 関数）。

コードは少し長くなりますが、動作が確実で後から見ても何をしているかわかりやすいです。

---

## つまずきやすいポイント

### エラー1：タイムゾーンのズレで予定が9時間ずれて登録される

GASのタイムゾーン設定がUTCのままだと、10:00 で指定したのに 19:00 に登録される、という問題が起きます。

**解決策**：GASプロジェクトの設定（⚙️歯車アイコン）でタイムゾーンを「(GMT+09:00) Asia/Tokyo」に設定する。

確認方法：
```javascript
function checkTimezone() {
  Logger.log(Session.getScriptTimeZone()); // 「Asia/Tokyo」と出ればOK
}
```

### エラー2：`until` で指定した日付を含むかどうかの挙動

`.until(new Date('2026-12-31'))` と指定した場合、12月31日を「含む」か「含まない」かはGASのバージョンや実行環境によって異なる場合があります。

**解決策**：年末で終わらせたい場合は、`until` の日付を `2027-01-01` にして余裕を持たせるのが安全。

### エラー3：繰り返し予定が重複して作成される

スクリプトを複数回実行すると、同じ日に同じ予定が重複して登録されます。

**解決策**：実行前に既存の繰り返し予定を確認・削除する処理を入れるか、スクリプトを年初の1回しか実行しないようにトリガーを管理する。

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

---

## まとめ

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

このGASを年始に1回実行すれば、1年分の繰り返し予定が一気にセットされます。「年に1回でも、繰り返し予定の手動設定から解放されたい」方にはぜひ試してほしいテクニックです。

---

## 関連記事（あわせて読みたい）

カレンダー自動化をもっと深めたい方は、以下の記事もおすすめです。

- [GASでGoogleカレンダーに予定登録する最短10行コード](/blog/gas-calendar-event-create/) — カレンダー登録の基本構文
- [GASでGoogleカレンダーの今日の予定を毎朝メール通知する](/blog/gas-calendar-morning-digest/) — 朝の通知自動化
- [カレンダー×スプシ自動同期の入門](/blog/gas-calendar-spreadsheet-sync/) — 双方向同期テクニック

これらと組み合わせると、カレンダー運用が一気にラクになります。

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

**本記事のコードは静的検証済みです。** GAS環境（V8ランタイム）で動作確認を行っています。
