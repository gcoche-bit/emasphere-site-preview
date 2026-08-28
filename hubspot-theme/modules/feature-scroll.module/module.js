/* feature-scroll — le panneau collé suit la lecture. L'étape de droite qui croise le milieu de
   l'écran désigne la carte de gauche (IntersectionObserver, bande de 10 % au centre) ; les liens
   précédent / suivant reçoivent le titre et l'ancre des étapes voisines. Sans JavaScript : première
   carte affichée, liens masqués, tout le contenu lisible. Idempotent, plusieurs parcours par page. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-fscroll]').forEach(function (root) {
    if (root.hasAttribute('data-fscroll-ready')) return;
    root.setAttribute('data-fscroll-ready', '');
    var steps = Array.prototype.slice.call(root.querySelectorAll('[data-fscroll-step]'));
    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-fscroll-card]'));
    var nav = root.querySelector('[data-fscroll-nav]');
    var prev = root.querySelector('[data-fscroll-prev]'), next = root.querySelector('[data-fscroll-next]');
    if (steps.length < 2 || !cards.length) return;
    var current = 0;

    function setJump(a, i) {
      if (!a) return;
      var ok = i >= 0 && i < steps.length;
      a.hidden = !ok;
      if (!ok) return;
      a.href = '#' + steps[i].id;
      /* Titre court : la partie avant « : » quand il y en a une (« Trésorerie : des fonctionnalités… » → « Trésorerie »). */
      var full = steps[i].getAttribute('data-fscroll-title') || ''; var short = full.split(/\s[:–—]\s/)[0];
      var t = a.querySelector('.fscroll__jump-text'); if (t) t.textContent = short || full;
    }
    function activate(i) {
      current = i;
      cards.forEach(function (c, k) { c.classList.toggle('is-active', k === i); });
      steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      setJump(prev, i - 1); setJump(next, i + 1);
    }
    if (nav) nav.hidden = false;
    [prev, next].forEach(function (a) {
      if (!a) return;
      a.addEventListener('click', function (e) {
        var id = (a.getAttribute('href') || '').slice(1); var el = id && document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      });
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var k = steps.indexOf(en.target); if (k >= 0 && k !== current) activate(k);
        });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      steps.forEach(function (s) { io.observe(s); });
    }
    activate(0);
  });
})();
