/* ===== Pintora UI: dialogs, docks, options, menus, shortcuts, boot ===== */

/* ---------------- dialogs ---------------- */
let dialogDepth = 0;
function dialog(cfg) {
  const host = $('#dialogHost'), vals = {}, inputs = {};
  const body = h('div', { class: 'body' });
  const read = () => { for (const f of cfg.fields || []) if (f.id) vals[f.id] = inputs[f.id] ? readInput(f, inputs[f.id]) : f.value; return vals; };
  const readInput = (f, inp) => f.type === 'check' ? inp.checked : (f.type === 'number' || f.type === 'range') ? parseFloat(inp.value) : inp.value;
  const api = { values: read, set(id, v) { const f = (cfg.fields || []).find((x) => x.id === id), inp = inputs[id]; if (!inp) return; if (f.type === 'check') inp.checked = v; else inp.value = v; if (inp._pair) inp._pair.value = v; if (inp._val) inp._val.textContent = f.fmt ? f.fmt(v) : v; } };
  for (const f of cfg.fields || []) {
    if (f.type === 'info') { body.append(h('div', { class: 'info', text: f.text })); continue; }
    let inp, extra;
    if (f.type === 'select') { inp = h('select', { id: 'dlg_' + f.id }, f.options.map(([v, l]) => h('option', { value: v, text: l }))); inp.value = f.value; }
    else if (f.type === 'check') inp = h('input', { type: 'checkbox', id: 'dlg_' + f.id, checked: !!f.value });
    else if (f.type === 'area') { inp = h('textarea', { id: 'dlg_' + f.id, rows: 3 }); inp.value = f.value || ''; }
    else if (f.type === 'color') { inp = h('input', { type: 'color', id: 'dlg_' + f.id }); inp.value = f.value; }
    else if (f.type === 'range') {
      inp = h('input', { type: 'range', id: 'dlg_' + f.id, min: f.min, max: f.max, step: f.step || 1 }); inp.value = f.value;
      const num = h('input', { type: 'number', min: f.min, max: f.max, step: f.step || 1, 'aria-label': f.label }); num.value = f.value; inp._pair = num;
      inp.addEventListener('input', () => { num.value = inp.value; }); num.addEventListener('input', () => { if (num.value !== '') { inp.value = num.value; inp.dispatchEvent(new Event('input', { bubbles: true })); } });
      extra = num;
    } else if (f.type === 'number') { inp = h('input', { type: 'number', id: 'dlg_' + f.id, min: f.min, max: f.max, step: f.step || 1 }); inp.value = f.value; }
    else { inp = h('input', { type: 'text', id: 'dlg_' + f.id, maxlength: f.maxlength || 200 }); inp.value = f.value || ''; }
    inputs[f.id] = inp;
    body.append(h('div', { class: 'field' }, h('label', { for: 'dlg_' + f.id, text: f.label || '' }), h('div', { class: 'ctl' }, inp, extra, f.note ? h('span', { class: 'note', text: f.note }) : null)));
    const fire = () => { read(); if (cfg.onInput) cfg.onInput(vals, f.id, api); };
    inp.addEventListener('input', fire); inp.addEventListener('change', fire);
  }
  read();
  const scrim = h('div', { class: 'scrim' });
  let done = false;
  const close = () => { if (done) return; done = true; scrim.remove(); dialogDepth--; document.removeEventListener('keydown', onKey, true); };
  const cancel = () => { close(); if (cfg.onCancel) cfg.onCancel(); };
  const ok = () => { read(); close(); if (cfg.onOk) cfg.onOk(vals); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
    else if (e.key === 'Enter' && !(e.target && e.target.tagName === 'TEXTAREA') && !(e.target && e.target.tagName === 'BUTTON')) { e.preventDefault(); e.stopPropagation(); ok(); }
  };
  const foot = h('footer', null, cfg.noCancel ? null : h('button', { class: 'btn', text: cfg.cancel || 'Cancelar', onclick: cancel }), h('button', { class: 'btn primary', text: cfg.ok || 'Aceptar', onclick: ok }));
  const box = h('div', { class: 'dialog' + (cfg.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': cfg.title }, h('header', { text: cfg.title }), body, foot);
  if (cfg.node) body.append(cfg.node);
  scrim.append(box); scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim && cfg.dismiss !== false) cancel(); });
  host.append(scrim); dialogDepth++; document.addEventListener('keydown', onKey, true);
  const first = body.querySelector('input,select,textarea'); if (first) setTimeout(() => { first.focus(); if (first.select && first.type === 'text') first.select(); }, 0);
  if (cfg.onInput) cfg.onInput(vals, null, api);
  return Object.assign(api, { close });
}

/* ---------------- toolbox + options ---------------- */
function refreshToolbox() {
  const box = $('#toolbox'); box.textContent = '';
  for (const t of TOOLS) box.append(h('button', { class: 'tool' + (S.tool === t.id ? ' on' : ''), title: t.name + ' (' + t.key + ')', 'aria-label': t.name, 'aria-pressed': S.tool === t.id ? 'true' : 'false', onclick: () => selectTool(t.id) }, icon(t.icon)));
}
function refreshOptions() {
  const bar = $('#options'); if (!bar) return; bar.textContent = '';
  const t = TOOL_BY_ID[S.tool];
  bar.append(h('div', { class: 'tname' }, icon(t.icon), t.name));
  for (const id of t.opts) {
    const def = OPTDEFS[id]; let ctl;
    if (def.type === 'range') {
      const val = h('span', { class: 'val', text: def.fmt(S.opts[id]) });
      const inp = h('input', { type: 'range', id: 'opt_' + id, min: def.min, max: def.max, step: def.step, 'aria-label': def.label }); inp.value = S.opts[id];
      inp.addEventListener('input', () => { S.opts[id] = parseFloat(inp.value); val.textContent = def.fmt(S.opts[id]); schedule(); });
      ctl = h('div', { class: 'opt' }, h('label', { for: 'opt_' + id, text: def.label }), inp, val);
    } else if (def.type === 'check') {
      const inp = h('input', { type: 'checkbox', id: 'opt_' + id, checked: !!S.opts[id] }); inp.addEventListener('change', () => { S.opts[id] = inp.checked; });
      ctl = h('div', { class: 'opt' }, inp, h('label', { for: 'opt_' + id, text: def.label }));
    } else if (def.type === 'select') {
      const sel = h('select', { id: 'opt_' + id, 'aria-label': def.label }, def.options.map(([v, l]) => h('option', { value: v, text: l }))); sel.value = S.opts[id]; sel.addEventListener('change', () => { S.opts[id] = sel.value; });
      ctl = h('div', { class: 'opt' }, h('label', { for: 'opt_' + id, text: def.label }), sel);
    } else {
      const seg = h('div', { class: 'seg', role: 'group', 'aria-label': def.label || 'Modo' });
      for (const [v, l] of def.options) { const b = h('button', { text: l, class: S.opts[id] === v ? 'on' : '', 'aria-pressed': S.opts[id] === v ? 'true' : 'false' }); b.addEventListener('click', () => { S.opts[id] = v; refreshOptions(); }); seg.append(b); }
      ctl = h('div', { class: 'opt' }, def.label ? h('label', { text: def.label }) : null, seg);
    }
    bar.append(ctl);
  }
  if (S.tool === 'crop' && TOOL_IMPL.crop.hasRect()) bar.append(h('button', { class: 'btn primary', text: 'Recortar', onclick: () => TOOL_IMPL.crop.apply() }), h('button', { class: 'btn', text: 'Cancelar', onclick: () => TOOL_IMPL.crop.clear() }));
  if (S.tool === 'clone') bar.append(h('span', { class: 'hint', text: S.cloneSrc ? 'Origen fijado. Ctrl+clic para cambiarlo.' : 'Ctrl+clic para fijar el origen.' }));
  else if (t.hint) bar.append(h('span', { class: 'hint', text: t.hint }));
}

/* ---------------- colour dock ---------------- */
const PIGMENTS = [['Negro de marfil', '#1b1b1d'], ['Blanco de titanio', '#f4f2ee'], ['Gris neutro', '#8b8f96'], ['Rojo cadmio', '#e23a2a'], ['Carmín', '#a8123e'], ['Rosa', '#e47aa8'], ['Naranja cadmio', '#f08a1c'], ['Ocre amarillo', '#d9a431'], ['Amarillo limón', '#f0e04b'], ['Verde esmeralda', '#1f9d6b'], ['Verde oliva', '#6b7a2d'], ['Turquesa', '#19a7a8'], ['Azul cobalto', '#2a4ea3'], ['Ultramar', '#2b2f9e'], ['Violeta', '#6a3d9a'], ['Siena tostada', '#8a4b24'], ['Sombra natural', '#5a4632']];
S.hsv = { h: 0, s: 0, v: 0 };
function rgb2hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let hh = 0; if (d) { if (mx === r) hh = ((g - b) / d + 6) % 6; else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4; hh /= 6; } return { h: hh, s: mx ? d / mx : 0, v: mx }; }
function hsv2rgb(hh, s, v) { const i = Math.floor(hh * 6), f = hh * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s); const m = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6]; return { r: Math.round(m[0] * 255), g: Math.round(m[1] * 255), b: Math.round(m[2] * 255) }; }
function syncHsvFrom(c) { const n = rgb2hsv(c.r, c.g, c.b); S.hsv = { h: n.s > 0 && n.v > 0 ? n.h : S.hsv.h, s: n.s, v: n.v }; }
function drawSV() {
  const c = $('#svBox'), g = c.getContext('2d'), w = c.width, hh = c.height, { h: hue, s, v } = S.hsv, hc = hsv2rgb(hue, 1, 1);
  g.fillStyle = `rgb(${hc.r},${hc.g},${hc.b})`; g.fillRect(0, 0, w, hh);
  let gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  const x = s * w, y = (1 - v) * hh; g.lineWidth = 2; g.strokeStyle = '#fff'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke(); g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 7.5, 0, 7); g.stroke();
}
function drawHue() {
  const c = $('#hueBar'), g = c.getContext('2d'), w = c.width, hh = c.height, gr = g.createLinearGradient(0, 0, 0, hh);
  for (let i = 0; i <= 6; i++) { const k = hsv2rgb(i / 6 % 1 || (i === 6 ? 0 : 0), 1, 1); gr.addColorStop(i / 6, `rgb(${k.r},${k.g},${k.b})`); }
  g.fillStyle = gr; g.fillRect(0, 0, w, hh); const y = S.hsv.h * hh; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1; g.fillRect(0, y - 2, w, 4); g.strokeRect(0.5, y - 2.5, w - 1, 5);
}
function refreshColor() {
  $('#swFg').style.background = fgHex(); $('#swBg').style.background = bgHex();
  $('#swFg').classList.toggle('sel', S.colorTarget === 'fg'); $('#swBg').classList.toggle('sel', S.colorTarget === 'bg');
  const hx = $('#hexIn'); if (document.activeElement !== hx) hx.value = (S.colorTarget === 'fg' ? fgHex() : bgHex()).toUpperCase();
  drawSV(); drawHue();
}
function setupColorDock() {
  const sv = $('#svBox'), hb = $('#hueBar'), apply = () => { const c = hsv2rgb(S.hsv.h, S.hsv.s, S.hsv.v); setColor(S.colorTarget, c, true); };
  const drag = (el, fn) => { const f = (e) => { const r = el.getBoundingClientRect(); fn(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)); }; el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); f(e); const mv = (ev) => f(ev), up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); }; el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); }); };
  drag(sv, (x, y) => { S.hsv.s = x; S.hsv.v = 1 - y; apply(); });
  drag(hb, (x, y) => { S.hsv.h = y >= 1 ? 0.9999 : y; apply(); });
  $('#swFg').addEventListener('click', () => { S.colorTarget = 'fg'; syncHsvFrom(S.fg); refreshColor(); });
  $('#swBg').addEventListener('click', () => { S.colorTarget = 'bg'; syncHsvFrom(S.bg); refreshColor(); });
  $('#hexIn').addEventListener('input', (e) => { let v = e.target.value.trim(); if (!v.startsWith('#')) v = '#' + v; if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) setColor(S.colorTarget, E.hexToRgb(v)); });
  $('#hexIn').addEventListener('blur', refreshColor);
  $('#btnSwap').addEventListener('click', swapColors); $('#btnDefColors').addEventListener('click', defaultColors);
  const pal = $('#palette');
  for (const [name, hex] of PIGMENTS) { const b = h('button', { title: name + ' ' + hex + ' (Alt+clic = fondo)', 'aria-label': name, style: 'background:' + hex }); b.addEventListener('click', (e) => { setColor(e.altKey ? 'bg' : S.colorTarget, E.hexToRgb(hex)); }); pal.append(b); }
}

/* ---------------- layers dock ---------------- */
const thumbCache = new WeakMap();
function thumbData(buf, w, hh, isMask) {
  let t = thumbCache.get(buf); if (t && t.w === w && t.h === hh) return t.img;
  const T = 40, sc = Math.min(T / w, T / hh), tw = Math.max(1, Math.round(w * sc)), th = Math.max(1, Math.round(hh * sc)), img = new ImageData(T, T), ox = Math.floor((T - tw) / 2), oy = Math.floor((T - th) / 2);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const sx = Math.min(w - 1, Math.floor(x / sc)), sy = Math.min(hh - 1, Math.floor(y / sc)), si = (sy * w + sx), di = ((y + oy) * T + x + ox) * 4;
    if (isMask) { const v = buf[si]; img.data[di] = img.data[di + 1] = img.data[di + 2] = v; img.data[di + 3] = 255; }
    else { const s4 = si * 4; img.data[di] = buf[s4]; img.data[di + 1] = buf[s4 + 1]; img.data[di + 2] = buf[s4 + 2]; img.data[di + 3] = buf[s4 + 3]; }
  }
  thumbCache.set(buf, { w, h: hh, img }); return img;
}
function thumbCanvas(buf, w, hh, isMask) { const c = h('canvas', { width: 40, height: 40 }); c.getContext('2d').putImageData(thumbData(buf, w, hh, isMask), 0, 0); return c; }
let propLabel = null;
function beginProp(label) { if (propLabel !== label) { S.doc.checkpoint(label); propLabel = label; } }
function refreshLayers() {
  const d = S.doc; if (!d) return; const list = $('#layerList'), keepScroll = list.scrollTop; list.textContent = '';
  for (let i = d.layers.length - 1; i >= 0; i--) {
    const L = d.layers[i], sel = L.id === d.activeId;
    const eye = h('button', { class: 'iconbtn eye', title: L.visible ? 'Ocultar capa' : 'Mostrar capa', 'aria-label': L.visible ? 'Ocultar capa' : 'Mostrar capa', onclick: (e) => { e.stopPropagation(); d.checkpoint('Visibilidad de capa'); L.visible = !L.visible; docChanged(); } }, icon(L.visible ? 'eye' : 'eyeoff'));
    const nameEl = h('div', { class: 'name', title: L.name, text: L.name });
    nameEl.addEventListener('dblclick', (e) => { e.stopPropagation(); const inp = h('input', { type: 'text', value: L.name, 'aria-label': 'Nombre de capa' }); nameEl.textContent = ''; nameEl.append(inp); inp.focus(); inp.select(); const fin = (ok) => { if (ok && inp.value.trim() && inp.value !== L.name) { d.checkpoint('Renombrar capa'); L.name = inp.value.trim(); } refreshLayers(); refreshHistory(); }; inp.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') fin(true); else if (ev.key === 'Escape') fin(false); }); inp.addEventListener('blur', () => fin(true)); });
    const ownBounds = L.x || L.y || L.w !== d.w || L.h !== d.h;
    const meta = h('div', { class: 'meta', text: (L.mode !== 'normal' ? E.MODES[L.mode].label + ' · ' : '') + Math.round(L.opacity * 100) + '%' + (L.lockAlpha ? ' · 🔒' : '') + (ownBounds ? ' · ' + L.w + '×' + L.h + ' @ ' + L.x + ',' + L.y : '') });
    const row = h('div', { class: 'lrow' + (sel ? ' sel' : ''), role: 'button', tabindex: 0, 'aria-label': 'Capa ' + L.name }, eye, thumbCanvas(L.data, L.w, L.h, false));
    if (L.mask) { const mc = thumbCanvas(L.mask, L.w, L.h, true); mc.className = 'mask' + (sel && d.editMask ? ' edit' : ''); mc.title = 'Máscara de capa (clic para editarla)'; mc.style.opacity = L.maskOn === false ? 0.4 : 1; mc.addEventListener('click', (e) => { e.stopPropagation(); d.activeId = L.id; d.editMask = true; refreshLayers(); }); row.append(mc); }
    row.append(h('div', { style: 'flex:1;min-width:0' }, nameEl, meta));
    row.addEventListener('click', () => { d.activeId = L.id; d.editMask = false; refreshLayers(); });
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { d.activeId = L.id; d.editMask = false; refreshLayers(); } });
    list.append(row);
  }
  list.scrollTop = keepScroll;
  const L = d.active; $('#modeSel').value = L ? L.mode : 'normal'; $('#opacSel').value = L ? Math.round(L.opacity * 100) : 100; $('#opacVal').textContent = (L ? Math.round(L.opacity * 100) : 100) + '%'; $('#lockAlpha').checked = !!(L && L.lockAlpha);
  for (const id of ['#modeSel', '#opacSel', '#lockAlpha']) $(id).disabled = !L;
}
function setupLayerDock() {
  const sel = $('#modeSel'); let grp = null, og = null;
  for (const [id, label, , group] of E.MODE_LIST) { if (group !== grp) { og = h('optgroup', { label: group }); sel.append(og); grp = group; } og.append(h('option', { value: id, text: label })); }
  sel.addEventListener('change', () => { const L = activeLayer(); if (!L) return; S.doc.checkpoint('Modo de capa'); L.mode = sel.value; docChanged(); });
  const op = $('#opacSel');
  op.addEventListener('input', () => { const L = activeLayer(); if (!L) return; beginProp('Opacidad de capa'); L.opacity = op.value / 100; $('#opacVal').textContent = op.value + '%'; invalidate(null); });
  op.addEventListener('change', () => { propLabel = null; docChanged(); });
  $('#lockAlpha').addEventListener('change', (e) => { const L = activeLayer(); if (!L) return; S.doc.checkpoint('Bloquear transparencia'); L.lockAlpha = e.target.checked; docChanged(); });
  const bar = $('#layerBtns');
  const btn = (ic, title, fn) => bar.append(h('button', { class: 'iconbtn', title, 'aria-label': title, onclick: fn }, icon(ic)));
  btn('plus', 'Nueva capa', () => newLayerDialog()); btn('copy', 'Duplicar capa', () => A.dupLayer()); btn('up', 'Subir capa', () => A.moveLayer(1)); btn('down', 'Bajar capa', () => A.moveLayer(-1)); btn('merge', 'Combinar hacia abajo', () => A.mergeDown()); btn('mask', 'Añadir máscara de capa', () => A.addMask('white')); btn('trash', 'Eliminar capa', () => A.delLayer());
}

/* ---------------- histogram ---------------- */
function refreshHistogram() {
  const c = $('#histBox'), d = S.doc; if (!c || !d) return;
  flushDirty();
  const h = E.histogram(S.flat);
  const g = c.getContext('2d'), w = c.width, hh = c.height, top = 6, bottom = hh - 2;
  g.clearRect(0, 0, w, hh);
  const max = Math.max(1, ...h.luma);
  const y = (v) => bottom - Math.log1p(v) / Math.log1p(max) * (bottom - top);
  const line = (bins, color, fill) => {
    g.beginPath(); g.moveTo(0, bottom);
    for (let i = 0; i < 256; i++) g.lineTo(i / 255 * w, y(bins[i]));
    g.lineTo(w, bottom); g.closePath();
    if (fill) { g.fillStyle = color; g.fill(); }
    else { g.strokeStyle = color; g.lineWidth = 1.2; g.stroke(); }
  };
  line(h.r, 'rgba(226, 74, 58, .55)', true);
  line(h.g, 'rgba(52, 168, 100, .55)', true);
  line(h.b, 'rgba(58, 110, 220, .55)', true);
  const cs = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#888';
  line(h.luma, cs, false);
  g.strokeStyle = 'rgba(128, 128, 128, .35)'; g.lineWidth = 1;
  g.beginPath(); for (let i = 1; i < 4; i++) { const x = Math.round(w * i / 4) + .5; g.moveTo(x, top); g.lineTo(x, bottom); } g.stroke();
  let sum = 0, count = 0;
  for (let i = 0; i < 256; i++) { sum += i * h.luma[i]; count += h.luma[i]; }
  const mean = count ? (sum / count).toFixed(1) : '—';
  $('#histLegend').textContent = h.n ? h.n.toLocaleString(PintoraI18n.lang === 'en' ? 'en' : 'es') + ' px con alfa · luminancia media ' + mean : 'Imagen vacía';
}

/* ---------------- history + status ---------------- */
function refreshHistory() {
  const d = S.doc; if (!d) return; const list = $('#histList'); list.textContent = '';
  const n = d.undoStack.length, items = [{ label: 'Estado inicial', step: 0 }];
  d.undoStack.forEach((e, i) => items.push({ label: e.label, step: i + 1 }));
  for (let j = d.redoStack.length - 1; j >= 0; j--) items.push({ label: d.redoStack[j].label, step: n + (d.redoStack.length - j) });
  for (const it of items) list.append(h('button', { class: 'hrow' + (it.step === n ? ' cur' : '') + (it.step > n ? ' future' : ''), text: it.label, onclick: () => { cancelActive(); d.gotoStep(it.step); afterHistory(); } }));
  const cur = list.querySelector('.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
}
function refreshUndoButtons() { const d = S.doc; $('#btnUndo').disabled = !d || !d.undoStack.length; $('#btnRedo').disabled = !d || !d.redoStack.length; }
function refreshStatus() {
  const d = S.doc; if (!d) return; const b = d.selection ? E.maskBounds(d.selection, d.w, d.h) : null;
  $('#stSel').textContent = b ? 'Selección ' + (b.x1 - b.x0) + ' × ' + (b.y1 - b.y0) + ' en ' + b.x0 + ', ' + b.y0 : '';
  $('#stInfo').textContent = S.name + (S.modified ? ' *' : '') + ' · ' + d.w + ' × ' + d.h + ' px · ' + d.layers.length + (d.layers.length === 1 ? ' capa' : ' capas');
}
function afterHistory() {
  const d = S.doc; if (S.flatImg.width !== d.w || S.flatImg.height !== d.h) resizeBuffers(); else invalidate(null);
  S.antsSel = undefined; S.modified = true; refreshAll(); refreshOptions(); queueAutosave(); schedule();
}
function doUndo() { cancelActive(); if (S.doc.undo()) afterHistory(); }
function doRedo() { cancelActive(); if (S.doc.redo()) afterHistory(); }

/* ---------------- actions ---------------- */
function needLayer() { const L = activeLayer(); if (!L) { toast('No hay capa activa.'); return null; } if (S.doc.editMask) { toast('Sal de la edición de máscara (clic en la miniatura de la capa) para usar esto.'); return null; } return L; }
function newImageDialog() {
  const presets = [['custom', 'Personalizado'], ['800x600', '800 × 600'], ['1280x720', '1280 × 720 (HD)'], ['1920x1080', '1920 × 1080 (Full HD)'], ['1080x1080', '1080 × 1080 (cuadrado)'], ['2480x3508', '2480 × 3508 (A4, 300 ppp)']];
  dialog({ title: 'Imagen nueva', fields: [
    { id: 'preset', label: 'Plantilla', type: 'select', options: presets, value: '1280x720' },
    { id: 'w', label: 'Ancho (px)', type: 'number', min: 1, max: MAX_DIM, value: 1280 }, { id: 'hh', label: 'Alto (px)', type: 'number', min: 1, max: MAX_DIM, value: 720 },
    { id: 'bg', label: 'Fondo', type: 'select', options: [['white', 'Blanco'], ['bg', 'Color de fondo'], ['fg', 'Color de frente'], ['transparent', 'Transparente']], value: 'white' }],
  ok: 'Crear', onInput(v, id, api) { if (id === 'preset' && v.preset !== 'custom') { const [pw, ph] = v.preset.split('x'); api.set('w', pw); api.set('hh', ph); } else if (id === 'w' || id === 'hh') api.set('preset', 'custom'); },
  async onOk(v) {
    const w = clamp(Math.round(v.w) || 1, 1, MAX_DIM), hh = clamp(Math.round(v.hh) || 1, 1, MAX_DIM); if (!(await confirmDiscard())) return;
    const fill = v.bg === 'white' ? { r: 255, g: 255, b: 255 } : v.bg === 'bg' ? S.bg : v.bg === 'fg' ? S.fg : null, doc = new E.Doc(w, hh), l = E.makeLayer(w, hh, 'Fondo', fill);
    doc.layers.push(l); doc.activeId = l.id; setDoc(doc, 'Sin título'); S.modified = false; refreshStatus();
  } });
}
function newLayerDialog() {
  dialog({ title: 'Capa nueva', fields: [{ id: 'name', label: 'Nombre', type: 'text', value: 'Capa ' + (S.doc.layers.length + 1) }, { id: 'fill', label: 'Relleno', type: 'select', options: [['transparent', 'Transparente'], ['fg', 'Color de frente'], ['bg', 'Color de fondo'], ['white', 'Blanco']], value: 'transparent' }, { id: 'mode', label: 'Modo', type: 'select', options: E.MODE_LIST.map((m) => [m[0], m[1]]), value: 'normal' }], ok: 'Crear',
    onOk(v) { const f = v.fill === 'fg' ? S.fg : v.fill === 'bg' ? S.bg : v.fill === 'white' ? { r: 255, g: 255, b: 255 } : null; const L = S.doc.addLayer(v.name.trim() || 'Capa', f); L.mode = v.mode; docChanged(); } });
}
function exportDialog() {
  dialog({ title: 'Exportar imagen', fields: [
    { id: 'fmt', label: 'Formato', type: 'select', options: [['png', 'PNG (sin pérdida, con transparencia)'], ['jpeg', 'JPEG'], ['webp', 'WebP'], ['tiff', 'TIFF 8 bits (sin pérdida)'], ['tiff16', 'TIFF 16 bits (sin pérdida)'], ['gif', 'GIF animado (una capa visible por fotograma)']], value: 'png' },
    { id: 'q', label: 'Calidad', type: 'range', min: 1, max: 100, value: 90 },
    { id: 'bg', label: 'Fondo (JPEG)', type: 'color', value: '#ffffff', note: 'Sustituye la transparencia' },
    { id: 'delay', label: 'Fotograma GIF (ms)', type: 'range', min: 20, max: 1000, step: 10, value: 100, note: 'Solo para GIF animado' }
  ], ok: 'Exportar', onOk: (v) => exportImage(v.fmt, v.q / 100, E.hexToRgb(v.bg), v.delay) });
}
function scaleImageDialog() {
  const d = S.doc, ratio = d.w / d.h;
  dialog({ title: 'Escalar imagen', fields: [{ id: 'w', label: 'Ancho (px)', type: 'number', min: 1, max: MAX_DIM, value: d.w }, { id: 'hh', label: 'Alto (px)', type: 'number', min: 1, max: MAX_DIM, value: d.h }, { id: 'lock', label: 'Mantener proporción', type: 'check', value: true }], ok: 'Escalar',
    onInput(v, id, api) { if (!v.lock) return; if (id === 'w') api.set('hh', Math.max(1, Math.round(v.w / ratio))); else if (id === 'hh') api.set('w', Math.max(1, Math.round(v.hh * ratio))); },
    onOk(v) { const w = clamp(Math.round(v.w), 1, MAX_DIM), hh = clamp(Math.round(v.hh), 1, MAX_DIM); cancelActive(); d.scaleImage(w, hh); docChanged(); fitView(); } });
}
function canvasSizeDialog() {
  const d = S.doc, anchors = [['tl', 'Arriba izquierda'], ['tc', 'Arriba centro'], ['tr', 'Arriba derecha'], ['ml', 'Centro izquierda'], ['c', 'Centro'], ['mr', 'Centro derecha'], ['bl', 'Abajo izquierda'], ['bc', 'Abajo centro'], ['br', 'Abajo derecha']];
  dialog({ title: 'Tamaño del lienzo', fields: [{ id: 'w', label: 'Ancho (px)', type: 'number', min: 1, max: MAX_DIM, value: d.w }, { id: 'hh', label: 'Alto (px)', type: 'number', min: 1, max: MAX_DIM, value: d.h }, { id: 'anchor', label: 'Anclaje', type: 'select', options: anchors, value: 'c', note: 'El área nueva queda transparente' }], ok: 'Aplicar',
    onOk(v) { const w = clamp(Math.round(v.w), 1, MAX_DIM), hh = clamp(Math.round(v.hh), 1, MAX_DIM), a = v.anchor; const fx = a.includes('l') ? 0 : a.includes('r') ? 1 : 0.5, fy = a[0] === 't' ? 0 : a[0] === 'b' ? 1 : 0.5; cancelActive(); d.cropCanvas(Math.round((d.w - w) * fx), Math.round((d.h - hh) * fy), w, hh); docChanged(); fitView(); } });
}
function amountDialog(title, label, def, max, fn) { dialog({ title, fields: [{ id: 'n', label, type: 'range', min: 1, max, value: def }], ok: 'Aplicar', onOk: (v) => fn(Math.round(v.n)) }); }
function selOp(label, fn) { const d = S.doc; if (!d.selection) { toast('No hay selección.'); return; } d.setSelection(fn(d.selection), label); S.modified = true; refreshAll(); schedule(); }
function curvesDialog(preset) {
  const L = needLayer(); if (!L) return;
  const d = S.doc, base = L.data, size = 292, pad = 10, span = size - pad * 2;
  const identity = () => [[0, 0], [1, 1]];
  const copyPts = (p) => (p && p.length >= 2 ? p.map((q) => [q[0], q[1]]) : identity());
  const pp = (preset && preset.points) || {};
  const curves = { rgb: copyPts(pp.rgb), r: copyPts(pp.r), g: copyPts(pp.g), b: copyPts(pp.b) };
  let chan = (preset && preset.channel) || 'rgb', drag = -1, timer = 0;
  const canvas = h('canvas', { width: size, height: size, class: 'curvepad', 'aria-label': 'Editor de curva' });
  const note = h('div', { class: 'note', text: 'Arrastra los puntos. Clic para añadir, clic derecho para quitar.' });
  const reset = h('button', { class: 'btn', text: 'Restablecer canal' });
  const wrap = h('div', { class: 'curvewrap' }, canvas, h('div', { class: 'curverow' }, note, reset));
  const toPx = ([x, y]) => [pad + x * span, pad + (1 - y) * span];
  const toCurve = (cx, cy) => [clamp((cx - pad) / span, 0, 1), clamp(1 - (cy - pad) / span, 0, 1)];
  const redraw = () => {
    const g = canvas.getContext('2d'), cs = getComputedStyle(document.documentElement);
    g.clearRect(0, 0, size, size);
    g.fillStyle = cs.getPropertyValue('--bg').trim() || '#222'; g.fillRect(0, 0, size, size);
    g.strokeStyle = 'rgba(128,128,128,.28)'; g.lineWidth = 1; g.beginPath();
    for (let i = 1; i < 4; i++) { const p = pad + span * i / 4; g.moveTo(p, pad); g.lineTo(p, pad + span); g.moveTo(pad, p); g.lineTo(pad + span, p); }
    g.stroke();
    g.setLineDash([4, 4]); g.beginPath(); g.moveTo(pad, pad + span); g.lineTo(pad + span, pad); g.stroke(); g.setLineDash([]);
    const lut = E.curveLUT(curves[chan]);
    g.strokeStyle = cs.getPropertyValue('--accent').trim() || '#e2a73a'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i < 256; i++) { const x = pad + i / 255 * span, y = pad + (1 - lut[i] / 255) * span; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1;
    for (const p of curves[chan]) { const [x, y] = toPx(p); g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.stroke(); }
  };
  const preview = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { S.preview = { id: L.id, data: E.applyFilter('curves', base, L.w, L.h, { points: curves }, layerSel(L)) }; invalidate(layerRect(L)); }, 60);
  };
  const at = (ev) => {
    const r = canvas.getBoundingClientRect();
    return [(ev.clientX - r.left) * size / r.width, (ev.clientY - r.top) * size / r.height];
  };
  canvas.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    const [sx, sy] = at(ev), pts = curves[chan];
    let hit = -1, best = 13;
    pts.forEach((p, i) => { const [x, y] = toPx(p), dd = Math.hypot(x - sx, y - sy); if (dd < best) { best = dd; hit = i; } });
    if (ev.button === 2) { if (hit > 0 && hit < pts.length - 1) { pts.splice(hit, 1); redraw(); preview(); } return; }
    if (hit < 0) { const c = toCurve(sx, sy); pts.push(c); pts.sort((a, b) => a[0] - b[0]); hit = pts.indexOf(c); }
    drag = hit; try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } redraw();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (drag < 0) return;
    const [sx, sy] = at(ev), [cx, cy] = toCurve(sx, sy), pts = curves[chan], p = pts[drag];
    if (drag === 0 || drag === pts.length - 1) p[1] = cy;
    else { p[0] = clamp(cx, pts[drag - 1][0] + 0.005, pts[drag + 1][0] - 0.005); p[1] = cy; }
    redraw(); preview();
  });
  canvas.addEventListener('pointerup', () => { if (drag >= 0) { drag = -1; preview(); } });
  canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
  reset.addEventListener('click', () => { curves[chan] = identity(); redraw(); preview(); });
  dialog({
    title: 'Curvas', wide: true, ok: 'Aplicar', node: wrap,
    fields: [{ id: 'channel', label: 'Canal', type: 'select', options: [['rgb', 'RGB'], ['r', 'Rojo'], ['g', 'Verde'], ['b', 'Azul']], value: chan }],
    onInput: (v, id) => { if (id === 'channel' || id === null) { chan = v.channel || 'rgb'; redraw(); } },
    onOk: (v) => {
      clearTimeout(timer); S.preview = null;
      const points = { rgb: curves.rgb.map((q) => q.slice()), r: curves.r.map((q) => q.slice()), g: curves.g.map((q) => q.slice()), b: curves.b.map((q) => q.slice()) };
      d.checkpoint('Curvas');
      L.data = E.applyFilter('curves', base, L.w, L.h, { points }, layerSel(L));
      S.lastFilter = { id: 'curves', vals: { points, channel: v.channel || 'rgb' } };
      docChanged();
    },
    onCancel: () => { clearTimeout(timer); S.preview = null; invalidate(null); }
  });
  redraw(); preview();
}
function runFilter(id, preset) {
  if (id === 'curves') {
    if (!preset) { curvesDialog(); return; }
    const LC = needLayer(); if (!LC) return;
    const dC = S.doc; dC.checkpoint('Curvas');
    LC.data = E.applyFilter('curves', LC.data, LC.w, LC.h, preset, layerSel(LC));
    docChanged(); return;
  }
  const L = needLayer(); if (!L) return; const f = E.FILTERS[id], d = S.doc, base = L.data;
  const commit = (vals) => { d.checkpoint(f.name); L.data = E.applyFilter(id, base, L.w, L.h, vals, layerSel(L)); S.lastFilter = { id, vals }; docChanged(); };
  if (preset) { commit(preset); return; }
  if (!f.params.length) { commit({}); return; }
  let timer = 0; const fields = f.params.map((p) => ({ id: p.id, label: p.label, type: p.type === 'select' ? 'select' : p.type === 'check' ? 'check' : p.type === 'color' ? 'color' : 'range', min: p.min, max: p.max, step: p.step, options: p.options, value: p.def }));
  const preview = (vals) => { clearTimeout(timer); timer = setTimeout(() => { S.preview = { id: L.id, data: E.applyFilter(id, base, L.w, L.h, vals, layerSel(L)) }; invalidate(layerRect(L)); }, 70); };
  dialog({ title: f.name, fields, ok: 'Aplicar', onInput: (v) => preview(Object.assign({}, v)), onOk: (v) => { clearTimeout(timer); S.preview = null; commit(Object.assign({}, v)); }, onCancel: () => { clearTimeout(timer); S.preview = null; invalidate(null); } });
}
function openTextDialog(pos, existing) {
  const d = S.doc, fonts = [['"Schibsted Grotesk", sans-serif', 'Schibsted Grotesk'], ['Fraunces, serif', 'Fraunces'], ['Arial, Helvetica, sans-serif', 'Arial'], ['Georgia, serif', 'Georgia'], ['"Times New Roman", serif', 'Times New Roman'], ['"Courier New", monospace', 'Courier New'], ['Verdana, sans-serif', 'Verdana'], ['Impact, sans-serif', 'Impact'], ['sans-serif', 'Sans-serif del sistema'], ['serif', 'Serif del sistema'], ['monospace', 'Monoespaciada']];
  const t0 = existing ? existing.text : { text: 'Texto', font: fonts[0][0], size: 64, bold: false, italic: false, align: 'left', lh: 1.2, color: fgHex(), x: pos.x, y: pos.y };
  let L = existing;
  d.checkpoint(existing ? 'Editar texto' : 'Texto');
  if (!existing) { L = E.makeLayer(d.w, d.h, 'Texto'); L.text = Object.assign({}, t0); d.layers.splice(d.indexOf(d.activeId) + 1, 0, L); d.activeId = L.id; d.editMask = false; }
  const render = (v) => { const t = Object.assign({}, L.text, { text: v.text || ' ', font: v.font, size: Math.max(1, v.size), bold: v.bold, italic: v.italic, align: v.align, lh: v.lh, color: v.color }); L.text = t; L.data = renderText(t, d.w, d.h); L.name = (v.text || 'Texto').split('\n')[0].slice(0, 28); invalidate(null); };
  dialog({ title: existing ? 'Editar texto' : 'Texto', fields: [
    { id: 'text', label: 'Texto', type: 'area', value: t0.text }, { id: 'font', label: 'Fuente', type: 'select', options: fonts, value: t0.font }, { id: 'size', label: 'Tamaño (px)', type: 'range', min: 6, max: 600, value: t0.size },
    { id: 'bold', label: 'Negrita', type: 'check', value: t0.bold }, { id: 'italic', label: 'Cursiva', type: 'check', value: t0.italic }, { id: 'align', label: 'Alineación', type: 'select', options: [['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha']], value: t0.align },
    { id: 'lh', label: 'Interlineado', type: 'range', min: 0.8, max: 3, step: 0.05, value: t0.lh }, { id: 'color', label: 'Color', type: 'color', value: t0.color }], ok: 'Aceptar',
    onInput: (v) => render(v), onOk: () => docChanged(), onCancel: () => { d.undo(); d.redoStack.pop(); afterHistory(); } });
}
function helpDialog() {
  const rows = [['R · E · F · U', 'Selección rectangular, elíptica, libre, varita mágica'], ['Mayús+O', 'Selección por color'], ['M · Mayús+C', 'Mover · recortar'], ['N · P · Mayús+E · A', 'Lápiz · pincel · borrador · aerógrafo'], ['C · Mayús+D', 'Clonar · sobreexponer/subexponer'],
    ['S · Mayús+U', 'Manchar · desenfocar/enfocar'], ['Mayús+B · G · O · T', 'Cubo · degradado · cuentagotas · texto'], ['Z · H · Espacio', 'Zoom · mano · desplazar temporalmente'], ['[ · ]', 'Reducir / aumentar el pincel'], ['X · D', 'Intercambiar colores · negro y blanco'], ['Ctrl+Z · Ctrl+Y', 'Deshacer · rehacer'], ['Ctrl+A · Ctrl+Mayús+A · Ctrl+I', 'Seleccionar todo · nada · invertir'], ['Ctrl+C · Ctrl+X · Ctrl+V', 'Copiar · cortar · pegar como capa (Mayús fuerza el portapapeles del sistema)'], ['Supr', 'Borrar la selección'], ['Ctrl+N · Ctrl+O', 'Imagen nueva · abrir archivo'], ['Ctrl+S · Ctrl+E', 'Guardar proyecto · exportar imagen'], ['Ctrl+Mayús+N · Ctrl+Mayús+D', 'Capa nueva · duplicar capa'], ['Ctrl+F · Ctrl+Mayús+J', 'Repetir último filtro · ajustar a la ventana'], ['Ctrl+rueda · rueda', 'Zoom · desplazar'], ['1 · 2 · 0', 'Zoom 100 % · 200 % · ajustar']];
  dialog({ title: 'Atajos de teclado', wide: true, noCancel: true, ok: 'Cerrar', fields: [], node: h('table', { class: 'kbdtable' }, rows.map(([k, t]) => h('tr', null, h('td', { text: k }), h('td', { text: t })))) });
}
function aboutDialog() {
  dialog({ title: 'Acerca de Pintora', noCancel: true, ok: 'Cerrar', fields: [
    { type: 'info', text: 'Pintora 0.1.0 es un editor de imágenes independiente para navegador y escritorio. Reúne 22 herramientas, 20 filtros, 35 modos de mezcla, capas con opacidad, máscaras y tamaño y posición propios, selecciones, texto rasterizado, trazados vectoriales e historial con deshacer y rehacer.' },
    { type: 'info', text: 'Abre PNG, JPEG, WebP, TIFF de 8 o 16 bits, GIF, PSD y XCF con capas RGBA de 8 o 16 bits, y exporta además SVG; al guardar XCF, 8 bits genera v001 y 16 bits v011 con precisión U16_GAMMA. Los proyectos .pintora.json v4 conservan capas, límites, máscaras, selección, colores, trazados, perfil ICC y precisión de 16 bits. El autoguardado recupera la sesión anterior al volver a abrir la aplicación.' },
    { type: 'info', text: 'Las fórmulas de los modos de mezcla y la composición por capas siguen el comportamiento del código fuente de GIMP 3 (GPL). Pintora no está afiliado a GIMP ni al proyecto GNOME. Si distribuyes una versión compilada, hazlo bajo GPL-3.0-or-later y ofrece el código fuente.' },
    { type: 'info', text: 'La interfaz está disponible en español e inglés. La composición y los proyectos conservan 16 bits, pero las herramientas de píxeles, los filtros y las selecciones trabajan sobre el búfer de 8 bits. Los trazados vectoriales se editan y exportan a SVG, y los perfiles ICC RGB con matrices/TRC se convierten a sRGB; los perfiles basados solo en LUT se rechazan para no aplicar una conversión incorrecta.' },
    { type: 'info', text: 'El XCF v001 de 8 bits se ha validado con GIMP 3.2.8: se abre como 32×24 px con las capas Fondo y Capa propia, opacidades 1,0 y 0,65, y exporta un PNG de 32×24. El XCF v011 de 16 bits se carga en GIMP 3.2.8 y la prueba de formatos comprueba su precisión de 16 bits.' }
  ] });
}

const A = {
  undo: doUndo, redo: doRedo,
  dupLayer() { const L = activeLayer(); if (L) { S.doc.duplicateLayer(L.id); docChanged(); } },
  delLayer() { const L = activeLayer(); if (!L) return; if (!S.doc.removeLayer(L.id)) { toast('No puedes eliminar la única capa.'); return; } docChanged(); },
  moveLayer(delta) { const L = activeLayer(); if (L && S.doc.moveLayer(L.id, delta)) docChanged(); },
  layerToEdge(top) { const L = activeLayer(); if (!L) return; const d = S.doc, i = d.indexOf(L.id); const steps = top ? d.layers.length - 1 - i : -i; if (steps) { d.checkpoint(top ? 'Capa al frente' : 'Capa al fondo'); const [x] = d.layers.splice(i, 1); d.layers.splice(top ? d.layers.length : 0, 0, x); docChanged(); } },
  mergeDown() { const L = activeLayer(); if (L && S.doc.mergeDown(L.id)) docChanged(); else toast('No hay capa debajo.'); },
  flatten() { if (S.doc.flatten()) docChanged(); },
  addMask(kind) {
    const L = activeLayer(); if (!L) return; const d = S.doc; if (L.mask) { toast('La capa ya tiene máscara.'); return; }
    d.checkpoint('Añadir máscara'); const m = new Uint8Array(L.w * L.h);
    if (kind === 'white') m.fill(255); else if (kind === 'sel') { const ls = layerSel(L); if (ls) m.set(ls); else m.fill(255); } else if (kind === 'alpha') for (let i = 0; i < m.length; i++) m[i] = L.data[i * 4 + 3];
    L.mask = m; L.maskOn = true; d.editMask = true; docChanged();
  },
  applyMask() { const L = activeLayer(); if (!L || !L.mask) { toast('La capa no tiene máscara.'); return; } const d = S.doc; d.checkpoint('Aplicar máscara'); const nd = new Uint8ClampedArray(L.data); for (let i = 0; i < L.mask.length; i++) nd[i * 4 + 3] = nd[i * 4 + 3] * L.mask[i] / 255; L.data = nd; L.mask = null; d.editMask = false; docChanged(); },
  delMask() { const L = activeLayer(); if (!L || !L.mask) return; S.doc.checkpoint('Eliminar máscara'); L.mask = null; S.doc.editMask = false; docChanged(); },
  toggleMask() { const L = activeLayer(); if (!L || !L.mask) return; S.doc.checkpoint('Mostrar/ocultar máscara'); L.maskOn = L.maskOn === false; docChanged(); },
  invertMask() { const L = activeLayer(); if (!L || !L.mask) return; S.doc.checkpoint('Invertir máscara'); const m = new Uint8Array(L.mask.length); for (let i = 0; i < m.length; i++) m[i] = 255 - L.mask[i]; L.mask = m; docChanged(); },
  layerFlip(horizontal) { const L = needLayer(); if (!L) return; const d = S.doc; d.checkpoint(horizontal ? 'Voltear capa horizontal' : 'Voltear capa vertical'); L.data = E.flipData(L.data, L.w, L.h, horizontal, 4); if (L.mask) L.mask = E.flipData(L.mask, L.w, L.h, horizontal, 1); docChanged(); },
  layerTransformDialog() {
    const L = needLayer(); if (!L) return; const d = S.doc, base = L.data; let timer = 0;
    const calc = (v) => E.transformData(base, L.w, L.h, v.angle * Math.PI / 180, v.scale / 100, L.w / 2, L.h / 2, v.tx, v.ty);
    dialog({ title: 'Girar y escalar capa', fields: [{ id: 'angle', label: 'Ángulo (°)', type: 'range', min: -180, max: 180, step: 0.5, value: 0 }, { id: 'scale', label: 'Escala (%)', type: 'range', min: 5, max: 400, value: 100 }, { id: 'tx', label: 'Desplazar X', type: 'range', min: -L.w, max: L.w, value: 0 }, { id: 'ty', label: 'Desplazar Y', type: 'range', min: -L.h, max: L.h, value: 0 }], ok: 'Aplicar',
      onInput: (v) => { clearTimeout(timer); timer = setTimeout(() => { S.preview = { id: L.id, data: calc(v) }; invalidate(layerRect(L)); }, 60); }, onOk: (v) => { clearTimeout(timer); S.preview = null; d.checkpoint('Transformar capa'); L.data = calc(v); docChanged(); }, onCancel: () => { clearTimeout(timer); S.preview = null; invalidate(null); } });
  },
  layerOffsetDialog() {
    const L = needLayer(); if (!L) return; const d = S.doc;
    dialog({ title: 'Posición de la capa', fields: [{ id: 'x', label: 'X (px)', type: 'number', value: L.x }, { id: 'y', label: 'Y (px)', type: 'number', value: L.y }], ok: 'Aplicar', onOk: (v) => { d.checkpoint('Mover capa'); L.x = Math.round(v.x); L.y = Math.round(v.y); docChanged(); } });
  },
  editText() { const L = activeLayer(); if (!L || !L.text) { toast('La capa activa no es de texto.'); return; } openTextDialog(null, L); },
  fill(which) { const L = needLayer(); if (!L) return; const d = S.doc; d.beginOp('Rellenar con ' + (which === 'fg' ? 'color de frente' : 'color de fondo'), L, 'data'); E.fillMask(L.data, L.w, L.h, null, layerSel(L), which === 'fg' ? S.fg : S.bg, 1, L.lockAlpha); docChanged(); },
  strokeSel() {
    const d = S.doc; if (!d.selection) { toast('No hay selección.'); return; } const L = needLayer(); if (!L) return;
    amountDialog('Trazar selección', 'Grosor (px)', 4, 100, (n) => { const outer = E.growMask(d.selection, d.w, d.h, n / 2), inner = E.shrinkMask(d.selection, d.w, d.h, n / 2) || new Uint8Array(d.w * d.h), ring = new Uint8Array(d.w * d.h); if (!outer) return; for (let i = 0; i < ring.length; i++) ring[i] = Math.max(0, outer[i] - inner[i]); const local = maskDocToLayer(ring, L); d.beginOp('Trazar selección', L, 'data'); E.fillMask(L.data, L.w, L.h, local, null, S.fg, 1, L.lockAlpha); docChanged(); });
  },
  selAll() { const d = S.doc; d.setSelection(E.rectMask(d.w, d.h, 0, 0, d.w, d.h), 'Seleccionar todo'); S.modified = true; refreshAll(); schedule(); },
  selNone() { const d = S.doc; if (!d.selection) return; d.setSelection(null, 'Quitar selección'); refreshAll(); schedule(); },
  selInvert() { const d = S.doc; d.setSelection(E.invertMask(d.selection, d.w, d.h), 'Invertir selección'); S.modified = true; refreshAll(); schedule(); },
  selAlpha() { const L = activeLayer(); if (!L) return; const d = S.doc, m = new Uint8Array(d.w * d.h); for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const dx = x + L.x, dy = y + L.y; if (dx >= 0 && dy >= 0 && dx < d.w && dy < d.h) m[dy * d.w + dx] = L.data[(y * L.w + x) * 4 + 3]; } d.setSelection(E.normalizeMask(m), 'Alfa a selección'); refreshAll(); schedule(); },
  cropToSel() { const d = S.doc; const b = d.selection ? E.maskBounds(d.selection, d.w, d.h) : null; if (!b) { toast('No hay selección.'); return; } cancelActive(); d.cropCanvas(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); docChanged(); fitView(); },
  rotate(q) { cancelActive(); S.doc.rotateImage(q); docChanged(); fitView(); },
  flip(hz) { cancelActive(); S.doc.flipImage(hz); docChanged(); },
  zoomIn() { setZoom(S.view.zoom * 1.5); }, zoomOut() { setZoom(S.view.zoom / 1.5); }, zoom100() { setZoom(1); }, fit: fitView,
  copy() { copySelection(false); }, cut() { if (needLayer()) copySelection(true); }, paste() { void pasteSmart(false); }, clear() { if (needLayer()) clearSelection(false); },
  newPath() { cancelActive(); if (newPathLayer()) { selectTool('path'); docChanged(); } },
  repeatFilter() { if (!S.lastFilter) { toast('Todavía no has aplicado ningún filtro.'); return; } runFilter(S.lastFilter.id, S.lastFilter.vals); }
};

/* ---------------- menus ---------------- */
const hasDoc = () => !!S.doc, hasSel = () => !!(S.doc && S.doc.selection), hasLayerMask = () => !!(activeLayer() && activeLayer().mask), isText = () => !!(activeLayer() && activeLayer().text);
function filterItems(groups) {
  const out = [], by = {}; for (const id of Object.keys(E.FILTERS)) (by[E.FILTERS[id].group] = by[E.FILTERS[id].group] || []).push(id);
  for (const g of groups) { if (!by[g]) continue; if (out.length) out.push('-'); if (groups.length > 1) out.push({ grp: g }); for (const id of by[g]) out.push({ label: E.FILTERS[id].name + (E.FILTERS[id].params.length ? '…' : ''), fn: () => runFilter(id) }); }
  return out;
}
const MENUS = [
  { label: 'Archivo', build: () => [{ label: 'Nueva imagen…', key: 'Ctrl+N', fn: newImageDialog }, { label: 'Abrir…', key: 'Ctrl+O', fn: () => $('#fileInput').click() }, { label: 'Abrir como capas…', fn: () => { $('#fileInput').dataset.layers = '1'; $('#fileInput').click(); } }, '-', { label: 'Guardar proyecto (.pintora.json)', key: 'Ctrl+S', fn: saveProject }, { label: 'Guardar como PSD…', fn: savePsd }, { label: 'Guardar como XCF…', fn: saveXcf }, { label: 'Exportar SVG…', fn: exportSvg }, { label: 'Exportar como imagen…', key: 'Ctrl+E', fn: exportDialog }] },
  { label: 'Edición', build: () => [{ label: 'Deshacer', key: 'Ctrl+Z', fn: doUndo, enabled: () => S.doc.undoStack.length > 0 }, { label: 'Rehacer', key: 'Ctrl+Y', fn: doRedo, enabled: () => S.doc.redoStack.length > 0 }, '-', { label: 'Cortar', key: 'Ctrl+X', fn: A.cut }, { label: 'Copiar', key: 'Ctrl+C', fn: A.copy }, { label: 'Pegar como capa nueva', key: 'Ctrl+V', fn: A.paste, enabled: () => !!S.clip }, { label: 'Borrar', key: 'Supr', fn: A.clear }, '-', { label: 'Rellenar con el color de frente', fn: () => A.fill('fg') }, { label: 'Rellenar con el color de fondo', fn: () => A.fill('bg') }, { label: 'Trazar selección…', fn: A.strokeSel, enabled: hasSel }] },
  { label: 'Selección', build: () => [{ label: 'Todo', key: 'Ctrl+A', fn: A.selAll }, { label: 'Nada', key: 'Ctrl+Mayús+A', fn: A.selNone, enabled: hasSel }, { label: 'Invertir', key: 'Ctrl+I', fn: A.selInvert }, '-', { label: 'Agrandar…', fn: () => amountDialog('Agrandar selección', 'Píxeles', 5, 200, (n) => selOp('Agrandar selección', (m) => E.growMask(m, S.doc.w, S.doc.h, n))), enabled: hasSel }, { label: 'Reducir…', fn: () => amountDialog('Reducir selección', 'Píxeles', 5, 200, (n) => selOp('Reducir selección', (m) => E.shrinkMask(m, S.doc.w, S.doc.h, n))), enabled: hasSel }, { label: 'Difuminar bordes…', fn: () => amountDialog('Difuminar bordes', 'Radio (px)', 10, 200, (n) => selOp('Difuminar selección', (m) => E.featherMask(m, S.doc.w, S.doc.h, n))), enabled: hasSel }, { label: 'Borde…', fn: () => amountDialog('Borde de la selección', 'Grosor (px)', 5, 100, (n) => selOp('Borde de selección', (m) => { const d = S.doc, o = E.growMask(m, d.w, d.h, n), i = E.shrinkMask(m, d.w, d.h, n) || new Uint8Array(d.w * d.h), r = new Uint8Array(d.w * d.h); if (o) for (let k = 0; k < r.length; k++) r[k] = Math.max(0, o[k] - i[k]); return E.normalizeMask(r); })), enabled: hasSel }, '-', { label: 'Transparencia de la capa a selección', fn: A.selAlpha }] },
  { label: 'Ver', build: () => [{ label: 'Acercar', key: '+', fn: A.zoomIn }, { label: 'Alejar', key: '-', fn: A.zoomOut }, { label: 'Ajustar a la ventana', key: '0', fn: A.fit }, { label: 'Tamaño real (100 %)', key: '1', fn: A.zoom100 }, '-', { label: 'Mostrar selección', check: () => S.showSel, fn: () => { S.showSel = !S.showSel; schedule(); } }, { label: 'Mostrar cuadrícula (con zoom ≥ 300 %)', check: () => S.showGrid, fn: () => { S.showGrid = !S.showGrid; schedule(); } }, '-', { label: 'Tema: sistema', check: () => S.theme === 'system', fn: () => setTheme('system') }, { label: 'Tema: claro', check: () => S.theme === 'light', fn: () => setTheme('light') }, { label: 'Tema: oscuro', check: () => S.theme === 'dark', fn: () => setTheme('dark') }, '-', { label: 'Idioma: Español', check: () => S.lang === 'es', fn: () => setLang('es') }, { label: 'Idioma: English', check: () => S.lang === 'en', fn: () => setLang('en') }] },
  { label: 'Imagen', build: () => [{ label: 'Tamaño del lienzo…', fn: canvasSizeDialog }, { label: 'Escalar imagen…', fn: scaleImageDialog }, { label: 'Recortar a la selección', fn: A.cropToSel, enabled: hasSel }, '-', { label: 'Profundidad: 8 bits', check: () => S.doc.depth !== 16, fn: () => setDepth(8) }, { label: 'Profundidad: 16 bits', check: () => S.doc.depth === 16, fn: () => setDepth(16) }, { label: 'Convertir perfil ICC a sRGB…', fn: () => $('#iccInput').click() }, '-', { label: 'Voltear horizontalmente', fn: () => A.flip(true) }, { label: 'Voltear verticalmente', fn: () => A.flip(false) }, { label: 'Girar 90° a la derecha', fn: () => A.rotate(1) }, { label: 'Girar 90° a la izquierda', fn: () => A.rotate(3) }, { label: 'Girar 180°', fn: () => A.rotate(2) }, '-', { label: 'Aplanar imagen', fn: A.flatten, enabled: () => S.doc.layers.length > 1 }] },
  { label: 'Capa', build: () => [{ label: 'Capa nueva…', key: 'Ctrl+Mayús+N', fn: () => newLayerDialog() }, { label: 'Nuevo trazado', fn: A.newPath }, { label: 'Duplicar capa', key: 'Ctrl+Mayús+D', fn: A.dupLayer }, { label: 'Eliminar capa', fn: A.delLayer }, { label: 'Combinar hacia abajo', fn: A.mergeDown }, '-', { label: 'Subir capa', fn: () => A.moveLayer(1) }, { label: 'Bajar capa', fn: () => A.moveLayer(-1) }, { label: 'Llevar al frente', fn: () => A.layerToEdge(true) }, { label: 'Llevar al fondo', fn: () => A.layerToEdge(false) }, '-', { grp: 'Máscara' }, { label: 'Añadir máscara (blanca)', fn: () => A.addMask('white') }, { label: 'Añadir máscara desde la selección', fn: () => A.addMask('sel'), enabled: hasSel }, { label: 'Añadir máscara desde la transparencia', fn: () => A.addMask('alpha') }, { label: 'Invertir máscara', fn: A.invertMask, enabled: hasLayerMask }, { label: 'Mostrar máscara', check: () => !!(activeLayer() && activeLayer().mask && activeLayer().maskOn !== false), fn: A.toggleMask, enabled: hasLayerMask }, { label: 'Aplicar máscara', fn: A.applyMask, enabled: hasLayerMask }, { label: 'Eliminar máscara', fn: A.delMask, enabled: hasLayerMask }, '-', { grp: 'Transformar' }, { label: 'Voltear capa horizontalmente', fn: () => A.layerFlip(true) }, { label: 'Voltear capa verticalmente', fn: () => A.layerFlip(false) }, { label: 'Girar y escalar…', fn: A.layerTransformDialog }, { label: 'Desplazar…', fn: A.layerOffsetDialog }, '-', { label: 'Editar texto…', fn: A.editText, enabled: isText }] },
  { label: 'Colores', build: () => filterItems(['Colores']) },
  { label: 'Filtros', build: () => filterItems(['Desenfoque', 'Mejora', 'Distorsión', 'Luz y sombra']).concat(['-', { label: 'Repetir último filtro', key: 'Ctrl+F', fn: A.repeatFilter }]) },
  { label: 'Ayuda', build: () => [{ label: 'Atajos de teclado', fn: helpDialog }, { label: 'Acerca de Pintora', fn: aboutDialog }] }
];
let openMenuBtn = null;
function closeMenu() { $('#menuHost').textContent = ''; if (openMenuBtn) openMenuBtn.classList.remove('open'); openMenuBtn = null; }
function openMenu(btn, def) {
  closeMenu(); openMenuBtn = btn; btn.classList.add('open'); const panel = h('div', { class: 'menu', role: 'menu' });
  for (const it of def.build()) {
    if (it === '-') { panel.append(h('hr')); continue; } if (it.grp) { panel.append(h('div', { class: 'grp', text: it.grp })); continue; }
    const en = it.enabled ? it.enabled() : true;
    const b = h('button', { role: 'menuitem', disabled: !en }, h('span', { class: 'chk', text: it.check && it.check() ? '✓' : '' }), h('span', { class: 'lbl', text: it.label }), it.key ? h('span', { class: 'key', text: it.key }) : null);
    b.addEventListener('click', () => { closeMenu(); it.fn(); }); panel.append(b);
  }
  $('#menuHost').append(panel); const r = btn.getBoundingClientRect(); panel.style.top = r.bottom + 4 + 'px'; panel.style.left = Math.max(8, Math.min(r.left, innerWidth - panel.offsetWidth - 8)) + 'px';
}
function setupMenus() {
  const nav = $('#menus'); nav.textContent = '';
  for (const def of MENUS) { const b = h('button', { class: 'menubtn', text: def.label, 'aria-haspopup': 'true' }); b.addEventListener('click', (e) => { e.stopPropagation(); if (openMenuBtn === b) closeMenu(); else openMenu(b, def); }); b.addEventListener('pointerenter', () => { if (openMenuBtn && openMenuBtn !== b) openMenu(b, def); }); nav.append(b); }
  document.addEventListener('pointerdown', (e) => { if (openMenuBtn && !e.target.closest('.menu') && !e.target.closest('.menubtn')) closeMenu(); });
}

/* ---------------- theme ---------------- */
function setTheme(t) {
  S.theme = t; const r = document.documentElement; if (t === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
  try { localStorage.setItem('pintora-theme', t); } catch (e) { /* ignore */ }
  const b = $('#btnTheme'); b.textContent = ''; b.append(icon(t === 'system' ? 'auto' : t === 'light' ? 'sun' : 'moon')); b.title = 'Tema: ' + (t === 'system' ? 'sistema' : t === 'light' ? 'claro' : 'oscuro');
  drawSV(); schedule();
}

/* ---------------- language ---------------- */
function setLang(lang) {
  S.lang = PintoraI18n.setLanguage(lang);
  setupMenus(); refreshAll(); refreshToolbox(); refreshOptions(); refreshColor(); schedule();
  PintoraI18n.apply();
}

/* ---------------- keyboard ---------------- */
function setupKeys() {
  document.addEventListener('keydown', (e) => {
    if (dialogDepth > 0) return; const tg = e.target, typing = tg && /^(input|textarea|select)$/i.test(tg.tagName) && tg.type !== 'range' && tg.type !== 'checkbox';
    if (typing) return; if (!S.doc) return;
    const ctrl = e.ctrlKey || e.metaKey, k = e.key, lk = k.toLowerCase();
    if (e.key === 'Escape' && openMenuBtn) { closeMenu(); return; }
    if (k === ' ' && !ctrl) { if (!S.spaceDown) { S.spaceDown = true; viewEl().style.cursor = 'grab'; schedule(); } e.preventDefault(); return; }
    const t = TOOL_IMPL[S.tool]; if (t && t.key && t.key(e)) { e.preventDefault(); return; }
    if (ctrl) {
      if (lk === 'v') {
        e.preventDefault(); pasteKeyAt = performance.now();
        pasteSmart(e.shiftKey).then((ok) => { if (!ok) toast('El portapapeles está vacío.'); });
        return;
      }
      const map = { z: () => (e.shiftKey ? doRedo() : doUndo()), y: doRedo, a: () => (e.shiftKey ? A.selNone() : A.selAll()), i: A.selInvert, c: A.copy, x: A.cut, n: () => (e.shiftKey ? newLayerDialog() : newImageDialog()), o: () => $('#fileInput').click(), s: saveProject, e: exportDialog, f: A.repeatFilter, d: () => { if (e.shiftKey) A.dupLayer(); else return false; }, j: () => { if (e.shiftKey) A.fit(); else return false; } };
      if (map[lk]) { const r = map[lk](); if (r !== false) e.preventDefault(); } return;
    }
    if (e.altKey) return;
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); A.clear(); return; }
    if (k === '[' || k === ']') { S.opts.size = clamp(Math.round(S.opts.size * (k === ']' ? 1.15 : 0.87) + (k === ']' ? 1 : -1)), 1, 400); refreshOptions(); schedule(); return; }
    if (k === '+' || k === '=') { A.zoomIn(); return; } if (k === '-') { A.zoomOut(); return; }
    if (k === '1') { A.zoom100(); return; } if (k === '2') { setZoom(2); return; } if (k === '0') { A.fit(); return; }
    if (lk === 'x' && !e.shiftKey) { swapColors(); return; } if (lk === 'd' && !e.shiftKey) { defaultColors(); return; }
    for (const tl of TOOLS) { const need = tl.key.startsWith('Shift+'), kk = tl.key.replace('Shift+', '').toLowerCase(); if (lk === kk && e.shiftKey === need) { selectTool(tl.id); e.preventDefault(); return; } }
  });
  document.addEventListener('keyup', (e) => { if (e.key === ' ' && S.spaceDown) { S.spaceDown = false; viewEl().style.cursor = (TOOL_IMPL[S.tool].cursor) || 'crosshair'; schedule(); } });
  window.addEventListener('blur', () => { S.spaceDown = false; });
}

/* ---------------- boot ---------------- */
function boot() {
  if (/Electron/i.test(navigator.userAgent)) document.documentElement.classList.add('native');
  S.lang = PintoraI18n.init();
  let saved = 'system'; try { saved = localStorage.getItem('pintora-theme') || 'system'; } catch (e) { /* ignore */ }
  const put = (id, name) => { const b = $(id); b.textContent = ''; b.append(icon(name)); };
  put('#btnUndo', 'undo'); put('#btnRedo', 'redo'); put('#btnDocks', 'layers'); put('#btnSwap', 'swap'); put('#btnDefColors', 'reset');
  setTheme(saved); $('#btnTheme').addEventListener('click', () => setTheme(S.theme === 'system' ? 'light' : S.theme === 'light' ? 'dark' : 'system'));
  $('#btnUndo').addEventListener('click', doUndo); $('#btnRedo').addEventListener('click', doRedo);
  const docks = $('#docks'); $('#btnDocks').addEventListener('click', () => { docks.classList.toggle('open'); $('#btnDocks').classList.toggle('on', docks.classList.contains('open')); setTimeout(() => { sizeCanvas(); schedule(); }, 0); });
  $$('#dockTabs button').forEach((b) => b.addEventListener('click', () => { $$('#dockTabs button').forEach((x) => x.classList.toggle('on', x === b)); $$('.dock').forEach((dk) => dk.classList.toggle('show', dk.dataset.dock === b.dataset.dock)); }));
  const zs = $('#zoomSel'); for (const z of [0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16]) zs.append(h('option', { value: z, text: z * 100 + '%' })); zs.append(h('option', { value: 'fit', text: 'Ajustar' }));
  zs.addEventListener('change', () => { if (zs.value === 'fit') fitView(); else setZoom(parseFloat(zs.value)); });
  const fi = $('#fileInput'); fi.addEventListener('change', () => { const asLayers = fi.dataset.layers === '1'; fi.dataset.layers = ''; openFiles(fi.files, asLayers); fi.value = ''; });
  const ci = $('#iccInput'); ci.addEventListener('change', async () => { const f = ci.files && ci.files[0]; ci.value = ''; if (!f) return; try { await convertIccFile(f); } catch (e) { toast(e.message || 'No se pudo aplicar el perfil ICC.'); } });
  const stage = $('#stage'), veil = $('#dropveil'); let dragN = 0;
  stage.addEventListener('dragenter', (e) => { e.preventDefault(); dragN++; veil.classList.add('on'); }); stage.addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; veil.classList.remove('on'); } });
  stage.addEventListener('dragover', (e) => e.preventDefault()); stage.addEventListener('drop', (e) => { e.preventDefault(); dragN = 0; veil.classList.remove('on'); if (e.dataTransfer.files.length) openFiles(e.dataTransfer.files, e.shiftKey); });
  setupMenus(); setupColorDock(); setupLayerDock(); setupPointer(); setupKeys();
  new ResizeObserver(() => { sizeCanvas(); schedule(); }).observe(stage);
  setDoc(buildSample(), 'Amanecer (ejemplo)'); S.modified = false;
  syncHsvFrom(S.fg); refreshColor(); refreshToolbox(); selectTool('paintbrush'); refreshStatus(); fitView();
  void checkAutosave();
  window.__pintora = {
    S, E, A, TOOL_IMPL, selectTool, setDoc, docChanged, runFilter,
    F: PintoraFormats, Paths, ICC, flushDirty, exportImage, exportSvg, projectData, loadProject, saveProject, savePsd, saveXcf,
    openFiles, addImageAsLayer, pasteClip, copySelection, clearSelection, openTextDialog, convertIccFile, setDepth, newPathLayer,
    buildSample, refreshAll, resizeBuffers, setTheme, setLang
  };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
