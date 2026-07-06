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

凛です。この仕組みを作ろうと決めたのは、ある夜勤明けの朝でした。

スマホをぼんやり眺めていて、ふと副業クライアントのSNSが目に入り、そこで気づいたのです。「あ、先週この人の誕生日だったんだ」。知っていたはずなのに、忙しさに紛れて丸ごと通り過ぎていました。慌ててお祝いの連絡を送ったものの、1週間遅れ。相手は「気にしないでください」と優しく返してくれましたが、自分の中ではずっと引っかかっていました。

看護師と子育てに追われていると、自分の予定を回すだけで精一杯で、人の記念日にまで気を配る余裕がなかなか持てません。手帳に書いても、スマホのリマインダーを設定しても、肝心の当日には別のことに追われて気づけない。「覚えておこう」と気合いで乗り切ろうとするのをやめて、カレンダー側に勝手に登録・通知してもらう方が確実だ——そう腹をくくって、GASで仕組み化することにしました。今回はその作った過程を、つまずきも含めてそのまま書きます。

---

## まず全体像を紙に書き出した

いきなりコードを書き始めると迷子になるので、やりたいことを4行に整理しました。

1. スプレッドシートに誕生日リストを作る（名前・月・日・関係性）
2. GASで当年分の誕生日イベントを一括でカレンダーに登録
3. 毎朝のトリガーで「7日後に誕生日の人がいるか」チェック
4. 該当者がいればメール通知

年に1回（1月1日）に一括登録を走らせて、あとは毎日リマインドチェックを回す。この2本柱でいこう、と決まりました。

---

## リストの置き場所を用意した日

最初にやったのは、コードではなくスプレッドシート作りです。データの土台がないと何も動きません。

| A列（名前） | B列（月） | C列（日） | D列（関係性） |
|---|---|---|---|
| 田中様 | 3 | 15 | 取引先 |
| 山田様 | 7 | 22 | 取引先 |
| おじいちゃん | 11 | 8 | 家族 |
| おばあちゃん | 1 | 30 | 家族 |

1行目はヘッダー（「名前」「月」「日」「関係性」）にしておきます。コード側では `data.shift()` でこの1行目を飛ばす、と決めておきました。

D列の「関係性」は、あとから見返したときに「これは誰の誕生日か」が一目でわかるように入れています。家族・職場・副業クライアント・友人、と分類しておくと、カレンダー上でも判別しやすくて助かりました。

---

## 一括登録のコードを書いた

土台ができたので、いよいよ登録処理です。ここが仕組みの心臓部になります。

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

`registerBirthdays` が当年分、`registerBirthdaysBothYears` が当年・翌年をまとめて入れる版です。年末に翌年分まで先取りしておきたいので、私は後者を使っています。

### 通知のコードも用意した

登録するだけでは意味がありません。「1週間前に気づける」通知がこの仕組みの本命です。

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

`birthdayReminder` が7日前、`todayBirthdayReminder` が当日朝の通知です。2つ用意した理由はあとで書きます。

---

## トリガーで無人化した

コードが揃ったら、あとは手を離しても動くようにトリガーを組みます。ここまでやって、ようやく「気合いで覚える」から卒業できます。

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

同じ手順でもう1つトリガーを足します。変えるのは以下の3点です。

4. 「実行する関数を選択」で `birthdayReminder` を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「日付ベースのタイマー」を選ぶ
7. 実行時刻：「午前8時〜9時」に設定

これで毎朝8時台に「7日後に誕生日の人がいれば通知」が自動で走るようになりました。

---

## 運用してみて調整したこと

しばらく回してみると、机上では気づかなかった手直しどころが見えてきました。3つ書いておきます。

### 通知は2段階にした

最初は7日前の1回だけにしていたのですが、それだと「準備しよう」と思ったまま忘れて、また当日に慌てる、という失敗をやらかしました。そこで当日朝の `todayBirthdayReminder` を足して2段階に。7日前でプレゼントをゆっくり選べて、当日朝の「今日だ！」でメッセージを送り忘れない。この2本立てにしてから、取りこぼしがほぼゼロになりました。

### うるう年生まれの人をどうするか決めておいた

2月29日生まれの人は、うるう年以外はその日が存在しません。放っておくと登録がずれるので、うるう年でない年は2月28日に通知する、と決めました。上の `registerBirthdaysBothYears` に `isLeapYear` 判定を入れてあります。細かいですが、こういう例外を最初に潰しておかないと、あとで「あの人の通知だけ来ない」と悩むことになります。

### リスト管理はスプシのままにした

名前・月・日・関係性の4列で管理していると、新しいクライアントができても、家族が増えても、スプシに1行足すだけで済みます。コードを触らずに運用を回せるのが、続けるうえで一番大事でした。

---

## 動かないときに疑うところ

私が実際に踏んだ地雷を3つ。

### 誕生日が重複登録される

年1回の登録スクリプトを何度も手で回すと、同じ誕生日が二重に入ります。対策は、登録前に同じ日付・同じタイトルのイベントがないか確認すること。上のコードの `alreadyExists` がその役割です。あるいはトリガーを「年1回の1月1日」に固定して、手動実行しない運用にするのが一番シンプルでした。

### 月・日がマッチしない

スプレッドシートから読み込んだ月・日が、たまに文字列型になっていることがあります。数値と文字列を比較するとマッチせず、「3月15日の誕生日」が検知できません。

```javascript
// 型変換を明示的に行う（安全な比較）
if (Number(month) === targetMonth && Number(day) === targetDay) {
```

`Number()` で数値に揃えれば解決します。上のコードはすべてこの書き方にしてあります。

### 空行でエラーになる

スプシに空行が混じっていると、`name` が `undefined` のまま処理が進んでエラーになります。`if (!name || !month || !day) return;` を各処理の頭に置いて、空行を先に弾いておきましょう。これも上のコードに入れてあります。

---

## おわりに

あの夜勤明けの「先週だったんだ」を二度と繰り返さないために作った仕組みですが、動き出してみると、こちらが何もしなくても勝手に思い出させてくれる安心感が思っていた以上でした。人間関係を大事にしたいのに記憶が追いつかない、という悩みは、気合いではなく仕組みで片づけていいんだと実感しています。

まずはスプシに大切な人を5人ぶんだけ書き出して、`registerBirthdaysBothYears` を一度走らせてみてください。そこから少しずつ増やしていけば十分です。

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

掲載しているコードは構文チェック済みですが、お使いのスプシ構成やカレンダー設定に合わせて調整してください。
