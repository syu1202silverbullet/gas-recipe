---
title: "Gmail未読を条件検索してラベル付与するGAS"
description: "Gmailの未読メールを条件検索し、自動でラベルを付けて仕分けするGoogle Apps Scriptのレシピ。夜勤明けでも受信箱がスッキリ整う時短テクを、看護師ママ目線でやさしく解説します。"
pubDate: "2026-05-13T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas","gmail","label"]
tagNames: ["GAS","Gmail","ラベル"]
readingTime: 5
keywords: ["GAS","Gmail","ラベル","未読","自動仕分け"]
---

## こんな悩みありませんか？

夜勤明けにスマホを開くと、未読メールが100件超え……。病院からの連絡、学校のお便り、ネットショップのセール情報が全部ごちゃまぜで、大事なメールを見落としかけたこと、ありませんか？

みっちゃんママも、三姉妹の学校連絡と副業の依頼メールが混ざって、受信箱で迷子になっていた時期がありました。そんなとき助けてくれたのがGoogle Apps Script（以下GAS）のラベル自動付与。この記事では、**Gmailの未読メールを条件検索してラベル付け**する最小コードを紹介します。

コピペで動く形にしてあるので、プログラミング経験ゼロでも大丈夫。読了時間は5分ほどです。

## 全体像：GASがやってくれること

今回作るスクリプトの流れはシンプルです。

1. Gmailの中から「未読」かつ「指定キーワードを含む」メールを検索する
2. 該当スレッドに、あらかじめ決めたラベルを付与する
3. トリガーで定期実行（例：15分おき）する

つまり**条件検索 → ラベル貼り → 自動化**の3ステップ。手作業でやっていた仕分けを、バックグラウンドでGASが代わりに回してくれるイメージです。

Gmailには「フィルタ機能」も標準搭載されていますが、「件名と本文と送信元を組み合わせた複雑な条件」「時期によってルールを切り替えたい」といった要望には意外と弱い。GASなら条件分岐を柔軟に書けるので、自分専用の仕分けロジックが作れます。

## ポイント3つ

### ポイント1：GmailApp.search()の検索演算子を使いこなす

GASでGmailを操作する中心メソッドが`GmailApp.search()`です。引数には**Gmail検索ボックスで使うのと同じ演算子**が渡せます。

```javascript
function labelUnreadFromSchool() {
  // 未読 & 送信元に「school.jp」を含む & 受信から1日以内
  const query = 'is:unread from:school.jp newer_than:1d';
  const threads = GmailApp.search(query, 0, 50);

  const label = GmailApp.getUserLabelByName('学校') || GmailApp.createLabel('学校');
  threads.forEach(thread => thread.addLabel(label));
}
```

`is:unread` `from:` `subject:` `has:attachment` `newer_than:` などを組み合わせられるので、Gmail画面で普段使う検索式がそのまま流用できます。まずはGmail上で検索式を試して、思い通りの結果が出るものをスクリプトにコピーするのがコツ。

### ポイント2：ラベルは「あれば使う、なければ作る」

毎回スクリプトを書き換えるのは面倒なので、**ラベルが存在しなければ自動作成**する書き方を定番化しておきましょう。

```javascript
function getOrCreateLabel(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}
```

この関数を用意しておくと、他のスクリプトでも使い回せて便利です。みっちゃんママは「学校」「病院シフト」「副業」「ネットショップ」の4ラベルを自動運用しています。

### ポイント3：処理件数の上限を決める

GASには1日あたりの実行時間や、Gmail操作回数の制限があります（通常アカウントで1日20,000件程度）。未読が大量にたまっている場合に一気に処理させると、途中で止まることも。

```javascript
const MAX_THREADS = 50; // 1回の実行で処理する上限
const threads = GmailApp.search(query, 0, MAX_THREADS);
```

1回あたりの処理件数を50〜100件に抑え、15分おきに回す運用がおすすめ。三姉妹のお弁当作りと同じで、**一気に全部やろうとせず、小分けで回す**のが続くコツです。

## 応用：ラベル付与＋スプシ記録で「見える化」

ラベルを貼るだけでも便利ですが、さらに**スプレッドシートに記録**すれば、月間の受信傾向が見えてきます。

```javascript
function logAndLabel() {
  const query = 'is:unread label:inbox';
  const threads = GmailApp.search(query, 0, 30);
  const sheet = SpreadsheetApp.getActive().getSheetByName('メール記録');
  const label = getOrCreateLabel('処理済み');

  threads.forEach(thread => {
    const msg = thread.getMessages()[0];
    sheet.appendRow([new Date(), msg.getFrom(), msg.getSubject()]);
    thread.addLabel(label);
  });
}
```

「今月は学校からの連絡が何件来たか」「副業依頼は前月比でどう変化したか」が可視化されると、時間の使い方を見直すきっかけになります。データがあると家族会議もスムーズ。

## まとめ

Gmailの未読を条件検索してラベルを付けるGASは、**検索演算子・ラベル自動生成・処理上限**の3点を押さえれば、30行ほどで完成します。

夜勤明けの受信箱整理は、もうGASに任せちゃいましょう。浮いた時間は三姉妹とのおやつタイムに。みっちゃんママの副業が続いているのも、この「小さな自動化の積み重ね」のおかげです。

まずは自分の検索演算子をひとつ、GASに書き写してみるところからスタートしてみてくださいね。

## 関連記事

- [GASで一斉メール送信300件までの安全な書き方](/blog/gas-gmail-bulk-send/)
- [スプシの予定リストをカレンダー一括同期GAS](/blog/gas-calendar-spreadsheet-sync/)
- [GASで作るLINE返信Bot最小コード30行](/blog/gas-line-reply-bot/)

---

### この記事を書いた人：みっちゃんママ

三姉妹の母で現役ナース、夜勤の合間に副業でGASプログラマーをしています。「看護記録と家事の自動化でわかったコツ」を、同じように忙しい人へシェアするのが日課。専門用語は最小限、コピペで動くレシピ中心でお届けしています。

