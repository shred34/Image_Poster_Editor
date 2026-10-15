/* ==========================================================================
   colorpicker.js — sélecteur de couleur de dat.gui utilisable à la souris
   Par défaut, dat.gui n'affiche le nuancier qu'au survol du champ : il se
   ferme dès que la souris quitte le bouton. Ici, un clic sur le champ couleur
   ouvre le nuancier et il reste ouvert pendant qu'on choisit ; il se ferme
   par un clic ailleurs, la touche Échap ou un nouveau clic sur le champ.
   ========================================================================== */
(function () {
  'use strict';

  let open = null; // { sel, row }

  function close() {
    if (!open) return;
    open.sel.classList.remove('is-open');
    open.row.classList.remove('is-picking');
    open = null;
  }

  function show(row) {
    const sel = row.querySelector('.selector');
    if (!sel) return;
    close();
    sel.classList.add('is-open');
    row.classList.add('is-picking');
    open = { sel: sel, row: row };
    // le nuancier doit rester visible : on fait défiler la colonne si besoin
    requestAnimationFrame(function () {
      if (open && open.sel === sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
    });
  }

  document.addEventListener('mousedown', function (e) {
    const t = e.target;
    if (open && open.sel.contains(t)) return; // on choisit dans le nuancier
    const row = t.closest && t.closest('.dg li.cr.color');
    if (row && t.closest('.c')) {
      if (open && open.row === row) return; // clic dans le champ : on laisse taper la valeur
      show(row);
      return;
    }
    close();
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Enter') close();
  }, true);

  // un panneau reconstruit (changement d'élément, de page...) : on oublie le nuancier
  window.addEventListener('resize', close);
})();
