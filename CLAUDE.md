# CLAUDE.md

このファイルは Claude Code が毎セッション最初に読む。プロジェクトの前提・規約・よくある落とし穴をここに集約する。
（クラウド版 Claude Code はセッションごとに環境が作り直されるため、覚えておいてほしいことは「ローカルや ~/.claude ではなく、このリポジトリにコミットされた CLAUDE.md」に書く必要がある）

## このプロジェクトは何か

- **GAS Recipe** — Google Apps Script（GAS）で日常業務を自動化するレシピを紹介する日本語ブログサイト（https://gas-recipe.com ）
- Astro 製の静的サイトで、Cloudflare Workers にデプロイしている
- 記事は「非エンジニアでもコピペで動かせる」「実際に稼働しているコード」を軸にする
- 運営者ペルソナは **凛（りん）**：本業=看護師 / 副業=Webエンジニア。記事は基本この一人称・トーンで書く（実体験ベース、誇大表現NG、アフィリエイト記事は冒頭で開示）

## 運営者・コミュニケーションの前提（全プロジェクト共通）

- 運営者（PM）はブログ上のペンネーム「凛」。本業は看護師で **非エンジニア**。専門用語はなるべく避け、**平易な日本語**で説明する。技術的な選択肢を出すときは噛み砕いて伝える
- 運営者が気づいていないリスク（セキュリティ・規約・コスト・データ消失など）は、こちらから先に指摘する
- ルール違反・破壊的操作になりそうなときは、実行前に必ず止めて確認する

## 秘密情報の扱い（全プロジェクト共通）

- APIキー・パスワード・トークン・個人情報をソースコードやリポジトリにコミットしない。必要なら環境変数 / Cloudflare の Secrets に入れる
- GAS サンプルコード内のトークン等はプレースホルダ（`'あなたのチャネルアクセストークン'` 等）にして実値を書かない

## 技術スタック

- Astro 5 + `@astrojs/mdx` + `@astrojs/sitemap`
- アダプタ: `@astrojs/cloudflare`（`platformProxy` 有効）
- デプロイ: Cloudflare Workers（`wrangler`、`wrangler.json` で設定。`main` は `./dist/_worker.js/index.js`、静的アセットは `./dist`）
- Node.js >= 22、TypeScript（`astro/tsconfigs/strict` + `strictNullChecks`）
- 自動デプロイ: `.github/workflows/daily-publish.yml`（毎日 10:00 UTC の cron と手動実行。`npm ci` → `npx astro build` → `npx wrangler deploy`。`CLOUDFLARE_API_TOKEN` シークレットを使用）

## コマンド

```bash
npm install            # 依存インストール
npm run dev            # ローカル開発サーバ（localhost:4321）
npm run build          # 本番ビルド → ./dist/
npm run preview        # ビルドして wrangler dev でプレビュー
npm run check          # astro build && tsc && wrangler deploy --dry-run（CI相当のチェック）
npm run deploy         # wrangler deploy（本番デプロイ。手動でやる前に必ず確認を取る）
npm run cf-typegen     # wrangler types（worker-configuration.d.ts 再生成）
```

変更を入れたら最低限 `npm run build`、できれば `npm run check` が通ることを確認する。

## ディレクトリ構成

- `src/content/blog/*.md` — ブログ記事（現在 70本以上）。スキーマは `src/content.config.ts` で定義
- `src/pages/` — ルーティング。`blog/[...slug].astro`（記事）、`category/[slug].astro`、`tag/[slug].astro`、`og/[slug].svg.ts`（OG画像生成）、`rss.xml.js`、その他固定ページ（about, faq, guide, errors, usecase, services, contact, privacy, products, search, lp/gas-starter）
- `src/layouts/BlogPost.astro` — 記事レイアウト
- `src/components/` — Header / Footer / AuthorCard / BaseHead / AffiliateCTA / NewsletterSignup など
- `src/consts.ts` — サイトタイトル・説明
- `src/styles/global.css` — グローバルCSS
- `public/` — 静的アセット（avatar.png, ads.txt, robots.txt, blog-placeholder-*.jpg, fonts/, og-default.svg）

## 記事（Markdown）の規約

frontmatter スキーマ（`src/content.config.ts`）：

```yaml
title: string            # 必須
description: string       # 必須
pubDate: date            # 必須（ISO8601、例 "2026-05-16T19:00:00+09:00"）
updatedDate: date        # 任意
heroImage: string        # 任意（例 "/blog-placeholder-1.jpg"）
categorySlug: string     # 任意（例 "gas-basics", "line"）
categoryName: string     # 任意（例 "GAS入門", "LINE連携"）
tagSlugs: string[]       # 任意
tagNames: string[]       # 任意
readingTime: number      # 任意（分）
keywords: string[]       # 任意
```

- 新規記事はこのスキーマに沿うこと（必須項目を欠かさない）。`categorySlug`/`tagSlugs` は既存記事の値に合わせる（カテゴリ/タグページが slug 単位で生成される）
- 本文は H2（`##`）始まりが基本。導入 → 全体像/処理フロー → 実装 → よくある失敗 → まとめ、の構成が多い
- ペルソナ「凛」の一人称・看護師×副業エンジニアの実体験トーンを保つ
- `gas-test-scheduled-*.md` は動作確認用の記事

## GAS コード（記事内サンプル）の規約 — 重要

記事に載せる GAS コードは **そのまま貼って動く完全なコード** であること。過去に出たバグ修正＝今後やりがちな落とし穴：

- `GmailThread.reply()` は存在しない。返信は `GmailMessage.reply()` を使う
- スプレッドシートの「時刻」セルは `getValue()` で **Date オブジェクト** が返ることがある。時/分は `getHours()` / `getMinutes()` で取り出す（文字列前提で書かない）
- 状態を持つ処理（`chunkedRun()` のような分割実行）は `PropertiesService`（`getScriptProperties()` 等）で進捗を永続化する。未定義のグローバル変数に依存しない
- 外部 HTTP（LINE Messaging API 等）の `UrlFetchApp.fetch()` には `muteHttpExceptions: true` を付け、ステータスコードを見てエラーハンドリングする
- 6分/実行時間制限、トリガー、認可スコープ、API クォータ等の GAS 固有の制約に注意（`gas-trigger-6min-limit.md` 等の既存記事を参照）

## Git / デプロイ運用

- 作業ブランチが指定されている場合はそのブランチで開発・コミット・プッシュする。指定がなければ確認する
- 本番デプロイ（`npm run deploy` / `wrangler deploy`）や PR 作成など、影響範囲の大きい操作はユーザーの明示的な指示・確認を得てから行う
- コミットメッセージは既存の慣習に合わせる（`feat:` / `fix:` / `feat(scope):` プレフィックス、日本語可）

## セッション引継ぎ（容量逼迫・圧縮時の自動サマリー）

PM が指示しなくても、以下のいずれかを検知したら **自発的に引継ぎサマリーを 1 度だけ生成して出力する**：

- 会話圧縮（compaction）のシステムリマインダーを検知した
- トークン残量警告系のシステムメッセージを受信した
- PM が「そろそろ」「満杯」「リセット」「引継ぎ」「サマリー」「容量」のいずれかを言った

サマリーは次の構成で出す：

```
## セッション引き継ぎ（YYYY-MM-DD HH:MM）
### 現在取り組んでいるタスク
### 完了済み
### 次にやること
### 重要な決定事項
### 関連ファイル・パス
### 引き継ぎメモ（PMの特性・進行中の運用・注意点）
```

出力末尾に必ず添える：
> **このサマリーをコピーして、新しいセッションの最初に貼り付けて再開してください。**

同一セッション内で繰り返さない。PM が「OK」「続けて」「続行」と返したら、サマリーを保持したまま元のタスクを継続する。

## メモ

- `worker-configuration.d.ts` は自動生成物（大きい）。手で編集しない（`npm run cf-typegen` で再生成）
- `astro.config.mjs` の `site` は `https://gas-recipe.com`（sitemap / canonical / RSS / OG に影響）
