---
title: "スプシPDF化をGASで自動保存する完全版"
description: "スプレッドシートをPDF化してDriveに自動保存する手順を、看護師がやさしく解説。毎月の請求書や勤務表づくりがボタン一つで終わります。"
pubDate: "2026-05-09T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","pdf","export"]
tagNames: ["GAS","PDF","出力"]
readingTime: 7
keywords: ["GAS PDF 出力","GAS スプレッドシート PDF","GAS PDF 保存"]
---

# スプシPDF化をGASで自動保存する完全版

## こんな悩みありませんか？

- 毎月末、請求書や勤務表シートを1枚ずつ「ファイル > ダウンロード > PDF」で出力している
- 印刷設定を毎回直すのが地味に面倒
- PDFを保存したフォルダに迷子が発生し、後から探すのに時間がかかる

私も副業の月次レポートを提出するとき、夜勤前の限られた時間でPDF化 → リネーム → 保存、のループに追われていました。
今日は **GASでスプシをPDFに変換して、Driveに自動保存する** 流れを、完全版としてまとめます。プリンタボタンを押す感覚で、毎月の仕上げが終わります。

## PDF自動出力の全体像

GASでPDFを出す方法は大きく2通りあります。

1. **`getAs(MimeType.PDF)`**：スプレッドシート全体を丸ごとPDF化する簡単な方法
2. **エクスポートURLを叩く**：シート単位・範囲単位で細かく指定できる玄人派の方法

家計管理や月次レポートのように **決まったシートを決まった範囲で** 出したいときは、2番が断然おすすめ。印刷範囲、用紙サイズ、ヘッダー非表示などを全部URLパラメータで指定できます。

## ポイント1：エクスポートURLの組み立て

スプレッドシートのエクスポートURLは次のような構造です。

```javascript
// PDFエクスポートURL組み立ての疑似コード
function buildPdfUrl(ssId, sheetGid) {
  const base = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export';
  const params = [
    'format=pdf',
    'size=A4',         // 用紙サイズ
    'portrait=true',   // 縦向き
    'fitw=true',       // 幅をページに合わせる
    'gridlines=false', // 枠線を印刷しない
    'printtitle=false',// タイトル非表示
    'sheetnames=false',
    'gid=' + sheetGid  // 対象シートのgid
  ].join('&');
  return base + '?' + params;
}
```

`gid` は対象シートを開いたときのURL末尾で確認できます。**毎月同じレイアウトで出すなら、このURLを作る関数を1つ用意しておく** と後が楽です。

## ポイント2：認証付きでPDFを取得する

ただURLを叩くだけでは認証エラーになります。GASからは **アクセストークンをヘッダに付けて取得** します。

```javascript
// PDF本体を取得する疑似コード
function fetchPdfBlob(url, fileName) {
  const token = ScriptApp.getOAuthToken();
  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  return res.getBlob().setName(fileName + '.pdf');
}
```

`muteHttpExceptions: true` を付けておくと、失敗時に例外で止まらず、ステータスコードで判定できます。看護師の私としては「**まず落ち着く、原因を見てから動く**」がモットー。エラーでいきなり止まらない設計は大事です。

## ポイント3：Driveへ保存、ファイル名は日付付き

取得したBlobをDriveの特定フォルダに入れれば完成。ファイル名は **後で探せる形式** にしておきます。

```javascript
// Driveに保存する疑似コード
function savePdf(blob, folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const yyyymm = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMM');
  const file = folder.createFile(blob.setName('月次レポート_' + yyyymm + '.pdf'));
  return file.getUrl();
}
```

タイムゾーンは必ず `Asia/Tokyo` を指定。日本の深夜に動かすと、UTCで日付がズレて「先月のPDF」になる事故が起きます。夜勤ナースあるあるです。

## 応用：複数シートを1ファイルにまとめたいとき

請求書や報告書で「1シート=1ページ」を1つのPDFにまとめたいことも多いですよね。

- シンプル版：`gid` を指定せずスプレッドシート全体を出す
- 特定シートだけ：`gid` を複数渡して連結する（GASでBlobを結合するか、`PDF-LIB` 系のライブラリを使う）
- 個別に出してメール添付：月末に自動でGmail送信までつなげると無人運用に

```javascript
function monthlyExport() {
  const url = buildPdfUrl('スプシID','シートgid');
  const blob = fetchPdfBlob(url, '月次レポート');
  const link = savePdf(blob, 'DriveフォルダID');
  // 必要ならGmailで自分に通知
  GmailApp.sendEmail('自分のメール', '月次PDF保存完了', link);
}
```

この関数を **毎月末の時間主導トリガー** に入れれば、PDF化と保存とメール通知が勝手に終わります。夜勤明けに「あ、出力忘れた」と飛び起きることが無くなります。

## まとめ

スプシのPDF化は、

- エクスポートURLを組み立てる
- アクセストークン付きで取得する
- Driveに日付付きで保存する

この3ステップが土台です。レイアウトを固定したいなら **エクスポートURL方式**、とにかく丸ごと出したいなら **`getAs(MimeType.PDF)`**、と使い分けるのがおすすめ。
「毎月の繰り返し作業」を1つ減らすだけで、家族との時間がちゃんと増えます。

## 関連記事

- CSVインポートをGASで自動化する3手順
- 条件付き書式をGASで一括設定する10例
- 編集日時を自動記録するタイムスタンプGAS

---

**### この記事を書いた人：凛**
の母で現役ナース。病院勤務のかたわら、Google Apps Scriptで家計簿・副業管理・家族スケジュールを自動化している副業GASプログラマー。「忙しいママでも、コード3行で生活が軽くなる」をモットーに、等身大のレシピを発信中。
