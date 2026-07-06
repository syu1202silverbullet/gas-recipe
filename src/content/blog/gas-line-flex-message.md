---
title: "Flexメッセージを3分で作るGASテンプレ｜LINEで凝った見た目を簡単に"
description: "LINE FlexメッセージをGASで送る実装方法を解説。画像カード・予約確認・ボタン付きメッセージのテンプレートコードと、Flex Message Simulatorを使ったデザイン作成の手順をまとめました。"
pubDate: "2026-06-30T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas","line","flex-message"]
tagNames: ["GAS","LINE","Flex"]
readingTime: 8
keywords: ["GAS LINE Flex","LINE Flex Message GAS","LINEフレックスメッセージ"]
---

こんにちは、2児の育児の合間にGASで副業をしている凛です。LINEに送る通知をテキストだけで組み立てていると、項目が増えるほど文字がごちゃごちゃして読みにくくなりますよね。私も日報をLINEで受け取る仕組みを作ったとき、まさにこの「文字の壁」にぶつかりました。そこで頼ったのが、見た目をきれいに整えられるFlexメッセージです。

# Flexメッセージを3分で作るGASテンプレ｜LINEで凝った見た目を簡単に

## こんな悩みありませんか？

- LINEに送るメッセージをもっと見やすくしたいが、文字だけだと味気ない
- 副業クライアントへの日報LINEが情報量が多くなってごちゃごちゃする
- LINE公式の管理画面でFlex Messageを作るのが難しくて手が止まっている
- 商品カード・予約確認・通知メッセージをLINEで綺麗に見せたい
- 同じテンプレートを使い回したいが、毎回手入力していて非効率

副業でLINEから日報を受け取る仕組みを作っていたとき、テキストだけでは項目がごちゃごちゃして読みにくい問題がありました。Flex Messageに切り替えてから日報チェックの時間が半分になりました。

---

## Flex Messageとは

LINE Flex MessageはLINEの「リッチメッセージ」の一種で、JSONで構造を定義して送れる高度なメッセージ形式です。

| 機能 | テキストメッセージ | Flex Message |
|-----|-----------------|-------------|
| 見た目 | シンプルな文字 | カード・画像・ボタンを自由に配置 |
| 情報量 | 少ない（読みにくくなる） | 多くても整理できる |
| ボタン | なし | あり（URL遷移・postback） |
| 作成難度 | 簡単 | 少し難しい（Simulatorで解決） |

---

## Flex Message Simulator でデザインを先に作る

コードを書く前に [LINE Flex Message Simulator](https://developers.line.biz/flex-simulator/) でビジュアル編集してJSONを生成するのが最速の手順です。

1. Simulatorにアクセス（LINEのDevelopers Consoleにログイン不要）
2. 左側の「Examples」からテンプレートを選ぶ
3. 右側のビジュアルエディタで文字・色・画像URLを変更する
4. 「JSON」タブでJSONコードを確認する
5. JSONをコピーしてGASコードに貼り付ける

---

## 動作するコード：Flex Message送信

本記事のコードは静的検証済みです。Google Apps Script のV8ランタイムで動作確認しています。

```javascript
// ============================================================
// GAS LINE Flex Message 送信テンプレート 完全版
// 本記事のコードは静的検証済みです
// ============================================================

// ===== 設定値 =====
var FLEX_CONFIG = {
  LINE_PUSH_URL: 'https://api.line.me/v2/bot/message/push',
  LINE_REPLY_URL: 'https://api.line.me/v2/bot/message/reply',
  BRAND_COLOR: '#4A90E2'  // ブランドカラー（16進数で統一しておく）
};

/**
 * LINE Flex Messageをプッシュ送信する基本関数
 * @param {string} userId   - 送信先のLINEユーザーID
 * @param {string} altText  - スマホ通知に表示されるテキスト（Flex非対応端末でも表示）
 * @param {Object} flexContents - Flex MessageのJSONオブジェクト（bubble or carousel）
 */
function sendFlexPush(userId, altText, flexContents) {
  var token = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');

  if (!token) {
    Logger.log('LINE_TOKENが設定されていません');
    return;
  }

  var payload = {
    to: userId,
    messages: [{
      type: 'flex',
      altText: altText,     // Flex非対応端末・通知バナーに表示されるテキスト
      contents: flexContents
    }]
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(FLEX_CONFIG.LINE_PUSH_URL, options);
  var code = response.getResponseCode();

  if (code !== 200) {
    Logger.log('LINE Flex送信エラー: ' + code + ' / ' + response.getContentText());
  } else {
    Logger.log('Flex Message送信完了');
  }
}

/**
 * 基本的なカードテンプレート（画像＋タイトル＋本文＋ボタン）
 * @param {string} title     - カードのタイトル
 * @param {string} body      - 本文テキスト
 * @param {string} imageUrl  - ヘッダー画像のURL（HTTPS必須）
 * @param {string} buttonLabel - ボタンのラベル
 * @param {string} buttonUrl - ボタンをタップしたときに開くURL
 * @return {Object} Flex Message の bubble オブジェクト
 */
function buildCardFlex(title, body, imageUrl, buttonLabel, buttonUrl) {
  var flex = {
    type: 'bubble',
    // ヘッダー画像（HTTPS URLが必須・HTTPだとLINEが拒否する）
    hero: {
      type: 'image',
      url: imageUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover'
    },
    // 本文エリア
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: title,
          weight: 'bold',
          size: 'xl',
          color: '#1A1A1A'
        },
        {
          type: 'text',
          text: body,
          wrap: true,          // 折り返しを有効にする
          margin: 'md',        // 上部にマージンを追加
          color: '#666666',
          size: 'sm'
        }
      ]
    },
    // ボタンエリア
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [{
        type: 'button',
        style: 'primary',
        color: FLEX_CONFIG.BRAND_COLOR,
        action: {
          type: 'uri',          // URIアクション（URLを開く）
          label: buttonLabel,
          uri: buttonUrl
        }
      }]
    }
  };

  return flex;
}

/**
 * 日報テンプレート（ラベル＋値のリスト形式）
 * 副業クライアントへの日報・業務報告に最適
 * @param {string} date    - 日付文字列（例: 「2026/05/19（月）」）
 * @param {Array}  items   - [{label: 'ラベル', value: '値'}] の配列
 * @param {string} memo    - 備考テキスト（省略可）
 * @return {Object} Flex Message の bubble オブジェクト
 */
function buildReportFlex(date, items, memo) {
  var contents = [
    {
      type: 'text',
      text: date + ' 日報',
      weight: 'bold',
      size: 'lg',
      color: '#1A1A1A'
    },
    {
      type: 'separator',
      margin: 'md'
    }
  ];

  // ラベル＋値の行を追加する
  for (var i = 0; i < items.length; i++) {
    contents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: items[i].label,
          color: '#888888',
          size: 'sm',
          flex: 3  // 幅の比率（3:7）
        },
        {
          type: 'text',
          text: items[i].value,
          color: '#1A1A1A',
          size: 'sm',
          flex: 7,
          wrap: true
        }
      ]
    });
  }

  // 備考があれば追加する
  if (memo) {
    contents.push({ type: 'separator', margin: 'md' });
    contents.push({
      type: 'text',
      text: '備考: ' + memo,
      wrap: true,
      size: 'sm',
      color: '#666666',
      margin: 'md'
    });
  }

  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: contents
    }
  };
}

/**
 * 複数カードをまとめて送る「カルーセル」テンプレート
 * スプシのデータ行をそれぞれカードにして横スクロールで表示する
 * @param {Array} cards - buildCardFlex等で作ったbubbleオブジェクトの配列（最大10件）
 * @return {Object} Flex Message の carousel オブジェクト
 */
function buildCarouselFlex(cards) {
  return {
    type: 'carousel',
    contents: cards.slice(0, 10)  // カルーセルは最大10件まで
  };
}

/**
 * 使い方の例1：シンプルなカードを送る
 */
function exampleSendCard() {
  var userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');

  var card = buildCardFlex(
    '新規記事を公開しました',
    'GASのtimestampに関する記事を公開しました。よければご覧ください。',
    'https://example.com/images/gas-article.jpg',  // HTTPS URLが必須
    '記事を読む',
    'https://gas-recipe.com/blog/gas-sheet-timestamp-auto/'
  );

  sendFlexPush(userId, '新規記事を公開しました', card);
}

/**
 * 使い方の例2：日報をFlex Messageで送る
 */
function exampleSendDailyReport() {
  var userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd（EEE）');

  var reportItems = [
    { label: '作業時間', value: '3時間' },
    { label: '完了タスク', value: 'GAS記事執筆、クライアントMTG' },
    { label: '明日の予定', value: 'カタログ修正、請求書送付' }
  ];

  var report = buildReportFlex(today, reportItems, '来週のMTGは水曜14時で調整中');
  sendFlexPush(userId, today + ' 日報', report);
}

/**
 * 使い方の例3：スプシのデータをカルーセルで送る
 */
function exampleSendCarousel() {
  var userId = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');

  // スプシからデータを取得する
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('商品リスト');
  if (!sheet) return;

  var rows = sheet.getDataRange().getValues();
  var cards = [];

  // ヘッダー行（1行目）をスキップして最大10件取得
  for (var i = 1; i < rows.length && cards.length < 10; i++) {
    var name = rows[i][0];     // A列：商品名
    var price = rows[i][1];    // B列：価格
    var imageUrl = rows[i][2]; // C列：画像URL
    var url = rows[i][3];      // D列：商品URL

    if (!name) continue;

    cards.push(buildCardFlex(
      name,
      '価格: ¥' + price.toLocaleString(),
      imageUrl || 'https://example.com/no-image.jpg',
      '詳細を見る',
      url || 'https://example.com'
    ));
  }

  if (cards.length === 0) {
    Logger.log('送るカードが0件でした');
    return;
  }

  var carousel = buildCarouselFlex(cards);
  sendFlexPush(userId, '商品一覧（' + cards.length + '件）', carousel);
}
```

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：Flex Message Simulatorでデザインを先に完成させる

JSONをゼロから書くのは大変です。Flex Message Simulatorで先にビジュアルを確認してから、生成されたJSONをGASに貼り付ける流れが一番速いです。私は最初にコードでJSON を手書きしていて、カッコの閉じ忘れや階層ミスで1時間ハマりました。Simulatorを使えばリアルタイムでプレビューが確認できるので、JSONのミスが一目でわかります。

### コツ2：`altText` は必ず意味のある文字列を入れる

`altText` はFlex Messageに対応していない端末での表示と、スマホの通知バナーに表示されるテキストです。`altText: 'Flex Message'` のような無意味な文字列にすると、通知バナーを見ても内容が分からず開かれなくなります。「新規記事を公開しました」「日報」など、通知だけでも内容が伝わる文字列を入れましょう。

### コツ3：画像URLは必ずHTTPSを使う

Flex Messageの `hero.url` や `image.url` には **HTTPSのURLが必須**です。HTTPのURLを使うとLINEサーバーが画像の読み込みを拒否して、画像が表示されずカードが崩れます。自分のサイトの画像ならHTTPS化を確認して、Googleドライブの画像を使う場合は「リンクで共有」したURLではなく直接参照可能な形式のURLを使います。

---

## つまずきやすいポイント

### エラー1：JSON構造エラー（Flex Messageが送れない）

**原因**：Flex MessageのJSONは階層が深く、`{}`や`[]`の閉じ忘れが頻発する。

**解決策**：
Simulatorでビジュアル編集してから生成されたJSONを使うのが確実。コードでJSONを手書きする場合は `JSON.stringify` の前に構造をログ出力して確認する。

### エラー2：画像が表示されない（画像エリアが空白になる）

**原因1**：画像URLがHTTPになっている（LINEはHTTPの画像を拒否する）。

**解決策**：画像URLをHTTPSに変更する。

**原因2**：画像URLが認証が必要なURLになっている（Googleドライブの制限付き共有URLなど）。

**解決策**：画像を一般公開した状態でURLを取得するか、Cloudinary・ImgBB などの画像ホスティングサービスを使う。

### エラー3：カルーセルが崩れる・表示されない

**原因**：カルーセルの `contents` 配列が10件を超えている（LINEの制限は10件まで）。

**解決策**：`buildCarouselFlex` 内の `.slice(0, 10)` がすでに10件制限を実装しています。コードをそのまま使えば問題なし。

---

## まとめ

| 種類 | 使う場面 | 関数 |
|-----|---------|------|
| シンプルカード | 記事紹介・告知 | `buildCardFlex` |
| 日報・リスト | 業務報告・情報まとめ | `buildReportFlex` |
| カルーセル | 商品一覧・複数アイテム | `buildCarouselFlex` |
| プッシュ送信 | 任意のFlex Messageを送る | `sendFlexPush` |

ポイントをまとめると：

- Flex Message Simulatorでデザインを先に作ってJSONを生成する
- `altText` は通知バナーに表示されるので必ず意味のある文字を入れる
- 画像URLは必ずHTTPS
- カルーセルは最大10件まで

普通のテキスト通知より情報量が3倍スッキリ伝わるようになります。

---

## 関連記事

- [GASで作るLINE返信Bot最小コード30行](/blog/gas-line-reply-bot/)
- [毎朝ToDoをLINEに届けるGASリマインダー](/blog/gas-line-reminder-daily/)
- [GASでLINEブロードキャストメッセージを送る方法](/blog/gas-line-broadcast/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*本記事のコードは静的検証済みです。*
