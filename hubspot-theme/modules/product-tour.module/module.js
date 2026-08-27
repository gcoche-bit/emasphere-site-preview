/* product-tour v2 — piloté par le lecteur.
   • Onglets (role=tab) : clic, flèches ↑↓←→, Début/Fin (tabindex tournant) → active un chapitre :
     écran, repères, panneau, onglet.
   • Au défilement (écran large) : section collée, chapitre par « station » — voir v3 plus bas.
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
    var current = 0, timer = null, stopped = false, visible = true, scrolly = false;
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
      if (!delay || stopped || timer || !visible || scrolly) return;
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

    /* Progression AU DÉFILEMENT, v3 (27/08). v2 capturait la molette (« blocage » ressenti dans
       les deux sens, écran calé trop haut). v3 : plus aucune capture. Sur écran large, la visite
       devient une section HAUTE (N « stations » de 60 vh) dont le contenu reste COLLÉ et centré
       dans la fenêtre ; la station qui croise le milieu de l'écran désigne le chapitre. Le
       défilement reste natif dans les deux sens. Une fois la visite parcourue et quittée par le
       bas, la section reprend sa hauteur normale (défilement compensé au pixel) : en remontant,
       elle se lit comme un bloc ordinaire — l'effet ne se vit qu'à la première descente. */
    var wide = window.matchMedia && window.matchMedia('(min-width: 992px)').matches;
    var done = false;
    if (wide && !reduce && 'IntersectionObserver' in window && tabs.length > 1) {
      scrolly = true;
      root.classList.add('is-scrolly');
      root.style.setProperty('--ptour-n', String(tabs.length));
      var stations = document.createElement('div');
      stations.className = 'ptour__stations'; stations.setAttribute('aria-hidden', 'true');
      tabs.forEach(function () { stations.appendChild(document.createElement('span')); });
      root.appendChild(stations);
      var kids = Array.prototype.slice.call(stations.children);
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { var k = kids.indexOf(e.target); if (k >= 0 && k !== current) activate(k, false); } });
      }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
      kids.forEach(function (k) { io.observe(k); });
      var finish = function () {
        if (done) return;
        var r = root.getBoundingClientRect();
        if (current < tabs.length - 1 || r.bottom > 0) return;
        done = true; io.disconnect();
        var before = root.offsetHeight;
        root.classList.remove('is-scrolly'); root.classList.add('is-done');
        stations.remove();
        var after = root.offsetHeight;
        window.scrollBy({ top: after - before, left: 0, behavior: 'instant' });
        window.removeEventListener('scroll', finish);
        scrolly = false; start();
      };
      window.addEventListener('scroll', finish, { passive: true });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { visible = e.isIntersecting; if (visible) start(); else if (timer) { clearInterval(timer); timer = null; } });
      }, { threshold: 0.35 }).observe(root);
    } else start();
  });
})();
