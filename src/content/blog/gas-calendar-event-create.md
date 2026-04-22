---
title: "GASでGoogleカレンダーに予定登録する最短10行コード"
description: "スプレッドシートやフォームの入力からGoogleカレンダーへ予定を自動登録したい方向けに、GAS（Google Apps Script）で書く最短10行のコードと、通知・繰り返し・複数人招待まで応用例をまとめました。"
pubDate: "2026-04-29T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","event","automation"]
tagNames: ["GAS","カレンダー","予定登録","自動化"]
readingTime: 10
---

## こんな悩みありませんか？

「子どもの学校行事、夫のシフト、自分の夜勤…家族3人分をカレンダー入力するだけで30分溶ける」
「スプレッドシートにまとめたイベント一覧を、毎回手動でGoogleカレンダーに転記している」
「フォームから申し込みを受け付けたら、自動で予定登録まで行ってほしい」

こんにちは、看護師ママでGAS大好きなみっちゃんママです。私の家は三姉妹＋夫婦の5人家族で、さらに副業（Amazon物販）のイベントや講座、リベシティのオフ会まで入ると、年間で数百件の予定をカレンダーに入れています。手入力では絶対に破綻するので、早い段階でGAS（Google Apps Script）でカレンダー登録を自動化しました。

この記事では「GAS カレンダー 予定登録」で検索してきた方向けに、**10行で動く最短コード**から、実運用で効く応用テクまでまとめて紹介します。

## GASでカレンダー登録する全体像

仕組みはとてもシンプルです。GASの `CalendarApp` サービスを使って、以下の流れで予定を作ります。

1. 登録先のカレンダーを取得する（デフォルトは自分のメインカレンダー）
2. 日時・タイトル・説明・場所などを指定して `createEvent()` を呼ぶ
3. 必要に応じてゲスト招待や通知設定を追加する
4. スプレッドシートやフォームをトリガーにして、自動実行する

ここがポイントなのですが、GASは **Googleカレンダーに対してほぼカレンダーアプリと同等の操作ができます**。単発の予定も、繰り返しイベントも、複数人招待も全部OK。しかもGoogleアカウントさえあれば追加費用ゼロで使えます。

### 事前準備

script.google.com で新規プロジェクトを作り、ファイル名を `CalendarAutoCreate` などに変更。これで準備完了です。特別なライブラリやAPIキーは不要で、これも GAS のいいところですね。

## 最短10行：1件の予定を登録する

まずはシンプルな「明日の10時〜11時に『歯医者』という予定を入れる」コードから見てみましょう。

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

実行して許可を与えれば、すぐにGoogleカレンダーに予定が入ります。コードの意味はほぼ一行一行読めるレベルですが、ポイントは以下。

- `CalendarApp.getDefaultCalendar()` で自分のメインカレンダーを取得
- `new Date('...+09:00')` で日本時間として明示的に指定（ここ大事）
- `createEvent()` の4つ目の引数（オブジェクト）に説明や場所を渡せる

私は最初、タイムゾーン指定を省略して `new Date('2026-04-22 10:00:00')` と書いて、UTCとして解釈されて9時間ズレるという地獄を見ました。GASでカレンダー操作するなら、**タイムゾーンは必ず明示**が鉄則です。

## 応用に効く3つのポイント

単発で1件入れるだけなら手入力のほうが早いです。GASの本領は「スプレッドシートや外部データから一括登録」するところ。実運用で効くポイントを3つ紹介します。

### ポイント1：スプレッドシートから一括登録する

A列に日付、B列に開始時刻、C列に終了時刻、D列にタイトル、E列に場所。こんなシートを用意して、一気に登録するパターンです。

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

三姉妹の学校行事をスプレッドシートに一覧で入れて、年度初めに一気にカレンダー化する、みたいな運用にぴったりです。私は毎年4月に学校からもらう年間予定表を見ながら入力するのですが、シート入力→GAS一括流し込みが圧倒的に早いです。

### ポイント2：重複チェックを入れる

雑に何度も実行すると、同じタイトルの予定がカレンダーに何個もできてしまいます。登録前に重複チェックを入れましょう。

```javascript
const exists = cal.getEvents(start, end).some(function(e) {
  return e.getTitle() === r[3];
});
if (exists) return;
```

開始〜終了時刻の範囲に同名イベントがあれば、その行はスキップする、というシンプルな処理。地味ですがこれを入れないと、カレンダーが同じ予定で埋め尽くされる事故が起きます（経験談）。

### ポイント3：ポップアップ通知と色分け

せっかくGASで登録するなら、通知や色も自動で付けましょう。

```javascript
const event = cal.createEvent(r[3], start, end, { location: r[4] });
event.addPopupReminder(30);
event.setColor(CalendarApp.EventColor.PALE_RED);
```

`addPopupReminder(30)` は30分前のポップアップ通知。`setColor` でイベントの色も変えられます。子どもの予定は緑、自分の夜勤は赤、副業の予定は青、みたいに色で直感的に把握できるようになります。家族カレンダー運用をしているなら、この色分けが本当に効きます。

## 応用編：フォーム送信と同時にカレンダー登録

さらに一歩進んで、Googleフォームの回答をトリガーにカレンダー登録する仕組みも作れます。オフ会主催や副業の面談予約で超便利なパターンです。

フォームの回答スプレッドシートで `onFormSubmit` トリガーを設定し、以下のコードを仕込みます。

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

`guests` にメールアドレスを渡して `sendInvites: true` を指定すると、相手にもGoogleカレンダー招待メールが送られます。私は副業相談のフォームをこれで運用していて、申込みから30秒以内に双方のカレンダーに予定が入る流れを作りました。相手から「対応早いですね！」と言われる副次効果もあります。

### 繰り返しイベントを作る

毎週月曜日の朝会、のような繰り返しイベントもGASで作れます。

```javascript
const recurrence = CalendarApp.newRecurrence().addWeeklyRule().onlyOnWeekday(CalendarApp.Weekday.MONDAY);
cal.createEventSeries('朝会', start, end, recurrence);
```

これでしばらく毎週月曜に朝会が自動設定されます。子どもの習い事や定例ミーティングなど、地味に役立つ使い方です。

## つまずきやすいポイントまとめ

最後に、初心者がつまずきやすい部分をまとめます。私自身がハマった落とし穴ばかりなので、同じ轍を踏まないでください。

- **タイムゾーンズレ**：`new Date()` には必ず `+09:00` をつけるか、年月日時分を数値で分解して渡す
- **権限エラー**：初回実行時にカレンダーへのアクセス許可を忘れずに
- **予定の重複**：重複チェックを入れる or ラベル的な役割で説明欄にIDを書いておく
- **トリガー暴走**：スプレッドシートの編集トリガーを使う場合、無限ループに気をつける

特にタイムゾーンは、GAS初学者の9割がハマるところです。プロジェクトの設定メニューから「タイムゾーン」を `Asia/Tokyo` にしておくのもおすすめ。

## まとめ：10行から始めて、家族と副業を楽にする

GASでGoogleカレンダーに予定を登録する最短レシピと、実運用で効くテクニックを紹介しました。

- 単発登録は10行で書ける
- スプレッドシート連携で一括流し込みが可能
- 重複チェック・通知・色分け・ゲスト招待まで自由自在
- フォーム連携で予約システムも作れる

私自身、家族全員分の予定＋副業の予定をGASでカレンダー管理するようになってから、手入力にかけていた週1時間がゼロになりました。「GAS カレンダー 予定登録」で検索してきてくれた方、ぜひこの記事のコードをコピペから始めて、自分の生活に合った仕組みに育ててみてください。

疑問や詰まった点があれば、コメントで質問してもらえると嬉しいです。

---

【この記事を書いた人：みっちゃんママ】
三児の母＆現役ナース。夜勤と子育ての合間に副業としてGASを学び、Gmail・スプレッドシート・カレンダーの自動化レシピを公開中。プログラミング完全未経験から独学で実務に使えるレベルまで到達した経験をベースに、「コピペで動く」をモットーに情報発信しています。
