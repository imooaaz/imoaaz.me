import type { APIRoute } from 'astro';
import { getPosts, isoDate, postUrl } from '../lib/posts';
import { SITE_URL } from '../data/site';

/** Hand-rolled sitemap: the site is small enough that a plugin isn't worth it. */
export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: '/' },
    { loc: '/blog/', lastmod: posts[0] && isoDate(posts[0].data.date) },
    { loc: '/cv/' },
    ...posts.map((p) => ({ loc: postUrl(p), lastmod: isoDate(p.data.date) })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE_URL}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
