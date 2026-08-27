/* resource-catalogue — la recherche par titre/domaine, et rien d'autre.
   Les filtres par domaine sont en CSS (radios + :has) : ce script ne fait que
   révéler le champ de recherche et marquer `data-search-miss` sur les cartes
   qui ne contiennent pas le texte tapé. Sans script : pas de champ, tout marche. */
(function () {
  document.querySelectorAll('.rcat').forEach(function (root) {
    var search = root.querySelector('.rcat__search');
    var input = search && search.querySelector('input[type="search"]');
    if (!search || !input) return;
    search.hidden = false;
    var items = root.querySelectorAll('.rcat__item');
    var empty = root.querySelector('.rcat__empty');
    function apply() {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (it) {
        var hit = !q || (it.getAttribute('data-name') || '').indexOf(q) !== -1;
        if (hit) { it.removeAttribute('data-search-miss'); if (it.offsetParent !== null) shown++; }
        else it.setAttribute('data-search-miss', '');
      });
      if (empty) empty.hidden = !(q && shown === 0);
    }
    input.addEventListener('input', apply);
    root.querySelectorAll('.rcat__radio').forEach(function (r) { r.addEventListener('change', apply); });
  });
})();
