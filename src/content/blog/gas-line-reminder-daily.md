---
title: "毎朝ToDoをLINEに届けるGASリマインダー"
description: "Google Apps Scriptで毎朝のToDoリストをLINEに自動送信するリマインダーの作り方。スプシで管理するタスクを朝7時に配信する、看護師流の朝活レシピをやさしく紹介します。"
pubDate: "TBD"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas","line","reminder","morning"]
tagNames: ["GAS","LINE","リマインダー","朝活"]
readingTime: 5
keywords: ["GAS","LINE","リマインダー","ToDo","朝活"]
---

## こんな悩みありませんか？

朝の家事、子どもの支度、出勤準備……バタバタのうちに、今日のToDoが頭から抜ける。メモを見返す余裕もないまま、仕事先で「あ、アレやるの忘れた」。

私も以前、まさに同じ悩みでした。ToDoアプリを入れても開かず、付箋は剥がれて行方不明。そこで思いついたのが、**毎朝7時にその日のToDoをLINEで自分に送る仕組み**。スマホの通知はどうせ見るので、強制的に目に入ります。

この記事では、GASとLINE Notify的な仕組み（今回はMessaging APIのpush）でリマインダーを作る方法を、5分でわかるように紹介します。

## 全体像：シートに書いて、朝にプッシュ

構成は3ステップ。

1. スプレッドシートに「日付・内容・優先度・完了フラグ」を書いておく
2. 毎朝7時にGASが当日分のToDoを抽出してLINEへ送信
3. 完了したらフラグを立てて、翌日は出てこないようにする

**「書いて、流す、消す」**というシンプルな運用。の宿題管理と同じ仕組みで回しています。

### スプシの列構成

| A: 日付 | B: 内容 | C: 優先度 | D: 完了 |
| --- | --- | --- | --- |
| 4/22 | 次女 給食袋 | 高 | |
| 4/22 | 副業クライアント 請求書送る | 中 | |

A列が「今日」の行だけを抽出して送ります。完了したらD列に手動で「済」を入れる運用に。

## ポイント3つ

### ポイント1：時間トリガーで毎朝7時に実行

GASの「トリガー」機能で、毎朝決まった時間にスクリプトを走らせます。エディタ左側の時計アイコンから設定可能。

- 実行する関数：`sendMorningTodo`
- イベントのソース：時間主導型
- 時間ベースのトリガー：日タイマー→午前7時〜8時

一度設定すれば、あとは放っておいても毎朝届きます。夜勤明けで寝ているときも、ちゃんと配信される安心感。

### ポイント2：今日の日付だけを抽出する

スプシの全行から「今日の日付」に該当する行を絞り込みます。日付比較は文字列ではなく**Dateオブジェクトで比較**するのがコツ。

```javascript
function sendMorningTodo() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('ToDo');
  const rows = sheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayItems = [];
  for (let i = 1; i < rows.length; i++) {
    const [date, task, priority, done] = rows[i];
    if (done === '済' || !(date instanceof Date)) continue;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) {
      todayItems.push(`・[${priority || '中'}] ${task}`);
    }
  }

  if (todayItems.length === 0) return;
  const message = 'おはよう！今日のToDoだよ\n' + todayItems.join('\n');
  pushToLine(message);
}
```

件数ゼロなら送らない条件も大事。空メッセージが毎朝飛んでくると、だんだん通知を切りたくなりますよね……。

### ポイント3：LINE Messaging APIのpushで自分に送る

自分のLINEユーザーIDを事前に取得しておけば、Messaging APIの「push」で1対1メッセージが送れます。

```javascript
function pushToLine(text) {
  const TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  const USER_ID = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + TOKEN },
    payload: JSON.stringify({
      to: USER_ID,
      messages: [{ type: 'text', text: text }]
    })
  });
}
```

トークンとユーザーIDは**プロパティサービス**に保存して、コードに直接書かないのが鉄則。副業で他の人にシートを共有する場合も安心です。

## 応用：天気とカレンダー予定も一緒に届ける

慣れてきたら、**カレンダーの当日予定**も合体させて送ると、朝の確認が1通で済みます。

```javascript
function getTodayEvents() {
  const cal = CalendarApp.getDefaultCalendar();
  const events = cal.getEventsForDay(new Date());
  return events.map(e => `📅 ${e.getTitle()} (${Utilities.formatDate(e.getStartTime(), 'JST', 'HH:mm')})`);
}
```

ToDo ＋ 予定 ＋ 一言モチベが届くと、朝の気持ちの切り替えがスムーズ。三女を保育園に送り出すときに「今日もできる」と思える一通になります。

優先度「高」のタスクだけ太字風に絵文字を付けるなど、自分仕様にカスタムすると愛着も湧きますよ。

## まとめ

毎朝ToDoをLINEに届けるGASリマインダーは、**シートで管理・時間トリガー・pushで送信**の3ステップ。

ToDoアプリを使いこなす自信がない人ほど、LINEという普段使いの場所に流す方式がハマります。忘れっぽさは、性格じゃなくて仕組みで解決できる。これはナースの申し送りを自動化して実感したことでもあります。

まずは今日のToDoを1行、スプシに書いてみるところから。翌朝、LINEからの自分宛てメッセージが届いたら、その小さな感動がきっと続ける力になりますよ。

## 関連記事

- [GASで作るLINE返信Bot最小コード30行](/blog/gas-line-reply-bot/)
- [スプシの予定リストをカレンダー一括同期GAS](/blog/gas-calendar-spreadsheet-sync/)
- [Gmail未読を条件検索してラベル付与するGAS](/blog/gas-gmail-search-label/)

---

### この記事を書いた人：凛

都内で看護師をしながら、副業でWebエンジニア、夜勤の合間に副業でGASプログラマーをしています。「看護記録と家事の自動化でわかったコツ」を、同じように忙しい人へシェアするのが日課。専門用語は最小限、コピペで動くレシピ中心でお届けしています。

