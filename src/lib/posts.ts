import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** All posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog');
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const postUrl = (post: Post) => `/blog/${post.id}/`;

/** "Sep 14, 2026" */
export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** "2026-09-14" */
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export const CATEGORY_CLASS: Record<string, string> = {
  Engineering: 'cat-eng',
  Security: 'cat-sec',
};

/** Keys the blog filter chips match against (data-tags). */
export const filterKeys = (post: Post) =>
  [...new Set([...post.data.categories.map((c) => c.toLowerCase()), ...post.data.topics, ...post.data.tags])].join(',');
