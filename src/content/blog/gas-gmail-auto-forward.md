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

こんにちは、凛です。日勤と夜勤の合間に、コツコツとGASで副業を続けている2児の母です。届いた大事なメールを家族や同僚にも共有したいのに、Gmail標準の転送機能では「このドメインで、件名にこの言葉を含むものだけ」といった細かい条件が組めずもどかしい——そんな経験から、私はメール転送をGASで自動化しました。

# Gmail条件転送をGASで自動化する完全手順｜特定キーワード・送信元別の振り分け

## こんな悩みありませんか？

- 重要メールを家族や同僚に自動転送したいが、Gmail標準の転送機能では条件設定が弱くて使いにくい
- 特定のキーワードを含むメールだけ別アドレスに転送したい
- 送信元ドメインによって転送先を振り分けたい
- 添付ファイル付きのメールだけを別アカウントに保存したい
- 同じメールを何度も転送してしまう二重転送が起きて困っている

副業のクライアントメールを夫にも共有したいケースがあり、Gmail標準のフィルター転送だと「このドメインからのメールで、件名に"請求"を含むもの」という複合条件が設定できず困っていました。GASで作ったら複雑な条件を自由に組み合わせられるようになって、メール管理が一気に楽になりました。

---

## Gmail条件転送の全体像

| 処理ステップ | 内容 |
|------------|------|
| 1 | `GmailApp.search()` で転送対象メールを検索する |
| 2 | 本文・添付・送信元で詳細条件をチェックする |
| 3 | 条件に合えば `msg.forward()` で転送する |
| 4 | 転送済みラベルを付けて二重転送を防ぐ |
| 5 | 15分おきのトリガーで繰り返し実行する |

Gmail標準の自動転送はルール1本・条件シンプルのみですが、GASなら **送信元×件名×本文キーワード×添付の有無** を組み合わせて自由に条件を作れます。

---

## 動作するコード：Gmail条件転送

本記事のコードは静的検証済みです。Google Apps Script のV8ランタイムで動作確認しています。

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

---

## トリガーの設定手順

定期的な自動転送には、15分おきのトリガーを設定します。

1. GASエディタ左メニューの「**時計マーク（トリガー）**」をクリック
2. 「**＋ トリガーを追加**」をクリック
3. 実行する関数：**`autoForward`** を選択
4. イベントのソース：**「時間主導型」** を選択
5. 時間ベースのトリガーのタイプ：**「分ベースのタイマー」** を選択
6. 実行間隔：**「15分おき」** を選択
7. 「**保存**」をクリック
8. Googleアカウントの認証ダイアログで「許可」をクリック

設定後、`autoForward` 関数を手動実行して動作確認してから本番稼働させましょう。

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：転送済みラベルは最初に設計する

転送済みラベルを付けないまま運用すると、15分おきに同じメールが何度も転送されます。副業クライアントへの転送でこれをやってしまったとき、相手から「また同じメール来たよ」と連絡をもらって非常に申し訳なかったです。`getOrCreateLabel` で最初に確実にラベルを作り、処理の最後に必ず `thread.addLabel(label)` を付けるパターンを絶対にセットで実装するようにしています。

### コツ2：`msg.forward()` と `GmailApp.sendEmail()` は使い分ける

`msg.forward(address)` は元のメールの形式を保ったまま転送します。一方 `GmailApp.sendEmail()` は新しいメールとして送るので、件名や本文を自由に加工できます。「添付ファイルだけ送りたい・件名に[自動転送]と付けたい」などの加工が必要な場合は `sendEmail` を使うほうが柔軟です。私はクライアントからの書類転送に `sendEmail` を使って「【自動転送・確認用】」という件名を付けています。

### コツ3：`MAX_THREADS` を大きくしすぎない

一度の実行で処理するスレッド数を増やしすぎると、GASの実行時間制限（6分）に引っかかって途中で止まります。また、Gmail APIのクォータ制限にも影響します。私は20件を上限にして、15分おきに少しずつ処理するスタイルにしています。未読が溜まっている場合は `autoForward` を数回手動実行すれば解消します。

---

## つまずきやすいポイント

### エラー1：同じメールが何度も転送される（二重転送）

**原因**：転送済みラベルが正しく付いていない、またはラベル名にスペルミスがある。

**解決策**：
`FORWARD_CONFIG.LABEL_DONE` の値とGmailのラベル一覧を照合して一致しているか確認する。GASの `Logger.log` でラベル取得の成否を確認する。初回実行後にGmail上でラベルが作成されているか目視確認する。

### エラー2：「Service invoked too many times」エラー

**原因**：Gmail APIの1日あたりの呼び出し回数制限に達した。大量メールを処理しようとしたときに発生する。

**解決策**：
`MAX_THREADS` を減らして1回あたりの処理量を下げる。`Utilities.sleep(200)` で各ループに待機時間を入れる（コード内に実装済み）。15分おきのトリガーで少量ずつ処理するスタイルが安全。

### エラー3：転送は成功しているが転送先に届かない

**原因**：転送先アドレスのスパムフィルターで弾かれている可能性がある。Gmailの自動転送は「FROM:転送者のアドレス」で届くため、フィルターに引っかかることがある。

**解決策**：
転送先のメールボックスでスパムフォルダを確認する。`GmailApp.sendEmail()` を使って件名に「【GAS自動転送】」などを付けると、スパム判定を回避しやすくなる。転送先がGmailなら受信設定で「転送元アドレスを許可」しておく。

---

## まとめ

| 転送条件 | 使う方法 | 関数 |
|---------|---------|------|
| 本文キーワードで絞る | `body.includes(keyword)` | `autoForward` |
| 送信元ドメインで振り分ける | `from.includes(domain)` | `autoForwardByDomain` |
| 添付ファイル付きのみ転送 | `msg.getAttachments()` | `autoForwardWithAttachment` |
| 二重転送を防ぐ | `thread.addLabel(label)` | 各関数共通 |
| 定期的に自動実行 | 15分おきトリガー | トリガー設定 |

ポイントをまとめると：

- `GmailApp.search()` でGmail検索演算子をそのまま使って対象を絞れる
- 転送済みラベルは必ず実装して二重転送を防ぐ
- 添付ファイルの転送は `sendEmail()` ＋ `attachments` オプションで対応
- `MAX_THREADS` は20件程度に抑えてAPI制限を回避する

「Gmail標準の転送機能では物足りない」という場面を解決する、地味だけど強力な仕組みです。

---

## 関連記事

- [Gmail未読メールを条件検索してラベル付与するGAS](/blog/gas-gmail-search-label/)
- [GASでGmailの一斉送信を安全に実装する](/blog/gas-gmail-bulk-send/)
- [GASでGmailのメールをスプレッドシートに自動転記する](/blog/gas-gmail-to-sheet/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*本記事のコードは静的検証済みです。*
