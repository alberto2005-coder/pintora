'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ICC = require('../src/icc.js');

function s15(n) { return Math.round(n * 65536); }
function sig(s) { return [0, 1, 2, 3].map((i) => s.charCodeAt(i)); }
function makeProfile() {
  const matrix = [
    0.4360747, 0.3850649, 0.1430804,
    0.2225045, 0.7168786, 0.0606169,
    0.0139322, 0.0971045, 0.7141733
  ];
  const name = 'Pintora sRGB test';
  const chunks = [];
  const add = (tag, data) => { const at = 132 + 7 * 12 + chunks.reduce((n, c) => n + c.data.length, 0); chunks.push({ tag, data, at }); };
  const desc = new Uint8Array(12 + name.length + 1);
  const dd = new DataView(desc.buffer);
  desc.set(sig('desc'), 0); dd.setUint32(8, name.length + 1);
  for (let i = 0; i < name.length; i++) desc[12 + i] = name.charCodeAt(i);
  add('desc', desc);
  for (const [tag, vals] of [['rXYZ', [matrix[0], matrix[3], matrix[6]]], ['gXYZ', [matrix[1], matrix[4], matrix[7]]], ['bXYZ', [matrix[2], matrix[5], matrix[8]]]]) {
    const b = new Uint8Array(20), v = new DataView(b.buffer); b.set(sig('XYZ '), 0);
    vals.forEach((n, i) => v.setInt32(8 + i * 4, s15(n), false)); add(tag, b);
  }
  for (const tag of ['rTRC', 'gTRC', 'bTRC']) {
    const b = new Uint8Array(44), v = new DataView(b.buffer); b.set(sig('para'), 0); v.setUint16(8, 3, false);
    [1 / 1.055, 0.055 / 1.055, 2.4, 0.04045, 1 / 12.92].forEach((n, i) => v.setInt32(12 + i * 4, s15(n), false));
    add(tag, b);
  }
  const dataStart = 132 + 7 * 12;
  const total = dataStart + chunks.reduce((n, c) => n + c.data.length, 0);
  const out = new Uint8Array(total), dv = new DataView(out.buffer);
  dv.setUint32(0, total, false); out.set(sig('TEST'), 4); dv.setUint32(8, 0x02100000, false);
  out.set(sig('mntr'), 12); out.set(sig('RGB '), 16); out.set(sig('XYZ '), 20);
  dv.setInt32(68, s15(0.9642), false); dv.setInt32(72, s15(1), false); dv.setInt32(76, s15(0.8249), false);
  dv.setUint32(128, chunks.length, false);
  chunks.forEach((c, i) => { const e = 132 + i * 12; out.set(sig(c.tag), e); dv.setUint32(e + 4, c.at, false); dv.setUint32(e + 8, c.data.length, false); out.set(c.data, c.at); });
  return out;
}

test('RGB matrix/TRC ICC profile parses and converts to sRGB', () => {
  const bytes = makeProfile();
  const p = ICC.parseProfile(bytes);
  assert.equal(p.name, 'Pintora sRGB test');
  assert.equal(p.colorSpace, 'RGB');
  assert.ok(p.supported);
  const data = new Uint8ClampedArray([128, 64, 32, 255, 255, 255, 255, 128]);
  const out = ICC.convertRGBA(data, 2, 1, p);
  assert.ok(Math.abs(out[0] - 128) < 4, 'red channel ' + out[0]);
  assert.ok(Math.abs(out[1] - 64) < 5, 'green channel ' + out[1]);
  assert.ok(Math.abs(out[2] - 32) < 6, 'blue channel ' + out[2]);
  assert.equal(out[4], 255);
  assert.equal(out[7], 128);
});

test('16-bit ICC conversion preserves alpha and the 16-bit range', () => {
  const p = ICC.parseProfile(makeProfile());
  const data = new Uint16Array([32768, 16384, 8192, 65535]);
  const out = ICC.convert16(data, 1, 1, p);
  assert.ok(Math.abs(out[0] - 32768) < 1024, 'red channel ' + out[0]);
  assert.equal(out[3], 65535);
});
