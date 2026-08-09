---
title: "スマホ写真のレシートをGAS＋OCRで自動集計｜確定申告を楽にする仕組み"
description: "レシートを撮ってGoogleドライブに入れるだけで、日付・金額・店名をスプレッドシートへ自動転記する仕組みをGoogle Apps Scriptで作る方法。Drive APIのOCR設定、金額を拾う正規表現、二重登録の防ぎ方、会計ソフトへのCSV取り込みまでコード付きで解説します。"
pubDate: "2026-04-17"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "side-business"
categoryName: "副業・確定申告"
tagSlugs: ["gas", "ocr", "tax", "receipt", "side-business"]
tagNames: ["GAS", "OCR", "確定申告", "レシート", "副業"]
readingTime: 13
---

確定申告の前の週末、レシートの束を前に電卓を叩いていたことがあります。3時間かけて入力して、合計が合わなくてもう1時間。あの時間、正直まるごと無駄でした。

今は**レシートを撮ってGoogleドライブに放り込むだけ**で、日付・金額・店名がスプレッドシートに並びます。使うのはGoogle Apps Script（GAS）とGoogleドライブのOCR機能だけ。専用アプリの月額課金もいりません。

この記事では、その仕組みをコピペできるコード付きで解説します。OCRの精度の限界や「拾えなかったとき」の扱いまで、正直に書きます。

## 完成する仕組み

1. スマホでレシートを撮影 → Googleドライブの `レシート受信箱` フォルダへ入れる
2. GASが1時間おきにフォルダを見に行く
3. 画像を**Googleドキュメントに変換してOCR**（文字起こし）
4. テキストから**日付・合計金額・店名**を抜き出す
5. スプレッドシートに1行追加
6. 処理が終わった画像は `レシート処理済み` フォルダへ移動

出来上がるのはこんな表です。

| 日付 | 店名 | 金額 | 科目 | 元ファイル | 状態 |
|---|---|---|---|---|---|
| 2026/04/12 | ○○ドラッグ | 1,280 | 消耗品費 | IMG_0412.jpg | OK |
| 2026/04/13 | △△書店 | 2,970 | 新聞図書費 | IMG_0413.jpg | OK |
| | ××カフェ | 680 | | IMG_0414.jpg | 要確認（日付なし） |

**大事なのは3行目です。**読み取れなかった項目は空欄のまま「要確認」として残します。ここを推測で埋めてしまうと、帳簿に嘘が入ります。

## 準備1：フォルダとスプレッドシートを作る

Googleドライブに次の2つのフォルダを作ります。

- `レシート受信箱`（撮った写真を入れる場所）
- `レシート処理済み`（読み取り済みが移動する場所）

それぞれURLの末尾にある長い文字列が**フォルダID**です。控えておきます。

次にスプレッドシートを1枚作り、シート名を `レシート` にして、1行目に見出しを入れます。

```text
日付 / 店名 / 金額 / 科目 / 元ファイル / 状態
```

## 準備2：スマホから自動でドライブに入れる

- **iPhone**：ショートカットアプリで「写真を撮る → ファイルに保存（Googleドライブの受信箱）」のショートカットを作り、ホーム画面に置く
- **Android**：Googleドライブアプリの「＋」→「スキャン」から、保存先を受信箱フォルダにする

どちらも「撮る→保存」で終わりです。ここが面倒だと続かないので、最初にちゃんと作っておく価値があります。

## 準備3：Drive APIを有効にする

OCRを使うため、GASの「サービス」からDrive APIを追加します。

1. Apps Scriptエディタの左メニュー「サービス」の＋をクリック
2. 一覧から **Drive API** を選ぶ
3. IDが `Drive` になっていることを確認して「追加」

これで `Drive.Files.copy(...)` が使えるようになります。

## コード全文

```javascript
// ===== 設定 =====
const INBOX_FOLDER_ID = 'レシート受信箱のフォルダID';
const DONE_FOLDER_ID  = 'レシート処理済みのフォルダID';
const SHEET_ID        = 'スプレッドシートのID';
const SHEET_NAME      = 'レシート';
const TIMEZONE        = 'Asia/Tokyo';

/** 受信箱の画像をまとめて処理する（トリガーで定期実行） */
function processReceipts() {
  const inbox = DriveApp.getFolderById(INBOX_FOLDER_ID);
  const done  = DriveApp.getFolderById(DONE_FOLDER_ID);
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

  const files = inbox.getFiles();
  let count = 0;

  while (files.hasNext()) {
    const file = files.next();
    const type = file.getMimeType();
    if (type !== MimeType.JPEG && type !== MimeType.PNG && type !== MimeType.PDF) continue;

    try {
      const text = extractTextByOcr_(file);
      const data = parseReceipt_(text);

      sheet.appendRow([
        data.date || '',
        data.shop || '',
        data.total || '',
        guessCategory_(data.shop),
        file.getName(),
        data.warning || 'OK'
      ]);

      // 処理済みフォルダへ移動（受信箱には残さない）
      done.addFile(file);
      inbox.removeFile(file);
      count++;
    } catch (e) {
      sheet.appendRow(['', '', '', '', file.getName(), '読み取り失敗：' + e.message]);
      console.log(file.getName() + ' の処理に失敗: ' + e.message);
    }
  }
  console.log(count + '件のレシートを登録しました');
}

/** 画像をGoogleドキュメントに変換してOCRテキストを取り出す */
function extractTextByOcr_(file) {
  const resource = {
    name: 'OCR_' + file.getName(),
    mimeType: MimeType.GOOGLE_DOCS
  };
  // ocrLanguage を指定すると、画像の文字起こしが行われる
  const created = Drive.Files.copy(resource, file.getId(), { ocrLanguage: 'ja' });

  const text = DocumentApp.openById(created.id).getBody().getText();

  // OCR用に作ったドキュメントはゴミ箱へ（残すとドライブが散らかる）
  DriveApp.getFileById(created.id).setTrashed(true);
  return text;
}

/** OCRテキストから日付・金額・店名を抜き出す */
function parseReceipt_(text) {
  const lines = text.split('\n').map(function (l) { return l.trim(); }).filter(String);
  const flat = lines.join(' ');
  const result = { date: '', shop: '', total: '', warning: '' };
  const missing = [];

  // --- 日付：2026年4月12日 / 2026/04/12 / 26-04-12 に対応 ---
  const dateMatch = flat.match(/(20\d{2}|\d{2})\s*[年\/\-\.]\s*(\d{1,2})\s*[月\/\-\.]\s*(\d{1,2})/);
  if (dateMatch) {
    const y = dateMatch[1].length === 2 ? '20' + dateMatch[1] : dateMatch[1];
    const m = ('0' + dateMatch[2]).slice(-2);
    const d = ('0' + dateMatch[3]).slice(-2);
    result.date = y + '/' + m + '/' + d;
  } else {
    missing.push('日付なし');
  }

  // --- 合計金額：「合計」「お買上計」「税込合計」の直後の数字 ---
  const totalMatch = flat.match(/(?:合\s*計|お買上げ?計|税込\s*合計|ご請求額)[^0-9]{0,8}([0-9,]+)/);
  if (totalMatch) {
    result.total = Number(totalMatch[1].replace(/,/g, ''));
  } else {
    // 予備：「¥1,280」形式のうち最大の金額を合計とみなす
    const yens = flat.match(/[¥￥]\s*([0-9,]+)/g);
    if (yens) {
      const nums = yens.map(function (s) { return Number(s.replace(/[^0-9]/g, '')); });
      result.total = Math.max.apply(null, nums);
      missing.push('合計は推定');
    } else {
      missing.push('金額なし');
    }
  }

  // --- 店名：先頭5行のうち、数字だらけでない最初の行 ---
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.length >= 2 && !/^[0-9\s\-\/:¥￥,]+$/.test(line)) { result.shop = line; break; }
  }
  if (!result.shop) missing.push('店名なし');

  if (missing.length > 0) result.warning = '要確認（' + missing.join('・') + '）';
  return result;
}

/** 店名から勘定科目を推測する（当たらなければ空欄のまま） */
function guessCategory_(shop) {
  if (!shop) return '';
  const rules = [
    { key: /ドラッグ|薬局|マツモト|ウエルシア/, category: '消耗品費' },
    { key: /書店|ブック|BOOK/i,               category: '新聞図書費' },
    { key: /ガソリン|石油|ENEOS|出光/i,        category: '車両費' },
    { key: /JR|鉄道|交通|タクシー/,            category: '旅費交通費' },
    { key: /カフェ|珈琲|コーヒー|喫茶/,        category: '会議費' }
  ];
  for (let i = 0; i < rules.length; i++) {
    if (rules[i].key.test(shop)) return rules[i].category;
  }
  return ''; // 推測できないものは空欄。あとで自分で埋める
}

/** 1時間おきのトリガーを作る（1回だけ実行） */
function createReceiptTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'processReceipts') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processReceipts').timeBased().everyHours(1).create();
  console.log('1時間おきのトリガーを作成しました');
}
```

## 動かす手順

1. 上部の3つのIDを自分のものに書き換える
2. 「サービス」からDrive APIを追加（前述）
3. `processReceipts` を実行し、権限を許可する
4. 受信箱に入れたレシートがシートに並べば成功
5. `createReceiptTrigger` を1回だけ実行して自動化する

## コードのポイント解説

### OCRは「ドキュメントに変換する」だけ

Googleドライブは、画像をGoogleドキュメント形式にコピーするときに自動で文字起こし（OCR）をします。有料のOCR APIを契約しなくても、この仕組みだけで日本語のレシートが読めます。

ポイントは `Drive.Files.copy` に `ocrLanguage: 'ja'` を渡すこと。ここを省くと、ただの画像がドキュメントに貼られるだけで文字は取れません。

変換で作ったドキュメントは用が済んだら `setTrashed(true)` でゴミ箱へ送ります。これを忘れると、レシートの数だけドキュメントが増えてドライブが荒れます。

### 「拾えなかった」を必ず記録する

このコードで一番こだわったのが、`missing` と `warning` の扱いです。

- 日付が読めなければ「要確認（日付なし）」
- 「合計」の文字が見つからず金額を推定した場合は「合計は推定」

**推測で埋めない**というルールにしておくと、あとでシートを「状態」列でフィルターするだけで、手当てすべき行だけを確認できます。帳簿は金額が命なので、ここは自動化しすぎないほうが安全です。

### 正規表現は「合計」を狙い撃ちする

レシートには小計・お預り・お釣り・ポイントなど数字がたくさん並びます。単純に「一番大きい数字」を取ると、お預り金額（1万円札）を拾ってしまいます。

だから優先順位はこうします。

1. 「合計」「お買上計」「税込合計」「ご請求額」の直後の数字
2. それが無ければ `¥` 付きの金額のうち最大のもの（＋「推定」の印）

### 二重登録は「フォルダ移動」で防ぐ

処理が終わったファイルは受信箱から出します。ラベルやフラグで管理するより確実で、フォルダを見れば未処理が何枚あるか一目でわかります。

## OCRの精度について正直な話

私が実際に使ってみた感触では、**印字がはっきりしたレシートならほぼ読めます**。一方で、次のものは苦手です。

- 感熱紙が擦れて薄くなったもの（財布に入れっぱなしの数週間ものは危険）
- くしゃくしゃに折れたもの
- 斜めから撮った、影が濃く落ちた写真

コツは、**撮るときに平らな机に置いて真上から撮る**ことだけです。これだけで読み取り率がはっきり変わりました。読めなかった分は「要確認」に落ちてくるので、そこだけ手で直せば済みます。

## 会計ソフトへの取り込み

出来上がったスプレッドシートは、そのまま会計ソフトに取り込めます。

1. スプレッドシートを「ファイル」→「ダウンロード」→ **CSV** で書き出す
2. 会計ソフトの「取引の一括登録（インポート）」から読み込む
3. 日付・金額・科目の列を対応させる

各ソフトのインポート仕様は公式ヘルプが正確なので、列の並びはそちらに合わせてください。取り込みの前に、状態が「要確認」の行を片付けておくのを忘れずに。

## よくあるエラーと対処

### 「Drive is not defined」と出る

サービスにDrive APIを追加していません。エディタ左の「サービス」＋から追加し、IDが `Drive` になっているか確認してください。

### OCRしても文字が1文字も取れない

`ocrLanguage` の指定漏れか、そもそも画像の解像度が低すぎる可能性があります。スマホの標準カメラで撮った写真なら解像度は十分なので、まずは指定漏れを疑ってください。

### 実行時間が6分を超えて止まる

GASの1回の実行は最大6分です。レシートが数百枚たまっていると超えることがあります。1回の処理枚数に上限を設ける（例：`if (count >= 30) break;`）と、次のトリガーで続きを処理できます。

### 金額がおかしい行がある

お預り金額や割引前の小計を拾っています。そのレシートのOCRテキストを見て、`parseReceipt_` の正規表現に店独自の言い回し（例：「お会計」）を足してください。よく行く店の分だけ足せば、実用上はすぐ困らなくなります。

## まとめ

- Googleドライブの**ドキュメント変換＝無料のOCR**。`ocrLanguage: 'ja'` がキモ
- 金額は「合計」を狙い撃ちし、拾えなければ**推定と明記する**
- 読めなかった項目は空欄＋「要確認」で残す。**推測で埋めない**
- 処理済みはフォルダ移動で二重登録を防ぐ
- 仕上げはCSVで会計ソフトへ

レシート入力は、1回あたりは数十秒でも、1年分となると数十時間になります。撮って放り込むだけの状態にしておくと、確定申告の週末が本当に静かになりました。

## 関連記事

- [フリーランス請求書をGASで毎月自動発行する仕組み](/blog/gas-freelance-invoice/)
- [GASでスプレッドシートを毎朝自動で整える仕組み](/blog/gas-spreadsheet-daily-auto/)
- [GASよく出るエラー10選と解決コード集｜辞書代わりに使える完全版](/blog/gas-error-exception/)
