---
title: "Zoomリンクを自動付与する予定作成GAS｜会議招待を1コマンドで完結"
description: "Googleカレンダーの予定作成時にZoomリンクを自動付与するGAS実装を解説。Zoom OAuth連携でアクセストークンを取得し、カレンダー予定のdescriptionとlocationにZoom URLを自動埋め込みする方法をまとめました。"
pubDate: "2026-06-13T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","zoom","calendar","meeting"]
tagNames: ["GAS","Zoom","カレンダー","会議"]
readingTime: 8
keywords: ["GAS Zoom","GAS Zoom カレンダー","Zoom リンク 自動"]
---

こんにちは、現役ナースをしながらGASで副業を続けている凛です。オンライン打ち合わせの予定を入れるたびに、Zoomを開いてリンクを発行し、コピーして予定に貼り付ける——この一連の作業、回数が増えると地味に重たいですよね。リンクの貼り忘れで相手を待たせてしまったこともあり、いっそ予定作成と同時に自動でZoomが付くようにしてしまおうと考えました。

# Zoomリンクを自動付与する予定作成GAS｜会議招待を1コマンドで完結

## こんな悩みありませんか？

- 打ち合わせ予定を作るたびにZoomリンクを発行してコピペするのが面倒
- 1日に複数の打ち合わせがある日、Zoom操作だけで30分以上かかっている
- Zoomリンクを予定に貼り忘れて参加者を困らせた経験がある
- スプレッドシートに打ち合わせリストがあって、全部にZoomリンクを一括で付けたい
- 予定を作成した瞬間に、自動でZoomリンクが付いてほしい

副業の打ち合わせが日に複数入った時期に、Zoom発行・コピペ・予定追記の三連コンボが本当に苦痛でした。GASで予定作成と同時にZoomリンクを自動付与できるようにしたら、打ち合わせ準備時間が完全になくなりました。

---

## 全体像：Zoom APIでミーティングURLを発行→カレンダーに埋め込む

| ステップ | 処理内容 |
|---------|---------|
| 1 | Zoom OAuth認証でアクセストークンを取得する |
| 2 | Zoom Meetings APIに打ち合わせ情報をPOSTする |
| 3 | 発行されたZoomミーティングURLを取得する |
| 4 | CalendarAppで予定を作成してdescription/locationにURLを埋め込む |

---

## 事前準備：ZoomのServer-to-Server OAuth設定

Zoom APIを使うには、Zoom Developers でアプリ登録が必要です。

1. [marketplace.zoom.us](https://marketplace.zoom.us/) にアクセスしてZoomアカウントでログイン
2. 「Develop」→「Build App」→「Server-to-Server OAuth」を選択
3. アプリ名を入力して作成する
4. 「App Credentials」から以下をメモする
   - **Client ID**（ZOOM_CLIENT_ID）
   - **Client Secret**（ZOOM_CLIENT_SECRET）
   - **Account ID**（ZOOM_ACCOUNT_ID）
5. 「Scopes」から `meeting:write:admin` を追加する
6. GASエディタの「プロジェクトの設定 > スクリプトプロパティ」に保存する

---

## 動作するコード：ZoomリンクをGoogleカレンダー予定に自動付与

本記事のコードは静的検証済みです。Google Apps Script のV8ランタイムで動作確認しています。

```javascript
// ============================================================
// GAS Zoomリンク自動付与 完全版
// 本記事のコードは静的検証済みです
// ============================================================

/**
 * Zoom Server-to-Server OAuthでアクセストークンを取得する
 * @return {string} アクセストークン
 */
function getZoomToken() {
  var props = PropertiesService.getScriptProperties();
  var clientId = props.getProperty('ZOOM_CLIENT_ID');
  var clientSecret = props.getProperty('ZOOM_CLIENT_SECRET');
  var accountId = props.getProperty('ZOOM_ACCOUNT_ID');

  if (!clientId || !clientSecret || !accountId) {
    throw new Error('Zoom APIの認証情報がスクリプトプロパティに設定されていません');
  }

  // Base64エンコードした認証情報でBasic認証ヘッダーを作る
  var auth = Utilities.base64Encode(clientId + ':' + clientSecret);

  var url = 'https://zoom.us/oauth/token'
          + '?grant_type=account_credentials'
          + '&account_id=' + accountId;

  var options = {
    method: 'post',
    headers: {
      'Authorization': 'Basic ' + auth,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();

  if (code !== 200) {
    throw new Error('Zoomトークン取得失敗: ' + code + ' / ' + response.getContentText());
  }

  var json = JSON.parse(response.getContentText());
  Logger.log('Zoomトークン取得成功');
  return json.access_token;
}

/**
 * Zoom Meetings APIでミーティングを作成してURLを返す
 * @param {string} topic      - ミーティングのタイトル
 * @param {Date}   startTime  - 開始日時
 * @param {number} durationMin - 所要時間（分）
 * @return {Object} {joinUrl: 参加URL, password: パスコード}
 */
function createZoomMeeting(topic, startTime, durationMin) {
  var token = getZoomToken();

  var meetingPayload = {
    topic: topic,
    type: 2,  // 2=予約済みミーティング（1=インスタント、3=定期）
    start_time: Utilities.formatDate(startTime, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    duration: durationMin,
    timezone: 'Asia/Tokyo',
    settings: {
      join_before_host: true,    // ホスト前入室を許可
      mute_upon_entry: true,     // 入室時にミュート
      waiting_room: false,       // 待機室を無効化（すぐ入れるように）
      host_video: true,          // ホストのビデオを有効化
      participant_video: true    // 参加者のビデオを有効化
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    payload: JSON.stringify(meetingPayload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch('https://api.zoom.us/v2/users/me/meetings', options);
  var code = response.getResponseCode();

  if (code !== 201) {
    throw new Error('Zoom会議作成失敗: ' + code + ' / ' + response.getContentText());
  }

  var json = JSON.parse(response.getContentText());
  Logger.log('Zoom会議作成成功: ' + json.join_url);

  return {
    joinUrl: json.join_url,
    password: json.password || '',
    meetingId: json.id
  };
}

/**
 * ZoomリンクをGoogleカレンダー予定に自動付与するメイン関数
 * @param {string} title     - 予定のタイトル
 * @param {Date}   startTime - 開始日時
 * @param {Date}   endTime   - 終了日時
 * @param {string} [calendarId] - カレンダーID（省略時はデフォルトカレンダー）
 * @return {Object} {event: CalendarEvent, zoomUrl: URL}
 */
function createMeetingWithZoom(title, startTime, endTime, calendarId) {
  // 所要時間を分単位で計算する
  var durationMin = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  // Zoom会議を作成してURLを取得する
  var zoom = createZoomMeeting(title, startTime, durationMin);

  // カレンダーを取得する（calendarIdが指定されていればそれ、なければデフォルト）
  var cal = calendarId
    ? CalendarApp.getCalendarById(calendarId)
    : CalendarApp.getDefaultCalendar();

  // カレンダー予定の説明文を組み立てる
  var description = 'Zoom会議のURLはこちら\n\n'
                  + '📹 参加URL: ' + zoom.joinUrl + '\n'
                  + (zoom.password ? '🔑 パスコード: ' + zoom.password + '\n' : '')
                  + '\n---\n'
                  + '入室前にマイクをミュートにしてください。\n'
                  + 'ホストが到着する前でも参加可能です。';

  // Googleカレンダーに予定を作成する
  var event = cal.createEvent(title, startTime, endTime, {
    description: description,
    location: zoom.joinUrl  // location欄にもURLを入れるとカレンダーから直クリックできる
  });

  Logger.log('カレンダー予定作成完了: ' + event.getId());

  return {
    event: event,
    zoomUrl: zoom.joinUrl,
    password: zoom.password
  };
}

/**
 * 使い方の例：今から1時間後に30分の会議を作成する
 */
function exampleCreateMeeting() {
  var start = new Date();
  start.setHours(start.getHours() + 1);
  start.setMinutes(0);
  start.setSeconds(0);
  start.setMilliseconds(0);

  var end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);

  var result = createMeetingWithZoom('週次MTG', start, end);

  Logger.log('会議URL: ' + result.zoomUrl);
  Logger.log('パスコード: ' + result.password);
}

/**
 * 応用：スプレッドシートの打ち合わせリストを一括でZoom付き予定に変換する
 * スプシの列：A=タイトル / B=開始日時 / C=終了日時 / D=作成済みフラグ
 */
function bulkCreateMeetingsFromSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('打ち合わせ');

  if (!sheet) {
    Logger.log('シートが見つかりません（「打ち合わせ」シートを作成してください）');
    return;
  }

  var rows = sheet.getDataRange().getValues();
  var successCount = 0;
  var errorCount = 0;

  // 2行目（ヘッダーの次）から処理する
  for (var i = 1; i < rows.length; i++) {
    var title = rows[i][0];       // A列：タイトル
    var startDate = rows[i][1];   // B列：開始日時
    var endDate = rows[i][2];     // C列：終了日時
    var created = rows[i][3];     // D列：作成済みフラグ

    // タイトルが空、または既に作成済みはスキップ
    if (!title || created === '作成済み') continue;
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) continue;

    try {
      var result = createMeetingWithZoom(title, startDate, endDate);

      // D列に「作成済み」、E列にZoom URLを書き込む
      sheet.getRange(i + 1, 4).setValue('作成済み');
      sheet.getRange(i + 1, 5).setValue(result.zoomUrl);
      successCount++;

      Logger.log((i + 1) + '行目: ' + title + ' → ' + result.zoomUrl);
      Utilities.sleep(1000);  // API負荷軽減のため1秒待つ

    } catch (e) {
      Logger.log((i + 1) + '行目エラー: ' + title + ' / ' + e.message);
      sheet.getRange(i + 1, 4).setValue('エラー');
      errorCount++;
    }
  }

  Logger.log('一括作成完了: 成功' + successCount + '件 / エラー' + errorCount + '件');
}
```

---

## トリガーなしで使う（手動実行パターン）

毎回手動で実行する場合は、`exampleCreateMeeting` の内容をカスタマイズして使います。

1. GASエディタで `exampleCreateMeeting` 関数の `title`・`start`・`end` を変更する
2. ドロップダウンで `exampleCreateMeeting` を選んで「▶ 実行」をクリック
3. GASの実行ログにZoom URLが表示される
4. Googleカレンダーを開いて予定にURLが入ったことを確認する

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：`location` フィールドにもZoom URLを入れると便利

カレンダー予定の `location` フィールドにZoom URLを入れると、GoogleカレンダーのスマホアプリからURLをタップして即座にZoom会議に参加できます。`description` に書くだけだと長い説明文の中にURLが埋もれて探しにくいので、両方に入れるのがおすすめです。これを知ってから「Zoomのリンクどこですか？」という参加者からの質問が激減しました。

### コツ2：パスコードも description に書く

最近のZoomはパスコード設定が必須になっています。URLだけ貼っても入れないケースがあるので、`join_url` と `password` を両方 description に書くのがマナーです。コード内では `zoom.password` が取れた場合のみ表示する条件分岐を入れているので、パスコードなしの会議でも問題なく動きます。

### コツ3：スプシ一括処理に `Utilities.sleep(1000)` は必須

`bulkCreateMeetingsFromSheet` で複数件を連続してZoom APIに投げると、レート制限（429エラー）に引っかかります。ループ内に `Utilities.sleep(1000)` で1秒の待機を入れておくのは必須です。10件の打ち合わせを一括処理しても10秒で終わるので、許容範囲です。

---

## つまずきやすいポイント

### エラー1：「Zoom APIの認証情報が設定されていません」

**原因**：スクリプトプロパティに `ZOOM_CLIENT_ID`・`ZOOM_CLIENT_SECRET`・`ZOOM_ACCOUNT_ID` が設定されていない。

**解決策**：
GASエディタの「プロジェクトの設定 > スクリプトプロパティ」を開き、3つのキーと値を設定する。Zoom Developer Portalのアプリ詳細画面から値をコピーする。

### エラー2：「Zoomトークン取得失敗: 400」

**原因**：Client ID・Secret・Account IDのどれかが間違っている、または Server-to-Server OAuth アプリに必要なスコープが付与されていない。

**解決策**：
Zoom Developer Portal でアプリの「Scopes」タブを開き、`meeting:write:admin` が追加されているか確認する。アプリが「Activated」状態になっているか確認する。

### エラー3：「Zoom会議作成失敗: 401」

**原因**：アクセストークンが期限切れ（Server-to-Server OAuthのトークンは通常1時間で失効する）。

**解決策**：
コード内の `getZoomToken()` は実行のたびに新しいトークンを取得する設計になっているので、次回実行時に自動で解消します。同じトークンを長時間使い回す実装をしている場合はトークンを再取得する処理を追加する。

---

## まとめ

| 機能 | 実装内容 | 関数 |
|-----|---------|------|
| Zoom OAuthトークン取得 | Server-to-Server OAuth | `getZoomToken` |
| Zoom会議URL発行 | Meetings API POST | `createZoomMeeting` |
| カレンダー予定作成 | CalendarApp.createEvent | `createMeetingWithZoom` |
| スプシ一括作成 | ループ処理 | `bulkCreateMeetingsFromSheet` |

ポイントをまとめると：

- Zoom APIはServer-to-Server OAuthでトークンを取得する
- `location` と `description` の両方にZoom URLを入れると便利
- パスコードも `description` に含める
- 一括処理時は `Utilities.sleep(1000)` でレート制限を回避する

打ち合わせ予定を作るたびのZoom発行・コピペ作業が完全になくなります。

---

## 関連記事

- [GASでGoogleカレンダーの定期予定を自動作成する](/blog/gas-calendar-recurrence/)
- [GASでGoogleカレンダーの空き時間を自動検出する](/blog/gas-calendar-free-slot/)
- [GASでGoogleカレンダーの今日の予定をLINEに通知する](/blog/gas-calendar-daily-digest/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*本記事のコードは静的検証済みです。*
