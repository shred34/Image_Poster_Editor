/* ==========================================================================
   postertext.js — textes de l'affiche
   Le texte est une liste de lignes libres. Chaque ligne a ses propres
   réglages : alignement (gauche / centre / droite), taille, décalage,
   espace avant, pleine largeur, « repousser » (l'espace libre passe avant
   elle), couleurs inversées, avec ou sans bloc.
   Les blocs derrière le texte peuvent être ajustés pile à la taille des
   lettres (mesure réelle des glyphes).
   Unités : largeur de l'affiche = 1.
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;
  const TIME_RE = /^(\d{1,2}\s*[:hH.]\s*\d{2})\s*[-–—]?\s*(.*)$/;

  function line(text, o) {
    return Object.assign(
      {
        text: text,
        title: false,     // ligne « titre » (utilisée par les dispositions)
        align: 'left',    // left | center | right
        scale: 1,         // taille par rapport au corps
        indent: 0,        // décalage depuis le bord d'alignement (largeur d'affiche)
        gap: 0,           // espace avant la ligne (en corps)
        fit: false,       // pleine largeur
        push: false,      // l'espace libre vertical passe avant cette ligne
        invert: false,    // couleurs inversées (texte / bloc)
        block: true,      // bloc derrière la ligne
        weight: 'auto',   // auto | bold | normal
        hidden: false
      },
      o || {}
    );
  }

  function defaultLines() {
    return [
      line('Image Poster Editor', { title: true, scale: 1.9 })
    ];
  }

  function defaults() {
    return {
      show: true,
      lines: defaultLines(),

      vAlign: 'bottom',     // top | middle | bottom | spread
      angle: 0,             // rotation de tout le texte (°)
      offsetX: 0,
      offsetY: 0,
      margin: 0.05,

      style: 'blocks',      // blocks | panel | outline | none
      blockFit: 'tight',    // tight : pile la taille des lettres | line : hauteur de ligne constante
      padX: 0.12,           // marge horizontale des blocs (en corps)
      padY: 0.1,            // marge verticale des blocs (en corps)
      textColor: '#ffffff',
      blockColor: '#000000',
      blockOpacity: 1,

      font: 'helvetica',
      bold: true,
      upper: true,
      size: 0.032,
      tracking: 0,
      lineGap: 0.12,        // espace entre deux lignes (en corps)
      timeBold: true,
      tabTimes: true
    };
  }

  const FONTS = {
    helvetica: { family: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
    black: { family: '"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif', weight: 900 },
    condensed: { family: '"Helvetica Neue", Helvetica, "Arial Narrow", Arial, sans-serif', stretch: 'condensed' },
    impact: { family: 'Impact, Haettenschweiler, "Arial Black", sans-serif', weight: 400, fixed: true },
    mono: { family: 'Menlo, "SF Mono", "Courier New", monospace' },
    courier: { family: '"Courier New", Courier, monospace' },
    serif: { family: 'Georgia, "Times New Roman", serif' },
    times: { family: '"Times New Roman", Times, serif' }
  };

  const ASC = 0.74;  // hauteur des capitales (en corps), blocs « hauteur de ligne »
  const DESC = 0.22; // jambages

  function clean(s) {
    return String(s == null ? '' : s).replace(/[​-‍⁠﻿]/g, '').trim();
  }

  function setFont(ctx, T, px, heavy, weight) {
    const F = FONTS[T.font] || FONTS.helvetica;
    let w = F.weight || (T.bold ? 700 : 400);
    if (!F.fixed) {
      if (weight === 'bold') w = Math.max(w, 700);
      else if (weight === 'normal') w = F.weight ? w : 400;
      if (heavy) w = Math.max(w, 700);
    }
    ctx.font = w + ' ' + px.toFixed(2) + 'px ' + F.family;
    if ('fontStretch' in ctx) ctx.fontStretch = F.stretch || 'normal';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (T.tracking * px).toFixed(2) + 'px';
  }

  /* --------------------------- préparation --------------------------- */
  function prepare(T) {
    const up = function (s) { return T.upper ? s.toUpperCase() : s; };
    const out = [];
    (T.lines || []).forEach(function (L, idx) {
      if (L.hidden) return;
      const txt = clean(L.text);
      if (!txt) {
        out.push({ L: L, idx: idx, spacer: true });
        return;
      }
      const m = txt.match(TIME_RE);
      if (m) out.push({ L: L, idx: idx, time: up(m[1].replace(/\s+/g, '')), text: up(m[2]) });
      else out.push({ L: L, idx: idx, time: '', text: up(txt) });
    });
    return out;
  }

  /** Mesure les morceaux d'une ligne à la taille fpx ; renvoie la boîte englobante. */
  function measureLine(ctx, T, it, fpx, timeCol) {
    const tight = T.blockFit === 'tight';
    const parts = [];
    let l = Infinity;
    let r = -Infinity;
    let asc = 0;
    let desc = 0;
    const add = function (text, x, heavy) {
      if (!text) return 0;
      setFont(ctx, T, fpx, heavy, it.L.weight);
      const m = ctx.measureText(text);
      parts.push({ text: text, x: x, heavy: heavy });
      if (tight) {
        l = Math.min(l, x - (m.actualBoundingBoxLeft || 0));
        r = Math.max(r, x + (m.actualBoundingBoxRight || m.width));
        asc = Math.max(asc, m.actualBoundingBoxAscent || ASC * fpx);
        desc = Math.max(desc, m.actualBoundingBoxDescent || 0);
      } else {
        l = Math.min(l, x);
        r = Math.max(r, x + m.width);
        asc = ASC * fpx;
        desc = DESC * fpx;
      }
      return m.width;
    };
    if (it.time) {
      const tw = add(it.time, 0, T.timeBold);
      const col = timeCol ? timeCol * fpx : tw;
      add(it.text, col + 0.5 * fpx, false);
    } else {
      add(it.text, 0, false);
    }
    if (!parts.length) {
      l = 0;
      r = 0;
    }
    const padX = T.padX * fpx;
    const padY = T.padY * fpx;
    return {
      parts: parts,
      fpx: fpx,
      left: l,
      asc: asc,
      boxW: r - l + 2 * padX,
      boxH: asc + desc + 2 * padY,
      padX: padX,
      padY: padY
    };
  }

  /** Largeur de la colonne des horaires (en corps) pour les suites de lignes horaires semblables. */
  function timeColumns(ctx, T, items) {
    const cols = new Array(items.length).fill(0);
    if (!T.tabTimes) return cols;
    let i = 0;
    while (i < items.length) {
      const a = items[i];
      if (!a.time || a.L.fit) { i++; continue; }
      let j = i;
      let w = 0;
      while (j < items.length && items[j].time && !items[j].L.fit &&
             items[j].L.align === a.L.align && items[j].L.scale === a.L.scale) {
        setFont(ctx, T, 100, T.timeBold, items[j].L.weight);
        w = Math.max(w, ctx.measureText(items[j].time).width / 100);
        j++;
      }
      for (let k = i; k < j; k++) cols[k] = w;
      i = j;
    }
    return cols;
  }

  /* ------------------------------ mise en page ----------------------- */
  function layout(ctx, T, Wf, Hf, k) {
    const base = T.size * Wf * k;
    const m = T.margin * Wf;
    const availW = Math.max(10, Wf - 2 * m);
    const items = prepare(T);
    const cols = timeColumns(ctx, T, items);
    const rows = [];
    let total = 0;
    let pushes = 0;

    items.forEach(function (it, n) {
      const L = it.L;
      const room = Math.max(10, availW - Math.max(0, L.indent) * Wf);
      let box;
      if (it.spacer) {
        box = { spacer: true, boxW: 0, boxH: base * 0.6, parts: [] };
      } else {
        let fpx = base * Math.max(0.05, L.scale);
        box = measureLine(ctx, T, it, fpx, cols[n]);
        // pleine largeur (réduite si le texte manque de hauteur), ou ligne trop longue
        const target = L.fit ? room * Math.min(1, k) : room;
        if (L.fit || box.boxW > room) {
          fpx = fpx * (target / Math.max(1, box.boxW));
          box = measureLine(ctx, T, it, fpx, cols[n]);
        }
      }
      const gapBefore = rows.length ? (T.lineGap + L.gap) * base : 0;
      rows.push({ it: it, box: box, gapBefore: Math.max(-box.boxH, gapBefore) });
      total += rows[rows.length - 1].gapBefore + box.boxH;
      if (L.push && rows.length > 1) pushes++;
    });
    return { rows: rows, total: total, pushes: pushes, m: m, availW: availW, base: base };
  }

  /* ------------------------------ dessin ----------------------------- */
  function fillBox(ctx, color, opacity, x, y, w, h) {
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }

  /**
   * @param {object} [opts] { preview, selected } — en aperçu, la ligne sélectionnée est entourée.
   */
  function draw(ctx, W, H, P, opts) {
    const T = P.text;
    if (!T || !T.show || !T.lines || !T.lines.length) return;
    opts = opts || {};

    const ang = (T.angle || 0) * Math.PI / 180;
    const swap = Math.abs(Math.sin(ang)) > 0.7071;
    const Wf = swap ? H : W;
    const Hf = swap ? W : H;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    let g = layout(ctx, T, Wf, Hf, 1);
    const availH = Hf - 2 * g.m;
    if (g.total > availH) g = layout(ctx, T, Wf, Hf, Math.max(0.05, (availH / g.total) * 0.995));

    // répartition verticale
    const free = Math.max(0, availH - g.total);
    let y = g.m;
    let spreadGap = 0;
    let pushGap = 0;
    if (g.pushes > 0) pushGap = free / g.pushes;
    else if (T.vAlign === 'spread' && g.rows.length > 1) spreadGap = free / (g.rows.length - 1);
    else if (T.vAlign === 'middle') y += free / 2;
    else if (T.vAlign === 'bottom') y += free;

    ctx.translate(W / 2 + T.offsetX * W, H / 2 + T.offsetY * W);
    ctx.rotate(ang);
    ctx.translate(-Wf / 2, -Hf / 2);

    const placed = [];
    g.rows.forEach(function (row, n) {
      const L = row.it.L;
      if (n > 0) {
        y += row.gapBefore + spreadGap;
        if (L.push) y += pushGap;
      }
      const b = row.box;
      const ind = L.indent * Wf;
      let x;
      if (L.align === 'right') x = Wf - g.m - ind - b.boxW;
      else if (L.align === 'center') x = (Wf - b.boxW) / 2 + ind;
      else x = g.m + ind;
      placed.push({ row: row, x: x, y: y });
      y += b.boxH;
    });

    // un seul bloc autour de tout le texte
    if (T.style === 'panel' && placed.length) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      placed.forEach(function (p) {
        if (p.row.box.spacer) return;
        x0 = Math.min(x0, p.x);
        y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x + p.row.box.boxW);
        y1 = Math.max(y1, p.y + p.row.box.boxH);
      });
      const pad = g.base * 0.4;
      if (x1 > x0) fillBox(ctx, T.blockColor, T.blockOpacity, x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad);
    }

    // blocs ligne par ligne
    placed.forEach(function (p) {
      const b = p.row.box;
      const L = p.row.it.L;
      if (b.spacer || !L.block) return;
      if (T.style === 'blocks' || (T.style === 'panel' && L.invert)) {
        fillBox(ctx, L.invert ? T.textColor : T.blockColor, T.blockOpacity, p.x, p.y, b.boxW, b.boxH);
      }
    });

    // texte (contour : tous les traits d'abord, puis les pleins)
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const passes = T.style === 'outline' ? ['stroke', 'fill'] : ['fill'];
    passes.forEach(function (pass) {
      placed.forEach(function (p) {
        const b = p.row.box;
        const L = p.row.it.L;
        if (b.spacer) return;
        const ox = p.x + b.padX - b.left;
        const base = p.y + b.padY + b.asc;
        const inv = L.invert && (T.style === 'outline' || ((T.style === 'blocks' || T.style === 'panel') && L.block));
        b.parts.forEach(function (pt) {
          setFont(ctx, T, b.fpx, pt.heavy, L.weight);
          if (pass === 'stroke') {
            ctx.lineJoin = 'round';
            ctx.lineWidth = Math.max(1, b.fpx * 0.24);
            ctx.globalAlpha = T.blockOpacity;
            ctx.strokeStyle = L.invert ? T.textColor : T.blockColor;
            ctx.strokeText(pt.text, ox + pt.x, base);
            ctx.globalAlpha = 1;
          } else {
            ctx.fillStyle = inv ? T.blockColor : T.textColor;
            ctx.fillText(pt.text, ox + pt.x, base);
          }
        });
      });
    });

    // aperçu : repère de la ligne sélectionnée (jamais exporté)
    if (opts.preview && opts.selected != null && opts.selected >= 0) {
      const p = placed.find(function (q) { return q.row.it.idx === opts.selected; });
      if (p) {
        const b = p.row.box;
        const w = Math.max(b.boxW, g.base);
        const lw = Math.max(1, W / 700);
        ctx.lineWidth = lw;
        ctx.setLineDash([lw * 4, lw * 3]);
        ctx.globalCompositeOperation = 'difference'; // visible sur fond clair comme sur bloc noir
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(p.x - lw * 2, p.y - lw * 2, w + lw * 4, b.boxH + lw * 4);
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  /* ----------------------------- dispositions ------------------------ */
  // Chaque disposition réécrit les réglages de placement des lignes (pas le texte).
  function roles(T) {
    return T.lines.map(function (L) {
      if (L.title) return 'title';
      return TIME_RE.test(clean(L.text)) ? 'prog' : 'info';
    });
  }

  function reset(T, o) {
    T.lines.forEach(function (L) {
      L.align = 'left';
      L.scale = L.title ? 1.9 : 1;
      L.indent = 0;
      L.gap = 0;
      L.fit = false;
      L.push = false;
    });
    Object.assign(T, { vAlign: 'bottom', angle: 0, offsetX: 0, offsetY: 0 }, o || {});
    return roles(T);
  }

  /** Espace avant chaque changement de groupe (infos → titre → programme). */
  function groupGaps(T, R, gap) {
    for (let i = 1; i < T.lines.length; i++) if (R[i] !== R[i - 1]) T.lines[i].gap = gap;
  }

  function firstOf(R, role) {
    return R.indexOf(role);
  }

  const LAYOUTS = {
    'Pile à gauche': function (T) {
      const R = reset(T);
      groupGaps(T, R, 0.8);
    },
    'Pile à droite': function (T) {
      const R = reset(T);
      T.lines.forEach(function (L) { L.align = 'right'; });
      groupGaps(T, R, 0.8);
    },
    'Centré': function (T) {
      const R = reset(T, { vAlign: 'middle' });
      T.lines.forEach(function (L) { L.align = 'center'; });
      groupGaps(T, R, 0.8);
    },
    'Zigzag': function (T) {
      reset(T, { vAlign: 'spread' });
      T.lines.forEach(function (L, i) { L.align = i % 2 ? 'right' : 'left'; });
    },
    'Escalier': function (T) {
      const R = reset(T, { vAlign: 'middle' });
      T.lines.forEach(function (L, i) { L.indent = i * 0.055; });
      groupGaps(T, R, 0.5);
    },
    'Diagonale': function (T) {
      const n = T.lines.length;
      reset(T, { vAlign: 'spread' });
      T.lines.forEach(function (L, i) {
        L.align = 'left';
        L.indent = n > 1 ? (i / (n - 1)) * 0.5 : 0;
      });
    },
    'Éclaté': function (T) {
      const R = reset(T, { vAlign: 'spread' });
      T.lines.forEach(function (L, i) {
        if (R[i] === 'title') { L.fit = true; L.align = 'center'; }
        else if (R[i] === 'info') L.align = 'right';
        else L.align = 'left';
      });
    },
    'Haut et bas': function (T) {
      const R = reset(T, { vAlign: 'top' });
      groupGaps(T, R, 0.6);
      const p = firstOf(R, 'prog');
      if (p > 0) T.lines[p].push = true;
    },
    'Infos à gauche, programme à droite': function (T) {
      const R = reset(T, { vAlign: 'top' });
      T.lines.forEach(function (L, i) { L.align = R[i] === 'prog' ? 'right' : 'left'; });
      groupGaps(T, R, 0.6);
      const p = firstOf(R, 'prog');
      if (p > 0) T.lines[p].push = true;
    },
    'Titre géant en haut': function (T) {
      // les lignes titre passent en tête de liste
      T.lines.sort(function (a, b) { return (b.title ? 1 : 0) - (a.title ? 1 : 0); });
      const R = reset(T, { vAlign: 'top' });
      // le titre passe en premier visuellement grâce à « repousser » sur la ligne suivante
      T.lines.forEach(function (L, i) { if (R[i] === 'title') L.fit = true; });
      groupGaps(T, R, 0.6);
      const after = R.findIndex(function (r, i) { return i > firstOf(R, 'title') && r !== 'title'; });
      if (after > 0) T.lines[after].push = true;
    },
    'Pleine largeur': function (T) {
      reset(T, { vAlign: 'spread' });
      T.lines.forEach(function (L) { L.fit = true; });
    },
    'Colonne justifiée': function (T) {
      const R = reset(T, { vAlign: 'middle' });
      T.lines.forEach(function (L) { L.fit = true; L.indent = 0.18; L.align = 'right'; });
      groupGaps(T, R, 0.3);
    },
    'Incliné': function (T) {
      const R = reset(T, { vAlign: 'middle', angle: -8 });
      T.lines.forEach(function (L, i) { L.align = R[i] === 'prog' ? 'right' : 'left'; });
      groupGaps(T, R, 0.8);
    },
    'Vertical, bord gauche': function (T) {
      const R = reset(T, { vAlign: 'top', angle: -90 });
      groupGaps(T, R, 0.6);
    },
    'Vertical, bord droit': function (T) {
      const R = reset(T, { vAlign: 'bottom', angle: 90 });
      T.lines.forEach(function (L) { L.align = 'right'; });
      groupGaps(T, R, 0.6);
    }
  };

  /* Styles tout prêts : apparence seulement (le texte et le placement ne changent pas) */
  const STYLE_BASE = {
    style: 'blocks', blockFit: 'tight', padX: 0.12, padY: 0.1, font: 'helvetica', bold: true, upper: true,
    tracking: 0, lineGap: 0.12, textColor: '#ffffff', blockColor: '#000000', blockOpacity: 1, timeBold: true, tabTimes: true
  };
  function st(o) { return Object.assign({}, STYLE_BASE, o); }
  const STYLES = {
    'Blocs noirs serrés': st({}),
    'Blocs noirs aérés': st({ blockFit: 'line', padX: 0.32, padY: 0.2, lineGap: 0.22 }),
    'Blocs collés (aucun espace)': st({ padX: 0.1, padY: 0.08, lineGap: 0 }),
    'Blocs blancs, texte noir': st({ textColor: '#000000', blockColor: '#ffffff' }),
    'Gros noir (Arial Black)': st({ font: 'black', tracking: -0.02 }),
    'Condensé espacé': st({ font: 'condensed', tracking: 0.08 }),
    'Impact': st({ font: 'impact', bold: false, tracking: 0.01 }),
    'Machine à écrire': st({ font: 'courier', bold: true, padX: 0.2, padY: 0.14 }),
    'Mono technique': st({ font: 'mono', bold: false, timeBold: true, tracking: 0.02 }),
    'Un seul bloc': st({ style: 'panel' }),
    'Contour': st({ style: 'outline', font: 'black' }),
    'Sans fond, texte noir': st({ style: 'none', textColor: '#000000' })
  };

  MX.posterText = {
    defaults: defaults,
    line: line,
    draw: draw,
    LAYOUTS: LAYOUTS,
    STYLES: STYLES,
    isTime: function (s) { return TIME_RE.test(clean(s)); }
  };
  MX.textStyles = STYLES;
})();
