/**
 * Prepare images for upload — resize on the client so backgrounds load fast and
 * cover scaling behaves predictably on phones and laptops.
 */
(function (global) {
  'use strict';

  var DEFAULTS = { maxEdge: 1920, quality: 0.85, maxBytes: 4 * 1024 * 1024 };

  function describeSize(bytes) {
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.round(bytes / 1024) + ' KB';
  }

  function readAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('That file could not be read. Try picking it again.')); };
      reader.readAsDataURL(file);
    });
  }

  function shrinkRaster(file, opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, opts.maxEdge / Math.max(img.width, img.height));
        var width = Math.round(img.width * scale);
        var height = Math.round(img.height * scale);
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        var dataUrl = canvas.toDataURL('image/jpeg', opts.quality);
        var base64 = String(dataUrl).replace(/^data:[^,]*,/, '');
        var bytes = Math.floor(base64.replace(/=+$/, '').length * 3 / 4);
        resolve({
          type: 'image/jpeg',
          data: base64,
          name: (file.name || 'background').replace(/\.\w+$/, '') + '.jpg',
          width: width,
          height: height,
          bytes: bytes,
          preview: canvas.toDataURL('image/jpeg', 0.55)
        });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  /**
   * Returns { ok, asset?, preview?, error? } ready for API.uploadAsset().
   * Raster images are resized; SVG/GIF are sent as-is within the size limit.
   */
  async function prepareBackgroundFile(file, opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    if (!file) return { ok: false, error: 'No file chosen.' };

    var type = String(file.type || '').toLowerCase();
    if (!/^image\//.test(type)) {
      return { ok: false, error: 'Pick an image file — PNG, JPG, WebP, GIF or SVG.' };
    }

    if (type === 'image/svg+xml' || type === 'image/gif') {
      var raw = await readAsDataUrl(file);
      var base64 = String(raw).replace(/^data:[^,]*,/, '');
      var bytes = Math.floor(base64.replace(/=+$/, '').length * 3 / 4);
      if (bytes > opts.maxBytes) {
        return { ok: false, error: 'That file is ' + describeSize(bytes) + '. Try one under 4 MB.' };
      }
      return {
        ok: true,
        asset: { type: type, data: base64, name: file.name, width: 0, height: 0, bytes: bytes },
        preview: type === 'image/svg+xml' ? null : raw,
        meta: describeSize(bytes) + ' · sent as-is'
      };
    }

    var shrunk = await shrinkRaster(file, opts);
    if (!shrunk) return { ok: false, error: 'That image could not be read. Try PNG or JPG.' };
    if (shrunk.bytes > opts.maxBytes) {
      return { ok: false, error: 'Still ' + describeSize(shrunk.bytes) + ' after resizing. Try a simpler image.' };
    }
    return {
      ok: true,
      asset: shrunk,
      preview: shrunk.preview,
      meta: shrunk.width + '×' + shrunk.height + ' · ' + describeSize(shrunk.bytes) + ' · resized for screens'
    };
  }

  global.ImageUpload = { prepareBackgroundFile: prepareBackgroundFile, describeSize: describeSize };
})(window);
