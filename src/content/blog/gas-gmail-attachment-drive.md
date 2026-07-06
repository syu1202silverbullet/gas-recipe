---
title: "Gmail添付ファイルをGoogleドライブ自動保存する10行スクリプト"
description: "請求書や明細PDFをGmailから手作業でドライブに保存していませんか？GAS（Google Apps Script）で10行書くだけで、添付ファイルを自動的にDriveへ振り分け保存するレシピをご紹介します。"
pubDate: "2026-05-26T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas","gmail","drive","attachment"]
tagNames: ["GAS","Gmail","Drive","添付ファイル"]
readingTime: 10
---

こんにちは、凛です。2人の子どもを育てながら、看護師とGAS副業を両立しています。

今日はちょっと日記みたいな書き方をします。私が「Gmailの添付ファイルを手で保存するのは、もうやめよう」と決めた日から、10行のスクリプトに落ち着くまでの記録です。同じ作業に毎週消耗している方の参考になればうれしいです。

## きっかけは、ある週末の「振り分け1時間」

私は副業でネットショップ運営もしているので、毎月十数件の請求書・納品書・明細PDFがGmailに届きます。以前の運用はシンプルで、「週末にまとめてDriveへ手動で振り分ける」。ただこれが、地味に1時間以上かかる苦行でした。

しかもクレカの明細PDFは毎月3社分。保存し忘れたまま受信箱に埋もれて、確定申告前に「あの明細、どこ……」と検索地獄になったことも一度や二度ではありません。子どもの習い事の月謝明細にいたっては、探すのを途中で諦めかけたことすらあります。

ある週末、いつものように納品書PDFをDriveの該当フォルダへドラッグしながら、ふと手が止まりました。この作業、対象のメールも保存先も毎回同じなんですよね。毎回同じなら、GASに任せられるはず。そう思ったのが始まりでした。

## コードの前に、紙に書いた「処理の流れ」

いきなり書き始めず、最初に処理の流れを整理しました。

1. Gmailで「特定のラベル」や「添付ファイルあり」のメールを検索
2. それぞれのメッセージから添付ファイルを取り出す
3. 指定したDriveのフォルダに保存する
4. 処理済みのメールには「Drive保存済み」ラベルをつけて重複防止
5. GASのトリガーで1時間おきなどに自動実行

キモは4番、「二重保存を防ぐ仕組み」です。ラベルで状態管理をしておかないと、実行するたびに同じPDFが何枚もDriveに重複して保存されます。実は私、この事故を一度やらかしまして、整理に数時間かかりました。ここだけは先に設計しておいて本当によかったと思っています。

### 書き始める前に用意したもの

コードの前に、Google Drive側の準備が3つだけあります。

まず、添付ファイルを保存したい親フォルダを作ります（例：`Gmail添付自動保存`）。次にそのフォルダを開いて、URLの `/folders/` の後ろの文字列＝**フォルダID**をメモ。最後にGmail側で、自動保存したいメールに付けるラベルを決めます（例：`請求書`）。準備はこれだけ。あとはGASにコピペするだけです。

## その日の夜に書き上げた10行

子どもを寝かしつけたあとに書いたのが、このコードです。`FOLDER_ID` と `TARGET_LABEL` だけ書き換えれば、今日から動きます。

```javascript
function saveAttachments() {
  const FOLDER_ID = 'ここにDriveフォルダIDを貼る';
  const TARGET_LABEL = '請求書';
  const DONE_LABEL = 'Drive保存済み';
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const done = GmailApp.getUserLabelByName(DONE_LABEL) || GmailApp.createLabel(DONE_LABEL);
  const threads = GmailApp.search('label:' + TARGET_LABEL + ' -label:' + DONE_LABEL + ' has:attachment', 0, 20);
  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(msg) {
      msg.getAttachments().forEach(function(att) { folder.createFile(att); });
    });
    thread.addLabel(done);
  });
}
```

コンパクトですが、やっていることは盛りだくさんです。`DriveApp.getFolderById()` で保存先フォルダを取得し、`GmailApp.search()` で対象メールを検索（最大20スレッド）、各メッセージの全添付ファイルをフォルダに保存して、処理したスレッドには `Drive保存済み` ラベルを付与する。この一連がたった10行に収まっています。

初回実行時は、DriveとGmailへのアクセス許可を求められます。Googleアカウントのアクセス権をスクリプトに与えるイメージなので、自分のGASプロジェクトで使う分にはそのまま進めて大丈夫です。

## 動かしてみて、つまずいたこと3つ

「動いた！」と喜んだのも束の間、最初の数週間で「ここは直さないとダメだ」と痛感した点が3つありました。時系列順に紹介します。どれも実運用では外せないポイントです。

### つまずき1：フォルダの中がカオスになる → 年月フォルダで解決

添付ファイルを1つのフォルダに全部放り込むと、結局あとで探すのが大変になります。**年月別のサブフォルダに振り分けるだけで、資料の発見効率が段違い**になりました。

```javascript
function getMonthFolder(parent) {
  const name = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM');
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
```

この関数を呼び出して、`folder.createFile(att)` の `folder` を `getMonthFolder(folder)` に差し替えるだけ。`2026-04` みたいな命名で、月別に自動仕分けされるようになります。確定申告のとき、このフォルダ構成が本当に神になります。

### つまずき2：「invoice.pdf」が並んで区別がつかない → ファイル名加工で解決

添付ファイルの元の名前が `invoice.pdf` のような味気ないものだと、後から何の請求書か分からなくなります。同じ名前の添付が複数届けば、Driveに同名ファイルがずらっと並ぶ事態に。保存するときにファイル名を加工しておきましょう。

```javascript
const from = msg.getFrom().replace(/[<>]/g, '').split(' ')[0];
const date = Utilities.formatDate(msg.getDate(), 'Asia/Tokyo', 'yyyyMMdd');
const newName = date + '_' + from + '_' + att.getName();
folder.createFile(att.copyBlob().setName(newName));
```

これで保存時のファイル名が `20260420_sender@example.com_invoice.pdf` のように、情報密度の高い名前になります。後からDrive検索をかけたときの発見しやすさが別物になりますよ。

### つまずき3：署名の画像まで保存される → 拡張子フィルタで解決

メールの署名に含まれる画像や、Gmailの内部ヘッダー画像なども「添付ファイル」として検出されることがあります。放っておくと、不要なPNGやJPEGがDriveにどんどんたまっていく。欲しい拡張子だけに絞りましょう。

```javascript
const okExt = ['pdf', 'csv', 'xlsx'];
const ext = att.getName().split('.').pop().toLowerCase();
if (okExt.indexOf(ext) === -1) return;
```

PDFだけ保存したい、CSVもほしい、という運用に応じて `okExt` の中身を変えるだけ。署名画像まで全部保存されて困っていた初期の私を、この3行が救ってくれました。

## 翌週に足したもの：スプレッドシートの保存ログ

運用が安定してくると、今度は「いつ、どのメールから、どのファイルを保存したか」を追いたくなってきます。ただDriveに保存するだけでは、この追跡ができないんですね。スプレッドシートに保存ログを残しておくと、確定申告や経理処理のときに非常に役立ちます。

```javascript
const sheet = SpreadsheetApp.openById('ログ用シートID').getSheetByName('log');
sheet.appendRow([new Date(), msg.getFrom(), msg.getSubject(), newName]);
```

このログ行を、先ほどのコードの `folder.createFile(...)` の直後に追加するだけ。1年分ためると、どの取引先から何月に何通の請求書が来たかが一目瞭然になります。

さらに欲を出して、保存したDriveファイルのURLもログに残すようにしました。

```javascript
const file = folder.createFile(att.copyBlob().setName(newName));
sheet.appendRow([new Date(), msg.getFrom(), msg.getSubject(), file.getUrl()]);
```

シート上からワンクリックで該当ファイルに飛べるので、在宅ワークで書類を探す時間がゼロに近づきます。

## 最後の仕上げ：トリガーで完全自動化

ここまで来たら、あとは定時実行の設定だけです。GASエディタ左の時計マークから新規トリガーを追加します。関数は `saveAttachments`、イベントのソースは「時間主導型」、タイプは「時間ベースのタイマー」、間隔は1時間おき。メールの件数が多い場合は30分おきでもOKですが、ほとんどのケースで1時間おきで十分です。

運用を始めてから、たまに出くわしたトラブルも書き添えておきます。「Gmailのクォータを超えました」エラーが出たら、1回で処理するスレッド数を `0, 20` から `0, 10` に減らしてください。ファイル名が重複するなら、つまずき2のファイル名加工を。そもそも保存されないときは、検索クエリが合っているかを、まずGmailの検索窓で試してから貼り付けるのがおすすめです。

## あれから：書類探し「ゼロ分」の生活

このスクリプトを組んでから、毎月の経理書類整理は約1時間→ほぼ0分になりました。確定申告前の書類探しも、年月フォルダと保存ログのおかげで実質ゼロ分。数字にすると小さく見えますが、「週末の1時間」が毎月戻ってくるのは、子育てと副業を並行している身には本当に大きいです。

副業や個人事業で書類管理に消耗している方こそ、真っ先に取り入れてほしいレシピです。まずは10行の基本コードだけでも動かしてみてください。ラベルを付けたメールの添付が、何もしていないのにDriveへ現れた瞬間、ちょっと感動しますから。

## 関連記事

- [確定申告レシートをOCR記帳するGAS実装](/blog/gas-kakutei-receipt-ocr/) — 書類整理の完全自動化
- [GASでCSVをスプシに取り込む3手順](/blog/gas-sheet-import-csv/) — ダウンロードしたCSVの自動処理
- [GASでGmail自動返信を5分で作る最短レシピ](/blog/gas-gmail-auto-reply/) — Gmail自動化の入門

---

### この記事を書いた人：凛
2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。掲載コードは構文・API仕様・ロジックを確認のうえ載せていますが、お使いの環境に合わせて調整してください。
