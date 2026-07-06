---
title: "Gmail条件転送をGASで自動化する完全手順｜特定キーワード・送信元別の振り分け"
description: "Gmail条件転送をGASで自動化する手順を解説。送信元・キーワード・添付ファイル有無で振り分ける柔軟な転送ロジックと、二重転送を防ぐラベル管理まで実装します。"
pubDate: "2026-06-11T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "gmail"
categoryName: "Gmail自動化"
tagSlugs: ["gas","gmail","forward","automation"]
tagNames: ["GAS","Gmail","転送","自動化"]
readingTime: 8
keywords: ["GAS Gmail 自動転送","Gmail 条件転送 GAS"]
---

こんにちは、凛です。日勤と夜勤の合間に、コツコツGASで副業を続けている2児の母です。

今日は最初に、私のやらかし話から始めさせてください。副業のクライアント関係のメール転送をGASで組んだばかりの頃、相手の方から「また同じメール来たよ」と連絡をもらったことがあります。15分おきに動かしていたスクリプトが、同じメールを何度も何度も転送していたんです。あのときの申し訳なさは今でも忘れられません。自動化って、便利になる前に一度は痛い目を見るものですね。

# Gmail条件転送をGASで自動化する完全手順｜特定キーワード・送信元別の振り分け

## なぜ二重転送は起きたのか

原因はシンプルで、**「このメールはもう転送した」という目印を付けていなかった**から。GASのスクリプトは律儀です。15分おきに起動するたび、条件に合うメールを見つけては、前回転送したかどうかなんてお構いなしにまた転送します。人間なら「さっき送ったよね」と気づきますが、プログラムは覚えていてくれません。

そもそも私がGASで転送を組もうと思ったのは、Gmail標準の転送機能に限界を感じたからでした。副業のクライアントメールを夫にも共有したい場面があったのですが、標準のフィルター転送だと「このドメインからのメールで、件名に"請求"を含むもの」という複合条件が設定できないんです。届いた大事なメールを家族や同僚に共有したいのに、条件が細かく組めなくてもどかしい。同じ思いをした方、いらっしゃるかもしれません。

GASなら **送信元×件名×本文キーワード×添付の有無** を自由に組み合わせられます。処理の流れとしては、`GmailApp.search()` で対象メールを検索し、本文や送信元で詳細条件をチェックして、条件に合えば `msg.forward()` で転送する。そして最後が肝心で、**転送済みラベルを付けて二重転送を防ぐ**。これを15分おきのトリガーで回します。冒頭の失敗は、この最後のひと手間をサボった結果でした。

## 解決策：ラベル管理込みの転送スクリプト

失敗を踏まえて組み直したのが、以下のコードです。基本の `autoForward` に加えて、送信元ドメインで転送先を振り分ける版、添付ファイル付きだけを転送する版も入れてあります。構文チェックのうえで掲載していますが、アドレスやラベル名はご自身の環境に合わせて書き換えてください。

```javascript
// ============================================================
// GAS Gmail条件転送 完全版
// 本記事のコードは静的検証済みです
// ============================================================

// ===== 設定値（ここを自分の環境に合わせて変更する） =====
var FORWARD_CONFIG = {
  SEARCH_QUERY: 'is:unread',          // 転送対象を絞るGmail検索クエリ
  FORWARD_TO: 'team@example.com',     // 転送先のメールアドレス
  LABEL_DONE: '転送済み',              // 処理済みに付けるラベル名
  KEYWORD: '注文',                     // 本文に含まれるキーワード（空にすると全メール転送）
  MAX_THREADS: 20                      // 1回の処理で検索するスレッド数の上限
};

/**
 * 転送済みラベルを取得する（なければ新しく作る）
 * @param {string} labelName - ラベル名
 * @return {GmailLabel} ラベルオブジェクト
 */
function getOrCreateLabel(labelName) {
  var label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
    Logger.log('ラベルを作成しました: ' + labelName);
  }
  return label;
}

/**
 * メインの転送処理：キーワードで条件転送する
 * 15分おきのトリガーで実行する
 */
function autoForward() {
  // 転送済みラベルを取得（または作成）する
  var label = getOrCreateLabel(FORWARD_CONFIG.LABEL_DONE);

  // 未読かつ転送済みラベルが付いていないメールを検索する
  var query = FORWARD_CONFIG.SEARCH_QUERY + ' -label:' + FORWARD_CONFIG.LABEL_DONE;
  var threads = GmailApp.search(query, 0, FORWARD_CONFIG.MAX_THREADS);

  var forwardCount = 0;
  var skipCount = 0;

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();

    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];

      // 転送条件チェック：本文にキーワードが含まれるか
      var body = msg.getBody();
      var shouldForward = (FORWARD_CONFIG.KEYWORD === '')
        || body.includes(FORWARD_CONFIG.KEYWORD);

      if (shouldForward) {
        try {
          msg.forward(FORWARD_CONFIG.FORWARD_TO);
          forwardCount++;
          Logger.log('転送完了: ' + msg.getSubject());
        } catch (e) {
          Logger.log('転送失敗: ' + msg.getSubject() + ' / ' + e.message);
        }
      } else {
        skipCount++;
      }
    }

    // スレッドに転送済みラベルを付ける（二重転送防止）
    thread.addLabel(label);
    Utilities.sleep(200);  // API負荷軽減のため少し待つ
  }

  Logger.log('転送完了: ' + forwardCount + '件 / スキップ: ' + skipCount + '件');
}

/**
 * 送信元ドメインによって転送先を振り分ける（応用版）
 */
function autoForwardByDomain() {
  // 送信元ドメイン → 転送先 の対応表
  var DOMAIN_MAP = [
    { domain: '@partner-a.com', forwardTo: 'team-a@example.com' },
    { domain: '@partner-b.com', forwardTo: 'team-b@example.com' },
    { domain: '@client-c.com',  forwardTo: 'me@example.com' }
  ];

  var label = getOrCreateLabel(FORWARD_CONFIG.LABEL_DONE);
  var query = 'is:unread -label:' + FORWARD_CONFIG.LABEL_DONE;
  var threads = GmailApp.search(query, 0, FORWARD_CONFIG.MAX_THREADS);

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();

    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      var from = msg.getFrom();

      // 送信元ドメインを確認して転送先を決める
      for (var k = 0; k < DOMAIN_MAP.length; k++) {
        if (from.includes(DOMAIN_MAP[k].domain)) {
          try {
            msg.forward(DOMAIN_MAP[k].forwardTo);
            Logger.log('転送: ' + from + ' → ' + DOMAIN_MAP[k].forwardTo);
          } catch (e) {
            Logger.log('転送失敗: ' + e.message);
          }
          break;  // マッチした時点でループを抜ける
        }
      }
    }

    // 転送済みラベルを付けて二重転送を防ぐ
    thread.addLabel(label);
  }
}

/**
 * 添付ファイル付きメールだけを転送する（応用版）
 * 重要な書類・請求書などを別アドレスに自動保存する
 */
function autoForwardWithAttachment() {
  var ARCHIVE_ADDRESS = 'archive@example.com';  // アーカイブ用メールアドレス

  var label = getOrCreateLabel('添付転送済み');
  var query = 'is:unread has:attachment -label:添付転送済み';
  var threads = GmailApp.search(query, 0, FORWARD_CONFIG.MAX_THREADS);

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();

    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      var attachments = msg.getAttachments();

      if (attachments.length > 0) {
        // 転送先には添付ファイルと件名・送信元情報を付ける
        var subject = '【添付転送】' + msg.getSubject();
        var body = '送信元: ' + msg.getFrom() + '\n'
                 + '受信日時: ' + msg.getDate() + '\n\n'
                 + '---（本文）---\n\n'
                 + msg.getPlainBody();

        GmailApp.sendEmail(ARCHIVE_ADDRESS, subject, body, {
          attachments: attachments
        });
        Logger.log('添付転送完了: ' + msg.getSubject() + '（添付' + attachments.length + '件）');
      }
    }

    thread.addLabel(label);
  }
}

/**
 * 転送済みラベルを全削除してリセットする（テスト用）
 * 本番運用中は使わないこと
 */
function resetForwardLabel() {
  var label = GmailApp.getUserLabelByName(FORWARD_CONFIG.LABEL_DONE);
  if (!label) {
    Logger.log('ラベルが存在しません');
    return;
  }
  var threads = label.getThreads();
  for (var i = 0; i < threads.length; i++) {
    threads[i].removeLabel(label);
  }
  Logger.log('転送済みラベルをリセットしました（' + threads.length + '件）');
}
```

### 二重転送を防ぐ仕組みはどこか

コードの中で一番大事なのは、派手なところではありません。`getOrCreateLabel` で最初に確実にラベルを用意して、処理の最後に必ず `thread.addLabel(label)` を付ける。この地味な2行です。検索クエリ側でも `-label:転送済み` で「まだラベルが付いていないもの」だけを拾うので、一度処理したスレッドは二度と転送対象になりません。

私はあの失敗以来、転送系のスクリプトを書くときは「検索でラベル除外」と「処理後にラベル付与」を絶対にセットで実装するようにしています。片方だけだと、いつか必ず穴が開きます。

### 定期実行のトリガー設定

スクリプトを保存したら、15分おきに自動で動くようトリガーを仕込みます。

1. GASエディタ左メニューの「**時計マーク（トリガー）**」をクリック
2. 「**＋ トリガーを追加**」をクリック
3. 実行する関数：**`autoForward`** を選択
4. イベントのソース：**「時間主導型」** を選択
5. 時間ベースのトリガーのタイプ：**「分ベースのタイマー」** を選択
6. 実行間隔：**「15分おき」** を選択
7. 「**保存**」をクリック
8. Googleアカウントの認証ダイアログで「許可」をクリック

いきなり本番稼働ではなく、まず `autoForward` を手動実行してログと転送先を確認してからトリガーを有効にする。この順番だけは守ってください。私のように「また同じメール来たよ」と言われる前に。

## 運用してみて変わったこと

ラベル管理込みで組み直してから、転送まわりのトラブルはぴたりと止まりました。運用の中で身についた使い分けやさじ加減も、あわせて共有しておきます。

### `msg.forward()` と `GmailApp.sendEmail()` の使い分け

`msg.forward(address)` は元のメールの形式を保ったまま転送します。一方 `GmailApp.sendEmail()` は新しいメールとして送るので、件名や本文を自由に加工できます。「添付ファイルだけ送りたい」「件名に[自動転送]と付けたい」といった加工が必要な場面では `sendEmail` のほうが柔軟です。私はクライアントからの書類転送に `sendEmail` を使って、「【自動転送・確認用】」という件名を付けています。受け取る側が「これは自動で飛んできたものだ」とひと目で分かるだけで、コミュニケーションの齟齬がぐっと減りました。

### `MAX_THREADS` は欲張らない

一度の実行で処理するスレッド数を増やしすぎると、GASの実行時間制限（6分）に引っかかって途中で止まります。Gmail APIのクォータ制限にも響きます。私は20件を上限にして、15分おきに少しずつ処理するスタイルに落ち着きました。未読が溜まっているときは `autoForward` を数回手動実行すれば解消します。急がば回れ、です。

### それでも起きるトラブルと対処

運用していて遭遇した（あるいは遭遇しかけた）トラブルも書いておきます。

まず、対策したはずの二重転送が再発するケース。だいたいは `FORWARD_CONFIG.LABEL_DONE` の値とGmail側のラベル名が微妙に食い違っています。スペルミスや全角半角の違いですね。Gmailのラベル一覧と照合して、初回実行後にラベルが実際に作成されているか目視確認すると確実です。`Logger.log` でラベル取得の成否を見るのも有効です。

次に「Service invoked too many times」エラー。Gmail APIの1日あたりの呼び出し回数制限に達したときに出ます。大量メールを一気に処理しようとすると起きやすいので、`MAX_THREADS` を減らして1回あたりの処理量を下げ、各ループに `Utilities.sleep(200)` の待機を入れる（上のコードには実装済みです）。15分おきに少量ずつ、が結局いちばん安全でした。

もうひとつ厄介なのが、転送は成功しているのに転送先に届かないパターン。これは転送先のスパムフィルターで弾かれている可能性が高いです。Gmailの自動転送は「FROM:転送者のアドレス」で届くため、フィルターに引っかかることがあるんです。転送先のスパムフォルダを確認して、`GmailApp.sendEmail()` で件名に「【GAS自動転送】」などを付けるとスパム判定を回避しやすくなります。転送先がGmailなら、受信設定で転送元アドレスを許可しておくのも手です。

## おわりに

本文キーワードで絞るなら `autoForward`、送信元ドメインで振り分けるなら `autoForwardByDomain`、添付ファイル付きだけ拾うなら `autoForwardWithAttachment`。どれを使うにしても、転送済みラベルだけは省略しないでください。私の失敗がその証人です。

Gmail標準の転送機能では物足りない、でも毎回手で転送するのはしんどい。そんな場面を静かに解決してくれる、地味だけど働き者の仕組みです。一度組んでしまえば、あとはGmailを開かなくても大事なメールが必要な人に届いている。この安心感は、組んだ人にしか分かりません。

---

## 関連記事

- [Gmail未読メールを条件検索してラベル付与するGAS](/blog/gas-gmail-search-label/)
- [GASでGmailの一斉送信を安全に実装する](/blog/gas-gmail-bulk-send/)
- [GASでGmailのメールをスプレッドシートに自動転記する](/blog/gas-gmail-to-sheet/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*掲載コードは構文チェックのうえ公開しています。実際の運用前に、ご自身の環境で必ずテスト実行してください。*
