'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/paths.js');

test('path geometry, hit testing and SVG serialisation', () => {
  const path = { points: [[2, 3], [10, 3], [6, 9]], closed: true, fill: '#112233', stroke: '#ffffff', strokeWidth: 2, opacity: 0.8 };
  assert.deepEqual(P.bounds(path), { x0: 1, y0: 2, x1: 11, y1: 10 });
  assert.equal(P.hitPoint(path, 9.5, 3.5, 1), 1);
  assert.equal(P.hitPoint(path, 40, 40, 1), -1);
  assert.equal(P.d(path), 'M 2 3 L 10 3 L 6 9 Z');
  const svg = P.toSvgElement(path);
  assert.ok(svg.includes('<path'));
  assert.ok(svg.includes('fill="#112233"'));
  assert.ok(svg.includes('stroke="#ffffff"'));
  assert.ok(svg.includes('opacity="0.8"'));
  const copy = P.clone(path);
  copy.points[0][0] = 99;
  assert.equal(path.points[0][0], 2);
});
