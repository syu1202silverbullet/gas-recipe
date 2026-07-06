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

スプレッドシートの「ファイル＞ダウンロード＞PDF」って、自動化できないんでしょうか？

こんにちは、凛です。夜勤明けのコーヒー片手に、家事育児の合間でGASをいじるのが私の副業スタイルです。冒頭の疑問は、かつての私が毎月末に抱いていたものでした。請求書や勤務表を1枚ずつ手作業でPDFに書き出して、印刷設定を毎回直して、ファイル名に日付を付け忘れて「どの月の分？」と自分に聞く。しかも夜勤前の限られた時間に「月次レポート出してないまま出勤」してしまい、帰宅後に焦ってPDF化してファイル名を間違える……というドタバタを、何度繰り返したことか。

# スプシPDF化をGASで自動保存する完全版

## 答え：できます。しかも2通り

結論から言うと、スプシのPDF化とDrive保存は丸ごと自動化できます。GASでPDFを出す方法は大きく2通りです。

ひとつは `getAs(MimeType.PDF)`。スプレッドシート全体を丸ごとPDF化する方法で、コードが簡単なぶん、とにかく手軽に全体を出したいときに向いています。もうひとつが **エクスポートURL方式**。シート単位で出力でき、印刷範囲・用紙サイズ・グリッド線・ヘッダーまで、すべてURLパラメータで指定できます。

じゃあどちらを使えばいいのか？　家計管理シートや月次レポートのように **決まったシートを決まったレイアウトで** 出したいなら、エクスポートURL方式が断然おすすめです。「毎回印刷設定を直す」手間ごと消せるのは、こちらだけなので。本記事もエクスポートURL方式で進めます。

## 深掘り：実際のコード

以下が全体のコードです。URLの組み立て、認証付きでのPDF取得、Drive保存、メール通知までを関数に分けてあります。構文チェックのうえで掲載していますが、スプレッドシートIDやフォルダIDはご自身のものに差し替えて、まずテスト実行から始めてください。

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

処理の流れを整理すると、`buildPdfUrl` でエクスポートURLを生成し、`fetchPdfBlob` がOAuthトークン付きでPDFを取得、`savePdfToFolder` が日付入りファイル名でDriveに保存して、最後に `GmailApp` で完了メールを送る。エラーが起きたときもメールが飛ぶようにしてあるので、「知らないうちに止まっていた」が起きにくい設計です。`ScriptApp.getOAuthToken()` が認証を自動でやってくれるので、パスワード管理も要りません。

### 月末に自動で動かすトリガー設定

毎月末に自動実行するには、時間主導のトリガーを設定します。

1. GASエディタ画面の左メニューから「**時計マーク（トリガー）**」をクリック
2. 右下の「**＋ トリガーを追加**」ボタンをクリック
3. 実行する関数：**`exportMonthlyPdf`** を選択
4. イベントのソース：**「時間主導型」** を選択
5. 時間ベースのトリガーのタイプ：**「月ベースのタイマー」** を選択
6. 実行日：**「月末」** を選択
7. 実行時刻：**「午後9時〜10時」** を選択（夜間に動かして翌朝確認するスタイル）
8. 「**保存**」ボタンをクリック
9. Googleアカウントの認証ダイアログが出たら「許可」をクリック

トリガーを仕込む前に、`testExportPdf` を手動実行して動作確認しておくのを忘れずに。

## さらに深掘り：私が実際に踏んだ落とし穴

ここからは、運用して初めて分かったことを書きます。コードが動くことと、安心して任せられることは別物でした。

### gidの確認を怠ると「別のシート」が出力される

スプレッドシートで対象シートを開いたとき、URLの末尾が `...#gid=0` のようになっています。この数字が `gid` です。注意したいのは、シートタブを右クリックして「シートをコピー」するとgidが変わること。私は一度、古いgidのままにしていたせいで別のシートがPDF化されていた、という事故を経験しました。しかも副業クライアントへの月次レポートで起きたので、冷や汗ものでした。シートをコピーしたら、gidの再確認。これはもう指差し確認レベルで習慣にしています。

### 深夜実行でファイル名が「先月」になる

`Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMM')` のタイムゾーン指定を省略すると、GASサーバーのデフォルト（UTC）で動きます。日本時間の深夜に動かした場合、UTCでは前日扱いになり、ファイル名が「先月のレポート」になってしまうんです。夜勤明けの朝5時に動かしていた私は、最初の設定でまんまとこれを踏みました。ファイル名を信じて開いたら中身が先月分、という混乱を防ぐためにも、タイムゾーン指定は必須です。

### エラーの「原因」を見える化しておく

`muteHttpExceptions` を付けないと、HTTP 403エラーが出た際に「UrlFetchApp fetch failed」という漠然としたエラーで止まります。`true` にしておくと `response.getResponseCode()` でステータスコードが取れるので、「403＝権限不足」「401＝認証切れ」と原因を特定しやすくなります。病院でいうと「症状だけ見て診断しない、検査値も見る」感覚です。

## よくあるエラーと対処

実際に遭遇しやすいエラーも押さえておきましょう。

**「You do not have permission to access the spreadsheet」** が出るときは、スプレッドシートの共有設定が「限定公開」で、実行ユーザーのアカウントが閲覧者以上の権限を持っていないのが原因です。スプレッドシートの「共有」を開き、スクリプトを実行するGoogleアカウントが「編集者」または「閲覧者」に含まれているか確認してください。自分のアカウントのスプレッドシートであれば通常は問題ないので、その場合は `CONFIG.SPREADSHEET_ID` に入力したIDが正しいかを再確認します。

**HTTP 429** が返ってくるのは、短時間に大量のエクスポートURLリクエストを送ってAPIのレート制限に引っかかったとき。複数シートを一括出力する `exportMultiplePdfs` を使う場合は、ループ内の `Utilities.sleep(1000)` でリクエスト間隔を空けます（上のコードには実装済み）。1シートずつ数秒待てばほぼ解消します。

**保存されたPDFが文字化けする** ケースは、スプレッドシート内に日本語フォントが正しく設定されていない、または出力時にフォントが埋め込まれていないのが原因です。セルフォントを「Noto Sans JP」などのGoogle Fontsに統一してみてください。業務用の特殊フォントはPDF出力で置き換わることがあります。ブラウザから手動エクスポートしても同じ文字化けが起きるなら、GASの問題ではなくスプレッドシート側のフォント設定の問題です。

## 最後に

冒頭の疑問への答えを、あらためて。「ファイル＞ダウンロード＞PDF」は、自動化できます。エクスポートURL方式ならシート指定・用紙設定・グリッド線まで細かく制御でき、月末トリガーと組み合わせれば完全に手放しです。進め方はテスト実行→動作確認→トリガー設定の順で。タイムゾーンの `Asia/Tokyo` だけは、くれぐれもお忘れなく。

月末の「PDF出し忘れ」から解放されると、夜勤明けの脳みそにやさしい運用が実現します。毎月ひっそり焦っていたあの時間、なくせますよ。

---

## 関連記事

- [GASでスプレッドシートのデータをCSVで自動エクスポートする](/blog/gas-sheet-csv-export/)
- [GASの時間主導トリガーを設定する完全ガイド](/blog/gas-trigger-setup/)
- [GASでGmailに自動でメールを送る基本と応用](/blog/gas-gmail-auto-send/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*コードは構文と動作ロジックを確認して掲載しています。IDや通知先はご自身の環境に合わせて設定のうえ、テスト実行から始めてください。*
