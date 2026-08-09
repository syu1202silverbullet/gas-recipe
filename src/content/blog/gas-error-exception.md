---
title: "GASよく出るエラー10選と解決コード集｜辞書代わりに使える完全版"
description: "GASでよく出るエラー10種類を、原因の見分け方と解決コードつきで解説。undefined・権限エラー・実行時間6分の壁・呼び出し回数の上限など、初心者がつまずく所を実体験ベースでまとめました。エラーメッセージの読み方とデバッグ手順つき。"
pubDate: "2026-04-25T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas", "error", "troubleshooting"]
tagNames: ["GAS", "エラー", "トラブル解決"]
readingTime: 14
---

「実行ボタンを押したら赤い文字が出た。英語で読めない」
「昨日は動いたのに、今日は動かない」
「`undefined` ってなに？どこを直せばいいの？」

GASを触り始めた最初の1週間、私はこのエラー地獄で何度も手が止まりました。公式ドキュメントは正確ですが、「そもそも用語がわからない」という段階では読み進められません。

この記事は、私が実際に踏み抜いたエラーを**辞書として引ける形**にまとめたものです。エラーメッセージで検索して飛んできた方は、目次から自分のメッセージを探してください。

## その前に：エラーメッセージの読み方

GASのエラーは、たいてい次の3つの情報を持っています。

```text
TypeError: Cannot read properties of undefined (reading 'age')
    at getUser(コード:3:25)
```

| 部分 | 意味 |
|---|---|
| `TypeError` | エラーの**種類**（型の問題） |
| `Cannot read properties of undefined (reading 'age')` | **何が起きたか**（undefinedの`age`を読もうとした） |
| `at getUser(コード:3:25)` | **どこで**（getUser関数の3行目25文字目） |

読む順番は「どこで」→「何が」→「種類」です。まず行番号に飛んでください。**エラーの9割は、指された行の変数の中身を見れば分かります。**

### 直す前に、まず中身を見る

```text
[エラーが出た] → [メッセージ全文をコピー] → [指された行へ飛ぶ]
 → [その行で使っている変数を console.log で出す] → [直す] → [再実行]
```

いきなり書き換えると、たいてい別のエラーが増えます。`console.log` を挟んで**状態を目で見る**のが結局いちばん速い道です。

```javascript
console.log(typeof data, JSON.stringify(data));  // 型と中身を同時に確認
```

自動実行（トリガー）で出たエラーは、エディタ左メニューの**「実行数」**から履歴とログを確認できます。手動実行のログは実行のたびに下に出ます。

---

## 1. `TypeError: Cannot read properties of undefined`

いちばん多いエラーです。「存在しないものの、中身を読もうとした」ときに出ます。

```javascript
function getUser() {
  const data = { name: '太郎' };
  console.log(data.profile.age);   // profile が無いので落ちる
}
```

**なぜ起きるか**：`data.profile` は `undefined`。`undefined.age` は読めません。

**解決**：オプショナルチェーン（`?.`）と、既定値（`??`）で守ります。

```javascript
console.log(data.profile?.age ?? '未設定');
```

スプレッドシートの値やAPIの応答は「あるはず」と思っていても空のことがあります。**外から来た値は必ず疑う**のが基本姿勢です。

## 2. `ReferenceError: XXX is not defined`

変数名のタイプミスか、宣言忘れです。

```javascript
function run() {
  const sheetName = '売上';
  console.log(sheetname);   // 小文字のnで別物になっている
}
```

**解決**：スペルを確認します。GASエディタは打ち間違いを赤い波線で教えてくれるので、保存前に一度エディタ上の警告を見る癖をつけると激減します。

なお、関数名を間違えると「`XXX is not a function`」になります。似ていますが原因は同じ「その名前のものが無い」です。

## 3. `Exception: Service Spreadsheets failed` / シートがnull

シート名を変更した、シートを消した、他の人が同時に編集している、などで起きます。

```javascript
const sheet = SpreadsheetApp.getActive().getSheetByName('売上');
sheet.getRange('A1').setValue(1);   // シートが無いと sheet は null
```

**解決**：取得直後に必ずチェックを入れます。

```javascript
const sheet = SpreadsheetApp.getActive().getSheetByName('売上');
if (!sheet) throw new Error('「売上」シートが見つかりません。シート名を確認してください');
```

エラーメッセージを自分の言葉にしておくと、半年後の自分が助かります。

## 4. `Exception: Authorization is required`（承認が必要です）

権限をまだ許可していないときに出ます。初回実行では必ず出るので、故障ではありません。

**解決**：**手動で1回実行して承認します。**

1. エディタで関数を選んで実行
2. アカウントを選ぶ
3. 「このアプリはGoogleで確認されていません」→「詳細」→「（プロジェクト名）に移動」
4. 内容を確認して「許可」

自分で書いた未公開のスクリプトなので、この警告表示は正常です。**トリガーの自動実行では承認ダイアログが出せない**ため、必ず手動実行を先に済ませてください。

また、スクリプトに新しいサービス（例：Gmail送信）を追加すると、権限の範囲が変わるので**もう一度承認**が必要になります。「昨日まで動いていたのに」の正体はこれのことがあります。

## 5. `Exception: Service invoked too many times for one day`

1日あたりの上限に達しました。無料アカウントの主な上限は次のとおりです。

| 機能 | 1日の上限（目安） |
|---|---|
| メール送信 | 100通 |
| URL取得（UrlFetchApp） | 20,000回 |
| トリガーの合計実行時間 | 90分 |

**解決**：まず「本当にその回数が必要か」を疑います。ループの中でメールを1通ずつ送っているなら、**1通にまとめる**だけで解決することがほとんどです。

どうしても回数が必要なら、処理を日をまたいで分割します。上限は変更されることがあるので、最新は[公式のQuotasページ](https://developers.google.com/apps-script/guides/services/quotas)で確認してください。

## 6. `Exception: Script took too long`（実行時間6分の壁）

1回の実行が6分を超えると強制終了されます。GASでいちばん有名な制限です。

```javascript
function heavyTask() {
  const sheet = SpreadsheetApp.getActiveSheet();
  for (let i = 1; i <= 10000; i++) {
    sheet.getRange(i, 1).setValue(i);   // 1万回の書き込み＝間違いなく落ちる
  }
}
```

**解決A：まとめて読み書きする（まずこれ）**

```javascript
const values = [];
for (let i = 1; i <= 10000; i++) values.push([i]);
sheet.getRange(1, 1, values.length, 1).setValues(values);   // 書き込みは1回だけ
```

シートとのやり取り（`getValue`／`setValue`）は1回ごとに時間がかかります。**配列にためて最後に1回**が鉄則で、これだけで数十倍速くなることも珍しくありません。

**解決B：続きから再開できるようにする**

どうしても量が多いときは、どこまで終わったかを記録して分割します。

```javascript
function chunkedRun() {
  const props    = PropertiesService.getScriptProperties();
  const startRow = Number(props.getProperty('startRow') || '1');
  const sheet    = SpreadsheetApp.getActiveSheet();
  const data     = sheet.getDataRange().getValues();
  const batch    = data.slice(startRow, startRow + 1000);

  batch.forEach(function (row) { processRow(row); });

  const next = startRow + 1000;
  if (next >= data.length) {
    props.deleteProperty('startRow');    // 最後まで終わったらリセット
    console.log('全件完了');
  } else {
    props.setProperty('startRow', String(next));
    console.log(next + '行目まで完了');
  }
}
```

## 7. `SyntaxError: Unexpected token`

括弧やカンマの閉じ忘れなど、文法の間違いです。**この場合はコードが1行も実行されません。**

**解決**：エディタが指す行の**少し上**を疑ってください。閉じ括弧の不足は、実際のミス位置より後ろの行でエラーになることが多いためです。

私は初期に `}` をひとつ余分に書いていて、2時間溶かしたことがあります。インデント（字下げ）を揃えておくと、こういうミスが目で見つかるようになります。

## 8. `Exception: Range not found`

範囲の指定が不正です。`getRange('A1:Z')` のように行番号を省いた書き方や、行数・列数に0を渡したときに出ます。

```javascript
// 空のシートだと getLastRow() が 0 になって落ちる
sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
```

**解決**：0にならないよう保険をかけます。

```javascript
const lastRow = Math.max(sheet.getLastRow(), 1);
const lastCol = Math.max(sheet.getLastColumn(), 1);
sheet.getRange(1, 1, lastRow, lastCol);
```

「テスト時は動いたのに、まっさらなシートで落ちる」の典型パターンです。

## 9. `TypeError: XXX.map is not a function`

配列だと思っていた変数が、配列ではありませんでした。APIの応答が1件のときにオブジェクトで返る、というのがよくある原因です。

**解決**：配列に揃えてから使います。

```javascript
const arr = Array.isArray(result) ? result : [result];
arr.map(function (item) { return item.name; });
```

同じ理由で `forEach is not a function` も出ます。迷ったら `console.log(Array.isArray(result))` で確かめてください。

## 10. `Exception: Rate Limit Exceeded` / 一時的な通信エラー

外部APIを短時間に叩きすぎたときや、相手側が一時的に不安定なときに出ます。

**解決**：待ち時間を倍にしながら再挑戦します（指数バックオフ）。

```javascript
function fetchWithRetry(url, retries) {
  retries = retries || 3;
  for (let i = 0; i < retries; i++) {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) return res;
    Utilities.sleep(1000 * Math.pow(2, i));   // 1秒 → 2秒 → 4秒
  }
  throw new Error('取得に失敗しました：' + url);
}
```

`muteHttpExceptions: true` を付けておくと、エラー応答でも例外にならず、ステータスコードと本文を自分で確認できます。原因の切り分けが一気に楽になるので、外部APIを叩くときは常に付けておくのがおすすめです。

---

## よくある「そもそも」の失敗3つ

### 失敗1：エラーメッセージを読まずに検索する

「GAS エラー」で検索するより、**メッセージ全文をそのまま検索**するほうが圧倒的に速く答えに着きます。英語のままで大丈夫です。

### 失敗2：保存せずに実行する

編集しただけで実行すると、古いコードが動きます。GASエディタは自動保存されますが、反映が一拍遅れることがあります。実行前に `Ctrl+S`（Macは `⌘+S`）を癖にしてください。

### 失敗3：トリガーで動かす関数に`getActiveSpreadsheet`を使う

手動では動くのに、トリガーだと落ちる——その原因の大半がこれです。トリガー実行時は「開いているシート」が存在しないため `null` になります。

```javascript
// ❌ トリガーでは動かないことがある
const ss = SpreadsheetApp.getActiveSpreadsheet();

// ✅ IDで明示的に開く
const ss = SpreadsheetApp.openById('スプレッドシートのID');
```

## 運用するなら：失敗をメールで知らせる

自動実行は静かに失敗します。気づいたら1週間動いていなかった、というのは本当によくあります。

```javascript
function safeRun(fn, name) {
  try {
    fn();
  } catch (e) {
    GmailApp.sendEmail(
      Session.getActiveUser().getEmail(),
      '【GAS】' + name + ' でエラー',
      e.message + '\n\n' + (e.stack || '')
    );
    throw e;   // 実行履歴にも失敗として残す
  }
}

function main() {
  safeRun(dailySummary, '日次集計');
}
```

あわせて、トリガーの設定画面で**エラー通知を「今すぐ通知を受け取る」**にしておいてください。この2つで「静かに死んでいた」がなくなります。

## エラーと付き合えるようになると起きること

エラーに慣れてくると、こんな変化がありました。

- 使い回せる**自分用のコード断片**が手元に溜まる
- エラーを見た瞬間に「ああ、あれだな」と当たりが付くようになる
- 人が書いたコードの不具合も直せるようになる

私はエラーと解決策を1行メモに残していきました。3か月後には、同じところで困っている人に説明できるようになっていました。**エラーは覚えるものではなく、記録するもの**だと思います。

## まとめ

- エラーは「どこで → 何が → 種類」の順に読む
- 直す前に `console.log` で**変数の中身と型**を見る
- `undefined` 系は `?.` と `??` で守る
- 6分の壁は「まとめて読み書き」でほぼ解決する
- トリガーで動かす関数では `getActiveSpreadsheet()` を使わない
- 自動実行には**失敗通知**を必ず付ける

エラーは、コードが「ここが違うよ」と教えてくれている状態です。次のエラーに出会ったら、またこの記事に戻ってきてください。

## 関連記事

- [GAS入門｜5分で書ける最初の1行コード完全解説](/blog/gas-beginner-5min/)
- [Google Apps Scriptでできること10選｜無料で毎日使える自動化アイデア集](/blog/gas-can-do-10-things/)
- [スプレッドシートを毎朝自動で整える｜GASトリガーを使い倒す基本テクニック](/blog/gas-spreadsheet-daily-auto/)
