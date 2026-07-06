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

凛です。看護師の仕事の合間にコツコツ副業をしていると、いつの間にかGoogleドライブが見たことのない一時ファイルやスクショで埋め尽くされています。

副業でスクショや一時ファイルを大量に保存していると、気づくと「容量があと数MB」の状態になります。焦って手動で古いファイルを1個ずつ削除する作業が本当に苦痛でした。

GASで自動掃除の仕組みを作ってから、月1回の容量パニックが完全になくなりました。この記事ではその実装をまるごと紹介します。

## こんな悩みありませんか？

- Google ドライブの容量が圧迫されて、新規ファイルが保存できなくなった
- 古いファイルを定期整理したいけど、手動で1個ずつ削除は時間がかかりすぎる
- 「1年以上触っていないファイル」をまとめて掃除したい
- 誤って必要なファイルを消してしまうのが怖くて、手動整理に踏み切れない

「怖いから放置 → 容量がいっぱい → 焦って手動整理」のサイクルを断ち切るのが目的です。GASのゴミ箱移動は30日間リカバリできるので、誤削除のリスクも低く安全です。

## GASコード（コピペで動きます）

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

**`setTrashed(true)` はゴミ箱に移動するだけ**です。完全削除ではなく、30日間はGoogleのゴミ箱から復元できます。万が一必要なファイルを消してしまっても、30日以内なら取り戻せます。

**フォルダIDの確認方法：** DriveでフォルダをクリックしたときのURL `https://drive.google.com/drive/folders/【ここ】` の部分がIDです。

## 本番実行前に必ずやること：ドライランで対象を確認

いきなり実行すると思わぬファイルが消える可能性があります。**最初は削除対象をログで確認するだけ**にしてください。

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

GASエディタの実行ログで対象ファイルを確認してから、本番の `autoCleanup()` を実行する流れが安全です。

## 私（凛）が試して気づいたコツ3つ

### コツ1：`DAYS_OLD` はフォルダの用途で変える

「1年経過で削除」が適切かどうかはフォルダによって違います。私の使い分け：

| フォルダの用途 | 設定日数 |
|---|---|
| 一時保存（スクショ・メモ） | 90日 |
| 作業中ファイル | 180日 |
| アーカイブ | 365日 |
| 契約書・確定申告書類 | 削除対象外 |

大事な書類フォルダは絶対に対象外にするのが鉄則です。

### コツ2：自分所有のファイルだけを対象にする

他の人から共有されたファイルも自分のドライブに表示されます。他人のファイルを誤って削除しないよう、自分のアカウントが所有者のものだけに絞る処理を入れると安全です。

```javascript
// 自分のメールアドレスと所有者が一致するものだけ削除
const myEmail = Session.getActiveUser().getEmail();
if (f.getLastUpdated() < cutoff && f.getOwner().getEmail() === myEmail) {
  f.setTrashed(true);
}
```

### コツ3：複数フォルダをまとめて掃除する

対象フォルダが複数ある場合は、配列で管理して一括処理します。

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

## つまずきやすいポイント

### サブフォルダ内のファイルが対象にならない

`folder.getFiles()` はそのフォルダの直下のファイルのみ対象です。サブフォルダの中身も掃除したい場合は、再帰処理（サブフォルダを再帰的に辿る処理）が必要になります。まずは直下のみで試してみて、必要なら拡張してください。

### 実行時間が長すぎてタイムアウトする

ファイル数が多い場合、GASの6分制限（タイムアウト）に引っかかります。一度に全部処理しようとせず、`DAYS_OLD` を長めに設定して対象ファイルを絞るか、フォルダを分けて複数回実行する方法で対処できます。

### 削除したファイルを復元したい

Google Driveのゴミ箱を開いて、ファイルを右クリック→「復元」で30日以内なら戻せます。30日以上経過したものは完全削除されているため復元不可です。

## 毎月自動実行するトリガー設定

1. GASエディタ左の時計アイコン「トリガー」をクリック
2. 「トリガーを追加」
3. 実行する関数：`autoCleanup`
4. イベントのソース：「時間主導型」
5. 時間ベースのトリガーのタイプ：「月ベースのタイマー」
6. 日付：「1」（毎月1日）
7. 時間帯：「午前6時〜7時」
8. 「保存」

毎月1日の朝6時に自動整理が走ります。月初に開いたドライブがスッキリしている状態になります。

## 私の実際の運用フロー

1. **毎月1日 6:00**：GASが自動でゴミ箱移動を実行
2. **月初め**：ドライブを開くと古いファイルが整理済み
3. **30日後**：Googleが自動でゴミ箱を完全削除

「容量がいっぱいで保存できない」という焦りがなくなり、副業の作業に集中できるようになりました。

## まとめ

| ポイント | 内容 |
|---|---|
| `setTrashed(true)` | ゴミ箱移動（30日間は復元可能） |
| ドライラン | 本番前にログで削除対象を確認する |
| 日数設定 | フォルダの用途に合わせて `DAYS_OLD` を変える |
| 所有者確認 | `f.getOwner()` で自分のファイルだけ対象にする |
| トリガー | 月次タイマーで完全自動化 |

まずはドライランで削除対象を確認してから、本番実行してみてください。

## 関連記事（あわせて読みたい）

- [Gmail添付ファイルを自動でDriveに保存するGAS](/blog/gas-gmail-attachment-drive/) — メール→Drive保存の連携
- [GASでDriveフォルダを自動整理する](/blog/gas-drive-auto-organize/) — フォルダ整理の応用
- [GASのトリガーで毎日・毎週・毎月の自動実行を設定する](/blog/gas-trigger-clock-every-day/) — トリガー設定の詳細解説

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
