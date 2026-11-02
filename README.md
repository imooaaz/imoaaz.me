# imoaaz.me

Personal site of **Moaaz Afifi**, Cyber & Product Security Engineer and co-founder of Raqyan.

Live: **https://imoaaz.pages.dev** (Cloudflare Pages project `imoaaz`).

## Stack

[Astro](https://astro.build) with static output only: every page is pre-rendered HTML in `dist/`, with no server and no framework runtime in the browser.

- One global stylesheet: `public/assets/css/style.css` (Inter + JetBrains Mono, deep-gold accent; tokens in `:root`). Components use its class names directly; there are no scoped styles.
- One script: `public/assets/js/main.js` handles the header, mobile menu, scroll-spy, reveals, filters, article TOC, copy buttons, contact form (Web3Forms + lazy hCaptcha), CV availability/share/QR, and the experience "Show details" toggle. It is plain JS with no dependencies, so no React islands are needed.

```
src/
  layouts/Base.astro          <head>/meta, header, footer, tab bar, main.js
  components/
    Header.astro              top nav + mobile menu
    Footer.astro              site footer
    TabBar.astro              bottom tab bar (phones)
    Ambient.astro             fixed background glow
    SectionTitle.astro        section heading with the eyebrow label
    PostCard.astro            blog card (full / compact / featured)
    ProjectCard.astro         project card
    home/*.astro              home page sections (hero, experience, business, ...)
    blog/*.astro              blog hero scene + pillars
  content/blog/*.md           blog posts (one Markdown file each)
  data/
    experience.ts             experience timeline, education, volunteering
    projects.ts               projects & tools
    site.ts                   URLs, email, socials
  lib/posts.ts                post sorting, dates, filter keys
  pages/                      index, blog/index, blog/[slug], cv/index, 404
public/                       copied as-is: assets/, .well-known/security.txt, robots.txt
tools/og.html                 source of assets/img/og.png (not deployed)
```

## Run locally

```bash
npm install
npm run dev        # http://localhost:4321 with live reload
npm run build      # writes dist/
npm run preview    # serves dist/ exactly as it will be deployed
```

Requires Node 22.12+.

## Add a blog post

Create `src/content/blog/<slug>.md`. The file name becomes the URL (`/blog/<slug>/`).

```md
---
title: "Your post title"
description: "Meta description for search engines (one or two sentences)."
ogDescription: "Optional shorter text for link previews (defaults to description)."
dek: "One-line summary under the title; also used as the card excerpt."
date: 2026-11-02
readTime: 4                 # minutes
section: Write-up           # breadcrumb label: "Blog / Write-up"
categories: [Security]      # Security and/or Engineering (card badges + filters)
tags: [xss, bug bounty]     # shown on cards and in the article sidebar
topics: [bug bounty]        # optional extra filter keys not already in tags
cover: /assets/img/blog/<slug>.svg   # put the image in public/assets/img/blog/
medium: https://medium.com/...       # optional "Originally on Medium" link
---

Body in Markdown. `## Headings` feed the "On this page" table of contents.
Code blocks render as plain <pre><code> (no syntax highlighting, by design).
Arabic lines: <p class="rtl">...</p>
```

That's it. The blog index (newest first, featured "Latest" card), the three "Writing" cards on the home page, and the "More write-ups" row under every post are all generated from this folder.

## Add a project

Add an object to `projects` in `src/data/projects.ts`:

```ts
{
  title: 'my-tool',
  kind: 'tool',                       // tool | research | product (filter + icon colour)
  kindLabel: 'Tool · Open source',
  desc: 'What it does, in one line.',
  tags: ['javascript', 'recon'],
  links: [{ label: 'Code', href: 'https://github.com/...' }],  // optional
}
```

If you add the first `product`, also add `{ key: 'product', label: 'Products' }` to `projectFilters`.

## Add an experience entry

Add an object to `experience` in `src/data/experience.ts` (newest first):

```ts
{
  dates: 'Jan 2027 — Present',
  role: 'Security Engineer',
  org: 'Company',
  type: 'Full-time',
  desc: 'One line on what the role is about.',
  current: true,                      // highlights the dot while ongoing
  points: [{ label: 'Focus', text: 'short detail (inline HTML allowed).' }],
}
```

Keep everything factual: real roles, real projects, real outcomes.

## Deploy (Cloudflare Pages, direct upload)

```bash
npm run build
npx wrangler pages deploy dist --project-name imoaaz --branch main
```

`dist/` contains only the built site, so there is no need for the old `git archive` clean-snapshot step. To get a preview URL instead of production, pass any other branch name, e.g. `--branch astro`.

The contact form posts to Web3Forms with the access key in `src/components/home/Contact.astro` (`data-web3forms-key`). The CV page enables its buttons once `public/assets/cv/Moaaz-Afifi-CV.pdf` exists.
