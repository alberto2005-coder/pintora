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
    const meta = h('div', { class: 'meta', text: (L.mode !== 'normal' ? E.MODES[L.mode].label + ' · ' : '') + Math.round(L.opacity * 100) + '%' + (L.lockAlpha ? ' · 🔒' : '') });
    const row = h('div', { class: 'lrow' + (sel ? ' sel' : ''), role: 'button', tabindex: 0, 'aria-label': 'Capa ' + L.name }, eye, thumbCanvas(L.data, d.w, d.h, false));
    if (L.mask) { const mc = thumbCanvas(L.mask, d.w, d.h, true); mc.className = 'mask' + (sel && d.editMask ? ' edit' : ''); mc.title = 'Máscara de capa (clic para editarla)'; mc.style.opacity = L.maskOn === false ? 0.4 : 1; mc.addEventListener('click', (e) => { e.stopPropagation(); d.activeId = L.id; d.editMask = true; refreshLayers(); }); row.append(mc); }
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
  S.antsSel = undefined; S.modified = true; refreshAll(); refreshOptions(); schedule();
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
  dialog({ title: 'Exportar imagen', fields: [{ id: 'fmt', label: 'Formato', type: 'select', options: [['png', 'PNG (sin pérdida, con transparencia)'], ['jpeg', 'JPEG'], ['webp', 'WebP']], value: 'png' }, { id: 'q', label: 'Calidad', type: 'range', min: 1, max: 100, value: 90 }, { id: 'bg', label: 'Fondo (JPEG)', type: 'color', value: '#ffffff', note: 'Sustituye la transparencia' }], ok: 'Exportar', onOk: (v) => exportImage(v.fmt, v.q / 100, E.hexToRgb(v.bg)) });
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
function runFilter(id, preset) {
  const L = needLayer(); if (!L) return; const f = E.FILTERS[id], d = S.doc, base = L.data;
  const commit = (vals) => { d.checkpoint(f.name); L.data = E.applyFilter(id, base, d.w, d.h, vals, d.selection); S.lastFilter = { id, vals }; docChanged(); };
  if (preset) { commit(preset); return; }
  if (!f.params.length) { commit({}); return; }
  let timer = 0; const fields = f.params.map((p) => ({ id: p.id, label: p.label, type: p.type === 'select' ? 'select' : p.type === 'check' ? 'check' : p.type === 'color' ? 'color' : 'range', min: p.min, max: p.max, step: p.step, options: p.options, value: p.def }));
  const preview = (vals) => { clearTimeout(timer); timer = setTimeout(() => { S.preview = { id: L.id, data: E.applyFilter(id, base, d.w, d.h, vals, d.selection) }; invalidate(null); }, 70); };
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
  const rows = [['R · E · F · U', 'Selección rectangular, elíptica, libre, varita mágica'], ['Mayús+O', 'Selección por color'], ['M · Mayús+C', 'Mover · recortar'], ['N · P · Mayús+E · A', 'Lápiz · pincel · borrador · aerógrafo'], ['C · Mayús+D', 'Clonar · sobreexponer/subexponer'], ['Mayús+B · G · O · T', 'Cubo · degradado · cuentagotas · texto'], ['Z · H · Espacio', 'Zoom · mano · desplazar temporalmente'], ['[ · ]', 'Reducir / aumentar el pincel'], ['X · D', 'Intercambiar colores · negro y blanco'], ['Ctrl+Z · Ctrl+Y', 'Deshacer · rehacer'], ['Ctrl+A · Ctrl+Mayús+A · Ctrl+I', 'Seleccionar todo · nada · invertir'], ['Ctrl+C · Ctrl+X · Ctrl+V', 'Copiar · cortar · pegar como capa'], ['Supr', 'Borrar la selección'], ['Ctrl+Mayús+N', 'Capa nueva'], ['Ctrl+F', 'Repetir el último filtro'], ['Ctrl+rueda · rueda', 'Zoom · desplazar'], ['1 · 2 · 0', 'Zoom 100 % · 200 % · ajustar'], ['Ctrl+S · Ctrl+E', 'Guardar proyecto · exportar']];
  dialog({ title: 'Atajos de teclado', wide: true, noCancel: true, ok: 'Cerrar', fields: [], node: h('table', { class: 'kbdtable' }, rows.map(([k, t]) => h('tr', null, h('td', { text: k }), h('td', { text: t })))) });
}
function aboutDialog() {
  dialog({ title: 'Acerca de Pintora', noCancel: true, ok: 'Cerrar', fields: [{ type: 'info', text: 'Pintora 0.1 es un editor de imágenes independiente con capas, selecciones, pinceles, filtros y modos de mezcla, pensado para funcionar en el navegador y como aplicación de escritorio.' }, { type: 'info', text: 'Las fórmulas de los modos de mezcla y la composición por capas siguen el comportamiento del código fuente de GIMP 3 (GPL). Pintora no está afiliado a GIMP ni al proyecto GNOME. Si distribuyes una versión compilada, hazlo bajo GPL-3.0-or-later y ofrece el código fuente.' }, { type: 'info', text: 'No incluye todavía lectura ni escritura de archivos XCF, trazados vectoriales, 16 bits por canal ni gestión de color ICC.' }] });
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
    d.checkpoint('Añadir máscara'); const m = new Uint8Array(d.w * d.h);
    if (kind === 'white') m.fill(255); else if (kind === 'sel') { if (d.selection) m.set(d.selection); else m.fill(255); } else if (kind === 'alpha') for (let i = 0; i < m.length; i++) m[i] = L.data[i * 4 + 3];
    L.mask = m; L.maskOn = true; d.editMask = true; docChanged();
  },
  applyMask() { const L = activeLayer(); if (!L || !L.mask) { toast('La capa no tiene máscara.'); return; } const d = S.doc; d.checkpoint('Aplicar máscara'); const nd = new Uint8ClampedArray(L.data); for (let i = 0; i < L.mask.length; i++) nd[i * 4 + 3] = nd[i * 4 + 3] * L.mask[i] / 255; L.data = nd; L.mask = null; d.editMask = false; docChanged(); },
  delMask() { const L = activeLayer(); if (!L || !L.mask) return; S.doc.checkpoint('Eliminar máscara'); L.mask = null; S.doc.editMask = false; docChanged(); },
  toggleMask() { const L = activeLayer(); if (!L || !L.mask) return; S.doc.checkpoint('Mostrar/ocultar máscara'); L.maskOn = L.maskOn === false; docChanged(); },
  invertMask() { const L = activeLayer(); if (!L || !L.mask) return; S.doc.checkpoint('Invertir máscara'); const m = new Uint8Array(L.mask.length); for (let i = 0; i < m.length; i++) m[i] = 255 - L.mask[i]; L.mask = m; docChanged(); },
  layerFlip(horizontal) { const L = needLayer(); if (!L) return; const d = S.doc; d.checkpoint(horizontal ? 'Voltear capa horizontal' : 'Voltear capa vertical'); L.data = E.flipData(L.data, d.w, d.h, horizontal, 4); if (L.mask) L.mask = E.flipData(L.mask, d.w, d.h, horizontal, 1); docChanged(); },
  layerTransformDialog() {
    const L = needLayer(); if (!L) return; const d = S.doc, base = L.data; let timer = 0;
    const calc = (v) => E.transformData(base, d.w, d.h, v.angle * Math.PI / 180, v.scale / 100, d.w / 2, d.h / 2, v.tx, v.ty);
    dialog({ title: 'Girar y escalar capa', fields: [{ id: 'angle', label: 'Ángulo (°)', type: 'range', min: -180, max: 180, step: 0.5, value: 0 }, { id: 'scale', label: 'Escala (%)', type: 'range', min: 5, max: 400, value: 100 }, { id: 'tx', label: 'Desplazar X', type: 'range', min: -d.w, max: d.w, value: 0 }, { id: 'ty', label: 'Desplazar Y', type: 'range', min: -d.h, max: d.h, value: 0 }], ok: 'Aplicar',
      onInput: (v) => { clearTimeout(timer); timer = setTimeout(() => { S.preview = { id: L.id, data: calc(v) }; invalidate(null); }, 60); }, onOk: (v) => { clearTimeout(timer); S.preview = null; d.checkpoint('Transformar capa'); L.data = calc(v); docChanged(); }, onCancel: () => { clearTimeout(timer); S.preview = null; invalidate(null); } });
  },
  layerOffsetDialog() {
    const L = needLayer(); if (!L) return; const d = S.doc;
    dialog({ title: 'Desplazar capa', fields: [{ id: 'x', label: 'X (px)', type: 'number', value: 0 }, { id: 'y', label: 'Y (px)', type: 'number', value: 0 }, { id: 'wrap', label: 'Repetir los bordes', type: 'check', value: true }], ok: 'Aplicar', onOk: (v) => { d.checkpoint('Desplazar capa'); L.data = E.offsetData(L.data, d.w, d.h, Math.round(v.x), Math.round(v.y), v.wrap, 4); docChanged(); } });
  },
  editText() { const L = activeLayer(); if (!L || !L.text) { toast('La capa activa no es de texto.'); return; } openTextDialog(null, L); },
  fill(which) { const L = needLayer(); if (!L) return; const d = S.doc; d.beginOp('Rellenar con ' + (which === 'fg' ? 'color de frente' : 'color de fondo'), L, 'data'); E.fillMask(L.data, d.w, d.h, null, d.selection, which === 'fg' ? S.fg : S.bg, 1, L.lockAlpha); docChanged(); },
  strokeSel() {
    const d = S.doc; if (!d.selection) { toast('No hay selección.'); return; } const L = needLayer(); if (!L) return;
    amountDialog('Trazar selección', 'Grosor (px)', 4, 100, (n) => { const outer = E.growMask(d.selection, d.w, d.h, n / 2), inner = E.shrinkMask(d.selection, d.w, d.h, n / 2) || new Uint8Array(d.w * d.h), ring = new Uint8Array(d.w * d.h); if (!outer) return; for (let i = 0; i < ring.length; i++) ring[i] = Math.max(0, outer[i] - inner[i]); d.beginOp('Trazar selección', L, 'data'); E.fillMask(L.data, d.w, d.h, ring, null, S.fg, 1, L.lockAlpha); docChanged(); });
  },
  selAll() { const d = S.doc; d.setSelection(E.rectMask(d.w, d.h, 0, 0, d.w, d.h), 'Seleccionar todo'); S.modified = true; refreshAll(); schedule(); },
  selNone() { const d = S.doc; if (!d.selection) return; d.setSelection(null, 'Quitar selección'); refreshAll(); schedule(); },
  selInvert() { const d = S.doc; d.setSelection(E.invertMask(d.selection, d.w, d.h), 'Invertir selección'); S.modified = true; refreshAll(); schedule(); },
  selAlpha() { const L = activeLayer(); if (!L) return; const d = S.doc, m = new Uint8Array(d.w * d.h); for (let i = 0; i < m.length; i++) m[i] = L.data[i * 4 + 3]; d.setSelection(E.normalizeMask(m), 'Alfa a selección'); refreshAll(); schedule(); },
  cropToSel() { const d = S.doc; const b = d.selection ? E.maskBounds(d.selection, d.w, d.h) : null; if (!b) { toast('No hay selección.'); return; } cancelActive(); d.cropCanvas(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); docChanged(); fitView(); },
  rotate(q) { cancelActive(); S.doc.rotateImage(q); docChanged(); fitView(); },
  flip(hz) { cancelActive(); S.doc.flipImage(hz); docChanged(); },
  zoomIn() { setZoom(S.view.zoom * 1.5); }, zoomOut() { setZoom(S.view.zoom / 1.5); }, zoom100() { setZoom(1); }, fit: fitView,
  copy() { copySelection(false); }, cut() { if (needLayer()) copySelection(true); }, paste() { pasteClip(); }, clear() { if (needLayer()) clearSelection(false); },
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
  { label: 'Archivo', build: () => [{ label: 'Nueva imagen…', key: 'Ctrl+N', fn: newImageDialog }, { label: 'Abrir…', key: 'Ctrl+O', fn: () => $('#fileInput').click() }, { label: 'Abrir como capas…', fn: () => { $('#fileInput').dataset.layers = '1'; $('#fileInput').click(); } }, '-', { label: 'Guardar proyecto (.pintora.json)', key: 'Ctrl+S', fn: saveProject }, { label: 'Exportar como imagen…', key: 'Ctrl+E', fn: exportDialog }] },
  { label: 'Edición', build: () => [{ label: 'Deshacer', key: 'Ctrl+Z', fn: doUndo, enabled: () => S.doc.undoStack.length > 0 }, { label: 'Rehacer', key: 'Ctrl+Y', fn: doRedo, enabled: () => S.doc.redoStack.length > 0 }, '-', { label: 'Cortar', key: 'Ctrl+X', fn: A.cut }, { label: 'Copiar', key: 'Ctrl+C', fn: A.copy }, { label: 'Pegar como capa nueva', key: 'Ctrl+V', fn: A.paste, enabled: () => !!S.clip }, { label: 'Borrar', key: 'Supr', fn: A.clear }, '-', { label: 'Rellenar con el color de frente', fn: () => A.fill('fg') }, { label: 'Rellenar con el color de fondo', fn: () => A.fill('bg') }, { label: 'Trazar selección…', fn: A.strokeSel, enabled: hasSel }] },
  { label: 'Selección', build: () => [{ label: 'Todo', key: 'Ctrl+A', fn: A.selAll }, { label: 'Nada', key: 'Ctrl+Mayús+A', fn: A.selNone, enabled: hasSel }, { label: 'Invertir', key: 'Ctrl+I', fn: A.selInvert }, '-', { label: 'Agrandar…', fn: () => amountDialog('Agrandar selección', 'Píxeles', 5, 200, (n) => selOp('Agrandar selección', (m) => E.growMask(m, S.doc.w, S.doc.h, n))), enabled: hasSel }, { label: 'Reducir…', fn: () => amountDialog('Reducir selección', 'Píxeles', 5, 200, (n) => selOp('Reducir selección', (m) => E.shrinkMask(m, S.doc.w, S.doc.h, n))), enabled: hasSel }, { label: 'Difuminar bordes…', fn: () => amountDialog('Difuminar bordes', 'Radio (px)', 10, 200, (n) => selOp('Difuminar selección', (m) => E.featherMask(m, S.doc.w, S.doc.h, n))), enabled: hasSel }, { label: 'Borde…', fn: () => amountDialog('Borde de la selección', 'Grosor (px)', 5, 100, (n) => selOp('Borde de selección', (m) => { const d = S.doc, o = E.growMask(m, d.w, d.h, n), i = E.shrinkMask(m, d.w, d.h, n) || new Uint8Array(d.w * d.h), r = new Uint8Array(d.w * d.h); if (o) for (let k = 0; k < r.length; k++) r[k] = Math.max(0, o[k] - i[k]); return E.normalizeMask(r); })), enabled: hasSel }, '-', { label: 'Transparencia de la capa a selección', fn: A.selAlpha }] },
  { label: 'Ver', build: () => [{ label: 'Acercar', key: '+', fn: A.zoomIn }, { label: 'Alejar', key: '-', fn: A.zoomOut }, { label: 'Ajustar a la ventana', key: '0', fn: A.fit }, { label: 'Tamaño real (100 %)', key: '1', fn: A.zoom100 }, '-', { label: 'Mostrar selección', check: () => S.showSel, fn: () => { S.showSel = !S.showSel; schedule(); } }, { label: 'Mostrar cuadrícula (con zoom ≥ 300 %)', check: () => S.showGrid, fn: () => { S.showGrid = !S.showGrid; schedule(); } }, '-', { label: 'Tema: sistema', check: () => S.theme === 'system', fn: () => setTheme('system') }, { label: 'Tema: claro', check: () => S.theme === 'light', fn: () => setTheme('light') }, { label: 'Tema: oscuro', check: () => S.theme === 'dark', fn: () => setTheme('dark') }] },
  { label: 'Imagen', build: () => [{ label: 'Tamaño del lienzo…', fn: canvasSizeDialog }, { label: 'Escalar imagen…', fn: scaleImageDialog }, { label: 'Recortar a la selección', fn: A.cropToSel, enabled: hasSel }, '-', { label: 'Voltear horizontalmente', fn: () => A.flip(true) }, { label: 'Voltear verticalmente', fn: () => A.flip(false) }, { label: 'Girar 90° a la derecha', fn: () => A.rotate(1) }, { label: 'Girar 90° a la izquierda', fn: () => A.rotate(3) }, { label: 'Girar 180°', fn: () => A.rotate(2) }, '-', { label: 'Aplanar imagen', fn: A.flatten, enabled: () => S.doc.layers.length > 1 }] },
  { label: 'Capa', build: () => [{ label: 'Capa nueva…', key: 'Ctrl+Mayús+N', fn: () => newLayerDialog() }, { label: 'Duplicar capa', key: 'Ctrl+Mayús+D', fn: A.dupLayer }, { label: 'Eliminar capa', fn: A.delLayer }, { label: 'Combinar hacia abajo', fn: A.mergeDown }, '-', { label: 'Subir capa', fn: () => A.moveLayer(1) }, { label: 'Bajar capa', fn: () => A.moveLayer(-1) }, { label: 'Llevar al frente', fn: () => A.layerToEdge(true) }, { label: 'Llevar al fondo', fn: () => A.layerToEdge(false) }, '-', { grp: 'Máscara' }, { label: 'Añadir máscara (blanca)', fn: () => A.addMask('white') }, { label: 'Añadir máscara desde la selección', fn: () => A.addMask('sel'), enabled: hasSel }, { label: 'Añadir máscara desde la transparencia', fn: () => A.addMask('alpha') }, { label: 'Invertir máscara', fn: A.invertMask, enabled: hasLayerMask }, { label: 'Mostrar máscara', check: () => !!(activeLayer() && activeLayer().mask && activeLayer().maskOn !== false), fn: A.toggleMask, enabled: hasLayerMask }, { label: 'Aplicar máscara', fn: A.applyMask, enabled: hasLayerMask }, { label: 'Eliminar máscara', fn: A.delMask, enabled: hasLayerMask }, '-', { grp: 'Transformar' }, { label: 'Voltear capa horizontalmente', fn: () => A.layerFlip(true) }, { label: 'Voltear capa verticalmente', fn: () => A.layerFlip(false) }, { label: 'Girar y escalar…', fn: A.layerTransformDialog }, { label: 'Desplazar…', fn: A.layerOffsetDialog }, '-', { label: 'Editar texto…', fn: A.editText, enabled: isText }] },
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
  const nav = $('#menus');
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
      const map = { z: () => (e.shiftKey ? doRedo() : doUndo()), y: doRedo, a: () => (e.shiftKey ? A.selNone() : A.selAll()), i: A.selInvert, c: A.copy, x: A.cut, n: () => (e.shiftKey ? newLayerDialog() : newImageDialog()), o: () => $('#fileInput').click(), s: saveProject, e: exportDialog, f: A.repeatFilter, d: () => { if (e.shiftKey) A.dupLayer(); else return false; }, j: () => { if (e.shiftKey) A.fit(); else return false; } };
      if (map[lk]) { if (lk === 'v') return; const r = map[lk](); if (r !== false) e.preventDefault(); } return;
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
  const stage = $('#stage'), veil = $('#dropveil'); let dragN = 0;
  stage.addEventListener('dragenter', (e) => { e.preventDefault(); dragN++; veil.classList.add('on'); }); stage.addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; veil.classList.remove('on'); } });
  stage.addEventListener('dragover', (e) => e.preventDefault()); stage.addEventListener('drop', (e) => { e.preventDefault(); dragN = 0; veil.classList.remove('on'); if (e.dataTransfer.files.length) openFiles(e.dataTransfer.files, e.shiftKey); });
  setupMenus(); setupColorDock(); setupLayerDock(); setupPointer(); setupKeys();
  new ResizeObserver(() => { sizeCanvas(); schedule(); }).observe(stage);
  setDoc(buildSample(), 'Amanecer (ejemplo)'); S.modified = false;
  syncHsvFrom(S.fg); refreshColor(); refreshToolbox(); selectTool('paintbrush'); refreshStatus(); fitView();
  window.__pintora = { S, E, A, TOOL_IMPL, selectTool, setDoc, docChanged, runFilter };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
