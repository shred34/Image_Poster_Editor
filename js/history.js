/* ==========================================================================
   history.js — historique (retour / avance) des configurations
   On enregistre un instantané à chaque action « discrète » (hasard, preset,
   nouveau seed, favori chargé...). Les réglages faits à la main entre deux
   actions sont capturés avant de quitter l'état courant.
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;
  const MAX = 300;

  /**
   * @param {Function} snapshot  () => objet sérialisable décrivant l'état courant
   * @param {Function} onUpdate  appelé quand la position ou la taille change
   */
  function create(snapshot, onUpdate) {
    const stack = []; // [{ s, k }]
    let idx = -1;

    function record() {
      const s = snapshot();
      const k = JSON.stringify(s);
      if (idx >= 0 && stack[idx].k === k) return;
      stack.length = idx + 1; // on oublie l'« avance » quand on repart dans une autre direction
      stack.push({ s: s, k: k });
      if (stack.length > MAX) stack.shift();
      idx = stack.length - 1;
      onUpdate();
    }

    function go(delta) {
      const j = idx + delta;
      if (j < 0 || j >= stack.length) return null;
      idx = j;
      onUpdate();
      return JSON.parse(stack[idx].k);
    }

    return {
      record: record,
      back: function () { return go(-1); },
      forward: function () { return go(1); },
      canBack: function () { return idx > 0; },
      canForward: function () { return idx < stack.length - 1; },
      position: function () { return { pos: idx + 1, total: stack.length }; }
    };
  }

  MX.history = { create: create };
})();
