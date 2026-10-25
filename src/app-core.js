/* ===== Pintora app core: state, canvas view, rendering, files ===== */
const E = PintoraEngine;
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
  bucket: '<path d="M5 11l7-7 7 7-6 6a2 2 0 0 1-2.8 0L5 13.8a2 2 0 0 1 0-2.8z"/><path d="M5 11h14M20 16c1 1.5 1.5 2.5 1.5 3.2a1.5 1.5 0 0 1-3 0c0-.7.5-1.7 1.5-3.2z"/>',
  gradient: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v14M12 5v14M16 5v14" stroke-opacity=".5"/>',
  picker: '<path d="M14.5 4.5l5 5M17 7l-9 9-1 3 3-1 9-9"/><path d="M15 3.5a2 2 0 0 1 3 0l2.5 2.5a2 2 0 0 1 0 3"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
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
  tool: 'paintbrush', prevTool: null,
  view: { zoom: 1, ox: 0, oy: 0 }, hover: null, spaceDown: false,
  flat: null, flatImg: null, docCanvas: null, docCtx: null, dirty: null, preview: null, overlayFn: null,
  cov: null, covW: 0, covH: 0,
  clip: null, lastFilter: null, showGrid: false, gridSize: 32, showSel: true,
  antsPath: null, antsSel: undefined, antOffset: 0,
  theme: 'system', modified: false,
  opts: {
    size: 24, hardness: 0.6, opacity: 1, spacing: 0.12, flow: 0.25, exposure: 0.35,
    selmode: 'replace', threshold: 20, sampleMerged: false, fillMode: 'similar', gradShape: 'linear', gradColors: 'fgbg',
    moveTarget: 'layer', dbMode: 'dodge', dbRange: 'midtones', aa: true, pickSample: 'merged', dyn: true
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
  refreshAll();
}
function refreshAll() { refreshLayers(); refreshHistory(); refreshStatus(); refreshUndoButtons(); }

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
function ensureCov() {
  const d = S.doc;
  if (!S.cov || S.covW !== d.w || S.covH !== d.h) { S.cov = new Float32Array(d.w * d.h); S.covW = d.w; S.covH = d.h; }
  return S.cov;
}
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
function baseName() { return (S.name || 'imagen').replace(/\.(pintora\.json|json|png|jpe?g|webp)$/i, ''); }

async function exportImage(fmt, quality, bg) {
  const d = S.doc; flushDirty();
  const data = fmt === 'jpeg' ? E.flattenOn(d.layers, d.w, d.h, bg) : S.flat;
  const c = dataToCanvas(data, d.w, d.h);
  const mime = fmt === 'jpeg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png';
  const blob = await canvasBlob(c, mime, quality);
  if (!blob) { toast('Este navegador no puede exportar ' + fmt.toUpperCase() + '.'); return; }
  await saveBlob(baseName() + '.' + (fmt === 'jpeg' ? 'jpg' : fmt), blob);
}

/* project file: JSON with PNG layers */
async function saveProject() {
  const d = S.doc, layers = [];
  for (const l of d.layers) {
    const o = { name: l.name, visible: l.visible, opacity: l.opacity, mode: l.mode, lockAlpha: l.lockAlpha, maskOn: l.maskOn, text: l.text };
    o.png = dataToCanvas(l.data, d.w, d.h).toDataURL('image/png');
    if (l.mask) { const m = new Uint8ClampedArray(d.w * d.h * 4); for (let i = 0; i < l.mask.length; i++) { m[i * 4] = m[i * 4 + 1] = m[i * 4 + 2] = l.mask[i]; m[i * 4 + 3] = 255; } o.mask = dataToCanvas(m, d.w, d.h).toDataURL('image/png'); }
    layers.push(o);
  }
  const act = d.indexOf(d.activeId);
  const json = JSON.stringify({ format: 'pintora', version: 1, w: d.w, h: d.h, active: act, layers });
  await saveBlob(baseName() + '.pintora.json', new Blob([json], { type: 'application/json' }));
  S.modified = false;
}
async function imageFromURL(url) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Proyecto dañado')); im.src = url; });
}
async function loadProject(text, name) {
  const p = JSON.parse(text);
  if (p.format !== 'pintora' || !Array.isArray(p.layers) || !p.w || !p.h) throw new Error('No es un proyecto de Pintora');
  if (p.w > MAX_DIM || p.h > MAX_DIM) throw new Error('El proyecto supera el tamaño máximo.');
  const doc = new E.Doc(p.w, p.h);
  for (const o of p.layers) {
    const l = E.makeLayer(p.w, p.h, o.name);
    const im = await imageFromURL(o.png), c = document.createElement('canvas'); c.width = p.w; c.height = p.h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); l.data = g.getImageData(0, 0, p.w, p.h).data;
    Object.assign(l, { visible: o.visible !== false, opacity: o.opacity === undefined ? 1 : o.opacity, mode: E.MODES[o.mode] ? o.mode : 'normal', lockAlpha: !!o.lockAlpha, maskOn: o.maskOn !== false, text: o.text || null });
    if (o.mask) { const mi = await imageFromURL(o.mask); g.clearRect(0, 0, p.w, p.h); g.drawImage(mi, 0, 0); const md = g.getImageData(0, 0, p.w, p.h).data; l.mask = new Uint8Array(p.w * p.h); for (let i = 0; i < l.mask.length; i++) l.mask[i] = md[i * 4]; }
    doc.layers.push(l);
  }
  if (!doc.layers.length) throw new Error('El proyecto no tiene capas');
  doc.activeId = doc.layers[clamp(p.active | 0, 0, doc.layers.length - 1)].id;
  setDoc(doc, (name || 'Proyecto').replace(/\.pintora\.json$|\.json$/i, '')); S.modified = false;
}

async function openFiles(files, asLayers) {
  files = Array.from(files); if (!files.length) return;
  for (const f of files) {
    try {
      if (/\.json$/i.test(f.name) || f.type === 'application/json') {
        if (!(await confirmDiscard())) return;
        await loadProject(await f.text(), f.name); toast('Proyecto abierto: ' + f.name); continue;
      }
      const im = await decodeImage(f);
      if (asLayers && S.doc) addImageAsLayer(im, f.name);
      else { if (!(await confirmDiscard())) return; openAsDocument(im, f.name); }
    } catch (e) { toast(e.message || 'No se pudo abrir ' + f.name); }
  }
}
function openAsDocument(im, name) {
  const doc = new E.Doc(im.w, im.h), l = E.makeLayer(im.w, im.h, 'Fondo'); l.data = new Uint8ClampedArray(im.data);
  doc.layers.push(l); doc.activeId = l.id; setDoc(doc, name.replace(/\.[a-z0-9]+$/i, '')); S.modified = false;
  toast(name + ' · ' + im.w + '×' + im.h + ' px');
}
function addImageAsLayer(im, name) {
  const d = S.doc, data = new Uint8ClampedArray(d.w * d.h * 4), ox = Math.round((d.w - im.w) / 2), oy = Math.round((d.h - im.h) / 2);
  for (let y = 0; y < im.h; y++) {
    const ty = y + oy; if (ty < 0 || ty >= d.h) continue;
    for (let x = 0; x < im.w; x++) { const tx = x + ox; if (tx < 0 || tx >= d.w) continue; const si = (y * im.w + x) * 4, di = (ty * d.w + tx) * 4; data[di] = im.data[si]; data[di + 1] = im.data[si + 1]; data[di + 2] = im.data[si + 2]; data[di + 3] = im.data[si + 3]; }
  }
  d.addLayerFromData((name || 'Capa').replace(/\.[a-z0-9]+$/i, ''), data, 'Abrir como capa'); docChanged();
}
function confirmDiscard() {
  return new Promise((res) => {
    if (!S.doc || !S.modified || !S.doc.undoStack.length) return res(true);
    dialog({ title: 'Descartar cambios', fields: [{ type: 'info', text: 'La imagen actual tiene cambios sin guardar. Si continúas se perderán.' }], ok: 'Descartar', onOk: () => res(true), onCancel: () => res(false) });
  });
}

/* ---------------- clipboard ---------------- */
function copySelection(cut) {
  const d = S.doc, L = d.active; if (!L) return false;
  const sel = d.selection, b = sel ? E.maskBounds(sel, d.w, d.h) : { x0: 0, y0: 0, x1: d.w, y1: d.h };
  if (!b) return false;
  const w = b.x1 - b.x0, hh = b.y1 - b.y0, out = new Uint8ClampedArray(w * hh * 4);
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const p = (y + b.y0) * d.w + x + b.x0, si = p * 4, di = (y * w + x) * 4, m = sel ? sel[p] / 255 : 1;
    out[di] = L.data[si]; out[di + 1] = L.data[si + 1]; out[di + 2] = L.data[si + 2]; out[di + 3] = L.data[si + 3] * m;
  }
  S.clip = { w, h: hh, x: b.x0, y: b.y0, data: out };
  if (cut) clearSelection(true);
  toast(cut ? 'Cortado' : 'Copiado'); return true;
}
function clearSelection(isCut) {
  const d = S.doc, L = d.active; if (!L) return;
  if (L.lockAlpha && !isCut) { toast('La transparencia de esta capa está bloqueada.'); return; }
  d.beginOp(isCut ? 'Cortar' : 'Borrar', L, 'data'); const sel = d.selection;
  for (let p = 0; p < d.w * d.h; p++) { const m = sel ? sel[p] : 255; if (m) L.data[p * 4 + 3] = L.data[p * 4 + 3] * (255 - m) / 255; }
  docChanged();
}
function pasteClip(clip, asNew) {
  const d = S.doc; clip = clip || S.clip; if (!clip) { toast('El portapapeles está vacío.'); return; }
  const data = new Uint8ClampedArray(d.w * d.h * 4);
  const ox = clip.x, oy = clip.y;
  for (let y = 0; y < clip.h; y++) { const ty = y + oy; if (ty < 0 || ty >= d.h) continue; for (let x = 0; x < clip.w; x++) { const tx = x + ox; if (tx < 0 || tx >= d.w) continue; const si = (y * clip.w + x) * 4, di = (ty * d.w + tx) * 4; data[di] = clip.data[si]; data[di + 1] = clip.data[si + 1]; data[di + 2] = clip.data[si + 2]; data[di + 3] = clip.data[si + 3]; } }
  d.addLayerFromData('Pegado', data, 'Pegar'); docChanged(); void asNew;
}
document.addEventListener('paste', async (e) => {
  if (e.target && /input|textarea/i.test(e.target.tagName)) return;
  const items = e.clipboardData ? Array.from(e.clipboardData.items) : [];
  const img = items.find((i) => i.type.startsWith('image/'));
  if (img && S.doc) { e.preventDefault(); try { const im = await decodeImage(img.getAsFile()); addImageAsLayer(im, 'Pegado'); } catch (err) { toast(err.message); } }
  else if (S.clip && S.doc) { e.preventDefault(); pasteClip(); }
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
