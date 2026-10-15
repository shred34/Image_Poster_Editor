/* ==========================================================================
   app.js — point d'entrée : relie paramètres, panneau, aperçu et export
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;
  const U = MX.util;

  function $(id) {
    return document.getElementById(id);
  }

  const START_PRESET = 'Ondes concentriques';

  /* ------------------------------ état -------------------------------- */
  const P = MX.createDefaults();
  MX.applyPreset(P, START_PRESET);

  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const stage = $('stage');

  let time = 0;       // temps d'animation (s)
  let lastTs = 0;
  let dirty = true;
  let raf = 0;
  let lastRender = { count: 0, drawn: 0, ms: 0 };
  let busy = false;   // export en cours

  const aspect = function () {
    return MX.posterAspect(P);
  };

  /* ---------------------------- informations -------------------------- */
  function fr(n, d) {
    return n.toFixed(d).replace('.', ',');
  }

  function updateInfo() {
    const a = aspect();
    const sz = MX.exporter.exportSize(a, P.export.longEdge);
    const portrait = a >= 1;
    $('info-format').textContent = '1 : ' + fr(portrait ? a : 1 / a, 3) + (portrait ? '  portrait' : '  paysage');
    $('info-export').textContent = sz.w + ' × ' + sz.h + ' px';
    $('info-tiles').textContent = lastRender.drawn + ' visibles / ' + lastRender.count;
    $('info-render').textContent = lastRender.ms.toFixed(0) + ' ms';
    const png = P.export.format === 'png';
    if (Date.now() < statusUntil) {
      // un message d'état récent reste affiché quelques secondes
      $('btn-export').textContent = 'Exporter en ' + (png ? 'PNG' : 'JPG');
      return;
    }
    $('btn-export').textContent = 'Exporter en ' + (png ? 'PNG' : 'JPG');
    $('export-info').textContent =
      sz.w + ' × ' + sz.h + ' px  ·  ' + P.export.dpi + ' dpi  ·  ' +
      (png ? (P.poster.transparent ? 'fond transparent' : 'PNG') : 'qualité ' + Math.round(P.export.quality * 100) + ' %');
  }

  let statusUntil = 0;
  function setStatus(msg) {
    $('export-info').textContent = msg;
    statusUntil = Date.now() + 5000;
    setTimeout(function () {
      if (Date.now() >= statusUntil) updateInfo();
    }, 5100);
  }

  /* ----------------------------- aperçu ------------------------------- */
  function fitCanvas() {
    const pad = stage.clientWidth < 700 ? 12 : 40; // petit écran : l'affiche prend toute la place
    const aw = Math.max(80, stage.clientWidth - pad * 2);
    const ah = Math.max(80, stage.clientHeight - pad * 2);
    const a = aspect();
    let w = aw;
    let h = w * a;
    if (h > ah) {
      h = ah;
      w = h / a;
    }
    w = Math.max(40, Math.floor(w));
    h = Math.max(40, Math.floor(h));

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let bw = Math.round(w * dpr);
    let bh = Math.round(h * dpr);
    const k = Math.min(1, 3000 / Math.max(bw, bh));
    bw = Math.round(bw * k);
    bh = Math.round(bh * k);

    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
  }

  function render() {
    fitCanvas();
    canvas.classList.toggle('is-transparent', !!P.poster.transparent);
    const t0 = performance.now();
    const sources = MX.images.sources(P.image, MX.images.PREVIEW_MAX, false);
    const r = MX.renderer.draw(ctx, canvas.width, canvas.height, P, sources, { time: time, preview: true });
    lastRender = { count: r.count, drawn: r.drawn, ms: performance.now() - t0 };
    if (!busy) updateInfo();
  }

  function frame(ts) {
    raf = 0;
    if (P.anim.play && !busy) {
      time += lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0;
      lastTs = ts;
    } else {
      lastTs = 0;
    }
    if (P.anim.play || dirty) {
      dirty = false;
      render();
    }
    if (P.anim.play) raf = requestAnimationFrame(frame);
    updateAnimInfo();
  }

  function updateAnimInfo() {
    const A = P.anim;
    const n = MX.anim.frameCount(P);
    const t = MX.anim.wrap(P, time);
    if (!MX.anim.isMoving(P, MX.images.items.length)) {
      $('anim-info').textContent = 'Rien ne bouge : activer une vague (Modulation) ou un mouvement (Animation).';
      return;
    }
    $('anim-info').textContent =
      (A.play ? 'Lecture  ' : 'Pause  ') + t.toFixed(2).replace('.', ',') + ' / ' + fr(A.duration, 1) + ' s  ·  ' +
      n + ' img  ·  ' + A.fps + ' ips' + (A.loop ? '  ·  boucle' : '');
  }

  function request() {
    dirty = true;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /* ------------------------------ actions ----------------------------- */
  let guiApi = null;
  let textUI = null;
  let hist = null;
  let favs = null;

  /** État « look » : tout sauf l'export et la lecture de l'animation. */
  function snapshot() {
    const c = U.clone(P);
    delete c.export;
    delete c.anim.play;
    return c;
  }

  function applySnapshot(snap) {
    U.assignDeep(P, U.clone(snap));
  }

  /** Action discrète : on garde l'état d'avant (réglages à la main compris), puis le nouvel état. */
  function discrete(fn) {
    hist.record();
    fn();
    guiApi.refresh();
    request();
    hist.record();
  }

  function newSeed() {
    discrete(function () {
      P.layout.seed = Math.floor(Math.random() * 10000);
    });
  }

  function randomize() {
    discrete(function () {
      MX.randomize(P);
      guiApi.setPreset('');
    });
  }

  function navigate(snap) {
    if (!snap) return;
    applySnapshot(snap);
    guiApi.refresh();
    guiApi.setPreset('');
    request();
  }

  function goBack() {
    hist.record();
    navigate(hist.back());
  }

  function goForward() {
    navigate(hist.forward());
  }

  function updateHistoryUI() {
    const H = hist;
    if (!H) return;
    const h = H.position();
    $('btn-prev').disabled = !H.canBack();
    $('btn-next').disabled = !H.canForward();
    $('history-info').textContent = 'Historique : ' + h.pos + ' / ' + h.total;
  }

  function makeThumb() {
    const w = 160;
    const h = Math.max(1, Math.round(w * aspect()));
    const c = U.makeCanvas(w, h);
    const sources = MX.images.sources(P.image, MX.images.PREVIEW_MAX, false);
    MX.renderer.draw(c.getContext('2d'), c.width, c.height, P, sources, { time: time });
    return c.toDataURL('image/jpeg', 0.75);
  }

  function addFavorite() {
    favs.add();
  }

  function doExport() {
    if (busy) return;
    busy = true;
    $('btn-export').disabled = true;
    MX.exporter.exportJPG(P, aspect(), time, setStatus)
      .catch(function () {})
      .then(function () {
        busy = false;
        $('btn-export').disabled = false;
      });
  }

  let exportingFrames = false;
  function doExportFrames() {
    if (exportingFrames) {
      MX.exporter.cancelFrames();
      return;
    }
    if (busy) return;
    busy = true;
    exportingFrames = true;
    $('btn-export').disabled = true;
    $('btn-export-anim').textContent = 'Annuler l\'export';
    MX.exporter.exportFrames(P, aspect(), setStatus)
      .catch(function () {})
      .then(function () {
        busy = false;
        exportingFrames = false;
        $('btn-export').disabled = false;
        $('btn-export-anim').textContent = 'Exporter l\'animation (ZIP)';
        request();
      });
  }

  function rewind() {
    time = 0;
    request();
  }

  function saveSettings() {
    const json = JSON.stringify({ app: 'affiche', version: 2, params: P, favorites: favs.toJSON() }, null, 2);
    MX.exporter.download(new Blob([json], { type: 'application/json' }), 'affiche_reglages.json');
  }

  function loadSettings(file) {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !data.params) throw new Error('format');
        const added = data.favorites ? favs.merge(data.favorites) : 0;
        discrete(function () {
          const keep = U.clone(P.export);
          U.assignDeep(P, MX.createDefaults());
          U.assignDeep(P, data.params);
          if (!data.params.export) U.assignDeep(P, { export: keep });
          guiApi.setPreset('');
        });
        setStatus('Réglages chargés' + (added ? ' (+' + added + ' favori' + (added > 1 ? 's' : '') + ')' : '') + '.');
      } catch (e) {
        setStatus('Fichier de réglages invalide.');
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    discrete(function () {
      U.assignDeep(P, MX.createDefaults());
      guiApi.setPreset('');
    });
  }

  /* ------------------------------ panneau ----------------------------- */
  guiApi = MX.createGui(P, {
    onChange: function () {
      if (textUI) textUI.refresh();
      updateInfo();
      request();
    },
    onPreset: function (name) {
      discrete(function () {
        MX.applyPreset(P, name);
      });
    },
    onRandomize: randomize,
    onExportFrames: doExportFrames,
    onTextStyle: function () {
      textUI.refresh();
      updateInfo();
      request();
    },
    onRewind: rewind,
    onNewSeed: newSeed,
    onSave: saveSettings,
    onLoad: function () {
      $('settings-input').click();
    },
    onReset: resetAll
  });
  $('gui-host').appendChild(guiApi.gui.domElement);

  // textes de l'affiche : saisie à gauche, mise en forme dans le panneau
  textUI = MX.textPanel.init(P, request, function () {
    guiRefresh();
    request();
  });
  const guiRefresh = guiApi.refresh;
  guiApi.refresh = function () {
    guiRefresh();
    textUI.refresh();
  };
  guiApi.setPreset(START_PRESET);

  hist = MX.history.create(snapshot, updateHistoryUI);
  favs = MX.favorites.create({
    snapshot: snapshot,
    thumb: makeThumb,
    onNote: setStatus,
    onPick: function (snap) {
      discrete(function () {
        applySnapshot(snap);
        guiApi.setPreset('');
      });
    }
  });
  hist.record();

  $('btn-prev').addEventListener('click', goBack);
  $('btn-next').addEventListener('click', goForward);
  $('btn-random').addEventListener('click', randomize);
  $('btn-fav').addEventListener('click', addFavorite);

  $('settings-input').addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) loadSettings(e.target.files[0]);
    e.target.value = '';
  });

  $('btn-export').addEventListener('click', doExport);
  $('btn-export-anim').addEventListener('click', doExportFrames);

  MX.library.init(request, setStatus);

  /* ----------------------------- raccourcis --------------------------- */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (tag === 'button' && e.key === ' ') return;
    switch (e.key.toLowerCase()) {
      case 'r':
        newSeed();
        break;
      case 'h':
        randomize();
        break;
      case 'e':
        doExport();
        break;
      case 'f':
        addFavorite();
        break;
      case 'arrowleft':
        e.preventDefault();
        goBack();
        break;
      case 'arrowright':
        e.preventDefault();
        goForward();
        break;
      case '0':
        rewind();
        break;
      case 't':
        P.text.show = !P.text.show;
        guiApi.refresh();
        request();
        break;
      case ' ':
        e.preventDefault();
        P.anim.play = !P.anim.play;
        guiApi.refresh();
        request();
        break;
      default:
    }
  });

  /* ------------------------------ erreurs ----------------------------- */
  // une erreur inattendue s'affiche à l'écran au lieu de laisser l'outil figé en silence
  window.addEventListener('error', function (e) {
    setStatus('Erreur : ' + (e.message || 'inconnue'));
  });
  window.addEventListener('unhandledrejection', function (e) {
    setStatus('Erreur : ' + ((e.reason && e.reason.message) || e.reason || 'inconnue'));
  });

  /* ------------------------------ démarrage --------------------------- */
  if (window.ResizeObserver) {
    new ResizeObserver(request).observe(stage);
  } else {
    window.addEventListener('resize', request);
  }
  updateHistoryUI();
  updateInfo();
  request();

  // accès pour les tests / la console
  MX.app = { P: P, render: render, request: request, gui: guiApi, getTime: function () { return time; } };
})();
