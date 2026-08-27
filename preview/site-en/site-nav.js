/* site-nav.js — nav de l'APERÇU local (27/08). Même comportement que le mega-menu HubSpot :
   ouverture au survol (délai), au clic et au clavier ; aria-expanded ; Échap referme et rend
   le focus ; clic extérieur referme. Un seul panneau ouvert à la fois. */
(function () {
  var nav = document.querySelector('.sitenav'); if (!nav) return;
  var menus = nav.querySelectorAll('.sitenav__menu'); var timer;
  function close(except) { menus.forEach(function (m) { if (m === except) return; m.classList.remove('is-open'); m.querySelector('button').setAttribute('aria-expanded', 'false'); }); }
  function open(m) { close(m); m.classList.add('is-open'); m.querySelector('button').setAttribute('aria-expanded', 'true'); }
  menus.forEach(function (m) {
    var btn = m.querySelector('button');
    btn.addEventListener('click', function () { m.classList.contains('is-open') ? close() : open(m); });
    m.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'mouse') return; clearTimeout(timer); timer = setTimeout(function () { open(m); }, 120); });
    m.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'mouse') return; clearTimeout(timer); timer = setTimeout(function () { close(); }, 220); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); btn.focus(); } });
    m.addEventListener('focusout', function (e) { if (!m.contains(e.relatedTarget)) close(); });
  });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) close(); });
})();
