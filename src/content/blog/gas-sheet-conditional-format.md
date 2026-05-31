---
title: "条件付き書式をGASで一括設定する10例"
description: "スプレッドシートの条件付き書式をGASでまとめて設定する10パターンを、看護師がやさしく紹介。体温チェック表から売上管理まで応用できます。"
pubDate: "2026-05-23T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","formatting","sheet"]
tagNames: ["GAS","書式","シート"]
readingTime: 6
keywords: ["GAS 条件付き書式","スプレッドシート 書式 自動","GAS setConditionalFormatRules"]
---

こんにちは、凛です。2児のママで現役ナースをしながら、GASで副業をしています。

## こんな悩みありませんか？

- 条件付き書式を毎回手動で設定しているけど、複数シートに同じルールを適用するのが大変
- 「閾値超えで赤」「条件達成で緑」のような書式を量産したい
- シート増えるたびに同じ設定をやり直している
- 手動で設定した条件付き書式がいつの間にか消えていた

私は副業の売上ダッシュボードで複数シートに同じ条件付き書式を入れたかったのですが、手動だと地味に1時間かかっていました。GASで一括設定にしたら、シート追加時もスクリプト1回で全部適用できるようになり、ダッシュボード運用が劇的に楽になりました。

## サンプルコード（コピペで動きます）

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

## ここまでのポイント

条件付き書式はGASと相性バツグン。

- `newConditionalFormatRule()` → `setRanges` → `setConditionalFormatRules` の3ステップ
- 上書きに注意、追加したいときは配列にpush
- 比較・日付・数式・カラースケールの4タイプをストックしておく

「目で見て分かるシート」は、疲れている日のミスを減らしてくれます。夜勤明けの自分にやさしい書式を、GASで仕込んでおきましょう。


## あわせて読みたい関連記事

スプレッドシート自動化をもっと深めたい方は、以下の記事もおすすめです。

- [GASで配列操作push/map/filter早見表15個](/blog/gas-array-basic/) — 2次元配列の扱いがわかると速度が劇的に変わります
- [GASでCSVをスプシに取り込む3手順](/blog/gas-sheet-import-csv/) — CSV連携の基本
- [スプシ自動フィルタをGASで3秒セット](/blog/gas-sheet-filter-auto/) — フィルタ操作の自動化

これらと組み合わせると、スプシ運用の手作業をどんどん減らせます。


## 私（凛）が試して気づいたコツ3つ

### コツ1：ルールを配列で管理

`[{range: 'A:A', condition: 'NUMBER_GREATER', value: 1000, color: '#FF0000'}, ...]` のように設定をデータ化すると、追加・変更が一目で済みます。

### コツ2：既存ルールを一度クリア

`sheet.setConditionalFormatRules([])` で既存をクリアしてから新規追加。これをしないとルールが重なり続けます。

### コツ3：複数シート一括適用

`SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(sheet => ...)` で全シートに一括適用。

## つまずきやすいポイント

- **ルールの優先順位**：複数ルールが重なる場合、配列順で先頭が優先されます。重要度で並べるのがコツ。
- **色指定の形式**：`'red'` ではなく `'#FF0000'` のような16進カラーコードが推奨。

## まとめ：ダッシュボードの統一感を一気に上げる

このGASを「ダッシュボードのシート追加時に1回実行」すれば、全シートに統一の書式が適用されます。

私の運用例：
1. 売上スプシで月次シート（4月・5月…）を作成
2. シート追加後にGAS実行
3. 全シートに同じ条件付き書式が適用される

「ダッシュボードがバラバラで見にくい」課題を、一発で解決できる便利テクです。

## まとめ

| ルールの種類 | 用途 | メソッド |
|---|---|---|
| 値比較 | 目標超過・未達を色分け | whenNumberGreaterThan 等 |
| テキスト一致 | ステータス管理 | whenTextEqualTo 等 |
| 日付系 | 期限管理・今日のハイライト | whenDateEqualTo 等 |
| カスタム数式 | 行全体の色付け・ストライプ | whenFormulaSatisfied |
| カラースケール | 体温・売上などの濃淡 | setGradient〜 |

## 関連記事

- [GASでCSVをスプシに取り込む3手順](/blog/gas-sheet-import-csv/) — 取り込んだデータに書式を適用
- [GASでGoogleフォームの回答をスプシに自動整形](/blog/gas-form-sheet-auto/) — フォームデータの自動整形
- [GAS実行上限Quota超過の原因と対処法](/blog/gas-error-quota/) — 処理速度の最適化

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。
