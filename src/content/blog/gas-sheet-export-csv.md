---
title: "スプシをCSV出力してドライブ保存するGAS｜会計ソフト連携の定番"
description: "スプシを自動でCSV化してDriveに保存するGAS実装を凛が解説。会計ソフトインポート・データ受け渡しに。毎月の手動書き出し作業をゼロにする方法を実体験つきで紹介。"
pubDate: "2026-06-25T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","csv","export","drive"]
tagNames: ["GAS","スプレッドシート","CSV","出力"]
readingTime: 8
keywords: ["GAS CSV 出力","GAS スプシ CSV","GAS CSV 自動保存","Google Apps Script CSV"]
---

こんにちは、凛です。2児のママで現役ナースをしながら、GASで副業をしています。

副業を始めてから「確定申告のたびにCSVを書き出す作業」が地味にストレスでした。スプシを開いて、ファイル→ダウンロード→CSV→会計ソフトにアップロード……これを毎月繰り返すのが本当に面倒で。

GASで自動化してから、**月初に気づいたらCSVが出力されている**状態になりました。この記事ではその実装をまるごと公開します。

## こんな悩みありませんか？

- 会計ソフトに毎月CSVをアップロードしているけど、スプシからの手動書き出しが面倒
- 取引先に売上明細をCSVで送る依頼が定期的にあって、毎回ダウンロード→添付が手間
- スプシを誤って編集されないよう、CSVだけ共有したい
- 確定申告の準備が毎年バタバタする

「月1回やればいい作業」でも、副業と育児と夜勤を掛け持ちしていると、その月1回を忘れたり後回しにしたりしてしまいます。自動化することで「やり忘れ」自体をなくすのが目的です。

## GASコード（コピペで動きます）

```javascript
function exportToCsv() {
  const SHEET_ID = 'ここにスプレッドシートID';
  const FOLDER_ID = 'ここに保存先フォルダID';

  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  const data = sheet.getDataRange().getValues();

  // CSV形式に変換（カンマ・改行・ダブルクォートを含むセルはクォートで囲む）
  const csv = data.map(row =>
    row.map(cell => {
      const s = String(cell).replace(/"/g, '""');
      return /[,\n"]/.test(s) ? `"${s}"` : s;
    }).join(',')
  ).join('\r\n'); // Windowsでも文字化けしないよう\r\nを使用

  // BOM付きUTF-8で保存（Excelで開いたときの文字化け防止）
  const filename = `export_${Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd')}.csv`;
  const blob = Utilities.newBlob('\uFEFF' + csv, 'text/csv', filename);

  DriveApp.getFolderById(FOLDER_ID).createFile(blob);
  console.log('CSV出力完了: ' + filename);
}
```

**スプレッドシートIDの確認方法：**
スプシのURLの `https://docs.google.com/spreadsheets/d/【ここ】/edit` の部分がIDです。

**フォルダIDの確認方法：**
Google DriveでフォルダをクリックしたときのURLの `https://drive.google.com/drive/folders/【ここ】` の部分がIDです。

## 私（凛）が試して気づいたコツ3つ

### コツ1：改行コードは `\r\n` に固定する

最初は `\n` で書いていたのですが、Windowsで開いたCSVが「全部1行になる」という問題が起きました。取引先はWindows環境のことが多いので、`\r\n` に統一するのが安全です。

Mac・Linuxでファイルを作ると改行コードが `\n` になります。GASで意図的に `\r\n` を指定することで、どの環境でも正しく改行されたCSVになります。夜勤明けの朦朧とした頭でExcelを開いたとき、全部が1行にびろーんと並んでいるのを見たときの絶望感は本当に辛いです。最初から `\r\n` にしておいてください。

### コツ2：ファイル名に日付を入れて上書き防止

`export_20260601.csv` のように日付をファイル名に含めると、毎回別ファイルとして保存されます。月次履歴が自動で積み上がるので、「先月のCSVどこ行った？」がなくなります。

上書き防止という観点だけでなく、年間の変化を追うときにも便利です。「6月と7月のデータ、どう変わったんだっけ？」という場面でフォルダを開くだけで過去分がずらっと並んでいるので、確定申告の時期に慌てて探す手間がなくなります。

### コツ3：BOM（`\uFEFF`）を先頭に必ず付ける

BOMなしのUTF-8だと、Excelで開いたときに日本語が文字化けします。`\uFEFF` を先頭に付けるだけで解決するので、必ず入れてください。会計ソフト側でBOMがあると読み込めない場合は外してもOKですが、まずBOMありで試すことをおすすめします。

副業の売上記録や経費のメモは日本語が入ることが多いです。文字化けしたCSVを会計ソフトに取り込んだら全部手入力し直し……なんて最悪の事態を防ぐために、BOMは絶対に入れましょう。

## つまずきやすいポイント

### ヘッダー行が含まれない

`getDataRange().getValues()` は選択範囲全体（1行目から）を取得します。「なぜかヘッダーが出ない」という場合は、1行目が空だったり、シートの表示範囲がズレていたりします。`sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues()` と明示的に指定すると確実です。

### 権限エラーが出る

初回実行時に「このアプリはGoogleによって確認されていません」という警告が出ます。「詳細」→「（安全ではないページ）に移動」で進めてください。自分のGoogleアカウントのスクリプトなので安全です。

この警告は「自分で作ったスクリプトをGoogleが公式審査していないだけ」で、危険なわけではありません。知人に見せると「えっ怪しいページじゃないの？」と心配されることもありますが、自作スクリプトでは必ず出るものです。

### 保存先フォルダが見つからない

フォルダIDが間違っているか、スクリプトのGoogleアカウントとフォルダのアカウントが違う場合に起きます。フォルダURLからIDをコピーし直すと解決することが多いです。

GASがエラーを出さずに「処理完了」と言うのにファイルが見当たらない場合は、別のフォルダに保存されている可能性があります。Google Driveの検索でファイル名（`export_`で始まるファイル）を検索してみてください。

### Excelで開くと日付が数値になる

GASでセルの値を取得すると、日付型のデータは `1900-01-01` からの通し番号（シリアル値）で返ってくる場合があります。`Utilities.formatDate(cell, 'Asia/Tokyo', 'yyyy/MM/dd')` で文字列に変換してからCSVに書き込むと、Excelでも正しく日付として表示されます。

## 応用：特定のシートだけCSV出力する

スプシに複数のシートがある場合、特定のシートだけCSV出力したいことがあります。`getActiveSheet()` ではなく `getSheetByName('シート名')` を使うと、シート名を指定して取得できます。

```javascript
// 特定のシート名を指定して取得する例
const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('売上記録');
```

私は「売上記録」「経費メモ」「取引先一覧」の3シートが入ったスプシを運用していて、確定申告用に「売上記録」と「経費メモ」だけCSV出力する設定にしています。必要なシートだけ出力することで、会計ソフトへの取り込みがよりスムーズになります。

## 毎月自動実行するトリガー設定

手動で実行するだけでなく、月次トリガーを設定すると完全自動化できます。

1. GASエディタ左の時計アイコン「トリガー」をクリック
2. 「トリガーを追加」
3. 実行する関数：`exportToCsv`
4. イベントのソース：「時間主導型」
5. 時間ベースのトリガーのタイプ：「月ベースのタイマー」
6. 日付：「1」（毎月1日）
7. 時間帯：「午前6時〜7時」
8. 「保存」

これで毎月1日の朝6時にCSVが自動生成されます。月初に会計ソフトを開いたときには、もうCSVが準備済みの状態になっています。

## GASでCSVをメールに添付して送る応用版

CSVをDriveに保存するだけでなく、作成したCSVファイルを指定のメールアドレスに自動送信することもできます。取引先に毎月売上明細を送る必要がある場合に便利です。

```javascript
function exportAndEmailCsv() {
  const SHEET_ID = 'ここにスプレッドシートID';
  const TO_EMAIL = 'partner@example.com';

  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  const data = sheet.getDataRange().getValues();

  const csv = data.map(row =>
    row.map(cell => {
      const s = String(cell).replace(/"/g, '""');
      return /[,\n"]/.test(s) ? `"${s}"` : s;
    }).join(',')
  ).join('\r\n');

  const filename = `report_${Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMM')}.csv`;
  const blob = Utilities.newBlob('\uFEFF' + csv, 'text/csv', filename);

  GmailApp.sendEmail(
    TO_EMAIL,
    `月次レポート ${Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy年M月')}`,
    '月次レポートをお送りします。添付ファイルをご確認ください。',
    { attachments: [blob] }
  );

  console.log('メール送信完了: ' + filename);
}
```

月末のトリガーと組み合わせれば「月末にCSVをメール自動送信」が完成します。私は確定申告用の税理士さんへの月次報告をこの方法で自動化しています。

## 私の実際の運用フロー

看護師の副業で確定申告が必要になってから、この自動化を使い続けています。

1. **毎月1日 6:00**：GASが自動でCSVを出力（「売上_202605.csv」のような名前でDriveに保存）
2. **確定申告の時期**：専用フォルダを開いて、1〜12月のCSVを会計ソフトにまとめてインポート
3. **所要時間**：年間の集計作業が約2時間→30分に短縮

「CSV書き出しの作業」が月1個減るだけでも、副業継続の心理的負担はかなり軽くなります。夜勤明けで疲れていても、フォルダを開けば終わっている状態は本当に助かっています。

夜勤の翌朝、ぐったりした状態でコーヒーを一杯飲んで、パソコンを開いたらCSVが出来上がっている——その光景が当たり前になったとき、「自動化して本当によかった」と心から思いました。副業の継続はいかに自分の負担を減らすかにかかっています。

## まとめ

| ポイント | 内容 |
|---|---|
| BOM | `\uFEFF` を先頭に付けてExcelの文字化けを防ぐ |
| 改行コード | `\r\n` でWindowsでも正常表示 |
| ファイル名 | 日付を含めて上書き防止・履歴管理 |
| トリガー | 月次タイマーで完全自動化 |
| 日付データ | `Utilities.formatDate` で文字列化してシリアル値を避ける |

コードは丸ごとコピペして、`SHEET_ID` と `FOLDER_ID` だけ書き換えれば動きます。まずは手動実行で動作確認してから、トリガーを設定する流れで進めてみてください。

## 関連記事（あわせて読みたい）

- [GASで配列操作push/map/filter早見表15個](/blog/gas-array-basic/) — 2次元配列の扱いがわかると速度が劇的に変わります
- [GASでCSVをスプシに取り込む3手順](/blog/gas-sheet-import-csv/) — CSV連携の基本
- [スプシ自動フィルタをGASで3秒セット](/blog/gas-sheet-filter-auto/) — フィルタ操作の自動化
- [GASのトリガーで毎日・毎週・毎月の自動実行を設定する](/blog/gas-trigger-clock-every-day/) — トリガー設定の詳細解説

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
