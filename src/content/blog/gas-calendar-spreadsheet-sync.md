---
title: "スプシの予定リストをカレンダー一括同期GAS"
description: "スプレッドシートに書いた予定をGoogleカレンダーへ一括登録するGAS。三姉妹の習い事、夜勤シフト、副業納期を一枚のシートで管理する看護師ママの時短術を、コピペで動く形で紹介します。"
pubDate: "2026-05-15T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","sync"]
tagNames: ["GAS","カレンダー","同期"]
readingTime: 6
keywords: ["GAS","スプレッドシート","Googleカレンダー","同期","予定管理"]
---

## こんな悩みありませんか？

三姉妹の習い事、自分の夜勤シフト、副業の納期、家族の通院予定……スマホのカレンダーに1件ずつ入力していたら、それだけで夜が更けてしまいますよね。

「紙のスケジュール帳を見ながらポチポチ入れる時間、もったいない」「家族にも共有したいのに、手打ちだとミスる」。みっちゃんママもまったく同じでした。

そこで出番なのが、**スプレッドシートに書いた予定をGoogleカレンダーへ一括同期するGAS**。一枚のシートで家族全員の予定を管理できて、更新もボタン1つ。読了時間6分、がんばって書きました。

## 全体像：シート1枚＋GAS1個で完結

構成はシンプル。

1. **スプレッドシート側**：タイトル・開始・終了・場所・メモ・カレンダーID・登録済みフラグを列で並べる
2. **GAS側**：未登録行を読み、`CalendarApp`でイベント作成、登録済みフラグに書き戻す
3. **トリガー**：編集後に手動実行、または1日1回自動実行

家族別にカレンダーを分けておき、カレンダーID列で振り分ければ、**ママ用・パパ用・子ども用に自動仕分け**できます。

### スプシの列構成例

| A: タイトル | B: 開始 | C: 終了 | D: 場所 | E: メモ | F: カレンダーID | G: 登録済み |
| --- | --- | --- | --- | --- | --- | --- |
| 三女 ピアノ | 4/22 17:00 | 4/22 18:00 | 駅前スタジオ | 楽譜持参 | family@... | |

登録済み列（G列）が空の行だけをGASで処理します。こうしておけば、**何度実行しても重複登録されません**。

## ポイント3つ

### ポイント1：CalendarApp.getCalendarById()で家族別に振り分ける

GoogleカレンダーをIDで指定すると、家族カレンダーや仕事カレンダーへ振り分けが自由自在。

```javascript
function syncCalendar() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('予定');
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const [title, start, end, place, memo, calId, done] = rows[i];
    if (done === '済' || !title) continue;

    const cal = CalendarApp.getCalendarById(calId);
    cal.createEvent(title, new Date(start), new Date(end), {
      location: place,
      description: memo
    });

    sheet.getRange(i + 1, 7).setValue('済');
  }
}
```

カレンダーIDは、Googleカレンダーの「設定」→対象カレンダー→「カレンダーの統合」で確認できます。

### ポイント2：日付は必ずDateオブジェクトに変換

スプシのセルから読んだ日付は、そのまま使えないことがあります。念のため`new Date()`でラップするのが安全。

```javascript
const startDate = new Date(start);
const endDate = new Date(end);
if (isNaN(startDate.getTime())) {
  Logger.log('日付形式エラー: ' + start);
  continue;
}
```

セルを「日付と時刻」形式にフォーマットしておくと、ズレが出にくいです。**看護シフトのように1分単位で正確さが要る予定**は、この検証ステップを省かないでくださいね。

### ポイント3：登録済みフラグで重複を防ぐ

GASあるあるが「何度も実行して同じ予定が何個もカレンダーに並ぶ」事故。G列に「済」を書き込む運用にしておくと、繰り返し実行しても安全です。

```javascript
if (done === '済') continue;
// 登録成功後
sheet.getRange(i + 1, 7).setValue('済');
```

さらに、もし予定を変更したい場合は「済」を消してから再実行、という運用にすれば、**更新作業もボタン1つ**で回せます。

## 応用：繰り返し予定とリマインダー設定

月曜の通院や毎週水曜のピアノ教室のような**繰り返し予定**は、`createEventSeries()`を使います。

```javascript
const recurrence = CalendarApp.newRecurrence()
  .addWeeklyRule()
  .onlyOnWeekday(CalendarApp.Weekday.WEDNESDAY)
  .until(new Date('2026-12-31'));

cal.createEventSeries(title, new Date(start), new Date(end), recurrence, {
  location: place,
  description: memo
});
```

また、オプションに`sendInvites: true`を足せば、**家族のGoogleアカウントにそのまま招待**も送れます。夜勤入りの日だけ旦那さんにリマインドしたい、みたいな細かな調整も、シートを書き換えるだけで済みますよ。

## まとめ

スプシの予定リストをGASでカレンダーへ一括同期すると、**入力作業が1ファイルに集約**され、家族全員で共通認識が持てます。

カレンダーID指定・日付検証・登録済みフラグ、この3つさえ押さえれば運用は安定。紙のスケジュール帳を見ながら1件ずつ入力していた時間は、子どもたちとの絵本タイムに回しちゃいましょう。

三姉妹の母の実体験から言うと、**予定の見える化は、家族の安心感そのもの**です。

## 関連記事

- [Gmail未読を条件検索してラベル付与するGAS](/blog/gas-gmail-search-label/)
- [GASで作るLINE返信Bot最小コード30行](/blog/gas-line-reply-bot/)
- [毎朝ToDoをLINEに届けるGASリマインダー](/blog/gas-line-reminder-daily/)

---

### この記事を書いた人：みっちゃんママ

三姉妹の母で現役ナース、夜勤の合間に副業でGASプログラマーをしています。「看護記録と家事の自動化でわかったコツ」を、同じように忙しい人へシェアするのが日課。専門用語は最小限、コピペで動くレシピ中心でお届けしています。

