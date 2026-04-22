---
title: "Gmail差し込みメールをGASでテンプレ化5例｜顧客リストから個別メール一括送信"
description: "Gmail差し込みメール（メールマージ）をGASで実装する5パターンを凛が解説。スプシの顧客リストから一人ずつカスタム本文で送信、HTMLメール対応、添付ファイル付与まで。"
pubDate: "2026-06-10T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas","gmail","mailmerge","template"]
tagNames: ["GAS","Gmail","差し込みメール","テンプレート"]
readingTime: 6
keywords: ["GAS メール 差し込み","GAS メールマージ","Gmail 差し込みメール GAS"]
---

こんにちは、凛です。「100人の顧客に一人ずつ違う本文でメール送りたい」って時、GASなら数十行で完結します。

## 基本：顧客リスト×テンプレ本文

スプシ「顧客」の構造：
| メアド | お名前 | 申込商品 |
|---|---|---|
| a@example.com | 田中 | 商品A |
| b@example.com | 佐藤 | 商品B |

```javascript
function sendMailMerge() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const header = data.shift();

  data.forEach(row => {
    const [email, name, product] = row;
    const subject = `${name}様、ご注文ありがとうございます`;
    const body = `${name} 様

${product}のご注文ありがとうございます。
順次発送いたします。

GAS Recipe`;

    GmailApp.sendEmail(email, subject, body);
  });
}
```

## パターン2：プレースホルダ式テンプレ

```javascript
const TEMPLATE = `{name} 様

{product}のご注文受付ました。
お届け予定: {delivery}

ありがとうございます。`;

function fillTemplate(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] || '');
}

// 使い方
const body = fillTemplate(TEMPLATE, {
  name: '田中',
  product: '商品A',
  delivery: '5月10日'
});
```

## パターン3：HTMLメール

```javascript
const html = `
<div style="font-family: sans-serif;">
  <h2 style="color: #3b82f6;">${name}様</h2>
  <p>${product}のご注文ありがとうございます。</p>
  <a href="https://example.com/order/${id}" 
     style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
    注文を確認
  </a>
</div>`;

GmailApp.sendEmail(email, subject, '', { htmlBody: html });
```

## パターン4：添付ファイル付き

```javascript
const pdfBlob = DriveApp.getFileById('PDF_FILE_ID').getBlob();
GmailApp.sendEmail(email, subject, body, {
  attachments: [pdfBlob],
  name: 'GAS Recipe 運営'
});
```

## パターン5：送信ステータスを記録

```javascript
data.forEach((row, i) => {
  try {
    GmailApp.sendEmail(email, subject, body);
    sheet.getRange(i + 2, 4).setValue('送信済 ' + new Date());
  } catch (e) {
    sheet.getRange(i + 2, 4).setValue('失敗: ' + e.message);
  }
});
```

スプシに「送信済」列を作って、実行履歴を可視化。再実行時に「未送信」だけ送れる。

## ⚠️ 送信上限

- 無料: 100通/日
- Workspace: 1500通/日
- 100通超える可能性なら `MailApp.getRemainingDailyQuota()` でチェック

## まとめ

- ループでスプシ→Gmail送信が基本
- プレースホルダ式テンプレで保守性UP
- HTMLメール・添付ファイル・送信記録で実務レベル
- 送信上限は事前チェック必須

## 関連記事
- [GASでGmail自動返信を5分で作る最短レシピ](/blog/gas-gmail-auto-reply/)
- [GASで一斉メール送信300件までの安全な書き方](/blog/gas-gmail-bulk-send/)
- [フォーム送信者へ自動返信メールを送るGAS](/blog/gas-form-auto-reply/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事をGASで自動化してきた経験をもとに、実務ベースのGASレシピを発信中。
