---
title: "GASで一斉メール送信300件までの安全な書き方"
description: "Google Apps Scriptで複数宛先に一斉メール送信する方法を、現役ナース目線で安全重視に解説。スプシの宛先リストを使い、送信上限やエラー回避のコツも看護師がやさしくまとめます。"
pubDate: "2026-05-14T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas","gmail","bulk"]
tagNames: ["GAS","Gmail","一斉送信"]
readingTime: 6
keywords: ["GAS","一斉メール","Gmail","スプレッドシート","送信上限"]
---

## こんな悩みありませんか？

保護者会の連絡網、地域のサークル、副業クライアントへの月次レポート……「同じ文面を大勢に送る」シーン、意外と多いですよね。

一人ずつToに入れて送ると、誤ってCc/Bccがバレたり、宛名だけ差し替え忘れて別の人の名前で送ってしまったり。凛も学校の連絡係を任されたときに、宛名ミスで冷や汗をかいた経験があります。

そこで今回は、**GASでスプレッドシートの宛先リストから300件までを安全に一斉送信**する書き方を紹介します。「安全」がキーワード。急いで送るより、ちゃんと届く方が大事です。

## 全体像：やることは3ブロックだけ

今回のスクリプトは、大きく次の3ブロックで構成します。

1. **リスト読込**：スプレッドシートから「メールアドレス・宛名・個別メッセージ」を取得
2. **送信ループ**：1件ずつGmailAppで送信、差し込み文言を組み立てる
3. **送信ログ記録**：送信済みフラグと送信日時をシートに書き戻す

ポイントは**1件ずつループで送る**こと。一斉送信と聞くとBccに全員入れる方法を思い浮かべがちですが、宛名を差し込みたいなら1件ずつが基本。件数が多いほど「個別送信」の体裁が信頼にもつながります。

## ポイント3つ

### ポイント1：Gmailの送信上限を意識する

Google Apps ScriptでのGmail送信には、**1日あたりの上限**があります（無料アカウントで100通、Google Workspaceで1500通が一般的な目安。仕様は公式で随時確認を）。

上限を超えると後続の送信がエラーで止まるので、1日の送信数を事前にチェックする書き方を覚えておくと安心です。

```javascript
function checkQuota() {
  const remaining = MailApp.getRemainingDailyQuota();
  Logger.log('本日あと ' + remaining + ' 通送れます');
  return remaining;
}
```

300件を一気に送りたい場合は、**Workspaceアカウント**か、**複数日に分けた分割送信**を検討しましょう。凛は副業で大量配信が必要なときは、Workspaceを使っています。

### ポイント2：宛名差し込みでテンプレートを使い回す

スプシのA列にメールアドレス、B列に宛名、C列に個別メモを入れておき、本文テンプレートに差し込む形がスマートです。

```javascript
function sendBulkMail() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('送信先');
  const rows = sheet.getDataRange().getValues();
  const subject = '【4月のお知らせ】保護者会のご案内';

  for (let i = 1; i < rows.length; i++) {
    const [email, name, memo, sent] = rows[i];
    if (sent === '済') continue; // 送信済みはスキップ

    const body = `${name} 様\n\n` +
                 `いつもお世話になっております。\n` +
                 `次回の保護者会についてご案内します。\n\n` +
                 `${memo}\n\n` +
                 `どうぞよろしくお願いいたします。`;

    GmailApp.sendEmail(email, subject, body);
    sheet.getRange(i + 1, 4).setValue('済');
    sheet.getRange(i + 1, 5).setValue(new Date());
    Utilities.sleep(1000); // 1秒待ってから次へ
  }
}
```

`Utilities.sleep()`で1秒間隔を空けるのは、Gmail側の負荷対策。ミリ秒単位で指定できるので、件数と速度のバランスを見ながら調整してください。

### ポイント3：送信ログを必ず残す

看護の記録と同じで、**送った記録を残す**のが安全運用の基本です。「送った／送ってない」が目で見えると、途中で止まっても再実行しやすい。

```javascript
// 送信済みかを確認する列（D列）と送信日時（E列）を用意
if (sent === '済') continue;
// 送信後に記録
sheet.getRange(i + 1, 4).setValue('済');
sheet.getRange(i + 1, 5).setValue(new Date());
```

ログがあると、クレームや確認問い合わせにも「○月○日△時に送信済みです」と即答できます。信頼の土台になる部分なので、省略せずに残しましょう。

## 応用：HTMLメール＋プレビュー送信

慣れてきたら、HTMLメールに挑戦してみるのもおすすめです。`GmailApp.sendEmail()`の第4引数でオプションを渡せます。

```javascript
GmailApp.sendEmail(email, subject, '', {
  htmlBody: `<p>${name} 様</p><p>${memo}</p>`,
  name: '凛'
});
```

また、いきなり全員に送るのは怖いので、**自分のアドレスにだけテスト送信する関数**を別に用意しておくと安心。本番実行前に必ず1通プレビューを送る習慣をつけると、宛名ミスや文字化けを防げます。

## まとめ

GASでの一斉メール送信は、**送信上限を知る・宛名を差し込む・ログを残す**の3点セットで安全性が大きく上がります。

300件規模でも、小分けに送りながらログを残せば、事故なく回せます。夜勤明けでもボタン1つで連絡網が完結する安心感、ぜひ味わってみてくださいね。

実運用に入る前に、必ず自分宛てのテスト送信から。焦らず、一通一通が誰かに届くメッセージだと思って。

## 関連記事

- [Gmail未読を条件検索してラベル付与するGAS](/blog/gas-gmail-search-label/)
- [スプシの予定リストをカレンダー一括同期GAS](/blog/gas-calendar-spreadsheet-sync/)
- [毎朝ToDoをLINEに届けるGASリマインダー](/blog/gas-line-reminder-daily/)

---

### この記事を書いた人：凛

の母で現役ナース、夜勤の合間に副業でGASプログラマーをしています。「看護記録と家事の自動化でわかったコツ」を、同じように忙しい人へシェアするのが日課。専門用語は最小限、コピペで動くレシピ中心でお届けしています。

