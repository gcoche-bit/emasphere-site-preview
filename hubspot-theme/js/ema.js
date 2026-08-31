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

/* 31/08 — affordance de défilement des languettes (.tabbar, filtres des catalogues) : quand le contenu
   déborde, deux petites flèches apparaissent aux extrémités ; elles se masquent au bord atteint. Remplace
   l'ancien fondu de bords, qui donnait l'impression d'un libellé coupé. Idempotent. */
(function () {
  var SEL = '.tabbar, fieldset.rcat__tabs, fieldset.ccat__tabs';
  function arm(el) {
    if (el.hasAttribute('data-tabscroll')) return;
    el.setAttribute('data-tabscroll', '');
    var wrap = document.createElement('div'); wrap.className = 'tabscroll';
    el.parentNode.insertBefore(wrap, el); wrap.appendChild(el);
    var prev = document.createElement('button'); prev.type = 'button'; prev.className = 'tabscroll__arrow tabscroll__arrow--left'; prev.textContent = '‹';
    var next = document.createElement('button'); next.type = 'button'; next.className = 'tabscroll__arrow tabscroll__arrow--right'; next.textContent = '›';
    var lang = (document.documentElement.lang || 'fr').slice(0, 2);
    var lbl = lang === 'en' ? ['Previous tabs', 'More tabs'] : lang === 'nl' ? ['Vorige tabs', 'Meer tabs'] : ['Onglets précédents', 'Onglets suivants'];
    prev.setAttribute('aria-label', lbl[0]); next.setAttribute('aria-label', lbl[1]);
    wrap.appendChild(prev); wrap.appendChild(next);
    /* Les mesures (scrollWidth/clientWidth) sont LUES dans une frame d'animation, jamais juste après
       les mutations ci-dessus : lire la géométrie après avoir touché le DOM force un calcul de mise en
       page synchrone (mesuré le 31/08 : 46 ms de reflow forcé au chargement, plusieurs languettes). */
    var pending = false;
    function paint() {
      pending = false;
      var over = el.scrollWidth > el.clientWidth + 2;
      prev.hidden = !over || el.scrollLeft <= 2;
      next.hidden = !over || el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    }
    function schedule() { if (pending) return; pending = true; requestAnimationFrame(paint); }
    prev.addEventListener('click', function () { el.scrollBy({ left: -el.clientWidth * 0.7, behavior: 'smooth' }); });
    next.addEventListener('click', function () { el.scrollBy({ left: el.clientWidth * 0.7, behavior: 'smooth' }); });
    el.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return schedule;
  }
  function all() {
    /* Toutes les mutations d'abord, toutes les mesures ensuite : un seul calcul de mise en page. */
    var painters = [];
    document.querySelectorAll(SEL).forEach(function (el) { var p = arm(el); if (p) painters.push(p); });
    if (painters.length) requestAnimationFrame(function () { painters.forEach(function (p) { p(); }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
})();

/* 31/08 — les animations en boucle (frise de logos, mur de témoignages, flux MCP, pulsations des
   repères) sont mises en PAUSE tant que leur section n'est pas à l'écran : mesuré sans effet sur une
   machine de bureau, mais c'est du travail de composition et de batterie rendu inutile sur une
   machine modeste, et une animation hors champ ne se voit pas. Aucun changement visuel. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  var SEL = '.lcloud--marquee .lcloud__list, .tstm__wall-row, .mcpf__diagram, .ptour__callouts';
  var els = document.querySelectorAll(SEL);
  if (!els.length) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.style.animationPlayState = e.isIntersecting ? '' : 'paused'; });
  }, { rootMargin: '200px 0px' });
  els.forEach(function (el) {
    io.observe(el);
    /* Les enfants animés (pastilles, particules) suivent leur conteneur. */
    el.querySelectorAll('[class*="dot"], [class*="particle"], [class*="pulse"]').forEach(function (c) { io.observe(c); });
  });
})();
