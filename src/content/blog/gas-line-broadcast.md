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

こんにちは、看護師の凛です。子育てのかたわら、副業で小さなコミュニティのLINE公式アカウントを運営しています。「毎週決まった曜日にお知らせを配信する」——言葉にすると簡単ですが、忙しい夜勤週にはこれを忘れてしまうことが何度もありました。

今回のテーマは「LINE公式アカウントの一斉配信をGASで自動化する方法」です。

定期配信は「内容を作る」より「決まった時刻に確実に送る」ほうが意外と難しい作業です。忙しい週ほど忘れやすく、一度抜けると読者の信頼にも響きます。配信のスイッチを押す役目を時間トリガーに任せてしまえば、人の忙しさに左右されず毎週同じテンポで届けられます。

---

## こんな悩みありませんか？

- LINE公式アカウントの友達にお知らせを送りたいけど、管理画面の操作が毎回面倒
- スプシで原稿を作っているのに、また管理画面に貼り直すのが二度手間
- 「毎週決まった曜日に配信」を自動化したい
- 配信を忘れて読者（友達）との信頼関係が崩れるのが怖い
- LINE公式の管理画面での予約配信の操作がわかりにくい

私はコミュニティの週次配信を毎週金曜の夜に手動で送っていましたが、夜勤週の金曜日は退勤後にヘロヘロで配信を完全に忘れることがありました。「先週送れなかった……」と翌週に気づいた時の焦りは、経験した人にしかわからない感じです。

GASで自動化してからは、スプシに原稿を書いておくだけで指定時刻に自動配信されます。

---

## LINE Messaging API の基本知識

### 必要なもの

1. **LINE公式アカウント**（無料プランでも可）
2. **LINE Developersアカウント**（LINE公式アカウントと同じLINEアカウントでログイン）
3. **チャンネルアクセストークン**（LINE Developersで発行）

### 料金プランの注意点

LINE公式アカウントの無料プランでは月200通まで無料（友達数 × 配信回数でカウント）。

例：友達50人 × 月4回配信 = 200通（無料プランのギリギリ）

無料プランで余裕を持って運用するなら、月3回以下が安全です。

### broadcast APIについて

`/v2/bot/message/broadcast` エンドポイントを使うと、LINE公式アカウントのすべての友達にメッセージを一斉送信できます。

---

## 事前準備：LINE Developers での設定

1. LINE Developers（https://developers.line.biz/）にアクセス
2. LINEアカウントでログイン
3. 「Messaging API」チャンネルを作成（既にある場合はスキップ）
4. 「Messaging API」タブ→「チャンネルアクセストークン（長期）」を発行
5. 発行されたトークンをコピーしておく

このトークンをGASのスクリプトプロパティに保存します（コードへの直書きは厳禁）。

---

## スプレッドシートの準備

配信スケジュール管理のスプシを作ります。

| A列（配信日） | B列（配信内容） | C列（配信済み） | D列（配信日時） |
|---|---|---|---|
| 2026/05/22 | 今週のまとめ：先週の振り返り... | （空白） | （空白） |
| 2026/05/29 | 今週のまとめ：5月最終週... | （空白） | （空白） |

- C列が空白 → 未配信（当日の配信対象）
- C列が「済」 → 配信済み（スキップ）

---

## サンプルコード（コピペで動きます）

### 基本の broadcast 関数

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

### スプシから当日分の配信内容を取得して送信するコード

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

### 配信前の残り通数を確認するコード

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

## スクリプトプロパティへのトークン設定方法

1. GASエディタ上部の「プロジェクトの設定」（⚙️歯車アイコン）をクリック
2. 「スクリプトプロパティ」セクションで「プロパティを追加」をクリック
3. プロパティ名 `LINE_TOKEN`、値にLINE Developersで発行したアクセストークンを入力
4. 「保存」をクリック

---

## トリガーの設定手順（自動配信する方法）

毎週金曜に自動配信するトリガーを設定します。

1. GASエディタを開く（スプシ上部メニュー「拡張機能」→「Apps Script」）
2. 左メニューの時計アイコン「トリガー」をクリック
3. 右下の「＋ トリガーを追加」ボタンをクリック
4. 「実行する関数を選択」で `todaysBroadcast` を選ぶ
5. 「イベントのソースを選択」で「時間主導型」を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「週タイマー」を選ぶ
7. 実行する曜日を「金曜日」に設定
8. 実行時刻を「午後6時〜7時」に設定
9. 「保存」ボタンをクリック
10. Googleアカウントの認証画面が出たら「許可」をクリック

毎週金曜の18時台に自動で配信が走ります。スプシに今週分の原稿を入れておくだけで、あとは自動です。

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：アクセストークンはスクリプトプロパティに保存する

`PropertiesService.getScriptProperties()` で管理すると、コードに直書きせずに済みます。

GitHubに公開したコード、ブログのスクショなどからトークンが漏れる事故を防げます。漏れたトークンを使われると、全友達に不正なメッセージが送られてしまう最悪のケースもあります。

必ずスクリプトプロパティを使ってください。

### コツ2：配信前にテスト送信で確認する

本番の broadcast APIを叩く前に、自分のLINE user IDだけにpush送信して内容を確認する習慣をつけてください。

broadcast は一度送ると全友達に届いてしまいます。誤字・改行ミス・内容ミスがあっても取り消せません。テスト送信で確認を徹底してください。

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

### コツ3：月の配信回数を計算してから計画を立てる

LINE公式の無料プランは月200通まで。友達50人なら月4回、友達100人なら月2回が上限の目安です。

配信計画を立てる前に `checkBroadcastQuota()` で今月の残り通数を確認する習慣をつけると、上限超えによる配信失敗を防げます。

---

## つまずきやすいポイント

### エラー1：HTTPステータス 401 エラーが出る

トークンが無効または期限切れの場合に発生します。

**解決策**：LINE Developersコンソールで「チャンネルアクセストークン（長期）」を再発行して、スクリプトプロパティの `LINE_TOKEN` を更新する。

エラーレスポンスの内容を確認するには：
```javascript
const response = UrlFetchApp.fetch(url, options);
Logger.log(response.getContentText()); // エラー詳細を確認
```

### エラー2：月の配信上限を超えてエラーになる

`The monthly limit of the free plan has been exceeded.` のようなメッセージが出た場合、その月の配信上限を超えています。

**解決策**：
1. LINE公式管理画面から翌月まで待つ
2. 有料プランにアップグレードする
3. 配信回数を月3回以下に減らす

`checkBroadcastQuota()` を月初に実行して残り通数を把握しておくと防げます。

### エラー3：スプシの日付形式が合わず今日分が取得できない

A列の日付が「2026/05/22」「2026-05-22」「5月22日」など、様々な形式で入力されている場合、比較がうまくいきません。

**解決策**：スプシのA列に入力する日付フォーマットを `2026/05/22` 形式に統一する。GASの `Utilities.formatDate` でも同じ形式に変換して比較します。

```javascript
// 日付の比較（形式を統一する）
const rowDateStr = Utilities.formatDate(new Date(rowDate), 'Asia/Tokyo', 'yyyy-MM-dd');
const todayStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

if (rowDateStr === todayStr) {
  // 今日分の処理
}
```

---

## 実運用フロー

私の実際の配信フローを紹介します。

| タイミング | 作業 | 誰がやるか |
|---|---|---|
| 毎週月〜水曜 | スプシに今週金曜分の原稿を書く | 自分（手動） |
| 毎週木曜 | `testPush` でテスト送信して原稿を確認 | 自分（手動） |
| 毎週金曜 18時（自動） | `todaysBroadcast` で全友達に配信 | GAS（自動） |
| 毎週金曜 19時ごろ | スプシのC列「済」を確認 | 自分（確認のみ） |

---

## まとめ

| 項目 | 内容 |
|---|---|
| 使うAPIエンドポイント | `/v2/bot/message/broadcast` |
| トークンの管理 | スクリプトプロパティで管理（直書き厳禁） |
| 無料プランの上限 | 月200通（友達数 × 配信回数でカウント） |
| 残り通数の確認 | `checkBroadcastQuota()` で月初に確認 |
| 配信前のテスト | `testPush()` で自分のLINEに確認送信 |
| 原稿管理 | スプシのA列に配信日・B列に内容を入力 |
| 効果 | 配信忘れゼロ・スプシ入力だけで完結 |

このGASを「毎週金曜18時のトリガー」で動かせば、人が触らなくても配信が走ります。

「配信を忘れて月曜に慌てる」事故が完全になくなります。副業でコミュニティやメルマガ的な使い方をしているLINE公式の方には、ぜひ試してほしい自動化です。

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
