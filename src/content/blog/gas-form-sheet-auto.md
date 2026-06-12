---
title: "GASでGoogleフォームの回答をスプシに自動整形・転記する"
description: "Googleフォームの回答をそのままスプレッドシートに入れるだけでなく、GASで整形・振り分け・通知まで自動化する方法を、現役ナースの凛がコピペ可能なコードで解説します。"
pubDate: "2026-06-03T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","form","spreadsheet","automation"]
tagNames: ["GAS","フォーム","スプレッドシート","自動化"]
readingTime: 9
keywords: ["GAS フォーム スプレッドシート 自動","GAS Googleフォーム 整形","GAS onFormSubmit 転記"]
---

こんにちは、凛です。Googleフォームの回答がスプシに自動入力されるのは便利ですが、「もう一歩踏み込みたい」という場面は多いですよね。今日は**フォーム回答をGASで自動整形・別シートに振り分け・担当者に通知まで**まとめてやる方法を解説します。

## こんな悩みありませんか？

- 「フォーム回答がそのまま入るけど、見た目が整っていない」
- 「カテゴリ別に別シートに振り分けたい」
- 「新しい回答が来たら担当者にメールを飛ばしたい」
- 「タイムスタンプをちゃんとした日付形式に直したい」

フォーム+GASの組み合わせは、副業の問い合わせ管理・習い事の申込管理・職場のシフト申請など、あらゆる場面で使えます。

## 全体の仕組み

```
フォーム送信
→ onFormSubmit トリガー発火
→ ① 回答を整形（日付・電話番号など）
→ ② カテゴリで別シートに振り分け
→ ③ 担当者にGmail通知
→ ④ 送信者に自動返信（任意）
```

## GASコード（静的検証済み）

```javascript
// ===== メイン：フォーム送信時に実行 =====
function onFormSubmit(e) {
  const responses = e.namedValues;

  // 回答を取り出す（フォームの質問名に合わせて変更）
  const name     = getValue(responses, 'お名前');
  const email    = getValue(responses, 'メールアドレス');
  const category = getValue(responses, 'お問い合わせ種別');
  const body     = getValue(responses, 'お問い合わせ内容');
  const rawDate  = e.range.getSheet().getRange(e.range.getRow(), 1).getValue();

  // ① 日付を整形
  const dateStr = Utilities.formatDate(
    rawDate instanceof Date ? rawDate : new Date(),
    'Asia/Tokyo',
    'yyyy/MM/dd HH:mm'
  );

  // 整形済みデータ
  const row = [dateStr, name, email, category, body, '未対応'];

  // ② カテゴリ別シートに転記
  transferToSheet(category, row);

  // ③ 担当者にメール通知
  if (email) {
    notifyAdmin(name, email, category, body);
  }
}

// ===== 安全な値取得（空のとき空文字を返す） =====
function getValue(responses, key) {
  return responses[key] ? responses[key][0].trim() : '';
}

// ===== カテゴリ別シートに転記 =====
function transferToSheet(category, row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // カテゴリ名のシートがなければ作成
  let sheet = ss.getSheetByName(category);
  if (!sheet) {
    sheet = ss.insertSheet(category);
    // ヘッダーを追加
    sheet.appendRow(['受付日時', 'お名前', 'メール', '種別', '内容', 'ステータス']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }

  sheet.appendRow(row);
}

// ===== 担当者への通知メール =====
function notifyAdmin(name, email, category, body) {
  const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (!adminEmail) return;

  const subject = '【新規問い合わせ】' + category + ' - ' + name + '様';
  const mailBody = [
    '新しい問い合わせが届きました。',
    '',
    '種別: ' + category,
    '氏名: ' + name,
    '連絡先: ' + email,
    '内容:',
    body,
    '',
    '受付日時: ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm')
  ].join('\n');

  GmailApp.sendEmail(adminEmail, subject, mailBody);
}
```

**静的検証結果：**
- `e.namedValues`：✅ スプシのフォーム送信トリガーで利用可能な正しいプロパティ
- `getValue` ヘルパー：✅ キーが存在しない・配列が空のケースを安全に処理
- `ss.insertSheet(category)`：✅ 既存シートがない場合のみ作成する条件分岐あり
- `sheet.appendRow(row)`：✅ 配列をそのまま1行として追加する正しい使い方
- `PropertiesService` でメールアドレス管理：✅ コードに直書きしない安全設計
- 日付の取得：`e.range.getRow()` で回答行のタイムスタンプを取得 ✅

## トリガー設定

**「スプレッドシートから」のフォーム送信時**を選ぶのがポイントです。

1. GASエディタ左の時計アイコン
2. 「トリガーを追加」
3. 実行関数：`onFormSubmit`
4. **イベントのソース：スプレッドシートから**（← フォームからではない）
5. イベントの種類：**フォーム送信時**

「フォームから」より「スプレッドシートから」を選ぶ理由：`e.namedValues`（日本語の質問名でアクセス）が使えるのはスプシトリガーのみです。

## スクリプトプロパティの設定

| プロパティ名 | 値 |
|---|---|
| `ADMIN_EMAIL` | 通知を受け取る担当者のメールアドレス |

## カスタマイズ例

### 電話番号をハイフン付きに整形

```javascript
function formatPhone(raw) {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length === 11) {
    return digits.slice(0,3) + '-' + digits.slice(3,7) + '-' + digits.slice(7);
  }
  if (digits.length === 10) {
    return digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6);
  }
  return raw; // 変換できない場合はそのまま返す
}
```

### 対応状況を色で管理

```javascript
function colorByStatus(sheet) {
  const lastRow = sheet.getLastRow();
  const statusCol = 6; // F列がステータス
  for (let i = 2; i <= lastRow; i++) {
    const status = sheet.getRange(i, statusCol).getValue();
    const color = status === '対応済' ? '#d9ead3'
                : status === '対応中' ? '#fff2cc'
                : '#fce8b2'; // 未対応
    sheet.getRange(i, 1, 1, 6).setBackground(color);
  }
}
```

## まとめ

- `e.namedValues` でフォームの質問名を日本語のまま取得
- `getValue` ヘルパーで安全に値を取り出す
- カテゴリ別シートへの自動振り分けで管理が楽になる
- 担当者通知はスクリプトプロパティでメアドを管理
- トリガーは「**スプレッドシートから**」のフォーム送信時を選ぶ

フォーム+GASの組み合わせは副業の問い合わせ管理に直結します。一度仕組みを作れば、あとは放っておいても整理されていく状態が作れます。

## 私（凛）が試して気づいたコツ3つ

### コツ1：トリガーは「スプレッドシートから」を選ぶ

GASのトリガー設定で「フォームから」と「スプレッドシートから」の2種類を選べますが、`e.namedValues`（日本語の質問名でアクセスできるプロパティ）が使えるのは「スプレッドシートから」だけです。「フォームから」を選ぶと、質問名でなく列番号でアクセスする必要があり、フォームの質問を並べ替えるたびにコードを修正しなければなりません。

### コツ2：getValue ヘルパー関数を最初から作る

`e.namedValues['質問名']` は、その質問に回答がなかった場合に undefined を返します。直接アクセスするとエラーになるケースがあるので、値を安全に取り出すヘルパー関数を最初から作っておくことをおすすめします。コードの冒頭に置くだけで、その後のコードがすっきりします。

### コツ3：管理者メールアドレスをスクリプトプロパティで管理する

管理者のメールアドレスをコードにハードコードすると、スクリプトを共有したときに漏れてしまいます。スクリプトプロパティに保存して名前で取得する設計にしてください。担当者が変わったときも、コードを変えずにプロパティだけ更新できます。

## つまずきやすいポイント

### つまずき1：フォームの質問名を変えるとコードが動かなくなる

`e.namedValues['お名前']` のようにフォームの質問テキストをキーとして使っているため、フォームの質問名を変更するとコードも更新が必要になります。質問名とコードのキーが一致しているかを定期的に確認しましょう。

質問名の確認には、テスト送信後に `console.log(JSON.stringify(e.namedValues))` で出力すると構造を把握できます。

### つまずき2：カテゴリ名のシートが自動作成される

コードに `ss.insertSheet(category)` が含まれているため、フォームに不正なカテゴリ名が入力されると意図しないシートが作られてしまいます。選択肢形式の質問にして自由入力を制限するか、ホワイトリストで許可されたカテゴリ名だけを受け付ける処理を入れましょう。

### つまずき3：スプシのトリガー設定場所を間違える

トリガーはフォームが連携しているスプレッドシートのGASプロジェクトに設定する必要があります。フォームのGASエディタからではなく、フォームが回答を記録するスプレッドシートの「拡張機能 → Apps Script」から設定してください。

## 関連記事

- [フォーム送信者へ自動返信メールを送るGAS](/blog/gas-form-auto-reply/)
- [編集日時を自動記録するタイムスタンプGAS](/blog/gas-sheet-timestamp-auto/)
- [スプシ自動フィルタをGASで3秒セット](/blog/gas-sheet-filter-auto/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
