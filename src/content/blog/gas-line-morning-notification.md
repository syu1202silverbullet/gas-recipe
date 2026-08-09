---
title: "GASでLINEに毎朝「今日の予定・天気・タスク」を自動通知する仕組み"
description: "毎朝LINEに「今日の予定＋天気＋やることリスト」が自動で届く仕組みを、Google Apps Scriptのコピペコード付きで解説。LINE Messaging APIのトークン取得から気象庁データの読み方、毎朝7時のトリガー設定、よくあるエラーの直し方まで一通りまとめました。"
pubDate: "2026-04-18"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "line"
categoryName: "LINE連携"
tagSlugs: ["gas", "line", "notification", "morning-routine"]
tagNames: ["GAS", "LINE", "通知", "朝活"]
readingTime: 12
---

夜勤明けの朝、玄関で「あれ、今日って子どもの検診いつだっけ」とスマホを3回も開いた日がありました。カレンダー、天気、買い物メモ。全部バラバラの場所にあるからです。

それが今は、**朝7時にLINEが1通届くだけ**になりました。今日の予定も、傘がいるかも、やることも、全部そこに書いてあります。作るのに2時間、使うのは毎朝10秒です。

この記事では、その仕組みをコピペできるコード付きで最初から最後まで解説します。GASを触ったことがない方でも、上から順にやれば動くように書きました。

## 完成イメージ：毎朝こんなLINEが届きます

```text
おはようございます！ 4月18日（土）

☀ 今日の天気
晴れ時々くもり／最高21℃ 最低12℃
降水確率 10%

📅 今日の予定（3件）
09:00 子どもの1歳半健診
13:30 訪問（田中様）
19:00 【終日】燃えるゴミ

✅ やること（未完了 4件）
・保育園の書類を提出
・請求書を送る（〆切 今日）
・洗剤を買う
・ブログ記事の下書き

今日もぼちぼちいきましょう。
```

情報を探しに行くのではなく、情報のほうから来てくれる状態です。ここまで全部、GASの標準機能と無料のデータだけで作れます。

## 仕組みの全体像

処理の流れはシンプルです。

1. 毎朝7時、時間主導型トリガーでGASが起動する
2. Googleカレンダーから**今日の予定**を取得
3. 気象庁の公開データから**今日の天気**を取得
4. スプレッドシートのタスク表から**未完了だけ**を抽出
5. 3つを1つのメッセージに組み立てる
6. LINE Messaging APIで**自分宛にプッシュ送信**

必要なものは次の3つだけです。

| 必要なもの | 費用 | 備考 |
|---|---|---|
| Googleアカウント | 無料 | GAS・カレンダー・スプレッドシート |
| LINE公式アカウント（Messaging API） | 無料 | 自分に送るだけなら無料枠で十分 |
| 天気データ | 無料 | 気象庁の公開データを利用 |

## 準備1：LINE Messaging APIのチャネルを作る

### かつての「LINE Notify」は終了しています

GASの解説記事でよく見かける **LINE Notify は2025年3月31日でサービス終了**しました。今から作るなら **LINE Messaging API** 一択です。古い記事のコード（`https://notify-api.line.me/api/notify`）をコピーしても動かないので注意してください。

### チャネルアクセストークンを取得する

1. [LINE Developers](https://developers.line.biz/ja/) にLINEアカウントでログイン
2. プロバイダーを新規作成（名前は自分がわかるものでOK。例：`personal-bot`）
3. 「新規チャネル作成」→ **Messaging API** を選択
4. チャネル名・説明・業種を入力して作成
5. 作成したチャネルの「Messaging API設定」タブを開く
6. 一番下の **チャネルアクセストークン（長期）** を発行してコピー

### 自分のユーザーIDを調べる

送信先として自分の**ユーザーID**（`U`から始まる33文字）が必要です。同じ「Messaging API設定」タブの上のほうに **あなたのユーザーID** が表示されているので、それをコピーします。

あわせて、同じ画面のQRコードから**自分でその公式アカウントを友だち追加**しておいてください。友だちになっていないと送信できません。

### トークンはコードに直接書かない

チャネルアクセストークンは、他人に知られると自分のLINEアカウントからメッセージを送られてしまう鍵です。**コードに直接書かず、スクリプトプロパティに保存します。**

GASエディタで「プロジェクトの設定（⚙）」→「スクリプト プロパティ」→「スクリプト プロパティを追加」から、次の2つを登録してください。

| プロパティ名 | 値 |
|---|---|
| `LINE_TOKEN` | 発行したチャネルアクセストークン |
| `LINE_USER_ID` | あなたのユーザーID（Uから始まる文字列） |

コード側からは `PropertiesService.getScriptProperties().getProperty('LINE_TOKEN')` で読み出します。これならコードを人に見せても鍵は漏れません。

## 準備2：タスク表のスプレッドシートを用意する

適当なスプレッドシートを1つ作り、シート名を `タスク` にして、次のように並べます。

| A列：やること | B列：状態 | C列：期限 |
|---|---|---|
| 保育園の書類を提出 | | 2026/04/18 |
| 請求書を送る | | 2026/04/18 |
| 洗剤を買う | | |
| 資源ゴミを出す | 済 | |

B列に「済」と入っている行は通知に出しません。C列の期限は空でもかまいません。作ったらURLの `/d/` と `/edit` の間にある長い文字列（スプレッドシートID）を控えておきます。

## コード全文（コピペで動きます）

スプレッドシートのメニューから「拡張機能」→「Apps Script」を開き、`コード.gs` の中身を全部消して以下を貼り付けてください。

```javascript
// ===== 設定 =====
const SHEET_ID = 'ここにスプレッドシートIDを貼る';
const SHEET_NAME = 'タスク';
const AREA_CODE = '130000'; // 気象庁の地域コード（130000＝東京都）
const TIMEZONE = 'Asia/Tokyo';

/** 毎朝トリガーで実行するメイン関数 */
function sendMorningDigest() {
  const today = new Date();
  const header = Utilities.formatDate(today, TIMEZONE, 'M月d日') +
    '（' + '日月火水木金土'.charAt(today.getDay()) + '）';

  const message = [
    'おはようございます！ ' + header,
    '',
    getWeatherText_(),
    '',
    getEventsText_(today),
    '',
    getTasksText_(),
    '',
    '今日もぼちぼちいきましょう。'
  ].join('\n');

  pushLine_(message);
}

/** 今日の予定を文章にする */
function getEventsText_(date) {
  const events = CalendarApp.getDefaultCalendar().getEventsForDay(date);
  if (events.length === 0) return '📅 今日の予定\n予定なし。ゆっくりできますね。';

  const lines = events.map(function (e) {
    const time = e.isAllDayEvent()
      ? '【終日】'
      : Utilities.formatDate(e.getStartTime(), TIMEZONE, 'HH:mm') + ' ';
    return time + e.getTitle();
  });
  return '📅 今日の予定（' + events.length + '件）\n' + lines.join('\n');
}

/** 未完了タスクを文章にする */
function getTasksText_() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();

  const todos = rows
    .slice(1) // 1行目は見出しなので飛ばす
    .filter(function (row) { return row[0] !== '' && row[1] !== '済'; })
    .map(function (row) {
      const limit = row[2]
        ? '（〆切 ' + Utilities.formatDate(new Date(row[2]), TIMEZONE, 'M/d') + '）'
        : '';
      return '・' + row[0] + limit;
    });

  if (todos.length === 0) return '✅ やること\n今日はタスクなし！';
  return '✅ やること（未完了 ' + todos.length + '件）\n' + todos.join('\n');
}

/** 気象庁の公開データから今日の天気を取る */
function getWeatherText_() {
  try {
    const url = 'https://www.jma.go.jp/bosai/forecast/data/forecast/' + AREA_CODE + '.json';
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return '☀ 今日の天気\n（取得できませんでした）';

    const data = JSON.parse(res.getContentText());
    const series = data[0].timeSeries;
    const weather = series[0].areas[0].weathers[0].replace(/　/g, ' ');
    const pops = series[1].areas[0].pops; // 降水確率（6時間ごと）
    const temps = data[1].timeSeries[1].areas[0].temps; // [最低, 最高]

    return '☀ 今日の天気\n' + weather +
      '\n最低 ' + temps[0] + '℃／最高 ' + temps[1] + '℃' +
      '\n降水確率 ' + Math.max.apply(null, pops.map(Number)) + '%';
  } catch (e) {
    // 天気が取れなくても、予定とタスクは届けたいので握りつぶす
    return '☀ 今日の天気\n（取得できませんでした：' + e.message + '）';
  }
}

/** LINEに送る */
function pushLine_(text) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_TOKEN');
  const userId = props.getProperty('LINE_USER_ID');

  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: text.slice(0, 4900) }] // 上限5000文字
    }),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    console.log('LINE送信エラー: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
}

/** 毎朝7時のトリガーを作る（1回だけ実行する） */
function createMorningTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendMorningDigest') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendMorningDigest').timeBased().atHour(7).everyDays(1).create();
  console.log('毎朝7時台のトリガーを作成しました');
}
```

## 動かす手順

1. 1行目の `SHEET_ID` を自分のスプレッドシートIDに書き換える
2. `AREA_CODE` を自分の地域に変える（東京 `130000` / 大阪 `270000` / 愛知 `230000` / 福岡 `400000` / 北海道・石狩 `016000` / 香川 `370000`）
3. エディタ上部の関数選択で `sendMorningDigest` を選び、実行ボタンを押す
4. 初回は権限の確認画面が出るので、自分のアカウントを選んで許可する
5. LINEに届いたら成功。届いたら `createMorningTrigger` を1回だけ実行する

`createMorningTrigger` を実行すると、以後は毎朝7時台に自動で届きます。GASの時間主導型トリガーは「7時ちょうど」ではなく**7時〜8時のどこか**で実行される仕様なので、きっちり7:00に欲しい場合はこの方法では叶いません（そこは割り切りポイントです）。

## パーツごとの解説

### カレンダー：getEventsForDayが一番ラク

今日の予定を取るだけなら `getEventsForDay(new Date())` が最短です。開始・終了時刻を自分で計算する必要がありません。

終日予定（ゴミの日など）は `isAllDayEvent()` が `true` を返し、`getStartTime()` は午前0時になります。そのまま時刻を出すと「00:00 燃えるゴミ」と表示されて気持ち悪いので、コードでは【終日】に置き換えています。

複数のカレンダーを見たい場合は `CalendarApp.getAllCalendars()` で回すか、`CalendarApp.getCalendarById('カレンダーID')` を使ってください。

### 天気：気象庁の公開データはAPIキーが要らない

気象庁が防災情報サイトで使っているJSONは、APIキーなしで読めます。上のコードで使っているのがそれです。

ただし注意点があります。**これは「一般利用者向けのAPI」として正式に案内されているものではありません。**構造が予告なく変わる可能性があるため、コードでは `try / catch` で囲んで、取得に失敗しても予定とタスクは届くようにしてあります。気象庁のコンテンツは出典を明示すれば利用可能とされています（[気象庁ホームページについて](https://www.jma.go.jp/jma/kishou/info/coment.html)）。

きっちりした仕様のAPIを使いたい場合は、OpenWeatherMapなどの無料枠のあるサービスに切り替えてください。その場合はAPIキーを取得し、`LINE_TOKEN` と同じようにスクリプトプロパティに保存します。

### タスク：`filter` で「済」を落とすだけ

スプレッドシートの読み取りは `getDataRange().getValues()` で全部まとめて配列にするのが定石です。1行ずつ `getRange().getValue()` で読むと、行数が増えたときに極端に遅くなります。

### 送信：muteHttpExceptionsを必ず付ける

`UrlFetchApp.fetch` は、既定のままだとエラー応答（401など）が返ってきた瞬間に例外で止まります。`muteHttpExceptions: true` を付けておくと、ステータスコードと本文を自分で確認できるので、原因がすぐわかります。

## よくあるエラーと対処

### 401 Unauthorized が返る

チャネルアクセストークンが違うか、コピー時に前後の空白が入っています。スクリプトプロパティを開いて、値の前後に余計なスペースがないか確認してください。トークンを再発行した場合は、古い値が残っているのが原因です。

### 400 Bad Request が返る

送信先のユーザーIDが違うことがほとんどです。`U`から始まる33文字になっているか確認してください。チャネルID（数字）やチャネルシークレットと取り違えやすい部分です。

### エラーは出ないのにLINEが来ない

自分でその公式アカウントを**友だち追加していない**ケースが大半です。LINE Developersの「Messaging API設定」にあるQRコードから追加してください。もうひとつ、無料プランの送信上限（月200通）に達している可能性もあります。毎朝1通なら月31通なので、まず超えません。

### 「承認が必要です」で止まる

初回実行時の権限許可が終わっていません。実行→アカウント選択→「詳細」→「（プロジェクト名）に移動」→許可、の順で進めてください。個人で作った未公開のスクリプトなので、この警告表示は正常です。

### 文字数が多すぎて送れない

LINEのテキストメッセージは1通5,000文字までです。予定やタスクが多い日にあふれないよう、コードでは `text.slice(0, 4900)` で切っています。

## 応用アイデア

一度この形ができると、朝の1通に好きな情報を足せます。私が実際に足したり試したりしたのは次のようなものです。

- **ゴミ出しの種類**：曜日で判定して「今日は資源ゴミ」と入れる
- **その日の持ち物**：カレンダーの予定名に応じて「保険証」「上履き」などを出す
- **家計の残り**：スプレッドシートの今月の食費残高を1行だけ入れる
- **副業の数字**：前日のブログPVや売上を集計して入れる

情報を1か所に集めるほど、朝にスマホを開く回数が減ります。逆に、詰め込みすぎると読まなくなるので、**5項目くらいまで**に抑えるのが続けるコツでした。

## まとめ

- LINE Notifyは終了済み。今から作るなら **Messaging API**
- トークンとユーザーIDは**スクリプトプロパティ**に置く（コードに直書きしない）
- カレンダーは `getEventsForDay`、スプレッドシートは `getValues` でまとめ取り
- 天気は気象庁の公開データで十分（ただし非公式なので `try / catch` で守る）
- トリガーは時間主導型で「7時台」。分単位の指定はできない

作るのに2時間、効果は毎朝ずっと続きます。朝の「あれ、今日なんだっけ」がゼロになるだけで、1日の出だしがずいぶん軽くなりました。

## 関連記事

- [GASでGoogleカレンダーに予定登録する最短10行コード](/blog/gas-calendar-event-create/)
- [今日の予定を毎朝LINEで届けるGAS完全版｜カレンダー要約Bot実装](/blog/gas-calendar-daily-digest/)
- [GASよく出るエラー10選と解決コード集｜辞書代わりに使える完全版](/blog/gas-error-exception/)
