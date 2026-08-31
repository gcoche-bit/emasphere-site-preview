/* scroll-story — le moteur de secours. Si le navigateur connaît les animations pilotées par le
   défilement (animation-timeline), le CSS fait tout et ce script ne pose rien. Sinon il mesure la
   progression de la section (0 → 1 pendant la phase collée) et alimente les variables CSS que
   module.css lit sous `.no-sda` — mêmes points de passage que les keyframes. Rien ne tourne sous
   prefers-reduced-motion ni sous 768 px (état statique en CSS). Idempotent, plusieurs récits. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
  var sda = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (reduce || small || sda) return;

  /* Interpolation linéaire sur une table [[t, v], …] triée par t (t en %). */
  function kf(p, table) {
    var t = p * 100;
    if (t <= table[0][0]) return table[0][1];
    for (var i = 1; i < table.length; i++) {
      if (t <= table[i][0]) { var a = table[i - 1], b = table[i]; var r = (t - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * r; }
    }
    return table[table.length - 1][1];
  }
  var LABEL_S = function (c) { return [[c - 16, .62], [c - 4, 1], [c + 4, 1], [c + 14, 1.42]]; };
  var LABEL_O = function (c) { return [[c - 16, .3], [c - 4, 1], [c + 4, 1], [c + 14, 0]]; };
  var LABEL_B = function (c) { return [[c + 4, 0], [c + 14, 6]]; };
  var LINE = function (c) { return [[c - 12, 0], [c - 4, 1], [c + 6, 1], [c + 12, 0]]; };
  var CARD_O = function (c, first, last) { return first ? [[c + 4, 1], [c + 12, .45]] : last ? [[c - 12, .45], [c - 4, 1]] : [[c - 12, .45], [c - 4, 1], [c + 4, 1], [c + 12, .45]]; };

  document.querySelectorAll('[data-sstory]').forEach(function (root) {
    if (root.hasAttribute('data-sstory-ready')) return;
    root.setAttribute('data-sstory-ready', '');
    root.classList.add('no-sda');
    var title = root.querySelector('.sstory__title'), lede = root.querySelector('.sstory__lede');
    var plate = root.querySelector('.sstory__plate'), edges = root.querySelectorAll('.sstory__plate-edge');
    var labels = Array.prototype.slice.call(root.querySelectorAll('[data-sstory-label]'));
    var track = root.querySelector('[data-sstory-track]'), cards = Array.prototype.slice.call(root.querySelectorAll('[data-sstory-card]'));
    var outro = root.querySelector('.sstory__outro'), fill = root.querySelector('.sstory__progress-fill');
    var n = labels.length || 1;
    var centers = labels.map(function (_, i) { return 22 + i * (54 / Math.max(n - 1, 1)); });
    var set = function (el, k, v) { if (el) el.style.setProperty(k, v); };
    var ticking = false;

    function paint() {
      ticking = false;
      var rect = root.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      var total = rect.height - vh;
      var p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
      set(root, '--p', p.toFixed(4));
      set(title, '--clip', (100 - kf(p, [[0, 0], [8, 100]])).toFixed(2) + '%');
      set(title, '--o', kf(p, [[11, 1], [16, 0]]).toFixed(3));
      set(title, '--s', kf(p, [[11, 1], [16, .9]]).toFixed(3));
      set(title, '--ty', kf(p, [[11, 0], [16, -18]]).toFixed(1) + 'px');
      set(lede, '--o', kf(p, [[6, 0], [9, 1], [12, 1], [16, 0]]).toFixed(3));
      set(plate, '--o', kf(p, [[14, 0], [22, 1], [84, 1], [94, 0]]).toFixed(3));
      set(plate, '--s', kf(p, [[14, .84], [22, 1], [84, 1], [94, 1.12]]).toFixed(3));
      set(plate, '--tz', kf(p, [[14, -120], [22, 0], [84, 0], [94, 80]]).toFixed(1) + 'px');
      edges.forEach(function (e) { set(e, '--edge', kf(p, [[16, 0], [26, 1]]).toFixed(3)); });
      labels.forEach(function (l, i) {
        var c = centers[i];
        set(l, '--s', kf(p, LABEL_S(c)).toFixed(3)); set(l, '--o', kf(p, LABEL_O(c)).toFixed(3)); set(l, '--bl', kf(p, LABEL_B(c)).toFixed(2) + 'px');
        set(l, '--ln', kf(p, LINE(c)).toFixed(3));
      });
      set(track, '--k', kf(p, [[22, 0], [76, n - 1]]).toFixed(4));
      set(track, '--o', kf(p, [[14, 0], [20, 1], [86, 1], [94, 0]]).toFixed(3));
      cards.forEach(function (cd, i) { var c = centers[i]; var o = kf(p, CARD_O(c, i === 0, i === n - 1)); set(cd, '--o', o.toFixed(3)); set(cd, '--s', (0.96 + (o - .45) / .55 * .04).toFixed(3)); });
      var oo = kf(p, [[88, 0], [96, 1]]);
      set(outro, '--o', oo.toFixed(3)); set(outro, '--ty', (24 - 24 * oo).toFixed(1) + 'px'); set(outro, '--vis', oo > 0.02 ? 'visible' : 'hidden');
      set(fill, '--p', p.toFixed(4));
    }
    /* 31/08 (perf) : ne rien recalculer quand la scène n'est pas à l'écran. Sans ce garde-fou, chaque
       défilement de la page repeignait la chorégraphie (une trentaine d'écritures de variables CSS) même
       à 5 000 px de la section — c'est ce qui faisait « cristalliser » les pages longues. */
    var onView = true;
    function onScroll() { if (onView && !ticking) { ticking = true; window.requestAnimationFrame(paint); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { onView = e.isIntersecting; if (onView) onScroll(); });
      }, { rootMargin: '25% 0px 25% 0px' }).observe(root);
    }
    paint();
  });
})();
