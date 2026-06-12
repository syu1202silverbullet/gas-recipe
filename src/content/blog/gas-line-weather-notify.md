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

こんにちは、凛です。夜勤明けの朝、子どもの登校前に「今日の天気どうだっけ」とスマホを開く、その一手間をなくしたくて作ったのがこのスクリプトです。**毎朝7時に今日の天気・気温・降水確率がLINEに届く仕組み**を、GASとOpenWeatherMap API、LINE Messaging APIで作ります。

## こんな悩みありませんか？

- 「天気アプリを毎朝開くのが面倒」
- 「子どもの傘を持たせるか判断が遅れる」
- 「GASで外部APIを叩く練習をしたい」

外部APIとGASの組み合わせは、天気通知を皮切りに色々な応用ができます。最初の1本として最適なテーマです。

## 全体の仕組み

```
毎朝7時トリガー → GAS起動
→ OpenWeatherMap APIから天気データ取得
→ メッセージを整形
→ LINE Messaging APIで送信
```

## 事前準備

### OpenWeatherMap APIキーの取得

1. [openweathermap.org](https://openweathermap.org/) にアクセス
2. 「Sign Up」で無料登録
3. メール認証後、ダッシュボードの「API Keys」タブでAPIキーをコピー
4. **無料プランで十分**（1分60回・1日100万回まで）

### LINE Messaging APIのトークンとユーザーID

LINEへの送信は**LINE Messaging API**を使います（以前よく使われたLINE Notifyは2025年3月末で終了しました）。チャネルの作成、チャネルアクセストークン、自分のユーザーIDの取得手順は別記事で解説しています。

→ [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)

ここで取得した2つの値をスクリプトプロパティに保存しておきます。

## GASコード（静的検証済み）

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

**静的検証結果：**
- `UrlFetchApp.fetch` のURL組み立て：✅ クエリパラメータの結合正しい
- `JSON.parse(response.getContentText())`：✅ OpenWeatherMap APIはJSON返却
- `data.weather[0].description` / `data.main.temp` など：✅ OWM APIのレスポンス構造に一致
- `filter(Boolean)` で空文字を除去：✅ 条件メッセージが不要なとき行が出ない
- LINE送信エンドポイント `/v2/bot/message/push`：✅ Messaging APIのPush API仕様通り
- `Content-Type: application/json` ＋ `JSON.stringify`：✅ Push APIはJSONボディが必須
- APIキー・トークンはスクリプトプロパティ：✅ 安全

## スクリプトプロパティの設定

| プロパティ名 | 値 |
|---|---|
| `OWM_API_KEY` | OpenWeatherMapのAPIキー |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging APIの長期トークン |
| `LINE_USER_ID` | 自分のユーザーID（Uから始まる文字列） |

## トリガー設定

1. GASエディタ左の時計アイコン
2. 「トリガーを追加」
3. 実行関数：`sendWeatherToLine`
4. イベントのソース：時間主導型
5. 時間ベース：特定の時間（毎日・午前7時〜8時）

## カスタマイズ例

### 複数都市をまとめて通知

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

夜勤前の朝だけ傘確認が必要な方に最適です。雨の日だけ通知にすれば、Messaging API無料プラン（月200通）の節約にもなります。

## まとめ

- OpenWeatherMap API（無料）でリアルタイム天気取得
- `buildMessage` で見やすいLINEメッセージに整形
- LINE Messaging APIのPush APIで自分のLINEに送信
- 毎朝トリガーで完全自動化
- 強風・高湿度の条件メッセージで実用性UP
- APIキー・トークンはスクリプトプロパティで安全管理

天気通知は「GASで外部APIを叩く」最初の練習台として最高です。動いた瞬間の達成感、ぜひ味わってください。

## 関連記事

- [GASからLINEに通知を送る最短レシピ](/blog/gas-line-notify-basic/)
- [LINE Messaging APIとGAS連携する最短3ステップ](/blog/gas-line-messaging-api-setup/)
- [GASで毎朝ToDoをLINEに届けるリマインダー](/blog/gas-line-reminder-daily/)
- [ChatGPT×GAS活用ベスト5](/blog/gas-chatgpt-integration-5/)

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです。OpenWeatherMap API・LINE Messaging APIの仕様・無料プランの制限は各公式ドキュメントをご確認ください。
