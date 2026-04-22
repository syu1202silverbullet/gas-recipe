---
title: "CSVインポートをGASで自動化する3手順"
description: "GASでCSVを取り込む基本3ステップを、看護師目線でやさしく解説。Drive上のCSVをスプレッドシートへ流し込み、日々の手作業をゼロに近づけます。"
pubDate: "2026-05-08T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","csv","import"]
tagNames: ["GAS","CSV","取り込み"]
readingTime: 6
keywords: ["GAS CSV 取り込み","GAS CSV インポート","Google Apps Script CSV"]
---

# CSVインポートをGASで自動化する3手順

## こんな悩みありませんか？

- 毎朝、銀行サイトやPOSから落としたCSVをスプレッドシートに貼り付けている
- 貼り間違い・桁ズレ・文字化けでやり直しが地味にしんどい
- 夜勤明けの頭で「コピペ作業」は正直やりたくない…

わかります。私も夜勤明けに家事をしながら、副業の売上CSVをコピペして、何度セルをズラしたか分かりません。
今日は「CSVをスプシに自動で流し込む」最小構成のGASを、3手順に分けて一緒に組み立てていきましょう。読み終えるころには、ボタン1つで取り込みが終わる状態をイメージできるようになります。

## GASでCSVを取り込む全体像

まずは全体の流れをざっくりつかみます。

1. **CSVの置き場所を決める**：Google Drive上の特定フォルダに、毎回同じ名前で保存する運用にします
2. **GASで読み込む**：`DriveApp` でファイルを取得し、中身をテキストとして受け取ります
3. **スプシに書き込む**：`Utilities.parseCsv` で配列化し、`setValues` で一気に貼り付けます

ポイントは「1セルずつ書かない」こと。ループで1セルずつ書くと遅いし、行数が増えるとタイムアウトします。**2次元配列にして一括 setValues** が看護師流の鉄則です。

## ポイント1：CSVファイルを安全に取得する

Driveから取得するときは、ファイル名ではなく **フォルダ内の最新ファイル** を拾う運用がおすすめ。ファイル名のタイプミスで止まる事故を防げます。

```javascript
// 指定フォルダから最新CSVを取得する疑似コード
function getLatestCsv(folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFilesByType(MimeType.CSV);
  let latest = null;
  while (files.hasNext()) {
    const f = files.next();
    if (!latest || f.getLastUpdated() > latest.getLastUpdated()) {
      latest = f;
    }
  }
  return latest; // 最新のCSVファイル
}
```

夜勤明けでも落ち着いて動くように、**ファイルが見つからなかったときのエラー処理** もセットで書いておきましょう。`if (!latest) throw new Error('CSVが見つかりません');` の一行で、原因不明の無言エラーが減ります。

## ポイント2：文字コードと区切りを意識する

日本語CSVのつまずきポイントは、だいたい **文字コード** と **区切り文字** です。

- 銀行系・会計系はShift_JIS（CP932）が多い
- 海外SaaSはUTF-8
- タブ区切り（TSV）のときは `parseCsv` の第2引数に `'\t'` を指定

```javascript
// 文字コードを指定して読み込む疑似コード
function readCsv(file) {
  const blob = file.getBlob();
  const text = blob.getDataAsString('Shift_JIS'); // UTF-8なら 'UTF-8'
  const rows = Utilities.parseCsv(text);         // TSVなら parseCsv(text, '\t')
  return rows;
}
```

「文字化けしたら最初に疑うのは文字コード」。これだけ覚えておけば、9割のトラブルはサクッと解決します。

## ポイント3：貼り付けは一括で、クリアもセットで

スプシに書き込むときは、**既存データをクリアしてから貼る** のがコツ。前回分が残っていると、行数の違いで古いデータが混ざります。

```javascript
// シートに一括貼り付けする疑似コード
function writeToSheet(rows, sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  sheet.clearContents();                          // 既存データを消す
  if (rows.length === 0) return;
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}
```

`setValues` の範囲指定は `(開始行, 開始列, 行数, 列数)` の順。**配列の行数と列数をそのまま渡す** と覚えれば迷いません。

## 応用：トリガーで毎朝自動化する

3つの関数をつなげれば、あとはトリガーを仕込むだけ。

```javascript
function importDailyCsv() {
  const file = getLatestCsv('フォルダIDをここに');
  const rows = readCsv(file);
  writeToSheet(rows, '取込データ');
}
```

GASエディタの「トリガー」から、`importDailyCsv` を **毎朝6時に時間主導で実行** に設定。子どもを起こす前にデータは入っている、という状態が作れます。

さらに慣れてきたら、

- 取り込み後に `SpreadsheetApp.flush()` を呼んで反映を待つ
- 実行ログを別シートに記録して、失敗した日を一目で確認
- Gmail通知で「◯行取り込みました」とスマホに届ける

といった小さな工夫を足していくと、自分専用の業務アシスタントに育っていきます。

## まとめ

CSVインポートは「**取得 → 読み込み → 貼り付け**」の3手順に分けて考えると、一気にシンプルになります。

- Driveの最新ファイルを拾う設計にして、ファイル名ミスを防ぐ
- 文字コードと区切りは最初に決める
- `clearContents` + `setValues` でまるっと入れ替える

毎日のコピペが消えると、夜勤明けのコーヒー時間が少しだけ長くなります。まずは自分のよく使うCSV1種類から、小さく始めてみてくださいね。

## 関連記事

- スプシPDF化をGASで自動保存する完全版
- スプシ自動フィルタをGASで3秒セット
- 編集日時を自動記録するタイムスタンプGAS

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
