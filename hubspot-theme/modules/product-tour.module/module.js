/* product-tour v2 — piloté par le lecteur.
   • Onglets (role=tab) : clic, flèches ↑↓←→, Début/Fin (tabindex tournant) → active un chapitre :
     écran, repères, panneau, onglet.
   • Défilement automatique doux (data-autoplay en ms, 0 = désactivé) avec barre de progression ;
     s'arrête DÉFINITIVEMENT au premier clic / survol / focus ; jamais actif sous reduced-motion ;
     ne tourne que lorsque la visite est visible.
   • Sans JS : premier chapitre actif, tous les panneaux lisibles. Idempotent (plusieurs visites). */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-ptour]').forEach(function (root) {
    if (root.hasAttribute('data-ptour-ready')) return;
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-ptour-tab]'));
    if (!tabs.length) return;
    root.setAttribute('data-ptour-ready', '');
    var nav = root.querySelector('.ptour__nav');
    var bar = root.querySelector('[data-ptour-bar]');
    var current = 0, timer = null, stopped = false, visible = true;
    var delay = parseInt(root.getAttribute('data-autoplay'), 10) || 0;
    if (reduce) delay = 0;

    function activate(i, focus) {
      i = (i + tabs.length) % tabs.length; current = i;
      ['[data-ptour-tab]', '[data-ptour-screen]', '[data-ptour-callouts]', '[data-ptour-panel]'].forEach(function (sel) {
        root.querySelectorAll(sel).forEach(function (el) {
          var k = el.getAttribute('data-ptour-tab') || el.getAttribute('data-ptour-screen')
            || el.getAttribute('data-ptour-callouts') || el.getAttribute('data-ptour-panel');
          var on = String(i) === k;
          el.classList.toggle('is-active', on);
          if (el.hasAttribute('role') && el.getAttribute('role') === 'tab') {
            el.setAttribute('aria-selected', on ? 'true' : 'false');
            el.setAttribute('tabindex', on ? '0' : '-1');
          }
        });
      });
      if (focus) tabs[i].focus();
      restartBar();
    }
    function restartBar() {
      if (!bar || !delay || stopped) return;
      bar.classList.remove('is-running'); bar.classList.add('is-reset');
      void bar.offsetWidth; /* force le reflow : la barre repart de zéro */
      bar.classList.remove('is-reset'); bar.classList.add('is-running');
    }
    function stop() {
      if (stopped) return;
      stopped = true; if (timer) { clearInterval(timer); timer = null; }
      if (bar) bar.classList.remove('is-running');
      if (nav) nav.classList.add('is-stopped');
    }
    function start() {
      if (!delay || stopped || timer || !visible) return;
      root.style.setProperty('--ptour-delay', delay + 'ms');
      restartBar();
      timer = setInterval(function () { if (!document.hidden) activate(current + 1, false); }, delay);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { stop(); activate(i, false); });
      tab.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowDown' || k === 'ArrowRight') n = i + 1;
        else if (k === 'ArrowUp' || k === 'ArrowLeft') n = i - 1;
        else if (k === 'Home') n = 0;
        else if (k === 'End') n = tabs.length - 1;
        if (n === null) return;
        e.preventDefault(); stop(); activate(n, true);
      });
    });
    ['pointerenter', 'focusin', 'touchstart'].forEach(function (ev) { root.addEventListener(ev, stop, { passive: true }); });

    /* Progression AU DÉFILEMENT (retour Gaspard 26/08) — en plus du clic et du clavier.
       Quand la visite est bien visible (≥ 60 %) sur écran large et sans reduced-motion, la molette
       fait avancer/reculer d'un chapitre (seuil de 140 px cumulés, verrou de 700 ms). Au premier ou
       au dernier chapitre, le défilement de la page reprend normalement : jamais de piège. */
    var wide = window.matchMedia && window.matchMedia('(min-width: 992px)').matches;
    if (wide && !reduce) {
      var acc = 0, lock = 0, ratio = 0;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { es.forEach(function (e) { ratio = e.intersectionRatio; }); },
          { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] }).observe(root);
      } else ratio = 1;
      root.addEventListener('wheel', function (e) {
        if (ratio < 0.6) return;
        var dir = e.deltaY > 0 ? 1 : -1;
        var atEdge = (dir > 0 && current >= tabs.length - 1) || (dir < 0 && current <= 0);
        if (atEdge) { acc = 0; return; }
        e.preventDefault();
        var now = Date.now();
        if (now < lock) return;
        acc += e.deltaY;
        if (Math.abs(acc) >= 140) {
          acc = 0; lock = now + 700;
          if (timer) { clearInterval(timer); timer = null; } /* le scroll reprend la main sur l'autoplay */
          activate(current + dir, false);
        }
      }, { passive: false });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { visible = e.isIntersecting; if (visible) start(); else if (timer) { clearInterval(timer); timer = null; } });
      }, { threshold: 0.35 }).observe(root);
    } else start();
  });
})();
