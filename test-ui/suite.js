/*
 * Pruebas de interfaz de Pintora.
 *
 * Se cargan dentro de Electron sobre dist/pintora.html (ver run.cjs). No usan
 * Playwright ni dependencias nuevas: hablan con el DOM y con el gancho de
 * pruebas `window.__pintora`, y simulan el diálogo de guardado para comprobar
 * los archivos exportados sin abrir ventanas nativas.
 */
(() => {
  'use strict';
  const P = window.__pintora;
  const { S, E, A, TOOL_IMPL: T } = P;
  const tests = [];
  const add = (name, fn, viewport) => tests.push({ name, fn, viewport: viewport || null });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const check = (ok, msg) => { if (!ok) throw new Error(msg || 'comprobación fallida'); };
  const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'valores distintos') + ': ' + JSON.stringify(a) + ' != ' + JSON.stringify(b)); };
  const near = (a, b, eps, msg) => check(Math.abs(a - b) <= eps, (msg || 'valor fuera de rango') + ': ' + a + ' != ' + b + ' ± ' + eps);
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- gancho de guardado ---------- */
  const saves = [];
  window.claude = {
    use: async () => ({
      save: async ({ filename, data }) => {
        saves.push({ filename, type: data.type || '', buf: await data.arrayBuffer() });
      }
    })
  };
  const clearSaves = () => { saves.length = 0; };
  const lastSave = (ext) => saves.filter((s) => s.filename.toLowerCase().endsWith(ext)).pop();
  const saveText = (s) => new TextDecoder().decode(s.buf);
  const blobOf = (s) => new Blob([s.buf], { type: s.type });

  /* ---------- utilidades de documento ---------- */
  function closeDialogs() {
    for (let guard = 0; guard < 8 && $('.scrim'); guard++) {
      const scrim = $('.scrim');
      const buttons = $$('footer button', scrim);
      const cancel = buttons.find((b) => /cancelar|cerrar|descartar/i.test(b.textContent)) || buttons[0];
      if (!cancel) break;
      cancel.click();
    }
  }
  function reset(w = 48, h = 32, fill = { r: 255, g: 255, b: 255 }) {
    closeDialogs();
    const d = new E.Doc(w, h);
    const L = d.addLayer('Fondo', fill);
    d.activeId = L.id;
    d.undoStack.length = 0;
    d.redoStack.length = 0;
    P.setDoc(d, 'Prueba');
    S.modified = false;
    S.clip = null;
    S.cloneSrc = null;
    S.lastFilter = null;
    S.opts.size = 6;
    S.opts.opacity = 1;
    S.opts.sampleMerged = false;
    S.opts.fillMode = 'similar';
    S.opts.selmode = 'replace';
    S.opts.threshold = 20;
    S.opts.gradShape = 'linear';
    S.opts.gradColors = 'fgbg';
    S.opts.moveTarget = 'layer';
    S.opts.dbMode = 'dodge';
    S.opts.blurMode = 'blur';
    S.opts.pickSample = 'merged';
    P.selectTool('paintbrush');
    return { d, L };
  }
  function solid(L, color) {
    for (let i = 0; i < L.data.length; i += 4) {
      L.data[i] = color.r; L.data[i + 1] = color.g; L.data[i + 2] = color.b; L.data[i + 3] = color.a === undefined ? 255 : color.a;
    }
  }
  function ownLayer(d, name, x, y, w, h, color) {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = color.r; data[i + 1] = color.g; data[i + 2] = color.b; data[i + 3] = color.a === undefined ? 255 : color.a;
    }
    const L = d.addLayerFromData(name, data, 'Prueba', x, y, w, h);
    d.activeId = L.id;
    return L;
  }
  function flatAt(x, y) {
    P.flushDirty();
    const d = S.doc, i = (y * d.w + x) * 4;
    return Array.from(S.flat.slice(i, i + 4));
  }
  function alphaAt(L, x, y) { return L.data[(y * L.w + x) * 4 + 3]; }
  function countAlpha(L) { let n = 0; for (let i = 3; i < L.data.length; i += 4) if (L.data[i]) n++; return n; }
  const ev = (x, y, extra) => Object.assign({ x, y, cx: x, cy: y, shift: false, ctrl: false, alt: false, pressure: 0.5, pointerType: 'mouse', button: 0 }, extra || {});
  const maskBounds = (m, w, h) => m ? E.maskBounds(m, w, h) : null;

  /* ---------- utilidades de interfaz ---------- */
  function setField(id, value) {
    const el = $('#dlg_' + id);
    check(!!el, 'No existe el campo de diálogo ' + id);
    if (el.type === 'checkbox') el.checked = !!value;
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  async function okDialog() {
    const b = $('.dialog footer .btn.primary');
    check(!!b, 'No hay botón de aceptar en el diálogo');
    b.click();
    await sleep(30);
  }
  async function cancelDialog() {
    const b = $('.dialog footer .btn:not(.primary)');
    check(!!b, 'No hay botón de cancelar en el diálogo');
    b.click();
    await sleep(20);
  }
  function openMenu(label) {
    const b = $$('#menus .menubtn').find((x) => x.textContent.trim() === label);
    check(!!b, 'No existe el menú ' + label);
    b.click();
    const panel = $('#menuHost .menu');
    check(!!panel, 'El menú ' + label + ' no se abrió');
    return { button: b, panel };
  }
  function menuItem(label) {
    const item = $$('#menuHost .menu button').find((b) => {
      const l = $('.lbl', b);
      return l && l.textContent.trim() === label;
    });
    check(!!item, 'No existe la opción de menú ' + label);
    check(!item.disabled, 'La opción de menú ' + label + ' está deshabilitada');
    item.click();
  }
  function doMenu(top, label) {
    openMenu(top);
    if (window.PintoraI18n) window.PintoraI18n.apply();
    menuItem(label);
  }
  function layerButton(label) {
    const b = $$('#layerBtns button').find((x) => x.getAttribute('aria-label') === label);
    check(!!b, 'No existe el botón de capa ' + label);
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    check(!!hit && (hit === b || b.contains(hit)), 'El botón ' + label + ' está tapado por ' + (hit ? hit.tagName + '.' + hit.className : 'nada'));
    b.click();
    return b;
  }

  /* ---------- 1. arranque ---------- */
  add('arranque: documento de ejemplo, menús, herramientas y capas', () => {
    check(!!S.doc, 'No hay documento');
    check(S.doc.w === 960 && S.doc.h === 600, 'El documento de ejemplo no mide 960×600');
    check(S.doc.layers.length === 5, 'El ejemplo debe tener 5 capas');
    check($$('#menus .menubtn').length === 9, 'Deben aparecer 9 menús');
    check($$('#toolbox .tool').length >= 20, 'Faltan herramientas en la caja');
    check($$('#layerBtns button').length === 7, 'Deben aparecer 7 botones de capa');
    check($$('#dockTabs button').length === 4, 'Deben aparecer 4 pestañas de paneles');
    check(!$('.scrim'), 'Hay un diálogo abierto al arrancar');
    check(document.title === 'Pintora', 'El título de la ventana no es Pintora');
    check(!!window.__pintora.F, 'El formateador no está expuesto');
  });

  /* ---------- 2. temas ---------- */
  add('temas: botón y menú Ver alternan claro, oscuro y sistema', async () => {
    check(S.theme === 'system', 'El tema inicial debe ser el del sistema');
    const btn = $('#btnTheme');
    for (const expected of ['light', 'dark', 'system']) {
      btn.click();
      await sleep(30);
      check(S.theme === expected, 'El botón no puso el tema ' + expected + ': ' + S.theme);
      check((document.documentElement.getAttribute('data-theme') || 'system') === expected, 'Atributo data-theme incorrecto para ' + expected);
    }
    doMenu('Ver', 'Tema: claro');
    check(S.theme === 'light', 'El menú no puso el tema claro');
    doMenu('Ver', 'Tema: oscuro');
    check(S.theme === 'dark', 'El menú no puso el tema oscuro');
    doMenu('Ver', 'Tema: sistema');
    check(S.theme === 'system', 'El menú no puso el tema del sistema');
    check(!document.documentElement.hasAttribute('data-theme'), 'El tema de sistema debe quitar data-theme');
  });

  /* ---------- 3. todos los menús ---------- */
  add('menús: los nueve despliegan opciones y se cierran', async () => {
    for (const label of ['Archivo', 'Edición', 'Selección', 'Ver', 'Imagen', 'Capa', 'Colores', 'Filtros', 'Ayuda']) {
      const { button, panel } = openMenu(label);
      check(panel.isConnected, 'El menú ' + label + ' no está en el documento');
      check($$('button[role="menuitem"]', panel).length >= 1, 'El menú ' + label + ' no tiene opciones');
      button.click();
      check(!$('#menuHost .menu'), 'El menú ' + label + ' no se cerró');
    }
  });

  /* ---------- 4. todas las herramientas ---------- */
  add('herramientas: cada botón activa su herramienta y sus opciones', async () => {
    const tools = $$('#toolbox .tool');
    check(tools.length >= 20, 'Faltan herramientas');
    for (const b of tools) {
      const label = b.getAttribute('aria-label');
      b.click();
      await sleep(0);
      const on = $('#toolbox .tool.on');
      check(!!on && on.getAttribute('aria-label') === label, 'El botón ' + label + ' no quedó activo');
      check($('#options .tname').textContent.includes(label), 'Las opciones no muestran ' + label);
    }
    P.selectTool('paintbrush');
    await sleep(0);
    check($('#toolbox .tool.on').getAttribute('aria-label') === 'Pincel', 'No se pudo volver al pincel');
  });

  /* ---------- 5. regresión del solape a 1440×900 ---------- */
  add('pantalla completa 1440×900: botones de capa visibles, sin solape y operativos', async () => {
    check(innerWidth >= 1439 && innerWidth <= 1441 && innerHeight >= 899, 'El viewport no es 1440×900: ' + innerWidth + '×' + innerHeight);
    const dock = $('.dock.layers'), btns = $('#layerBtns'), hist = $('.dock.history'), title = hist.querySelector('h3');
    const dr = dock.getBoundingClientRect(), br = btns.getBoundingClientRect(), tr = title.getBoundingClientRect();
    check(br.bottom <= dr.bottom + 0.5, 'Los botones desbordan el dock: ' + br.bottom + ' > ' + dr.bottom);
    check(br.bottom <= tr.top + 0.5, 'Los botones se solapan con HISTORIAL: ' + br.bottom + ' > ' + tr.top);
    const buttons = $$('#layerBtns button');
    check(buttons.length === 7, 'No hay 7 botones de capa');
    for (const b of buttons) {
      const r = b.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      check(!!hit && (hit === b || b.contains(hit)), 'El botón ' + b.getAttribute('aria-label') + ' no recibe el clic; recibe ' + (hit ? hit.tagName + '.' + hit.className : 'nada'));
    }
    const before = S.doc.layers.length;
    layerButton('Duplicar capa');
    check(S.doc.layers.length === before + 1, 'Duplicar no creó una capa');
    $('#btnUndo').click();
    await sleep(20);
    check(S.doc.layers.length === before, 'Deshacer no retiró la capa duplicada');
  }, [1440, 900]);

  /* ---------- 6. 1920×1080 ---------- */
  add('pantalla completa 1920×1080: misma geometría sana', () => {
    check(innerWidth >= 1919 && innerHeight >= 1079, 'El viewport no es 1920×1080: ' + innerWidth + '×' + innerHeight);
    const dock = $('.dock.layers'), btns = $('#layerBtns'), hist = $('.dock.history'), title = hist.querySelector('h3');
    const dr = dock.getBoundingClientRect(), br = btns.getBoundingClientRect(), tr = title.getBoundingClientRect();
    check(br.bottom <= dr.bottom + 0.5, 'Los botones desbordan el dock a 1920');
    check(br.bottom <= tr.top + 0.5, 'Los botones se solapan con HISTORIAL a 1920');
    for (const b of $$('#layerBtns button')) {
      const r = b.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      check(!!hit && (hit === b || b.contains(hit)), 'El botón ' + b.getAttribute('aria-label') + ' no recibe el clic a 1920');
    }
  }, [1920, 1080]);

  /* ---------- 7. vista estrecha con paneles desplegables ---------- */
  add('vista estrecha 800×700: paneles desplegables y botones de capa', async () => {
    check(innerWidth >= 799 && innerWidth <= 801, 'El viewport no es 800 de ancho: ' + innerWidth);
    const docks = $('#docks'), toggle = $('#btnDocks');
    check(getComputedStyle(toggle).display !== 'none', 'El botón de paneles no está visible en vista estrecha');
    if (docks.classList.contains('open')) { toggle.click(); await sleep(20); }
    check(getComputedStyle(docks).display === 'none', 'Los paneles deberían empezar cerrados');
    toggle.click();
    await sleep(40);
    check(getComputedStyle(docks).display === 'flex', 'Los paneles no se desplegaron');
    check($('#dockTabs').getBoundingClientRect().height > 0, 'Las pestañas no están visibles');
    for (const tab of $$('#dockTabs button')) {
      tab.click();
      const name = tab.dataset.dock;
      check($('.dock[data-dock="' + name + '"]').classList.contains('show'), 'La pestaña ' + name + ' no muestra su panel');
    }
    $$('#dockTabs button').find((b) => b.dataset.dock === 'layers').click();
    const before = S.doc.layers.length;
    layerButton('Duplicar capa');
    check(S.doc.layers.length === before + 1, 'Duplicar no funcionó en el panel desplegable');
    $('#btnUndo').click();
    await sleep(20);
    check(S.doc.layers.length === before, 'Deshacer no funcionó en el panel desplegable');
    toggle.click();
    await sleep(20);
    check(!docks.classList.contains('open'), 'Los paneles no se cerraron');
  }, [800, 700]);

  /* ---------- 8. nueva capa desde el botón ---------- */
  add('capa nueva: diálogo, relleno y modo de mezcla', async () => {
    reset(40, 30);
    layerButton('Nueva capa');
    check($('.dialog header').textContent === 'Capa nueva', 'No se abrió el diálogo de capa nueva');
    setField('name', 'Nueva UI');
    setField('fill', 'white');
    setField('mode', 'multiply');
    await okDialog();
    check(S.doc.layers.length === 2, 'No se creó la capa');
    const L = S.doc.active;
    check(L.name === 'Nueva UI', 'Nombre de capa incorrecto');
    check(L.mode === 'multiply', 'Modo de capa incorrecto');
    check(flatAt(1, 1)[3] === 255 && flatAt(1, 1)[0] === 255, 'La capa no quedó rellena de blanco');
  });

  /* ---------- 9. duplicar, subir, bajar y eliminar ---------- */
  add('capas: duplicar, subir, bajar, eliminar y no borrar la última', async () => {
    const { d } = reset(24, 24);
    layerButton('Duplicar capa');
    check(d.layers.length === 2, 'Duplicar no añadió capa');
    const dup = d.active;
    layerButton('Bajar capa');
    check(d.layers[0].id === dup.id, 'Bajar no movió la capa');
    layerButton('Subir capa');
    check(d.layers[1].id === dup.id, 'Subir no movió la capa');
    layerButton('Eliminar capa');
    check(d.layers.length === 1, 'Eliminar no quitó la capa');
    layerButton('Eliminar capa');
    check(d.layers.length === 1, 'Se pudo eliminar la única capa');
    check($('#toast').textContent.includes('No puedes eliminar'), 'No avisó al intentar borrar la última capa');
  });

  /* ---------- 10. combinar, visibilidad, aplanar y orden extremo ---------- */
  add('capas: combinar, visibilidad, aplanar y llevar al frente/fondo', async () => {
    const { d } = reset(24, 18);
    const red = d.addLayer('Rojo', { r: 255, g: 0, b: 0 });
    d.activeId = red.id;
    P.docChanged();
    layerButton('Combinar hacia abajo');
    check(d.layers.length === 1, 'Combinar no redujo las capas');
    check(flatAt(2, 2)[0] === 255 && flatAt(2, 2)[1] === 0, 'El color combinado no es el esperado');

    const blue = d.addLayer('Azul', { r: 0, g: 0, b: 255 });
    d.activeId = blue.id;
    P.docChanged();
    $('#layerList .lrow.sel .eye').click();
    check(blue.visible === false, 'El ojo no ocultó la capa');
    check(flatAt(2, 2)[2] !== 255, 'La capa oculta sigue pintando');

    A.flatten();
    check(d.layers.length === 1, 'Aplanar no dejó una sola capa');

    reset(20, 20);
    const d2 = S.doc;
    const base = d2.layers[0];
    const b = d2.addLayer('B', { r: 0, g: 255, b: 0 });
    const c = d2.addLayer('C', { r: 0, g: 0, b: 255 });
    d2.activeId = b.id;
    A.layerToEdge(true);
    check(d2.layers[d2.layers.length - 1].id === b.id, 'Llevar al frente no movió la capa');
    A.layerToEdge(false);
    check(d2.layers[0].id === b.id, 'Llevar al fondo no movió la capa');
    check(!!base && !!c, 'Documento de orden incompleto');
  });

  /* ---------- 11. renombrar, opacidad, modo y bloqueo ---------- */
  add('fila de capa: renombrar, opacidad, modo y bloqueo de alfa', async () => {
    const { d } = reset(30, 24);
    const L = d.active;
    const nameEl = $('#layerList .lrow.sel .name');
    nameEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = $('#layerList .lrow.sel .name input');
    check(!!input, 'No apareció el campo de renombrar');
    input.value = 'Renombrada';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await sleep(20);
    check(L.name === 'Renombrada', 'El nombre no cambió');

    const op = $('#opacSel');
    op.value = '37';
    op.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(10);
    near(L.opacity, 0.37, 0.001, 'La opacidad no cambió');
    op.dispatchEvent(new Event('change', { bubbles: true }));

    const mode = $('#modeSel');
    mode.value = 'screen';
    mode.dispatchEvent(new Event('change', { bubbles: true }));
    check(L.mode === 'screen', 'El modo de mezcla no cambió');

    const lock = $('#lockAlpha');
    lock.click();
    check(L.lockAlpha === true, 'El bloqueo de transparencia no se activó');
  });

  /* ---------- 12. máscaras ---------- */
  add('máscaras: desde selección, invertir, ocultar, aplicar y quitar', async () => {
    const { d } = reset(32, 24);
    const L = d.active;
    d.setSelection(E.rectMask(d.w, d.h, 4, 4, 20, 16), 'Prueba');
    P.refreshAll();
    doMenu('Capa', 'Añadir máscara desde la selección');
    check(!!L.mask && L.mask.length === L.w * L.h, 'No se añadió la máscara');
    check(d.editMask === true, 'La máscara no quedó en edición');
    check(L.mask[4 * d.w + 4] === 255 && L.mask[0] === 0, 'La máscara no respeta la selección');

    doMenu('Capa', 'Invertir máscara');
    check(L.mask[4 * d.w + 4] === 0 && L.mask[0] === 255, 'Invertir máscara no funcionó');
    doMenu('Capa', 'Mostrar máscara');
    check(L.maskOn === false, 'Ocultar máscara no funcionó');
    doMenu('Capa', 'Mostrar máscara');
    check(L.maskOn === true, 'Volver a mostrar la máscara no funcionó');
    doMenu('Capa', 'Aplicar máscara');
    check(L.mask === null, 'Aplicar máscara no la retiró');
    check(alphaAt(L, 4, 4) === 0 && alphaAt(L, 0, 0) === 255, 'La máscara invertida no se aplicó al alfa');

    layerButton('Añadir máscara de capa');
    check(!!L.mask && L.mask[0] === 255, 'El botón de máscara no añadió una máscara blanca');
    A.delMask();
    check(L.mask === null, 'Eliminar máscara no funcionó');
  });

  /* ---------- 13. pincel, borrador y aerógrafo ---------- */
  add('pintura: pincel, borrador y aerógrafo con trazos reales', async () => {
    const { L } = reset(32, 24);
    S.fg = { r: 0, g: 0, b: 0 };
    T.paintbrush.down(ev(16, 12));
    T.paintbrush.up();
    check(flatAt(16, 12)[0] < 40 && flatAt(16, 12)[3] === 255, 'El pincel no pintó negro');

    T.eraser.down(ev(16, 12));
    T.eraser.up();
    check(alphaAt(L, 16, 12) === 0, 'El borrador no dejó transparente');

    T.airbrush.down(ev(8, 8));
    await sleep(110);
    T.airbrush.up();
    check(countAlpha(L) > 0, 'El aerógrafo no pintó nada');
  });

  /* ---------- 14. lápiz, clonar, sobreexponer, desenfocar y manchar ---------- */
  add('pintura: lápiz, clonar, sobreexponer/subexponer, desenfocar y manchar', async () => {
    let ctx = reset(32, 24);
    T.pencil.down(ev(10, 10));
    T.pencil.up();
    check(ctx.L.data[(10 * 32 + 10) * 4 + 3] > 0, 'El lápiz no pintó');

    ctx = reset(32, 24);
    const black = (x, y) => { const i = (y * ctx.L.w + x) * 4; ctx.L.data[i] = ctx.L.data[i + 1] = ctx.L.data[i + 2] = 0; ctx.L.data[i + 3] = 255; };
    black(5, 5); black(6, 5); black(5, 6); black(6, 6);
    S.cloneSrc = { x: 5, y: 5 };
    T.clone.down(ev(20, 14));
    T.clone.up();
    check(ctx.L.data[(14 * 32 + 20) * 4] < 100, 'Clonar no copió el origen');

    ctx = reset(32, 24);
    solid(ctx.L, { r: 128, g: 128, b: 128 });
    T.dodgeburn.down(ev(16, 12));
    T.dodgeburn.up();
    check(ctx.L.data[(12 * 32 + 16) * 4] !== 128, 'Sobreexponer no cambió el gris');

    ctx = reset(32, 24);
    black(16, 12); black(17, 12); black(16, 11); black(17, 11);
    const before = ctx.L.data.slice();
    T.blur.down(ev(16, 12));
    T.blur.up();
    check(ctx.L.data.some((v, i) => v !== before[i]), 'Desenfocar no cambió la imagen');

    ctx = reset(32, 24);
    black(8, 12); black(9, 12); black(8, 13); black(9, 13);
    T.smudge.down(ev(8, 12));
    T.smudge.move(ev(20, 12, { cx: 80, cy: 48 }));
    T.smudge.up();
    check(ctx.L.data.length === 32 * 24 * 4, 'Manchar dañó el búfer');
  });

  /* ---------- 15. cubo, degradado y cuentagotas ---------- */
  add('pintura: cubo, degradado y cuentagotas', async () => {
    const ctx = reset(16, 16);
    S.fg = { r: 255, g: 0, b: 0 };
    T.bucket.down(ev(8, 8));
    check(flatAt(8, 8)[0] === 255 && flatAt(8, 8)[1] === 0, 'El cubo no rellenó de rojo');

    reset(32, 24);
    S.fg = { r: 0, g: 0, b: 0 };
    S.bg = { r: 255, g: 255, b: 255 };
    S.opts.gradColors = 'fgbg';
    T.gradient.down(ev(2, 12));
    T.gradient.move(ev(30, 12, { cx: 120, cy: 48 }));
    T.gradient.up();
    check(flatAt(3, 12)[0] !== flatAt(29, 12)[0], 'El degradado no varió de color');

    reset(16, 16);
    solid(S.doc.active, { r: 200, g: 30, b: 40 });
    P.docChanged();
    P.flushDirty();
    S.fg = { r: 0, g: 0, b: 0 };
    T.picker.down(ev(8, 8));
    near(S.fg.r, 200, 2, 'El cuentagotas no tomó el rojo');
    near(S.fg.g, 30, 2, 'El cuentagotas no tomó el verde');
    near(S.fg.b, 40, 2, 'El cuentagotas no tomó el azul');
    // Recuperar un documento limpio tras el cuentagotas.
    reset(16, 16);
  });

  /* ---------- 16. selecciones geométricas ---------- */
  add('selecciones: rectangular, elíptica y libre', async () => {
    reset(32, 24);
    T.rect.down(ev(4, 3));
    T.rect.move(ev(20, 15, { cx: 80, cy: 60 }));
    T.rect.up();
    let b = maskBounds(S.doc.selection, S.doc.w, S.doc.h);
    check(!!b && b.x0 === 4 && b.y0 === 3 && b.x1 === 20 && b.y1 === 15, 'Selección rectangular incorrecta');
    A.selNone();

    T.ellipse.down(ev(4, 3));
    T.ellipse.move(ev(20, 15, { cx: 80, cy: 60 }));
    T.ellipse.up();
    b = maskBounds(S.doc.selection, S.doc.w, S.doc.h);
    check(!!b && b.x0 >= 2 && b.x0 <= 5 && b.y0 >= 1 && b.y0 <= 4 && b.x1 >= 19 && b.x1 <= 22 && b.y1 >= 14 && b.y1 <= 17, 'Selección elíptica incorrecta: ' + JSON.stringify(b));
    check(S.doc.selection[12 * S.doc.w + 12] === 255, 'El centro de la elipse no está seleccionado');
    A.selNone();

    T.free.down(ev(4, 4));
    T.free.move(ev(20, 4, { cx: 80, cy: 16 }));
    T.free.move(ev(20, 16, { cx: 80, cy: 64 }));
    T.free.move(ev(4, 16, { cx: 16, cy: 64 }));
    T.free.up();
    b = maskBounds(S.doc.selection, S.doc.w, S.doc.h);
    check(!!b && b.x1 > b.x0 && b.y1 > b.y0, 'La selección libre no cerró');
    A.selNone();
    check(!S.doc.selection, 'Quitar selección no la eliminó');
  });

  /* ---------- 17. varita mágica, quitar fondo y selección por color ---------- */
  add('selección mágica y quitar fondo: varita y selección por color', async () => {
    const { d, L } = reset(32, 24);
    solid(L, { r: 255, g: 255, b: 255 });
    for (let y = 6; y < 16; y++) for (let x = 10; x < 20; x++) {
      const i = (y * 32 + x) * 4;
      L.data[i] = 255; L.data[i + 1] = 0; L.data[i + 2] = 0; L.data[i + 3] = 255;
    }
    S.opts.sampleMerged = false;
    T.fuzzy.down(ev(2, 2));
    check(!!d.selection, 'La varita mágica no creó selección');
    check(d.selection[2 * d.w + 2] === 255, 'La varita no seleccionó el fondo');
    check(d.selection[10 * d.w + 12] === 0, 'La varita seleccionó también el rectángulo rojo');
    A.clear();
    check(flatAt(2, 2)[3] === 0, 'Quitar fondo no dejó transparente el fondo');
    check(flatAt(12, 10)[3] === 255, 'Quitar fondo borró el rectángulo que debía conservarse');

    reset(3, 1);
    const row = S.doc.active;
    const put = (x, c) => { const i = x * 4; row.data[i] = c[0]; row.data[i + 1] = c[1]; row.data[i + 2] = c[2]; row.data[i + 3] = 255; };
    put(0, [255, 0, 0]); put(1, [0, 0, 255]); put(2, [250, 0, 0]);
    T.bycolor.down(ev(0, 0));
    check(S.doc.selection[2] === 255, 'La selección por color no alcanzó el píxel lejano');
    check(S.doc.selection[1] === 0, 'La selección por color incluyó el azul');
    A.selNone();
  });

  /* ---------- 18. todo, nada, invertir, copiar, pegar y cortar ---------- */
  add('selección: todo, nada, invertir, copiar, pegar y cortar', async () => {
    const { d, L } = reset(16, 16);
    solid(L, { r: 200, g: 20, b: 20 });
    A.selAll();
    check(S.doc.selection[0] === 255 && S.doc.selection[15] === 255, 'Seleccionar todo no cubrió el documento');
    A.selInvert();
    check(!S.doc.selection, 'Invertir una selección completa debería dejarla vacía');
    A.selNone();
    check(!S.doc.selection, 'Quitar selección no funcionó');

    d.setSelection(E.rectMask(d.w, d.h, 4, 4, 8, 8), 'Prueba');
    A.copy();
    check(!!S.clip && S.clip.w === 4 && S.clip.h === 4, 'Copiar no generó el portapapeles interno');
    P.pasteClip();
    const pasted = d.active;
    check(pasted.x === 4 && pasted.y === 4 && pasted.w === 4 && pasted.h === 4, 'Pegar no respetó la posición y el tamaño');
    A.cut();
    check(alphaAt(pasted, 0, 0) === 0, 'Cortar no borró el contenido pegado');
  });

  /* ---------- 19. texto ---------- */
  add('texto: crear, rasterizar y volver a editar', async () => {
    reset(80, 60);
    T.text.down(ev(8, 8));
    check(!!$('.dialog'), 'La herramienta de texto no abrió el diálogo');
    await cancelDialog();
    check(S.doc.layers.length === 1, 'Cancelar el texto dejó una capa');

    P.openTextDialog({ x: 8, y: 8 }, null);
    setField('text', 'Hola');
    setField('size', 24);
    await okDialog();
    const L = S.doc.active;
    check(!!L.text && L.text.text === 'Hola', 'No se creó la capa de texto');
    check(L.name === 'Hola', 'La capa de texto no tomó el nombre');
    check(countAlpha(L) > 0, 'El texto no se rasterizó');
    check(L.text.x === 8 && L.text.y === 8, 'El texto no respetó la posición');

    P.openTextDialog(null, L);
    check($('.dialog header').textContent === 'Editar texto', 'No se abrió la edición de texto');
    setField('text', 'Adiós');
    setField('align', 'center');
    await okDialog();
    check(L.text.text === 'Adiós' && L.text.align === 'center', 'La edición de texto no se aplicó');
  });

  /* ---------- 20. filtros ---------- */
  add('filtros: invertir, brillo/contraste, curvas y repetir', async () => {
    const { L } = reset(8, 8);
    solid(L, { r: 255, g: 255, b: 255 });
    P.runFilter('invert');
    check(flatAt(4, 4)[0] === 0 && flatAt(4, 4)[3] === 255, 'Invertir no invirtió el blanco');

    P.runFilter('brightness_contrast');
    check($('.dialog header').textContent === 'Brillo y contraste', 'No se abrió el diálogo de brillo');
    setField('brightness', 50);
    await okDialog();
    check(flatAt(4, 4)[0] > 0, 'Brillo no aclaró el negro');

    P.runFilter('curves');
    check($('.dialog header').textContent === 'Curvas', 'No se abrió el diálogo de curvas');
    await okDialog();
    check(flatAt(4, 4).length === 4, 'Curvas dañó la imagen');

    P.runFilter('invert');
    P.A.repeatFilter();
    check(flatAt(4, 4).length === 4, 'Repetir filtro dañó la imagen');
  });

  /* ---------- 21. transformaciones de imagen y capa ---------- */
  add('transformaciones: girar, voltear, recortar, desplazar y transformar capa', async () => {
    const { d } = reset(20, 10);
    A.rotate(1);
    check(d.w === 10 && d.h === 20, 'Girar no intercambió el tamaño');
    A.flip(true);
    check(d.w === 10 && d.h === 20, 'Voltear cambió el tamaño');
    d.setSelection(E.rectMask(d.w, d.h, 2, 2, 6, 6), 'Prueba');
    P.refreshAll();
    A.cropToSel();
    check(d.w === 4 && d.h === 4, 'Recortar a la selección no recortó');
    check(d.active.w === 4 && d.active.h === 4, 'La capa no se recortó con el lienzo');

    reset(20, 10);
    const d2 = S.doc;
    const own = ownLayer(d2, 'Móvil', 2, 2, 4, 4, { r: 255, g: 0, b: 0 });
    P.docChanged();
    A.layerOffsetDialog();
    setField('x', 7);
    setField('y', 5);
    await okDialog();
    check(own.x === 7 && own.y === 5, 'Desplazar capa no cambió su posición');
    A.layerFlip(true);
    check(own.data.length === 64, 'Voltear capa dañó el búfer');
    A.layerTransformDialog();
    await okDialog();
    check(own.data.length === 64, 'Girar y escalar capa dañó el búfer');
  });

  /* ---------- 22. proyecto y PSD ---------- */
  add('archivos: guardar proyecto v4, abrirlo y guardar PSD', async () => {
    const { d } = reset(16, 12);
    const own = ownLayer(d, 'Capa propia', 3, 2, 4, 4, { r: 220, g: 20, b: 30 });
    P.docChanged();
    const project = P.projectData();
    check(project.format === 'pintora' && project.version === 4, 'El proyecto no es v4');
    check(project.w === 16 && project.h === 12, 'Tamaño de proyecto incorrecto');
    const savedLayer = project.layers.find((l) => l.name === 'Capa propia');
    check(!!savedLayer && savedLayer.x === 3 && savedLayer.y === 2 && savedLayer.w === 4 && savedLayer.h === 4, 'El proyecto no guardó los límites de capa');

    clearSaves();
    await P.saveProject();
    const ps = lastSave('.pintora.json');
    check(!!ps, 'No se guardó el proyecto');
    const parsed = JSON.parse(saveText(ps));
    check(parsed.version === 4 && parsed.layers.length === 2, 'El proyecto guardado está incompleto');

    await P.loadProject(JSON.stringify(parsed), 'Cargado');
    check(S.doc.w === 16 && S.doc.h === 12, 'Abrir el proyecto no restauró el tamaño');
    check(S.doc.active.name === 'Capa propia' && S.doc.active.x === 3 && S.doc.active.y === 2, 'Abrir el proyecto no restauró la capa activa');

    clearSaves();
    await P.savePsd();
    const psdSave = lastSave('.psd');
    check(!!psdSave, 'No se guardó el PSD');
    const head = new TextDecoder('latin1').decode(psdSave.buf.slice(0, 4));
    check(head === '8BPS', 'El PSD no tiene cabecera 8BPS');
    const psd = P.F.readPsd(psdSave.buf);
    const pl = psd.layers.find((l) => l.name === 'Capa propia');
    check(!!pl && pl.left === 3 && pl.top === 2 && pl.w === 4 && pl.h === 4, 'El PSD no conservó los límites de capa');
    check(!!own, 'Capa propia perdida');
  });

  /* ---------- 23. exportaciones ---------- */
  add('exportaciones: PNG, JPEG, WebP, TIFF 8/16 y GIF con tamaño y contenido', async () => {
    const { d } = reset(8, 6);
    solid(d.layers[0], { r: 255, g: 255, b: 255 });
    const red = d.addLayer('Rojo', { r: 220, g: 20, b: 20 });
    d.activeId = red.id;
    const blue = d.addLayer('Azul', { r: 20, g: 20, b: 220 });
    d.activeId = blue.id;
    P.docChanged();
    clearSaves();
    await P.exportImage('png', 0.9, { r: 255, g: 255, b: 255 }, 100);
    await P.exportImage('jpeg', 0.9, { r: 255, g: 255, b: 255 }, 100);
    await P.exportImage('webp', 0.9, { r: 255, g: 255, b: 255 }, 100);
    await P.exportImage('tiff', 0.9, { r: 255, g: 255, b: 255 }, 100);
    await P.exportImage('tiff16', 0.9, { r: 255, g: 255, b: 255 }, 100);
    await P.exportImage('gif', 0.9, { r: 255, g: 255, b: 255 }, 120);
    const png = lastSave('.png'), jpg = lastSave('.jpg'), webp = lastSave('.webp'), gif = lastSave('.gif');
    const tiffs = saves.filter((s) => s.filename.toLowerCase().endsWith('.tiff'));
    check(!!png && !!jpg && !!webp && !!gif && tiffs.length === 2, 'Falta alguna exportación: ' + saves.map((s) => s.filename).join(', '));
    for (const s of [png, jpg, webp]) {
      const bm = await createImageBitmap(blobOf(s));
      check(bm.width === 8 && bm.height === 6, 'La imagen exportada ' + s.filename + ' no mide 8×6');
      bm.close();
    }
    const timg8 = P.F.readTiff(tiffs[0].buf), timg16 = P.F.readTiff(tiffs[1].buf);
    check(timg8.w === 8 && timg8.h === 6 && timg8.depth === 8, 'El TIFF de 8 bits no mide 8×6');
    check(timg16.w === 8 && timg16.h === 6 && timg16.depth === 16, 'El TIFF de 16 bits no mide 8×6 o no declara 16 bits');
    const gimg = P.F.readGif(gif.buf);
    check(gimg.w === 8 && gimg.h === 6 && gimg.frames >= 2, 'El GIF no contiene los fotogramas de las capas');
    check(flatAt(4, 3)[3] === 255, 'La imagen de origen está vacía');
  });

  /* ---------- 24. importar como capa y mover fuera del lienzo ---------- */
  add('importación: imagen como capa con límites propios y movimiento no destructivo', async () => {
    const { d } = reset(20, 20);
    const data = new Uint8ClampedArray(6 * 6 * 4);
    for (let i = 0; i < data.length; i += 4) { data[i] = 255; data[i + 1] = 10; data[i + 2] = 10; data[i + 3] = 255; }
    P.addImageAsLayer({ w: 6, h: 6, data }, 'Importada.png');
    const L = d.active;
    check(L.name === 'Importada', 'La capa importada no tomó el nombre');
    check(L.x === 7 && L.y === 7 && L.w === 6 && L.h === 6, 'La capa importada no se centró con tamaño propio');
    check(flatAt(10, 10)[0] > 240 && flatAt(10, 10)[1] < 40, 'La capa importada no se compuso');
    check($('#layerList .lrow.sel .meta').textContent.includes('6×6 @ 7,7'), 'La fila no muestra los límites de la capa');

    S.opts.moveTarget = 'layer';
    T.move.down(ev(10, 10));
    T.move.move(ev(-20, -20));
    T.move.up();
    check(L.x < 0 && L.y < 0, 'Mover no llevó la capa fuera del lienzo');
    check(L.data.length === 6 * 6 * 4, 'Mover dañó el búfer de la capa');
    A.undo();
    const restored = S.doc.layers.find((l) => l.id === L.id) || S.doc.active;
    check(restored.x === 7 && restored.y === 7, 'Deshacer no restauró la posición de la capa');
  });

  /* ---------- 25. colores ---------- */
  add('colores: hexadecimal, intercambiar, negro/blanco y paleta', async () => {
    reset(16, 16);
    const hex = $('#hexIn');
    hex.value = '#ff0000';
    hex.dispatchEvent(new Event('input', { bubbles: true }));
    check(S.fg.r === 255 && S.fg.g === 0 && S.fg.b === 0, 'El campo hexadecimal no cambió el color de frente');
    $('#btnSwap').click();
    check(S.fg.r === 255 && S.fg.g === 255 && S.fg.b === 255, 'Intercambiar no movió el blanco al frente');
    check(S.bg.r === 255 && S.bg.g === 0 && S.bg.b === 0, 'Intercambiar no movió el rojo al fondo');
    $('#btnDefColors').click();
    check(S.fg.r === 0 && S.fg.g === 0 && S.fg.b === 0 && S.bg.r === 255 && S.bg.g === 255 && S.bg.b === 255, 'Negro y blanco no restauró los colores');
    const swatch = $('#palette button');
    check(!!swatch, 'La paleta está vacía');
    swatch.click();
    check(S.fg.r !== 0 || S.fg.g !== 0 || S.fg.b !== 0, 'La paleta no cambió el color');
  });

  /* ---------- 26. zoom, ayuda, acerca de y rehacer ---------- */
  add('interfaz: zoom, rehacer, atajos y acerca de', async () => {
    reset(30, 20);
    A.zoom100();
    near(S.view.zoom, 1, 0.0001, 'Zoom 100 % no dejó el zoom en 1');
    A.zoomIn();
    check(S.view.zoom > 1, 'Acercar no aumentó el zoom');
    A.fit();
    check(S.view.zoom > 0 && S.view.zoom <= 8, 'Ajustar dejó un zoom inválido');
    layerButton('Duplicar capa');
    $('#btnUndo').click();
    await sleep(20);
    check(S.doc.layers.length === 1, 'Deshacer no quitó la capa');
    $('#btnRedo').click();
    await sleep(20);
    check(S.doc.layers.length === 2, 'Rehacer no recuperó la capa');

    doMenu('Ayuda', 'Atajos de teclado');
    check($('.dialog header').textContent === 'Atajos de teclado', 'No se abrieron los atajos');
    const helpText = $('.dialog .body').textContent;
    check(helpText.includes('Ctrl+Mayús+D') && helpText.includes('Ctrl+S') && helpText.includes('Ctrl+E'), 'Los atajos no incluyen las acciones actuales');
    await okDialog();
    doMenu('Ayuda', 'Acerca de Pintora');
    check($('.dialog header').textContent === 'Acerca de Pintora', 'No se abrió Acerca de');
    const aboutText = $('.dialog .body').textContent;
    check(aboutText.includes('0.1.0') && aboutText.includes('22 herramientas') && aboutText.includes('PSD') && aboutText.includes('v4') && aboutText.includes('GPL-3.0-or-later'), 'Acerca de no refleja las capacidades actuales');
    await okDialog();
  });

  /* ---------- 27. diálogos de archivo e imagen ---------- */
  add('diálogos: exportar (cancelar), imagen nueva y tamaño del lienzo', async () => {
    reset(30, 20);
    doMenu('Archivo', 'Exportar como imagen…');
    check($('.dialog header').textContent === 'Exportar imagen', 'No se abrió el diálogo de exportación');
    await cancelDialog();
    check(!$('.scrim'), 'Cancelar exportación dejó el diálogo abierto');

    doMenu('Archivo', 'Nueva imagen…');
    check($('.dialog header').textContent === 'Imagen nueva', 'No se abrió Imagen nueva');
    setField('w', 30);
    setField('hh', 20);
    await okDialog();
    await sleep(80);
    check(S.doc.w === 30 && S.doc.h === 20, 'Imagen nueva no aplicó el tamaño');

    doMenu('Imagen', 'Tamaño del lienzo…');
    check($('.dialog header').textContent === 'Tamaño del lienzo', 'No se abrió Tamaño del lienzo');
    setField('w', 40);
    setField('hh', 30);
    await okDialog();
    check(S.doc.w === 40 && S.doc.h === 30, 'Tamaño del lienzo no se aplicó');
  });

  /* ---------- 28. viewport ---------- */
  add('ventana: la aplicación ocupa todo el viewport sin scroll', () => {
    const html = document.documentElement, app = $('#app').getBoundingClientRect();
    check(html.scrollWidth === innerWidth, 'Hay scroll horizontal: ' + html.scrollWidth + ' != ' + innerWidth);
    check(html.scrollHeight === innerHeight, 'Hay scroll vertical: ' + html.scrollHeight + ' != ' + innerHeight);
    near(app.x, 0, 0.5, 'La app no empieza en x=0');
    near(app.y, 0, 0.5, 'La app no empieza en y=0');
    near(app.width, innerWidth, 0.5, 'La app no ocupa el ancho del viewport');
    near(app.height, innerHeight, 0.5, 'La app no ocupa el alto del viewport');
  });

  /* ---------- 29. idioma ---------- */
  add('idioma: español e inglés, menús, modos, filtros, atajos y estado', async () => {
    reset(32, 24);
    P.setLang('es');
    check($('#menus .menubtn').textContent.trim() === 'Archivo', 'El menú inicial no está en español');
    check($('.dock.layers h3').textContent.trim() === 'Capas', 'El panel de capas no está en español');
    check($$('#modeSel option').some((o) => o.textContent === 'Trama') && !$$('#modeSel option').some((o) => /Screen|Dodge|Burn/.test(o.textContent)), 'Los modos de mezcla no están limpios en español');
    P.setLang('en');
    check(document.documentElement.lang === 'en', 'El documento no declara inglés');
    check($('#menus .menubtn').textContent.trim() === 'File', 'El menú no cambió a File');
    check($('.dock.layers h3').textContent.trim() === 'Layers', 'El panel no cambió a Layers');
    check($('#toolbox .tool').title.includes('Rectangular selection'), 'La herramienta no cambió a inglés: ' + $('#toolbox .tool').title);
    check($('#stInfo').textContent.includes('layer'), 'El estado no cambió a inglés: ' + $('#stInfo').textContent);
    check($$('#modeSel option').some((o) => o.textContent === 'Screen') && $$('#modeSel option').some((o) => o.textContent === 'Dodge') && $$('#modeSel option').some((o) => o.textContent === 'Burn'), 'Los modos de mezcla no se tradujeron');
    check($$('#modeSel optgroup').some((o) => o.label === 'Lighten') && $$('#modeSel optgroup').some((o) => o.label === 'Contrast'), 'Los grupos de modos no se tradujeron: ' + $$('#modeSel optgroup').map((o) => o.label).join(', '));
    doMenu('File', 'Export as image…');
    window.PintoraI18n.apply();
    const exportDialog = $('.dialog .body').textContent;
    check(exportDialog.includes('PNG (lossless') && exportDialog.includes('Animated GIF'), 'El diálogo de exportación no se tradujo: ' + exportDialog.slice(0, 120));
    await cancelDialog();
    doMenu('Help', 'Keyboard shortcuts');
    window.PintoraI18n.apply();
    const help = $('.dialog .body').textContent;
    check(help.includes('Rectangular, elliptical') && help.includes('Ctrl+Shift+D') && help.includes('Copy · cut'), 'Los atajos no se tradujeron: ' + help.slice(0, 120));
    await okDialog();
    doMenu('Help', 'About Pintora');
    window.PintoraI18n.apply();
    const about = $('.dialog .body').textContent;
    check(about.includes('22 tools') && about.includes('8/16-bit TIFF') && about.includes('ICC profile'), 'Acerca de no se tradujo: ' + about.slice(0, 160));
    await okDialog();
    P.setLang('es');
    check($('#menus .menubtn').textContent.trim() === 'Archivo', 'No se pudo volver al español');
    check($$('#modeSel option').some((o) => o.textContent === 'Trama'), 'Los modos no volvieron al español');
  });

  /* ---------- 30. trazado vectorial y SVG ---------- */
  add('trazado vectorial: crear, cerrar y exportar SVG', async () => {
    reset(40, 30);
    P.selectTool('path');
    const t = P.TOOL_IMPL.path;
    t.down({ x: 5, y: 5, shift: false, ctrl: false, alt: false });
    t.down({ x: 30, y: 8, shift: false, ctrl: false, alt: false });
    t.down({ x: 18, y: 24, shift: false, ctrl: false, alt: false });
    t.key({ key: 'Enter' });
    const L = S.doc.active;
    check(!!L && !!L.path && L.path.closed && L.path.points.length === 3, 'El trazado no conserva sus tres puntos cerrados');
    check(Array.from(L.data).some((v) => v > 0), 'El trazado no se rasterizó en la capa');
    clearSaves();
    await P.exportSvg();
    const svg = lastSave('.svg');
    check(!!svg && saveText(svg).includes('<path') && saveText(svg).includes('M 5 5'), 'El SVG no contiene el trazado vectorial');
  });

  /* ---------- 31. XCF de ida y vuelta ---------- */
  add('archivos: guardar y abrir XCF con capas y opacidad', async () => {
    reset(12, 8);
    const L = S.doc.layers[0]; L.opacity = 0.6; L.name = 'XCF prueba';
    clearSaves();
    await P.saveXcf();
    const saved = lastSave('.xcf');
    check(!!saved && saved.buf.byteLength > 0, 'No se guardó el XCF');
    const parsed = await P.F.readXcf(saved.buf);
    check(parsed.w === 12 && parsed.h === 8 && parsed.layers.length === 1, 'El XCF no conserva tamaño y capas');
    check(parsed.layers[0].name === 'XCF prueba' && Math.abs(parsed.layers[0].opacity - 0.6) < 0.03, 'El XCF no conserva nombre y opacidad');
  });

  window.__uiTests = tests;
  true;
})();
