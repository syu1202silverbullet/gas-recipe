---
title: "フォーム送信者へ自動返信メールを送るGAS｜申込確認・問い合わせ即レスの定番"
description: "Googleフォーム送信時に回答者へ自動返信メールを送るGAS実装を、看護師×副業Webエンジニアの凛が解説。トリガー設定からカスタム本文生成、添付ファイル対応までコピペ可能なコードで紹介します。"
pubDate: "2026-05-05T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","form","gmail","auto-reply"]
tagNames: ["GAS","フォーム","Gmail","自動返信"]
readingTime: 8
keywords: ["GAS フォーム 自動返信","Googleフォーム 自動返信 GAS","GAS フォーム 確認メール"]
---

こんにちは、凛です。都内で看護師をしながら、副業でWebエンジニアをしています。Googleフォームで申込・問い合わせを受けた時、「自動返信メールが届くと安心するのに」と思ったことありませんか？今日は**フォーム送信時に自動返信メールを送る最短GAS実装**を解説します。

「GAS フォーム 自動返信」で検索してここに来た方が、読み終わった直後にすぐ動かせるレベルで書いています。

## こんな悩みありませんか？

- 「予約フォームを作ったけど、送信完了画面だけだと不安と言われる」
- 「問い合わせメールに『受け取りました』だけでも自動で返したい」
- 「Googleフォーム標準機能の『回答のコピー』だと素っ気ない」
- 「申込番号や受付日時を含めた整った本文を返したい」

私もハンドメイドショップの問い合わせフォームで「返信が遅くて不安だった」とレビュー書かれた経験があり、自動返信を入れてから一気にCVが上がりました。

## 全体像

```
ユーザー → Googleフォーム送信 → onFormSubmit トリガー → GAS → 自動返信メール
```

Googleフォームに「フォーム送信時」トリガーを設定すれば、送信のたびにGASが自動実行されます。

## 最短コード（コピペで動く）

```javascript
function onFormSubmit(e) {
  // フォーム回答から値を取得
  const responses = e.namedValues;
  const email = responses['メールアドレス'] ? responses['メールアドレス'][0] : '';
  const name = responses['お名前'] ? responses['お名前'][0] : 'お客様';
  const inquiry = responses['お問い合わせ内容'] ? responses['お問い合わせ内容'][0] : '';

  if (!email) return; // メアドなければ送信しない

  const subject = `【自動返信】お問い合わせを受け付けました｜GAS Recipe`;
  const body = `${name} 様

お問い合わせありがとうございます。
以下の内容で受け付けました。24時間以内に担当者よりご返信いたします。

──────────────────
${inquiry}
──────────────────

受付日時: ${new Date().toLocaleString('ja-JP')}

※このメールは自動送信です。返信不要です。

GAS Recipe 運営
https://gas-recipe.com`;

  GmailApp.sendEmail(email, subject, body);
}
```

これだけで動きます。

## トリガー設定（重要）

GASエディタ左の時計アイコン → トリガーを追加：

- **実行する関数**: `onFormSubmit`
- **イベントのソース**: スプレッドシートから（フォーム回答が記録されるシート）
- **イベントの種類**: **フォーム送信時**

「フォームから」ではなく「**スプレッドシートから**」のフォーム送信時を選ぶと、`e.namedValues` で日本語の質問名のままアクセスできて便利。

## カスタマイズ例

### 例1: 申込番号を自動採番

```javascript
function onFormSubmit(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const rowNum = sheet.getLastRow();
  const orderId = `GR-${new Date().getFullYear()}-${String(rowNum).padStart(5, '0')}`;
  // GR-2026-00001 のようなID
  // ...本文に含める
}
```

### 例2: 営業時間外は別文面

```javascript
const hour = new Date().getHours();
const businessHours = hour >= 9 && hour < 18;
const replyTime = businessHours ? '本日中' : '翌営業日中';
// 本文に「${replyTime}にご返信」と入れる
```

### 例3: HTMLメールで装飾

```javascript
const htmlBody = `
  <div style="font-family: sans-serif; padding: 20px;">
    <h2 style="color: #3b82f6;">お問い合わせを受け付けました</h2>
    <p>${name} 様</p>
    <div style="background: #f0f9ff; padding: 15px; border-left: 4px solid #3b82f6;">
      ${inquiry.replace(/\n/g, '<br>')}
    </div>
    <p style="color: #666; font-size: 12px;">受付日時: ${new Date().toLocaleString('ja-JP')}</p>
  </div>
`;

GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
```

### 例4: 担当者にも通知

```javascript
const ADMIN_EMAIL = 'admin@example.com';
const adminSubject = `[新規問い合わせ] ${name}様より`;
GmailApp.sendEmail(ADMIN_EMAIL, adminSubject, body);
```

回答者と運営者の両方に送って、対応漏れを防ぎます。

### 例5: 添付PDFを自動生成

申込内容をPDF化して添付する高度なパターン。修了証発行や申込控えに有効。詳しくは [フォーム回答から修了証PDFを自動発行](/blog/gas-form-pdf-cert/) で。

## 質問項目名の確認方法

`e.namedValues` のキーは、**フォームの質問テキストそのもの**です。質問を変更したらコードも更新必要。事前にデバッグしておくと安心：

```javascript
function debugFormSubmit(e) {
  console.log(JSON.stringify(e.namedValues));
}
```

これをonFormSubmitに含めて1回テスト送信すると、構造がログで確認できます。

## ⚠️ 送信上限とスパム判定

| 制限 | 無料Gmail | Workspace |
|---|---:|---:|
| 1日の送信数 | 100通 | 1500通 |
| 受信側のスパム判定 | リスクあり | 比較的安全 |

申込フォームで1日100件超える可能性があるなら、Workspace契約か、SendGrid等の外部メール配信サービス併用を検討。

## よくある失敗

### 自動返信が届かない

- メールアドレス欄が空
- スパムフォルダに振り分けられている
- 1日の送信上限超過 → `MailApp.getRemainingDailyQuota()` で確認

### 文字化けする

`GmailApp.sendEmail` は基本UTF-8で正常。ただし古いメーラーで化ける場合は HTML メールに切り替え。

### 二重送信される

トリガーが重複登録されている。`ScriptApp.getProjectTriggers()` で確認、不要なものは削除。

## まとめ

- onFormSubmit関数 + トリガー（スプシから・フォーム送信時）で完結
- `e.namedValues['質問名']` で日本語アクセス可
- 返信本文は受付日時・申込番号・問い合わせ内容を含めると親切
- HTMLメール・担当者通知・PDF添付など発展可能
- 1日100通制限に注意（無料版）

自動返信メールがあるかないかで、お客さんの安心感は別次元になります。設定は10分で終わるので、フォーム運用してる方はぜひ。

## 私（凛）が試して気づいたコツ3つ

### コツ1：テンプレートをスプシで管理する

返信本文をコードに直書きすると、文言を変えるたびにGASを編集する必要があります。スプシのセルに本文を書いておいてGASから読み込む設計にすると、スマホのスプシアプリから文言を直せるので楽です。特に「季節の挨拶を変えたい」「URLを更新したい」という変更は頻繁に起きるので、コードレスで変更できる仕組みがあると運用が続きます。

### コツ2：自分宛にテスト送信する関数を別途用意する

本番フォームを実際に送信してテストするのは手間がかかります。GAS側でダミーデータを使って自分宛に送信するテスト関数を別途用意しておくと、本文の確認がすぐできます。

### コツ3：返信にフォームの入力内容を含める

自動返信に「あなたが送った内容はこちらです」と送信内容を引用しておくと、お客さんが「ちゃんと届いたかな」という不安を解消できます。確認メールとしての役割が強まるので、CVRが上がります。

## つまずきやすいポイント

### つまずき1：自動返信が届かない

最もよくある問題です。原因として「メールアドレス欄が空」「スパムフォルダに振り分けられた」「1日の送信上限に達した」の3つが多いです。自動返信が届かないと報告を受けたら、まずこの3点を確認してください。

`MailApp.getRemainingDailyQuota()` で残数を確認するのが手っ取り早い診断方法です。

### つまずき2：二重送信される

トリガーが重複登録されているケースがあります。GASエディタのトリガー一覧を開いて、同じ関数に複数のトリガーが設定されていないかを確認してください。不要なトリガーは削除します。

`ScriptApp.getProjectTriggers()` でプログラムからトリガー一覧を取得して確認することもできます。

### つまずき3：質問名の変更でコードが壊れる

フォームの質問テキストを変更すると、`e.namedValues['お名前']` のキーが合わなくなってコードが動かなくなります。質問名を変更したときはコードも必ず更新するか、テスト送信して動作確認する習慣をつけましょう。

## 関連記事

- [GASでGmail自動返信を5分で作る最短レシピ](/blog/gas-gmail-auto-reply/)
- [GASでGmailを差し込みメールでテンプレ化5例](/blog/gas-gmail-template-mailmerge/)
- [Googleフォーム予約をカレンダー登録するGAS連携](/blog/gas-calendar-form-booking/)
- [フォーム回答から修了証PDFを自動発行GAS](/blog/gas-form-pdf-cert/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
