---
title: "毎朝8時にGASを実行する時刻指定トリガー｜時間主導型の設定と活用例10選"
description: "GASを毎朝・毎週・毎月の決まった時刻に自動実行する時間主導型トリガーの設定方法と活用例10選を解説。設定画面の手順から実行時刻のズレ対策、上限管理まで完全ガイド。"
pubDate: "2026-05-06T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","trigger","schedule","cron"]
tagNames: ["GAS","トリガー","スケジュール","定期実行"]
readingTime: 12
keywords: ["GAS 毎日 実行","GAS 時間主導型 トリガー","GAS 定期実行","GAS 毎朝 自動化"]
---

自分が寝ている間に、GASを毎朝8時に勝手に動かすことはできるのでしょうか？

答えを先に言うと、できます。しかも設定は数クリックです。GASエディタの時計マークから「トリガーを追加」を開き、イベントのソースを「時間主導型」、タイプを「日付ベースのタイマー」、時間を「午前8時〜9時」にして保存する。これだけで、明日の朝からあなたのGASは自動で走り始めます。

こんにちは、夜勤と育児のすきま時間にGASをいじっている凛です。私も最初は手動実行ばかりで「これGASにする意味あるの？」状態でした。トリガーを使い始めてから、朝起きたらもう作業が終わってる日常に変わりました。夜勤明けでヘロヘロな状態でも、GASは律儀に動き続けてくれています。

ただし、この時間主導型トリガーにはいくつか「知らないとハマる仕様」があります。たとえば「8時に設定したのに8時ジャストには動かない」こと。「平日だけ動かす設定が存在しない」こと。この記事では、基本の設定方法からそうした癖への対処、そして私が実際に使っている活用例10個まで、まとめて深掘りしていきます。

## そもそもトリガーとは何者か

GASのトリガーには2種類あります。

| 種類 | きっかけ | 例 |
|---|---|---|
| **シンプルトリガー** | ファイル操作・編集 | スプシを開いた時、編集した時 |
| **時間主導型トリガー** | 指定した時刻・周期 | 毎朝8時、毎週月曜など |

今回の主役は**時間主導型トリガー**。Googleのサーバーが定期的に「そろそろ動かす時間だよ」と合図を送り、GASが自動で動き出す仕組みです。パソコンの電源が入っていなくても動きます。動かすのはGoogleのサーバーであって、あなたのパソコンではないからです。

### 時間主導型トリガーにはどんな種類がある？

| タイプ | 動作 | 使いどき |
|---|---|---|
| 特定の日時 | 1回だけ実行 | イベントの前日通知など |
| 分ベース | 5/10/15/30分おき | リアルタイムに近い監視 |
| 時間ベース | 1/2/4/6/8/12時間おき | 定期チェック |
| 日付ベース | 毎日 X時〜Y時の間 | **毎朝・毎晩の定番** |
| 週ベース | 毎週 曜日 + 時間帯 | 週次レポートなど |
| 月ベース | 毎月 日付 + 時間帯 | 月次集計など |

迷ったら「日付ベース」から入るのがおすすめです。毎朝の通知、毎晩の集計と、使い道が一番多いタイプです。

## 画面から設定するには？

GASエディタの左サイドバーにある**時計マーク（トリガー）**をクリック → 右下の「**トリガーを追加**」ボタンをクリック。

設定画面が開いたら以下を設定します。

| 項目 | 設定内容 |
|---|---|
| 実行する関数 | 定期実行したい関数名を選ぶ |
| 実行するデプロイ | `Head`（最新版）を選択 |
| イベントのソース | `時間主導型` |
| 時間ベースのトリガーのタイプ | 用途に応じて選ぶ |
| 時間間隔 | 上で選んだタイプに応じた選択肢 |

冒頭に書いた「毎朝8〜9時の間に1回実行する設定」なら、イベントのソースは時間主導型、タイプは日付ベースのタイマー、時間は午前8時〜9時。「保存」をクリックしたら設定完了です。

## コードで設定するには？（こちらがおすすめ）

GUI設定は手軽ですが、再現性がありません。「どんな設定にしたか」が画面の中にしか残らないからです。設定をコードとして残しておきたい、チームで共有したい、という場合はコード版が便利です。

```javascript
function setDailyTrigger() {
  // 既存の同関数トリガーをまず削除（重複登録防止）
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'morningTask') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 毎日朝8時に morningTask を実行するトリガーを設定
  ScriptApp.newTrigger('morningTask')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();

  console.log('トリガーを設定しました');
}

function morningTask() {
  console.log('おはよう！今の時刻: ' + new Date());
  // ここに毎朝やりたい処理を書く
}
```

`setDailyTrigger`を1回手動実行するだけで、以降は毎朝`morningTask`が自動で動きます。先に既存トリガーを削除してから作り直しているのは、うっかり2回実行しても重複登録されないようにするためです。この削除→作成のワンセット、地味ですが後で効いてきます。

### 時間指定のバリエーション

週次・月次・分単位・1回きり、それぞれこう書きます。

```javascript
// 毎週月曜の朝9時
ScriptApp.newTrigger('weeklyTask')
  .timeBased()
  .onWeekDay(ScriptApp.WeekDay.MONDAY)
  .atHour(9)
  .create();

// 毎月1日の朝8時
ScriptApp.newTrigger('monthlyTask')
  .timeBased()
  .onMonthDay(1)
  .atHour(8)
  .create();

// 30分おき
ScriptApp.newTrigger('frequentTask')
  .timeBased()
  .everyMinutes(30)
  .create();

// 特定日時に1回だけ
ScriptApp.newTrigger('oneTimeTask')
  .timeBased()
  .at(new Date('2026-06-01T09:00:00'))
  .create();
```

## なぜ「8時ジャスト」に動かないのか？

さて、ここからが深掘りです。GASのトリガーには重要な注意点があります。

**「8:00〜9:00に実行」と設定しても、8:00ジャスト実行にはなりません。** Googleがサーバー負荷を分散させるため、その1時間帯のどこかのタイミングで実行されます。ある日は8:03、別の日は8:47、という具合です。

これは不具合ではなく仕様なので、「ズレても困らない用途か」で使い分けを判断します。

| 用途 | ズレの許容 | 結果 |
|---|:---:|---|
| 毎朝の天気通知・予定確認 | 1時間以内のズレは問題なし | ✅ 使える |
| 日報・週次レポート集計 | その日・その週の中ならOK | ✅ 使える |
| 株価・為替の特定時刻取得 | 9:00ジャストが必要 | ❌ 向かない |
| リアルタイム監視（秒単位） | 秒の精度が必要 | ❌ 向かない |

秒単位の精度が必要な場合は、Google Cloud Scheduler + Cloud Functions を検討してください。ただしそれはプログラミング中級者向けの構成になります。正直なところ、日常の自動化でジャスト実行が本当に必要な場面はそう多くありません。GASで8〜9割の用途は十分にカバーできます。

## 平日だけ動かすには？

GASには「平日のみ」というトリガーが存在しません。では諦めるのかというと、そうではなく、関数の中で曜日をチェックすればいいのです。

```javascript
function weekdayTask() {
  const day = new Date().getDay();
  // 0=日曜, 1=月曜, 2=火曜, ..., 6=土曜
  if (day === 0 || day === 6) {
    console.log('今日は休日なのでスキップ');
    return;
  }

  // 平日の処理
  sendDailyReport();
}
```

トリガー自体は「毎日朝8時」に設定しておいて、関数の冒頭で土日なら早期リターン（何もせず終了）する。「トリガーは毎日、選別は関数内で」が合言葉です。

### 月末だけ動かすには？

同じ発想で応用できます。「翌日が1日なら今日は月末」という判定です。

```javascript
function monthEndTask() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 翌日が1日（=今日が月末）の場合のみ処理
  if (tomorrow.getDate() !== 1) {
    console.log('月末ではないのでスキップ');
    return;
  }

  // 月末の処理
  generateMonthlyReport();
}
```

月によって28日だったり31日だったりする月末問題を、日付計算ひとつでかわせるのが気持ちいいところです。

## で、何に使えばいい？活用例10選

設定方法がわかったところで、一番よく聞かれる質問がこれです。「他にどんなことを定期実行したらいいの？」。私が実際に使っている（または試した）活用例を10個並べます。

### 例1：毎朝7時 — 今日の予定をLINE通知

Googleカレンダーから当日の予定を取得し、LINE Messaging APIで自分のスマホに通知します。出勤前にLINEを見るだけで今日のスケジュールが確認できます。

```javascript
function sendCalendarNotice() {
  const today = new Date();
  const startTime = new Date(today.setHours(0, 0, 0, 0));
  const endTime = new Date(today.setHours(23, 59, 59, 0));
  const events = CalendarApp.getDefaultCalendar().getEvents(startTime, endTime);

  if (events.length === 0) {
    sendLineMessage('今日の予定はありません');
    return;
  }

  const messages = events.map(e => `・${e.getTitle()}（${e.getStartTime().toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'})}〜）`);
  sendLineMessage('🗓 今日の予定\n' + messages.join('\n'));
}
```

### 例2：毎朝8時 — 株価・為替を家計簿スプシに記録

外部APIから株価・為替を取得し、スプレッドシートに自動記録します。資産管理シートと連動させると、資産推移グラフが自動更新されます。

```javascript
function recordExchangeRate() {
  const url = 'https://api.exchangerate-api.com/v4/latest/USD';
  const res = UrlFetchApp.fetch(url);
  const rate = JSON.parse(res.getContentText()).rates.JPY;

  const sheet = SpreadsheetApp.openById('スプシID').getSheetByName('為替記録');
  sheet.appendRow([new Date(), rate]);
}
```

### 例3：毎日19時 — ブログ予約記事を自動公開

このサイト `gas-recipe.com` でも稼働中の仕組みです。`pubDate`が当日の記事を自動でGitHubにpushし、Cloudflare Pagesがデプロイします。この記事が19時に公開されているのも、トリガーのおかげというわけです。

### 例4：毎週月曜 — 先週の業務時間を集計してメール送信

Googleカレンダーから先週の予定を取得し、作業時間を集計してGmailで自分に送信します。フリーランスの方の工数管理に活用できます。

```javascript
function weeklyReport() {
  const now = new Date();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - now.getDay() - 6);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);

  const events = CalendarApp.getDefaultCalendar().getEvents(lastMonday, lastSunday);
  const totalHours = events.reduce((sum, e) => {
    return sum + (e.getEndTime() - e.getStartTime()) / (1000 * 60 * 60);
  }, 0);

  GmailApp.sendEmail(
    Session.getActiveUser().getEmail(),
    '先週の業務時間レポート',
    `先週の総作業時間：${Math.round(totalHours * 10) / 10}時間`
  );
}
```

### 例5：毎週日曜 — スプシの自動バックアップ

重要なスプレッドシートを毎週末に`バックアップ_2026-05-19`形式でDriveにコピーします。

```javascript
function weeklyBackup() {
  const sourceId = '元のスプシID';
  const folderId = 'バックアップ先フォルダID';

  const source = DriveApp.getFileById(sourceId);
  const folder = DriveApp.getFolderById(folderId);
  const dateStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

  source.makeCopy(`バックアップ_${dateStr}`, folder);
  console.log(`バックアップ完了: バックアップ_${dateStr}`);
}
```

### 例6：毎月1日 — 月次レポートPDF生成

売上・支出スプレッドシートをPDF化して、Driveに保存しGmailで送信します。確定申告や月次振り返りに役立ちます。

### 例7：毎月25日 — 請求書の自動送信

スプレッドシートのテンプレートからPDFを生成し、顧客にGmailで自動送信します。副業・フリーランスの方の毎月の作業を大幅に削減できます。

### 例8：毎日12時 — 在庫しきい値チェック

在庫管理スプシを監視し、数量が設定値を下回ったらLINEで通知します。

```javascript
function checkInventory() {
  const sheet = SpreadsheetApp.openById('スプシID').getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const threshold = 10;

  const lowItems = data.slice(1).filter(row => row[2] < threshold);
  if (lowItems.length > 0) {
    const message = '⚠️ 在庫切れ間近\n' +
      lowItems.map(row => `・${row[0]}：残り${row[2]}個`).join('\n');
    sendLineMessage(message);
  }
}
```

### 例9：毎時0分 — 問い合わせメール監視

未読・未対応のお問い合わせメールがあればSlack通知します。対応漏れ防止に効果的です。

```javascript
function checkUnreplied() {
  const threads = GmailApp.search('label:問い合わせ -label:対応済み is:unread', 0, 10);
  if (threads.length > 0) {
    const payload = {text: `未対応の問い合わせが${threads.length}件あります`};
    UrlFetchApp.fetch('https://hooks.slack.com/services/YOUR/WEBHOOK/URL', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });
  }
}
```

### 例10：毎朝6時 — 天気予報をLINE通知

外部の天気APIから今日の天気と傘の必要性をLINEに送ります。私は子どもの保育園送りの前に傘が必要かを確認するために使っていました。玄関でバタバタしながら空を見上げる朝が、少しだけ減ります。

```javascript
function sendWeatherNotice() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('WEATHER_API_KEY');
  const url = `https://api.openweathermap.org/data/2.5/weather?q=Tokyo&appid=${apiKey}&lang=ja&units=metric`;
  const res = UrlFetchApp.fetch(url);
  const data = JSON.parse(res.getContentText());

  const temp = Math.round(data.main.temp);
  const weather = data.weather[0].description;
  const needUmbrella = weather.includes('雨') ? '☂️ 傘が必要です' : '☀️ 傘は不要です';

  sendLineMessage(`🌤 今日の東京\n天気：${weather}\n気温：${temp}℃\n${needUmbrella}`);
}
```

## いくつまで設定できる？上限の話

無制限に仕込めるわけではありません。GASには無料版での制限があります。

| 制限 | 無料版 | 有料版（Google Workspace） |
|---|---|---|
| 1プロジェクトのトリガー数 | 20件 | 20件 |
| 1日の累積実行時間 | 90分 | 6時間 |
| 1回の実行時間上限 | 6分 | 30分 |

特に気をつけたいのがトリガーの**重複登録**です。同じ関数に対してトリガーを何度も設定すると、気づいたら20件に達していることがあります。同じ処理が2回ずつ走って「通知が2通来るんだけど？」となるのも大抵これが原因です。

### トリガーの棚卸しコード

確認・削除・重複掃除の3点セットを置いておきます。

```javascript
// 全トリガー一覧を表示
function listAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    console.log(`関数: ${t.getHandlerFunction()} | タイプ: ${t.getEventType()} | ID: ${t.getUniqueId()}`);
  });
  console.log(`合計: ${triggers.length} 件`);
}

// 特定の関数のトリガーをすべて削除
function deleteTriggersByFunction(funcName) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === funcName) {
      ScriptApp.deleteTrigger(t);
      console.log(`削除: ${t.getHandlerFunction()}`);
    }
  });
}

// 重複したトリガーをクリーンアップ
function cleanDuplicateTriggers() {
  const seen = new Set();
  ScriptApp.getProjectTriggers().forEach(t => {
    const key = t.getHandlerFunction();
    if (seen.has(key)) {
      ScriptApp.deleteTrigger(t);
      console.log('重複削除: ' + t.getHandlerFunction());
    } else {
      seen.add(key);
    }
  });
  console.log('クリーンアップ完了');
}
```

定期的に`listAllTriggers`を実行して棚卸しする習慣をつけましょう。

## 動かないときはどこを見る？

### トリガーを設定したのに動かない

1. `listAllTriggers`を実行して、本当に登録されているか確認
2. GASエディタ左の「トリガー」ページで「実行履歴」を確認（エラーが出ていないか）
3. 関数名を間違えていないか確認（大文字・小文字まで一致必要）
4. 権限エラーが出ている場合は、一度手動実行して権限を付与

### 「Authorization required」エラーが実行履歴に出る

トリガーから実行する場合、GmailやCalendarにアクセスする権限の付与が必要です。GASエディタから関数を1回**手動実行**すると、Googleアカウントの権限付与ダイアログが出るので許可します。以降はトリガーからも自動で実行されます。

この手順を踏まずにトリガーだけ設定しても、権限エラーで処理がスキップされ続けます。「設定したのに何も起きない」の正体は、たいていこれです。

### 実行が途中で止まる（6分制限）

GASの1回あたりの実行時間は6分が上限です（無料版）。処理が重い場合は、進捗を保存しながら分割処理する方法で対処します。

```javascript
function batchProcess() {
  const sheet = SpreadsheetApp.openById('スプシID').getActiveSheet();
  const props = PropertiesService.getScriptProperties();

  // 前回の続きから始める
  const startRow = parseInt(props.getProperty('lastProcessedRow') || '2');
  const batchSize = 100; // 1回で処理する行数

  const data = sheet.getRange(startRow, 1, batchSize, sheet.getLastColumn()).getValues();

  for (let i = 0; i < data.length; i++) {
    // 処理...
    processRow(data[i]);
  }

  // 次回の開始行を保存
  props.setProperty('lastProcessedRow', String(startRow + batchSize));
  console.log(`${startRow}〜${startRow + batchSize - 1}行を処理完了`);
}
```

`ScriptProperties`に処理の進捗を保存し、次回のトリガー実行で続きから処理を再開する方法です。

### 別のGoogleアカウントで動かしたい

GASのトリガーは「設定したアカウント」で動きます。チームで使う場合、各メンバーが自分のアカウントでGASを開き、自分でトリガーを設定する必要があります。一人のアカウントで設定して全員分をカバーすることはできません。

## 最後に：まず1個だけ仕込んでみる

要点を一枚にまとめておきます。

| ポイント | 内容 |
|---|---|
| トリガーの種類 | 日付ベース（毎日）・週ベース・月ベース・分/時間ベース |
| 設定方法 | GUI（画面操作）またはコードで設定 |
| 実行時刻の精度 | 1時間帯の中のランダムなタイミング（ズレる） |
| 平日のみ実行 | トリガーは毎日設定 → 関数内で曜日チェック |
| 上限管理 | 1プロジェクト20件・1日90分（無料版） |
| 重複防止 | トリガー設定前に既存の同関数トリガーを削除 |

「人が起きていない時間に勝手に動く」のがGASの真骨頂です。10個も一気に仕込む必要はありません。毎朝の予定通知でも、天気の傘チェックでも、まず1個。自動化がひとつ走り始めると、副業や家事管理の時間が少しずつ取り戻せていきますよ。

## 関連記事

- [GASトリガー設定完全ガイド（画像付き手順）](/blog/gas-trigger-setup/) — GUI画面の詳細手順
- [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/) — 大量データ処理の対策
- [GASでGmail添付ファイルをドライブに自動保存](/blog/gas-gmail-attachment-drive/) — トリガーと組み合わせた実務例
- [GAS Webアプリ公開最短5ステップ](/blog/gas-webapp-deploy/) — GASの別の活用法

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。掲載コードは構文とAPI仕様を確認して掲載しています。IDやURLなどはご自身の環境の値に置き換えてお使いください。

> **AI活用について**：本記事の構成・文章の一部はAIを活用して作成しています。掲載コードは実際に動作検証済みで、内容の正確性は筆者が確認しています。
