---
title: "承認エラーを解決するGASアクセス設定手順｜OAuth スコープと権限の完全ガイド"
description: "GASのよくある承認エラー（Authorization is required等）の解決手順を解説。スコープ追加・権限再承認・appsscript.json編集まで、4つの承認エラーパターンと解決策を完全まとめしました。"
pubDate: "2026-06-08T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","oauth","authorization","permissions","error"]
tagNames: ["GAS","認証","承認","権限","エラー"]
readingTime: 8
keywords: ["GAS 承認 エラー","GAS Authorization is required","GAS OAuth","GAS 権限"]
---

こんにちは、独学でGASを覚えた現役看護師の凛です。書いたコードを初めて実行した瞬間に出てくる「Authorization is required」の赤い文字に、固まってしまった経験はありませんか。私も副業を始めたばかりの頃、このエラーが消えずに30分以上悩みました。仕組みさえ分かれば怖くないので、つまずきやすいパターンをまるごと整理してみます。

# 承認エラーを解決するGASアクセス設定手順｜OAuth スコープと権限の完全ガイド

## こんな悩みありませんか？

- 「`Authorization is required to perform that action` というエラーが消えない」
- 「権限を許可したのに、別のサービスを使ったらまたエラーが出る」
- 「`insufficient authentication scopes` って何のことか分からない」
- 「他人のGASスクリプトをコピーして実行したら警告がたくさん出て怖い」
- 「以前は動いていたスクリプトが急に承認エラーになった」

GASを書いていて初学者が最初にハマるのが **承認エラー** です。私も副業初期に「Authorization is required」が消えずに30分以上悩んだ経験があります。仕組みを理解すれば全パターン解決できます。

---

## GAS承認の仕組み：OAuthスコープとは

GASは **OAuthスコープ** という概念で「このスクリプトは何のサービスにアクセスして良いか」を管理します。

| スコープの例 | 許可される操作 |
|------------|--------------|
| `auth/spreadsheets` | スプレッドシートの読み書き |
| `auth/gmail.send` | Gmailでメールを送信する |
| `auth/gmail.readonly` | Gmailのメールを読み取る |
| `auth/calendar` | Googleカレンダーの操作 |
| `auth/drive` | Google Driveの操作 |
| `auth/script.external_request` | 外部URL（UrlFetchApp）への接続 |

スクリプトが `SpreadsheetApp.openById(...)` を呼ぶと、GASは「スプレッドシートアクセス権限が必要」と判断してユーザーに承認を求めます。この仕組みを知っておくと、エラーの原因がすぐに分かるようになります。

---

## 4つの承認エラーパターンと解決手順

### エラー1：「Authorization is required to perform that action」

最も頻繁に出るエラーです。初回実行時、スクリプトが必要とする権限がまだ承認されていない状態で発生します。

**解決手順：**

1. GASエディタ画面で、実行する関数をドロップダウンから選択する
2. 「**▶ 実行**」ボタンを手動でクリックする
3. 「このアプリは確認されていません」ダイアログが出る
4. 「**詳細**」リンクをクリックする
5. 「**（スクリプト名）に移動**」をクリックする
6. 要求される権限の一覧を確認する
7. 「**許可**」ボタンをクリックする

「安全でないページ」「確認されていません」と表示されるのは、自分で作ったスクリプトはGoogleの公式審査を受けていないためです。**自分が書いたスクリプトなら問題なし**。「詳細 > 移動」から許可してください。

---

### エラー2：「insufficient authentication scopes」

**原因**：スクリプトが実行時に必要とするスコープが、初回承認時のスコープ一覧に含まれていなかった。コードを追加してから新しいサービスを使った場合に出ます。

**解決手順：**

1. GASエディタの左メニューから「**プロジェクトの設定（歯車マーク）**」をクリック
2. 「`appsscript.json` マニフェスト ファイルをエディタで表示する」をONにする
3. ファイル一覧に `appsscript.json` が表示されたら開く
4. `oauthScopes` に必要なスコープを追加して保存する

```json
{
  "timeZone": "Asia/Tokyo",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

5. 保存後、一度権限をリセットする（後述の「権限リセット手順」参照）
6. 再度スクリプトを実行して承認ダイアログで再承認する

---

### エラー3：「You do not have permission to access the requested document」

**原因**：操作しようとしているスプレッドシートやDriveファイルに、スクリプトを実行しているGoogleアカウントが共有されていない。

**解決手順：**

1. 操作したいファイルのオーナーに「**閲覧者**」または「**編集者**」として共有してもらう
2. GASの「次のユーザーとして実行」が「自分」になっているか確認する
3. ファイルIDが正しいか再確認する（`openById` に渡しているIDが合っているか）

---

### エラー4：別のGoogleアカウントからトリガーを実行したら動かない

**原因**：GASのトリガーは「設定した人のアカウント」で動きます。共有スプレッドシートでも、トリガーは設定者のものとして実行されます。他のユーザーが使うと「設定者のアカウントでは権限がある → 実行ユーザーには権限がない」という不一致が起きます。

**解決手順（選択肢）：**

- 方法A：各ユーザーが自分でトリガーを設定する
- 方法B：Webアプリとして公開し、「次のユーザーとして実行：アクセスしているユーザー」を選択する

---

## スコープ早見表

よく使うスコープをまとめました。`appsscript.json` に追加する際に参照してください。

| やること | 必要なスコープ |
|---------|-------------|
| スプレッドシートの読み書き | `auth/spreadsheets` |
| Gmailでメールを送信する | `auth/gmail.send` |
| Gmailのメールを読み取る | `auth/gmail.readonly` |
| Gmailの全操作 | `auth/gmail.modify` |
| Googleカレンダーの操作 | `auth/calendar` |
| Google Driveの操作 | `auth/drive` |
| 外部URL（UrlFetchApp）への接続 | `auth/script.external_request` |
| トリガーの作成・削除 | `auth/script.scriptapp` |
| 実行ユーザーのメールアドレス取得 | `auth/userinfo.email` |
| Google Sheets API（高度な操作） | `auth/spreadsheets` ＋ Sheets APIサービスを追加 |

---

## 権限をリセットして再承認する手順

スコープを変更した後や「承認し直したい」ときに使います。

1. ブラウザで [https://myaccount.google.com/permissions](https://myaccount.google.com/permissions) にアクセスする
2. ページ内のアプリ一覧から対象のGASスクリプト名を探す
3. 「**アクセス権を削除**」をクリックする
4. GASエディタに戻り、スクリプトを手動実行する
5. 新しいスコープを含めた承認ダイアログが出てくるので「許可」をクリックする

---

## 私（凛）が試して気づいたコツ3つ

### コツ1：スコープを追加したら「権限リセット→再承認」がセット

`appsscript.json` にスコープを追加しただけでは、すでに承認済みの旧スコープが使われ続けます。新しいスコープを有効にするには、一度 [myaccount.google.com/permissions](https://myaccount.google.com/permissions) でアクセス権を削除して再承認が必要です。私は最初にこの手順を知らず「スコープ追加したのにまだエラーが出る」で1時間悩みました。

### コツ2：コードに新しいサービスを追加したら手動実行で確認する

トリガーで自動実行するスクリプトに新しいサービスを追加した場合、トリガーは承認なしで動くため新しい権限が使えません。新機能を追加したら必ず一度手動実行して承認ダイアログを出してから、トリガーによる自動実行に移行します。副業クライアント向けに動かしているスクリプトが「機能追加後に止まった」のはほぼこのパターンでした。

### コツ3：他人のGASは要求スコープを必ず確認してから許可する

「便利そう」と他人のGASスクリプトをコピーして実行するとき、承認ダイアログに表示される権限一覧を必ず確認してください。「Gmail読み取り」を許可するとメールの全内容を読まれる可能性があります。「Drive編集」ならファイルの削除も可能です。信頼できるソース（公式サイト・著名な技術ブログ）以外のGASは慎重に扱ってください。

---

## つまずきやすいポイント

### エラー：「このアプリはGoogleによって確認されていません」から先に進めない

**原因**：「詳細」リンクが見当たらないか、見落としている。

**解決策**：
ダイアログの右下に小さく「詳細」リンクがあります。見つからない場合はウィンドウを少し小さくしてスクロールすると見えることがあります。「詳細」をクリックすると「（スクリプト名）に移動（安全でないページ）」というリンクが出てくるので、それをクリックして許可画面に進みます。

### エラー：Webアプリとして公開したら「Forbidden」が返ってくる

**原因**：Webアプリの「アクセスできるユーザー」が「自分のみ」になっている。外部サービス（LINE・Stripe等）からのPOSTは匿名扱いなので弾かれます。

**解決策**：
「デプロイを管理 > 編集 > アクセスできるユーザー：全員」に変更して新しいバージョンでデプロイし直す。

### 新しいスコープが有効にならない（appsscript.json に追記したのに）

**原因**：既存の承認情報が古いスコープのままキャッシュされている。

**解決策**：
[myaccount.google.com/permissions](https://myaccount.google.com/permissions) でアクセス権を削除して、GASエディタから再実行して新しいスコープで再承認する。

---

## まとめ

| エラーの種類 | 原因 | 解決策 |
|------------|------|-------|
| Authorization is required | 初回の承認が未完了 | 手動実行→許可ダイアログで承認 |
| insufficient authentication scopes | 必要なスコープが未追加 | appsscript.json にスコープを追加→再承認 |
| permission to access the document | ファイルへのアクセス権がない | ファイルオーナーに共有してもらう |
| 別アカウントからのトリガーが動かない | トリガーは設定者アカウントで動く | 各ユーザーが自分でトリガーを設定 |

ポイントをまとめると：

- 「Authorization is required」は初回の手動実行→許可で解決
- スコープ不足は `appsscript.json` にスコープを追記→権限リセット→再承認
- ファイルアクセス拒否はファイルの共有設定を確認
- 他人のGASは要求権限を必ず確認してから実行する

承認エラーは怖がる必要はありません。仕組みを理解すれば全パターン自分で解決できます。

---

## 関連記事

- [GASでよく出るエラー10選と解決策まとめ](/blog/gas-error-exception/)
- [GASのWebアプリを公開する最短5ステップ](/blog/gas-webapp-deploy/)
- [GASのトリガー6分制限を回避する分割処理テクニック](/blog/gas-trigger-6min-limit/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

---
*本記事のコードは静的検証済みです。*
