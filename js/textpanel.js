/* ==========================================================================
   textpanel.js — saisie et réglage des lignes de texte (colonne de gauche)
   - un seul champ pour tout retaper : une ligne du champ = une ligne de l'affiche
   - la ligne où se trouve le curseur est la ligne sélectionnée : ses réglages
     (alignement, taille, décalage, espace avant...) s'affichent dessous
   Les valeurs vivent dans P.text.lines : historique, favoris et fichier de
   réglages les gardent comme le reste.
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;

  /**
   * @param {object}   P         paramètres
   * @param {Function} onChange  texte ou réglage modifié (aperçu à redessiner)
   * @param {Function} onToggle  case « Afficher » modifiée (panneau à resynchroniser)
   */
  function init(P, onChange, onToggle) {
    const $ = function (id) { return document.getElementById(id); };
    const area = $('tx-all');
    let sel = 0;

    function lines() {
      return P.text.lines;
    }

    function cur() {
      const L = lines();
      if (!L.length) return null;
      sel = Math.max(0, Math.min(sel, L.length - 1));
      return L[sel];
    }

    function select(i) {
      sel = i;
      MX.posterText.selected = sel;
      refreshDetail();
      onChange();
    }

    /* ---------------- champ « tout le texte » ---------------- */
    // On garde les réglages des lignes inchangées (début et fin communs) ;
    // les lignes modifiées gardent les réglages de la ligne qu'elles remplacent,
    // les nouvelles reprennent le style de leur voisine.
    function syncFromArea() {
      const old = lines();
      const texts = area.value.split(/\r?\n/);
      let p = 0;
      while (p < old.length && p < texts.length && old[p].text === texts[p]) p++;
      let s = 0;
      while (s < old.length - p && s < texts.length - p &&
             old[old.length - 1 - s].text === texts[texts.length - 1 - s]) s++;
      const midOld = old.slice(p, old.length - s);
      const out = old.slice(0, p);
      for (let j = p; j < texts.length - s; j++) {
        const src = midOld[j - p];
        if (src) {
          out.push(Object.assign({}, src, { text: texts[j] }));
        } else {
          const nb = out[out.length - 1] || old[old.length - s] || null;
          const L = MX.posterText.line(texts[j]);
          if (nb) {
            L.align = nb.align;
            L.indent = nb.indent;
            L.invert = nb.invert;
            L.block = nb.block;
            L.weight = nb.weight;
            if (!nb.title) L.scale = nb.scale;
          }
          out.push(L);
        }
      }
      for (let k = old.length - s; k < old.length; k++) out.push(old[k]);
      P.text.lines = out;
    }

    function caretLine() {
      const pos = area.selectionStart || 0;
      return area.value.slice(0, pos).split('\n').length - 1;
    }

    area.addEventListener('input', function () {
      syncFromArea();
      sel = caretLine();
      MX.posterText.selected = sel;
      refreshDetail();
      onChange();
    });
    ['click', 'keyup', 'focus'].forEach(function (ev) {
      area.addEventListener(ev, function () {
        const i = caretLine();
        if (i !== sel) select(i);
        else {
          MX.posterText.selected = sel;
          onChange();
        }
      });
    });

    /* ---------------- réglages de la ligne ---------------- */
    function edit(fn) {
      const L = cur();
      if (!L) return;
      fn(L);
      refreshDetail();
      onChange();
    }

    $('tx-align').addEventListener('click', function (e) {
      const v = e.target.getAttribute('data-v');
      if (v) edit(function (L) { L.align = v; });
    });
    [['scale', 2], ['indent', 3], ['gap', 2]].forEach(function (d) {
      $('tx-' + d[0]).addEventListener('input', function (e) {
        edit(function (L) { L[d[0]] = Number(e.target.value); });
      });
    });
    ['fit', 'push', 'invert', 'block', 'title', 'hidden'].forEach(function (k) {
      $('tx-' + k).addEventListener('change', function (e) {
        edit(function (L) { L[k] = e.target.checked; });
      });
    });
    $('tx-weight').addEventListener('change', function (e) {
      edit(function (L) { L.weight = e.target.value; });
    });

    $('tx-prev').addEventListener('click', function () { select(Math.max(0, sel - 1)); });
    $('tx-next').addEventListener('click', function () { select(Math.min(lines().length - 1, sel + 1)); });

    function move(d) {
      const L = lines();
      const j = sel + d;
      if (j < 0 || j >= L.length) return;
      const t = L[sel];
      L[sel] = L[j];
      L[j] = t;
      sel = j;
      refresh();
      onChange();
    }
    $('tx-up').addEventListener('click', function () { move(-1); });
    $('tx-down').addEventListener('click', function () { move(1); });
    $('tx-add').addEventListener('click', function () {
      const L = lines();
      const nb = L[sel];
      const n = MX.posterText.line('NOUVELLE LIGNE');
      if (nb) {
        n.align = nb.align;
        n.indent = nb.indent;
        n.invert = nb.invert;
        n.block = nb.block;
      }
      L.splice(sel + 1, 0, n);
      sel += 1;
      refresh();
      onChange();
    });
    $('tx-del').addEventListener('click', function () {
      const L = lines();
      if (!L.length) return;
      L.splice(sel, 1);
      sel = Math.max(0, sel - 1);
      refresh();
      onChange();
    });
    $('tx-all-align').addEventListener('click', function () {
      const c = cur();
      if (!c) return;
      lines().forEach(function (L) { L.align = c.align; });
      refresh();
      onChange();
    });

    // repère de la ligne sélectionnée dans l'aperçu : seulement pendant l'édition du texte
    const block = $('text-block');
    block.addEventListener('focusin', function () {
      MX.posterText.highlight = true;
      onChange();
    });
    block.addEventListener('focusout', function (e) {
      if (e.relatedTarget && block.contains(e.relatedTarget)) return;
      MX.posterText.highlight = false;
      onChange();
    });

    $('tx-show').addEventListener('change', function (e) {
      P.text.show = e.target.checked;
      refresh();
      onToggle();
    });

    /* ---------------- affichage ---------------- */
    function fmt(v, d) {
      return Number(v).toFixed(d);
    }

    function refreshDetail() {
      const L = cur();
      const n = lines().length;
      const on = !!L;
      $('tx-sel-name').textContent = on
        ? 'Ligne ' + (sel + 1) + ' / ' + n + (L.text.trim() ? ' · ' + L.text.trim() : ' · (espace)')
        : 'Aucune ligne';
      Array.prototype.forEach.call(document.querySelectorAll('.tx-detail input, .tx-detail select, .tx-detail button'), function (el) {
        if (el.id !== 'tx-add') el.disabled = !on;
      });
      if (!on) return;
      Array.prototype.forEach.call($('tx-align').children, function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-v') === L.align);
      });
      $('tx-scale').value = L.scale;
      $('tx-scale-v').textContent = fmt(L.scale, 2);
      $('tx-indent').value = L.indent;
      $('tx-indent-v').textContent = fmt(L.indent, 3);
      $('tx-gap').value = L.gap;
      $('tx-gap-v').textContent = fmt(L.gap, 2);
      ['fit', 'push', 'invert', 'block', 'title', 'hidden'].forEach(function (k) {
        $('tx-' + k).checked = !!L[k];
      });
      $('tx-weight').value = L.weight || 'auto';
      $('tx-prev').disabled = sel <= 0;
      $('tx-next').disabled = sel >= n - 1;
    }

    function refresh() {
      const T = P.text;
      $('tx-show').checked = !!T.show;
      $('text-block').classList.toggle('is-off', !T.show);
      const v = T.lines.map(function (L) { return L.text; }).join('\n');
      if (area.value !== v) area.value = v;
      MX.posterText.selected = sel;
      refreshDetail();
    }

    refresh();
    return { refresh: refresh };
  }

  MX.textPanel = { init: init };
})();
