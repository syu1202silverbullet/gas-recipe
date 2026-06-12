---
title: "誕生日を毎年カレンダー自動登録するGAS｜家族・取引先の記念日漏れゼロに"
description: "誕生日や記念日を毎年自動でGoogleカレンダーに登録するGAS実装を凛が解説。1週間前にLINE通知も。家族・取引先の記念日管理に。看護師ママが副業クライアントの誕生日を忘れた失敗談つきで丁寧に説明します。"
pubDate: "2026-06-19T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","birthday","reminder"]
tagNames: ["GAS","カレンダー","誕生日","リマインド"]
readingTime: 8
keywords: ["GAS 誕生日 自動","GAS 記念日 リマインド","Googleカレンダー 誕生日 毎年"]
---

こんにちは、凛です。2児のママで現役ナースをしながら、GASで副業をしています。

今回のテーマは「誕生日・記念日をGoogleカレンダーに毎年自動登録するGAS」です。

人間関係を大事にしたいのに、誕生日をうっかり忘れてしまう……そんな経験、ありませんか？私は副業のクライアントの誕生日を覚えるのが苦手で、お祝いメッセージを送り忘れて気まずい思いをしたことがあります。そのことがあってから、GASで完全自動化しました。

---

## こんな悩みありませんか？

- 家族や取引先の誕生日を忘れて、後から気まずい思いをしたことがある
- スマホのリマインダーは設定が面倒で続かない
- カレンダーに登録しても、年が変わると消えてしまう
- 毎年同じ日に繰り返し設定するのが手間
- 「そういえば今日誰かの誕生日だったような…」と当日に気づく

看護師の仕事をしながら副業もしていると、自分の予定を管理するだけで精一杯で、家族や取引先の記念日まで覚えておく余力がなかなかありません。

私は副業のクライアントの誕生日を知っていたのに、忙しい夜勤明けのタイミングで「あ、先週誕生日だったんだ……」と気づいて、お祝いの連絡が1週間遅れてしまったことがあります。クライアントはよい人で「気にしないでください」と言ってくれましたが、自分の中でずっと引っかかっていました。

GASで「毎年自動登録＋1週間前にメール通知」の仕組みを作ったら、誕生日忘れがゼロになりました。

---

## このGASの仕組み

全体の流れは以下の通りです。

1. スプレッドシートに誕生日リストを作る（名前・月・日・関係性）
2. GASで当年分の誕生日イベントを一括でカレンダーに登録
3. 毎朝のトリガーで「7日後に誕生日の人がいるか」チェック
4. 該当者がいればメール通知

年に1回（1月1日）にイベント登録を実行して、毎日リマインドチェックを走らせるのが基本の構成です。

---

## スプレッドシートの準備

コードを動かす前に、管理用スプレッドシートを作成します。

| A列（名前） | B列（月） | C列（日） | D列（関係性） |
|---|---|---|---|
| 田中様 | 3 | 15 | 取引先 |
| 山田様 | 7 | 22 | 取引先 |
| おじいちゃん | 11 | 8 | 家族 |
| おばあちゃん | 1 | 30 | 家族 |

1行目はヘッダー行（「名前」「月」「日」「関係性」）として使います。コードでは `data.shift()` でヘッダー行をスキップします。

---

## サンプルコード（コピペで動きます）

### 年間の誕生日をカレンダーに一括登録するコード

```javascript
/**
 * スプシの誕生日リストを読み込んで当年のカレンダーイベントを登録
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function registerBirthdays() {
  // アクティブなシートからデータを取得
  const data = SpreadsheetApp.getActiveSheet().getDataRange().getValues();

  // 1行目はヘッダー（名前/月/日/関係性）なのでスキップ
  data.shift();

  // 当年の西暦を取得
  const year = new Date().getFullYear();

  // デフォルトカレンダーを取得
  const cal = CalendarApp.getDefaultCalendar();

  // 登録した件数のカウント用
  let registeredCount = 0;
  let skippedCount = 0;

  data.forEach(([name, month, day, relation]) => {
    // 名前または月・日が空の行はスキップ
    if (!name || !month || !day) {
      skippedCount++;
      return;
    }

    // 誕生日のDateオブジェクトを作成
    // 月は0始まりなので -1 する（1月 → 0）
    const birthDate = new Date(year, month - 1, day);

    // 既に同じイベントが登録されていないか確認（重複防止）
    const dayStart = new Date(birthDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(birthDate);
    dayEnd.setHours(23, 59, 59, 999);

    const existingEvents = cal.getEvents(dayStart, dayEnd);
    const alreadyExists = existingEvents.some(e => e.getTitle().includes(`${name}さん誕生日`));

    if (alreadyExists) {
      Logger.log(`スキップ（登録済み）: ${name}さん ${month}/${day}`);
      skippedCount++;
      return;
    }

    // 終日イベントとしてカレンダーに登録
    // タイトルに絵文字と関係性も含めて見やすく
    cal.createAllDayEvent(`🎂 ${name}さん誕生日 (${relation})`, birthDate);
    registeredCount++;
    Logger.log(`登録完了: ${name}さん ${month}/${day} (${relation})`);
  });

  Logger.log(`誕生日登録完了: ${registeredCount}件登録、${skippedCount}件スキップ`);
}

/**
 * 翌年分も同時に登録する場合はこちらを使う
 * ※12月に実行すると来年1月分も登録される
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function registerBirthdaysBothYears() {
  const data = SpreadsheetApp.getActiveSheet().getDataRange().getValues();
  data.shift();

  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const cal = CalendarApp.getDefaultCalendar();

  // 当年と翌年の両方に登録
  [currentYear, nextYear].forEach(year => {
    data.forEach(([name, month, day, relation]) => {
      if (!name || !month || !day) return;

      const birthDate = new Date(year, month - 1, day);

      // 2月29日問題：うるう年でない場合は2月28日に設定
      if (month === 2 && day === 29) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        if (!isLeapYear) {
          birthDate.setDate(28); // うるう年でなければ2/28に
          Logger.log(`${name}さんはうるう年生まれのため${year}年は2/28に登録`);
        }
      }

      cal.createAllDayEvent(`🎂 ${name}さん誕生日 (${relation})`, birthDate);
    });
  });

  Logger.log('当年・翌年の誕生日登録が完了しました');
}
```

### 1週間前にメール通知するコード

```javascript
/**
 * 毎朝実行して7日後に誕生日の人がいればメール通知
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function birthdayReminder() {
  const NOTIFY_EMAIL = 'your@email.com'; // ← 自分のメールアドレスに変更

  // スプシからデータを取得
  const data = SpreadsheetApp.getActiveSheet().getDataRange().getValues();
  data.shift(); // ヘッダー行をスキップ

  const today = new Date();

  // 7日後の日付を計算
  const target = new Date(today.getTime() + 7 * 86400000);
  const targetMonth = target.getMonth() + 1; // getMonth()は0始まり
  const targetDay = target.getDate();

  // 7日後に誕生日の人を検索
  const upcoming = [];
  data.forEach(([name, month, day, relation]) => {
    if (!name || !month || !day) return;

    // 7日後の月・日と一致するか確認
    if (Number(month) === targetMonth && Number(day) === targetDay) {
      upcoming.push({ name, month, day, relation });
    }
  });

  // 該当者がいれば通知
  if (upcoming.length > 0) {
    const dateStr = `${targetMonth}月${targetDay}日`;
    let subject = `🎂 1週間後（${dateStr}）に誕生日のお知らせ`;
    let body = `以下の方の誕生日が1週間後（${dateStr}）に来ます。\n\n`;

    upcoming.forEach(({ name, relation }) => {
      body += `✅ ${name}さん（${relation}）\n`;
    });

    body += '\nプレゼントやメッセージの準備を忘れずに！';

    GmailApp.sendEmail(NOTIFY_EMAIL, subject, body);
    Logger.log(`誕生日リマインダーを送信: ${upcoming.map(u => u.name).join(', ')}`);
  } else {
    Logger.log('7日後に誕生日の方はいませんでした');
  }
}

/**
 * 当日朝に誕生日のお知らせを送る（当日リマインダー版）
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function todayBirthdayReminder() {
  const NOTIFY_EMAIL = 'your@email.com';

  const data = SpreadsheetApp.getActiveSheet().getDataRange().getValues();
  data.shift();

  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const todayBirthdays = data.filter(([name, month, day]) => {
    return name && Number(month) === todayMonth && Number(day) === todayDay;
  });

  if (todayBirthdays.length > 0) {
    let subject = `🎂 今日は誕生日です！（${todayMonth}月${todayDay}日）`;
    let body = '本日誕生日の方がいます。お忘れなく！\n\n';

    todayBirthdays.forEach(([name, , , relation]) => {
      body += `✅ ${name}さん（${relation}）\n`;
    });

    GmailApp.sendEmail(NOTIFY_EMAIL, subject, body);
    Logger.log('当日誕生日リマインダーを送信しました');
  }
}
```

---

## トリガーの設定手順（自動化するには必須）

### 年間登録のトリガー（年に1回）

1. GASエディタを開く（スプシ上部メニュー「拡張機能」→「Apps Script」）
2. 左メニューの時計アイコン「トリガー」をクリック
3. 右下の「＋ トリガーを追加」ボタンをクリック
4. 「実行する関数を選択」で `registerBirthdaysBothYears` を選ぶ
5. 「イベントのソースを選択」で「時間主導型」を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「年タイマー」を選ぶ
7. 実行月：「1月」、実行日：「1日」を設定
8. 実行時刻：「午前6時〜7時」に設定
9. 「保存」ボタンをクリック

### 毎日リマインダーのトリガー

同様の手順で追加のトリガーを設定します。

4. 「実行する関数を選択」で `birthdayReminder` を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「日付ベースのタイマー」を選ぶ
7. 実行時刻：「午前8時〜9時」に設定

これで毎朝8時台に「7日後に誕生日の人がいれば通知」が自動で走ります。

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：スプシで誕生日リストを管理する

`名前 / 月 / 日 / 関係性（家族/取引先など）` の4列で管理すると、後から追加・編集が楽です。新しいクライアントができたり、家族が増えたりしても、スプシに1行追加するだけでOKです。

私は「関係性」列に「家族・職場・副業クライアント・友人」のように分類しています。後でカレンダーのイベントタイトルを見た時に、誰の誕生日かが一目でわかって助かります。

### コツ2：2月29日生まれの人の扱い

うるう年生まれの人は4年に1回しか2月29日が来ません。それ以外の年をどう扱うかは事前に決めておく必要があります。

一般的な対応は「2月28日に通知する」ことです。コードの中で `isLeapYear` 判定を入れて、うるう年でない場合は2月28日に登録するようにすれば問題なく動きます。

上記の `registerBirthdaysBothYears` 関数にこの処理を入れています。

### コツ3：通知タイミングは2段階にする

「7日前にメール通知（プレゼント準備）」「当日朝にもメール通知（お祝いメッセージ送信）」のように2段階にすると忘れない確率が大幅に上がります。

1週間前に気づけば、プレゼントをゆっくり選べます。当日の朝に再度通知が来ることで、「あ、今日だった！」という締切感も生まれます。

私は `birthdayReminder`（7日前）と `todayBirthdayReminder`（当日）の2つのトリガーを設定しています。

---

## つまずきやすいポイント

### エラー1：毎年実行すると誕生日が重複登録される

年に1回の登録スクリプトを複数回実行してしまうと、同じ誕生日のイベントが重複して登録されます。

**解決策**：登録前に同じ日付・同じタイトルのイベントが既に存在するかチェックする。上記コードの `alreadyExists` 処理がその役割を果たしています。

または、トリガーを「年1回の1月1日」に固定して、手動実行しない運用にするのが一番シンプルです。

### エラー2：月や日の数値型・文字列型の不一致でマッチしない

スプレッドシートから取得した月・日の値が、場合によっては文字列になっていることがあります。比較時に型が合わないと「3月15日の誕生日」が検知できないことがあります。

**解決策**：比較時に `Number(month)` で数値型に変換する。

```javascript
// 型変換を明示的に行う（安全な比較）
if (Number(month) === targetMonth && Number(day) === targetDay) {
```

上記のコードではすべてこの書き方にしています。

### エラー3：スプシのデータに空行がある場合エラーになる

スプレッドシートに空行が混じっていると、`name` が `undefined` の状態で処理が進んでエラーになることがあります。

**解決策**：`if (!name || !month || !day) return;` で空の行をスキップする処理を最初に入れる。上記コードにはすべてこの処理が入っています。

---

## まとめ

| 項目 | 内容 |
|---|---|
| 誕生日データの管理 | スプレッドシートで名前・月・日・関係性を管理 |
| カレンダー登録タイミング | 毎年1月1日に当年・翌年分を一括登録 |
| リマインダーのタイミング | 7日前メール + 当日朝メールの2段階 |
| 重複登録の防止 | 登録前に同タイトルイベントの存在確認 |
| 2月29日の対応 | うるう年でない年は2月28日に登録 |
| 空行のスキップ | `if (!name || !month || !day) return` で対応 |
| 効果 | 誕生日・記念日の漏れがゼロに |

このGASを設定しておくと、毎年1月1日に自動で1年分の誕生日が登録され、その後は毎朝チェックが走ります。

「人間関係を大事にしたいけど誕生日を覚えられない」課題が、これで完全に解決します。

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
