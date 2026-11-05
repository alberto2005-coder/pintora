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

test('GIF round trip keeps frames and size', () => {
  const red = new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255]);
  const blue = new Uint8ClampedArray([0, 0, 255, 255, 0, 0, 255, 255]);
  const gif = F.readGif(F.writeGif([red, blue], 2, 1, 80));
  assert.equal(gif.frames, 2);
  assert.equal(gif.w, 2);
  assert.equal(gif.h, 1);
  assert.ok(gif.data[0] > 200 && gif.data[1] < 60 && gif.data[2] < 60, 'first frame is red');
});

test('PSD layer rectangles keep their offset', () => {
  const layer = new Uint8ClampedArray([1, 2, 3, 255]);
  const buf = F.writePsd({ w: 4, h: 4, layers: [{ name: 'Pequeña', data: layer, opacity: 1, visible: true, mode: 'normal' }] });
  const psd = F.readPsd(buf);
  assert.equal(psd.layers[0].w, 4);
  assert.equal(psd.layers[0].h, 4);
  assert.deepEqual(Array.from(psd.layers[0].data.slice(0, 4)), [1, 2, 3, 255]);
});
