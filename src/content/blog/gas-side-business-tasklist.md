---
title: "副業タスクをGASで毎朝LINEに届ける仕組み"
description: "夜勤明けでも今日やることを迷わないように、スプレッドシートの副業タスクを毎朝GASがLINEに届けてくれる仕組みを作りました。看護師の実運用レシピです。"
pubDate: "2026-05-21T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "side-business"
categoryName: "副業・確定申告"
tagSlugs: ["gas", "side-business", "line", "task"]
tagNames: ["GAS", "副業", "LINE", "タスク管理"]
mainKeyword: "GAS 副業 自動化"
readingTime: 6
author: "凛"
---

# 副業タスクをGASで毎朝LINEに届ける仕組み

## こんな悩みありませんか？

- 副業のやることリストをNotionやスプレッドシートに書いたのに、開かずに1日が終わる
- 夜勤明けでぼーっとしていて、「今日何からやるんだっけ…」から考え始めてしまう
- タスク管理アプリを増やすほど、管理そのものに疲れる

わかります。私もを送り出してコーヒー淹れた瞬間には、頭の中のTODOが蒸発しているタイプです。なので、自分が一番よく見るLINEに、毎朝「今日はこれやればいいよ」と流れてくる仕組みを作りました。

この記事では、スプレッドシートに書いた副業タスクを毎朝LINEに届けるGASの作り方を、最小構成でまとめます。

## 仕組みの全体像

必要なのは3つだけ。

1. **タスク一覧を置くスプレッドシート**（A列:タスク、B列:期限、C列:優先度、D列:完了フラグ）
2. **LINEに送る用のトークン**（LINE Notify または LINE Messaging API）
3. **毎朝決まった時間に走る時間トリガーのGAS**

動きは、「シートから未完了のタスクを読む → 期限が近い順に並べる → 今日やるぶんだけ切り出してLINEに送る」というシンプルなパイプライン。朝7時に届くようにしておけば、子どもを送り出したあとコーヒーを飲みながら1日が設計できます。

ちなみに2025年以降はLINE Notifyのサービス終了が話題になっているので、本記事ではMessaging API前提で書きますが、疑似コードとしてはどちらも似た形です。

## ポイント3つ：実装のキモ

### ポイント1：スプレッドシートの設計をシンプルに保つ

管理したくなくなる仕組みは続きません。列は最小限に絞ります。

| A列：タスク | B列：期限 | C列：優先度 | D列：完了 |
| --- | --- | --- | --- |
| 記事執筆（GAS記事） | 2026-04-22 | A | |
| 確定申告レシート整理 | 2026-04-25 | B | 済 |

完了にしたいときはD列に「済」を入れるだけ。チェックボックスでもOKです。これなら夜勤明けの脳でも操作できます。

### ポイント2：タスクを抽出して整形する

読み込み→フィルタ→並べ替え→文字列化、を1関数にまとめておきます。

```javascript
function buildTodayMessage() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('tasks');
  const rows = sheet.getDataRange().getValues().slice(1); // 見出し除外
  const today = new Date();

  const items = rows
    .filter(r => r[0] && !r[3]) // タスク有り・未完了
    .map(r => ({
      task: r[0],
      due: r[1] ? new Date(r[1]) : null,
      priority: r[2] || 'C'
    }))
    .sort((a, b) => {
      // 優先度A→B→C、期限が近い順
      if (a.priority !== b.priority) return a.priority.localeCompare(b.priority);
      return (a.due || today) - (b.due || today);
    })
    .slice(0, 5); // 朝は5件まで

  const lines = items.map((it, i) => {
    const due = it.due ? Utilities.formatDate(it.due, 'JST', 'MM/dd') : '未設定';
    return `${i+1}. [${it.priority}] ${it.task}（〆${due}）`;
  });

  return `おはよう！今日の副業タスクは${items.length}件だよ\n\n` + lines.join('\n');
}
```

「5件まで」にしているのは、欲張ると結局やらないから。朝のLINEはメニュー表くらいの軽さがちょうどいいです。

### ポイント3：LINEに送る

Messaging APIの場合、発行済みアクセストークンと送信先ユーザーIDをスクリプトプロパティに入れておきます。

```javascript
function sendLine(message) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_TOKEN');
  const to = props.getProperty('LINE_TO_USER_ID');

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    headers: { 'Authorization': 'Bearer ' + token },
    contentType: 'application/json',
    payload: JSON.stringify({
      to: to,
      messages: [{ type: 'text', text: message }]
    })
  });
}

function dailyMorningTask() {
  sendLine(buildTodayMessage());
}
```

`dailyMorningTask` に対して、時間主導型トリガーで「毎朝7時」を設定すれば完成。私は土日だけ8時にしたくて、曜日で時刻を分岐させる方法も試しましたが、2つのトリガーを作るほうが混乱しにくかったです。

## 応用：通知を「使える情報」にするコツ

作ってみるとわかるのですが、ただ送るだけでは数日で既読スルーになります。育てるポイントをいくつか紹介します。

- **締切がヤバいタスクを頭に絵文字やマークで強調する**（優先度A＋期限3日以内など）
- **ダラダラ残っている古いタスクには「塩漬け日数」を添える**（期限から何日過ぎたか）
- **前日完了したタスク数も一緒に送って「やったね」感を出す**（続けたくなる仕掛け）
- **休息日には「今日は休もう」メッセージに切り替える**（週6日目などで判定）

このあたりはスプレッドシート側のデータさえ整っていれば、関数を足していくだけで育てていけます。逆に、データ設計が雑だと何も応用できないので、最初の表レイアウトには少しだけ時間をかけるのがおすすめです。

私は「オフ会記録アプリ」や「記念日管理アプリ」でも同じように、GAS→LINE通知のレールを使い回しています。一度このパイプラインを通しておくと、他の仕組みにも流用できて、副業全体の運用コストが一気に下がります。

## まとめ

- 副業タスクを毎朝LINEに届けるだけで、夜勤明けでも迷わない1日が始まる
- スプレッドシートの列は最小限、通知は上位5件まで、を守ると長続きする
- 1本パイプを作れば、他の自動化にも使い回せる

タスク管理アプリを乗り換えるより、使い慣れたLINEに情報が来るほうがずっと強いです。まずは「未完了上位5件を朝送るだけ」から始めてみてください。


## 💼 確定申告・会計ソフト比較

<div class="ad-block">
<p class="ad-label">PR：本記事には広告（A8.net）が含まれます</p>

GASで自動化した記帳データは最終的に会計ソフトで確定申告する流れが一般的です。副業レベルで使いやすい定番3サービス：

- **<a href="https://px.a8.net/svt/ejp?a8mat=4B1R5U+EV8SPE+3SPO+9FDI8Y" rel="sponsored nofollow" target="_blank">freee会計</a>** – 確定申告書類の自動作成、銀行連携が強い
- **<a href="https://px.a8.net/svt/ejp?a8mat=3T8I4R+2PN72Q+35XE+5YJRM" rel="sponsored nofollow" target="_blank">やよいの青色申告オンライン</a>** – 白色申告は永年無料、シェアNo.1の実績
- **<a href="https://px.a8.net/svt/ejp?a8mat=3NERNS+AC40YA+4JGQ+BWVTE" rel="sponsored nofollow" target="_blank">マネーフォワード クラウド確定申告</a>** – MFクラウド連携でUber Eats等の副業収入集計に便利

自分の業態に合うものを選んでください。
<img border="0" width="1" height="1" src="https://www19.a8.net/0.gif?a8mat=4B1R5U+EV8SPE+3SPO+9FDI8Y" alt="">
<img border="0" width="1" height="1" src="https://www17.a8.net/0.gif?a8mat=3T8I4R+2PN72Q+35XE+5YJRM" alt="">
<img border="0" width="1" height="1" src="https://www14.a8.net/0.gif?a8mat=3NERNS+AC40YA+4JGQ+BWVTE" alt="">
</div>

## 関連記事

- [Webhook受信でGAS即時実行する設定方法](./gas-trigger-webhook)
- [GAS6分制限を回避する3パターン完全解説](./gas-trigger-6min-limit)
- [Uber Eats配達記録をMF会計CSV化するGAS](./gas-ubereats-csv-mf)

---

### この記事を書いた人：凛

都内で看護師をしながら、副業でWebエンジニア、夜勤の合間に副業でGASプログラミングをしています。「自分が楽になるための自動化」をモットーに、看護師目線でGASレシピを発信中。難しいコードより、明日の自分が助かる仕組みが好きです。
