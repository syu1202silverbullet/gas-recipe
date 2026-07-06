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

こんにちは、2児の育児の合間にGASで副業をしている凛です。副業のクライアントに日報をLINEで送る仕組みを作ったとき、最初はぜんぶテキストで組んでいました。作業時間、完了タスク、明日の予定……項目が増えるほど文字が縦にダラダラ伸びて、送った本人が読み返しても「どこに何が書いてあるんだっけ」となる始末。相手に申し訳ないなと思いつつ、しばらく我慢して使っていました。

その「文字の壁」を崩してくれたのがFlexメッセージです。同じ情報でも、カード状に整えて送るだけで一気に読めるものに変わりました。この記事では、テキスト通知とFlexメッセージがどう違うのかを見比べたうえで、コピペで使えるテンプレートまで紹介します。

---

## テキスト通知とFlexメッセージ、何が変わるのか

まず、切り替える前と後で何が変わるのかをはっきりさせておきます。

普通のテキスト通知は、こんな見た目になります。

```
2026/05/19（月）日報
作業時間：3時間
完了タスク：GAS記事執筆、クライアントMTG
明日の予定：カタログ修正、請求書送付
備考：来週のMTGは水曜14時で調整中
```

情報は全部入っていますが、どこが見出しでどこが値なのかが平坦で、パッと見で頭に入ってきません。項目が5個を超えたあたりから、スクロールしないと全体が見えなくなります。

Flexメッセージにすると、同じ内容がカードになります。日付が見出しとして上に立ち、その下にラベルと値が左右に並び、備考は区切り線で分けられる。視線の動きが整うので、通知を開いた瞬間に構造が読み取れます。私の場合、これで日報チェックにかかる時間が体感で半分になりました。

違いを表にすると、だいたいこんな棲み分けです。

| 機能 | テキストメッセージ | Flex Message |
|-----|-----------------|-------------|
| 見た目 | シンプルな文字 | カード・画像・ボタンを自由に配置 |
| 情報量 | 少ない（読みにくくなる） | 多くても整理できる |
| ボタン | なし | あり（URL遷移・postback） |
| 作成難度 | 簡単 | 少し難しい（Simulatorで解決） |

「少し難しい」と書きましたが、正直これは工夫でほぼ消せます。次でその方法から入ります。

---

## 手順：デザインを先に作ってからコードに渡す

FlexメッセージはJSONで構造を定義します。ここでいきなりコードにJSONを手書きしようとすると、まず間違いなく詰まります。私は最初それをやって、カッコの閉じ忘れと階層のズレで1時間溶かしました。

回り道に見えて一番速いのは、[LINE Flex Message Simulator](https://developers.line.biz/flex-simulator/) で見た目を先に完成させて、そこからJSONを吸い出す流れです。

1. Simulatorにアクセスする（Developers Consoleへのログインは不要）
2. 左の「Examples」から近いテンプレートを選ぶ
3. 右のビジュアルエディタで文字・色・画像URLを差し替える
4. 「JSON」タブで生成されたJSONを確認する
5. そのJSONをコピーしてGASに貼り付ける

プレビューがリアルタイムで動くので、階層ミスがあってもその場で目に見えます。ゼロから手書きするより、ずっと事故が少ないやり方です。

---

## コード：カード・日報・カルーセルの3テンプレ

デザインが決まったら、あとは送るだけ。よく使う「カード」「日報」「カルーセル」の3パターンを1ファイルにまとめました。上から順に、送信関数・テンプレ・使い方の例、という並びです。

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

`buildReportFlex` に日付・項目の配列・備考を渡せば、冒頭で見比べた「読める日報」がそのまま出せます。カードや商品一覧を送りたいときは `buildCardFlex` と `buildCarouselFlex` を使い分けてください。

---

## 応用：ハマりやすい3点を先につぶす

テンプレをそのまま使う分にはあまり困りませんが、自分のデータに差し替えて応用するときに、私が実際につまずいた3か所を先に共有しておきます。

### altTextを手抜きしない

`altText` は、Flex非対応端末での表示と、スマホの通知バナーに出るテキストです。ここを `altText: 'Flex Message'` のような意味のない文字列にすると、通知を見ても中身が分からず、そのまま開かれずに埋もれます。「日報」「新規記事を公開しました」のように、通知だけで用件が伝わる文字を入れてください。地味ですが開封率にわりと効きます。

### 画像URLは必ずHTTPS

`hero.url` や `image.url` に渡す画像URLは、HTTPSでないとLINE側が読み込みを拒否します。HTTPだと画像エリアが空白になってカードが崩れます。自分のサイトの画像ならHTTPS化を確認し、Googleドライブの画像を使う場合は「制限付き共有」のURLではなく、認証なしで直接参照できる形式のURLを使ってください。認証が必要なURLも同じく表示されません。どうしても安定させたいときは、画像ホスティングサービスに置くのが確実です。

### カルーセルは10件まで

Flexのカルーセルは1回に最大10件までです。スプシのデータをそのまま流し込むと11件目でエラーになることがありますが、上のコードでは `buildCarouselFlex` の中で `.slice(0, 10)` を効かせてあるので、そのまま使う限りは10件で自動的に打ち止めになります。ここは自分で件数制御を書き足す必要はありません。

もしJSON自体が送れないときは、たいてい `{}` や `[]` の閉じ忘れです。そのときこそSimulatorに戻って、ビジュアルから作り直すのが一番早い解決になります。

---

## おわりに

同じ情報でも、テキストで縦に流すのとカードに整えるのとでは、受け取る側の負担がまるで違います。私自身、日報を送るのが少しだけ気楽になりました。まずは `buildReportFlex` に自分の項目を入れて、自分あてに一通送ってみてください。テキストとの見え方の差が、たぶん一番の説得力になります。

掲載しているコードは構文を確認したうえで載せていますが、送信先IDや画像URLはご自身の環境に合わせて差し替えてくださいね。

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
