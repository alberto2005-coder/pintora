'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const agPsd = require('ag-psd');
// Node has no canvas; the reader only needs ImageData-like objects when useImageData is on.
agPsd.initializeCanvas(() => { throw new Error('canvas no disponible en Node'); }, (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }));
const F = require('../src/formats.js');

test('PSD blend modes map both ways', () => {
  assert.equal(F.toPsdBlend('multiply'), 'multiply');
  assert.equal(F.toPsdBlend('softlight'), 'soft light');
  assert.equal(F.toPsdBlend('lch_lightness'), 'luminosity');
  assert.equal(F.toPsdBlend('nope'), 'normal');
  assert.equal(F.fromPsdBlend('color dodge'), 'dodge');
  assert.equal(F.fromPsdBlend('luminosity'), 'luminance');
  assert.equal(F.fromPsdBlend('unknown'), 'normal');
});

test('PSD round trip keeps size, layer names, pixels, opacity and blend mode', () => {
  const w = 2, h = 1;
  const a = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
  const b = new Uint8ClampedArray([0, 0, 255, 255, 255, 255, 0, 128]);
  const buf = F.writePsd({
    w, h, composite: a,
    layers: [
      { name: 'Fondo', data: a, opacity: 1, visible: true, mode: 'normal' },
      { name: 'Mezcla', data: b, opacity: 0.5, visible: true, mode: 'multiply' }
    ]
  });
  assert.ok(buf.byteLength > 0);
  const psd = F.readPsd(buf);
  assert.equal(psd.w, w);
  assert.equal(psd.h, h);
  assert.equal(psd.layers.length, 2);
  assert.deepEqual(psd.layers.map((l) => l.name).sort(), ['Fondo', 'Mezcla']);
  const m = psd.layers.find((l) => l.name === 'Mezcla');
  assert.equal(m.mode, 'multiply');
  assert.ok(Math.abs(m.opacity - 0.5) < 0.02, 'opacity ' + m.opacity);
  assert.equal(m.w, w);
  assert.equal(m.h, h);
  assert.deepEqual(Array.from(m.data), Array.from(b));
});

test('TIFF round trip keeps pixels and size', () => {
  const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
  const back = F.readTiff(F.writeTiff(data, 2, 1));
  assert.equal(back.w, 2);
  assert.equal(back.h, 1);
  assert.deepEqual(Array.from(back.data.slice(0, 4)), [255, 0, 0, 255]);
  assert.deepEqual(Array.from(back.data.slice(4, 8)), [0, 255, 0, 255]);
});

test('16-bit TIFF export keeps pixels and reports 16-bit depth', () => {
  const data = new Uint8ClampedArray([12, 128, 240, 255, 255, 0, 64, 128]);
  const back = F.readTiff(F.writeTiff16(data, 2, 1));
  assert.equal(back.w, 2);
  assert.equal(back.h, 1);
  assert.equal(back.depth, 16);
  assert.deepEqual(Array.from(back.data.slice(0, 4)), [12, 128, 240, 255]);
  assert.deepEqual(Array.from(back.data.slice(4, 8)), [255, 0, 64, 128]);
  const deep = F.readTiff16(F.writeTiff16(new Uint16Array([1, 256, 65535, 65535]), 1, 1));
  assert.equal(deep.depth, 16);
  assert.deepEqual(Array.from(deep.data16), [1, 256, 65535, 65535]);
  const withProfile = F.writeTiff16(new Uint16Array([1, 2, 3, 4]), 1, 1, new Uint8Array([9, 8, 7, 6]));
  assert.deepEqual(Array.from(F.readTiff16(withProfile).profile), [9, 8, 7, 6]);
});

test('GIF round trip keeps frames and size', () => {
  const red = new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255]);
  const blue = new Uint8ClampedArray([0, 0, 255, 255, 0, 0, 255, 255]);
  const gif = F.readGif(F.writeGif([red, blue], 2, 1, 80));
  assert.equal(gif.frames, 2);
  assert.equal(gif.w, 2);
  assert.equal(gif.h, 1);
  assert.ok(gif.data[0] > 200 && gif.data[1] < 60 && gif.data[2] < 60, 'first frame is red');
});

test('PSD layer rectangles keep their offset and size', () => {
  const layer = new Uint8ClampedArray([1, 2, 3, 255]);
  const buf = F.writePsd({ w: 4, h: 4, layers: [{ name: 'Pequeña', data: layer, opacity: 1, visible: true, mode: 'normal', x: 2, y: 1, w: 1, h: 1 }] });
  const psd = F.readPsd(buf);
  assert.equal(psd.layers[0].w, 1);
  assert.equal(psd.layers[0].h, 1);
  assert.equal(psd.layers[0].left, 2);
  assert.equal(psd.layers[0].top, 1);
  assert.deepEqual(Array.from(psd.layers[0].data.slice(0, 4)), [1, 2, 3, 255]);
});

test('XCF round trip keeps layers, pixels, opacity and offsets', async () => {
  const w = 2, h = 1;
  const a = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
  const b = new Uint8ClampedArray([0, 0, 255, 255, 255, 255, 0, 128]);
  const buf = F.writeXcf({
    w, h,
    layers: [
      { name: 'Fondo', data: a, opacity: 1, visible: true, mode: 'normal' },
      { name: 'Mezcla', data: b, opacity: 0.5, visible: true, mode: 'multiply', x: 1, y: 0 }
    ]
  });
  assert.ok(buf.byteLength > 0);
  const xcf = await F.readXcf(buf);
  assert.equal(xcf.w, w);
  assert.equal(xcf.h, h);
  assert.equal(xcf.layers.length, 2);
  assert.deepEqual(xcf.layers.map((l) => l.name).sort(), ['Fondo', 'Mezcla']);
  const m = xcf.layers.find((l) => l.name === 'Mezcla');
  assert.equal(m.mode, 'multiply');
  assert.ok(Math.abs(m.opacity - 0.5) < 0.02, 'opacity ' + m.opacity);
  assert.equal(m.left, 1);
  assert.deepEqual(Array.from(m.data.slice(0, 4)), [0, 0, 255, 255]);
});

test('16-bit XCF export keeps layers and 16-bit precision', async () => {
  const data16 = new Uint16Array([1, 256, 65535, 65535, 32768, 8192, 4096, 32768]);
  const buf = F.writeXcf({
    w: 2, h: 1, depth: 16,
    layers: [{ name: 'Profunda', data16, opacity: 0.5, visible: true, mode: 'normal' }]
  });
  const xcf = await F.readXcf(buf);
  assert.equal(xcf.w, 2);
  assert.equal(xcf.h, 1);
  assert.equal(xcf.depth, 16);
  assert.equal(xcf.layers.length, 1);
  assert.equal(xcf.layers[0].name, 'Profunda');
  assert.ok(Math.abs(xcf.layers[0].opacity - 0.5) < 0.02);
});
