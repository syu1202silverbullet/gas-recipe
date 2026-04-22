---
title: "Uber Eats配達記録をMF会計CSV化するGAS"
description: "Uber Eats配達パートナーの記録をGASで集計し、マネーフォワード取込用CSVに変換する方法を看護師が実例で解説。確定申告の前日に泣かない仕組みです。"
pubDate: "TBD"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "side-business"
categoryName: "副業・確定申告"
tagSlugs: ["gas", "ubereats", "tax", "mf"]
tagNames: ["GAS", "Uber Eats", "確定申告", "マネーフォワード"]
mainKeyword: "GAS Uber Eats 確定申告"
readingTime: 7
author: "凛"
---

# Uber Eats配達記録をMF会計CSV化するGAS

## こんな悩みありませんか？

- Uber Eats配達パートナーの副収入、週ごとの明細は見ているけど集計はしていない
- いざ確定申告で「日別の売上と経費」が必要になって、週末に膝から崩れ落ちる
- マネーフォワード会計に手打ちで流し込むのが地獄

私も看護師の合間に自転車でUber Eats配達をしていた時期があり、同じ穴に落ちました。明細PDFやスクショはあるのに、会計ソフトに取り込める形になっていない。これを解決するために作ったのが、スクショOCR＋GAS集計＋MF向けCSV出力の仕組みです。

この記事では、その仕組みの全体像と、GAS側でやっている処理の中心部分を紹介します。

## 全体像：スクショを突っ込んだらCSVが出てくる

流れはシンプルです。

1. アプリから週次明細のスクショを撮って、Googleドライブの専用フォルダにアップ
2. GASがOCRして、配達件数・売上・プロモ・チップ・サービス手数料などを抽出
3. スプレッドシートに1日1行の形で集計
4. 確定申告時期にボタン1つで、マネーフォワード会計用のCSVをエクスポート

「入れる → 出す」の間は全部自動。毎週末の5分のスクショ撮影だけが手作業です。看護師の業務で使う言い方をするなら、記録は「現場でその場で残す」が鉄則、です。

## ポイント3つ：CSV化までの要

### ポイント1：スクショOCRで数字を抜く

Drive APIのOCR機能を使います。配達アプリのスクショは文字のレイアウトが毎週同じなので、正規表現で欲しい数字が素直に拾えます。

```javascript
function extractDeliveryStats(text) {
  // 例：「配達数 18」「売上 ¥12,340」のような行
  const count = Number((text.match(/配達数\s*([0-9]+)/) || [])[1] || 0);
  const revenue = Number((text.match(/売上\s*[¥\\]?([0-9,]+)/) || [])[1]?.replace(/,/g,'') || 0);
  const tip = Number((text.match(/チップ\s*[¥\\]?([0-9,]+)/) || [])[1]?.replace(/,/g,'') || 0);
  const fee = Number((text.match(/サービス手数料\s*[¥\\]?([0-9,]+)/) || [])[1]?.replace(/,/g,'') || 0);

  return { count, revenue, tip, fee };
}
```

OCRの誤読を完全にゼロにはできないので、抽出結果は必ずスプレッドシートに元テキストも一緒に残しておくのがおすすめです。後で見直せるのとそうでないのとで、運用の安心感が全然違います。

### ポイント2：日別集計とチェック列を用意する

スプレッドシート側は、「rawログ」と「日別集計」の2シートに分けています。

- **rawログ**：1スクショ1行。OCR原文・抽出した数字・元画像のURL
- **日別集計**：日付をキーに売上・手数料・経費を横に並べる

日別集計は、rawログをそのまま参照する関数でもいいし、GAS側でappendしてもOK。私は `QUERY` 関数で集計シートを作るのが好きです。

```javascript
// 日別集計シートのA1に貼るだけ
// =QUERY(rawログ!A:E, "select A, sum(B), sum(C), sum(D) where A is not null group by A label A '日付'")
```

こうしておくと、手入力で数字を直したときもCSV出力側に自動で反映されます。

### ポイント3：マネーフォワード会計用CSVに整形する

マネーフォワード会計（MF会計）の「仕訳取込」は、CSVの列順や日付フォーマットにちょっとクセがあります。以下は私が使っている最小構成の疑似コード。実際のMFテンプレートに合わせて列は調整してください。

```javascript
function exportMfCsv() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('日別集計');
  const rows = sheet.getDataRange().getValues().slice(1);

  const header = ['日付', '借方勘定科目', '借方金額', '貸方勘定科目', '貸方金額', '摘要'];
  const lines = [header];

  rows.forEach(r => {
    const [date, revenue, tip, fee] = r;
    const dateStr = Utilities.formatDate(new Date(date), 'JST', 'yyyy/MM/dd');
    // 売上
    lines.push([dateStr, '普通預金', revenue + tip, '売上高', revenue + tip, 'Uber Eats配達売上']);
    // 手数料
    if (fee > 0) {
      lines.push([dateStr, '支払手数料', fee, '普通預金', fee, 'Uber Eats サービス手数料']);
    }
  });

  const csv = lines.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = Utilities.newBlob('\uFEFF' + csv, 'text/csv', 'mf_ubereats_' + Utilities.formatDate(new Date(),'JST','yyyyMMdd') + '.csv');
  DriveApp.createFile(blob);
}
```

冒頭の `\uFEFF` はBOM。これを付けておかないと、MF側で文字化けすることがあります。地味だけど大事なおまじないです。

## 応用：運用を楽にする小ワザ

- **週次トリガーで「先週ぶんのCSV」を自動生成**：毎週月曜朝に1本ファイルが落ちてくる形にすれば、申告月にまとめて泣かずに済む
- **経費シートと結合してネット利益を出す**：自転車のメンテ、ヘルメット、雨具などの経費もスプレッドシートに入れて、同じCSVに出力
- **年次サマリーも自動生成**：年間の件数・売上・平均単価・ピーク月をダッシュボード化。来年の稼働計画が立てやすくなる
- **怪しい日付はハイライト**：OCRで「2024/12/31」みたいに年またぎが変になっていたら、赤背景にして目視チェックを促す

GAS→CSV→MF会計、というルートに慣れると、他の副業収入（ブログ広告、ポイ活、スキルマーケットなど）も同じ仕組みで流し込めるようになります。副業を増やすほど、自動化の恩恵が複利で効いてくる。これ、医療現場の「記録の統一様式」と考え方が似ていて、結局どこの世界でも同じなんだなと感心します。

## まとめ

- スクショOCR＋正規表現で、Uber Eats配達記録を構造化データに変換できる
- 日別集計シートを挟んでからCSV化すると、修正や確認がしやすい
- BOM付きCSV出力で、MF会計の取込み文字化けを防げる

確定申告の直前に泣くのをやめたくて作った仕組みですが、1年運用してみて、月末の心の負担が段違いに軽くなりました。副業を本気でやるなら、数字まわりは早めに自動化しておくのが、看護師的には一番コスパがいい投資です。

## 関連記事

- [確定申告レシートをOCR記帳するGAS実装](./gas-kakutei-receipt-ocr)
- [副業タスクをGASで毎朝LINEに届ける仕組み](./gas-side-business-tasklist)
- [GAS6分制限を回避する3パターン完全解説](./gas-trigger-6min-limit)

---

### この記事を書いた人：凛

都内で看護師をしながら、副業でWebエンジニア、夜勤の合間に副業でGASプログラミングをしています。「自分が楽になるための自動化」をモットーに、看護師目線でGASレシピを発信中。難しいコードより、明日の自分が助かる仕組みが好きです。
