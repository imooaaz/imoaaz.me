/* imoaz.me — interactive terminal, scroll reveals, spotlight, progress.
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

  /* ================= interactive terminal ================= */
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

  var COMMANDS = {
    help: function () {
      line('<span class="t-cyan">available commands:</span>');
      line('  whoami       <span class="t-dim">who is this</span>');
      line('  cve          <span class="t-dim">CVE-2024-36436 summary</span>');
      line('  experience   <span class="t-dim">work history</span>');
      line('  skills       <span class="t-dim">what i work with</span>');
      line('  contact      <span class="t-dim">how to reach me</span>');
      line('  clear        <span class="t-dim">clear the terminal</span>');
    },
    whoami: function () {
      line('moaaz afifi — cybersecurity engineer &amp; penetration tester');
      line('<span class="t-dim">offensive security with a developer\'s mindset</span>');
    },
    cve: function () {
      line('<span class="t-amber">CVE-2024-36436</span> — WishList Member X <span class="t-dim">(wordpress plugin)</span>');
      line('class: exposure of sensitive information to an unauthorized actor <span class="t-dim">(CWE-200)</span>');
      line('the plugin\'s REST API secret key was returned in plaintext to');
      line('unauthenticated users in an AJAX response.');
      line('<span class="t-ok">status: patched</span> — found &amp; reported through coordinated disclosure');
    },
    experience: function () {
      line('hackerone     <span class="t-dim">cyber security researcher</span>        2023 — present');
      line('gcc           <span class="t-dim">security consultant &amp; pentester</span>  2025 — present');
      line('robusta rtg   <span class="t-dim">application security engineer</span>     2025');
      line('cybrany       <span class="t-dim">offensive security engineer</span>       2023 — 2024');
    },
    skills: function () {
      line('<span class="t-cyan">offensive</span>   web/mobile pentest · red teaming · bug bounty');
      line('<span class="t-cyan">process</span>     appsec · devsecops · ssdlc · reporting');
      line('<span class="t-cyan">engineering</span> javascript/node.js · mongodb · linux');
    },
    contact: function () {
      line('email    <span class="t-amber">imooaaz@gmail.com</span>');
      line('github   <span class="t-amber">github.com/m0442</span>');
      line('x        <span class="t-amber">@imooaaz</span>');
      line('<span class="t-dim">or scroll to the contact section for one-click copy</span>');
    },
    email: function () { COMMANDS.contact(); },
    sudo: function () {
      line('<span class="t-ok">permission denied</span> — nice try.');
    },
    exit: function () {
      line('<span class="t-dim">there is no escape — only disclosures.</span>');
    },
    clear: function () {
      body.innerHTML = "";
    }
  };

  function run(cmd) {
    var name = cmd.trim().toLowerCase();
    if (!name) return;
    line('<span class="p">$ </span>' + esc(cmd), "cmd");
    var fn = COMMANDS[name];
    if (fn) {
      fn();
    } else {
      line('command not found: ' + esc(name) + ' — <span class="t-dim">type</span> <span class="t-cyan">help</span>');
    }
    body.scrollTop = body.scrollHeight;
  }

  /* auto boot sequence, starts when the terminal scrolls into view */
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
      inputRow.hidden = false;
      return;
    }
    for (var i = 0; i < boot.length; i++) {
      await typeCmd(boot[i].cmd);
      await wait(160);
      boot[i].out();
      await wait(340);
    }
    await wait(200);
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

  /* interaction: click terminal focuses hidden input */
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
    }
  });

  /* chip shortcuts */
  document.querySelectorAll("#term-chips button").forEach(function (b) {
    b.addEventListener("click", function () {
      bootSequence();
      run(b.getAttribute("data-cmd"));
      realInput.focus({ preventScroll: true });
    });
  });
})();
