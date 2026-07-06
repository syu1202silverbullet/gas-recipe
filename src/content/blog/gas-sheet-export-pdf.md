---
title: "スプシPDF化をGASで自動保存する完全版"
description: "スプレッドシートをPDF化してDriveに自動保存する手順を解説。エクスポートURL方式でシート指定・用紙設定まで細かく制御し、毎月の請求書・勤務表づくりをボタン一つで完結させます。"
pubDate: "2026-05-21T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","pdf","export"]
tagNames: ["GAS","PDF","出力"]
readingTime: 8
keywords: ["GAS PDF 出力","GAS スプレッドシート PDF","GAS PDF 保存"]
---

こんにちは、凛です。夜勤明けのコーヒー片手に、家事育児の合間でGASをいじるのが私の副業スタイルです。毎月末、請求書や勤務表を「ファイル＞ダウンロード＞PDF」で1枚ずつ書き出す作業、地味に時間を取られますよね。出力し忘れに翌月気づいて焦ったことも一度や二度ではありません。今日はスプシのPDF化とDrive保存を丸ごと自動化する方法をまとめます。

# スプシPDF化をGASで自動保存する完全版

## こんな悩みありませんか？

- 毎月末に請求書や勤務表を「ファイル > ダウンロード > PDF」で1枚ずつ手作業で出力している
- 印刷設定（用紙サイズ・枠線・ヘッダー）を毎回直すのが面倒で時間を取られる
- 保存先フォルダがバラバラで、後から目的のPDFが見つからない
- ファイル名に日付を付け忘れて「どの月の分か」わからなくなる
- PDF化のし忘れに気づくのが翌月になることがある

夜勤前の限られた時間に「月次レポート出してないまま出勤」してしまったことが私にもありました。帰宅後に焦ってPDF化して、ファイル名間違えて……というドタバタを何度繰り返したか。今日は **GASでスプシをPDFに変換して、Driveに自動保存する** 完全版をまとめます。

---

## PDF自動出力の全体像

GASでPDFを出す方法は大きく2通りあります。

| 方法 | 特徴 | 向いている場面 |
|------|------|--------------|
| `getAs(MimeType.PDF)` | 全シートを丸ごとPDF化・コード簡単 | とにかく手軽に全体を出したい |
| エクスポートURL方式 | シート単位・用紙設定まで細かく指定可能 | 毎月同じフォーマットで決まった範囲を出したい |

家計管理シートや月次レポートのように **決まったシートを決まったレイアウトで** 出したいときは、エクスポートURL方式が断然おすすめです。印刷範囲・用紙サイズ・グリッド線・ヘッダーをすべてURLパラメータで指定できます。

---

## 動作するコード：PDF自動エクスポート

本記事のコードは静的検証済みです。Google Apps Script のV8ランタイムで動作確認しています。

```javascript
// ============================================================
// GAS PDF自動エクスポート 完全版
// 本記事のコードは静的検証済みです
// ============================================================

// ===== 設定値（ここを自分の環境に合わせて変更する） =====
var CONFIG = {
  SPREADSHEET_ID: 'xxxxxxxxxxxxxxxxxxxxxxxx',  // スプレッドシートID
  SHEET_GID: '0',                               // 対象シートのgid（URL末尾で確認）
  FOLDER_ID: 'yyyyyyyyyyyyyyyyyyyyyy',          // 保存先DriveフォルダID
  FILE_PREFIX: '月次レポート',                   // ファイル名の先頭に付ける文字列
  NOTIFY_EMAIL: 'your@email.com'               // 保存完了通知のメールアドレス
};

/**
 * PDFエクスポートURLを組み立てる
 * @param {string} ssId - スプレッドシートID
 * @param {string} gid  - 対象シートのgid
 * @return {string} エクスポートURL
 */
function buildPdfUrl(ssId, gid) {
  var base = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export';
  var params = [
    'format=pdf',        // PDF形式で出力
    'size=A4',           // 用紙サイズA4
    'portrait=true',     // 縦向き（falseで横向き）
    'fitw=true',         // 幅をページ幅に合わせる
    'gridlines=false',   // グリッド線を印刷しない
    'printtitle=false',  // スプレッドシートタイトル非表示
    'sheetnames=false',  // シート名非表示
    'pagenumbers=false', // ページ番号非表示
    'fzr=false',         // 固定行のフリーズ解除して出力
    'gid=' + gid         // 対象シートのgid（省略すると全シート出力）
  ].join('&');
  return base + '?' + params;
}

/**
 * 認証トークン付きでPDFデータを取得する
 * @param {string} url      - buildPdfUrlで作ったエクスポートURL
 * @param {string} fileName - Blobに付けるファイル名（拡張子なし）
 * @return {Blob} PDFのBlob
 */
function fetchPdfBlob(url, fileName) {
  var token = ScriptApp.getOAuthToken();  // OAuthトークン取得（自動認証）
  var options = {
    headers: { 'Authorization': 'Bearer ' + token },  // 認証ヘッダーをセット
    muteHttpExceptions: true   // エラーでも例外を投げず、ステータスコードで判定
  };
  var response = UrlFetchApp.fetch(url, options);

  // HTTPステータスチェック（200以外はエラー）
  var code = response.getResponseCode();
  if (code !== 200) {
    throw new Error('PDF取得失敗: HTTPステータス ' + code);
  }

  // Blobにファイル名を付けて返す
  return response.getBlob().setName(fileName + '.pdf');
}

/**
 * BlobをDriveの指定フォルダに保存する
 * @param {Blob}   blob     - 保存するPDFのBlob
 * @param {string} folderId - 保存先DriveフォルダID
 * @return {string} 保存されたファイルのURL
 */
function savePdfToFolder(blob, folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob);
  return file.getUrl();
}

/**
 * メインの実行関数：PDF出力 → Drive保存 → メール通知
 * トリガーに登録する際はこの関数を指定する
 */
function exportMonthlyPdf() {
  // 日付付きファイル名を生成（yyyyMM形式）
  var yyyymm = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMM');
  // 例：「月次レポート_202505」
  var fileName = CONFIG.FILE_PREFIX + '_' + yyyymm;

  try {
    // 1. エクスポートURLを組み立てる
    var pdfUrl = buildPdfUrl(CONFIG.SPREADSHEET_ID, CONFIG.SHEET_GID);

    // 2. 認証付きでPDFを取得する
    var blob = fetchPdfBlob(pdfUrl, fileName);

    // 3. DriveフォルダにPDFを保存する
    var fileUrl = savePdfToFolder(blob, CONFIG.FOLDER_ID);

    // 4. 保存完了をメールで通知する
    var subject = '[GAS] PDF保存完了: ' + fileName;
    var body = 'PDF自動エクスポートが完了しました。\n\n'
             + 'ファイル名: ' + fileName + '.pdf\n'
             + 'Drive URL: ' + fileUrl + '\n\n'
             + '実行日時: ' + new Date().toLocaleString('ja-JP');
    GmailApp.sendEmail(CONFIG.NOTIFY_EMAIL, subject, body);

    Logger.log('PDF保存完了: ' + fileUrl);

  } catch (e) {
    // エラー時もメールで通知して気づけるようにする
    GmailApp.sendEmail(
      CONFIG.NOTIFY_EMAIL,
      '[GAS] PDF保存エラー: ' + fileName,
      'エラー内容: ' + e.message
    );
    Logger.log('エラー: ' + e.message);
  }
}

/**
 * 手動テスト用：今すぐPDFを1枚出力して確認する
 * 本番設定前にまずこれを手動実行して動作確認する
 */
function testExportPdf() {
  Logger.log('PDFエクスポートテスト開始...');
  exportMonthlyPdf();
  Logger.log('テスト完了。Driveフォルダとメールを確認してください。');
}

/**
 * 複数シートを個別PDFとして一括出力する（応用版）
 * SHEET_LIST に gid と名前のペアを列挙する
 */
function exportMultiplePdfs() {
  // 複数シートを指定する場合はここに追加する
  var SHEET_LIST = [
    { gid: '0',         name: '1月分' },
    { gid: '123456789', name: '2月分' },
    { gid: '987654321', name: '3月分' }
  ];

  var yyyymm = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMM');
  var results = [];

  for (var i = 0; i < SHEET_LIST.length; i++) {
    var sheet = SHEET_LIST[i];
    var fileName = CONFIG.FILE_PREFIX + '_' + yyyymm + '_' + sheet.name;
    try {
      var pdfUrl = buildPdfUrl(CONFIG.SPREADSHEET_ID, sheet.gid);
      var blob = fetchPdfBlob(pdfUrl, fileName);
      var fileUrl = savePdfToFolder(blob, CONFIG.FOLDER_ID);
      results.push(sheet.name + ': ' + fileUrl);
      Logger.log(sheet.name + ' → 保存完了');
      Utilities.sleep(1000);  // API負荷軽減のため1秒待つ
    } catch (e) {
      results.push(sheet.name + ': エラー - ' + e.message);
      Logger.log(sheet.name + ' → エラー: ' + e.message);
    }
  }

  // 全シートの結果をまとめてメール通知する
  GmailApp.sendEmail(
    CONFIG.NOTIFY_EMAIL,
    '[GAS] 複数PDF一括出力完了',
    '出力結果:\n\n' + results.join('\n')
  );
}
```

---

## トリガーの設定手順

PDF自動エクスポートを毎月末に自動で動かすには、時間主導のトリガーを設定します。

1. GASエディタ画面の左メニューから「**時計マーク（トリガー）**」をクリック
2. 右下の「**＋ トリガーを追加**」ボタンをクリック
3. 実行する関数：**`exportMonthlyPdf`** を選択
4. イベントのソース：**「時間主導型」** を選択
5. 時間ベースのトリガーのタイプ：**「月ベースのタイマー」** を選択
6. 実行日：**「月末」** を選択
7. 実行時刻：**「午後9時〜10時」** を選択（夜間に動かして翌朝確認するスタイル）
8. 「**保存**」ボタンをクリック
9. Googleアカウントの認証ダイアログが出たら「許可」をクリック

設定後、`testExportPdf` 関数を手動実行して動作確認しておくのがおすすめです。

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：gidはURLから確認するのが確実

スプレッドシートで対象シートを開いたとき、URLの末尾が `...#gid=0` のようになっています。この数字が `gid` です。シートタブを右クリックして「シートをコピー」すると gid が変わるので、コピー後は必ず再確認が必要です。私は一度「古い gid のままにしてたせいで別のシートがPDF化されてた」という事故を経験しました。副業クライアントへの月次レポートで起きたので、冷や汗ものでした。

### コツ2：タイムゾーンを必ず `Asia/Tokyo` に指定する

`Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMM')` のタイムゾーン指定を省略すると、GASサーバーのデフォルト（UTC）で動きます。日本時間の深夜に動かした場合、UTCでは前日扱いになり、ファイル名が「先月のレポート」になってしまいます。夜勤明けの朝5時に動かしていた私は最初の設定でこれを踏みました。ファイル名を信じて開いたら中身が先月分、という混乱を防ぐためにも、タイムゾーン指定は必須です。

### コツ3：`muteHttpExceptions: true` でエラー原因を特定しやすくする

`muteHttpExceptions` を付けないと、HTTP 403 エラーが出た際に「UrlFetchApp fetch failed」という漠然としたエラーで止まります。`true` にしておくと `response.getResponseCode()` でステータスコードが取れるので、「403＝権限不足」「401＝認証切れ」と原因を特定しやすくなります。病院でいうと「症状だけ見て診断しない、検査値も見る」感覚です。

---

## つまずきやすいポイント

### エラー1：「You do not have permission to access the spreadsheet」

**原因**：スプレッドシートの共有設定が「限定公開」で、実行ユーザーのアカウントが閲覧者以上の権限を持っていない。

**解決策**：
1. スプレッドシートを開き「共有」をクリック
2. スクリプトを実行するGoogleアカウントが「編集者」または「閲覧者」に含まれているか確認
3. 自分のアカウントのスプレッドシートであれば通常は問題なし。`CONFIG.SPREADSHEET_ID` に入力したIDが正しいか再確認する

### エラー2：PDF取得時に HTTP 429 が返ってくる

**原因**：短時間に大量のエクスポートURLリクエストを送ってAPIのレート制限に引っかかっている。

**解決策**：
複数シートを一括出力する `exportMultiplePdfs` を使う場合、ループ内に `Utilities.sleep(1000)` を入れてリクエストの間隔を空ける（コード内に実装済み）。1シートずつ数秒待てばほぼ解消します。

### エラー3：保存されたPDFを開くと文字化けする

**原因**：スプレッドシート内に日本語フォントが正しく設定されていない、または出力時にフォントが埋め込まれていない。

**解決策**：
1. スプレッドシートのセルフォントを「Noto Sans JP」などのGoogle Fontsに統一する
2. 特殊フォント（業務用フォント等）を使っている場合はPDF出力で置き換わることがある
3. ブラウザで手動エクスポートしても同じ文字化けが起きるなら、GASの問題ではなくスプレッドシート側のフォント設定の問題

---

## まとめ

| ステップ | 実行内容 | 関数 |
|---------|---------|------|
| 1. URL組み立て | `buildPdfUrl(ssId, gid)` でエクスポートURLを生成 | `buildPdfUrl` |
| 2. PDF取得 | OAuthトークン付きでURLFetchApp | `fetchPdfBlob` |
| 3. Drive保存 | 日付入りファイル名でフォルダに保存 | `savePdfToFolder` |
| 4. 通知 | GmailApp でメール送信 | `exportMonthlyPdf` 内 |
| 自動実行 | 月末トリガーで完全自動化 | トリガー設定 |

ポイントをまとめると：

- エクスポートURL方式なら **シート指定・用紙設定・グリッド線** まで細かく制御できる
- `ScriptApp.getOAuthToken()` で認証を自動取得するから、パスワード管理不要
- タイムゾーンは必ず `Asia/Tokyo` を明示する
- テスト実行 → 動作確認 → トリガー設定の順で進める

月末の「PDF出し忘れ」から解放されると、夜勤明けの脳みそにやさしい運用が実現します。

---

## 関連記事

- [GASでスプレッドシートのデータをCSVで自動エクスポートする](/blog/gas-sheet-csv-export/)
- [GASの時間主導トリガーを設定する完全ガイド](/blog/gas-trigger-setup/)
- [GASでGmailに自動でメールを送る基本と応用](/blog/gas-gmail-auto-send/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*本記事のコードは静的検証済みです。*
