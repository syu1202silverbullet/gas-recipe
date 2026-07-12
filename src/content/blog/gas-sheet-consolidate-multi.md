---
title: "GASで複数シートを1枚に自動集約する（月次データ結合の定番）"
description: "スプレッドシートの店舗別・月別など複数シートを、GASのgetSheets/getValues/setValuesで1枚に自動集約する方法を、動くコードと失敗回避策つきで初心者向けに丁寧に解説します。"
pubDate: "2026-07-20T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","consolidate"]
tagNames: ["GAS","スプレッドシート","データ集約"]
readingTime: 9
keywords: ["GAS シート 集約","GAS 複数シート 結合","GAS getSheets"]
---

凛です。夜勤明けの眠たい頭で、家計簿がわりにつけている「1月」「2月」「3月」…という月ごとのシートを、ぼんやり眺めていた朝のことでした。「これ全部まとめて年間で見たいなあ」と思って、いつもの手作業でコピペを始めたんです。1月のシートを開いて、範囲を選んで、コピーして、まとめシートに貼って、また2月を開いて…。3枚目くらいで肩が凝ってきて、5枚目で「もう無理」ってなりました。しかも途中で1行ずれていたことに後から気づいて、全部やり直し。あの脱力感、忘れられません。

そのとき「これこそGASの出番じゃない？」と思い立って、休憩時間にコードを組んでみたら、ボタンひとつで全シートが1枚にまとまるようになりました。今では月末にトリガーで勝手に集約してくれるので、私は何もしていません。今回はそのやり方を、当時の私みたいに「コピペで消耗している人」に向けて、丁寧に共有します。

# GASで複数シートを1枚に自動集約する方法

同じ書式のシートが何枚もあって、それを1枚にまとめたい――これは本当によくある悩みです。店舗別の売上、月別の記録、担当者ごとの入力シート。フォーマットは同じなのに、シートが分かれているせいで「全体を見る」ことができない。

GASなら、`getSheets()` で全シートを取ってきて、ループで順番に中身を読み、まとめシートに一気に書き込むだけ。手作業のコピペと違って、シートが10枚でも50枚でも同じコードで動きますし、行がずれる心配もありません。この記事では、いちばんシンプルな集約から、「どのシート由来か分かるようにする」「特定のシートだけまとめる」といった実務で役立つ応用まで、順番に組み立てていきます。

## まずは全シートを1枚に集約する基本形

最初に、いちばん素朴なパターンから始めましょう。「まとめ」という集約先シートを1枚用意しておいて、それ以外のシートのデータを全部そこに書き込む、というものです。

### getSheets()で全シートを取ってループする

`SpreadsheetApp.getActiveSpreadsheet().getSheets()` を使うと、そのスプレッドシートに含まれる全シートが配列で返ってきます。あとはこれをループで回すだけです。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function consolidateBasic() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); // 今開いているスプレッドシートを取得
  const targetName = 'まとめ';                       // 集約先シートの名前
  const target = ss.getSheetByName(targetName);      // 集約先シートを名前で取得

  const allSheets = ss.getSheets();                  // 全シートを配列で取得
  const result = [];                                 // 集めたデータを入れる2次元配列

  for (const sheet of allSheets) {                   // 1枚ずつ順番に処理
    if (sheet.getName() === targetName) continue;    // 集約先シート自身は対象外（無限ループ・二重集計を防ぐ）

    const values = sheet.getDataRange().getValues(); // そのシートの入力範囲を丸ごと2次元配列で取得
    if (values.length <= 1) continue;                // ヘッダー行しかない（＝データが無い）ならスキップ

    const rows = values.slice(1);                    // 先頭のヘッダー行を除いて、データ行だけにする
    for (const row of rows) {                         // データ行を1行ずつ
      result.push(row);                              // 集約用の配列に足していく
    }
  }

  // ここで target に書き込む（次のH3で解説）
  Logger.log('集めた行数: ' + result.length);        // 動作確認用のログ
}
```

ポイントは3つあります。ひとつめは、集約先シート（ここでは「まとめ」）自身を必ずループの対象から外すこと。これを忘れると、まとめシートのデータまで自分自身に足してしまい、実行のたびにデータが二重・三重に増えていきます。ふたつめは、`getDataRange()` を使うことで「データが入っている範囲だけ」を取れること。空っぽの列や行まで読み込まずに済みます。みっつめが、`values.length <= 1` のチェックで、ヘッダーしかない空シートをスキップしていることです。

### getDataRange().getValues()でシートの中身を一括取得する

`getDataRange()` は、そのシートで実際にデータが入っている一番外側の四角い範囲を返してくれます。それに `.getValues()` を付けると、その範囲の中身が2次元配列（行の配列、その中に各セルの値）として返ってきます。

たとえば、こういうシートがあったとします。

| 日付 | 商品 | 金額 |
|---|---|---|
| 2026/07/01 | りんご | 300 |
| 2026/07/02 | みかん | 200 |

これを `getValues()` すると、`[['日付','商品','金額'], ['2026/07/01','りんご',300], ['2026/07/02','みかん',200]]` という形で返ってきます。先頭がヘッダー行なので、`slice(1)` で切り落として、データ行だけを集めていくわけです。

大事なのは、1行ずつ `getRange` して読むのではなく、シート1枚につき `getValues()` を1回だけ呼ぶこと。スプレッドシートへのアクセス（読み書き）は1回1回がとても遅いので、まとめて取得するのがGAS高速化の基本中の基本です。

## 集めたデータをまとめシートに一括書き込みする

データを集めたら、次はまとめシートへの書き込みです。ここでも「一括で書く」のが鉄則です。

### clearContentsでリセットしてから書く

集約は繰り返し実行するものなので、実行のたびに前回の内容が残っていると、どんどん積み重なってしまいます。そこで、書き込む前にまとめシートの中身を一度まっさらにして、ヘッダーを付け直してから書き込みます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function consolidateAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); // スプレッドシートを取得
  const targetName = 'まとめ';                       // 集約先シート名
  const target = ss.getSheetByName(targetName);      // 集約先シートを取得

  const header = ['日付', '商品', '金額'];           // 集約シートに付けるヘッダー（元シートと揃える）
  const allSheets = ss.getSheets();                  // 全シートを取得
  const result = [];                                 // データを集める2次元配列

  for (const sheet of allSheets) {                   // シートを1枚ずつ処理
    if (sheet.getName() === targetName) continue;    // 集約先自身は除外
    const values = sheet.getDataRange().getValues(); // シートの中身を一括取得
    if (values.length <= 1) continue;                // 空シートはスキップ
    const rows = values.slice(1);                    // ヘッダーを除いてデータ行だけ
    result.push(...rows);                            // スプレッド構文でまとめて追加
  }

  target.clearContents();                            // まとめシートの中身を全消去（書式は残す）
  target.getRange(1, 1, 1, header.length)            // 1行目・1列目からヘッダー幅ぶんの範囲を指定
        .setValues([header]);                        // ヘッダーを書き込む（2次元配列で渡す）

  if (result.length > 0) {                           // データが1行以上あるときだけ書き込む
    target.getRange(2, 1, result.length, header.length) // 2行目から、集めた行数ぶんの範囲
          .setValues(result);                        // データを一括で書き込む（超重要：これ1回で全部書ける）
  }

  Logger.log('集約完了: ' + result.length + '行');   // ログで結果を確認
}
```

`clearContents()` は中身（値）だけを消し、背景色や罫線などの書式は残してくれます。まとめシートを色付けして見やすくしている場合はこちらが便利です。もし書式ごと全部リセットしたいなら `clear()` を使いますが、多くの場合は `clearContents()` で十分です。

### appendRowではなくsetValuesを使う理由

初心者向けの記事だと、1行ずつ `appendRow()` で足していく方法をよく見かけます。書き方はシンプルなのですが、これは行数が増えると一気に遅くなります。理由は、`appendRow()` が「1行書くたびにスプレッドシートと通信する」からです。

対して `setValues()` は、2次元配列を渡して「範囲まるごと1回で書き込む」ので、100行だろうと1000行だろうと通信は1回きり。私が最初 `appendRow()` で書いたときは500行の集約に何十秒もかかっていましたが、`setValues()` に直したら一瞬で終わりました。

| 書き方 | 通信回数の目安 | 速さ |
|---|---|---|
| appendRow を行ごとに呼ぶ | 行数ぶん（例：500回） | とても遅い |
| setValues で一括 | 1回 | とても速い |

「読むときは getValues でまとめて、書くときは setValues でまとめて」。これがGASでスプレッドシートを速く動かす合言葉だと思ってください。

## どのシートから来たデータか分かるようにする

全部をひとつにまとめると、便利な反面「この行、もともとどのシートにあったんだっけ？」が分からなくなります。そこで、各行の先頭に「シート名」の列を足す応用を紹介します。

### 各行の先頭にシート名の列を足す

やることは単純で、データ行を集めるときに、行の先頭にシート名を差し込むだけです。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function consolidateWithSource() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); // スプレッドシートを取得
  const targetName = 'まとめ';                       // 集約先シート名
  const target = ss.getSheetByName(targetName);      // 集約先シートを取得

  const header = ['シート名', '日付', '商品', '金額']; // 先頭に「シート名」列を追加したヘッダー
  const allSheets = ss.getSheets();                  // 全シート取得
  const result = [];                                 // 集約用の配列

  for (const sheet of allSheets) {                   // シートを1枚ずつ
    const name = sheet.getName();                    // 現在のシート名を変数に取っておく
    if (name === targetName) continue;               // 集約先は除外
    const values = sheet.getDataRange().getValues();  // 中身を一括取得
    if (values.length <= 1) continue;                // 空シートはスキップ
    const rows = values.slice(1);                    // ヘッダーを除く
    for (const row of rows) {                          // データ行を1行ずつ
      result.push([name, ...row]);                    // 行の先頭にシート名を足して追加
    }
  }

  target.clearContents();                            // まとめシートをリセット
  target.getRange(1, 1, 1, header.length).setValues([header]); // ヘッダーを書き込み
  if (result.length > 0) {                           // データがあれば
    target.getRange(2, 1, result.length, header.length).setValues(result); // 一括書き込み
  }
}
```

`[name, ...row]` の部分がキモです。`...row` はスプレッド構文といって、`row` の中身（各セルの値）をそのまま展開してくれます。その前に `name`（シート名）を置くことで、「シート名 + 元の1行分」という新しい行ができあがります。これで、まとめシートを見れば「あ、この売上は7月シートのものだ」と一目で分かるようになります。

### 集計や絞り込みに効くひと工夫

シート名の列があると、後からの分析がぐっと楽になります。たとえばまとめシートに対してスプレッドシートの関数で `=SUMIF(A:A,"7月",D:D)` と書けば、7月シート由来の金額だけ合計できます。GASでゼロから集計ロジックを書かなくても、集約さえしておけば標準関数で好きに切り分けられるわけです。

私は家計のまとめシートでこれをやっていて、月ごとの合計をピボットテーブルでサッと見られるようにしています。「集約はGAS、集計は関数」と役割を分けると、コードがシンプルに保てておすすめです。

## 特定のシートだけを対象に集約する

「まとめ」以外にも、集約したくないメモ用シートや設定シートがあることはよくあります。逆に「月別シートだけ集めたい」というケースもあります。ここでは対象シートを絞り込む方法を見ていきます。

### 除外リストや名前ルールで対象を選ぶ

いちばん分かりやすいのは、除外したいシート名のリストを作っておく方法です。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function consolidateSelected() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();      // スプレッドシートを取得
  const targetName = 'まとめ';                            // 集約先シート名
  const target = ss.getSheetByName(targetName);           // 集約先シート
  const excludeNames = [targetName, '設定', 'メモ'];      // 集約対象から外したいシート名のリスト

  const header = ['日付', '商品', '金額'];                // ヘッダー
  const result = [];                                      // 集約用配列

  for (const sheet of ss.getSheets()) {                   // 全シートをループ
    const name = sheet.getName();                         // シート名を取得
    if (excludeNames.includes(name)) continue;            // 除外リストに含まれていたらスキップ
    const values = sheet.getDataRange().getValues();      // 中身を一括取得
    if (values.length <= 1) continue;                     // 空シートはスキップ
    result.push(...values.slice(1));                      // ヘッダーを除いて追加
  }

  target.clearContents();                                 // リセット
  target.getRange(1, 1, 1, header.length).setValues([header]); // ヘッダー
  if (result.length > 0) {                                // データがあれば
    target.getRange(2, 1, result.length, header.length).setValues(result); // 一括書き込み
  }
}
```

`excludeNames.includes(name)` で、除外リストに入っている名前かどうかを判定しています。設定シートやメモ帳がわりのシートが増えても、リストに名前を足すだけで対応できます。

### 正規表現で「数字で始まるシートだけ」拾う

シート名にルールがあるなら、正規表現で絞り込むともっとスマートです。たとえば「1月」「2月」…のように数字で始まるシートだけを集めたいなら、こうします。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function consolidateByPattern() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();      // スプレッドシートを取得
  const targetName = 'まとめ';                            // 集約先シート名
  const target = ss.getSheetByName(targetName);           // 集約先シート
  const pattern = /^\d/;                                  // 「先頭が数字」にマッチする正規表現

  const header = ['日付', '商品', '金額'];                // ヘッダー
  const result = [];                                      // 集約用配列

  for (const sheet of ss.getSheets()) {                   // 全シートをループ
    const name = sheet.getName();                         // シート名を取得
    if (name === targetName) continue;                    // 集約先は除外
    if (!pattern.test(name)) continue;                    // 名前が数字で始まらなければスキップ
    const values = sheet.getDataRange().getValues();      // 中身を一括取得
    if (values.length <= 1) continue;                     // 空シートはスキップ
    result.push(...values.slice(1));                      // ヘッダーを除いて追加
  }

  target.clearContents();                                 // リセット
  target.getRange(1, 1, 1, header.length).setValues([header]); // ヘッダー
  if (result.length > 0) {                                // データがあれば
    target.getRange(2, 1, result.length, header.length).setValues(result); // 一括書き込み
  }
}
```

`/^\d/` は「文字列の先頭（`^`）が数字（`\d`）」という意味の正規表現です。`pattern.test(name)` が `true` のシートだけを対象にしています。「店舗_」で始まるものだけ集めたいなら `/^店舗_/` にする、といった具合に、名前のルールに合わせて自由に変えられます。

## パフォーマンスと6分の実行制限に気をつける

シートやデータが少ないうちは気になりませんが、量が増えると速度や実行時間の壁にぶつかります。ここは最初から意識しておくと安心です。

### getRangeをループの中で繰り返さない

いちばんやりがちで、いちばん効くのがこれです。読み書きの「回数」を減らすこと。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
// ❌ 悪い例：ループの中で1セルずつ読んでいる（激遅）
function slowExample(sheet) {
  const lastRow = sheet.getLastRow();                 // 最終行を取得
  const result = [];
  for (let r = 2; r <= lastRow; r++) {                // 1行ずつループ
    const v = sheet.getRange(r, 1).getValue();        // 毎回スプレッドシートと通信（遅い原因）
    result.push(v);
  }
  return result;
}

// ⭕ 良い例：一括で読んでからメモリ上で処理する（速い）
function fastExample(sheet) {
  const values = sheet.getDataRange().getValues();    // 1回だけ通信してまとめて取得
  const result = values.slice(1).map(row => row[0]);  // あとはメモリ上で加工（通信ゼロ）
  return result;
}
```

悪い例は行数ぶんだけ通信が発生します。良い例は通信1回で全部読んで、残りはメモリ上の配列操作（`map` や `slice`）で処理しています。基本は「読むのは一括、書くのは一括、間の加工はメモリ上で」。これを守るだけで体感速度がまるで違います。

### 6分の壁とデータ分割のヒント

GASのスクリプト実行には時間制限があり、一般的なアカウントでは1回あたり最長6分（Workspaceの一部プランでは長め）です。集めるデータが膨大でこの時間を超えそうなときは、処理を分割します。

考え方としては、「一度に全シートを処理しない」こと。たとえばシートを何枚か処理したら、次にどこまで進んだかを `PropertiesService` に記録しておき、続きは次回の実行に回す、という進捗管理の方式が定番です。あるいは、まとめシートに `clearContents` してから書き直すのではなく、`appendRow` ならぬ「途中まで書いた続きの行から setValues する」形にして、複数回に分けて追記していく手もあります。

とはいえ、月次で数百〜数千行くらいの集約なら6分に触れることはまずありません。まずはシンプルに全体を一括処理して、本当に時間切れになったときに分割を検討する、で十分です。

## 失敗しやすいポイントと回避策

私が実際にハマった落とし穴を、そのまま共有します。同じところで悩まずに済むと思います。

### 集約先シートを除外し忘れて二重集計になる

最初にやらかしたのがこれでした。まとめシートを除外し忘れたまま実行したら、実行のたびに行数が倍々に増えていったんです。まとめシート自身のデータを、まとめシートに足していたわけですね。

対策は、この記事のコードのように必ず `if (sheet.getName() === targetName) continue;` を入れること。加えて、書き込み前に `clearContents()` でリセットしておけば、万一二重に集めても前回分は残らないので安心です。

### 空シートや行数不足でエラーになる

`getRange(2, 1, result.length, header.length)` は、`result.length` が0だとエラーになります。集めたデータが1行も無いのに範囲を作ろうとするからです。

対策は、書き込み前に `if (result.length > 0)` でガードすること。全シートが空だった、除外設定が厳しすぎて対象が0枚だった、というときでもエラーで止まりません。各シートを読むときの `if (values.length <= 1) continue;` とセットで、空データへの備えは二重にしておくと堅牢です。

### シートごとに列数が違ってガタガタになる

`setValues()` に渡す2次元配列は、全行の列数がそろっている必要があります。シートによって列の数が違うと、書き込み時にエラーになったり、意図しない場所にデータが入ったりします。

対策は、集約するシートのフォーマットをそろえておくこと。もしどうしても列数がまちまちなら、行を追加するときに不足ぶんを空文字で埋める処理（たとえば `while (row.length < header.length) row.push('');`）を入れて、列数を統一してから `result` に足すと安全です。

## 月末に自動で集約する（トリガー運用）

最後に、いちばん楽な使い方です。ここまでのコードは手動で実行していましたが、時間主導トリガーを設定すれば、月末に勝手に集約してくれるようになります。

### 時間主導トリガーの設定手順

GASエディタの左メニューにある時計マーク（トリガー）から設定できます。

1. GASエディタ左側の時計アイコン「トリガー」を開く
2. 右下の「トリガーを追加」をクリック
3. 実行する関数に `consolidateWithSource`（集約したい関数）を選ぶ
4. イベントのソースを「時間主導型」にする
5. トリガーのタイプを「月ベースのタイマー」にして、実行する日と時刻を選ぶ

これで、指定した日時になると自動で集約が走ります。私は毎月末の深夜に走らせていて、月初にスプレッドシートを開くともう年間のまとめが最新になっている、という状態にしています。夜勤で家にいない日でも勝手にやってくれるのが本当にありがたいです。

### トリガーをコードから登録する方法

トリガーはコードで作ることもできます。設定を配りたいときや、手作業のミスをなくしたいときに便利です。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）
function createMonthlyTrigger() {
  ScriptApp.newTrigger('consolidateWithSource')  // 実行したい関数名を指定
    .timeBased()                                 // 時間主導トリガーにする
    .onMonthDay(28)                              // 毎月28日に実行（月末近くを指定）
    .atHour(23)                                  // 23時台に実行
    .create();                                   // トリガーを作成
  Logger.log('月次トリガーを登録しました');       // 確認ログ
}
```

`onMonthDay(28)` で「毎月28日」、`atHour(23)` で「23時台」を指定しています。月末ぴったりは月によって日数が違うので、28〜30日あたりを狙うのが無難です。この関数を一度だけ手動で実行すれば、あとは毎月自動で集約が回ります。

なお、同じ関数のトリガーを何度も作ると重複してしまうので、作り直すときは既存トリガーを一度削除してから登録するのがおすすめです。

## 自分でも作れるようになりたい方へ

ここまでお読みいただき、ありがとうございました。複数シートの集約は、GASを学び始めた人が「わっ、便利！」と実感しやすい、いちばん最初の成功体験にぴったりのテーマだと思います。私自身、これが動いた瞬間に「もう手作業のコピペには戻れない」と感じました。

最初はコードをそのまま貼り付けて動かすだけで大丈夫です。動くと楽しくなって、「じゃあ次はこうしたい」が自然に出てきます。その積み重ねで、気づけば自分の手作業がどんどん自動化されていきます。看護師でコードなんて縁遠かった私にもできたので、あなたにも必ずできます。まずは小さな一歩から、一緒に始めてみませんか。

<a href="https://h.accesstrade.net/sp/cc?rk=0100knoa00orcn" rel="nofollow" referrerpolicy="no-referrer-when-downgrade">Dive into Code（未経験からエンジニアを目指すプログラミングスクール）</a><img src="https://h.accesstrade.net/sp/rr?rk=0100knoa00orcn" width="1" height="1" border="0" alt="">

## 関連記事（あわせて読みたい）

- [GASでCSVファイルを取り込んでスプレッドシートに書き込む方法](/blog/gas-sheet-import-csv/)：外部のCSVデータをGASで読み込んでシートに反映する基本を解説しています。集約と組み合わせると外部データの一元管理ができます。
- [GASの配列操作の基本（getValues後の2次元配列を自在に扱う）](/blog/gas-array-basic/)：この記事で何度も出てきた2次元配列の扱い方を、mapやsliceを中心にじっくり解説しています。
- [GASでスプレッドシートの重複行を削除する方法](/blog/gas-sheet-dedupe/)：集約したあとに出てくる「同じ行がダブっている」問題を、GASで自動的に解消する方法をまとめました。

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

掲載コードは構文とAPI仕様を確認して載せていますが、お使いの環境に合わせて調整してください。
