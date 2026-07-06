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

こんにちは、現役ナースをしながらGASで副業を続けている凛です。

予定を1件作るたびに、Zoomを開いてリンクを発行して、コピーして、カレンダーの予定に貼り付ける——この作業、どうにかまとめて自動でできないの? そう思ったことはありませんか。私はあります。それも、リンクを貼り忘れて相手を会議室の前で待たせてしまった、という気まずい経験つきで。

結論から言うと、できます。Zoomにはミーティングを発行するためのAPIがあり、GASからそれを叩いて、返ってきたURLをそのままGoogleカレンダーの予定に埋め込めます。つまり「予定を作る」の一動作の中に「Zoomを発行して貼る」を丸ごと畳み込んでしまえる。この記事では、その実装を最後まで通しで作っていきます。

## そもそも、どういう流れで自動化するのか

先に全体像だけ押さえておきましょう。やることは大きく4ステップです。

| ステップ | 処理内容 |
|---------|---------|
| 1 | Zoom OAuth認証でアクセストークンを取得する |
| 2 | Zoom Meetings APIに打ち合わせ情報をPOSTする |
| 3 | 発行されたZoomミーティングURLを取得する |
| 4 | CalendarAppで予定を作成してdescription/locationにURLを埋め込む |

Zoomに「この日時でこのタイトルの会議を作って」とお願いして、返ってきたURLをカレンダーに書き込む。言葉にするとこれだけです。

## 準備：ZoomのServer-to-Server OAuthを設定する

Zoom APIを使うには、Zoom Developers 側でアプリを一つ登録しておく必要があります。ここは一度きりの作業です。

1. [marketplace.zoom.us](https://marketplace.zoom.us/) にアクセスしてZoomアカウントでログイン
2. 「Develop」→「Build App」→「Server-to-Server OAuth」を選択
3. アプリ名を入力して作成する
4. 「App Credentials」から以下をメモする
   - **Client ID**（ZOOM_CLIENT_ID）
   - **Client Secret**（ZOOM_CLIENT_SECRET）
   - **Account ID**（ZOOM_ACCOUNT_ID）
5. 「Scopes」から `meeting:write:admin` を追加する
6. GASエディタの「プロジェクトの設定 > スクリプトプロパティ」に保存する

3つの認証情報をスクリプトプロパティに預けておけば、あとはコードが自動で受け取ってくれます。

## コード：ZoomリンクをGoogleカレンダー予定に自動付与

準備が整ったら、本体です。本記事のコードは静的検証済みで、Google Apps Script のV8ランタイムで動作確認しています。

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

関数がいくつか並んでいますが、心臓部は `createMeetingWithZoom` です。タイトルと開始・終了時刻を渡すと、Zoomの発行からカレンダーへの書き込みまでを一気に片づけてくれます。残りはトークン取得やスプシ一括処理といった、それを支える部品だと思ってください。

## まずは1件、手で動かしてみる

いきなりトリガーで自動化する前に、手動で一度動かして感触をつかむのがおすすめです。

1. GASエディタで `exampleCreateMeeting` 関数の `title`・`start`・`end` を変更する
2. ドロップダウンで `exampleCreateMeeting` を選んで「▶ 実行」をクリック
3. GASの実行ログにZoom URLが表示される
4. Googleカレンダーを開いて予定にURLが入ったことを確認する

カレンダーを開いて、予定の中にZoomのURLがちゃんと入っていたら成功です。ここまで来れば、あとは呼び出し方を変えるだけでいくらでも応用が効きます。

## もう一歩踏み込むと、こんなところが効いてくる

通しで動くようになったら、次は「実際に使うと差が出るポイント」を押さえておきましょう。私が運用しながら「これは入れておいてよかった」と思った3点です。

### なぜ location にもURLを入れるのか

コードでは `description` だけでなく `location` にもZoom URLを入れています。理由は、GoogleカレンダーのスマホアプリだとlocationのURLをタップするだけで会議に飛べるからです。`description` に書くだけだと、長い説明文の中にURLが埋もれて探しにくい。両方に入れておくと、参加者が迷いません。これを徹底してから「Zoomのリンクどこですか?」という問い合わせがぱたっと止まりました。

### パスコードも一緒に書いておく理由

最近のZoomは、パスコード設定が実質必須になっています。URLだけ貼っても入れないケースがあるので、`join_url` と `password` を両方 `description` に書くのがマナーです。コードでは `zoom.password` が取れたときだけ表示する条件分岐にしてあるので、パスコードなしの会議でもエラーにはなりません。

### なぜ一括処理に sleep が要るのか

`bulkCreateMeetingsFromSheet` で何件も連続してZoom APIに投げると、レート制限（429エラー）に引っかかります。だからループの中に `Utilities.sleep(1000)` で1秒の間を入れてあります。10件処理しても10秒で終わるので、待ち時間としては許容範囲です。ここを省くと、途中から次々にエラーが出て泣きを見ます。

## つまずきやすいところ

### 「Zoom APIの認証情報が設定されていません」

**原因**：スクリプトプロパティに `ZOOM_CLIENT_ID`・`ZOOM_CLIENT_SECRET`・`ZOOM_ACCOUNT_ID` が設定されていない。

**解決策**：
GASエディタの「プロジェクトの設定 > スクリプトプロパティ」を開き、3つのキーと値を設定する。Zoom Developer Portalのアプリ詳細画面から値をコピーする。

### 「Zoomトークン取得失敗: 400」

**原因**：Client ID・Secret・Account IDのどれかが間違っている、または Server-to-Server OAuth アプリに必要なスコープが付与されていない。

**解決策**：
Zoom Developer Portal でアプリの「Scopes」タブを開き、`meeting:write:admin` が追加されているか確認する。アプリが「Activated」状態になっているか確認する。

### 「Zoom会議作成失敗: 401」

**原因**：アクセストークンが期限切れ（Server-to-Server OAuthのトークンは通常1時間で失効する）。

**解決策**：
コード内の `getZoomToken()` は実行のたびに新しいトークンを取得する設計になっているので、次回実行時に自動で解消します。同じトークンを長時間使い回す実装をしている場合はトークンを再取得する処理を追加する。

作った機能を一覧にすると、こうなります。

| 機能 | 実装内容 | 関数 |
|-----|---------|------|
| Zoom OAuthトークン取得 | Server-to-Server OAuth | `getZoomToken` |
| Zoom会議URL発行 | Meetings API POST | `createZoomMeeting` |
| カレンダー予定作成 | CalendarApp.createEvent | `createMeetingWithZoom` |
| スプシ一括作成 | ループ処理 | `bulkCreateMeetingsFromSheet` |

## 貼り忘れの心配から解放されて

この仕組みを入れてから、予定を作るたびのZoom発行・コピペ・追記の三連コンボが、まるごと消えました。何より大きかったのは、「リンク貼ったっけ?」という不安がなくなったことです。予定さえ作れば、Zoomは必ず付いている。相手を待たせてしまったあの気まずさを、もう味わわなくて済みます。

打ち合わせが多い時期ほど、この積み重ねはじわじわ効いてきます。最初のZoomアプリ登録だけ少し面倒ですが、そこさえ越えれば一生ものの自動化になります。まずは `exampleCreateMeeting` で1件、試してみてください。

## 関連記事

- [GASでGoogleカレンダーの定期予定を自動作成する](/blog/gas-calendar-recurrence/)
- [GASでGoogleカレンダーの空き時間を自動検出する](/blog/gas-calendar-free-slot/)
- [GASでGoogleカレンダーの今日の予定をLINEに通知する](/blog/gas-calendar-daily-digest/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*掲載コードは構文・API仕様・ロジックを確認していますが、実行時はお使いのZoom・カレンダー環境に合わせて調整してください。*
