/* Pintora format helpers: conversion between the editor model and PSD files.
 * Pure data; no DOM. Loaded as a module in Node tests and as window.PintoraFormats in the page. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('ag-psd'), require('utif'), require('omggif').GifReader, require('gifenc'), null);
  else root.PintoraFormats = factory(root.PintoraLibs.psd, root.PintoraLibs.UTIF, root.PintoraLibs.gif.GifReader, root.PintoraLibs.gif, root.PintoraLibs.xcf);
})(typeof self !== 'undefined' ? self : this, function (psdLib, UTIF, GifReader, gifencLib, xcfLib) {
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
    const children = (doc.layers || []).map((l) => {
      const w = l.w || doc.w, h = l.h || doc.h, data = new Uint8ClampedArray(w * h * 4);
      data.set(new Uint8ClampedArray(l.data).subarray(0, data.length));
      return {
        name: l.name || 'Capa',
        opacity: l.opacity === undefined ? 1 : l.opacity,
        hidden: l.visible === false,
        blendMode: toPsdBlend(l.mode),
        left: l.x || 0, top: l.y || 0,
        imageData: { width: w, height: h, data }
      };
    });
    const out = { width: doc.w, height: doc.h, children };
    if (doc.composite) out.imageData = { width: doc.w, height: doc.h, data: new Uint8ClampedArray(doc.composite) };
    return psdLib.writePsd(out, { generateThumbnail: false });
  }

  /** First page of a TIFF as RGBA. */
  function readTiff(buffer) {
    const ifds = UTIF.decode(buffer);
    if (!ifds.length) throw new Error('El TIFF no tiene páginas.');
    UTIF.decodeImage(buffer, ifds[0]);
    return { w: ifds[0].width, h: ifds[0].height, data: new Uint8ClampedArray(UTIF.toRGBA8(ifds[0])), depth: ifds[0].t258 ? ifds[0].t258[0] : 8 };
  }
  function writeTiff(data, w, h) {
    return UTIF.encodeImage(new Uint8Array(data), w, h);
  }

  /** Little-endian RGBA TIFF with 16 bits per channel, for lossless export. */
  function writeTiff16(data, w, h, profile) {
    const entries = profile && profile.length ? 12 : 11, ifdSize = 2 + entries * 12 + 4, pixelAt = 8 + ifdSize;
    const bitsAt = pixelAt + w * h * 8, profileAt = bitsAt + 8, total = profileAt + (profile && profile.length ? profile.length : 0);
    const buf = new ArrayBuffer(total), dv = new DataView(buf);
    dv.setUint8(0, 0x49); dv.setUint8(1, 0x49); dv.setUint16(2, 42, true); dv.setUint32(4, 8, true);
    const tags = [
      [256, 4, 1, w], [257, 4, 1, h], [258, 3, 4, bitsAt], [259, 3, 1, 1],
      [262, 3, 1, 2], [273, 4, 1, pixelAt], [277, 3, 1, 4], [278, 4, 1, h],
      [279, 4, 1, w * h * 8], [284, 3, 1, 1], [338, 3, 1, 2]
    ];
    if (profile && profile.length) tags.push([34675, 7, profile.length, profileAt]);
    dv.setUint16(8, entries, true);
    let at = 10;
    for (const [tag, type, count, value] of tags) {
      dv.setUint16(at, tag, true); dv.setUint16(at + 2, type, true); dv.setUint32(at + 4, count, true);
      if (type === 7 && count <= 4) {
      if (profile) new Uint8Array(buf, at + 8, count).set(profile.subarray(0, count));
    } else if (type === 3 && count === 1) dv.setUint16(at + 8, value, true);
    else dv.setUint32(at + 8, value, true);
      at += 12;
    }
    dv.setUint32(at, 0, true);
    for (let i = 0; i < 4; i++) dv.setUint16(bitsAt + i * 2, 16, true);
    const deep = data instanceof Uint16Array;
    for (let i = 0; i < w * h * 4; i++) dv.setUint16(pixelAt + i * 2, deep ? data[i] : data[i] * 257, true);
    if (profile && profile.length > 4) new Uint8Array(buf, profileAt).set(profile);
    return buf;
  }

  /** Read an uncompressed little/big-endian RGBA TIFF at 16 bits without losing precision. */
  function readTiff16(buffer) {
    const bytes = new Uint8Array(buffer); if (bytes.length < 16) return null;
    const le = bytes[0] === 0x49 && bytes[1] === 0x49;
    if (!le && !(bytes[0] === 0x4d && bytes[1] === 0x4d)) return null;
    const dv = new DataView(buffer), u16 = (o) => dv.getUint16(o, le), u32 = (o) => dv.getUint32(o, le);
    if (u16(2) !== 42) return null;
    const ifd = u32(4), count = u16(ifd), tags = {};
    for (let i = 0; i < count; i++) {
      const e = ifd + 2 + i * 12, tag = u16(e), type = u16(e + 2), n = u32(e + 4);
      const size = type === 3 ? 2 * n : type === 4 ? 4 * n : n;
      const at = size <= 4 ? e + 8 : u32(e + 8);
      if (type === 3) { tags[tag] = []; for (let k = 0; k < n; k++) tags[tag].push(u16(at + k * 2)); }
      else if (type === 4) { tags[tag] = []; for (let k = 0; k < n; k++) tags[tag].push(u32(at + k * 4)); }
      else tags[tag] = { at, n };
    }
    const w = tags[256] && tags[256][0], h = tags[257] && tags[257][0];
    const bits = tags[258] && tags[258][0], samples = tags[277] && tags[277][0];
    if (!w || !h || bits !== 16 || samples < 4) return null;
    const pixelAt = tags[273] && tags[273][0]; if (!pixelAt) return null;
    const data16 = new Uint16Array(w * h * 4), data = new Uint8ClampedArray(w * h * 4);
    for (let p = 0; p < w * h; p++) for (let c = 0; c < 4; c++) {
      const v = u16(pixelAt + (p * samples + c) * 2); data16[p * 4 + c] = v; data[p * 4 + c] = Math.round(v / 257);
    }
    let profile = null;
    if (tags[34675]) { const t = tags[34675]; profile = bytes.slice(t.at, t.at + t.n); }
    return { w, h, data16, data, depth: 16, profile };
  }

  /** First frame of a GIF as RGBA; `frames` reports how many the file has. */
  function readGif(buffer) {
    const reader = new GifReader(new Uint8Array(buffer));
    const w = reader.width, h = reader.height, data = new Uint8ClampedArray(w * h * 4), frames = reader.numFrames();
    if (frames) reader.decodeAndBlitFrameRGBA(0, data);
    return { w, h, data, frames };
  }
  /** Animated GIF with one RGBA frame per layer. */
  function writeGif(frames, w, h, delayMs) {
    const gif = gifencLib.GIFEncoder(), delay = Math.max(20, Math.round(delayMs || 100));
    for (const frame of frames) {
      const palette = gifencLib.quantize(frame, 256, { format: 'rgba4444', oneBitAlpha: true });
      const index = gifencLib.applyPalette(frame, palette, 'rgba4444');
      const opts = { palette, delay, dispose: 2 };
      const transparentIndex = palette.findIndex((c) => c.length > 3 && c[3] === 0);
      if (transparentIndex >= 0) { opts.transparent = true; opts.transparentIndex = transparentIndex; }
      gif.writeFrame(index, w, h, opts);
    }
    gif.finish();
    return gif.bytes();
  }

  /* XCF ------------------------------------------------------------------
   * Pintora writes XCF v001 (32-bit offsets, 8-bit RGBA, RLE tiles). The
   * reader uses the maintained xcfreader package and converts any supported
   * precision to the editor's 8-bit working space. */
  const TO_XCF_MODE = {
    normal: 0, dissolve: 1, behind: 2, multiply: 3, screen: 4, overlay: 5, difference: 6,
    addition: 7, subtract: 8, darken_only: 9, lighten_only: 10, hsv_hue: 11,
    hsv_saturation: 12, hsl_color: 13, hsv_value: 14, divide: 15, dodge: 16, burn: 17,
    hardlight: 18, softlight: 19, grain_extract: 20, grain_merge: 21, vivid_light: 22,
    pin_light: 23, linear_light: 24, hard_mix: 25, exclusion: 26, linear_burn: 27,
    luma_darken_only: 28, luma_lighten_only: 29, lch_hue: 30, lch_chroma: 31,
    lch_color: 32, lch_lightness: 33
  };
  const FROM_XCF_MODE = Object.fromEntries(Object.entries(TO_XCF_MODE).map(([k, v]) => [v, k]));

  function xcfBytes(s) { return Array.from(new TextEncoder().encode(s)); }
  function xcfU16(a, n) { a.push((n >>> 8) & 255, n & 255); }
  function xcfU32(a, n) { a.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255); }
  function xcfI32(a, n) { xcfU32(a, n < 0 ? n + 0x100000000 : n); }
  function xcfPatchU32(a, at, n) { a[at] = (n >>> 24) & 255; a[at + 1] = (n >>> 16) & 255; a[at + 2] = (n >>> 8) & 255; a[at + 3] = n & 255; }
  function xcfU64(a, n) { xcfU32(a, Math.floor(n / 0x100000000)); xcfU32(a, n >>> 0); }
  function xcfPatchU64(a, at, n) { xcfPatchU32(a, at, Math.floor(n / 0x100000000)); xcfPatchU32(a, at + 4, n >>> 0); }
  function xcfProp(a, type, data) { xcfU32(a, type); xcfU32(a, data.length); a.push(...data); }

  function xcfRlePlane(data, n, plane, bpp) {
    const out = [];
    let i = 0;
    while (i < n) {
      const v = data[i * bpp + plane];
      let run = 1;
      while (i + run < n && run < 32767 && data[(i + run) * bpp + plane] === v) run++;
      if (run >= 2) {
        if (run <= 127) out.push(run - 1, v);
        else { out.push(127, (run >>> 8) & 255, run & 255, v); }
        i += run;
      } else {
        const lit = [];
        while (i < n && lit.length < 127) {
          const cv = data[i * bpp + plane];
          let same = 1;
          while (i + same < n && same < 3 && data[(i + same) * bpp + plane] === cv) same++;
          if (same >= 3 && lit.length) break;
          lit.push(cv); i++;
          if (same >= 3) break;
        }
        out.push(256 - lit.length, ...lit);
      }
    }
    return out;
  }

  function xcfTile8(data, layerW, layerH, x0, y0, tw, th) {
    const tile = new Uint8ClampedArray(tw * th * 4);
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const si = ((y + y0) * layerW + x + x0) * 4, di = (y * tw + x) * 4;
      tile[di] = data[si]; tile[di + 1] = data[si + 1]; tile[di + 2] = data[si + 2]; tile[di + 3] = data[si + 3];
    }
    const out = [];
    for (let ch = 0; ch < 4; ch++) out.push(...xcfRlePlane(tile, tw * th, ch, 4));
    return out;
  }

  function xcfTile16(data, layerW, layerH, x0, y0, tw, th) {
    const tile = new Uint8Array(tw * th * 8);
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const si = ((y + y0) * layerW + x + x0) * 4, di = (y * tw + x) * 8;
      for (let ch = 0; ch < 4; ch++) {
        const v = data[si + ch];
        tile[di + ch * 2] = v >>> 8;
        tile[di + ch * 2 + 1] = v & 255;
      }
    }
    const out = [];
    for (let plane = 0; plane < 8; plane++) out.push(...xcfRlePlane(tile, tw * th, plane, 8));
    return out;
  }

  /** Serialize bottom-to-top editor layers as an XCF file (RGBA, RLE). 8-bit uses v001; 16-bit uses v011 with 64-bit pointers. */
  function writeXcf(doc) {
    const depth = doc.depth === 16 ? 16 : 8;
    const bpp = depth === 16 ? 8 : 4;
    const ptr64 = depth === 16;
    const addPtr = (a) => {
      const at = a.length;
      if (ptr64) xcfU64(a, 0); else xcfU32(a, 0);
      return at;
    };
    const patchPtr = (a, at, n) => {
      if (ptr64) xcfPatchU64(a, at, n); else xcfPatchU32(a, at, n);
    };
    const layers = (doc.layers || []).slice().reverse();
    const header = [];
    header.push(...xcfBytes('gimp xcf '), ...xcfBytes(ptr64 ? 'v011' : 'v001'), 0);
    xcfU32(header, doc.w); xcfU32(header, doc.h); xcfU32(header, 0);
    if (ptr64) xcfU32(header, 250); // U16_GAMMA
    xcfU32(header, 0); xcfU32(header, 0); // image property list END
    const layerPtrSlots = [];
    for (let i = 0; i < layers.length; i++) layerPtrSlots.push(addPtr(header));
    addPtr(header); // layer list terminator
    addPtr(header); // channel list terminator

    let total = header.length;
    const chunks = [];
    for (const l of layers) {
      const w = l.w || doc.w, h = l.h || doc.h;
      const data = depth === 16
        ? (l.data16 instanceof Uint16Array ? l.data16 : (() => {
          const a = new Uint16Array(w * h * 4);
          for (let i = 0; i < a.length; i++) a[i] = (l.data && l.data[i] ? l.data[i] : 0) * 257;
          return a;
        })())
        : (l.data || new Uint8ClampedArray(w * h * 4));
      const name = Array.from(new TextEncoder().encode(l.name || 'Capa')).concat(0);
      const lb = [];
      xcfU32(lb, w); xcfU32(lb, h); xcfU32(lb, 1); xcfU32(lb, name.length); lb.push(...name);
      xcfProp(lb, 6, (() => { const a = []; xcfU32(a, Math.round((l.opacity === undefined ? 1 : l.opacity) * 255) & 255); return a; })());
      xcfProp(lb, 7, (() => { const a = []; xcfU32(a, TO_XCF_MODE[l.mode] || 0); return a; })());
      xcfProp(lb, 8, (() => { const a = []; xcfU32(a, l.visible === false ? 0 : 1); return a; })());
      xcfProp(lb, 15, (() => { const a = []; xcfI32(a, l.x || 0); xcfI32(a, l.y || 0); return a; })());
      xcfProp(lb, 10, (() => { const a = []; xcfU32(a, l.lockAlpha ? 1 : 0); return a; })());
      xcfProp(lb, 17, [1]);
      xcfU32(lb, 0); xcfU32(lb, 0); // END property
      const hptrSlot = lb.length; addPtr(lb); addPtr(lb); // hierarchy, mask
      const layerStart = total;
      const hierStart = layerStart + lb.length;
      const levelStart = hierStart + 12 + (ptr64 ? 8 : 4);
      patchPtr(lb, hptrSlot, hierStart);

      const hier = []; xcfU32(hier, w); xcfU32(hier, h); xcfU32(hier, bpp);
      const lptrSlot = addPtr(hier); patchPtr(hier, lptrSlot, levelStart);
      const level = []; xcfU32(level, w); xcfU32(level, h);
      const across = Math.ceil(w / 64), down = Math.ceil(h / 64), tileSlots = [];
      for (let i = 0; i < across * down; i++) tileSlots.push(addPtr(level));
      addPtr(level);
      const tileStart = levelStart + level.length;
      const tiles = [];
      for (let ty = 0; ty < down; ty++) for (let tx = 0; tx < across; tx++) {
        const tw = Math.min(64, w - tx * 64), th = Math.min(64, h - ty * 64);
        patchPtr(level, tileSlots[ty * across + tx], tileStart + tiles.length);
        tiles.push(...(depth === 16 ? xcfTile16(data, w, h, tx * 64, ty * 64, tw, th) : xcfTile8(data, w, h, tx * 64, ty * 64, tw, th)));
      }
      patchPtr(header, layerPtrSlots[layers.indexOf(l)], layerStart);
      const chunk = lb.concat(hier, level, tiles);
      chunks.push(chunk); total += chunk.length;
    }
    const out = new Uint8Array(total);
    out.set(header, 0);
    let at = header.length;
    for (const c of chunks) { out.set(c, at); at += c.length; }
    return out;
  }

  function xcfLayerImage(w, h) {
    const data = new Uint8ClampedArray(w * h * 4);
    return {
      width: w, height: h, data,
      setAt(x, y, c) { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; data[i] = c.red; data[i + 1] = c.green; data[i + 2] = c.blue; data[i + 3] = c.alpha; },
      getAt(x, y) { const i = (y * w + x) * 4; return { red: data[i], green: data[i + 1], blue: data[i + 2], alpha: data[i + 3] }; },
      fillRect(x, y, rw, rh, c) { for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) this.setAt(xx, yy, c); },
      getPixelData() { return data; }
    };
  }

  /** Read an XCF into RGBA layers. `layers` are returned bottom-to-top. */
  async function readXcf(buffer, lib) {
    const X = lib || xcfLib || await import('@theprogrammingiantpanda/xcfreader');
    const parser = X.XCFParser.parseBuffer(buffer);
    const layers = [];
    for (const source of (parser.layers || []).slice().reverse()) {
      if (source.isGroup) continue;
      const w = source.width, h = source.height;
      if (!(w > 0 && h > 0)) continue;
      const image = xcfLayerImage(w, h);
      const realOpacity = source.opacity, realMode = source.mode;
      // makeImage composites with the layer's mode/opacity. Read the raw
      // pixels with neutral settings; the real values are stored below.
      try {
        const mode = source.getProps(7); if (mode && mode.data) mode.data.mode = 0;
        const opacity = source.getProps(6); if (opacity && opacity.data) opacity.data.opacity = 255;
      } catch (e) { /* older files may omit these properties */ }
      source.makeImage(image, false);
      layers.push({
        name: source.name || 'Capa', data: image.data, w, h, left: source.x || 0, top: source.y || 0,
        opacity: realOpacity === undefined ? 1 : realOpacity / 255,
        visible: source.isVisible, mode: FROM_XCF_MODE[realMode] || 'normal'
      });
    }
    return { w: parser.width, h: parser.height, layers, depth: (parser.bytesPerChannel || 1) * 8, precision: parser.precision };
  }

  return { toPsdBlend, fromPsdBlend, readPsd, writePsd, readTiff, readTiff16, writeTiff, writeTiff16, readGif, writeGif, writeXcf, readXcf, TO_XCF_MODE, FROM_XCF_MODE };
});
