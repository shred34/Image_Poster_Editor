/* ==========================================================================
   guilloche.js — lignes fines vectorielles pour l'affiche
   - guilloché : rosettes, bandes ondulées entrelacées, rayons
   - microtexte : lignes ou anneaux de texte minuscule
   - encres : couleur unie, dégradé, irisé (arc-en-ciel)
   Toutes les fonctions supposent une transformation identité et la restaurent.
   Unités : largeur de l'affiche = 1.
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;
  const U = MX.util;
  const TAU = U.TAU;
  const DEG = U.DEG;

  /** Style de remplissage / trait : couleur, dégradé 2 couleurs ou irisé. */
  function inkStyle(ctx, W, H, mode, c1, c2, angle) {
    if (mode !== 'gradient' && mode !== 'rainbow') return c1;
    const a = angle * DEG;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const half = (Math.abs(dx) * W + Math.abs(dy) * H) / 2;
    const g = ctx.createLinearGradient(W / 2 - dx * half, H / 2 - dy * half, W / 2 + dx * half, H / 2 + dy * half);
    if (mode === 'rainbow') {
      const hues = [0, 45, 105, 175, 235, 295, 350];
      hues.forEach(function (h, i) {
        g.addColorStop(i / (hues.length - 1), 'hsl(' + h + ',58%,52%)');
      });
    } else {
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
    }
    return g;
  }

  /* ----------------------------- rosette ------------------------------ */
  function rosette(ctx, W, aspect, L, time) {
    const cx = L.centerX * W;
    const cy = L.centerY * aspect * W;
    const k = Math.max(1, Math.round(L.lobes));
    const m = Math.max(1, Math.round(L.lobes2));
    const n = Math.min(3000, Math.max(240, 24 * Math.max(k, m)));
    const lines = Math.max(1, L.lines | 0);
    const ph0 = L.phase + time * L.speed;
    const a1 = L.amplitude * W;
    const a2 = L.amp2 * W;

    for (let i = 0; i < lines; i++) {
      const f = lines > 1 ? i / (lines - 1) : 0;
      const R = U.lerp(L.innerR, L.outerR, f) * W;
      const phi = TAU * (L.phaseStep * i + ph0);
      for (let s = 0; s <= n; s++) {
        const t = (s / n) * TAU;
        const rho = R + a1 * Math.sin(k * t + phi) + a2 * Math.sin(m * t + 2 * phi);
        const x = cx + rho * Math.cos(t);
        const y = cy + rho * Math.sin(t);
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
  }

  /* ------------------------------ bandes ------------------------------ */
  function bands(ctx, W, aspect, L, time) {
    const D = Math.hypot(1, aspect);
    const lines = Math.max(1, L.lines | 0);
    const th = L.angle * DEG;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const cx = L.centerX * W;
    const cy = L.centerY * aspect * W;
    const n = Math.min(4000, Math.max(160, Math.round(D * L.frequency * 24)));
    const ph0 = L.phase + time * L.speed;
    const amp = L.amplitude * W;

    for (let j = 0; j < lines; j++) {
      const v = (-D / 2 + ((j + 0.5) * D) / lines) * W;
      for (let i = 0; i <= n; i++) {
        const u = -D / 2 + (i / n) * D;
        const env = 0.5 + 0.5 * Math.sin(TAU * (L.envelope * u + (j / lines) * 0.5));
        const w = amp * env * Math.sin(TAU * (L.frequency * u + L.phaseStep * j + ph0));
        const uu = u * W;
        const vv = v + w;
        const x = cx + uu * c - vv * s;
        const y = cy + uu * s + vv * c;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
  }

  /* ------------------------------- rayons ----------------------------- */
  function rays(ctx, W, aspect, L, time) {
    const cx = L.centerX * W;
    const cy = L.centerY * aspect * W;
    const lines = Math.max(1, L.lines | 0);
    const steps = 140;
    const ph0 = L.phase + time * L.speed;
    const wig = L.amplitude * 6; // radians
    const k = Math.max(0, L.lobes);

    for (let i = 0; i < lines; i++) {
      const a = (TAU * i) / lines;
      for (let s = 0; s <= steps; s++) {
        const f = s / steps;
        const r = U.lerp(L.innerR, L.outerR, f) * W;
        const t = a + wig * Math.sin(TAU * (k * f * 0.25 + ph0) + i * L.phaseStep * TAU);
        const x = cx + r * Math.cos(t);
        const y = cy + r * Math.sin(t);
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
  }

  /** Dessine un calque de guilloché. */
  function drawLayer(ctx, W, H, aspect, L, time, gradAngle) {
    if (!L.enabled || L.opacity <= 0) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = L.opacity;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = inkStyle(ctx, W, H, L.colorMode, L.color, L.color2, gradAngle);
    ctx.lineWidth = Math.max(0.25, (L.width / 1000) * W);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (L.type === 'bands') bands(ctx, W, aspect, L, time);
    else if (L.type === 'rays') rays(ctx, W, aspect, L, time);
    else rosette(ctx, W, aspect, L, time);
    ctx.stroke();
    ctx.restore();
  }

  /* ----------------------------- microtexte --------------------------- */
  function drawMicro(ctx, W, H, aspect, M, time, gradAngle) {
    if (!M.enabled || M.opacity <= 0) return;
    const px = (M.size / 1000) * W;
    if (px < 0.8) return;

    // texte trop petit pour être lisible (aperçu) : on le remplace par un trait fin équivalent
    if (px < (M.minPx || 2.6)) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = M.opacity * 0.55;
      ctx.strokeStyle = inkStyle(ctx, W, H, M.colorMode, M.color, M.color2, gradAngle);
      ctx.lineWidth = Math.max(0.5, px * 0.45);
      ctx.beginPath();
      const pitchS = Math.max(px * 0.9, M.spacing * px);
      if (M.mode === 'rings') {
        const cx = M.centerX * W;
        const cy = M.centerY * aspect * W;
        for (let r = Math.max(px, M.innerR * W); r <= M.outerR * W; r += pitchS) {
          ctx.moveTo(cx + r, cy);
          ctx.arc(cx, cy, r, 0, TAU);
        }
      } else {
        const D = Math.hypot(1, aspect) * W;
        const a = M.angle * DEG;
        ctx.translate(W / 2, H / 2);
        ctx.rotate(a);
        for (let y = -D / 2; y <= D / 2; y += pitchS) {
          ctx.moveTo(-D / 2, y);
          ctx.lineTo(D / 2, y);
        }
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = M.opacity;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = inkStyle(ctx, W, H, M.colorMode, M.color, M.color2, gradAngle);
    ctx.font = (M.bold ? '600 ' : '400 ') + px + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const base = (M.text || 'X').replace(/\s+/g, ' ').trim() + ' · ';
    const chars = Array.from(base);
    const widths = {};
    const cw = function (ch) {
      return widths[ch] !== undefined ? widths[ch] : (widths[ch] = ctx.measureText(ch).width);
    };
    let tw = 0;
    chars.forEach(function (ch) {
      tw += cw(ch);
    });
    const pitch = Math.max(px * 0.9, M.spacing * px);

    if (M.mode === 'rings') {
      const cx = M.centerX * W;
      const cy = M.centerY * aspect * W;
      let ring = 0;
      for (let r = Math.max(px, M.innerR * W); r <= M.outerR * W; r += pitch, ring++) {
        const circ = TAU * r;
        const reps = Math.max(1, Math.round(circ / tw));
        const extra = (circ - reps * tw) / (reps * chars.length); // ajuste pour boucler exactement
        let ang = (ring * 0.37 + time * M.speed) * TAU;
        for (let q = 0; q < reps; q++) {
          for (let k = 0; k < chars.length; k++) {
            const w = cw(chars[k]);
            const mid = ang + w / 2 / r;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.translate(cx + r * Math.cos(mid), cy + r * Math.sin(mid));
            ctx.rotate(mid + Math.PI / 2);
            ctx.fillText(chars[k], -w / 2, 0);
            ang += (w + extra) / r;
          }
        }
      }
    } else {
      const D = Math.hypot(1, aspect) * W;
      const rows = Math.ceil(D / pitch) + 1;
      const wavy = M.waveAmp > 0;
      const reps = Math.ceil(D / tw) + 2;
      const long = base.repeat(reps);
      ctx.translate(W / 2, H / 2);
      ctx.rotate(M.angle * DEG);
      for (let j = 0; j < rows; j++) {
        const y = -D / 2 + j * pitch;
        const x0 = -D / 2 - ((j * 0.37) % 1) * tw;
        if (!wavy) {
          ctx.fillText(long, x0, y);
        } else {
          const wv = function (x) {
            return M.waveAmp * W * Math.sin(TAU * (M.waveFreq * (x / W) + j * 0.05 + time * M.speed));
          };
          let x = x0;
          let k = 0;
          while (x < D / 2) {
            const ch = chars[k % chars.length];
            const w = cw(ch);
            const yy = y + wv(x + w / 2);
            const slope = Math.atan2(wv(x + w) - wv(x), w);
            ctx.save();
            ctx.translate(x, yy);
            ctx.rotate(slope);
            ctx.fillText(ch, 0, 0);
            ctx.restore();
            x += w;
            k++;
          }
        }
      }
    }
    ctx.restore();
  }

  MX.guilloche = { drawLayer: drawLayer, drawMicro: drawMicro, inkStyle: inkStyle };
})();
