/* ==========================================================================
   images.js — bibliothèque d'images
   - chargement (glisser-déposer / sélecteur de fichiers)
   - recadrage carré, traitements (gris, contraste, seuil, ...)
   - pyramide de réductions (mipmaps) pour un rendu net à toutes les échelles
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;
  const U = MX.util;

  const PREVIEW_MAX = 1536; // taille max de la source utilisée à l'écran
  const EXPORT_MAX = 4096;  // taille max de la source utilisée à l'export

  let uid = 0;
  let sample = null;

  /* -------------------------- image d'exemple ------------------------- */
  function makeSample() {
    // motif simple et sans cadre : une cible sur fond transparent + un repère pour voir les rotations
    const s = 1024;
    const c = U.makeCanvas(s, s);
    const g = c.getContext('2d');
    const cx = s / 2;
    const cy = s / 2;
    const radii = [500, 420, 340, 260, 180, 100];
    radii.forEach(function (r, k) {
      g.fillStyle = k % 2 === 0 ? '#000' : '#fff';
      g.beginPath();
      g.arc(cx, cy, r, 0, U.TAU);
      g.fill();
    });
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(cx + 330 * Math.cos(-Math.PI / 4), cy + 330 * Math.sin(-Math.PI / 4), 36, 0, U.TAU);
    g.fill();
    return { id: 0, name: 'exemple', source: c, w: s, h: s, url: null, base: null, cache: null, isSample: true };
  }

  /* ---------------------------- chargement ---------------------------- */
  function loadFile(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        resolve({
          id: ++uid,
          name: file.name,
          source: img,
          w: img.naturalWidth || 1024,
          h: img.naturalHeight || 1024,
          url: url,
          base: null,
          cache: null,
          isSample: false
        });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error(file.name));
      };
      img.src = url;
    });
  }

  /* ------------------------ recadrage + traitements ------------------- */
  function makeBase(item, fit, maxSize) {
    const sw = item.w;
    const sh = item.h;
    const side = fit === 'cover' ? Math.min(sw, sh) : Math.max(sw, sh);
    const size = Math.max(16, Math.min(Math.round(side), maxSize));
    const c = U.makeCanvas(size, size);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    if (fit === 'cover') {
      g.drawImage(item.source, (sw - side) / 2, (sh - side) / 2, side, side, 0, 0, size, size);
    } else {
      const k = size / side;
      g.drawImage(item.source, (size - sw * k) / 2, (size - sh * k) / 2, sw * k, sh * k);
    }
    return c;
  }

  function isNoop(p) {
    return (
      p.gray === 0 && p.brightness === 0 && p.contrast === 0 && !p.invert && p.threshold === 0 && p.posterize < 2 &&
      p.tintMode === 'none'
    );
  }

  function processCanvas(base, p) {
    if (isNoop(p)) return base;
    const w = base.width;
    const h = base.height;
    const out = U.makeCanvas(w, h);
    const g = out.getContext('2d');
    g.drawImage(base, 0, 0);
    const id = g.getImageData(0, 0, w, h);
    const d = id.data;

    const lut = new Uint8ClampedArray(256);
    const c = Math.tan(((U.clamp(p.contrast, -1, 0.995) + 1) * Math.PI) / 4);
    const levels = p.posterize >= 2 ? Math.round(p.posterize) : 0;
    for (let i = 0; i < 256; i++) {
      let v = (i / 255 - 0.5) * c + 0.5 + p.brightness;
      v = U.clamp(v, 0, 1);
      if (levels) v = Math.round(v * (levels - 1)) / (levels - 1);
      lut[i] = Math.round(v * 255);
    }

    const gray = p.gray;
    const thr = p.threshold * 255;
    const inv = p.invert;
    const tint = p.tintMode;
    const ink = parseInt(String(p.tintColor).replace('#', ''), 16) || 0;
    const ir = (ink >> 16) & 255;
    const ig = (ink >> 8) & 255;
    const ib = ink & 255;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let gr = d[i + 1];
      let b = d[i + 2];
      if (gray > 0) {
        const l = 0.299 * r + 0.587 * gr + 0.114 * b;
        r += (l - r) * gray;
        gr += (l - gr) * gray;
        b += (l - b) * gray;
      }
      r = lut[(r + 0.5) | 0];
      gr = lut[(gr + 0.5) | 0];
      b = lut[(b + 0.5) | 0];
      if (thr > 0) {
        const v = 0.299 * r + 0.587 * gr + 0.114 * b >= thr ? 255 : 0;
        r = gr = b = v;
      }
      if (inv) {
        r = 255 - r;
        gr = 255 - gr;
        b = 255 - b;
      }
      if (tint === 'solid') {
        // encre unie : la couleur remplace l'image, la transparence est conservée
        r = ir;
        gr = ig;
        b = ib;
      } else if (tint === 'darkness') {
        // dessin au trait : plus c'est sombre, plus l'encre est dense (le blanc devient transparent)
        const lum = (0.299 * r + 0.587 * gr + 0.114 * b) / 255;
        d[i + 3] = d[i + 3] * (1 - lum);
        r = ir;
        gr = ig;
        b = ib;
      }
      d[i] = r;
      d[i + 1] = gr;
      d[i + 2] = b;
    }
    g.putImageData(id, 0, 0);
    return out;
  }

  /** Pyramide de réductions successives par 2 (meilleure qualité en réduction). */
  function buildLevels(canvas) {
    const levels = [canvas];
    let cur = canvas;
    while (cur.width > 24) {
      const w = Math.max(1, Math.ceil(cur.width / 2));
      const c = U.makeCanvas(w, w);
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(cur, 0, 0, w, w);
      levels.push(c);
      cur = c;
    }
    return levels;
  }

  function levelsFor(item, p, maxSize, temporary) {
    const key = [p.fit, p.gray, p.brightness, p.contrast, p.invert, p.threshold, p.posterize, p.tintMode, p.tintColor, maxSize].join('|');
    if (!temporary && item.cache && item.cache.key === key) return item.cache.levels;

    let base;
    const bkey = p.fit + '|' + maxSize;
    if (!temporary && item.base && item.base.key === bkey) {
      base = item.base.canvas;
    } else {
      base = makeBase(item, p.fit, maxSize);
      if (!temporary) item.base = { key: bkey, canvas: base };
    }
    const levels = buildLevels(processCanvas(base, p));
    if (!temporary) item.cache = { key: key, levels: levels };
    return levels;
  }

  /* ------------------------------- API -------------------------------- */
  const lib = {
    items: [],
    PREVIEW_MAX: PREVIEW_MAX,
    EXPORT_MAX: EXPORT_MAX,

    /** Ajoute des fichiers. Retourne { added, failed }. */
    add: function (fileList) {
      const files = Array.prototype.filter.call(fileList, function (f) {
        return /^image\//.test(f.type) || /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(f.name);
      });
      let added = 0;
      let failed = 0;
      return files
        .reduce(function (chain, f) {
          return chain.then(function () {
            return loadFile(f).then(
              function (item) {
                lib.items.push(item);
                added++;
              },
              function () {
                failed++;
              }
            );
          });
        }, Promise.resolve())
        .then(function () {
          return { added: added, failed: failed };
        });
    },

    remove: function (index) {
      const it = lib.items[index];
      if (!it) return;
      if (it.url) URL.revokeObjectURL(it.url);
      lib.items.splice(index, 1);
    },

    move: function (index, dir) {
      const j = index + dir;
      if (j < 0 || j >= lib.items.length) return;
      const t = lib.items[index];
      lib.items[index] = lib.items[j];
      lib.items[j] = t;
    },

    clear: function () {
      lib.items.forEach(function (it) {
        if (it.url) URL.revokeObjectURL(it.url);
      });
      lib.items.length = 0;
    },

    /**
     * Image utilisateur utilisée comme motif (mode passeport) : carrée, taille bornée,
     * éventuellement convertie en encre ('solid' | 'darkness') ; la transparence est conservée.
     */
    motifCanvas: function (item, size, mode, color) {
      const sz = Math.max(16, Math.min(512, size | 0));
      const key = [sz, mode, color].join('|');
      if (!item.motifs) item.motifs = {};
      if (item.motifs[key]) return item.motifs[key];
      const base = makeBase(item, 'contain', sz);
      const p = { gray: 0, brightness: 0, contrast: 0, invert: false, threshold: 0, posterize: 0, tintMode: mode, tintColor: color };
      const out = processCanvas(base, p);
      item.motifs[key] = out;
      return out;
    },

    /** Vrai si on affiche l'image d'exemple faute d'image chargée. */
    usingSample: function () {
      return lib.items.length === 0;
    },

    /** Liste des sources prêtes à dessiner : [{ levels: [canvas...] }, ...] */
    sources: function (imageParams, maxSize, temporary) {
      let list = lib.items;
      if (!list.length) {
        if (!sample) sample = makeSample();
        list = [sample];
      }
      return list.map(function (it) {
        return { levels: levelsFor(it, imageParams, maxSize, temporary) };
      });
    }
  };

  MX.images = lib;
})();
