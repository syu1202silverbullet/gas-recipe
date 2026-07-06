---
title: "古いファイルを自動削除するドライブGAS｜容量圧迫回避"
description: "ドライブの古いファイルを自動でゴミ箱移動するGAS実装を凛が解説。最終更新N日経過で自動アーカイブ。誤削除防止のドライラン確認方法も紹介。"
pubDate: "2026-06-28T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "drive"
categoryName: "Googleドライブ"
tagSlugs: ["gas","drive","cleanup"]
tagNames: ["GAS","ドライブ","削除"]
readingTime: 8
keywords: ["GAS ドライブ 削除 自動","GAS Google Drive 容量","Google Apps Script ファイル削除"]
---

凛です。ふと思ったことがあります。「Googleドライブの古いファイル整理、なんで私はいつも月末に焦ってやっているんだろう」と。

看護師の合間にコツコツ副業をしていると、見た覚えのない一時ファイルやスクショで、ドライブがいつの間にか埋め尽くされています。気づくと「容量あと数MB」。そこから1個ずつ手動で消していく作業が、本当に苦痛でした。自動でできないものか——その問いから作ったのが、今日のGASです。

## そもそも自動削除って安全なの？

まずここが引っかかる人が多いと思います。私もそうでした。「自動で消すなんて、必要なファイルまで飛んだら怖い」と。

結論から言うと、GASの掃除は思ったより安全です。理由は `setTrashed(true)` を使うから。これは完全削除ではなく、あくまでゴミ箱に移動するだけの処理です。Googleのゴミ箱は30日間は復元できるので、万が一大事なファイルを入れてしまっても、30日以内なら取り戻せます。

「怖いから放置 → 容量がいっぱい → 焦って手動整理」。このループを断ち切りたいだけなら、いきなり完全削除する必要はないんですよね。ゴミ箱移動で十分なんです。

そのうえで、実際のコードがこちらです。

```javascript
function autoCleanup() {
  const FOLDER_ID = 'ここに対象フォルダのID';
  const DAYS_OLD  = 365; // 何日経過したらゴミ箱に入れるか

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_OLD);

  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFiles();
  let deleted = 0;

  while (files.hasNext()) {
    const f = files.next();
    if (f.getLastUpdated() < cutoff) {
      f.setTrashed(true); // ゴミ箱へ移動（完全削除ではない）
      console.log('ゴミ箱へ移動: ' + f.getName() + ' (' + f.getLastUpdated() + ')');
      deleted++;
    }
  }

  console.log('完了: ' + deleted + '件をゴミ箱に移動しました');
}
```

`FOLDER_ID` に入れる値は、Driveでフォルダを開いたときのURL `https://drive.google.com/drive/folders/【ここ】` の部分です。

## 「本当に消していいファイルか」はどう確かめる？

ここが一番大事な問いだと思います。いくらゴミ箱移動とはいえ、いきなり本番を走らせて想定外のファイルが消えたら、気持ちのいいものではありません。

答えは「先にドライランで対象だけ眺める」です。削除はせず、消える予定のファイル名をログに出すだけの版を、私は必ず先に流します。

```javascript
function dryRunCleanup() {
  const FOLDER_ID = 'ここに対象フォルダのID';
  const DAYS_OLD  = 365;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_OLD);

  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFiles();
  let count = 0;

  console.log('=== 削除対象ファイル一覧（ドライラン）===');
  while (files.hasNext()) {
    const f = files.next();
    if (f.getLastUpdated() < cutoff) {
      // setTrashed(true) はコメントアウト → ログ確認のみ
      console.log(f.getName() + ' | 最終更新: ' + f.getLastUpdated());
      count++;
    }
  }
  console.log('合計: ' + count + '件が削除対象です');
}
```

GASエディタの実行ログで一覧を見て、「これなら消えても大丈夫」と納得してから本番の `autoCleanup()` を走らせる。この一手間があるだけで、心理的なハードルがぐっと下がります。

## どのくらいの期間で消すのが正解？

「1年経過で削除」がちょうどいいかというと、フォルダの用途によります。ここは正解が1つではありません。私の使い分けはこんな感じです。

| フォルダの用途 | 設定日数 |
|---|---|
| 一時保存（スクショ・メモ） | 90日 |
| 作業中ファイル | 180日 |
| アーカイブ | 365日 |
| 契約書・確定申告書類 | 削除対象外 |

鉄則は、大事な書類フォルダは絶対に対象に入れないこと。ここだけは自動化の輪から外しておきます。

### 他人のファイルまで消さないようにするには

もうひとつ気をつけたいのが、共有されたファイルです。他の人から共有されたものも自分のドライブに表示されるので、うっかり他人のファイルを消してしまう可能性があります。所有者が自分のものだけに絞る一文を足すと安心です。

```javascript
// 自分のメールアドレスと所有者が一致するものだけ削除
const myEmail = Session.getActiveUser().getEmail();
if (f.getLastUpdated() < cutoff && f.getOwner().getEmail() === myEmail) {
  f.setTrashed(true);
}
```

### 掃除したいフォルダが複数あるときは

対象フォルダが1つとは限りません。複数あるなら、配列でまとめて回すのが楽です。

```javascript
function autoCleanupMulti() {
  const FOLDER_IDS = [
    'フォルダID_1',
    'フォルダID_2',
    'フォルダID_3'
  ];
  const DAYS_OLD = 365;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_OLD);

  FOLDER_IDS.forEach(folderId => {
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    while (files.hasNext()) {
      const f = files.next();
      if (f.getLastUpdated() < cutoff) {
        f.setTrashed(true);
        console.log('削除: ' + f.getName());
      }
    }
  });
}
```

## つまずいたところ、正直に

やってみると、いくつか「あれ？」となる場面がありました。

**サブフォルダの中身が消えない。** `folder.getFiles()` は、そのフォルダの直下だけが対象です。サブフォルダの中まで掃除したいなら、サブフォルダを再帰的に辿る処理が別途必要になります。まずは直下だけで試して、足りなければ広げるのがおすすめです。

**ファイルが多いとタイムアウトする。** GASには6分の実行制限があります。一度に全部やろうとせず、`DAYS_OLD` を長めにして対象を絞るか、フォルダを分けて何回かに分けて流すと通ります。

**やっぱり戻したいファイルが出た。** そんなときはDriveのゴミ箱を開いて、ファイルを右クリック→「復元」。30日以内なら戻せます。逆に30日を過ぎたものは完全削除されていて戻せないので、そこだけ覚えておいてください。

## 毎月1日に勝手に走らせる

最後は自動化です。トリガーを月次で仕掛けます。

1. GASエディタ左の時計アイコン「トリガー」をクリック
2. 「トリガーを追加」
3. 実行する関数：`autoCleanup`
4. イベントのソース：「時間主導型」
5. 時間ベースのトリガーのタイプ：「月ベースのタイマー」
6. 日付：「1」（毎月1日）
7. 時間帯：「午前6時〜7時」
8. 「保存」

これで毎月1日の朝6時に整理が走ります。私の場合、実際の流れはこうなっています。

1. **毎月1日 6:00**：GASが自動でゴミ箱移動を実行
2. **月初め**：ドライブを開くと古いファイルが整理済み
3. **30日後**：Googleが自動でゴミ箱を完全削除

月初にドライブを開いてスッキリしていると、それだけで少し気分がいいものです。「容量がいっぱいで保存できない」という焦りが消えて、副業の作業そのものに集中できるようになりました。冒頭の「なんで毎月焦ってるんだろう」という問いは、これで卒業できた気がしています。

まずはドライランで対象を眺めるところから、気軽に試してみてください。

## 関連記事（あわせて読みたい）

- [Gmail添付ファイルを自動でDriveに保存するGAS](/blog/gas-gmail-attachment-drive/) — メール→Drive保存の連携
- [GASでDriveフォルダを自動整理する](/blog/gas-drive-auto-organize/) — フォルダ整理の応用
- [GASのトリガーで毎日・毎週・毎月の自動実行を設定する](/blog/gas-trigger-clock-every-day/) — トリガー設定の詳細解説

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは構文とAPI仕様を確認のうえ掲載していますが、実行前にお使いの環境で動作を確かめてください。
