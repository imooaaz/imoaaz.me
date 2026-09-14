/* imoaz.me — typed hero prompt, nav scroll-spy, copy email.
   No frameworks, no dependencies. */

(function () {
  "use strict";

  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- hero: type out the prompt, then let CSS reveal the rest ---- */
  var typed = document.querySelector(".hero-prompt .typed");
  if (typed) {
    var full = typed.getAttribute("data-type") || typed.textContent;
    if (prefersReducedMotion) {
      typed.textContent = full;
    } else {
      typed.textContent = "";
      var i = 0;
      (function tick() {
        if (i <= full.length) {
          typed.textContent = full.slice(0, i);
          i += 1;
          window.setTimeout(tick, 85);
        }
      })();
    }
  }

  /* ---- nav: highlight the section currently in view ---- */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".nav-links a")
  );
  var sections = navLinks
    .map(function (a) {
      return document.querySelector(a.getAttribute("href"));
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var observer = new IntersectionObserver(
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
    sections.forEach(function (s) {
      observer.observe(s);
    });
  }

  /* ---- contact: copy email with inline feedback ---- */
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
})();
