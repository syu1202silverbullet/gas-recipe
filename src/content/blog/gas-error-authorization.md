---
title: "承認エラーを解決するGASアクセス設定手順｜OAuth スコープと権限の完全ガイド"
description: "GASのよくある承認エラー（Authorization is required等）の解決手順を、看護師×副業Webエンジニアの凛が画面付き解説。スコープ追加・権限再承認・appsscript.json編集まで完全ガイド。"
pubDate: "2026-06-08T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","oauth","authorization","permissions","error"]
tagNames: ["GAS","認証","承認","権限","エラー"]
readingTime: 7
keywords: ["GAS 承認 エラー","GAS Authorization is required","GAS OAuth","GAS 権限"]
---

こんにちは、凛です。GASを書いていて初学者が最初にハマるのが**承認エラー**。「Authorization is required」と言われて手が止まる経験、私も何度もしました。今日は承認エラーの仕組みと解決手順を完全ガイドします。

## こんな悩みありませんか？

- 「`Authorization is required to perform that action` が消えない」
- 「権限を許可したのに、別のサービスでまた聞かれる」
- 「`insufficient authentication scopes` って何？」
- 「他人のGASスクリプトを実行したら警告がたくさん出た」

## GAS承認の仕組み

GASは**OAuthスコープ**という概念で、「このスクリプトは何のサービスにアクセスして良いか」を管理します。

```
スクリプトが SpreadsheetApp.openById(...) を呼ぶ
  ↓
GASは「スプレッドシートアクセス権限」を要求
  ↓
ユーザーが「許可」をクリック
  ↓
そのスクリプトは以降スプレッドシートを触れる
```

## 主要エラーと解決手順

### エラー1: `Authorization is required to perform that action`

**原因**: 初回実行時、スクリプトが必要とする権限が未承認。

**解決手順**：
1. GASエディタで対象関数を選択
2. 「**▶ 実行**」ボタンを手動クリック
3. 承認ダイアログが出る → 「**詳細**」 → 「**安全でないページに移動**」
4. アクセス権限を確認 → 「**許可**」

「安全でないページ」と出るのは、自分で作ったスクリプトはGoogleの審査を受けてないから。自分のなら問題なし。

### エラー2: `insufficient authentication scopes`

**原因**: スクリプトが要求するスコープが、appsscript.json に明示されていない。

**解決手順**：
1. GASエディタ → プロジェクトの設定（歯車）→ 「`appsscript.json`マニフェスト ファイルをエディタで表示する」をON
2. ファイル一覧に `appsscript.json` が出る → 開く
3. 必要なスコープを追加：

```json
{
  "timeZone": "Asia/Tokyo",
  "exceptionLogging": "STACKDRIVER",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

### エラー3: `You do not have permission to access the requested document`

**原因**: 対象スプシ・Driveファイルに、自分のGoogleアカウントがアクセス権を持っていない。

**解決手順**：
1. ファイルのオーナーから「閲覧者」または「編集者」として共有してもらう
2. GASを「次のユーザーとして実行: 自分」で動かす

### エラー4: 別アカウントから実行したら拒否される

**原因**: GASのトリガーは「設定した人のアカウント」で動く。共有スプシでも、トリガーは設定者のものになる。

**解決手順**：
- 各ユーザーが自分でトリガーを設定する
- もしくは「次のユーザーとして実行: アクセスしているユーザー」（Webアプリ時）

## スコープ早見表

| やること | 必要スコープ |
|---|---|
| スプレッドシート操作 | `auth/spreadsheets` |
| Gmail送信 | `auth/gmail.send` |
| Gmail読み取り | `auth/gmail.readonly` |
| カレンダー操作 | `auth/calendar` |
| Drive操作 | `auth/drive` |
| 外部API呼び出し | `auth/script.external_request` |
| トリガー作成 | `auth/script.scriptapp` |
| ユーザーメール取得 | `auth/userinfo.email` |

## 権限を一度リセットしたい時

1. https://myaccount.google.com/permissions にアクセス
2. 該当GASスクリプト名を探す
3. 「**アクセス権を削除**」
4. 次回スクリプト実行時に再度承認ダイアログが出る

スコープ変更後にこのリセットをすると、新しいスコープで承認ダイアログが出てくれます。

## ⚠️ 他人のGASスクリプトを動かす時の注意

「便利らしいから」と他人のGASスクリプトをコピペして実行する時、要求される権限を**必ず確認**してください。

- 「Gmail読み取り」 → メール内容を全部読まれる
- 「Drive編集」 → ファイル削除も可能
- 「外部API呼び出し」 → どこかにデータ送信される可能性

信頼できないソースのGASは絶対に実行しないこと。

## まとめ

- 初回エラーは手動実行→承認ダイアログで解決
- スコープ不足は appsscript.json 編集で追加
- ファイルアクセス拒否は共有設定確認
- スコープ変更後は権限リセットで再承認
- 他人のGAS実行は要求権限を必ず確認

承認エラーは怖がる必要なし、メカニズムを理解すれば全パターン解決できます。

## 関連記事

- [GASよく出るエラー10選と解決コード集](/blog/gas-error-exception/)
- [GAS Webアプリ公開最短5ステップ](/blog/gas-webapp-deploy/)
- [GASライブラリの追加方法と人気10選2026](/blog/gas-library-add/)

---

### この記事を書いた人：凛

東京で看護師をしながら、副業でWebエンジニアをしている凛です。病棟の事務仕事を一つずつGASで自動化してきた経験をもとに、「非エンジニアでも読める実務目線のGAS解説」をモットーに発信しています。
