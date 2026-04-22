---
title: "編集日時を自動記録するタイムスタンプGAS"
description: "スプレッドシートの編集日時をonEditで自動記録する方法を、看護師ママがやさしく解説。「誰がいつ更新したか」をスッと残せる仕組みを作りましょう。"
pubDate: "2026-05-12T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","timestamp","onEdit"]
tagNames: ["GAS","タイムスタンプ","onEdit"]
readingTime: 5
keywords: ["GAS タイムスタンプ 自動","GAS onEdit","スプレッドシート 編集日時 自動"]
---

# 編集日時を自動記録するタイムスタンプGAS

## こんな悩みありませんか？

- 「この行、最後にいつ更新したっけ？」がいつも分からない
- 共有シートで誰がどの行を触ったか追えない
- 手で日付を打つと、打ち忘れ・打ち間違いが起きる

私も家族の持ち物チェック表で「上靴、洗ったのいつ？」問題に何度も直面しました。
今日は **スプシの編集日時を自動記録するタイムスタンプGAS** を、onEditトリガー一本で作ります。書き換えた瞬間にそっと日時が入る、やさしい仕組みです。

## 自動タイムスタンプの全体像

使うのは **`onEdit(e)` シンプルトリガー**。スプシのセルが編集されたときに自動で発火する仕組みです。

1. 編集されたセルの場所を取得
2. 対象列だったら、同じ行の別列に「今」の日時を書き込む
3. ヘッダ行や対象外列では何もしない

「シンプルトリガー」は設定不要で、関数名を `onEdit` にするだけで自動的に動きます。**楽ちんだけど、制限付き**（後述）なので注意しましょう。

## ポイント1：最小構成のonEdit

まずは1列だけ、動作確認用のシンプル版から。

```javascript
// B列が編集されたら、C列に日時を入れる疑似コード
function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== '持ち物') return; // シートを限定
  const col = e.range.getColumn();
  const row = e.range.getRow();
  if (col !== 2) return;      // B列だけ
  if (row === 1) return;      // ヘッダ行は無視

  const stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  sheet.getRange(row, 3).setValue(stamp); // C列に書き込み
}
```

ポイントは **シート名で絞る** こと。スプシ全体に適用すると、他のシートまで余計な日時が付いてしまいます。

## ポイント2：複数列に対応する

実運用では「B列かD列が編集されたらE列に日時」のように **複数列を監視** したくなります。

```javascript
function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== '勤務表') return;
  const watchCols = [2, 4];       // B列・D列
  const stampCol  = 5;            // E列に記録
  const col = e.range.getColumn();
  const row = e.range.getRow();
  if (watchCols.indexOf(col) === -1) return;
  if (row === 1) return;

  const stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  sheet.getRange(row, stampCol).setValue(stamp);
}
```

監視列を配列で持っておくと、後で増やすときもラク。看護師シフト表のように「出勤チェック」と「退勤チェック」が別列にある場合にぴったりです。

## ポイント3：空白に戻したら日時も消す

「チェックを外したら日時も消えてほしい」というケースは多いです。`e.value` で編集後の値が分かります。

```javascript
if (e.value === undefined || e.value === '') {
  sheet.getRange(row, stampCol).clearContent();
  return;
}
```

これを条件分岐に足すだけで、**消したら消える・入れたら日時** という自然な挙動に。家族の持ち物表で「持って帰った=チェックを外す」みたいな運用にも馴染みます。

## 応用：編集者の名前も一緒に残す

誰が編集したか残したい場合、`Session.getActiveUser().getEmail()` で取得できます（同じドメインなど条件あり）。

```javascript
const email = Session.getActiveUser().getEmail();
sheet.getRange(row, stampCol + 1).setValue(email);
```

ただし **シンプルトリガーの制限** として、他ユーザーの情報が取れなかったり、権限を求めるAPIが動かないことがあります。どうしても必要なときは、インストーラブルトリガー（手動で設定するトリガー）に切り替えましょう。

## 注意点：上書きが気になるときの一工夫

`setValue` はセルをそのまま上書きします。既に値があるのに上書きしたくないときは、条件分岐を入れます。

```javascript
const target = sheet.getRange(row, stampCol);
if (target.getValue() !== '') return; // 既に日時があればスキップ
target.setValue(stamp);
```

「最初に書いた時刻だけを残したい」履歴型の運用にも、「毎回更新したい」最新型の運用にも、お好みでどうぞ。

## まとめ

タイムスタンプ自動化は、GAS初心者が最初に作ると効果を感じやすいレシピです。

- `onEdit(e)` でセル編集をキャッチ
- シート名と列でしっかり絞る
- 空欄時のクリアや、上書き防止も忘れずに

「いつ更新したっけ？」の一言が消えるだけで、家族LINEも職場チャットも一段と静かになります。まずは1つのシートから、そっと仕込んでみてください。

## 関連記事

- CSVインポートをGASで自動化する3手順
- スプシ自動フィルタをGASで3秒セット
- 条件付き書式をGASで一括設定する10例

---

**【この記事を書いた人：みっちゃんママ】**
三姉妹の母で現役ナース。病院勤務のかたわら、Google Apps Scriptで家計簿・副業管理・家族スケジュールを自動化している副業GASプログラマー。「忙しいママでも、コード3行で生活が軽くなる」をモットーに、等身大のレシピを発信中。
