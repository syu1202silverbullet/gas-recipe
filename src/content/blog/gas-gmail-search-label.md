---
title: "Gmail未読を条件検索してラベル付与するGAS"
description: "Gmailの未読メールを条件で検索し、自動でラベルを付けて仕分けするGASのレシピ。検索演算子の一覧、スレッドとメッセージの違い、処理件数の上限対策、既読化やアーカイブまで、コピペで動くコード付きで解説します。"
pubDate: "2026-05-13T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas","gmail","label"]
tagNames: ["GAS","Gmail","ラベル"]
readingTime: 12
---

夜勤明けにスマホを開くと、未読メールが100件超え。病院からの連絡、子どもの学校のお便り、ネットショップのセール情報が全部ごちゃまぜで、大事なメールを見落としかけたことがあります。

Gmailの標準フィルタでも仕分けはできますが、**条件が複雑になると手が届かなくなる**。「差出人はこの3つのどれかで、本文に金額が入っていて、直近7日以内のものだけ」——こういう指定は、GASなら1行で書けます。

この記事では、未読メールを条件で拾ってラベルを付けるコードを、そのまま使える形で紹介します。

## この仕組みでできること

- 未読のうち、**条件に合うものだけ**にラベルを付ける
- ラベルは無ければ自動で作る
- 仕分けと同時に**既読にする／アーカイブする**（設定で切り替え）
- 何件処理したかをログに残す

Gmailのフィルタと違うのは、**あとから条件を変えても過去のメールに適用できる**点です。フィルタは基本的に新着にしか効きません。

## まずはGmail検索演算子を押さえる

`GmailApp.search()` には、Gmailの検索窓とまったく同じ書き方が使えます。ここを知っているかどうかで精度が決まります。

| 演算子 | 意味 | 例 |
|---|---|---|
| `from:` | 差出人 | `from:info@school.example` |
| `to:` | 宛先 | `to:me` |
| `subject:` | 件名に含む | `subject:請求` |
| `label:` | ラベル付き | `label:仕事` |
| `-label:` | そのラベルを除く | `-label:処理済み` |
| `is:unread` | 未読 | `is:unread` |
| `is:starred` | スター付き | `is:starred` |
| `has:attachment` | 添付あり | `has:attachment` |
| `newer_than:` | 直近◯日 | `newer_than:7d` |
| `older_than:` | ◯日より前 | `older_than:30d` |
| `in:inbox` | 受信トレイ内 | `in:inbox` |
| `filename:pdf` | 添付の種類 | `filename:pdf` |
| `(A OR B)` | どちらか | `(subject:請求 OR subject:見積)` |
| `"完全一致"` | フレーズ検索 | `"納品完了のお知らせ"` |

これらは**組み合わせて使えます**。実際の検索条件はこんな形になります。

```text
is:unread newer_than:14d (from:school.example OR subject:お知らせ) -label:学校
```

「未読・直近2週間・学校からかお知らせ系・まだ学校ラベルが付いていないもの」という意味です。

## コード全文

```javascript
// ===== 設定 =====
const RULES = [
  { query: 'is:unread newer_than:14d (from:school.example OR subject:(学校 OR 保護者))', label: '学校' },
  { query: 'is:unread newer_than:14d (subject:(請求 OR 見積 OR 納品))',                  label: '仕事/請求' },
  { query: 'is:unread newer_than:14d (subject:(セール OR クーポン OR キャンペーン))',      label: '広告' }
];
const MAX_THREADS   = 50;    // 1回に処理する上限
const MARK_AS_READ  = false; // trueにするとラベル付与と同時に既読にする
const ARCHIVE       = false; // trueにすると受信トレイから外す

/** ルールに沿って未読メールを仕分ける */
function labelUnreadMails() {
  RULES.forEach(function (rule) {
    const label = getOrCreateLabel_(rule.label);
    // すでにそのラベルが付いているものは除外する
    const query = rule.query + ' -label:"' + rule.label + '"';
    const threads = GmailApp.search(query, 0, MAX_THREADS);

    if (threads.length === 0) {
      console.log('[' + rule.label + '] 対象なし');
      return;
    }

    // 1件ずつよりまとめて処理するほうが速い
    label.addToThreads(threads);
    if (MARK_AS_READ) GmailApp.markThreadsRead(threads);
    if (ARCHIVE)      GmailApp.moveThreadsToArchive(threads);

    console.log('[' + rule.label + '] ' + threads.length + '件にラベルを付けました');
  });
}

/** ラベルを取得。なければ作る（親子ラベルもこの書き方でOK） */
function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

/** 15分おきのトリガーを作る（1回だけ実行） */
function createLabelTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'labelUnreadMails') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('labelUnreadMails').timeBased().everyMinutes(15).create();
  console.log('15分おきのトリガーを作成しました');
}
```

## 動かす手順

1. `RULES` の中身を、自分の受信箱に合わせて書き換える
2. `labelUnreadMails` を手動で実行し、権限を許可する
3. ログを見て、意図した件数になっているか確認する
4. 問題なければ `createLabelTrigger` を1回だけ実行

**いきなりトリガーで回さないでください。**条件が広すぎると、大量のメールに一気にラベルが付いてしまいます。最初は `MAX_THREADS` を5くらいにして、様子を見ながら広げるのが安全です。

## コードのポイント

### スレッドとメッセージの違い

Gmailは「スレッド（会話）」の単位でまとまっています。GASでも2つの単位があります。

| 対象 | 取得方法 | ラベル付与 |
|---|---|---|
| スレッド（会話全体） | `GmailApp.search()` | できる |
| メッセージ（1通） | `thread.getMessages()` | **できない** |

**ラベルはスレッド単位でしか付けられません。**1通だけにラベルを付けたい、というのはGmailの仕様上できないので、そこは割り切りが必要です。

### まとめて処理する

`label.addToThreads(threads)` のように**配列をまとめて渡せる**メソッドがあります。1件ずつ `thread.addLabel(label)` を呼ぶより明らかに速く、実行時間の節約になります。既読化（`markThreadsRead`）やアーカイブ（`moveThreadsToArchive`）も同じです。

### 親子ラベルを作る

`仕事/請求` のように `/` で区切った名前を渡すと、Gmail上では「仕事」の下に「請求」がぶら下がった**入れ子のラベル**になります。数が増えてきたらこの形にすると受信箱が整理されます。

### 「すでに付いているものは除く」を必ず入れる

コードでは検索条件の末尾に `-label:"ラベル名"` を足しています。これがないと、毎回同じスレッドを処理し続けて無駄になります。ラベル名に半角スペースや `/` が入る場合は、`"` で囲むのを忘れずに。

## 応用：仕分けと同時にスプレッドシートへ記録する

「いつ・どんなメールが来たか」を記録しておくと、あとで見返せます。

```javascript
function labelAndLog() {
  const sheet = SpreadsheetApp.openById('スプレッドシートのID').getSheetByName('メールログ');
  const label = getOrCreateLabel_('仕事/請求');
  const threads = GmailApp.search('is:unread newer_than:7d subject:請求 -label:"仕事/請求"', 0, 20);
  if (threads.length === 0) return;

  const rows = threads.map(function (t) {
    const m = t.getMessages()[0];
    return [m.getDate(), m.getFrom(), m.getSubject(), t.getPermalink()];
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
  label.addToThreads(threads);
  console.log(rows.length + '件を記録しました');
}
```

`getPermalink()` でそのスレッドへの直リンクが取れるので、シートから1クリックでメールを開けます。

## よくあるエラーと対処

### 大量のメールにラベルが付いてしまった

条件が広すぎました。慌てず、Gmailの検索窓で `label:付けてしまったラベル名` と入力し、全選択して「ラベルを削除」で戻せます。**この復旧手順があるので、テストは怖がらなくて大丈夫**です。

### 「Service invoked too many times」が出る

1日の呼び出し上限に達しています。トリガーの間隔を長く（15分→1時間）し、`MAX_THREADS` を小さくしてください。

### 実行が6分で止まる

`MAX_THREADS` を下げます。50件でも通常は数秒ですが、スレッドあたりのメッセージが多いと重くなります。

### ラベルが作られない

ラベル名に使えない文字（先頭・末尾のスペースなど）が入っていないか確認してください。また `getUserLabelByName` は**完全一致**なので、親子ラベルは `仕事/請求` とフルパスで指定します。

### 検索結果が0件になる

まずGmailの検索窓に同じ条件を貼って試してください。**窓で0件なら、コードでも0件**です。ここで条件を詰めてからコードに持っていくのが、いちばん早い作り方です。

## 私の運用（看護師＋子育て＋副業）

実際に使っているルールは、シンプルに3つだけです。

- **学校・保育園**：差出人ドメインで拾う。見落とすと本当に困るので最優先
- **お金まわり**：件名に請求・見積・入金を含むもの
- **広告**：セール・クーポン系。ラベルを付けて**同時にアーカイブ**（受信トレイから消す）

3つ目が地味に効きました。受信トレイに残るのが「自分に関係あるものだけ」になり、夜勤明けの寝ぼけた頭でも見落とさなくなりました。

## まとめ

- `GmailApp.search()` はGmailの検索窓と**同じ書き方**が使える
- 条件は**まず検索窓で試してから**コードに移す
- ラベルは**スレッド単位**。1通だけには付けられない
- `addToThreads` で**まとめて処理**すると速い
- 検索条件に `-label:"…"` を入れて、処理済みを除外する
- 広すぎる条件は事故のもと。最初は件数を絞って試す

受信箱の整理は、一度仕組みにしてしまえば毎日勝手に片付きます。まずは「見落とすと困るメール」1種類から始めてみてください。

## 関連記事

- [Gmail予約メールをGoogleカレンダーに自動登録する仕組み｜GASで手作業ゼロに](/blog/gas-gmail-to-calendar/)
- [GASよく出るエラー10選と解決コード集｜辞書代わりに使える完全版](/blog/gas-error-exception/)
- [GASトリガー設定完全ガイド｜画像付き手順と失敗しないコツ2026](/blog/gas-trigger-setup/)

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。
