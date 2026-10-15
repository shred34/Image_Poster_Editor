/* ==========================================================================
   layouts.js — génération de la liste de tuiles
   Pipeline : générateur -> modulation (vagues, vortex, loupe) -> style -> tri
   Unités : largeur de l'affiche = 1, hauteur = aspect (H / W).
   Une tuile : { x, y, size, rot, alpha, group, sub, key, id, img, fx, fy }
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;
  const U = MX.util;
  const TAU = U.TAU;
  const DEG = U.DEG;
  const hash01 = U.hash01;

  const MAX_TILES = 40000;

  function tile(x, y, size, rot, group, sub, key) {
    return { x: x, y: y, size: size, rot: rot || 0, alpha: 1, group: group || 0, sub: sub || 0, key: key | 0, id: 0, img: 0, fx: 1, fy: 1 };
  }

  /* ====================================================================
     Générateurs
     ==================================================================== */
  const generators = {};

  /* ---- Grille ------------------------------------------------------- */
  generators.grid = function (P, aspect, out) {
    const g = P.grid;
    const seed = P.layout.seed;
    const cols = Math.max(1, g.cols | 0);
    const cw = 1 / cols;
    let rows, ch, offY;
    if (g.autoRows) {
      ch = cw;
      rows = Math.ceil(aspect / cw);
      offY = (aspect - rows * ch) / 2;
    } else {
      rows = Math.max(1, g.rows | 0);
      ch = aspect / rows;
      offY = 0;
    }
    const os = Math.max(0, g.overscan | 0);

    for (let i = -os; i < rows + os; i++) {
      for (let j = -os; j < cols + os; j++) {
        if (out.length >= MAX_TILES) return;
        const key = (i + 500) * 1000 + (j + 500);
        if (g.skip > 0 && hash01(seed, key, 11) < g.skip) continue;
        let x = (j + 0.5) * cw + ((i & 1) !== 0 ? g.rowShift * cw : 0);
        let y = offY + (i + 0.5) * ch + ((j & 1) !== 0 ? g.colShift * ch : 0);
        if (g.jitter > 0) {
          x += (hash01(seed, key, 1) * 2 - 1) * g.jitter * cw;
          y += (hash01(seed, key, 2) * 2 - 1) * g.jitter * ch;
        }
        out.push(tile(x, y, cw, 0, i, j, key));
      }
    }
  };

  /* ---- Cascade (fenêtres dupliquées le long d'un chemin) ------------ */
  generators.cascade = function (P, aspect, out) {
    const c = P.cascade;
    const seed = P.layout.seed;
    const n = Math.min(MAX_TILES, Math.max(1, c.count | 0));
    const ax = c.x1;
    const ay = c.y1 * aspect;
    const bx = c.x2;
    const by = c.y2 * aspect;
    const cx = (ax + bx) / 2;
    const cy = (ay + by) / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-6;
    const nx = -dy / len;
    const ny = dx / len;
    const tx = dx / len;
    const ty = dy / len;
    const ph0 = hash01(seed, 1, 21) * TAU;
    const ph1 = hash01(seed, 2, 21) * TAU;
    const ph2 = hash01(seed, 3, 21) * TAU;

    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0;
      const ang = TAU * (c.frequency * t + c.phase);
      let x, y;
      switch (c.path) {
        case 'sine': {
          const o = c.amplitude * Math.sin(ang);
          x = ax + dx * t + nx * o;
          y = ay + dy * t + ny * o;
          break;
        }
        case 'circle':
          x = cx + c.amplitude * Math.cos(ang);
          y = cy + c.amplitude * Math.sin(ang);
          break;
        case 'spiral': {
          const r = c.amplitude * t;
          x = cx + r * Math.cos(ang);
          y = cy + r * Math.sin(ang);
          break;
        }
        case 'lissajous':
          x = cx + c.amplitude * Math.sin(ang);
          y = cy + c.amplitude * Math.sin(TAU * c.frequency * c.ratio * t);
          break;
        case 'walk': {
          const f = c.frequency;
          const o1 =
            (Math.sin(TAU * f * t + ph0) + 0.6 * Math.sin(TAU * f * 2.3 * t + ph1) + 0.35 * Math.sin(TAU * f * 4.1 * t + ph2)) / 1.95;
          const o2 = (Math.sin(TAU * f * 1.7 * t + ph1) + 0.5 * Math.sin(TAU * f * 3.1 * t + ph2)) / 1.5;
          x = ax + dx * t + nx * c.amplitude * o1 + tx * c.amplitude * 0.5 * o2;
          y = ay + dy * t + ny * c.amplitude * o1 + ty * c.amplitude * 0.5 * o2;
          break;
        }
        default: // 'line'
          x = ax + dx * t;
          y = ay + dy * t;
      }
      const size = U.lerp(c.startSize, c.endSize, Math.pow(t, c.curve));
      out.push(tile(x, y, size, c.rotStep * i, i, 0, i));
    }
  };

  /* ---- Tunnel (copies concentriques, effet « zoom infini ») --------- */
  generators.tunnel = function (P, aspect, out) {
    const u = P.tunnel;
    const n = Math.min(MAX_TILES, Math.max(1, u.count | 0));
    const inner = Math.max(0.001, u.inner);
    const outer = Math.max(0.001, u.outer);
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0;
      const tc = Math.pow(t, u.curve);
      const size = u.geometric ? outer * Math.pow(inner / outer, tc) : U.lerp(outer, inner, tc);
      out.push(tile(u.centerX + u.offsetX * t, u.centerY * aspect + u.offsetY * t, size, u.rotStep * i, i, 0, i));
    }
  };

  /* ---- Radial (anneaux de copies) ----------------------------------- */
  generators.radial = function (P, aspect, out) {
    const r = P.radial;
    const rings = Math.max(1, r.rings | 0);
    const cx = r.centerX;
    const cy = r.centerY * aspect;
    let key = 0;
    if (r.centerTile) out.push(tile(cx, cy, r.sizeInner, 0, 0, 0, key++));
    for (let k = 0; k < rings; k++) {
      const t = rings > 1 ? k / (rings - 1) : 0;
      const radius = U.lerp(r.radiusInner, r.radiusOuter, t);
      const size = U.lerp(r.sizeInner, r.sizeOuter, t);
      const n = Math.max(1, Math.round(r.base + r.add * k));
      for (let m = 0; m < n; m++) {
        if (out.length >= MAX_TILES) return;
        const a = (m / n) * TAU + r.twist * DEG * k;
        out.push(
          tile(cx + radius * Math.cos(a), cy + radius * Math.sin(a), size, r.faceOut ? a / DEG + 90 : 0, k + 1, m, key++)
        );
      }
    }
  };

  /* ---- Subdivision (quadtree : plusieurs échelles de la même image) -- */
  generators.subdivision = function (P, aspect, out) {
    const s = P.subdivision;
    const seed = P.layout.seed;
    const cols = Math.max(1, s.cols | 0);
    const cw = 1 / cols;
    const rows = Math.ceil(aspect / cw);
    const offY = (aspect - rows * cw) / 2;
    const fx = s.focusX;
    const fy = s.focusY * aspect;
    const maxD = Math.hypot(1, aspect);
    const maxDepth = Math.min(6, s.maxDepth | 0);
    const minDepth = Math.min(maxDepth, s.minDepth | 0);

    function visit(x, y, size, depth, id) {
      if (out.length >= MAX_TILES) return;
      if (x + size < 0 || x > 1 || y + size < 0 || y > aspect) return;
      let split = false;
      if (depth < minDepth) {
        split = true;
      } else if (depth < maxDepth) {
        const d = Math.hypot(x + size / 2 - fx, y + size / 2 - fy) / maxD;
        const prox = 1 - Math.min(1, d * 1.6);
        const p = U.clamp(s.splitProb + s.focusBias * (prox - 0.5) * 2, 0, 1);
        split = hash01(seed, id, 31) < p;
      }
      if (split) {
        const h = size / 2;
        for (let k = 0; k < 4; k++) {
          visit(x + (k & 1) * h, y + (k >> 1) * h, h, depth + 1, (Math.imul(id, 5) + k + 1) | 0);
        }
      } else {
        out.push(tile(x + size / 2, y + size / 2, size, 0, depth, 0, id));
      }
    }

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        visit(j * cw, offY + i * cw, cw, 0, (i + 1) * 977 + j + 1);
      }
    }
  };

  /* ---- Dispersion --------------------------------------------------- */
  generators.scatter = function (P, aspect, out) {
    const s = P.scatter;
    const seed = P.layout.seed;
    const n = Math.min(MAX_TILES, Math.max(1, s.count | 0));
    const m = s.margin;
    for (let i = 0; i < n; i++) {
      const u1 = hash01(seed, i, 41);
      const u2 = hash01(seed, i, 42);
      const u3 = hash01(seed, i, 43);
      let x, y;
      if (s.placement === 'gauss') {
        const rr = Math.sqrt(-2 * Math.log(Math.max(1e-6, u1)));
        const a = TAU * u2;
        x = 0.5 + s.spread * rr * Math.cos(a);
        y = aspect / 2 + s.spread * rr * Math.sin(a);
      } else {
        x = -m + u1 * (1 + 2 * m);
        y = -m + u2 * (aspect + 2 * m);
      }
      const size = U.lerp(s.sizeMin, s.sizeMax, Math.pow(u3, s.bias));
      out.push(tile(x, y, size, 0, Math.floor(u3 * 5), 0, i));
    }
  };

  /* ---- Spirale de Fibonacci (phyllotaxie) --------------------------- */
  generators.spiral = function (P, aspect, out) {
    const s = P.spiral;
    const n = Math.min(MAX_TILES, Math.max(1, s.count | 0));
    const cx = s.centerX;
    const cy = s.centerY * aspect;
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0;
      const r = s.spacing * Math.sqrt(i + 0.5);
      const a = i * s.angle * DEG;
      const size = U.lerp(s.sizeStart, s.sizeEnd, Math.pow(t, s.sizeCurve));
      out.push(tile(cx + r * Math.cos(a), cy + r * Math.sin(a), size, s.faceOut ? a / DEG + 90 : 0, i, 0, i));
    }
  };

  /* ---- Cadre (tuiles le long du bord de la page) ------------------- */
  generators.frame = function (P, aspect, out) {
    const f = P.frame;
    const count = Math.max(2, f.count | 0);
    const size = (1 - 2 * f.inset) / count;
    let key = 0;
    for (let r = 0; r < Math.max(1, f.rings | 0); r++) {
      const ins = f.inset + r * size * f.ringStep;
      const x0 = ins;
      const x1 = 1 - ins;
      const y0 = ins;
      const y1 = aspect - ins;
      const w = x1 - x0;
      const h = y1 - y0;
      if (w <= size || h <= size) break;
      const nx = Math.max(2, Math.round(w / size));
      const ny = Math.max(3, Math.round(h / size));
      const sx = w / nx;
      const sy = h / ny;
      const s = Math.min(sx, sy);
      const g = r * 4;
      for (let i = 0; i < nx; i++) {
        const x = x0 + (i + 0.5) * sx;
        out.push(tile(x, y0 + s / 2, s, 0, g, i, key++));
        out.push(tile(x, y1 - s / 2, s, f.orient ? 180 : 0, g + 2, i, key++));
      }
      for (let j = 1; j < ny - 1; j++) {
        const y = y0 + (j + 0.5) * sy;
        out.push(tile(x0 + s / 2, y, s, f.orient ? 270 : 0, g + 3, j, key++));
        out.push(tile(x1 - s / 2, y, s, f.orient ? 90 : 0, g + 1, j, key++));
      }
    }
  };

  /* ---- Bandes (rangées de tailles variables, effet de profondeur) --- */
  generators.strips = function (P, aspect, out) {
    const s = P.strips;
    let y = 0;
    let i = 0;
    let key = 0;
    while (y < aspect + 0.5 && i < 400 && out.length < MAX_TILES) {
      const f = Math.min(1, Math.max(0, y / aspect));
      const size = Math.max(0.004, U.lerp(s.sizeTop, s.sizeBottom, Math.pow(f, s.curve)));
      const step = size * s.spacing;
      const off = i % 2 === 1 ? s.shift * step : 0;
      const n = Math.ceil(1 / step) + 3;
      for (let j = -1; j < n; j++) {
        if (out.length >= MAX_TILES) return;
        out.push(tile(off + j * step + step / 2, y + size / 2, size, 0, i, j, key++));
      }
      y += Math.max(0.002, size * (1 - s.overlap));
      i++;
    }
  };

  /* ---- Aucune tuile (guilloché seul) -------------------------------- */
  generators.none = function () {};

  /* ====================================================================
     Modulation : vagues, vortex, loupe
     ==================================================================== */
  function waveShape(shape, p) {
    switch (shape) {
      case 'triangle': {
        const f = p - Math.floor(p);
        return 1 - 4 * Math.abs(f - 0.5);
      }
      case 'saw':
        return 2 * (p - Math.floor(p)) - 1;
      case 'square':
        return Math.sin(TAU * p) >= 0 ? 1 : -1;
      case 'bump':
        return 2 * Math.abs(Math.sin(Math.PI * p)) - 1;
      default:
        return Math.sin(TAU * p);
    }
  }

  function waveValue(w, x, y, time) {
    let p;
    if (w.direction === 'radial') {
      p = w.frequency * Math.hypot(x, y);
    } else if (w.direction === 'angular') {
      p = Math.max(1, Math.round(w.frequency)) * (Math.atan2(y, x) / TAU);
    } else {
      const a = w.angle * DEG;
      p = w.frequency * (x * Math.cos(a) + y * Math.sin(a));
    }
    return waveShape(w.shape, p + w.phase + time * w.speed);
  }

  function modulate(tiles, P, aspect, time) {
    const cx0 = 0.5;
    const cy0 = aspect / 2;
    const rMax = Math.hypot(0.5, aspect / 2);
    const waves = P.waves.filter(function (w) {
      return w.enabled;
    });
    const mod = MX.anim.modulation(P, time);
    const swirl = mod.swirl * DEG;
    const lens = mod.lens;

    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const ox = t.x - cx0;
      const oy = t.y - cy0;

      for (let k = 0; k < waves.length; k++) {
        const w = waves[k];
        const v = waveValue(w, ox, oy, time);
        t.size *= Math.max(0, 1 + w.scale * v);
        t.x += w.posX * v;
        t.y += w.posY * v;
        t.rot += w.rot * v;
        if (w.alpha > 0) t.alpha *= 1 - w.alpha * (0.5 - 0.5 * v);
      }

      if (swirl !== 0 || lens !== 0) {
        let dx = t.x - cx0;
        let dy = t.y - cy0;
        const k = 1 - Math.min(1, Math.hypot(dx, dy) / rMax);
        if (swirl !== 0) {
          const th = swirl * k;
          const c = Math.cos(th);
          const s = Math.sin(th);
          const nx = dx * c - dy * s;
          dy = dx * s + dy * c;
          dx = nx;
          t.rot += th / DEG;
        }
        if (lens !== 0) {
          const f = Math.max(0.05, 1 + lens * k);
          dx *= f;
          dy *= f;
          t.size *= f;
        }
        t.x = cx0 + dx;
        t.y = cy0 + dy;
      }
    }
  }

  /* ====================================================================
     Style des tuiles, choix de l'image, tri
     ==================================================================== */
  function styleTiles(tiles, P, nImages, time) {
    const T = P.tiles;
    const seed = P.layout.seed;
    const spin = time * P.anim.spin;

    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      t.id = i;
      t.size *= T.size;
      let rot = t.rot + T.rotation + spin;
      if (T.rotationRandom > 0) rot += (hash01(seed, t.key, 51) * 2 - 1) * T.rotationRandom;
      if (T.snap90) rot += Math.floor(hash01(seed, t.key, 52) * 4) * 90;
      t.rot = rot;
      t.alpha *= T.opacity * (1 - T.opacityJitter * hash01(seed, t.key, 53));

      if (T.flip === 'alternate') {
        t.fx = (t.group + t.sub) & 1 ? -1 : 1;
      } else if (T.flip === 'random') {
        t.fx = hash01(seed, t.key, 54) < 0.5 ? -1 : 1;
        t.fy = hash01(seed, t.key, 55) < 0.5 ? -1 : 1;
      }
    }

    // choix de l'image
    const n = Math.max(1, nImages);
    const I = P.image;
    const off = I.offset | 0;
    if (n === 1) return;

    if (I.sequence === 'size') {
      const order = tiles.slice().sort(function (a, b) {
        return b.size - a.size;
      });
      for (let r = 0; r < order.length; r++) {
        order[r].img = (Math.floor((r / order.length) * n) + off) % n;
      }
      return;
    }

    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      let k;
      switch (I.sequence) {
        case 'group':
          k = t.group;
          break;
        case 'random':
          k = Math.floor(hash01(seed, t.key, 61) * n);
          break;
        case 'pingpong': {
          const period = 2 * (n - 1);
          const m = (((t.id + off) % period) + period) % period;
          k = m < n ? m : period - m;
          t.img = k;
          continue;
        }
        default:
          k = t.id;
      }
      t.img = (((k + off) % n) + n) % n;
    }
  }

  function sortTiles(tiles, order, seed) {
    switch (order) {
      case 'rev':
        tiles.reverse();
        break;
      case 'small': // les petites tuiles par-dessus
        tiles.sort(function (a, b) {
          return b.size - a.size;
        });
        break;
      case 'large': // les grandes tuiles par-dessus
        tiles.sort(function (a, b) {
          return a.size - b.size;
        });
        break;
      case 'random':
        tiles.sort(function (a, b) {
          return hash01(seed, a.key, 71) - hash01(seed, b.key, 71);
        });
        break;
      default:
    }
  }

  /**
   * Construit la liste finale de tuiles, dans l'ordre de dessin.
   * @param {object} P        paramètres
   * @param {number} aspect   hauteur / largeur de l'affiche
   * @param {number} time     temps d'animation en secondes
   * @param {number} nImages  nombre d'images disponibles
   */
  function build(P, aspect, time, nImages) {
    const out = [];
    const gen = generators[P.layout.mode] || generators.grid;
    gen(P, aspect, out);
    modulate(out, P, aspect, time);
    MX.anim.applyTiles(out, P, aspect, time, hash01);
    MX.anim.applyCamera(out, P, aspect, time);
    styleTiles(out, P, nImages, time);
    MX.anim.applyStyle(out, P, time, nImages, hash01);
    sortTiles(out, P.order, P.layout.seed);
    return out;
  }

  MX.layouts = { build: build, MAX_TILES: MAX_TILES };
})();
