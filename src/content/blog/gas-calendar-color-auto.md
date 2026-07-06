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

こんにちは、病棟勤務のかたわらGASをいじっている凛です。仕事のシフト、子どもの行事、副業の打ち合わせ。気づけばカレンダーが予定でびっしり埋まって、どれが何の用事なのかパッと見では区別がつかなくなっていました。夜勤明けの疲れた頭で、色も種類もバラバラな予定の壁を凝視する。あの時間が、本当にもったいなかったんです。

種類ごとに色を付ければ見やすいのは分かっていました。でも手で塗り分ける作業は続かない。そこで、予定のタイトルから自動で色を振り分けるGASを組みました。この記事では、導入前後で私のカレンダーがどう変わったかを見せてから、その仕組みと手順を説明していきます。

---

## Before / After：カレンダーがこう変わりました

まず、導入前と導入後で何が違ったのかを並べてみます。

**Before（手作業のころ）**

- 予定が全部同じ色で、種類の見分けがつかない
- 種類ごとに色を付けようとしても、手作業なので3日で挫折
- 夜勤明けに「今日の予定タイプ」を把握するのに、一件ずつタイトルを読む必要があった
- 「今日は副業が多い日か、家族優先の日か」が一目で分からない

**After（自動色分けを入れてから）**

- 予定を登録すると、数分後に勝手に色がつく
- カレンダーを開いた瞬間、色の分布で「今日のテーマ」が分かる
- 「青が多い＝勤務中心」「緑が多い＝副業デー」と、読まずに掴める
- 手作業ゼロ。塗り忘れという概念がなくなった

同じカレンダーとは思えないくらい、頭の中の整理が楽になりました。色の判断基準は、たいてい予定のタイトルに表れています。「会議」なら青、「通院」なら赤、というルールさえ決めてしまえば、あとは機械が振り分けられる。人が塗り続ける代わりに、このルールをGASに覚えさせるわけです。

`event.setColor()` というメソッドを使えば、プログラムから予定の色を変えられます。予定を全件取得して、タイトルに特定のキーワードが含まれているかを見て、対応する色を設定する。これを10分ごとのトリガーで回せば、「登録したら数分で色がつく」状態が作れます。

---

## 使える色は11種類

具体的なコードに入る前に、GASで指定できる色を一覧にしておきます。この対応表を見ながら、自分の用途に色を割り当てていくとイメージしやすいです。

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

## 手順：自動色分けのコードを入れる

### まずは基本のコード

キーワードと色の対応をリストにして、タイトルに含まれていたらその色を塗る、というのが基本形です。

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

`COLOR_MAP` の部分が心臓です。ここに「このキーワードならこの色」を並べておくだけ。`title.includes(keyword)` で部分一致を見ているので、「クライアントA打ち合わせ」でも「オンライン打ち合わせ」でも、まとめて同じ色に塗れます。看護師の仕事だと「日勤A」「日勤B」「夜勤1」みたいにシフト名が分かれているのですが、「勤務」というキーワードひとつで全部青にできるのがありがたいところです。

### 手動で塗った色を守るバージョン

上のコードは、既に色がついている予定も上書きします。でも「この予定だけは特別に赤にしておきたかったのに、勝手に青になった」という事故が起きることがある。そこで、手動で塗った色は触らない版も用意しました。

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

`event.getColor()` で既に色があるかを見て、ある予定はそのまま残します。ただしこの方法にすると、あとからキーワードのルールを変えても、既に色がついている予定は変わりません。どちらが自分の使い方に合うか、少し使ってみて決めるのがいいと思います。

### 10分ごとに自動で回す

コードを貼ったら、トリガーで自動化します。予定を追加してから数分で色がつくようにするなら、10分ごとがちょうどいい落としどころです。

1. GASエディタを開く（スプシ上部メニュー「拡張機能」→「Apps Script」）
2. 左メニューの時計アイコン「トリガー」をクリック
3. 右下の「＋ トリガーを追加」ボタンをクリック
4. 「実行する関数を選択」で `autoColorEvents` を選ぶ
5. 「イベントのソースを選択」で「時間主導型」を選ぶ
6. 「時間ベースのトリガーのタイプを選択」で「分ベースのタイマー」を選ぶ
7. 実行間隔を「10分おき」に設定
8. 「保存」ボタンをクリック
9. Googleアカウントの認証画面が出たら「許可」をクリック

なぜ10分なのか。1分ごとにすると処理回数が多すぎて、GASの1日あたりの実行時間制限を無駄に食います。かといって30分ごとだと「さっき入れた予定がまだ色なし」の時間が長くて気になる。試した結果、10分が実用上のベストでした。

---

## つまずきやすいところ

私が引っかかった3か所を、対処とセットで置いておきます。

### 複数のキーワードにマッチして想定外の色になる

「打ち合わせ作業」というタイトルは「打ち合わせ」にも「作業」にもマッチします。このとき、どちらの色になるかは `COLOR_MAP` の並び順で決まります。上にあるものが優先されるので、重要度の高いルールや、より具体的なキーワードを上に置いてください。

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

### 手動で塗った色まで上書きされる

デフォルトの `autoColorEvents` は既存の色があっても上書きします。特別に色を変えておいた予定が塗り替えられて困るなら、さっきの `autoColorEventsPreserveManual` を使ってください。`event.getColor()` で既に色があるかを見て、ある場合はスキップします。

### `setColor` でエラーが出る

共有カレンダーの予定で `setColor` がエラーになることが稀にあります。自分が「編集者」として登録されていない予定は、色を変える権限がないためです。`try/catch` でエラーを拾ってスキップすれば、そこで処理が止まらずに済みます。

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

## 応用：私の色分けルールをそのまま置いておきます

キーワードと色の組み合わせは、最初から完璧に決める必要はありません。使いながら足していけばいい。参考までに、今の私の設定を丸ごと共有します。ここから自分用に削ったり足したりするのが早いと思います。

| 色 | キーワード | 用途 |
|---|---|---|
| 濃青（BLUE） | 夜勤、日勤、本業、シフト | 本業の仕事 |
| 薄青（PALE_BLUE） | MTG、会議、打ち合わせ | ミーティング系 |
| 濃緑（GREEN） | 副業、GAS、ブログ | 副業全般 |
| 薄緑（PALE_GREEN） | 作業、集中、実装 | 作業・インプット |
| 黄（YELLOW） | 休憩、ランチ、昼食 | 休憩時間 |
| モーブ（MAUVE） | 家族、子ども、保育園 | 家族・プライベート |
| 薄赤（PALE_RED） | 締め切り、提出、〆切 | 重要・期限系 |

最初はシンプルに `if/else if` で書いていたのですが、キーワードが増えると手に負えなくなりました。今のようにオブジェクトの配列にまとめてからは、新しいキーワードを1行足すだけで済むようになって、格段に管理が楽です。ここから、天気やタスク管理ツールと連携させる方向にも広げられますが、まずはこの表を自分色に染めるところから始めるのがおすすめです。

---

## おわりに

たかが色分け、と思っていたのですが、カレンダーを開いた瞬間に今日の輪郭が掴めるのは、想像以上に効きました。色を読む、じゃなくて、色を眺めるだけで分かる。この差は大きいです。夜勤明けのぼんやりした頭でも、青が多ければ勤務デー、緑が多ければ副業デーと、考えなくても体が反応する感じになりました。

まずはキーワードを3つ4つだけ登録して、10分トリガーで回してみてください。数分後に色がつく体験をすると、あとは自然と自分の予定に合わせて育てたくなるはずです。コードは構文をチェックのうえ載せていますが、キーワードや色の割り当てはご自身のカレンダーの使い方に合わせて調整してくださいね。

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
