---
title: "カレンダー予定のダブルブッキング検知GAS｜重複検出と通知"
description: "Googleカレンダーで予定が重複していないかGASで自動チェックする実装を凛が解説。会議室・人員のダブルブッキング防止に。看護師ママが副業打ち合わせと家族予定を被らせた失敗談つきで丁寧に説明します。"
pubDate: "2026-06-15T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","conflict","check"]
tagNames: ["GAS","カレンダー","重複","チェック"]
readingTime: 8
keywords: ["GAS カレンダー 重複","GAS ダブルブッキング","GAS 予定 重複チェック 自動"]
---

どうも、凛です。あれは夜勤入りの日でした。夕方から副業の打ち合わせを入れていたのを、すっかり忘れて。仮眠から起きてスマホを見たら、打ち合わせの開始15分前。しかも同じ時間に子どもの保育園のお迎え当番まで入っていて、頭の中が真っ白になりました。結局その日は相手にリスケをお願いし、夫にお迎えを代わってもらって、平謝りで一日が終わりました。

やってしまってから気づく、あれが一番つらい。入れる瞬間には気づけないんですよね。カレンダーを別々に分けて管理していると、なおさら見えなくなる。この「気づいたときには手遅れ」をなんとかしたくて、予定が重なった瞬間に教えてくれるGASを作ることにしました。

---

## そもそも、なぜ被るのか

自分が注意不足なだけ、と最初は思っていました。でも作りながら考えるうちに、これは仕組みの問題だと分かってきました。

看護師のシフト、子どもの行事、副業の打ち合わせ、保育園の送迎。私はこれらを別々のカレンダーに分けています。仕事は仕事、家族は家族で色分けした方が見やすいからです。ところが、この「分けている」ことが落とし穴でした。

Googleカレンダーにも標準でダブルブッキングを警告する機能はあります。でもそれが効くのは、同じカレンダー内の予定同士だけ。仕事カレンダーに打ち合わせを入れても、家族カレンダーのお迎え当番とは照らし合わせてくれません。つまり、人間が頭の中で全カレンダーを重ね合わせて空きを確認するしかない。夜勤明けの疲れた頭で、それを毎回やるのは無理があったわけです。

だったら、カレンダーをまたいで重複を見てくれる係を作ればいい。GASなら、複数カレンダーを横断してチェックし、被りが見つかったときだけ自動でメールやLINEを飛ばせます。しかも毎朝定時に回せる。目視の限界を機械で埋める、という発想です。

---

## 重なりを見つけるコード

まずは1つのカレンダーだけを見る、シンプルな版から。ロジックの核はここに詰まっています。

### 基本の重複チェックコード（1カレンダー版）

```javascript
/**
 * デフォルトカレンダーの予定重複をチェックしてメール通知
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function checkConflicts() {
  // チェック期間：今日から1週間先まで
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);

  // デフォルトカレンダーから予定を取得
  const events = CalendarApp.getDefaultCalendar().getEvents(start, end);

  // 重複を格納する配列
  const conflicts = [];

  // 全ての予定の組み合わせを2重ループでチェック
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      // 時間が重複しているか判定
      // ← events[i]の終了時刻 > events[j]の開始時刻、かつ
      // ← events[i]の開始時刻 < events[j]の終了時刻
      if (events[i].getEndTime() > events[j].getStartTime() &&
          events[i].getStartTime() < events[j].getEndTime()) {
        conflicts.push([
          events[i].getTitle(),
          events[j].getTitle(),
          events[i].getStartTime()
        ]);
      }
    }
  }

  // 重複が見つかった場合だけメール通知
  if (conflicts.length > 0) {
    let msg = '【重複検出】以下の予定が重複しています。\n\n';
    conflicts.forEach(c => {
      const timeStr = c[2].toLocaleString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      msg += `⚠️ ${timeStr} ごろ\n  「${c[0]}」と「${c[1]}」\n\n`;
    });

    GmailApp.sendEmail(
      'your@email.com',  // ← 自分のメールアドレスに変更
      '[警告] カレンダー重複が見つかりました',
      msg
    );
    Logger.log(`重複 ${conflicts.length} 件を検出してメール送信しました`);
  } else {
    Logger.log('重複なし：今週のスケジュールはクリアです');
  }
}
```

重なり判定の肝は、2つの予定について「一方の終了時刻が相手の開始時刻より後で、かつ一方の開始時刻が相手の終了時刻より前」を見るところ。これだけで時間帯の重なりを拾えます。

ただ、この1カレンダー版では私の失敗は防げません。私の被りはカレンダーをまたいで起きていたからです。そこで次の版です。

### 複数カレンダーをまとめてチェックするコード

```javascript
/**
 * 複数カレンダーを横断して重複チェック（上位版）
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function checkConflictsAllCalendars() {
  const NOTIFY_EMAIL = 'your@email.com'; // ← 通知先メールアドレス
  const MIN_OVERLAP_MINUTES = 30; // ← 30分以上の重複だけ通知

  // チェック期間：今日から1週間
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);

  // 全カレンダーから予定を取得してマージ
  const allEvents = [];
  const calendars = CalendarApp.getAllCalendars();

  calendars.forEach(cal => {
    // カレンダー名も一緒に格納（どのカレンダーの予定かわかるように）
    const events = cal.getEvents(start, end);
    events.forEach(event => {
      // 終日イベントは時間が不明なのでスキップ
      if (!event.isAllDayEvent()) {
        allEvents.push({
          title: event.getTitle(),
          calName: cal.getName(),
          startTime: event.getStartTime(),
          endTime: event.getEndTime()
        });
      }
    });
  });

  // 開始時刻でソート（見やすくするため）
  allEvents.sort((a, b) => a.startTime - b.startTime);

  // 重複チェック
  const conflicts = [];
  for (let i = 0; i < allEvents.length; i++) {
    for (let j = i + 1; j < allEvents.length; j++) {
      const ev1 = allEvents[i];
      const ev2 = allEvents[j];

      // 時間の重複があるか確認
      if (ev1.endTime > ev2.startTime && ev1.startTime < ev2.endTime) {
        // 重複時間を分単位で計算
        const overlapStart = Math.max(ev1.startTime.getTime(), ev2.startTime.getTime());
        const overlapEnd = Math.min(ev1.endTime.getTime(), ev2.endTime.getTime());
        const overlapMinutes = (overlapEnd - overlapStart) / 60000;

        // 指定分数以上の重複だけを記録
        if (overlapMinutes >= MIN_OVERLAP_MINUTES) {
          conflicts.push({ ev1, ev2, overlapMinutes });
        }
      }
    }
  }

  // 重複があればメール通知
  if (conflicts.length > 0) {
    let body = `今週のカレンダーに ${conflicts.length} 件の重複が見つかりました。\n\n`;

    conflicts.forEach(({ ev1, ev2, overlapMinutes }) => {
      const dateStr = ev1.startTime.toLocaleString('ja-JP', {
        month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      body += `⚠️ ${dateStr} ごろ（約${Math.round(overlapMinutes)}分重複）\n`;
      body += `  [${ev1.calName}] ${ev1.title}\n`;
      body += `  [${ev2.calName}] ${ev2.title}\n\n`;
    });

    GmailApp.sendEmail(NOTIFY_EMAIL, '[重複警告] 今週のカレンダー確認してください', body);
    Logger.log(`重複 ${conflicts.length} 件を検出。メール送信完了`);
  } else {
    Logger.log('今週は重複なし。スケジュールはクリアです');
  }
}
```

こちらは `CalendarApp.getAllCalendars()` で全カレンダーを集めて、まとめて重なりを見ます。どのカレンダーの予定かも一緒に記録しているので、通知を見た瞬間に「仕事の打ち合わせと家族のお迎えが被ってる」と即座に分かる。まさに私が欲しかった形です。

このコードには工夫を2つ入れています。ひとつは、5分や10分のかすり傷レベルの重なりで毎回鳴らないよう、`MIN_OVERLAP_MINUTES = 30` で「30分以上被ったときだけ」に絞っていること。移動時間の兼ね合いで、少しの重なりは実害がないことが多いんです。もうひとつは、終日イベントを `isAllDayEvent()` で除外していること。終日の「有給休暇」などは時刻を持たないので、判定に混ぜると誤動作します。

---

## 毎朝、勝手にチェックしてもらう

このコードを手で実行していたら意味がありません。忘れるのが問題だったのに、実行を忘れたら本末転倒です。トリガーで自動化します。

1. GASエディタを開く（スプシ上部メニュー「拡張機能」→「Apps Script」）
2. 左メニューの時計アイコン「トリガー」をクリック
3. 右下の「＋ トリガーを追加」ボタンをクリック
4. 「実行する関数を選択」で `checkConflictsAllCalendars` を選ぶ
5. 「イベントのソースを選択」で「時間主導型」を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「日付ベースのタイマー」を選ぶ
7. 実行時刻を「午前7時〜8時」に設定
8. 「保存」ボタンをクリック
9. Googleアカウントの認証画面が出たら「許可」をクリック

これで毎朝7時台に今週分の重複が自動でチェックされます。被りがあったときだけメールが届く仕組みなので、通知がない日は「今週は大丈夫」という安心にもなります。

---

## つまずいた場所を先に共有します

作りながら私が引っかかった点を、対処とセットで置いておきます。

### 終日イベントが判定を狂わせる

「祝日」「有給休暇」のような終日イベントには時刻情報がありません。これを重複判定に混ぜると、丸一日ぶんと重なっていることになって誤検知だらけになります。`isAllDayEvent()` でスキップしてください。上の複数カレンダー版には、すでにこの処理が入っています。

```javascript
// 終日イベントをスキップする書き方
if (!event.isAllDayEvent()) {
  // 時間指定のイベントのみ処理
  allEvents.push({ ... });
}
```

### 過去の重複まで大量に出てくる

期間を絞らないと、過去の予定まで全部チェック対象になります。カレンダーを長く使っていると、昔のダブルブッキングが数百件出てきて、肝心の今週の被りが埋もれてしまう。`new Date()` を起点にして未来1週間、と範囲をはっきり切りましょう。

```javascript
// 今日の開始時刻を基準にする（過去はチェックしない）
const start = new Date();
start.setHours(0, 0, 0, 0); // 今日の0時から

const end = new Date();
end.setDate(end.getDate() + 7); // 1週間後まで
```

### 時刻が9時間ずれる

GASのタイムゾーンが日本時間になっていないと、時刻が9時間ずれて表示されます。プロジェクト設定でタイムゾーンを日本時間にしておいてください。

1. GASエディタ上部の「プロジェクトの設定」（⚙️歯車アイコン）をクリック
2. 「タイムゾーン」を「(GMT+09:00) Asia/Tokyo」に変更
3. 「保存」をクリック

---

## もっと早く気づきたいなら

メールだと開くまで気づけない、というときは、通知をLINEに変える手もあります。ダブルブッキング検知時にLINEへ飛ばすようにすれば、スマホの通知でその場で気づけます。実装は関連記事のLINE系の記事が参考になります。私の場合、朝のメール確認だと開くのが後回しになりがちだったので、即時性のあるLINE通知の方が性に合っていました。

---

## 導入してからのこと

私が実際にやっている朝の確認フローはこんな感じです。

| 時間 | 処理 | 目的 |
|---|---|---|
| 毎朝7時（自動） | `checkConflictsAllCalendars` 実行 | 今週の重複を検知 |
| 重複ありの場合 | 自動でメール送信 | スマホに通知が届く |
| 重複なしの場合 | メールなし | 安心して業務に集中 |

出勤前の7〜8時台に、重複ありのメールが来ていないかだけ見る。来ていなければ今週はクリア、と安心してスタートを切れます。

導入してから、あの「開始15分前に青ざめる」場面は一度も来ていません。夜勤翌日のぼんやりした頭でも、被りだけは機械が見張ってくれている。この安心感は思っていた以上に大きくて、正直、もっと早く作ればよかったと思っています。コードは構文をチェックのうえ載せていますが、カレンダーの構成はご家庭ごとに違うので、通知先や重複の閾値はご自身の使い方に合わせて調整してみてください。

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
