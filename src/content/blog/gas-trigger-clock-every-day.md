---
title: "毎朝8時にGASを実行する時刻指定トリガー｜時間主導型の設定と活用例10選"
description: "GASを毎朝・毎週・毎月の決まった時刻に自動実行する時間主導型トリガーの設定方法と活用例10選を、看護師×副業Webエンジニアの凛が解説。設定画面の手順から実行時刻のズレ対策、上限管理まで完全ガイド。"
pubDate: "2026-05-06T19:00:00+09:00"
heroImage: "/blog-placeholder-4.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","trigger","schedule","cron"]
tagNames: ["GAS","トリガー","スケジュール","定期実行"]
readingTime: 8
keywords: ["GAS 毎日 実行","GAS 時間主導型 トリガー","GAS 定期実行","GAS 毎朝 自動化"]
---

こんにちは、凛です。都内で看護師をしながら、副業でWebエンジニアをしています。GASの真価は「**人間が起きていなくても勝手に動く**」自動化。時間主導型トリガーの設定方法と、私が実際に使っている活用例10選を紹介します。

「GAS 毎日 実行」で検索してここに来た方が、読み終わった直後に毎朝走るGASを設定できるレベルで書いています。

## こんな悩みありませんか？

- 「毎朝8時にGASを動かしたいけど、設定方法がわからない」
- 「平日だけ動かす設定はできる？」
- 「時刻指定トリガーで動かしたら、希望時刻と微妙にズレた」
- 「他にどんなことを定期実行したらいいかアイデアが欲しい」

私も最初は手動実行ばかりで「これGASにする意味ある？」状態でした。トリガーを使い始めて、生活が一変しました。

## 時間主導型トリガーの全体像

GASのトリガーには2系統あります。

| 種類 | きっかけ |
|---|---|
| **シンプルトリガー** | onOpen/onEdit等、ファイル操作で自動発火 |
| **時間主導型トリガー** | 指定時刻・周期で自動発火 ← **今回の主役** |

時間主導型はさらに：
- **特定の日時** 1回だけ
- **分ベース**（5分/10分/15分/30分おき）
- **時間ベース**（1時間/2時間おき等）
- **日付ベース**（毎日 X時〜Y時の間）
- **週ベース**（毎週月曜 X時等）
- **月ベース**（毎月X日）

## 設定方法（GUI版）

GASエディタ左側の**時計アイコン**（トリガー）をクリック → 右下「**トリガーを追加**」。

設定項目：
- **実行する関数**: 動かしたい関数名
- **実行するデプロイ**: Head（最新版）
- **イベントのソース**: 時間主導型
- **時間ベースのトリガーのタイプ**: 用途に応じて選ぶ
- **時間間隔**: 上で選んだタイプに応じた選択肢

例：「毎朝8〜9時の間に1回実行」なら：
- 時間主導型 → 日付ベース → 8時〜9時

## 設定方法（コード版）

GUI設定だけだと再現性がないので、コードでもセットできます。

```javascript
function setDailyTrigger() {
  // 既存の同関数トリガーをまず削除（重複防止）
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'morningTask') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 毎日朝8時に morningTask を実行
  ScriptApp.newTrigger('morningTask')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();
}

function morningTask() {
  console.log('おはよう、今は ' + new Date());
}
```

setDailyTrigger を1回手動実行 → 以降毎朝自動でmorningTask実行。

## ⚠️ 実行時刻が微妙にズレる仕様

**時間ベーストリガーは「8:00ジャスト」ではなく「8:00〜9:00の間のどこか」で実行**されます。Googleがサーバー負荷分散のため意図的にズラす仕様。

| 用途 | OK/NG |
|---|:---:|
| メール通知（数十分のズレ無問題） | ✅ |
| 日報集計（その日のうちにあれば良い） | ✅ |
| 株価取得（特定の秒で実行が必要） | ❌ → 別手段検討 |

完全な秒単位の精度が必要なら、Cloud Scheduler + Cloud Functions の方が向いています。

## 平日だけ動かす設定

GASは「平日のみ」をネイティブサポートしてないので、関数内で曜日チェック：

```javascript
function weekdayTask() {
  const day = new Date().getDay();
  // 0=日, 1=月, 2=火, ..., 6=土
  if (day === 0 || day === 6) return; // 土日はスキップ

  // 平日の処理
  console.log('平日タスク実行');
}
```

トリガーは毎日朝8時に設定、関数内で土日早期リターン。

## 活用例10選（私が実際に使っている）

### 1. 毎朝7時：今日の予定をLINE通知
カレンダーから今日の予定を取得→LINE Messaging APIで自分に送信。

### 2. 毎朝8時：株価・為替を家計簿スプシに記録
Yahoo Finance API → スプシに追記。月末グラフが綺麗に出る。

### 3. 毎日19時：ブログの予約記事を自動公開
このサイト `gas-recipe.com` でも稼働中。pubDate を当日に書き換えてGitHubへpush。

### 4. 毎週月曜：先週の業務時間をスプシ集計→レポート
カレンダーから先週の予定を取得→工数集計→レポートメール送信。

### 5. 毎週日曜：週次バックアップ
重要スプシをDriveに `バックアップ_2026-04-19` 形式でコピー。

### 6. 毎月1日：月次レポートPDF発行
売上・支出スプシをPDF化→Driveに保存→Gmailで自分に送信。

### 7. 毎月25日：請求書を顧客に自動送信
スプシテンプレ→PDF生成→Gmail送信。フリーランス必須。

### 8. 毎日12時：在庫しきい値チェック
Amazon SP-API等から在庫取得→閾値以下ならLINE通知。

### 9. 毎時0分：問い合わせメール監視
未対応のお問い合わせがあればSlack通知。

### 10. 毎朝6時：天気予報をLINE通知
OpenWeatherMap → 今日の天気＋傘いるかをLINE。

## トリガー数の上限管理

GASは**1プロジェクトあたりトリガー20件まで**。重複登録すると簡単に到達します。

```javascript
function listAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    console.log(`${t.getHandlerFunction()} - ${t.getEventType()} - ${t.getTriggerSource()}`);
  });
  console.log(`合計: ${triggers.length} 件`);
}

function cleanDuplicates() {
  const seen = new Set();
  ScriptApp.getProjectTriggers().forEach(t => {
    const key = `${t.getHandlerFunction()}-${t.getEventType()}`;
    if (seen.has(key)) {
      ScriptApp.deleteTrigger(t);
      console.log('削除: ' + t.getHandlerFunction());
    } else {
      seen.add(key);
    }
  });
}
```

定期的に `listAllTriggers` を実行して棚卸しを。

## よくあるトラブル

### トリガーが動かない

- ScriptApp.getProjectTriggers() で本当に登録されているか確認
- 「トリガー」ページの「実行履歴」でエラーが出てないか確認
- 連続失敗するとGASが自動的にトリガーを無効化することがある

### Quotaを使い切ってしまう

GASの1日の累積実行時間は無料版で90分まで。トリガー多用すると消費が早い。重い処理は頻度を下げる。

### 別のGoogleアカウントで動いて欲しいのに

トリガーは「設定した人のアカウント」で動きます。共有スプシで「他人にもトリガー動かせる」は基本不可。各自で設定要。

## まとめ

- 時間主導型トリガー = GASを定時に自動実行する仕組み
- GUIでもコードでも設定可能、コード設定の方が再現性◎
- 実行時刻は1時間幅でズレる仕様（精密実行はCloud Scheduler）
- 平日のみは関数内で曜日チェック
- 1プロジェクト20件上限、定期的に棚卸し
- 活用例は無限大、まず1つ動かしてみる

「人が起きてない時間に勝手に動く」のがGASの真骨頂。1個でも自動化が走り始めると、生活時間がじわじわ取り戻せます。

## 関連記事

- [GASトリガー設定完全ガイド（画像付き手順）](/blog/gas-trigger-setup/)
- [GAS6分制限を回避する3パターン完全解説](/blog/gas-trigger-6min-limit/)
- [毎朝ToDoをLINEに届けるGASリマインダー](/blog/gas-line-reminder-daily/)
- [スプシ週次バックアップをGASで自動化](/blog/gas-drive-backup-weekly/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。誇張なし・実務ベースで、今日から使えるレシピをお届けします。
