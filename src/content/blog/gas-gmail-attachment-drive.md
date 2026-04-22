---
title: "Gmail添付ファイルをGoogleドライブ自動保存する10行スクリプト"
description: "請求書や明細PDFをGmailから手作業でドライブに保存していませんか？GAS（Google Apps Script）で10行書くだけで、添付ファイルを自動的にDriveへ振り分け保存するレシピをご紹介します。"
pubDate: "2026-04-30T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas","gmail","drive","attachment"]
tagNames: ["GAS","Gmail","Drive","添付ファイル"]
readingTime: 10
---

## こんな悩みありませんか？

「クレカの明細PDFが毎月3社分届くのに、手動で保存するのを忘れて確定申告前に泣く」
「仕入れ先からの納品書PDFをGmailで受け取ったあと、毎回Driveの該当フォルダにドラッグするのが面倒」
「子どもの習い事の月謝明細、気づいたら受信箱に埋もれて見つからない」

こんにちは、現役ナース＆副業GASユーザーの凛です。私はAmazonで物販もしているので、毎月十数件の請求書・納品書・明細PDFがGmailに届きます。以前は週末にまとめて手動でDriveに振り分けていたのですが、これが地味に1時間以上かかる苦行でした。

そこで組んだのが **GASでGmail添付ファイルをGoogle Drive へ自動保存する10行スクリプト**です。結論から言うと、導入してから確定申告前の書類探しがゼロ分になりました。本記事では「GAS Gmail 添付 保存」で検索してたどり着いた方が、そのままコピペして使えるレシピを紹介します。

## 自動保存の全体像

まずはGAS初学者でも迷わないよう、仕組みを図解的に整理します。

1. Gmailで「特定のラベル」や「添付ファイルあり」のメールを検索
2. それぞれのメッセージから添付ファイルを取り出す
3. 指定したDriveのフォルダに保存する
4. 処理済みのメールには「Drive保存済み」ラベルをつけて重複防止
5. GASのトリガーで1時間おきなどに自動実行

ここでのキモは「二重保存を防ぐ仕組み」です。ラベルでの状態管理をしておかないと、実行するたびに同じPDFが何枚もDriveに重複して保存されます。この事故、一度やると整理に数時間かかるので要注意です。

### 事前準備

コードを書く前に、Google Drive 側で以下を用意してください。

- 添付ファイルを保存したい親フォルダを作る（例：`Gmail添付自動保存`）
- そのフォルダを開き、URLから **フォルダID** をメモしておく
  （URLの `/folders/` の後ろの文字列がID）
- Gmailで、自動保存したいメールに付くラベルを決める（例：`請求書`）

この3つが揃えば、あとはGASにコピペするだけです。

## 結論：10行で動く自動保存スクリプト

こちらが本レシピの本命コードです。`FOLDER_ID` と `TARGET_LABEL` だけ書き換えれば、今日から動きます。

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

コンパクトですが、この10行で以下すべてをこなしてくれます。

- `DriveApp.getFolderById()` で保存先フォルダを取得
- `GmailApp.search()` で対象メールを検索（最大20スレッド）
- 各メッセージの全添付ファイルをフォルダに保存
- 処理したスレッドには `Drive保存済み` ラベルを付与

初回実行時は、DriveとGmailへのアクセス許可を求められます。Googleアカウントのアクセス権をスクリプトに与えるイメージですので、自分の GAS プロジェクトで使う分には問題なく進めて大丈夫です。

## 運用で外せない3つのポイント

このコード、そのままでも動きますが、実運用するなら以下3点は必ず押さえてください。私が実際に運用して「ここ大事だった」と痛感したポイントです。

### ポイント1：年月別にサブフォルダを自動作成する

添付ファイルを1つのフォルダに全部放り込むと、結局あとで探すのが大変になります。**年月別のサブフォルダに振り分けるだけで、資料の発見効率が段違い**になります。

```javascript
function getMonthFolder(parent) {
  const name = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM');
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
```

この関数を呼び出して、`folder.createFile(att)` の `folder` を `getMonthFolder(folder)` に差し替えるだけ。`2026-04` みたいな命名で、月別に自動仕分けされるようになります。確定申告のとき、このフォルダ構成が本当に神になります。

### ポイント2：ファイル名に送信元・件名を含める

添付ファイルの元のファイル名が `invoice.pdf` のような味気ないものだと、後から何の請求書か分からなくなります。保存するときにファイル名を加工しておきましょう。

```javascript
const from = msg.getFrom().replace(/[<>]/g, '').split(' ')[0];
const date = Utilities.formatDate(msg.getDate(), 'Asia/Tokyo', 'yyyyMMdd');
const newName = date + '_' + from + '_' + att.getName();
folder.createFile(att.copyBlob().setName(newName));
```

これで保存時のファイル名が `20260420_sender@example.com_invoice.pdf` のように情報密度の高い名前になります。後からDrive検索をかけたときの発見しやすさが別物になりますよ。

### ポイント3：拡張子でフィルタする

メールに画像が紛れ込んでいると、不要なPNGやJPEGまでDriveにたまっていきます。欲しい拡張子だけに絞りましょう。

```javascript
const okExt = ['pdf', 'csv', 'xlsx'];
const ext = att.getName().split('.').pop().toLowerCase();
if (okExt.indexOf(ext) === -1) return;
```

PDFだけ保存したい、CSVもほしい、という運用に応じて `okExt` の中身を変えるだけ。Gmail側の署名画像まで全部保存されて困っていた初期の私を、この3行が救ってくれました。

## 応用：スプレッドシートに保存ログを残す

ただDriveに保存するだけでは「いつ、どのメールから、どのファイルを保存したか」が追跡できません。スプレッドシートに保存ログを残しておくと、確定申告や経理処理のときに非常に役立ちます。

```javascript
const sheet = SpreadsheetApp.openById('ログ用シートID').getSheetByName('log');
sheet.appendRow([new Date(), msg.getFrom(), msg.getSubject(), newName]);
```

このログ行を先ほどのコードの `folder.createFile(...)` の直後に追加するだけ。1年分ためると、どの取引先から何月に何通の請求書が来たかが一目瞭然になります。

さらに応用するなら、保存したDriveファイルのURLもログに残しましょう。

```javascript
const file = folder.createFile(att.copyBlob().setName(newName));
sheet.appendRow([new Date(), msg.getFrom(), msg.getSubject(), file.getUrl()]);
```

シート上からワンクリックで該当ファイルに飛べるので、在宅ワークで書類を探す時間がゼロに近づきます。

## トリガー設定とよくあるトラブル

最後に、定時実行の設定とハマりどころをまとめます。

### トリガー設定

GASエディタ左の時計マークから新規トリガーを追加。

- 関数：`saveAttachments`
- イベントのソース：時間主導型
- タイプ：時間ベースのタイマー
- 間隔：1時間おき

メールの件数が多い場合は30分おきでもOKですが、ほとんどのケースで1時間おきで十分です。

### よくあるトラブル

- **「Gmailのクォータを超えました」エラー** → 1回で処理するスレッド数を `0, 20` から `0, 10` に減らしましょう。
- **「ファイル名が重複する」** → ファイル名加工（ポイント2）を入れてください。
- **「保存されない」** → 検索クエリが合っているかを、まずGmail検索窓で試してから貼り付けるのがおすすめです。

## まとめ

GASでGmailの添付ファイルをGoogle Driveに自動保存するレシピを紹介しました。

- 10行コードで最低限の動作はすぐ作れる
- 年月フォルダ＋ファイル名加工＋拡張子フィルタで運用レベルに引き上げる
- スプレッドシートにログを残せば確定申告でも大活躍
- トリガーは1時間おきで十分

私自身、これを組んでから毎月の経理書類整理時間が約1時間→ほぼ0分に短縮できました。副業や個人事業で書類管理に消耗している方こそ、真っ先に取り入れてほしいレシピです。「GAS Gmail 添付 保存」の検索結果から来てくれた方、ぜひ試してみてくださいね。

---

### この記事を書いた人：凛
現役ナース×副業Webエンジニア。夜勤の合間にGASを学び、Gmail・スプレッドシート・カレンダーの自動化レシピを公開中。プログラミング完全未経験から独学で実務に使えるレベルまで到達した経験をベースに、「コピペで動く」をモットーに情報発信しています。
