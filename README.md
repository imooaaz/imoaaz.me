# imoaz.me

Personal portfolio of **Moaaz Afifi** — cybersecurity engineer & penetration tester.

Live: **https://imoaaz.me** (custom domain, when purchased) · currently served from Cloudflare Pages at the `*.pages.dev` URL.

## Stack

Hand-built static site. One HTML page, one stylesheet, one script — no framework, no build step, no dependencies.

- `index.html` — all content. Edit this to change anything (email, links, experience entries).
- `assets/css/style.css` — amber-phosphor terminal theme. Design tokens live in `:root` at the top.
- `assets/js/main.js` — typed hero prompt, nav highlighting, copy-email button.
- `.well-known/security.txt` — vulnerability disclosure contact (RFC 9116).

Fonts (IBM Plex Mono / IBM Plex Sans) load from Google Fonts.

## Run locally

```bash
# from the repo root, any static server works:
npx serve .
# or
python -m http.server 8080
```

## Deploy

The site is deployed on Cloudflare Pages via direct upload (no build command):

```bash
wrangler pages deploy . --project-name imoaaz
```

Pushing to GitHub does **not** auto-deploy (direct-upload project). After editing, run the deploy command, or reconnect the repo in the Cloudflare dashboard for git-based deploys.

## Attaching the imoaz.me domain (when you buy it)

1. Buy `imoaaz.me` and add it as a zone in your Cloudflare account (or buy it directly inside Cloudflare Registrar — zero config).
2. Cloudflare Pages dashboard → the `imoaaz` project → **Custom domains** → set `imoaaz.me`.
3. Update the `og:url` / `og:image` absolute URLs in `index.html` if they still point at the pages.dev subdomain.

## Content notes

- All experience, certifications, skills, and the CVE-2024-36436 record reflect the real LinkedIn profile — don't pad them with anything unverified, and keep personal details (country, dates beyond job history) off the page.
- Email on the site: `imooaaz@gmail.com` (also in `security.txt` and the copy button's `data-copy` attribute — change all three together).

---

© Moaaz Afifi
