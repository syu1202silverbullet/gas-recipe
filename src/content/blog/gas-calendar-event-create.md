---
title: "GASでGoogleカレンダーに予定登録する最短10行コード"
description: "スプレッドシートやフォームの入力からGoogleカレンダーへ予定を自動登録したい方向けに、GAS（Google Apps Script）で書く最短10行のコードと、通知・繰り返し・複数人招待まで応用例をまとめました。"
pubDate: "2026-07-10T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","event","automation"]
tagNames: ["GAS","カレンダー","予定登録","自動化"]
readingTime: 10
---

こんにちは、看護師をしながらGASで副業をしている凛です。夫婦とも仕事をしながらの育児で、子どもの行事・夫のシフト・自分の夜勤・副業の締め切りと、年間で数百件の予定をカレンダーに入れています。手入力ではとても回らないので、早々にGASに任せました。

先に結論から出します。Googleカレンダーへの予定登録は、突き詰めると次の10行に収まります。

```javascript
function createSingleEvent() {
  const cal = CalendarApp.getDefaultCalendar();
  const start = new Date('2026-04-22T10:00:00+09:00');
  const end = new Date('2026-04-22T11:00:00+09:00');
  cal.createEvent('歯医者', start, end, {
    description: '定期健診。保険証持参',
    location: '〇〇デンタルクリニック'
  });
}
```

実行して許可を与えれば、それだけでカレンダーに「歯医者」の予定が入ります。この記事では、この短いコードが**なぜこの書き方になるのか**をほどいてから、スプシ連携やフォーム連携といった実運用の形に広げていきます。

## なぜこの10行なのか

一行ずつ、そう書く理由があります。

- `CalendarApp.getDefaultCalendar()` は自分のメインカレンダーを取ってくる部分です。特別なライブラリもAPIキーもいりません。Googleアカウントがあれば追加費用ゼロで動くのが、GASでカレンダーを触る一番のうまみです。
- `new Date('...+09:00')` の `+09:00` が、この記事で一番強調したいところです。ここを省くと日本時間として扱われず、予定がずれます（理由は後述します）。
- `createEvent()` の4つ目の引数はオブジェクトで、`description` や `location` を渡せます。ここに情報を足していくと、そのまま実用的な予定になります。

事前準備もほとんどありません。script.google.com で新規プロジェクトを作り、ファイル名を `CalendarAutoCreate` あたりに変えるだけ。これで書き始められます。

正直、1件だけ入れるなら手で打ったほうが速いです。GASが効いてくるのは「表や外部データから一気に流し込む」場面から。ここから実運用に近づけていきます。

## スプレッドシートから一括で流し込む

A列に日付、B列に開始時刻、C列に終了時刻、D列にタイトル、E列に場所。この形のシートを用意して、まとめて登録するパターンです。

```javascript
function createFromSheet() {
  const cal = CalendarApp.getDefaultCalendar();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('予定');
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
  rows.forEach(function(r) {
    const start = new Date(r[0].getFullYear(), r[0].getMonth(), r[0].getDate(), r[1], 0);
    const end = new Date(r[0].getFullYear(), r[0].getMonth(), r[0].getDate(), r[2], 0);
    cal.createEvent(r[3], start, end, { location: r[4] });
  });
}
```

私は毎年4月に学校からもらう年間予定表を、まずシートに一覧で書き写します。行で並べると全体が見渡せるので、抜けや重なりに気づきやすいんですよね。そこまでできたら、あとはこの関数を一回走らせるだけ。1件ずつカレンダーに打ち込んでいた頃とは、かける時間がまるで違います。

ここで気づいた方もいるかもしれません。日付を `new Date(年, 月, 日, 時, 0)` と数値でバラして渡しています。これは文字列でタイムゾーンを付け忘れる事故を避けるための書き方で、次の話につながります。

## ハマりどころ1：タイムゾーンで9時間ずれる

GASでカレンダーを触る人の多くが、最初にここで転びます。私もそうでした。

`new Date('2026-04-22 10:00:00')` のようにタイムゾーンを付けずに書くと、GASの実行環境（デフォルトはUTC）で解釈されて、予定が9時間ずれます。10時のつもりが19時に入る、あの脱力する現象です。

対策は2つ。文字列で渡すなら必ず `+09:00` を付ける。もしくは、上のスプシ連携のように年月日時分を数値で分解して渡す。あわせて、プロジェクト設定（歯車アイコン）の「タイムゾーン」を `Asia/Tokyo` にしておくと、より安全側に倒せます。GAS初学者がつまずく箇所のかなりの割合が、実はこのタイムゾーンです。

## ハマりどころ2：同じ予定が何個も増える

雑に何度も実行すると、同名の予定がカレンダーにポコポコ増えていきます。特にトリガーで自動実行していると、走るたびに重複が積み上がる。私も一度カレンダーが同じ予定で埋まって青ざめたことがあります。

登録の前に、同じ時間帯に同名イベントがないかをチェックしましょう。

```javascript
const exists = cal.getEvents(start, end).some(function(e) {
  return e.getTitle() === r[3];
});
if (exists) return;
```

開始〜終了の範囲に同名イベントがあれば、その行はスキップするだけの短い処理です。地味ですが、これが入っているかどうかで安心感がまるで変わります。

## 通知と色分けで「見落とし」を減らす

せっかくGASで登録するなら、通知や色も同時に付けてしまうと後がラクです。

```javascript
const event = cal.createEvent(r[3], start, end, { location: r[4] });
event.addPopupReminder(30);
event.setColor(CalendarApp.EventColor.PALE_RED);
```

`addPopupReminder(30)` は30分前のポップアップ通知。通知を付け忘れて大事な予定に遅刻しかけたことがあってから、私は登録時に必ず入れるようにしました。`setColor` で色も変えられるので、子どもの予定は緑、自分の夜勤は赤、副業の締め切りは青、というふうに分けておくと、カレンダーを開いた瞬間に「今日は何の日か」が直感で分かります。家族でカレンダーを共有しているなら、この色分けは本当に効きます。

## もう一歩:フォーム送信と同時に登録する

さらに進めると、Googleフォームの回答をきっかけにカレンダー登録まで走らせられます。副業の面談予約やオフ会主催で重宝するパターンです。

フォームの回答スプシで `onFormSubmit` トリガーを設定し、次のコードを仕込みます。

```javascript
function onFormSubmit(e) {
  const cal = CalendarApp.getDefaultCalendar();
  const values = e.values; // [送信日時, 名前, 日付, 開始, 終了, メールアドレス]
  const start = new Date(values[2] + ' ' + values[3] + '+09:00');
  const end = new Date(values[2] + ' ' + values[4] + '+09:00');
  cal.createEvent(values[1] + 'さんとの面談', start, end, {
    description: '申込者: ' + values[1],
    guests: values[5],
    sendInvites: true
  });
}
```

`guests` にメールアドレスを渡して `sendInvites: true` を付けると、相手にもGoogleカレンダーの招待が飛びます。私は副業相談のフォームをこれで回していて、申込みから30秒ほどで双方のカレンダーに予定が入る流れにしています。「対応が早いですね」と言われる副産物までついてきました。

### 繰り返しイベントも一行で

毎週月曜の朝会のような繰り返しも、GASなら短く書けます。

```javascript
const recurrence = CalendarApp.newRecurrence().addWeeklyRule().onlyOnWeekday(CalendarApp.Weekday.MONDAY);
cal.createEventSeries('朝会', start, end, recurrence);
```

これで毎週月曜に朝会が自動でセットされます。子どもの習い事や定例ミーティングなど、地味に効く使い方です。

## ここまでやって思うこと

10行から始めたコードが、気づけば家族全員分の予定と副業のスケジュールをまとめて面倒みてくれるようになりました。手入力にかけていた週1時間は、まるごと消えています。

タイムゾーンと重複チェック、この2つだけ最初に押さえておけば、あとは自分の生活に合わせて育てていくだけです。まずは冒頭の10行を1件だけ動かして、予定がちゃんと入る感触を確かめてみてください。掲載のコードは構文・API仕様・ロジックを確認していますが、お使いの環境に合わせて調整してくださいね。詰まった点があれば、コメントで聞いてもらえると嬉しいです。

## 関連記事

- [GASでGoogleフォームの回答をスプシに自動整形](/blog/gas-form-sheet-auto/) — フォームとの組み合わせ
- [GASでGmail自動返信を5分で作る最短レシピ](/blog/gas-gmail-auto-reply/) — カレンダー登録と同時にメール通知
- [GASでLINE通知を送る最短レシピ](/blog/gas-line-notify-basic/) — 予定登録完了をLINEに通知

---

### この記事を書いた人：凛
2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
