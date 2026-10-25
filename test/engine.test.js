'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');

const near = (a, b, eps = 1e-6, msg) => assert.ok(Math.abs(a - b) <= eps, (msg || '') + ` expected ${b}, got ${a}`);
const px = (r, g, b, a = 255) => [r, g, b, a];
function solid(w, h, c) { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) d.set(c, i * 4); return d; }
function layer(w, h, c, extra) { const l = E.makeLayer(w, h, 'L'); l.data = solid(w, h, c); return Object.assign(l, extra || {}); }
function flat(layers, w = 1, h = 1) { const o = new Uint8ClampedArray(w * h * 4); E.composite(layers, w, h, o); return Array.from(o); }

/* ---- blend formulas: values taken straight from GIMP's gimpoperationlayermode-blend.c ---- */
test('separable blend functions match GIMP source', () => {
  const S = E.SEP;
  near(S.addition(0.3, 0.4), 0.7);
  near(S.subtract(0.7, 0.4), 0.3);
  near(S.multiply(0.5, 0.4), 0.2);
  near(S.screen(0.5, 0.4), 1 - 0.5 * 0.6);
  near(S.overlay(0.25, 0.6), 2 * 0.25 * 0.6);
  near(S.overlay(0.75, 0.6), 1 - 2 * 0.4 * 0.25);
  near(S.softlight(0.5, 0.5), (1 - 0.5) * 0.25 + 0.5 * (1 - 0.25));
  near(S.hardlight(0.4, 0.8), 1 - 0.6 * (1 - 0.6));
  near(S.hardlight(0.4, 0.25), 0.4 * 0.5);
  near(S.difference(0.2, 0.9), 0.7);
  near(S.divide(0.3, 0.6), 0.5);
  near(S.dodge(0.3, 0.5), 0.6);
  near(S.burn(0.8, 0.5), 1 - 0.2 / 0.5);
  near(S.grain_extract(0.6, 0.4), 0.7);
  near(S.grain_merge(0.6, 0.4), 0.5);
  near(S.vivid_light(0.6, 0.25), 1 - 0.4 / 0.5);
  near(S.vivid_light(0.3, 0.75), 0.3 / 0.5);
  near(S.pin_light(0.9, 0.75), 0.9);
  near(S.pin_light(0.1, 0.75), 0.5);
  near(S.pin_light(0.9, 0.25), 0.5);
  near(S.linear_light(0.5, 0.25), 0);
  near(S.linear_light(0.5, 0.75), 1);
  assert.equal(S.hard_mix(0.4, 0.5), 0);
  assert.equal(S.hard_mix(0.6, 0.5), 1);
  near(S.exclusion(0.5, 0.5), 0.5);
  near(S.exclusion(1, 0), 1);
  near(S.linear_burn(0.6, 0.7), 0.3);
  near(S.darken_only(0.3, 0.7), 0.3);
  near(S.lighten_only(0.3, 0.7), 0.7);
});

test('safe_div returns 0 for tiny numerators and clamps large quotients', () => {
  assert.equal(E.SEP.divide(0, 0.5), 0);
  assert.equal(E.SEP.divide(1, 0), 1e6);
});

test('every listed mode has an implementation', () => {
  for (const [id] of E.MODE_LIST) {
    const m = E.MODES[id];
    assert.ok(m, id);
    if (!['normal', 'dissolve', 'behind'].includes(id)) assert.ok(m.sep || m.nonsep, 'no blend for ' + id);
  }
  assert.equal(E.MODE_LIST.length, 35);
});

test('non-separable HSV modes', () => {
  const c = [0, 0, 0];
  E.NONSEP.hsv_value([0.4, 0.2, 0.2], [0.8, 0.1, 0.1], c);      // value of layer, hue/sat of backdrop
  near(c[0], 0.8); near(c[1], 0.4); near(c[2], 0.4);
  E.NONSEP.hsv_hue([0.6, 0.3, 0.3], [0, 0, 1], c);               // blue hue onto a desaturated red
  near(Math.max(...c), 0.6); near(Math.min(...c), 0.3);
  assert.ok(c[2] > c[0] && c[2] > c[1], 'result should be blue-dominant');
  E.NONSEP.hsv_saturation([0.6, 0.3, 0.3], [0.5, 0.5, 0.5], c);  // grey layer => no saturation
  near(c[0], 0.6); near(c[1], 0.6); near(c[2], 0.6);
});

test('LCh modes keep the right Lab components', () => {
  const i = [50, 20, 30], l = [80, -10, 5], c = [0, 0, 0];
  E.NONSEP.lch_lightness(i, l, c); assert.deepEqual(c, [80, 20, 30]);
  E.NONSEP.lch_color(i, l, c); assert.deepEqual(c, [50, -10, 5]);
  E.NONSEP.lch_chroma(i, l, c); near(c[0], 50); near(Math.hypot(c[1], c[2]), Math.hypot(-10, 5), 1e-9);
  E.NONSEP.lch_hue(i, l, c); near(Math.hypot(c[1], c[2]), Math.hypot(20, 30), 1e-9);
  near(Math.atan2(c[2], c[1]), Math.atan2(5, -10), 1e-9);
});

test('Lab round trip', () => {
  const lab = [0, 0, 0], lin = [0, 0, 0];
  for (const rgb of [[0.2, 0.5, 0.8], [1, 1, 1], [0.01, 0.9, 0.3]]) {
    E.linToLab(rgb[0], rgb[1], rgb[2], lab); E.labToLin(lab[0], lab[1], lab[2], lin);
    for (let k = 0; k < 3; k++) near(lin[k], rgb[k], 1e-4);
  }
  E.linToLab(1, 1, 1, lab); near(lab[0], 100, 0.05); near(lab[1], 0, 0.05);
});

/* ---- compositing ---- */
test('opaque normal layer is copied byte for byte', () => {
  assert.deepEqual(flat([layer(1, 1, px(10, 200, 33))]), [10, 200, 33, 255]);
  assert.deepEqual(flat([layer(1, 1, px(1, 2, 3)), layer(1, 1, px(250, 251, 252))]), [250, 251, 252, 255]);
});
test('layer opacity 50% black over white blends in linear light', () => {
  const out = flat([layer(1, 1, px(255, 255, 255)), layer(1, 1, px(0, 0, 0), { opacity: 0.5 })]);
  const expect = E.lin2byte(0.5);                     // sRGB 188
  assert.equal(out[0], expect); assert.equal(out[3], 255);
  assert.ok(Math.abs(expect - 188) <= 1);
});
test('hidden and zero-opacity layers are skipped', () => {
  const out = flat([layer(1, 1, px(9, 9, 9)), layer(1, 1, px(200, 0, 0), { visible: false }), layer(1, 1, px(0, 200, 0), { opacity: 0 })]);
  assert.deepEqual(out, [9, 9, 9, 255]);
});
test('multiply of mid grey with itself, linear space', () => {
  const g = 128, lin = E.S2L[g];
  const out = flat([layer(1, 1, px(g, g, g)), layer(1, 1, px(g, g, g), { mode: 'multiply' })]);
  assert.equal(out[0], E.lin2byte(lin * lin));
});
test('screen blends in perceptual space', () => {
  const out = flat([layer(1, 1, px(100, 100, 100)), layer(1, 1, px(100, 100, 100), { mode: 'screen' })]);
  const a = 100 / 255, v = 1 - (1 - a) * (1 - a), back = E.lin2byte(E.s2l(v));
  assert.equal(out[0], back);
});
test('clip-to-backdrop modes do not paint where the backdrop is empty', () => {
  const out = flat([layer(1, 1, px(0, 0, 0, 0)), layer(1, 1, px(255, 0, 0), { mode: 'multiply' })]);
  assert.deepEqual(out, [0, 0, 0, 0]);
});
test('alpha union of two half-transparent layers', () => {
  const out = flat([layer(1, 1, px(255, 0, 0, 128)), layer(1, 1, px(0, 0, 255, 128))]);
  const a1 = 128 / 255, a2 = 128 / 255, na = a2 + (1 - a2) * a1;
  assert.equal(out[3], Math.round(na * 255));
  assert.ok(out[2] > out[0], 'upper blue layer dominates');
});
test('behind puts the layer below existing pixels', () => {
  const out = flat([layer(1, 1, px(255, 0, 0)), layer(1, 1, px(0, 0, 255), { mode: 'behind' })]);
  assert.deepEqual(out, [255, 0, 0, 255]);
  const out2 = flat([layer(1, 1, px(0, 0, 0, 0)), layer(1, 1, px(0, 0, 255), { mode: 'behind' })]);
  assert.deepEqual(out2, [0, 0, 255, 255]);
});
test('layer mask scales layer alpha', () => {
  const l = layer(2, 1, px(255, 255, 255)); l.mask = new Uint8Array([255, 0]);
  const out = flat([layer(2, 1, px(0, 0, 0)), l], 2, 1);
  assert.deepEqual(out.slice(0, 4), [255, 255, 255, 255]);
  assert.deepEqual(out.slice(4, 8), [0, 0, 0, 255]);
});
test('dissolve is deterministic and binary in alpha', () => {
  const l = layer(32, 32, px(255, 0, 0), { mode: 'dissolve', opacity: 0.5 });
  const a = flat([layer(32, 32, px(0, 0, 255)), l], 32, 32), b = flat([layer(32, 32, px(0, 0, 255)), l], 32, 32);
  assert.deepEqual(a, b);
  let red = 0; for (let i = 0; i < 32 * 32; i++) if (a[i * 4] === 255) red++;
  assert.ok(red > 380 && red < 650, 'about half the pixels dissolve in, got ' + red);
});
test('composite honours its rect and a preview override', () => {
  const l = layer(4, 4, px(10, 10, 10)), out = new Uint8ClampedArray(4 * 4 * 4);
  E.composite([l], 4, 4, out, { x0: 1, y0: 1, x1: 3, y1: 3 }, { id: l.id, data: solid(4, 4, px(99, 99, 99)) });
  assert.equal(out[(1 * 4 + 1) * 4], 99); assert.equal(out[0], 0);
});

/* ---- selections ---- */
test('rectangle and ellipse masks', () => {
  const r = E.rectMask(10, 10, 2, 3, 6, 7); let n = 0; for (const v of r) if (v === 255) n++;
  assert.equal(n, 16);
  const e = E.ellipseMask(40, 40, 5, 5, 35, 35); let area = 0; for (const v of e) area += v / 255;
  near(area, Math.PI * 15 * 15, 25);
});
test('polygon mask area equals the shoelace area (antialiased)', () => {
  const tri = [[2, 2], [30, 4], [10, 28]], m = E.polygonMask(40, 40, tri); let area = 0; for (const v of m) area += v / 255;
  const exact = Math.abs((tri[1][0] - tri[0][0]) * (tri[2][1] - tri[0][1]) - (tri[2][0] - tri[0][0]) * (tri[1][1] - tri[0][1])) / 2;
  near(area, exact, exact * 0.02);
});
test('combine modes', () => {
  const a = E.rectMask(8, 1, 0, 0, 5, 1), b = E.rectMask(8, 1, 3, 0, 8, 1);
  const sum = (m) => Array.from(m || []).filter((v) => v === 255).length;
  assert.equal(sum(E.combineMasks(a, b, 'add')), 8);
  assert.equal(sum(E.combineMasks(a, b, 'subtract')), 3);
  assert.equal(sum(E.combineMasks(a, b, 'intersect')), 2);
  assert.equal(sum(E.combineMasks(a, b, 'replace')), 5);
  assert.equal(E.combineMasks(a, E.rectMask(8, 1, 6, 0, 8, 1), 'intersect'), null);
});
test('invert, bounds, grow, shrink', () => {
  const m = E.rectMask(20, 20, 5, 5, 15, 15);
  assert.deepEqual(E.maskBounds(m, 20, 20), { x0: 5, y0: 5, x1: 15, y1: 15 });
  const inv = E.invertMask(m, 20, 20); assert.equal(inv[0], 255); assert.equal(inv[10 * 20 + 10], 0);
  assert.equal(E.invertMask(null, 20, 20)[0], 255);
  const g = E.maskBounds(E.growMask(m, 20, 20, 2), 20, 20); assert.deepEqual(g, { x0: 3, y0: 3, x1: 17, y1: 17 });
  const s = E.maskBounds(E.shrinkMask(m, 20, 20, 2), 20, 20); assert.deepEqual(s, { x0: 7, y0: 7, x1: 13, y1: 13 });
  assert.equal(E.shrinkMask(m, 20, 20, 6), null);
});
test('feather preserves total coverage and softens edges', () => {
  const m = E.rectMask(40, 40, 10, 10, 30, 30), f = E.featherMask(m, 40, 40, 6);
  let a = 0, b = 0; for (let i = 0; i < m.length; i++) { a += m[i]; b += f[i]; }
  near(b / a, 1, 0.02);
  assert.ok(f[20 * 40 + 9] > 0 && f[20 * 40 + 9] < 255);
});
test('flood fill: contiguous vs global', () => {
  const w = 5, h = 1, d = new Uint8ClampedArray(w * 4);
  [[255, 0, 0], [255, 0, 0], [0, 0, 255], [255, 0, 0], [255, 0, 0]].forEach((c, i) => d.set([...c, 255], i * 4));
  const con = E.floodMask(d, w, h, 0, 0, 0, true), glo = E.floodMask(d, w, h, 0, 0, 0, false);
  assert.deepEqual(Array.from(con), [255, 255, 0, 0, 0]);
  assert.deepEqual(Array.from(glo), [255, 255, 0, 255, 255]);
  const loose = E.floodMask(d, w, h, 0, 0, 255, true); assert.deepEqual(Array.from(loose), [255, 255, 255, 255, 255]);
});
test('selection edges trace the outline', () => {
  const m = E.rectMask(6, 6, 1, 1, 4, 3), e = E.selectionEdges(m, 6, 6);
  assert.equal(e.length / 3, 2 * (3 + 2));
});

/* ---- painting ---- */
test('hard dab covers a disc; soft dab falls off; coverage never exceeds 1', () => {
  const w = 40, h = 40, cov = new Float32Array(w * h);
  E.stampDab(cov, w, h, 20, 20, 20, 1, true, 1, false);
  let area = 0; for (const v of cov) area += v; near(area, Math.PI * 100, 8);
  const soft = new Float32Array(w * h); E.stampDab(soft, w, h, 20, 20, 20, 0, true, 1, false);
  assert.ok(soft[20 * w + 20] > soft[20 * w + 27] && soft[20 * w + 27] > soft[20 * w + 29]);
  for (const v of cov) assert.ok(v >= 0 && v <= 1);
});
test('stroker spaces dabs evenly and carries remainder between segments', () => {
  const pts = []; const s = new E.Stroker(5, (x, y) => pts.push([x, y]));
  s.begin(0, 0); s.lineTo(12, 0); s.lineTo(23, 0);
  assert.deepEqual(pts.map((p) => p[0]), [0, 5, 10, 15, 20]);
});
test('applyCoverage paints, erases, respects selection and lock alpha', () => {
  const w = 3, h = 1, cov = new Float32Array([1, 1, 1]), box = { x0: 0, y0: 0, x1: 2, y1: 0 };
  const orig = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), dest = new Uint8ClampedArray(orig);
  E.applyCoverage(dest, orig, w, cov, box, new Uint8Array([255, 0, 128]), { r: 255, g: 0, b: 0 }, 1, {});
  assert.deepEqual(Array.from(dest.slice(0, 4)), [255, 0, 0, 255]);
  assert.deepEqual(Array.from(dest.slice(4, 8)), [0, 0, 0, 0]);
  assert.equal(dest[11], 128);
  const o2 = new Uint8ClampedArray([10, 20, 30, 255]), d2 = new Uint8ClampedArray(o2);
  E.applyCoverage(d2, o2, 1, new Float32Array([1]), { x0: 0, y0: 0, x1: 0, y1: 0 }, null, { r: 0, g: 0, b: 0 }, 0.5, { erase: true });
  assert.deepEqual(Array.from(d2), [10, 20, 30, 128]);
  const o3 = new Uint8ClampedArray([0, 0, 0, 0]), d3 = new Uint8ClampedArray(o3);
  E.applyCoverage(d3, o3, 1, new Float32Array([1]), { x0: 0, y0: 0, x1: 0, y1: 0 }, null, { r: 9, g: 9, b: 9 }, 1, { lockAlpha: true });
  assert.deepEqual(Array.from(d3), [0, 0, 0, 0]);
});
test('bucket fill through a mask and gradient fill', () => {
  const w = 4, h = 1, d = new Uint8ClampedArray(w * 4);
  E.fillMask(d, w, h, new Uint8Array([255, 255, 0, 0]), null, { r: 1, g: 2, b: 3 }, 1, false);
  assert.deepEqual(Array.from(d.slice(0, 8)), [1, 2, 3, 255, 1, 2, 3, 255]); assert.equal(d[11], 0);
  const g = new Uint8ClampedArray(w * 4);
  E.fillGradient(g, w, h, null, 0, 0, 4, 0, 'linear', { r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 }, 1);
  assert.ok(g[0] < g[4] && g[4] < g[8] && g[8] < g[12]);
});
test('dodge brightens, burn darkens', () => {
  const mk = () => new Uint8ClampedArray([100, 100, 100, 255]), cov = new Float32Array([1]), box = { x0: 0, y0: 0, x1: 0, y1: 0 };
  const a = mk(); E.applyDodgeBurn(a, 1, box, cov, null, false, 0.5, 'midtones'); assert.ok(a[0] > 100);
  const b = mk(); E.applyDodgeBurn(b, 1, box, cov, null, true, 0.5, 'midtones'); assert.ok(b[0] < 100);
});

/* ---- filters ---- */
const rnd = (w, h, seed = 7) => { const d = new Uint8ClampedArray(w * h * 4); let s = seed; for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = i % 4 === 3 ? 255 : s >> 8; } return d; };
test('invert twice is identity and keeps alpha', () => {
  const src = rnd(8, 8), once = E.applyFilter('invert', src, 8, 8, {}), twice = E.applyFilter('invert', once, 8, 8, {});
  assert.deepEqual(Array.from(twice), Array.from(src)); assert.equal(once[3], src[3]);
});
test('every filter runs with defaults and returns a same-size buffer', () => {
  const src = rnd(24, 20);
  for (const id of Object.keys(E.FILTERS)) {
    const out = E.applyFilter(id, src, 24, 20, {});
    assert.equal(out.length, src.length, id);
    for (let i = 3; i < out.length; i += 4) assert.ok(out[i] >= 0 && out[i] <= 255, id);
  }
});
test('brightness/contrast neutral is identity; brightness +50 brightens', () => {
  const src = rnd(8, 8);
  assert.deepEqual(Array.from(E.applyFilter('brightness_contrast', src, 8, 8, {})), Array.from(src));
  const b = E.applyFilter('brightness_contrast', src, 8, 8, { brightness: 50 });
  let up = 0; for (let i = 0; i < src.length; i += 4) if (b[i] >= src[i]) up++;
  assert.equal(up, 64);
});
test('levels identity and clipping', () => {
  const src = rnd(8, 8);
  assert.deepEqual(Array.from(E.applyFilter('levels', src, 8, 8, {})), Array.from(src));
  const o = E.applyFilter('levels', new Uint8ClampedArray([200, 50, 255, 255]), 1, 1, { in_low: 100, in_high: 200 });
  assert.deepEqual(Array.from(o), [255, 0, 255, 255]);
});
test('hue shift by 120 turns red into green; desaturate yields grey', () => {
  const o = E.applyFilter('hue_saturation', new Uint8ClampedArray([255, 0, 0, 255]), 1, 1, { hue: 120 });
  assert.ok(o[1] > 250 && o[0] < 5 && o[2] < 5);
  const g = E.applyFilter('desaturate', new Uint8ClampedArray([255, 0, 0, 255]), 1, 1, {});
  assert.equal(g[0], g[1]); assert.equal(g[1], g[2]);
});
test('gaussian blur conserves energy exactly in float planes and smooths a block', () => {
  const w = 41, h = 41, src = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) src[i * 4 + 3] = 255;
  for (let y = 15; y < 25; y++) for (let x = 15; x < 25; x++) { const c = (y * w + x) * 4; src[c] = src[c + 1] = src[c + 2] = 255; }
  const P = E.toPlanes(src, w, h), before = P[0].reduce((a, v) => a + v, 0);
  E.blurPlanes(P, w, h, 3);
  near(P[0].reduce((a, v) => a + v, 0) / before, 1, 1e-4);
  const o = E.applyFilter('gaussian_blur', src, w, h, { radius: 3 });
  let a = 0, b = 0; for (let i = 0; i < w * h; i++) { a += src[i * 4]; b += o[i * 4]; }
  near(b / a, 1, 0.01);
  const edge = (20 * w + 15) * 4; assert.ok(o[edge] > 60 && o[edge] < 200, 'edge softened: ' + o[edge]);
  assert.equal(E.applyFilter('gaussian_blur', src, w, h, { radius: 0 })[edge], 255);
});
test('filter is limited by selection mask', () => {
  const src = new Uint8ClampedArray([10, 10, 10, 255, 10, 10, 10, 255]);
  const o = E.applyFilter('invert', src, 2, 1, {}, new Uint8Array([255, 0]));
  assert.deepEqual(Array.from(o), [245, 245, 245, 255, 10, 10, 10, 255]);
});
test('pixelize makes uniform blocks', () => {
  const src = rnd(8, 8), o = E.applyFilter('pixelize', src, 8, 8, { size: 4 });
  assert.equal(o[0], o[4]); assert.equal(o[0], o[(3 * 8 + 3) * 4]);
});
test('noise is reproducible per seed', () => {
  const src = rnd(8, 8);
  const a = E.applyFilter('noise', src, 8, 8, { seed: 3 }), b = E.applyFilter('noise', src, 8, 8, { seed: 3 }), c = E.applyFilter('noise', src, 8, 8, { seed: 4 });
  assert.deepEqual(Array.from(a), Array.from(b)); assert.notDeepEqual(Array.from(a), Array.from(c));
});

/* ---- transforms ---- */
test('resize keeps flat colour and alpha', () => {
  const o = E.resize(solid(10, 10, px(10, 20, 30, 200)), 10, 10, 4, 7);
  assert.equal(o.length, 4 * 7 * 4); assert.deepEqual(Array.from(o.slice(0, 4)), [10, 20, 30, 200]);
  const up = E.resize(solid(2, 2, px(5, 6, 7)), 2, 2, 9, 9); assert.deepEqual(Array.from(up.slice(-4)), [5, 6, 7, 255]);
});
test('crop, flip and rotate', () => {
  const w = 3, h = 2, d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) d[i * 4] = i + 1;
  const c = E.cropData(d, w, h, 1, 0, 2, 2); assert.deepEqual([c[0], c[4], c[8], c[12]], [2, 3, 5, 6]);
  const f = E.flipData(d, w, h, true); assert.deepEqual([f[0], f[4], f[8]], [3, 2, 1]);
  const r = E.rotate90Data(d, w, h, 1); assert.equal(r.w, 2); assert.equal(r.h, 3);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => r.data[i * 4]), [4, 1, 5, 2, 6, 3]);
  const r4 = E.rotate90Data(E.rotate90Data(E.rotate90Data(E.rotate90Data(d, w, h, 1).data, 2, 3, 1).data, w, h, 1).data, 2, 3, 1);
  assert.deepEqual(Array.from(r4.data), Array.from(d));
  const big = E.cropData(d, w, h, -1, -1, 5, 4); assert.equal(big[(1 * 5 + 1) * 4], 1);
});
test('transformData identity and 90 degree rotation', () => {
  const w = 5, h = 5, d = rnd(w, h), o = E.transformData(d, w, h, 0, 1, w / 2, h / 2, 0, 0);
  assert.deepEqual(Array.from(o), Array.from(d));
  const t = E.transformData(d, w, h, Math.PI / 2, 1, w / 2, h / 2, 0, 0), r = E.rotate90Data(d, w, h, 1).data;
  let diff = 0; for (let i = 0; i < t.length; i++) diff = Math.max(diff, Math.abs(t[i] - r[i]));
  assert.ok(diff <= 1, 'max diff ' + diff);
});
test('offset with wrap', () => {
  const d = new Uint8ClampedArray([1, 0, 0, 255, 2, 0, 0, 255, 3, 0, 0, 255]);
  assert.deepEqual([0, 1, 2].map((i) => E.offsetData(d, 3, 1, 1, 0, true)[i * 4]), [3, 1, 2]);
  assert.deepEqual([0, 1, 2].map((i) => E.offsetData(d, 3, 1, 1, 0, false)[i * 4]), [0, 1, 2]);
});

/* ---- document & history ---- */
test('document layers: add, duplicate, move, remove, merge, flatten', () => {
  const doc = new E.Doc(4, 4); const bg = doc.addLayer('Fondo', { r: 255, g: 255, b: 255 });
  const top = doc.addLayer('Rojo', { r: 255, g: 0, b: 0 }); top.opacity = 0.5;
  assert.equal(doc.layers.length, 2); assert.equal(doc.activeId, top.id);
  const dup = doc.duplicateLayer(top.id); assert.equal(doc.layers.length, 3); assert.notEqual(dup.id, top.id);
  doc.moveLayer(dup.id, -1); assert.equal(doc.layers[0].id, bg.id); assert.equal(doc.indexOf(dup.id), 1);
  assert.equal(doc.removeLayer(dup.id), true);
  assert.equal(doc.mergeDown(top.id), true); assert.equal(doc.layers.length, 1);
  assert.ok(doc.layers[0].data[1] > 0 && doc.layers[0].data[1] < 255, 'merged result is pink');
  assert.equal(doc.removeLayer(doc.layers[0].id), false, 'cannot delete the last layer');
  const d2 = new E.Doc(2, 2); d2.addLayer('a', { r: 1, g: 1, b: 1 }); d2.addLayer('b', { r: 9, g: 9, b: 9 }); assert.equal(d2.flatten(), true); assert.equal(d2.layers.length, 1);
});
test('undo / redo restore pixels, layers and selection', () => {
  const doc = new E.Doc(4, 4); const l = doc.addLayer('Fondo', { r: 10, g: 10, b: 10 });
  doc.beginOp('Pintar', l, 'data'); l.data[0] = 200;
  doc.setSelection(E.rectMask(4, 4, 0, 0, 2, 2), 'Seleccionar');
  doc.addLayer('Extra');
  assert.equal(doc.layers.length, 2);
  doc.undo(); assert.equal(doc.layers.length, 1); assert.ok(doc.selection);
  doc.undo(); assert.equal(doc.selection, null); assert.equal(doc.layers[0].data[0], 200);
  doc.undo(); assert.equal(doc.layers[0].data[0], 10);
  doc.redo(); assert.equal(doc.layers[0].data[0], 200);
  doc.redo(); doc.redo(); assert.equal(doc.layers.length, 2);
  assert.equal(doc.redo(), false);
  doc.gotoStep(1); assert.equal(doc.layers.length, 1); assert.equal(doc.layers[0].data[0], 10);
});
test('editing a layer after beginOp never mutates the undo snapshot', () => {
  const doc = new E.Doc(2, 2); const l = doc.addLayer('Fondo', { r: 5, g: 5, b: 5 });
  const before = Array.from(l.data); doc.beginOp('Editar', l, 'data'); l.data.fill(77);
  doc.undo(); assert.deepEqual(Array.from(doc.layers[0].data), before);
});
test('a new operation clears the redo stack; history is bounded', () => {
  const doc = new E.Doc(2, 2); doc.maxSteps = 5; doc.addLayer('a');
  for (let i = 0; i < 12; i++) doc.addLayer('x' + i);
  assert.ok(doc.undoStack.length <= 5);
  doc.undo(); assert.equal(doc.redoStack.length, 1); doc.addLayer('nueva'); assert.equal(doc.redoStack.length, 0);
});
test('canvas ops transform every layer, mask and selection together', () => {
  const doc = new E.Doc(4, 2); const l = doc.addLayer('a', { r: 1, g: 2, b: 3 }); l.mask = new Uint8Array(8).fill(255);
  doc.selection = E.rectMask(4, 2, 0, 0, 2, 2);
  doc.rotateImage(1); assert.equal(doc.w, 2); assert.equal(doc.h, 4); assert.equal(doc.layers[0].data.length, 2 * 4 * 4); assert.equal(doc.layers[0].mask.length, 8); assert.equal(doc.selection.length, 8);
  doc.scaleImage(6, 8); assert.equal(doc.layers[0].data.length, 6 * 8 * 4); assert.equal(doc.layers[0].mask.length, 48);
  doc.cropCanvas(1, 1, 3, 3); assert.equal(doc.w, 3); assert.equal(doc.layers[0].data.length, 36);
  doc.flipImage(true); doc.undo(); doc.undo(); doc.undo(); doc.undo(); assert.equal(doc.w, 4); assert.equal(doc.h, 2);
});
test('flattenOn fills transparency with the background colour', () => {
  const l = layer(1, 1, px(0, 0, 0, 0)); const o = E.flattenOn([l], 1, 1, { r: 10, g: 20, b: 30 });
  assert.deepEqual(Array.from(o), [10, 20, 30, 255]);
});
test('colour helpers', () => {
  assert.deepEqual(E.hexToRgb('#ff8000'), { r: 255, g: 128, b: 0 }); assert.equal(E.rgbToHex(255, 128, 0), '#ff8000'); assert.deepEqual(E.hexToRgb('#f00'), { r: 255, g: 0, b: 0 });
  for (const v of [0, 1, 17, 128, 254, 255]) assert.equal(E.lin2byte(E.S2L[v]), v);
  const [h, s, l] = E.rgbToHsl(0, 1, 0); near(h, 1 / 3); near(s, 1); near(l, 0.5);
  const rgb = E.hslToRgb(0.5, 0.4, 0.3); const back = E.rgbToHsl(...rgb); near(back[0], 0.5, 1e-9); near(back[1], 0.4, 1e-9);
});
