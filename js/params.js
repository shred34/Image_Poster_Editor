/* ==========================================================================
   params.js — valeurs par défaut et presets
   Toutes les tailles sont exprimées en « largeur d'affiche = 1 » : le rendu
   est donc identique à l'écran et à l'export, quelle que soit la résolution.
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;

  function defaultWave(over) {
    return Object.assign(
      {
        enabled: false,
        shape: 'sine',      // sine | triangle | saw | square | bump
        direction: 'linear', // linear | radial | angular
        angle: 90,          // degrés (direction linéaire)
        frequency: 1.2,     // cycles par largeur d'affiche
        phase: 0,           // 0..1
        speed: 0.15,        // cycles / seconde en animation
        scale: 0.6,         // modulation de l'échelle
        posX: 0,            // déplacement horizontal (largeur d'affiche)
        posY: 0,            // déplacement vertical
        rot: 0,             // rotation en degrés
        alpha: 0            // modulation d'opacité
      },
      over || {}
    );
  }

  /** Calque de guilloché (lignes fines vectorielles). */
  function defaultLayer(over) {
    return Object.assign(
      {
        enabled: false,
        type: 'rosette',     // rosette | bands | rays
        position: 'under',   // under | over (par rapport aux tuiles)
        colorMode: 'solid',  // solid | gradient | rainbow
        color: '#000000',
        color2: '#5b3f9a',
        opacity: 1,
        width: 0.5,          // épaisseur du trait (pour mille de la largeur)
        centerX: 0.5,
        centerY: 0.5,
        lines: 48,
        innerR: 0.04,
        outerR: 0.42,
        amplitude: 0.03,
        lobes: 12,
        lobes2: 5,
        amp2: 0.012,
        phaseStep: 0.12,
        angle: 0,
        frequency: 3,
        envelope: 0.6,
        phase: 0,
        speed: 0
      },
      over || {}
    );
  }

  /** Microtexte (lignes ou anneaux de texte minuscule). */
  function defaultMicro(over) {
    return Object.assign(
      {
        enabled: false,
        mode: 'rows',        // rows | rings
        position: 'over',
        text: 'CONFOEDERATIO HELVETICA',
        size: 2.4,           // pour mille de la largeur
        spacing: 1.7,        // interligne, en multiples de la taille
        angle: 0,
        waveAmp: 0,
        waveFreq: 2,
        centerX: 0.5,
        centerY: 0.5,
        innerR: 0.08,
        outerR: 0.45,
        bold: true,
        colorMode: 'solid',
        color: '#000000',
        color2: '#5b3f9a',
        opacity: 0.9,
        speed: 0
      },
      over || {}
    );
  }

  MX.defaultLayer = defaultLayer;

  MX.createDefaults = function () {
    return {
      poster: {
        format: 'iso',
        orientation: 'portrait',
        customW: 3,
        customH: 4,
        background: '#ffffff',
        transparent: false,
        gradient: false,
        background2: '#dfe7f5',
        gradientAngle: 90,
        margin: 0
      },
      layout: { mode: 'grid', seed: 7 },

      grid: { cols: 10, autoRows: true, rows: 14, rowShift: 0, colShift: 0, jitter: 0, skip: 0, overscan: 1 },
      cascade: {
        count: 28, startSize: 0.5, endSize: 0.5, curve: 1,
        path: 'line', x1: 0.14, y1: 0.1, x2: 0.62, y2: 0.76,
        amplitude: 0.15, frequency: 1.5, phase: 0, ratio: 1.5, rotStep: 0
      },
      tunnel: {
        count: 36, outer: 1.4, inner: 0.04, curve: 1, geometric: true,
        rotStep: 4, centerX: 0.5, centerY: 0.5, offsetX: 0, offsetY: 0
      },
      radial: {
        rings: 7, base: 6, add: 6, radiusInner: 0.08, radiusOuter: 0.75,
        sizeInner: 0.09, sizeOuter: 0.2, faceOut: true, twist: 10,
        centerX: 0.5, centerY: 0.5, centerTile: true
      },
      subdivision: { cols: 3, maxDepth: 4, minDepth: 1, splitProb: 0.55, focusX: 0.5, focusY: 0.5, focusBias: 0 },
      scatter: { count: 160, sizeMin: 0.04, sizeMax: 0.4, bias: 2.5, placement: 'uniform', margin: 0.05, spread: 0.28 },
      spiral: {
        count: 420, spacing: 0.02, angle: 137.508, sizeStart: 0.03, sizeEnd: 0.12,
        sizeCurve: 1, centerX: 0.5, centerY: 0.5, faceOut: false
      },
      frame: { inset: 0.04, count: 14, rings: 1, ringStep: 1, orient: true },
      strips: { sizeTop: 0.12, sizeBottom: 0.12, curve: 1, spacing: 1, overlap: 0, shift: 0.5 },

      tiles: {
        size: 1, opacity: 1, opacityJitter: 0, blend: 'source-over',
        rotation: 0, rotationRandom: 0, snap90: false, flip: 'none',
        stretchX: 1, stretchY: 1,
        frame: 'none', borderWidth: 2, borderColor: '#000000', barHeight: 0.09,
        shadow: 0, shadowAlpha: 1
      },
      image: {
        fit: 'cover', gray: 0, brightness: 0, contrast: 0, invert: false,
        threshold: 0, posterize: 0, sequence: 'cycle', offset: 0,
        tintMode: 'none', tintColor: '#000000'   // none | solid | darkness
      },
      order: 'gen',
      layers: [defaultLayer({ enabled: false }), defaultLayer({ enabled: false, type: 'bands', color: '#5b3f9a' })],
      micro: defaultMicro(),

      waves: [
        defaultWave({ enabled: true, scale: 0.6, angle: 90, frequency: 1.1, speed: 0.12 }),
        defaultWave({ enabled: false, scale: 0.4, angle: 0, frequency: 1.6, speed: -0.1 })
      ],
      swirl: { amount: 0 },
      lens: { amount: 0 },
      anim: MX.anim.defaults(),
      text: MX.posterText.defaults(),

      export: { format: 'jpg', longEdge: 4000, quality: 0.97, dpi: 300, name: 'affiche' }
    };
  };

  /* ------------------------------------------------------------------ */
  /* Presets : on part toujours des valeurs par défaut puis on surcharge  */
  /* ------------------------------------------------------------------ */
  MX.presets = {
    'Vagues': {
      layout: { mode: 'grid', seed: 3 },
      grid: { cols: 16, rowShift: 0.5 },
      tiles: { size: 0.95 },
      waves: [{ enabled: true, direction: 'linear', angle: 100, frequency: 1.1, scale: 0.75, posY: 0.012, speed: 0.12 }]
    },
    'Ondes concentriques': {
      layout: { mode: 'grid', seed: 5 },
      grid: { cols: 26 },
      tiles: { size: 0.92 },
      waves: [{ enabled: true, direction: 'radial', frequency: 3, scale: 0.9, speed: 0.3 }]
    },
    'Fenêtres en cascade': {
      layout: { mode: 'cascade', seed: 2 },
      cascade: { count: 15, startSize: 0.46, endSize: 0.46, path: 'line', x1: 0.06, y1: 0.05, x2: 0.54, y2: 0.7 },
      tiles: { frame: 'window', borderWidth: 3, shadow: 0.02, shadowAlpha: 1, barHeight: 0.06 },
      waves: [{ enabled: true, direction: 'linear', angle: 45, frequency: 1.2, scale: 0, posX: 0.012, posY: -0.012, speed: 0.25 }]
    },
    'Fenêtres en vague': {
      layout: { mode: 'cascade', seed: 4 },
      cascade: {
        count: 30, startSize: 0.3, endSize: 0.3, path: 'sine',
        x1: 0.12, y1: 0.05, x2: 0.62, y2: 0.8, amplitude: 0.22, frequency: 1.5
      },
      tiles: { frame: 'window', borderWidth: 3, shadow: 0.02, shadowAlpha: 1, barHeight: 0.06 },
      waves: [{ enabled: true, direction: 'linear', angle: 0, frequency: 1.5, scale: 0.08, posY: 0.03, speed: 0.25 }]
    },
    'Écho de fenêtres': {
      layout: { mode: 'cascade', seed: 9 },
      cascade: { count: 24, startSize: 1.0, endSize: 0.12, curve: 0.8, path: 'spiral', amplitude: 0.34, frequency: 1.6 },
      tiles: { frame: 'outline', borderWidth: 2, shadow: 0 },
      waves: [{ enabled: true, direction: 'radial', frequency: 1.5, scale: 0.06, rot: 8, speed: 0.25 }]
    },
    'Tunnel': {
      layout: { mode: 'tunnel' },
      tunnel: { count: 44, outer: 1.5, inner: 0.05, rotStep: 5 },
      tiles: { frame: 'outline', borderWidth: 2 },
      waves: [{ enabled: true, direction: 'radial', frequency: 2, scale: 0.12, rot: 4, speed: -0.25 }]
    },
    'Mosaïque multi-échelle': {
      layout: { mode: 'subdivision', seed: 11 },
      subdivision: { cols: 3, maxDepth: 5, minDepth: 1, splitProb: 0.6, focusX: 0.3, focusY: 0.35, focusBias: 0.6 },
      tiles: { frame: 'outline', borderWidth: 1.5 },
      waves: [{ enabled: true, direction: 'linear', angle: 35, frequency: 1, scale: 0.12, speed: 0.25 }]
    },
    'Éclosion': {
      layout: { mode: 'radial' },
      radial: { rings: 9, base: 6, add: 7, radiusInner: 0.06, radiusOuter: 0.85, sizeInner: 0.08, sizeOuter: 0.26, twist: 14 },
      tiles: { size: 1.05 },
      waves: [{ enabled: true, direction: 'radial', frequency: 2, scale: 0.25, rot: 10, speed: 0.25 }]
    },
    'Pluie d\'images': {
      layout: { mode: 'scatter', seed: 21 },
      scatter: { count: 240, sizeMin: 0.03, sizeMax: 0.45, bias: 2.2 },
      tiles: { frame: 'outline', borderWidth: 1.5, rotationRandom: 12 },
      order: 'small',
      waves: [{ enabled: true, direction: 'linear', angle: 90, frequency: 1, scale: 0.1, posY: 0.02, speed: 0.25 }]
    },
    'Phyllotaxie': {
      layout: { mode: 'spiral' },
      spiral: { count: 520, spacing: 0.02, sizeStart: 0.03, sizeEnd: 0.13 },
      tiles: { frame: 'outline', borderWidth: 1.2 },
      order: 'rev',
      waves: [{ enabled: true, direction: 'radial', frequency: 3, scale: 0.35, speed: 0.25 }]
    },
    'Moiré': {
      layout: { mode: 'grid', seed: 8 },
      grid: { cols: 22 },
      tiles: { size: 1.15, blend: 'multiply' },
      image: { contrast: 0.35 },
      waves: [
        { enabled: true, direction: 'linear', angle: 20, frequency: 2.5, scale: 0.35, rot: 35, speed: 0.1 },
        { enabled: true, direction: 'linear', angle: 110, frequency: 3, scale: 0.4, rot: 0, speed: -0.08 }
      ]
    },
    'Vortex': {
      layout: { mode: 'grid', seed: 1 },
      grid: { cols: 18, rowShift: 0.5, overscan: 3 },
      tiles: { size: 0.95 },
      swirl: { amount: 320 },
      lens: { amount: 0.5 },
      waves: [{ enabled: true, direction: 'radial', frequency: 1.5, scale: 0.1, rot: 15, speed: 0.25 }]
    },
    'Damier miroir': {
      layout: { mode: 'grid', seed: 6 },
      grid: { cols: 8 },
      tiles: { size: 1, flip: 'alternate' },
      image: { gray: 1, contrast: 0.4 },
      waves: [{ enabled: true, direction: 'linear', angle: 45, frequency: 0.9, scale: 0.25, rot: 90, speed: 0.1 }]
    }
  };

  /**
   * Applique un preset sur l'objet de paramètres `P` (en place).
   * Le format d'affiche, le fond et les réglages d'export sont conservés.
   */
  MX.applyPreset = function (P, name) {
    const preset = MX.presets[name];
    if (!preset) return;
    const d = MX.createDefaults();
    d.poster = MX.util.clone(P.poster);
    d.export = MX.util.clone(P.export);
    d.anim = MX.util.clone(P.anim); // l'animation se règle à part : ni preset ni hasard ne la change
    d.text = MX.util.clone(P.text); // les textes de l'affiche non plus
    MX.util.assignDeep(P, d);
    MX.util.assignDeep(P, MX.util.clone(preset));
  };

  /* ------------------------------------------------------------------ */
  /* Ratio de l'affiche (hauteur / largeur)                               */
  /* ------------------------------------------------------------------ */
  const RATIOS = { iso: Math.SQRT2, '50x70': 1.4, '70x100': 100 / 70, '1:1': 1, '4:5': 1.25, '3:4': 4 / 3, '2:3': 1.5, '16:9': 16 / 9, f4: 1280 / 895 };

  MX.posterAspect = function (P) {
    const po = P.poster;
    let r = po.format === 'custom' ? po.customH / po.customW : RATIOS[po.format] || Math.SQRT2;
    r = Math.max(r, 1 / r); // ratio « portrait »
    return po.orientation === 'landscape' ? 1 / r : r;
  };

  /* ------------------------------------------------------------------ */
  /* Hasard : une configuration aléatoire mais toujours raisonnable       */
  /* ------------------------------------------------------------------ */
  MX.randomize = function (P) {
    const R = Math.random;
    const pick = function (a) { return a[Math.floor(R() * a.length)]; };
    const rnd = function (a, b) { return a + (b - a) * R(); };
    const rint = function (a, b) { return Math.round(rnd(a, b)); };
    const round = function (v, n) { const k = Math.pow(10, n); return Math.round(v * k) / k; };

    const d = MX.createDefaults();
    d.poster = MX.util.clone(P.poster);
    d.export = MX.util.clone(P.export);
    d.anim = MX.util.clone(P.anim); // l'animation se règle à part : ni preset ni hasard ne la change
    d.text = MX.util.clone(P.text); // les textes de l'affiche non plus
    MX.util.assignDeep(P, d);

    const mode = pick(['grid', 'grid', 'cascade', 'cascade', 'tunnel', 'radial', 'subdivision', 'scatter', 'spiral']);
    P.layout.mode = mode;
    P.layout.seed = rint(0, 9999);

    switch (mode) {
      case 'grid':
        P.grid.cols = rint(4, 28);
        P.grid.rowShift = pick([0, 0, 0.5, round(rnd(0, 1), 2)]);
        P.grid.colShift = pick([0, 0, 0, 0.5]);
        P.grid.jitter = pick([0, 0, round(rnd(0, 0.4), 2)]);
        P.grid.overscan = 2;
        P.tiles.size = round(rnd(0.8, 1.25), 2);
        break;
      case 'cascade': {
        const c = P.cascade;
        c.count = rint(12, 70);
        c.startSize = round(rnd(0.2, 0.8), 3);
        c.endSize = pick([c.startSize, round(rnd(0.08, 0.8), 3)]);
        c.path = pick(['line', 'sine', 'sine', 'circle', 'spiral', 'lissajous', 'walk']);
        c.x1 = round(rnd(0, 0.35), 3);
        c.y1 = round(rnd(0, 0.35), 3);
        c.x2 = round(rnd(0.6, 1), 3);
        c.y2 = round(rnd(0.6, 1), 3);
        c.amplitude = round(rnd(0.08, 0.35), 3);
        c.frequency = round(rnd(0.5, 4), 2);
        c.rotStep = pick([0, 0, round(rnd(-10, 10), 1)]);
        break;
      }
      case 'tunnel': {
        const u = P.tunnel;
        u.count = rint(14, 70);
        u.outer = round(rnd(0.9, 2), 2);
        u.inner = round(rnd(0.02, 0.2), 3);
        u.rotStep = round(rnd(-12, 12), 1);
        u.geometric = R() < 0.7;
        u.offsetX = pick([0, round(rnd(-0.25, 0.25), 3)]);
        u.offsetY = pick([0, round(rnd(-0.25, 0.25), 3)]);
        break;
      }
      case 'radial': {
        const r = P.radial;
        r.rings = rint(3, 12);
        r.base = rint(3, 10);
        r.add = rint(2, 9);
        r.radiusOuter = round(rnd(0.5, 1), 2);
        r.sizeInner = round(rnd(0.04, 0.12), 3);
        r.sizeOuter = round(rnd(0.1, 0.3), 3);
        r.twist = round(rnd(-30, 30), 1);
        break;
      }
      case 'subdivision': {
        const s = P.subdivision;
        s.cols = rint(2, 5);
        s.maxDepth = rint(3, 5);
        s.splitProb = round(rnd(0.35, 0.75), 2);
        s.focusX = round(rnd(0.1, 0.9), 2);
        s.focusY = round(rnd(0.1, 0.9), 2);
        s.focusBias = round(rnd(0, 0.8), 2);
        break;
      }
      case 'scatter': {
        const d2 = P.scatter;
        d2.count = rint(60, 400);
        d2.sizeMin = round(rnd(0.02, 0.06), 3);
        d2.sizeMax = round(rnd(0.25, 0.6), 3);
        d2.bias = round(rnd(1.2, 3.5), 2);
        d2.placement = pick(['uniform', 'gauss']);
        P.order = 'small';
        break;
      }
      default: {
        const p = P.spiral;
        p.count = rint(150, 900);
        p.spacing = round(rnd(0.012, 0.03), 3);
        p.sizeStart = round(rnd(0.015, 0.05), 3);
        p.sizeEnd = round(rnd(0.06, 0.2), 3);
        p.angle = pick([137.508, 137.508, round(rnd(120, 160), 3)]);
        P.order = 'rev';
      }
    }

    const T = P.tiles;
    T.frame = pick(['none', 'none', 'outline', 'window']);
    T.borderWidth = round(rnd(1, 4), 1);
    T.shadow = T.frame === 'window' ? pick([0, round(rnd(0.01, 0.04), 3)]) : 0;
    T.blend = pick(['source-over', 'source-over', 'multiply', 'darken']);
    T.rotationRandom = pick([0, 0, round(rnd(0, 30), 1)]);
    T.snap90 = R() < 0.15;
    T.flip = pick(['none', 'none', 'alternate', 'random']);
    if (mode === 'grid' || mode === 'subdivision') T.opacity = pick([1, 1, round(rnd(0.6, 1), 2)]);

    P.image.gray = pick([0, 0, 1]);
    P.image.contrast = pick([0, 0, round(rnd(0.2, 0.6), 2)]);
    P.image.threshold = pick([0, 0, 0, 0.5]);
    P.image.sequence = pick(['cycle', 'group', 'random']);

    // au moins une vague active : sans elle, la lecture n'animerait rien
    const waveOn = [true, R() < 0.35];
    P.waves.forEach(function (w, i) {
      w.enabled = waveOn[i];
      w.shape = pick(['sine', 'sine', 'triangle', 'saw', 'bump']);
      w.direction = pick(['linear', 'linear', 'radial', 'angular']);
      w.angle = round(rnd(0, 180), 1);
      w.frequency = round(rnd(0.4, 4), 2);
      w.phase = round(rnd(0, 1), 2);
      w.speed = round(rnd(0.08, 0.3), 2) * (R() < 0.5 ? -1 : 1);
      w.scale = round(rnd(0.2, 0.9), 2);
      w.rot = pick([0, 0, round(rnd(-45, 45), 1)]);
      w.posX = pick([0, 0, round(rnd(-0.03, 0.03), 3)]);
      w.posY = pick([0, 0, round(rnd(-0.03, 0.03), 3)]);
    });
    // le guilloché (rosette, ondes, rayons) reste un réglage manuel : jamais tiré au hasard
    P.swirl.amount = pick([0, 0, 0, Math.round(rnd(-360, 360))]);
    P.lens.amount = pick([0, 0, 0, round(rnd(-0.5, 1), 2)]);
  };
})();
