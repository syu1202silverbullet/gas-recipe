---
title: "GASで領収書を自動作成・PDF保存する完全版｜副業・フリーランスの事務を秒で終わらせる"
description: "スプレッドシートに宛名と金額を入れてボタンを押すだけで、領収書PDFを自動採番・Driveへ保存・Gmailで送信まで完結するGASを、現役ナースが動作検証済みコード付きで解説します。"
pubDate: "2026-05-12T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","pdf","receipt","side-business"]
tagNames: ["GAS","スプレッドシート","PDF","領収書","副業"]
readingTime: 10
keywords: ["GAS 領収書 自動作成","GAS 領収書 PDF","スプレッドシート 領収書 自動化"]
---

こんにちは、凛です。今日はちょっと恥ずかしい話から始めます。

副業初年度の私は、領収書の発行が完全に手作業でした。Wordのテンプレを開いて、日付を変えて、名前を変えて、PDF出力して、メールに添付して送る。通し番号は自分の頭とメモで管理していて、たまにミスる。発行したPDFはあちこちのフォルダに散らばって、確定申告のときに探し回る。おまけにクライアントへの送り忘れが月に1回くらい発生していました。

「どうせ月数枚だから」と思っていたんです。でもクライアントが増えると、この“月数枚”が一気に面倒になります。毎月月初、領収書のことを思い出すたびに小さくため息をつく。そんな状態でした。

## 原因は根性ではなく「仕組みがない」ことでした

振り返ると、ミスや送り忘れの原因は私の注意力不足ではありませんでした。手作業の工程が多すぎたんです。テンプレを開く、書き換える、番号を確認する、PDFにする、保存場所を選ぶ、メールを書く、添付する。工程が7つあれば、どこかで1つ抜けるのは時間の問題ですよね。

だったら工程そのものを減らせばいい。この作業、実は全部GASに任せられます。

いま私が使っているのは、**スプレッドシートのテンプレートに入力してボタンを押すだけで、領収書PDFを自動採番・Drive保存・Gmail送信まで完結するGAS**です。この記事では、その動作検証済みの完全版コードを解説します。

## 解決編：スプシに「発行ボタン」を付ける

### 完成イメージ

```
① スプシの「領収書」シートに宛名・金額・発行日を入力
② メニュー「領収書ツール」→「PDFで保存する」クリック
③ 領収書番号が自動採番（例: R20260512-001）
④ Drive の指定フォルダに PDF 保存
⑤ （任意）クライアントへ Gmail で自動送信
```

スプレッドシートを閉じずに、すべてここで完結します。

### 事前準備：スプレッドシートのレイアウト

スプレッドシートを新規作成し、シート名を「領収書」に変更します。
以下のとおりセルに項目名と入力欄を作ってください（デザインは自由に装飾OK）。

| セル | 内容 |
|------|------|
| A1   | 領収書（見出し・結合セルにしても可） |
| A2   | 領収書番号 |
| **B2** | 自動入力（GASが書き込む） |
| A3   | 宛名 |
| **B3** | 例）株式会社〇〇 御中 |
| A4   | 発行日 |
| **B4** | 例）2026/05/12 |
| A5   | 金額 |
| **B5** | 例）50000（数値のみ） |
| A6   | 但し書き |
| **B6** | 例）業務委託費として |
| A7   | 送信先メール（任意） |
| **B7** | 例）client@example.com |

B列（太字）がGASで読み書きする入力欄です。領収書の見た目（枠線・フォント・発行者名）はスプレッドシート側で自由にデザインしてください。

> **ポイント**：発行者名・住所・捺印画像はシート上に直接書いておきます。GASは「宛名・金額など変わる部分」だけを書き換えます。

### GASコード全文（動作検証済み）

スプレッドシートの「拡張機能 → Apps Script」を開き、以下をそのまま貼り付けてください。

```javascript
// ===== 設定エリア（ここだけ変更） =====
const CONFIG = {
  TEMPLATE_SHEET_NAME: '領収書',           // シート名
  COMPANY_NAME: '凛 / GAS Recipe Studio',  // 発行者名（メール本文に使用）
};

// ===== メニュー追加（スプシを開くと自動追加） =====
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📄 領収書ツール')
    .addItem('PDFで保存する', 'issueReceipt')
    .addSeparator()
    .addItem('PDF保存 ＋ メール送信', 'issueReceiptAndSend')
    .addToUi();
}

// ===== ① PDFをDriveに保存する =====
function issueReceipt() {
  const result = _createReceiptPdf();
  if (!result) return;

  const file = _getOutputFolder().createFile(result.blob);
  SpreadsheetApp.getUi().alert(
    '✅ 保存完了\n\nファイル名: ' + result.fileName + '\nURL: ' + file.getUrl()
  );
}

// ===== ② PDFをDriveに保存 ＋ Gmailで送信 =====
function issueReceiptAndSend() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.TEMPLATE_SHEET_NAME);
  const clientEmail = sheet.getRange('B7').getValue().toString().trim();

  if (!clientEmail) {
    SpreadsheetApp.getUi().alert('B7 に送信先メールアドレスを入力してください。');
    return;
  }

  const result = _createReceiptPdf();
  if (!result) return;

  // Drive保存
  _getOutputFolder().createFile(result.blob);

  // Gmail送信
  const subject = '【領収書】' + result.receiptNo;
  const body    = result.clientName + ' 様\n\n'
    + '領収書を発行いたしました。添付PDFをご確認ください。\n\n'
    + '領収書番号：' + result.receiptNo + '\n'
    + '金　　　額：¥' + Number(result.amount).toLocaleString('ja-JP') + '\n'
    + '但し書き　：' + result.description + '\n\n'
    + CONFIG.COMPANY_NAME;

  GmailApp.sendEmail(clientEmail, subject, body, { attachments: [result.blob] });
  SpreadsheetApp.getUi().alert('✅ 送信完了\n送信先: ' + clientEmail);
}

// ===== 共通：PDF生成の本体 =====
function _createReceiptPdf() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.TEMPLATE_SHEET_NAME);

  if (!sheet) {
    SpreadsheetApp.getUi().alert('シート「' + CONFIG.TEMPLATE_SHEET_NAME + '」が見つかりません。');
    return null;
  }

  const clientName  = sheet.getRange('B3').getValue().toString().trim();
  const issueDate   = sheet.getRange('B4').getValue();
  const amount      = sheet.getRange('B5').getValue();
  const description = sheet.getRange('B6').getValue().toString().trim();

  if (!clientName || !amount) {
    SpreadsheetApp.getUi().alert('宛名（B3）と金額（B5）は必須です。');
    return null;
  }

  // 採番してB2に書き込む
  const receiptNo = _generateReceiptNo();
  sheet.getRange('B2').setValue(receiptNo);
  SpreadsheetApp.flush(); // ← PDF出力前に必ずフラッシュ（これを忘れると番号が反映されない）

  const dateStr  = _formatDate(issueDate);
  const fileName = '領収書_' + clientName + '_' + dateStr + '.pdf';
  const blob     = _exportSheetAsPdf(ss, sheet.getSheetId()).setName(fileName);

  return { blob, fileName, receiptNo, clientName, amount, description };
}

// ===== PDFエクスポート（エクスポートURL方式） =====
function _exportSheetAsPdf(ss, sheetGid) {
  const url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export'
    + '?format=pdf'
    + '&size=A4'
    + '&portrait=true'
    + '&fitw=true'
    + '&gridlines=false'
    + '&printtitle=false'
    + '&sheetnames=false'
    + '&gid=' + sheetGid;

  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('PDF出力失敗（ステータス: ' + response.getResponseCode() + '）');
  }
  return response.getBlob();
}

// ===== 領収書番号の自動採番（日付+連番） =====
function _generateReceiptNo() {
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
  const props = PropertiesService.getScriptProperties();
  const key   = 'receipt_seq_' + today;
  const seq   = Number(props.getProperty(key) || '0') + 1;
  props.setProperty(key, String(seq));
  return 'R' + today + '-' + String(seq).padStart(3, '0'); // 例: R20260512-001
}

// ===== 保存先フォルダを取得 =====
function _getOutputFolder() {
  const folderId = PropertiesService.getScriptProperties().getProperty('OUTPUT_FOLDER_ID');
  return folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
}

// ===== 日付フォーマット（yyyyMMdd） =====
function _formatDate(date) {
  const d = (date instanceof Date) ? date : new Date();
  return Utilities.formatDate(d, 'Asia/Tokyo', 'yyyyMMdd');
}
```

### 保存フォルダを指定する方法（推奨）

コードに直接フォルダIDを書くのはセキュリティ的によくないので、**スクリプトプロパティ**に入れます。

1. GASエディタ左の「プロジェクトの設定」歯車アイコン
2. 「スクリプトプロパティ」→「プロパティを追加」
3. プロパティ名：`OUTPUT_FOLDER_ID`、値：DriveフォルダのURL末尾のID

DriveフォルダのIDは `https://drive.google.com/drive/folders/ここがID` の部分です。

## つまずきやすかった箇所と、コードに込めた工夫

### `SpreadsheetApp.flush()` は必須

採番してB2に書いた後、すぐPDF出力すると書き込みが反映されないことがあります。
`flush()` を1行挟むだけで確実に解消されます。**地味に忘れがちな落とし穴**で、私もここで一度「番号が入らないPDF」を量産しかけました。

### 採番はスクリプトプロパティで管理

「今日何枚目か」を `PropertiesService.getScriptProperties()` で保存しています。
スプレッドシートに管理列を作る必要がなく、シートのデザインを汚しません。手作業時代に「番号を自分で管理していてたまにミスる」だった部分が、これで完全に消えました。

### `muteHttpExceptions: true` で安全に

PDF取得に失敗したとき、例外でスクリプトが止まらないようにしています。
ステータスコードで判定して、エラー内容がわかるメッセージを出せます。

## 慣れてきたら足したいカスタマイズ

### 保存先フォルダを月別に自動切り替え

```javascript
function _getOutputFolder() {
  const yyyymm = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMM');
  const root = DriveApp.getFolderById(
    PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID')
  );
  // 「202605」フォルダがなければ作成
  const folders = root.getFoldersByName(yyyymm);
  return folders.hasNext() ? folders.next() : root.createFolder(yyyymm);
}
```

### 発行済み一覧シートに自動追記

```javascript
// _createReceiptPdf() の末尾に追加
const logSheet = ss.getSheetByName('発行履歴') || ss.insertSheet('発行履歴');
logSheet.appendRow([
  receiptNo,
  clientName,
  Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
  amount,
  description
]);
```

これで「どのクライアントにいつ何円の領収書を出したか」が自動で記録されます。PDFが散らばって確定申告前に探し回っていた頃の自分に教えてあげたい機能です。

## 無料テンプレートとして使う方法

このスプレッドシート＋GASは**自分のGoogleドライブにコピーするだけ**で使えます。

**→ [テンプレートをコピーして使う（無料）](https://docs.google.com/spreadsheets/d/1QNgwCuK1pUeYKli1ottw7MwC2SlytWc-vM8OM-gHeKw/copy)**

リンクを踏むと「コピーを作成しますか？」と表示されます。「コピーを作成」をクリックすれば、あなたのGoogleドライブに自動で複製されます。

### コピー後の初回設定手順

1. コピーされたスプレッドシートを開く
2. 「拡張機能 → Apps Script」を開き、保存ボタン（💾）を押す
3. 「実行 → onOpen を実行」→ 権限の承認ダイアログが出るので「許可」をクリック
4. スプレッドシートに戻ると「📄 領収書ツール」メニューが追加されている

> **権限承認について**：GASを初回実行すると「このアプリはGoogleによって確認されていません」という画面が出ます。「詳細」→「GAS Recipe（安全でないページ）に移動」→「許可」の順にクリックすれば完了です。自分のGoogleアカウントで動くので、外部に情報が送られることはありません。

### 「自分でも作れるようになりたい」と思ったら

この記事で紹介したGASは、実はプログラミングの基礎を学べば**数時間で書けるレベル**です。「副業でGASを仕事にしたい」「もっと複雑な自動化を自分で作りたい」と思ったら、GAS・JavaScript対応のプログラミングスクールで体系的に学ぶのが最短ルートです。

## 仕組みにしてから、何が変わったか

いちばん大きいのは、発行作業が**1件30秒**で終わるようになったことです。宛名と金額を入れてメニューをクリックする。それだけ。番号は勝手に採番され、PDFは決まったフォルダに収まり、送信までワンセットで済みます。

そして数字にならない変化として、毎月の「あの作業やらなきゃ」というストレスが消えました。送り忘れの心配をしなくていい、確定申告前にフォルダを漁らなくていい。この安心感は、作った本人が一番驚いています。

副業のちょっとした事務作業こそ、GASで仕組みにする価値が高い領域です。手作業のままがんばっている方は、まずテンプレートのコピーから試してみてください。

## 関連記事

- [スプシPDF化をGASで自動保存する完全版](/blog/gas-sheet-export-pdf/)
- [確定申告レシートをOCR記帳するGAS実装](/blog/gas-kakutei-receipt-ocr/)
- [GASでUber Eats配達記録をMF会計CSV化する](/blog/gas-ubereats-csv-mf/)
- [Googleフォーム送信者へ自動返信メールを送るGAS](/blog/gas-form-auto-reply/)

---

## 確定申告を楽にしたい方へ

副業の収支管理・確定申告には、自動化に強いクラウド会計ソフトがおすすめです。

<a href="https://px.a8.net/svt/ejp?a8mat=4B1R5U+EV8PMA+3SPO+9FL80Y" rel="nofollow" referrerpolicy="no-referrer-when-downgrade">まずは無料でお試し【freee会計】</a><img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=4B1R5U+EV8PMA+3SPO+9FL80Y" alt="">

<a href="https://px.a8.net/svt/ejp?a8mat=3NERNS+AC3XV6+4JGQ+BYT9E" rel="nofollow" referrerpolicy="no-referrer-when-downgrade">自動化で80％以上の時間削減 マネーフォワード クラウド確定申告</a><img border="0" width="1" height="1" src="https://www15.a8.net/0.gif?a8mat=3NERNS+AC3XV6+4JGQ+BYT9E" alt="">

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のGASコードは2026年5月時点で動作確認済みです。Google Workspaceのアップデートによって挙動が変わる場合があります。
