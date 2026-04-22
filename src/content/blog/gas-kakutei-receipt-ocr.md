---
title: "確定申告レシートをOCR記帳するGAS実装"
description: "ドライブに放り込むだけで、レシートを自動で読み取って勘定科目まで振り分ける仕組みを作りました。看護師が確定申告のレシート地獄から抜け出した手順を公開します。"
pubDate: "TBD"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "side-business"
categoryName: "副業・確定申告"
tagSlugs: ["gas", "ocr", "tax", "receipt"]
tagNames: ["GAS", "OCR", "確定申告", "レシート"]
mainKeyword: "GAS 確定申告 自動化"
readingTime: 7
author: "凛"
---

# 確定申告レシートをOCR記帳するGAS実装

## こんな悩みありませんか？

- 財布の中がレシートまみれで、気づけば申告期限が目の前
- 1枚ずつ金額と日付を手入力していて、途中で心が折れる
- せっかくスマホで撮ったレシート写真が、ただの「思い出アルバム」と化している

私も副業を始めた初年度、3月に入ってからレシートの山とにらめっこして泣きかけました。あれは医療現場の夜勤より精神を削る作業です。でも、GoogleドライブとGASを組み合わせたら、「撮って入れるだけ」でスプレッドシートに記帳される仕組みが組めました。

この記事では、レシート画像をOCRして、日付・金額・ざっくり科目まで自動で埋めるGASの作り方をまとめます。

## OCR記帳GASの全体像

仕組みはすごくシンプルです。

1. スマホでレシートを撮影 → 専用フォルダにアップロード（Googleドライブアプリでワンタップ）
2. GASがフォルダ内の新規画像を検知
3. Drive APIのOCR機能で画像を日本語テキスト化
4. 正規表現で日付・金額を抜き出し、店名キーワードから勘定科目をざっくり判定
5. スプレッドシート「仕訳帳」に1行追記

ここまで全自動。あとは確定申告時にそのスプレッドシートを見直して、会計ソフトに取り込む流れです。「完璧を目指さず、8割埋まれば合格」の心構えで作ると挫折しません。

## ポイント3つ：実装のキモ

### ポイント1：Drive APIのOCR機能を使う

GASの強みは、追加のOCRサービス契約なしでGoogle DriveのOCRが呼べること。画像をいったん「Googleドキュメント形式で変換」することで、中身のテキストが取り出せます。

```javascript
function ocrImage(fileId) {
  const file = DriveApp.getFileById(fileId);
  const resource = {
    title: file.getName() + '_ocr',
    mimeType: 'application/vnd.google-apps.document'
  };
  // advanced Drive APIを有効化しておく
  const docFile = Drive.Files.insert(resource, file.getBlob(), { ocr: true, ocrLanguage: 'ja' });
  const text = DocumentApp.openById(docFile.id).getBody().getText();
  // 後片付け
  DriveApp.getFileById(docFile.id).setTrashed(true);
  return text;
}
```

「サービス」からDrive APIを有効化するのを忘れずに。無料で使えるOCRとしては、日本語レシートの精度もそこそこ優秀です。

### ポイント2：日付と金額を正規表現で抜き出す

OCR結果はノイズだらけ。そこから必要な情報だけを取り出すのは、正規表現の出番です。レシートは定型的な書き方が多いので、意外と素直に抜けます。

```javascript
function parseReceipt(text) {
  // 日付：2026/04/21 や 2026-4-21 など
  const dateMatch = text.match(/(20\d{2})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
  // 合計金額：「合計 1,234円」みたいな行
  const totalMatch = text.match(/(?:合計|計|total)[^\d]*([0-9,]+)/i);

  return {
    date: dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')}` : '',
    amount: totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : 0,
    raw: text
  };
}
```

抜けなかったケースは空欄のまま記録しておいて、後で目視チェックすればOK。全部を機械に任せようとしないのが長続きのコツです。

### ポイント3：店名から勘定科目をざっくり判定

副業の経費でよく出てくる店名を、キーワード辞書にして自動分類します。完璧じゃなくていい、「だいたい合ってる」で十分です。

```javascript
const RULES = [
  { keyword: ['スタバ', 'STARBUCKS', 'ドトール'], category: '会議費' },
  { keyword: ['Amazon', 'ヨドバシ'],             category: '消耗品費' },
  { keyword: ['JR', '地下鉄', 'タクシー'],       category: '旅費交通費' },
  { keyword: ['業務スーパー', 'イオン'],         category: '仕入' }
];

function guessCategory(text) {
  for (const rule of RULES) {
    if (rule.keyword.some(k => text.includes(k))) return rule.category;
  }
  return '未分類';
}
```

辞書は1年目のデータを見ながら育てていく感覚でOK。私も最初は10行くらいから始めて、今は50行超えました。

## 応用：フォルダ監視トリガーで完全自動化

ここまでの関数を、フォルダ新規追加をトリガーに回します。残念ながら「Driveフォルダに追加」トリガーは無いので、時間トリガーで定期チェックするのが実務的です。

```javascript
function scanNewReceipts() {
  const FOLDER_ID = '***'; // スクリプトプロパティ推奨
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFilesByType(MimeType.JPEG);
  const sheet = SpreadsheetApp.getActive().getSheetByName('仕訳帳');

  while (files.hasNext()) {
    const file = files.next();
    if (file.getDescription() === 'processed') continue; // 処理済みフラグ

    const text = ocrImage(file.getId());
    const parsed = parseReceipt(text);
    const category = guessCategory(text);

    sheet.appendRow([parsed.date, parsed.amount, category, file.getUrl(), parsed.raw.slice(0,100)]);
    file.setDescription('processed');
  }
}
```

30分に1回まわしておけば、夜寝る前に撮ったレシートが朝には記帳されている、という運用ができます。処理済みフラグをファイル説明欄に持たせるのがポイントで、スプレッドシート側と二重管理にならずに済みます。

確定申告時は、このスプレッドシートをCSVエクスポートして、マネーフォワードやfreeeに取り込むだけ。「未分類」の行だけ手動で仕分けし直せば、1年分のレシート処理が1〜2時間で片付きます。私は去年、この仕組みのおかげで3月をのんびり過ごせました。

## まとめ

- Googleドライブの標準OCRで、追加コストなくレシート画像をテキスト化できる
- 日付・金額は正規表現、勘定科目はキーワード辞書で十分実用レベル
- 完璧を狙わず「8割自動・2割目視」で運用するのが継続のコツ

レシートって、ただの紙切れに見えて、ためると生活を侵食する厄介な存在です。撮ったその場でフォルダに入れるだけの習慣にしておくと、3月の自分がほんとに助かります。

## 関連記事

- [Uber Eats配達記録をMF会計CSV化するGAS](./gas-ubereats-csv-mf)
- [副業タスクをGASで毎朝LINEに届ける仕組み](./gas-side-business-tasklist)
- [GAS6分制限を回避する3パターン完全解説](./gas-trigger-6min-limit)

---

### この記事を書いた人：凛

都内で看護師をしながら、副業でWebエンジニア、夜勤の合間に副業でGASプログラミングをしています。「自分が楽になるための自動化」をモットーに、看護師目線でGASレシピを発信中。難しいコードより、明日の自分が助かる仕組みが好きです。
