/* ==========================================================================
   favorites.js — liste de favoris
   Stockée dans le navigateur (localStorage) et incluse dans le JSON exporté.
   Un favori = { id, name, params, thumb } ; `thumb` est une petite vignette JPG.
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;
  const KEY = 'multiplier.favorites';

  function readStore() {
    try {
      const a = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function writeStore(items) {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch (e) {
      /* stockage indisponible ou plein : les favoris restent dans la session et le JSON */
    }
  }

  /**
   * @param {object}   opts
   *   snapshot()  -> paramètres courants
   *   thumb()     -> dataURL de la vignette courante
   *   onPick(p)   -> appelé avec les paramètres d'un favori cliqué
   *   onNote(msg) -> message d'information
   */
  function create(opts) {
    let items = readStore();
    const list = document.getElementById('fav-list');
    const note = document.getElementById('fav-note');

    function render() {
      list.innerHTML = '';
      items.forEach(function (it) {
        const li = document.createElement('li');
        li.className = 'fav-item';

        const pick = document.createElement('button');
        pick.type = 'button';
        pick.className = 'fav-pick';
        pick.title = it.name + ' — cliquer pour charger';
        const img = document.createElement('img');
        img.src = it.thumb;
        img.alt = it.name;
        pick.appendChild(img);
        pick.addEventListener('click', function () {
          opts.onPick(JSON.parse(JSON.stringify(it.params)));
        });

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'fav-del';
        del.textContent = '×';
        del.title = 'Retirer des favoris';
        del.setAttribute('aria-label', 'Retirer ' + it.name);
        del.addEventListener('click', function () {
          items = items.filter(function (x) { return x.id !== it.id; });
          writeStore(items);
          render();
        });

        li.appendChild(pick);
        li.appendChild(del);
        list.appendChild(li);
      });
      note.textContent = items.length
        ? items.length + (items.length > 1 ? ' favoris' : ' favori') + ' — cliquer pour charger.'
        : 'Aucun favori. « + Favori » (ou F) garde la configuration courante.';
    }

    function add() {
      const params = opts.snapshot();
      const k = JSON.stringify(params);
      if (items.some(function (x) { return JSON.stringify(x.params) === k; })) {
        opts.onNote('Déjà dans les favoris.');
        return;
      }
      const n = items.reduce(function (m, x) { return Math.max(m, x.n || 0); }, 0) + 1;
      items.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        n: n,
        name: 'Favori ' + n,
        params: params,
        thumb: opts.thumb()
      });
      writeStore(items);
      render();
      opts.onNote('Ajouté aux favoris.');
    }

    /** Fusionne une liste venant d'un JSON (sans doublon). */
    function merge(incoming) {
      if (!Array.isArray(incoming)) return 0;
      let added = 0;
      incoming.forEach(function (it) {
        if (!it || !it.params || !it.thumb) return;
        const k = JSON.stringify(it.params);
        if (items.some(function (x) { return x.id === it.id || JSON.stringify(x.params) === k; })) return;
        items.push(it);
        added++;
      });
      writeStore(items);
      render();
      return added;
    }

    render();
    return {
      add: add,
      merge: merge,
      toJSON: function () { return items; }
    };
  }

  MX.favorites = { create: create };
})();
