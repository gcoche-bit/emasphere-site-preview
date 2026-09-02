/* site-nav.js — nav de l'APERÇU local (27/08). Même comportement que le mega-menu HubSpot :
   ouverture au survol (délai), au clic et au clavier ; aria-expanded ; Échap referme et rend
   le focus ; clic extérieur referme. Un seul panneau ouvert à la fois. */
(function () {
  var nav = document.querySelector('.sitenav'); if (!nav) return;
  var menus = nav.querySelectorAll('.sitenav__menu'); var timer;
  function close(except) { menus.forEach(function (m) { if (m === except) return; m.classList.remove('is-open'); m.querySelector('button').setAttribute('aria-expanded', 'false'); }); }
  function open(m) { close(m); m.classList.add('is-open'); m.querySelector('button').setAttribute('aria-expanded', 'true');
    /* 02/09 — mobile : le panneau s'insère dans le flux du tiroir ; on remonte le bouton ouvert en
       haut pour que le niveau 2 commence à l'écran (Gaspard : « doit remonter plus haut »). */
    if (window.matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(function () { m.scrollIntoView({ block: 'start', behavior: 'smooth' }); }); }
  menus.forEach(function (m) {
    var btn = m.querySelector('button');
    btn.addEventListener('click', function () { m.classList.contains('is-open') ? close() : open(m); });
    m.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'mouse') return; clearTimeout(timer); timer = setTimeout(function () { open(m); }, 120); });
    m.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'mouse') return; clearTimeout(timer); timer = setTimeout(function () { close(); }, 220); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); btn.focus(); } });
    var closer = m.querySelector('.sitenav__close'); if (closer) closer.addEventListener('click', function () { close(); btn.focus(); });
    m.addEventListener('focusout', function (e) { if (!m.contains(e.relatedTarget)) close(); });
  });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) close(); });
  /* 02/09 (Gaspard : « le menu semble figé et coupe l'accès à certaines pages ») — le pointerleave du
     <li> ne suffisait pas : le panneau restait ouvert quand la souris rejoignait la page. Fermeture
     ROBUSTE : dès que le pointeur (souris) circule hors de l'en-tête, ou que la page défile. */
  var leaveTimer;
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !nav.querySelector('.sitenav__menu.is-open')) return;
    if (nav.contains(e.target)) { clearTimeout(leaveTimer); return; }
    clearTimeout(leaveTimer); leaveTimer = setTimeout(function () { close(); }, 160);
  }, { passive: true });
  window.addEventListener('scroll', function () {
    if (window.matchMedia('(min-width: 1024px)').matches && nav.querySelector('.sitenav__menu.is-open')) close();
  }, { passive: true });
  /* 02/09 — burger mobile : replie/déplie la nav ; Échap referme et rend le focus. */
  var burger = nav.querySelector('.sitenav__burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var openNow = nav.classList.toggle('is-menu-open');
      burger.setAttribute('aria-expanded', openNow ? 'true' : 'false');
      if (!openNow) close();
    });
    nav.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-menu-open')) {
        nav.classList.remove('is-menu-open'); burger.setAttribute('aria-expanded', 'false'); burger.focus();
      }
    });
  }
})();
