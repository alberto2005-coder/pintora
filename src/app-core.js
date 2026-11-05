/* ===== Pintora app core: state, canvas view, rendering, files ===== */
const E = PintoraEngine;
const Paths = PintoraPaths;
const ICC = PintoraICC;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const clamp = E.clamp;
const SVGNS = 'http://www.w3.org/2000/svg';

function h(tag, props, ...kids) {
  const n = document.createElement(tag);
  if (props) for (const k of Object.keys(props)) {
    const v = props[k];
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'value') n.value = v;
    else if (k === 'checked') n.checked = !!v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

/* icons: 24x24 line icons */
const ICONS = {
  rect: '<rect x="4" y="5" width="16" height="14" rx="1" stroke-dasharray="3 2.5"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="8.5" ry="6.5" stroke-dasharray="3 2.5"/>',
  free: '<path d="M5 15c-1-4 2-9 7-9s8 3 6 6-6 1-6 4 3 3 1 4-7 0-8-5z" stroke-dasharray="3 2.5"/>',
  fuzzy: '<path d="M5 19l9-9"/><path d="M14 4v3M19 9h-3M16.5 6.5l-2 2M11.5 6.5l2 2M5 5l1.5 1.5M5 9H3M9 5V3"/>',
  bycolor: '<path d="M12 3.5c3.2 4 5.5 6.8 5.5 9.7a5.5 5.5 0 0 1-11 0c0-2.9 2.3-5.7 5.5-9.7z"/><path d="M9.2 14.3a3 3 0 0 0 2.3 2.2"/>',
  move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
  crop: '<path d="M7 3v14h14M3 7h14v14"/>',
  pencil: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
  brush: '<path d="M20 4c-5 1-9 5-10 9l3 3c4-1 8-5 7-12z"/><path d="M10 13c-3 0-5 2-5 5 0 1-1 2-1.5 2.5 3 .5 7 0 7-4"/>',
  eraser: '<path d="M8 20h12M4.5 14.5l8-8a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L12 18.5H8z"/><path d="M9.5 10l5.5 5.5"/>',
  airbrush: '<path d="M4 14l5-5 5 5-5 5z"/><path d="M14 8l5-5M16 12h4M12 6V2"/><circle cx="19" cy="16" r=".6"/><circle cx="21" cy="19" r=".6"/><circle cx="17" cy="20" r=".6"/>',
  clone: '<rect x="9" y="3" width="6" height="8" rx="3"/><path d="M12 11v3M5 21v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3z"/>',
  dodge: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" stroke="none"/>',
  blur: '<circle cx="12" cy="12" r="8" stroke-dasharray="2 3"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3" stroke-opacity=".55"/>',
  smudge: '<path d="M5 17c4 0 4-7 8-7s2 8 6 8"/><path d="M5 12c4 0 4-5 8-5s3 6 6 6" stroke-opacity=".5"/>',
  bucket: '<path d="M5 11l7-7 7 7-6 6a2 2 0 0 1-2.8 0L5 13.8a2 2 0 0 1 0-2.8z"/><path d="M5 11h14M20 16c1 1.5 1.5 2.5 1.5 3.2a1.5 1.5 0 0 1-3 0c0-.7.5-1.7 1.5-3.2z"/>',
  gradient: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v14M12 5v14M16 5v14" stroke-opacity=".5"/>',
  picker: '<path d="M14.5 4.5l5 5M17 7l-9 9-1 3 3-1 9-9"/><path d="M15 3.5a2 2 0 0 1 3 0l2.5 2.5a2 2 0 0 1 0 3"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  path: '<path d="M5 19l4-12 6 10 4-8"/><circle cx="5" cy="19" r="1.6"/><circle cx="9" cy="7" r="1.6"/><circle cx="15" cy="17" r="1.6"/><circle cx="19" cy="9" r="1.6"/>',
  zoom: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M8 10.5h5M10.5 8v5"/>',
  hand: '<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10V5a1.5 1.5 0 0 1 3 0v6M14 10V6.5a1.5 1.5 0 0 1 3 0V12M8 12l-1.5-1.8a1.5 1.5 0 0 0-2.3 1.9L7 17c1.5 3 3 4 6 4 3.5 0 5-2 5-6v-3"/>',
  undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12" transform="translate(0 -4)"/>',
  redo: '<path d="M15 7l5 5-5 5"/><path d="M20 12H10a6 6 0 0 0 0 12" transform="translate(0 -4)"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeoff: '<path d="M3 3l18 18M10.2 6a9 9 0 0 1 1.8-.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.5 7.5A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.5 0 2.8-.4 4-1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  merge: '<path d="M6 4v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4M12 15v5M9 17l3 3 3-3"/>',
  mask: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  auto: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16" fill="currentColor" stroke="none"/>',
  layers: '<path d="M12 4l9 5-9 5-9-5z"/><path d="M3 14l9 5 9-5"/>',
  swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  reset: '<rect x="4" y="4" width="10" height="10"/><rect x="10" y="10" width="10" height="10" fill="currentColor"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>'
};
function icon(name) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'i'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || '';
  return s;
}

/* ---------------- state ---------------- */
const S = {
  doc: null, name: 'Sin título', fg: { r: 0, g: 0, b: 0 }, bg: { r: 255, g: 255, b: 255 }, colorTarget: 'fg',
  pathLayer: null,
  tool: 'paintbrush', prevTool: null,
  view: { zoom: 1, ox: 0, oy: 0 }, hover: null, spaceDown: false,
  flat: null, flatImg: null, docCanvas: null, docCtx: null, dirty: null, preview: null, overlayFn: null,
  cov: null, covW: 0, covH: 0,
  clip: null, lastFilter: null, showGrid: false, gridSize: 32, showSel: true,
  antsPath: null, antsSel: undefined, antOffset: 0,
  theme: 'system', lang: 'es', modified: false,
  opts: {
    size: 24, hardness: 0.6, opacity: 1, spacing: 0.12, flow: 0.25, exposure: 0.35,
    selmode: 'replace', threshold: 20, sampleMerged: false, fillMode: 'similar', gradShape: 'linear', gradColors: 'fgbg',
    moveTarget: 'layer', dbMode: 'dodge', dbRange: 'midtones', aa: true, pickSample: 'merged', dyn: true,
    strength: 0.5, blurMode: 'blur', blurRadius: 4, pathWidth: 2
  }
};
const MAX_DIM = 8192;

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}
const fgHex = () => E.rgbToHex(S.fg.r, S.fg.g, S.fg.b);
const bgHex = () => E.rgbToHex(S.bg.r, S.bg.g, S.bg.b);
function fmtBytes(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB'; }

/* ---------------- document + canvases ---------------- */
function setDoc(doc, name) {
  S.doc = doc; if (name) S.name = name;
  S.flat = new Uint8ClampedArray(doc.w * doc.h * 4);
  S.flatImg = new ImageData(S.flat, doc.w, doc.h);
  S.docCanvas = document.createElement('canvas'); S.docCanvas.width = doc.w; S.docCanvas.height = doc.h;
  S.docCtx = S.docCanvas.getContext('2d');
  S.cov = null; S.preview = null; S.antsSel = undefined; S.dirty = null;
  invalidate(null); fitView(); refreshAll();
}
/** Called when the document's pixel size changed (crop, scale, rotate). */
function resizeBuffers() {
  const d = S.doc;
  S.flat = new Uint8ClampedArray(d.w * d.h * 4); S.flatImg = new ImageData(S.flat, d.w, d.h);
  S.docCanvas.width = d.w; S.docCanvas.height = d.h; S.cov = null; S.antsSel = undefined; S.dirty = null;
  invalidate(null);
}
function invalidate(rect) {
  const d = S.doc; if (!d) return;
  const r = rect ? { x0: Math.max(0, Math.floor(rect.x0)), y0: Math.max(0, Math.floor(rect.y0)), x1: Math.min(d.w, Math.ceil(rect.x1)), y1: Math.min(d.h, Math.ceil(rect.y1)) } : { x0: 0, y0: 0, x1: d.w, y1: d.h };
  if (r.x1 <= r.x0 || r.y1 <= r.y0) return;
  const o = S.dirty;
  S.dirty = o ? { x0: Math.min(o.x0, r.x0), y0: Math.min(o.y0, r.y0), x1: Math.max(o.x1, r.x1), y1: Math.max(o.y1, r.y1) } : r;
  schedule();
}
let rafId = 0;
function schedule() { if (!rafId) rafId = requestAnimationFrame(frame); }
function flushDirty() {
  const r = S.dirty, d = S.doc; if (!r || !d) return;
  S.dirty = null;
  E.composite(d.layers, d.w, d.h, S.flat, r, S.preview);
  S.docCtx.putImageData(S.flatImg, 0, 0, r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
}
function frame() { rafId = 0; flushDirty(); draw(); }

/* after any structural change */
function docChanged(rect) {
  S.modified = true;
  if (S.flatImg.width !== S.doc.w || S.flatImg.height !== S.doc.h) resizeBuffers(); else invalidate(rect || null);
  refreshAll(); queueAutosave();
}
function refreshAll() { refreshLayers(); refreshHistory(); refreshStatus(); refreshUndoButtons(); refreshHistogram(); }

/* ---------------- view ---------------- */
const viewEl = () => $('#view');
function viewSize() { const c = viewEl(); return { w: c.clientWidth, h: c.clientHeight }; }
function toScreen(x, y) { return [S.view.ox + x * S.view.zoom, S.view.oy + y * S.view.zoom]; }
function toDoc(cx, cy) {
  const r = viewEl().getBoundingClientRect();
  return [(cx - r.left - S.view.ox) / S.view.zoom, (cy - r.top - S.view.oy) / S.view.zoom];
}
function fitView() {
  const d = S.doc, v = viewSize(); if (!d || !v.w) return;
  const z = Math.min((v.w - 32) / d.w, (v.h - 32) / d.h, 8);
  S.view.zoom = Math.max(0.02, z);
  S.view.ox = (v.w - d.w * S.view.zoom) / 2; S.view.oy = (v.h - d.h * S.view.zoom) / 2;
  syncZoomSel(); schedule();
}
function setZoom(z, cx, cy) {
  const v = viewSize(); z = clamp(z, 0.02, 64);
  if (cx === undefined) { cx = v.w / 2; cy = v.h / 2; }
  const dx = (cx - S.view.ox) / S.view.zoom, dy = (cy - S.view.oy) / S.view.zoom;
  S.view.zoom = z; S.view.ox = cx - dx * z; S.view.oy = cy - dy * z;
  clampPan(); syncZoomSel(); schedule();
}
function clampPan() {
  const d = S.doc, v = viewSize(), z = S.view.zoom, m = 80;
  S.view.ox = clamp(S.view.ox, m - d.w * z, v.w - m); S.view.oy = clamp(S.view.oy, m - d.h * z, v.h - m);
}
function panBy(dx, dy) { S.view.ox += dx; S.view.oy += dy; clampPan(); schedule(); }
function syncZoomSel() {
  const sel = $('#zoomSel'); if (!sel) return;
  const pct = Math.round(S.view.zoom * 1000) / 10;
  let opt = sel.querySelector('option[data-cur]');
  if (!opt) { opt = h('option', { 'data-cur': '1' }); sel.prepend(opt); }
  opt.value = String(S.view.zoom); opt.textContent = pct + '%'; sel.value = opt.value;
}

/* selection outline (marching ants) */
function buildAnts() {
  const d = S.doc; S.antsSel = d.selection; S.antsPath = null;
  if (!d.selection) return;
  const edges = E.selectionEdges(d.selection, d.w, d.h), p = new Path2D();
  if (edges.length / 3 > 300000) { const b = E.maskBounds(d.selection, d.w, d.h); p.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
  else for (let i = 0; i < edges.length; i += 3) {
    const x = edges[i], y = edges[i + 1], dir = edges[i + 2];
    if (dir === 0) { p.moveTo(x, y); p.lineTo(x + 1, y); } else if (dir === 1) { p.moveTo(x + 1, y); p.lineTo(x + 1, y + 1); }
    else if (dir === 2) { p.moveTo(x, y + 1); p.lineTo(x + 1, y + 1); } else { p.moveTo(x, y); p.lineTo(x, y + 1); }
  }
  S.antsPath = p;
}

let checkPattern = null;
function getCheckPattern(ctx) {
  const cs = getComputedStyle(document.documentElement), a = cs.getPropertyValue('--check-a').trim(), b = cs.getPropertyValue('--check-b').trim();
  const key = a + b; if (checkPattern && checkPattern.key === key) return checkPattern.p;
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
  g.fillStyle = a; g.fillRect(0, 0, 16, 16); g.fillStyle = b; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8);
  checkPattern = { key, p: ctx.createPattern(c, 'repeat') }; return checkPattern.p;
}
let dpr = 1;
function sizeCanvas() {
  const c = viewEl(), r = c.getBoundingClientRect(); dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(r.width * dpr)), hh = Math.max(1, Math.round(r.height * dpr));
  if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; }
}
function draw() {
  const c = viewEl(); if (!c || !S.doc) return;
  sizeCanvas();
  const ctx = c.getContext('2d'), d = S.doc, z = S.view.zoom;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const x0 = S.view.ox, y0 = S.view.oy, W = d.w * z, H = d.h * z;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 14; ctx.fillStyle = '#000'; ctx.fillRect(x0, y0, W, H); ctx.restore();
  ctx.fillStyle = getCheckPattern(ctx); ctx.fillRect(x0, y0, W, H);
  ctx.imageSmoothingEnabled = z < 2; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(S.docCanvas, x0, y0, W, H);
  if (S.showGrid && z >= 3) {
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, W, H); ctx.clip(); ctx.strokeStyle = 'rgba(128,128,128,.55)'; ctx.lineWidth = 1; ctx.beginPath();
    const gs = S.gridSize; for (let x = gs; x < d.w; x += gs) { const sx = Math.round(x0 + x * z) + .5; ctx.moveTo(sx, y0); ctx.lineTo(sx, y0 + H); }
    for (let y = gs; y < d.h; y += gs) { const sy = Math.round(y0 + y * z) + .5; ctx.moveTo(x0, sy); ctx.lineTo(x0 + W, sy); }
    ctx.stroke(); ctx.restore();
  }
  if (S.showSel && d.selection) {
    if (S.antsSel !== d.selection) buildAnts();
    if (S.antsPath) {
      ctx.save(); ctx.translate(x0, y0); ctx.scale(z, z); ctx.lineWidth = 1 / z;
      ctx.strokeStyle = '#fff'; ctx.setLineDash([]); ctx.stroke(S.antsPath);
      ctx.strokeStyle = '#000'; ctx.setLineDash([4 / z, 4 / z]); ctx.lineDashOffset = -S.antOffset / z; ctx.stroke(S.antsPath); ctx.restore();
    }
  }
  const t = TOOL_IMPL[S.tool];
  if (t && t.overlay) { ctx.save(); t.overlay(ctx); ctx.restore(); }
  if (S.hover && t && t.brushCursor && !S.spaceDown) drawBrushCursor(ctx);
}
function drawBrushCursor(ctx) {
  const [sx, sy] = toScreen(S.hover.x, S.hover.y), r = Math.max(S.opts.size * S.view.zoom / 2, 1);
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.beginPath(); ctx.arc(sx, sy, r + 1, 0, 7); ctx.stroke();
}
setInterval(() => { if (S.doc && S.doc.selection && S.showSel && !document.hidden) { S.antOffset = (S.antOffset + 1) % 8; schedule(); } }, 140);

/* ---------------- helpers over the document ---------------- */
function activeLayer() { return S.doc && S.doc.active; }
function flushNow() { flushDirty(); }
function sampleFlat(x, y) {
  const d = S.doc; x = clamp(Math.floor(x), 0, d.w - 1); y = clamp(Math.floor(y), 0, d.h - 1); flushDirty();
  const i = (y * d.w + x) * 4; return [S.flat[i], S.flat[i + 1], S.flat[i + 2], S.flat[i + 3]];
}
function lum(c) { return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b); }
function setColor(which, rgb, fromPicker) {
  S[which] = { r: rgb.r, g: rgb.g, b: rgb.b };
  if (!fromPicker) syncHsvFrom(S[S.colorTarget]);
  refreshColor();
}
function swapColors() { const t = S.fg; S.fg = S.bg; S.bg = t; syncHsvFrom(S[S.colorTarget]); refreshColor(); }
function defaultColors() { S.fg = { r: 0, g: 0, b: 0 }; S.bg = { r: 255, g: 255, b: 255 }; syncHsvFrom(S[S.colorTarget]); refreshColor(); }
function ensureCov(w, h) {
  const d = S.doc; w = w || d.w; h = h || d.h;
  if (!S.cov || S.covW !== w || S.covH !== h) { S.cov = new Float32Array(w * h); S.covW = w; S.covH = h; }
  return S.cov;
}
/** The document selection cropped to a layer's own rectangle (null when there is no selection). */
function layerSel(L) {
  const d = S.doc, sel = d.selection; if (!sel) return null;
  const m = new Uint8Array(L.w * L.h);
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const dx = x + L.x, dy = y + L.y;
    if (dx >= 0 && dy >= 0 && dx < d.w && dy < d.h) m[y * L.w + x] = sel[dy * d.w + dx];
  }
  return m;
}
/** A layer-sized mask lifted into document coordinates. */
function layerMaskToDoc(m, L) {
  const d = S.doc, out = new Uint8Array(d.w * d.h);
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const dx = x + L.x, dy = y + L.y;
    if (dx >= 0 && dy >= 0 && dx < d.w && dy < d.h) out[dy * d.w + dx] = m[y * L.w + x];
  }
  return out;
}
/** A document-sized mask cropped to a layer's own rectangle. */
function maskDocToLayer(m, L) {
  const d = S.doc, out = new Uint8Array(L.w * L.h);
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const dx = x + L.x, dy = y + L.y;
    if (dx >= 0 && dy >= 0 && dx < d.w && dy < d.h) out[y * L.w + x] = m[dy * d.w + dx];
  }
  return out;
}
function layerRect(L) { return { x0: L.x, y0: L.y, x1: L.x + L.w, y1: L.y + L.h }; }
function clearCov(box) {
  const w = S.covW; if (!box) return;
  for (let y = box.y0; y <= box.y1; y++) S.cov.fill(0, y * w + box.x0, y * w + box.x1 + 1);
}
function unionBox(a, b) { return a ? { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) } : Object.assign({}, b); }

/* ---------------- image IO ---------------- */
async function decodeImage(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch (e) {
    bmp = await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { res(im); }; im.onerror = () => rej(new Error('No se pudo leer la imagen')); im.src = u; });
  }
  const w = bmp.width || bmp.naturalWidth, hh = bmp.height || bmp.naturalHeight;
  if (w > MAX_DIM || hh > MAX_DIM) throw new Error('La imagen mide ' + w + '×' + hh + ' px. El máximo es ' + MAX_DIM + '×' + MAX_DIM + '.');
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
  if (bmp.close) bmp.close();
  return { w, h: hh, data: g.getImageData(0, 0, w, hh).data };
}
function dataToCanvas(data, w, hh) {
  const c = document.createElement('canvas'); c.width = w; c.height = hh; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), w, hh), 0, 0); return c;
}
function rasterizePathLayer(L) {
  if (!L || !L.path) return;
  const c = document.createElement('canvas'); c.width = L.w; c.height = L.h;
  const g = c.getContext('2d');
  if (L.path.points && L.path.points.length >= 2) {
    g.beginPath();
    L.path.points.forEach((p, i) => { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
    if (L.path.closed) g.closePath();
    g.globalAlpha = L.path.opacity === undefined ? 1 : L.path.opacity;
    if (L.path.closed && L.path.fill) { g.fillStyle = L.path.fill; g.fill(); }
    if (L.path.stroke && L.path.strokeWidth > 0) { g.strokeStyle = L.path.stroke; g.lineWidth = L.path.strokeWidth; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
  }
  L.data = g.getImageData(0, 0, L.w, L.h).data;
  L.data16 = null; L.depth = 8;
}
function newPathLayer(name) {
  const d = S.doc; if (!d) return null;
  const L = d.addLayer(name || 'Trazado');
  L.path = { points: [], closed: false, fill: fgHex(), stroke: bgHex(), strokeWidth: S.opts.pathWidth || 2, opacity: 1, name: L.name };
  S.pathLayer = L.id;
  return L;
}
function bytesToB64(bytes) {
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s);
}
function b64ToBytes(s) {
  const raw = atob(s || ''), out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i); return out;
}
function canvasBlob(c, type, q) { return new Promise((res) => c.toBlob(res, type, q)); }

async function saveBlob(name, blob) {
  let dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({ filename: name, data: blob }); toast('Guardado: ' + name); return; }
    catch (e) { if (e && e.code === 'declined') return; if (e && e.code === 'too_large') { toast('El archivo es demasiado grande para guardarlo aquí.'); return; } }
  }
  const u = URL.createObjectURL(blob), a = h('a', { href: u, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  toast('Guardado: ' + name);
}
function baseName() { return (S.name || 'imagen').replace(/\.(pintora\.json|json|png|jpe?g|webp|xcf)$/i, ''); }

async function exportImage(fmt, quality, bg, delay) {
  const d = S.doc; flushDirty();
  if (fmt === 'tiff16') {
    const buf = PintoraFormats.writeTiff16(E.flatten16(d.layers, d.w, d.h), d.w, d.h);
    await saveBlob(baseName() + '.tiff', new Blob([buf], { type: 'image/tiff' })); return;
  }
  if (fmt === 'tiff') {
    const buf = PintoraFormats.writeTiff(E.flattenOn(d.layers, d.w, d.h), d.w, d.h);
    await saveBlob(baseName() + '.tiff', new Blob([buf], { type: 'image/tiff' })); return;
  }
  if (fmt === 'gif') {
    const frames = d.layers.filter((l) => l.visible).map((l) => E.composite([l], d.w, d.h, new Uint8ClampedArray(d.w * d.h * 4)));
    if (!frames.length) frames.push(E.flattenOn(d.layers, d.w, d.h));
    const bytes = PintoraFormats.writeGif(frames, d.w, d.h, delay);
    await saveBlob(baseName() + '.gif', new Blob([bytes], { type: 'image/gif' })); return;
  }
  const data = fmt === 'jpeg' ? E.flattenOn(d.layers, d.w, d.h, bg) : S.flat;
  const c = dataToCanvas(data, d.w, d.h);
  const mime = fmt === 'jpeg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png';
  const blob = await canvasBlob(c, mime, quality);
  if (!blob) { toast('Este navegador no puede exportar ' + fmt.toUpperCase() + '.'); return; }
  await saveBlob(baseName() + '.' + (fmt === 'jpeg' ? 'jpg' : fmt), blob);
}

function setDepth(bits) {
  const d = S.doc; if (!d) return;
  if (d.setDepth(bits)) { docChanged(); toast(bits === 16 ? 'Documento de 16 bits por canal' : 'Documento de 8 bits por canal'); }
}

async function convertIccFile(file) {
  const buffer = await file.arrayBuffer();
  const profile = ICC.parseProfile(buffer);
  if (!profile.supported) throw new Error('El perfil ICC usa una transformación LUT no compatible.');
  const d = S.doc; if (!d) return;
  d.checkpoint('Convertir perfil ICC');
  for (const L of d.layers) {
    if (L.data16) { L.data16 = ICC.convert16(L.data16, L.w, L.h, profile); L.data = E.to8(L.data16); L.depth = d.depth; }
    else { L.data = ICC.convertRGBA(L.data, L.w, L.h, profile); L.data16 = null; L.depth = 8; }
  }
  d.icc = { name: profile.name, converted: true };
  d.colorSpace = 'sRGB';
  docChanged();
  toast('Perfil ICC convertido: ' + profile.name);
}

function exportSvg() {
  const d = S.doc; if (!d) return;
  const parts = [];
  for (const L of d.layers) {
    if (!L.visible || L.opacity <= 0) continue;
    if (L.path && L.path.points && L.path.points.length >= 2) {
      parts.push('<g transform="translate(' + L.x + ' ' + L.y + ')" opacity="' + L.opacity + '">' + Paths.toSvgElement(L.path) + '</g>');
    } else {
      const url = dataToCanvas(L.data, L.w, L.h).toDataURL('image/png');
      parts.push('<image x="' + L.x + '" y="' + L.y + '" width="' + L.w + '" height="' + L.h + '" opacity="' + L.opacity + '" href="' + url + '"/>');
    }
  }
  const svg = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + d.w + '" height="' + d.h + '" viewBox="0 0 ' + d.w + ' ' + d.h + '">\n' + parts.join('\n') + '\n</svg>\n';
  return saveBlob(baseName() + '.svg', new Blob([svg], { type: 'image/svg+xml' }));
}

/* project file: JSON with PNG layers (v2 adds selection, name and colours) */
function maskToDataURL(mask, w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < mask.length; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 255; data[i * 4 + 3] = mask[i]; }
  return dataToCanvas(data, w, h).toDataURL('image/png');
}
function projectData() {
  const d = S.doc, layers = [];
  for (const l of d.layers) {
    const o = { name: l.name, visible: l.visible, opacity: l.opacity, mode: l.mode, lockAlpha: l.lockAlpha, maskOn: l.maskOn, text: l.text, path: l.path || null, x: l.x, y: l.y, w: l.w, h: l.h };
    if (l.data16) o.data16 = bytesToB64(new Uint8Array(l.data16.buffer, l.data16.byteOffset, l.data16.byteLength));
    o.png = dataToCanvas(l.data, l.w, l.h).toDataURL('image/png');
    if (l.mask) {
      const m = new Uint8ClampedArray(l.w * l.h * 4);
      for (let i = 0; i < l.mask.length; i++) { m[i * 4] = m[i * 4 + 1] = m[i * 4 + 2] = l.mask[i]; m[i * 4 + 3] = 255; }
      o.mask = dataToCanvas(m, l.w, l.h).toDataURL('image/png');
    }
    layers.push(o);
  }
  return {
    format: 'pintora', version: 4, w: d.w, h: d.h, active: d.indexOf(d.activeId), name: S.name, depth: d.depth || 8, icc: d.icc || null,
    fg: { r: S.fg.r, g: S.fg.g, b: S.fg.b }, bg: { r: S.bg.r, g: S.bg.g, b: S.bg.b },
    selection: d.selection ? maskToDataURL(d.selection, d.w, d.h) : null, layers
  };
}
async function saveProject() {
  await saveBlob(baseName() + '.pintora.json', new Blob([JSON.stringify(projectData())], { type: 'application/json' }));
  S.modified = false;
  void idbDel(AUTOSAVE_KEY);
  refreshStatus();
}
async function imageFromURL(url) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Proyecto dañado')); im.src = url; });
}
async function loadProject(text, name) {
  const p = JSON.parse(text);
  if (p.format !== 'pintora' || !Array.isArray(p.layers) || !p.w || !p.h) throw new Error('No es un proyecto de Pintora');
  if (p.w > MAX_DIM || p.h > MAX_DIM) throw new Error('El proyecto supera el tamaño máximo.');
  const doc = new E.Doc(p.w, p.h); doc.depth = p.depth === 16 ? 16 : 8; doc.icc = p.icc || null;
  for (const o of p.layers) {
    const lw = o.w || p.w, lh = o.h || p.h, lx = o.x || 0, ly = o.y || 0;
    if (!(lw >= 1 && lh >= 1) || lw > MAX_DIM || lh > MAX_DIM) throw new Error('Una capa del proyecto tiene un tamaño no válido.');
    const l = E.makeLayer(lw, lh, o.name, null, lx, ly);
    const im = await imageFromURL(o.png), c = document.createElement('canvas'); c.width = lw; c.height = lh;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); l.data = g.getImageData(0, 0, lw, lh).data;
    if (o.data16) { const raw = b64ToBytes(o.data16); l.data16 = new Uint16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2); l.depth = 16; }
    l.path = o.path || null;
    Object.assign(l, { visible: o.visible !== false, opacity: o.opacity === undefined ? 1 : o.opacity, mode: E.MODES[o.mode] ? o.mode : 'normal', lockAlpha: !!o.lockAlpha, maskOn: o.maskOn !== false, text: o.text || null });
    if (o.mask) { const mi = await imageFromURL(o.mask); g.clearRect(0, 0, lw, lh); g.drawImage(mi, 0, 0); const md = g.getImageData(0, 0, lw, lh).data; l.mask = new Uint8Array(lw * lh); for (let i = 0; i < l.mask.length; i++) l.mask[i] = md[i * 4]; }
    doc.layers.push(l);
  }
  if (!doc.layers.length) throw new Error('El proyecto no tiene capas');
  doc.activeId = doc.layers[clamp(p.active | 0, 0, doc.layers.length - 1)].id;
  if (p.selection) {
    const si = await imageFromURL(p.selection), sc = document.createElement('canvas'); sc.width = p.w; sc.height = p.h;
    const sg = sc.getContext('2d', { willReadFrequently: true }); sg.drawImage(si, 0, 0);
    const sd = sg.getImageData(0, 0, p.w, p.h).data, sm = new Uint8Array(p.w * p.h);
    for (let i = 0; i < sm.length; i++) sm[i] = sd[i * 4 + 3];
    doc.selection = E.normalizeMask(sm);
  }
  setDoc(doc, p.name || (name || 'Proyecto').replace(/\.pintora\.json$|\.json$/i, ''));
  if (p.fg) S.fg = { r: p.fg.r, g: p.fg.g, b: p.fg.b };
  if (p.bg) S.bg = { r: p.bg.r, g: p.bg.g, b: p.bg.b };
  syncHsvFrom(S.fg); refreshColor(); refreshAll(); schedule();
  S.modified = false;
}

/* ---------------- autosave (IndexedDB) ---------------- */
const AUTOSAVE_DB = 'pintora', AUTOSAVE_STORE = 'sesiones', AUTOSAVE_KEY = 'autoguardado';
function idbOpen() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') { rej(new Error('IndexedDB no disponible')); return; }
    const req = indexedDB.open(AUTOSAVE_DB, 1);
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(AUTOSAVE_STORE)) db.createObjectStore(AUTOSAVE_STORE); };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
function idbDo(mode, fn) {
  return idbOpen().then((db) => new Promise((res, rej) => {
    const tx = db.transaction(AUTOSAVE_STORE, mode), req = fn(tx.objectStore(AUTOSAVE_STORE));
    tx.oncomplete = () => { db.close(); res(req.result); };
    tx.onerror = () => { db.close(); rej(tx.error); };
    tx.onabort = () => { db.close(); rej(tx.error); };
  }));
}
const idbPut = (key, value) => idbDo('readwrite', (s) => s.put(value, key));
const idbGet = (key) => idbDo('readonly', (s) => s.get(key));
const idbDel = (key) => idbDo('readwrite', (s) => s.delete(key));
let autosaveTimer = 0, autosaveBusy = false, autosaveAgain = false;
function queueAutosave() {
  if (!S.doc || !S.modified) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => { void runAutosave(); }, 2500);
}
async function runAutosave() {
  if (!S.doc || !S.modified) return;
  if (autosaveBusy) { autosaveAgain = true; return; }
  autosaveBusy = true;
  try { await idbPut(AUTOSAVE_KEY, { at: Date.now(), name: S.name, json: JSON.stringify(projectData()) }); }
  catch (e) { /* almacenamiento no disponible */ }
  autosaveBusy = false;
  if (autosaveAgain) { autosaveAgain = false; queueAutosave(); }
}
async function checkAutosave() {
  let rec = null;
  try { rec = await idbGet(AUTOSAVE_KEY); } catch (e) { return; }
  if (!rec || !rec.json) return;
  let when = '';
  try { when = new Date(rec.at).toLocaleString(); } catch (e) { /* fecha inválida */ }
  dialog({
    title: 'Recuperar la sesión anterior', dismiss: false,
    fields: [{ type: 'info', text: 'Hay cambios sin guardar' + (when ? ' de ' + when : '') + ' (' + (rec.name || 'Sin título') + ').' }],
    ok: 'Restaurar', cancel: 'Descartar',
    onOk: async () => {
      try {
        await loadProject(rec.json, rec.name || 'Recuperado');
        S.modified = true; refreshStatus(); void idbDel(AUTOSAVE_KEY); toast('Sesión restaurada');
      } catch (e) { toast('No se pudo restaurar: ' + (e.message || e)); }
    },
    onCancel: () => { void idbDel(AUTOSAVE_KEY); }
  });
}
document.addEventListener('visibilitychange', () => { if (document.hidden) void runAutosave(); });

async function openFiles(files, asLayers) {
  files = Array.from(files); if (!files.length) return;
  for (const f of files) {
    try {
      if (/\.json$/i.test(f.name) || f.type === 'application/json') {
        if (!(await confirmDiscard())) return;
        await loadProject(await f.text(), f.name); toast('Proyecto abierto: ' + f.name); continue;
      }
      if (/\.psd$/i.test(f.name)) { await openPsd(f, asLayers); continue; }
      if (/\.xcf$/i.test(f.name)) { await openXcf(f, asLayers); continue; }
      if (/\.tiff?$/i.test(f.name)) { await openTiff(f, asLayers); continue; }
      if (/\.gif$/i.test(f.name)) { await openGif(f, asLayers); continue; }
      const im = await decodeImage(f);
      if (asLayers && S.doc) addImageAsLayer(im, f.name);
      else { if (!(await confirmDiscard())) return; openAsDocument(im, f.name); }
    } catch (e) { toast(e.message || 'No se pudo abrir ' + f.name); }
  }
}
function openAsDocument(im, name) {
  const doc = new E.Doc(im.w, im.h), l = E.makeLayer(im.w, im.h, 'Fondo'); l.data = new Uint8ClampedArray(im.data);
  if (im.data16) { l.data16 = im.data16; l.depth = 16; doc.depth = 16; }
  doc.layers.push(l); doc.activeId = l.id; setDoc(doc, name.replace(/\.[a-z0-9]+$/i, '')); S.modified = false;
  toast(name + ' · ' + im.w + '×' + im.h + ' px' + (im.depth === 16 ? ' · 16 bits' : ''));
}
async function openPsd(file, asLayers) {
  const psd = PintoraFormats.readPsd(await file.arrayBuffer());
  if (!psd.w || !psd.h || psd.w > MAX_DIM || psd.h > MAX_DIM) throw new Error('El PSD no tiene un tamaño válido.');
  const valid = (l) => l.w >= 1 && l.h >= 1 && l.w <= MAX_DIM && l.h <= MAX_DIM;
  if (asLayers && S.doc) {
    const d = S.doc; let n = 0;
    for (const l of psd.layers) {
      if (!valid(l)) continue;
      const L = d.addLayerFromData(l.name, new Uint8ClampedArray(l.data), 'Abrir PSD como capa', l.left || 0, l.top || 0, l.w, l.h);
      L.opacity = l.opacity; L.visible = l.visible; L.mode = l.mode; n++;
    }
    if (!n) { toast('El PSD no tiene capas de mapa de bits válidas.'); return; }
    docChanged();
    return;
  }
  if (!(await confirmDiscard())) return;
  const doc = new E.Doc(psd.w, psd.h);
  for (const l of psd.layers) {
    if (!valid(l)) continue;
    const L = E.makeLayer(l.w, l.h, l.name, null, l.left || 0, l.top || 0);
    L.data = new Uint8ClampedArray(l.data);
    L.opacity = l.opacity; L.visible = l.visible; L.mode = l.mode;
    doc.layers.push(L);
  }
  if (!doc.layers.length && psd.composite) {
    const L = E.makeLayer(psd.w, psd.h, 'Fondo'); L.data = psd.composite.data; doc.layers.push(L);
  }
  if (!doc.layers.length) throw new Error('El PSD no tiene capas de mapa de bits.');
  doc.activeId = doc.layers[doc.layers.length - 1].id;
  setDoc(doc, file.name.replace(/\.psd$/i, '')); S.modified = false;
  toast('PSD: ' + doc.layers.length + ' capas · ' + psd.w + '×' + psd.h + ' px');
}
async function openDecoded(im, name, asLayers) {
  if (asLayers && S.doc) { addImageAsLayer(im, name); return; }
  if (!(await confirmDiscard())) return;
  openAsDocument(im, name);
}
async function openTiff(file, asLayers) {
  const buffer = await file.arrayBuffer();
  const deep = PintoraFormats.readTiff16(buffer);
  await openDecoded(deep && deep.depth === 16 ? deep : PintoraFormats.readTiff(buffer), file.name, asLayers);
}
async function openGif(file, asLayers) {
  const gif = PintoraFormats.readGif(await file.arrayBuffer());
  await openDecoded({ w: gif.w, h: gif.h, data: gif.data }, file.name, asLayers);
  if (gif.frames > 1) toast('GIF: abierto el primer fotograma de ' + gif.frames);
}
async function savePsd() {
  const d = S.doc; flushDirty();
  const buffer = PintoraFormats.writePsd({
    w: d.w, h: d.h, composite: E.flattenOn(d.layers, d.w, d.h),
    layers: d.layers.map((l) => ({ name: l.name, data: l.data, opacity: l.opacity, visible: l.visible, mode: l.mode, x: l.x, y: l.y, w: l.w, h: l.h }))
  });
  await saveBlob(baseName() + '.psd', new Blob([buffer], { type: 'image/vnd.adobe.photoshop' }));
}
async function openXcf(file, asLayers) {
  const xcf = await PintoraFormats.readXcf(await file.arrayBuffer(), PintoraLibs.xcf);
  if (!xcf.w || !xcf.h || xcf.w > MAX_DIM || xcf.h > MAX_DIM) throw new Error('El XCF no tiene un tamaño válido.');
  const valid = (l) => l.w >= 1 && l.h >= 1 && l.w <= MAX_DIM && l.h <= MAX_DIM;
  if (asLayers && S.doc) {
    let n = 0; const d = S.doc;
    for (const l of xcf.layers) {
      if (!valid(l)) continue;
      const L = d.addLayerFromData(l.name, new Uint8ClampedArray(l.data), 'Abrir XCF como capa', l.left || 0, l.top || 0, l.w, l.h);
      L.opacity = l.opacity; L.visible = l.visible; L.mode = l.mode; n++;
    }
    if (!n) { toast('El XCF no tiene capas RGBA válidas.'); return; }
    docChanged(); return;
  }
  if (!(await confirmDiscard())) return;
  const doc = new E.Doc(xcf.w, xcf.h);
  for (const l of xcf.layers) {
    if (!valid(l)) continue;
    const L = E.makeLayer(l.w, l.h, l.name, null, l.left || 0, l.top || 0);
    L.data = new Uint8ClampedArray(l.data); L.opacity = l.opacity; L.visible = l.visible; L.mode = l.mode;
    doc.layers.push(L);
  }
  if (!doc.layers.length) throw new Error('El XCF no tiene capas RGBA.');
  doc.activeId = doc.layers[doc.layers.length - 1].id;
  setDoc(doc, file.name.replace(/\.xcf$/i, '')); S.modified = false;
  toast('XCF: ' + doc.layers.length + ' capas · ' + xcf.w + '×' + xcf.h + ' px');
}
async function saveXcf() {
  const d = S.doc; flushDirty();
  const buffer = PintoraFormats.writeXcf({
    w: d.w, h: d.h, layers: d.layers.map((l) => ({ name: l.name, data: l.data, opacity: l.opacity, visible: l.visible, mode: l.mode, x: l.x, y: l.y, w: l.w, h: l.h, lockAlpha: l.lockAlpha }))
  });
  await saveBlob(baseName() + '.xcf', new Blob([buffer], { type: 'image/x-xcf' }));
}
function addImageAsLayer(im, name) {
  const d = S.doc, ox = Math.round((d.w - im.w) / 2), oy = Math.round((d.h - im.h) / 2);
  d.addLayerFromData((name || 'Capa').replace(/\.[a-z0-9]+$/i, ''), new Uint8ClampedArray(im.data), 'Abrir como capa', ox, oy, im.w, im.h);
  docChanged();
}
function confirmDiscard() {
  return new Promise((res) => {
    if (!S.doc || !S.modified || !S.doc.undoStack.length) return res(true);
    dialog({ title: 'Descartar cambios', fields: [{ type: 'info', text: 'La imagen actual tiene cambios sin guardar. Si continúas se perderán.' }], ok: 'Descartar', onOk: () => res(true), onCancel: () => res(false) });
  });
}

/* ---------------- clipboard ---------------- */
let pasteKeyAt = 0;
function clipBlob(clip) {
  return new Promise((res) => dataToCanvas(clip.data, clip.w, clip.h).toBlob(res, 'image/png'));
}
/** Copy the internal clip to the system clipboard so other apps can paste it. */
async function writeClipToSystem(clip) {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined' || !navigator.clipboard.write) return false;
    const blob = await clipBlob(clip);
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch (e) { return false; }
}
/** Read an image from the system clipboard and add it as a new layer. */
async function pasteImageFromSystem() {
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) return false;
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith('image/'));
      if (!type) continue;
      const blob = await item.getType(type);
      const im = await decodeImage(new File([blob], 'pegado.png', { type }));
      if (!S.doc) return false;
      addImageAsLayer(im, 'Pegado');
      return true;
    }
  } catch (e) { /* permiso denegado o API no disponible */ }
  return false;
}
/** Internal clip first, then the system clipboard (or the reverse with forceSystem). */
async function pasteSmart(forceSystem) {
  if (!forceSystem && S.clip) { pasteClip(); return true; }
  if (await pasteImageFromSystem()) return true;
  if (S.clip) { pasteClip(); return true; }
  return false;
}
function copySelection(cut) {
  const d = S.doc, L = d.active; if (!L) return false;
  const sel = d.selection, b0 = sel ? E.maskBounds(sel, d.w, d.h) : { x0: 0, y0: 0, x1: d.w, y1: d.h };
  if (!b0) return false;
  const b = { x0: Math.max(b0.x0, L.x), y0: Math.max(b0.y0, L.y), x1: Math.min(b0.x1, L.x + L.w), y1: Math.min(b0.y1, L.y + L.h) };
  if (b.x1 <= b.x0 || b.y1 <= b.y0) { toast('La selección no toca la capa activa.'); return false; }
  const w = b.x1 - b.x0, hh = b.y1 - b.y0, out = new Uint8ClampedArray(w * hh * 4);
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const dx = x + b.x0, dy = y + b.y0, p = dy * d.w + dx, si = ((dy - L.y) * L.w + (dx - L.x)) * 4, di = (y * w + x) * 4, m = sel ? sel[p] / 255 : 1;
    out[di] = L.data[si]; out[di + 1] = L.data[si + 1]; out[di + 2] = L.data[si + 2]; out[di + 3] = L.data[si + 3] * m;
  }
  S.clip = { w, h: hh, x: b.x0, y: b.y0, data: out };
  void writeClipToSystem(S.clip);
  if (cut) clearSelection(true);
  toast(cut ? 'Cortado' : 'Copiado'); return true;
}
function clearSelection(isCut) {
  const d = S.doc, L = d.active; if (!L) return;
  if (L.lockAlpha && !isCut) { toast('La transparencia de esta capa está bloqueada.'); return; }
  d.beginOp(isCut ? 'Cortar' : 'Borrar', L, 'data'); const sel = d.selection;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const dx = x + L.x, dy = y + L.y, p = dy * d.w + dx;
    if (dx < 0 || dy < 0 || dx >= d.w || dy >= d.h) continue;
    const m = sel ? sel[p] : 255; if (m) { const i = (y * L.w + x) * 4; L.data[i + 3] = L.data[i + 3] * (255 - m) / 255; }
  }
  docChanged();
}
function pasteClip(clip, asNew) {
  const d = S.doc; clip = clip || S.clip; if (!clip) { toast('El portapapeles está vacío.'); return; }
  d.addLayerFromData('Pegado', new Uint8ClampedArray(clip.data), 'Pegar', clip.x, clip.y, clip.w, clip.h); docChanged(); void asNew;
}
document.addEventListener('paste', async (e) => {
  if (e.target && /input|textarea/i.test(e.target.tagName)) return;
  if (performance.now() - pasteKeyAt < 600) { e.preventDefault(); return; } // Ctrl+V ya lo resolvió
  const items = e.clipboardData ? Array.from(e.clipboardData.items) : [];
  const img = items.find((i) => i.type.startsWith('image/'));
  if (!S.doc) return;
  if (img) { e.preventDefault(); try { const im = await decodeImage(img.getAsFile()); addImageAsLayer(im, 'Pegado'); } catch (err) { toast(err.message); } }
  else if (S.clip) { e.preventDefault(); pasteClip(); }
  else if (await pasteImageFromSystem()) e.preventDefault();
});

/* ---------------- text rasteriser ---------------- */
function measureText(t) {
  const c = document.createElement('canvas').getContext('2d'); c.font = fontString(t);
  const lines = String(t.text).split('\n'); let mw = 0; const widths = lines.map((l) => { const w = c.measureText(l).width; if (w > mw) mw = w; return w; });
  return { lines, widths, w: mw, h: lines.length * t.size * t.lh };
}
function fontString(t) { return (t.italic ? 'italic ' : '') + (t.bold ? '700 ' : '400 ') + t.size + 'px ' + t.font; }
function renderText(t, w, hh) {
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const g = c.getContext('2d', { willReadFrequently: true }); g.font = fontString(t); g.fillStyle = t.color; g.textBaseline = 'top';
  const m = measureText(t);
  m.lines.forEach((line, i) => {
    const x = t.x + (t.align === 'center' ? (m.w - m.widths[i]) / 2 : t.align === 'right' ? m.w - m.widths[i] : 0);
    g.fillText(line, x, t.y + i * t.size * t.lh);
  });
  return g.getImageData(0, 0, w, hh).data;
}

/* ---------------- sample document ---------------- */
function buildSample() {
  const W = 960, H = 600, doc = new E.Doc(W, H);
  const sky = doc.addLayer('Cielo', { r: 0, g: 0, b: 0 });
  E.fillGradient(sky.data, W, H, null, 0, 0, 0, H * 0.85, 'linear', { r: 28, g: 43, b: 82, a: 1 }, { r: 240, g: 178, b: 122, a: 1 }, 1);
  const sun = doc.addLayer('Sol', null); sun.mode = 'screen';
  E.fillGradient(sun.data, W, H, null, 640, 372, 640, 120, 'radial', { r: 255, g: 238, b: 190, a: 1 }, { r: 255, g: 150, b: 60, a: 0 }, 1);
  const ridge = (base, amp, f1, f2, ph) => { const pts = [[0, H], [0, base]]; for (let x = 0; x <= W; x += 6) pts.push([x, base + Math.sin(x * f1 + ph) * amp + Math.sin(x * f2 + ph * 2) * amp * 0.45]); pts.push([W, H]); return pts; };
  const far = doc.addLayer('Colinas lejanas', null);
  E.fillMask(far.data, W, H, E.polygonMask(W, H, ridge(400, 34, 0.008, 0.021, 1.2)), null, { r: 78, g: 74, b: 108 }, 1, false);
  const near = doc.addLayer('Colinas cercanas', null);
  E.fillMask(near.data, W, H, E.polygonMask(W, H, ridge(470, 42, 0.006, 0.017, 3.4)), null, { r: 22, g: 30, b: 34 }, 1, false);
  const grain = doc.addLayer('Grano', { r: 128, g: 128, b: 128 }); grain.mode = 'overlay'; grain.opacity = 0.35;
  grain.data = E.applyFilter('noise', grain.data, W, H, { amount: 55, mono: true, seed: 7 });
  doc.activeId = near.id; doc.undoStack.length = 0; doc.redoStack.length = 0;
  return doc;
}
