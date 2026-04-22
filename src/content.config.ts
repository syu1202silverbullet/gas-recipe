import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const blog = defineCollection({
	loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
		categorySlug: z.string().optional(),
		categoryName: z.string().optional(),
		tagSlugs: z.array(z.string()).optional(),
		tagNames: z.array(z.string()).optional(),
		readingTime: z.number().optional(),
	}),
});

export const collections = { blog };
