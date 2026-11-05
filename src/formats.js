/* Pintora format helpers: conversion between the editor model and PSD files.
 * Pure data; no DOM. Loaded as a module in Node tests and as window.PintoraFormats in the page. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('ag-psd'));
  else root.PintoraFormats = factory(root.PintoraLibs.psd);
})(typeof self !== 'undefined' ? self : this, function (psdLib) {
  'use strict';

  const TO_PSD = {
    normal: 'normal', dissolve: 'dissolve', behind: 'normal',
    lighten_only: 'lighten', luma_lighten_only: 'lighten', screen: 'screen',
    dodge: 'color dodge', addition: 'linear dodge',
    darken_only: 'darken', luma_darken_only: 'darken', multiply: 'multiply',
    burn: 'color burn', linear_burn: 'linear burn',
    overlay: 'overlay', softlight: 'soft light', hardlight: 'hard light',
    vivid_light: 'vivid light', pin_light: 'pin light', linear_light: 'linear light',
    hard_mix: 'hard mix', difference: 'difference', exclusion: 'exclusion',
    subtract: 'subtract', grain_extract: 'normal', grain_merge: 'normal', divide: 'divide',
    hsv_hue: 'hue', hsv_saturation: 'saturation', hsl_color: 'color', hsv_value: 'normal',
    lch_hue: 'hue', lch_chroma: 'saturation', lch_color: 'color', lch_lightness: 'luminosity',
    luminance: 'luminosity'
  };
  const FROM_PSD = {
    normal: 'normal', dissolve: 'dissolve', darken: 'darken_only', multiply: 'multiply',
    'color burn': 'burn', 'linear burn': 'linear_burn', 'darker color': 'luma_darken_only',
    lighten: 'lighten_only', screen: 'screen', 'color dodge': 'dodge', 'linear dodge': 'addition',
    'lighter color': 'luma_lighten_only', overlay: 'overlay', 'soft light': 'softlight',
    'hard light': 'hardlight', 'vivid light': 'vivid_light', 'linear light': 'linear_light',
    'pin light': 'pin_light', 'hard mix': 'hard_mix', difference: 'difference',
    exclusion: 'exclusion', subtract: 'subtract', divide: 'divide',
    hue: 'hsv_hue', saturation: 'hsv_saturation', color: 'hsl_color', luminosity: 'luminance'
  };
  const toPsdBlend = (mode) => TO_PSD[mode] || 'normal';
  const fromPsdBlend = (mode) => FROM_PSD[mode] || 'normal';

  /** PSD image data can be 8, 16 or 32 bits; the editor works in 8-bit sRGB. */
  function to8(data) {
    if (data instanceof Uint16Array) {
      const out = new Uint8ClampedArray(data.length);
      for (let i = 0; i < data.length; i++) out[i] = data[i] / 257;
      return out;
    }
    if (data instanceof Float32Array) {
      const out = new Uint8ClampedArray(data.length);
      for (let i = 0; i < data.length; i++) out[i] = Math.max(0, Math.min(1, data[i])) * 255;
      return out;
    }
    return new Uint8ClampedArray(data);
  }

  /** Read a PSD into plain layer rectangles (bottom-to-top) plus the composite. */
  function readPsd(buffer) {
    const psd = psdLib.readPsd(buffer, { useImageData: true, skipThumbnail: true });
    const w = psd.width, h = psd.height, layers = [];
    const walk = (list) => {
      for (const l of list || []) {
        if (l.children && l.children.length) { walk(l.children); continue; }
        if (!l.imageData || !l.imageData.data) continue;
        const lw = l.right - l.left, lh = l.bottom - l.top;
        if (lw <= 0 || lh <= 0) continue;
        layers.push({
          name: l.name || 'Capa', data: to8(l.imageData.data), w: lw, h: lh,
          left: l.left || 0, top: l.top || 0,
          opacity: l.opacity === undefined ? 1 : l.opacity,
          visible: !l.hidden, mode: fromPsdBlend(l.blendMode)
        });
      }
    };
    walk(psd.children);
    return {
      w, h, layers,
      composite: psd.imageData ? { w, h, data: to8(psd.imageData.data) } : null
    };
  }

  /** Write a document ({w,h,layers:[{name,data,opacity,visible,mode}], composite}) as PSD. */
  function writePsd(doc) {
    const children = (doc.layers || []).map((l) => ({
      name: l.name || 'Capa',
      opacity: l.opacity === undefined ? 1 : l.opacity,
      hidden: l.visible === false,
      blendMode: toPsdBlend(l.mode),
      left: 0, top: 0,
      imageData: { width: doc.w, height: doc.h, data: new Uint8ClampedArray(l.data) }
    }));
    const out = { width: doc.w, height: doc.h, children };
    if (doc.composite) out.imageData = { width: doc.w, height: doc.h, data: new Uint8ClampedArray(doc.composite) };
    return psdLib.writePsd(out, { generateThumbnail: false });
  }

  return { toPsdBlend, fromPsdBlend, readPsd, writePsd };
});
