/* ema.js — le mouvement du thème, en un fichier, sans dépendance.
   Trois comportements que le CSS seul ne rend pas partout :
   1. auto-avance des rails (`[data-autoplay]`), en pause au survol/focus, arrêtée dès
      que le lecteur touche le rail, jamais active si prefers-reduced-motion ;
   2. révélation au défilement, repli pour les navigateurs sans animation-timeline ;
   3. ouverture du menu déployé au survol (avec intention : 120 ms), fermeture en quittant.
   Idempotent : plusieurs instances cohabitent, et rien ne casse si un élément manque. */
(function () {
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. AUTO-AVANCE */
  if (!reduce) {
    document.querySelectorAll('[data-autoplay]').forEach(function (track) {
      var every = parseInt(track.getAttribute('data-autoplay'), 10) || 6000;
      var timer = null, stopped = false, paused = false;
      function step() {
        var first = track.firstElementChild; if (!first) return 0;
        var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0') || 0;
        return first.getBoundingClientRect().width + gap;
      }
      function tick() {
        if (stopped || paused || document.hidden) return;
        var max = track.scrollWidth - track.clientWidth - 1;
        if (track.scrollLeft >= max) track.scrollTo({ left: 0, behavior: 'smooth' });
        else track.scrollBy({ left: step(), behavior: 'smooth' });
      }
      function start() { if (!timer) timer = setInterval(tick, every); }
      function stop() { stopped = true; if (timer) { clearInterval(timer); timer = null; } }
      track.addEventListener('mouseenter', function () { paused = true; });
      track.addEventListener('mouseleave', function () { paused = false; });
      track.addEventListener('focusin', function () { paused = true; });
      track.addEventListener('focusout', function () { paused = false; });
      ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (ev) {
        track.addEventListener(ev, stop, { passive: true });
      });
      var root = track.closest('.crsl, .tstm') || track;
      root.querySelectorAll('[data-crsl]').forEach(function (b) { b.addEventListener('click', stop); });
      /* Ne tourne que lorsque le rail est visible : un rail hors écran qui défile
         consomme pour rien. */
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) start(); else if (timer) { clearInterval(timer); timer = null; } });
        }, { threshold: 0.4 }).observe(track);
      } else start();
    });
  }

  /* 2. RÉVÉLATION — seulement là où le CSS n'a pas animation-timeline. */
  var hasTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (!hasTimeline && !reduce && 'IntersectionObserver' in window) {
    var rows = document.querySelectorAll('.ema-sec.fx-band-reveal .dnd-row, .ema-sec.fx-band-stagger .dnd-row');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    rows.forEach(function (r) { io.observe(r); });
  }

  /* 3. MENU AU SURVOL — le clic reste la référence (clavier, tactile) ; le survol
     ouvre après 120 ms d'intention et referme 180 ms après avoir quitté la barre,
     le temps de descendre dans le panneau. Sur écran tactile (pas de hover), rien. */
  if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('[data-mmenu]').forEach(function (root) {
      var openT = null, closeT = null;
      root.querySelectorAll('[data-mmenu-trigger]').forEach(function (trigger) {
        var panel = document.getElementById(trigger.getAttribute('aria-controls'));
        if (!panel) return;
        var item = trigger.parentElement;
        function open() {
          root.querySelectorAll('[data-mmenu-trigger][aria-expanded="true"]').forEach(function (t) {
            if (t === trigger) return;
            t.setAttribute('aria-expanded', 'false');
            var p = document.getElementById(t.getAttribute('aria-controls')); if (p) p.hidden = true;
          });
          trigger.setAttribute('aria-expanded', 'true'); panel.hidden = false;
        }
        function close() { trigger.setAttribute('aria-expanded', 'false'); panel.hidden = true; }
        [item, panel].forEach(function (el) {
          el.addEventListener('mouseenter', function () { clearTimeout(closeT); openT = setTimeout(open, 120); });
          el.addEventListener('mouseleave', function () { clearTimeout(openT); closeT = setTimeout(close, 180); });
        });
      });
    });
  }
})();
