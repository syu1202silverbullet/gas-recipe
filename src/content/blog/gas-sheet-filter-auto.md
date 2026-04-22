---
title: "スプシ自動フィルタをGASで3秒セット"
description: "スプレッドシートのフィルタ設定をGASで一気に済ませる方法を、看護師が優しく解説。毎回のフィルタ作り直しから卒業しましょう。"
pubDate: "2026-05-10T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","filter","sheet"]
tagNames: ["GAS","フィルタ","シート"]
readingTime: 5
keywords: ["GAS フィルタ 自動","GAS フィルタ設定","スプレッドシート フィルタ GAS"]
---

# スプシ自動フィルタをGASで3秒セット

## こんな悩みありませんか？

- データを貼り替えるたびに、フィルタ範囲を作り直している
- 「今月分だけ」「完了以外だけ」みたいな条件設定を毎回手で選ぶ
- フィルタを掛けたまま保存しちゃって、家族や同僚に見せると混乱する

私も勤務シフトの集計表で、毎週フィルタを掛け直すのがプチストレスでした。
今日は **GASでフィルタを一発セット** する方法を、3秒で仕込める最小コードとしてご紹介します。地味ですが、効く自動化です。

## GASのフィルタ操作、全体像

スプシのフィルタには大きく2種類あります。

1. **基本フィルタ（Filter）**：シート上に1つだけ掛けられる、みんなに見える絞り込み
2. **フィルタビュー（FilterView）**：自分だけに適用できる名前付きフィルタ。共有時の混乱を防げる

看護師仲間と共有するシフト表のように **他人に影響を与えたくない** 場面では、フィルタビュー推しです。一方、自分専用の家計簿では、基本フィルタでサクッと掛けるので十分です。

## ポイント1：既存フィルタを先に外す

まずは安全運転の一手。すでにフィルタが掛かっていると `createFilter()` は失敗します。

```javascript
// 既存フィルタを外してから掛け直す疑似コード
function resetFilter(sheet) {
  const current = sheet.getFilter();
  if (current) current.remove();
}
```

「迷ったらリセット」。病院でも最初に確認するのは点滴の残量ですが、GASも現状把握が最初の一歩です。

## ポイント2：基本フィルタを範囲ごと一発セット

データ範囲を取って、フィルタを掛け、条件を追加するまでを関数1本にまとめます。

```javascript
// ステータス列「完了」を隠す疑似コード
function filterNotDone(sheetName, statusColIndex) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  resetFilter(sheet);
  const range = sheet.getDataRange();
  const filter = range.createFilter();

  const criteria = SpreadsheetApp.newFilterCriteria()
    .setHiddenValues(['完了'])  // 「完了」を非表示
    .build();

  filter.setColumnFilterCriteria(statusColIndex, criteria);
}
```

`setHiddenValues` は「**隠したい値のリスト**」を渡すだけ。逆に「この値だけ残したい」なら `setVisibleValues` が使えます。
「残す側で考えるか、消す側で考えるか」は、お弁当の卵焼きと同じで好みの問題です。

## ポイント3：フィルタビューで自分専用ビューを作る

共有スプシでは、基本フィルタを掛けるとみんなの画面にも影響します。ここはフィルタビューが便利。

```javascript
// フィルタビュー作成の疑似コード（Sheets APIを有効化して利用）
function createMyFilterView(ssId, sheetId) {
  const request = {
    requests: [{
      addFilterView: {
        filter: {
          title: '凛専用',
          range: { sheetId: sheetId, startRowIndex: 0, startColumnIndex: 0 }
        }
      }
    }]
  };
  Sheets.Spreadsheets.batchUpdate(request, ssId);
}
```

`Sheets.Spreadsheets.batchUpdate` を使うには、Apps Scriptのサービス一覧から **Google Sheets API** を有効化してください。一度有効にしておけば、あとは呼び出すだけで使えます。

## 応用：ボタンに割り当てて3秒運用

「メニュー → 関数実行」でも良いのですが、**スプシにカスタムメニューを出す** と家族や同僚にも使ってもらいやすいです。

```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('カスタムメニュー')
    .addItem('完了を隠す', 'filterNotDone_default')
    .addItem('全部表示', 'resetFilter_default')
    .addToUi();
}

function filterNotDone_default() { filterNotDone('勤務', 5); }
function resetFilter_default()   { resetFilter(SpreadsheetApp.getActive().getSheetByName('勤務')); }
```

看護師チームでも「ボタン押すだけ」にしておけば、コード苦手な先輩でも安心して使えます。

## まとめ

フィルタの自動化は地味ですが、毎日触る機能だからこそ **手作業を3秒に圧縮** するインパクトが大きい。

- 既存フィルタを先に外して、エラーを防ぐ
- `setHiddenValues` / `setVisibleValues` で条件を指定
- 共有シートではフィルタビューで自分専用に

「あ、フィルタ掛け忘れた」の一言が減るだけで、一日の集中力がちょっと長持ちします。

## 関連記事

- CSVインポートをGASで自動化する3手順
- 条件付き書式をGASで一括設定する10例
- 編集日時を自動記録するタイムスタンプGAS

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
