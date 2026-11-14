import type { APIRoute } from 'astro';
import { getPosts, postUrl } from '../lib/posts';
import { SITE_URL } from '../data/site';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const items = posts.map((p) => {
    const url = SITE_URL + postUrl(p);
    return `    <item>
      <title>${esc(p.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${p.data.date.toUTCString()}</pubDate>
      <description>${esc(p.data.description)}</description>
${p.data.tags.map((t) => `      <category>${esc(t)}</category>`).join('\n')}
    </item>`;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Moaaz Afifi | Engineering &amp; Security Blog</title>
    <link>${SITE_URL}/blog/</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>Product security, DevSecOps, and vulnerabilities found in real systems.</description>
    <language>en</language>
${items.join('\n')}
  </channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
