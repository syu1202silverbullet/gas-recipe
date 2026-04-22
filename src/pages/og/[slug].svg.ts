import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
	const posts = await getCollection('blog');
	return posts.map((p: any) => ({ params: { slug: p.id }, props: { post: p } }));
}

export const GET: APIRoute = async ({ props }) => {
	const post = (props as any).post;
	const title = post.data.title;
	const category = post.data.categoryName || 'GAS Recipe';

	// Split title into 2 lines if too long
	const maxPerLine = 20;
	let line1 = title, line2 = '';
	if (title.length > maxPerLine) {
		const mid = Math.floor(title.length / 2);
		// Find nearest space/symbol before mid
		let splitAt = mid;
		for (let i = mid; i >= 0; i--) {
			if (['｜', '・', '：', ' ', '|'].includes(title[i])) { splitAt = i; break; }
		}
		line1 = title.slice(0, splitAt + 1);
		line2 = title.slice(splitAt + 1);
	}

	const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
  <rect x="60" y="60" width="1080" height="510" rx="24" fill="white" fill-opacity="0.7"/>
  <text x="100" y="170" font-family="'Noto Sans JP', sans-serif" font-size="34" fill="#9333ea" font-weight="700">🌸 みっちゃんママ｜GAS Recipe</text>
  <text x="100" y="230" font-family="'Noto Sans JP', sans-serif" font-size="24" fill="#6366f1" font-weight="600">📂 ${escape(category)}</text>
  <text x="100" y="340" font-family="'Noto Sans JP', sans-serif" font-size="56" fill="#111827" font-weight="800">${escape(line1)}</text>
  ${line2 ? `<text x="100" y="420" font-family="'Noto Sans JP', sans-serif" font-size="56" fill="#111827" font-weight="800">${escape(line2)}</text>` : ''}
  <text x="100" y="530" font-family="'Noto Sans JP', sans-serif" font-size="28" fill="#6b7280">https://gas-recipe.com</text>
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
