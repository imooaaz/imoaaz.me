/* imoaaz — interactive terminal.
   A small zsh-flavoured shell running entirely in the browser:
   virtual filesystem, pipes, redirection, globbing, variables, history,
   tab completion — plus a few commands that return live data
   (dig / nslookup / host over DNS-over-HTTPS, curl against this site,
   base64 / sha*sum via the Web Crypto API). No dependencies. */

(function () {
  "use strict";

  var term = document.getElementById("term");
  if (!term) return;

  var screen = document.getElementById("term-screen");
  var out = document.getElementById("term-out");
  var inputRow = document.getElementById("term-input-row");
  var promptEl = document.getElementById("term-prompt");
  var tiBefore = document.getElementById("ti-before");
  var tiCursor = document.getElementById("ti-cursor");
  var tiAfter = document.getElementById("ti-after");
  var input = document.getElementById("term-real-input");
  var titleEl = document.getElementById("term-title");
  var closedEl = document.getElementById("term-closed");
  var reopenBtn = document.getElementById("term-reopen");

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BOOT_TIME = Date.now();

  /* ============================================================ utils */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function pad(s, n) { s = String(s); while (s.length < n) s += " "; return s; }
  function lpad(s, n) { s = String(s); while (s.length < n) s = " " + s; return s; }
  function rand(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function lsDate(d) { return MON[d.getMonth()] + " " + lpad(d.getDate(), 2) + " " + two(d.getHours()) + ":" + two(d.getMinutes()); }
  function unixDate(d) {
    return DAY[d.getDay()] + " " + MON[d.getMonth()] + " " + lpad(d.getDate(), 2) + " " +
      two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds()) + " " +
      (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC") + " " + d.getFullYear();
  }
  function fmtUptime(ms) {
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    if (h) return h + ":" + two(m % 60);
    return m + " min";
  }
  function levenshtein(a, b) {
    var dp = [], i, j;
    for (i = 0; i <= a.length; i++) { dp[i] = [i]; }
    for (j = 0; j <= b.length; j++) { dp[0][j] = j; }
    for (i = 1; i <= a.length; i++) {
      for (j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return dp[a.length][b.length];
  }
  function humanSize(n) {
    if (n < 1024) return n + "B";
    if (n < 1048576) return (n / 1024).toFixed(1).replace(/\.0$/, "") + "K";
    return (n / 1048576).toFixed(1).replace(/\.0$/, "") + "M";
  }

  /* ======================================================= filesystem */
  var USER = "moaaz", HOST = "imoaaz", HOME = "/home/moaaz";
  var FS = {};
  var t0 = new Date(2026, 8, 14, 21, 37);

  function mk(path, node) {
    node.mtime = node.mtime || new Date(t0.getTime() + rand(0, 40) * 86400000 + rand(0, 86400) * 1000);
    node.owner = node.owner || (path.indexOf(HOME) === 0 ? USER : "root");
    if (!node.mode) node.mode = node.type === "dir" ? "drwxr-xr-x" : "-rw-r--r--";
    FS[path] = node;
    if (path !== "/") {
      var parent = path.slice(0, path.lastIndexOf("/")) || "/";
      var name = path.slice(path.lastIndexOf("/") + 1);
      if (!FS[parent]) mk(parent, { type: "dir", children: [] });
      if (FS[parent].children.indexOf(name) === -1) FS[parent].children.push(name);
    }
  }
  function dir(path, extra) { mk(path, Object.assign({ type: "dir", children: [] }, extra || {})); }
  function file(path, content, extra) { mk(path, Object.assign({ type: "file", content: content }, extra || {})); }

  function buildFS() {
    FS = {};
    dir("/");
    ["bin", "boot", "dev", "etc", "home", "opt", "proc", "root", "srv", "tmp", "usr", "var"].forEach(function (d) { dir("/" + d); });
    FS["/root"].mode = "drwx------"; FS["/root"].denied = true;
    FS["/tmp"].mode = "drwxrwxrwt";
    file("/dev/null", "", { mode: "crw-rw-rw-" });
    file("/dev/random", "", { mode: "crw-rw-rw-" });

    file("/etc/hostname", "imoaaz\n");
    file("/etc/os-release", [
      'PRETTY_NAME="PortfolioOS 2.0 (hardened)"',
      'NAME="PortfolioOS"',
      'VERSION_ID="2.0"',
      "ID=portfolio",
      "ID_LIKE=debian",
      'HOME_URL="https://imoaaz.pages.dev"',
      'SUPPORT_URL="mailto:imooaaz@gmail.com"'
    ].join("\n") + "\n");
    file("/etc/passwd", [
      "root:x:0:0:root:/root:/bin/bash",
      "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
      "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin",
      "sshd:x:110:65534::/run/sshd:/usr/sbin/nologin",
      "moaaz:x:1000:1000:Moaaz Afifi,,,:/home/moaaz:/bin/zsh"
    ].join("\n") + "\n");
    file("/etc/shadow", "", { mode: "-rw-r-----", denied: true });
    file("/etc/hosts", "127.0.0.1\tlocalhost\n127.0.1.1\timoaaz\n::1\t\tlocalhost ip6-localhost\n");
    file("/etc/motd", "Authorized use only. All activity is responsibly disclosed.\n");
    file("/etc/shells", "/bin/sh\n/bin/bash\n/bin/zsh\n");

    file("/proc/version", "Linux version 6.6.0-hardened (builder@imoaaz) (gcc 13.2.0) #1 SMP PREEMPT_DYNAMIC\n");
    file("/proc/cpuinfo", "processor\t: 0\nvendor_id\t: GenuineIntel\nmodel name\t: Virtual CPU @ 3.10GHz\ncpu cores\t: " + (navigator.hardwareConcurrency || 4) + "\nflags\t\t: fpu vme sse sse2 avx avx2 aes sha_ni\n");

    file("/var/log/auth.log", [
      "Nov  1 08:59:12 imoaaz sshd[1337]: Accepted publickey for moaaz from 127.0.0.1 port 51234 ssh2",
      "Nov  1 08:59:12 imoaaz sshd[1337]: pam_unix(sshd:session): session opened for user moaaz",
      "Nov  1 09:02:41 imoaaz sudo:    moaaz : user NOT in sudoers ; TTY=pts/0 ; PWD=/home/moaaz ; USER=root",
      "Nov  1 09:03:05 imoaaz sshd[2048]: Invalid user admin from 203.0.113.7 port 40022",
      "Nov  1 09:03:06 imoaaz fail2ban[611]: Ban 203.0.113.7"
    ].join("\n") + "\n", { mode: "-rw-r-----" });
    dir("/var/www");
    file("/var/www/index.html", "<!-- you are looking at it -->\n");

    var H = HOME;
    dir(H);
    file(H + "/README.md", [
      "# Moaaz Afifi",
      "",
      "Cybersecurity engineer, penetration tester, and co-founder of Raqyan.",
      "",
      "Start here:",
      "  cat about.txt          who I am",
      "  cat experience.log     where I've worked",
      "  ls cves/               published vulnerabilities",
      "  ls blog/               write-ups",
      "  neofetch               system summary",
      "",
      "Some files are hidden. ls -a might help."
    ].join("\n") + "\n");
    file(H + "/about.txt", [
      "Moaaz Afifi: cybersecurity engineer, penetration tester, and",
      "co-founder of Raqyan, where I lead product delivery, product",
      "security, and DevOps & DevSecOps.",
      "",
      "I came to security from software development. I read code, not",
      "just responses: an exploit only makes sense once you understand",
      "what the developer intended."
    ].join("\n") + "\n");
    file(H + "/focus.txt", "web & mobile pentesting / appsec / product security / devsecops / ai security\n");
    file(H + "/skills.json", [
      "{",
      '  "offensive":   ["web pentesting", "mobile pentesting", "vulnerability research", "red teaming", "bug bounty"],',
      '  "product":     ["application security", "product security", "devsecops", "secure sdlc", "ai security"],',
      '  "engineering": ["devops & ci/cd", "javascript / node.js", "mongodb", "linux", "secure code review"]',
      "}"
    ].join("\n") + "\n");
    file(H + "/experience.log", [
      "present        Raqyan         Co-Founder & Product Engineer",
      "2023-present   HackerOne      Cyber Security Researcher",
      "2025-present   GCC            Security Consultant & Penetration Tester",
      "2025           Robusta (RTG)  Application Security Engineer",
      "2023-2024      Cybrany        Offensive Security Engineer"
    ].join("\n") + "\n");
    file(H + "/contact.md", [
      "email     imooaaz@gmail.com",
      "linkedin  linkedin.com/in/imooaaz",
      "github    github.com/m0442",
      "x         x.com/imooaaz",
      "medium    imooaaz.medium.com",
      "disclose  /.well-known/security.txt"
    ].join("\n") + "\n");
    file(H + "/.zshrc", [
      "export EDITOR=vim",
      "export PATH=$HOME/.local/bin:$PATH",
      "alias ll='ls -la'",
      "alias la='ls -a'",
      "alias please='sudo'",
      "setopt HIST_IGNORE_DUPS",
      "PROMPT='%n@%m %1~ %# '"
    ].join("\n") + "\n");
    file(H + "/.zsh_history", ": 1730451661:0;nmap -sV -p- target.local\n: 1730451702:0;ffuf -w wordlist.txt -u https://target/FUZZ\n: 1730451790:0;cat notes/report.md\n");
    dir(H + "/.ssh", { mode: "drwx------" });
    file(H + "/.ssh/id_ed25519.pub", "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMoaazAfifiPortfolioKeyNotARealKey moaaz@imoaaz\n");
    file(H + "/.ssh/id_ed25519", "", { mode: "-rw-------", denied: true });
    file(H + "/.ssh/known_hosts", "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl\n");
    dir(H + "/.secret", { mode: "drwx------" });
    file(H + "/.secret/flag.txt", "flag{y0u_l00k3d_wh3r3_0th3rs_d1dnt}\n\nNice find. Curiosity is the job. Say hi: imooaaz@gmail.com\n", { mode: "-rw-------" });

    dir(H + "/cves");
    file(H + "/cves/CVE-2024-36436.txt", [
      "CVE-2024-36436: WishList Member X (WordPress plugin)",
      "",
      "class    : Exposure of Sensitive Information (CWE-200)",
      "impact   : the plugin's REST API secret key was returned in",
      "           plaintext to unauthenticated users in an AJAX response",
      "status   : patched",
      "found by : Moaaz Afifi, via coordinated disclosure"
    ].join("\n") + "\n");

    dir(H + "/blog");
    file(H + "/blog/fuzz-the-type.md", "# Fuzz the type, not just the value\n\nhttps://imoaaz.pages.dev/blog/fuzz-the-type/\n");
    file(H + "/blog/comments-to-rce.md", "# From Comments to Command Execution\n\nhttps://imoaaz.pages.dev/blog/comments-to-rce/\n");
    file(H + "/blog/waf-bypass.md", "# How a Link Shortener Helped Me Bypass WAF\n\nhttps://imoaaz.pages.dev/blog/waf-bypass/\n");

    dir(H + "/certs");
    file(H + "/certs/eCPPT.txt", "eCPPT: Certified Professional Penetration Tester (INE / eLearnSecurity)\n");
    file(H + "/certs/eWPTX.txt", "eWPTX: Web Penetration Tester eXtreme (INE / eLearnSecurity)\n");
    file(H + "/certs/eMAPT.txt", "eMAPT: Mobile Application Penetration Tester (INE / eLearnSecurity)\n");
    file(H + "/certs/eAIS.txt", "eAIS: AI Systems Security Specialist (INE / eLearnSecurity)\n");

    dir(H + "/projects");
    file(H + "/projects/raqyan.md", [
      "# Raqyan",
      "",
      "role : Co-Founder & Product Engineer",
      "own  : software product delivery",
      "       product security",
      "       DevOps & DevSecOps pipeline"
    ].join("\n") + "\n");
    file(H + "/projects/scan.sh", "#!/usr/bin/env bash\n# quick recon wrapper\nset -euo pipefail\nnmap -sC -sV -oN \"scan-$1.txt\" \"$1\"\n", { mode: "-rwxr-xr-x" });
    dir(H + "/Downloads");
    dir(H + "/notes");
    file(H + "/notes/todo.txt", "- write up the next finding\n- rotate keys\n- touch grass\n");
  }

  /* ============================================================ state */
  var S;
  function resetState() {
    buildFS();
    S = {
      cwd: HOME,
      env: {
        USER: USER, LOGNAME: USER, HOME: HOME, HOSTNAME: HOST, SHELL: "/bin/zsh",
        TERM: "xterm-256color", LANG: "en_US.UTF-8", PATH: "/usr/local/bin:/usr/bin:/bin",
        PWD: HOME, OLDPWD: HOME, EDITOR: "vim", PAGER: "less"
      },
      aliases: { ll: "ls -la", la: "ls -a", l: "ls -CF", please: "sudo" },
      hist: [],
      histIdx: 0,
      draft: "",
      last: 0,
      busy: false,
      abort: null,
      pw: null
    };
  }

  function normalize(p) {
    if (p === undefined || p === "") return S.cwd;
    if (p === "~") return HOME;
    if (p.indexOf("~/") === 0) p = HOME + p.slice(1);
    var parts = (p.charAt(0) === "/" ? p : S.cwd + "/" + p).split("/");
    var stack = [];
    parts.forEach(function (seg) {
      if (!seg || seg === ".") return;
      if (seg === "..") stack.pop(); else stack.push(seg);
    });
    return "/" + stack.join("/");
  }
  function node(p) { return FS[normalize(p)] || null; }
  function shortPath(p) {
    if (p === HOME) return "~";
    if (p.indexOf(HOME + "/") === 0) return "~" + p.slice(HOME.length);
    return p;
  }
  function basename(p) { var i = p.lastIndexOf("/"); return i === -1 ? p : p.slice(i + 1); }
  function parentOf(p) { return p.slice(0, p.lastIndexOf("/")) || "/"; }
  function sizeOf(n) { return n.type === "dir" ? 4096 : (n.content || "").length; }
  function lines(text) {
    if (!text) return [];
    var a = text.split("\n");
    if (a[a.length - 1] === "") a.pop();
    return a;
  }
  function writeFile(path, content, append) {
    var full = normalize(path);
    if (full === "/dev/null") return true;
    var n = FS[full];
    if (n && n.type === "dir") return "is a directory";
    if (n && n.denied) return "permission denied";
    var par = FS[parentOf(full)];
    if (!par || par.type !== "dir") return "no such file or directory";
    if (parentOf(full).indexOf(HOME) !== 0 && parentOf(full) !== "/tmp") return "permission denied";
    if (n) { n.content = append ? n.content + content : content; n.mtime = new Date(); }
    else file(full, content, { mtime: new Date(), owner: USER });
    return true;
  }
  function removePath(full) {
    Object.keys(FS).forEach(function (k) { if (k === full || k.indexOf(full + "/") === 0) delete FS[k]; });
    var par = FS[parentOf(full)];
    if (par) par.children = par.children.filter(function (c) { return c !== basename(full); });
  }

  /* ========================================================== output */
  function scrollDown() { screen.scrollTop = screen.scrollHeight; }
  function printHTML(html) {
    var p = document.createElement("p");
    p.className = "term-line";
    p.innerHTML = html === "" ? "&nbsp;" : html;
    out.appendChild(p);
    while (out.childNodes.length > 600) out.removeChild(out.firstChild);
    scrollDown();
    return p;
  }
  function promptHTML() {
    return '<span class="p-user">' + USER + "@" + HOST + '</span> <span class="p-path">' +
      esc(shortPath(S.cwd).split("/").pop() || "/") + '</span> <span class="p-sym">%</span> ';
  }
  function setTitle(cmd) {
    titleEl.textContent = USER + " — " + (cmd || "-zsh") + " — 80×24";
  }

  /* Output items are { t: plain text, h: html }; pipes and redirects use .t */
  function L(text, html) { return { t: text, h: html === undefined ? esc(text) : html }; }

  /* ========================================================= parsing */
  function tokenize(src) {
    var toks = [], cur = "", has = false, quoted = false, i = 0, c;
    function push() { if (has) toks.push({ w: cur, q: quoted }); cur = ""; has = false; quoted = false; }
    while (i < src.length) {
      c = src[i];
      if (c === "'") {
        var j = src.indexOf("'", i + 1);
        if (j === -1) return { error: "unmatched '" };
        cur += src.slice(i + 1, j); has = true; quoted = true; i = j + 1; continue;
      }
      if (c === '"') {
        var k = i + 1, buf = "";
        while (k < src.length && src[k] !== '"') {
          if (src[k] === "\\" && k + 1 < src.length) { buf += src[k + 1]; k += 2; continue; }
          buf += src[k]; k++;
        }
        if (k >= src.length) return { error: 'unmatched "' };
        cur += expandVars(buf); has = true; quoted = true; i = k + 1; continue;
      }
      if (c === "\\" && i + 1 < src.length) { cur += src[i + 1]; has = true; i += 2; continue; }
      if (c === " " || c === "\t") { push(); i++; continue; }
      if (c === "|" && src[i + 1] === "|") { push(); toks.push({ op: "||" }); i += 2; continue; }
      if (c === "&" && src[i + 1] === "&") { push(); toks.push({ op: "&&" }); i += 2; continue; }
      if (c === "2" && src[i + 1] === ">" && !has) { push(); toks.push({ op: "2>" }); i += 2; continue; }
      if (c === ">" && src[i + 1] === ">") { push(); toks.push({ op: ">>" }); i += 2; continue; }
      if (c === "|" || c === ">" || c === "<" || c === ";") { push(); toks.push({ op: c }); i++; continue; }
      if (c === "$") {
        var m = /^\$(\?|\{[A-Za-z_][A-Za-z0-9_]*\}|[A-Za-z_][A-Za-z0-9_]*)/.exec(src.slice(i));
        if (m) { cur += expandVars(m[0]); has = true; i += m[0].length; continue; }
      }
      cur += c; has = true; i++;
    }
    push();
    return { toks: toks };
  }
  function expandVars(s) {
    return s.replace(/\$(\?|\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g, function (_, all, br, nm) {
      if (all === "?") return String(S.last);
      var k = br || nm;
      return S.env[k] !== undefined ? S.env[k] : "";
    });
  }
  function expandWord(tok) {
    var w = tok.w;
    if (tok.q) return [w];
    if (w === "~" || w.indexOf("~/") === 0) w = HOME + w.slice(1);
    if (/[*?]/.test(w)) {
      var slash = w.lastIndexOf("/");
      var d = slash === -1 ? "" : w.slice(0, slash + 1);
      var pat = slash === -1 ? w : w.slice(slash + 1);
      var dn = node(d || ".");
      if (dn && dn.type === "dir" && !/[*?]/.test(d)) {
        var re = new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
        var hits = dn.children.filter(function (c) { return re.test(c) && (pat.charAt(0) === "." || c.charAt(0) !== "."); }).sort();
        if (hits.length) return hits.map(function (h) { return d + h; });
      }
      return { nomatch: tok.w };
    }
    return [w];
  }

  /* Split tokens into a list of { pipeline:[{argv, out, append, errNull}], op } */
  function parse(toks) {
    var chain = [], pipeline = [], cmd = { argv: [], out: null, append: false, errNull: false, inFile: null };
    function endCmd() {
      if (cmd.argv.length || cmd.out) pipeline.push(cmd);
      cmd = { argv: [], out: null, append: false, errNull: false, inFile: null };
    }
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t.op === "|") { endCmd(); continue; }
      if (t.op === ">" || t.op === ">>" || t.op === "2>" || t.op === "<") {
        var target = toks[i + 1];
        if (!target || target.op) return { error: "parse error near `" + t.op + "'" };
        i++;
        if (t.op === "2>") { cmd.errNull = true; continue; }
        if (t.op === "<") { cmd.inFile = target.w; continue; }
        cmd.out = target.w; cmd.append = t.op === ">>";
        continue;
      }
      if (t.op === "&&" || t.op === "||" || t.op === ";") {
        endCmd();
        if (pipeline.length) chain.push({ pipeline: pipeline, op: t.op });
        pipeline = [];
        continue;
      }
      var ex = expandWord(t);
      if (ex.nomatch) return { error: "no matches found: " + ex.nomatch };
      cmd.argv = cmd.argv.concat(ex);
    }
    endCmd();
    if (pipeline.length) chain.push({ pipeline: pipeline, op: null });
    return { chain: chain };
  }

  function splitFlags(args) {
    var flags = {}, rest = [], stop = false;
    args.forEach(function (a) {
      if (!stop && a === "--") { stop = true; return; }
      if (!stop && a.length > 1 && a.charAt(0) === "-" && !/^-\d+$/.test(a)) {
        if (a.charAt(1) === "-") flags[a.slice(2)] = true;
        else a.slice(1).split("").forEach(function (f) { flags[f] = true; });
      } else rest.push(a);
    });
    return { f: flags, a: rest };
  }

  /* ======================================================== commands */
  /* Each command: function (args, ctx) -> array of L() | Promise of that.
     ctx.stdin: array of strings or null; ctx.err(msg); ctx.live(item) streams. */
  var C = {};
  var DESC = {};
  function def(name, desc, fn) { C[name] = fn; DESC[name] = desc; }
  function alias(name, target) { C[name] = function (a, ctx) { return C[target](a, ctx); }; DESC[name] = DESC[target]; }

  /* ---------- navigation & files ---------- */
  def("pwd", "print working directory", function () { return [L(S.cwd)]; });

  def("cd", "change directory", function (args, ctx) {
    var t = args[0];
    if (t === undefined) t = HOME;
    if (t === "-") t = S.env.OLDPWD;
    var full = normalize(t), n = FS[full];
    if (!n) return ctx.err("cd: no such file or directory: " + args[0]);
    if (n.type !== "dir") return ctx.err("cd: not a directory: " + args[0]);
    if (n.denied) return ctx.err("cd: permission denied: " + args[0]);
    S.env.OLDPWD = S.cwd;
    S.cwd = full;
    S.env.PWD = full;
    if (args[0] === "-") return [L(shortPath(full))];
    return [];
  });

  function colorName(name, n) {
    if (!n) return esc(name);
    if (n.type === "dir") return '<span class="t-blue">' + esc(name) + "</span>";
    if (n.mode && n.mode.charAt(3) === "x") return '<span class="t-exec">' + esc(name) + "</span>";
    if (/\.(md|txt|log)$/.test(name)) return esc(name);
    if (/\.(json|sh)$/.test(name)) return '<span class="t-yellow">' + esc(name) + "</span>";
    return esc(name);
  }

  def("ls", "list directory contents", function (args, ctx) {
    var p = splitFlags(args), f = p.f, targets = p.a.length ? p.a : ["."];
    var res = [];
    /* like real ls: plain files are listed together first, then each directory */
    var fileTs = targets.filter(function (t) { var n = node(t); return n && n.type === "file"; });
    var dirTs = targets.filter(function (t) { var n = node(t); return !n || n.type !== "file"; });
    var groups = (fileTs.length ? [{ files: fileTs }] : []).concat(dirTs.map(function (t) { return { dir: t }; }));
    var multi = targets.length > 1;
    groups.forEach(function (g, ti) {
      var t = g.dir;
      var full = g.files ? null : normalize(t), n = g.files ? null : FS[full];
      if (!g.files && !n) { ctx.err("ls: cannot access '" + t + "': No such file or directory"); return; }
      if (n && n.denied && n.type === "dir") { ctx.err("ls: cannot open directory '" + t + "': Permission denied"); return; }
      var entries;
      if (g.files) entries = g.files.map(function (x) { return { name: x, n: node(x) }; });
      else {
        var names = n.children.slice().sort(function (a, b) { return a.replace(/^\./, "").localeCompare(b.replace(/^\./, "")); });
        if (!f.a && !f.A) names = names.filter(function (c) { return c.charAt(0) !== "."; });
        entries = names.map(function (c) { return { name: c, n: FS[(full === "/" ? "" : full) + "/" + c] }; });
        if (f.a) entries = [{ name: ".", n: n }, { name: "..", n: FS[parentOf(full)] || n }].concat(entries);
        if (f.t) entries.sort(function (x, y) { return y.n.mtime - x.n.mtime; });
        if (f.S) entries.sort(function (x, y) { return sizeOf(y.n) - sizeOf(x.n); });
        if (f.r) entries.reverse();
      }
      if (ti) res.push(L(""));
      if (multi && !g.files) res.push(L(t + ":"));
      if (f.l) {
        if (!g.files) res.push(L("total " + entries.length * 8));
        entries.forEach(function (e) {
          var sz = f.h ? humanSize(sizeOf(e.n)) : String(sizeOf(e.n));
          var grp = e.n.owner === "root" ? "root " : "staff";
          var nl = e.n.type === "dir" ? (e.n.children.length + 2) : 1;
          var pre = e.n.mode + "  " + lpad(nl, 2) + " " + pad(e.n.owner, 6) + grp + " " + lpad(sz, 6) + " " + lsDate(e.n.mtime) + " ";
          res.push(L(pre + e.name, esc(pre) + colorName(e.name, e.n)));
        });
      } else if (ctx.piped || ctx.redirected || f[1]) {
        entries.forEach(function (e) { res.push(L(e.name, colorName(e.name, e.n))); });
      } else if (entries.length) {
        var w = Math.max.apply(null, entries.map(function (e) { return e.name.length; })) + 2;
        var cols = Math.max(1, Math.floor(termCols() / w));
        for (var i = 0; i < entries.length; i += cols) {
          var row = entries.slice(i, i + cols);
          res.push(L(row.map(function (e) { return pad(e.name, w); }).join("").replace(/\s+$/, ""),
            row.map(function (e, j) { return colorName(e.name, e.n) + (j < row.length - 1 ? new Array(w - e.name.length + 1).join(" ") : ""); }).join("")));
        }
      }
    });
    return res;
  });
  alias("dir", "ls");

  function readFileLines(path, ctx, cmd) {
    var n = node(path);
    if (!n) { ctx.err(cmd + ": " + path + ": No such file or directory"); return null; }
    if (n.type === "dir") { ctx.err(cmd + ": " + path + ": Is a directory"); return null; }
    if (n.denied) { ctx.err(cmd + ": " + path + ": Permission denied"); return null; }
    return lines(n.content);
  }
  function inputLines(files, ctx, cmd) {
    if (!files.length) return ctx.stdin || [];
    var all = [];
    files.forEach(function (f) { var l = readFileLines(f, ctx, cmd); if (l) all = all.concat(l); });
    return all;
  }
  function linkify(s) {
    return esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  def("cat", "concatenate and print files", function (args, ctx) {
    var p = splitFlags(args);
    var src = inputLines(p.a, ctx, "cat");
    return src.map(function (l, i) {
      var pre = p.f.n ? lpad(i + 1, 6) + "  " : "";
      return L(pre + l, esc(pre) + linkify(l));
    });
  });
  alias("less", "cat");
  alias("more", "cat");
  alias("bat", "cat");

  function headTail(isHead) {
    return function (args, ctx) {
      var n = 10, files = [];
      for (var i = 0; i < args.length; i++) {
        if (args[i] === "-n") { n = parseInt(args[++i], 10) || 10; }
        else if (/^-\d+$/.test(args[i])) n = parseInt(args[i].slice(1), 10);
        else files.push(args[i]);
      }
      var src = inputLines(files, ctx, isHead ? "head" : "tail");
      return (isHead ? src.slice(0, n) : src.slice(-n)).map(function (l) { return L(l, linkify(l)); });
    };
  }
  def("head", "output the first part of files", headTail(true));
  def("tail", "output the last part of files", headTail(false));

  def("grep", "print lines that match patterns", function (args, ctx) {
    var p = splitFlags(args), f = p.f;
    if (!p.a.length) return ctx.err("usage: grep [-ivnc] [-r] pattern [file ...]");
    var pat = p.a[0], files = p.a.slice(1);
    var re;
    try { re = new RegExp(pat, f.i ? "gi" : "g"); } catch (e) { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), f.i ? "gi" : "g"); }
    var targets = [];
    if (f.r || f.R) {
      var roots = files.length ? files : ["."];
      roots.forEach(function (r) {
        var base = normalize(r);
        Object.keys(FS).sort().forEach(function (k) {
          if ((k === base || k.indexOf(base === "/" ? "/" : base + "/") === 0) && FS[k].type === "file" && !FS[k].denied) {
            targets.push({ label: k.indexOf(S.cwd + "/") === 0 ? k.slice(S.cwd.length + 1) : k, lines: lines(FS[k].content) });
          }
        });
      });
    } else if (files.length) {
      files.forEach(function (fn) { var l = readFileLines(fn, ctx, "grep"); if (l) targets.push({ label: fn, lines: l }); });
    } else targets.push({ label: "", lines: ctx.stdin || [] });
    var res = [], count = 0, multi = targets.length > 1;
    targets.forEach(function (t) {
      var c = 0;
      t.lines.forEach(function (l, i) {
        re.lastIndex = 0;
        var hit = re.test(l);
        if (f.v) hit = !hit;
        if (!hit) return;
        c++;
        if (f.c || f.l) return;
        var pre = (multi ? t.label + ":" : "") + (f.n ? (i + 1) + ":" : "");
        re.lastIndex = 0;
        var html = f.v ? esc(l) : esc(l).replace(new RegExp(re.source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), re.flags), function (m) { return '<span class="t-red t-bold">' + m + "</span>"; });
        res.push(L(pre + l, (pre ? '<span class="t-magenta">' + esc(pre) + "</span>" : "") + html));
      });
      if (f.c) res.push(L((multi ? t.label + ":" : "") + c));
      if (f.l && c) res.push(L(t.label, '<span class="t-magenta">' + esc(t.label) + "</span>"));
      count += c;
    });
    if (!count) S.lastPipeCode = 1;
    return res;
  });
  alias("egrep", "grep");

  def("find", "search for files in a directory hierarchy", function (args, ctx) {
    var start = ".", name = null, type = null, i = 0;
    if (args[0] && args[0].charAt(0) !== "-") { start = args[0]; i = 1; }
    for (; i < args.length; i++) {
      if (args[i] === "-name" || args[i] === "-iname") name = { pat: args[++i], ci: args[i - 1] === "-iname" };
      else if (args[i] === "-type") type = args[++i];
    }
    var base = normalize(start);
    if (!FS[base]) return ctx.err("find: '" + start + "': No such file or directory");
    var re = name ? new RegExp("^" + name.pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", name.ci ? "i" : "") : null;
    var res = [];
    Object.keys(FS).sort().forEach(function (k) {
      if (!(k === base || k.indexOf(base === "/" ? "/" : base + "/") === 0)) return;
      var rel = start === "." ? (k === base ? "." : "./" + k.slice(base.length + (base === "/" ? 0 : 1))) : (start.replace(/\/$/, "") + k.slice(base.length));
      var parentDenied = Object.keys(FS).some(function (d) { return FS[d].denied && FS[d].type === "dir" && k.indexOf(d + "/") === 0; });
      if (parentDenied) return;
      if (type && ((type === "f" && FS[k].type !== "file") || (type === "d" && FS[k].type !== "dir"))) return;
      if (re && !re.test(basename(k))) return;
      res.push(L(rel));
      if (FS[k].denied && FS[k].type === "dir") ctx.err("find: '" + rel + "': Permission denied");
    });
    return res;
  });

  def("tree", "list contents of directories in a tree-like format", function (args, ctx) {
    var p = splitFlags(args), root = normalize(p.a[0] || "."), n = FS[root];
    if (!n || n.type !== "dir") return ctx.err((p.a[0] || ".") + " [error opening dir]");
    var res = [L(p.a[0] || ".", '<span class="t-blue">' + esc(p.a[0] || ".") + "</span>")], dirs = 0, files = 0;
    (function walk(path, prefix, depth) {
      var node0 = FS[path];
      if (node0.denied || depth > 4) return;
      var kids = node0.children.filter(function (c) { return p.f.a || c.charAt(0) !== "."; }).sort();
      kids.forEach(function (c, i) {
        var last = i === kids.length - 1, child = FS[(path === "/" ? "" : path) + "/" + c];
        var br = prefix + (last ? "└── " : "├── ");
        res.push(L(br + c, esc(br) + colorName(c, child)));
        if (child.type === "dir") { dirs++; walk((path === "/" ? "" : path) + "/" + c, prefix + (last ? "    " : "│   "), depth + 1); }
        else files++;
      });
    })(root, "", 0);
    res.push(L(""));
    res.push(L(dirs + " directories, " + files + " files"));
    return res;
  });

  def("wc", "print newline, word, and byte counts", function (args, ctx) {
    var p = splitFlags(args), f = p.f;
    var src = inputLines(p.a, ctx, "wc");
    var text = src.join("\n") + (src.length ? "\n" : "");
    var l = src.length, w = text.split(/\s+/).filter(Boolean).length, c = text.length;
    var any = f.l || f.w || f.c || f.m;
    var parts = [];
    if (!any || f.l) parts.push(lpad(l, any ? 0 : 7));
    if (!any || f.w) parts.push(lpad(w, any ? 0 : 7));
    if (!any || f.c || f.m) parts.push(lpad(c, any ? 0 : 7));
    return [L(parts.join(any ? " " : " ") + (p.a.length === 1 ? " " + p.a[0] : ""))];
  });

  def("sort", "sort lines of text", function (args, ctx) {
    var p = splitFlags(args), src = inputLines(p.a, ctx, "sort").slice();
    src.sort(p.f.n ? function (a, b) { return parseFloat(a) - parseFloat(b); } : function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
    if (p.f.r) src.reverse();
    if (p.f.u) src = src.filter(function (l, i) { return i === 0 || l !== src[i - 1]; });
    return src.map(function (l) { return L(l); });
  });
  def("uniq", "report or omit repeated lines", function (args, ctx) {
    var p = splitFlags(args), src = inputLines(p.a, ctx, "uniq"), res = [], prev = null, c = 0;
    function flush() { if (prev !== null) res.push(L(p.f.c ? lpad(c, 7) + " " + prev : prev)); }
    src.forEach(function (l) { if (l === prev) c++; else { flush(); prev = l; c = 1; } });
    flush();
    return res;
  });
  def("cut", "remove sections from each line", function (args, ctx) {
    var d = "\t", fields = null, files = [];
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      if (a === "-d") d = args[++i];
      else if (a.indexOf("-d") === 0) d = a.slice(2);
      else if (a === "-f") fields = args[++i];
      else if (a.indexOf("-f") === 0) fields = a.slice(2);
      else files.push(a);
    }
    if (!fields) return ctx.err("cut: you must specify a list of fields");
    var want = [];
    fields.split(",").forEach(function (r) {
      var m = r.split("-"), a0 = parseInt(m[0], 10) || 1, b0 = m.length > 1 ? (parseInt(m[1], 10) || 99) : a0;
      for (var k = a0; k <= b0; k++) want.push(k);
    });
    return inputLines(files, ctx, "cut").map(function (l) {
      var parts = l.split(d);
      return L(want.filter(function (k) { return k <= parts.length; }).map(function (k) { return parts[k - 1]; }).join(d));
    });
  });
  def("tr", "translate characters", function (args, ctx) {
    var p = splitFlags(args);
    function expand(s) { return (s || "").replace(/(.)-(.)/g, function (_, a, b) { var r = ""; for (var c = a.charCodeAt(0); c <= b.charCodeAt(0); c++) r += String.fromCharCode(c); return r; }); }
    var from = expand(p.a[0]), to = expand(p.a[1]);
    return (ctx.stdin || []).map(function (l) {
      if (p.f.d) return L(l.split("").filter(function (c) { return from.indexOf(c) === -1; }).join(""));
      return L(l.split("").map(function (c) { var i = from.indexOf(c); return i === -1 ? c : (to[i] !== undefined ? to[i] : to[to.length - 1] || ""); }).join(""));
    });
  });
  def("rev", "reverse lines characterwise", function (args, ctx) {
    return inputLines(args, ctx, "rev").map(function (l) { return L(l.split("").reverse().join("")); });
  });
  def("nl", "number lines of files", function (args, ctx) {
    return inputLines(args, ctx, "nl").map(function (l, i) { return L(lpad(i + 1, 6) + "\t" + l); });
  });

  def("echo", "display a line of text", function (args) {
    var nl = true;
    if (args[0] === "-n") { nl = false; args = args.slice(1); }
    if (args[0] === "-e") args = args.slice(1);
    var text = args.join(" ").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    return lines(text + (nl ? "\n" : "")).map(function (l) { return L(l); });
  });
  def("printf", "format and print data", function (args) {
    if (!args.length) return [];
    var fmt = args[0], rest = args.slice(1), i = 0;
    var s = fmt.replace(/%[sd]/g, function () { return rest[i++] || ""; }).replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    return lines(s + (s.slice(-1) === "\n" ? "" : "")).map(function (l) { return L(l); });
  });

  def("touch", "change file timestamps / create files", function (args, ctx) {
    if (!args.length) return ctx.err("touch: missing file operand");
    args.forEach(function (a) {
      var n = node(a);
      if (n) { n.mtime = new Date(); return; }
      var r = writeFile(a, "", false);
      if (r !== true) ctx.err("touch: cannot touch '" + a + "': " + r.charAt(0).toUpperCase() + r.slice(1));
    });
    return [];
  });
  def("mkdir", "make directories", function (args, ctx) {
    var p = splitFlags(args);
    if (!p.a.length) return ctx.err("mkdir: missing operand");
    p.a.forEach(function (a) {
      var full = normalize(a);
      if (FS[full]) { if (!p.f.p) ctx.err("mkdir: cannot create directory '" + a + "': File exists"); return; }
      if (full.indexOf(HOME) !== 0 && full.indexOf("/tmp") !== 0) { ctx.err("mkdir: cannot create directory '" + a + "': Permission denied"); return; }
      if (!FS[parentOf(full)] && !p.f.p) { ctx.err("mkdir: cannot create directory '" + a + "': No such file or directory"); return; }
      dir(full, { mtime: new Date(), owner: USER });
    });
    return [];
  });
  def("rmdir", "remove empty directories", function (args, ctx) {
    args.forEach(function (a) {
      var full = normalize(a), n = FS[full];
      if (!n) return ctx.err("rmdir: failed to remove '" + a + "': No such file or directory");
      if (n.type !== "dir") return ctx.err("rmdir: failed to remove '" + a + "': Not a directory");
      if (n.children.length) return ctx.err("rmdir: failed to remove '" + a + "': Directory not empty");
      removePath(full);
    });
    return [];
  });
  def("rm", "remove files or directories", function (args, ctx) {
    var p = splitFlags(args), f = p.f;
    if (!p.a.length) return ctx.err("rm: missing operand");
    var res = [];
    p.a.forEach(function (a) {
      var full = normalize(a), n = FS[full];
      if (full === "/" && (f.r || f.R)) {
        if (!f["no-preserve-root"]) {
          ctx.err("rm: it is dangerous to operate recursively on '/'");
          ctx.err("rm: use --no-preserve-root to override this failsafe");
        } else {
          res.push(L("Nice try. This filesystem is immutable, and so is my sense of humour.", '<span class="t-green">Nice try.</span> This filesystem is immutable, and so is my sense of humour.'));
        }
        return;
      }
      if (!n) { if (!f.f) ctx.err("rm: cannot remove '" + a + "': No such file or directory"); return; }
      if (n.type === "dir" && !(f.r || f.R)) { ctx.err("rm: cannot remove '" + a + "': Is a directory"); return; }
      if (full.indexOf(HOME) !== 0 && full.indexOf("/tmp/") !== 0) { ctx.err("rm: cannot remove '" + a + "': Permission denied"); return; }
      if (full === HOME) { ctx.err("rm: refusing to remove '" + a + "': it's where I keep my stuff"); return; }
      removePath(full);
      if (f.v) res.push(L("removed '" + a + "'"));
    });
    return res;
  });
  function copyTree(src, dst) {
    Object.keys(FS).forEach(function (k) {
      if (k === src || k.indexOf(src + "/") === 0) {
        var nk = dst + k.slice(src.length), o = FS[k];
        if (o.type === "dir") dir(nk, { mtime: new Date(), owner: USER });
        else file(nk, o.content, { mtime: new Date(), owner: USER, mode: o.mode });
      }
    });
  }
  function cpmv(isMove) {
    var name = isMove ? "mv" : "cp";
    return function (args, ctx) {
      var p = splitFlags(args);
      if (p.a.length < 2) return ctx.err(name + ": missing destination file operand");
      var dest = normalize(p.a[p.a.length - 1]);
      var srcs = p.a.slice(0, -1);
      srcs.forEach(function (s) {
        var full = normalize(s), n = FS[full];
        if (!n) return ctx.err(name + ": cannot stat '" + s + "': No such file or directory");
        if (n.denied) return ctx.err(name + ": cannot open '" + s + "' for reading: Permission denied");
        if (n.type === "dir" && !isMove && !(p.f.r || p.f.R)) return ctx.err("cp: -r not specified; omitting directory '" + s + "'");
        var target = FS[dest] && FS[dest].type === "dir" ? (dest === "/" ? "" : dest) + "/" + basename(full) : dest;
        if (target.indexOf(HOME) !== 0 && target.indexOf("/tmp/") !== 0) return ctx.err(name + ": cannot create '" + p.a[p.a.length - 1] + "': Permission denied");
        if (isMove && full.indexOf(HOME) !== 0 && full.indexOf("/tmp/") !== 0) return ctx.err("mv: cannot move '" + s + "': Permission denied");
        copyTree(full, target);
        if (isMove) removePath(full);
      });
      return [];
    };
  }
  def("cp", "copy files and directories", cpmv(false));
  def("mv", "move (rename) files", cpmv(true));
  def("chmod", "change file mode bits", function (args, ctx) {
    if (args.length < 2) return ctx.err("chmod: missing operand");
    var mode = args[0];
    args.slice(1).forEach(function (a) {
      var n = node(a);
      if (!n) return ctx.err("chmod: cannot access '" + a + "': No such file or directory");
      if (n.owner !== USER) return ctx.err("chmod: changing permissions of '" + a + "': Operation not permitted");
      var m = n.mode.split("");
      if (/^\+x$|^u\+x$|^a\+x$/.test(mode)) { m[3] = "x"; if (mode !== "u+x") { m[6] = "x"; m[9] = "x"; } }
      else if (/^-x$/.test(mode)) { m[3] = m[6] = m[9] = "-"; }
      else if (/^[0-7]{3}$/.test(mode)) {
        var rwx = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
        m = (m[0] + rwx[+mode[0]] + rwx[+mode[1]] + rwx[+mode[2]]).split("");
      }
      n.mode = m.join("");
    });
    return [];
  });
  def("chown", "change file owner and group", function (args, ctx) {
    return ctx.err("chown: changing ownership of '" + (args[1] || "") + "': Operation not permitted");
  });
  def("stat", "display file status", function (args, ctx) {
    if (!args.length) return ctx.err("stat: missing operand");
    var res = [];
    args.forEach(function (a) {
      var n = node(a);
      if (!n) return ctx.err("stat: cannot statx '" + a + "': No such file or directory");
      res.push(L("  File: " + a));
      res.push(L("  Size: " + pad(sizeOf(n), 10) + "  Blocks: 8          " + (n.type === "dir" ? "directory" : "regular file")));
      res.push(L("Access: (" + n.mode + ")  Uid: ( " + (n.owner === "root" ? "   0/    root" : "1000/   moaaz") + ")"));
      res.push(L("Modify: " + n.mtime.toISOString().replace("T", " ").replace("Z", "")));
    });
    return res;
  });
  def("file", "determine file type", function (args, ctx) {
    return args.map(function (a) {
      var n = node(a);
      if (!n) return L(a + ": cannot open `" + a + "' (No such file or directory)");
      if (n.type === "dir") return L(a + ": directory");
      if (n.denied) return L(a + ": regular file, no read permission");
      var c = n.content || "";
      if (!c) return L(a + ": empty");
      if (c.indexOf("#!") === 0) return L(a + ": Bourne-Again shell script, ASCII text executable");
      if (/\.json$/.test(a)) return L(a + ": JSON text data");
      if (/\.md$/.test(a)) return L(a + ": Markdown text, UTF-8 text");
      return L(a + ": ASCII text");
    });
  });
  def("du", "estimate file space usage", function (args, ctx) {
    var p = splitFlags(args), t = p.a[0] || ".", base = normalize(t);
    if (!FS[base]) return ctx.err("du: cannot access '" + t + "': No such file or directory");
    var total = 0;
    Object.keys(FS).forEach(function (k) { if (k === base || k.indexOf(base + "/") === 0) total += sizeOf(FS[k]); });
    return [L((p.f.h ? humanSize(total) : Math.ceil(total / 1024)) + "\t" + t)];
  });
  def("df", "report file system disk space usage", function (args) {
    var h = args.indexOf("-h") !== -1;
    return [
      L("Filesystem      " + (h ? "Size  Used Avail" : "1K-blocks    Used Available") + " Use% Mounted on"),
      L("/dev/nvme0n1p2  " + (h ? " 64G   21G   40G" : " 67108864 22020096  41943040") + "  34% /"),
      L("tmpfs           " + (h ? "3.9G     0  3.9G" : "  4089416        0   4089416") + "   0% /dev/shm"),
      L("/dev/nvme0n1p1  " + (h ? "511M  6.1M  505M" : "   523248     6220    517028") + "   2% /boot/efi")
    ];
  });
  def("free", "display amount of free and used memory", function (args) {
    var h = args.indexOf("-h") !== -1;
    var mem = (navigator.deviceMemory || 8);
    return [
      L("               total        used        free      shared  buff/cache   available"),
      L("Mem:   " + lpad(h ? mem + ".0Gi" : mem * 1048576, 13) + lpad(h ? "2.1Gi" : 2202009, 12) + lpad(h ? (mem - 3.4).toFixed(1) + "Gi" : (mem * 1048576 - 3565158), 12) + lpad(h ? "212Mi" : 217088, 12) + lpad(h ? "1.3Gi" : 1363148, 12) + lpad(h ? (mem - 2.3).toFixed(1) + "Gi" : (mem * 1048576 - 2411724), 12)),
      L("Swap:  " + lpad(h ? "2.0Gi" : 2097148, 13) + lpad("0B", 12) + lpad(h ? "2.0Gi" : 2097148, 12))
    ];
  });

  /* ---------- identity & system ---------- */
  def("whoami", "print effective user name", function () { return [L(USER)]; });
  def("id", "print user identity", function () { return [L("uid=1000(moaaz) gid=1000(moaaz) groups=1000(moaaz),27(appsec),100(devsecops),1337(bugbounty)")]; });
  def("groups", "print group memberships", function () { return [L("moaaz appsec devsecops bugbounty")]; });
  def("hostname", "show system host name", function () { return [L(HOST)]; });
  def("uname", "print system information", function (args) {
    var p = splitFlags(args).f;
    if (p.a) return [L("Linux imoaaz 6.6.0-hardened #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux")];
    var parts = [];
    if (p.s || !Object.keys(p).length) parts.push("Linux");
    if (p.n) parts.push(HOST);
    if (p.r) parts.push("6.6.0-hardened");
    if (p.m) parts.push("x86_64");
    if (p.o) parts.push("GNU/Linux");
    return [L(parts.join(" "))];
  });
  def("date", "print the system date and time", function (args) {
    if (args[0] === "-u" || args[0] === "--utc") return [L(new Date().toUTCString().replace("GMT", "UTC"))];
    if (args[0] && args[0].charAt(0) === "+") {
      var d = new Date(), f = args[0].slice(1);
      return [L(f.replace(/%Y/g, d.getFullYear()).replace(/%m/g, two(d.getMonth() + 1)).replace(/%d/g, two(d.getDate()))
        .replace(/%H/g, two(d.getHours())).replace(/%M/g, two(d.getMinutes())).replace(/%S/g, two(d.getSeconds())).replace(/%s/g, Math.floor(d / 1000)))];
    }
    return [L(unixDate(new Date()))];
  });
  def("cal", "display a calendar", function () {
    var d = new Date(), y = d.getFullYear(), m = d.getMonth();
    var title = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m] + " " + y;
    var res = [L(lpad(title, Math.floor((20 + title.length) / 2))), L("Su Mo Tu We Th Fr Sa")];
    var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    var row = new Array(first + 1).join("   "), rowH = row;
    for (var day = 1; day <= days; day++) {
      var s = lpad(day, 2);
      row += s; rowH += day === d.getDate() ? '<span style="background:#e4e6eb;color:#141519">' + s + "</span>" : s;
      if ((first + day) % 7 === 0 || day === days) { res.push(L(row, rowH)); row = ""; rowH = ""; }
      else { row += " "; rowH += " "; }
    }
    return res;
  });
  def("uptime", "tell how long the system has been running", function () {
    var d = new Date();
    return [L(" " + two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds()) + " up " + fmtUptime(Date.now() - BOOT_TIME) + ",  1 user,  load average: 0.0" + rand(2, 9) + ", 0.0" + rand(1, 6) + ", 0.00")];
  });
  def("w", "show who is logged on", function () {
    var d = new Date();
    return C.uptime([]).concat([
      L("USER     TTY      FROM             LOGIN@   IDLE   WHAT"),
      L("moaaz    pts/0    " + pad("your-browser", 17) + two(d.getHours()) + ":" + two(d.getMinutes()) + "    0.00s  w")
    ]);
  });
  def("who", "show who is logged on", function () {
    var d = new Date(BOOT_TIME);
    return [L("moaaz    pts/0        " + d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) + " " + two(d.getHours()) + ":" + two(d.getMinutes()) + " (your-browser)")];
  });
  var PROCS = [
    ["root", 1, "0.0", "0.1", "/sbin/init"],
    ["root", 611, "0.0", "0.4", "/usr/bin/fail2ban-server -xf start"],
    ["root", 702, "0.0", "0.2", "sshd: /usr/sbin/sshd -D [listener]"],
    ["www-data", 889, "0.1", "0.6", "nginx: worker process"],
    ["root", 921, "0.0", "0.1", "/usr/sbin/cron -f"],
    ["moaaz", 1337, "0.0", "0.3", "-zsh"]
  ];
  def("ps", "report a snapshot of current processes", function (args) {
    var full = args.join("").indexOf("aux") !== -1 || args.indexOf("-ef") !== -1;
    if (!full) return [L("    PID TTY          TIME CMD"), L("   1337 pts/0    00:00:00 zsh"), L("   " + rand(4000, 4999) + " pts/0    00:00:00 ps")];
    var res = [L("USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND")];
    PROCS.concat([["moaaz", rand(4000, 4999), "0.0", "0.1", "ps " + args.join(" ")]]).forEach(function (p) {
      res.push(L(pad(p[0], 9) + lpad(p[1], 7) + lpad(p[2], 5) + lpad(p[3], 5) + lpad(rand(9000, 99000), 7) + lpad(rand(1000, 9000), 6) + " " + pad(p[0] === "moaaz" ? "pts/0" : "?", 9) + pad("Ss", 5) + "09:00   0:00 " + p[4]));
    });
    return res;
  });
  def("top", "display Linux processes", function () {
    var d = new Date();
    var res = [
      L("top - " + two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds()) + " up " + fmtUptime(Date.now() - BOOT_TIME) + ",  1 user,  load average: 0.04, 0.03, 0.00"),
      L("Tasks:  " + (PROCS.length + 1) + " total,   1 running,  " + PROCS.length + " sleeping,   0 stopped,   0 zombie"),
      L("%Cpu(s):  1.2 us,  0.4 sy,  0.0 ni, 98.3 id,  0.1 wa,  0.0 hi,  0.0 si,  0.0 st"),
      L(""),
      L("    PID USER      PR  NI    VIRT    RES  %CPU  %MEM     TIME+ COMMAND", '<span class="t-bold">    PID USER      PR  NI    VIRT    RES  %CPU  %MEM     TIME+ COMMAND</span>')
    ];
    PROCS.forEach(function (p) {
      res.push(L(lpad(p[1], 7) + " " + pad(p[0], 9) + " 20   0 " + lpad(rand(9000, 99000), 7) + lpad(rand(1000, 9000), 7) + lpad(p[2], 6) + lpad(p[3], 6) + "   0:00.0" + rand(1, 9) + " " + p[4].split(" ")[0].replace(/^.*\//, "")));
    });
    res.push(L("(snapshot: interactive top needs a real tty)", '<span class="t-dim">(snapshot: interactive top needs a real tty)</span>'));
    return res;
  });
  alias("htop", "top");
  def("kill", "send a signal to a process", function (args, ctx) {
    var pid = args.filter(function (a) { return a.charAt(0) !== "-"; })[0];
    if (!pid) return ctx.err("kill: usage: kill [-s sigspec | -n signum | -sigspec] pid");
    if (pid === "1337") { setTimeout(function () { closeWindow("[Process completed]"); }, 200); return []; }
    var p = PROCS.filter(function (x) { return String(x[1]) === pid; })[0];
    if (!p) return ctx.err("kill: (" + pid + ") - No such process");
    return ctx.err("kill: (" + pid + ") - Operation not permitted");
  });
  alias("pkill", "kill");
  alias("killall", "kill");

  def("env", "print the environment", function () {
    return Object.keys(S.env).sort().map(function (k) { return L(k + "=" + S.env[k]); });
  });
  alias("printenv", "env");
  def("export", "set environment variables", function (args) {
    if (!args.length) return C.env([]);
    args.forEach(function (a) { var i = a.indexOf("="); if (i > 0) S.env[a.slice(0, i)] = a.slice(i + 1); });
    return [];
  });
  def("unset", "unset variables", function (args) { args.forEach(function (a) { delete S.env[a]; }); return []; });
  def("alias", "define or display aliases", function (args) {
    if (!args.length) return Object.keys(S.aliases).sort().map(function (k) { return L(k + "='" + S.aliases[k] + "'"); });
    args.forEach(function (a) { var i = a.indexOf("="); if (i > 0) S.aliases[a.slice(0, i)] = a.slice(i + 1); });
    return [];
  });
  def("unalias", "remove aliases", function (args) { args.forEach(function (a) { delete S.aliases[a]; }); return []; });
  def("which", "locate a command", function (args, ctx) {
    var res = [];
    args.forEach(function (a) {
      if (S.aliases[a]) res.push(L(a + ": aliased to " + S.aliases[a]));
      else if (BUILTINS.indexOf(a) !== -1) res.push(L(a + ": shell built-in command"));
      else if (C[a]) res.push(L("/usr/bin/" + a));
      else ctx.err(a + " not found");
    });
    return res;
  });
  def("type", "describe a command", function (args, ctx) {
    return args.map(function (a) {
      if (S.aliases[a]) return L(a + " is an alias for " + S.aliases[a]);
      if (BUILTINS.indexOf(a) !== -1) return L(a + " is a shell builtin");
      if (C[a]) return L(a + " is /usr/bin/" + a);
      ctx.err(a + " not found");
      return L("");
    }).filter(function (x) { return x.t; });
  });
  var BUILTINS = ["cd", "pwd", "echo", "export", "unset", "alias", "unalias", "history", "exit", "type", "which", "printf", "source", "true", "false"];
  def("history", "show command history", function (args) {
    if (args[0] === "-c") { S.hist = []; return []; }
    return S.hist.map(function (h, i) { return L(lpad(i + 1, 5) + "  " + h); });
  });
  def("clear", "clear the terminal screen", function () { out.innerHTML = ""; return []; });
  alias("reset", "clear");
  def("exit", "exit the shell", function () { setTimeout(function () { closeWindow("[Process completed]"); }, 150); return [L("logout")]; });
  alias("logout", "exit");
  def("true", "do nothing, successfully", function () { return []; });
  def("false", "do nothing, unsuccessfully", function (a, ctx) { ctx.code = 1; return []; });
  def("source", "execute commands from a file", function (args, ctx) {
    if (!args[0]) return ctx.err("source: not enough arguments");
    var l = readFileLines(args[0], ctx, "source");
    if (!l) return [];
    l.forEach(function (ln) {
      var m = /^alias (\w+)='(.*)'$/.exec(ln); if (m) S.aliases[m[1]] = m[2];
      var e = /^export (\w+)=(.*)$/.exec(ln); if (e) S.env[e[1]] = expandVars(e[2]);
    });
    return [];
  });
  def("sleep", "delay for a specified amount of time", function (args, ctx) {
    var s = Math.min(parseFloat(args[0]) || 0, 30);
    return wait(s * 1000).then(function () { return []; });
  });
  def("seq", "print a sequence of numbers", function (args) {
    var a = args.map(Number), from = 1, step = 1, to;
    if (a.length === 1) to = a[0]; else if (a.length === 2) { from = a[0]; to = a[1]; } else { from = a[0]; step = a[1] || 1; to = a[2]; }
    var res = [];
    for (var i = from; step > 0 ? i <= to : i >= to; i += step) { res.push(L(String(i))); if (res.length > 1000) break; }
    return res;
  });
  def("yes", "output a string repeatedly until killed", function (args, ctx) {
    var s = args.join(" ") || "y", res = [];
    for (var i = 0; i < 24; i++) res.push(L(s));
    res.push(L("^C", '<span class="t-dim">^C</span>'));
    return res;
  });

  /* ---------- crypto & encoding (real) ---------- */
  function utf8ToB64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function b64ToUtf8(s) { return decodeURIComponent(escape(atob(s))); }
  def("base64", "base64 encode/decode data", function (args, ctx) {
    var p = splitFlags(args);
    var text = inputLines(p.a, ctx, "base64").join("\n");
    if (p.f.d || p.f.decode) {
      try { return lines(b64ToUtf8(text.replace(/\s+/g, ""))).map(function (l) { return L(l); }); }
      catch (e) { return ctx.err("base64: invalid input"); }
    }
    var enc = utf8ToB64(text + (ctx.stdin && !p.a.length ? "\n" : "\n"));
    var res = [];
    for (var i = 0; i < enc.length; i += 76) res.push(L(enc.slice(i, i + 76)));
    return res;
  });
  function digest(algo, name) {
    return function (args, ctx) {
      if (!window.crypto || !crypto.subtle) return ctx.err(name + ": Web Crypto unavailable (needs https)");
      var targets = args.length ? args.map(function (a) { var l = readFileLines(a, ctx, name); return l ? { label: a, text: l.join("\n") + "\n" } : null; }).filter(Boolean)
        : [{ label: "-", text: (ctx.stdin || []).join("\n") + "\n" }];
      return Promise.all(targets.map(function (t) {
        return crypto.subtle.digest(algo, new TextEncoder().encode(t.text)).then(function (buf) {
          var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
          return L(hex + "  " + t.label);
        });
      }));
    };
  }
  def("sha256sum", "compute SHA-256 message digest", digest("SHA-256", "sha256sum"));
  def("sha1sum", "compute SHA-1 message digest", digest("SHA-1", "sha1sum"));
  def("sha512sum", "compute SHA-512 message digest", digest("SHA-512", "sha512sum"));
  def("md5sum", "compute MD5 message digest", function (args, ctx) {
    return ctx.err("md5sum: MD5 is broken. Try sha256sum instead (seriously).");
  });

  /* ---------- network ---------- */
  var DNS_TYPES = { 1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 15: "MX", 16: "TXT", 28: "AAAA", 65: "HTTPS" };
  var RCODE = { 0: "NOERROR", 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN", 5: "REFUSED" };
  function cleanHost(h) { return (h || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, ""); }
  function doh(name, type, signal) {
    return fetch("https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(name) + "&type=" + encodeURIComponent(type),
      { headers: { accept: "application/dns-json" }, signal: signal }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }
  def("dig", "DNS lookup utility (live, via DNS-over-HTTPS)", function (args, ctx) {
    var short = false, type = "A", name = null;
    args.forEach(function (a) {
      if (a === "+short") short = true;
      else if (a.charAt(0) === "+" || a.charAt(0) === "@") return;
      else if (/^(A|AAAA|MX|NS|TXT|CNAME|SOA|ANY|HTTPS)$/i.test(a)) type = a.toUpperCase();
      else if (a.charAt(0) !== "-") name = cleanHost(a);
    });
    if (!name) name = ".";
    if (type === "ANY") type = "A";
    var started = performance.now();
    return doh(name, type, ctx.signal).then(function (j) {
      var ms = Math.round(performance.now() - started);
      var ans = j.Answer || [];
      if (short) return ans.map(function (a) { return L(a.data); });
      var res = [
        L(""),
        L("; <<>> DiG 9.18.28 <<>> " + name + (type !== "A" ? " " + type : "")),
        L(";; global options: +cmd"),
        L(";; Got answer:"),
        L(";; ->>HEADER<<- opcode: QUERY, status: " + (RCODE[j.Status] || j.Status) + ", id: " + rand(1000, 65535),
          ';; -&gt;&gt;HEADER&lt;&lt;- opcode: QUERY, status: <span class="' + (j.Status ? "t-red" : "t-green") + '">' + (RCODE[j.Status] || j.Status) + "</span>, id: " + rand(1000, 65535)),
        L(";; flags: qr rd ra" + (j.AD ? " ad" : "") + "; QUERY: 1, ANSWER: " + ans.length + ", AUTHORITY: " + ((j.Authority || []).length) + ", ADDITIONAL: 0"),
        L(""),
        L(";; QUESTION SECTION:"),
        L(";" + name + ".\t\tIN\t" + type)
      ];
      if (ans.length) {
        res.push(L(""));
        res.push(L(";; ANSWER SECTION:"));
        ans.forEach(function (a) {
          var t = DNS_TYPES[a.type] || a.type;
          res.push(L(a.name + "\t" + a.TTL + "\tIN\t" + t + "\t" + a.data,
            esc(a.name) + "\t" + a.TTL + "\tIN\t" + t + '\t<span class="t-cyan">' + esc(a.data) + "</span>"));
        });
      } else if (j.Authority && j.Authority.length) {
        res.push(L(""));
        res.push(L(";; AUTHORITY SECTION:"));
        j.Authority.forEach(function (a) { res.push(L(a.name + "\t" + a.TTL + "\tIN\t" + (DNS_TYPES[a.type] || a.type) + "\t" + a.data)); });
      }
      res.push(L(""));
      res.push(L(";; Query time: " + ms + " msec"));
      res.push(L(";; SERVER: 1.1.1.1#443(cloudflare-dns.com) (HTTPS)"));
      res.push(L(";; WHEN: " + unixDate(new Date())));
      res.push(L(""));
      return res;
    }).catch(function (e) {
      if (e.name === "AbortError") return [];
      return ctx.err(";; communications error to 1.1.1.1#443: " + e.message);
    });
  });
  def("nslookup", "query DNS (live, via DNS-over-HTTPS)", function (args, ctx) {
    var name = cleanHost(args.filter(function (a) { return a.charAt(0) !== "-"; })[0]);
    if (!name) return ctx.err("usage: nslookup <host>");
    return Promise.all([doh(name, "A", ctx.signal), doh(name, "AAAA", ctx.signal)]).then(function (r) {
      var res = [L("Server:\t\t1.1.1.1"), L("Address:\t1.1.1.1#53"), L("")];
      if (r[0].Status === 3) { res.push(L("** server can't find " + name + ": NXDOMAIN")); ctx.code = 1; return res; }
      res.push(L("Non-authoritative answer:"));
      (r[0].Answer || []).concat(r[1].Answer || []).forEach(function (a) {
        if (a.type === 5) res.push(L(a.name.replace(/\.$/, "") + "\tcanonical name = " + a.data));
        else if (a.type === 1 || a.type === 28) { res.push(L("Name:\t" + a.name.replace(/\.$/, ""))); res.push(L("Address: " + a.data, "Address: <span class=\"t-cyan\">" + esc(a.data) + "</span>")); }
      });
      return res;
    }).catch(function (e) { return e.name === "AbortError" ? [] : ctx.err(";; connection timed out; no servers could be reached"); });
  });
  def("host", "DNS lookup utility (live)", function (args, ctx) {
    var name = cleanHost(args.filter(function (a) { return a.charAt(0) !== "-"; })[0]);
    if (!name) return ctx.err("Usage: host <name>");
    return Promise.all([doh(name, "A", ctx.signal), doh(name, "AAAA", ctx.signal), doh(name, "MX", ctx.signal)]).then(function (r) {
      if (r[0].Status === 3) { ctx.code = 1; return [L("Host " + name + " not found: 3(NXDOMAIN)")]; }
      var res = [];
      (r[0].Answer || []).forEach(function (a) { if (a.type === 1) res.push(L(name + " has address " + a.data)); else if (a.type === 5) res.push(L(name + " is an alias for " + a.data)); });
      (r[1].Answer || []).forEach(function (a) { if (a.type === 28) res.push(L(name + " has IPv6 address " + a.data)); });
      (r[2].Answer || []).forEach(function (a) { if (a.type === 15) res.push(L(name + " mail is handled by " + a.data)); });
      return res;
    }).catch(function (e) { return e.name === "AbortError" ? [] : ctx.err(";; connection timed out"); });
  });
  def("curl", "transfer a URL (live for this site)", function (args, ctx) {
    var p = splitFlags(args), url = p.a[0];
    if (!url) return ctx.err("curl: try 'curl --help' or 'curl --manual' for more information");
    if (!/^https?:\/\//.test(url)) url = url.charAt(0) === "/" ? location.origin + url : "https://" + url;
    var headOnly = p.f.I || p.f.head, incl = p.f.i;
    return fetch(url, { method: headOnly ? "HEAD" : "GET", signal: ctx.signal, redirect: "follow" }).then(function (r) {
      var res = [];
      if (headOnly || incl) {
        res.push(L("HTTP/2 " + r.status, '<span class="t-bold">HTTP/2 ' + r.status + "</span>"));
        r.headers.forEach(function (v, k) { res.push(L(k + ": " + v, '<span class="t-cyan">' + esc(k) + "</span>: " + esc(v))); });
        if (headOnly) return res;
        res.push(L(""));
      }
      return r.text().then(function (body) {
        var bl = lines(body);
        var max = ctx.piped || ctx.redirected ? 2000 : 40;
        bl.slice(0, max).forEach(function (l) { res.push(L(l)); });
        if (bl.length > max) res.push(L("... (" + (bl.length - max) + " more lines, pipe to grep/head/less)", '<span class="t-dim">... (' + (bl.length - max) + " more lines, pipe to grep/head/less)</span>"));
        return res;
      });
    }).catch(function (e) {
      if (e.name === "AbortError") return [];
      return ctx.err("curl: (7) Failed to connect to " + cleanHost(url) + ": blocked by CORS. This shell runs in your browser, so only CORS-enabled hosts respond. Try: curl -I " + location.host);
    });
  });
  def("wget", "non-interactive network downloader", function (args, ctx) {
    var url = args.filter(function (a) { return a.charAt(0) !== "-"; })[0];
    if (!url) return ctx.err("wget: missing URL");
    if (!/^https?:\/\//.test(url)) url = url.charAt(0) === "/" ? location.origin + url : "https://" + url;
    var fname = basename(url.replace(/\/$/, "")) || "index.html";
    if (fname === cleanHost(url)) fname = "index.html";
    ctx.live(L("--" + new Date().toISOString().slice(0, 19).replace("T", " ") + "--  " + url));
    ctx.live(L("Resolving " + cleanHost(url) + "... connected."));
    return fetch(url, { signal: ctx.signal }).then(function (r) {
      return r.text().then(function (body) {
        writeFile(fname, body, false);
        return [L("HTTP request sent, awaiting response... " + r.status + " " + (r.statusText || "OK")),
          L("Length: " + body.length + " (" + humanSize(body.length) + ") [" + (r.headers.get("content-type") || "text/plain") + "]"),
          L("Saving to: '" + fname + "'"), L(""),
          L(new Date().toISOString().slice(0, 19).replace("T", " ") + " - '" + fname + "' saved [" + body.length + "/" + body.length + "]")];
      });
    }).catch(function (e) { return e.name === "AbortError" ? [] : ctx.err("wget: unable to connect to " + cleanHost(url) + " (blocked by CORS in the browser sandbox)"); });
  });
  def("ping", "send ICMP ECHO_REQUEST (measures real HTTPS round-trip)", function (args, ctx) {
    var cnt = 4, host = null;
    for (var i = 0; i < args.length; i++) { if (args[i] === "-c") cnt = Math.min(parseInt(args[++i], 10) || 4, 20); else if (args[i].charAt(0) !== "-") host = cleanHost(args[i]); }
    if (!host) return ctx.err("ping: usage error: Destination address required");
    var same = host === location.host || host === "localhost" || host === "127.0.0.1" || host === HOST;
    var times = [];
    ctx.live(L("PING " + host + " (" + (same ? "127.0.0.1" : host) + ") 56(84) bytes of data."));
    var seq = 0;
    function one() {
      if (ctx.signal.aborted || seq >= cnt) return Promise.resolve();
      seq++;
      var t = performance.now();
      var probe = same ? fetch(location.origin + "/robots.txt?ping=" + Date.now(), { cache: "no-store", signal: ctx.signal })
        : fetch("https://" + host + "/favicon.ico?" + Date.now(), { mode: "no-cors", cache: "no-store", signal: ctx.signal });
      return probe.then(function () {
        var ms = (performance.now() - t).toFixed(1);
        times.push(+ms);
        ctx.live(L("64 bytes from " + host + ": icmp_seq=" + seq + " ttl=" + (same ? 64 : 57) + " time=" + ms + " ms"));
      }, function (e) {
        if (e.name === "AbortError") return;
        ctx.live(L("From " + host + " icmp_seq=" + seq + " Destination Host Unreachable"));
      }).then(function () { return seq < cnt && !ctx.signal.aborted ? wait(900).then(one) : null; });
    }
    return one().then(function () {
      var res = [L(""), L("--- " + host + " ping statistics ---")];
      res.push(L(seq + " packets transmitted, " + times.length + " received, " + Math.round((1 - times.length / Math.max(seq, 1)) * 100) + "% packet loss"));
      if (times.length) {
        var mn = Math.min.apply(null, times), mx = Math.max.apply(null, times), avg = times.reduce(function (a, b) { return a + b; }, 0) / times.length;
        res.push(L("rtt min/avg/max = " + mn.toFixed(3) + "/" + avg.toFixed(3) + "/" + mx.toFixed(3) + " ms"));
      }
      return res;
    });
  });
  def("ifconfig", "configure a network interface", function () {
    return [
      L("eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500"),
      L("        inet 10.13.37.42  netmask 255.255.255.0  broadcast 10.13.37.255"),
      L("        inet6 fe80::1337:42ff:fe00:1  prefixlen 64  scopeid 0x20<link>"),
      L("        ether 02:42:0a:0d:25:2a  txqueuelen 1000  (Ethernet)"),
      L(""),
      L("lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536"),
      L("        inet 127.0.0.1  netmask 255.0.0.0"),
      L("        inet6 ::1  prefixlen 128  scopeid 0x10<host>")
    ];
  });
  def("ip", "show / manipulate routing, devices", function (args) {
    if (args[0] === "r" || args[0] === "route") return [L("default via 10.13.37.1 dev eth0 proto dhcp metric 100"), L("10.13.37.0/24 dev eth0 proto kernel scope link src 10.13.37.42")];
    return [
      L("1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN"),
      L("    inet 127.0.0.1/8 scope host lo"),
      L("2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP"),
      L("    link/ether 02:42:0a:0d:25:2a brd ff:ff:ff:ff:ff:ff"),
      L("    inet 10.13.37.42/24 brd 10.13.37.255 scope global dynamic eth0", '    inet <span class="t-cyan">10.13.37.42/24</span> brd 10.13.37.255 scope global dynamic eth0')
    ];
  });
  def("netstat", "print network connections", function () {
    return [
      L("Active Internet connections (only servers)"),
      L("Proto Recv-Q Send-Q Local Address           Foreign Address         State"),
      L("tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN"),
      L("tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN"),
      L("tcp6       0      0 :::443                  :::*                    LISTEN")
    ];
  });
  alias("ss", "netstat");
  def("nmap", "network exploration tool and security scanner", function (args, ctx) {
    var host = args.filter(function (a) { return a.charAt(0) !== "-"; })[0] || "localhost";
    host = cleanHost(host);
    var local = host === "localhost" || host === "127.0.0.1" || host === HOST || host === location.host;
    ctx.live(L("Starting Nmap 7.95 ( https://nmap.org ) at " + new Date().toISOString().slice(0, 16).replace("T", " ")));
    if (!local) {
      return wait(700).then(function () {
        return [L("Note: scanning third-party hosts from a portfolio isn't authorized testing.", '<span class="t-yellow">Note:</span> scanning third-party hosts from a portfolio isn\'t authorized testing.'),
          L("Scope matters. Try: nmap localhost"), L("Nmap done: 0 IP addresses (0 hosts up) scanned in 0.71 seconds")];
      });
    }
    return wait(900).then(function () {
      return [
        L("Nmap scan report for " + host + " (127.0.0.1)"),
        L("Host is up (0.000042s latency)."),
        L("Not shown: 996 closed tcp ports (reset)"),
        L("PORT     STATE SERVICE  VERSION", '<span class="t-bold">PORT     STATE SERVICE  VERSION</span>'),
        L("22/tcp   open  ssh      OpenSSH 9.6 (protocol 2.0)", '22/tcp   <span class="t-green">open</span>  ssh      OpenSSH 9.6 (protocol 2.0)'),
        L("443/tcp  open  https    nginx (portfolio, hardened)", '443/tcp  <span class="t-green">open</span>  https    nginx (portfolio, hardened)'),
        L("1337/tcp open  waste?   bug bounty listener", '1337/tcp <span class="t-green">open</span>  waste?   bug bounty listener'),
        L("8080/tcp filtered http-proxy", '8080/tcp <span class="t-yellow">filtered</span> http-proxy'),
        L(""),
        L("Nmap done: 1 IP address (1 host up) scanned in 2.04 seconds")
      ];
    });
  });
  def("whois", "client for the whois directory service", function (args, ctx) {
    var t = (args[0] || "moaaz").toLowerCase();
    if (t === "moaaz" || t === "moaaz afifi" || t === HOST || cleanHost(t) === location.host) {
      return [
        L("Name:           Moaaz Afifi"),
        L("Role:           Co-Founder & Product Engineer, Raqyan"),
        L("                Cybersecurity Engineer & Penetration Tester"),
        L("Credentials:    eCPPT, eWPTX, eMAPT, eAIS"),
        L("Disclosures:    CVE-2024-36436"),
        L("Status:         available for engagements", 'Status:         <span class="t-green">available for engagements</span>'),
        L("Contact:        imooaaz@gmail.com")
      ];
    }
    return ctx.err("whois: " + t + ": no whois server reachable from the browser sandbox. Try: dig " + t);
  });
  def("ssh", "OpenSSH remote login client", function (args, ctx) {
    var host = args.filter(function (a) { return a.charAt(0) !== "-"; })[0];
    if (!host) return ctx.err("usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] destination [command]");
    return wait(1200).then(function () { return ctx.err("ssh: connect to host " + host.replace(/^.*@/, "") + " port 22: Operation timed out (browsers can't open raw TCP sockets)"); });
  });
  alias("telnet", "ssh");
  alias("nc", "ssh");
  def("traceroute", "print the route packets trace to network host", function (args, ctx) {
    var host = cleanHost(args[0] || "");
    if (!host) return ctx.err("Usage: traceroute host");
    return [L("traceroute to " + host + ", 30 hops max, 60 byte packets"), L(" 1  your-router (192.168.1.1)  1.204 ms  1.180 ms  1.161 ms"), L(" 2  * * *"), L(" 3  * * *", " 3  * * *  <span class=\"t-dim\">(ICMP isn't available to browsers; try ping or dig)</span>")];
  });

  /* ---------- dev tools ---------- */
  var COMMITS = [
    ["9ee8cd2", "Sun Nov 1 2026", "ui/ux fixes + polish: working copy button, mobile menu, terminal boot race"],
    ["a167d5e", "Mon Sep 14 2026", "interface polish: ambient grid, glass header on scroll"],
    ["21836b8", "Mon Sep 14 2026", "drop 'also:' secondary certs line"],
    ["8081010", "Mon Sep 14 2026", "cert badges: official INE SVGs + eAIS"],
    ["9a68d22", "Mon Sep 14 2026", "blog writing section leads the page"],
    ["7e0c004", "Mon Sep 14 2026", "logo marquee sizing"]
  ];
  def("git", "the stupid content tracker", function (args, ctx) {
    var sub = args[0];
    if (!sub) return [L("usage: git [--version] [--help] <command> [<args>]")];
    if (sub === "--version") return [L("git version 2.47.0")];
    if (sub === "status") return [L("On branch main"), L("Your branch is up to date with 'origin/main'."), L(""), L("nothing to commit, working tree clean")];
    if (sub === "branch") return [L("* main", '* <span class="t-green">main</span>')];
    if (sub === "log") {
      if (args.indexOf("--oneline") !== -1) return COMMITS.map(function (c) { return L(c[0] + " " + c[2], '<span class="t-yellow">' + c[0] + "</span> " + esc(c[2])); });
      var res = [];
      COMMITS.forEach(function (c, i) {
        res.push(L("commit " + c[0] + "f3a9c1e7b2d4", '<span class="t-yellow">commit ' + c[0] + "f3a9c1e7b2d4" + (i === 0 ? ' (<span class="t-cyan">HEAD -&gt; </span><span class="t-green">main</span>)' : "") + "</span>"));
        res.push(L("Author: Moaaz Afifi <imooaaz@gmail.com>"));
        res.push(L("Date:   " + c[1]));
        res.push(L(""));
        res.push(L("    " + c[2]));
        res.push(L(""));
      });
      return res;
    }
    if (sub === "remote") return [L("origin\tgit@github.com:m0442/imoaaz.git (fetch)"), L("origin\tgit@github.com:m0442/imoaaz.git (push)")];
    if (sub === "push" || sub === "commit" || sub === "pull") return ctx.err("fatal: this is a read-only demo repository");
    if (sub === "blame") return [L("^9ee8cd2 (Moaaz Afifi 2026-11-01) everything here. guilty as charged.")];
    return ctx.err("git: '" + sub + "' is not a git command. See 'git --help'.");
  });
  function editor(name) {
    return function (args) {
      return [L(name + ": no full-screen editor in a web tty. Use cat to read files, or echo 'text' > file to write.", '<span class="t-dim">' + name + ": no full-screen editor in a web tty.</span> Use <span class=\"t-bold\">cat</span> to read files, or <span class=\"t-bold\">echo 'text' &gt; file</span> to write."),
        L(name === "vim" || name === "vi" ? "(and yes, you'd have been able to exit. :q!)" : "")].filter(function (x) { return x.t; });
    };
  }
  def("vim", "Vi IMproved, a programmer's text editor", editor("vim"));
  alias("vi", "vim");
  alias("nvim", "vim");
  def("nano", "Nano's ANOther editor", editor("nano"));
  alias("emacs", "nano");
  function lang(name, ver) {
    return function (args) {
      if (args[0] === "--version" || args[0] === "-V") return [L(ver)];
      return [L(ver), L("Interactive REPL isn't available in this web tty.", '<span class="t-dim">Interactive REPL isn\'t available in this web tty.</span>')];
    };
  }
  def("python3", "an interpreted, interactive programming language", lang("python3", "Python 3.12.7"));
  alias("python", "python3");
  def("node", "server-side JavaScript runtime", lang("node", "v22.11.0"));
  def("docker", "container runtime", function (args) {
    if (args[0] === "ps") return [L("CONTAINER ID   IMAGE          COMMAND                  STATUS         PORTS                  NAMES"), L("a1b2c3d4e5f6   nginx:alpine   \"/docker-entrypoint.…\"   Up 3 days      0.0.0.0:443->443/tcp   portfolio")];
    return [L("Usage:  docker [OPTIONS] COMMAND"), L("Try: docker ps")];
  });
  def("apt", "package manager", function (args, ctx) {
    if (args[0] === "install" || args[0] === "update" || args[0] === "upgrade") return ctx.err("E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock, are you root?");
    return [L("apt 2.7.14 (amd64)"), L("Usage: apt [options] command")];
  });
  alias("apt-get", "apt");
  def("make", "maintain program dependencies", function (args, ctx) {
    if (args.join(" ") === "me a sandwich") return ctx.err("make: *** No rule to make target 'me a sandwich'. Try sudo.");
    return ctx.err("make: *** No targets specified and no makefile found.  Stop.");
  });

  /* ---------- privilege ---------- */
  def("sudo", "execute a command as another user", function (args) {
    if (!args.length) return [L("usage: sudo -h | -K | -k | -V"), L("usage: sudo [-AbEHknPS] [-u user] command")];
    if (args.join(" ") === "make me a sandwich") return [L("Okay. 🥪", '<span class="t-green">Okay.</span> 🥪')];
    return new Promise(function (resolve) {
      askPassword("[sudo] password for " + USER + ": ", function () {
        wait(600).then(function () {
          resolve([L("Sorry, try again."), L(USER + " is not in the sudoers file. This incident will be reported.")]);
        });
      });
    });
  });
  def("su", "run a command with substitute user", function () {
    return new Promise(function (resolve) {
      askPassword("Password: ", function () { wait(900).then(function () { resolve([L("su: Authentication failure")]); }); });
    });
  });
  def("passwd", "change user password", function () {
    return [L("passwd: Authentication token manipulation error"), L("passwd: password unchanged")];
  });

  /* ---------- fun ---------- */
  var FORTUNES = [
    "There is no patch for human stupidity. Only training.",
    "The S in IoT stands for security.",
    "It's not a bug, it's an undocumented feature. Until it's a CVE.",
    "Trust, but verify. Then verify the verifier.",
    "Every input is hostile until proven otherwise.",
    "Defense in depth: because one lock was never enough.",
    "Read the source, Luke.",
    "If you think technology can solve your security problems, you don't understand the problems. — Bruce Schneier"
  ];
  def("fortune", "print a random adage", function () { return [L(FORTUNES[rand(0, FORTUNES.length - 1)])]; });
  def("cowsay", "configurable speaking cow", function (args, ctx) {
    var msg = args.length ? args.join(" ") : (ctx.stdin || []).join(" ") || "Moo. Hire Moaaz.";
    if (msg.length > 40) msg = msg.slice(0, 39) + "…";
    var bar = new Array(msg.length + 3).join("_"), bar2 = new Array(msg.length + 3).join("-");
    return [L(" " + bar), L("< " + msg + " >"), L(" " + bar2), L("        \\   ^__^"), L("         \\  (oo)\\_______"), L("            (__)\\       )\\/\\"), L("                ||----w |"), L("                ||     ||")];
  });
  def("sl", "steam locomotive (you meant ls)", function () {
    return [
      L("      ====        ________                ___________"),
      L("  _D _|  |_______/        \\__I_I_____===__|_________|"),
      L("   |(_)---  |   H\\________/ |   |        =|___ ___|"),
      L("   /     |  |   H  |  |     |   |         ||_| |_||"),
      L("  |      |  |   H  |__--------------------| [___] |"),
      L("  | ________|___H__/__|_____/[][]~\\_______|       |"),
      L("  |/ |   |-----------I_____I [][] []  D   |=======|_"),
      L("(you typed sl. you meant ls.)", '<span class="t-dim">(you typed sl. you meant ls.)</span>')
    ];
  });
  def("matrix", "follow the white rabbit", function (args, ctx) {
    var chars = "ｱｲｳｴｵｶｷｸｹｺ01<>/{}#$%";
    var n = 0;
    function frame() {
      if (ctx.signal.aborted || n++ > 18) return Promise.resolve();
      var s = "";
      for (var i = 0; i < Math.min(termCols(), 64); i++) s += Math.random() < 0.45 ? chars[rand(0, chars.length - 1)] : " ";
      ctx.live(L(s, '<span class="t-green">' + esc(s) + "</span>"));
      return wait(70).then(frame);
    }
    return frame().then(function () { return [L("Wake up, Neo... (Ctrl+C to stop next time)", '<span class="t-green">Wake up, Neo...</span>')]; });
  });
  def("hack", "hollywood hacking", function () {
    return [L("ACCESS GRANTED", '<span class="t-green t-bold">ACCESS GRANTED</span>'), L("...just kidding. Real hacking is reading docs at 2am.", '<span class="t-dim">...just kidding. Real hacking is reading docs at 2am.</span>')];
  });
  def("neofetch", "show system information", function () {
    var up = fmtUptime(Date.now() - BOOT_TIME);
    var res = navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/);
    var browser = res ? res[0].replace("Edg", "Edge").split(".")[0] : "browser";
    var info = [
      ['<span class="t-green t-bold">moaaz</span>@<span class="t-green t-bold">imoaaz</span>', "moaaz@imoaaz"],
      ["------------", "------------"],
      ["OS", "PortfolioOS 2.0 x86_64 (hardened)"],
      ["Host", location.host || "imoaaz.pages.dev"],
      ["Kernel", "6.6.0-hardened"],
      ["Uptime", up],
      ["Shell", "zsh 5.9"],
      ["Terminal", browser],
      ["Role", "Co-Founder @ Raqyan"],
      ["Focus", "Pentest · AppSec · DevSecOps"],
      ["Certs", "eCPPT eWPTX eMAPT eAIS"],
      ["CVE", "CVE-2024-36436"],
      ["", ""],
      ["@swatch", ""]
    ];
    var logo = [
      "        .--.      ",
      "       |o_o |     ",
      "       |:_/ |     ",
      "      //   \\ \\    ",
      "     (|     | )   ",
      "    /'\\_   _/`\\   ",
      "    \\___)=(___/   ",
      "                  "
    ];
    var narrow = termCols() < 56;
    var out0 = [];
    info.forEach(function (row, i) {
      var lg = narrow ? "" : (logo[i] || "                  ");
      var lgH = narrow ? "" : '<span class="t-yellow">' + esc(lg) + "</span>";
      var text, html;
      if (row[0] === "@swatch") {
        text = lg + "████████████████";
        html = lgH + ["#1c1c1e", "#ff6961", "#32d74b", "#ffd60a", "#64b5ff", "#d29bff", "#5ac8fa", "#e4e6eb"].map(function (c) { return '<span style="color:' + c + '">██</span>'; }).join("");
      } else if (i < 2) { text = lg + row[1]; html = lgH + row[0]; }
      else if (!row[0]) { text = lg; html = lgH; }
      else { text = lg + row[0] + ": " + row[1]; html = lgH + '<span class="t-yellow t-bold">' + esc(row[0]) + "</span>: " + esc(row[1]); }
      out0.push(L(text, html));
    });
    return out0;
  });

  /* ---------- portfolio shortcuts ---------- */
  def("about", "who is Moaaz", function (a, ctx) { return C.cat(["~/about.txt"], ctx); });
  def("experience", "work history", function (a, ctx) { return C.cat(["~/experience.log"], ctx); });
  def("skills", "skill matrix", function (a, ctx) { return C.cat(["~/skills.json"], ctx); });
  def("contact", "how to reach me", function (a, ctx) {
    return C.cat(["~/contact.md"], ctx).concat([L(""), L("or just run: open email", '<span class="t-dim">or just run:</span> <span class="t-bold">open email</span>')]);
  });
  def("cve", "CVE-2024-36436 summary", function (a, ctx) { return C.cat(["~/cves/CVE-2024-36436.txt"], ctx); });
  def("blog", "latest write-ups", function () {
    return [
      L("Latest write-ups:"),
      L("  Fuzz the type, not just the value", '  <a href="/blog/fuzz-the-type/">Fuzz the type, not just the value</a>'),
      L("  From Comments to Command Execution (RCE)", '  <a href="/blog/comments-to-rce/">From Comments to Command Execution (RCE)</a>'),
      L("  How a Link Shortener Helped Me Bypass WAF", '  <a href="/blog/waf-bypass/">How a Link Shortener Helped Me Bypass WAF</a>')
    ];
  });
  var OPEN = {
    blog: "/blog/", linkedin: "https://www.linkedin.com/in/imooaaz/", github: "https://github.com/m0442",
    x: "https://x.com/imooaaz", twitter: "https://x.com/imooaaz", medium: "https://imooaaz.medium.com/",
    email: "mailto:imooaaz@gmail.com", mail: "mailto:imooaaz@gmail.com", "security.txt": "/.well-known/security.txt"
  };
  def("open", "open a link (blog, linkedin, github, x, medium, email)", function (args, ctx) {
    var t = (args[0] || "").toLowerCase();
    var url = OPEN[t] || (/^https?:\/\//.test(args[0] || "") ? args[0] : null);
    if (!url) {
      var n = args[0] && node(args[0]);
      if (n && n.type === "file") { var m = /(https?:\/\/\S+)/.exec(n.content); if (m) url = m[1]; }
    }
    if (!url) return ctx.err("open: unknown target '" + (args[0] || "") + "'. Try: open " + Object.keys(OPEN).join(" | "));
    if (url.indexOf("mailto:") === 0 || url.charAt(0) === "/") location.href = url;
    else window.open(url, "_blank", "noopener");
    return [L("Opening " + url + " …", '<span class="t-dim">Opening</span> <a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + "</a> …")];
  });
  alias("xdg-open", "open");

  def("man", "an interface to the system reference manuals", function (args, ctx) {
    var t = args[0];
    if (!t) return [L("What manual page do you want?"), L("For example, try 'man man'.")];
    if (t === "man") return [L("MAN(1)                    User Commands                    MAN(1)"), L(""), L("NAME"), L("       man - an interface to the system reference manuals"), L(""), L("DESCRIPTION"), L("       You are reading it. Try 'help' for the full command list.")];
    if (!DESC[t]) return ctx.err("No manual entry for " + t);
    var up = t.toUpperCase() + "(1)";
    return [L(pad(up, 26) + pad("User Commands", 33) + up), L(""), L("NAME"), L("       " + t + " - " + DESC[t]), L(""), L("SYNOPSIS"), L("       " + t + " [OPTION]... [ARG]..."), L(""), L("SEE ALSO"), L("       help(1)")];
  });
  def("whatis", "display one-line manual page descriptions", function (args, ctx) {
    return args.map(function (a) { return DESC[a] ? L(pad(a + " (1)", 16) + "- " + DESC[a]) : L(a + ": nothing appropriate."); });
  });
  alias("apropos", "whatis");

  var HELP_GROUPS = [
    ["Portfolio", ["about", "experience", "skills", "cve", "blog", "contact", "open", "neofetch", "whois"]],
    ["Files", ["ls", "cd", "pwd", "cat", "less", "head", "tail", "tree", "find", "file", "stat", "touch", "mkdir", "rm", "rmdir", "cp", "mv", "chmod", "du", "df"]],
    ["Text", ["echo", "grep", "wc", "sort", "uniq", "cut", "tr", "rev", "nl", "seq", "base64", "sha256sum"]],
    ["System", ["whoami", "id", "uname", "hostname", "date", "cal", "uptime", "w", "ps", "top", "kill", "free", "env", "export", "alias", "which", "history", "man", "sudo", "clear", "exit"]],
    ["Network", ["dig", "nslookup", "host", "curl", "wget", "ping", "ifconfig", "ip", "netstat", "nmap", "ssh"]],
    ["Dev & fun", ["git", "vim", "python3", "node", "docker", "fortune", "cowsay", "matrix", "sl"]]
  ];
  def("help", "list available commands", function () {
    var res = [L("PortfolioOS zsh. Common Linux commands work, including pipes (|), redirects (>, >>), globs (*), && and ;.",
      '<span class="t-bold">PortfolioOS zsh</span>. Common Linux commands work, including pipes (<span class="t-yellow">|</span>), redirects (<span class="t-yellow">&gt;</span>, <span class="t-yellow">&gt;&gt;</span>), globs (<span class="t-yellow">*</span>), <span class="t-yellow">&amp;&amp;</span> and <span class="t-yellow">;</span>.'), L("")];
    HELP_GROUPS.forEach(function (g) {
      var label = pad(g[0], 11);
      res.push(L(label + g[1].join("  "), '<span class="t-cyan">' + esc(label) + "</span>" + g[1].join("  ")));
    });
    res.push(L(""));
    res.push(L("Live results: dig, nslookup, host (real DNS) · curl, wget, ping (real HTTP to this site) · sha256sum, base64.",
      '<span class="t-green">Live:</span> dig, nslookup, host (real DNS) · curl, wget, ping (real HTTP to this site) · sha256sum, base64.'));
    res.push(L("Try:  cat README.md   ·   ls -la | grep secret   ·   dig github.com +short   ·   man <cmd>",
      '<span class="t-dim">Try:</span>  cat README.md   ·   ls -la | grep secret   ·   dig github.com +short   ·   man &lt;cmd&gt;'));
    return res;
  });

  var ALL_COMMANDS = function () { return Object.keys(C).concat(Object.keys(S.aliases)).sort(); };

  /* ========================================================= executor */
  function termCols() {
    if (!screen.clientWidth) return 80;
    var probe = termCols.w;
    if (!probe) {
      var s = document.createElement("span");
      s.textContent = "0000000000";
      s.style.visibility = "hidden";
      s.style.position = "absolute";
      out.appendChild(s);
      probe = termCols.w = s.getBoundingClientRect().width / 10 || 7.8;
      out.removeChild(s);
    }
    return Math.max(30, Math.floor((screen.clientWidth - 28) / probe));
  }
  window.addEventListener("resize", function () { termCols.w = 0; });

  function resolveAlias(argv, depth) {
    if (depth > 5 || !argv.length) return argv;
    var a = S.aliases[argv[0]];
    if (!a) return argv;
    var t = tokenize(a);
    if (t.error) return argv;
    return resolveAlias(t.toks.filter(function (x) { return !x.op; }).map(function (x) { return x.w; }).concat(argv.slice(1)), depth + 1);
  }

  function runPipeline(pipeline, signal) {
    var stdin = null, code = 0, chain = Promise.resolve();
    pipeline.forEach(function (cmd, idx) {
      chain = chain.then(function () {
        if (signal.aborted) return;
        var argv = resolveAlias(cmd.argv, 0);
        var isLast = idx === pipeline.length - 1;
        var errNull = cmd.errNull;
        var ctx = {
          stdin: stdin,
          piped: !isLast,
          redirected: !!cmd.out,
          signal: signal,
          code: 0,
          err: function (msg) {
            ctx.code = 1;
            if (!errNull) String(msg).split("\n").forEach(function (m) { printHTML(esc(m)); });
            return [];
          },
          live: function (item) {
            if (isLast && !cmd.out) printHTML(item.h);
            else ctx.buffer.push(item);
          },
          buffer: []
        };
        if (cmd.inFile) {
          var l = readFileLines(cmd.inFile, ctx, "zsh");
          if (!l) { code = 1; stdin = []; return; }
          ctx.stdin = l;
        }
        if (!argv.length) { stdin = []; return; }
        var name = argv[0];
        var fn = C[name];
        S.lastPipeCode = 0;
        if (!fn) {
          var near = ALL_COMMANDS().filter(function (c) { return Math.abs(c.length - name.length) <= 2 && levenshtein(c, name) <= (name.length > 4 ? 2 : 1); })[0];
          printHTML("zsh: command not found: " + esc(name));
          if (near) printHTML('<span class="t-dim">Did you mean </span><span class="t-bold">' + esc(near) + '</span><span class="t-dim">? Type help for all commands.</span>');
          code = 127; stdin = [];
          return;
        }
        if (isLast) setTitle(name);
        var r;
        try { r = fn(argv.slice(1), ctx); } catch (e) { ctx.err(name + ": " + e.message); r = []; }
        return Promise.resolve(r).then(function (items) {
          items = ctx.buffer.concat(items || []);
          code = ctx.code || S.lastPipeCode || 0;
          if (cmd.out) {
            var text = items.map(function (x) { return x.t; }).join("\n") + (items.length ? "\n" : "");
            var w = writeFile(cmd.out, text, cmd.append);
            if (w !== true) { printHTML("zsh: " + esc(w) + ": " + esc(cmd.out)); code = 1; }
            stdin = [];
          } else if (isLast) {
            items.forEach(function (x) { printHTML(x.h); });
          } else {
            stdin = items.map(function (x) { return x.t; });
          }
        });
      });
    });
    return chain.then(function () { return code; });
  }

  function execute(line) {
    var t = tokenize(line);
    if (t.error) { printHTML("zsh: " + esc(t.error)); S.last = 1; return Promise.resolve(); }
    var p = parse(t.toks);
    if (p.error) { printHTML("zsh: " + esc(p.error)); S.last = 1; return Promise.resolve(); }
    var ctrl = new AbortController();
    S.abort = ctrl;
    var chain = Promise.resolve(), prevOp = null;
    p.chain.forEach(function (seg) {
      chain = chain.then(function () {
        if (ctrl.signal.aborted) return;
        if (prevOp === "&&" && S.last !== 0) { prevOp = seg.op; return; }
        if (prevOp === "||" && S.last === 0) { prevOp = seg.op; return; }
        prevOp = seg.op;
        return runPipeline(seg.pipeline, ctrl.signal).then(function (code) { S.last = code; });
      });
    });
    return chain.then(function () { S.abort = null; });
  }

  /* ============================================================ input */
  var lastVal = "";
  function render() {
    var v = input.value, pos = input.selectionStart == null ? v.length : input.selectionStart;
    if (S && S.pw) { tiBefore.textContent = ""; tiCursor.innerHTML = "&nbsp;"; tiAfter.textContent = ""; tiCursor.className = "ti-text term-cursor-char"; return; }
    tiBefore.textContent = v.slice(0, pos);
    var ch = v.charAt(pos);
    tiCursor.textContent = ch || "\u00a0";
    tiCursor.className = "ti-text term-cursor-char";
    tiAfter.textContent = v.slice(pos + 1);
    lastVal = v;
  }
  function showPrompt() {
    S.busy = false;
    promptEl.innerHTML = S.pw ? esc(S.pw.label) : promptHTML();
    inputRow.hidden = false;
    setTitle();
    render();
    scrollDown();
  }
  function askPassword(label, cb) {
    S.pw = { label: label, cb: cb };
    input.value = "";
    inputRow.hidden = false;
    promptEl.innerHTML = esc(label);
    S.busy = false;
    render();
    scrollDown();
  }
  function submit() {
    var val = input.value;
    input.value = "";
    if (S.pw) {
      var pw = S.pw; S.pw = null;
      printHTML(esc(pw.label));
      inputRow.hidden = true;
      S.busy = true;
      pw.cb(val);
      return;
    }
    printHTML(promptHTML() + esc(val));
    inputRow.hidden = true;
    var trimmed = val.trim();
    if (!trimmed) { showPrompt(); return; }
    if (trimmed.charAt(0) === "!" && trimmed.length > 1) {
      var ref = trimmed === "!!" ? S.hist[S.hist.length - 1] : S.hist[parseInt(trimmed.slice(1), 10) - 1];
      if (!ref) { printHTML("zsh: event not found: " + esc(trimmed.slice(1))); showPrompt(); return; }
      printHTML(esc(ref));
      trimmed = ref;
    }
    if (S.hist[S.hist.length - 1] !== trimmed) S.hist.push(trimmed);
    S.histIdx = S.hist.length;
    S.busy = true;
    execute(trimmed).then(function () { if (!S.pw && !term.hidden) showPrompt(); });
  }

  function commonPrefix(arr) {
    if (!arr.length) return "";
    var p = arr[0];
    arr.forEach(function (s) { while (s.indexOf(p) !== 0) p = p.slice(0, -1); });
    return p;
  }
  function complete() {
    var v = input.value.slice(0, input.selectionStart), rest = input.value.slice(input.selectionStart);
    var m = /(\S*)$/.exec(v), word = m[1], before = v.slice(0, v.length - word.length);
    var isCmd = !/\S/.test(before) || /[|;&]\s*$/.test(before);
    var pool, prefix = word, dirPart = "";
    if (isCmd && word.indexOf("/") === -1) {
      pool = ALL_COMMANDS().filter(function (c) { return c.indexOf(word) === 0; }).filter(function (c, i, a) { return a.indexOf(c) === i; });
      pool = pool.map(function (c) { return { name: c, suffix: " " }; });
    } else {
      var slash = word.lastIndexOf("/");
      dirPart = slash === -1 ? "" : word.slice(0, slash + 1);
      prefix = slash === -1 ? word : word.slice(slash + 1);
      var dn = node(dirPart || ".");
      if (!dn || dn.type !== "dir" || dn.denied) return;
      pool = dn.children.filter(function (c) { return c.indexOf(prefix) === 0 && (prefix.charAt(0) === "." || c.charAt(0) !== "."); }).sort()
        .map(function (c) { var n = FS[normalize((dirPart || "./") + c)]; return { name: c, suffix: n && n.type === "dir" ? "/" : " " }; });
    }
    if (!pool.length) return;
    if (pool.length === 1) {
      var done = before + dirPart + pool[0].name + pool[0].suffix;
      input.value = done + rest;
      input.setSelectionRange(done.length, done.length);
    } else {
      var cp = commonPrefix(pool.map(function (p) { return p.name; }));
      if (cp.length > prefix.length) {
        var partial = before + dirPart + cp;
        input.value = partial + rest;
        input.setSelectionRange(partial.length, partial.length);
      } else {
        printHTML(promptHTML() + esc(input.value));
        var w = Math.max.apply(null, pool.map(function (p) { return p.name.length; })) + 2;
        var cols = Math.max(1, Math.floor(termCols() / w));
        for (var i = 0; i < pool.length; i += cols) {
          printHTML(pool.slice(i, i + cols).map(function (p) { return esc(pad(p.name + (p.suffix === "/" ? "/" : ""), w)); }).join(""));
        }
      }
    }
    render();
  }

  input.addEventListener("input", render);
  input.addEventListener("select", render);
  input.addEventListener("keyup", render);
  input.addEventListener("click", render);
  document.addEventListener("selectionchange", function () { if (document.activeElement === input) render(); });

  input.addEventListener("keydown", function (ev) {
    fastBoot = true;
    var k = ev.key;
    if (ev.ctrlKey && (k === "c" || k === "C")) {
      if (window.getSelection && String(window.getSelection())) return; /* allow copy */
      ev.preventDefault();
      if (S.busy && S.abort) { S.abort.abort(); printHTML("^C"); return; }
      if (S.pw) { var pw = S.pw; S.pw = null; printHTML(esc(pw.label) + "^C"); S.busy = true; pw.cb(null); return; }
      printHTML(promptHTML() + esc(input.value) + '<span class="t-dim">^C</span>');
      input.value = ""; render(); return;
    }
    if (S.busy) { ev.preventDefault(); return; }
    if (k === "Enter") { ev.preventDefault(); submit(); return; }
    if (k === "Tab") { ev.preventDefault(); if (!S.pw) complete(); return; }
    if (S.pw) return;
    if (k === "ArrowUp") {
      ev.preventDefault();
      if (S.histIdx === S.hist.length) S.draft = input.value;
      if (S.histIdx > 0) { S.histIdx--; input.value = S.hist[S.histIdx]; }
      var e1 = input.value.length; input.setSelectionRange(e1, e1); render(); return;
    }
    if (k === "ArrowDown") {
      ev.preventDefault();
      if (S.histIdx < S.hist.length) { S.histIdx++; input.value = S.histIdx === S.hist.length ? S.draft : S.hist[S.histIdx]; }
      var e2 = input.value.length; input.setSelectionRange(e2, e2); render(); return;
    }
    if (ev.ctrlKey && (k === "l" || k === "L")) { ev.preventDefault(); out.innerHTML = ""; return; }
    if (ev.ctrlKey && (k === "u" || k === "U")) { ev.preventDefault(); input.value = input.value.slice(input.selectionStart); input.setSelectionRange(0, 0); render(); return; }
    if (ev.ctrlKey && (k === "a" || k === "A")) { ev.preventDefault(); input.setSelectionRange(0, 0); render(); return; }
    if (ev.ctrlKey && (k === "e" || k === "E")) { ev.preventDefault(); var e3 = input.value.length; input.setSelectionRange(e3, e3); render(); return; }
    if (ev.ctrlKey && (k === "w" || k === "W")) {
      ev.preventDefault();
      var pos = input.selectionStart, left = input.value.slice(0, pos).replace(/\S+\s*$/, "");
      input.value = left + input.value.slice(pos); input.setSelectionRange(left.length, left.length); render(); return;
    }
    requestAnimationFrame(render);
  });

  function focusInput() {
    if (window.getSelection && String(window.getSelection())) return;
    input.focus({ preventScroll: true });
    render();
  }
  screen.addEventListener("click", function () { fastBoot = true; if (!inputRow.hidden || S.busy) focusInput(); });
  screen.addEventListener("mouseup", function () { /* keep selection for copy */ });

  /* ===================================================== window chrome */
  var backdrop = null;
  function setMax(on) {
    term.classList.toggle("is-max", on);
    if (on && !backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "term-backdrop";
      backdrop.addEventListener("click", function () { setMax(false); });
      document.body.appendChild(backdrop);
      document.documentElement.style.overflow = "hidden";
    } else if (!on && backdrop) {
      backdrop.remove(); backdrop = null;
      document.documentElement.style.overflow = "";
    }
    termCols.w = 0;
    setTimeout(function () { scrollDown(); focusInput(); }, 30);
  }
  function closeWindow(msg) {
    if (S.abort) S.abort.abort();
    setMax(false);
    term.hidden = true;
    closedEl.hidden = false;
    var span = closedEl.querySelector("span");
    if (span) span.textContent = (msg ? msg + " " : "") + "Click the icon to reopen Terminal.";
  }
  function openWindow() {
    closedEl.hidden = true;
    term.hidden = false;
    term.classList.remove("is-min");
    out.innerHTML = "";
    resetState();
    printLogin();
    showPrompt();
    focusInput();
  }
  term.querySelectorAll(".light").forEach(function (b) {
    b.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var act = b.getAttribute("data-act");
      if (act === "close") closeWindow();
      else if (act === "min") { if (term.classList.contains("is-max")) setMax(false); term.classList.toggle("is-min"); }
      else if (act === "max") { term.classList.remove("is-min"); setMax(!term.classList.contains("is-max")); }
    });
  });
  term.querySelector(".mac-bar").addEventListener("dblclick", function (ev) {
    if (ev.target.closest(".light")) return;
    term.classList.remove("is-min");
    setMax(!term.classList.contains("is-max"));
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && term.classList.contains("is-max")) setMax(false);
  });
  if (reopenBtn) reopenBtn.addEventListener("click", openWindow);

  /* ============================================================= boot */
  function printLogin() {
    var d = new Date(Date.now() - rand(2, 50) * 60000);
    printHTML('<span class="t-dim">Last login: ' + DAY[d.getDay()] + " " + MON[d.getMonth()] + " " + lpad(d.getDate(), 2) + " " +
      two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds()) + " on ttys001</span>");
  }

  var fastBoot = reduced;
  var bootPromise = null;
  function typeInto(text) {
    var p = printHTML(promptHTML() + '<span class="b"></span><span class="cursor"></span>');
    var target = p.querySelector(".b"), cur = p.querySelector(".cursor");
    var i = 0;
    function step() {
      if (fastBoot || i >= text.length) { target.textContent = text; cur.remove(); return Promise.resolve(); }
      target.textContent = text.slice(0, ++i);
      return wait(45 + Math.random() * 45).then(step);
    }
    return wait(fastBoot ? 0 : 250).then(step);
  }
  function boot() {
    if (bootPromise) return bootPromise;
    resetState();
    printLogin();
    var demo = [["whoami", null], ["cat focus.txt", null]];
    var chain = Promise.resolve();
    demo.forEach(function (d) {
      chain = chain.then(function () { return typeInto(d[0]); }).then(function () {
        S.hist.push(d[0]); S.histIdx = S.hist.length;
        return execute(d[0]);
      }).then(function () { return fastBoot ? null : wait(350); });
    });
    bootPromise = chain.then(function () {
      printHTML('<span class="t-dim">Type </span><span class="t-bold">help</span><span class="t-dim"> to see what this shell can do, or try </span><span class="t-bold">neofetch</span><span class="t-dim">.</span>');
      showPrompt();
      input.tabIndex = 0;
    });
    return bootPromise;
  }

  resetState();
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); boot(); }
    }, { threshold: 0.3 });
    io.observe(term);
  } else boot();

  /* chips: run a command as if typed */
  document.querySelectorAll("#term-chips button").forEach(function (b) {
    b.addEventListener("click", function () {
      fastBoot = true;
      if (term.hidden) openWindow();
      boot().then(function () {
        if (S.busy) return;
        input.value = b.getAttribute("data-cmd");
        submit();
        focusInput();
      });
    });
  });
})();
