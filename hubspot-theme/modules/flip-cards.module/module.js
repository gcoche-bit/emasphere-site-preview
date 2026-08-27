/* flip-cards — le retournement au clic / à la touche Entrée (le survol est en CSS).
   Idempotent, plusieurs instances. Le bouton annonce son état (aria-pressed) ; après le
   retournement, le focus passe au premier élément focusable de la face arrière (le lien),
   sinon reste sur la carte pour qu'Échap la referme. */
(function () {
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
    });
  });
})();
