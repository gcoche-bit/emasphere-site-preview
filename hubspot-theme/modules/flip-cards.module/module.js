/* flip-cards — le retournement au clic / à la touche Entrée (le survol est en CSS, avec 250 ms de
   délai). Idempotent, plusieurs instances. Le bouton annonce son état (aria-pressed) ; après le
   retournement, le focus passe au premier élément focusable de la face arrière (le lien), sinon
   reste sur la carte pour qu'Échap la referme.
   27/08 : un verso plus long que 9 lignes est coupé (classe is-clamped) et reçoit un bouton
   « Lire la suite » qui le déplie en place — le texte ne déborde plus jamais de la carte. */
(function () {
  var MORE = document.documentElement.lang === 'nl' ? 'Lees verder' : document.documentElement.lang === 'en' ? 'Read more' : 'Lire la suite';
  document.querySelectorAll('[data-fcards]').forEach(function (root) {
    root.querySelectorAll('[data-fcard]').forEach(function (card) {
      var btn = card.querySelector('[data-fcard-toggle]'); if (!btn) return;
      function set(on) { card.classList.toggle('is-flipped', on); btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
      btn.addEventListener('click', function () {
        var on = !card.classList.contains('is-flipped'); set(on);
        if (on) { var link = card.querySelector('[data-fcard-back] a'); if (link) link.focus(); }
      });
      card.addEventListener('keydown', function (e) { if (e.key === 'Escape' && card.classList.contains('is-flipped')) { set(false); btn.focus(); } });
      card.addEventListener('focusout', function (e) { if (!card.contains(e.relatedTarget) && card.classList.contains('is-flipped')) set(false); });

      /* Verso long → clamp + « Lire la suite ». Mesuré une fois la carte visible (la face arrière
         est retournée, mais sa hauteur se mesure). */
      var text = card.querySelector('.fcard__text'); if (!text || text.dataset.clampDone) return;
      text.dataset.clampDone = '1';
      text.classList.add('is-clamped');
      if (text.scrollHeight > text.clientHeight + 2) {
        var more = document.createElement('button'); more.type = 'button'; more.className = 'fcard__more'; more.textContent = MORE;
        more.setAttribute('aria-expanded', 'false');
        more.addEventListener('click', function () { text.classList.remove('is-clamped'); more.remove(); });
        text.after(more);
      } else { text.classList.remove('is-clamped'); }
    });
  });
})();
