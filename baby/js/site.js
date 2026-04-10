(function () {
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      if (window.matchMedia("(max-width: 900px)").matches) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  });
})();

(function () {
  var scrollBtn = document.querySelector(".scrollup");
  if (!scrollBtn) return;

  var rafId = 0;
  function update() {
    rafId = 0;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var show = y > 160;
    scrollBtn.classList.toggle("is-show", show);
  }

  window.addEventListener(
    "scroll",
    function () {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    },
    { passive: true }
  );
  update();

  scrollBtn.addEventListener("click", function (e) {
    e.preventDefault();
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (_) {
      window.scrollTo(0, 0);
    }
  });
})();

(function () {
  var root = document.getElementById("kidv3-carousel");
  if (!root) return;

  var track = root.querySelector(".kidv3-carousel-track");
  var slides = root.querySelectorAll(".kidv3-carousel-slide");
  var dots = root.querySelectorAll(".kidv3-carousel-dot");
  var prevBtn = root.querySelector(".kidv3-carousel-prev");
  var nextBtn = root.querySelector(".kidv3-carousel-next");
  var n = slides.length;
  if (!track || n === 0) return;

  var idx = 0;
  var intervalMs = parseInt(root.getAttribute("data-interval") || "5500", 10);
  var timer = null;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function go(to) {
    idx = ((to % n) + n) % n;
    track.style.transform = "translateX(-" + idx * 100 + "%)";
    slides.forEach(function (s, i) {
      s.setAttribute("aria-hidden", i === idx ? "false" : "true");
    });
    dots.forEach(function (d, i) {
      var on = i === idx;
      d.classList.toggle("is-active", on);
      d.setAttribute("aria-current", on ? "true" : "false");
    });
  }

  function next() {
    go(idx + 1);
  }

  function prev() {
    go(idx - 1);
  }

  function start() {
    if (reducedMotion || intervalMs < 800) return;
    stop();
    timer = window.setInterval(next, intervalMs);
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      prev();
      start();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      next();
      start();
    });
  }
  dots.forEach(function (d, i) {
    d.addEventListener("click", function () {
      go(i);
      start();
    });
  });

  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", function (e) {
    if (!root.contains(e.relatedTarget)) start();
  });

  go(0);
  start();
})();
