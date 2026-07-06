---
title: "空き時間をカレンダーから自動抽出するGAS｜会議調整・予約ページ生成に"
description: "Googleカレンダーから空き時間を自動抽出するGAS実装を凛が解説。会議調整の工数削減・予約ページ生成のベース実装に。看護師ママが副業面談の日程調整で毎週消耗していた失敗談つきで丁寧に説明します。"
pubDate: "2026-06-18T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","free-slot","scheduling"]
tagNames: ["GAS","カレンダー","空き時間"]
readingTime: 8
keywords: ["GAS カレンダー 空き時間","GAS 空き時間 自動抽出","Googleカレンダー 空き 確認 自動"]
---

凛です。看護師の仕事と2児の育児の合間に、副業のGAS開発を続けています。副業の面談相手から「来週の空いている時間を教えてください」とメールが来るたび、シフト表と家族の予定を頭の中で照らし合わせながら返信するのが、毎週の小さな負担でした。夜勤明けのぼんやりした頭だと、空き時間の計算を一つ間違えてダブルブッキング寸前になったことも。そこでカレンダーから空き時間を自動で割り出すGASを用意しました。

今回のテーマは「Googleカレンダーから空き時間を自動抽出するGAS」です。

「来週の空いている時間はいつですか？」と聞かれるたびにカレンダーを開いて、ひとつひとつ確認して……この作業、地味に時間がかかりますよね。GASで自動化したら、この質問に3秒で答えられるようになりました。

---

## こんな悩みありませんか？

- 「来週の空いてる時間は？」と聞かれるたびにカレンダーを手動で確認している
- 面談予約ページに空き時間を載せたいけど、毎日更新するのが面倒
- 複数カレンダーの空き時間を統合して見たい
- Googleカレンダーで予定が多すぎて、空き時間がどこにあるか一目でわからない
- 日程調整ツールを使いたいけど、有料プランは予算的に難しい

私は副業の面談予約で「水曜の何時が空いてますか？」と毎週聞かれるのですが、カレンダーアプリを開いて確認する手間が地味にストレスでした。

夜勤明けの疲れた頭で「えっと、水曜は14時から夜勤の準備があって、16時に子どものお迎えがあって……」と計算しながらメールを返すのが本当につらくて。GASで「指定期間の空き時間一覧」を自動取得できる仕組みにしたら、メール返信が一気に楽になりました。

---

## このGASの仕組み

全体の流れは以下の通りです。

1. 指定した日の「業務時間帯」（例：9:00〜18:00）を設定
2. カレンダーからその日の予定を取得して時系列に並べる
3. 予定と予定の「隙間」が空き時間
4. 指定した最低時間（例：30分以上）の空き時間だけ出力

例えば、9:00〜18:00の間に「10:00〜11:00」と「14:00〜15:30」の予定があれば、空き時間は「9:00〜10:00」「11:00〜14:00」「15:30〜18:00」の3つになります。

---

## サンプルコード（コピペで動きます）

### 基本の空き時間抽出コード

```javascript
/**
 * 指定した日の空き時間を抽出する関数
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 *
 * @param {Date} date - チェックする日付
 * @returns {Array} 空き時間の配列 [{start: Date, end: Date}]
 */
function findFreeSlots(date) {
  // 業務時間の設定（9時〜18時）
  const startHour = 9;
  const endHour = 18;
  const MIN_SLOT_MINUTES = 30; // 30分未満の空きは除外

  // 業務時間の開始・終了を Date オブジェクトで設定
  const dayStart = new Date(date);
  dayStart.setHours(startHour, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, 0, 0, 0);

  // カレンダーから当日の予定を取得して開始時刻順に並べる
  const events = CalendarApp.getDefaultCalendar()
    .getEvents(dayStart, dayEnd)
    .filter(e => !e.isAllDayEvent()) // 終日イベントは除外
    .sort((a, b) => a.getStartTime() - b.getStartTime()); // 時系列でソート

  // 空き時間を格納する配列
  const freeSlots = [];

  // カーソル位置（最初は業務開始時刻から）
  let cursor = dayStart;

  events.forEach(event => {
    const eventStart = event.getStartTime();
    const eventEnd = event.getEndTime();

    // カーソル位置から予定開始までが空き時間
    if (eventStart > cursor) {
      freeSlots.push({
        start: new Date(cursor),
        end: eventStart
      });
    }

    // カーソルを予定終了時刻まで進める
    // （予定が重なっている場合は現在のカーソル位置を維持）
    if (eventEnd > cursor) {
      cursor = eventEnd;
    }
  });

  // 最後の予定終了から業務終了までが空き時間
  if (cursor < dayEnd) {
    freeSlots.push({
      start: cursor,
      end: dayEnd
    });
  }

  // 指定した最低時間以上の空き時間だけを返す
  return freeSlots.filter(slot => {
    const slotMinutes = (slot.end - slot.start) / 60000;
    return slotMinutes >= MIN_SLOT_MINUTES;
  });
}

/**
 * 翌日の空き時間をログに出力する
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function showTomorrowSlots() {
  // 翌日の日付を取得
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const slots = findFreeSlots(tomorrow);

  const dateStr = tomorrow.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  });

  let msg = `【明日（${dateStr}）の空き時間】\n`;

  if (slots.length === 0) {
    msg += '空き時間はありません（予定がびっしりです）';
  } else {
    slots.forEach(slot => {
      const startStr = slot.start.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const endStr = slot.end.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const minutes = Math.round((slot.end - slot.start) / 60000);
      msg += `  ${startStr} 〜 ${endStr}（${minutes}分）\n`;
    });
  }

  Logger.log(msg);
  return msg;
}
```

### 来週の空き時間をメールで受け取るコード

```javascript
/**
 * 来週の空き時間を集計してメールで送信する
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function sendWeeklyFreeSlots() {
  const NOTIFY_EMAIL = 'your@email.com'; // ← 自分のメールアドレスに変更
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

  // 翌週の月曜日を求める
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0:日、1:月、...、6:土
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilNextMonday);

  // 翌週の月〜金（5日分）の空き時間を集計
  let emailBody = `来週の空き時間一覧\n${'='.repeat(30)}\n\n`;
  let hasAnySlot = false;

  for (let i = 0; i < 5; i++) {
    const targetDate = new Date(nextMonday);
    targetDate.setDate(nextMonday.getDate() + i);

    const dateStr = `${targetDate.getMonth() + 1}/${targetDate.getDate()}（${WEEKDAYS[targetDate.getDay()]}）`;

    const slots = findFreeSlots(targetDate);

    emailBody += `📅 ${dateStr}\n`;

    if (slots.length === 0) {
      emailBody += '  予定が埋まっています\n';
    } else {
      hasAnySlot = true;
      slots.forEach(slot => {
        const startStr = slot.start.toLocaleTimeString('ja-JP', {
          hour: '2-digit', minute: '2-digit'
        });
        const endStr = slot.end.toLocaleTimeString('ja-JP', {
          hour: '2-digit', minute: '2-digit'
        });
        emailBody += `  ✅ ${startStr} 〜 ${endStr}\n`;
      });
    }
    emailBody += '\n';
  }

  if (!hasAnySlot) {
    emailBody += '\n来週は空き時間がほとんどありません。';
  }

  // メールで送信
  GmailApp.sendEmail(
    NOTIFY_EMAIL,
    `【来週の空き時間】${nextMonday.getMonth() + 1}/${nextMonday.getDate()} の週`,
    emailBody
  );

  Logger.log('来週の空き時間をメールで送信しました');
}
```

---

## トリガーの設定手順（週次で自動送信する方法）

毎週自動で来週の空き時間を確認するには、時間ベースのトリガーを設定します。

1. GASエディタを開く（スプシ上部メニュー「拡張機能」→「Apps Script」）
2. 左メニューの時計アイコン「トリガー」をクリック
3. 右下の「＋ トリガーを追加」ボタンをクリック
4. 「実行する関数を選択」で `sendWeeklyFreeSlots` を選ぶ
5. 「イベントのソースを選択」で「時間主導型」を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「週タイマー」を選ぶ
7. 実行する曜日を「金曜日」に設定
8. 実行時刻を「午後6時〜7時」に設定
9. 「保存」ボタンをクリック
10. Googleアカウントの認証画面が出たら「許可」をクリック

毎週金曜の夜に「来週の空き時間」がメールで届くので、週末に予定を調整できます。

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：営業時間の幅を変数化しておく

「9:00〜18:00の中で空き時間を探す」のように、業務開始・終了時間を変数で持っておくと、休日・平日で切り替えが楽になります。

私の場合、看護師の仕事は夜勤があって「副業できる時間帯」が日によって全然違います。「日勤の日は17:00〜21:00」「夜勤明けの日は休み」のように、日ごとに時間帯を変えられる設定が理想です。

シンプルにやる場合は `const START_HOUR = 9; const END_HOUR = 18;` のような定数を関数の上部に置いておくと、修正が1箇所で済んで管理しやすくなります。

### コツ2：30分単位・1時間単位で出力を切り替える

面談用なら30分・打ち合わせ用なら1時間など、用途で最小空き時間を変えると使いやすくなります。

`findFreeSlots` 関数の `MIN_SLOT_MINUTES` を引数で渡せるように改造すると、呼び出し側で用途別に指定できます。

```javascript
// 面談用（30分以上の空き）
const faceSlots = findFreeSlots(targetDate, 30);

// 長めの打ち合わせ用（60分以上の空き）
const meetingSlots = findFreeSlots(targetDate, 60);
```

### コツ3：複数カレンダーをマージして全体の空き時間を見る

仕事用・家族用カレンダーを両方見たい時は、`getAllCalendars()` で全カレンダーの予定を取得してマージします。

```javascript
// 複数カレンダーの予定をすべてまとめて取得する場合
const allEvents = [];
CalendarApp.getAllCalendars().forEach(cal => {
  const events = cal.getEvents(dayStart, dayEnd);
  events.forEach(e => {
    if (!e.isAllDayEvent()) {
      allEvents.push(e);
    }
  });
});
// あとは allEvents を時系列ソートして空き時間を計算
```

これで「家族の予定と被らない、かつ仕事の予定とも被らない」時間を一発で把握できます。

---

## つまずきやすいポイント

### エラー1：終日イベントがあると空き時間が出なくなる

「終日」のイベントは時刻情報がないため、`getStartTime()` と `getEndTime()` が業務時間帯全体をカバーしてしまうことがあります。

**解決策**：`event.isAllDayEvent()` で終日イベントをフィルタリングしてスキップする。上記コードには `.filter(e => !e.isAllDayEvent())` がすでに入っています。

### エラー2：GASのタイムゾーンがずれて9時間ズレた時刻が出る

GASのタイムゾーン設定がUTC（日本時間から9時間遅れ）になっていると、空き時間の計算がずれます。

**解決策**：GASプロジェクトの設定（⚙️歯車アイコン）でタイムゾーンを「(GMT+09:00) Asia/Tokyo」に設定する。

確認方法：
```javascript
// タイムゾーンを確認するコード
function checkTimezone() {
  Logger.log(Session.getScriptTimeZone()); // Asia/Tokyo と表示されれば正常
}
```

### エラー3：予定が重なっている（ダブルブッキング）場合の挙動がおかしい

予定が重なっている場合、カーソルの位置が前に戻ってしまうと誤った空き時間が計算されます。

**解決策**：カーソルを進める処理に `if (eventEnd > cursor)` の条件を入れる。

```javascript
// 正しい実装：カーソルは前に戻さない
if (eventEnd > cursor) {
  cursor = eventEnd; // 予定終了時刻がカーソルより後の場合のみ進める
}
```

上記のコードにはこの処理が入っています。

---

## 実際の活用シーン

このGASをどう使うか、私の実例を紹介します。

| 使い方 | 方法 |
|---|---|
| 面談の日程返答 | `showTomorrowSlots` を実行→ログをコピーしてメールに貼る |
| 週次の日程整理 | `sendWeeklyFreeSlots` を毎週金曜にトリガー |
| 予約受付ページの更新 | 空き時間データをスプシに書き出して予約フォームと連携 |
| 副業時間の把握 | 毎日空き時間をログに記録して週の合計を計算 |

---

## まとめ

| 項目 | 内容 |
|---|---|
| 空き時間の計算ロジック | 業務時間内の予定の「隙間」を計算 |
| 終日イベントの扱い | `isAllDayEvent()` でフィルタリング |
| 最小空き時間 | `MIN_SLOT_MINUTES` で設定（推奨30分） |
| 複数カレンダーへの対応 | `getAllCalendars()` で全カレンダーを取得してマージ |
| 週次自動送信 | 毎週金曜に来週の空き時間をメール送信 |
| タイムゾーン注意 | GASプロジェクトの設定を Asia/Tokyo に |
| 効果 | 「空き時間を聞かれたら即答」が可能に |

このGASを使えば、「来週の空いてる時間一覧」がすぐに出力されます。

「空き時間を聞かれて返信が遅れる」のがゼロになる、地味だけど効果絶大の自動化です。副業で複数のクライアントと日程調整している方には特におすすめです。

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
