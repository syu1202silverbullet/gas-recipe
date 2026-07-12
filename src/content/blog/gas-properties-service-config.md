---
title: "GASのPropertiesServiceでAPIキーと設定値を安全に管理する"
description: "GASのPropertiesServiceを使って、APIキーや設定値をコードに直書き（ハードコード）せずに安全に保存・取得する方法を初心者向けに解説。スクリプトプロパティの登録手順や実運用の雛形も紹介します。"
pubDate: "2026-07-17T19:00:00+09:00"
heroImage: "/blog-placeholder-3.jpg"
categorySlug: "gas-basics"
categoryName: "GAS入門"
tagSlugs: ["gas","properties","security"]
tagNames: ["GAS","PropertiesService","設定管理"]
readingTime: 8
keywords: ["GAS PropertiesService","GAS APIキー 管理","GAS 設定値 保存"]
---

凛です。少し前、副業で作った天気通知のGASコードを「こんなの作ったよ」と友人に見せようとして、ふとコードの2行目で手が止まりました。そこには外部APIのキーが `const API_KEY = "abcd1234...";` とまるっと書いてあったんです。もしそのままスクショを送っていたら、キーが丸見えでした。夜勤明けのぼんやりした頭でも「これはマズい」と一瞬で目が覚めたのを覚えています。

その日から、私は設定値やキーをコードに直接書くのをやめました。GASには「環境変数」の代わりになる `PropertiesService` という仕組みがちゃんと用意されていて、これを使えばキーをコードの外に追い出せます。この記事では、当時の私が知りたかった内容を、順を追ってまとめていきます。

# GASのPropertiesServiceでAPIキーと設定値を安全に管理する

コードに直接キーを書かないだけで、共有ミスやうっかり流出のリスクはぐっと下がります。難しい設定はいりません。GASに最初から入っている機能だけで完結します。

## なぜコードへの直書き（ハードコード）が危険なのか

まずは「なぜやめたほうがいいのか」から。ここが腑に落ちないと、ひと手間かける気になれないですよね。私も最初は「自分しか使わないんだからいいでしょ」と思っていました。

### 共有・公開・スクショで簡単に漏れる

キーをコードに直接書くと、そのコードを人に見せる瞬間すべてが漏洩の入り口になります。

- 友人やSNSに「こんなの作った」とコードを見せたとき
- GitHubにコードを公開したとき（うっかりPublicにしていた、というのは本当によくある話です）
- 質問サイトやチャットにコードを貼り付けて相談したとき
- 画面共有やスクショを撮ったとき

私のように「見せる直前で気づく」ならまだ幸運なほうで、たいていは気づかないまま外に出ていきます。APIキーは家の鍵と同じで、他人の手に渡れば勝手に使われ、場合によっては課金や不正利用につながります。

### GASには「環境変数」の代わりがある

一般的なプログラミングでは、キーのような秘密情報は「環境変数」という、コードの外側の置き場所にしまいます。GASにはこの環境変数がありませんが、その代わりになるのが `PropertiesService`（プロパティサービス）です。

キーや設定値をこのプロパティサービスに保存しておけば、コード側には「保存した値を読み込む」という命令だけを書けば済みます。コードを人に見せても、そこにキーの中身は書かれていない、という状態を作れるわけです。

## PropertiesServiceの3つの保存場所

`PropertiesService` には、値をしまう「引き出し」が3種類あります。用途によって使い分けますが、初心者のうちは基本的に一番上の「スクリプトプロパティ」だけ覚えておけば十分です。

### スクリプト・ユーザー・ドキュメントの違い

3つの違いを表にまとめます。

| 取得メソッド | 引き出しの名前 | 共有される範囲 | 主な用途 |
| --- | --- | --- | --- |
| `getScriptProperties()` | スクリプトプロパティ | スクリプト全体（誰が実行しても同じ値） | APIキー、共通の設定値 |
| `getUserProperties()` | ユーザープロパティ | 実行するユーザーごとに別々 | ユーザー個人の設定 |
| `getDocumentProperties()` | ドキュメントプロパティ | 紐付いたスプレッドシート等のファイル単位 | そのファイル固有の設定 |

「APIキーをしまいたい」というよくあるケースなら、迷わず `getScriptProperties()` を使えばOKです。私も普段はほぼこれしか使っていません。

### まずはスクリプトプロパティを使えばOK

なぜスクリプトプロパティが基本なのか。理由はシンプルで、APIキーのような「そのプロジェクト全体で共通して使う値」を置くのにちょうどいいからです。誰が実行しても同じキーを読み込めるので、通知やデータ取得のような自動処理と相性が良いんですね。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

function checkStores() {
  // スクリプトプロパティ（プロジェクト全体で共有される引き出し）を取得
  const scriptProps = PropertiesService.getScriptProperties();

  // ユーザープロパティ（実行する人ごとに別々になる引き出し）を取得
  const userProps = PropertiesService.getUserProperties();

  // ドキュメントプロパティ（紐付いたファイル単位の引き出し）を取得
  // ※スプレッドシート等に紐付いていないスタンドアロンのスクリプトではnullになる点に注意
  const docProps = PropertiesService.getDocumentProperties();

  // それぞれ取得できているかログで確認
  Logger.log(scriptProps); // 取得できていればオブジェクトが表示される
  Logger.log(userProps);
  Logger.log(docProps);
}
```

`getDocumentProperties()` は、スプレッドシートやドキュメントに紐付いていないスクリプトだと `null`（何もない状態）が返ってきます。ここでつまずく人が多いので、頭の片隅に置いておいてください。

## 値の保存と取得の基本メソッド

引き出しを取得したら、あとは「入れる」「取り出す」だけです。使うメソッドはとても直感的なので、一度触れば手になじみます。

### setProperty と getProperty

一番よく使うのがこの2つです。`setProperty` で保存し、`getProperty` で読み出します。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

function saveApiKey() {
  // スクリプトプロパティの引き出しを取得
  const props = PropertiesService.getScriptProperties();

  // 'API_KEY' という名前で値を保存する（第1引数がキー名、第2引数が中身）
  props.setProperty('API_KEY', 'ここに本物のキーを入れる');

  Logger.log('保存が完了しました'); // 完了を確認するためのログ
}

function useApiKey() {
  // スクリプトプロパティの引き出しを取得
  const props = PropertiesService.getScriptProperties();

  // 'API_KEY' という名前で保存した値を取り出す
  const apiKey = props.getProperty('API_KEY');

  // 取り出した値を使う（ここでは中身の確認だけ）
  Logger.log('読み込んだキー: ' + apiKey);
}
```

`saveApiKey` を一度だけ実行してキーをしまったら、以降のコードでは `getProperty('API_KEY')` で読み込むだけ。保存した値はプロジェクトに残り続けるので、`setProperty` を毎回実行する必要はありません。

### getProperties で全件をまとめて取得

保存してある値を一覧で確認したいときは `getProperties()` を使います。すべてのキーと値がひとつのオブジェクト（`{ キー名: 値, ... }` の形）でまとめて返ってきます。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

function showAll() {
  // スクリプトプロパティの引き出しを取得
  const props = PropertiesService.getScriptProperties();

  // 保存されている全てのキーと値をオブジェクトとして取得
  const all = props.getProperties();

  // オブジェクトを丸ごとログに出す
  Logger.log(all); // 例: {API_KEY=xxxx, SHEET_ID=yyyy}

  // ひとつずつ取り出して表示したい場合
  for (const key in all) {
    Logger.log(key + ' = ' + all[key]); // キー名と中身をペアで表示
  }
}
```

### deleteProperty と deleteAllProperties

いらなくなった値を消すためのメソッドもあります。キーを差し替えたいときや、テストで入れた値を掃除したいときに使います。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

function cleanUp() {
  // スクリプトプロパティの引き出しを取得
  const props = PropertiesService.getScriptProperties();

  // 'API_KEY' という名前の値だけをピンポイントで削除
  props.deleteProperty('API_KEY');

  // 引き出しの中身を全部まとめて削除（※取り返しがつかないので慎重に）
  // props.deleteAllProperties();

  Logger.log('削除が完了しました');
}
```

`deleteAllProperties()` は保存した値をすべて消してしまうので、実行する前に本当に消していいか確認してください。私は一度テスト用のつもりで実行し、本番の設定まで消してしまったことがあります。

## 複数のキーをまとめて扱う setProperties

キーがひとつだけならいいのですが、実際には「APIキー」「シートID」「通知先アドレス」のように、複数の設定値を扱うことが多いです。そんなときは1個ずつ `setProperty` を呼ぶより、まとめて保存するほうがすっきりします。

### 一度に複数保存する書き方

`setProperties` に、キーと値をまとめたオブジェクトを渡します。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

function saveMultiple() {
  // スクリプトプロパティの引き出しを取得
  const props = PropertiesService.getScriptProperties();

  // 複数の設定値をオブジェクトの形でまとめて用意
  const config = {
    API_KEY: 'ここにAPIキー',
    SHEET_ID: 'ここにスプレッドシートのID',
    NOTIFY_TO: 'notify@example.com'
  };

  // 第2引数を true にすると「既存の値を全部消してから保存」になる
  props.setProperties(config, true);

  Logger.log('まとめて保存しました');
}
```

### 第2引数 true の意味に注意

`setProperties` の第2引数（`deleteAllOthers`）の扱いには注意が必要です。

| 第2引数の値 | 動作 |
| --- | --- |
| `true` | 渡したオブジェクトにないキーは削除される（引き出しをまるごと入れ替え） |
| `false` または省略 | 既存の値は残したまま、渡したキーだけを追加・上書き |

「今ある値を残しつつ、いくつか追加したい」だけなら `false`（または省略）にします。うっかり `true` にすると、別で保存していた値まで消えてしまうので気をつけてください。

## コードを書かずにキーを登録する方法

ここまではコードで保存する方法を紹介しましたが、実は「そもそもコードにキーを書きたくない」なら、GASエディタの画面から手作業で登録するのが一番安全です。この方法なら、`setProperty('API_KEY', '...')` のコード自体をどこにも書かずに済みます。

### エディタの「プロジェクトの設定」から登録する手順

GASエディタでの手順は次のとおりです。

1. GASエディタの左側メニューにある歯車マーク「プロジェクトの設定」を開きます。
2. 一番下までスクロールすると「スクリプト プロパティ」という項目があります。
3. 「スクリプト プロパティを追加」ボタンを押します。
4. 左側の入力欄に「プロパティ名（キー名。例：`API_KEY`）」、右側の入力欄に「値（本物のキー）」を入力します。
5. 「スクリプト プロパティを保存」ボタンを押して完了です。

これで登録した値は、コード側から `PropertiesService.getScriptProperties().getProperty('API_KEY')` で読み込めます。

### この方法のメリット

画面から登録する方法の一番のメリットは、キーが一度もコードに登場しないことです。

- コードには「読み込む命令」しか書かないので、コードを共有しても中身が漏れません
- キーを差し替えたいときも、コードを直さず画面から値を書き換えるだけで済みます
- チームで使う場合、コードは共有しつつキーは各自で登録する、といった運用もできます

私は今では、外部サービスのキーはすべてこの画面から登録しています。コードがすっきりして見返しやすくなるのも、地味にうれしいポイントです。

## 値を扱うときの注意点と実運用の雛形

最後に、実際に使ってみると引っかかりやすいポイントと、そのまま使える雛形を紹介します。

### 保存できるのは文字列だけ・容量にも上限がある

`PropertiesService` を使ううえで、最初に知っておきたい制約が2つあります。

1つ目は「保存される値はすべて文字列になる」こと。数値の `100` を保存しても、取り出すときには文字列の `"100"` になっています。計算に使いたいときは `Number()` などで数値に戻す必要があります。

2つ目は容量の上限です。目安として、値ひとつあたり約9KB、全体で約500KBまでとされています。大量のデータや長い本文を保存する用途には向いていません。あくまで「設定値やキーをしまう場所」と考えてください。

### オブジェクトを保存したいときは JSON を挟む

「設定をまとめたオブジェクトをそのまま保存したい」と思っても、保存できるのは文字列だけなのでオブジェクトは直接入りません。そこで、`JSON.stringify` で文字列に変換して保存し、取り出すときに `JSON.parse` でオブジェクトに戻します。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

function saveObject() {
  const props = PropertiesService.getScriptProperties();

  // 保存したい設定をオブジェクトで用意
  const settings = { retry: 3, timeout: 30, enabled: true };

  // JSON.stringify で文字列に変換してから保存する
  props.setProperty('SETTINGS', JSON.stringify(settings));

  Logger.log('オブジェクトを保存しました');
}

function loadObject() {
  const props = PropertiesService.getScriptProperties();

  // 文字列として取り出す
  const text = props.getProperty('SETTINGS');

  // JSON.parse でオブジェクトに戻す
  const settings = JSON.parse(text);

  // オブジェクトとして使える
  Logger.log('リトライ回数: ' + settings.retry); // 3 と表示される
}
```

### 失敗と回避策

私が実際にやらかした失敗と、その回避策をまとめておきます。

| 失敗したこと | 原因 | 回避策 |
| --- | --- | --- |
| `getProperty` が `null` を返す | まだ `setProperty` していない、またはキー名のスペルミス | 先に保存を実行する。キー名を大文字小文字までコピペで揃える |
| 保存した数値で計算がおかしい | 値が文字列で返ってくるため文字列連結になっていた | `Number(props.getProperty('COUNT'))` のように数値へ変換する |
| `JSON.parse` でエラーになる | 文字列でないオブジェクトをそのまま保存していた | 保存時に必ず `JSON.stringify` を通す |
| 設定が全部消えた | `setProperties` の第2引数を `true` にしていた | 追加したいだけのときは第2引数を省略する |
| `getDocumentProperties()` が `null` | スプレッドシート等に紐付いていないスクリプトだった | 用途に合わせて `getScriptProperties()` を使う |

キー名のスペルミスは本当に多いです。`API_KEY` と `Api_Key` は別物として扱われるので、保存時と取得時でコピペして揃えるのが確実です。

### 外部APIキーを使う実運用の雛形

最後に、スクリプトプロパティに置いたキーを `UrlFetchApp` で使う雛形です。エディタの「プロジェクトの設定」から `API_KEY` を登録してある前提で、コードにはキーの中身が一切登場しない形になっています。

```javascript
// ※構文・API仕様を確認済み（GAS V8ランタイム向け）

function callExternalApi() {
  // スクリプトプロパティからAPIキーを読み込む（コードにキーを直接書かない）
  const apiKey = PropertiesService.getScriptProperties().getProperty('API_KEY');

  // キーが未登録だった場合に気づけるようにチェックしておく
  if (!apiKey) {
    throw new Error('API_KEY が未登録です。プロジェクトの設定から登録してください');
  }

  // 呼び出したい外部APIのURL（例。実際のAPIに合わせて変更する）
  const url = 'https://api.example.com/data';

  // リクエストのオプション。キーをヘッダーに載せる例
  const options = {
    method: 'get', // GETリクエスト
    headers: {
      'Authorization': 'Bearer ' + apiKey // 読み込んだキーをここで使う
    },
    muteHttpExceptions: true // エラー時も例外で止めず、レスポンスを受け取る
  };

  // 実際にリクエストを送信
  const response = UrlFetchApp.fetch(url, options);

  // ステータスコードと本文を確認
  Logger.log('ステータス: ' + response.getResponseCode()); // 200なら成功
  Logger.log('本文: ' + response.getContentText());
}
```

このように書いておけば、コードを人に見せてもキーは守られます。`if (!apiKey)` のチェックを入れておくと、キーの登録忘れにすぐ気づけて、原因不明のエラーで悩む時間を減らせます。

## まとめ

APIキーや設定値は、コードに直書きせず `PropertiesService` にしまう。これだけで、共有ミスやうっかり流出のリスクは大きく下げられます。

- 迷ったら `getScriptProperties()` を使う
- `setProperty` で保存し、`getProperty` で読み込む
- キーは「プロジェクトの設定」画面から手動登録するのが一番安全
- 値は文字列になるので、オブジェクトは `JSON.stringify` / `JSON.parse` を挟む

私自身、この習慣がついてからは「人に見せるとき、どの行を隠そう」と身構えることがなくなりました。安心してコードを共有できるのは、想像以上に気持ちが軽くなります。ぜひ次に作るスクリプトから取り入れてみてください。

## 自分でも作れるようになりたい方へ

「自分の副業や家事の作業も、GASで自動化してみたい」と思ったら、基礎から順に手を動かすのが一番の近道です。私も看護師をしながら、細切れの時間でここまで来られました。プログラミング未経験からでも、一歩ずつ進めば必ず形になります。

<a href="https://h.accesstrade.net/sp/cc?rk=0100knoa00orcn" rel="nofollow" referrerpolicy="no-referrer-when-downgrade">Dive into Code（未経験からエンジニアを目指すプログラミングスクール）</a><img src="https://h.accesstrade.net/sp/rr?rk=0100knoa00orcn" width="1" height="1" border="0" alt="">

## 関連記事（あわせて読みたい）

- [GASのトリガー設定を初心者向けに解説](/blog/gas-trigger-setup/)：作った処理を決まった時間に自動で動かす、時間主導型トリガーの設定方法をまとめています。
- [GASの認証エラー（承認が必要です）の対処法](/blog/gas-error-authorization/)：初めての実行でつまずきがちな認証エラーの原因と、落ち着いて進めるための手順を解説しています。
- [GAS入門・5分ではじめる最初の一歩](/blog/gas-beginner-5min/)：GASってそもそも何？というところから、最初のスクリプトを動かすまでを5分で体験できます。

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。

※掲載コードは構文とAPI仕様を確認して載せていますが、お使いの環境に合わせて調整してください。
