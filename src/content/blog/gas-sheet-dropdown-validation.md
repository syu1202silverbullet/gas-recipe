---
title: "GASでプルダウン（入力規則）を一括設定・解除する実務レシピ"
description: "GASでスプレッドシートのプルダウン（入力規則）をコードから一括設定・解除する方法をまとめました。setDataValidation・requireValueInList・clearDataValidationsの実務レシピを、初心者がハマるポイントつきで丁寧に解説します。"
pubDate: "2026-07-13T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","validation"]
tagNames: ["GAS","スプレッドシート","入力規則"]
readingTime: 8
keywords: ["GAS プルダウン","GAS 入力規則","GAS setDataValidation"]
---

凛です。この前、勤務表の管理表を作っていたとき、「未着手・対応中・完了」を毎回手打ちしていたら、案の定「対応中」と「対応済み」が混ざって集計がぐちゃぐちゃになりました。手作業でひとつずつプルダウンを設定するのも心が折れそうで、夜勤明けの眠い頭で「これ、コードで一気にできないの？」と調べたのがきっかけです。やってみたら想像以上に簡単で、しかも一括で解除もできる。今日はその実務レシピを、私がハマったところも含めて丸ごと共有します。

# GASでプルダウン（入力規則）を一括設定・解除する実務レシピ

スプレッドシートの「入力規則（データの入力規則）」は、セルに入れられる値を制限する機能です。いわゆる「プルダウン」もこの入力規則の一種。手動なら「データ」→「データの入力規則」から設定しますが、行が増えるたびに設定し直すのは正直しんどいです。

GAS（Google Apps Script）を使えば、この入力規則を**コードから一括で設定・解除**できます。100行でも1000行でも、複数列にまとめて、ボタンひとつで。この記事では、その具体的な書き方を順番に解説していきます。

## そもそも入力規則（プルダウン）とは何か

まずは言葉の整理から。GASで扱う「入力規則」と、画面で見える「プルダウン」の関係を押さえておくと、あとのコードがぐっと分かりやすくなります。

### プルダウンは「入力規則」の一種

スプレッドシートで「▼」が付いてリストから選べるあれ。あれは正式には「データの入力規則」のうち、「リストから選択」に設定したものです。GASのAPIでは `DataValidation`（データ入力規則）というオブジェクトで表現されます。

つまり、GASでプルダウンを作る＝「リストから値を選ぶ入力規則」を作ってセルに適用する、ということです。プルダウン以外にも「数値が◯以上」「日付である」といった入力規則も同じ仕組みで作れますが、今回はいちばん使うプルダウンを中心に進めます。

### 手動設定とコード設定の違い

手動設定は「今そこにあるセル」に一回だけ設定する作業です。行が増えたら、また設定し直し。一方コードなら、「B2からB1000まで」のように範囲をまとめて指定できますし、あとから「onOpenで開くたびに設定し直す」といった自動化にもつなげられます。

一度スクリプトを書いてしまえば、同じ設定を何度でも呼び出せるのが最大のメリットです。テンプレートを配って複数人で使うシートなんかだと、この差はかなり大きいです。

## 基本：1つの範囲にプルダウンを設定する

まずはいちばんシンプルな形から。決まった選択肢のプルダウンを、指定した範囲にひとつ設定します。

### newDataValidationでルールを組み立てる

入力規則は `SpreadsheetApp.newDataValidation()` から作ります。ビルダー（組み立て）方式になっていて、条件を足していって最後に `.build()` で完成させる、という流れです。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function setBasicDropdown() {
  // アクティブなスプレッドシートの「タスク管理」シートを取得
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('タスク管理');

  // プルダウンを付けたい範囲（B2からB100まで）を取得
  const range = sheet.getRange('B2:B100');

  // 入力規則（プルダウン）のルールを組み立てる
  const rule = SpreadsheetApp.newDataValidation()        // 新しい入力規則のビルダーを開始
    .requireValueInList(['未着手', '対応中', '完了'], true) // 3つの選択肢からのみ入力可・第2引数trueで▼を表示
    .setAllowInvalid(false)                               // リスト外の値は「拒否」する
    .setHelpText('リストから選択してください')             // 無効な値を入れたときに出る説明文
    .build();                                             // ルールを完成させる

  // 組み立てたルールを範囲に適用する
  range.setDataValidation(rule);
}
```

`requireValueInList` の第2引数（`true`）が地味に大事です。ここを `true` にするとセルに「▼」が表示されてプルダウンになります。`false` にすると入力制限だけかかって▼が出ません。プルダウンにしたいなら必ず `true` にしましょう。

### setAllowInvalidで「拒否」か「警告」かを決める

`setAllowInvalid` は、リストにない値を入れようとしたときの挙動を決めます。ここは動作が変わる大事なポイントなので、次の章で詳しく扱います。まずは「`false` にすると弾いてくれる」とだけ覚えておいてください。

## 「拒否」と「警告」の違いを理解する

`setAllowInvalid(false)` と `setAllowInvalid(true)` は、見た目は似ていても挙動がまったく違います。ここを間違えると「せっかく規則を付けたのに変な値が入る」ことになるので、しっかり分けて理解しましょう。

### setAllowInvalid(false)＝無効なデータを拒否

`setAllowInvalid(false)` にすると、リストにない値を入力しようとしたときに**その入力自体がブロック**されます。「入力した内容がデータの入力規則に一致しません」といったメッセージが出て、値は確定されません。集計の正確さを守りたいなら、基本はこちらです。

### setAllowInvalid(true)＝警告のみ（デフォルト）

`setAllowInvalid(true)`（何も指定しないとこちらがデフォルト）にすると、リストにない値でも**入力自体は通ります**。ただしセルの右上に赤い三角マークが付いて「この値は違うよ」と警告してくれる、という控えめな挙動です。

「基本はリストから選んでほしいけど、どうしても例外を手打ちしたいこともある」という運用ならこちらが向いています。下の表に違いをまとめました。

| 設定 | リスト外の値を入力したとき | 使いどころ |
| --- | --- | --- |
| `setAllowInvalid(false)` | 入力を拒否して確定させない | 集計の正確さを絶対に守りたいとき |
| `setAllowInvalid(true)`（既定） | 入力は通るが赤い警告マークが付く | 例外的な手打ちも許したいとき |
| 指定しない | `true` と同じ（警告のみ） | 意図せず緩くなるので注意 |

`setAllowInvalid` を書き忘れるとデフォルトの「警告のみ」になります。「拒否したかったのに素通りした」というのは私も最初にやらかしたので、拒否したいときは明示的に `false` を書くクセをつけると安心です。

## 別のセル範囲を選択肢にする

選択肢をコードに直接書くのではなく、「シートのこの列に書いてある値をそのままプルダウンにしたい」というケースもよくあります。担当者リストやカテゴリ一覧など、あとで増減するものはこちらが便利です。

### requireValueInRangeを使う

選択肢の元ネタを別セルにする場合は `requireValueInRange` を使います。第1引数に「選択肢が書いてある範囲」を渡します。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function setDropdownFromRange() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('タスク管理');

  // 選択肢の元になる範囲（M列に担当者名を並べておく想定）
  const sourceRange = sheet.getRange('M2:M20');

  // プルダウンを付けたい範囲（C列の担当者欄）
  const targetRange = sheet.getRange('C2:C100');

  // 「別範囲の値をプルダウンにする」ルールを組み立てる
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(sourceRange, true) // 第2引数trueで▼を表示
    .setAllowInvalid(false)                 // リスト外は拒否
    .setHelpText('担当者を選択してください')
    .build();

  // C列に適用
  targetRange.setDataValidation(rule);
}
```

こうしておくと、M列に担当者を1人足すだけで、プルダウンの選択肢にも自動で反映されます。選択肢がよく変わるものは、この方式が圧倒的にラクです。

### メンテナンスがラクになる理由

`requireValueInList` はコードの中に選択肢を書き込むので、選択肢を変えるたびにスクリプトを直す必要があります。一方 `requireValueInRange` はシート上の範囲を見るだけなので、**コードを触らずシートを編集するだけ**で選択肢を更新できます。

非エンジニアの同僚にシートを渡す場合、「M列に書き足すだけでいいよ」と説明できるのは大きいです。運用のことまで考えると、変化しやすい選択肢は範囲参照にしておくのがおすすめです。

## 複数列にまとめて一括適用する

実務でいちばん効くのがここ。ステータス列・担当者列・優先度列……と、複数の列にそれぞれ別のプルダウンをまとめて設定するパターンです。

### ループで列ごとに違うリストを設定する

列ごとに違う選択肢を割り当てたいときは、設定を配列にまとめてループで回すとスッキリ書けます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function setMultipleDropdowns() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('タスク管理');
  const lastRow = 1000; // 適用したい最終行（余裕をもって多めに）

  // 「列・選択肢・説明文」をまとめた設定リスト
  const configs = [
    { column: 'B', list: ['未着手', '対応中', '完了'],      help: 'ステータスを選択' },
    { column: 'C', list: ['低', '中', '高'],                help: '優先度を選択' },
    { column: 'D', list: ['自宅', 'オフィス', '外出先'],    help: '作業場所を選択' }
  ];

  // 設定リストを1件ずつ処理する
  configs.forEach(function(config) {
    // その列のルールを組み立てる
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(config.list, true)
      .setAllowInvalid(false)
      .setHelpText(config.help)
      .build();

    // 2行目からlastRowまでの範囲を取得して適用
    const range = sheet.getRange(config.column + '2:' + config.column + lastRow);
    range.setDataValidation(rule);
  });
}
```

設定を配列にしておくと、列が増えても `configs` に1行足すだけで済みます。「B列とC列とD列に別々のプルダウン」が、この短さで一括設定できるわけです。

### 列全体に広めに適用しておくコツ

行数が読めないシートでは、`2:1000` のように**将来の分まで少し多めに範囲を取っておく**のが実務的です。中身が空でも入力規則だけ先に敷いておけば、あとで新しい行にデータを打つ人が最初からプルダウンを使えます。

ただし範囲を広げすぎると、シートが少し重くなることがあります。数万行に一気に敷くのはやりすぎなので、実際に使う見込み＋αくらいに抑えるのがちょうどいいです。私はだいたい「今の2〜3倍の行数」を目安にしています。

## 入力規則を解除・確認する

設定できたら、次は「消したいとき」と「今どうなってるか確認したいとき」の操作も押さえておきましょう。ここまでできれば、入力規則を自由に扱えるようになります。

### clearDataValidationsで一括解除

入力規則を消すのは `clearDataValidations()` です。範囲に対して呼ぶと、その範囲のプルダウンや入力制限がまとめて外れます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function clearDropdowns() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('タスク管理');

  // 入力規則を解除したい範囲を指定
  const range = sheet.getRange('B2:D1000');

  // この範囲の入力規則をすべて解除する（セルの値は消えない）
  range.clearDataValidations();
}
```

大事なのは、`clearDataValidations()` は**入力規則だけを消して、セルに入っている値は消さない**という点です。「未着手」と打ってあるセルの文字はそのまま残り、プルダウンの制限だけが外れます。値ごと消したいわけではないので、ここは安心して使えます。

### getDataValidationで今の設定を確認

今その範囲にどんな入力規則が入っているかは `getDataValidation()`（単数）や `getDataValidations()`（複数）で調べられます。1セルなら単数、範囲まとめてなら複数、と使い分けます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function checkDataValidation() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('タスク管理');

  // 1つのセルの入力規則を確認する
  const cell = sheet.getRange('B2');
  const rule = cell.getDataValidation(); // 入力規則が無ければ null が返る

  if (rule) {
    // 規則の種類（CriteriaType）と、設定されている選択肢などを取り出す
    const criteria = rule.getCriteriaType();   // 例：VALUE_IN_LIST
    const args = rule.getCriteriaValues();      // 選択肢の配列などが入る
    Logger.log('種類: ' + criteria);
    Logger.log('選択肢など: ' + JSON.stringify(args));
    Logger.log('無効値を許可: ' + rule.getAllowInvalid()); // trueなら警告のみ
  } else {
    Logger.log('このセルには入力規則がありません');
  }
}
```

`getDataValidation()` は入力規則が無いセルだと `null` を返します。なので使う前に「`null` かどうか」を確認してから中身を読むのが安全です。ここを忘れると次の失敗例のようなエラーになります。

## 初心者がハマりやすい失敗と回避策

私が実際につまずいたところと、よく質問されるポイントをまとめます。先に知っておくと、無駄に時間を溶かさずに済みます。

### build()を忘れてエラーになる

いちばん多いのがこれ。`newDataValidation()` からルールを組み立てたのに、最後の `.build()` を書き忘れるパターンです。`.build()` が無いと「ビルダー」のままで、`setDataValidation()` に渡すと型が合わずエラーになります。

条件をつなげたら、必ず最後に `.build()` で締める。おまじないみたいに覚えておくと安心です。組み立て系のAPIは最後に `.build()`、と体で覚えてしまいましょう。

### nullチェックを忘れて落ちる

`getDataValidation()` の戻り値をそのまま使うと、入力規則が無いセルでは `null` が返ってきて「`Cannot read properties of null`」のようなエラーで止まります。前の章で書いたとおり、`if (rule)` で存在チェックをしてから中身を触るのが鉄則です。

範囲全体をループで調べるときも同じで、セルごとに `null` があり得るので、1つずつ確認してから処理しましょう。ここを丁寧にやっておくと、後々のエラーがぐっと減ります。

### requireValueInListの第2引数を忘れる

「プルダウンにしたいのに▼が出ない」という相談も多いです。原因はたいてい `requireValueInList(list, true)` の第2引数を省略していること。省略すると `false` 扱いになり、入力制限はかかるのに▼が表示されません。プルダウンにしたいなら `true` を明示しましょう。

下によくある失敗と対処をまとめておきます。

| 症状 | よくある原因 | 回避策 |
| --- | --- | --- |
| ルール適用でエラー | `.build()` の書き忘れ | 条件の最後に必ず `.build()` を付ける |
| `null` でスクリプトが止まる | 入力規則が無いセルを読んだ | `if (rule)` でnullチェックしてから使う |
| ▼が表示されない | `requireValueInList` の第2引数省略 | 第2引数を `true` にする |
| 変な値が素通りする | `setAllowInvalid` 未指定（既定で警告のみ） | 拒否したいなら `setAllowInvalid(false)` |

## 新しい行にも規則を保つ運用のヒント

プルダウンを設定しても、後から追加した新しい行は範囲外だとプルダウンになりません。実運用ではここも自動化しておくと快適です。

### onOpenで開くたびに設定し直す

シンプルなのは、シートを開いたタイミングで入力規則を敷き直す方法です。`onOpen` という特別な関数名にしておくと、スプレッドシートを開くたびに自動で走ります。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function onOpen() {
  // シートを開くたびにプルダウンを敷き直す
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('タスク管理');

  // 最終行を取得し、少し余裕をもたせて適用範囲を決める
  const lastRow = Math.max(sheet.getLastRow() + 50, 100); // 現在の最終行＋50、最低でも100行

  // ステータス列（B列）にプルダウンを設定
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['未着手', '対応中', '完了'], true)
    .setAllowInvalid(false)
    .setHelpText('ステータスを選択してください')
    .build();

  sheet.getRange('B2:B' + lastRow).setDataValidation(rule);
}
```

`getLastRow()` で今のデータの最終行を取り、そこに少し余裕を足して範囲を決めています。こうすれば、行が増えても開くたびに新しい行までプルダウンが行き渡ります。

### 時間主導トリガーで定期的に敷き直す

シートを開かなくても定期的に整えたいなら、時間主導トリガー（一定時間ごとに関数を自動実行する仕組み）を使う手もあります。GASエディタの「トリガー」画面から、たとえば「1時間おきに実行」といった設定を追加できます。

複数人が編集する共有シートで、誰かが行を追加してもいつの間にか規則が整っている、という状態を作れます。ただし実行回数には無料枠の上限があるので、頻度は必要な範囲にとどめておきましょう。開くたびの `onOpen` で足りるなら、まずはそちらで十分です。

## 自分でも作れるようになりたい方へ

ここまで読んで「自分の管理表にもプルダウンを自動で敷きたい」と思った方、GASは看護師の私でも書けたくらいなので、きっと大丈夫です。入力規則の設定は、GASの中でも「効果がすぐ目に見える」タイプの題材なので、最初の一歩にぴったりだと思います。

まずは今回のコードを自分のシートに貼って、シート名と範囲を書き換えて動かしてみてください。動いた瞬間、「コードで表が変わる」楽しさがきっと分かるはずです。もっと体系的に学びたい方向けに、学習の入り口になる情報も紹介しておきます。

<a href="https://h.accesstrade.net/sp/cc?rk=0100knoa00orcn" rel="nofollow" referrerpolicy="no-referrer-when-downgrade">Dive into Code（未経験からエンジニアを目指すプログラミングスクール）</a><img src="https://h.accesstrade.net/sp/rr?rk=0100knoa00orcn" width="1" height="1" border="0" alt="">

## 関連記事（あわせて読みたい）

- [条件付き書式をGASで一括設定する](/blog/gas-sheet-conditional-format/) … プルダウンの値に応じてセルの色を自動で変える方法。ステータス管理と相性抜群です。
- [自動フィルタをGASで操作する](/blog/gas-sheet-filter-auto/) … 「対応中」だけをサッと絞り込むなど、フィルタをコードから操る実務レシピ。
- [入力時刻を自動で記録する](/blog/gas-sheet-timestamp-auto/) … プルダウンで状態を変えたら、その時刻を自動で残す。onEditと組み合わせる定番ワザです。

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

掲載コードは構文とAPI仕様を確認して載せていますが、お使いの環境に合わせて調整してください。
