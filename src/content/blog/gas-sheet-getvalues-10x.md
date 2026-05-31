---
title: "getValuesが10倍速くなる書き方ベスト3｜スプシ高速化の鉄則"
description: "GASのgetValuesを10倍速くする書き方ベスト3を凛が解説。ループ内呼び出し回避・必要列だけ取得・キャッシュ化のテクニック。"
pubDate: "2026-06-21T19:00:00+09:00"
heroImage: "/blog-placeholder-5.jpg"
categorySlug: "spreadsheet"
categoryName: "スプレッドシート"
tagSlugs: ["gas","spreadsheet","getvalues","performance"]
tagNames: ["GAS","スプレッドシート","getValues","高速化"]
readingTime: 5
keywords: ["GAS getValues 遅い","GAS スプシ 高速化"]
---

スプシ操作が遅いほぼ全ての原因はAPI呼び出し回数。getValues最適化の3鉄則。

## 鉄則1: ループ内で呼ばない

```javascript
// ❌ 1000行で1000回API呼び出し → 数十秒
for (let i = 1; i <= 1000; i++) {
  const v = sheet.getRange(i, 1).getValue();
}

// ✅ 1回で全件取得 → 1秒以内
const values = sheet.getRange(1, 1, 1000, 1).getValues();
values.forEach(row => {
  const v = row[0];
});
```

## 鉄則2: 必要範囲だけ取得

```javascript
// ❌ シート全体取得（10万行あったら重い）
const all = sheet.getDataRange().getValues();

// ✅ 必要列・行だけ
const data = sheet.getRange(1, 1, sheet.getLastRow(), 5).getValues();
```

## 鉄則3: 結果をキャッシュ

```javascript
const cache = CacheService.getScriptCache();
let data = cache.get('myData');
if (!data) {
  data = JSON.stringify(sheet.getDataRange().getValues());
  cache.put('myData', data, 600); // 10分
}
data = JSON.parse(data);
```

## 書き込み側も同じ

setValues も配列で一括渡しが基本。詳しくは [GAS setValues で1000行を一括書き込む高速化テクニック](/blog/gas-sheet-setvalues-bulk/)。

---

### この記事を書いた人：凛

2児のママで現役ナース。夜勤明けの細切れ時間を副業GASに投じ、月5〜8万円の副収入を継続中。「看護師でもコードは書ける」を合言葉に、家事育児とプログラミングを両立する等身大の情報を発信しています。本記事のコードは静的検証済みです（構文・API仕様・ロジックを確認）。
