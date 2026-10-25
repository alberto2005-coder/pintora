/* ===== Pintora tools + pointer input ===== */
const TOOLS = [
  { id: 'rect', name: 'Selección rectangular', key: 'R', icon: 'rect', opts: ['selmode'], hint: 'Arrastra. Mayús = cuadrado al arrastrar, Alt = desde el centro. Un clic sin arrastrar quita la selección.' },
  { id: 'ellipse', name: 'Selección elíptica', key: 'E', icon: 'ellipse', opts: ['selmode', 'aa'], hint: 'Arrastra. Mayús = círculo, Alt = desde el centro.' },
  { id: 'free', name: 'Selección libre', key: 'F', icon: 'free', opts: ['selmode'], hint: 'Haz clic para poner puntos o arrastra a mano alzada. Enter, doble clic o clic en el primer punto cierran.' },
  { id: 'fuzzy', name: 'Varita mágica', key: 'U', icon: 'fuzzy', opts: ['selmode', 'threshold', 'sampleMerged'], hint: 'Selecciona la zona contigua de color parecido.' },
  { id: 'bycolor', name: 'Selección por color', key: 'Shift+O', icon: 'bycolor', opts: ['selmode', 'threshold', 'sampleMerged'], hint: 'Selecciona todos los píxeles de color parecido.' },
  { id: 'move', name: 'Mover', key: 'M', icon: 'move', opts: ['moveTarget'], hint: 'Arrastra. Mayús limita a un eje.' },
  { id: 'crop', name: 'Recortar', key: 'Shift+C', icon: 'crop', opts: [], hint: 'Arrastra un marco, ajústalo y pulsa Enter.' },
  { id: 'pencil', name: 'Lápiz', key: 'N', icon: 'pencil', opts: ['size', 'opacity'], hint: 'Trazo duro, sin suavizado.' },
  { id: 'paintbrush', name: 'Pincel', key: 'P', icon: 'brush', opts: ['size', 'hardness', 'opacity', 'spacing', 'dyn'], hint: '[ y ] cambian el tamaño.' },
  { id: 'eraser', name: 'Borrador', key: 'Shift+E', icon: 'eraser', opts: ['size', 'hardness', 'opacity'], hint: 'Borra hacia transparente.' },
  { id: 'airbrush', name: 'Aerógrafo', key: 'A', icon: 'airbrush', opts: ['size', 'hardness', 'flow', 'opacity'], hint: 'La pintura se acumula mientras mantienes pulsado.' },
  { id: 'clone', name: 'Clonar', key: 'C', icon: 'clone', opts: ['size', 'hardness', 'opacity'], hint: 'Ctrl+clic fija el origen y luego pinta.' },
  { id: 'dodgeburn', name: 'Sobreexponer / subexponer', key: 'Shift+D', icon: 'dodge', opts: ['size', 'hardness', 'exposure', 'dbMode', 'dbRange'], hint: 'Aclara u oscurece. Ctrl invierte el modo.' },
  { id: 'bucket', name: 'Cubo de pintura', key: 'Shift+B', icon: 'bucket', opts: ['fillMode', 'threshold', 'sampleMerged', 'opacity'], hint: 'Ctrl+clic rellena con el color de fondo.' },
  { id: 'gradient', name: 'Degradado', key: 'G', icon: 'gradient', opts: ['gradShape', 'gradColors', 'opacity'], hint: 'Arrastra de inicio a fin.' },
  { id: 'picker', name: 'Cuentagotas', key: 'O', icon: 'picker', opts: ['pickSample'], hint: 'Clic = color de frente, Alt+clic = color de fondo.' },
  { id: 'text', name: 'Texto', key: 'T', icon: 'text', opts: [], hint: 'Haz clic en el lienzo para escribir. Clic sobre un texto lo edita.' },
  { id: 'zoom', name: 'Zoom', key: 'Z', icon: 'zoom', opts: [], hint: 'Clic acerca, Alt+clic aleja, arrastra para encuadrar un área.' },
  { id: 'hand', name: 'Mano', key: 'H', icon: 'hand', opts: [], hint: 'Arrastra para desplazar. También con la barra espaciadora.' }
];
const TOOL_BY_ID = {}; for (const t of TOOLS) TOOL_BY_ID[t.id] = t;

const OPTDEFS = {
  size: { label: 'Tamaño', type: 'range', min: 1, max: 400, step: 1, fmt: (v) => v + ' px' },
  hardness: { label: 'Dureza', type: 'range', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' },
  opacity: { label: 'Opacidad', type: 'range', min: 0.01, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' },
  spacing: { label: 'Espaciado', type: 'range', min: 0.02, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' },
  flow: { label: 'Flujo', type: 'range', min: 0.02, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' },
  exposure: { label: 'Exposición', type: 'range', min: 0.02, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' },
  selmode: { type: 'seg', options: [['replace', 'Nueva'], ['add', 'Añadir'], ['subtract', 'Restar'], ['intersect', 'Intersecar']] },
  aa: { label: 'Suavizar bordes', type: 'check' },
  threshold: { label: 'Umbral', type: 'range', min: 0, max: 255, step: 1, fmt: (v) => String(v) },
  sampleMerged: { label: 'Muestrear toda la imagen', type: 'check' },
  fillMode: { label: 'Rellenar', type: 'select', options: [['similar', 'Zona de color similar'], ['sel', 'Toda la selección']] },
  gradShape: { label: 'Forma', type: 'select', options: [['linear', 'Lineal'], ['bilinear', 'Bilineal'], ['radial', 'Radial'], ['conical', 'Cónico']] },
  gradColors: { label: 'Colores', type: 'select', options: [['fgbg', 'Frente → fondo'], ['fgtr', 'Frente → transparente']] },
  moveTarget: { label: 'Mover', type: 'seg', options: [['layer', 'Capa'], ['sel', 'Selección'], ['content', 'Contenido']] },
  dbMode: { type: 'seg', options: [['dodge', 'Aclarar'], ['burn', 'Oscurecer']] },
  dbRange: { label: 'Rango', type: 'select', options: [['shadows', 'Sombras'], ['midtones', 'Medios tonos'], ['highlights', 'Luces']] },
  pickSample: { label: 'Muestra', type: 'select', options: [['merged', 'Imagen completa'], ['layer', 'Capa activa']] },
  dyn: { label: 'Presión del lápiz', type: 'check' }
};

const boxToRect = (b) => ({ x0: b.x0, y0: b.y0, x1: b.x1 + 1, y1: b.y1 + 1 });
function selModeFrom(ev) { if (ev.ctrl && ev.shift) return 'intersect'; if (ev.shift) return 'add'; if (ev.ctrl) return 'subtract'; return S.opts.selmode; }
function commitSel(mask, label, mode) {
  const d = S.doc; d.setSelection(E.combineMasks(d.selection, mask, mode), label); S.modified = true; refreshAll(); schedule();
}
function abortOp(L, orig) { const d = S.doc; d.undoStack.pop(); if (orig) { L.data = orig.data; if (orig.mask) L.mask = orig.mask; } }
function insideDoc(x, y) { return x >= 0 && y >= 0 && x < S.doc.w && y < S.doc.h; }
function antsLine(ctx) { ctx.lineWidth = 1; ctx.setLineDash([]); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#000'; ctx.stroke(); ctx.setLineDash([]); }

/* ---------- rectangle / ellipse select ---------- */
function makeBoxSelect(kind) {
  let st = null;
  const rectFor = (s, ev) => {
    let x0 = s.x0, y0 = s.y0, x1 = ev.x, y1 = ev.y;
    if (ev.shift && !s.pressShift) { const m = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); x1 = x0 + (x1 < x0 ? -m : m); y1 = y0 + (y1 < y0 ? -m : m); }
    if (ev.alt) { x0 = s.x0 - (x1 - s.x0); y0 = s.y0 - (y1 - s.y0); }
    return { x0: Math.round(Math.min(x0, x1)), y0: Math.round(Math.min(y0, y1)), x1: Math.round(Math.max(x0, x1)), y1: Math.round(Math.max(y0, y1)) };
  };
  return {
    cursor: 'crosshair',
    down(ev) { st = { x0: ev.x, y0: ev.y, mode: selModeFrom(ev), pressShift: ev.shift, sx: ev.cx, sy: ev.cy, moved: false, r: null }; },
    move(ev) { if (!st) return; if (!st.moved && Math.hypot(ev.cx - st.sx, ev.cy - st.sy) < 3) return; st.moved = true; st.r = rectFor(st, ev); schedule(); },
    up() {
      const s = st; st = null; if (!s) return; const d = S.doc;
      if (!s.moved || !s.r || s.r.x1 - s.r.x0 < 1 || s.r.y1 - s.r.y0 < 1) { if (d.selection) { d.setSelection(null, 'Quitar selección'); refreshAll(); } schedule(); return; }
      const r = s.r, mask = kind === 'rect' ? E.rectMask(d.w, d.h, r.x0, r.y0, r.x1, r.y1) : E.ellipseMask(d.w, d.h, r.x0, r.y0, r.x1, r.y1, S.opts.aa);
      commitSel(mask, kind === 'rect' ? 'Selección rectangular' : 'Selección elíptica', s.mode);
    },
    cancel() { st = null; schedule(); },
    key(e) { if (e.key === 'Escape' && st) { st = null; schedule(); return true; } return false; },
    overlay(ctx) {
      if (!st || !st.r) return; const [ax, ay] = toScreen(st.r.x0, st.r.y0), [bx, by] = toScreen(st.r.x1, st.r.y1);
      ctx.beginPath(); if (kind === 'rect') ctx.rect(ax, ay, bx - ax, by - ay); else ctx.ellipse((ax + bx) / 2, (ay + by) / 2, Math.abs(bx - ax) / 2, Math.abs(by - ay) / 2, 0, 0, 7);
      antsLine(ctx);
      const w = st.r.x1 - st.r.x0, hh = st.r.y1 - st.r.y0; ctx.fillStyle = 'rgba(0,0,0,.65)'; const label = w + ' × ' + hh; ctx.font = '11px sans-serif'; const tw = ctx.measureText(label).width;
      ctx.fillRect(bx - tw - 12, by + 6, tw + 10, 18); ctx.fillStyle = '#fff'; ctx.fillText(label, bx - tw - 7, by + 19);
    }
  };
}

/* ---------- free select ---------- */
function makeFreeSelect() {
  let st = null;
  const close = () => {
    const s = st; st = null; schedule(); if (!s || s.pts.length < 3) return;
    commitSel(E.polygonMask(S.doc.w, S.doc.h, s.pts), 'Selección libre', s.mode);
  };
  return {
    cursor: 'crosshair',
    down(ev) {
      const now = performance.now();
      if (!st) { st = { pts: [[ev.x, ev.y]], mode: selModeFrom(ev), cursor: [ev.x, ev.y], down: true, drag: false, lx: ev.cx, ly: ev.cy, t: now }; return; }
      const [fx, fy] = toScreen(st.pts[0][0], st.pts[0][1]), [sx, sy] = toScreen(ev.x, ev.y);
      if (st.pts.length >= 3 && Math.hypot(fx - sx, fy - sy) < 9) { close(); return; }
      if (now - st.t < 320 && st.pts.length >= 3) { close(); return; }
      st.t = now; st.pts.push([ev.x, ev.y]); st.down = true; st.drag = false; st.lx = ev.cx; st.ly = ev.cy; schedule();
    },
    move(ev) {
      if (!st) return; st.cursor = [ev.x, ev.y];
      if (st.down && Math.hypot(ev.cx - st.lx, ev.cy - st.ly) > 4) { st.pts.push([ev.x, ev.y]); st.lx = ev.cx; st.ly = ev.cy; st.drag = true; }
      schedule();
    },
    hover(ev) { if (st) { st.cursor = [ev.x, ev.y]; schedule(); } },
    up() { if (st) { st.down = false; if (st.drag && st.pts.length >= 3) close(); } },
    cancel() { st = null; schedule(); },
    deactivate() { st = null; },
    key(e) {
      if (!st) return false;
      if (e.key === 'Enter') { close(); return true; }
      if (e.key === 'Escape') { st = null; schedule(); return true; }
      if (e.key === 'Backspace') { st.pts.pop(); if (!st.pts.length) st = null; schedule(); return true; }
      return false;
    },
    overlay(ctx) {
      if (!st) return; ctx.beginPath();
      st.pts.forEach((p, i) => { const [x, y] = toScreen(p[0], p[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      if (st.cursor && !st.drag) { const [x, y] = toScreen(st.cursor[0], st.cursor[1]); ctx.lineTo(x, y); }
      antsLine(ctx);
      const [fx, fy] = toScreen(st.pts[0][0], st.pts[0][1]); ctx.beginPath(); ctx.arc(fx, fy, 4.5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke();
    }
  };
}

/* ---------- fuzzy / by colour ---------- */
function makeColorSelect(contiguous) {
  return {
    cursor: 'crosshair',
    down(ev) {
      const d = S.doc, L = d.active; if (!L || !insideDoc(ev.x, ev.y)) return;
      let src = L.data; if (S.opts.sampleMerged) { flushNow(); src = S.flat; }
      const mask = E.floodMask(src, d.w, d.h, ev.x, ev.y, S.opts.threshold, contiguous);
      commitSel(mask, contiguous ? 'Varita mágica' : 'Selección por color', selModeFrom(ev));
    }
  };
}

/* ---------- move ---------- */
function moveContent(orig, sel, w, hh, dx, dy) {
  const out = new Uint8ClampedArray(orig), fl = new Uint8ClampedArray(orig.length);
  for (let p = 0; p < w * hh; p++) {
    const m = sel[p]; if (!m) continue; const i = p * 4;
    fl[i] = orig[i]; fl[i + 1] = orig[i + 1]; fl[i + 2] = orig[i + 2]; fl[i + 3] = orig[i + 3] * m / 255; out[i + 3] = orig[i + 3] * (255 - m) / 255;
  }
  const sh = E.offsetData(fl, w, hh, dx, dy, false);
  for (let p = 0; p < w * hh; p++) {
    const i = p * 4, a = sh[i + 3] / 255; if (!a) continue;
    const oa = out[i + 3] / 255, na = a + oa * (1 - a);
    for (let c = 0; c < 3; c++) out[i + c] = (sh[i + c] * a + out[i + c] * oa * (1 - a)) / na;
    out[i + 3] = na * 255;
  }
  return out;
}
function makeMove() {
  let st = null;
  const apply = () => {
    const d = S.doc, L = st.L, w = d.w, hh = d.h;
    if (st.tgt === 'layer') { L.data = E.offsetData(st.odata, w, hh, st.dx, st.dy, false); if (st.omask) L.mask = E.offsetData(st.omask, w, hh, st.dx, st.dy, false, 1); }
    else if (st.tgt === 'sel') d.selection = E.offsetData(st.osel, w, hh, st.dx, st.dy, false, 1);
    else { L.data = moveContent(st.odata, st.osel, w, hh, st.dx, st.dy); d.selection = E.offsetData(st.osel, w, hh, st.dx, st.dy, false, 1); }
    invalidate(null);
  };
  return {
    cursor: 'move',
    down(ev) {
      const d = S.doc, L = d.active; if (!L) return; const tgt = S.opts.moveTarget;
      if ((tgt === 'sel' || tgt === 'content') && !d.selection) { toast('Haz primero una selección.'); return; }
      d.checkpoint(tgt === 'sel' ? 'Mover selección' : tgt === 'content' ? 'Mover contenido' : 'Mover capa');
      st = { L, tgt, sx: ev.x, sy: ev.y, dx: 0, dy: 0, odata: L.data, omask: L.mask, osel: d.selection };
    },
    move(ev) {
      if (!st) return; let dx = Math.round(ev.x - st.sx), dy = Math.round(ev.y - st.sy);
      if (ev.shift) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      if (dx === st.dx && dy === st.dy) return; st.dx = dx; st.dy = dy; apply();
    },
    up() {
      const s = st; st = null; if (!s) return;
      if (!s.dx && !s.dy) { S.doc.undoStack.pop(); return; }
      docChanged();
    },
    cancel() { if (!st) return; const s = st; st = null; s.L.data = s.odata; s.L.mask = s.omask; S.doc.selection = s.osel; S.doc.undoStack.pop(); invalidate(null); refreshAll(); }
  };
}

/* ---------- crop ---------- */
function makeCrop() {
  let r = null, drag = null;
  const HIT = 9;
  const hit = (ev) => {
    if (!r) return null; const z = S.view.zoom, t = HIT / z;
    const nearX0 = Math.abs(ev.x - r.x0) < t, nearX1 = Math.abs(ev.x - r.x1) < t, nearY0 = Math.abs(ev.y - r.y0) < t, nearY1 = Math.abs(ev.y - r.y1) < t;
    const inX = ev.x > r.x0 - t && ev.x < r.x1 + t, inY = ev.y > r.y0 - t && ev.y < r.y1 + t;
    if (nearX0 && nearY0) return 'nw'; if (nearX1 && nearY0) return 'ne'; if (nearX0 && nearY1) return 'sw'; if (nearX1 && nearY1) return 'se';
    if (nearY0 && inX) return 'n'; if (nearY1 && inX) return 's'; if (nearX0 && inY) return 'w'; if (nearX1 && inY) return 'e';
    if (ev.x > r.x0 && ev.x < r.x1 && ev.y > r.y0 && ev.y < r.y1) return 'move';
    return null;
  };
  const norm = () => { const d = S.doc; const a = { x0: Math.min(r.x0, r.x1), x1: Math.max(r.x0, r.x1), y0: Math.min(r.y0, r.y1), y1: Math.max(r.y0, r.y1) }; r = { x0: clamp(a.x0, 0, d.w), x1: clamp(a.x1, 0, d.w), y0: clamp(a.y0, 0, d.h), y1: clamp(a.y1, 0, d.h) }; };
  const impl = {
    cursor: 'crosshair',
    hasRect() { return !!r; },
    activate() { r = null; },
    deactivate() { r = null; drag = null; },
    down(ev) {
      const m = hit(ev);
      if (m) drag = { m, sx: ev.x, sy: ev.y, o: Object.assign({}, r) };
      else { const x = Math.round(clamp(ev.x, 0, S.doc.w)), y = Math.round(clamp(ev.y, 0, S.doc.h)); r = { x0: x, y0: y, x1: x, y1: y }; drag = { m: 'new' }; }
    },
    move(ev) {
      if (!drag) return; const d = S.doc, x = Math.round(clamp(ev.x, 0, d.w)), y = Math.round(clamp(ev.y, 0, d.h));
      if (drag.m === 'new') { r.x1 = x; r.y1 = y; }
      else if (drag.m === 'move') {
        const w = drag.o.x1 - drag.o.x0, hh = drag.o.y1 - drag.o.y0, dx = Math.round(ev.x - drag.sx), dy = Math.round(ev.y - drag.sy);
        const nx = clamp(drag.o.x0 + dx, 0, d.w - w), ny = clamp(drag.o.y0 + dy, 0, d.h - hh); r = { x0: nx, y0: ny, x1: nx + w, y1: ny + hh };
      } else {
        const m = drag.m; r = Object.assign({}, drag.o);
        if (m.includes('n')) r.y0 = y; if (m.includes('s')) r.y1 = y; if (m.includes('w')) r.x0 = x; if (m.includes('e')) r.x1 = x;
      }
      schedule();
    },
    up() { drag = null; if (r) { norm(); if (r.x1 - r.x0 < 2 || r.y1 - r.y0 < 2) r = null; } schedule(); refreshOptions(); },
    cancel() { drag = null; },
    hover(ev) { const m = hit(ev), c = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', move: 'move' }; viewEl().style.cursor = m ? c[m] : 'crosshair'; },
    apply() {
      if (!r) return; norm(); const d = S.doc, x = r.x0, y = r.y0, w = r.x1 - r.x0, hh = r.y1 - r.y0; r = null;
      d.cropCanvas(x, y, w, hh); docChanged(); fitView(); refreshOptions(); toast('Recortado a ' + w + ' × ' + hh + ' px');
    },
    clear() { r = null; schedule(); refreshOptions(); },
    key(e) { if (e.key === 'Enter' && r) { impl.apply(); return true; } if (e.key === 'Escape' && r) { impl.clear(); return true; } return false; },
    overlay(ctx) {
      if (!r) return; const [ax, ay] = toScreen(r.x0, r.y0), [bx, by] = toScreen(r.x1, r.y1), d = S.doc, [ox, oy] = toScreen(0, 0), [ex, ey] = toScreen(d.w, d.h);
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(ox, oy, ex - ox, ay - oy); ctx.fillRect(ox, by, ex - ox, ey - by); ctx.fillRect(ox, ay, ax - ox, by - ay); ctx.fillRect(bx, ay, ex - bx, by - ay);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 1; i < 3; i++) { ctx.moveTo(ax + (bx - ax) * i / 3, ay); ctx.lineTo(ax + (bx - ax) * i / 3, by); ctx.moveTo(ax, ay + (by - ay) * i / 3); ctx.lineTo(bx, ay + (by - ay) * i / 3); }
      ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.strokeRect(ax + .5, ay + .5, bx - ax, by - ay);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000';
      for (const [hx, hy] of [[ax, ay], [bx, ay], [ax, by], [bx, by], [(ax + bx) / 2, ay], [(ax + bx) / 2, by], [ax, (ay + by) / 2], [bx, (ay + by) / 2]]) { ctx.fillRect(hx - 4, hy - 4, 8, 8); ctx.strokeRect(hx - 4, hy - 4, 8, 8); }
      const label = (r.x1 - r.x0) + ' × ' + (r.y1 - r.y0); ctx.font = '11px sans-serif'; const tw = ctx.measureText(label).width; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(ax, ay - 22, tw + 10, 18); ctx.fillStyle = '#fff'; ctx.fillText(label, ax + 5, ay - 9);
    }
  };
  return impl;
}

/* ---------- painting (pencil, brush, eraser, airbrush, clone, dodge/burn) ---------- */
function makePaint(kind) {
  let st = null;
  const label = { pencil: 'Lápiz', paintbrush: 'Pincel', eraser: 'Borrador', airbrush: 'Aerógrafo', clone: 'Clonar', dodgeburn: 'Sobreexponer/subexponer' }[kind];
  function applyBox(box) {
    const d = S.doc, o = S.opts, L = st.L, w = d.w, sel = d.selection;
    if (st.target === 'mask') {
      const v = kind === 'eraser' ? 0 : Math.round(lum(S.fg)); E.applyCoverageMask(L.mask, st.orig.mask, w, st.cov, box, sel, v, o.opacity);
    } else if (kind === 'clone') {
      E.applyClone(L.data, st.orig.data, st.orig.data, w, d.h, st.cov, box, sel, st.off.dx, st.off.dy, o.opacity, L.lockAlpha);
    } else if (kind === 'dodgeburn') {
      for (let y = box.y0; y <= box.y1; y++) L.data.set(st.orig.data.subarray((y * w + box.x0) * 4, (y * w + box.x1 + 1) * 4), (y * w + box.x0) * 4);
      E.applyDodgeBurn(L.data, w, box, st.cov, sel, (o.dbMode === 'burn') !== st.ctrl, o.exposure, o.dbRange);
    } else {
      E.applyCoverage(L.data, st.orig.data, w, st.cov, box, sel, S.fg, o.opacity, { erase: kind === 'eraser', lockAlpha: L.lockAlpha && kind !== 'eraser' });
    }
    invalidate(boxToRect(box));
  }
  function stamp(x, y) {
    const d = S.doc, o = S.opts, pen = st.pen && o.dyn;
    let size = o.size * (pen ? clamp(st.pressure * 1.6, 0.12, 1) : 1); if (kind === 'pencil') size = Math.max(1, Math.round(size));
    const box = E.stampDab(st.cov, d.w, d.h, x, y, size, kind === 'pencil' ? 1 : o.hardness, kind !== 'pencil', kind === 'airbrush' ? o.flow : 1, kind === 'airbrush');
    st.box = unionBox(st.box, box); applyBox(box);
  }
  function finish(commit) {
    const s = st; if (!s) return; st = null; clearInterval(s.timer);
    if (!commit) { abortOp(s.L, s.orig); clearCov(s.box); invalidate(null); refreshAll(); return; }
    clearCov(s.box); docChanged(s.box ? boxToRect(s.box) : null);
  }
  return {
    brushCursor: true, cursor: 'none',
    down(ev) {
      const d = S.doc, L = d.active; if (!L) return;
      if (kind === 'clone' && ev.ctrl) { S.cloneSrc = { x: ev.x, y: ev.y }; toast('Origen del clonado fijado'); schedule(); return; }
      if (kind === 'clone' && !S.cloneSrc) { toast('Ctrl+clic para elegir el origen del clonado.'); return; }
      const target = d.editMask ? 'mask' : 'data';
      if (target === 'mask' && !L.mask) { toast('Esta capa no tiene máscara.'); return; }
      const orig = d.beginOp(label, L, target);
      st = { L, target, orig, cov: ensureCov(), box: null, last: [ev.x, ev.y], pressure: ev.pressure, pen: ev.pointerType === 'pen', ctrl: ev.ctrl, timer: 0, off: kind === 'clone' ? { dx: S.cloneSrc.x - ev.x, dy: S.cloneSrc.y - ev.y } : null };
      const spacing = kind === 'pencil' ? 1 : Math.max(1, S.opts.size * S.opts.spacing);
      st.stroker = new E.Stroker(spacing, stamp); st.stroker.begin(ev.x, ev.y);
      if (kind === 'airbrush') st.timer = setInterval(() => { if (st) stamp(st.last[0], st.last[1]); }, 60);
    },
    move(ev) { if (!st) return; st.last = [ev.x, ev.y]; st.pressure = ev.pressure; st.stroker.lineTo(ev.x, ev.y); },
    up() { finish(true); },
    cancel() { finish(false); },
    overlay(ctx) {
      if (kind !== 'clone' || !S.cloneSrc) return; const [x, y] = toScreen(S.cloneSrc.x, S.cloneSrc.y); const o = S.opts.size * S.view.zoom / 2;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(x, y, Math.max(o, 2), 0, 7); ctx.stroke();
    }
  };
}

/* ---------- bucket ---------- */
function makeBucket() {
  return {
    cursor: 'crosshair',
    down(ev) {
      const d = S.doc, L = d.active, o = S.opts; if (!L) return;
      if (d.editMask && !L.mask) { toast('Esta capa no tiene máscara.'); return; }
      let mask = null;
      if (o.fillMode === 'similar') {
        if (!insideDoc(ev.x, ev.y)) return;
        let src = L.data; if (o.sampleMerged) { flushNow(); src = S.flat; }
        mask = E.floodMask(src, d.w, d.h, ev.x, ev.y, o.threshold, true);
      }
      const col = ev.ctrl ? S.bg : S.fg;
      if (d.editMask) {
        const orig = d.beginOp('Relleno de máscara', L, 'mask'), v = lum(col), sel = d.selection;
        for (let p = 0; p < d.w * d.h; p++) { const a = (mask ? mask[p] / 255 : 1) * o.opacity * (sel ? sel[p] / 255 : 1); if (a) L.mask[p] = Math.round(orig.mask[p] + (v - orig.mask[p]) * a); }
      } else { d.beginOp('Relleno', L, 'data'); E.fillMask(L.data, d.w, d.h, mask, d.selection, col, o.opacity, L.lockAlpha); }
      docChanged();
    }
  };
}

/* ---------- gradient ---------- */
function makeGradient() {
  let st = null;
  const render = () => {
    const d = S.doc, o = S.opts, L = st.L;
    const c0 = Object.assign({ a: 1 }, S.fg), c1 = o.gradColors === 'fgtr' ? Object.assign({ a: 0 }, S.fg) : Object.assign({ a: 1 }, S.bg);
    if (st.target === 'mask') {
      const tmp = new Uint8ClampedArray(d.w * d.h * 4); for (let p = 0; p < d.w * d.h; p++) { const v = st.orig.mask[p]; tmp[p * 4] = tmp[p * 4 + 1] = tmp[p * 4 + 2] = v; tmp[p * 4 + 3] = 255; }
      const g0 = { r: lum(c0), g: lum(c0), b: lum(c0), a: 1 }, g1 = { r: lum(c1), g: lum(c1), b: lum(c1), a: c1.a };
      E.fillGradient(tmp, d.w, d.h, d.selection, st.x0, st.y0, st.x1, st.y1, o.gradShape, g0, g1, o.opacity);
      const m = new Uint8Array(d.w * d.h); for (let p = 0; p < m.length; p++) m[p] = tmp[p * 4]; L.mask = m;
    } else {
      const buf = new Uint8ClampedArray(st.orig.data);
      E.fillGradient(buf, d.w, d.h, d.selection, st.x0, st.y0, st.x1, st.y1, o.gradShape, c0, c1, o.opacity);
      if (L.lockAlpha) for (let i = 3; i < buf.length; i += 4) buf[i] = st.orig.data[i];
      L.data = buf;
    }
    invalidate(null);
  };
  return {
    cursor: 'crosshair',
    down(ev) {
      const d = S.doc, L = d.active; if (!L) return;
      if (d.editMask && !L.mask) { toast('Esta capa no tiene máscara.'); return; }
      const target = d.editMask ? 'mask' : 'data';
      st = { L, target, orig: d.beginOp('Degradado', L, target), x0: ev.x, y0: ev.y, x1: ev.x, y1: ev.y, moved: false, sx: ev.cx, sy: ev.cy };
    },
    move(ev) { if (!st) return; st.x1 = ev.x; st.y1 = ev.y; if (!st.moved && Math.hypot(ev.cx - st.sx, ev.cy - st.sy) < 3) return; st.moved = true; render(); schedule(); },
    up() { const s = st; st = null; if (!s) return; if (!s.moved) { abortOp(s.L, s.orig); invalidate(null); return; } docChanged(); },
    cancel() { const s = st; st = null; if (s) { abortOp(s.L, s.orig); invalidate(null); refreshAll(); } },
    overlay(ctx) {
      if (!st || !st.moved) return; const [ax, ay] = toScreen(st.x0, st.y0), [bx, by] = toScreen(st.x1, st.y1);
      ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff'; ctx.stroke();
      for (const [x, y] of [[ax, ay], [bx, by]]) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke(); }
    }
  };
}

/* ---------- picker / text / zoom / hand ---------- */
function makePicker() {
  const pick = (ev) => {
    const d = S.doc; if (!insideDoc(ev.x, ev.y)) return; let c;
    if (S.opts.pickSample === 'layer' && d.active) { const x = Math.floor(ev.x), y = Math.floor(ev.y), i = (y * d.w + x) * 4, L = d.active; c = [L.data[i], L.data[i + 1], L.data[i + 2], L.data[i + 3]]; } else c = sampleFlat(ev.x, ev.y);
    if (c[3] === 0) return; setColor(ev.alt ? 'bg' : 'fg', { r: c[0], g: c[1], b: c[2] });
  };
  return { cursor: 'crosshair', down: pick, move: pick, up() { toast('Color ' + (S.colorTarget === 'bg' ? bgHex() : fgHex()).toUpperCase()); } };
}
function makeText() {
  return {
    cursor: 'text',
    down(ev) {
      const d = S.doc, L = d.active;
      if (L && L.text) { const m = measureText(L.text); if (ev.x >= L.text.x - 4 && ev.x <= L.text.x + m.w + 4 && ev.y >= L.text.y - 4 && ev.y <= L.text.y + m.h + 4) { openTextDialog(null, L); return; } }
      if (!insideDoc(ev.x, ev.y)) return; openTextDialog({ x: Math.round(ev.x), y: Math.round(ev.y) }, null);
    }
  };
}
function makeZoom() {
  let st = null;
  return {
    cursor: 'zoom-in',
    down(ev) { st = { x0: ev.x, y0: ev.y, cx: ev.cx, cy: ev.cy, alt: ev.alt, drag: false, x1: ev.x, y1: ev.y }; },
    move(ev) { if (!st) return; st.x1 = ev.x; st.y1 = ev.y; if (Math.hypot(ev.cx - st.cx, ev.cy - st.cy) > 5) st.drag = true; schedule(); },
    up(ev) {
      const s = st; st = null; if (!s) return; const r = viewEl().getBoundingClientRect();
      if (s.drag && !s.alt) {
        const w = Math.abs(s.x1 - s.x0), hh = Math.abs(s.y1 - s.y0), v = viewSize(); if (w < 2 || hh < 2) return;
        const z = clamp(Math.min(v.w / w, v.h / hh), 0.02, 64), cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2;
        S.view.zoom = z; S.view.ox = v.w / 2 - cx * z; S.view.oy = v.h / 2 - cy * z; clampPan(); syncZoomSel(); schedule();
      } else setZoom(S.view.zoom * (s.alt ? 0.5 : 2), s.cx - r.left, s.cy - r.top);
      void ev;
    },
    cancel() { st = null; schedule(); },
    overlay(ctx) { if (!st || !st.drag) return; const [ax, ay] = toScreen(st.x0, st.y0), [bx, by] = toScreen(st.x1, st.y1); ctx.beginPath(); ctx.rect(ax, ay, bx - ax, by - ay); antsLine(ctx); }
  };
}

const TOOL_IMPL = {
  rect: makeBoxSelect('rect'), ellipse: makeBoxSelect('ellipse'), free: makeFreeSelect(), fuzzy: makeColorSelect(true), bycolor: makeColorSelect(false),
  move: makeMove(), crop: makeCrop(), pencil: makePaint('pencil'), paintbrush: makePaint('paintbrush'), eraser: makePaint('eraser'), airbrush: makePaint('airbrush'),
  clone: makePaint('clone'), dodgeburn: makePaint('dodgeburn'), bucket: makeBucket(), gradient: makeGradient(), picker: makePicker(), text: makeText(), zoom: makeZoom(), hand: { cursor: 'grab' }
};

function selectTool(id) {
  if (!TOOL_IMPL[id]) return;
  const prev = TOOL_IMPL[S.tool]; if (prev && prev.deactivate) prev.deactivate();
  cancelActive(); S.tool = id; const t = TOOL_IMPL[id]; if (t.activate) t.activate();
  viewEl().style.cursor = t.cursor || 'crosshair';
  refreshToolbox(); refreshOptions(); schedule();
}

/* ---------- pointer input ---------- */
const pointers = new Map(); let activeTool = null, panning = null, gesture = null;
function evFrom(e) {
  const [x, y] = toDoc(e.clientX, e.clientY);
  return { x, y, cx: e.clientX, cy: e.clientY, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, pressure: e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5, pointerType: e.pointerType, button: e.button };
}
function cancelActive() { if (activeTool && activeTool.cancel) activeTool.cancel(); activeTool = null; }
function setupPointer() {
  const v = viewEl();
  v.addEventListener('contextmenu', (e) => e.preventDefault());
  v.addEventListener('pointerdown', (e) => {
    if (!S.doc) return; v.focus({ preventScroll: true });
    try { v.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      cancelActive(); panning = null; const [a, b] = Array.from(pointers.values());
      gesture = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: S.view.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; return;
    }
    if (pointers.size > 2) return;
    if (e.button === 1 || (e.button === 0 && (S.spaceDown || S.tool === 'hand'))) { panning = { x: e.clientX, y: e.clientY }; v.style.cursor = 'grabbing'; e.preventDefault(); return; }
    if (e.button !== 0) return;
    const t = TOOL_IMPL[S.tool]; if (!t || !t.down) return; activeTool = t; t.down(evFrom(e)); e.preventDefault();
  });
  v.addEventListener('pointermove', (e) => {
    if (!S.doc) return;
    const p = pointers.get(e.pointerId); if (p) { p.x = e.clientX; p.y = e.clientY; }
    const [x, y] = toDoc(e.clientX, e.clientY); S.hover = { x, y }; updateCoords(x, y);
    if (gesture && pointers.size >= 2) {
      const [a, b] = Array.from(pointers.values()), dist = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, r = v.getBoundingClientRect();
      panBy(mx - gesture.mx, my - gesture.my); setZoom(gesture.z0 * dist / gesture.d0, mx - r.left, my - r.top); gesture.mx = mx; gesture.my = my; return;
    }
    if (panning) { panBy(e.clientX - panning.x, e.clientY - panning.y); panning.x = e.clientX; panning.y = e.clientY; return; }
    if (activeTool) {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      if (evs.length > 1) for (const ce of evs) activeTool.move && activeTool.move(evFrom(ce)); else activeTool.move && activeTool.move(evFrom(e));
    } else { const t = TOOL_IMPL[S.tool]; if (t && t.hover) t.hover(evFrom(e)); }
    schedule();
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (gesture && pointers.size < 2) { gesture = null; }
    if (panning && pointers.size === 0) { panning = null; v.style.cursor = S.spaceDown ? 'grab' : (TOOL_IMPL[S.tool].cursor || 'crosshair'); }
    if (e.type === 'pointercancel') { cancelActive(); return; }
    if (activeTool && pointers.size === 0) { const t = activeTool; activeTool = null; if (t.up) t.up(evFrom(e)); }
  };
  v.addEventListener('pointerup', end); v.addEventListener('pointercancel', end);
  v.addEventListener('pointerleave', () => { if (!activeTool) { S.hover = null; schedule(); } });
  v.addEventListener('wheel', (e) => {
    if (!S.doc) return; e.preventDefault(); const r = v.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) setZoom(S.view.zoom * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0022)), e.clientX - r.left, e.clientY - r.top);
    else if (e.shiftKey) panBy(-(e.deltaY || e.deltaX), 0); else panBy(-e.deltaX, -e.deltaY);
  }, { passive: false });
  v.addEventListener('dblclick', (e) => { const t = TOOL_IMPL[S.tool]; if (t && t.dbl) t.dbl(evFrom(e)); });
}
function updateCoords(x, y) {
  const el = $('#stCoords'); if (!el) return; const d = S.doc;
  el.textContent = x >= 0 && y >= 0 && x < d.w && y < d.h ? Math.floor(x) + ', ' + Math.floor(y) + ' px' : '—';
}
