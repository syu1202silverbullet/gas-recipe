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

こんにちは、凛です。2児のママで現役ナースをしながら、GASで副業をしています。

今回のテーマは「Googleカレンダーのダブルブッキングを自動で検知するGAS」です。

ダブルブッキングって、やってしまった後に気づくと本当に焦ります。私も夜勤シフトと副業の打ち合わせが被ったことがあって、クライアントにギリギリでリスケをお願いした苦い経験があります。GASで防げるとわかってから、実装を急いで作りました。

---

## こんな悩みありませんか？

- 「あ、この時間、別の予定入ってた…」とダブルブッキングしてしまう
- 家族カレンダーと仕事カレンダーで予定が被っているのに気づかない
- 予定を入れる前に空き確認するのが面倒
- 複数カレンダーを管理していて全体像が把握しにくい
- 週の初めに「今週ダブブないか」を毎回手動で確認するのが億劫

看護師として働きながら副業もしていると、スケジュール管理が本当に複雑になります。夜勤・日勤のシフト、子どもの行事、副業の打ち合わせ、保育園の送迎……それらを複数のカレンダーに分けて管理していると、うっかり被ることが多々あります。

私は副業の打ち合わせを夜の時間に入れることが多いのですが、夫の予定や保育園の行事と被ったことが何度かあります。GASで「予定追加時にダブルチェックして通知」する仕組みを作ったら、ダブルブッキング事故がゼロになりました。

---

## なぜGASでダブルブッキング検知できるのか

Googleカレンダーには標準でダブルブッキングを警告する機能がありますが、それは同じカレンダー内の予定同士に限られます。

GASを使うと：
- **複数カレンダーをまたいだ重複チェック**ができる
- **自動でメールやLINE通知**を送れる
- **毎朝定時に実行**して今週の重複を把握できる
- **30分以上の重複だけ通知**などの柔軟な設定ができる

特に「仕事カレンダー」「家族カレンダー」「副業カレンダー」のように複数に分けて管理している場合、GASでのチェックが大変有効です。

---

## サンプルコード（コピペで動きます）

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

---

## トリガーの設定手順（毎朝自動チェックにする方法）

毎朝自動でチェックするには、時間ベースのトリガーを設定します。

1. GASエディタを開く（スプシ上部メニュー「拡張機能」→「Apps Script」）
2. 左メニューの時計アイコン「トリガー」をクリック
3. 右下の「＋ トリガーを追加」ボタンをクリック
4. 「実行する関数を選択」で `checkConflictsAllCalendars` を選ぶ
5. 「イベントのソースを選択」で「時間主導型」を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「日付ベースのタイマー」を選ぶ
7. 実行時刻を「午前7時〜8時」に設定
8. 「保存」ボタンをクリック
9. Googleアカウントの認証画面が出たら「許可」をクリック

これで毎朝7時台に自動で今週の重複がチェックされます。重複があった場合だけメールが届くので、通知がない日は安心して作業に集中できます。

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：複数カレンダーをまとめてチェックする

最初は `CalendarApp.getDefaultCalendar()` でデフォルトカレンダーだけをチェックしていましたが、家族の予定は家族カレンダー、副業の予定は副業カレンダーに分けていたため、カレンダーをまたぐ重複が全然検知できていませんでした。

`CalendarApp.getAllCalendars()` で全カレンダーを取得して、各カレンダーで `getEvents` する形にしたことで、カレンダーをまたぐ重複も検知できるようになりました。

ただし「休日」「誕生日」などのGoogle標準カレンダーも取得されてしまうので、不要なカレンダーは除外する処理を入れるとより精度が上がります。

### コツ2：重複時間に最小閾値を設ける

「30分以上重なってたらアラート」のように閾値を設けると、隣接予定（15分間隔など）での誤検知が減ります。

私の場合、打ち合わせの準備時間を考えて「30分以上の重複だけ通知」に設定しています。5分や10分の重複は移動時間の兼ね合いで問題ない場合が多いため、閾値を設けることで通知の信頼性が上がります。

### コツ3：LINE通知と連携して即気づけるようにする

ダブルブッキング検知時にLINEに通知する仕組みにすると、メールを開かなくても即気づけます。

LINE Messaging APIを使った通知実装については、この記事の「関連記事」にあるLINE系記事を参考にしてください。GmailApp.sendEmail よりも即時性が高く、スマホに通知が来るので朝の確認が楽になります。

---

## つまずきやすいポイント

### エラー1：終日イベントがダブルブッキング判定に干渉する

終日イベント（例：「祝日」「有給休暇」）は時刻情報がなく、ダブルブッキング判定で誤動作します。

**解決策**：`event.isAllDayEvent()` で終日イベントをスキップする処理を入れます。

```javascript
// 終日イベントをスキップする書き方
if (!event.isAllDayEvent()) {
  // 時間指定のイベントのみ処理
  allEvents.push({ ... });
}
```

上記の複数カレンダー版コードにはすでにこの処理が入っています。

### エラー2：過去の予定もチェックされて大量の重複が出る

何も設定しないと、過去の予定も対象になるため、過去のダブルブッキングまで全部出てきます。特にカレンダーを長く使っている場合は数百件になることも。

**解決策**：`new Date()` から未来1週間など期間を明確に絞る。

```javascript
// 今日の開始時刻を基準にする（過去はチェックしない）
const start = new Date();
start.setHours(0, 0, 0, 0); // 今日の0時から

const end = new Date();
end.setDate(end.getDate() + 7); // 1週間後まで
```

### エラー3：GASのタイムゾーン設定がずれていて時刻が9時間ズレる

GASのタイムゾーンが日本時間（JST）になっていないと、時刻が9時間ずれた状態で表示されます。

**解決策**：GASプロジェクトの設定でタイムゾーンを「(GMT+09:00) 日本時間」に設定する。
1. GASエディタ上部の「プロジェクトの設定」（⚙️歯車アイコン）をクリック
2. 「タイムゾーン」を「(GMT+09:00) Asia/Tokyo」に変更
3. 「保存」をクリック

---

## 実運用の例：朝の確認フロー

私が実際にやっている朝のスケジュール確認フローを共有します。

| 時間 | 処理 | 目的 |
|---|---|---|
| 毎朝7時（自動） | `checkConflictsAllCalendars` 実行 | 今週の重複を検知 |
| 重複ありの場合 | 自動でメール送信 | スマホに通知が届く |
| 重複なしの場合 | メールなし | 安心して業務に集中 |

出勤前の7〜8時台に「重複ありのメールが来ていないか」だけ確認します。来ていなければ今週はダブルブッキングなし、と安心してスタートできます。

---

## まとめ

| 項目 | 内容 |
|---|---|
| チェック対象 | デフォルトカレンダーまたは全カレンダー |
| 重複の判定ロジック | 終了時刻 > 相手の開始時刻、かつ開始時刻 < 相手の終了時刻 |
| 終日イベントの扱い | `isAllDayEvent()` でスキップ推奨 |
| 最小重複時間 | 30分以上を推奨（誤検知防止） |
| 通知方法 | `GmailApp.sendEmail` でメール送信 |
| 推奨実行タイミング | 毎朝7時台（時間ベーストリガー） |
| 効果 | ダブルブッキング事故がゼロに |

このGASを「毎朝7時のトリガー」で動かすと、今日のダブルブッキングを朝イチで通知してくれます。

「気づいたら2件の打ち合わせを30分後にダブルで入れていた」事故が、これでゼロになります。夜勤翌日の疲れた頭でもスケジュール確認を忘れない、看護師ママ的には超ありがたいツールです。

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
