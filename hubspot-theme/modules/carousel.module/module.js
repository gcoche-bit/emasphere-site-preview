/* carousel — les deux flèches. Rien d'autre.
   Pourquoi du JavaScript ici alors que le thème s'en passe partout ailleurs :
   faire défiler un conteneur d'une carte exige de connaître la largeur d'une
   carte au moment du clic. Aucune règle CSS ne le fait aujourd'hui de façon
   fiable (`scroll-buttons` n'est pas encore utilisable).

   Ce que ce fichier ne fait PAS, et c'est délibéré :
   • aucun autoplay — il volerait le contrôle au lecteur ;
   • aucun écouteur de `scroll` — la barre de progression est liée au défilement
     par `animation-timeline: scroll()`, en CSS ;
   • aucune dépendance.

   `scroll-behavior` vient du CSS, qui respecte déjà `prefers-reduced-motion` :
   un lecteur qui a demandé moins d'animations obtient un saut, pas un glissé. */
(function () {
  document.querySelectorAll('.crsl').forEach(function (crsl) {
    var track = crsl.querySelector('.crsl__track');
    if (!track) return;
    var prev = crsl.querySelector('[data-crsl="prev"]');
    var next = crsl.querySelector('[data-crsl="next"]');

    function step() {
      var first = track.firstElementChild;
      if (!first) return track.clientWidth;
      /* la largeur d'une carte PLUS la gouttière : sans elle, on dérive d'un
         cran de gouttière à chaque clic */
      var gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
      return first.getBoundingClientRect().width + gap;
    }
    function sync() {
      if (!prev || !next) return;
      var max = track.scrollWidth - track.clientWidth - 1;
      prev.disabled = track.scrollLeft <= 0;
      next.disabled = track.scrollLeft >= max;
    }
    if (prev) prev.addEventListener('click', function () {
      track.scrollBy({ left: -step(), behavior: 'smooth' });
    });
    if (next) next.addEventListener('click', function () {
      track.scrollBy({ left: step(), behavior: 'smooth' });
    });
    /* `passive` : on ne bloque jamais le défilement, on ne fait que l'observer. */
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });
})();
