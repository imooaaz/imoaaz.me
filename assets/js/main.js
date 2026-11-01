/* imoaz.me — mini shell terminal, scroll reveals, spotlight, progress.
   No frameworks, no dependencies. */

(function () {
  "use strict";

  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= scroll progress bar ================= */
  var bar = document.querySelector(".scroll-progress");
  if (bar) {
    var ticking = false;
    var update = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var x = max > 0 ? h.scrollTop / max : 0;
      bar.style.transform = "scaleX(" + x + ")";
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* ================= header scrolled state ================= */
  var header = document.querySelector(".site-header");
  if (header) {
    var headerTick = false;
    var headerSync = function () {
      header.classList.toggle("scrolled", window.scrollY > 12);
      headerTick = false;
    };
    window.addEventListener("scroll", function () {
      if (!headerTick) {
        headerTick = true;
        window.requestAnimationFrame(headerSync);
      }
    }, { passive: true });
    headerSync();
  }

  /* ================= scroll reveals ================= */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (revealEls.length && "IntersectionObserver" in window && !reduced) {
    var ro = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            ro.unobserve(e.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach(function (el) { ro.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ================= hero spotlight ================= */
  var hero = document.querySelector(".hero");
  var finePointer =
    window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (hero && finePointer && !reduced) {
    hero.classList.add("spotlight");
    hero.addEventListener("pointermove", function (ev) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", ev.clientX - r.left + "px");
      hero.style.setProperty("--my", ev.clientY - r.top + "px");
    }, { passive: true });
  }

  /* ================= mobile nav toggle ================= */
  var navToggle = document.querySelector(".nav-toggle");
  if (header && navToggle) {
    var setNav = function (open) {
      header.classList.toggle("nav-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.textContent = open ? "close" : "menu";
    };
    navToggle.addEventListener("click", function () {
      setNav(!header.classList.contains("nav-open"));
    });
    header.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { setNav(false); });
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && header.classList.contains("nav-open")) {
        setNav(false);
        navToggle.focus();
      }
    });
    document.addEventListener("click", function (ev) {
      if (!header.contains(ev.target)) setNav(false);
    });
  }

  /* ================= nav scroll-spy ================= */
  /* tracks every top-level section, so sections without a nav link
     (writing, skills, certs) clear the highlight instead of leaving a stale one */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav-links a[href^="#"]')
  );
  var spySections = Array.prototype.slice.call(
    document.querySelectorAll("main > section[id]")
  );
  if (navLinks.length && spySections.length) {
    var spyTick = false;
    var spySync = function () {
      spyTick = false;
      var h = document.documentElement;
      var mark = window.innerHeight * 0.35;
      var current = null;
      if (window.innerHeight + window.scrollY >= h.scrollHeight - 4) {
        current = spySections[spySections.length - 1];
      } else {
        spySections.forEach(function (s) {
          if (s.getBoundingClientRect().top <= mark) current = s;
        });
      }
      var id = current ? "#" + current.id : "";
      navLinks.forEach(function (a) {
        var on = a.getAttribute("href") === id;
        a.classList.toggle("active", on);
        if (on) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    };
    window.addEventListener("scroll", function () {
      if (!spyTick) {
        spyTick = true;
        window.requestAnimationFrame(spySync);
      }
    }, { passive: true });
    window.addEventListener("resize", spySync);
    spySync();
  }

  /* ================= copy email ================= */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    var label = btn.querySelector(".btn-copy-label") || btn;
    var original = label.textContent;
    var timer;
    var fallbackCopy = function (text) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok ? Promise.resolve() : Promise.reject();
    };
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var p = navigator.clipboard && window.isSecureContext
        ? navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); })
        : fallbackCopy(text);
      p.then(function () {
        btn.classList.add("copied");
        label.textContent = "copied ✓";
      }, function () {
        label.textContent = "copy failed";
      }).then(function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          btn.classList.remove("copied");
          label.textContent = original;
        }, 1800);
      });
    });
  });

  /* ================= logo marquee: seamless loop ================= */
  var mTrack = document.querySelector(".marquee-track");
  if (mTrack && !reduced) {
    var mSet = mTrack.querySelector(".marquee-set");
    var PX_PER_SEC = 90;
    var ensureSets = function () {
      var S = mSet.getBoundingClientRect().width;
      if (S < 40) return;
      var half = Math.max(1, Math.ceil(window.innerWidth / S) + 1);
      var total = half * 2;
      while (mTrack.children.length < total) {
        var c = mSet.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        mTrack.appendChild(c);
      }
      mTrack.style.animationDuration = ((S * half) / PX_PER_SEC).toFixed(2) + "s";
    };
    ensureSets();
    window.addEventListener("load", ensureSets);
    window.addEventListener("resize", ensureSets);
  }

  /* ==================================================================
     interactive terminal — a small shell with a real filesystem
     ================================================================== */
  var term = document.getElementById("term");
  if (!term) return;

  var body = document.getElementById("term-body");
  var inputRow = document.getElementById("term-input-row");
  var mirror = document.getElementById("ti-text");
  var realInput = document.getElementById("term-real-input");
  var promptEl = document.querySelector(".ti-prompt");

  var esc = function (s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  function line(html, cls) {
    var p = document.createElement("p");
    p.className = "term-line " + (cls || "out");
    p.innerHTML = html;
    body.appendChild(p);
    body.scrollTop = body.scrollHeight;
    return p;
  }

  function wait(ms) {
    return new Promise(function (res) { window.setTimeout(res, ms); });
  }

  /* ---------------- filesystem ---------------- */
  var HOME = "/home/moaaz";

  function D(children) { return { type: "dir", children: children }; }
  function F(lines) { return { type: "file", lines: lines }; }

  var FS = {
    "/": D(["bin", "etc", "home", "tmp", "usr", "var"]),
    "/bin": D(["bash", "cat", "ls", "sh", "zsh"]),
    "/etc": D(["hostname", "os-release", "passwd"]),
    "/etc/hostname": F(["imoaz.me"]),
    "/etc/os-release": F([
      'PRETTY_NAME="PortfolioOS 1.0 (hardened)"',
      "ID=portfolio",
      'HOME_URL="https://imoaaz.me"'
    ]),
    "/etc/passwd": F([
      "root:x:0:0:root:/root:/bin/bash",
      "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin",
      "moaaz:x:1000:1000:Moaaz Afifi:/home/moaaz:/bin/zsh"
    ]),
    "/home": D(["moaaz"]),
    "/home/moaaz": D(["about.txt", "focus.txt", "skills.json", "experience.log", "contact.md", ".zshrc", "cves", "blog"]),
    "/home/moaaz/cves": D(["CVE-2024-36436.txt"]),
    "/home/moaaz/cves/CVE-2024-36436.txt": F([
      "CVE-2024-36436 — WishList Member X (wordpress plugin)",
      "class  : exposure of sensitive information (CWE-200)",
      "impact : the plugin's REST API secret key was returned in",
      "         plaintext to unauthenticated users in an AJAX response.",
      "status : patched — found & reported via coordinated disclosure"
    ]),
    "/home/moaaz/blog": D(["fuzz-the-type.md", "comments-to-rce.md", "waf-bypass.md"]),
    "/home/moaaz/blog/fuzz-the-type.md": F([
      "# fuzz the type, not just the value",
      "-> https://imoaaz.me/blog/fuzz-the-type/"
    ]),
    "/home/moaaz/blog/comments-to-rce.md": F([
      "# from comments to command execution (RCE)",
      "-> https://imoaaz.me/blog/comments-to-rce/"
    ]),
    "/home/moaaz/blog/waf-bypass.md": F([
      "# from frustration to exploitation — WAF bypass",
      "-> https://imoaaz.me/blog/waf-bypass/"
    ]),
    "/tmp": D([]),
    "/usr": D(["bin"]),
    "/usr/bin": D([]),
    "/var": D(["log"]),
    "/var/log": D(["auth.log"]),
    "/var/log/auth.log": F([
      "imoaz sshd[1337]: Accepted publickey for moaaz from 127.0.0.1",
      "imoaz sshd[1337]: pam_unix(sshd:session): session opened for user moaaz",
      "imoaz sudo: moaaz : user NOT in sudoers ; TTY=pts/0 ; PWD=/home/moaaz ;",
      "imoaz sshd[1337]: disconnect - nothing suspicious. stay sharp."
    ])
  };

  var FILES_HOME = {
    "about.txt": [
      "moaaz afifi — cybersecurity engineer & penetration tester.",
      "i came to security from software development: i read code,",
      "not just responses. offensive security with a developer's",
      "mindset — appsec, devsecops, and bug bounty."
    ],
    "focus.txt": ["web & mobile pentest / appsec / devsecops / ai security"],
    "skills.json": [
      "{",
      '  "offensive":    ["web pentest", "mobile pentest", "red teaming", "bug bounty"],',
      '  "process":      ["appsec", "devsecops", "ssdlc", "technical reporting"],',
      '  "engineering":  ["javascript/node.js", "mongodb", "linux", "code review"]',
      "}"
    ],
    "experience.log": [
      "2023—now   hackerone      cyber security researcher",
      "2025—now   gcc            security consultant & pentester",
      "2025       robusta (rtg)  application security engineer",
      "2023—2024  cybrany        offensive security engineer"
    ],
    "contact.md": [
      "email   : imooaaz@gmail.com",
      "github  : github.com/m0442",
      "x       : @imooaaz",
      "disclose: /.well-known/security.txt"
    ],
    ".zshrc": ["# nothing up my sleeve", "alias please='sudo'"]
  };
  Object.keys(FILES_HOME).forEach(function (f) {
    FS[HOME + "/" + f] = F(FILES_HOME[f]);
  });

  var cwd = HOME;
  var prevCwd = HOME;
  var hist = [];
  var histIdx = -1;

  function normalize(p) {
    if (p === "" || p === undefined) return cwd;
    if (p === "~") return HOME;
    if (p.charAt(0) === "~") p = HOME + p.slice(1);
    var parts;
    if (p.charAt(0) === "/") parts = p.split("/");
    else parts = cwd.split("/").concat(p.split("/"));
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      if (!seg || seg === ".") continue;
      if (seg === "..") { out.pop(); continue; }
      out.push(seg);
    }
    return "/" + out.join("/");
  }

  function node(p) { return FS[normalize(p)] || null; }

  function shortCwd() {
    if (cwd === HOME) return "~";
    if (cwd.indexOf(HOME + "/") === 0) return "~" + cwd.slice(HOME.length);
    return cwd === "/" ? "/" : cwd;
  }

  function setPrompt() {
    if (promptEl) promptEl.textContent = "moaaz@imoaaz:" + shortCwd();
  }

  function dirEntries(p, all) {
    var d = node(p);
    if (!d || d.type !== "dir") return null;
    return d.children.filter(function (c) { return all || c.charAt(0) !== "."; });
  }

  function renderLs(entries, path) {
    var dirs = [], files = [];
    entries.forEach(function (e) {
      var n = node((path ? path + "/" : "") + e);
      if (n && n.type === "dir") dirs.push(e);
      else files.push(e);
    });
    dirs.sort(); files.sort();
    var html = dirs.map(function (d) {
      return '<span class="t-cyan">' + esc(d) + '/</span>';
    }).concat(files.map(esc)).join("  ");
    line(html || "");
  }

  /* ---------------- commands ---------------- */
  var COMMANDS = {
    help: function () {
      line('<span class="t-cyan">portfolio</span>   whoami · cve · experience · skills · contact · blog');
      line('<span class="t-cyan">files</span>       ls · cd · pwd · cat · head · grep · tree · touch · mkdir · rm · echo');
      line('<span class="t-cyan">system</span>      date · uname · id · hostname · history · man');
      line('<span class="t-cyan">recon</span>       nmap · ping · whois');
      line('<span class="t-cyan">misc</span>        help · clear · exit · sudo');
      line('<span class="t-dim">TAB completes commands & paths · ↑ recalls history · try `cd /` then `ls`</span>');
    },
    whoami: function () {
      line("moaaz");
      line('<span class="t-dim">cybersecurity engineer &amp; penetration tester — offensive security with a developer\'s mindset</span>');
    },
    id: function () {
      line("uid=1000(moaaz) gid=1000(moaaz) groups=1000(moaaz),27(appsec),1337(bugbounty)");
    },
    pwd: function () { line(cwd); },
    hostname: function () { COMMANDS.cat(["/etc/hostname"]); },
    date: function () { line(esc(new Date().toString())); },
    uname: function (args) {
      if (args.indexOf("-a") !== -1) {
        line("Linux imoaz.me 6.6.0-hardened #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux");
      } else {
        line("Linux");
      }
    },
    ls: function (args) {
      var flags = args.filter(function (a) { return a.charAt(0) === "-" && a.length > 1; });
      var long = flags.some(function (f) { return f.indexOf("l") !== -1; });
      var all = flags.some(function (f) { return f.indexOf("a") !== -1; });
      var paths = args.filter(function (a) { return a.charAt(0) !== "-" || a.length === 1; });
      if (!paths.length) paths = ["."];

      paths.forEach(function (p, i) {
        if (paths.length > 1 && i > 0) line("");
        if (paths.length > 1) line(esc(p) + ":");
        var n = node(p);
        if (!n) { line("ls: cannot access '" + esc(p) + "': No such file or directory"); return; }
        if (n.type === "file") { line(esc(p)); return; }
        var entries = dirEntries(p, all);
        if (!entries) { line("ls: " + esc(p) + ": Not a directory"); return; }
        if (all) entries = ["."].concat([".."]).concat(entries);
        if (long) {
          entries.forEach(function (e) {
            var en = node((p === "" ? "." : p) + "/" + e);
            var isDir = en && en.type === "dir";
            var size = en && en.type === "file" ? (en.lines.join("\n").length + "B") : "4.0K";
            line((isDir ? "drwxr-xr-x" : "-rw-r--r--") + "  moaaz moaaz  " + size.padStart(6) + "  " + (isDir ? '<span class="t-cyan">' + esc(e) + "/</span>" : esc(e)));
          });
        } else {
          renderLs(entries, p === "." ? "" : normalize(p));
        }
      });
    },
    cd: function (args) {
      var t = args[0] || "~";
      if (t === "-") {
        var tmp = prevCwd; prevCwd = cwd; cwd = tmp; setPrompt();
        line(shortCwd());
        return;
      }
      var target = normalize(t);
      var n = node(target);
      if (!n) { line("cd: " + esc(t) + ": No such file or directory"); return; }
      if (n.type !== "dir") { line("cd: " + esc(t) + ": Not a directory"); return; }
      prevCwd = cwd;
      cwd = target;
      setPrompt();
    },
    cat: function (args) {
      if (!args.length) { line('<span class="t-dim">(petting the cat… nothing to read)</span>'); return; }
      args.forEach(function (a) {
        var n = node(a);
        if (!n) { line("cat: " + esc(a) + ": No such file or directory"); return; }
        if (n.type === "dir") { line("cat: " + esc(a) + ": Is a directory"); return; }
        n.lines.forEach(function (l) { line(esc(l)); });
      });
    },
    head: function (args) {
      var t = args.filter(function (a) { return a.charAt(0) !== "-"; })[0];
      if (!t) { line("head: missing operand"); return; }
      var n = node(t);
      if (!n) { line("head: cannot open '" + esc(t) + "': No such file or directory"); return; }
      if (n.type === "dir") { line("head: error reading '" + esc(t) + "': Is a directory"); return; }
      n.lines.slice(0, 5).forEach(function (l) { line(esc(l)); });
    },
    grep: function (args) {
      var paths = args.filter(function (a) { return a.charAt(0) !== "-" || a.length === 1; });
      if (paths.length < 2) { line("usage: grep <pattern> <file>"); return; }
      var pat = paths[0], t = paths[1];
      var n = node(t);
      if (!n) { line("grep: " + esc(t) + ": No such file or directory"); return; }
      if (n.type === "dir") { line("grep: " + esc(t) + ": Is a directory"); return; }
      var hits = 0;
      n.lines.forEach(function (l) {
        if (l.toLowerCase().indexOf(pat.toLowerCase()) !== -1) { hits++; line(esc(l)); }
      });
      if (!hits) line('<span class="t-dim">(no matches)</span>');
    },
    tree: function (args) {
      var root = normalize(args[0] || ".");
      var n = node(root);
      if (!n || n.type !== "dir") { line("tree: " + esc(args[0] || ".") + ": Not a directory"); return; }
      line('<span class="t-cyan">.</span>');
      (function walk(path, prefix, depth) {
        if (depth > 3) return;
        var entries = dirEntries(path, false) || [];
        entries.forEach(function (e, i) {
          var last = i === entries.length - 1;
          var child = node(path + "/" + e);
          var branch = last ? "└── " : "├── ";
          var isDir = child && child.type === "dir";
          line(prefix + branch + (isDir ? '<span class="t-cyan">' + esc(e) + "/</span>" : esc(e)));
          if (isDir) walk(path + "/" + e, prefix + (last ? "    " : "│   "), depth + 1);
        });
      })(root, "", 0);
    },
    touch: function (args) {
      if (!args.length) { line("touch: missing file operand"); return; }
      var target = normalize(args[0]);
      if (FS[target]) return;
      var slash = target.lastIndexOf("/");
      var parent = target.slice(0, slash) || "/";
      var name = target.slice(slash + 1);
      var pn = node(parent);
      if (!pn || pn.type !== "dir") { line("touch: cannot touch '" + esc(args[0]) + "': No such file or directory"); return; }
      pn.children.push(name);
      FS[target] = F([""]);
    },
    mkdir: function (args) {
      if (!args.length) { line("mkdir: missing operand"); return; }
      var target = normalize(args[0]);
      if (FS[target]) { line("mkdir: cannot create directory '" + esc(args[0]) + "': File exists"); return; }
      var slash = target.lastIndexOf("/");
      var parent = target.slice(0, slash) || "/";
      var name = target.slice(slash + 1);
      var pn = node(parent);
      if (!pn || pn.type !== "dir") { line("mkdir: cannot create directory '" + esc(args[0]) + "': No such file or directory"); return; }
      pn.children.push(name);
      FS[target] = D([]);
    },
    rm: function (args) {
      var flags = args.filter(function (a) { return a.charAt(0) === "-" && a.length > 1; });
      var paths = args.filter(function (a) { return a.charAt(0) !== "-" || a.length === 1; });
      var recursive = flags.some(function (f) { return f.indexOf("r") !== -1; });
      var force = flags.some(function (f) { return f.indexOf("f") !== -1; });
      if (!paths.length) { line("rm: missing operand"); return; }
      var joined = paths.join(" ");
      if (recursive && force && (joined === "/" || joined === "/*" || joined.indexOf("/etc") === 0)) {
        line('<span class="t-ok">nice try.</span> filesystem is immutable — disclosed responsibly.');
        return;
      }
      paths.forEach(function (p) {
        var target = normalize(p);
        var n = node(target);
        if (!n) {
          if (!force) line("rm: cannot remove '" + esc(p) + "': No such file or directory");
          return;
        }
        if (n.type === "dir" && !recursive) { line("rm: cannot remove '" + esc(p) + "': Is a directory"); return; }
        delete FS[target];
        var slash = target.lastIndexOf("/");
        var parent = node(target.slice(0, slash) || "/");
        var name = target.slice(slash + 1);
        if (parent && parent.children) {
          parent.children = parent.children.filter(function (c) { return c !== name; });
        }
      });
    },
    echo: function (args) {
      var text = args.join(" ").replace(/^["']|["']$/g, "");
      line(esc(text));
    },
    history: function () {
      hist.forEach(function (h, i) { line('<span class="t-dim">  ' + (i + 1) + "</span>  " + esc(h)); });
    },
    clear: function () { body.innerHTML = ""; },
    man: function (args) {
      var t = (args[0] || "").toLowerCase();
      var mans = {
        man: "man — the manual. you are reading it.",
        whoami: "whoami — prints the human behind the terminal.",
        cve: "cve — summary of CVE-2024-36436 (see: cat ~/cves/CVE-2024-36436.txt).",
        nmap: "nmap — scans the portfolio. findings: 2 open ports, 0 known exploits.",
        sudo: "sudo — try it. see what happens.",
        ls: "ls — list directory contents. -l long form, -a show dotfiles.",
        cd: "cd — change directory. cd ~ home, cd - previous, cd / root."
      };
      line(mans[t] || "No manual entry for " + esc(t || "?"));
    },
    nmap: async function (args) {
      var host = args.filter(function (a) { return a.charAt(0) !== "-"; })[0] || "imoaz.me";
      line("Starting Nmap 7.94 ( https://nmap.org ) at " + new Date().toUTCString());
      line("Nmap scan report for <span class=\"t-amber\">" + esc(host) + "</span>");
      line("Host is up (0.00042s latency).");
      await wait(500);
      line("PORT     STATE  SERVICE");
      line("443/tcp  open   https   <span class=\"t-dim\">portfolio, hardened</span>");
      line("1337/tcp open   elite   <span class=\"t-dim\">bugbounty</span>");
      await wait(450);
      line("Nmap done: 1 host up scanned in 2.04 seconds");
    },
    ping: async function (args) {
      var host = args.filter(function (a) { return a.charAt(0) !== "-"; })[0] || "imoaz.me";
      line("PING " + esc(host) + " 56(84) bytes of data.");
      await wait(420);
      line("64 bytes from " + esc(host) + ": icmp_seq=1 ttl=64 time=0.042 ms");
      await wait(420);
      line("64 bytes from " + esc(host) + ": icmp_seq=2 ttl=64 time=0.038 ms");
      await wait(420);
      line("<span class=\"t-dim\">--- " + esc(host) + " ping statistics ---</span>");
      line("2 packets transmitted, 2 received, 0% packet loss");
    },
    whois: function (args) {
      var t = (args[0] || "moaaz").toLowerCase();
      if (t === "moaaz" || t === "imoaz.me") {
        line("Registry:    PORTFOLIO-WHOIS");
        line("Name:        MOAAZ AFIFI");
        line("Role:        Cybersecurity Engineer & Penetration Tester");
        line("Creds:       eCPPT · eWPTX · eMAPT · CVE-2024-36436");
        line("Status:      open for pentest & research work");
        line("Contact:     imooaaz@gmail.com");
      } else {
        line("whois: " + esc(t) + ": not found in this registry");
      }
    },
    sudo: function (args) {
      if (args.join(" ") === "make me a sandwich") {
        line('<span class="t-ok">okay.</span> 🥪');
        return;
      }
      line("moaaz is not in the sudoers file. <span class=\"t-dim\">This incident will be reported.</span>");
    },
    exit: function () {
      line('<span class="t-dim">there is no escape — only disclosures.</span>');
    },
    /* portfolio aliases */
    cve: function () { COMMANDS.cat(["~/cves/CVE-2024-36436.txt"]); },
    experience: function () { COMMANDS.cat(["~/experience.log"]); },
    skills: function () { COMMANDS.cat(["~/skills.json"]); },
    contact: function () { COMMANDS.cat(["~/contact.md"]); },
    blog: function () {
      line("writeups & reports:");
      line('  <a href="/blog/fuzz-the-type/" style="color:var(--amber)">fuzz the type, not just the value</a>');
      line('  <a href="/blog/comments-to-rce/" style="color:var(--amber)">from comments to command execution (RCE)</a>');
      line('  <a href="/blog/waf-bypass/" style="color:var(--amber)">from frustration to exploitation — WAF bypass</a>');
      line('<span class="t-dim">or: cat ~/blog/ · https://imoaaz.me/blog/</span>');
    }
  };

  /* /usr/bin lists whatever the shell can run */
  FS["/usr/bin"].children = Object.keys(COMMANDS).sort();

  function run(raw) {
    var input = raw.trim();
    if (!input) return;
    hist.push(input);
    histIdx = hist.length;
    line('<span class="p">moaaz@imoaaz:' + shortCwd() + "$ </span>" + esc(input), "cmd");

    var parts = input.split(/\s+/);
    var name = parts[0].toLowerCase();
    var args = parts.slice(1);
    var fn = COMMANDS[name];
    if (fn) {
      fn(args);
    } else {
      line("bash: " + esc(name) + ": command not found — <span class=\"t-dim\">type</span> <span class=\"t-cyan\">help</span>");
    }
    body.scrollTop = body.scrollHeight;
  }

  /* ---------------- boot sequence ---------------- */
  var boot = [
    { cmd: "whoami", out: function () {
        line("moaaz_afifi — <span class=\"t-dim\">cybersecurity engineer &amp; pentester</span>");
      } },
    { cmd: "cat focus.txt", out: function () {
        line("web &amp; mobile pentest <span class=\"t-dim\">/</span> appsec <span class=\"t-dim\">/</span> devsecops <span class=\"t-dim\">/</span> ai security");
      } },
    { cmd: "ls cves/", out: function () {
        line('<span class="t-amber">CVE-2024-36436</span>  eCPPT  eWPTX  eMAPT  eAIS');
      } },
    { cmd: "./status.sh", out: function () {
        line('<span class="t-ok">[ok]</span> open for pentest &amp; research work');
      } }
  ];

  /* a chip click mid-boot fast-forwards the rest instead of interleaving */
  var fastBoot = reduced;
  function pause(ms) { return fastBoot ? Promise.resolve() : wait(ms); }

  async function typeCmd(cmd) {
    var p = line('<span class="p">$ </span><span class="c"></span>', "cmd");
    var target = p.querySelector(".c");
    for (var i = 0; i <= cmd.length; i++) {
      if (fastBoot) { target.textContent = cmd; break; }
      target.textContent = cmd.slice(0, i);
      body.scrollTop = body.scrollHeight;
      await wait(55);
    }
  }

  var bootPromise = null;
  function bootSequence() {
    if (!bootPromise) bootPromise = runBoot();
    return bootPromise;
  }
  async function runBoot() {
    for (var i = 0; i < boot.length; i++) {
      await typeCmd(boot[i].cmd);
      await pause(160);
      boot[i].out();
      await pause(340);
    }
    await pause(200);
    finishBoot();
  }

  function finishBoot() {
    line('<span class="t-dim">[~] type help — TAB completes paths, ↑ recalls · this shell is real-ish</span>');
    inputRow.hidden = false;
    realInput.tabIndex = 0;
    setPrompt();
  }

  if ("IntersectionObserver" in window) {
    var tio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            tio.disconnect();
            bootSequence();
          }
        });
      },
      { threshold: 0.35 }
    );
    tio.observe(term);
  } else {
    bootSequence();
  }

  /* ---------------- input handling ---------------- */
  term.addEventListener("click", function () {
    /* don't steal the click while the visitor is selecting output */
    var sel = window.getSelection && String(window.getSelection());
    if (sel) return;
    if (!inputRow.hidden) realInput.focus({ preventScroll: true });
  });

  realInput.addEventListener("input", function () {
    mirror.textContent = realInput.value;
  });

  realInput.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") {
      var val = realInput.value;
      realInput.value = "";
      mirror.textContent = "";
      run(val);
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      if (histIdx > 0) {
        histIdx--;
        realInput.value = hist[histIdx] || "";
        mirror.textContent = realInput.value;
      }
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      if (histIdx < hist.length) {
        histIdx++;
        realInput.value = hist[histIdx] || "";
        mirror.textContent = realInput.value;
      }
    } else if (ev.key === "Tab") {
      ev.preventDefault();
      tabComplete();
    } else if (ev.key === "l" && ev.ctrlKey) {
      ev.preventDefault();
      COMMANDS.clear();
    } else if (ev.key === "c" && ev.ctrlKey) {
      ev.preventDefault();
      line('<span class="p">moaaz@imoaaz:' + shortCwd() + "$ </span>" + esc(realInput.value) + "<span class=\"t-dim\">^C</span>", "cmd");
      realInput.value = "";
      mirror.textContent = "";
    }
    body.scrollTop = body.scrollHeight;
  });

  function tabComplete() {
    var val = realInput.value;
    var space = val.lastIndexOf(" ");
    var pool, prefix, dirBase;

    if (space === -1) {
      pool = Object.keys(COMMANDS);
      prefix = val;
      dirBase = null;
    } else {
      var head = val.slice(0, space + 1);
      var tail = val.slice(space + 1);
      var cmdName = head.trim().toLowerCase();
      var slash = tail.lastIndexOf("/");
      if (slash === -1) {
        dirBase = cwd;
        prefix = tail;
      } else {
        dirBase = tail.slice(0, slash) || "/";
        prefix = tail.slice(slash + 1);
      }
      var dn = node(dirBase);
      if (!dn || dn.type !== "dir") return;
      pool = dn.children.filter(function (c) { return c.charAt(0) !== "."; });
    }

    var matches = pool.filter(function (c) {
      return c.lastIndexOf(prefix, 0) === 0;
    });

    if (matches.length === 1) {
      var m = matches[0];
      var n = node((dirBase ? (dirBase === "/" ? "" : dirBase) + "/" : "") + m);
      var isDir = n && n.type === "dir";
      if (space === -1) {
        realInput.value = m + " ";
      } else {
        var headStr = val.slice(0, space + 1);
        var tailStr = val.slice(space + 1);
        var tailDir = tailStr.lastIndexOf("/") === -1 ? "" : tailStr.slice(0, tailStr.lastIndexOf("/") + 1);
        realInput.value = headStr + tailDir + m + (isDir ? "/" : " ");
      }
      mirror.textContent = realInput.value;
    } else if (matches.length > 1) {
      line('<span class="p">moaaz@imoaaz:' + shortCwd() + "$ </span>" + esc(val), "cmd");
      line(matches.join("  "));
      body.scrollTop = body.scrollHeight;
    }
  }

  /* chip shortcuts */
  document.querySelectorAll("#term-chips button").forEach(function (b) {
    b.addEventListener("click", function () {
      fastBoot = true;
      bootSequence().then(function () {
        run(b.getAttribute("data-cmd"));
        realInput.focus({ preventScroll: true });
      });
    });
  });
})();
