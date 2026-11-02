import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    /** <meta name="description"> */
    description: z.string(),
    /** og:description (falls back to description) */
    ogDescription: z.string().optional(),
    /** One-line summary under the title; also the card excerpt. */
    dek: z.string(),
    date: z.coerce.date(),
    /** Minutes, shown as "N min read". */
    readTime: z.number(),
    /** Breadcrumb label after "Blog /", e.g. "Write-up". */
    section: z.string(),
    /** Card badges and blog filters. */
    categories: z.array(z.enum(['Engineering', 'Security'])),
    /** Tags shown on cards and in the article sidebar. */
    tags: z.array(z.string()),
    /** Extra blog filter keys that aren't categories or tags, e.g. "bug bounty". */
    topics: z.array(z.string()).default([]),
    /** Cover image path under /public. */
    cover: z.string(),
    /** Original Medium URL, if the post was published there first. */
    medium: z.string().url().optional(),
  }),
});

export const collections = { blog };
