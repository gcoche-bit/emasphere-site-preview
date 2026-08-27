/* mcp-flow — deux comportements que le CSS seul ne rend pas :
   1. l'entrée en cascade quand le schéma arrive à l'écran (classe .is-in) ;
   2. l'allumage de la liaison d'une pastille au survol / focus (classe .is-hot sur le <path>).
   Idempotent, plusieurs instances possibles, rien ne casse si un élément manque. */
(function () {
  document.documentElement.classList.add('js');
  document.querySelectorAll('[data-mcpf]').forEach(function (root) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { root.classList.add('is-in'); io.disconnect(); } });
      }, { threshold: 0.25 });
      io.observe(root);
    } else root.classList.add('is-in');

    root.querySelectorAll('.mcpf__node[data-wire]').forEach(function (node) {
      var wire = root.querySelector('.mcpf__wire[data-wire="' + node.getAttribute('data-wire') + '"]');
      function on() { node.classList.add('is-hot'); if (wire) wire.classList.add('is-hot'); }
      function off() { node.classList.remove('is-hot'); if (wire) wire.classList.remove('is-hot'); }
      node.addEventListener('mouseenter', on); node.addEventListener('mouseleave', off);
      node.addEventListener('focus', on); node.addEventListener('blur', off);
    });
  });
})();
