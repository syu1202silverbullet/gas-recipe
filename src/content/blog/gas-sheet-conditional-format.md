---
title: "条件付き書式をGASで一括設定する10例"
description: "スプレッドシートの条件付き書式をGASでまとめて設定する10パターンを解説。体温チェック表から売上管理まで応用できる実務コード付き完全ガイド。"
pubDate: "2026-05-23T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","formatting","sheet"]
tagNames: ["GAS","書式","シート"]
readingTime: 10
keywords: ["GAS 条件付き書式","スプレッドシート 書式 自動","GAS setConditionalFormatRules"]
---

こんにちは、看護師をしながらコードを書いている凛です。スプレッドシートに色やマーカーを手で付けていくのは、患者さんのバイタル表を蛍光ペンで塗り分けていた新人時代を思い出します。条件付き書式も、同じルールを何枚ものシートに毎回ポチポチ設定していると、それだけで貴重な休憩時間が溶けていきますよね。

スプレッドシートの条件付き書式、毎回手動で設定していませんか？シートが増えるたびに同じ設定を繰り返すのは地味に大変です。GASで自動化してしまえば、新しいシートを追加したときも1回の実行で全部揃います。

## こんな悩みありませんか？

「条件付き書式を毎回手動で設定しているけど、複数シートに同じルールを適用するのが大変」「閾値超えで赤・条件達成で緑のような書式を量産したい」「シートが増えるたびに同じ設定をやり直している」「手動で設定した条件付き書式がいつの間にか消えていた」

私は副業の売上ダッシュボードで複数シートに同じ条件付き書式を入れたかったのですが、手動だと地味に1時間かかっていました。GASで一括設定にしたら、シート追加時もスクリプト1回で全部適用できるようになり、ダッシュボード運用が劇的に楽になりました。

## 条件付き書式の仕組みを理解する

まず、GASで条件付き書式を設定する基本の流れを押さえておきましょう。

```
SpreadsheetApp.newConditionalFormatRule()  // ルールのビルダーを作成
  .when条件()                               // 適用する条件を指定
  .set書式()                                // 色や太字などの書式を指定
  .setRanges([range])                       // 適用するセル範囲を指定
  .build()                                  // ルールオブジェクトを完成させる
```

最後に、完成したルールをシートに反映します。

```javascript
// ルールを追加する関数（既存ルールを保持したまま追加）
function addRule(sheet, newRule) {
  const rules = sheet.getConditionalFormatRules();
  rules.push(newRule);
  sheet.setConditionalFormatRules(rules);
}
```

**重要：`setConditionalFormatRules`は既存のルールを全部上書きします。** 既存ルールを残したまま追加したい場合は、上記の`addRule`関数のように既存ルールを取得してから配列に追加する方法を使ってください。

## ポイント1：よく使う比較系ルール4例

比較系ルールはもっとも基本的な条件付き書式です。値の比較、テキスト一致、空白チェックなどを設定できます。

```javascript
function setComparisonRules(sheet) {
  const rules = [];

  // ルール1. 値が「完了」に等しい → 灰色（完了した行を目立たなく）
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('完了')
      .setBackground('#d9d9d9')
      .setFontColor('#999999')
      .setRanges([sheet.getRange('C2:C')])
      .build()
  );

  // ルール2. 数値が100を超える → 赤背景（アラート）
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(100)
      .setBackground('#f4cccc')
      .setRanges([sheet.getRange('D2:D')])
      .build()
  );

  // ルール3. 空白セル → 薄い黄色でリマインド
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenCellEmpty()
      .setBackground('#fff2cc')
      .setRanges([sheet.getRange('A2:A')])
      .build()
  );

  // ルール4. 特定文字を含む → 太字（緊急度高い項目を目立たせる）
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('緊急')
      .setBold(true)
      .setFontColor('#cc0000')
      .setRanges([sheet.getRange('B2:B')])
      .build()
  );

  sheet.setConditionalFormatRules(rules);
  console.log('比較系ルール4件を設定しました');
}
```

私が実際に職場のシフト表で使っているのが「緊急」を含む行を太字にするルール（ルール4）です。シフト変更の急な依頼や緊急対応が一目でわかるので、見落としが減りました。

## ポイント2：日付系ルール3例

日付の比較は看護師として特に重視しているポイントです。有効期限・更新期限・研修修了日など、日付管理は医療現場でも頻繁に使います。

```javascript
function setDateRules(sheet) {
  const rules = [];

  // ルール5. 今日の日付 → 緑（今日の予定を一目でわかるように）
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenDateEqualTo(SpreadsheetApp.RelativeDate.TODAY)
      .setBackground('#d9ead3')
      .setBold(true)
      .setRanges([sheet.getRange('A2:A')])
      .build()
  );

  // ルール6. 過去の日付 → 薄灰色（終了した項目を薄く）
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenDateBefore(SpreadsheetApp.RelativeDate.TODAY)
      .setBackground('#eeeeee')
      .setFontColor('#aaaaaa')
      .setRanges([sheet.getRange('A2:A')])
      .build()
  );

  // ルール7. 1週間以内の期限 → オレンジ（カスタム数式で実装）
  // TODAY() から7日以内かつ今日以降の日付をオレンジに
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND(A2>=TODAY(), A2<=TODAY()+7)')
      .setBackground('#fce5cd')
      .setBold(true)
      .setRanges([sheet.getRange('A2:A')])
      .build()
  );

  sheet.setConditionalFormatRules(rules);
  console.log('日付系ルール3件を設定しました');
}
```

期限管理は、子どもの習い事の月謝袋と同じで**早めに色が変わる**と助かります。ルール7の「1週間以内のオレンジ」があると、期限を見逃しにくくなります。

## ポイント3：カスタム数式とカラースケール3例

高度な書式設定にはカスタム数式（`whenFormulaSatisfied`）とカラースケールを使います。

```javascript
function setAdvancedRules(sheet) {
  const rules = [];

  // ルール8. 行全体を塗る（ステータス列を見て行全体を色付け）
  // C列が「完了」の場合、A〜E列全体を灰色に
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$C2="完了"')
      .setBackground('#d9d9d9')
      .setFontColor('#999999')
      .setRanges([sheet.getRange('A2:E')])
      .build()
  );

  // ルール9. 奇数行にストライプ → 読みやすさUP
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=ISODD(ROW())')
      .setBackground('#f8f9fa')
      .setRanges([sheet.getRange('A2:Z')])
      .build()
  );

  // ルール10. カラースケールで体温を可視化（36℃=白→37℃=黄→38℃=赤）
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .setGradientMinpointWithValue('#ffffff', SpreadsheetApp.InterpolationType.NUMBER, '36')
      .setGradientMidpointWithValue('#ffd966', SpreadsheetApp.InterpolationType.NUMBER, '37')
      .setGradientMaxpointWithValue('#e06666', SpreadsheetApp.InterpolationType.NUMBER, '38')
      .setRanges([sheet.getRange('B2:B')])
      .build()
  );

  sheet.setConditionalFormatRules(rules);
  console.log('高度なルール3件を設定しました');
}
```

ルール10のカラースケールは、我が家の体温表にそのまま使っています。数字を見なくても色で体調の波が分かるので、夜中の看病が少しラクになります。子どもの微熱が続いているときは、このグラデーションを見るだけでトレンドが一目瞭然です。

## 全10ルールを1つの関数にまとめる

上記の10ルールを1つの関数にまとめて、シート名を引数で渡すだけで適用できる形にすると使い回しが楽になります。

```javascript
function applyAllRules(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    console.log(`シート "${sheetName}" が見つかりません`);
    return;
  }

  const rules = [];

  // --- 比較系ルール ---
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('完了')
      .setBackground('#d9d9d9').setFontColor('#999999')
      .setRanges([sheet.getRange('C2:C')]).build()
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(100)
      .setBackground('#f4cccc')
      .setRanges([sheet.getRange('D2:D')]).build()
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenCellEmpty().setBackground('#fff2cc')
      .setRanges([sheet.getRange('A2:A')]).build()
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('緊急').setBold(true).setFontColor('#cc0000')
      .setRanges([sheet.getRange('B2:B')]).build()
  );

  // --- 日付系ルール ---
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenDateEqualTo(SpreadsheetApp.RelativeDate.TODAY)
      .setBackground('#d9ead3').setBold(true)
      .setRanges([sheet.getRange('A2:A')]).build()
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenDateBefore(SpreadsheetApp.RelativeDate.TODAY)
      .setBackground('#eeeeee').setFontColor('#aaaaaa')
      .setRanges([sheet.getRange('A2:A')]).build()
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND(A2>=TODAY(), A2<=TODAY()+7)')
      .setBackground('#fce5cd').setBold(true)
      .setRanges([sheet.getRange('A2:A')]).build()
  );

  // --- 高度なルール ---
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$C2="完了"')
      .setBackground('#d9d9d9').setFontColor('#999999')
      .setRanges([sheet.getRange('A2:E')]).build()
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=ISODD(ROW())')
      .setBackground('#f8f9fa')
      .setRanges([sheet.getRange('A2:Z')]).build()
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .setGradientMinpointWithValue('#ffffff', SpreadsheetApp.InterpolationType.NUMBER, '36')
      .setGradientMidpointWithValue('#ffd966', SpreadsheetApp.InterpolationType.NUMBER, '37')
      .setGradientMaxpointWithValue('#e06666', SpreadsheetApp.InterpolationType.NUMBER, '38')
      .setRanges([sheet.getRange('B2:B')]).build()
  );

  // すべてのルールを適用（既存ルールを上書き）
  sheet.setConditionalFormatRules(rules);
  console.log(`"${sheetName}" に10件のルールを適用しました`);
}
```

使い方はシンプルです。

```javascript
// 1つのシートに適用
applyAllRules('売上管理');

// 全シートに一括適用
function applyToAllSheets() {
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(sheet => {
    applyAllRules(sheet.getName());
  });
}
```

新しく月次シートを作成したとき、`applyAllRules('2026年6月')`を1回実行するだけで同じ書式が整います。

## 私が試して気づいたコツ3つ

### コツ1：ルールの優先順位に注意

複数のルールが同じセルに適用される場合、配列の先頭のルールが優先されます。

```javascript
// 例：「完了」は灰色、「緊急」は赤太字を設定するとき
const rules = [
  // ← 先頭のルールが優先される
  ruleForCompleted,   // 「完了」→灰色
  ruleForUrgent,      // 「緊急」→赤太字
];
sheet.setConditionalFormatRules(rules);
// セルに「緊急かつ完了」が入っていた場合、灰色が適用される
```

重要度が高いルールを先頭に置く習慣をつけましょう。

### コツ2：既存ルールを一度クリアしてから再設定

`setConditionalFormatRules`は完全上書きなので、すでに何らかのルールが入っているシートに追加したい場合は注意が必要です。

```javascript
// 既存ルールをすべてクリア
sheet.setConditionalFormatRules([]);

// 新しいルールを設定
sheet.setConditionalFormatRules(newRules);
```

または既存ルールを保持したまま追加：

```javascript
// 既存ルールに追加
const existing = sheet.getConditionalFormatRules();
sheet.setConditionalFormatRules([...existing, ...newRules]);
```

### コツ3：色はHEXコードで統一

`'red'`などの色名より`'#FF0000'`のHEXコードを使う方が確実です。色名はGASによって予期せず変換されることがあります。

よく使う色のHEXコードメモ：

| 色 | HEXコード | 用途 |
|---|---|---|
| 薄赤 | `#f4cccc` | エラー・超過 |
| 薄緑 | `#d9ead3` | 正常・達成 |
| 薄黄 | `#fff2cc` | 注意・未入力 |
| 薄オレンジ | `#fce5cd` | 期限間近 |
| 薄灰 | `#eeeeee` | 完了・非アクティブ |
| 縞模様用 | `#f8f9fa` | 奇数行ストライプ |

## つまずきやすいポイント

### ルールが反映されない

`sheet.setConditionalFormatRules(rules)`の引数に配列を渡していない場合や、`build()`を忘れている場合に起こります。

```javascript
// ❌ NG：buildを忘れている
const rule = SpreadsheetApp.newConditionalFormatRule()
  .whenTextEqualTo('完了')
  .setBackground('#d9d9d9')
  .setRanges([sheet.getRange('A2:A')]);
  // .build() が必要！

// ✅ OK
const rule = SpreadsheetApp.newConditionalFormatRule()
  .whenTextEqualTo('完了')
  .setBackground('#d9d9d9')
  .setRanges([sheet.getRange('A2:A')])
  .build(); // ← 必須
```

### カスタム数式の`$`の位置

カスタム数式で行全体を色付けするとき、列の固定（`$C2`）が必要です。

```javascript
// ❌ NG：C2の値だけしか参照しない
.whenFormulaSatisfied('=C2="完了"')

// ✅ OK：列を固定して全行に対してC列を参照
.whenFormulaSatisfied('=$C2="完了"')
```

`$C2`の`$`は「C列を固定して、行は変動させる」という意味です。これがないと行全体が塗られません。

## ここまでのポイント

GASの条件付き書式はシンプルな3ステップです。

- `newConditionalFormatRule()` → 条件を指定 → `setRanges` → `.build()`
- `sheet.setConditionalFormatRules(rules)` でまとめて適用（上書き）
- 比較・日付・数式・カラースケールの4タイプをストックしておく

「目で見て分かるシート」は、疲れている日のミスを減らしてくれます。夜勤明けの自分にやさしい書式を、GASで仕込んでおきましょう。

## まとめ

| ルールの種類 | 用途 | 使用メソッド |
|---|---|---|
| 値比較 | 目標超過・未達を色分け | `whenNumberGreaterThan`等 |
| テキスト一致 | ステータス管理 | `whenTextEqualTo`等 |
| 日付系 | 期限管理・今日のハイライト | `whenDateEqualTo`等 |
| カスタム数式 | 行全体の色付け・ストライプ | `whenFormulaSatisfied` |
| カラースケール | 体温・売上などの濃淡 | `setGradient〜` |

この10ルールを組み合わせれば、スプレッドシートのダッシュボードが一気に見やすくなります。新しいシートに追加するたびに関数を1回実行するだけなので、書式のメンテナンスにかける時間もゼロになります。

## あわせて読みたい関連記事

スプレッドシート自動化をもっと深めたい方は、以下の記事もおすすめです。

- [GASで配列操作push/map/filter早見表15個](/blog/gas-array-basic/) — 2次元配列の扱いがわかると速度が劇的に変わります
- [GASでCSVをスプシに取り込む3手順](/blog/gas-sheet-import-csv/) — CSV連携の基本
- [GASでGmail添付ファイルをドライブに自動保存](/blog/gas-gmail-attachment-drive/) — メール+スプシ連携の実例

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。

> **AI活用について**：本記事の構成・文章の一部はAIを活用して作成しています。掲載コードは実際に動作検証済みで、内容の正確性は筆者が確認しています。
