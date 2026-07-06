---
title: "編集日時を自動記録するタイムスタンプGAS"
description: "スプレッドシートの編集日時をonEditで自動記録する方法を解説。複数列の監視・編集者名の記録・上書き防止まで、看護師が実運用で気づいたコツを含めてまとめました。"
pubDate: "2026-05-19T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","timestamp","onEdit"]
tagNames: ["GAS","タイムスタンプ","onEdit"]
readingTime: 8
keywords: ["GAS タイムスタンプ 自動","GAS onEdit","スプレッドシート 編集日時 自動"]
---

こんにちは、病棟勤務のかたわらGASで副業をしている凛です。

今日は、うちの職場の申し送りシートに「編集日時が勝手に記録される仕組み」が付くまでの顛末を、時系列で書いてみようと思います。地味な機能ですが、できあがるまでにはそれなりの紆余曲折がありました。

# 編集日時を自動記録するタイムスタンプGAS

## 発端：「これいつ追記されたの？」が飛び交っていた頃

始まりは、看護師仲間と共有している申し送りシートでした。誰かが行を追記する。でも日付は手打ち。打ち忘れる人もいれば、打ち間違える人もいる。シートを開くたびに「この行、最後にいつ更新したんだっけ？」で手が止まる。「これいつ追記されたの？」という確認の声が、日常的に飛び交っていました。

Googleのバージョン履歴で見ればいいのでは、と思われるかもしれません。私も最初はそう答えていました。ただ、あれはセル単位で追うにはかなり見づらくて、「この行がいつ変わったか」を知りたいだけの用途には大げさすぎるんですよね。更新履歴を別シートに手でコピーする案も出ましたが、続くはずがない。ならばと、セルを編集した瞬間に日時が勝手に入る仕組みをGASで作ることにしました。

使うのは **`onEdit(e)` シンプルトリガー**。関数名を `onEdit` にするだけで、セルが編集されたときに自動で発火してくれます。トリガーの手動設定すら不要。処理の流れは、編集されたセルのシート名・列・行を取得し、対象シート・対象列かどうかを確認して、ヘッダー行でなければ指定列に現在日時を書き込む。空白に戻されたときは日時もクリアする。これだけです。

## 最初の版：メモシートにまで日時が入り始めた

意気揚々と最初の版を書いて保存した私は、すぐに洗礼を受けました。`onEdit` はスプレッドシート全体のあらゆる編集で発火します。シート名のチェックを入れ忘れていたせいで、メモ用の雑多なシートにまで日時が入り始めたんです。申し送りとは何の関係もないシートに、次々とタイムスタンプが。

このときの教訓が「**シート名の絞り込みは必須**」でした。スプレッドシートを開いたら、タブの数だけ「全部に適用される可能性がある」と意識する。以来、`onEdit` を書くときは真っ先にシート名チェックを入れる習慣になりました。

## 二度目のつまずき：深夜の編集が「前日の17時」になる

シート名問題を直してしばらく運用していたら、今度は妙な記録を見つけました。日本時間の深夜に編集したはずのセルが「前日の17時」と記録されている。犯人はタイムゾーンでした。`Utilities.formatDate` のタイムゾーン指定を省略すると、GASサーバーのUTC基準で動くんです。夜勤後の深夜にシートを更新することが多い私は、この問題で何度かヒヤリとしました。

それ以来、日時関係の関数では必ず `'Asia/Tokyo'` を書く。これも体で覚えたルールです。

## 完成形：設定をまとめて、誰でも使い回せる形に

つまずきを反映して整えたのが、以下のコードです。監視する列・書き込み先の列・日時フォーマットなどを冒頭の `TS_CONFIG` にまとめてあるので、ご自身のシートに合わせて数字を変えるだけで使えます。構文チェックのうえで掲載していますが、まずはテスト用シートで動きを確かめてから本番に入れてください。

```javascript
// ============================================================
// GAS タイムスタンプ自動記録 完全版
// 本記事のコードは静的検証済みです
// ============================================================

// ===== 設定値（ここを自分の環境に合わせて変更する） =====
var TS_CONFIG = {
  SHEET_NAME: '進捗管理',         // タイムスタンプを付けるシートの名前
  WATCH_COLS: [2, 4, 6],          // 監視する列番号（B=2、D=4、F=6）
  STAMP_COL: 7,                    // タイムスタンプを書き込む列番号（G=7）
  EDITOR_COL: 8,                   // 編集者メールを書き込む列番号（H=8）（0にすると記録しない）
  HEADER_ROW: 1,                   // ヘッダー行番号（この行はスキップする）
  DATE_FORMAT: 'yyyy/MM/dd HH:mm', // 日時のフォーマット
  OVERWRITE: true                  // true=毎回上書き / false=最初だけ記録
};

/**
 * セル編集時に自動で発火するシンプルトリガー
 * 関数名を onEdit にするだけでトリガー設定不要
 * @param {Object} e - 編集イベントオブジェクト
 */
function onEdit(e) {
  var sheet = e.range.getSheet();

  // 1. 対象シートかどうかチェック（シート名が違う場合は何もしない）
  if (sheet.getName() !== TS_CONFIG.SHEET_NAME) return;

  var col = e.range.getColumn();
  var row = e.range.getRow();

  // 2. ヘッダー行はスキップ
  if (row <= TS_CONFIG.HEADER_ROW) return;

  // 3. 監視列かどうかチェック
  if (TS_CONFIG.WATCH_COLS.indexOf(col) === -1) return;

  // 4. 編集後の値が空になった場合（チェックを外した等）はタイムスタンプも消す
  var newValue = e.value;
  if (newValue === undefined || newValue === '') {
    sheet.getRange(row, TS_CONFIG.STAMP_COL).clearContent();
    if (TS_CONFIG.EDITOR_COL > 0) {
      sheet.getRange(row, TS_CONFIG.EDITOR_COL).clearContent();
    }
    return;
  }

  // 5. 上書き防止モードの場合：既にタイムスタンプがあればスキップ
  if (!TS_CONFIG.OVERWRITE) {
    var existingStamp = sheet.getRange(row, TS_CONFIG.STAMP_COL).getValue();
    if (existingStamp !== '') return;  // 既に記録済みなのでスキップ
  }

  // 6. 現在日時をタイムスタンプとして書き込む
  var stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', TS_CONFIG.DATE_FORMAT);
  sheet.getRange(row, TS_CONFIG.STAMP_COL).setValue(stamp);

  // 7. 編集者メールも記録する（EDITOR_COL > 0 の場合のみ）
  if (TS_CONFIG.EDITOR_COL > 0) {
    try {
      // 同一ドメイン内・権限がある場合のみ取得できる
      var email = Session.getActiveUser().getEmail();
      if (email) {
        sheet.getRange(row, TS_CONFIG.EDITOR_COL).setValue(email);
      }
    } catch (err) {
      // 権限がない場合はスキップ（エラーは無視する）
      Logger.log('編集者メール取得不可: ' + err.message);
    }
  }
}

/**
 * 複数シートに対応した上位バージョン
 * MULTI_CONFIG に複数のシート設定を持てる
 */
function onEditMultiSheet(e) {
  // 複数シートの設定を配列で管理する
  var MULTI_CONFIG = [
    {
      sheetName: '進捗管理',
      watchCols: [2, 4],   // B列・D列を監視
      stampCol: 5,          // E列にタイムスタンプ
      editorCol: 6          // F列に編集者
    },
    {
      sheetName: '勤務シフト',
      watchCols: [3],       // C列を監視
      stampCol: 4,          // D列にタイムスタンプ
      editorCol: 0          // 編集者は記録しない
    }
  ];

  var sheet = e.range.getSheet();
  var col = e.range.getColumn();
  var row = e.range.getRow();

  // 対応するシート設定を探す
  var config = null;
  for (var i = 0; i < MULTI_CONFIG.length; i++) {
    if (MULTI_CONFIG[i].sheetName === sheet.getName()) {
      config = MULTI_CONFIG[i];
      break;
    }
  }

  // 設定が見つからなければ何もしない
  if (!config) return;

  // ヘッダー行はスキップ（1行目）
  if (row === 1) return;

  // 監視列でなければスキップ
  if (config.watchCols.indexOf(col) === -1) return;

  // 空欄になったらクリア
  if (e.value === undefined || e.value === '') {
    sheet.getRange(row, config.stampCol).clearContent();
    return;
  }

  // タイムスタンプを書き込む
  var stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  sheet.getRange(row, config.stampCol).setValue(stamp);

  // 編集者も記録する（設定されている場合）
  if (config.editorCol > 0) {
    try {
      var email = Session.getActiveUser().getEmail();
      if (email) sheet.getRange(row, config.editorCol).setValue(email);
    } catch (err) {
      Logger.log('編集者取得エラー: ' + err.message);
    }
  }
}

/**
 * インストーラブルトリガー版：編集者のメールを確実に取得したいとき
 * シンプルトリガー（onEdit）では権限制限があるため、インストーラブル版が必要な場面がある
 * この関数をトリガーから手動で設定する（トリガー > + > スプレッドシートから > 編集時）
 */
function onEditInstallable(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== TS_CONFIG.SHEET_NAME) return;

  var col = e.range.getColumn();
  var row = e.range.getRow();

  if (row <= TS_CONFIG.HEADER_ROW) return;
  if (TS_CONFIG.WATCH_COLS.indexOf(col) === -1) return;

  var stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', TS_CONFIG.DATE_FORMAT);
  sheet.getRange(row, TS_CONFIG.STAMP_COL).setValue(stamp);

  // インストーラブルトリガーでは編集者メールが確実に取れる
  var email = Session.getActiveUser().getEmail();
  sheet.getRange(row, TS_CONFIG.EDITOR_COL).setValue(email || '不明');
}

/**
 * 手動テスト用：特定の行にタイムスタンプを強制書き込みして確認する
 */
function testTimestamp() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TS_CONFIG.SHEET_NAME);
  if (!sheet) {
    Logger.log('シートが見つかりません: ' + TS_CONFIG.SHEET_NAME);
    return;
  }
  var stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', TS_CONFIG.DATE_FORMAT);
  sheet.getRange(2, TS_CONFIG.STAMP_COL).setValue(stamp);
  Logger.log('テスト書き込み完了: 2行目の' + TS_CONFIG.STAMP_COL + '列目に「' + stamp + '」を書きました');
}
```

### トリガー設定について

`onEdit` 関数はトリガーの手動設定が不要です。コードを保存するだけで自動的に有効になります。ただし、後述するインストーラブルトリガー版（`onEditInstallable`）を使う場合だけは手動設定が必要です。

1. GASエディタ左メニューの「**時計マーク（トリガー）**」をクリック
2. 「**＋ トリガーを追加**」をクリック
3. 実行する関数：**`onEditInstallable`** を選択
4. イベントのソース：**「スプレッドシートから」** を選択
5. イベントの種類：**「編集時」** を選択
6. 「**保存**」をクリック
7. Googleアカウントの認証ダイアログで「許可」をクリック

## 運用してから分かったこと

完成してからも、細かい発見はいくつかありました。

### 上書きモードは用途で切り替える

`OVERWRITE: false` に設定すると「最初に入力した時刻だけが残る」挙動になります。「このタスク、最初に担当になった日時だけ記録したい」という場面で重宝する設定です。逆に「毎回の最終更新日時を知りたい」なら `OVERWRITE: true`（デフォルト）。私は副業クライアントとの進捗管理で「いつ最初にアサインされたか」を残すために false に設定しています。同じコードでも、用途によって表情が変わるのが面白いところです。

### 編集者のメールが空になる問題

「誰が触ったか」も記録したくて `EDITOR_COL` を用意したのですが、シンプルトリガー（`onEdit`）は権限が制限されており、他のGoogleアカウントからの編集では `Session.getActiveUser().getEmail()` が空文字列を返すことがあります。編集者のメールを確実に記録したい場合は、`onEditInstallable` に切り替えてインストーラブルトリガーとして設定してください。シート所有者が設定したトリガーなら、編集者のメールが取得できます。

### 記録されないときに疑う場所

「保存したのに何も起きない」というときは、原因はだいたい2つです。ひとつはシート名が `TS_CONFIG.SHEET_NAME` と一致していないケース。全角・半角・余分なスペースの違いは目視では気づきにくいので、`Logger.log(e.range.getSheet().getName())` で実際のシート名をログに出し、シートタブの名前をそのままコピーして `SHEET_NAME` に貼り付けるのが確実です。もうひとつは、編集した列が `WATCH_COLS` に含まれていないケース。`Logger.log(e.range.getColumn())` で列番号を確認して追加してください。A列=1、B列=2という数え方です。

### 範囲選択の編集で複数行に日時が入る

範囲選択してから編集した場合、`e.range` が複数行になる可能性があります。単一セル編集のみ対応するなら `if (e.range.getNumRows() > 1 || e.range.getNumColumns() > 1) return;` を先頭に追加してください。複数行への同時書き込みが必要なら、ループ処理に変更する形になります。

## ここまでやって思うこと

振り返ると、メモシートへの日時混入も、前日17時事件も、原因はぜんぶ「絞り込みと指定の甘さ」でした。シート名・列番号で必ず絞り込む、タイムゾーンは `Asia/Tokyo` を明示する。このふたつさえ守れば、タイムスタンプGASはほぼ裏切りません。

いま職場の申し送りシートでは、誰かが行を触れば黙って日時が入ります。「これいつ追記されたの？」という声は、もう聞かなくなりました。たった一言が消えるだけなのに、共有シートの管理ストレスは驚くほど減るものです。手打ちの日付に疲れている方は、まずテスト用シートで `onEdit` を動かしてみてください。

---

## 関連記事

- [GASでスプシのフィルタを自動設定する方法](/blog/gas-sheet-filter-auto/)
- [GASでスプレッドシートのデータを自動ソートする](/blog/gas-sheet-sort-multi/)
- [GASでスプレッドシートのセル範囲を自動で保護する](/blog/gas-sheet-protect-range/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*コードは構文と動作ロジックを確認のうえ掲載しています。シート名や列番号はお使いの環境に合わせて調整してください。*
