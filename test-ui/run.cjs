'use strict';
// Runs the browser/UI suite against the built single-file app in Electron.
// The app itself stays a normal page; this runner only provides a Chromium
// renderer, controlled viewport sizes and a non-zero exit status on failure.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const root = path.join(__dirname, '..');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-ui-')));

let win;
const consoleErrors = [];
const pageErrors = [];

function installErrorHooks() {
  if (typeof window.__uiErrors === 'undefined') {
    window.__uiErrors = [];
    window.addEventListener('error', (e) => window.__uiErrors.push(String(e.message || e.error || e)));
    window.addEventListener('unhandledrejection', (e) => window.__uiErrors.push(String(e.reason || e)));
  }
}

async function evaluate(code) {
  return win.webContents.executeJavaScript(code, true);
}

async function waitFor(fn, timeout = 6000, label = 'condición') {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    try { if (await fn()) return; } catch (e) { last = e; }
    await sleep(50);
  }
  throw new Error('Tiempo de espera agotado: ' + label + (last ? ' (' + last.message + ')' : ''));
}

async function main() {
  win = new BrowserWindow({
    show: false, width: 1440, height: 900, minWidth: 320, minHeight: 400,
    backgroundColor: '#14161a', title: 'Pintora UI tests',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
  });
  win.setContentSize(1440, 900);
  win.webContents.on('console-message', (event) => {
    if (event.level === 'error' || event.level === 3) consoleErrors.push(String(event.message));
  });
  win.webContents.on('render-process-gone', (event, details) => pageErrors.push('render-process-gone: ' + (details.reason || details.exitCode)));
  win.webContents.on('preload-error', (event, preloadPath, error) => pageErrors.push('preload-error: ' + error.message));

  await win.loadFile(path.join(root, 'dist', 'pintora.html'));
  await waitFor(async () => evaluate('!!document.querySelector("#stage")'), 8000, 'arranque de Pintora');
  await evaluate(`(${installErrorHooks.toString()})()`);
  await waitFor(async () => evaluate('!!window.__pintora && !!window.__pintora.S.doc'), 8000, 'hook __pintora');

  const suite = fs.readFileSync(path.join(__dirname, 'suite.js'), 'utf8');
  await evaluate(suite);
  await waitFor(async () => evaluate('Array.isArray(window.__uiTests) && window.__uiTests.length > 0'), 4000, 'carga de la suite');
  const tests = await evaluate('window.__uiTests.map((t) => ({ name: t.name, viewport: t.viewport || null }))');

  async function setViewport(w, h) {
    if (win.isMaximized()) win.unmaximize();
    win.setContentSize(w, h);
    for (let attempt = 0; attempt < 24; attempt++) {
      const [iw, ih] = await evaluate('[innerWidth, innerHeight]');
      if (iw === w && Math.abs(ih - h) <= 3) return;
      await sleep(50);
      if (win.isMaximized()) win.unmaximize();
      win.setContentSize(w, h);
    }
    const [iw, ih] = await evaluate('[innerWidth, innerHeight]');
    throw new Error('No se pudo fijar el viewport ' + w + '×' + h + '; quedó en ' + iw + '×' + ih);
  }

  let failed = 0;
  console.log('Pintora UI tests · ' + tests.length + ' casos');
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const vp = t.viewport || [1440, 900];
    try { await setViewport(vp[0], vp[1]); }
    catch (e) {
      failed++;
      console.error('  ✖ ' + t.name + '\n    ' + e.message);
      continue;
    }
    await sleep(60);
    const started = Date.now();
    try {
      const result = await evaluate(`window.__uiTests[${i}].fn()`);
      if (result === false) throw new Error('la prueba devolvió false');
      console.log('  ✔ ' + t.name + ' (' + (Date.now() - started) + ' ms)');
    } catch (e) {
      failed++;
      console.error('  ✖ ' + t.name + '\n    ' + String(e && e.message ? e.message : e));
    }
  }

  const errors = await evaluate('window.__uiErrors || []');
  for (const e of errors) pageErrors.push(e);
  if (consoleErrors.length) {
    failed++;
    console.error('\nErrores de consola:\n' + consoleErrors.map((e) => '  ' + e).join('\n'));
  }
  if (pageErrors.length) {
    failed++;
    console.error('\nErrores de página:\n' + pageErrors.map((e) => '  ' + e).join('\n'));
  }
  console.log('\nResultado UI: ' + (tests.length - failed) + '/' + tests.length + ' pruebas correctas' + (failed ? ' · ' + failed + ' fallo(s)' : ''));
  win.destroy();
  app.exit(failed ? 1 : 0);
}

app.whenReady().then(main).catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  app.exit(1);
});
