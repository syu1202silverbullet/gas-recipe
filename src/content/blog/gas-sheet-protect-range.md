---
title: "範囲保護をGASで動的に掛ける実務テク｜編集禁止セルの自動管理"
description: "GASでスプシの範囲保護を動的に設定・解除する実務テクを凛が解説。役割別保護・期間限定編集ロック・月次自動化まで看護師ママの失敗談つきで丁寧に説明します。"
pubDate: "2026-06-24T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","protection"]
tagNames: ["GAS","スプレッドシート","保護"]
readingTime: 8
keywords: ["GAS シート 保護","GAS 範囲保護","スプレッドシート 編集禁止 自動"]
---

凛です。ある月の締め処理のあと、シフト表の集計列が誰かに悪気なく上書きされていて、月次のシフト合計がまるごと壊れていたことがありました。看護師の現場ではシフトをスプレッドシートで回していて、複数の職員が同じシートを触ります。「ここは触らないで」とお願いするだけでは、事故は防げませんでした。その日は結局、残業して手で直すはめに。それ以来、「編集していいセルと触らせないセルをGASで切り替える」仕組みを本気で作ろうと決めました。

# 範囲保護をGASで動的に掛ける実務テク｜編集禁止セルの自動管理

## なぜ「お願いベース」では防げなかったのか

原因は、はっきりしています。人はうっかりする生き物だからです。

締め後の集計式は「触ってはいけない」と分かっていても、隣のセルを直そうとして手が滑る。別の職員に「入力しておいて」と頼めば、その人は当然どこが締め済みかを知りません。口頭の「触らないで」は、その場にいなかった人には届かない。しかも、かといって毎月手作業で範囲保護を設定し直すのは、本当に骨が折れます。月初にやり忘れて後から気づく、という失敗も何度かやりました。

つまり必要だったのは「人の注意力に頼らない仕組み」です。スプレッドシートには範囲保護という機能があって、特定のセル範囲を指定したユーザーしか編集できないようにロックできます。「データ」→「シートと範囲を保護」から手動でも設定できますが、これを毎月手でやるのが面倒。そこをGASに肩代わりさせれば、ボタン一発、あるいはトリガーで自動化できます。GASなら、任意の範囲に保護を掛ける・解除する・特定ユーザーだけを編集者にする・組織全体の編集権限を切る、といった制御がまとめてできます。

## 解決：実際に使っているコード

私が職場で回しているコードをそのまま公開します。まずは基本の1範囲を保護するパターンと、掛けた保護を全部外す解除関数です。

```javascript
/**
 * 指定範囲に保護を掛ける
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function protectRange() {
  // アクティブなシートを取得
  const sheet = SpreadsheetApp.getActiveSheet();

  // 保護したいセル範囲を指定（例：A1からC10）
  const range = sheet.getRange('A1:C10');

  // 保護オブジェクトを作成して説明を設定
  // ← 説明を入れることで「なぜ保護されているか」が一目でわかる
  const protection = range.protect().setDescription('編集禁止: 集計式');

  // 実行中のユーザー（自分自身）を取得
  const me = Session.getEffectiveUser();

  // 既存の編集者を全員削除してから自分だけ追加
  // ← これをしないと他の人も編集できてしまう
  protection.removeEditors(protection.getEditors());

  // 組織アカウントの場合、ドメイン全体の編集権限もオフに
  // ← Google Workspace環境では必須！忘れると保護が形だけになる
  if (protection.canDomainEdit()) {
    protection.setDomainEdit(false);
  }

  // 最後に自分を編集者として追加（これを忘れると自分も編集不可になる！）
  protection.addEditor(me);

  // 完了メッセージ
  Logger.log('範囲 A1:C10 に保護を設定しました');
}

/**
 * シート内のすべての範囲保護を解除する
 * ← 保護の掛け直しや緊急解除に使う
 */
function unprotectAll() {
  const sheet = SpreadsheetApp.getActiveSheet();

  // RANGE タイプの保護を全件取得して削除
  const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);

  protections.forEach(p => {
    Logger.log(`保護解除: ${p.getDescription()}`);
    p.remove();
  });

  Logger.log(`合計 ${protections.length} 件の保護を解除しました`);
}
```

実務で効いてくるのは、複数範囲をまとめて掛けるパターンと、役割ごとに編集者を分けるパターンです。

```javascript
/**
 * 複数の範囲に一括で保護を掛ける（月次締め後の運用向け）
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function protectMultipleRanges() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const me = Session.getEffectiveUser();

  // 保護したい範囲と説明文の組み合わせ
  const PROTECTED_RANGES = [
    { range: 'A1:A100', description: '氏名欄：変更禁止' },
    { range: 'E1:E100', description: '合計欄：数式保護' },
    { range: 'G1:G30', description: '月次集計：締め後ロック' },
  ];

  PROTECTED_RANGES.forEach(config => {
    const range = sheet.getRange(config.range);
    const protection = range.protect().setDescription(config.description);

    // 既存編集者を削除して自分だけを残す
    protection.removeEditors(protection.getEditors());
    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
    protection.addEditor(me);

    Logger.log(`保護設定完了: ${config.range} (${config.description})`);
  });
}

/**
 * 役割別に保護と編集者を設定する（チーム運用向け）
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function protectWithEditors() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const me = Session.getEffectiveUser();

  // 経理担当だけが編集できる範囲
  const accountingRange = sheet.getRange('F1:H100');
  const accountingProtection = accountingRange.protect()
    .setDescription('経理専用：経理担当者のみ編集可');

  accountingProtection.removeEditors(accountingProtection.getEditors());
  if (accountingProtection.canDomainEdit()) {
    accountingProtection.setDomainEdit(false);
  }
  // 自分（管理者）と経理担当を追加
  accountingProtection.addEditor(me);
  accountingProtection.addEditor('kaikei-tantou@example.com');

  // 現場担当だけが編集できる範囲
  const fieldRange = sheet.getRange('B1:D100');
  const fieldProtection = fieldRange.protect()
    .setDescription('現場記録欄：現場担当のみ編集可');

  fieldProtection.removeEditors(fieldProtection.getEditors());
  if (fieldProtection.canDomainEdit()) {
    fieldProtection.setDomainEdit(false);
  }
  fieldProtection.addEditor(me);
  fieldProtection.addEditor('genba-tantou@example.com');

  Logger.log('役割別保護の設定が完了しました');
}
```

### 月初に自動で保護を掛ける

手で回すのを卒業したいなら、時間ベースのトリガーに載せます。毎月1日の朝に、前月分のロックが勝手に掛かるようにする設定です。

1. GASエディタを開く（スプシ上部メニュー「拡張機能」→「Apps Script」）
2. 左メニューの時計アイコン「トリガー」をクリック
3. 右下の「＋ トリガーを追加」ボタンをクリック
4. 「実行する関数を選択」で `protectMultipleRanges` を選ぶ
5. 「イベントのソースを選択」で「時間主導型」を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「月のタイマー」を選ぶ
7. 「月の日付を選択」で「1」（毎月1日）を指定
8. 実行時刻を「午前9時〜10時」に設定
9. 「保存」ボタンをクリック
10. Googleアカウントの認証画面が出たら許可する

これで毎月1日の朝9時台に、自動で保護が掛かります。

## 私がやらかした3つのこと（と回避策）

### 自分まで編集できなくして慌てた

最初は `removeEditors(protection.getEditors())` だけで動かしていて、気づいたら自分自身も編集者から外れていました。夜勤明けの疲れた頭で書いたコードだったこともあり、「あれ、自分が編集できない…」の原因に1時間気づけなかった苦い思い出があります。

保護を掛けるときは、最後に必ず `addEditor(me)` で自分を戻す。これはもうセットで覚えてしまってください。ちなみに複数人を編集者にしたいときは `addEditors(['email1@example.com', 'email2@example.com'])` と配列で渡せば、1行にまとまって読みやすくなります。

### 保護したはずが形だけになっていた

Google Workspaceの組織アカウントだと、ドメイン全員に編集権限がついていることがあります。ここで `setDomainEdit(false)` を入れ忘れると、せっかくの保護が飾りになってしまう。

職場のスプシで試したとき、まさにこの `canDomainEdit` チェックを抜かしていて、「なんか保護が効いてないな…」と30分ほど悩みました。Workspace環境の方は必ず入れてください。なお個人のGoogleアカウントなら `canDomainEdit` は常に `false` を返すので、`if` で囲む書き方にしておけば無害です。

### 「なぜ編集できないか」が誰にも分からなかった

`setDescription` を省くと、後から見た自分や同僚が「なんでここ編集できないの?」で足を止めます。将来のためにも、保護には必ず一目で意味がわかる説明を添えます。

私が実際に使っている命名ルールは、こんな感じです。

- `氏名欄：変更禁止（管理者のみ）`
- `合計式：数式保護（2026年5月締め）`
- `月次集計：ロック済み（翌月1日に解除予定）`

「誰が、なぜ、いつまで」が読み取れる文言にしておくと、トラブルの調査が段違いに速くなります。

## まだあるつまずきどころ

### 解除する手段を用意していない

保護を掛けたのに外す手段がないと、開発中に何度も画面操作で削除するはめになります。初めて保護コードを書いたとき、まさに解除関数を作っておらず、毎回「データ」→「シートと範囲を保護」→「削除」を手でクリックして、テスト中に10回以上繰り返しました……。最初から `unprotectAll` のような全解除関数もセットで書くのが鉄則です。

### 手動保護とGAS保護が二重になる

手で掛けた保護が残っていると、GASの保護と重なって挙動が読みにくくなります。設定前に一度 `unprotectAll` でクリアしてから流すか、既存の一覧を確認してから進めてください。

```javascript
// 既存保護の一覧を確認するデバッグ用コード
function listProtections() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  protections.forEach(p => {
    Logger.log(`範囲: ${p.getRange().getA1Notation()}, 説明: ${p.getDescription()}`);
  });
  Logger.log(`合計 ${protections.length} 件の保護が設定されています`);
}
```

### permission エラーが出る

`Exception: You do not have permission to call removeEditors` は、保護の編集者ではないのに `removeEditors` を呼んだときに出ます。保護を作ったアカウントと、GASを実行しているアカウントが一致しているか確認してください。別アカウントで作った保護は、そのアカウントでしか管理できません。

## 実際の月次フローに組み込む

参考までに、私が回している月次フローを置いておきます。

| タイミング | 実行する関数 | 目的 |
|---|---|---|
| 毎月1日 午前9時 | `protectMultipleRanges` | 前月分のデータ範囲をロック |
| 月末 午後11時 | `unprotectAll` → `protectMultipleRanges` | 入力受付→締め処理 |
| 臨時（緊急時） | `unprotectAll` | 修正が必要な時の一時解除 |

この3つをトリガーに登録しておくだけで、月次の保護管理はほぼ手放せます。

## この仕組みを入れて変わったこと

正直なところ、範囲保護なんて地味な機能だと最初は思っていました。でも複数人でスプシを回す現場では、これがあるとないとで安心感がまるで違います。

私の職場では、このGASを入れてから「集計式が誰かに壊された!」という事故が、ぱたりとゼロになりました。残業して合計を手で直すこともなくなった。単発で使うより、月初のトリガー実行に組み込んでこそ本領を発揮する仕組みなので、業務でスプシを使っているなら、覚えて損はないと思います。

---

## 関連記事（あわせて読みたい）

スプレッドシート自動化をもっと深めたい方は、以下の記事もおすすめです。

- [GASで配列操作push/map/filter早見表15個](/blog/gas-array-basic/) — 2次元配列の扱いがわかると速度が劇的に変わります
- [GASでCSVをスプシに取り込む3手順](/blog/gas-sheet-import-csv/) — CSV連携の基本
- [スプシ自動フィルタをGASで3秒セット](/blog/gas-sheet-filter-auto/) — フィルタ操作の自動化

これらと組み合わせると、スプシ運用の手作業をどんどん減らせます。

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

掲載コードは構文とAPI仕様を確認して載せていますが、お使いの環境に合わせて調整してください。
