/**
 * アイキャッチ画像のURLを決める。
 *
 * 記事ごとに用意した画像があればそれを使い、
 * 共通のプレースホルダー画像（/blog-placeholder-N.jpg）しか無い場合は
 * 記事タイトル入りの自動生成OG画像（/og/<slug>.svg）にフォールバックする。
 *
 * 全記事が同じ5枚の画像を使い回している状態は、
 * 読者にとっても検索エンジンにとっても記事の中身が伝わらないため。
 */
export function eyecatchUrl(heroImage: string | undefined | null, slug: string | undefined): string {
	const isPlaceholder = !heroImage || /\/blog-placeholder-[\w-]+\.(jpg|jpeg|png|webp)$/i.test(heroImage);
	if (isPlaceholder && slug) return `/og/${slug}.svg`;
	return heroImage || '/og-default.svg';
}
