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

  /* 01/09 — TABLEAUX COMPARATIFS, ligne à ligne (les grands tableaux comptent treize arguments).
     Toujours par IntersectionObserver, même sur les navigateurs qui savent `animation-timeline` :
     le tableau est dans un conteneur à défilement horizontal, où une timeline `view()` reste figée
     (voir la note de comparison-table.module/module.css). C'est le script qui pose la classe
     masquante : sans JavaScript, aucune ligne n'est cachée. */
  if (!reduce) {
    document.querySelectorAll('.ctab--reveal').forEach(function (table) {
      var trs = Array.prototype.slice.call(table.querySelectorAll('tbody tr:not(:first-child)'));
      if (!trs.length) return;
      table.classList.add('js-reveal');
      /* Balayage plutôt qu'IntersectionObserver : un saut de défilement (ancre, Cmd+Fin, molette
         rapide) fait passer une ligne de « sous la fenêtre » à « au-dessus » sans jamais croiser
         l'observateur, qui la laissait alors masquée pour toujours — constaté en recette : six
         lignes sur douze restaient invisibles après un saut. Le test « la ligne est au-dessus du
         seuil » révèle aussi tout ce qui est déjà passé. Le balayage se débranche dès que la
         dernière ligne est révélée. */
      var pending = trs.slice(), ticking = false;
      function sweep() {
        ticking = false;
        var limit = (window.innerHeight || 0) * 0.92;
        pending = pending.filter(function (tr) {
          if (tr.getBoundingClientRect().top < limit) { tr.classList.add('is-in'); return false; }
          return true;
        });
        if (!pending.length) {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        }
      }
      function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(sweep); } }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      sweep();
    });
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

/* 02/09 — lecteur vidéo en boîte de dialogue (module video-dialog) : le HubL posait
   data-vdlg-open/-close sans qu'aucun script ne les écoute. L'URL vit dans data-src
   de l'iframe : rien n'est chargé avant le clic, et la fermeture stoppe la lecture. */
(function () {
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-vdlg-open]');
    if (opener) {
      var dlg = document.getElementById(opener.getAttribute('data-vdlg-open'));
      if (!dlg) return;
      var frame = dlg.querySelector('iframe[data-src], video[data-src]');
      if (frame && !frame.src) frame.src = frame.getAttribute('data-src');
      /* 02/09 — le CTA « Parler à un expert » est un LIEN vers la page Contact qui, avec JS, ouvre la
         modale Meetings à la place : sans preventDefault le navigateur suivrait le lien. Sans JS (ou
         si la boîte n'existe pas), le lien reste le repli. */
      if (opener.tagName === 'A') e.preventDefault();
      dlg.showModal();
      return;
    }
    var closer = e.target.closest('[data-vdlg-close]');
    if (closer) { var d = closer.closest('dialog'); if (d) d.close(); return; }
    var back = e.target.closest('dialog.vdlg');
    if (back && e.target === back) back.close();
  });
  document.addEventListener('close', function (e) {
    if (e.target.matches && e.target.matches('dialog.vdlg')) {
      var f = e.target.querySelector('iframe[data-src], video[data-src]');
      if (f) { if (f.pause) f.pause(); f.removeAttribute('src'); if (f.load) f.load(); }
    }
  }, true);
})();

/* 03/09 — LE PARCOURS ([data-parcours]) : le chapitre au CENTRE de l'écran devient courant
   (is-active : nœud rempli, segment de fil marqué, visuel net) et les chapitres déjà traversés
   gardent leur segment marqué (is-passed) — le fil raconte la progression. Survol / focus d'un
   chapitre : même allumage, immédiat. Sans JS : le premier chapitre est actif en dur dans le
   HTML et tous les liens fonctionnent. */
(function () {
  document.querySelectorAll('[data-parcours]').forEach(function (root) {
    if (root.hasAttribute('data-parcours-ready')) return;
    root.setAttribute('data-parcours-ready', '');
    var steps = Array.prototype.slice.call(root.querySelectorAll('[data-parcours-step]'));
    function activate(k) {
      steps.forEach(function (s, i) {
        s.classList.toggle('is-active', i === k);
        s.classList.toggle('is-passed', i < k);
      });
    }
    if ('IntersectionObserver' in window) {
      /* la « fenêtre courante » : une tranche de 16 % au centre de l'écran */
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) activate(steps.indexOf(e.target)); });
      }, { rootMargin: '-42% 0px -42% 0px' });
      steps.forEach(function (s) { io.observe(s); });
    }
    steps.forEach(function (s, i) {
      s.addEventListener('pointerenter', function () { activate(i); });
      s.addEventListener('focusin', function () { activate(i); });
    });
  });
})();

/* 03/09 — HERO SCÈNE ([data-hscene]) et CHIFFRES ÉPINGLÉS ([data-circle]) : repli JS quand le navigateur
   ne sait pas les animations pilotées par le défilement (pose --p, 0 → 1, sur la phase collée), et
   COMPTEUR des chiffres (data-count) à l'entrée dans l'écran, une seule fois. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sda = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  var roots = Array.prototype.slice.call(document.querySelectorAll('[data-hscene], [data-circle]'));
  if (!reduce && !sda && roots.length) {
    roots.forEach(function (r) { r.classList.add('no-sda'); });
    var tick = false;
    function paint() {
      tick = false;
      roots.forEach(function (r) {
        var rect = r.getBoundingClientRect(), vh = window.innerHeight || 1, total = rect.height - vh;
        var p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
        r.style.setProperty('--p', p.toFixed(4));
      });
    }
    window.addEventListener('scroll', function () { if (!tick) { tick = true; window.requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }
  /* compteur : « 10 000+ » → de 0 à 10 000, format d'origine conservé (espaces, +, %) */
  var nums = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if (!nums.length || reduce || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      var el = e.target, raw = el.getAttribute('data-count'), m = raw.match(/^([\d\s.,]+)(.*)$/);
      if (!m) return;
      var digits = m[1], suffix = m[2], target = parseFloat(digits.replace(/[\s.]/g, '').replace(',', '.')), sep = /\s/.test(digits) ? '\u202f' : '';
      var t0 = null, dur = 1400;
      function fmt(v) { var s = String(Math.round(v)); return (sep ? s.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : s) + suffix; }
      function step(ts) { if (!t0) t0 = ts; var k = Math.min(1, (ts - t0) / dur); var eased = 1 - Math.pow(1 - k, 3); el.textContent = fmt(target * eased); if (k < 1) window.requestAnimationFrame(step); else el.textContent = raw; }
      window.requestAnimationFrame(step);
    });
  }, { threshold: .6 });
  nums.forEach(function (n) { io.observe(n); });
})();

