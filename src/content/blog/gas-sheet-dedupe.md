---
title: "GASでスプレッドシートの重複行を安全に削除する方法"
description: "スプレッドシートの重複行をGASで削除する方法を、安全な手順つきで解説。キー列での判定、最新を残すか最初を残すか、削除前のバックアップ、1行ずつ消すと失敗する理由、大量データでの高速化までコピペコードで紹介します。"
pubDate: "2026-05-18T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","dedupe"]
tagNames: ["GAS","スプレッドシート","重複削除"]
readingTime: 12
---

ナースの仕事と並行して、人のスプレッドシートを直す仕事も増えてきました。相談でいちばん多いのが、これです。

「フォームの回答が二重に入っていて、集計が合わない」
「名簿に同じ人が3回出てくる」

重複行の掃除は、**手でやると事故が起きやすい作業**です。並べ替えて目視で消していくと、どこかで必ず1行ずれます。GASに任せると確実で、しかも毎回同じ手順で片付きます。

ただし削除は取り返しがつかないので、**安全に進める手順**も含めて説明します。

## まず決めること：何をもって「重複」とするか

ここを決めないままコードを書くと、消してはいけない行まで消えます。

| 判定のしかた | 向いている場面 |
|---|---|
| **全列が一致** | フォームの二重送信など、まるごと同じ行 |
| **特定の列が一致**（キー列） | 名簿のメールアドレス、商品コード、注文番号 |
| 複数列の組み合わせ | 「日付＋担当者」で1件とみなす場合 |

多いのは2つ目です。「メールアドレスが同じなら同じ人」のように、**判断の軸になる列**を決めます。

そしてもう1つ。**残すのはどれか**を決めます。

- **最初の1件を残す**（登録順を大切にしたいとき）
- **最後の1件を残す**（あとから修正されたものを正とするとき）

## 安全な進め方（大事）

削除の前に、必ずこの順番でやってください。

1. **バックアップのシートを作る**（コード内で自動化します）
2. まず「何件消える予定か」だけ表示する（**ドライラン**）
3. 件数に納得したら、実際に削除する

私はこの手順にしてから、消してはいけない行を消した経験がありません。

## コード全文

```javascript
// ===== 設定 =====
const SS_ID      = 'スプレッドシートのID';
const SHEET_NAME = 'データ';
const KEY_COLS   = [2];      // 重複判定に使う列（1始まり）。[2]ならB列。空配列なら全列一致
const KEEP       = 'last';   // 'first' = 最初を残す / 'last' = 最後を残す
const HAS_HEADER = true;     // 1行目が見出しかどうか

/** ① まず件数だけ確認する（削除はしない） */
function dryRunDedupe() {
  const result = findDuplicates_();
  console.log('総行数：' + result.total);
  console.log('重複として削除される行：' + result.removeCount + '件');
  console.log('残る行：' + (result.total - result.removeCount) + '件');
  if (result.samples.length > 0) {
    console.log('削除される例（先頭5件）：');
    result.samples.forEach(function (s) { console.log('  ' + s); });
  }
}

/** ② 納得したら実行する（バックアップを取ってから削除） */
function removeDuplicates() {
  const ss    = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  // --- バックアップ ---
  const stamp  = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmm');
  const backup = sheet.copyTo(ss).setName(SHEET_NAME + '_backup_' + stamp);
  console.log('バックアップを作成しました：' + backup.getName());

  const result = findDuplicates_();
  if (result.removeCount === 0) { console.log('重複はありませんでした'); return; }

  // --- 残す行だけで書き直す（1行ずつ削除しない） ---
  sheet.clearContents();
  const out = result.keepRows;
  sheet.getRange(1, 1, out.length, out[0].length).setValues(out);

  console.log(result.removeCount + '行を削除しました（残り ' + (out.length - (HAS_HEADER ? 1 : 0)) + '行）');
}

/** 重複を調べて「残す行」と「消える件数」を返す */
function findDuplicates_() {
  const sheet  = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const header = HAS_HEADER ? values[0] : null;
  const body   = HAS_HEADER ? values.slice(1) : values;

  const seen = {};        // キー → 残す行のインデックス
  const order = [];       // 出現順を保つ
  const samples = [];

  body.forEach(function (row, idx) {
    const key = makeKey_(row);
    if (seen.hasOwnProperty(key)) {
      // 重複が見つかった
      if (samples.length < 5) samples.push(String(row.slice(0, 3).join(' / ')));
      if (KEEP === 'last') seen[key] = idx;      // 後の行で上書き（最後を残す）
      // KEEP === 'first' なら何もしない（最初のまま）
    } else {
      seen[key] = idx;
      order.push(key);
    }
  });

  const keepBody = order.map(function (key) { return body[seen[key]]; });
  const keepRows = header ? [header].concat(keepBody) : keepBody;

  return {
    total: body.length,
    removeCount: body.length - keepBody.length,
    keepRows: keepRows,
    samples: samples
  };
}

/** 重複判定のキーを作る */
function makeKey_(row) {
  const parts = (KEY_COLS.length > 0)
    ? KEY_COLS.map(function (c) { return row[c - 1]; })
    : row;
  return parts.map(function (v) {
    if (v instanceof Date) return v.getTime();          // 日付は数値にして比較
    return String(v == null ? '' : v).trim().toLowerCase();  // 前後の空白と大小文字を無視
  }).join('\u001F');   // 区切りに普通は使わない文字を使う
}
```

## 使い方

1. 上の設定を自分のシートに合わせる
2. **`dryRunDedupe` を先に実行**して、消える件数をログで確認する
3. 想定どおりなら `removeDuplicates` を実行する

`removeDuplicates` は実行のたびに `データ_backup_20260518_0930` のようなバックアップシートを作ります。おかしくなったら、そのシートから戻せます。

## コードのポイント

### 1行ずつ削除しない

`deleteRow()` を繰り返す方法は、**遅いうえに事故のもと**です。

```javascript
// ❌ よくある失敗
for (let i = 0; i < rows.length; i++) {
  if (isDuplicate(rows[i])) sheet.deleteRow(i + 1);   // 消すたびに行番号がずれる
}
```

行を1つ消すと、それより下の行番号が全部1つ上にずれます。上から順に消していくと、**1行おきに消し損ねます**。

どうしても行削除で進めたい場合は「**下から上に**」回します。

```javascript
for (let i = rows.length - 1; i >= 0; i--) {
  if (isDuplicate(rows[i])) sheet.deleteRow(i + 1);
}
```

ただし、この記事のコードのように**残す行だけで書き直す**ほうが、速くて安全です。1,000行で試すと、削除を繰り返す方法は数分、書き直す方法は数秒でした。

### 比較の前に整える

同じに見えて一致しない、という相談がとても多いです。原因はだいたいこの3つ。

- 前後に**空白**が入っている（`" 田中"` と `"田中"`）
- **大文字と小文字**の違い（`Tanaka@` と `tanaka@`）
- 日付が**Dateオブジェクト**なので、そのままでは文字列比較できない

コードの `makeKey_` では、`trim()` と `toLowerCase()` をかけ、日付は `getTime()` の数値にしています。ここを入れるかどうかで、検出できる重複の数がかなり変わります。

### キーの結合に変な文字を使う理由

複数の列を1つのキーにするとき、`A + '_' + B` のようにつなぐと、`['a_b', 'c']` と `['a', 'b_c']` が同じキーになってしまいます。滅多にないことですが、実際に起きると原因究明に時間がかかります。

そこで、通常のデータに出てこない制御文字（`\u001F`）を区切りに使っています。

## 応用：重複を消さずに印を付ける

いきなり消すのが怖い場合は、**重複した行に色を付けるだけ**にする方法もあります。確認してから手で消せます。

```javascript
function markDuplicates() {
  const sheet  = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const body   = HAS_HEADER ? values.slice(1) : values;
  const offset = HAS_HEADER ? 2 : 1;

  const seen = {};
  const colors = body.map(function (row) {
    const key = makeKey_(row);
    if (seen[key]) return ['#ffe5e5'];   // 2件目以降を赤く
    seen[key] = true;
    return [null];
  });

  sheet.getRange(offset, 1, colors.length, 1).setBackgrounds(colors);
  console.log('重複行に色を付けました');
}
```

## よくあるつまずき

### 消えすぎた

キー列の指定が広すぎる（または `KEY_COLS` が空で全列一致のつもりが、実は空白の違いで一致してしまった）可能性があります。バックアップシートから戻して、`dryRunDedupe` で件数を確認しながら調整してください。

### 消えなさすぎる

見えない文字（改行や全角スペース）が混ざっています。`makeKey_` の中で `.replace(/\s+/g, '')` を追加すると、空白をすべて無視して比較できます。

### バックアップシートが増えすぎた

実行のたびに増えるので、月に一度まとめて削除してください。気になる場合は、古いバックアップを自動削除する処理を足すこともできます。

### 数式が入っている列がある

`getValues()` は数式ではなく**計算結果**を返します。書き直すと数式が消えて値だけになるので、数式のある表では注意してください。数式を保ちたい場合は、対象を数式のない範囲に限定します。

## まとめ

- 最初に決めるのは「**何を重複とするか**」と「**どれを残すか**」
- 削除の前に**バックアップ**と**ドライラン**。この2つで事故は防げる
- 1行ずつの `deleteRow` は遅く、上から回すと消し損ねる
- **残す行だけで書き直す**のがいちばん速くて安全
- 比較の前に、空白・大小文字・日付型をそろえる

重複掃除は、毎回考えると疲れる作業です。一度この形にしておけば、次からは実行するだけになります。

## 関連記事

- [GAS setValuesで1000行を一括書き込みする高速化テクニック](/blog/gas-sheet-setvalues-bulk/)
- [GASで条件に合う行を安全に一括削除する（下から回す鉄則）](/blog/gas-sheet-delete-rows-condition/)
- [GASよく出るエラー10選と解決コード集｜辞書代わりに使える完全版](/blog/gas-error-exception/)

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。
