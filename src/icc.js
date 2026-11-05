/* ICC colour management for RGB matrix/TRC profiles. No DOM, no native code.
 * Profiles with LUT-only transforms are reported as unsupported instead of
 * silently applying an incorrect conversion. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PintoraICC = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const D50_TO_D65 = [
    0.9555766, -0.0230393, 0.0631636,
    -0.0282895, 1.0099416, 0.0210077,
    0.0122982, -0.0204830, 1.3299098
  ];
  const XYZ_TO_SRGB = [
    3.2404542, -1.5371385, -0.4985314,
    -0.9692660, 1.8760108, 0.0415560,
    0.0556434, -0.2040259, 1.0572252
  ];
  const SRGB_D50 = [
    0.4360747, 0.3850649, 0.1430804,
    0.2225045, 0.7168786, 0.0606169,
    0.0139322, 0.0971045, 0.7141733
  ];

  function s15(dv, o) { return dv.getInt32(o, false) / 65536; }
  function u32(dv, o) { return dv.getUint32(o, false); }
  function u16(dv, o) { return dv.getUint16(o, false); }
  function sig(dv, o) { return String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3)); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function srgbEncode(v) { v = clamp(v); return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }
  function srgbDecode(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }

  function mul(m, v) {
    return [
      m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
      m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
      m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
    ];
  }

  function readCurve(dv, at) {
    const type = sig(dv, at);
    if (type === 'curv') {
      const n = u32(dv, at + 8);
      if (!n) return (v) => v;
      if (n === 1) { const g = u16(dv, at + 12) / 256; return (v) => Math.pow(clamp(v), g); }
      const table = new Float64Array(n);
      for (let i = 0; i < n; i++) table[i] = u16(dv, at + 12 + i * 2) / 65535;
      return (v) => {
        v = clamp(v);
        const x = v * (n - 1), i = Math.floor(x), f = x - i;
        return i >= n - 1 ? table[n - 1] : table[i] + (table[i + 1] - table[i]) * f;
      };
    }
    if (type === 'para') {
      const fn = u16(dv, at + 8), p = [];
      for (let i = 0; i < 7; i++) p[i] = s15(dv, at + 12 + i * 4);
      if (fn === 0) return (v) => Math.pow(clamp(v), p[0]);
      if (fn === 1) return (v) => { v = clamp(v); return v >= -p[1] / p[0] ? Math.pow(p[0] * v + p[1], p[2]) : 0; };
      if (fn === 2) return (v) => { v = clamp(v); return Math.pow(p[0] * v + p[1], p[2]) + p[3]; };
      if (fn === 3) return (v) => { v = clamp(v); return v >= p[3] ? Math.pow(p[0] * v + p[1], p[2]) : p[4] * v; };
      if (fn === 4) return (v) => { v = clamp(v); return v >= p[3] ? Math.pow(p[0] * v + p[1], p[2]) + p[5] : p[4] * v + p[6]; };
    }
    return (v) => clamp(v);
  }

  function readXyz(dv, at) {
    if (sig(dv, at) !== 'XYZ ') return null;
    return [s15(dv, at + 8), s15(dv, at + 12), s15(dv, at + 16)];
  }

  function readText(dv, at) {
    const type = sig(dv, at);
    if (type === 'desc') {
      const n = u32(dv, at + 8);
      let s = '';
      for (let i = 0; i < Math.min(n, 4096); i++) { const c = dv.getUint8(at + 12 + i); if (c) s += String.fromCharCode(c); }
      return s;
    }
    if (type === 'mluc') {
      const n = u32(dv, at + 8), size = u32(dv, at + 12);
      for (let i = 0; i < Math.min(n, 16); i++) {
        const rec = at + 16 + i * size, len = u32(dv, rec + 4), off = u32(dv, rec + 8);
        if (!len) continue;
        let s = '';
        for (let k = 0; k + 1 < len; k += 2) s += String.fromCharCode(dv.getUint16(at + off + k, false));
        if (s) return s;
      }
    }
    return '';
  }

  function parseProfile(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.byteLength < 132) throw new Error('El perfil ICC es demasiado pequeño.');
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const size = u32(dv, 0);
    if (size < 132 || size > bytes.byteLength) throw new Error(`La cabecera ICC no es válida (${size}/${bytes.byteLength}).`);
    const colorSpace = sig(dv, 16).trim();
    const pcs = sig(dv, 20).trim();
    if (colorSpace !== 'RGB') throw new Error('Solo se admiten perfiles ICC RGB.');
    const count = u32(dv, 128);
    if (132 + count * 12 > size) throw new Error('La tabla de etiquetas ICC no es válida.');
    const tags = {};
    for (let i = 0; i < count; i++) {
      const e = 132 + i * 12, name = sig(dv, e), off = u32(dv, e + 4), len = u32(dv, e + 8);
      if (off + len <= size) tags[name] = off;
    }
    const name = (tags.desc !== undefined && readText(dv, tags.desc)) || (tags.ncl2 !== undefined && readText(dv, tags.ncl2)) || 'Perfil ICC';
    const r = tags.rXYZ !== undefined ? readXyz(dv, tags.rXYZ) : null;
    const g = tags.gXYZ !== undefined ? readXyz(dv, tags.gXYZ) : null;
    const b = tags.bXYZ !== undefined ? readXyz(dv, tags.bXYZ) : null;
    const matrix = r && g && b ? [
      r[0], g[0], b[0],
      r[1], g[1], b[1],
      r[2], g[2], b[2]
    ] : SRGB_D50.slice();
    const trcR = tags.rTRC !== undefined ? readCurve(dv, tags.rTRC) : (v) => srgbDecode(clamp(v));
    const trcG = tags.gTRC !== undefined ? readCurve(dv, tags.gTRC) : trcR;
    const trcB = tags.bTRC !== undefined ? readCurve(dv, tags.bTRC) : trcR;
    return {
      name, colorSpace, pcs, version: u32(dv, 8), size,
      matrix, trc: [trcR, trcG, trcB],
      supported: pcs === 'XYZ' || pcs === 'XYZ ',
      bytes
    };
  }

  function convertRGBA(data, width, height, profile) {
    const p = profile || null;
    if (!p) throw new Error('Falta el perfil ICC.');
    if (!p.supported) throw new Error('El perfil ICC usa una transformación LUT no compatible.');
    const out = new Uint8ClampedArray(data.length);
    const m = p.matrix, tr = p.trc;
    for (let i = 0; i < width * height * 4; i += 4) {
      const a = data[i + 3];
      if (!a) { out[i + 3] = 0; continue; }
      const lr = tr[0](data[i] / 255), lg = tr[1](data[i + 1] / 255), lb = tr[2](data[i + 2] / 255);
      const xyz = mul(m, [lr, lg, lb]);
      const xyz65 = mul(D50_TO_D65, xyz);
      const rgb = mul(XYZ_TO_SRGB, xyz65);
      out[i] = Math.round(srgbEncode(rgb[0]) * 255);
      out[i + 1] = Math.round(srgbEncode(rgb[1]) * 255);
      out[i + 2] = Math.round(srgbEncode(rgb[2]) * 255);
      out[i + 3] = a;
    }
    return out;
  }

  function convert16(data, width, height, profile) {
    const p = profile || null;
    if (!p) throw new Error('Falta el perfil ICC.');
    if (!p.supported) throw new Error('El perfil ICC usa una transformación LUT no compatible.');
    const out = new Uint16Array(data.length);
    const m = p.matrix, tr = p.trc;
    for (let i = 0; i < width * height * 4; i += 4) {
      const a = data[i + 3];
      if (!a) { out[i + 3] = 0; continue; }
      const lr = tr[0](data[i] / 65535), lg = tr[1](data[i + 1] / 65535), lb = tr[2](data[i + 2] / 65535);
      const xyz65 = mul(D50_TO_D65, mul(m, [lr, lg, lb]));
      const rgb = mul(XYZ_TO_SRGB, xyz65);
      out[i] = Math.round(srgbEncode(rgb[0]) * 65535);
      out[i + 1] = Math.round(srgbEncode(rgb[1]) * 65535);
      out[i + 2] = Math.round(srgbEncode(rgb[2]) * 65535);
      out[i + 3] = a;
    }
    return out;
  }

  return { parseProfile, convertRGBA, convert16, srgbDecode, srgbEncode };
});
