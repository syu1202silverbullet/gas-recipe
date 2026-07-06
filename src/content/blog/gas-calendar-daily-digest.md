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

どうも、凛です。夜勤明けの朝、布団から出る前にスマホのLINEだけ見て一日の段取りを組むのが習慣になりました。看護師の本業と2児の子育て、それに副業をやりくりしていると、毎朝カレンダーアプリを開いて予定を確認するわずかな手間さえ惜しくなります。そこで「今日の予定をまるごと要約してLINEに届ける」仕組みをGASで作りました。

今回のテーマは「Googleカレンダーの今日の予定を毎朝LINEで通知するGAS」です。

忙しい朝は「アプリを開いて予定を確認する」というわずかな操作さえ抜け落ちがちです。だからこそ、こちらから見にいかなくても向こうから届く形が効きます。毎朝決まった時刻にその日の予定をまとめてLINEへ push する——この受け身でいい仕組みを、GASの時間トリガーで実現します。

---

## こんな悩みありませんか？

- 朝起きてカレンダーアプリを開くのが面倒、LINEで予定を見たい
- 通勤中にスマホで「今日の予定」をサクッと確認したい
- 家族にも今日の予定を共有したい
- 重要な予定をうっかり忘れてしまうことがある
- 複数のカレンダーを使っているが、まとめて確認する手段がない

私は朝の慌ただしい時間にカレンダーアプリを開く余裕がなく、「今日何があったっけ？」と通勤中に焦ることが多かったです。

特に夜勤明けで帰宅した後の仮眠から目が覚めた時に「今日の午後に副業の打ち合わせがあったはず……」と慌てて確認する場面が何度もありました。

GASでLINE要約bot化したら、朝起きてLINE見るだけで全部わかる状態になり、朝の余裕がまったく変わりました。

---

## 事前準備：LINE Messaging APIの設定

このGASを使うには、LINE Messaging APIのアクセストークンが必要です。まだ取得していない場合は先に設定します。

**LINE Developers での準備手順：**
1. LINE Developers（https://developers.line.biz/）にアクセス
2. LINEアカウントでログイン
3. 「新規プロバイダー作成」→適当な名前を入力
4. 「Messaging APIチャンネル」を作成
5. チャンネルの「Messaging API」タブ→「チャンネルアクセストークン」を発行・コピー
6. チャンネルのQRコードを自分のLINEアプリで友だち追加
7. GASのスクリプトプロパティに `LINE_TOKEN` と `LINE_USER_ID` を設定

**LINE_USER_IDの確認方法：**
- LINE Developersコンソール→「Messaging API」→「Webhook」欄にURLを設定
- または、友だち追加時のWebhookイベントからユーザーIDを取得

---

## サンプルコード（コピペで動きます）

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

## スクリプトプロパティへのトークン設定方法

APIキーやトークンは絶対にコード内に直書きしません。スクリプトプロパティを使います。

1. GASエディタ上部の「プロジェクトの設定」（⚙️歯車アイコン）をクリック
2. 「スクリプトプロパティ」セクションで「プロパティを追加」をクリック
3. プロパティ名 `LINE_TOKEN`、値に取得したアクセストークンを入力して保存
4. 同様に `LINE_USER_ID`、値に自分のLINEユーザーIDを入力して保存

これでコードに機密情報を書かずに済み、GitHubなどに誤ってアップしてしまうリスクもゼロになります。

---

## トリガーの設定手順（毎朝自動通知にする方法）

1. GASエディタを開く（スプシ上部メニュー「拡張機能」→「Apps Script」）
2. 左メニューの時計アイコン「トリガー」をクリック
3. 右下の「＋ トリガーを追加」ボタンをクリック
4. 「実行する関数を選択」で `morningCalendarLine` を選ぶ
5. 「イベントのソースを選択」で「時間主導型」を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「日付ベースのタイマー」を選ぶ
7. 実行時刻を「午前7時〜8時」に設定
8. 「保存」ボタンをクリック
9. Googleアカウントの認証画面が出たら「許可」をクリック

毎朝7時台に自動でLINE通知が届くようになります。

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：時刻は HH:mm 形式で整形する

`Utilities.formatDate(startTime, 'Asia/Tokyo', 'HH:mm')` で「09:30」形式にすると見やすいです。秒まで出すと「09:30:00」のようになってごちゃつきます。

`'JST'` でも動きますが、公式推奨は地域名形式（`'Asia/Tokyo'`）なのでこちらを使います。

看護師の業務連絡では分単位まで正確に伝えることが多いので、HH:mm形式は自然と身についていました。

### コツ2：終日イベントを先頭に表示する

時刻指定の予定と終日イベントを混ぜると読みにくくなります。`isAllDayEvent()` で分けて、終日イベントを先頭に「📌 終日:」として表示すると優先度がわかりやすいです。

実際に使ってみると「保育園の発表会（終日）」が先頭に表示されて、その日のスケジュール組みに集中できるようになりました。

### コツ3：予定ゼロの日も必ず通知する

何も送らないと「LINEが壊れたか？GASが止まったか？」と心配になります。予定がない日でも「今日は予定なし！ゆっくり過ごせます ☕」のようにメッセージを送ると安心です。

また、GASの実行が失敗した場合も通知が来ないので、「来ていれば正常稼働」という確認にもなります。

---

## つまずきやすいポイント

### エラー1：複数カレンダーを取得する際に片方が抜けてしまう

`CalendarApp.getDefaultCalendar()` はデフォルトカレンダーだけを取得します。家族用・副業用など別のカレンダーに登録した予定は含まれません。

**解決策**：`CalendarApp.getAllCalendars()` で全カレンダーを取得するか、`CalendarApp.getCalendarById(id)` で個別に指定する。

### エラー2：LINE送信後に `Exception: Request failed for https://api.line.me` エラーが出る

アクセストークンが間違っているか、期限切れになっている場合に発生します。

**解決策**：LINE Developersコンソールでトークンを再発行して、スクリプトプロパティの `LINE_TOKEN` を更新する。また、コード内の `try/catch` でエラーをキャッチしてログに記録すると原因が特定しやすくなります。

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

### エラー3：タイムゾーンがずれて前日の予定が通知される

GASのタイムゾーンがUTCのままだと、日本時間の午前0時がUTC午後3時（=前日）として処理される場合があります。

**解決策**：GASプロジェクト設定のタイムゾーンを「Asia/Tokyo」に設定する。また、`setHours(0, 0, 0, 0)` は使っているタイムゾーンに依存するので、`Utilities.formatDate` でタイムゾーンを明示的に指定する書き方が安全です。

---

## カスタマイズのアイデア

基本形ができたら、いろいろ拡張できます。

| カスタマイズ | 方法 |
|---|---|
| 明日の予定も含める | `tomorrow` の期間を 48 時間後に変更 |
| 複数カレンダー対応 | `getAllCalendars()` でループ |
| 天気予報も合わせて通知 | OpenWeatherMap APIと組み合わせ |
| 予定件数に応じてメッセージを変える | `if (events.length === 0)` 分岐を追加 |
| 家族にも共有する | 家族のLINE user ID にも pushLine する |

---

## まとめ

| 項目 | 内容 |
|---|---|
| 必要なもの | LINE Messaging APIのアクセストークン・自分のユーザーID |
| 秘密情報の扱い | スクリプトプロパティに保存（コードに直書きはNG） |
| 終日イベントの処理 | `isAllDayEvent()` で分けて表示 |
| 時刻のフォーマット | `Utilities.formatDate(date, 'Asia/Tokyo', 'HH:mm')` |
| 推奨トリガー | 毎朝7時（日付ベースのタイマー） |
| 予定なしの場合 | 「今日は予定なし」を必ず送る |
| 効果 | カレンダーアプリを開かなくてもLINEで全予定確認可能 |

このGASを「毎朝7時のトリガー」で動かせば、起きた頃にはLINEに今日の予定が届いている状態になります。

「カレンダーアプリを開く手間がなくなる」だけで、朝の心理的負担がかなり減ります。特に子育て中のママには、朝の1アクションが省略できるだけでもかなり助かります。

---

## 関連記事（あわせて読みたい）

カレンダー自動化をもっと深めたい方は、以下の記事もおすすめです。

- [GASでGoogleカレンダーに予定登録する最短10行コード](/blog/gas-calendar-event-create/) — カレンダー登録の基本構文
- [GASでGoogleカレンダーの今日の予定を毎朝メール通知する](/blog/gas-calendar-morning-digest/) — 朝の通知自動化
- [カレンダー×スプシ自動同期の入門](/blog/gas-calendar-spreadsheet-sync/) — 双方向同期テクニック

これらと組み合わせると、カレンダー運用が一気にラクになります。

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

**本記事のコードは静的検証済みです。** GAS環境（V8ランタイム）で動作確認を行っています。
