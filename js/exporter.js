/* ==========================================================================
   exporter.js — export JPG haute qualité
   Rend l'affiche à la taille demandée, encode en JPG, écrit la densité (DPI)
   dans l'en-tête JFIF puis lance le téléchargement.
   ========================================================================== */
(function () {
  'use strict';

  const MX = window.MX;
  const U = MX.util;

  /** Dimensions en pixels pour une affiche de ratio `aspect` et un grand côté `longEdge`. */
  function exportSize(aspect, longEdge) {
    if (aspect >= 1) {
      return { w: Math.max(1, Math.round(longEdge / aspect)), h: longEdge };
    }
    return { w: longEdge, h: Math.max(1, Math.round(longEdge * aspect)) };
  }

  /** Écrit la résolution (DPI) dans l'en-tête JFIF du JPG, si présent. */
  function setDpi(blob, dpi) {
    return blob.arrayBuffer().then(function (buf) {
      const b = new Uint8Array(buf);
      const isJfif =
        b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff && b[3] === 0xe0 &&
        b[6] === 0x4a && b[7] === 0x46 && b[8] === 0x49 && b[9] === 0x46;
      if (isJfif) {
        b[13] = 1; // unité : points par pouce
        b[14] = (dpi >> 8) & 255;
        b[15] = dpi & 255;
        b[16] = (dpi >> 8) & 255;
        b[17] = dpi & 255;
      }
      return new Blob([b], { type: 'image/jpeg' });
    });
  }

  /* ---- PNG : densité (chunk pHYs) ---- */
  let crcTable = null;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crcTable[n] = c >>> 0;
      }
    }
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function setPngDpi(blob, dpi) {
    return blob.arrayBuffer().then(function (buf) {
      const b = new Uint8Array(buf);
      // signature (8) + IHDR (4 + 4 + 13 + 4) = 33 octets
      const ok = b[0] === 0x89 && b[1] === 0x50 && b[12] === 0x49 && b[13] === 0x48; // 'P' ... 'IH'
      if (!ok) return blob;
      const ppm = Math.round(dpi / 0.0254);
      const chunk = new Uint8Array(21);
      const dv = new DataView(chunk.buffer);
      dv.setUint32(0, 9);
      chunk.set([0x70, 0x48, 0x59, 0x73], 4); // 'pHYs'
      dv.setUint32(8, ppm);
      dv.setUint32(12, ppm);
      chunk[16] = 1; // unité : mètre
      dv.setUint32(17, crc32(chunk.subarray(4, 17)));
      const out = new Uint8Array(b.length + chunk.length);
      out.set(b.subarray(0, 33), 0);
      out.set(chunk, 33);
      out.set(b.subarray(33), 33 + chunk.length);
      return new Blob([out], { type: 'image/png' });
    });
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 20000);
  }

  /**
   * @param {object}   P         paramètres
   * @param {number}   aspect    hauteur / largeur
   * @param {number}   time      temps d'animation courant (pour exporter l'image vue à l'écran)
   * @param {Function} onStatus  callback(message)
   */
  function exportJPG(P, aspect, time, onStatus) {
    const E = P.export;
    const size = exportSize(aspect, E.longEdge);
    const png = E.format === 'png';
    onStatus('Export ' + (png ? 'PNG' : 'JPG') + ' en cours : ' + size.w + ' × ' + size.h + ' px…');

    return new Promise(function (resolve) {
      setTimeout(resolve, 40); // laisse le navigateur afficher le message
    })
      .then(function () {
        const canvas = U.makeCanvas(size.w, size.h);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Taille trop grande pour ce navigateur.');
        const maxSrc = Math.min(MX.images.EXPORT_MAX, Math.max(1536, E.longEdge));
        const sources = MX.images.sources(P.image, maxSrc, true);
        MX.renderer.draw(ctx, size.w, size.h, P, sources, { time: time, opaque: !png });
        return new Promise(function (resolve, reject) {
          canvas.toBlob(
            function (b) {
              if (b) resolve(b);
              else reject(new Error('Taille trop grande pour ce navigateur.'));
            },
            png ? 'image/png' : 'image/jpeg',
            png ? undefined : E.quality
          );
        });
      })
      .then(function (blob) {
        return png ? setPngDpi(blob, E.dpi) : setDpi(blob, E.dpi);
      })
      .then(function (blob) {
        const base = (E.name || 'affiche').replace(/[^\w\-]+/g, '_') || 'affiche';
        const filename = base + '_' + size.w + 'x' + size.h + (png ? '.png' : '.jpg');
        download(blob, filename);
        onStatus('Exporté : ' + filename + ' (' + (blob.size / 1048576).toFixed(1) + ' Mo)');
        return { filename: filename, bytes: blob.size, w: size.w, h: size.h };
      })
      .catch(function (err) {
        onStatus('Échec de l\'export : ' + err.message);
        throw err;
      });
  }

  /* ====================================================================
     Animation : une image par frame, rangées dans un dossier ZIP
     ==================================================================== */

  /** Archive ZIP sans compression (les JPG / PNG sont déjà compressés). */
  function makeZip(entries) {
    // entries : [{ name, bytes: Uint8Array }]
    const parts = [];
    const central = [];
    let offset = 0;
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const enc = new TextEncoder();

    entries.forEach(function (e) {
      const name = enc.encode(e.name);
      const crc = crc32(e.bytes);
      const size = e.bytes.length;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true);
      h.setUint16(4, 20, true);
      h.setUint16(6, 0x0800, true); // noms en UTF-8
      h.setUint16(8, 0, true);      // stocké, sans compression
      h.setUint16(10, dosTime, true);
      h.setUint16(12, dosDate, true);
      h.setUint32(14, crc, true);
      h.setUint32(18, size, true);
      h.setUint32(22, size, true);
      h.setUint16(26, name.length, true);
      h.setUint16(28, 0, true);
      parts.push(h.buffer, name, e.bytes);

      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(4, 20, true);
      c.setUint16(6, 20, true);
      c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true);
      c.setUint16(12, dosTime, true);
      c.setUint16(14, dosDate, true);
      c.setUint32(16, crc, true);
      c.setUint32(20, size, true);
      c.setUint32(24, size, true);
      c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(c.buffer, name);
      offset += 30 + name.length + size;
    });

    let cdSize = 0;
    central.forEach(function (b) { cdSize += b.byteLength; });
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, entries.length, true);
    end.setUint16(10, entries.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
  }

  let cancelFrames = false;

  /**
   * Exporte la boucle d'animation : une image par frame dans un ZIP.
   * Les images partent du temps 0 ; en boucle parfaite, la frame suivant
   * la dernière est identique à la première (lecture en boucle sans saut).
   */
  function exportFrames(P, aspect, onStatus) {
    const A = P.anim;
    const png = A.frameFormat === 'png';
    const size = exportSize(aspect, A.frameSize);
    const N = MX.anim.frameCount(P);
    const D = Math.max(0.5, A.duration);
    const base = (P.export.name || 'affiche').replace(/[^\w\-]+/g, '_') || 'affiche';
    const digits = Math.max(4, String(N).length);
    const entries = [];
    cancelFrames = false;

    const canvas = U.makeCanvas(size.w, size.h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.reject(new Error('Taille trop grande pour ce navigateur.'));
    const maxSrc = Math.min(MX.images.EXPORT_MAX, Math.max(1024, A.frameSize));
    const sources = MX.images.sources(P.image, maxSrc, true);

    function frame(i) {
      if (cancelFrames) return Promise.reject(new Error('annulé'));
      if (i >= N) return Promise.resolve();
      onStatus('Animation : image ' + (i + 1) + ' / ' + N + '…');
      const t = A.loop ? (i * D) / N : i / A.fps;
      MX.renderer.draw(ctx, size.w, size.h, P, sources, { time: t, opaque: !png });
      return new Promise(function (resolve, reject) {
        canvas.toBlob(
          function (b) {
            if (b) resolve(b);
            else reject(new Error('Taille trop grande pour ce navigateur.'));
          },
          png ? 'image/png' : 'image/jpeg',
          png ? undefined : P.export.quality
        );
      })
        .then(function (blob) {
          return blob.arrayBuffer();
        })
        .then(function (buf) {
          const num = String(i + 1).padStart(digits, '0');
          entries.push({ name: base + '/' + base + '_' + num + (png ? '.png' : '.jpg'), bytes: new Uint8Array(buf) });
          return new Promise(function (r) { setTimeout(r, 0); }); // laisse respirer l'interface
        })
        .then(function () {
          return frame(i + 1);
        });
    }

    return frame(0)
      .then(function () {
        onStatus('Création du ZIP…');
        const info =
          'Animation ' + base + '\n' +
          N + ' images, ' + A.fps + ' images / s, ' + (N / A.fps).toFixed(2) + ' s\n' +
          size.w + ' x ' + size.h + ' px, ' + (png ? 'PNG' : 'JPG') + '\n' +
          (A.loop ? 'Boucle parfaite : lire en boucle, la derniere image enchaine sur la premiere.\n' : 'Sans boucle.\n');
        entries.push({ name: base + '/infos.txt', bytes: new TextEncoder().encode(info) });
        const zip = makeZip(entries);
        const filename = base + '_animation_' + N + 'img_' + A.fps + 'ips_' + size.w + 'x' + size.h + '.zip';
        download(zip, filename);
        onStatus('Exporté : ' + filename + ' (' + (zip.size / 1048576).toFixed(1) + ' Mo)');
        return { filename: filename, frames: N, bytes: zip.size };
      })
      .catch(function (err) {
        onStatus(err.message === 'annulé' ? 'Export de l\'animation annulé.' : 'Échec de l\'export : ' + err.message);
        throw err;
      });
  }

  MX.exporter = {
    exportJPG: exportJPG,
    exportFrames: exportFrames,
    cancelFrames: function () { cancelFrames = true; },
    exportSize: exportSize,
    download: download
  };
})();
