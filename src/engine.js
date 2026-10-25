/* Pintora engine: pixel model, blending, selections, painting, filters, document + history.
 * Pure JavaScript, no DOM. Pixel buffers are Uint8ClampedArray RGBA (non-premultiplied, sRGB).
 * Blend-mode math follows the documented behaviour of GIMP's layer modes
 * (blend space per mode, composite in linear light). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PintoraEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EPS = 1e-6;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ------------------------------------------------------------------ color */
  const S2L = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    S2L[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  const L2S_N = 65535;
  const L2S = new Uint8Array(L2S_N + 1);
  for (let i = 0; i <= L2S_N; i++) {
    const x = i / L2S_N;
    L2S[i] = Math.round((x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255);
  }
  function lin2byte(x) {
    return L2S[x <= 0 ? 0 : x >= 1 ? L2S_N : (x * L2S_N + 0.5) | 0];
  }
  function s2l(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function l2s(x) {
    x = clamp(x, 0, 1);
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  }
  function hexToRgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  }
  function rgbToHsl(r, g, b) { // 0..1 in, h 0..1 out
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    let h = 0, s = 0;
    const d = max - min;
    if (d > 1e-9) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  function hslToRgb(h, s, l) {
    if (s <= 1e-9) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
  }

  /* CIE Lab (D65) <-> linear sRGB, used by the LCh blend modes */
  const WX = 0.95047, WY = 1.0, WZ = 1.08883;
  function labF(t) { return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116; }
  function labFi(t) { const t3 = t * t * t; return t3 > 216 / 24389 ? t3 : (116 * t - 16) / (24389 / 27); }
  function linToLab(r, g, b, out) {
    const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
    const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    const Z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
    const fx = labF(X / WX), fy = labF(Y / WY), fz = labF(Z / WZ);
    out[0] = 116 * fy - 16; out[1] = 500 * (fx - fy); out[2] = 200 * (fy - fz);
  }
  function labToLin(L, a, b, out) {
    const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    const X = labFi(fx) * WX, Y = labFi(fy) * WY, Z = labFi(fz) * WZ;
    out[0] = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
    out[1] = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
    out[2] = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
  }

  /* ------------------------------------------------------------ blend modes */
  const RL = 0.2126729, GL = 0.7151522, BL = 0.072175;
  function safeDiv(a, b) {
    if (Math.abs(a) <= EPS) return 0;
    const r = a / b;
    return r > 1 / EPS ? 1 / EPS : r < -1 / EPS ? -1 / EPS : r;
  }
  // Separable blend functions: f(backdrop, layer) -> value (GIMP semantics).
  const SEP = {
    addition: (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    screen: (a, b) => 1 - (1 - a) * (1 - b),
    overlay: (a, b) => (a < 0.5 ? 2 * a * b : 1 - 2 * (1 - b) * (1 - a)),
    softlight: (a, b) => { const m = a * b, s = 1 - (1 - a) * (1 - b); return (1 - a) * m + a * s; },
    hardlight: (a, b) => (b > 0.5 ? 1 - (1 - a) * (1 - (b - 0.5) * 2) : a * (b * 2)),
    difference: (a, b) => Math.abs(a - b),
    divide: (a, b) => safeDiv(a, b),
    dodge: (a, b) => safeDiv(a, 1 - b),
    burn: (a, b) => 1 - safeDiv(1 - a, b),
    grain_extract: (a, b) => a - b + 0.5,
    grain_merge: (a, b) => a + b - 0.5,
    vivid_light: (a, b) => (b <= 0.5 ? 1 - safeDiv(1 - a, 2 * b) : safeDiv(a, 2 * (1 - b))),
    pin_light: (a, b) => (b > 0.5 ? Math.max(a, 2 * (b - 0.5)) : Math.min(a, 2 * b)),
    linear_light: (a, b) => (b <= 0.5 ? a + 2 * b - 1 : a + 2 * (b - 0.5)),
    hard_mix: (a, b) => (a + b < 1 ? 0 : 1),
    exclusion: (a, b) => 0.5 - 2 * (a - 0.5) * (b - 0.5),
    linear_burn: (a, b) => a + b - 1,
    darken_only: (a, b) => Math.min(a, b),
    lighten_only: (a, b) => Math.max(a, b)
  };

  // Non-separable: f(in[3], layer[3], comp[3]) in the blend space.
  const NONSEP = {
    hsv_hue(i, l, c) {
      const smin = Math.min(l[0], l[1], l[2]), smax = Math.max(l[0], l[1], l[2]), sd = smax - smin;
      if (sd > EPS) {
        const dmin = Math.min(i[0], i[1], i[2]), dmax = Math.max(i[0], i[1], i[2]), dd = dmax - dmin;
        const ds = dmax ? dd / dmax : 0, ratio = ds * dmax / sd, off = dmax - smax * ratio;
        c[0] = l[0] * ratio + off; c[1] = l[1] * ratio + off; c[2] = l[2] * ratio + off;
      } else { c[0] = i[0]; c[1] = i[1]; c[2] = i[2]; }
    },
    hsv_saturation(i, l, c) {
      const dmin = Math.min(i[0], i[1], i[2]), dmax = Math.max(i[0], i[1], i[2]), dd = dmax - dmin;
      if (dd > EPS) {
        const smin = Math.min(l[0], l[1], l[2]), smax = Math.max(l[0], l[1], l[2]);
        const ss = smax ? (smax - smin) / smax : 0, ratio = ss * dmax / dd, off = (1 - ratio) * dmax;
        c[0] = i[0] * ratio + off; c[1] = i[1] * ratio + off; c[2] = i[2] * ratio + off;
      } else { c[0] = c[1] = c[2] = dmax; }
    },
    hsv_value(i, l, c) {
      const dv = Math.max(i[0], i[1], i[2]), sv = Math.max(l[0], l[1], l[2]);
      if (Math.abs(dv) > EPS) { const r = sv / dv; c[0] = i[0] * r; c[1] = i[1] * r; c[2] = i[2] * r; }
      else { c[0] = c[1] = c[2] = sv; }
    },
    hsl_color(i, l, c) {
      const dmin = Math.min(i[0], i[1], i[2]), dmax = Math.max(i[0], i[1], i[2]);
      let dl = (dmin + dmax) / 2;
      const smin = Math.min(l[0], l[1], l[2]), smax = Math.max(l[0], l[1], l[2]);
      let sl = (smin + smax) / 2;
      if (Math.abs(sl) > EPS && Math.abs(1 - sl) > EPS) {
        const dhigh = dl > 0.5, shigh = sl > 0.5;
        dl = Math.min(dl, 1 - dl); sl = Math.min(sl, 1 - sl);
        const ratio = dl / sl;
        let off = 0;
        if (dhigh) off += 1 - 2 * dl;
        if (shigh) off += 2 * dl - ratio;
        c[0] = l[0] * ratio + off; c[1] = l[1] * ratio + off; c[2] = l[2] * ratio + off;
      } else { c[0] = c[1] = c[2] = dl; }
    },
    luminance(i, l, c) {
      const iy = i[0] * RL + i[1] * GL + i[2] * BL, ly = l[0] * RL + l[1] * GL + l[2] * BL;
      const r = safeDiv(ly, iy);
      c[0] = i[0] * r; c[1] = i[1] * r; c[2] = i[2] * r;
    },
    luma_darken_only(i, l, c) {
      const iy = i[0] * RL + i[1] * GL + i[2] * BL, ly = l[0] * RL + l[1] * GL + l[2] * BL;
      const s = iy <= ly ? i : l; c[0] = s[0]; c[1] = s[1]; c[2] = s[2];
    },
    luma_lighten_only(i, l, c) {
      const iy = i[0] * RL + i[1] * GL + i[2] * BL, ly = l[0] * RL + l[1] * GL + l[2] * BL;
      const s = iy >= ly ? i : l; c[0] = s[0]; c[1] = s[1]; c[2] = s[2];
    },
    lch_hue(i, l, c) {
      const c2 = Math.hypot(l[1], l[2]);
      c[0] = i[0];
      if (c2 > EPS) { const c1 = Math.hypot(i[1], i[2]); c[1] = c1 * l[1] / c2; c[2] = c1 * l[2] / c2; }
      else { c[1] = i[1]; c[2] = i[2]; }
    },
    lch_chroma(i, l, c) {
      const c1 = Math.hypot(i[1], i[2]);
      c[0] = i[0];
      if (c1 > EPS) { const c2 = Math.hypot(l[1], l[2]); c[1] = c2 * i[1] / c1; c[2] = c2 * i[2] / c1; }
      else { c[1] = i[1]; c[2] = i[2]; }
    },
    lch_color(i, l, c) { c[0] = i[0]; c[1] = l[1]; c[2] = l[2]; },
    lch_lightness(i, l, c) { c[0] = l[0]; c[1] = i[1]; c[2] = i[2]; }
  };

  // id, label, blend space ('linear' | 'perceptual' | 'lab'), group
  const MODE_LIST = [
    ['normal', 'Normal', 'linear', 'Normal'],
    ['dissolve', 'Disolver', 'linear', 'Normal'],
    ['behind', 'Detrás', 'linear', 'Normal'],
    ['lighten_only', 'Solo aclarar', 'linear', 'Aclarar'],
    ['luma_lighten_only', 'Solo aclarar (luma)', 'linear', 'Aclarar'],
    ['screen', 'Trama (Screen)', 'perceptual', 'Aclarar'],
    ['dodge', 'Sobreexponer (Dodge)', 'perceptual', 'Aclarar'],
    ['addition', 'Suma', 'linear', 'Aclarar'],
    ['darken_only', 'Solo oscurecer', 'linear', 'Oscurecer'],
    ['luma_darken_only', 'Solo oscurecer (luma)', 'linear', 'Oscurecer'],
    ['multiply', 'Multiplicar', 'linear', 'Oscurecer'],
    ['burn', 'Subexponer (Burn)', 'perceptual', 'Oscurecer'],
    ['linear_burn', 'Quemado lineal', 'perceptual', 'Oscurecer'],
    ['overlay', 'Superponer', 'perceptual', 'Contraste'],
    ['softlight', 'Luz suave', 'perceptual', 'Contraste'],
    ['hardlight', 'Luz fuerte', 'perceptual', 'Contraste'],
    ['vivid_light', 'Luz intensa', 'perceptual', 'Contraste'],
    ['pin_light', 'Luz puntual', 'perceptual', 'Contraste'],
    ['linear_light', 'Luz lineal', 'perceptual', 'Contraste'],
    ['hard_mix', 'Mezcla fuerte', 'perceptual', 'Contraste'],
    ['difference', 'Diferencia', 'perceptual', 'Inversión'],
    ['exclusion', 'Exclusión', 'perceptual', 'Inversión'],
    ['subtract', 'Sustracción', 'linear', 'Inversión'],
    ['grain_extract', 'Extraer grano', 'perceptual', 'Inversión'],
    ['grain_merge', 'Fusionar grano', 'perceptual', 'Inversión'],
    ['divide', 'División', 'linear', 'Inversión'],
    ['hsv_hue', 'Tono HSV', 'perceptual', 'Componentes'],
    ['hsv_saturation', 'Saturación HSV', 'perceptual', 'Componentes'],
    ['hsl_color', 'Color HSL', 'perceptual', 'Componentes'],
    ['hsv_value', 'Valor HSV', 'perceptual', 'Componentes'],
    ['lch_hue', 'Tono LCh', 'lab', 'Componentes'],
    ['lch_chroma', 'Croma LCh', 'lab', 'Componentes'],
    ['lch_color', 'Color LCh', 'lab', 'Componentes'],
    ['lch_lightness', 'Luminosidad LCh', 'lab', 'Componentes'],
    ['luminance', 'Luminancia', 'linear', 'Componentes']
  ];
  const MODES = {};
  for (const [id, label, space, group] of MODE_LIST) {
    MODES[id] = { id, label, space, group, sep: SEP[id] || null, nonsep: NONSEP[id] || null };
  }

  /* -------------------------------------------------------------- composite */
  function dissolveNoise(x, y) { // deterministic 0..1
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /** Composite visible layers into `out` (RGBA bytes) inside `rect` ({x0,y0,x1,y1}, x1/y1 exclusive).
   * `preview` ({id,data}) substitutes one layer's pixels (live filter preview). */
  function composite(layers, w, h, out, rect, preview) {
    const x0 = rect ? Math.max(0, rect.x0) : 0, y0 = rect ? Math.max(0, rect.y0) : 0;
    const x1 = rect ? Math.min(w, rect.x1) : w, y1 = rect ? Math.min(h, rect.y1) : h;
    const L = [];
    for (const l of layers) {
      if (!l.visible || l.opacity <= 0) continue;
      L.push({
        d: preview && preview.id === l.id ? preview.data : l.data,
        op: l.opacity,
        mask: l.mask && l.maskOn !== false ? l.mask : null,
        mode: MODES[l.mode] || MODES.normal
      });
    }
    const inV = [0, 0, 0], layV = [0, 0, 0], compV = [0, 0, 0], tmp = [0, 0, 0];
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = y * w + x, i = p * 4;
        let ar = 0, ag = 0, ab = 0, aa = 0;
        let exact = -1; // index of a lone opaque normal layer -> exact bytes
        for (let k = 0; k < L.length; k++) {
          const ly = L[k], d = ly.d;
          let la = d[i + 3] / 255 * ly.op;
          if (ly.mask) la *= ly.mask[p] / 255;
          if (la <= 0) continue;
          const mode = ly.mode;
          if (mode.id === 'dissolve') { la = dissolveNoise(x, y) < la ? 1 : 0; if (la === 0) continue; }
          const lr = S2L[d[i]], lg = S2L[d[i + 1]], lb = S2L[d[i + 2]];
          if (mode.id === 'normal' || mode.id === 'dissolve') {
            if (la >= 1) { ar = lr; ag = lg; ab = lb; aa = 1; exact = k; continue; }
            if (aa <= 0) { ar = lr; ag = lg; ab = lb; aa = la; exact = -1; continue; }
            const na = la + (1 - la) * aa, ratio = la / na;
            ar += ratio * (lr - ar); ag += ratio * (lg - ag); ab += ratio * (lb - ab); aa = na; exact = -1;
            continue;
          }
          if (mode.id === 'behind') {
            if (aa >= 1) continue;
            if (aa <= 0) { ar = lr; ag = lg; ab = lb; aa = la; exact = -1; continue; }
            const na = aa + (1 - aa) * la, ratio = aa / na;
            ar = lr + ratio * (ar - lr); ag = lg + ratio * (ag - lg); ab = lb + ratio * (ab - lb); aa = na; exact = -1;
            continue;
          }
          if (aa <= 0) continue; // clip-to-backdrop modes leave an empty backdrop alone
          // blend in the mode's own space
          let cr, cg, cb;
          if (mode.space === 'linear') {
            inV[0] = ar; inV[1] = ag; inV[2] = ab; layV[0] = lr; layV[1] = lg; layV[2] = lb;
          } else if (mode.space === 'perceptual') {
            inV[0] = l2s(ar); inV[1] = l2s(ag); inV[2] = l2s(ab);
            layV[0] = d[i] / 255; layV[1] = d[i + 1] / 255; layV[2] = d[i + 2] / 255;
          } else {
            linToLab(ar, ag, ab, inV); linToLab(lr, lg, lb, layV);
          }
          if (mode.sep) {
            const f = mode.sep;
            compV[0] = f(inV[0], layV[0]); compV[1] = f(inV[1], layV[1]); compV[2] = f(inV[2], layV[2]);
          } else mode.nonsep(inV, layV, compV);
          if (mode.space === 'perceptual') {
            cr = s2l(clamp(compV[0], 0, 1)); cg = s2l(clamp(compV[1], 0, 1)); cb = s2l(clamp(compV[2], 0, 1));
          } else if (mode.space === 'lab') {
            labToLin(compV[0], compV[1], compV[2], tmp); cr = tmp[0]; cg = tmp[1]; cb = tmp[2];
          } else { cr = compV[0]; cg = compV[1]; cb = compV[2]; }
          ar = cr * la + ar * (1 - la); ag = cg * la + ag * (1 - la); ab = cb * la + ab * (1 - la);
          exact = -1;
        }
        if (aa <= 0) { out[i] = 0; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = 0; continue; }
        if (exact >= 0) {
          const d = L[exact].d; out[i] = d[i]; out[i + 1] = d[i + 1]; out[i + 2] = d[i + 2]; out[i + 3] = 255;
        } else {
          out[i] = lin2byte(ar); out[i + 1] = lin2byte(ag); out[i + 2] = lin2byte(ab); out[i + 3] = Math.round(aa * 255);
        }
      }
    }
    return out;
  }

  /* ------------------------------------------------------------- selections */
  function maskIsEmpty(m) { if (!m) return true; for (let i = 0; i < m.length; i++) if (m[i]) return false; return true; }
  function normalizeMask(m) { return maskIsEmpty(m) ? null : m; }

  function rectMask(w, h, x0, y0, x1, y1) {
    const m = new Uint8Array(w * h);
    x0 = clamp(Math.round(x0), 0, w); x1 = clamp(Math.round(x1), 0, w);
    y0 = clamp(Math.round(y0), 0, h); y1 = clamp(Math.round(y1), 0, h);
    for (let y = y0; y < y1; y++) m.fill(255, y * w + x0, y * w + x1);
    return m;
  }
  function ellipseMask(w, h, x0, y0, x1, y1, aa) {
    const m = new Uint8Array(w * h);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2;
    if (rx < 0.5 || ry < 0.5) return m;
    const rmin = Math.min(rx, ry);
    const ya = clamp(Math.floor(cy - ry - 1), 0, h - 1), yb = clamp(Math.ceil(cy + ry + 1), 0, h - 1);
    const xa = clamp(Math.floor(cx - rx - 1), 0, w - 1), xb = clamp(Math.ceil(cx + rx + 1), 0, w - 1);
    for (let y = ya; y <= yb; y++) {
      for (let x = xa; x <= xb; x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        const sd = (Math.sqrt(nx * nx + ny * ny) - 1) * rmin;
        const c = aa === false ? (sd <= 0 ? 1 : 0) : clamp(0.5 - sd, 0, 1);
        if (c > 0) m[y * w + x] = Math.round(c * 255);
      }
    }
    return m;
  }
  /** Even-odd polygon fill with 4x vertical / exact horizontal antialiasing. pts: [[x,y],...] */
  function polygonMask(w, h, pts) {
    const m = new Uint8Array(w * h);
    if (pts.length < 3) return m;
    const SS = 4;
    let ymin = Infinity, ymax = -Infinity;
    for (const p of pts) { if (p[1] < ymin) ymin = p[1]; if (p[1] > ymax) ymax = p[1]; }
    const ra = clamp(Math.floor(ymin), 0, h - 1), rb = clamp(Math.ceil(ymax), 0, h - 1);
    const nrows = (rb - ra + 1) * SS;
    const cross = new Array(nrows);
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], b = pts[(k + 1) % pts.length];
      if (a[1] === b[1]) continue;
      const [px, py, qx, qy] = a[1] < b[1] ? [a[0], a[1], b[0], b[1]] : [b[0], b[1], a[0], a[1]];
      const s0 = Math.max(0, Math.ceil((py - ra) * SS - 0.5)), s1 = Math.min(nrows - 1, Math.ceil((qy - ra) * SS - 0.5) - 1);
      for (let s = s0; s <= s1; s++) {
        const sy = ra + (s + 0.5) / SS;
        const x = px + (sy - py) * (qx - px) / (qy - py);
        (cross[s] || (cross[s] = [])).push(x);
      }
    }
    const acc = new Float32Array(w);
    for (let row = 0; row <= rb - ra; row++) {
      acc.fill(0);
      let any = false;
      for (let s = 0; s < SS; s++) {
        const xs = cross[row * SS + s];
        if (!xs) continue;
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          let a = clamp(xs[k], 0, w), b = clamp(xs[k + 1], 0, w);
          if (b <= a) continue;
          any = true;
          const ia = Math.floor(a), ib = Math.floor(b);
          if (ia === ib) acc[ia] += (b - a) / SS;
          else {
            acc[ia] += (ia + 1 - a) / SS;
            for (let x = ia + 1; x < ib; x++) acc[x] += 1 / SS;
            if (ib < w) acc[ib] += (b - ib) / SS;
          }
        }
      }
      if (!any) continue;
      const base = (ra + row) * w;
      for (let x = 0; x < w; x++) if (acc[x] > 0) m[base + x] = Math.round(clamp(acc[x], 0, 1) * 255);
    }
    return m;
  }
  function combineMasks(old, neu, mode) {
    if (mode === 'replace' || !old) {
      if (mode === 'subtract' && !old) return null;
      if (mode === 'intersect' && !old) return null;
      return normalizeMask(neu);
    }
    const out = new Uint8Array(old.length);
    for (let i = 0; i < out.length; i++) {
      const a = old[i], b = neu[i];
      out[i] = mode === 'add' ? Math.max(a, b) : mode === 'subtract' ? Math.round(a * (255 - b) / 255) : Math.round(a * b / 255);
    }
    return normalizeMask(out);
  }
  function invertMask(m, w, h) {
    const out = new Uint8Array(w * h);
    if (!m) { out.fill(255); return out; }
    for (let i = 0; i < out.length; i++) out[i] = 255 - m[i];
    return normalizeMask(out);
  }
  function maskBounds(m, w, h) {
    if (!m) return null;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      const base = y * w;
      for (let x = 0; x < w; x++) if (m[base + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
  }
  /** Chamfer 3-4 distance (in pixels) from every pixel to the nearest pixel where pred(i) is true. */
  function distanceTransform(w, h, isSource) {
    const INF = 1e9, d = new Float32Array(w * h);
    for (let i = 0; i < d.length; i++) d[i] = isSource(i) ? 0 : INF;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) { v = Math.min(v, d[i - w] + 1); if (x > 0) v = Math.min(v, d[i - w - 1] + 1.4142); if (x < w - 1) v = Math.min(v, d[i - w + 1] + 1.4142); }
      d[i] = v;
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x; let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < h - 1) { v = Math.min(v, d[i + w] + 1); if (x < w - 1) v = Math.min(v, d[i + w + 1] + 1.4142); if (x > 0) v = Math.min(v, d[i + w - 1] + 1.4142); }
      d[i] = v;
    }
    return d;
  }
  function growMask(m, w, h, r) {
    const d = distanceTransform(w, h, (i) => m[i] >= 128), out = new Uint8Array(w * h);
    for (let i = 0; i < out.length; i++) out[i] = d[i] <= r ? 255 : d[i] < r + 1 ? Math.round(255 * (r + 1 - d[i])) : 0;
    return normalizeMask(out);
  }
  function shrinkMask(m, w, h, r) {
    const d = distanceTransform(w, h, (i) => m[i] < 128), out = new Uint8Array(w * h);
    for (let i = 0; i < out.length; i++) out[i] = Math.round(255 * clamp(d[i] - r, 0, 1));
    return normalizeMask(out);
  }
  function featherMask(m, w, h, r) {
    const planes = [Float32Array.from(m, (v) => v / 255)];
    blurPlanes(planes, w, h, r / 2);
    const out = new Uint8Array(w * h);
    for (let i = 0; i < out.length; i++) out[i] = Math.round(clamp(planes[0][i], 0, 1) * 255);
    return normalizeMask(out);
  }
  function colorDiff(d, i, r, g, b, a) {
    return Math.max(Math.abs(d[i] - r), Math.abs(d[i + 1] - g), Math.abs(d[i + 2] - b), Math.abs(d[i + 3] - a));
  }
  /** Flood / global colour select. Returns a 0/255 mask. */
  function floodMask(data, w, h, sx, sy, thr, contiguous) {
    sx = clamp(Math.floor(sx), 0, w - 1); sy = clamp(Math.floor(sy), 0, h - 1);
    const si = (sy * w + sx) * 4, r = data[si], g = data[si + 1], b = data[si + 2], a = data[si + 3];
    const out = new Uint8Array(w * h);
    const match = (p) => colorDiff(data, p * 4, r, g, b, a) <= thr;
    if (!contiguous) {
      for (let p = 0; p < out.length; p++) if (match(p)) out[p] = 255;
      return out;
    }
    const stack = new Int32Array(w * h), seen = new Uint8Array(w * h);
    let sp = 0; stack[sp++] = sy * w + sx; seen[sy * w + sx] = 1;
    while (sp > 0) {
      const p = stack[--sp], y = (p / w) | 0, x = p - y * w;
      if (!match(p)) continue;
      out[p] = 255;
      if (x > 0 && !seen[p - 1]) { seen[p - 1] = 1; stack[sp++] = p - 1; }
      if (x < w - 1 && !seen[p + 1]) { seen[p + 1] = 1; stack[sp++] = p + 1; }
      if (y > 0 && !seen[p - w]) { seen[p - w] = 1; stack[sp++] = p - w; }
      if (y < h - 1 && !seen[p + w]) { seen[p + w] = 1; stack[sp++] = p + w; }
    }
    return out;
  }
  /** Edge sides of a selection for drawing marching ants: [x,y,dir] triples (dir 0=top,1=right,2=bottom,3=left). */
  function selectionEdges(m, w, h) {
    const list = [];
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] >= 128;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (m[y * w + x] < 128) continue;
      if (!on(x, y - 1)) list.push(x, y, 0);
      if (!on(x + 1, y)) list.push(x, y, 1);
      if (!on(x, y + 1)) list.push(x, y, 2);
      if (!on(x - 1, y)) list.push(x, y, 3);
    }
    return Int32Array.from(list);
  }

  /* ---------------------------------------------------------------- painting */
  /** Add one round dab to the stroke coverage buffer. Returns the dab's bounding box (inclusive). */
  function stampDab(cov, w, h, cx, cy, size, hardness, aa, rate, incremental) {
    const r = Math.max(size / 2, 0.5);
    const x0 = clamp(Math.floor(cx - r - 1), 0, w - 1), x1 = clamp(Math.ceil(cx + r + 1), 0, w - 1);
    const y0 = clamp(Math.floor(cy - r - 1), 0, h - 1), y1 = clamp(Math.ceil(cy + r + 1), 0, h - 1);
    const hr = r * hardness, span = Math.max(r - hr, 1e-6);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.sqrt(dx * dx + dy * dy);
        let c;
        if (aa === false) c = d <= r ? 1 : 0;
        else {
          c = clamp(r - d + 0.5, 0, 1);
          if (hardness < 1 && d > hr) { const t = clamp((d - hr) / span, 0, 1); c *= 1 - t * t * (3 - 2 * t); }
        }
        if (c <= 0) continue;
        c *= rate;
        const idx = y * w + x;
        if (incremental) cov[idx] = 1 - (1 - cov[idx]) * (1 - c);
        else if (c > cov[idx]) cov[idx] = c;
      }
    }
    return { x0, y0, x1, y1 };
  }
  /** Paint `color` through `cov` into dest, starting from `orig`. */
  function applyCoverage(dest, orig, w, cov, box, sel, color, opacity, o) {
    o = o || {};
    const cr = S2L[color.r], cg = S2L[color.g], cb = S2L[color.b];
    for (let y = box.y0; y <= box.y1; y++) {
      for (let x = box.x0; x <= box.x1; x++) {
        const p = y * w + x, c = cov[p];
        if (c <= 0) continue;
        let a = c * opacity;
        if (sel) a *= sel[p] / 255;
        const i = p * 4;
        if (a <= 0) { dest[i] = orig[i]; dest[i + 1] = orig[i + 1]; dest[i + 2] = orig[i + 2]; dest[i + 3] = orig[i + 3]; continue; }
        const oa = orig[i + 3] / 255;
        if (o.erase) {
          dest[i] = orig[i]; dest[i + 1] = orig[i + 1]; dest[i + 2] = orig[i + 2];
          dest[i + 3] = Math.round(orig[i + 3] * (1 - a));
          continue;
        }
        if (o.lockAlpha) {
          if (oa <= 0) continue;
          dest[i] = lin2byte(S2L[orig[i]] + (cr - S2L[orig[i]]) * a);
          dest[i + 1] = lin2byte(S2L[orig[i + 1]] + (cg - S2L[orig[i + 1]]) * a);
          dest[i + 2] = lin2byte(S2L[orig[i + 2]] + (cb - S2L[orig[i + 2]]) * a);
          dest[i + 3] = orig[i + 3];
          continue;
        }
        if (oa <= 0) { dest[i] = color.r; dest[i + 1] = color.g; dest[i + 2] = color.b; dest[i + 3] = Math.round(a * 255); continue; }
        const na = a + (1 - a) * oa, ratio = a / na;
        dest[i] = lin2byte(S2L[orig[i]] + ratio * (cr - S2L[orig[i]]));
        dest[i + 1] = lin2byte(S2L[orig[i + 1]] + ratio * (cg - S2L[orig[i + 1]]));
        dest[i + 2] = lin2byte(S2L[orig[i + 2]] + ratio * (cb - S2L[orig[i + 2]]));
        dest[i + 3] = Math.round(na * 255);
      }
    }
  }
  /** Same, but painting a grey value into a layer mask. */
  function applyCoverageMask(dest, orig, w, cov, box, sel, value, opacity) {
    for (let y = box.y0; y <= box.y1; y++) for (let x = box.x0; x <= box.x1; x++) {
      const p = y * w + x, c = cov[p];
      if (c <= 0) continue;
      let a = c * opacity; if (sel) a *= sel[p] / 255;
      dest[p] = Math.round(orig[p] + (value - orig[p]) * a);
    }
  }
  /** Clone: sample colour from `src` at an offset instead of using a flat colour. */
  function applyClone(dest, orig, src, w, h, cov, box, sel, dx, dy, opacity, lockAlpha) {
    for (let y = box.y0; y <= box.y1; y++) for (let x = box.x0; x <= box.x1; x++) {
      const p = y * w + x, c = cov[p];
      if (c <= 0) continue;
      const sx = x + dx, sy = y + dy;
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const si = (sy * w + sx) * 4, i = p * 4;
      let a = c * opacity * src[si + 3] / 255; if (sel) a *= sel[p] / 255;
      if (a <= 0) continue;
      const oa = orig[i + 3] / 255;
      if (oa <= 0 && !lockAlpha) { dest[i] = src[si]; dest[i + 1] = src[si + 1]; dest[i + 2] = src[si + 2]; dest[i + 3] = Math.round(a * 255); continue; }
      const na = lockAlpha ? oa : a + (1 - a) * oa, ratio = lockAlpha ? a : a / na;
      for (let k = 0; k < 3; k++) dest[i + k] = lin2byte(S2L[orig[i + k]] + ratio * (S2L[src[si + k]] - S2L[orig[i + k]]));
      dest[i + 3] = Math.round(na * 255);
    }
  }
  /** Dodge / burn in place. strength 0..1, range 'shadows'|'midtones'|'highlights'. */
  function applyDodgeBurn(dest, w, box, cov, sel, burn, strength, range) {
    for (let y = box.y0; y <= box.y1; y++) for (let x = box.x0; x <= box.x1; x++) {
      const p = y * w + x, c = cov[p]; if (c <= 0) continue;
      const i = p * 4; if (dest[i + 3] === 0) continue;
      let a = c * strength; if (sel) a *= sel[p] / 255;
      const l = (dest[i] * RL + dest[i + 1] * GL + dest[i + 2] * BL) / 255;
      const wgt = range === 'shadows' ? (1 - l) * (1 - l) : range === 'highlights' ? l * l : 4 * l * (1 - l) + 0.15;
      const k = a * wgt;
      for (let ch = 0; ch < 3; ch++) {
        const v = dest[i + ch];
        dest[i + ch] = burn ? v * (1 - k) : v + (255 - v) * k;
      }
    }
  }
  /** Emits dabs along a polyline with constant spacing. */
  class Stroker {
    constructor(spacing, emit) { this.spacing = Math.max(spacing, 0.5); this.emit = emit; this.last = null; this.rem = 0; }
    begin(x, y) { this.last = [x, y]; this.rem = 0; this.emit(x, y); }
    lineTo(x, y) {
      if (!this.last) return this.begin(x, y);
      let [lx, ly] = this.last;
      const dx = x - lx, dy = y - ly, dist = Math.hypot(dx, dy);
      if (dist === 0) return;
      let pos = this.spacing - this.rem;
      while (pos <= dist) { this.emit(lx + dx * pos / dist, ly + dy * pos / dist); pos += this.spacing; }
      this.rem = dist - (pos - this.spacing);
      this.last = [x, y];
    }
  }

  /** Fill pixels with a colour through a 0..255 mask (bucket fill, fill selection). */
  function fillMask(data, w, h, mask, sel, color, opacity, lockAlpha) {
    const cov = new Float32Array(w * h);
    for (let i = 0; i < cov.length; i++) cov[i] = mask ? mask[i] / 255 : 1;
    const orig = new Uint8ClampedArray(data);
    applyCoverage(data, orig, w, cov, { x0: 0, y0: 0, x1: w - 1, y1: h - 1 }, sel, color, opacity, { lockAlpha });
  }
  /** Gradient fill. shape: linear|bilinear|radial|conical. stops: {c0:{r,g,b,a}, c1:{r,g,b,a}}. */
  function fillGradient(data, w, h, sel, x0, y0, x1, y1, shape, c0, c1, opacity) {
    const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1, len = Math.sqrt(len2);
    const ang0 = Math.atan2(dy, dx);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      let wgt = opacity; if (sel) wgt *= sel[p] / 255;
      if (wgt <= 0) continue;
      const px = x + 0.5 - x0, py = y + 0.5 - y0;
      let t;
      if (shape === 'radial') t = Math.sqrt(px * px + py * py) / len;
      else if (shape === 'bilinear') t = Math.abs((px * dx + py * dy) / len2);
      else if (shape === 'conical') { t = (Math.atan2(py, px) - ang0) / (2 * Math.PI); t -= Math.floor(t); }
      else t = (px * dx + py * dy) / len2;
      t = clamp(t, 0, 1);
      const r = c0.r + (c1.r - c0.r) * t, g = c0.g + (c1.g - c0.g) * t, b = c0.b + (c1.b - c0.b) * t;
      const ga = (c0.a + (c1.a - c0.a) * t) * wgt;
      if (ga <= 0) continue;
      const i = p * 4, oa = data[i + 3] / 255;
      if (oa <= 0) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = Math.round(ga * 255); continue; }
      const na = ga + (1 - ga) * oa, ratio = ga / na;
      data[i] = lin2byte(S2L[data[i]] + ratio * (s2l(r / 255) - S2L[data[i]]));
      data[i + 1] = lin2byte(S2L[data[i + 1]] + ratio * (s2l(g / 255) - S2L[data[i + 1]]));
      data[i + 2] = lin2byte(S2L[data[i + 2]] + ratio * (s2l(b / 255) - S2L[data[i + 2]]));
      data[i + 3] = Math.round(na * 255);
    }
  }

  /* ----------------------------------------------------------- blur / resample */
  function toPlanes(data, w, h) { // premultiplied float planes
    const n = w * h, P = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)];
    for (let p = 0; p < n; p++) {
      const a = data[p * 4 + 3] / 255;
      P[0][p] = data[p * 4] * a; P[1][p] = data[p * 4 + 1] * a; P[2][p] = data[p * 4 + 2] * a; P[3][p] = a;
    }
    return P;
  }
  function fromPlanes(P, w, h, out) {
    const n = w * h; out = out || new Uint8ClampedArray(n * 4);
    for (let p = 0; p < n; p++) {
      const a = clamp(P[3][p], 0, 1);
      if (a <= 1e-6) { out[p * 4] = out[p * 4 + 1] = out[p * 4 + 2] = out[p * 4 + 3] = 0; continue; }
      out[p * 4] = P[0][p] / a; out[p * 4 + 1] = P[1][p] / a; out[p * 4 + 2] = P[2][p] / a;
      out[p * 4 + 3] = a * 255;
    }
    return out;
  }
  function boxSizes(sigma, n) {
    const wi = Math.sqrt(12 * sigma * sigma / n + 1);
    let wl = Math.floor(wi); if (wl % 2 === 0) wl--;
    const wu = wl + 2, mi = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
    const m = Math.round(mi), s = [];
    for (let i = 0; i < n; i++) s.push(i < m ? wl : wu);
    return s;
  }
  function boxBlurLine(src, dst, n, stride, r, offset) {
    // running average with edge clamping along a line of n samples
    const iarr = 1 / (r + r + 1);
    const first = src[offset], last = src[offset + (n - 1) * stride];
    let val = (r + 1) * first;
    for (let j = 0; j < r; j++) val += src[offset + Math.min(j, n - 1) * stride];
    for (let j = 0; j < n; j++) {
      const add = j + r < n ? src[offset + (j + r) * stride] : last;
      const sub = j - r - 1 >= 0 ? src[offset + (j - r - 1) * stride] : first;
      val += add - sub;
      dst[offset + j * stride] = val * iarr;
    }
  }
  function blurPlanes(P, w, h, sigma) {
    if (sigma < 0.3) return;
    const sizes = boxSizes(sigma, 3), tmp = new Float32Array(w * h);
    for (const plane of P) {
      for (const sz of sizes) {
        const r = (sz - 1) >> 1;
        for (let y = 0; y < h; y++) boxBlurLine(plane, tmp, w, 1, r, y * w);
        for (let x = 0; x < w; x++) boxBlurLine(tmp, plane, h, w, r, x);
      }
    }
  }
  /** Resample to nw x nh: area average when shrinking, bilinear when growing (premultiplied). */
  function resize(data, w, h, nw, nh) {
    const P = toPlanes(data, w, h);
    const resizeAxis = (plane, sw, sh, nsw, axisX) => {
      const out = axisX ? new Float32Array(nsw * sh) : new Float32Array(sw * nsw);
      const len = axisX ? sw : sh, nlen = nsw, scale = len / nlen;
      const lines = axisX ? sh : sw;
      for (let line = 0; line < lines; line++) {
        for (let o = 0; o < nlen; o++) {
          let v = 0;
          if (scale > 1) {
            const a = o * scale, b = (o + 1) * scale; let ws = 0;
            for (let s = Math.floor(a); s < Math.min(len, Math.ceil(b)); s++) {
              const wgt = Math.min(b, s + 1) - Math.max(a, s);
              v += (axisX ? plane[line * sw + s] : plane[s * sw + line]) * wgt; ws += wgt;
            }
            v /= ws || 1;
          } else {
            const c = clamp((o + 0.5) * scale - 0.5, 0, len - 1), s0 = Math.floor(c), s1 = Math.min(len - 1, s0 + 1), f = c - s0;
            const a0 = axisX ? plane[line * sw + s0] : plane[s0 * sw + line], a1 = axisX ? plane[line * sw + s1] : plane[s1 * sw + line];
            v = a0 + (a1 - a0) * f;
          }
          if (axisX) out[line * nsw + o] = v; else out[o * sw + line] = v;
        }
      }
      return out;
    };
    const R = P.map((pl) => resizeAxis(resizeAxis(pl, w, h, nw, true), nw, h, nh, false));
    return fromPlanes(R, nw, nh);
  }
  function resizeMask(m, w, h, nw, nh) {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 255; data[i * 4 + 3] = m[i]; }
    const r = resize(data, w, h, nw, nh), out = new Uint8Array(nw * nh);
    for (let i = 0; i < out.length; i++) out[i] = r[i * 4 + 3];
    return out;
  }

  /* ------------------------------------------------------------ transforms */
  function cropData(data, w, h, x, y, nw, nh, channels) {
    channels = channels || 4;
    const out = channels === 4 ? new Uint8ClampedArray(nw * nh * 4) : new Uint8Array(nw * nh);
    for (let j = 0; j < nh; j++) {
      const sy = j + y; if (sy < 0 || sy >= h) continue;
      const sx0 = Math.max(0, x), sx1 = Math.min(w, x + nw); if (sx1 <= sx0) continue;
      const src = data.subarray((sy * w + sx0) * channels, (sy * w + sx1) * channels);
      out.set(src, (j * nw + (sx0 - x)) * channels);
    }
    return out;
  }
  function flipData(data, w, h, horizontal, channels) {
    channels = channels || 4;
    const out = new data.constructor(data.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = horizontal ? w - 1 - x : x, sy = horizontal ? y : h - 1 - y;
      for (let c = 0; c < channels; c++) out[(y * w + x) * channels + c] = data[(sy * w + sx) * channels + c];
    }
    return out;
  }
  function rotate90Data(data, w, h, quarter, channels) { // quarter: 1 = clockwise, 2 = 180, 3 = counter-clockwise
    channels = channels || 4;
    const q = ((quarter % 4) + 4) % 4, nw = q % 2 ? h : w, nh = q % 2 ? w : h;
    const out = new data.constructor(nw * nh * channels);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let nx, ny;
      if (q === 1) { nx = h - 1 - y; ny = x; } else if (q === 2) { nx = w - 1 - x; ny = h - 1 - y; } else if (q === 3) { nx = y; ny = w - 1 - x; } else { nx = x; ny = y; }
      for (let c = 0; c < channels; c++) out[(ny * nw + nx) * channels + c] = data[(y * w + x) * channels + c];
    }
    return { data: out, w: nw, h: nh };
  }
  /** Rotate/scale/translate content around (cx,cy) with bilinear sampling (premultiplied). */
  function transformData(data, w, h, angleRad, scale, cx, cy, tx, ty) {
    const out = new Uint8ClampedArray(w * h * 4), cos = Math.cos(angleRad), sin = Math.sin(angleRad), inv = 1 / scale;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x + 0.5 - cx - tx, py = y + 0.5 - cy - ty;
      const sx = (px * cos + py * sin) * inv + cx - 0.5, sy = (-px * sin + py * cos) * inv + cy - 0.5;
      const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) {
        const xx = x0 + k, yy = y0 + j;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const wgt = (k ? fx : 1 - fx) * (j ? fy : 1 - fy), i = (yy * w + xx) * 4, al = data[i + 3] / 255 * wgt;
        r += data[i] * al; g += data[i + 1] * al; b += data[i + 2] * al; a += al;
      }
      const o = (y * w + x) * 4;
      if (a > 1e-6) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; out[o + 3] = a * 255; }
    }
    return out;
  }
  function offsetData(data, w, h, dx, dy, wrap, channels) {
    channels = channels || 4;
    const out = new data.constructor(data.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let sx = x - dx, sy = y - dy;
      if (wrap) { sx = ((sx % w) + w) % w; sy = ((sy % h) + h) % h; }
      else if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      for (let c = 0; c < channels; c++) out[(y * w + x) * channels + c] = data[(sy * w + sx) * channels + c];
    }
    return out;
  }

  /* ---------------------------------------------------------------- filters */
  function lutFilter(fn) { // per-channel byte lookup that leaves alpha alone
    return (src, w, h, p) => {
      const lut = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) lut[i] = fn(i / 255, p) * 255;
      const out = new Uint8ClampedArray(src.length);
      for (let i = 0; i < src.length; i += 4) { out[i] = lut[src[i]]; out[i + 1] = lut[src[i + 1]]; out[i + 2] = lut[src[i + 2]]; out[i + 3] = src[i + 3]; }
      return out;
    };
  }
  function pixelFilter(fn) { // fn(r,g,b,params,out) with 0..1 floats; alpha preserved
    return (src, w, h, p) => {
      const out = new Uint8ClampedArray(src.length), o = [0, 0, 0];
      for (let i = 0; i < src.length; i += 4) {
        fn(src[i] / 255, src[i + 1] / 255, src[i + 2] / 255, p, o);
        out[i] = o[0] * 255; out[i + 1] = o[1] * 255; out[i + 2] = o[2] * 255; out[i + 3] = src[i + 3];
      }
      return out;
    };
  }
  function convolve3(src, w, h, k, divisor, bias) { // RGB only, alpha kept
    const out = new Uint8ClampedArray(src.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let v = 0;
        for (let j = -1; j <= 1; j++) for (let l = -1; l <= 1; l++) {
          const sx = clamp(x + l, 0, w - 1), sy = clamp(y + j, 0, h - 1);
          v += src[(sy * w + sx) * 4 + c] * k[(j + 1) * 3 + (l + 1)];
        }
        out[i + c] = v / divisor + bias;
      }
      out[i + 3] = src[i + 3];
    }
    return out;
  }

  const FILTERS = {
    brightness_contrast: {
      name: 'Brillo y contraste', group: 'Colores',
      params: [{ id: 'brightness', label: 'Brillo', min: -100, max: 100, step: 1, def: 0 }, { id: 'contrast', label: 'Contraste', min: -100, max: 100, step: 1, def: 0 }],
      run: lutFilter((v, p) => {
        const b = p.brightness / 100, c = clamp(p.contrast / 100, -1, 0.999);
        v = b < 0 ? v * (1 + b) : v + (1 - v) * b;
        return clamp((v - 0.5) * Math.tan((c + 1) * Math.PI / 4) + 0.5, 0, 1);
      })
    },
    levels: {
      name: 'Niveles', group: 'Colores',
      params: [
        { id: 'in_low', label: 'Entrada: negro', min: 0, max: 254, step: 1, def: 0 },
        { id: 'in_high', label: 'Entrada: blanco', min: 1, max: 255, step: 1, def: 255 },
        { id: 'gamma', label: 'Gamma', min: 0.1, max: 5, step: 0.01, def: 1 },
        { id: 'out_low', label: 'Salida: negro', min: 0, max: 255, step: 1, def: 0 },
        { id: 'out_high', label: 'Salida: blanco', min: 0, max: 255, step: 1, def: 255 }],
      run: lutFilter((v, p) => {
        const lo = p.in_low / 255, hi = Math.max(p.in_high / 255, lo + 1 / 255);
        const t = Math.pow(clamp((v - lo) / (hi - lo), 0, 1), 1 / p.gamma);
        return clamp(p.out_low / 255 + t * (p.out_high - p.out_low) / 255, 0, 1);
      })
    },
    hue_saturation: {
      name: 'Tono y saturación', group: 'Colores',
      params: [{ id: 'hue', label: 'Tono', min: -180, max: 180, step: 1, def: 0 }, { id: 'sat', label: 'Saturación', min: -100, max: 100, step: 1, def: 0 }, { id: 'light', label: 'Luminosidad', min: -100, max: 100, step: 1, def: 0 }],
      run: pixelFilter((r, g, b, p, o) => {
        let [h, s, l] = rgbToHsl(r, g, b);
        h = ((h + p.hue / 360) % 1 + 1) % 1;
        s = clamp(p.sat >= 0 ? s * (1 + p.sat / 100) : s * (1 + p.sat / 100), 0, 1);
        const lp = p.light / 100; l = lp < 0 ? l * (1 + lp) : l + (1 - l) * lp;
        const c = hslToRgb(h, s, clamp(l, 0, 1)); o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
      })
    },
    colorize: {
      name: 'Colorear', group: 'Colores',
      params: [{ id: 'hue', label: 'Tono', min: 0, max: 360, step: 1, def: 200 }, { id: 'sat', label: 'Saturación', min: 0, max: 100, step: 1, def: 50 }, { id: 'light', label: 'Luminosidad', min: -100, max: 100, step: 1, def: 0 }],
      run: pixelFilter((r, g, b, p, o) => {
        let l = r * RL + g * GL + b * BL; const lp = p.light / 100;
        l = lp < 0 ? l * (1 + lp) : l + (1 - l) * lp;
        const c = hslToRgb(p.hue / 360, p.sat / 100, clamp(l, 0, 1)); o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
      })
    },
    desaturate: {
      name: 'Desaturar', group: 'Colores',
      params: [{ id: 'mode', label: 'Método', type: 'select', options: [['luminance', 'Luminancia'], ['lightness', 'Claridad'], ['average', 'Promedio'], ['value', 'Valor']], def: 'luminance' }],
      run: pixelFilter((r, g, b, p, o) => {
        let v;
        if (p.mode === 'average') v = (r + g + b) / 3;
        else if (p.mode === 'lightness') v = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
        else if (p.mode === 'value') v = Math.max(r, g, b);
        else v = l2s(s2l(r) * RL + s2l(g) * GL + s2l(b) * BL);
        o[0] = o[1] = o[2] = v;
      })
    },
    invert: { name: 'Invertir', group: 'Colores', params: [], run: lutFilter((v) => 1 - v) },
    posterize: {
      name: 'Posterizar', group: 'Colores',
      params: [{ id: 'levels', label: 'Niveles', min: 2, max: 64, step: 1, def: 4 }],
      run: lutFilter((v, p) => Math.round(v * (p.levels - 1)) / (p.levels - 1))
    },
    threshold: {
      name: 'Umbral', group: 'Colores',
      params: [{ id: 'low', label: 'Mínimo', min: 0, max: 255, step: 1, def: 127 }, { id: 'high', label: 'Máximo', min: 0, max: 255, step: 1, def: 255 }],
      run: pixelFilter((r, g, b, p, o) => { const y = (r * RL + g * GL + b * BL) * 255; o[0] = o[1] = o[2] = y >= p.low && y <= p.high ? 1 : 0; })
    },
    sepia: {
      name: 'Sepia', group: 'Colores',
      params: [{ id: 'amount', label: 'Intensidad', min: 0, max: 100, step: 1, def: 100 }],
      run: pixelFilter((r, g, b, p, o) => {
        const a = p.amount / 100;
        const sr = clamp(0.393 * r + 0.769 * g + 0.189 * b, 0, 1), sg = clamp(0.349 * r + 0.686 * g + 0.168 * b, 0, 1), sb = clamp(0.272 * r + 0.534 * g + 0.131 * b, 0, 1);
        o[0] = r + (sr - r) * a; o[1] = g + (sg - g) * a; o[2] = b + (sb - b) * a;
      })
    },
    auto_stretch: {
      name: 'Estirar contraste', group: 'Colores', params: [],
      run: (src) => {
        const out = new Uint8ClampedArray(src.length), lo = [255, 255, 255], hi = [0, 0, 0];
        for (let i = 0; i < src.length; i += 4) { if (!src[i + 3]) continue; for (let c = 0; c < 3; c++) { if (src[i + c] < lo[c]) lo[c] = src[i + c]; if (src[i + c] > hi[c]) hi[c] = src[i + c]; } }
        for (let i = 0; i < src.length; i += 4) {
          for (let c = 0; c < 3; c++) out[i + c] = hi[c] > lo[c] ? (src[i + c] - lo[c]) * 255 / (hi[c] - lo[c]) : src[i + c];
          out[i + 3] = src[i + 3];
        }
        return out;
      }
    },
    gaussian_blur: {
      name: 'Desenfoque gaussiano', group: 'Desenfoque',
      params: [{ id: 'radius', label: 'Radio (σ)', min: 0, max: 100, step: 0.5, def: 4 }],
      run: (src, w, h, p) => { const P = toPlanes(src, w, h); blurPlanes(P, w, h, p.radius); return fromPlanes(P, w, h); }
    },
    motion_blur: {
      name: 'Desenfoque de movimiento', group: 'Desenfoque',
      params: [{ id: 'length', label: 'Longitud', min: 1, max: 100, step: 1, def: 15 }, { id: 'angle', label: 'Ángulo', min: 0, max: 180, step: 1, def: 0 }],
      run: (src, w, h, p) => {
        const P = toPlanes(src, w, h), R = P.map(() => new Float32Array(w * h)), n = Math.max(1, Math.round(p.length));
        const dx = Math.cos(p.angle * Math.PI / 180), dy = -Math.sin(p.angle * Math.PI / 180);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const o = y * w + x;
          for (let k = 0; k < n; k++) {
            const t = k - (n - 1) / 2, sx = clamp(Math.round(x + dx * t), 0, w - 1), sy = clamp(Math.round(y + dy * t), 0, h - 1), s = sy * w + sx;
            for (let c = 0; c < 4; c++) R[c][o] += P[c][s];
          }
          for (let c = 0; c < 4; c++) R[c][o] /= n;
        }
        return fromPlanes(R, w, h);
      }
    },
    pixelize: {
      name: 'Pixelar', group: 'Desenfoque',
      params: [{ id: 'size', label: 'Tamaño del bloque', min: 2, max: 128, step: 1, def: 8 }],
      run: (src, w, h, p) => {
        const out = new Uint8ClampedArray(src.length), s = Math.round(p.size);
        for (let by = 0; by < h; by += s) for (let bx = 0; bx < w; bx += s) {
          let r = 0, g = 0, b = 0, a = 0, n = 0;
          const ey = Math.min(h, by + s), ex = Math.min(w, bx + s);
          for (let y = by; y < ey; y++) for (let x = bx; x < ex; x++) { const i = (y * w + x) * 4, al = src[i + 3]; r += src[i] * al; g += src[i + 1] * al; b += src[i + 2] * al; a += al; n++; }
          const R = a ? r / a : 0, G = a ? g / a : 0, B = a ? b / a : 0, A = a / n;
          for (let y = by; y < ey; y++) for (let x = bx; x < ex; x++) { const i = (y * w + x) * 4; out[i] = R; out[i + 1] = G; out[i + 2] = B; out[i + 3] = A; }
        }
        return out;
      }
    },
    sharpen: {
      name: 'Enfocar (máscara de enfoque)', group: 'Mejora',
      params: [{ id: 'radius', label: 'Radio', min: 0.5, max: 50, step: 0.5, def: 2 }, { id: 'amount', label: 'Cantidad', min: 0, max: 5, step: 0.05, def: 0.8 }, { id: 'threshold', label: 'Umbral', min: 0, max: 50, step: 1, def: 0 }],
      run: (src, w, h, p) => {
        const P = toPlanes(src, w, h); blurPlanes(P, w, h, p.radius);
        const bl = fromPlanes(P, w, h), out = new Uint8ClampedArray(src.length);
        for (let i = 0; i < src.length; i += 4) {
          for (let c = 0; c < 3; c++) { const d = src[i + c] - bl[i + c]; out[i + c] = Math.abs(d) < p.threshold ? src[i + c] : src[i + c] + d * p.amount; }
          out[i + 3] = src[i + 3];
        }
        return out;
      }
    },
    noise: {
      name: 'Ruido RGB', group: 'Mejora',
      params: [{ id: 'amount', label: 'Cantidad', min: 0, max: 100, step: 1, def: 20 }, { id: 'mono', label: 'Monocromo', type: 'check', def: false }, { id: 'seed', label: 'Semilla', min: 0, max: 999, step: 1, def: 1 }],
      run: (src, w, h, p) => {
        let s = (p.seed * 2654435761 + 12345) >>> 0;
        const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
        const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
        const out = new Uint8ClampedArray(src.length), k = p.amount * 2.55 * 0.5;
        for (let i = 0; i < src.length; i += 4) {
          const m = gauss() * k;
          for (let c = 0; c < 3; c++) out[i + c] = src[i + c] + (p.mono ? m : gauss() * k);
          out[i + 3] = src[i + 3];
        }
        return out;
      }
    },
    emboss: {
      name: 'Relieve', group: 'Distorsión',
      params: [{ id: 'angle', label: 'Ángulo de luz', min: 0, max: 359, step: 1, def: 135 }, { id: 'depth', label: 'Profundidad', min: 1, max: 10, step: 0.5, def: 3 }],
      run: (src, w, h, p) => {
        const a = p.angle * Math.PI / 180, dx = Math.cos(a), dy = -Math.sin(a), d = p.depth;
        const k = [-dx - dy, -dy, dx - dy, -dx, 0, dx, -dx + dy, dy, dx + dy].map((v) => v * d * 0.5);
        const gray = new Uint8ClampedArray(src.length);
        for (let i = 0; i < src.length; i += 4) { const y = src[i] * RL + src[i + 1] * GL + src[i + 2] * BL; gray[i] = gray[i + 1] = gray[i + 2] = y; gray[i + 3] = src[i + 3]; }
        return convolve3(gray, w, h, k, 1, 128);
      }
    },
    edges: {
      name: 'Detectar bordes', group: 'Distorsión',
      params: [{ id: 'amount', label: 'Cantidad', min: 0.5, max: 10, step: 0.1, def: 2 }],
      run: (src, w, h, p) => {
        const sx = convolve3(src, w, h, [-1, 0, 1, -2, 0, 2, -1, 0, 1], 1, 128), sy = convolve3(src, w, h, [-1, -2, -1, 0, 0, 0, 1, 2, 1], 1, 128);
        const out = new Uint8ClampedArray(src.length);
        for (let i = 0; i < src.length; i += 4) {
          for (let c = 0; c < 3; c++) { const a = sx[i + c] - 128, b = sy[i + c] - 128; out[i + c] = Math.sqrt(a * a + b * b) * p.amount; }
          out[i + 3] = src[i + 3];
        }
        return out;
      }
    },
    vignette: {
      name: 'Viñeta', group: 'Luz y sombra',
      params: [{ id: 'radius', label: 'Radio', min: 10, max: 150, step: 1, def: 80 }, { id: 'softness', label: 'Suavidad', min: 1, max: 100, step: 1, def: 60 }, { id: 'strength', label: 'Intensidad', min: 0, max: 100, step: 1, def: 70 }],
      run: (src, w, h, p) => {
        const out = new Uint8ClampedArray(src), cx = w / 2, cy = h / 2, rmax = Math.hypot(cx, cy);
        const r0 = p.radius / 100 * rmax, soft = Math.max(p.softness / 100 * rmax, 1);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), t = clamp((d - r0 * 0.4) / soft, 0, 1), k = 1 - t * t * (3 - 2 * t) * p.strength / 100;
          const i = (y * w + x) * 4; out[i] *= k; out[i + 1] *= k; out[i + 2] *= k;
        }
        return out;
      }
    },
    drop_shadow: {
      name: 'Sombra paralela', group: 'Luz y sombra',
      params: [{ id: 'x', label: 'Desplazamiento X', min: -100, max: 100, step: 1, def: 8 }, { id: 'y', label: 'Desplazamiento Y', min: -100, max: 100, step: 1, def: 8 }, { id: 'blur', label: 'Desenfoque', min: 0, max: 60, step: 0.5, def: 6 }, { id: 'opacity', label: 'Opacidad', min: 0, max: 100, step: 1, def: 60 }, { id: 'color', label: 'Color', type: 'color', def: '#000000' }],
      run: (src, w, h, p) => {
        const col = hexToRgb(p.color), alpha = new Float32Array(w * h), dx = Math.round(p.x), dy = Math.round(p.y);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = x - dx, sy = y - dy; if (sx >= 0 && sy >= 0 && sx < w && sy < h) alpha[y * w + x] = src[(sy * w + sx) * 4 + 3] / 255; }
        blurPlanes([alpha], w, h, p.blur / 2);
        const out = new Uint8ClampedArray(src.length);
        for (let q = 0; q < w * h; q++) {
          const i = q * 4, sa = clamp(alpha[q], 0, 1) * p.opacity / 100, la = src[i + 3] / 255, na = la + sa * (1 - la);
          if (na <= 0) continue;
          const lr = la / na;
          out[i] = src[i] * lr + col.r * (1 - lr); out[i + 1] = src[i + 1] * lr + col.g * (1 - lr); out[i + 2] = src[i + 2] * lr + col.b * (1 - lr);
          out[i + 3] = na * 255;
        }
        return out;
      }
    }
  };
  function applyFilter(id, src, w, h, params, sel) {
    const f = FILTERS[id], p = {};
    for (const spec of f.params) p[spec.id] = params && params[spec.id] !== undefined ? params[spec.id] : spec.def;
    const res = f.run(src, w, h, p);
    if (!sel) return res;
    const out = new Uint8ClampedArray(src.length);
    for (let q = 0; q < w * h; q++) {
      const m = sel[q], i = q * 4;
      if (m === 255) { out[i] = res[i]; out[i + 1] = res[i + 1]; out[i + 2] = res[i + 2]; out[i + 3] = res[i + 3]; }
      else if (m === 0) { out[i] = src[i]; out[i + 1] = src[i + 1]; out[i + 2] = src[i + 2]; out[i + 3] = src[i + 3]; }
      else { const k = m / 255; for (let c = 0; c < 4; c++) out[i + c] = src[i + c] + (res[i + c] - src[i + c]) * k; }
    }
    return out;
  }

  /* --------------------------------------------------------- document model */
  let layerSeq = 1;
  function makeLayer(w, h, name, fill) {
    const l = {
      id: 'L' + layerSeq++, name: name || 'Capa', visible: true, opacity: 1, mode: 'normal',
      lockAlpha: false, mask: null, maskOn: true, text: null, data: new Uint8ClampedArray(w * h * 4)
    };
    if (fill) for (let i = 0; i < w * h; i++) { l.data[i * 4] = fill.r; l.data[i * 4 + 1] = fill.g; l.data[i * 4 + 2] = fill.b; l.data[i * 4 + 3] = fill.a === undefined ? 255 : fill.a; }
    return l;
  }

  class Doc {
    constructor(w, h) {
      this.w = w; this.h = h; this.layers = []; this.activeId = null; this.selection = null;
      this.editMask = false; this.undoStack = []; this.redoStack = []; this.maxBytes = 600 * 1024 * 1024; this.maxSteps = 100;
    }
    get active() { return this.layers.find((l) => l.id === this.activeId) || null; }
    indexOf(id) { return this.layers.findIndex((l) => l.id === id); }
    snapshot() {
      return { w: this.w, h: this.h, activeId: this.activeId, selection: this.selection, editMask: this.editMask, layers: this.layers.map((l) => Object.assign({}, l)) };
    }
    restore(s) {
      this.w = s.w; this.h = s.h; this.activeId = s.activeId; this.selection = s.selection; this.editMask = s.editMask;
      this.layers = s.layers.map((l) => Object.assign({}, l));
    }
    /** Record the state before an operation. */
    checkpoint(label) {
      this.undoStack.push({ label, state: this.snapshot() });
      this.redoStack.length = 0;
      this.trim();
    }
    trim() {
      while (this.undoStack.length > this.maxSteps) this.undoStack.shift();
      while (this.undoStack.length > 1 && this.memoryBytes() > this.maxBytes) this.undoStack.shift();
    }
    memoryBytes() {
      const seen = new Set(); let total = 0;
      const add = (buf) => { if (buf && !seen.has(buf)) { seen.add(buf); total += buf.byteLength; } };
      const visit = (s) => { add(s.selection); for (const l of s.layers) { add(l.data); add(l.mask); } };
      for (const e of this.undoStack) visit(e.state);
      for (const e of this.redoStack) visit(e.state);
      visit(this.snapshot());
      return total;
    }
    undo() {
      const e = this.undoStack.pop(); if (!e) return false;
      this.redoStack.push({ label: e.label, state: this.snapshot() });
      this.restore(e.state); return true;
    }
    redo() {
      const e = this.redoStack.pop(); if (!e) return false;
      this.undoStack.push({ label: e.label, state: this.snapshot() });
      this.restore(e.state); return true;
    }
    /** Jump so that exactly `n` operations are applied (history panel). */
    gotoStep(n) {
      while (this.undoStack.length > n && this.undo());
      while (this.undoStack.length < n && this.redo());
    }
    /** Make the layer's buffers private so in-place edits never touch history snapshots. Returns the originals. */
    touch(layer, what) {
      const orig = { data: layer.data, mask: layer.mask };
      if (what !== 'mask') layer.data = new Uint8ClampedArray(layer.data);
      if (what === 'mask' && layer.mask) layer.mask = new Uint8Array(layer.mask);
      return orig;
    }
    beginOp(label, layer, what) { this.checkpoint(label); return layer ? this.touch(layer, what) : null; }

    addLayer(name, fill, index) {
      this.checkpoint('Nueva capa');
      const l = makeLayer(this.w, this.h, name || 'Capa ' + (this.layers.length + 1), fill);
      const at = index === undefined ? this.indexOf(this.activeId) + 1 : index;
      this.layers.splice(at < 0 ? this.layers.length : at, 0, l);
      this.activeId = l.id; this.editMask = false; return l;
    }
    addLayerFromData(name, data, label) {
      this.checkpoint(label || 'Nueva capa');
      const l = makeLayer(this.w, this.h, name); l.data = data;
      this.layers.splice(this.indexOf(this.activeId) + 1, 0, l); this.activeId = l.id; this.editMask = false; return l;
    }
    duplicateLayer(id) {
      const src = this.layers.find((l) => l.id === id); if (!src) return null;
      this.checkpoint('Duplicar capa');
      const l = Object.assign({}, src, { id: 'L' + layerSeq++, name: src.name + ' copia' });
      this.layers.splice(this.indexOf(id) + 1, 0, l); this.activeId = l.id; return l;
    }
    removeLayer(id) {
      if (this.layers.length <= 1) return false;
      const i = this.indexOf(id); if (i < 0) return false;
      this.checkpoint('Eliminar capa');
      this.layers.splice(i, 1);
      this.activeId = this.layers[Math.min(i, this.layers.length - 1)].id; this.editMask = false; return true;
    }
    moveLayer(id, delta) {
      const i = this.indexOf(id), j = i + delta;
      if (i < 0 || j < 0 || j >= this.layers.length) return false;
      this.checkpoint(delta > 0 ? 'Subir capa' : 'Bajar capa');
      const [l] = this.layers.splice(i, 1); this.layers.splice(j, 0, l); return true;
    }
    mergeDown(id) {
      const i = this.indexOf(id); if (i <= 0) return false;
      this.checkpoint('Combinar hacia abajo');
      const top = this.layers[i], bottom = this.layers[i - 1];
      const out = new Uint8ClampedArray(this.w * this.h * 4);
      composite([bottom, top], this.w, this.h, out);
      const merged = Object.assign({}, bottom, { data: out, mask: null, opacity: 1, mode: 'normal', text: null, id: 'L' + layerSeq++ });
      this.layers.splice(i - 1, 2, merged); this.activeId = merged.id; return true;
    }
    flatten() {
      if (this.layers.length < 2) return false;
      this.checkpoint('Aplanar imagen');
      const out = new Uint8ClampedArray(this.w * this.h * 4);
      composite(this.layers, this.w, this.h, out);
      const l = makeLayer(this.w, this.h, 'Fondo'); l.data = out;
      this.layers = [l]; this.activeId = l.id; this.editMask = false; return true;
    }
    setSelection(mask, label) { this.checkpoint(label || 'Selección'); this.selection = mask; }
    mapAllLayers(label, fn, newW, newH) { // fn(data, w, h, channels) -> {data,w,h}
      this.checkpoint(label);
      const w = this.w, h = this.h; let nw = w, nh = h;
      for (const l of this.layers) {
        const r = fn(l.data, w, h, 4); l.data = r.data; nw = r.w; nh = r.h;
        if (l.mask) l.mask = fn(l.mask, w, h, 1).data;
      }
      if (this.selection) this.selection = normalizeMask(fn(this.selection, w, h, 1).data);
      this.w = newW || nw; this.h = newH || nh;
    }
    cropCanvas(x, y, nw, nh) {
      this.mapAllLayers('Recortar lienzo', (d, w, h, ch) => ({ data: cropData(d, w, h, x, y, nw, nh, ch), w: nw, h: nh }), nw, nh);
    }
    scaleImage(nw, nh) {
      this.mapAllLayers('Escalar imagen', (d, w, h, ch) => ({ data: ch === 4 ? resize(d, w, h, nw, nh) : resizeMask(d, w, h, nw, nh), w: nw, h: nh }), nw, nh);
    }
    flipImage(horizontal) {
      this.mapAllLayers(horizontal ? 'Voltear horizontal' : 'Voltear vertical', (d, w, h, ch) => ({ data: flipData(d, w, h, horizontal, ch), w, h }));
    }
    rotateImage(quarter) {
      this.mapAllLayers('Rotar imagen', (d, w, h, ch) => rotate90Data(d, w, h, quarter, ch));
    }
  }

  /* ---------------------------------------------------------------- export */
  /** Flatten onto an optional background colour (for JPEG). */
  function flattenOn(layers, w, h, bg) {
    const out = new Uint8ClampedArray(w * h * 4); composite(layers, w, h, out);
    if (bg) for (let i = 0; i < out.length; i += 4) {
      const a = out[i + 3] / 255;
      out[i] = out[i] * a + bg.r * (1 - a); out[i + 1] = out[i + 1] * a + bg.g * (1 - a); out[i + 2] = out[i + 2] * a + bg.b * (1 - a); out[i + 3] = 255;
    }
    return out;
  }

  return {
    clamp, S2L, lin2byte, s2l, l2s, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, linToLab, labToLin,
    MODES, MODE_LIST, SEP, NONSEP, composite, flattenOn,
    maskIsEmpty, normalizeMask, rectMask, ellipseMask, polygonMask, combineMasks, invertMask, maskBounds,
    growMask, shrinkMask, featherMask, floodMask, selectionEdges, distanceTransform,
    stampDab, applyCoverage, applyCoverageMask, applyClone, applyDodgeBurn, Stroker, fillMask, fillGradient,
    toPlanes, fromPlanes, blurPlanes, resize, resizeMask,
    cropData, flipData, rotate90Data, transformData, offsetData,
    FILTERS, applyFilter, makeLayer, Doc
  };
});
