---
title: "GASで条件に合う行を安全に一括削除する（下から回す鉄則）"
description: "GASで条件に合う行をdeleteRowで一括削除する方法を解説。上から削除すると行がずれる原因と、下から回す鉄則・filterで書き戻す高速版・バックアップや確認ダイアログまで実務コード付きで紹介します。"
pubDate: "2026-07-29T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","delete-rows"]
tagNames: ["GAS","スプレッドシート","行削除"]
readingTime: 8
keywords: ["GAS 行 削除","GAS 条件 行削除","GAS deleteRow ずれる"]
---

凛です。先日、勤務シフトを管理しているスプレッドシートで「もう終わった応援勤務の行だけまとめて消したい」と思い立ちました。ステータス列が「完了」の行を上から順番に`deleteRow`で消していったのですが、実行してみると──なぜか1行おきにポツポツと消え残っている。完了なのに残っている行があり、逆に消えてはいけない「進行中」の行がなぜか巻き添えで消えていました。夜勤明けの頭で「え、バグ？」と5分ほど固まったのを覚えています。原因は単純で、GASの行削除には初心者が必ず一度はハマる落とし穴があったのです。今日はその話をします。

# GASで条件に合う行を安全に一括削除する（下から回す鉄則）

スプレッドシートを自動化していると、「特定の条件に合う行だけをまとめて消したい」場面は本当によく出てきます。ステータスが「完了」の行、金額が0円の行、日付が古い行……。一見かんたんそうなのですが、ここには初心者を確実に転ばせる罠が潜んでいます。この記事では、なぜ行がずれるのかを腹落ちする形で説明し、安全かつ高速に一括削除する方法を、動くコードつきで順番にお伝えします。

## なぜ「上から削除」すると行がずれるのか

結論から言うと、**行を削除すると、その下の行がひとつずつ繰り上がってくる**からです。これが全ての元凶です。

### 繰り上がりが起きる仕組み

たとえば、次のようなデータがあるとします（1行目はヘッダー）。

| 行番号 | 名前 | ステータス |
|:---:|---|---|
| 2 | 佐藤 | 完了 |
| 3 | 鈴木 | 完了 |
| 4 | 田中 | 進行中 |

「ステータスが完了の行を消す」として、上から2行目・3行目を消したいわけです。ところが、2行目（佐藤）を`deleteRow(2)`で消した瞬間、下にいた鈴木と田中が1つずつ繰り上がります。

| 行番号 | 名前 | ステータス |
|:---:|---|---|
| 2 | 鈴木 | 完了 |
| 3 | 田中 | 進行中 |

ループのカウンタは次に「3行目を見る」と進みます。でも3行目には、もう田中（進行中）がいます。**本来消すべきだった鈴木（今は2行目）を飛び越してしまった**のです。これが「1行おきに消え残る」現象の正体です。

### 実際にやってしまいがちなNGコード

初心者がまず書いてしまうのが、次のような「上から回す」コードです。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// ⚠️これはバグります（悪い例）
function deleteCompletedRows_NG() {
  const sheet = SpreadsheetApp.getActiveSheet(); // 今開いているシートを取得
  const lastRow = sheet.getLastRow();            // データがある最終行番号
  const values = sheet.getRange(1, 1, lastRow, 3).getValues(); // 全データを2次元配列で取得

  // 2行目（ヘッダー除く）から最終行まで上から回す
  for (let i = 2; i <= lastRow; i++) {
    const status = values[i - 1][2]; // 配列は0始まりなので i-1、C列(3列目)はインデックス2
    if (status === '完了') {
      sheet.deleteRow(i); // ⚠️ここで下の行が繰り上がり、次のiでズレる
    }
  }
}
```

一見それらしく動きそうですが、`deleteRow(i)`を呼ぶたびに下の行が繰り上がるため、カウンタ`i`とシートの実際の行番号がどんどんズレていきます。さらに`values`は最初に一度読んだきりなので、削除後の繰り上がりが反映されず、判定と実際の行が食い違います。二重に事故ります。

## 正解1：下から回す（deleteRowの鉄則）

いちばんシンプルで確実な解決策が、**ループを下から回す**ことです。最終行から先頭方向へ向かって削除していけば、繰り上がりが起きても「まだ処理していない上の行」には一切影響しません。

### 下から回すとなぜズレないのか

最終行（たとえば4行目の田中）を先に処理し、次に3行目、2行目……と上に向かって進みます。仮に4行目を消しても、繰り上がるのは「4行目より下の行」だけ。でも下にはもう行がありません。上にいる2行目・3行目の行番号は一切動かないので、カウンタとシートが常に一致したままです。だから安全なのです。

### 下から回す基本コード

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// ✅ 下から回す正解パターン
function deleteCompletedRows_FromBottom() {
  const sheet = SpreadsheetApp.getActiveSheet(); // アクティブシート
  const lastRow = sheet.getLastRow();            // 最終行
  const lastCol = sheet.getLastColumn();         // 最終列
  if (lastRow < 2) return;                        // データが無ければ何もしない

  // 全データを一度だけ読み込む（判定に使う）
  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  // 🔑 最終行から2行目（ヘッダーの1つ下）まで、上に向かって回す
  for (let i = lastRow; i >= 2; i--) {
    const row = values[i - 1];   // i行目のデータ（配列は0始まりなので i-1）
    const status = row[2];       // C列（3列目）＝ステータス

    if (status === '完了') {
      sheet.deleteRow(i);        // 下から消すので、残りの i には影響しない
    }
  }
}
```

ポイントは2つです。ひとつは`for (let i = lastRow; i >= 2; i--)`と、**最終行から2行目まで下向きに**回していること。もうひとつは、`>= 2`にすることで**1行目のヘッダーを守っている**ことです。ヘッダーまで消してしまう事故はとても多いので、ここは意識してください。

### 削除条件を関数に切り出す

条件が複雑になってきたら、判定部分を別の関数に切り出すと一気に読みやすくなります。「どの行を消すか」というルールを一箇所に集約できるので、後から条件を変えるのもラクです。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// 「この行は削除対象か？」を判定する専用関数
function shouldDelete_(row) {
  const status = row[2];  // C列：ステータス
  const amount = row[3];  // D列：金額
  const date   = row[4];  // E列：日付（Dateオブジェクト）

  // 例：ステータスが「完了」なら削除対象（AND/ORは後述）
  return status === '完了';
}

function deleteRowsByCondition() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return;

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  for (let i = lastRow; i >= 2; i--) {
    if (shouldDelete_(values[i - 1])) {  // 判定を関数に任せる
      sheet.deleteRow(i);
    }
  }
}
```

判定ロジックが`shouldDelete_`にまとまっているので、本体のループはとてもスッキリしました。関数名の末尾にアンダースコアを付けているのは、GASで「スクリプトエディタの実行メニューに出したくない補助関数」に付ける慣習です。

## 複数条件（AND / OR）で消したいとき

実務では「完了、かつ金額が0円」「日付が古い、または金額が0円」のように、条件を組み合わせたいことがほとんどです。切り出した`shouldDelete_`の中身を書き換えるだけで対応できます。

### AND（すべて満たしたら削除）

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// AND：ステータスが「完了」 かつ 金額が0 の行を削除
function shouldDelete_AND(row) {
  const status = row[2]; // C列：ステータス
  const amount = row[3]; // D列：金額
  return status === '完了' && amount === 0; // 両方満たすときだけ true
}
```

### OR（どれか満たしたら削除）＋古い日付の判定

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// OR：金額が0 または 30日より前の日付 の行を削除
function shouldDelete_OR(row) {
  const amount = row[3]; // D列：金額
  const date   = row[4]; // E列：日付（Dateオブジェクト）

  // 「今日から30日前」の基準日を作る
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 30); // 30日前にずらす

  const isOld = (date instanceof Date) && (date < threshold); // 日付が基準より古いか
  return amount === 0 || isOld;  // どちらか一方でも満たせば true
}
```

日付を扱うときは、セルが本当に日付型かどうか（`date instanceof Date`）を先に確認しておくと、空セルや文字列が混ざっていてもエラーになりにくくなります。細かいですが、実データはだいたい汚れているので効いてきます。

## 正解2：大量データはfilterで書き戻すのが速い

下から回す方法は正確ですが、**削除する行がたくさんあると急に遅くなります**。理由は、`deleteRow`が1行ごとにスプレッドシートへ命令を送る（＝通信が発生する）からです。100行消せば100回、1,000行消せば1,000回の往復が起きます。GASのスクリプトには**1回あたり6分の実行時間制限**があるので、行数が多いとこの制限に引っかかって途中で止まってしまいます。

### 「残す行だけ集めて書き戻す」という発想

そこで発想を変えます。「消す」のではなく、**「残す行だけを集めた新しい表を作り、シートを一度まっさらにして貼り直す」**のです。読み込みと書き込みが基本1回ずつで済むので、桁違いに速くなります。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// ✅ 大量データ向け：filterで残す行だけにして書き戻す
function deleteRowsByFilter() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return;

  // 1回だけ全データを読み込む
  const range = sheet.getRange(1, 1, lastRow, lastCol);
  const values = range.getValues();

  const header = values[0];        // 1行目＝ヘッダーは別に取っておく
  const body = values.slice(1);    // 2行目以降がデータ本体

  // 🔑 削除対象「以外」＝残す行だけを集める
  const kept = body.filter(function(row) {
    return !shouldDelete_(row);    // shouldDelete_ が false の行だけ残す
  });

  // 中身を全部消してから、残す行だけを貼り直す
  range.clearContents();           // 既存の値を一旦クリア（罫線や書式は残る）

  const output = [header].concat(kept); // ヘッダー＋残す行
  sheet.getRange(1, 1, output.length, lastCol).setValues(output); // まとめて書き込み
}
```

`filter`で「消す条件に**当てはまらない**行（`!shouldDelete_`）」だけを残し、`clearContents`で一度まっさらにしてから`setValues`で一気に書き戻しています。ループの中でシートを触らないのがコツで、これだけで体感速度がまったく変わります。

### deleteRowループ vs filter書き戻しの比較

どちらを使うべきか、性質を表にまとめます。

| 観点 | deleteRowを下から回す | filterで書き戻す |
|---|---|---|
| 速度（少量：数十行） | 十分速い | 速い |
| 速度（大量：数百〜数千行） | 遅い（6分制限に注意） | かなり速い |
| コードの分かりやすさ | 直感的 | やや発想の転換が必要 |
| 罫線・書式への影響 | 行ごと消えるので詰まる | `clearContents`なら書式は残る |
| 途中で条件を確認しながら消す | 向いている | 一括向き |
| おすすめ場面 | 数十行の日常処理 | 大量データの定期バッチ |

ざっくり言えば、**数十行なら下から回す・数百行を超えるならfilterで書き戻す**、と覚えておけば実務で困りません。

## 消す前に必ずやる安全策3つ

行削除は取り返しがつかない操作です。特にGASは`Ctrl+Z`が効かないことも多いので、**消す前の一手間**が本当に大事です。私が痛い目を見て以来、必ず入れているものを3つ紹介します。

### 安全策1：先に対象件数をログで確認する

いきなり消さず、まず「何行消える予定か」を`Logger.log`で表示します。想定より多ければ、条件がおかしいサインです。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// 実際には消さず、対象件数だけ数える（ドライラン）
function countTargetRows() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return;

  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues(); // 本体だけ
  const count = values.filter(shouldDelete_).length; // 対象行数を数えるだけ

  Logger.log('削除対象は ' + count + ' 行です'); // 実行ログで確認
}
```

### 安全策2：バックアップシートに退避してから消す

消す前に、対象データを別シートへ丸ごとコピーしておけば、間違えても復元できます。安心料としては激安です。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// 現在のシートをまるごと複製してバックアップにする
function backupSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const source = ss.getActiveSheet();
  const stamp = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss'); // 日時の文字列
  const copy = source.copyTo(ss);                     // シートを複製
  copy.setName(source.getName() + '_backup_' + stamp); // 分かりやすい名前を付ける
  return copy.getName();
}
```

### 安全策3：確認ダイアログを挟む

手動で実行するツールなら、実行直前に「本当に消していい？」と一度たずねるダイアログを出します。誤クリックによる事故を防げます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// 確認ダイアログ→OKなら削除、という流れ
function deleteWithConfirm() {
  const ui = SpreadsheetApp.getUi();          // スプレッドシートのUI
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return;

  // まず対象件数を数える
  const body = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const count = body.filter(shouldDelete_).length;

  // 確認ダイアログを表示（OK / キャンセル）
  const response = ui.alert(
    '確認',
    count + ' 行を削除します。よろしいですか？',
    ui.ButtonSet.OK_CANCEL
  );

  if (response !== ui.Button.OK) {  // OK以外（キャンセル）なら中断
    ui.alert('キャンセルしました');
    return;
  }

  backupSheet_();          // 念のためバックアップ
  deleteRowsByFilter();    // ここで実際に削除
  ui.alert('完了しました（' + count + ' 行を削除）');
}
```

`ui.alert`は`OK_CANCEL`を指定すると、OKとキャンセルの2ボタンを出せます。戻り値が`ui.Button.OK`かどうかで分岐すればOKです。ここまで用意しておけば、まず致命的な事故は起きません。

## よくある失敗と回避策

最後に、私や周りがつまずいた「あるある」を回避策とセットでまとめます。

### 失敗1：ヘッダー行まで消してしまう

ループの下限を`i >= 1`にしたり、filterでヘッダーを本体に混ぜてしまうと起こります。**下から回すときは`i >= 2`、filterでは`values.slice(1)`で本体だけ**を対象にし、ヘッダーは別に取っておくのが鉄則です。

### 失敗2：getValuesを消すたびに読み直して激遅になる

ループの中で毎回`getValues`や`deleteRow`後の再取得をやると、通信が爆発的に増えて遅くなります。**判定用のデータは最初に一度だけ読む**。これだけで速度がまったく違います。

### 失敗3：全部消えて空になった

条件式のミス（`===`のつもりが常にtrueになっているなど）で全行が対象になるパターンです。だからこそ、前述の**安全策1（件数のログ確認）**が効きます。いきなり本番で回さず、まず数えるクセをつけてください。

### 失敗4：6分の実行時間制限で途中停止

`deleteRow`を数百回以上ループすると、6分制限に引っかかって処理が途中で止まり、データが中途半端な状態になることがあります。行数が多いと感じたら、迷わず**filterで書き戻す方式**に切り替えましょう。

## 自分でも作れるようになりたい方へ

行削除ひとつとっても、「なぜズレるのか」を理解して書けるようになると、GASはぐっと怖くなくなります。私も最初はコピペばかりでしたが、今回のような「仕組み」を一つずつ腹落ちさせていくうちに、自分のやりたい自動化を自分で書けるようになりました。夜勤明けの細切れ時間でも、少しずつで大丈夫です。あなたのペースで、一緒に前に進みましょう。

<a href="https://h.accesstrade.net/sp/cc?rk=0100knoa00orcn" rel="nofollow" referrerpolicy="no-referrer-when-downgrade">Dive into Code（未経験からエンジニアを目指すプログラミングスクール）</a><img src="https://h.accesstrade.net/sp/rr?rk=0100knoa00orcn" width="1" height="1" border="0" alt="">

## 関連記事（あわせて読みたい）

- [重複した行をGASで削除する](/blog/gas-sheet-dedupe/)：同じ値がダブっている行をまとめて1件に整理する方法をまとめています。
- [GASの配列操作 基本まとめ](/blog/gas-array-basic/)：今回使った`filter`や2次元配列の扱いを、基礎からじっくり解説しています。
- [スプレッドシートの自動フィルタをGASで操作する](/blog/gas-sheet-filter-auto/)：削除せずに「条件で絞って表示する」だけならフィルタが便利です。

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

※掲載コードは構文とAPI仕様を確認して載せていますが、お使いの環境に合わせて調整してください。
