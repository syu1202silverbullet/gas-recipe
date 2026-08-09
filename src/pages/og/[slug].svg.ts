import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
	const posts = await getCollection('blog');
	return posts.map((p: any) => ({ params: { slug: p.id }, props: { post: p } }));
}

/** 半角は0.5文字、全角は1文字として数えた表示幅 */
function width(s: string): number {
	let w = 0;
	for (const ch of s) w += /[\x20-\x7E]/.test(ch) ? 0.58 : 1.02;
	return w;
}

/**
 * タイトルを最大3行に折り返す。
 * ・区切り記号（｜・：など）があればそこで優先的に改行
 * ・区切りが無い場合も、英単語や数字の途中では切らない
 */
function wrapTitle(title: string, maxWidth = 17, maxLines = 3): string[] {
	const breakers = ['｜', '|', '・', '：', ':', '、', '。', ' ', '　', '／', '/'];
	const isWordChar = (ch: string) => /[A-Za-z0-9._-]/.test(ch);
	const lines: string[] = [];
	let rest = title.trim();

	while (rest.length > 0 && lines.length < maxLines) {
		if (width(rest) <= maxWidth) { lines.push(rest); rest = ''; break; }

		// maxWidth を超えない範囲でいちばん長く取れる位置を求める
		let limit = 0;
		while (limit < rest.length && width(rest.slice(0, limit + 1)) <= maxWidth) limit++;

		// ① 区切り記号を後ろから探す（行の半分より後ろにあるものだけ採用）
		let cut = -1;
		for (let i = limit; i >= Math.floor(limit * 0.5); i--) {
			if (breakers.includes(rest[i])) { cut = i + 1; break; }
		}
		// ② 無ければ、英単語・数字の途中を避けて後退する
		if (cut < 0) {
			cut = limit;
			while (cut > Math.floor(limit * 0.5) && isWordChar(rest[cut - 1]) && isWordChar(rest[cut])) cut--;
		}
		lines.push(rest.slice(0, cut).trim());
		rest = rest.slice(cut).trim();
	}

	// 入りきらなかった分がある場合だけ、最終行を省略記号で締める
	if (rest.length > 0 && lines.length > 0) {
		let last = lines[lines.length - 1];
		while (last.length > 1 && width(last + '…') > maxWidth) last = last.slice(0, -1);
		lines[lines.length - 1] = last + '…';
	}
	return lines;
}

export const GET: APIRoute = async ({ props }) => {
	const post = (props as any).post;
	const title: string = post.data.title;
	const category: string = post.data.categoryName || 'GAS Recipe';

	const escape = (s: string) =>
		s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

	const lines = wrapTitle(title);
	// 行数に応じてタイトルの開始位置を調整（縦位置のバランス取り）
	const startY = lines.length === 1 ? 355 : lines.length === 2 ? 325 : 295;
	// 行が長いときは、その行だけ文字を小さくして枠からはみ出さないようにする
	// （フォントは環境によって幅が変わるため、使える幅は控えめに 880px で見積もる）
	const USABLE_WIDTH = 880;
	const titleSvg = lines
		.map((l, i) => {
			const fontSize = Math.min(50, Math.floor(USABLE_WIDTH / Math.max(width(l), 1)));
			return `<text x="100" y="${startY + i * 70}" font-family="'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif" font-size="${fontSize}" fill="#111827" font-weight="800">${escape(l)}</text>`;
		})
		.join('\n  ');

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#dbeafe"/>
      <stop offset="1" stop-color="#fce7f3"/>
    </linearGradient>
    <linearGradient id="gear" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="60" y="60" width="1080" height="510" rx="24" fill="white" fill-opacity="0.72"/>
  <rect x="100" y="120" width="8" height="44" rx="4" fill="url(#gear)"/>
  <text x="126" y="156" font-family="'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif" font-size="32" fill="#4f46e5" font-weight="700">GAS Recipe</text>
  <text x="100" y="216" font-family="'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif" font-size="24" fill="#6366f1" font-weight="600">${escape(category)}</text>
  ${titleSvg}
  <text x="100" y="530" font-family="'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif" font-size="26" fill="#6b7280">凛｜https://gas-recipe.com</text>
  <g transform="translate(1050 170)">
    <circle r="70" fill="url(#gear)"/>
    <circle r="28" fill="white"/>
  </g>
</svg>`;

	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'public, max-age=86400, immutable',
		},
	});
};
