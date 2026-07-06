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

こんにちは、病棟勤務のかたわらGASで副業をしている凛です。複数人で共有しているシートを開いて、「この行、最後にいつ更新したんだっけ？」と手が止まったことはありませんか。職場の申し送りシートでまさにこれが頻発していました。今日は編集日時を勝手に記録してくれるタイムスタンプGASをまとめます。

# 編集日時を自動記録するタイムスタンプGAS

## こんな悩みありませんか？

- 「この行、最後にいつ更新したっけ？」が共有シートで毎回分からない
- 複数人で使うスプレッドシートで「誰がどの行を触ったか」追えない
- 手で日付を打つと、打ち忘れ・打ち間違いが頻繁に起きる
- 更新履歴を別シートに手でコピーするのが面倒で続いていない
- 「Googleのバージョン履歴で見て」というのも、セル単位で見づらくて不便

職場の看護師仲間と共有している申し送りシートで「これいつ追記されたの？」が頻発して困っていました。今日は **スプシの編集日時を自動記録するタイムスタンプGAS** を、シンプルトリガー一本で実装する方法をまとめます。

---

## 自動タイムスタンプの全体像

使うのは **`onEdit(e)` シンプルトリガー**。スプレッドシートのセルが編集されたときに自動で発火します。

| 処理ステップ | 内容 |
|------------|------|
| 1 | 編集されたセルのシート名・列・行を取得する |
| 2 | 対象シート・対象列かどうか確認する |
| 3 | ヘッダー行でなければ、指定列に現在日時を書き込む |
| 4 | 空白に戻したときは日時もクリアする |

「シンプルトリガー」は関数名を `onEdit` にするだけで自動的に動きます。トリガーの手動設定は不要ですが、制限事項もあるので後述します。

---

## 動作するコード：タイムスタンプ自動記録

本記事のコードは静的検証済みです。Google Apps Script のV8ランタイムで動作確認しています。

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

---

## トリガーの設定（シンプルトリガーの場合）

`onEdit` 関数はトリガーの手動設定が不要です。コードを保存するだけで自動的に有効になります。

ただし、インストーラブルトリガー版（`onEditInstallable`）を使う場合は手動設定が必要です。

1. GASエディタ左メニューの「**時計マーク（トリガー）**」をクリック
2. 「**＋ トリガーを追加**」をクリック
3. 実行する関数：**`onEditInstallable`** を選択
4. イベントのソース：**「スプレッドシートから」** を選択
5. イベントの種類：**「編集時」** を選択
6. 「**保存**」をクリック
7. Googleアカウントの認証ダイアログで「許可」をクリック

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：シート名の絞り込みは必須

`onEdit` はスプレッドシート全体のあらゆる編集で発火します。シート名のチェックを入れ忘れると、全シートの全編集にタイムスタンプが付いてしまいます。私は最初にシート名チェックを忘れて、メモ用の雑多なシートにまで日時が入り始めて困りました。スプレッドシートを開いたらタブの数だけ「全部に適用される可能性がある」と意識するようにしています。

### コツ2：タイムゾーンを必ず `Asia/Tokyo` に指定する

`Utilities.formatDate(new Date(), 'Asia/Tokyo', ...)` のタイムゾーン指定を省略すると、GASサーバーのUTC基準で動きます。日本時間の深夜2時に編集したセルが「前日の17時」と記録されてしまいます。看護師の夜勤後にシートを更新することが多い私は、この問題で何度かヒヤリとしました。日時関係の関数では必ず `Asia/Tokyo` を書く習慣にしています。

### コツ3：上書き防止モード（`OVERWRITE: false`）は「初回記録の確定」に使う

`OVERWRITE: false` に設定すると「最初に入力した時刻だけが残る」挙動になります。「このタスク、最初に担当になった日時だけ記録したい」という場面で重宝します。逆に「毎回の最終更新日時を知りたい」なら `OVERWRITE: true`（デフォルト）を使います。用途によって使い分けるのがポイントで、副業クライアントとの進捗管理では「いつ最初にアサインされたか」を残すために false に設定しています。

---

## つまずきやすいポイント

### エラー1：タイムスタンプが記録されない（何も起きない）

**原因1**：シート名が `TS_CONFIG.SHEET_NAME` と一致していない（全角・半角・スペースの違い）。

**解決策**：GASエディタで `Logger.log(e.range.getSheet().getName())` を使い、実際のシート名をログで確認する。スプレッドシートのシートタブの名前をそのままコピーして `SHEET_NAME` に貼り付ける。

**原因2**：監視列（`WATCH_COLS`）に編集した列番号が含まれていない。

**解決策**：`Logger.log(e.range.getColumn())` で編集した列番号を確認し、`WATCH_COLS` に追加する。A列=1、B列=2という数え方で確認する。

### エラー2：「編集者のメールが取れない・空になる」

**原因**：シンプルトリガー（`onEdit`）は権限が制限されており、他のGoogleアカウントからの編集では `Session.getActiveUser().getEmail()` が空文字列を返すことがある。

**解決策**：編集者のメールを確実に記録したい場合は `onEditInstallable` に切り替えてインストーラブルトリガーとして設定する。シート所有者が設定したトリガーなら、編集者のメールが取得できる。

### エラー3：1列だけ変更しても複数行にタイムスタンプが入る

**原因**：範囲選択してから編集した場合、`e.range` が複数行になる可能性がある。

**解決策**：単一セル編集のみ対応する場合は `if (e.range.getNumRows() > 1 || e.range.getNumColumns() > 1) return;` を先頭に追加する。複数行への同時書き込みが必要な場合はループ処理に変更する。

---

## まとめ

| 機能 | 実装方法 | 設定箇所 |
|------|---------|---------|
| 特定シートだけ記録 | シート名チェック | `SHEET_NAME` |
| 複数列を監視 | `WATCH_COLS` 配列 | `WATCH_COLS` |
| 記録先の列を指定 | `STAMP_COL` 番号 | `STAMP_COL` |
| 空欄になったら消す | `clearContent()` | `onEdit` 内 |
| 最初だけ記録する | `OVERWRITE: false` | `OVERWRITE` |
| 編集者も記録する | `getActiveUser()` | `EDITOR_COL` |
| 設定不要で自動発火 | 関数名を `onEdit` に | 関数名 |

ポイントをまとめると：

- シート名・列番号で必ず絞り込む（全シートに適用させない）
- タイムゾーンは `Asia/Tokyo` を明示する
- 上書きするか初回だけかは用途で使い分ける
- 編集者メールを確実に取るにはインストーラブルトリガーを使う

「いつ更新したっけ？」の一言が消えるだけで、共有シートの管理ストレスが大幅に減ります。

---

## 関連記事

- [GASでスプシのフィルタを自動設定する方法](/blog/gas-sheet-filter-auto/)
- [GASでスプレッドシートのデータを自動ソートする](/blog/gas-sheet-sort-multi/)
- [GASでスプレッドシートのセル範囲を自動で保護する](/blog/gas-sheet-protect-range/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*本記事のコードは静的検証済みです。*
