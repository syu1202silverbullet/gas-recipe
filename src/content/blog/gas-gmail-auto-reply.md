---
title: "GASでGmail自動返信を5分で作る最短レシピ｜休暇通知にも"
description: "GoogleのGmailフィルタでは物足りない「条件付き自動返信」をGAS（Google Apps Script）で作る方法。夏休みの自動応答、特定ドメインへの自動返信などを具体コードで解説。"
pubDate: "2026-04-27T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas", "gmail", "auto-reply"]
tagNames: ["GAS", "Gmail", "自動返信"]
readingTime: 5
---
「お休みをもらっているので、週明けに返信します」。そんな定型文、毎回手で打つのはもったいないですよね。

Gmailには「不在通知」機能がありますが、**「特定のメールだけ」「曜日で変える」「差出人を見て内容を変える」**といった細かい条件では物足りません。

本記事では、GASで**条件付き自動返信Bot**を作る最短レシピを紹介します。

## この自動化で解決できること

- 夜勤明けの日だけ「今日は対応できません」と自動返信
- 家族からのメールだけ優先通知＆自動既読
- 営業時間外に届いた問い合わせに「翌営業日に回答します」と即返信
- 特定のキーワードを含むメールに定型回答

## 仕組みの全体像

1. **Gmailを定期チェック**（5分おき）
2. 未読メールをフィルタ（差出人・件名・本文で絞り込み）
3. 条件にマッチしたメールに**定型文を返信**
4. 処理済みメールには**「Auto返信済」ラベル**を付与して重複防止

## ステップ1: 基本のコード

```javascript
function autoReply() {
  const query = 'is:unread -label:Auto返信済 to:me';
  const threads = GmailApp.search(query, 0, 20);

  threads.forEach(thread => {
    const msg = thread.getMessages()[0];
    const from = msg.getFrom();
    const subject = msg.getSubject();

    // 条件: 特定のキーワード
    if (!/お問い合わせ|質問/.test(subject)) return;

    const replyBody = `
${msg.getPlainBody().match(/.+様/)?.[0] || 'ご担当者様'}

お問い合わせありがとうございます。
現在確認中ですので、2営業日以内にご回答いたします。

― GAS Recipe 運営チーム
`.trim();

    thread.reply(replyBody);
    thread.addLabel(GmailApp.getUserLabelByName('Auto返信済') || GmailApp.createLabel('Auto返信済'));
  });
}
```

## ステップ2: トリガー設定

GASエディタの左メニュー「⏰ トリガー」→「＋ トリガーを追加」

- 実行する関数: `autoReply`
- イベントソース: `時間主導型`
- 分ベースのタイマー: `5分おき`

これで5分ごとに自動実行されます。

## 抑えておきたい3つのポイント

### ポイント1: 「Auto返信済」ラベルで重複防止

絶対に忘れてはいけないのが**ラベル付け**。これがないと、同じメールに何度も返信して「無限ループ」になります。

### ポイント2: 検索クエリを絞り込む

`GmailApp.search()` の第1引数はGmail検索式そのままが使えます。

```javascript
// 過去24時間の未読、問い合わせメールだけ
const query = 'is:unread newer_than:1d subject:(問い合わせ OR 質問)';
```

これで処理対象を限定でき、誤爆と制限超過を防げます。

### ポイント3: 送信上限に注意

Gmail自動送信は**無料アカウントで1日100通まで**。ループで大量返信しそうな処理は、上限チェックを必ず入れる。

```javascript
const remaining = MailApp.getRemainingDailyQuota();
if (remaining < 5) {
  Logger.log('送信枠が少ないのでスキップ');
  return;
}
```

## 応用例

### パターン1: 曜日別の文面切替

```javascript
const day = new Date().getDay();  // 0=日曜
const offHours = (day === 0 || day === 6);
const body = offHours ? '休日のため、翌営業日にご返信します。' : '本日中に対応いたします。';
```

### パターン2: 特定人からは自分のLINEに即転送

```javascript
if (from.includes('important@example.com')) {
  // LINE Messaging APIで自分に通知
  sendLine('重要メール受信: ' + subject);
  return;  // 自動返信はしない
}
```

### パターン3: ChatGPTで応答内容を生成（発展）

OpenAI APIと組み合わせれば、**AI自動応答Bot**にも発展可能。これは別記事で詳しく扱います。

## トラブル：返信が届かない

よくある原因:
- **「Auto返信済」ラベルが付いてしまっていて、処理がスキップされている** → ラベルを外すか、クエリから `-label:Auto返信済` を削除
- **スレッド返信なのに新規メッセージで送ってしまっている** → `thread.reply()` を使うこと

## 看護師の私の使い方

夜勤の日は返信できないので、LINEとGASを組み合わせて「家族から以外のメールは自動で『翌朝対応します』返信＋通知オフ」にしています。家族からのメールだけLINEに転送されて、それ以外は翌日まで完全オフ。夜勤明けの睡眠が守られるようになりました。

## まとめ

Gmailの自動返信は、Gmailフィルタだけでは実現できない「**条件付きの柔軟な対応**」ができるようになります。5分で最初のコードが動く手軽さなので、ぜひ試してみてください。

関連記事: [Gmail予約メールをカレンダーに自動登録](/blog/gas-gmail-to-calendar/) / [トリガー完全ガイド](/blog/gas-trigger-setup/)
