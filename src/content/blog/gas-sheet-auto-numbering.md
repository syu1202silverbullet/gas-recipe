---
title: "GASでスプレッドシートに連番・採番を自動付与する（欠番・重複対策）"
description: "GASで連番・採番を自動付与する方法を初心者向けに解説。onEditで新規行だけにIDを振り、ROW関数のズレや重複を防止。年度プレフィックスやゼロ埋め、LockServiceによる同時編集対策まで丁寧に紹介します。"
pubDate: "2026-08-12T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","numbering"]
tagNames: ["GAS","スプレッドシート","採番"]
readingTime: 8
keywords: ["GAS 連番 自動","GAS 採番","GAS ID 自動付与"]
---

凛です。

先日、副業でお手伝いしているお店の「注文管理シート」を作っていたときのことです。行を追加するたびに、A列に伝票番号を手で「0001」「0002」と打っていたのですが、途中でキャンセルが出て1行削除したら、あとで見返したときに「あれ？さっきの0005の注文、どこいった？」と大混乱。番号がバラバラで、どの行がどの注文なのか分からなくなってしまいました。

最初は関数の `=ROW()-1` で番号を振っていたのですが、これが落とし穴でした。行を消すと番号が繰り上がってしまい、「一度お客さまに伝えた伝票番号があとから勝手に変わる」という、伝票としては致命的な状態に。夜勤明けの眠い頭で「これじゃダメだ…」と気づいたときの脱力感といったらありませんでした。

そこで、GAS（Google Apps Script）を使って「一度振った番号は絶対に変わらない、固定の連番」を自動で付与する仕組みを作りました。この記事では、そのときに作ったコードと、途中でハマった失敗を全部お見せします。同じように「行を消すと番号がズレる」で困っている方の助けになればうれしいです。

# GASでスプレッドシートに連番・採番を自動付与する

伝票番号や会員IDのように「一度決めたら変わってはいけない番号」を、行の追加に合わせて自動で振っていきます。ポイントは「関数ではなくGASで固定値として書き込む」こと。この一点を押さえるだけで、欠番・重複・番号ズレの悩みから解放されます。

## なぜ関数の `=ROW()` ではダメなのか

まずは、多くの人が最初にやってしまう「関数で連番」がなぜ伝票番号に向かないのかを整理します。ここを理解しておくと、あとのGASコードの意味がすっと入ってきます。

### ROW関数は「今の行位置」を返すだけ

`=ROW()-1` という式は、「そのセルが今ある行番号から1を引いた数」を返します。1行目がヘッダーで、2行目のデータなら `2-1=1`、3行目なら `3-1=2`…という具合です。一見きれいに連番が振られているように見えます。

ところが、この式が返すのは「固定された番号」ではなく「今その行が何行目にいるか」という位置情報です。つまり番号そのものを保存しているわけではなく、毎回その場で計算し直しているだけなのです。

### 行を削除すると番号が繰り上がる

たとえば5行分のデータがあって、3番目の行を削除したとします。すると4番目・5番目だった行が繰り上がって、番号が `1,2,3,4` に詰め直されます。

| 状態 | A列（=ROW()-1） | B列（注文者） |
|---|---|---|
| 削除前 | 1 | 田中さん |
| 削除前 | 2 | 佐藤さん |
| 削除前 | 3 | 鈴木さん（← これを削除） |
| 削除前 | 4 | 高橋さん |
| 削除後 | 3 | 高橋さん（← 番号が4から3に変わった！） |

このとおり、高橋さんの伝票番号が「4」から「3」に勝手に変わってしまいました。すでに「あなたの伝票は4番です」とお伝えしていたら、もう番号が食い違ってしまいます。これが関数方式の致命的な弱点です。

### 解決策は「固定値としてGASで書き込む」

答えはシンプルで、番号を「計算し続ける式」ではなく「一度書いたら動かない固定の数字」として保存することです。GASで新しい行にだけ番号を書き込み、書き込んだあとは普通の数値としてセルに残す。こうすれば行を消しても、すでに振られた番号は絶対に変わりません。次の章から、その具体的なコードを作っていきます。

## 基本：onEditで新規行だけに採番する

ここからが本題です。行にデータが入力されたら、その行のID列が空のときだけ番号を振る、という仕組みを `onEdit` トリガーで作ります。

### onEditトリガーの基本形

`onEdit(e)` は、スプレッドシートが編集されたときに自動で動く特別な関数です。引数 `e` の中に「どこがどう編集されたか」の情報が入っています。まずは一番シンプルな形から見ていきましょう。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// シートが編集されると自動で呼ばれる特別な関数
function onEdit(e) {
  const sheet = e.range.getSheet();           // 編集されたシートを取得
  const editedRow = e.range.getRow();         // 編集された行番号を取得
  const editedCol = e.range.getColumn();      // 編集された列番号を取得

  // 対象シート名・監視する列を決めておく（自分の環境に合わせて変更）
  const TARGET_SHEET = '注文管理';            // このシートだけで動かす
  const ID_COL = 1;                           // A列（1列目）にIDを振る
  const WATCH_COL = 2;                        // B列に入力されたら採番する
  const HEADER_ROWS = 1;                      // 1行目はヘッダーなので除外

  // 対象シート以外、またはヘッダー行なら何もしない
  if (sheet.getName() !== TARGET_SHEET) return;
  if (editedRow <= HEADER_ROWS) return;

  // 監視列（B列）以外が編集されたときは無視する
  if (editedCol !== WATCH_COL) return;

  // すでにID列に値が入っている行には振り直さない（重要）
  const idCell = sheet.getRange(editedRow, ID_COL);
  if (idCell.getValue() !== '') return;

  // ここで採番して書き込む（次のコードで中身を作ります）
}
```

ポイントは、**「監視する列（B列）に入力されたとき」だけ**動かしている点と、**「ID列がまだ空のとき」だけ**採番している点です。ID列に値がある行は絶対に触らないので、一度振った番号が上書きされることがありません。

### 既存の最大番号を求めて +1 する

新しい番号は「今シートにある一番大きい番号 + 1」で決めます。行番号には一切依存しないので、途中で行を消しても番号がズレません。ID列を全部読み込んで、その中の最大値を探す関数を作ります。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// 指定シートのID列から「今ある最大の番号」を求める
function getMaxId(sheet, idCol, headerRows) {
  const lastRow = sheet.getLastRow();         // データが入っている最終行

  // ヘッダーしか無い（データが1件も無い）ときは 0 を返す
  if (lastRow <= headerRows) return 0;

  // ID列のデータ部分だけをまとめて読み込む（2次元配列で返る）
  const values = sheet
    .getRange(headerRows + 1, idCol, lastRow - headerRows, 1)
    .getValues();

  let max = 0;                                // 最大値を入れる変数
  values.forEach(function (row) {
    // '2026-0007' のような文字列でも数字部分だけ取り出す
    const raw = String(row[0]);               // セルの値を文字列にする
    const num = parseInt(raw.replace(/\D/g, ''), 10); // 数字以外を消して整数化
    if (!isNaN(num) && num > max) {           // 数値として有効で、今の最大より大きければ
      max = num;                              // 最大値を更新
    }
  });
  return max;                                 // 見つかった最大番号を返す
}
```

`replace(/\D/g, '')` は「数字以外の文字を全部消す」という意味です。これを入れておくと、`0001` のようなゼロ埋め文字列でも、`2026-0007` のような年度付きでも、ちゃんと数字部分（この場合は `20260007` ではなく後述の設計次第）を取り出せます。ここでは後述のゼロ埋め設計に合わせて調整します。

### 実際に採番して書き込む

先ほどの `onEdit` の続きに、番号を計算して書き込む処理を足します。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

function onEdit(e) {
  const sheet = e.range.getSheet();
  const editedRow = e.range.getRow();
  const editedCol = e.range.getColumn();

  const TARGET_SHEET = '注文管理';
  const ID_COL = 1;
  const WATCH_COL = 2;
  const HEADER_ROWS = 1;

  if (sheet.getName() !== TARGET_SHEET) return;
  if (editedRow <= HEADER_ROWS) return;
  if (editedCol !== WATCH_COL) return;

  const idCell = sheet.getRange(editedRow, ID_COL);
  if (idCell.getValue() !== '') return;       // すでにIDがあれば何もしない

  const maxId = getMaxId(sheet, ID_COL, HEADER_ROWS); // 今ある最大番号
  const nextId = maxId + 1;                    // 次の番号は最大 + 1

  idCell.setValue(nextId);                     // 固定値としてID列に書き込む
}
```

これで、B列に何か入力するたびにA列へ `1, 2, 3…` と連番が固定で振られていきます。行を削除しても、残った番号は動きません。まさに「伝票番号」として使える形になりました。

## ゼロ埋め・年度プレフィックスできれいに整える

`1, 2, 3` のままでも動きますが、実務では `0001` のように桁をそろえたり、`2026-0001` のように年度を付けたりしたいことが多いです。見た目が整うだけでなく、並べ替えたときにも順番が崩れにくくなります。

### padStartでゼロ埋めする

`String(n).padStart(4, '0')` を使うと、4桁になるように左側をゼロで埋めてくれます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// 数値をゼロ埋めの文字列に変換する
function toZeroPadded(num, digits) {
  // String()で文字列にしてから padStart で左側をゼロ埋め
  return String(num).padStart(digits, '0');    // 例: 7 → '0007'
}

// 使い方の例
// toZeroPadded(1, 4)   → '0001'
// toZeroPadded(42, 4)  → '0042'
// toZeroPadded(1234, 4)→ '1234'（4桁を超えたらそのまま）
```

`onEdit` の書き込み部分を、この関数を使う形に差し替えます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

  const maxId = getMaxId(sheet, ID_COL, HEADER_ROWS); // 今ある最大番号
  const nextId = maxId + 1;                    // 次の番号

  // 4桁ゼロ埋めの文字列にして書き込む（例: '0008'）
  idCell.setValue(toZeroPadded(nextId, 4));
```

ゼロ埋め文字列を扱うときの注意点として、`getMaxId` の中で `parseInt` を使って数字部分だけ取り出しているので、`'0008'` は自動的に `8` として認識されます。だから最大値の計算はゼロ埋めのままでも問題なく動きます。

### 年度プレフィックスを付ける

`2026-0001` のように年度を頭に付けたい場合は、`Utilities.formatDate` で今の年を取り出して組み合わせます。年をまたぐと番号を1からリセットしたい、というケースにも対応できるようにしておきます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// 年度プレフィックス付きのIDを作る（例: '2026-0008'）
function makeYearlyId(sheet, idCol, headerRows) {
  // タイムゾーンはスプレッドシートの設定を使う
  const tz = Session.getScriptTimeZone();      // 例: 'Asia/Tokyo'
  const today = new Date();                     // 現在日時
  const year = Utilities.formatDate(today, tz, 'yyyy'); // 今の年（'2026'）

  const lastRow = sheet.getLastRow();
  let maxThisYear = 0;                           // 今年分の最大番号

  if (lastRow > headerRows) {
    const values = sheet
      .getRange(headerRows + 1, idCol, lastRow - headerRows, 1)
      .getValues();

    values.forEach(function (row) {
      const raw = String(row[0]);               // 例: '2026-0007'
      const parts = raw.split('-');             // ['2026', '0007'] に分ける
      // 先頭が今年と同じ行だけを対象に、連番部分の最大を探す
      if (parts.length === 2 && parts[0] === year) {
        const num = parseInt(parts[1], 10);     // '0007' → 7
        if (!isNaN(num) && num > maxThisYear) {
          maxThisYear = num;
        }
      }
    });
  }

  const nextNum = maxThisYear + 1;              // 今年分の次の番号
  // 'yyyy' + '-' + ゼロ埋め4桁 を組み立てる
  return year + '-' + toZeroPadded(nextNum, 4); // 例: '2026-0008'
}
```

この関数を使えば、年が変わった瞬間に自動で `2027-0001` から番号が振り直されます。`onEdit` の書き込み部分を `idCell.setValue(makeYearlyId(sheet, ID_COL, HEADER_ROWS));` に差し替えるだけです。年度ごとに伝票を管理したい場合にとても便利です。

## 既存データにまとめて採番する一括関数

`onEdit` は「これから入力される行」に番号を振る仕組みですが、すでにデータが入っていてID列だけ空、という状態のこともあります。そんなときのために、空欄のID列だけをまとめて埋める一括採番関数を作っておきます。

### 空欄だけを埋める設計にする

すでにIDが入っている行は絶対に触らず、空欄の行にだけ順番に番号を振ります。こうしておけば、何度実行しても既存の番号が変わらないので安心です。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// 空欄のID列だけをまとめて採番する（メニューやボタンから手動実行）
function fillMissingIds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('注文管理'); // 対象シート
  const ID_COL = 1;                            // A列
  const HEADER_ROWS = 1;                       // ヘッダー行数

  const lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROWS) return;          // データが無ければ終了

  // ID列を一括で読み込む（1回のアクセスにまとめて高速化）
  const range = sheet.getRange(HEADER_ROWS + 1, ID_COL, lastRow - HEADER_ROWS, 1);
  const ids = range.getValues();               // 2次元配列 [[v],[v],...]

  // 今ある最大番号を求める（前に作った関数を再利用）
  let counter = getMaxId(sheet, ID_COL, HEADER_ROWS);

  // 空欄の行だけ順番に番号を入れていく
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === '') {                     // その行のIDが空なら
      counter++;                                // 次の番号へ
      ids[i][0] = toZeroPadded(counter, 4);     // ゼロ埋めして配列に反映
    }
  }

  // 変更した配列をまとめて書き戻す（1回で書き込む）
  range.setValues(ids);
}
```

### メニューから実行できるようにする

一括採番はボタン一つで動かせると便利です。`onOpen` を使って、スプレッドシートのメニューに項目を追加します。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

// スプレッドシートを開いたときにカスタムメニューを追加
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('採番ツール')                  // メニュー名
    .addItem('空欄IDをまとめて採番', 'fillMissingIds') // 項目とひも付ける関数名
    .addToUi();                                // メニューを反映
}
```

これでシートを開き直すと、上部に「採番ツール」というメニューが出て、そこから一括採番を実行できます。手作業でボタンを押す運用にしておくと、意図しないタイミングで番号が振られる心配もありません。

## 重複と同時編集を防ぐ（LockService）

ここまでの仕組みで基本はバッチリですが、複数人が同時にシートを編集すると、まれに「同じ番号が2つ振られてしまう」ことがあります。最後に、この重複を防ぐ仕上げをします。

### なぜ重複が起きるのか

たとえば2人がほぼ同時に新規行を入力すると、両方の `onEdit` が「今の最大番号は7だ」と読み取り、両方が「じゃあ次は8」と書き込んでしまうことがあります。これを競合（きょうごう）といいます。行番号に依存せず「最大+1」で計算していても、読み取りと書き込みの間に他の処理が割り込むと重複が起きうるのです。

### LockServiceで順番待ちにする

`LockService.getScriptLock()` を使うと、「一度に1つの処理しか採番できない」よう順番待ちの列を作れます。これで、AさんとBさんの採番が重なっても、必ず片方が終わってからもう片方が動くようになります。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

function onEdit(e) {
  const sheet = e.range.getSheet();
  const editedRow = e.range.getRow();
  const editedCol = e.range.getColumn();

  const TARGET_SHEET = '注文管理';
  const ID_COL = 1;
  const WATCH_COL = 2;
  const HEADER_ROWS = 1;

  if (sheet.getName() !== TARGET_SHEET) return;
  if (editedRow <= HEADER_ROWS) return;
  if (editedCol !== WATCH_COL) return;

  const idCell = sheet.getRange(editedRow, ID_COL);
  if (idCell.getValue() !== '') return;

  // スクリプト全体で共有される鍵（ロック）を取得
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);                       // 最大10秒まで順番待ちする

    // ロック取得後に、もう一度「今の最大番号」を読み直すのが安全
    const maxId = getMaxId(sheet, ID_COL, HEADER_ROWS);
    const nextId = maxId + 1;
    idCell.setValue(toZeroPadded(nextId, 4));    // 固定値で書き込む

    SpreadsheetApp.flush();                       // 変更を即座に確定させる
  } catch (err) {
    // 10秒待っても鍵が取れなかった場合（同時編集が多すぎるなど）
    console.log('採番できませんでした: ' + err);   // ログに記録
  } finally {
    lock.releaseLock();                           // 必ず鍵を返す（超重要）
  }
}
```

`waitLock(10000)` は「最大10秒まで順番を待つ」という意味です。ロックを取れたら採番し、最後に `finally` の中で必ず `releaseLock()` して鍵を返します。この「必ず鍵を返す」を忘れると、あとの処理がずっと待たされてしまうので要注意です。

### 貼り付けで複数行が入ったときの対策

もう一つ実務でよくあるのが、「B列に複数行をまとめて貼り付けたとき」です。このとき `e.range` は1セルではなく複数行の範囲になります。1行分しか採番されないと番号が抜けてしまうので、範囲の行数をチェックして対応します。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

  // e.range が複数行になっているか確認する
  const numRows = e.range.getNumRows();          // 編集された範囲の行数

  if (numRows > 1) {
    // 複数行が一気に入力・貼り付けされた場合は
    // 上で作った一括採番関数を呼んで空欄をまとめて埋める
    fillMissingIds();
    return;                                       // 個別採番はスキップ
  }
  // ここから下は1行だけのときの通常採番処理…
```

こうしておけば、1行だけの入力でも、10行まとめて貼り付けても、抜けなくきちんと番号が振られます。

## よくある失敗と回避策

私が実際にハマった失敗を、回避策とセットでまとめます。同じ落とし穴を踏まないよう、参考にしてください。

### 失敗1：onEditが「動かない」と焦った

最初、コードを書いたのに全然採番されず「バグだ！」と焦りました。原因は、**監視列（B列）ではなく別の列を編集していた**だけでした。`onEdit` は編集された場所を見て動くので、監視している列を触らないと採番されません。テストするときは、必ず監視列に入力してみてください。

### 失敗2：手動実行したらエラーになった

`onEdit(e)` をエディタの実行ボタンから直接動かすと、引数 `e` が空なのでエラーになります。`onEdit` は「シートを編集したときに自動で動く」関数なので、テストは実際にセルへ入力して行うのが正解です。手動実行用のテスト関数を別に作るか、シート上で入力して確認しましょう。

### 失敗3：認証が必要なサービスを混ぜてエラー

`onEdit` のようなシンプルトリガーの中では、GmailApp（メール送信）など**認証が必要なサービスは使えません**。私は「採番したらメールで通知」を欲張って入れてエラーになりました。認証が必要な処理をしたいときは、シンプルトリガーではなく「インストール型トリガー」を設定する必要があります。まずは採番だけに絞るのがおすすめです。

### 失敗4：onEditは30秒以内に終わらせる

`onEdit` には実行時間の制限（おおむね30秒）があります。採番のたびにシート全体を何度も読み書きすると重くなるので、`getValues()` でまとめて読み、`setValues()` でまとめて書く「一括アクセス」を心がけると安全です。1セルずつアクセスするとすぐ遅くなります。

| 失敗パターン | 原因 | 回避策 |
|---|---|---|
| 採番されない | 監視列以外を編集していた | 監視列（B列）に入力してテストする |
| 手動実行でエラー | 引数 e が空だった | セルに入力して自動起動でテスト |
| サービスでエラー | 認証必要サービスを使った | 採番だけに絞る／インストール型トリガー |
| 動作が重い・止まる | 1セルずつ読み書きしていた | getValues/setValuesで一括処理 |

## 自分でも作れるようになりたい方へ

ここまで読んでくださって、ありがとうございます。「行を消すと番号がズレる」というのは、私自身が実際にやらかして冷や汗をかいたところなので、同じ悩みを解消できたらうれしいです。

GASは、こういう「地味だけど毎回手作業でやると面倒くさい作業」を静かに肩代わりしてくれる、看護師ママの強い味方です。私も最初はコードなんて一文字も書けませんでしたが、こうした小さな仕組みを一つずつ作るうちに、いつの間にか副業として成り立つようになりました。「自分にもできるかも」と少しでも思えたら、ぜひ一歩を踏み出してみてください。応援しています。

<a href="https://h.accesstrade.net/sp/cc?rk=0100knoa00orcn" rel="nofollow" referrerpolicy="no-referrer-when-downgrade">Dive into Code（未経験からエンジニアを目指すプログラミングスクール）</a><img src="https://h.accesstrade.net/sp/rr?rk=0100knoa00orcn" width="1" height="1" border="0" alt="">

## 関連記事（あわせて読みたい）

- [/blog/gas-sheet-timestamp-auto/](/blog/gas-sheet-timestamp-auto/) — 入力した時刻を自動で記録する方法。採番とセットで使うと「いつ・何番」の管理がぐっと楽になります。
- [/blog/gas-array-basic/](/blog/gas-array-basic/) — この記事でも使った getValues の2次元配列を、基礎から丁寧に解説しています。
- [/blog/gas-sheet-dedupe/](/blog/gas-sheet-dedupe/) — 重複した行を自動で削除する方法。採番前のデータ整理に役立ちます。

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

※掲載コードは構文とAPI仕様を確認して載せていますが、お使いの環境に合わせて調整してください。
