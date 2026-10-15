/* ==========================================================================
   utils.js — petites fonctions utilitaires partagées
   Tout le projet vit dans l'espace de noms global `MX` (scripts classiques,
   pas de modules ES : l'outil fonctionne en double-clic via file://).
   ========================================================================== */
(function (global) {
  'use strict';

  const MX = (global.MX = global.MX || {});

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Générateur pseudo-aléatoire déterministe (mulberry32). */
  function mulberry32(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Hash stable -> nombre dans [0, 1[.
   * Permet d'avoir un aléa par tuile qui ne change pas quand on modifie
   * un autre réglage (contrairement à un rng séquentiel).
   */
  function hash01(seed, i, salt) {
    let h = Math.imul(seed | 0, 374761393) ^ Math.imul(i | 0, 668265263) ^ Math.imul((salt | 0) + 1, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }

  /** Copie récursive de `src` dans `target` en conservant l'identité des objets cibles. */
  function assignDeep(target, src) {
    Object.keys(src).forEach(function (k) {
      const s = src[k];
      const t = target[k];
      if (k === 'lines' && Array.isArray(s)) {
        // lignes de texte : la liste est remplacée entière (sa longueur varie)
        target[k] = JSON.parse(JSON.stringify(s));
      } else if (s && typeof s === 'object' && t && typeof t === 'object') {
        assignDeep(t, s);
      } else {
        target[k] = s;
      }
    });
    return target;
  }

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  /** Crée un canvas hors-écran. */
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  MX.util = {
    TAU: TAU,
    DEG: DEG,
    clamp: clamp,
    lerp: lerp,
    mulberry32: mulberry32,
    hash01: hash01,
    assignDeep: assignDeep,
    clone: clone,
    makeCanvas: makeCanvas
  };
})(window);
