---
title: "From Frustration to Exploitation: How a Link Shortener Helped Me Bypass WAF"
description: "A bug bounty writeup: when a WAF blocked every XSS payload in the search box, the platform's own link shortener became the bypass."
ogDescription: When a WAF blocked every XSS payload in the search box, the platform's own link shortener became the bypass.
dek: Getting past a WAF through the site's own link shortener.
date: 2024-12-05
readTime: 3
section: Write-up
categories: [Security]
tags: [waf bypass, xss, bug bounty]
cover: /assets/img/blog/waf-bypass.svg
medium: https://medium.com/@imooaaz/from-frustration-to-exploitation-how-a-link-shortener-helped-me-bypass-waf-03724dca1592
---

<p class="rtl">بسم الله، ربِّ يَسِّر وأعِن وامْنُن بالإخلاص والتوفيق والقبول.</p>

While hunting on a target, I found myself stuck: every payload I threw at
the search box came back as `403 Forbidden`. A WAF was sitting
in front of the application, and it was good at its job. This is the story
of how the platform's own link shortener became the key to bypassing it.

## The set-up: the perils of the search box

The target had a search feature — the classic entry point. I started
probing the query parameter with the usual suspects:

```
https://example.com/search?q=<script>alert(1)</script>
```

Every single time: `403 Forbidden`. I tried encoding, case
variation, comments, junk payloads — the WAF was relentless. Frustration
started to creep in. And that's exactly when I remembered the first rule
of hunting: when a door is locked, stop pushing it and look for a window.

## The twist: a wild link shortener appears!

While mapping the application, I noticed it had a built-in link shortener
used for sharing content. It turned long URLs into neat little links on
the platform's own short domain, for example:

```
https://example.com/share/very/long/link/with/parameters
        ↓
https://exomexo.io/abcd123
```

And that raised a question: what does the WAF see when it inspects a link
that redirects to my payload?

## The eureka moment: redirecting around the WAF

The attack path was simple once I saw it:

1. I hosted my XSS payload at a URL of my own.
2. I fed that URL to the platform's link shortener, getting back a clean-looking short link on the platform's trusted short domain.
3. I submitted the shortened link through the search feature.

The WAF inspected the request, saw the platform's own shortener domain —
trusted, internal, harmless — and let it through. Then the redirect did
the rest: the browser followed the short link straight to my payload, and
my XSS fired.

All that frustration evaporated the moment that alert box popped. The WAF
never saw the payload — it only ever saw the wrapper.

## Lessons learned

1. **The WAF inspects what it sees, not what eventually loads.**
   A redirect is a beautiful blind spot: the request looks innocent, and the
   payload arrives one hop later.
2. **Attack with the target's own features.**
   The shortener belonged to the platform, so its domain was trusted. The
   best bypass tool was handed to me by the application itself.

## Final thoughts

A blocked payload isn't the end of the hunt — it's a hint to change your
angle. Understand exactly what the defense is inspecting, then find a way
to hand it something it trusts while the real payload travels behind it.
Happy hunting!

<p class="rtl">
  اللهم علمنا ما ينفعنا وانفعنا بما علمتنا، وصلى الله على سيدنا محمد
  وآله وصحبه وسلم.
</p>

**Moaaz Afifi** — [Linkedin](https://www.linkedin.com/in/imooaaz/) ·
[X](https://twitter.com/imooaaz)
