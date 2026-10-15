/* ==========================================================================
   renderer.js — dessine l'affiche dans un contexte 2D
   Le même code sert à l'aperçu (petit canvas) et à l'export (grand canvas).
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;
  const U = MX.util;
  const DEG = U.DEG;

  /** Choisit dans la pyramide le plus petit niveau encore >= à la taille cible. */
  function pickLevel(levels, target) {
    for (let k = levels.length - 1; k >= 0; k--) {
      if (levels[k].width >= target) return levels[k];
    }
    return levels[0];
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} W  largeur en pixels
   * @param {number} H  hauteur en pixels
   * @param {object} P  paramètres
   * @param {Array}  sources  [{ levels: [canvas, ...] }, ...]
   * @param {object} [opts]   { time, opaque }
   * @returns {{ count:number, drawn:number }}
   */
  function draw(ctx, W, H, P, sources, opts) {
    opts = opts || {};
    const aspect = H / W;
    const time = MX.anim.wrap(P, opts.time || 0);
    P = MX.anim.effective(P); // boucle parfaite : vitesses arrondies
    const T = P.tiles;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const po = P.poster;
    if (po.transparent && !opts.opaque) {
      ctx.clearRect(0, 0, W, H);
    } else {
      ctx.fillStyle = po.gradient
        ? MX.guilloche.inkStyle(ctx, W, H, 'gradient', po.background, po.background2, po.gradientAngle)
        : po.background;
      ctx.fillRect(0, 0, W, H);
    }

    const tiles = MX.layouts.build(P, aspect, time, sources.length);

    const m = P.poster.margin;
    ctx.save();
    if (m > 0) {
      ctx.beginPath();
      ctx.rect(m * W, m * W, W - 2 * m * W, H - 2 * m * W);
      ctx.clip();
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // guilloché et microtexte : sous ou sur les tuiles
    const extras = function (pos) {
      P.layers.forEach(function (L) {
        if (L.position === pos) MX.guilloche.drawLayer(ctx, W, H, aspect, L, time, po.gradientAngle);
      });
      if (P.micro.position === pos) MX.guilloche.drawMicro(ctx, W, H, aspect, P.micro, time, po.gradientAngle);
    };
    extras('under');

    const sx = T.stretchX;
    const sy = T.stretchY;
    const win = T.frame === 'window';
    const framed = T.frame !== 'none';
    const hasShadow = T.shadow > 0;
    const bwPx = (T.borderWidth / 1000) * W;
    const fg = T.borderColor;
    const bg = fg === '#ffffff' ? '#000000' : '#ffffff';
    // rayon englobant d'une tuile (en multiples de sa taille), pour l'élimination hors-champ
    const reach = Math.max(sx, sy) * Math.SQRT1_2 * (1 + (win ? T.barHeight * 2 : 0)) + (hasShadow ? T.shadow * 1.5 : 0) + 0.02;
    const left = m;
    const right = 1 - m;
    const top = m;
    const bottom = aspect - m;
    const blend = T.blend;

    let drawn = 0;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const alpha = t.alpha < 0 ? 0 : t.alpha > 1 ? 1 : t.alpha;
      if (alpha <= 0) continue;
      const r = t.size * reach;
      if (t.x + r < left || t.x - r > right || t.y + r < top || t.y - r > bottom) continue;
      const px = t.size * W;
      if (px < 0.2) continue;

      const rad = t.rot * DEG;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      const half = px / 2;
      const bar = win ? px * T.barHeight : 0;
      const ex = t.x * W;
      const ey = t.y * W;

      // ombre dure (décalée dans la direction de l'écran, pas de la tuile)
      if (hasShadow && px >= 4) {
        const d = T.shadow * px;
        ctx.setTransform(c * sx, s * sx, -s * sy, c * sy, ex + d, ey + d);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * T.shadowAlpha;
        ctx.fillStyle = fg;
        ctx.fillRect(-half, -half - bar, px, px + bar);
      }

      ctx.setTransform(c * sx, s * sx, -s * sy, c * sy, ex, ey);

      // image
      const src = sources[t.img] || sources[0];
      const lvl = pickLevel(src.levels, px * Math.max(sx, sy));
      const flipped = t.fx < 0 || t.fy < 0;
      ctx.globalCompositeOperation = blend;
      ctx.globalAlpha = alpha;
      if (flipped) ctx.scale(t.fx, t.fy);
      ctx.drawImage(lvl, -half, -half, px, px);
      if (flipped) ctx.scale(t.fx, t.fy);

      // cadre / fenêtre
      if (framed && px >= 4) {
        ctx.globalCompositeOperation = 'source-over';
        if (win) {
          ctx.fillStyle = fg;
          ctx.fillRect(-half, -half - bar, px, bar);
          const b = bar * 0.5;
          const gap = bar * 0.2;
          ctx.fillStyle = bg;
          for (let k = 0; k < 3; k++) {
            ctx.fillRect(half - gap - (k + 1) * b - k * gap, -half - bar + (bar - b) / 2, b, b);
          }
          ctx.lineWidth = Math.max(bwPx, W * 0.0006);
          ctx.strokeStyle = fg;
          ctx.strokeRect(-half, -half - bar, px, px + bar);
        } else if (bwPx > 0) {
          ctx.lineWidth = bwPx;
          ctx.strokeStyle = fg;
          ctx.strokeRect(-half, -half, px, px);
        }
      }
      drawn++;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    extras('over');

    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // textes de l'affiche : toujours au premier plan, hors de la marge de découpe
    MX.posterText.draw(ctx, W, H, P, {
      preview: !!opts.preview && MX.posterText.highlight,
      selected: MX.posterText.selected
    });
    return { count: tiles.length, drawn: drawn };
  }

  MX.renderer = { draw: draw };
})();
