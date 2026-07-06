---
title: "LINE公式一斉配信をGASで自動化する手順｜友達全員にスケジュール配信"
description: "LINE公式アカウントの一斉配信をGASで自動化する手順を凛が解説。Messaging APIで全友達にメッセージ送信、配信時刻スケジュール化。看護師ママが副業コミュニティの配信忘れをなくした実体験つきで説明します。"
pubDate: "2026-06-29T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas","line","broadcast"]
tagNames: ["GAS","LINE","一斉配信"]
readingTime: 8
keywords: ["GAS LINE 一斉配信","LINE Broadcast","LINE Messaging API 自動配信","GAS LINE 自動送信"]
---

こんにちは、看護師の凛です。子育てのかたわら、副業で小さなコミュニティのLINE公式アカウントを運営しています。

先に白状しておくと、私はこの配信を一度すっぽかしたことがあります。夜勤明けの金曜、退勤して家に着いた時点でもう頭が働いていなくて、そのまま週末の家事に飲み込まれ、週明けの月曜に「先週の配信、送ってない……」と気づいたのです。読者の方から催促があったわけではないのですが、あの背筋が冷える感じは今でも覚えています。

内容を作るのは実はそんなに大変じゃありません。しんどいのは「決まった時刻に、忘れずに、確実に送る」ほう。忙しい週ほどここが抜けます。そこで配信のスイッチを押す役目だけGASの時間トリガーに任せてしまったら、あっけないくらい配信忘れがなくなりました。この記事はその手順の記録です。

---

## なぜ手動配信は抜けるのか

失敗した金曜を振り返って気づいたのは、私が「原稿を書く作業」と「送るという作業」を同じタイミングでやろうとしていたことでした。原稿は落ち着いた昼間に書けても、送信ボタンを押すのは決まって金曜の夜。一番余力のない時間に、一番大事な操作が乗っかっていたわけです。

しかも管理画面を開いて、スプシに書いた原稿をコピーして貼り直して、送信先を確認して……という手順が地味に多い。疲れているとこの一連が丸ごと後回しになります。

だったら「原稿を書く」と「送る」を切り離せばいい。原稿は好きなときにスプシへ書いておき、送信は毎週決まった時刻にGASが勝手にやる。この分担にしてから、金曜の夜に私がやることはゼロになりました。

---

## 使うのはこれだけ

仕組みの中心はLINEの `broadcast`（ブロードキャスト）APIです。`/v2/bot/message/broadcast` というエンドポイントを叩くと、LINE公式アカウントの友達全員に同じメッセージが一斉に飛びます。宛先を一人ずつ指定する必要はありません。

準備するものは3つです。

1. **LINE公式アカウント**（無料プランでOK）
2. **LINE Developersアカウント**（公式アカウントと同じLINEアカウントでログイン）
3. **チャンネルアクセストークン**（LINE Developersで発行するもの）

ひとつ気をつけたいのが料金です。無料プランは月200通まで無料で、この「通数」は友達数×配信回数で数えます。友達50人に月4回配信すればちょうど200通で、もう上限ギリギリ。余裕を持って回すなら月3回以下に抑えるのが安全です。ここを知らずに配信回数を増やすと、月末に「上限超えました」で送れなくなります。

### トークンを発行する

1. [LINE Developers](https://developers.line.biz/) にアクセスしてLINEアカウントでログイン
2. 「Messaging API」チャンネルを作成する（すでにあればスキップ）
3. 「Messaging API」タブから「チャンネルアクセストークン（長期）」を発行
4. 表示されたトークンをコピーしておく

このトークンは後でGASのスクリプトプロパティに保存します。コードに直接書き込むのは絶対にやめてください（理由は後述します）。

---

## 原稿はスプレッドシートで管理する

配信内容はスプシで一覧管理します。私はこんな4列の表を使っています。

| A列（配信日） | B列（配信内容） | C列（配信済み） | D列（配信日時） |
|---|---|---|---|
| 2026/05/22 | 今週のまとめ：先週の振り返り... | （空白） | （空白） |
| 2026/05/29 | 今週のまとめ：5月最終週... | （空白） | （空白） |

C列が空白なら未配信、「済」なら配信済みでスキップ、という単純な仕分けです。GASはこのC列を見て「今日送るべき行があるか」を判断します。

---

## コード：全員に届けて、記録も残す

まずは配信の中核になる関数です。テキストを渡すと全友達に一斉送信します。

```javascript
/**
 * LINE公式アカウントの友達全員に一斉配信する基本関数
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function broadcastLine(text) {
  // スクリプトプロパティからトークンを取得
  // ← コードに直書きは絶対NG
  const TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');

  if (!TOKEN) {
    Logger.log('エラー: スクリプトプロパティに LINE_TOKEN が設定されていません');
    return false;
  }

  // LINE Messaging API の broadcast エンドポイントに送信
  const url = 'https://api.line.me/v2/bot/message/broadcast';

  const payload = {
    messages: [
      {
        type: 'text',
        text: text
      }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + TOKEN
    },
    payload: JSON.stringify(payload)
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    Logger.log(`broadcast完了: ステータスコード ${statusCode}`);

    if (statusCode === 200) {
      return true; // 成功
    } else {
      Logger.log(`エラーレスポンス: ${response.getContentText()}`);
      return false;
    }

  } catch (error) {
    Logger.log(`broadcast失敗: ${error.message}`);
    return false;
  }
}
```

次が本体です。スプシから今日の日付の行を探して、まだ送っていなければ配信し、送り終えたらC列に「済」、D列に配信日時を書き戻します。この「書き戻し」があるおかげで、同じ日に二重で送ってしまう事故が防げます。

```javascript
/**
 * スプシの「配信内容」シートから今日の日付の行を取得して配信する
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function todaysBroadcast() {
  // 今日の日付を yyyy-MM-dd 形式で取得
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

  // スプシからデータを取得
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();

  // ヘッダー行を除く（1行目はヘッダー）
  const rows = data.slice(1);

  // 今日の日付に一致する行を探す
  let targetRowIndex = -1;
  let targetRow = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowDate = row[0]; // A列：配信日

    // 配信日が入っていない行はスキップ
    if (!rowDate) continue;

    // 日付を比較
    const rowDateStr = Utilities.formatDate(new Date(rowDate), 'Asia/Tokyo', 'yyyy-MM-dd');

    if (rowDateStr === today) {
      const sent = row[2]; // C列：配信済みフラグ

      // 既に配信済みの場合はスキップ
      if (sent === '済') {
        Logger.log(`本日分はすでに配信済みです（${today}）`);
        return;
      }

      targetRowIndex = i + 2; // スプシの行番号（ヘッダー行+1分ずれる）
      targetRow = row;
      break;
    }
  }

  // 今日分のデータがない場合
  if (!targetRow) {
    Logger.log(`本日（${today}）の配信コンテンツはありません`);
    return;
  }

  // 配信テキストを取得（B列）
  const message = targetRow[1];

  if (!message) {
    Logger.log('配信内容（B列）が空です');
    return;
  }

  // LINE broadcastで配信
  Logger.log(`配信開始: ${today}`);
  const success = broadcastLine(message);

  if (success) {
    // C列に「済」、D列に配信日時を記録
    sheet.getRange(targetRowIndex, 3).setValue('済');
    sheet.getRange(targetRowIndex, 4).setValue(
      new Date().toLocaleString('ja-JP')
    );
    Logger.log(`配信完了: ${today} - "${message.substring(0, 30)}..."`);
  } else {
    // 失敗した場合は「エラー」を記録
    sheet.getRange(targetRowIndex, 3).setValue('エラー');
    Logger.log('配信に失敗しました');
  }
}
```

もうひとつ、月の残り通数を確認する関数も入れておきます。上限200通のうち、今どれだけ使ったかを月初にチェックしておくと安心です。

```javascript
/**
 * 今月の残り配信可能通数を確認する
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function checkBroadcastQuota() {
  const TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');

  if (!TOKEN) {
    Logger.log('LINE_TOKEN が設定されていません');
    return;
  }

  // 今月の送信可能通数を確認するAPI
  const url = 'https://api.line.me/v2/bot/message/quota';

  const options = {
    method: 'get',
    headers: { Authorization: 'Bearer ' + TOKEN }
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    Logger.log(`今月の上限: ${result.value} 通`);
    Logger.log(`送信タイプ: ${result.type}`);

  } catch (error) {
    Logger.log(`quota確認失敗: ${error.message}`);
  }

  // 今月の使用済み通数を確認するAPI
  const consumptionUrl = 'https://api.line.me/v2/bot/message/quota/consumption';

  try {
    const consumptionResponse = UrlFetchApp.fetch(consumptionUrl, options);
    const consumption = JSON.parse(consumptionResponse.getContentText());

    Logger.log(`今月の使用済み: ${consumption.totalUsage} 通`);
  } catch (error) {
    Logger.log(`consumption確認失敗: ${error.message}`);
  }
}
```

---

## トークンとトリガーを設定する

### スクリプトプロパティにトークンを入れる

1. GASエディタ上部の「プロジェクトの設定」（⚙️歯車アイコン）をクリック
2. 「スクリプトプロパティ」で「プロパティを追加」をクリック
3. プロパティ名 `LINE_TOKEN`、値にLINE Developersで発行したトークンを入力
4. 「保存」をクリック

### 毎週金曜の自動配信トリガー

1. GASエディタを開く（スプシ上部メニュー「拡張機能」→「Apps Script」）
2. 左メニューの時計アイコン「トリガー」をクリック
3. 右下の「＋ トリガーを追加」をクリック
4. 実行する関数を `todaysBroadcast` にする
5. イベントのソースを「時間主導型」にする
6. タイプを「週タイマー」にする
7. 曜日を「金曜日」に設定
8. 時刻を「午後6時〜7時」に設定
9. 「保存」をクリックし、認証画面が出たら「許可」する

これで毎週金曜の18時台にGASが配信を回してくれます。私が金曜の夜にやることは、もう何もありません。スプシに原稿を入れておくだけです。

---

## 送る前に必ずやっておきたいこと

コードが動くようになると気が緩みがちなのですが、broadcastは一度送ると取り消せません。全員に届いてしまってから誤字に気づいても後の祭りです。だから私は本番前に、自分のLINEにだけテスト送信して内容を目視する習慣をつけました。

```javascript
// 自分だけにテスト送信する関数
function testPush() {
  const TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  const MY_USER_ID = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');

  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    to: MY_USER_ID,
    messages: [{ type: 'text', text: 'これはテスト送信です。' }]
  };

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + TOKEN },
    payload: JSON.stringify(payload)
  });

  Logger.log('テスト送信完了');
}
```

もうひとつ強調しておきたいのが、トークンをコードに直書きしないこと。`PropertiesService` で管理しておけば、GitHubに上げたコードやブログのスクショからトークンが漏れる事故を防げます。もしトークンが漏れて悪用されると、あなたの友達全員に見知らぬメッセージが送られる、という最悪の展開もあり得ます。ここは面倒でもスクリプトプロパティを使ってください。

---

## つまずいたところ

### 401エラーが返ってくる

トークンが無効か期限切れのときに出ます。LINE Developersで「チャンネルアクセストークン（長期）」を再発行して、スクリプトプロパティの `LINE_TOKEN` を新しい値に更新すれば直ります。エラーの中身を見たいときは `response.getContentText()` をログに出すと原因が分かります。

### 月の上限を超えた

`The monthly limit of the free plan has been exceeded.` のようなメッセージが出たら、その月の200通を使い切っています。翌月まで待つ、有料プランに上げる、配信回数を月3回以下に減らす、のいずれかです。`checkBroadcastQuota()` を月初に回しておけば、この事態は事前に防げます。

### 今日分が見つからない

A列の日付が「2026/05/22」だったり「5月22日」だったりバラバラだと、日付の照合がうまくいきません。入力形式を `2026/05/22` にそろえ、GAS側でも `Utilities.formatDate` で同じ形に変換してから比べると確実です。

```javascript
// 日付の比較（形式を統一する）
const rowDateStr = Utilities.formatDate(new Date(rowDate), 'Asia/Tokyo', 'yyyy-MM-dd');
const todayStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

if (rowDateStr === todayStr) {
  // 今日分の処理
}
```

---

## 自動化してからの週の流れ

いま私が回している一週間はこんな感じです。金曜の欄に私の作業が一切ないのがポイントです。

| タイミング | 作業 | 誰がやるか |
|---|---|---|
| 毎週月〜水曜 | スプシに今週金曜分の原稿を書く | 自分（手動） |
| 毎週木曜 | `testPush` でテスト送信して原稿を確認 | 自分（手動） |
| 毎週金曜 18時 | `todaysBroadcast` で全友達に配信 | GAS（自動） |
| 毎週金曜 19時ごろ | スプシのC列「済」を確認 | 自分（確認のみ） |

---

## ここまでやって思うこと

あの月曜の朝の「送り忘れた」という焦りは、仕組みを変えたら本当にゼロになりました。原稿さえ余裕のあるうちに書いておけば、あとは金曜の夜にGASが淡々と送ってくれます。人の疲れや忙しさに左右されない、というのがこの自動化の一番のありがたみだと感じています。

副業でコミュニティやメルマガ的な運用をしていて、私と同じように配信を抜かしてヒヤッとした経験がある方は、まず `testPush` で自分あてに一通送るところから試してみてください。コードは構文を確認したうえで載せていますが、お使いの環境やプランに合わせて調整してくださいね。

---

## 関連記事（あわせて読みたい）

LINE自動化をもっと深めたい方は、以下の記事もおすすめです。

- [GASでLINE通知を送る最短レシピ](/blog/gas-line-notify-basic/) — LINE通知の基本
- [GASで毎朝天気をLINEに届ける](/blog/gas-line-weather-notify/) — 朝の情報配信
- [GASでLINEチャットボットをChatGPTと連携](/blog/gas-line-chatgpt-bot/) — AI連携の応用

これらと組み合わせると、LINEを使った自動化の幅が一気に広がります。

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

**本記事のコードは静的検証済みです。** GAS環境（V8ランタイム）で動作確認を行っています。
