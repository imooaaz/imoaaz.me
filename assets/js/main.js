/* imoaaz — site chrome: nav, scroll reveals, spotlight, progress, copy.
   The interactive terminal lives in terminal.js.
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
      navToggle.textContent = open ? "Close" : "Menu";
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
    document.querySelectorAll('.nav-links a[href^="#"], .tabbar a[href^="#"]')
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
        label.textContent = "Copied ✓";
      }, function () {
        label.textContent = "Copy failed";
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

  /* ================= filters (blog topics, project kinds) ================= */
  document.querySelectorAll(".filter-chips").forEach(function (group) {
    var grid = document.querySelector(group.getAttribute("data-target") || "#post-grid");
    if (!grid) return;
    var chips = Array.prototype.slice.call(group.querySelectorAll(".chip"));
    var items = Array.prototype.slice.call(grid.querySelectorAll("[data-tags]"));
    var empty = grid.parentNode.querySelector(".filter-empty");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var f = chip.getAttribute("data-filter");
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle("is-active", on);
          c.setAttribute("aria-pressed", on ? "true" : "false");
        });
        var shown = 0;
        items.forEach(function (it) {
          var match = f === "all" || it.getAttribute("data-tags").split(",").indexOf(f) !== -1;
          it.hidden = !match;
          if (match) { shown++; it.classList.add("in"); }
        });
        if (empty) empty.hidden = shown > 0;
      });
    });
  });

  /* ================= article: table of contents ================= */
  var toc = document.querySelector(".toc");
  var heads = Array.prototype.slice.call(document.querySelectorAll(".post-body h2"));
  if (toc && heads.length >= 2) {
    var list = toc.querySelector(".toc-list");
    var links = heads.map(function (h, i) {
      if (!h.id) {
        h.id = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section-" + (i + 1);
      }
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      list.appendChild(li);
      return a;
    });
    toc.hidden = false;
    var tocTick = false;
    var tocSync = function () {
      tocTick = false;
      var mark = window.innerHeight * 0.3, idx = -1;
      heads.forEach(function (h, i) { if (h.getBoundingClientRect().top <= mark) idx = i; });
      links.forEach(function (a, i) { a.classList.toggle("active", i === idx); });
    };
    window.addEventListener("scroll", function () {
      if (!tocTick) { tocTick = true; window.requestAnimationFrame(tocSync); }
    }, { passive: true });
    tocSync();
  }

  /* ================= contact form =================
     Sends through Web3Forms when data-web3forms-key is set;
     otherwise opens the visitor's email app with the message filled in. */
  var form = document.getElementById("contact-form");
  if (form) {
    var statusEl = form.querySelector(".form-status");
    var submitBtn = form.querySelector(".form-submit");
    var submitLabel = form.querySelector(".form-submit-label");
    var MESSAGES = {
      name: "Please enter your name.",
      email: "Please enter a valid email address.",
      message: "Please write at least 20 characters."
    };

    var setError = function (input, msg) {
      var field = input.closest(".field");
      var err = field.querySelector(".field-error");
      if (msg) {
        if (!err) {
          err = document.createElement("p");
          err.className = "field-error";
          err.id = input.id + "-error";
          field.appendChild(err);
        }
        err.textContent = msg;
        field.classList.add("invalid");
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", err.id);
      } else {
        if (err) err.remove();
        field.classList.remove("invalid");
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
    };
    var validate = function () {
      var firstBad = null;
      ["name", "email", "message"].forEach(function (n) {
        var el = form.elements[n];
        el.value = el.value.trim() === "" ? "" : el.value;
        var min = parseInt(el.getAttribute("minlength") || "1", 10);
        var ok = el.checkValidity() && el.value.trim().length >= min;
        setError(el, ok ? "" : MESSAGES[n]);
        if (!ok && !firstBad) firstBad = el;
      });
      if (firstBad) firstBad.focus();
      return !firstBad;
    };
    ["name", "email", "message"].forEach(function (n) {
      form.elements[n].addEventListener("blur", function () {
        var min = parseInt(this.getAttribute("minlength") || "1", 10);
        if (this.value) setError(this, this.checkValidity() && this.value.trim().length >= min ? "" : MESSAGES[n]);
      });
      form.elements[n].addEventListener("input", function () {
        if (this.closest(".field").classList.contains("invalid") && this.checkValidity()) setError(this, "");
      });
    });

    var setStatus = function (msg, kind) {
      statusEl.textContent = msg;
      statusEl.className = "form-status" + (kind ? " " + kind : "");
    };
    var busy = function (on) {
      submitBtn.disabled = on;
      submitBtn.classList.toggle("is-loading", on);
      submitLabel.textContent = on ? "Sending" : "Send message";
    };

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (form.elements.botcheck.checked) return; /* bot */
      if (!validate()) { setStatus("Please fix the highlighted fields.", "err"); return; }

      var data = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        topic: form.elements.topic.value,
        message: form.elements.message.value.trim()
      };
      var key = (form.getAttribute("data-web3forms-key") || "").trim();

      if (!key) {
        var to = form.getAttribute("data-to");
        var subject = "[" + data.topic + "] from " + data.name;
        var body = data.message + "\n\n— " + data.name + " <" + data.email + ">";
        window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        setStatus("Your email app should open with the message ready to send.", "ok");
        return;
      }

      busy(true);
      setStatus("");
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: key,
          subject: "New message from the site: " + data.topic,
          from_name: "imoaaz.pages.dev",
          name: data.name,
          email: data.email,
          replyto: data.email,
          topic: data.topic,
          message: data.message,
          botcheck: false
        })
      }).then(function (r) {
        return r.json().catch(function () { return { success: false }; });
      }).then(function (res) {
        busy(false);
        if (res && res.success) {
          form.classList.add("sent");
          form.reset();
          setStatus("Thanks, your message is on its way. I'll reply by email.", "ok");
          submitBtn.disabled = true;
          submitLabel.textContent = "Sent ✓";
        } else {
          setStatus("Couldn't send right now. Please email imooaaz@gmail.com directly.", "err");
        }
      }).catch(function () {
        busy(false);
        setStatus("Network error. Please try again, or email imooaaz@gmail.com directly.", "err");
      });
    });
  }

  /* ================= contact intents (hiring, consultation, training, project) ================= */
  var topicSel = document.getElementById("cf-topic");
  var msgBox = document.getElementById("cf-message");
  var intentBtns = Array.prototype.slice.call(document.querySelectorAll(".intent"));
  if (topicSel && msgBox) {
    var HINTS = {
      "Job opportunity / hiring": "The role, team, location or remote, and how you found me.",
      "Consultation": "What you'd like to discuss, and a few times that work for you.",
      "Training / workshop": "Audience, topics, format (online or on-site), and preferred dates.",
      "Penetration test": "Scope (web, API, mobile), environment, and timeline."
    };
    var DEFAULT_HINT = msgBox.getAttribute("placeholder");
    var syncIntent = function () {
      var v = topicSel.value;
      intentBtns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-topic") === v ? "true" : "false"); });
      msgBox.setAttribute("placeholder", HINTS[v] || DEFAULT_HINT);
    };
    var chooseIntent = function (topic) {
      topicSel.value = topic;
      syncIntent();
    };
    intentBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        chooseIntent(b.getAttribute("data-topic"));
        document.getElementById("cf-name").focus({ preventScroll: true });
        document.getElementById("contact-form").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      });
    });
    topicSel.addEventListener("change", syncIntent);
    topicSel.form.addEventListener("reset", function () { setTimeout(syncIntent, 0); });
    document.querySelectorAll("[data-intent]").forEach(function (a) {
      a.addEventListener("click", function () { chooseIntent(a.getAttribute("data-intent")); });
    });
    syncIntent();
  }
})();
