---
title: "条件付き書式をGASで一括設定する10例"
description: "スプレッドシートの条件付き書式をGASでまとめて設定する10パターンを、看護師ママがやさしく紹介。体温チェック表から売上管理まで応用できます。"
pubDate: "2026-05-11T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","formatting","sheet"]
tagNames: ["GAS","書式","シート"]
readingTime: 6
keywords: ["GAS 条件付き書式","スプレッドシート 書式 自動","GAS setConditionalFormatRules"]
---

# 条件付き書式をGASで一括設定する10例

## こんな悩みありませんか？

- 条件付き書式を毎回マウスでポチポチ設定している
- シートをコピーすると書式が崩れて作り直し
- 「期限切れは赤」「完了は灰色」の色ルール、3シート同時に変えたいのに…

私も子どもの体温記録表で「37.5度超えは赤」「37.0〜37.4は黄色」を毎シーズン設定し直していました。
今日は **GASで条件付き書式を一括セット** する10パターンを、コピペでほぼ動く疑似コードで紹介します。ルールを関数に閉じ込めれば、何シートでも一発適用できます。

## 条件付き書式、GASで扱うときの全体像

基本は3ステップです。

1. **ルールを作る**：`SpreadsheetApp.newConditionalFormatRule()` でビルダーを使う
2. **適用範囲を決める**：`setRanges([range])` で対象セルを指定
3. **シートに流し込む**：`sheet.setConditionalFormatRules(rules)` で一括設定

注意点は **`setConditionalFormatRules` は上書き** だということ。追加したいときは、既存ルールを取得して配列にappendします。

```javascript
function addRule(sheet, newRule) {
  const rules = sheet.getConditionalFormatRules();
  rules.push(newRule);
  sheet.setConditionalFormatRules(rules);
}
```

## ポイント1：よく使う比較系ルール4例

```javascript
// 1. 値が「完了」に等しい → 灰色
SpreadsheetApp.newConditionalFormatRule()
  .whenTextEqualTo('完了')
  .setBackground('#d9d9d9')
  .setRanges([sheet.getRange('C2:C')])
  .build();

// 2. 数値が100を超える → 赤
SpreadsheetApp.newConditionalFormatRule()
  .whenNumberGreaterThan(100)
  .setBackground('#f4cccc')
  .setRanges([sheet.getRange('D2:D')])
  .build();

// 3. 空白セル → 薄い黄色でリマインド
SpreadsheetApp.newConditionalFormatRule()
  .whenCellEmpty()
  .setBackground('#fff2cc')
  .setRanges([sheet.getRange('A2:A')])
  .build();

// 4. 特定文字を含む → 太字
SpreadsheetApp.newConditionalFormatRule()
  .whenTextContains('緊急')
  .setBold(true)
  .setRanges([sheet.getRange('B2:B')])
  .build();
```

## ポイント2：日付系ルール3例

```javascript
// 5. 今日の日付 → 緑
SpreadsheetApp.newConditionalFormatRule()
  .whenDateEqualTo(SpreadsheetApp.RelativeDate.TODAY)
  .setBackground('#d9ead3')
  .setRanges([sheet.getRange('A2:A')])
  .build();

// 6. 過去の日付 → 薄灰
SpreadsheetApp.newConditionalFormatRule()
  .whenDateBefore(SpreadsheetApp.RelativeDate.TODAY)
  .setBackground('#eeeeee')
  .setRanges([sheet.getRange('A2:A')])
  .build();

// 7. 1週間以内の期限 → オレンジ
SpreadsheetApp.newConditionalFormatRule()
  .whenDateBefore(SpreadsheetApp.RelativeDate.TOMORROW) // 例示。実運用はカスタム数式推奨
  .setBackground('#fce5cd')
  .setRanges([sheet.getRange('E2:E')])
  .build();
```

期限管理は、子どもの習い事の月謝袋と同じで **早めに色が変わる** と助かります。

## ポイント3：カスタム数式とカラースケール3例

```javascript
// 8. 行全体を塗る（ステータス列を見て行を色付け）
SpreadsheetApp.newConditionalFormatRule()
  .whenFormulaSatisfied('=$C2="完了"')
  .setBackground('#d9d9d9')
  .setRanges([sheet.getRange('A2:E')])
  .build();

// 9. 奇数行にストライプ → 見やすさUP
SpreadsheetApp.newConditionalFormatRule()
  .whenFormulaSatisfied('=ISODD(ROW())')
  .setBackground('#f3f3f3')
  .setRanges([sheet.getRange('A2:E')])
  .build();

// 10. カラースケールで温度を可視化
SpreadsheetApp.newConditionalFormatRule()
  .setGradientMinpointWithValue('#ffffff', SpreadsheetApp.InterpolationType.NUMBER, '36')
  .setGradientMidpointWithValue('#ffd966', SpreadsheetApp.InterpolationType.NUMBER, '37')
  .setGradientMaxpointWithValue('#e06666', SpreadsheetApp.InterpolationType.NUMBER, '38')
  .setRanges([sheet.getRange('B2:B')])
  .build();
```

10番のカラースケールは、我が家の体温表にそのまま使っています。数字を見なくても色で体調の波が分かるので、夜中の看病が少しラクになります。

## 応用：関数化してシート横断で使い回す

10個全部を1つの関数にまとめて、引数にシート名を渡すだけで適用できる形にすると快適です。

```javascript
function applyStandardRules(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const rules = [
    // ここに先ほどの10ルールをbuild()して並べる
  ];
  sheet.setConditionalFormatRules(rules);
}
```

新しく作ったシートに対して `applyStandardRules('新シート名')` を呼ぶだけで、家じゅう・チームじゅうの書式が揃います。

## まとめ

条件付き書式はGASと相性バツグン。

- `newConditionalFormatRule()` → `setRanges` → `setConditionalFormatRules` の3ステップ
- 上書きに注意、追加したいときは配列にpush
- 比較・日付・数式・カラースケールの4タイプをストックしておく

「目で見て分かるシート」は、疲れている日のミスを減らしてくれます。夜勤明けの自分にやさしい書式を、GASで仕込んでおきましょう。

## 関連記事

- CSVインポートをGASで自動化する3手順
- スプシPDF化をGASで自動保存する完全版
- スプシ自動フィルタをGASで3秒セット

---

**【この記事を書いた人：みっちゃんママ】**
三姉妹の母で現役ナース。病院勤務のかたわら、Google Apps Scriptで家計簿・副業管理・家族スケジュールを自動化している副業GASプログラマー。「忙しいママでも、コード3行で生活が軽くなる」をモットーに、等身大のレシピを発信中。
