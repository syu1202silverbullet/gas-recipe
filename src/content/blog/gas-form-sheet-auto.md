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

Googleフォームの回答、スプレッドシートに溜まったあと、誰が整理していますか？

こんにちは、凛です。フォームとスプシの連携自体はGoogleが勝手にやってくれます。でも実際に運用してみると、そのままでは困る場面が出てきますよね。タイムスタンプの形式が読みにくい。問い合わせの種別ごとに分けて見たいのに全部1枚のシートに積まれていく。新しい回答が来たことに、そもそも気づけない。結局、人間が定期的にシートを開いて手で整えることになります。

その手作業、GASに全部渡せます。今日は**フォーム回答が届いた瞬間に、整形・別シートへの振り分け・担当者へのメール通知までまとめて自動でやる**方法を解説します。副業の問い合わせ管理、習い事の申込管理、職場のシフト申請——フォームを使う場面ならどこでも効く仕組みです。

## 答え：onFormSubmitトリガーに全部やらせる

フォームが送信された瞬間にGASを起動できる「フォーム送信時トリガー」が答えです。処理の流れはこうなります。

```
フォーム送信
→ onFormSubmit トリガー発火
→ ① 回答を整形（日付・電話番号など）
→ ② カテゴリで別シートに振り分け
→ ③ 担当者にGmail通知
→ ④ 送信者に自動返信（任意）
```

コードの完成形がこちらです。

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

コードは構文と各メソッドの仕様（`e.namedValues` の構造、`appendRow` の使い方など）を机上で確認したうえで載せています。実際の動作は、ご自身のフォーム・シート構成で必ずテスト送信して確かめてください。

### トリガーは「スプレッドシートから」を選ぶ

コードを貼ったら、トリガーを設定します。ここが本記事でいちばん間違えやすいポイントなので、先に強調しておきます。**選ぶのは「スプレッドシートから」のフォーム送信時です。「フォームから」ではありません。**

1. GASエディタ左の時計アイコン
2. 「トリガーを追加」
3. 実行関数：`onFormSubmit`
4. **イベントのソース：スプレッドシートから**（← フォームからではない）
5. イベントの種類：**フォーム送信時**

なぜかというと、このコードの心臓部である `e.namedValues`（日本語の質問名で回答にアクセスできるプロパティ）が使えるのは、スプシ側のトリガーだけだからです。「フォームから」を選ぶと質問名ではなく列番号でのアクセスになり、フォームの質問を並べ替えるたびにコードの修正が必要になります。正直、私も最初はどちらでも同じだろうと思っていました。同じではないんです。

### スクリプトプロパティの設定

通知の宛先だけは、コードではなくスクリプトプロパティで持たせます。

| プロパティ名 | 値 |
|---|---|
| `ADMIN_EMAIL` | 通知を受け取る担当者のメールアドレス |

メールアドレスをコードにハードコードすると、スクリプトを共有したときに漏れます。それに、担当者が変わるたびにコードを触るのも避けたい。プロパティに逃がしておけば、宛先変更はプロパティの更新だけで済みます。

## 深掘り：このコードの設計意図

コピペで動いたあとに読んでほしい部分です。3か所、意図を持って書いています。

### getValue ヘルパーはなぜ必要か

`e.namedValues['質問名']` は、その質問に回答がなかったとき undefined を返します。undefined に対して `[0].trim()` を呼べばエラー。つまり、任意回答の質問がひとつあるだけで、直接アクセスのコードはいつか必ず落ちます。

だから、キーの存在を確認してから値を取り出す `getValue` ヘルパーを最初に作りました。回答がなければ空文字を返すだけの小さな関数ですが、これをコードの冒頭に置いておくと、その後の処理全部が安心して書けます。フォーム連携のGASを書くときは、まずこれから、が私の定番になっています。

### カテゴリ別シートは「なければ作る」方式

`transferToSheet` は、カテゴリ名と同じシートを探して、なければヘッダーつきで新規作成してから転記します。運用開始前にシートを全部用意しておく必要がないので、カテゴリが増えても放っておける設計です。

ただしこれは裏を返せば、**フォームに変なカテゴリ名が入ると変なシートが勝手に生まれる**ということでもあります。カテゴリの質問は自由記述ではなく選択肢形式にして入力値を縛るか、許可されたカテゴリ名だけ受け付けるホワイトリスト処理を足しておくのが安全です。

### タイムスタンプは回答行から取る

受付日時は `e.range.getRow()` で「いま追加された回答行」の1列目からタイムスタンプを取得し、`Utilities.formatDate` で `yyyy/MM/dd HH:mm` に整形しています。フォーム連携シートの生のタイムスタンプは秒まで入っていて一覧では読みにくいので、転記時に人間が読みやすい形に直してしまう、というわけです。

## もう一歩やりたくなったら

基本形が動いたら、足したくなる処理を2つ置いておきます。

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

フォームの電話番号入力は、ハイフンあり・なしが必ず混ざります。数字だけ抜き出して桁数で判定する方式なら、どちらで入力されても揃います。

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

転記時にF列へ入れている「未対応」ステータスを起点に、行の背景色を塗り分けます。シートを開いた瞬間に未対応の件数が視覚的にわかるようになりますよ。

## 動かないときに確認すること

うまく動かない相談を受けたとき、原因はだいたいこのどれかです。

### トリガーの設定場所を間違えている

トリガーは、**フォームが回答を記録しているスプレッドシート側**のGASプロジェクトに設定する必要があります。フォームの編集画面から開いたGASエディタではなく、スプレッドシートの「拡張機能 → Apps Script」から入ってください。似た画面なので、どちらで開いているか意識しないと迷子になります。

### 質問名とコードのキーがずれている

`e.namedValues['お名前']` のように、フォームの質問テキストそのものをキーに使っています。つまりフォーム側で質問名を「お名前」から「氏名」に変えた瞬間、コードは値を取れなくなります（`getValue` のおかげでエラーにはならず、空文字が入るだけなので、かえって気づきにくいかもしれません）。質問名を変えたらコードも見直す。この対応関係だけは覚えておいてください。

いま実際にどんなキーで届いているかは、テスト送信のあとに `console.log(JSON.stringify(e.namedValues))` を仕込んで出力すれば一目でわかります。

### 意図しないシートが増えていく

前述のとおり、`ss.insertSheet(category)` は未知のカテゴリ名に対してシートを新規作成します。テスト送信で適当なカテゴリを入れた場合も、その名前のシートができています。運用前にテストで生まれたゴミシートを消しておくのと、カテゴリの質問を選択肢形式にしておくのを忘れずに。

## おわりに

フォーム+GASのいいところは、一度仕組みを作れば「あとは放っておいても整理されていく」状態になることです。回答のたびにシートを開いて手で並べ替えていた時間が、そのまま浮きます。私の場合、副業の問い合わせ対応がこれでだいぶ軽くなりました。まずは自分のフォームでテスト送信を1回。カテゴリ別のシートがすっと生えてくるのを見ると、ちょっと感動しますよ。

## 関連記事

- [フォーム送信者へ自動返信メールを送るGAS](/blog/gas-form-auto-reply/)
- [編集日時を自動記録するタイムスタンプGAS](/blog/gas-sheet-timestamp-auto/)
- [スプシ自動フィルタをGASで3秒セット](/blog/gas-sheet-filter-auto/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。掲載コードは構文・メソッド仕様・ロジックの机上確認までを行ったものです。実際の動作はお使いの環境でテストのうえご利用ください。
