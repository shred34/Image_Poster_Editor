/* ==========================================================================
   anim.js — animation de l'affiche
   - réglages par défaut de l'animation
   - boucle parfaite : chaque mouvement fait un nombre entier de cycles
     pendant la durée de la boucle, la dernière image rejoint la première
   - mouvements appliqués aux tuiles : pulsation, balancement, orbite,
     scintillement, défilement des images, caméra (rotation / zoom)
   Toutes les vitesses sont en cycles par seconde (tours / s pour les rotations).
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  function defaults() {
    return {
      play: false,
      duration: 4,        // durée de la boucle (s)
      loop: true,         // boucle parfaite : vitesses arrondies à un nombre entier de cycles
      fps: 25,            // images par seconde à l'export
      frameSize: 1920,    // grand côté des images exportées (px)
      frameFormat: 'jpg', // jpg | png

      spin: 0,            // rotation continue de chaque tuile (°/s)

      pulse: 0,           // pulsation de la taille (0..1)
      pulseSpeed: 0.25,
      pulseSpread: 1,     // décalage : cycles du centre au bord (vague qui se propage)

      sway: 0,            // balancement de la rotation (°)
      swaySpeed: 0.25,
      swaySpread: 1,

      orbit: 0,           // rayon de l'orbite de chaque tuile (largeur d'affiche)
      orbitSpeed: 0.25,
      orbitSpread: 0,     // 0 : toutes ensemble, 1 : décalage aléatoire complet

      flicker: 0,         // scintillement de l'opacité (0..1)
      flickerSpeed: 0.5,

      imageRate: 0,       // défilement des images (images / s)

      swirlAmp: 0,        // oscillation du vortex (°)
      lensAmp: 0,         // oscillation de la loupe
      modSpeed: 0.25,

      camRotate: 0,       // rotation de l'ensemble (tours / s)
      camZoom: 0,         // respiration de l'ensemble (0..1)
      camSpeed: 0.25
    };
  }

  /** Vitesse arrondie pour boucler : nombre entier de cycles par boucle (au moins un si non nulle). */
  function q(speed, D) {
    if (!speed) return 0;
    let c = Math.round(speed * D);
    if (c === 0) c = speed > 0 ? 1 : -1;
    return c / D;
  }

  /**
   * Paramètres effectivement animés. En boucle parfaite, renvoie une copie
   * dont toutes les vitesses sont arrondies ; sinon renvoie P tel quel.
   */
  function effective(P) {
    const A = P.anim;
    if (!A.loop) return P;
    const D = Math.max(0.5, A.duration);
    const E = MX.util.clone(P);
    const a = E.anim;
    E.waves.forEach(function (w) { w.speed = q(w.speed, D); });
    E.layers.forEach(function (L) { L.speed = q(L.speed, D); });
    E.micro.speed = q(E.micro.speed, D);
    a.spin = q(a.spin / 360, D) * 360;
    a.pulseSpeed = q(a.pulseSpeed, D);
    a.swaySpeed = q(a.swaySpeed, D);
    a.orbitSpeed = q(a.orbitSpeed, D);
    a.flickerSpeed = q(a.flickerSpeed, D);
    a.modSpeed = q(a.modSpeed, D);
    a.camSpeed = q(a.camSpeed, D);
    a.camRotate = q(a.camRotate, D);
    a.imageRate = q(a.imageRate, D); // arrondi final au nombre d'images dans applyImages
    return E;
  }

  /** Nombre d'images d'une boucle. */
  function frameCount(P) {
    return Math.max(1, Math.round(Math.max(0.5, P.anim.duration) * P.anim.fps));
  }

  /** Amplitude d'oscillation du vortex et de la loupe à l'instant t. */
  function modulation(P, time) {
    const A = P.anim;
    const s = Math.sin(TAU * A.modSpeed * time);
    return { swirl: P.swirl.amount + A.swirlAmp * s, lens: P.lens.amount + A.lensAmp * s };
  }

  /** Mouvements propres à chaque tuile (après les vagues, avant le style). */
  function applyTiles(tiles, P, aspect, time, hash) {
    const A = P.anim;
    if (!A.pulse && !A.sway && !A.orbit) return;
    const cx = 0.5;
    const cy = aspect / 2;
    const rMax = Math.hypot(0.5, aspect / 2);
    const seed = P.layout.seed;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const d = Math.hypot(t.x - cx, t.y - cy) / rMax; // 0 au centre, 1 dans les coins
      if (A.pulse) {
        t.size *= Math.max(0, 1 + A.pulse * Math.sin(TAU * (A.pulseSpeed * time - A.pulseSpread * d)));
      }
      if (A.sway) {
        t.rot += A.sway * Math.sin(TAU * (A.swaySpeed * time - A.swaySpread * d));
      }
      if (A.orbit) {
        const ph = TAU * (A.orbitSpeed * time + A.orbitSpread * hash(seed, t.key, 81));
        t.x += A.orbit * Math.cos(ph);
        t.y += A.orbit * Math.sin(ph);
      }
    }
  }

  /** Scintillement et défilement des images (après le choix de l'image). */
  function applyStyle(tiles, P, time, nImages, hash) {
    const A = P.anim;
    const seed = P.layout.seed;
    if (A.flicker) {
      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        const v = 0.5 + 0.5 * Math.sin(TAU * (A.flickerSpeed * time + hash(seed, t.key, 82)));
        t.alpha *= 1 - A.flicker * v;
      }
    }
    const n = Math.max(1, nImages);
    if (A.imageRate && n > 1) {
      let rate = A.imageRate;
      if (A.loop) {
        // le décalage total sur une boucle doit être un multiple du nombre d'images
        const D = Math.max(0.5, A.duration);
        let k = Math.round((rate * D) / n);
        if (k === 0) k = rate > 0 ? 1 : -1;
        rate = (k * n) / D;
      }
      const shift = Math.floor(rate * time + 1e-6);
      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        t.img = ((((t.img || 0) + shift) % n) + n) % n;
      }
    }
  }

  /** Caméra : rotation et respiration de toute la composition autour du centre. */
  function applyCamera(tiles, P, aspect, time) {
    const A = P.anim;
    if (!A.camRotate && !A.camZoom) return;
    const cx = 0.5;
    const cy = aspect / 2;
    const th = TAU * A.camRotate * time;
    const z = Math.max(0.05, 1 + A.camZoom * Math.sin(TAU * A.camSpeed * time));
    const c = Math.cos(th);
    const s = Math.sin(th);
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const dx = t.x - cx;
      const dy = t.y - cy;
      t.x = cx + (dx * c - dy * s) * z;
      t.y = cy + (dx * s + dy * c) * z;
      t.size *= z;
      t.rot += th / DEG;
    }
  }

  /** Vrai si quelque chose bouge avec le temps (sinon la lecture n'anime rien). */
  function isMoving(P, nImages) {
    const A = P.anim;
    const tiles = P.layout.mode !== 'none';
    const wave = P.waves.some(function (w) {
      return w.enabled && w.speed !== 0 && (w.scale !== 0 || w.posX !== 0 || w.posY !== 0 || w.rot !== 0 || w.alpha > 0);
    });
    const lines =
      P.layers.some(function (L) { return L.enabled && L.speed !== 0; }) || (P.micro.enabled && P.micro.speed !== 0);
    const own =
      A.spin || A.pulse || A.sway || A.orbit || A.flicker || A.camRotate || A.camZoom ||
      A.swirlAmp || A.lensAmp || (A.imageRate && nImages > 1);
    return (tiles && (wave || !!own)) || lines;
  }

  /** Temps ramené dans la boucle (évite les grands nombres en lecture continue). */
  function wrap(P, time) {
    if (!P.anim.loop) return time;
    const D = Math.max(0.5, P.anim.duration);
    return ((time % D) + D) % D;
  }

  MX.anim = {
    defaults: defaults,
    effective: effective,
    frameCount: frameCount,
    modulation: modulation,
    applyTiles: applyTiles,
    applyStyle: applyStyle,
    applyCamera: applyCamera,
    wrap: wrap,
    isMoving: isMoving
  };
})();
