/* ==========================================================================
   gui.js — panneau de réglages (dat.gui)
   Chaque contrôleur est lié directement à l'objet de paramètres `P`.
   Les réglages qui n'ont pas de sens dans la configuration courante sont
   masqués automatiquement (ex. amplitude quand le chemin est une ligne).
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;

  /* ------------------------- listes d'options ------------------------- */
  const OPT = {
    format: {
      'ISO A / B  (1 : 1,414)': 'iso',
      '50 × 70': '50x70',
      '70 × 100': '70x100',
      'F4 suisse  89,5 × 128': 'f4',
      'Carré  1 : 1': '1:1',
      '4 : 5': '4:5',
      '3 : 4': '3:4',
      '2 : 3': '2:3',
      '16 : 9': '16:9',
      'Personnalisé': 'custom'
    },
    orientation: { Portrait: 'portrait', Paysage: 'landscape' },
    mode: {
      'Grille': 'grid',
      'Cascade (fenêtres)': 'cascade',
      'Tunnel': 'tunnel',
      'Radial': 'radial',
      'Subdivision multi-échelle': 'subdivision',
      'Dispersion': 'scatter',
      'Spirale (phyllotaxie)': 'spiral',
      'Cadre (bord de page)': 'frame',
      'Bandes (profondeur)': 'strips',
      'Aucune tuile (guilloché seul)': 'none'
    },
    path: {
      'Ligne': 'line',
      'Sinusoïde': 'sine',
      'Cercle': 'circle',
      'Spirale': 'spiral',
      'Lissajous': 'lissajous',
      'Marche aléatoire': 'walk'
    },
    placement: { 'Uniforme': 'uniform', 'Concentré (gauss)': 'gauss' },
    blend: {
      'Normal': 'source-over',
      'Multiplier': 'multiply',
      'Assombrir': 'darken',
      'Éclaircir': 'lighten',
      'Superposition': 'overlay',
      'Écran': 'screen',
      'Différence': 'difference',
      'Exclusion': 'exclusion'
    },
    flip: { 'Aucun': 'none', 'Alterné (damier)': 'alternate', 'Aléatoire': 'random' },
    order: {
      'Génération': 'gen',
      'Inversé': 'rev',
      'Petites au-dessus': 'small',
      'Grandes au-dessus': 'large',
      'Aléatoire': 'random'
    },
    frame: { 'Aucun': 'none', 'Trait': 'outline', 'Fenêtre': 'window' },
    color: { Noir: '#000000', Blanc: '#ffffff' },
    fit: { 'Recadrée (carré)': 'cover', 'Entière': 'contain' },
    sequence: {
      'Cycle': 'cycle',
      'Par groupe (ligne / anneau)': 'group',
      'Aléatoire': 'random',
      'Aller-retour': 'pingpong',
      'Selon la taille': 'size'
    },
    shape: { 'Sinus': 'sine', 'Triangle': 'triangle', 'Dent de scie': 'saw', 'Carré': 'square', 'Bosses': 'bump' },
    direction: { 'Linéaire': 'linear', 'Radiale (ondes)': 'radial', 'Angulaire (rayons)': 'angular' },
    longEdge: {
      '2000 px': 2000,
      '3000 px': 3000,
      '4000 px': 4000,
      '6000 px': 6000,
      '8000 px': 8000,
      '10000 px': 10000,
      '12000 px': 12000
    },
    dpi: { '72': 72, '150': 150, '300': 300, '600': 600 },
    exportFormat: { 'JPG': 'jpg', 'PNG (fond transparent possible)': 'png' },
    tint: { 'Aucune': 'none', 'Encre unie (garde la transparence)': 'solid', 'Dessin au trait (blanc transparent)': 'darkness' },
    layerType: { 'Rosette': 'rosette', 'Bandes ondulées': 'bands', 'Rayons': 'rays' },
    position: { 'Sous les tuiles': 'under', 'Sur les tuiles': 'over' },
    colorMode: { 'Unie': 'solid', 'Dégradé': 'gradient', 'Irisé (arc-en-ciel)': 'rainbow' },
    microMode: { 'Lignes': 'rows', 'Anneaux': 'rings' },
    ink: {
      '—': '',
      'Noir': '#000000',
      'Bleu': '#1f4e9e',
      'Violet': '#5b3f9a',
      'Rouge suisse': '#da291c',
      'Vert': '#2e7d5b',
      'Ocre': '#b8862b',
      'Gris': '#6e6e6e',
      'Blanc': '#ffffff'
    }
  };

  /**
   * @param {object} P      paramètres (liés aux contrôleurs)
   * @param {object} hooks  { onChange, onPreset, onRandomize, onNewSeed, onSave, onLoad, onReset, onExport }
   */
  function createGui(P, hooks) {
    const gui = new dat.GUI({ autoPlace: false });
    gui.domElement.id = 'gui';

    const vis = [];        // [{ ctrl, test }]
    const modeFolders = {}; // key -> folder

    function updateVisibility() {
      vis.forEach(function (v) {
        v.ctrl.__li.style.display = v.test() ? '' : 'none';
      });
      Object.keys(modeFolders).forEach(function (k) {
        modeFolders[k].domElement.style.display = P.layout.mode === k ? '' : 'none';
      });
    }

    function changed() {
      updateVisibility();
      hooks.onChange();
    }

    /* ----- fabriques de contrôleurs ----- */
    function num(f, o, k, label, min, max, step, test) {
      const c = f.add(o, k, min, max).step(step).name(label).onChange(changed);
      if (test) vis.push({ ctrl: c, test: test });
      return c;
    }
    function sel(f, o, k, label, map, test) {
      const isNum = typeof o[k] === 'number';
      const c = f.add(o, k, map).name(label).onChange(function (v) {
        if (isNum) o[k] = Number(v);
        changed();
      });
      if (test) vis.push({ ctrl: c, test: test });
      return c;
    }
    function chk(f, o, k, label, test) {
      const c = f.add(o, k).name(label).onChange(changed);
      if (test) vis.push({ ctrl: c, test: test });
      return c;
    }
    function col(f, o, k, label) {
      return f.addColor(o, k).name(label).onChange(changed);
    }
    /** Sélecteur de couleur + liste d'encres prédéfinies. */
    function ink(f, o, k, label, test) {
      const c = f.addColor(o, k).name(label).onChange(changed);
      const holder = { v: '' };
      const pick = f.add(holder, 'v', OPT.ink).name('Encres').onChange(function (v) {
        if (v) {
          o[k] = v;
          c.updateDisplay();
          holder.v = '';
          pick.updateDisplay();
          changed();
        }
      });
      if (test) {
        vis.push({ ctrl: c, test: test });
        vis.push({ ctrl: pick, test: test });
      }
      return c;
    }
    function btn(f, label, fn) {
      const holder = {};
      holder[label] = fn;
      return f.add(holder, label);
    }

    /* ================================================================
       Presets
       ================================================================ */
    const ui = { preset: '' };
    const presetMap = { '—': '' };
    Object.keys(MX.presets).forEach(function (n) {
      presetMap[n] = n;
    });
    const presetCtrl = gui.add(ui, 'preset', presetMap).name('Preset').onChange(function (v) {
      if (v) hooks.onPreset(v);
    });
    btn(gui, 'Hasard', hooks.onRandomize);

    /* ================================================================
       Affiche
       ================================================================ */
    const fPoster = gui.addFolder('Affiche');
    sel(fPoster, P.poster, 'format', 'Format', OPT.format);
    sel(fPoster, P.poster, 'orientation', 'Orientation', OPT.orientation);
    num(fPoster, P.poster, 'customW', 'Largeur (ratio)', 1, 20, 0.1, function () { return P.poster.format === 'custom'; });
    num(fPoster, P.poster, 'customH', 'Hauteur (ratio)', 1, 20, 0.1, function () { return P.poster.format === 'custom'; });
    col(fPoster, P.poster, 'background', 'Fond');
    chk(fPoster, P.poster, 'transparent', 'Fond transparent (PNG)');
    chk(fPoster, P.poster, 'gradient', 'Fond en dégradé');
    col(fPoster, P.poster, 'background2', 'Fond (2e couleur)');
    num(fPoster, P.poster, 'gradientAngle', 'Angle des dégradés (°)', -180, 180, 1);
    num(fPoster, P.poster, 'margin', 'Marge (découpe)', 0, 0.3, 0.001);

    /* ================================================================
       Texte de l'affiche (le texte se tape dans la colonne de gauche)
       ================================================================ */
    const X = P.text;
    const fText = gui.addFolder('Texte de l\'affiche');
    const tOn = function () { return X.show; };
    const bOn = function () { return X.show && X.style !== 'none'; };
    chk(fText, X, 'show', 'Afficher le texte');

    function pickList(label, map, apply) {
      const holder = { v: '' };
      const m = { '—': '' };
      Object.keys(map).forEach(function (n) { m[n] = n; });
      const c = fText.add(holder, 'v', m).name(label).onChange(function (v) {
        if (!v) return;
        apply(v);
        X.show = true;
        holder.v = '';
        c.updateDisplay();
        refresh();
        hooks.onTextStyle();
      });
      vis.push({ ctrl: c, test: tOn });
      return c;
    }
    pickList('Disposition', MX.posterText.LAYOUTS, function (v) { MX.posterText.LAYOUTS[v](X); });
    pickList('Style tout prêt', MX.posterText.STYLES, function (v) { Object.assign(X, MX.util.clone(MX.posterText.STYLES[v])); });

    sel(fText, X, 'vAlign', 'Position verticale', {
      'En haut': 'top', 'Au milieu': 'middle', 'En bas': 'bottom', 'Répartie sur la hauteur': 'spread'
    }, tOn);
    num(fText, X, 'angle', 'Rotation (°)', -90, 90, 0.5, tOn);
    num(fText, X, 'offsetX', 'Déplacer x', -0.5, 0.5, 0.001, tOn);
    num(fText, X, 'offsetY', 'Déplacer y', -0.8, 0.8, 0.001, tOn);
    num(fText, X, 'margin', 'Marge de l\'affiche', 0, 0.25, 0.001, tOn);

    sel(fText, X, 'style', 'Fond', {
      'Bloc derrière chaque ligne': 'blocks',
      'Un seul bloc': 'panel',
      'Contour': 'outline',
      'Aucun': 'none'
    }, tOn);
    sel(fText, X, 'blockFit', 'Hauteur des blocs', {
      'Pile la taille des lettres': 'tight',
      'Hauteur de ligne constante': 'line'
    }, bOn);
    num(fText, X, 'padX', 'Marge des blocs ↔', -0.1, 1, 0.005, bOn);
    num(fText, X, 'padY', 'Marge des blocs ↕', -0.1, 0.8, 0.005, bOn);
    num(fText, X, 'lineGap', 'Espace entre lignes', -0.4, 1.5, 0.005, tOn);
    col(fText, X, 'textColor', 'Couleur du texte');
    col(fText, X, 'blockColor', 'Couleur des blocs');
    num(fText, X, 'blockOpacity', 'Opacité des blocs', 0, 1, 0.01, bOn);

    sel(fText, X, 'font', 'Police', {
      'Helvetica': 'helvetica',
      'Helvetica condensée': 'condensed',
      'Arial Black': 'black',
      'Impact': 'impact',
      'Menlo (mono)': 'mono',
      'Courier': 'courier',
      'Georgia': 'serif',
      'Times': 'times'
    }, tOn);
    chk(fText, X, 'bold', 'Gras', tOn);
    chk(fText, X, 'upper', 'Majuscules', tOn);
    num(fText, X, 'size', 'Taille du texte', 0.008, 0.1, 0.0005, tOn);
    num(fText, X, 'tracking', 'Espacement des lettres', -0.1, 0.5, 0.005, tOn);
    chk(fText, X, 'timeBold', 'Horaires en gras', tOn);
    chk(fText, X, 'tabTimes', 'Horaires en colonne', tOn);
    btn(fText, 'Remettre le texte d\'exemple', function () {
      X.lines = MX.posterText.defaults().lines;
      refresh();
      hooks.onTextStyle();
    });

    /* ================================================================
       Disposition
       ================================================================ */
    const fLayout = gui.addFolder('Disposition');
    // (dat.gui : onChange remplace le callback précédent, donc on rappelle changed())
    sel(fLayout, P.layout, 'mode', 'Mode', OPT.mode).onChange(function () {
      Object.keys(modeFolders).forEach(function (k) {
        if (k === P.layout.mode) modeFolders[k].open();
        else modeFolders[k].close();
      });
      changed();
    });
    num(fLayout, P.layout, 'seed', 'Seed', 0, 9999, 1);
    btn(fLayout, 'Nouveau seed', hooks.onNewSeed);

    function modeFolder(key, title) {
      const f = fLayout.addFolder(title);
      modeFolders[key] = f;
      return f;
    }

    // --- Grille
    const g = P.grid;
    const fGrid = modeFolder('grid', 'Grille');
    num(fGrid, g, 'cols', 'Colonnes', 1, 60, 1);
    chk(fGrid, g, 'autoRows', 'Cellules carrées');
    num(fGrid, g, 'rows', 'Lignes', 1, 100, 1, function () { return !g.autoRows; });
    num(fGrid, g, 'rowShift', 'Décalage des lignes', 0, 1, 0.01);
    num(fGrid, g, 'colShift', 'Décalage des colonnes', 0, 1, 0.01);
    num(fGrid, g, 'jitter', 'Désordre', 0, 1, 0.01);
    num(fGrid, g, 'skip', 'Trous aléatoires', 0, 0.95, 0.01);
    num(fGrid, g, 'overscan', 'Débordement', 0, 6, 1);

    // --- Cascade
    const c = P.cascade;
    const notLine = function () { return c.path !== 'line'; };
    const fCascade = modeFolder('cascade', 'Cascade');
    num(fCascade, c, 'count', 'Nombre de copies', 1, 300, 1);
    num(fCascade, c, 'startSize', 'Taille de départ', 0.02, 2, 0.005);
    num(fCascade, c, 'endSize', 'Taille d\'arrivée', 0.02, 2, 0.005);
    num(fCascade, c, 'curve', 'Courbe de taille', 0.2, 4, 0.05);
    sel(fCascade, c, 'path', 'Chemin', OPT.path);
    num(fCascade, c, 'x1', 'Point A  x', -0.5, 1.5, 0.005);
    num(fCascade, c, 'y1', 'Point A  y', -0.5, 1.5, 0.005);
    num(fCascade, c, 'x2', 'Point B  x', -0.5, 1.5, 0.005);
    num(fCascade, c, 'y2', 'Point B  y', -0.5, 1.5, 0.005);
    num(fCascade, c, 'amplitude', 'Amplitude / rayon', 0, 1.2, 0.005, notLine);
    num(fCascade, c, 'frequency', 'Fréquence / tours', 0, 12, 0.05, notLine);
    num(fCascade, c, 'phase', 'Phase', 0, 1, 0.005, function () { return ['sine', 'circle', 'spiral', 'lissajous'].indexOf(c.path) >= 0; });
    num(fCascade, c, 'ratio', 'Rapport X / Y', 0.25, 4, 0.05, function () { return c.path === 'lissajous'; });
    num(fCascade, c, 'rotStep', 'Rotation par copie (°)', -45, 45, 0.1);

    // --- Tunnel
    const t = P.tunnel;
    const fTunnel = modeFolder('tunnel', 'Tunnel');
    num(fTunnel, t, 'count', 'Nombre de copies', 1, 200, 1);
    num(fTunnel, t, 'outer', 'Taille extérieure', 0.05, 4, 0.01);
    num(fTunnel, t, 'inner', 'Taille intérieure', 0.005, 2, 0.005);
    num(fTunnel, t, 'curve', 'Courbe', 0.2, 4, 0.05);
    chk(fTunnel, t, 'geometric', 'Progression géométrique');
    num(fTunnel, t, 'rotStep', 'Rotation par copie (°)', -45, 45, 0.1);
    num(fTunnel, t, 'centerX', 'Centre x', 0, 1, 0.005);
    num(fTunnel, t, 'centerY', 'Centre y', 0, 1, 0.005);
    num(fTunnel, t, 'offsetX', 'Dérive x', -1, 1, 0.005);
    num(fTunnel, t, 'offsetY', 'Dérive y', -1, 1, 0.005);

    // --- Radial
    const r = P.radial;
    const fRadial = modeFolder('radial', 'Radial');
    num(fRadial, r, 'rings', 'Anneaux', 1, 30, 1);
    num(fRadial, r, 'base', 'Copies (1er anneau)', 1, 60, 1);
    num(fRadial, r, 'add', 'Copies en plus par anneau', 0, 30, 0.5);
    num(fRadial, r, 'radiusInner', 'Rayon intérieur', 0, 1.5, 0.005);
    num(fRadial, r, 'radiusOuter', 'Rayon extérieur', 0.05, 2, 0.005);
    num(fRadial, r, 'sizeInner', 'Taille intérieure', 0.01, 1, 0.005);
    num(fRadial, r, 'sizeOuter', 'Taille extérieure', 0.01, 1, 0.005);
    chk(fRadial, r, 'faceOut', 'Orienter vers l\'extérieur');
    num(fRadial, r, 'twist', 'Torsion par anneau (°)', -90, 90, 0.5);
    num(fRadial, r, 'centerX', 'Centre x', 0, 1, 0.005);
    num(fRadial, r, 'centerY', 'Centre y', 0, 1, 0.005);
    chk(fRadial, r, 'centerTile', 'Copie au centre');

    // --- Subdivision
    const s = P.subdivision;
    const fSub = modeFolder('subdivision', 'Subdivision');
    num(fSub, s, 'cols', 'Colonnes de départ', 1, 8, 1);
    num(fSub, s, 'maxDepth', 'Profondeur max', 0, 6, 1);
    num(fSub, s, 'minDepth', 'Profondeur min', 0, 4, 1);
    num(fSub, s, 'splitProb', 'Probabilité de division', 0, 1, 0.01);
    num(fSub, s, 'focusX', 'Foyer x', 0, 1, 0.005);
    num(fSub, s, 'focusY', 'Foyer y', 0, 1, 0.005);
    num(fSub, s, 'focusBias', 'Attraction du foyer', 0, 1, 0.01);

    // --- Dispersion
    const d = P.scatter;
    const fScatter = modeFolder('scatter', 'Dispersion');
    num(fScatter, d, 'count', 'Nombre de copies', 1, 3000, 1);
    num(fScatter, d, 'sizeMin', 'Taille min', 0.005, 1, 0.005);
    num(fScatter, d, 'sizeMax', 'Taille max', 0.01, 2, 0.005);
    num(fScatter, d, 'bias', 'Biais vers les petites', 0.2, 6, 0.05);
    sel(fScatter, d, 'placement', 'Répartition', OPT.placement);
    num(fScatter, d, 'margin', 'Débord', 0, 0.5, 0.01, function () { return d.placement === 'uniform'; });
    num(fScatter, d, 'spread', 'Étalement', 0.05, 1, 0.01, function () { return d.placement === 'gauss'; });

    // --- Spirale
    const p = P.spiral;
    const fSpiral = modeFolder('spiral', 'Spirale');
    num(fSpiral, p, 'count', 'Nombre de copies', 1, 3000, 1);
    num(fSpiral, p, 'spacing', 'Espacement', 0.003, 0.08, 0.001);
    num(fSpiral, p, 'angle', 'Angle (°)', 90, 180, 0.001);
    num(fSpiral, p, 'sizeStart', 'Taille centre', 0.005, 0.5, 0.005);
    num(fSpiral, p, 'sizeEnd', 'Taille bord', 0.005, 0.5, 0.005);
    num(fSpiral, p, 'sizeCurve', 'Courbe de taille', 0.2, 4, 0.05);
    num(fSpiral, p, 'centerX', 'Centre x', 0, 1, 0.005);
    num(fSpiral, p, 'centerY', 'Centre y', 0, 1, 0.005);
    chk(fSpiral, p, 'faceOut', 'Orienter vers l\'extérieur');

    // --- Cadre
    const fr = P.frame;
    const fFrame = modeFolder('frame', 'Cadre');
    num(fFrame, fr, 'inset', 'Retrait du bord', 0, 0.3, 0.001);
    num(fFrame, fr, 'count', 'Tuiles sur le grand côté', 2, 60, 1);
    num(fFrame, fr, 'rings', 'Anneaux', 1, 6, 1);
    num(fFrame, fr, 'ringStep', 'Écart entre anneaux', 0.5, 3, 0.05);
    chk(fFrame, fr, 'orient', 'Orienter vers le bord');

    // --- Bandes
    const st = P.strips;
    const fStrips = modeFolder('strips', 'Bandes');
    num(fStrips, st, 'sizeTop', 'Taille en haut', 0.01, 0.6, 0.001);
    num(fStrips, st, 'sizeBottom', 'Taille en bas', 0.01, 0.6, 0.001);
    num(fStrips, st, 'curve', 'Courbe de taille', 0.2, 4, 0.05);
    num(fStrips, st, 'spacing', 'Espacement', 0.5, 2, 0.01);
    num(fStrips, st, 'overlap', 'Chevauchement des rangées', 0, 0.8, 0.01);
    num(fStrips, st, 'shift', 'Décalage des rangées', 0, 1, 0.01);

    fLayout.open();

    /* ================================================================
       Tuiles
       ================================================================ */
    const T = P.tiles;
    const fTiles = gui.addFolder('Tuiles');
    num(fTiles, T, 'size', 'Échelle globale', 0.05, 4, 0.01);
    num(fTiles, T, 'opacity', 'Opacité', 0, 1, 0.01);
    num(fTiles, T, 'opacityJitter', 'Opacité aléatoire', 0, 1, 0.01);
    sel(fTiles, T, 'blend', 'Fusion', OPT.blend);
    num(fTiles, T, 'rotation', 'Rotation (°)', -180, 180, 0.5);
    num(fTiles, T, 'rotationRandom', 'Rotation aléatoire (°)', 0, 180, 0.5);
    chk(fTiles, T, 'snap90', 'Quarts de tour aléatoires');
    sel(fTiles, T, 'flip', 'Miroir', OPT.flip);
    num(fTiles, T, 'stretchX', 'Étirement x', 0.1, 3, 0.01);
    num(fTiles, T, 'stretchY', 'Étirement y', 0.1, 3, 0.01);
    sel(fTiles, P, 'order', 'Ordre de superposition', OPT.order);
    sel(fTiles, T, 'frame', 'Cadre', OPT.frame);
    num(fTiles, T, 'borderWidth', 'Épaisseur du trait', 0, 20, 0.1, function () { return T.frame === 'outline'; });
    num(fTiles, T, 'barHeight', 'Hauteur de la barre', 0.03, 0.25, 0.005, function () { return T.frame === 'window'; });
    num(fTiles, T, 'shadow', 'Ombre portée', 0, 0.15, 0.0025);
    num(fTiles, T, 'shadowAlpha', 'Opacité de l\'ombre', 0, 1, 0.01, function () { return T.shadow > 0; });
    sel(fTiles, T, 'borderColor', 'Couleur cadre / ombre', OPT.color, function () { return T.frame !== 'none' || T.shadow > 0; });

    /* ================================================================
       Image
       ================================================================ */
    const I = P.image;
    const fImage = gui.addFolder('Image');
    sel(fImage, I, 'fit', 'Cadrage', OPT.fit);
    num(fImage, I, 'gray', 'Niveaux de gris', 0, 1, 0.01);
    num(fImage, I, 'brightness', 'Luminosité', -1, 1, 0.01);
    num(fImage, I, 'contrast', 'Contraste', -1, 1, 0.01);
    chk(fImage, I, 'invert', 'Inverser');
    num(fImage, I, 'threshold', 'Seuil noir / blanc', 0, 1, 0.01);
    num(fImage, I, 'posterize', 'Niveaux (0 = off)', 0, 16, 1);
    sel(fImage, I, 'sequence', 'Répartition des images', OPT.sequence);
    num(fImage, I, 'offset', 'Décalage', 0, 20, 1);
    sel(fImage, I, 'tintMode', 'Teinte', OPT.tint);
    ink(fImage, I, 'tintColor', 'Encre', function () { return I.tintMode !== 'none'; });

    /* ================================================================
       Guilloché (calques vectoriels) et microtexte
       ================================================================ */
    const fGui = gui.addFolder('Guilloché');
    P.layers.forEach(function (L, idx) {
      const f = fGui.addFolder('Calque ' + (idx === 0 ? 'A' : 'B'));
      const on = function () { return L.enabled; };
      const isT = function (t) { return function () { return L.enabled && L.type === t; }; };
      const isAny = function (a) { return function () { return L.enabled && a.indexOf(L.type) >= 0; }; };
      chk(f, L, 'enabled', 'Actif');
      sel(f, L, 'type', 'Motif', OPT.layerType, on);
      sel(f, L, 'position', 'Position', OPT.position, on);
      num(f, L, 'lines', 'Nombre de lignes', 1, 400, 1, on);
      num(f, L, 'width', 'Épaisseur du trait', 0.1, 6, 0.05, on);
      num(f, L, 'opacity', 'Opacité', 0, 1, 0.01, on);
      sel(f, L, 'colorMode', 'Encre', OPT.colorMode, on);
      ink(f, L, 'color', 'Couleur', function () { return L.enabled && L.colorMode !== 'rainbow'; });
      ink(f, L, 'color2', 'Couleur 2', function () { return L.enabled && L.colorMode === 'gradient'; });
      num(f, L, 'centerX', 'Centre x', -0.5, 1.5, 0.005, isAny(['rosette', 'rays']));
      num(f, L, 'centerY', 'Centre y', -0.5, 1.5, 0.005, function () { return L.enabled; });
      num(f, L, 'innerR', 'Rayon intérieur', 0, 1.5, 0.002, isAny(['rosette', 'rays']));
      num(f, L, 'outerR', 'Rayon extérieur', 0.01, 2, 0.002, isAny(['rosette', 'rays']));
      num(f, L, 'amplitude', 'Amplitude', 0, 0.3, 0.001, on);
      num(f, L, 'lobes', 'Lobes / ondulations', 1, 60, 1, isAny(['rosette', 'rays']));
      num(f, L, 'lobes2', 'Lobes 2', 1, 60, 1, isT('rosette'));
      num(f, L, 'amp2', 'Amplitude 2', 0, 0.2, 0.001, isT('rosette'));
      num(f, L, 'angle', 'Angle des lignes (°)', -180, 180, 0.5, isT('bands'));
      num(f, L, 'frequency', 'Fréquence', 0.1, 20, 0.05, isT('bands'));
      num(f, L, 'envelope', 'Enveloppe (entrelacs)', 0, 6, 0.01, isT('bands'));
      num(f, L, 'phaseStep', 'Décalage entre lignes', 0, 1, 0.005, on);
      num(f, L, 'phase', 'Phase', 0, 1, 0.005, on);
      num(f, L, 'speed', 'Vitesse (animation)', -1, 1, 0.01, on);
      if (idx === 0) f.open();
    });

    const M = P.micro;
    const fMicro = gui.addFolder('Microtexte');
    const mOn = function () { return M.enabled; };
    chk(fMicro, M, 'enabled', 'Actif');
    fMicro.add(M, 'text').name('Texte').onChange(changed);
    sel(fMicro, M, 'mode', 'Disposition', OPT.microMode, mOn);
    sel(fMicro, M, 'position', 'Position', OPT.position, mOn);
    num(fMicro, M, 'size', 'Taille (‰ largeur)', 0.5, 20, 0.1, mOn);
    num(fMicro, M, 'spacing', 'Interligne', 0.9, 6, 0.05, mOn);
    chk(fMicro, M, 'bold', 'Gras', mOn);
    num(fMicro, M, 'angle', 'Angle (°)', -180, 180, 0.5, function () { return M.enabled && M.mode === 'rows'; });
    num(fMicro, M, 'waveAmp', 'Ondulation', 0, 0.1, 0.001, function () { return M.enabled && M.mode === 'rows'; });
    num(fMicro, M, 'waveFreq', 'Fréquence d\'ondulation', 0.1, 12, 0.05, function () { return M.enabled && M.mode === 'rows' && M.waveAmp > 0; });
    num(fMicro, M, 'centerX', 'Centre x', -0.5, 1.5, 0.005, function () { return M.enabled && M.mode === 'rings'; });
    num(fMicro, M, 'centerY', 'Centre y', -0.5, 1.5, 0.005, function () { return M.enabled && M.mode === 'rings'; });
    num(fMicro, M, 'innerR', 'Rayon intérieur', 0, 1.5, 0.002, function () { return M.enabled && M.mode === 'rings'; });
    num(fMicro, M, 'outerR', 'Rayon extérieur', 0.01, 2, 0.002, function () { return M.enabled && M.mode === 'rings'; });
    num(fMicro, M, 'opacity', 'Opacité', 0, 1, 0.01, mOn);
    sel(fMicro, M, 'colorMode', 'Encre', OPT.colorMode, mOn);
    ink(fMicro, M, 'color', 'Couleur', function () { return M.enabled && M.colorMode !== 'rainbow'; });
    ink(fMicro, M, 'color2', 'Couleur 2', function () { return M.enabled && M.colorMode === 'gradient'; });
    num(fMicro, M, 'speed', 'Vitesse (animation)', -1, 1, 0.01, mOn);

    /* ================================================================
       Modulation
       ================================================================ */
    const fMod = gui.addFolder('Modulation');
    P.waves.forEach(function (w, idx) {
      const f = fMod.addFolder('Vague ' + (idx === 0 ? 'A' : 'B'));
      const on = function () { return w.enabled; };
      chk(f, w, 'enabled', 'Active');
      sel(f, w, 'shape', 'Forme', OPT.shape, on);
      sel(f, w, 'direction', 'Direction', OPT.direction, on);
      num(f, w, 'angle', 'Angle (°)', -180, 180, 0.5, function () { return w.enabled && w.direction === 'linear'; });
      num(f, w, 'frequency', 'Fréquence', 0, 30, 0.05, on);
      num(f, w, 'phase', 'Phase', 0, 1, 0.005, on);
      num(f, w, 'speed', 'Vitesse (cycles / s)', -2, 2, 0.01, on);
      num(f, w, 'scale', 'Échelle', -1.5, 1.5, 0.01, on);
      num(f, w, 'posX', 'Déplacement x', -0.2, 0.2, 0.001, on);
      num(f, w, 'posY', 'Déplacement y', -0.2, 0.2, 0.001, on);
      num(f, w, 'rot', 'Rotation (°)', -180, 180, 0.5, on);
      num(f, w, 'alpha', 'Opacité', 0, 1, 0.01, on);
      if (idx === 0) f.open();
    });
    num(fMod, P.swirl, 'amount', 'Vortex (°)', -1080, 1080, 1);
    num(fMod, P.lens, 'amount', 'Loupe', -0.9, 3, 0.01);
    fMod.open();

    /* ================================================================
       Animation
       ================================================================ */
    const A = P.anim;
    const fAnim = gui.addFolder('Animation');
    chk(fAnim, A, 'play', 'Lecture (Espace)');
    num(fAnim, A, 'duration', 'Durée de la boucle (s)', 0.5, 30, 0.5);
    chk(fAnim, A, 'loop', 'Boucle parfaite');
    btn(fAnim, 'Revenir au début', hooks.onRewind);

    const fMove = fAnim.addFolder('Tuiles');
    num(fMove, A, 'spin', 'Rotation continue (°/s)', -360, 360, 1);
    num(fMove, A, 'pulse', 'Pulsation (taille)', 0, 1, 0.01);
    num(fMove, A, 'pulseSpeed', '\u00a0\u00a0vitesse (cycles / s)', -2, 2, 0.01, function () { return A.pulse > 0; });
    num(fMove, A, 'pulseSpread', '\u00a0\u00a0propagation', -4, 4, 0.05, function () { return A.pulse > 0; });
    num(fMove, A, 'sway', 'Balancement (°)', 0, 180, 0.5);
    num(fMove, A, 'swaySpeed', '\u00a0\u00a0vitesse (cycles / s)', -2, 2, 0.01, function () { return A.sway > 0; });
    num(fMove, A, 'swaySpread', '\u00a0\u00a0propagation', -4, 4, 0.05, function () { return A.sway > 0; });
    num(fMove, A, 'orbit', 'Orbite (rayon)', 0, 0.2, 0.001);
    num(fMove, A, 'orbitSpeed', '\u00a0\u00a0vitesse (tours / s)', -2, 2, 0.01, function () { return A.orbit > 0; });
    num(fMove, A, 'orbitSpread', '\u00a0\u00a0désordre', 0, 1, 0.01, function () { return A.orbit > 0; });
    num(fMove, A, 'flicker', 'Scintillement', 0, 1, 0.01);
    num(fMove, A, 'flickerSpeed', '\u00a0\u00a0vitesse (cycles / s)', 0, 4, 0.01, function () { return A.flicker > 0; });
    num(fMove, A, 'imageRate', 'Défilement des images (/ s)', -30, 30, 0.5);
    fMove.open();

    const fCam = fAnim.addFolder('Ensemble');
    num(fCam, A, 'camRotate', 'Rotation (tours / s)', -1, 1, 0.005);
    num(fCam, A, 'camZoom', 'Respiration (zoom)', 0, 1, 0.01);
    num(fCam, A, 'swirlAmp', 'Vortex oscillant (°)', 0, 720, 1);
    num(fCam, A, 'lensAmp', 'Loupe oscillante', 0, 2, 0.01);
    num(fCam, A, 'camSpeed', 'Vitesse respiration (cycles / s)', -2, 2, 0.01, function () { return A.camZoom > 0; });
    num(fCam, A, 'modSpeed', 'Vitesse vortex / loupe (cycles / s)', -2, 2, 0.01, function () { return A.swirlAmp > 0 || A.lensAmp > 0; });

    const fFrames = fAnim.addFolder('Export de l\'animation');
    sel(fFrames, A, 'fps', 'Images / s', { '12': 12, '24': 24, '25': 25, '30': 30, '50': 50, '60': 60 });
    sel(fFrames, A, 'frameSize', 'Grand côté', { '1080 px': 1080, '1350 px': 1350, '1920 px': 1920, '2560 px': 2560, '3840 px': 3840 });
    sel(fFrames, A, 'frameFormat', 'Format des images', { 'JPG': 'jpg', 'PNG (fond transparent possible)': 'png' });
    btn(fFrames, 'Exporter les images (ZIP)', hooks.onExportFrames);
    fFrames.open();

    /* ================================================================
       Export
       ================================================================ */
    const E = P.export;
    const fExport = gui.addFolder('Export');
    sel(fExport, E, 'format', 'Format', OPT.exportFormat);
    sel(fExport, E, 'longEdge', 'Grand côté', OPT.longEdge);
    num(fExport, E, 'quality', 'Qualité JPG', 0.5, 1, 0.01, function () { return E.format === 'jpg'; });
    sel(fExport, E, 'dpi', 'Résolution (dpi)', OPT.dpi);
    fExport.add(E, 'name').name('Nom du fichier').onChange(hooks.onChange);

    /* ================================================================
       Réglages
       ================================================================ */
    const fSettings = gui.addFolder('Réglages');
    btn(fSettings, 'Enregistrer (JSON)', hooks.onSave);
    btn(fSettings, 'Charger (JSON)', hooks.onLoad);
    btn(fSettings, 'Tout réinitialiser', hooks.onReset);

    updateVisibility();
    if (modeFolders[P.layout.mode]) modeFolders[P.layout.mode].open();

    function refreshAll(folder) {
      folder.__controllers.forEach(function (ctl) {
        ctl.updateDisplay();
      });
      Object.keys(folder.__folders).forEach(function (k) {
        refreshAll(folder.__folders[k]);
      });
    }

    /** À appeler après une modification de P depuis le code (preset, chargement, hasard). */
    function refresh() {
      refreshAll(gui);
      updateVisibility();
      Object.keys(modeFolders).forEach(function (k) {
        if (k === P.layout.mode) modeFolders[k].open();
        else modeFolders[k].close();
      });
    }

    return {
      gui: gui,
      refresh: refresh,
      /** Affiche le nom du preset courant ('' pour aucun). */
      setPreset: function (name) {
        ui.preset = name || '';
        presetCtrl.updateDisplay();
      }
    };
  }

  MX.createGui = createGui;
})();
