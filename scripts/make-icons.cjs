// Renders build/icon.svg with Chromium and writes the app/web icon files.
// Run with: npm run icons
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');
const svg = fs.readFileSync(path.join(buildDir, 'icon.svg'), 'utf8');

function icoFromPngs(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = Buffer.alloc(16 * images.length);
  let offset = 6 + 16 * images.length;
  images.forEach((img, i) => {
    const at = i * 16;
    const dim = img.size >= 256 ? 0 : img.size;
    entries[at] = dim;
    entries[at + 1] = dim;
    entries.writeUInt16LE(1, at + 4);
    entries.writeUInt16LE(32, at + 6);
    entries.writeUInt32LE(img.png.length, at + 8);
    entries.writeUInt32LE(offset, at + 12);
    offset += img.png.length;
  });
  return Buffer.concat([header, entries, ...images.map((img) => img.png)]);
}

async function render() {
  const win = new BrowserWindow({
    width: 512, height: 512, show: false, frame: false, transparent: true,
    backgroundColor: '#00000000', webPreferences: { offscreen: false }
  });
  const html = `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}svg{display:block;width:512px;height:512px}</style></head><body>${svg}</body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  const dataUrl = await win.webContents.executeJavaScript(`new Promise((resolve, reject) => {
    const svg = document.querySelector('svg');
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 512;
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, 512, 512);
      g.drawImage(img, 0, 0, 512, 512);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('No se pudo rasterizar icon.svg'));
    img.src = url;
  })`);
  const base = nativeImage.createFromDataURL(dataUrl);
  if (base.isEmpty()) throw new Error('Chromium devolvió un icono vacío');

  const png = (size) => base.resize({ width: size, height: size, quality: 'best' }).toPNG();
  const sizes = { 16: png(16), 32: png(32), 48: png(48), 64: png(64), 128: png(128), 180: png(180), 256: png(256), 512: png(512) };
  fs.writeFileSync(path.join(buildDir, 'icon.png'), sizes[512]);
  fs.writeFileSync(path.join(buildDir, 'icon-32.png'), sizes[32]);
  fs.writeFileSync(path.join(buildDir, 'icon-180.png'), sizes[180]);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoFromPngs([16, 32, 48, 64, 128, 256].map((size) => ({ size, png: sizes[size] }))));
  console.log('icon.png, icon-32.png, icon-180.png e icon.ico generados');
  win.destroy();
}

app.whenReady().then(async () => {
  try { await render(); app.quit(); }
  catch (e) { console.error(e); app.exit(1); }
});
