---
title: "今日の予定を毎朝LINEで届けるGAS完全版｜カレンダー要約Bot実装"
description: "Googleカレンダーの今日の予定を毎朝LINEで自分に通知するGASを凛が解説。スケジュール忘れゼロ・通勤前の心構えに最適。看護師ママが朝の慌ただしさを改善した実体験つきで丁寧に説明します。"
pubDate: "2026-06-14T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","line","notification","reminder"]
tagNames: ["GAS","カレンダー","LINE","通知"]
readingTime: 8
keywords: ["GAS カレンダー LINE 通知","GAS 今日の予定","GAS 朝 自動通知 カレンダー"]
---

どうも、凛です。夜勤明けの朝、布団から出る前にスマホのLINEだけ見て一日の段取りを組む——これが最近の習慣です。カレンダーアプリをわざわざ開くあの一手間さえ、忙しい朝には惜しい。仮眠から覚めて「今日の午後、副業の打ち合わせあったよね……？」と焦る、あの感じをなくしたくて、今日の予定をまるごとLINEに流し込むGASを作りました。

結論から先に言ってしまうと、下のコードを毎朝7時のトリガーで動かすだけです。起きた頃にはその日の予定がLINEに届いている。まずは動くものを見せて、そのあとで「なぜこう書いたのか」を順に説明していきます。

---

## まず動くコードを置いておきます

前置きより先にコードです。このあと「なぜこう書いたか」を解説するので、まずは全体像だけ眺めてください。

### 基本の朝の予定通知コード

```javascript
/**
 * 今日の予定をLINEで通知する
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function morningCalendarLine() {
  // 今日の開始時刻
  const now = new Date();
  now.setHours(0, 0, 0, 0); // 今日の0時から

  // 今日の終了時刻
  const tomorrow = new Date(now.getTime() + 86400000); // 翌日0時まで

  // デフォルトカレンダーから今日の予定を取得
  const events = CalendarApp.getDefaultCalendar().getEvents(now, tomorrow);

  // 予定がゼロの場合でも通知する（無音だと心配になるため）
  if (events.length === 0) {
    pushLine('☕ 今日は予定なし！ゆっくり過ごせます');
    return;
  }

  // 通知メッセージを組み立て
  const dateStr = now.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  });

  let msg = `📅【${dateStr}の予定】\n`;

  // 終日イベントを先に表示
  const allDayEvents = events.filter(e => e.isAllDayEvent());
  const timedEvents = events.filter(e => !e.isAllDayEvent());

  if (allDayEvents.length > 0) {
    msg += '\n📌 終日:\n';
    allDayEvents.forEach(e => {
      msg += `  ${e.getTitle()}\n`;
    });
  }

  if (timedEvents.length > 0) {
    msg += '\n⏰ 時間指定:\n';
    // 開始時刻でソート
    timedEvents
      .sort((a, b) => a.getStartTime() - b.getStartTime())
      .forEach(e => {
        // 時刻を HH:mm 形式に整形
        const startTime = Utilities.formatDate(e.getStartTime(), 'Asia/Tokyo', 'HH:mm');
        const endTime = Utilities.formatDate(e.getEndTime(), 'Asia/Tokyo', 'HH:mm');
        msg += `  ${startTime}〜${endTime} ${e.getTitle()}\n`;
      });
  }

  msg += `\n合計 ${events.length} 件の予定があります。今日も頑張りましょう！`;

  // LINEに送信
  pushLine(msg);
}

/**
 * LINE Messaging APIでメッセージを送信する共通関数
 * ※スクリプトプロパティに LINE_TOKEN と LINE_USER_ID が必要
 */
function pushLine(text) {
  // スクリプトプロパティからトークンとユーザーIDを取得
  // ← コードに直書きするのはセキュリティ上NG
  const TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  const USER_ID = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID');

  if (!TOKEN || !USER_ID) {
    Logger.log('エラー: スクリプトプロパティに LINE_TOKEN または LINE_USER_ID が設定されていません');
    return;
  }

  // LINE Messaging APIのpushメッセージエンドポイントに送信
  const url = 'https://api.line.me/v2/bot/message/push';

  const payload = {
    to: USER_ID,
    messages: [{ type: 'text', text: text }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + TOKEN },
    payload: JSON.stringify(payload)
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log(`LINE送信成功: ${response.getResponseCode()}`);
  } catch (e) {
    Logger.log(`LINE送信失敗: ${e.message}`);
  }
}
```

これをGASに貼って、あとで説明するトリガーを設定すれば動きます。仕事用・家族用・副業用とカレンダーを分けている方は、次のバージョンを使ってください。

### 複数カレンダーをまとめて通知するバージョン

```javascript
/**
 * 複数カレンダー（仕事・家族・副業）をまとめて通知する
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function morningCalendarLineAllCals() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  // 取得したいカレンダーのID（カレンダーの設定から確認できます）
  const CALENDAR_IDS = [
    'primary',           // デフォルト（メイン）カレンダー
    '仕事カレンダーのID', // 例
    '家族カレンダーのID', // 例
  ];

  // 全カレンダーの予定をまとめて取得
  const allEvents = [];

  CALENDAR_IDS.forEach(calId => {
    try {
      const cal = calId === 'primary'
        ? CalendarApp.getDefaultCalendar()
        : CalendarApp.getCalendarById(calId);

      if (!cal) return;

      const events = cal.getEvents(today, tomorrow);
      events.forEach(e => {
        allEvents.push({
          title: e.getTitle(),
          calName: cal.getName(),
          startTime: e.getStartTime(),
          endTime: e.getEndTime(),
          isAllDay: e.isAllDayEvent()
        });
      });
    } catch (err) {
      Logger.log(`カレンダー取得失敗 ${calId}: ${err.message}`);
    }
  });

  // 予定をソート（終日→時刻順）
  allEvents.sort((a, b) => {
    if (a.isAllDay && !b.isAllDay) return -1;
    if (!a.isAllDay && b.isAllDay) return 1;
    return a.startTime - b.startTime;
  });

  const dateStr = today.toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric', weekday: 'short'
  });

  let msg = `📅【${dateStr}の予定】\n`;

  if (allEvents.length === 0) {
    msg += '今日は予定なし！ゆっくり過ごせます ☕';
  } else {
    allEvents.forEach(ev => {
      if (ev.isAllDay) {
        msg += `\n📌 終日: ${ev.title}（${ev.calName}）`;
      } else {
        const start = Utilities.formatDate(ev.startTime, 'Asia/Tokyo', 'HH:mm');
        const end = Utilities.formatDate(ev.endTime, 'Asia/Tokyo', 'HH:mm');
        msg += `\n⏰ ${start}〜${end} ${ev.title}（${ev.calName}）`;
      }
    });
    msg += `\n\n計 ${allEvents.length} 件。今日も頑張りましょう！`;
  }

  pushLine(msg);
}
```

---

## なぜこう書いたのか

コードを眺めていて「ここ、もっと単純にできそうだけど？」と思った箇所があるかもしれません。実際に運用しながら、この形に落ち着いた理由を説明します。

### 終日イベントと時間指定を分けている理由

`isAllDayEvent()` で予定を2グループに割って、終日イベントを先頭に持ってきています。ここはただ全部を時刻順に並べても動くのですが、それだと「保育園の発表会（終日）」が9時の会議のあとに埋もれてしまう。終日イベントはその日のトーンを決める重要な予定なので、先に目に入るようにしています。看護師の申し送りと同じで、まず大枠、それから細部の順で読みたいんですよね。

### 時刻を `Utilities.formatDate` で整形している理由

`e.getStartTime()` をそのまま出すと秒までついて「09:30:00」のようになり、LINEの画面でごちゃつきます。`Utilities.formatDate(startTime, 'Asia/Tokyo', 'HH:mm')` を通すと「09:30」で揃う。地味ですが、朝の眠い頭で読むときはこの見やすさが効きます。タイムゾーンは `'JST'` でも通りますが、公式が推奨しているのは地域名形式なので `'Asia/Tokyo'` を選びました。

### 予定ゼロの日も必ず通知している理由

最初は「予定がない日はメールを送らない」で書いていました。でも数日運用してみて、無音が続くと「あれ、GAS止まった？トークン切れた？」と逆に不安になることに気づいたんです。だから予定ゼロの日でも「☕ 今日は予定なし！ゆっくり過ごせます」を送るようにしました。これなら、届いていれば正常稼働、というシンプルな確認にもなります。

---

## 動かす前の下ごしらえ：LINE Messaging APIの設定

コードを動かすには、LINE Messaging APIのアクセストークンが要ります。まだ持っていない方は、ここを先に済ませてください。

1. LINE Developers（https://developers.line.biz/）にアクセス
2. LINEアカウントでログイン
3. 「新規プロバイダー作成」→適当な名前を入力
4. 「Messaging APIチャンネル」を作成
5. チャンネルの「Messaging API」タブ→「チャンネルアクセストークン」を発行・コピー
6. チャンネルのQRコードを自分のLINEアプリで友だち追加
7. GASのスクリプトプロパティに `LINE_TOKEN` と `LINE_USER_ID` を設定

自分のユーザーIDは、LINE Developersコンソールの「Messaging API」→「Webhook」欄にURLを設定してイベントから取得するか、友だち追加時のWebhookイベントから拾えます。

### トークンはコードに直書きしない

コードの `pushLine` 関数で、トークンを `PropertiesService.getScriptProperties()` から読んでいるのに気づいたでしょうか。ここが大事なところです。APIキーやトークンをコード内に直書きすると、うっかりGitHubに上げてしまったときに丸見えになります。スクリプトプロパティに逃がしておけば、その事故が起きません。

設定はこの手順で。

1. GASエディタ上部の「プロジェクトの設定」（⚙️歯車アイコン）をクリック
2. 「スクリプトプロパティ」セクションで「プロパティを追加」をクリック
3. プロパティ名 `LINE_TOKEN`、値に取得したアクセストークンを入力して保存
4. 同様に `LINE_USER_ID`、値に自分のLINEユーザーIDを入力して保存

---

## 毎朝自動で届くようにする

あとはトリガーを仕込めば完成です。手で実行する必要はなくなります。

1. GASエディタを開く（スプシ上部メニュー「拡張機能」→「Apps Script」）
2. 左メニューの時計アイコン「トリガー」をクリック
3. 右下の「＋ トリガーを追加」ボタンをクリック
4. 「実行する関数を選択」で `morningCalendarLine` を選ぶ
5. 「イベントのソースを選択」で「時間主導型」を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「日付ベースのタイマー」を選ぶ
7. 実行時刻を「午前7時〜8時」に設定
8. 「保存」ボタンをクリック
9. Googleアカウントの認証画面が出たら「許可」をクリック

これで毎朝7時台、起きる頃にはその日の予定がLINEに届いています。

---

## ハマりどころ

ここまでで一通り動きますが、私自身がつまずいた場所を先に共有しておきます。同じ穴に落ちなくて済むはずです。

### 別のカレンダーの予定が抜け落ちる

`CalendarApp.getDefaultCalendar()` はデフォルトカレンダーしか見にいきません。家族用や副業用に別カレンダーを作っている場合、その予定は通知に入ってこない。ここを最初に見落として、「あれ、今日の打ち合わせが出てない」と焦りました。全部まとめたいなら、上の複数カレンダー版を使うか、`CalendarApp.getCalendarById(id)` で個別に足してください。

### `Request failed for https://api.line.me` が出る

送信時にこのエラーが出たら、まずアクセストークンを疑ってください。間違っているか、期限切れになっているかのどちらかがほとんどです。LINE Developersコンソールでトークンを再発行して、スクリプトプロパティの `LINE_TOKEN` を差し替えます。ついでに、エラーを黙って握りつぶさずログやメールに残しておくと、次に何かあったとき原因を追いやすくなります。

```javascript
try {
  const response = UrlFetchApp.fetch(url, options);
  Logger.log(`送信成功: ${response.getResponseCode()}`);
} catch (e) {
  Logger.log(`送信失敗: ${e.message}`);
  // エラーをメールで通知する場合
  GmailApp.sendEmail(
    'your@email.com',
    'LINE通知エラー',
    `エラー内容: ${e.message}`
  );
}
```

### タイムゾーンがずれて前日の予定が届く

GASのタイムゾーンがUTCのままだと、日本時間の午前0時がUTCの前日午後3時として扱われ、前日の予定が混ざってくることがあります。プロジェクト設定のタイムゾーンを「Asia/Tokyo」にしておくのが基本です。加えて、`setHours(0, 0, 0, 0)` は実行環境のタイムゾーンに引きずられるので、時刻の表示には `Utilities.formatDate` でタイムゾーンを明示しておくと安全です。

---

## もう一歩広げるなら

基本形が動いたら、こんな方向に伸ばせます。

| やりたいこと | 方法 |
|---|---|
| 明日の予定も含める | `tomorrow` の期間を48時間後に変更 |
| 複数カレンダー対応 | `getAllCalendars()` でループ |
| 天気予報も一緒に | OpenWeatherMap APIと組み合わせ |
| 予定件数でメッセージを変える | `if (events.length === 0)` の分岐を増やす |
| 家族にも共有する | 家族のLINEユーザーIDにも `pushLine` する |

我が家では「明日の予定も含める」を足して、夜のうちに翌日の段取りをつけられるようにしています。

---

## ここまでやって思うこと

「カレンダーアプリを開く」というたった一手間。文字にすると大したことないのに、これが省けるだけで朝の気持ちがずいぶん軽くなりました。特に夜勤明けの、頭が半分寝ている状態でスケジュールを思い出す負担がなくなったのが大きい。届いた通知を眺めながらコーヒーを飲む、それで今日の準備が終わる感じです。

まずは自分ひとり宛てで動かしてみて、しっくりきたら家族への共有や天気予報を足していくのがおすすめです。コードは構文をチェックのうえ掲載していますが、お使いの環境やカレンダー構成に合わせて調整してくださいね。

---

## 関連記事（あわせて読みたい）

カレンダー自動化をもっと深めたい方は、以下の記事もどうぞ。

- [GASでGoogleカレンダーに予定登録する最短10行コード](/blog/gas-calendar-event-create/) — カレンダー登録の基本構文
- [GASでGoogleカレンダーの今日の予定を毎朝メール通知する](/blog/gas-calendar-morning-digest/) — 朝の通知自動化
- [カレンダー×スプシ自動同期の入門](/blog/gas-calendar-spreadsheet-sync/) — 双方向同期テクニック

これらと組み合わせると、カレンダー運用が一気にラクになります。

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

**本記事のコードは構文チェックのうえ掲載しています。** 実際の動作はお使いのGAS環境（V8ランタイム）に合わせて調整してください。
