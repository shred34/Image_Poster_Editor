/* ==========================================================================
   library.js — panneau « Images » (glisser-déposer, liste, ordre)
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;

  function $(id) {
    return document.getElementById(id);
  }

  function hasFiles(e) {
    const types = e.dataTransfer && e.dataTransfer.types;
    if (!types) return false;
    for (let i = 0; i < types.length; i++) {
      if (types[i] === 'Files') return true;
    }
    return false;
  }

  /**
   * @param {Function} onChange  appelé quand la liste d'images change
   * @param {Function} onStatus  appelé avec un message d'état
   */
  function init(onChange, onStatus) {
    const list = $('image-list');
    const note = $('image-note');
    const dz = $('dropzone');
    const input = $('file-input');
    const clearBtn = $('btn-clear');

    function render() {
      const items = MX.images.items;
      list.innerHTML = '';

      items.forEach(function (it, i) {
        const li = document.createElement('li');
        li.className = 'image-item';

        const img = document.createElement('img');
        img.className = 'thumb';
        img.src = it.url;
        img.alt = '';
        li.appendChild(img);

        const txt = document.createElement('div');
        txt.className = 'image-meta';
        const name = document.createElement('span');
        name.className = 'image-name';
        name.textContent = (i + 1) + '. ' + it.name;
        name.title = it.name;
        const dim = document.createElement('span');
        dim.className = 'image-dim';
        dim.textContent = it.w + ' × ' + it.h + ' px';
        txt.appendChild(name);
        txt.appendChild(dim);
        li.appendChild(txt);

        const actions = document.createElement('div');
        actions.className = 'image-actions';
        [
          ['↑', 'Monter', function () { MX.images.move(i, -1); }, i === 0],
          ['↓', 'Descendre', function () { MX.images.move(i, 1); }, i === items.length - 1],
          ['×', 'Retirer', function () { MX.images.remove(i); }, false]
        ].forEach(function (a) {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = a[0];
          b.title = a[1];
          b.setAttribute('aria-label', a[1]);
          b.disabled = a[3];
          b.addEventListener('click', function () {
            a[2]();
            render();
            onChange();
          });
          actions.appendChild(b);
        });
        li.appendChild(actions);
        list.appendChild(li);
      });

      clearBtn.hidden = items.length === 0;
      if (items.length === 0) {
        note.textContent = 'Aucune image chargée : une image d\'exemple est affichée.';
      } else {
        note.textContent = items.length + (items.length > 1 ? ' images' : ' image') + ' — l\'ordre de la liste sert à la répartition.';
      }
    }

    function addFiles(files) {
      if (!files || !files.length) return;
      onStatus('Chargement des images…');
      MX.images.add(files).then(function (r) {
        render();
        onChange();
        if (r.failed) onStatus(r.failed + ' fichier(s) illisible(s) (formats : PNG, JPG, WebP, GIF, SVG).');
        else if (!r.added) onStatus('Aucune image dans la sélection.');
        else onStatus('Prêt');
      });
    }

    /* sélecteur : le champ fichier est dans la zone (voir index.html) */
    input.addEventListener('change', function () {
      addFiles(input.files);
      input.value = '';
    });
    clearBtn.addEventListener('click', function () {
      MX.images.clear();
      render();
      onChange();
    });

    /* coller une image depuis le presse-papiers (Cmd + V) */
    document.addEventListener('paste', function (e) {
      const files = e.clipboardData && e.clipboardData.files;
      if (files && files.length) {
        e.preventDefault();
        addFiles(files);
      }
    });

    /* glisser-déposer sur toute la fenêtre */
    let depth = 0;
    document.addEventListener('dragenter', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      document.body.classList.add('is-dragging');
    });
    document.addEventListener('dragover', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    document.addEventListener('dragleave', function (e) {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) document.body.classList.remove('is-dragging');
    });
    document.addEventListener('drop', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      document.body.classList.remove('is-dragging');
      addFiles(e.dataTransfer.files);
    });

    render();
    return { render: render, addFiles: addFiles };
  }

  MX.library = { init: init };
})();
