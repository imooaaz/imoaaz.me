/* imoaz.me — real-ish terminal, scroll reveals, spotlight, progress.
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
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
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

  /* ================= nav scroll-spy ================= */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".nav-links a")
  );
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (a) {
            a.classList.toggle(
              "active",
              a.getAttribute("href") === "#" + entry.target.id
            );
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ================= copy email ================= */
  document.querySelectorAll(".btn-copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var label = btn.querySelector(".btn-copy-label");
      function done() {
        if (!label) return;
        var was = label.textContent;
        label.textContent = "copied ✓";
        btn.classList.add("copied");
        window.setTimeout(function () {
          label.textContent = was;
          btn.classList.remove("copied");
        }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
    });
  });

  /* ================= logo marquee: seamless loop =================
     the track must be two identical halves, each wider than the
     viewport — otherwise a gap shows at the loop seam. */
  var mTrack = document.querySelector(".marquee-track");
  if (mTrack) {
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
     interactive terminal — a small real-ish shell
     ================================================================== */
  var term = document.getElementById("term");
  if (!term) return;

  var body = document.getElementById("term-body");
  var inputRow = document.getElementById("term-input-row");
  var mirror = document.getElementById("ti-text");
  var realInput = document.getElementById("term-real-input");

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

  async function typeCmd(cmd) {
    var p = line('<span class="p">$ </span><span class="c"></span>', "cmd");
    var target = p.querySelector(".c");
    if (reduced) {
      target.textContent = cmd;
      return;
    }
    for (var i = 0; i <= cmd.length; i++) {
      target.textContent = cmd.slice(0, i);
      body.scrollTop = body.scrollHeight;
      await wait(55);
    }
  }

  /* ---------------- virtual filesystem ---------------- */
  var FILES = {
    "about.txt": [
      "moaaz afifi — cybersecurity engineer & penetration tester.",
      "i came to security from software development: i read code,",
      "not just responses. offensive security with a developer's",
      "mindset — appsec, devsecops, and bug bounty."
    ],
    "focus.txt": [
      "web & mobile pentest / appsec / devsecops / ai security"
    ],
    "skills.json": [
      '{',
      '  "offensive":    ["web pentest", "mobile pentest", "red teaming", "bug bounty"],',
      '  "process":      ["appsec", "devsecops", "ssdlc", "technical reporting"],',
      '  "engineering":  ["javascript/node.js", "mongodb", "linux", "code review"]',
      '}'
    ],
    "experience.log": [
      "2023—now   hackerone      cyber security researcher",
      "2025—now   gcc            security consultant & pentester",
      "2025       robusta (rtg)  application security engineer",
      "2023—2024  cybrany        offensive security engineer",
      "2022       al-bunyan      software engineer (mern, intern)"
    ],
    "contact.md": [
      "email   : imooaaz@gmail.com",
      "github  : github.com/m0442",
      "x       : @imooaaz",
      "disclose: /.well-known/security.txt"
    ],
    ".zshrc": [
      "# nothing up my sleeve",
      "alias please='sudo'"
    ]
  };
  var DIRS = { "cves": ["CVE-2024-36436.txt"] };
  var CVE_FILE = [
    "CVE-2024-36436 — WishList Member X (wordpress plugin)",
    "class  : exposure of sensitive information (CWE-200)",
    "impact : the plugin's REST API secret key was returned in",
    "         plaintext to unauthenticated users in an AJAX response.",
    "status : patched — found & reported via coordinated disclosure"
  ];

  function resolve(arg) {
    // returns {kind:'file', lines:[]} | {kind:'dir', name:} | null
    var path = arg.replace(/^~\//, "").replace(/^\.?\//, "");
    if (path === "" || path === ".") return { kind: "dir", name: "" };
    var parts = path.split("/").filter(Boolean);
    if (parts.length === 1) {
      var name = parts[0];
      if (name === "cves" && !cwd) return { kind: "dir", name: "cves" };
      if (!cwd && FILES[name]) return { kind: "file", lines: FILES[name] };
      if (cwd === "cves" && name === "CVE-2024-36436.txt") {
        return { kind: "file", lines: CVE_FILE };
      }
    }
    if (parts.length === 2 && parts[0] === "cves" && parts[1] === "CVE-2024-36436.txt") {
      return { kind: "file", lines: CVE_FILE };
    }
    return null;
  }

  var cwd = ""; // "" = ~, "cves"
  var hist = [];
  var histIdx = -1;

  function shortDir() { return cwd === "" ? "~" : "~/" + cwd; }

  /* ---------------- commands ---------------- */
  var COMMANDS = {
    help: function () {
      line('<span class="t-cyan">portfolio</span>   whoami · cve · experience · skills · contact');
      line('<span class="t-cyan">files</span>       ls · cd · cat · pwd · echo');
      line('<span class="t-cyan">system</span>      date · uname · id · hostname · history · man');
      line('<span class="t-cyan">recon</span>       nmap · ping · whois');
      line('<span class="t-cyan">misc</span>        help · clear · exit');
      line('<span class="t-dim">TAB completes · ↑ recalls history · try `cat about.txt`</span>');
    },
    whoami: function () {
      line('moaaz afifi — cybersecurity engineer &amp; penetration tester');
      line('<span class="t-dim">offensive security with a developer\'s mindset</span>');
    },
    id: function () {
      line('uid=1000(moaaz) gid=1000(moaaz) groups=1000(moaaz),27(appsec),1337(bugbounty)');
    },
    pwd: function () {
      line(cwd === "" ? "/home/moaaz" : "/home/moaaz/" + cwd);
    },
    hostname: function () { line('imoaz.me'); },
    date: function () { line(esc(new Date().toString())); },
    uname: function (args) {
      if (args.indexOf('-a') !== -1) {
        line('Linux imoaz.me 6.6.0-hardened #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux');
      } else {
        line('Linux');
      }
    },
    ls: function (args) {
      var target = args.filter(function (a) { return a[0] !== "-"; })[0] || "";
      var all = args.some(function (a) { return a.indexOf('a') !== -1 && a[0] === '-'; });
      if (target) {
        var r = resolve(target);
        if (!r) { line('ls: cannot access \'' + esc(target) + '\': No such file or directory'); return; }
        if (r.kind === 'file') { line(esc(target)); return; }
      }
      var names = [];
      if (all) names.push('.', '..');
      if (!cwd) {
        var entries = Object.keys(DIRS).map(function (d) { return '<span class="t-cyan">' + d + '/</span>'; });
        var hidden = all ? ['<span class="t-dim">.zshrc</span>'] : [];
        var plain = Object.keys(FILES).filter(function (f) { return f[0] !== '.'; });
        names = names.concat(hidden, entries, plain.map(esc));
      } else {
        names = names.concat(DIRS.cves.map(esc));
      }
      line(names.join('  '));
    },
    cd: function (args) {
      var target = args[0] || "~";
      if (target === "~" || target === "/" ) { cwd = ""; return; }
      if (target === "..") { cwd = ""; return; }
      if (target === "cves" && !cwd) { cwd = "cves"; return; }
      line('cd: ' + esc(target) + ': No such file or directory');
    },
    cat: function (args) {
      if (!args.length) { line('<span class="t-dim">(petting the cat… nothing to read)</span>'); return; }
      var r = resolve(args[0]);
      if (!r) { line('cat: ' + esc(args[0]) + ': No such file or directory'); return; }
      if (r.kind === 'dir') { line('cat: ' + esc(args[0]) + ': Is a directory'); return; }
      r.lines.forEach(function (l) { line(esc(l)); });
    },
    echo: function (args) {
      var text = args.join(" ").replace(/^["']|["']$/g, "");
      line(esc(text));
    },
    history: function () {
      hist.forEach(function (h, i) { line('<span class="t-dim">  ' + (i + 1) + '</span>  ' + esc(h)); });
    },
    clear: function () { body.innerHTML = ""; },
    man: function (args) {
      var t = (args[0] || "").toLowerCase();
      var mans = {
        man: 'man — the manual. you are reading it.',
        whoami: 'whoami — prints the human behind the terminal.',
        cve: 'cve — summary of CVE-2024-36436 (see also: cat cves/CVE-2024-36436.txt).',
        nmap: 'nmap — scans the portfolio. findings: 1 open port, 0 known exploits.',
        sudo: 'sudo — try it. see what happens.',
        ls: 'ls — list files. -a shows the dotfiles nobody admits to.'
      };
      line(mans[t] || 'No manual entry for ' + esc(t || '?'));
    },
    nmap: async function (args) {
      var host = args.filter(function (a) { return a[0] !== '-'; })[0] || "imoaz.me";
      line('Starting Nmap 7.94 ( https://nmap.org ) at ' + new Date().toUTCString());
      line('Nmap scan report for <span class="t-amber">' + esc(host) + '</span>');
      line('Host is up (0.00042s latency).');
      await wait(500);
      line('PORT     STATE  SERVICE');
      line('443/tcp  open   https   <span class="t-dim">portfolio, hardened</span>');
      line('1337/tcp open   elite   <span class="t-dim">bugbounty</span>');
      await wait(450);
      line('Nmap done: 1 host up scanned in 2.04 seconds');
    },
    ping: async function (args) {
      var host = args.filter(function (a) { return a[0] !== '-'; })[0] || "imoaz.me";
      line('PING ' + esc(host) + ' 56(84) bytes of data.');
      await wait(420);
      line('64 bytes from ' + esc(host) + ': icmp_seq=1 ttl=64 time=0.042 ms');
      await wait(420);
      line('64 bytes from ' + esc(host) + ': icmp_seq=2 ttl=64 time=0.038 ms');
      await wait(420);
      line('<span class="t-dim">--- ' + esc(host) + ' ping statistics ---</span>');
      line('2 packets transmitted, 2 received, 0% packet loss');
    },
    whois: function (args) {
      var t = (args[0] || "moaaz").toLowerCase();
      if (t === "moaaz" || t === "imoaaz.me") {
        line('Registry:    PORTFOLIO-WHOIS');
        line('Name:        MOAAZ AFIFI');
        line('Role:        Cybersecurity Engineer & Penetration Tester');
        line('Creds:       eCPPT · eWPTX · eMAPT · CVE-2024-36436');
        line('Status:      open for pentest & research work');
        line('Contact:     imooaaz@gmail.com');
      } else {
        line('whois: ' + esc(t) + ': not found in this registry');
      }
    },
    sudo: function (args) {
      if (args.join(" ") === "make me a sandwich") {
        line('<span class="t-ok">okay.</span> 🥪');
        return;
      }
      line('moaaz is not in the sudoers file. <span class="t-dim">This incident will be reported.</span>');
    },
    rm: function (args) {
      var a = args.join(" ");
      if (a.indexOf("-rf") !== -1 && (a.indexOf("/") !== -1 || a.indexOf("*") !== -1)) {
        line('<span class="t-ok">nice try.</span> filesystem is immutable — disclosed responsibly.');
      } else {
        line('rm: cannot remove: read-only filesystem');
      }
    },
    exit: function () {
      line('<span class="t-dim">there is no escape — only disclosures.</span>');
    },
    /* portfolio aliases */
    cve: function () { COMMANDS.cat(["cves/CVE-2024-36436.txt"]); },
    experience: function () { COMMANDS.cat(["experience.log"]); },
    skills: function () { COMMANDS.cat(["skills.json"]); },
    contact: function () { COMMANDS.cat(["contact.md"]); },
    email: function () { COMMANDS.contact(); }
  };

  function run(raw) {
    var input = raw.trim();
    if (!input) return;
    hist.push(input);
    histIdx = hist.length;
    line('<span class="p">$ </span>' + esc(input), "cmd");

    var parts = input.split(/\s+/);
    var name = parts[0].toLowerCase();
    var args = parts.slice(1);
    var fn = COMMANDS[name];
    if (fn) {
      fn(args);
    } else {
      line('bash: ' + esc(name) + ': command not found — <span class="t-dim">type</span> <span class="t-cyan">help</span>');
    }
    body.scrollTop = body.scrollHeight;
  }

  /* ---------------- boot sequence ---------------- */
  var boot = [
    { cmd: "whoami", out: function () {
        line('moaaz_afifi — <span class="t-dim">cybersecurity engineer &amp; pentester</span>');
      } },
    { cmd: "cat focus.txt", out: function () {
        line('web &amp; mobile pentest <span class="t-dim">/</span> appsec <span class="t-dim">/</span> devsecops <span class="t-dim">/</span> ai security');
      } },
    { cmd: "ls credentials/", out: function () {
        line('<span class="t-amber">CVE-2024-36436</span>  eCPPT  eWPTX  eMAPT');
      } },
    { cmd: "./status.sh", out: function () {
        line('<span class="t-ok">[ok]</span> open for pentest &amp; research work');
      } }
  ];

  var booted = false;
  async function bootSequence() {
    if (booted) return;
    booted = true;
    if (reduced) {
      boot.forEach(function (s) {
        line('<span class="p">$ </span>' + s.cmd, "cmd");
        s.out();
      });
      finishBoot();
      return;
    }
    for (var i = 0; i < boot.length; i++) {
      await typeCmd(boot[i].cmd);
      await wait(160);
      boot[i].out();
      await wait(340);
    }
    await wait(200);
    finishBoot();
  }

  function finishBoot() {
    line('<span class="t-dim">[' + shortDir() + '] type help — TAB completes, ↑ recalls</span>');
    inputRow.hidden = false;
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
    if (!inputRow.hidden) realInput.focus();
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
      line('<span class="p">$ </span>' + esc(realInput.value) + '<span class="t-dim">^C</span>', "cmd");
      realInput.value = "";
      mirror.textContent = "";
    }
    body.scrollTop = body.scrollHeight;
  });

  function tabComplete() {
    var val = realInput.value;
    var pool;
    var prefix;
    var space = val.lastIndexOf(" ");

    if (space === -1) {
      pool = Object.keys(COMMANDS);
      prefix = val;
    } else {
      var head = val.slice(0, space + 1);
      var tail = val.slice(space + 1);
      var cmdName = head.trim().toLowerCase();
      if (cmdName === "cat" || cmdName === "ls") {
        pool = !cwd
          ? Object.keys(FILES).concat(Object.keys(DIRS))
          : DIRS.cves;
      } else if (cmdName === "cd") {
        pool = Object.keys(DIRS);
      } else {
        return;
      }
      prefix = tail;
    }

    var matches = pool.filter(function (c) {
      return c.lastIndexOf(prefix, 0) === 0;
    });

    if (matches.length === 1) {
      realInput.value = (space === -1 ? "" : val.slice(0, space + 1)) + matches[0] + " ";
      mirror.textContent = realInput.value;
    } else if (matches.length > 1) {
      line('<span class="p">$ </span>' + esc(val), "cmd");
      line(matches.join('  '));
      body.scrollTop = body.scrollHeight;
    }
  }

  /* chip shortcuts */
  document.querySelectorAll("#term-chips button").forEach(function (b) {
    b.addEventListener("click", function () {
      bootSequence();
      run(b.getAttribute("data-cmd"));
      realInput.focus({ preventScroll: true });
    });
  });
})();
