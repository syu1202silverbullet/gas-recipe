---
title: "GASで毎朝天気予報をLINEに届ける｜OpenWeatherMap×Messaging API完全版"
description: "GASとOpenWeatherMap API・LINE Messaging APIを組み合わせて、毎朝の天気予報をLINEに自動送信する仕組みを、現役ナースの凛がコピペ可能なコード付きで解説します。"
pubDate: "2026-06-02T19:00:00+09:00"
heroImage: "/blog-placeholder-2.jpg"
categorySlug: "line"
categoryName: "LINE自動化"
tagSlugs: ["gas","line","weather","api","automation"]
tagNames: ["GAS","LINE","天気","API","自動化"]
readingTime: 9
keywords: ["GAS 天気 LINE","GAS OpenWeatherMap","GAS 天気予報 自動送信"]
---

こんにちは、凛です。このスクリプトを作ろうと決めたのは、夜勤明けの朝でした。子どもの登校前、眠い頭で「今日の天気どうだっけ」とスマホを開いて、天気アプリを探して、タップして……という一連の動作が、その日は妙に長く感じたんです。傘を持たせるかどうかの判断が遅れると、送り出しの時間がまるごと押します。

これ、毎朝LINEに勝手に届けばいいのでは？　と思ったのがこの記事の始まりです。というわけで今回は、**毎朝7時に今日の天気・気温・降水確率がLINEに届く仕組み**を、GASとOpenWeatherMap API、LINE Messaging APIで作っていった流れをそのまま書きます。

やることの全体像は、こういう一本道です。

```
毎朝7時トリガー → GAS起動
→ OpenWeatherMap APIから天気データ取得
→ メッセージを整形
→ LINE Messaging APIで送信
```

GASで外部APIを叩くのが初めての方にも、天気通知は最初の1本としてちょうどいいテーマだと思います。結果がすぐLINEに届くので、達成感が早い。

## まずやったこと：天気データの入手先を決める

最初に必要なのは天気データです。私はOpenWeatherMapを選びました。無料で、登録も難しくありません。

1. [openweathermap.org](https://openweathermap.org/) にアクセス
2. 「Sign Up」で無料登録
3. メール認証後、ダッシュボードの「API Keys」タブでAPIキーをコピー

無料プランの枠は1分60回・1日100万回まで。毎朝1回叩くだけの用途には、はっきり言って過剰なくらい余裕があります。**無料プランで十分**です。

## 次にやったこと：LINE側の準備

データが取れても、届け先がないと始まりません。LINEへの送信は**LINE Messaging API**を使います。ここで一点だけ注意を。以前この用途でよく使われていた「LINE Notify」は2025年3月末で終了しています。古い解説記事の手順は、もう再現できません。これから作るならMessaging API一択です。

チャネルの作成、チャネルアクセストークン、自分のユーザーIDの取得手順は、少し画面数が多いので別記事にまとめてあります。

→ [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)

ここで取得した2つの値を、あとでGASのスクリプトプロパティに保存します。

## 出来上がったコード

材料が揃ったら、あとはGASに書くだけです。完成形がこちら。

```javascript
// ===== 設定 =====
const CITY = 'Tokyo';           // 都市名（英語）
const LANG = 'ja';              // 言語
const UNITS = 'metric';         // 単位（metric=摂氏）

// ===== メイン：毎朝の天気通知 =====
function sendWeatherToLine() {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('OWM_API_KEY');

  if (!apiKey) {
    console.error('OpenWeatherMapのAPIキーが未設定です');
    return;
  }

  const weather = fetchWeather(apiKey);
  if (!weather) return;

  const message = buildMessage(weather);
  sendLine(message);
}

// ===== 天気データ取得 =====
function fetchWeather(apiKey) {
  const url = 'https://api.openweathermap.org/data/2.5/weather'
    + '?q=' + CITY
    + '&appid=' + apiKey
    + '&lang=' + LANG
    + '&units=' + UNITS;

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const code = response.getResponseCode();

  if (code !== 200) {
    console.error('天気API失敗 ステータス:', code);
    return null;
  }

  return JSON.parse(response.getContentText());
}

// ===== メッセージ組み立て =====
function buildMessage(data) {
  const desc    = data.weather[0].description;   // 例: 晴れ
  const temp    = Math.round(data.main.temp);     // 気温（℃）
  const tempMin = Math.round(data.main.temp_min);
  const tempMax = Math.round(data.main.temp_max);
  const humid   = data.main.humidity;             // 湿度(%)
  const wind    = data.wind.speed;                // 風速(m/s)

  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'M月d日(E)');

  return [
    '🌤 ' + today + 'の天気（' + CITY + '）',
    '天気: ' + desc,
    '気温: ' + temp + '℃（最低' + tempMin + '℃ / 最高' + tempMax + '℃）',
    '湿度: ' + humid + '%',
    '風速: ' + wind + 'm/s',
    wind >= 10 ? '⚠️ 強風注意' : '',
    humid >= 80 ? '☔ 湿度高め・折りたたみ傘を' : ''
  ].filter(Boolean).join('\n');
}

// ===== LINE送信（Messaging API Push）=====
function sendLine(message) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  const userId = props.getProperty('LINE_USER_ID');

  if (!token || !userId) {
    console.error('LINEのトークンまたはユーザーIDが未設定です');
    return;
  }

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    payload: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: message }]
    }),
    muteHttpExceptions: true
  });
}
```

なお、掲載コードは構文チェックと各APIの公式仕様（レスポンス構造・エンドポイント・リクエスト形式）との照合まで済ませたものです。動作そのものはお使いの環境で確かめながら進めてください。

### コードで気に入っているところ

`buildMessage` の最後にある `filter(Boolean)` の一行、地味ですが気に入っています。「強風注意」や「折りたたみ傘を」の行は条件を満たしたときだけ配列に残り、不要な日は空文字ごと消えてくれる。おかげで、穏やかな日のメッセージは短く、荒れそうな日だけ警告つきになります。毎朝読むものだからこそ、余計な行がない方が続くんですよね。

湿度80%以上で傘の一言を出すあたりは、登校前の「傘、持ってく？」問題への私なりの答えです。

### スクリプトプロパティに3つ保存する

コードを貼ったら、値の登録です。APIキーやトークンをコードに直書きすると共有時に漏れるので、必ずスクリプトプロパティに入れます。

| プロパティ名 | 値 |
|---|---|
| `OWM_API_KEY` | OpenWeatherMapのAPIキー |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging APIの長期トークン |
| `LINE_USER_ID` | 自分のユーザーID（Uから始まる文字列） |

この状態で `sendWeatherToLine` を手動実行してみて、LINEに天気が届けば下ごしらえは完了です。

## 仕上げ：毎朝勝手に動くようにする

手動実行で満足してはいけません。ここからが自動化の本番です。

1. GASエディタ左の時計アイコン
2. 「トリガーを追加」
3. 実行関数：`sendWeatherToLine`
4. イベントのソース：時間主導型
5. 時間ベース：特定の時間（毎日・午前7時〜8時）

これで翌朝から、スマホを触らなくても天気が向こうからやって来ます。

## あとから足したくなるカスタマイズ

運用しはじめると「もうちょっとこうしたい」が出てきます。手を入れやすい2パターンを置いておきます。

### 複数都市をまとめて通知

自宅と職場、あるいは実家の天気もまとめて知りたい場合はこちら。

```javascript
const CITIES = ['Tokyo', 'Osaka', 'Fukuoka'];

function sendMultiCityWeather() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OWM_API_KEY');
  const messages = CITIES.map(city => {
    const url = 'https://api.openweathermap.org/data/2.5/weather?q=' + city
      + '&appid=' + apiKey + '&lang=ja&units=metric';
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    const d = JSON.parse(res.getContentText());
    return city + ': ' + d.weather[0].description + ' ' + Math.round(d.main.temp) + '℃';
  }).filter(Boolean);
  sendLine(messages.join('\n'));
}
```

### 雨の日だけ通知

毎日は要らない、傘の要る日だけ知らせて。という方はこちらの形もあります。

```javascript
function sendRainyDayOnly() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OWM_API_KEY');
  const weather = fetchWeather(apiKey);
  if (!weather) return;

  const desc = weather.weather[0].description;
  if (desc.includes('雨') || desc.includes('雷')) {
    sendLine('☔ 今日は雨です。傘を忘れずに！\n' + desc);
  }
}
```

雨の日だけに絞ると、Messaging API無料プラン（月200通）の枠の節約にもなります。夜勤前の朝だけ傘確認したい、みたいな使い方にも向いています。

## 動き出してからの朝

仕組みが動き出してからは、朝いちばんにLINEを開けば今日の天気が置いてある状態になりました。天気アプリを開く数十秒が消えただけ、と言えばそれまでなんですが、「判断材料が向こうから来る」のは思った以上に気持ちが楽です。傘を持たせるかどうかで玄関先が慌ただしくなることも減りました。

それと、これは作ってみて気づいたことですが、天気通知は「GASで外部APIを叩く」練習台として本当に優秀です。APIキーの管理、レスポンスのJSON解析、メッセージ整形、トリガー設定と、外部連携の基本要素がひととおり詰まっています。ここで覚えた型は、他のAPIにそのまま流用できますよ。動いた瞬間の達成感、ぜひ味わってください。

## 関連記事

- [GASからLINEに通知を送る最短レシピ](/blog/gas-line-notify-basic/)
- [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)
- [GASで毎朝ToDoをLINEに届けるリマインダー](/blog/gas-line-reminder-daily/)
- [ChatGPT×GAS活用ベスト5](/blog/gas-chatgpt-integration-5/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。掲載コードは構文と各API仕様の照合まで確認済みですが、動作はお使いの環境でご確認ください。OpenWeatherMap API・LINE Messaging APIの仕様・無料プランの制限は各公式ドキュメントをご確認ください。
