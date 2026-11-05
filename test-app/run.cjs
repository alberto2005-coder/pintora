'use strict';
/*
 * Pruebas exclusivas del ejecutable Electron.
 *
 * No usan el mock de `window.claude`: arrancan la ventana de producción, dejan
 * que el guardado caiga en el fallback de descarga del navegador y capturan
 * esas descargas reales en una carpeta temporal. También comprueban la apertura
 * de archivos desde disco, IndexedDB, recuperación de sesión y la configuración
 * nativa de la ventana.
 *
 * Límite deliberado: no automatizan el selector nativo de archivos ni el
 * portapapeles del sistema, porque dependen de la interfaz del sistema
 * operativo. Esas comprobaciones quedan documentadas como manuales.
 */
const { app, session, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { createWindow, WINDOW_OPTIONS } = require('../electron/window');

const root = path.join(__dirname, '..');
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-app-'));
const downloadDir = path.join(workDir, 'descargas');
fs.mkdirSync(downloadDir, { recursive: true });
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.setPath('userData', path.join(workDir, 'datos'));
app.setPath('downloads', downloadDir);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let win;
const downloads = [];
const consoleErrors = [];
const pageErrors = [];

function check(ok, message) { if (!ok) throw new Error(message); }
function eq(a, b, message) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(message + ': ' + JSON.stringify(a) + ' != ' + JSON.stringify(b)); }
function evalPage(code) { return win.webContents.executeJavaScript(code, true); }

async function waitFor(fn, timeout, label) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeout) {
    try { if (await fn()) return; } catch (e) { last = e; }
    await sleep(60);
  }
  throw new Error('Tiempo de espera agotado: ' + label + (last ? ' (' + last.message + ')' : ''));
}

function installErrorHooks() {
  if (typeof window.__appErrors === 'undefined') {
    window.__appErrors = [];
    window.addEventListener('error', (e) => window.__appErrors.push(String(e.message || e.error || e)));
    window.addEventListener('unhandledrejection', (e) => window.__appErrors.push(String(e.reason || e)));
  }
}

async function attachWindow(w, tag) {
  win = w;
  w.webContents.on('console-message', (event) => {
    if (event.level === 'error' || event.level === 3) consoleErrors.push(tag + ': ' + String(event.message));
  });
  w.webContents.on('render-process-gone', (event, details) => pageErrors.push(tag + ': render-process-gone ' + (details.reason || details.exitCode)));
  await waitFor(async () => {
    try { return await evalPage('!!document.querySelector("#stage")'); } catch (e) { return false; }
  }, 12000, 'carga de la ventana ' + tag);
  await evalPage('(' + installErrorHooks.toString() + ')()');
  await waitFor(async () => {
    try { return await evalPage('!!window.__pintora && !!window.__pintora.S.doc'); } catch (e) { return false; }
  }, 12000, 'hook __pintora en ' + tag);
}

function downloadRecord(filename) {
  return downloads.find((d) => d.filename === filename);
}

async function waitDownload(filename, timeout = 20000) {
  await waitFor(async () => {
    const rec = downloadRecord(filename);
    if (!rec) return false;
    if (rec.state === 'cancelled' || rec.state === 'interrupted') throw new Error('La descarga ' + filename + ' terminó en estado ' + rec.state);
    return rec.state === 'completed' && fs.existsSync(rec.path) && fs.statSync(rec.path).size > 0;
  }, timeout, 'descarga real de ' + filename);
  return downloadRecord(filename);
}

async function openFileOnDisk(file, name, type, asLayers) {
  const b64 = fs.readFileSync(file).toString('base64');
  return evalPage(`(async () => {
    const P = window.__pintora;
    const bytes = Uint8Array.from(atob(${JSON.stringify(b64)}), (c) => c.charCodeAt(0));
    const file = new File([bytes], ${JSON.stringify(name)}, { type: ${JSON.stringify(type)} });
    await P.openFiles([file], ${asLayers ? 'true' : 'false'});
    return { w: P.S.doc.w, h: P.S.doc.h, layers: P.S.doc.layers.length, name: P.S.name, active: P.S.doc.active && P.S.doc.active.name };
  })()`);
}

async function inspectSaved(file, kind) {
  const b64 = fs.readFileSync(file).toString('base64');
  return evalPage(`(async () => {
    const P = window.__pintora;
    const bytes = Uint8Array.from(atob(${JSON.stringify(b64)}), (c) => c.charCodeAt(0));
    const buffer = bytes.buffer;
    if (${JSON.stringify(kind)} === 'tiff') { const t = P.F.readTiff(buffer); return { w: t.w, h: t.h }; }
    if (${JSON.stringify(kind)} === 'gif') { const g = P.F.readGif(buffer); return { w: g.w, h: g.h, frames: g.frames }; }
    const p = P.F.readPsd(buffer);
    return { w: p.w, h: p.h, layers: p.layers.length };
  })()`);
}

// Keep the test process alive while the first window is destroyed and the
// second one boots from the same IndexedDB partition. The production shell
// still uses its own window-all-closed handler in electron/main.js.
app.on('window-all-closed', () => {});

async function main() {
  session.defaultSession.on('will-download', (event, item) => {
    const filename = item.getFilename();
    const dest = path.join(downloadDir, filename);
    item.setSavePath(dest);
    const rec = { filename, path: dest, state: 'started' };
    downloads.push(rec);
    item.on('updated', (e, state) => { rec.state = state; });
    item.on('done', (e, state) => { rec.state = state; });
  });

  let passed = 0;
  const tests = [];
  async function test(name, fn) {
    tests.push(name);
    try {
      await fn();
      passed++;
      console.log('  ✔ ' + name);
    } catch (e) {
      console.error('  ✖ ' + name + '\n    ' + String(e && e.message ? e.message : e));
      pageErrors.push(name + ': ' + String(e && e.message ? e.message : e));
    }
  }

  await test('ventana nativa: opciones de producción, menú propio y sin window.claude', async () => {
    win = createWindow({ show: false });
    await attachWindow(win, 'principal');
    const info = await evalPage(`({
      native: document.documentElement.classList.contains('native'),
      electron: /Electron/i.test(navigator.userAgent),
      claude: typeof window.claude,
      width: innerWidth,
      height: innerHeight,
      title: document.title
    })`);
    check(info.native, 'La clase nativa no está aplicada');
    check(info.electron, 'El renderer no se identifica como Electron');
    check(info.claude === 'undefined', 'En el ejecutable no debe existir window.claude');
    check(info.title === 'Pintora', 'Título de ventana incorrecto');
    check(info.width >= 1200 && info.height >= 700, 'La ventana de producción es demasiado pequeña: ' + info.width + '×' + info.height);
    const min = win.getMinimumSize();
    eq(min, [WINDOW_OPTIONS.minWidth, WINDOW_OPTIONS.minHeight], 'Tamaño mínimo de ventana');
    check(win.isResizable(), 'La ventana de producción no es redimensionable');
    check(Menu.getApplicationMenu() === null, 'El ejecutable no debe tener menú de aplicación nativo');
    check(win.isVisible() === false, 'La ventana de prueba debe permanecer oculta');
  });

  await test('descargas reales: PNG, JPEG, WebP, TIFF, GIF, proyecto y PSD al disco', async () => {
    await evalPage(`(() => {
      const P = window.__pintora;
      const d = new P.E.Doc(12, 8);
      const l = d.addLayer('Fondo', { r: 220, g: 30, b: 30 });
      d.activeId = l.id;
      P.setDoc(d, 'Ejecutable');
      P.docChanged();
      return d.layers.length;
    })()`);
    const formats = [['png', '.png'], ['jpeg', '.jpg'], ['webp', '.webp'], ['tiff', '.tiff'], ['gif', '.gif']];
    for (const [fmt, ext] of formats) {
      await evalPage(`window.__pintora.exportImage(${JSON.stringify(fmt)}, 0.9, { r: 255, g: 255, b: 255 }, 100)`);
      await waitDownload('Ejecutable' + ext);
    }
    await evalPage('window.__pintora.saveProject()');
    await waitDownload('Ejecutable.pintora.json');
    await evalPage('window.__pintora.savePsd()');
    await waitDownload('Ejecutable.psd');

    const png = fs.readFileSync(path.join(downloadDir, 'Ejecutable.png'));
    const jpg = fs.readFileSync(path.join(downloadDir, 'Ejecutable.jpg'));
    const webp = fs.readFileSync(path.join(downloadDir, 'Ejecutable.webp'));
    const tiff = fs.readFileSync(path.join(downloadDir, 'Ejecutable.tiff'));
    const gif = fs.readFileSync(path.join(downloadDir, 'Ejecutable.gif'));
    const project = JSON.parse(fs.readFileSync(path.join(downloadDir, 'Ejecutable.pintora.json'), 'utf8'));
    const psd = fs.readFileSync(path.join(downloadDir, 'Ejecutable.psd'));

    check(png.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'El archivo PNG no tiene firma válida');
    check(jpg[0] === 0xFF && jpg[1] === 0xD8, 'El archivo JPEG no tiene firma válida');
    check(webp.slice(0, 4).toString() === 'RIFF' && webp.slice(8, 12).toString() === 'WEBP', 'El archivo WebP no tiene firma válida');
    check(tiff.slice(0, 2).toString() === 'II' || tiff.slice(0, 2).toString() === 'MM', 'El archivo TIFF no tiene firma válida');
    check(gif.slice(0, 3).toString() === 'GIF', 'El archivo GIF no tiene firma válida');
    check(project.format === 'pintora' && project.version === 3 && project.w === 12 && project.h === 8, 'El proyecto descargado no es v3 de 12×8');
    check(psd.slice(0, 4).toString() === '8BPS', 'El PSD descargado no tiene cabecera 8BPS');
    const t = await inspectSaved(path.join(downloadDir, 'Ejecutable.tiff'), 'tiff');
    const g = await inspectSaved(path.join(downloadDir, 'Ejecutable.gif'), 'gif');
    const p = await inspectSaved(path.join(downloadDir, 'Ejecutable.psd'), 'psd');
    check(t.w === 12 && t.h === 8, 'El TIFF real no mide 12×8');
    check(g.w === 12 && g.h === 8, 'El GIF real no mide 12×8');
    check(p.w === 12 && p.h === 8 && p.layers >= 1, 'El PSD real no conserva tamaño y capas');
    check(fs.statSync(path.join(downloadDir, 'Ejecutable.pintora.json')).size > 100, 'El proyecto descargado está vacío');
  });

  await test('apertura desde disco: PNG, proyecto v3, PSD, TIFF y GIF reales', async () => {
    const png = await openFileOnDisk(path.join(downloadDir, 'Ejecutable.png'), 'Ejecutable.png', 'image/png', false);
    check(png.w === 12 && png.h === 8 && png.layers === 1, 'Abrir PNG real no restauró el documento');
    const project = await openFileOnDisk(path.join(downloadDir, 'Ejecutable.pintora.json'), 'Ejecutable.pintora.json', 'application/json', false);
    check(project.w === 12 && project.h === 8 && project.layers === 1 && project.name === 'Ejecutable', 'Abrir proyecto real no restauró el documento');
    const psd = await openFileOnDisk(path.join(downloadDir, 'Ejecutable.psd'), 'Ejecutable.psd', 'image/vnd.adobe.photoshop', false);
    check(psd.w === 12 && psd.h === 8 && psd.layers >= 1, 'Abrir PSD real no restauró las capas');
    const tiff = await openFileOnDisk(path.join(downloadDir, 'Ejecutable.tiff'), 'Ejecutable.tiff', 'image/tiff', false);
    check(tiff.w === 12 && tiff.h === 8 && tiff.layers === 1, 'Abrir TIFF real no restauró el documento');
    const gif = await openFileOnDisk(path.join(downloadDir, 'Ejecutable.gif'), 'Ejecutable.gif', 'image/gif', false);
    check(gif.w === 12 && gif.h === 8 && gif.layers === 1, 'Abrir GIF real no restauró el documento');
    const before = await evalPage('window.__pintora.S.doc.layers.length');
    const asLayer = await openFileOnDisk(path.join(downloadDir, 'Ejecutable.png'), 'Ejecutable.png', 'image/png', true);
    check(asLayer.layers === before + 1, 'Abrir PNG real como capa no añadió la capa');
  });

  await test('autoguardado real en IndexedDB y recuperación tras cerrar la ventana', async () => {
    await evalPage(`(() => {
      const P = window.__pintora;
      const d = new P.E.Doc(20, 16);
      const a = d.addLayer('Fondo', { r: 255, g: 255, b: 255 });
      const b = d.addLayer('Recuperable', { r: 10, g: 20, b: 30 });
      d.activeId = b.id;
      P.setDoc(d, 'Sesión ejecutable');
      P.docChanged();
      return d.layers.length;
    })()`);
    await waitFor(async () => {
      const ok = await evalPage(`new Promise((resolve) => {
        const req = indexedDB.open('pintora', 1);
        req.onerror = () => resolve(false);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('sesiones', 'readonly');
          const get = tx.objectStore('sesiones').get('autoguardado');
          get.onsuccess = () => { db.close(); resolve(!!get.result && !!get.result.json); };
          get.onerror = () => { db.close(); resolve(false); };
        };
      })`);
      return ok === true;
    }, 8000, 'registro de autoguardado en IndexedDB');

    win.destroy();
    win = null;
    await sleep(500);
    win = createWindow({ show: false });
    await attachWindow(win, 'recuperación');
    await waitFor(async () => {
      try { return await evalPage("document.querySelector('.dialog header')?.textContent === 'Recuperar la sesión anterior'"); } catch (e) { return false; }
    }, 8000, 'diálogo de recuperación');
    await evalPage("document.querySelector('.dialog footer .btn.primary').click()");
    await waitFor(async () => {
      try { return await evalPage("window.__pintora.S.name === 'Sesión ejecutable' && window.__pintora.S.doc.layers.length === 2 && window.__pintora.S.doc.layers.some((l) => l.name === 'Recuperable')"); } catch (e) { return false; }
    }, 12000, 'restauración de la sesión');
    const restored = await evalPage(`({ name: window.__pintora.S.name, modified: window.__pintora.S.modified, layers: window.__pintora.S.doc.layers.map((l) => l.name) })`);
    check(restored.modified === true, 'La sesión recuperada debe quedar marcada como modificada');
    check(restored.layers.includes('Recuperable'), 'La capa recuperada no está presente');
  });

  const page = win ? await evalPage('window.__appErrors || []') : [];
  for (const e of page) pageErrors.push('renderer: ' + e);
  if (consoleErrors.length) pageErrors.push('consola: ' + consoleErrors.join(' | '));

  if (win) win.destroy();
  console.log('\nResultado ejecutable: ' + passed + '/' + tests.length + ' pruebas correctas' + (pageErrors.length ? ' · ' + pageErrors.length + ' error(es)' : ''));
  if (pageErrors.length) {
    console.error('\nErrores:\n' + pageErrors.map((e) => '  ' + e).join('\n'));
  }
  try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  app.exit(passed === tests.length && pageErrors.length === 0 ? 0 : 1);
}

app.whenReady().then(main).catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  app.exit(1);
});
