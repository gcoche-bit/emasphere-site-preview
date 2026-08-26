/* connector-catalogue — recherche par nom, PROGRESSIVE.
   Le filtre par catégorie est en CSS pur (radios + :has). Ce script n'ajoute que
   la recherche texte : il révèle le champ (caché par défaut, attribut `hidden`)
   et masque les tuiles dont le nom ne contient pas la saisie. Sans lui, la page
   reste entièrement fonctionnelle. */
(function () {
  document.querySelectorAll('.ccat__body').forEach(function (body) {
    var search = body.querySelector('.ccat__search');
    var input = search && search.querySelector('input[type="search"]');
    var items = body.querySelectorAll('.ccat__item');
    var empty = body.querySelector('.ccat__empty');
    if (!input) return;
    search.hidden = false;
    var apply = function () {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (li) {
        var hit = !q || (li.getAttribute('data-name') || '').indexOf(q) !== -1;
        li.toggleAttribute('data-search-miss', !hit);
        if (hit) shown += 1;
      });
      if (empty) empty.hidden = shown !== 0;
    };
    input.addEventListener('input', apply);
  });
})();
