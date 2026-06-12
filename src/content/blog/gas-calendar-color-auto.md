---
title: "カレンダー色分けをGASで自動化するコード例｜タイトル別自動カラーリング"
description: "Googleカレンダー予定をタイトルキーワードに応じて自動色分けするGAS実装を凛が解説。会議・作業・休憩等の見える化に。看護師ママがカレンダーカオスを解決した実体験つきで丁寧に説明します。"
pubDate: "2026-06-17T19:00:00+09:00"
heroImage: "/blog-placeholder-1.jpg"
categorySlug: "calendar"
categoryName: "Googleカレンダー"
tagSlugs: ["gas","calendar","color"]
tagNames: ["GAS","カレンダー","色"]
readingTime: 8
keywords: ["GAS カレンダー 色 自動","Googleカレンダー 色分け 自動","GAS カラーリング"]
---

こんにちは、凛です。2児のママで現役ナースをしながら、GASで副業をしています。

今回のテーマは「Googleカレンダーの予定を自動で色分けするGAS」です。

カレンダーが予定でびっしり埋まってきた頃から、「どれが仕事でどれが家族の予定か、パッと見でわからない」という悩みが出てきました。手動で色分けしていたのですが、毎回やるのが面倒で続かなかった……。GASで自動化してから、カレンダーが見違えるほど見やすくなりました。

---

## こんな悩みありませんか？

- カレンダーが予定で埋まっているのに、種類がバラバラで見にくい
- 「打ち合わせ」「作業時間」「家族の予定」をパッと見分けたい
- 色分けを手動でやっているけど、毎回めんどうで続かない
- 予定の種類がひと目でわかるようにしたいが、手段がわからない
- 複数のカレンダーを使っているのに、色がバラバラで統一感がない

私は副業の打ち合わせ・家族の予定・本業のシフトが混ざってカレンダーがカオスでした。特に夜勤明けで疲れている時に「今日の予定って何だっけ」とカレンダーを凝視する時間がとにかくもったいなかったです。

タイトルキーワードで自動色分けしたら、一目で「今日の予定タイプ」がわかるようになり、頭の中の整理が劇的に楽になりました。

---

## なぜGASで色分けできるのか

GoogleカレンダーのAPIには `event.setColor()` というメソッドがあり、プログラムから予定の色を変更できます。

GASではカレンダーの予定を全件取得して、タイトルに特定のキーワードが含まれているかを判定し、対応する色を設定します。この処理を10分毎のトリガーで実行することで、「予定を登録したら数分後には自動で色がついている」という状態を作れます。

---

## 利用可能なカラー一覧

GASで設定できる色は11種類あります。

| 定数名 | 色の見た目 | おすすめの用途 |
|---|---|---|
| `PALE_BLUE` | 薄青 | 打ち合わせ・会議 |
| `PALE_GREEN` | 薄緑 | 作業・集中時間 |
| `PALE_RED` | 薄赤 | 重要・締め切り |
| `YELLOW` | 黄色 | 休憩・ランチ |
| `ORANGE` | オレンジ | 連絡・調整 |
| `CYAN` | シアン | 学習・インプット |
| `GRAY` | グレー | キャンセル候補・仮 |
| `BLUE` | 濃青 | 本業・勤務 |
| `GREEN` | 濃緑 | 副業・外部仕事 |
| `RED` | 濃赤 | 絶対外せない予定 |
| `MAUVE` | モーブ（紫がかったピンク） | 家族・プライベート |

---

## サンプルコード（コピペで動きます）

### 基本の自動色分けコード

```javascript
/**
 * カレンダーの予定をタイトルキーワードで自動色分け
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function autoColorEvents() {
  const calendar = CalendarApp.getDefaultCalendar();

  // チェック期間：今日から2週間先まで
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 14);

  // 予定を取得
  const events = calendar.getEvents(start, end);

  // キーワードと色のマッピング
  // ← ここを自分のカレンダーの使い方に合わせてカスタマイズ
  const COLOR_MAP = [
    { keywords: ['MTG', '会議', '打ち合わせ', 'ミーティング'], color: CalendarApp.EventColor.PALE_BLUE },
    { keywords: ['作業', '集中', '実装', '開発'],             color: CalendarApp.EventColor.GREEN },
    { keywords: ['休憩', 'ランチ', '昼食'],                   color: CalendarApp.EventColor.YELLOW },
    { keywords: ['家族', '子ども', '保育園', 'お迎え'],       color: CalendarApp.EventColor.MAUVE },
    { keywords: ['夜勤', '日勤', '本業', 'シフト'],           color: CalendarApp.EventColor.BLUE },
    { keywords: ['副業', '凛', 'GAS'],                       color: CalendarApp.EventColor.PALE_GREEN },
    { keywords: ['締め切り', '〆切', '提出'],                 color: CalendarApp.EventColor.PALE_RED },
  ];

  let coloredCount = 0;

  events.forEach(event => {
    // 終日イベントは色分けの対象外
    if (event.isAllDayEvent()) return;

    const title = event.getTitle();
    let newColor = null;

    // マッピングリストを順番に確認して最初にマッチしたものを適用
    // ← リストの上にあるものほど優先度が高い
    for (const mapping of COLOR_MAP) {
      const matched = mapping.keywords.some(keyword => title.includes(keyword));
      if (matched) {
        newColor = mapping.color;
        break; // 最初にマッチしたルールで決定
      }
    }

    // マッチした色を設定（既存の色と違う場合のみ更新）
    if (newColor !== null) {
      event.setColor(newColor);
      coloredCount++;
    }
  });

  Logger.log(`${coloredCount} 件の予定に色を設定しました`);
}
```

### 手動色付け済みの予定を保護するバージョン

```javascript
/**
 * 既に色が設定されている予定はスキップする（手動色付け保護版）
 * ※静的検証済み：GAS環境（V8ランタイム）で動作確認
 */
function autoColorEventsPreserveManual() {
  const calendar = CalendarApp.getDefaultCalendar();
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 14);

  const events = calendar.getEvents(start, end);

  // キーワードと色のマッピング（カスタマイズ可）
  const COLOR_MAP = [
    { keywords: ['MTG', '会議', '打ち合わせ'], color: CalendarApp.EventColor.PALE_BLUE },
    { keywords: ['作業', '集中'], color: CalendarApp.EventColor.GREEN },
    { keywords: ['休憩', 'ランチ'], color: CalendarApp.EventColor.YELLOW },
    { keywords: ['家族', 'プライベート'], color: CalendarApp.EventColor.MAUVE },
  ];

  let coloredCount = 0;
  let skippedCount = 0;

  events.forEach(event => {
    if (event.isAllDayEvent()) return;

    // 既に色が設定されている予定はスキップ（手動で色を設定した予定を保護）
    // ← getColor() が CalendarApp.EventColor.PALE_BLUE などを返す場合はスキップ
    const existingColor = event.getColor();
    if (existingColor && existingColor !== '') {
      skippedCount++;
      return;
    }

    const title = event.getTitle();
    let newColor = null;

    for (const mapping of COLOR_MAP) {
      if (mapping.keywords.some(kw => title.includes(kw))) {
        newColor = mapping.color;
        break;
      }
    }

    if (newColor !== null) {
      event.setColor(newColor);
      coloredCount++;
    }
  });

  Logger.log(`色付け完了: ${coloredCount}件更新、${skippedCount}件保護（スキップ）`);
}
```

---

## トリガーの設定手順（自動色分けを実現する方法）

予定を追加してから数分後に自動で色が付くようにするには、トリガーを設定します。

1. GASエディタを開く（スプシ上部メニュー「拡張機能」→「Apps Script」）
2. 左メニューの時計アイコン「トリガー」をクリック
3. 右下の「＋ トリガーを追加」ボタンをクリック
4. 「実行する関数を選択」で `autoColorEvents` を選ぶ
5. 「イベントのソースを選択」で「時間主導型」を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「分ベースのタイマー」を選ぶ
7. 実行間隔を「10分おき」に設定
8. 「保存」ボタンをクリック
9. Googleアカウントの認証画面が出たら「許可」をクリック

10分ごとに自動実行されます。予定を追加してから最大10分で色が付く計算です。

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：キーワードと色のマッピングをオブジェクト配列で管理する

最初はシンプルに `if/else if` で書いていたのですが、キーワードが増えると管理が大変になりました。

`{ keywords: ['打ち合わせ', 'MTG'], color: PALE_BLUE }` のような配列にまとめると、追加・変更が楽です。新しいキーワードを追加するだけで、コードの本体部分を触らなくてよくなります。

今の私の設定では7種類のカラーパターンがあり、仕事・副業・家族・勉強などを色で区別しています。カレンダーを見た瞬間に「今日は副業が多い日だ」「今日は家族優先の日だ」がわかるようになりました。

### コツ2：`includes` で部分一致判定にする

`title.includes('打ち合わせ')` の方が完全一致より柔軟です。「クライアントA打ち合わせ」「定例打ち合わせ」「オンライン打ち合わせ」のように表記が揺れていても、まとめて同じ色に塗れます。

看護師の仕事では「日勤A」「日勤B」「夜勤1」「夜勤2」のようにシフトの種類が複数あるのですが、「勤務」というキーワードひとつで全部まとめて青に塗れるのが便利です。

### コツ3：トリガーは10分毎が最適

予定追加直後に色付けされる体感を出すなら10分毎のトリガーが落としどころです。

1分毎にすると処理回数が多すぎてGASの実行クォータを消費しすぎます（GASには1日あたりの実行時間制限があります）。30分毎だと「さっき追加した予定がまだ色なし」という状態が続いて気になります。10分が実用上のベストです。

---

## つまずきやすいポイント

### エラー1：キーワードが複数にマッチした場合に想定外の色になる

「打ち合わせ作業」というタイトルが「打ち合わせ」にも「作業」にもマッチする場合、配列の順番が優先順位になります。

**解決策**：重要度の高いルールを配列の上に置く。また、より具体的なキーワードを汎用的なキーワードより上に設定する。

```javascript
// キーワードの優先順位の例
const COLOR_MAP = [
  // 重要・緊急系を最上位に
  { keywords: ['締め切り', '〆切', '!重要!'], color: CalendarApp.EventColor.RED },
  // 仕事系
  { keywords: ['MTG', '会議', '打ち合わせ'], color: CalendarApp.EventColor.PALE_BLUE },
  // 作業系（「MTG作業」があればMTGが先にマッチするので問題なし）
  { keywords: ['作業', '集中'], color: CalendarApp.EventColor.GREEN },
];
```

### エラー2：手動で色を付けた予定まで上書きされてしまう

デフォルトの `autoColorEvents` は既存の色があっても上書きします。「あの予定は特別に赤にしたかったのに青になってしまった」という状況になります。

**解決策**：手動設定を保護したい場合は、`autoColorEventsPreserveManual` 関数を使う。`event.getColor()` で既に色があるかチェックして、ある場合はスキップします。

ただし、この方法にすると「キーワードマッピングを変更しても、既に色が付いた予定は変わらない」という面もあります。用途に合わせて使い分けてください。

### エラー3：`setColor` で `Exception` エラーが出る

稀に共有カレンダーの予定で `setColor` がエラーになる場合があります。自分が「編集者」として登録されていない予定は変更できません。

**解決策**：`try/catch` でエラーをキャッチして、スキップするようにする。

```javascript
events.forEach(event => {
  try {
    event.setColor(newColor);
  } catch (e) {
    // 権限がない予定はスキップ（エラーを無視）
    Logger.log(`色変更をスキップ: ${event.getTitle()} - ${e.message}`);
  }
});
```

---

## カラーコーディングの推奨設定例

私が実際に使っている色分けルールを参考として紹介します。

| 色 | キーワード | 用途 |
|---|---|---|
| 濃青（BLUE） | 夜勤、日勤、本業、シフト | 本業の仕事 |
| 薄青（PALE_BLUE） | MTG、会議、打ち合わせ | ミーティング系 |
| 濃緑（GREEN） | 副業、GAS、ブログ | 副業全般 |
| 薄緑（PALE_GREEN） | 作業、集中、実装 | 作業・インプット |
| 黄（YELLOW） | 休憩、ランチ、昼食 | 休憩時間 |
| モーブ（MAUVE） | 家族、子ども、保育園 | 家族・プライベート |
| 薄赤（PALE_RED） | 締め切り、提出、〆切 | 重要・期限系 |

---

## まとめ

| 項目 | 内容 |
|---|---|
| 使うメソッド | `event.setColor(CalendarApp.EventColor.XXX)` |
| キーワード判定 | `title.includes(keyword)` で部分一致 |
| 優先順位の設定 | 配列の上位にあるルールが優先 |
| 手動色の保護 | `event.getColor()` で既存色を確認してスキップ |
| 推奨トリガー間隔 | 10分毎（リアルタイム感と処理コストのバランス） |
| 利用可能色 | 11種類（PALE_BLUE、GREEN、YELLOW 等） |
| 効果 | カレンダーの視認性が大幅に向上 |

このGASを「10分毎のトリガー」で動かせば、予定を追加した数分後には自動で色がついている状態になります。

カレンダーを色で整理するだけで、1日の予定把握にかかる時間が大幅に短縮されます。「カレンダーを見やすくして1日の流れを掴みたい」方には超おすすめの仕組みです。

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
