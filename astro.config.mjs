// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';

export default defineConfig({
  site: 'https://imoaaz.pages.dev',
  // Pages are emitted as /blog/index.html etc., matching the old hand-written URLs.
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  // Keep whitespace exactly as written: inline-block spacing in the design depends on it.
  compressHTML: false,
  markdown: {
    // Posts must render the plain <pre><code> blocks and straight quotes the CSS was written for.
    syntaxHighlight: false,
    processor: satteri({ features: { smartPunctuation: false } }),
  },
});
