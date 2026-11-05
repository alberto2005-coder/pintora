/* Pintora vector paths: geometry, hit testing and SVG serialisation. No DOM. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PintoraPaths = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clone(path) {
    if (!path) return null;
    return {
      points: (path.points || []).map((p) => [Number(p[0]) || 0, Number(p[1]) || 0]),
      closed: !!path.closed,
      fill: path.fill === null || path.fill === undefined ? null : String(path.fill),
      stroke: path.stroke === null || path.stroke === undefined ? null : String(path.stroke),
      strokeWidth: path.strokeWidth === undefined ? 2 : Math.max(0, Number(path.strokeWidth) || 0),
      opacity: path.opacity === undefined ? 1 : Math.max(0, Math.min(1, Number(path.opacity))),
      name: path.name || 'Trazado'
    };
  }

  function normalize(path) {
    const p = clone(path);
    if (!p) return null;
    if (p.points.length < 2) p.closed = false;
    return p;
  }

  function bounds(path) {
    if (!path || !path.points || !path.points.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of path.points) {
      if (x < x0) x0 = x; if (y < y0) y0 = y;
      if (x > x1) x1 = x; if (y > y1) y1 = y;
    }
    const pad = Math.max(0, path.strokeWidth || 0) / 2;
    return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
  }

  function d(path) {
    if (!path || !path.points || !path.points.length) return '';
    const n = (v) => Math.round(v * 1000) / 1000;
    let out = 'M ' + n(path.points[0][0]) + ' ' + n(path.points[0][1]);
    for (let i = 1; i < path.points.length; i++) out += ' L ' + n(path.points[i][0]) + ' ' + n(path.points[i][1]);
    if (path.closed) out += ' Z';
    return out;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function toSvgElement(path, opts) {
    opts = opts || {};
    const p = normalize(path);
    if (!p || p.points.length < 2) return '';
    const fill = p.closed && p.fill ? p.fill : 'none';
    const stroke = p.stroke && p.strokeWidth > 0 ? p.stroke : 'none';
    const attrs = [
      'd="' + esc(d(p)) + '"',
      'fill="' + esc(fill) + '"',
      'fill-rule="evenodd"',
      'stroke="' + esc(stroke) + '"',
      'stroke-width="' + esc(p.strokeWidth) + '"',
      'stroke-linecap="round"',
      'stroke-linejoin="round"',
      'opacity="' + esc(p.opacity) + '"'
    ];
    if (opts.transform) attrs.push('transform="' + esc(opts.transform) + '"');
    return '<path ' + attrs.join(' ') + '/>';
  }

  function hitPoint(path, x, y, tolerance) {
    if (!path || !path.points) return -1;
    const t = Math.max(1, tolerance || 4);
    let best = -1, dist = t;
    for (let i = 0; i < path.points.length; i++) {
      const dx = path.points[i][0] - x, dy = path.points[i][1] - y, d2 = Math.hypot(dx, dy);
      if (d2 <= dist) { dist = d2; best = i; }
    }
    return best;
  }

  return { clone, normalize, bounds, d, toSvgElement, hitPoint };
});
