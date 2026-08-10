---
title: "スプシの予定リストをカレンダー一括同期GAS"
description: "スプレッドシートに書いた予定をGoogleカレンダーへ一括登録するGASを、コピペで動くコードで解説。重複登録を防ぐイベントID方式、終日予定の日付がずれる罠、家族ごとのカレンダー振り分け、あとから修正・削除する方法までまとめました。"
pubDate: "2026-05-15T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","sync"]
tagNames: ["GAS","カレンダー","同期"]
readingTime: 13
---

子どもの習い事、自分の夜勤シフト、副業の納期、家族の通院予定。スマホのカレンダーに1件ずつ入力していると、それだけで夜が更けていきます。

私は今、**予定はまずスプレッドシートに書いて、まとめてカレンダーへ送る**という形に落ち着きました。表で一覧しながら書けるので入力が速く、家族に共有するのもシートの方がラクだからです。

この記事では、そのコードをコピペできる形で紹介します。重複登録の防ぎ方と、終日予定でつまずいた話も書いておきます。

## 用意するシート

シート名を `予定` にして、1行目に見出しを置きます。

| A：日付 | B：開始 | C：終了 | D：タイトル | E：場所 | F：メモ | G：カレンダー | H：イベントID |
|---|---|---|---|---|---|---|---|
| 2026/05/20 | 16:00 | 17:00 | ピアノ教室 | ○○音楽教室 | 月謝袋 | 子ども | |
| 2026/05/21 | | | 資源ゴミ | | | 自分 | |
| 2026/05/25 | 09:00 | 17:30 | 日勤 | | | 自分 | |

- **B・Cが空なら終日予定**として登録します
- **G列**でカレンダーを選びます（後述）
- **H列**は空のままでOK。登録すると自動で入ります（これが重複防止の鍵）

## コード全文

```javascript
// ===== 設定 =====
const SS_ID      = 'スプレッドシートのID';
const SHEET_NAME = '予定';
const TIMEZONE   = 'Asia/Tokyo';

// G列の値 → カレンダーIDの対応表
// 自分のカレンダーは 'default'、他は カレンダー設定の「カレンダーID」を貼る
const CALENDARS = {
  '自分':   'default',
  '子ども': 'xxxxxxxxxxxx@group.calendar.google.com',
  '家族':   'yyyyyyyyyyyy@group.calendar.google.com'
};

/** シートの予定をカレンダーへ一括登録する */
function syncSheetToCalendar() {
  const sheet  = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  let added = 0, skipped = 0;

  for (let i = 1; i < values.length; i++) {   // 1行目は見出し
    const row = values[i];
    const [date, start, end, title, place, memo, calName, eventId] = row;

    if (!title) continue;                       // タイトルが無い行は飛ばす
    if (eventId) { skipped++; continue; }       // すでに登録済み

    const calendar = getCalendar_(calName);
    if (!calendar) { console.log((i + 1) + '行目：カレンダー「' + calName + '」が見つかりません'); continue; }

    const baseDate = toDate_(date);
    if (!baseDate) { console.log((i + 1) + '行目：日付が読めません'); continue; }

    let event;
    if (start === '' || start === null) {
      // 終日予定
      event = calendar.createAllDayEvent(title, baseDate, { location: place || '', description: memo || '' });
    } else {
      const startAt = mergeDateTime_(baseDate, start);
      const endAt   = end ? mergeDateTime_(baseDate, end)
                          : new Date(startAt.getTime() + 60 * 60 * 1000); // 終了未指定は1時間
      event = calendar.createEvent(title, startAt, endAt, { location: place || '', description: memo || '' });
    }

    // 登録したイベントのIDをH列に書き戻す（これが重複防止になる）
    sheet.getRange(i + 1, 8).setValue(event.getId());
    added++;
  }
  console.log('登録 ' + added + '件 / 登録済みでスキップ ' + skipped + '件');
}

/** G列の名前からカレンダーを取得 */
function getCalendar_(name) {
  const id = CALENDARS[name] || 'default';
  return id === 'default' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(id);
}

/** セルの値をDateに変換（文字列で入力されていても拾う） */
function toDate_(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const m = String(value).match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** 日付＋時刻を合体させる（時刻セルがDateでも文字列でも対応） */
function mergeDateTime_(baseDate, timeValue) {
  let h = 0, mi = 0;
  if (timeValue instanceof Date) {
    h = timeValue.getHours(); mi = timeValue.getMinutes();
  } else {
    const m = String(timeValue).match(/(\d{1,2})[:時](\d{1,2})?/);
    if (m) { h = Number(m[1]); mi = Number(m[2] || 0); }
  }
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, mi);
}
```

## 使い方

1. `SS_ID` と `CALENDARS` を自分のものに書き換える
2. シートに予定を書く（H列は空のまま）
3. `syncSheetToCalendar` を実行し、権限を許可する
4. カレンダーに入ったか確認する。H列にIDが入っていれば登録済み

以降は、シートに行を足して同じ関数を実行するだけです。**すでにH列が埋まっている行は飛ばす**ので、何回実行しても重複しません。

## つまずいたところ

### 終日予定の「終了日」は翌日を指定する

`createAllDayEvent(title, 開始日, 終了日)` で複数日にまたがる予定を作るとき、**終了日は「翌日」を渡す**必要があります。

```javascript
// 5/20〜5/22の3日間の予定を作りたい場合
const from = new Date(2026, 4, 20);
const to   = new Date(2026, 4, 23);   // ← 23日（終了日の翌日）を渡す
calendar.createAllDayEvent('帰省', from, to);
```

22日を渡すと21日までの2日間になります。私はここで1日ずれた予定を量産して、しばらく気づきませんでした。

### 日付が1日ずれる／時刻が9時間ずれる

スクリプトのタイムゾーンが日本時間になっていない可能性が高いです。エディタの「プロジェクトの設定（⚙）」→ タイムゾーンで「(GMT+09:00) 日本標準時 – 東京」を選んでください。

スプレッドシート側にもタイムゾーン設定があります（ファイル → 設定）。**両方**が日本になっているか確認します。

### 時刻セルが「Date」で入ってくる

スプレッドシートに `16:00` と入力すると、見た目は時刻でも、GASからは**1899年12月30日16時のDateオブジェクト**として渡ってきます。そのまま使うと予定が1899年に作られます。

コードの `mergeDateTime_` は、時刻セルから**時と分だけ**を取り出して日付と合体させています。ここは必ず必要な処理です。

### カレンダーIDが分からない

Googleカレンダーの左側でカレンダー名にカーソルを合わせ、「︙」→「設定と共有」→ 下の方の「**カレンダーの統合**」に「カレンダーID」があります。`〜@group.calendar.google.com` の形です。自分のメインカレンダーはメールアドレスそのものになります。

## 応用：あとから修正・削除もできるようにする

H列にイベントIDを持っているので、**同じ予定を後から直す**ことができます。

```javascript
/** シートの内容でカレンダーの予定を更新する */
function updateFromSheet() {
  const sheet  = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const [date, start, end, title, place, memo, calName, eventId] = values[i];
    if (!eventId) continue;

    const calendar = getCalendar_(calName);
    const event = calendar.getEventById(eventId);
    if (!event) continue;    // カレンダー側で消されていた

    event.setTitle(title);
    event.setLocation(place || '');
    event.setDescription(memo || '');
    if (start !== '') {
      const baseDate = toDate_(date);
      const startAt  = mergeDateTime_(baseDate, start);
      const endAt    = end ? mergeDateTime_(baseDate, end) : new Date(startAt.getTime() + 3600000);
      event.setTime(startAt, endAt);
    }
  }
  console.log('更新が完了しました');
}

/** シートで「削除」と書いた行の予定を消す（I列に「削除」と入力する運用） */
function deleteMarkedEvents() {
  const sheet  = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const eventId = values[i][7];
    const flag    = values[i][8];       // I列
    if (!eventId || flag !== '削除') continue;

    const event = getCalendar_(values[i][6]).getEventById(eventId);
    if (event) event.deleteEvent();
    sheet.getRange(i + 1, 8).clearContent();   // IDを消して未登録に戻す
    console.log((i + 1) + '行目の予定を削除しました');
  }
}
```

削除は取り返しがつかないので、**シートに明示的に「削除」と書いた行だけ**が対象になるようにしています。うっかり全消しを防ぐための作りです。

## 応用：通知（リマインダー）を付ける

```javascript
const event = calendar.createEvent(title, startAt, endAt);
event.addPopupReminder(30);   // 30分前にポップアップ
event.addEmailReminder(60);   // 1時間前にメール
```

習い事の持ち物や、通院の予約は「前日にメール」を入れておくと安心です。

## 私の使い方

我が家では、月初に1回だけシートを開いて、その月の予定をまとめて書きます。

- **子ども**：習い事、行事、通院
- **自分**：夜勤シフト、副業の納期
- **家族共有**：帰省、旅行、ゴミの特別収集

シフトは月ごとに紙で配られるので、それを見ながら一気に打ち込むほうが、スマホで1件ずつ入れるより圧倒的に速いです。書いた予定はカレンダーにも入るので、家族もそれぞれのスマホで見られます。

**予定の見える化は、家族の安心感そのもの**だと感じています。

## まとめ

- シートに書いて、まとめてカレンダーへ送る形が結局いちばん速い
- 重複防止は**イベントIDをシートに書き戻す**のが確実
- 終日予定の**終了日は翌日**を渡す（1日ずれの原因）
- 時刻セルは**Dateとして渡ってくる**ので、時と分だけを取り出す
- タイムゾーンは**スクリプトとシートの両方**を確認する
- イベントIDを持っておくと、あとから更新・削除もできる

まずは今月の予定を10件だけシートに書いて、送ってみてください。カレンダーが一気に埋まる瞬間は、ちょっと気持ちがいいです。

## 関連記事

- [GASでGoogleカレンダーに予定登録する最短10行コード](/blog/gas-calendar-event-create/)
- [カレンダー予定のダブルブッキング検知GAS｜重複検出と通知](/blog/gas-calendar-conflict-check/)
- [GASトリガー設定完全ガイド｜画像付き手順と失敗しないコツ2026](/blog/gas-trigger-setup/)

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。
