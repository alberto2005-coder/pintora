// Builds dist/pintora.html (standalone page, used by Electron and any browser)
// and dist/pintora.artifact.html (fragment for the Artifact tool).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(root, 'src', f), 'utf8');
const engine = read('engine.js');
const app = ['app-core.js', 'app-tools.js', 'app-ui.js'].map(read).join('\n');
const css = read('app.css');
const body = read('body.html');
const fonts = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap';

for (const [name, src] of [['engine', engine], ['app', app]]) {
  if (src.includes('</script')) throw new Error(name + ' contains a closing script tag');
}

// Bundle third-party libraries (src/vendor.js) into one inline script.
const { build } = await import('esbuild');
const vendorOut = await build({ entryPoints: [join(root, 'src', 'vendor.js')], bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2020', write: false, logLevel: 'error' });
const vendor = vendorOut.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const script = `<script>\n${vendor}\n</script>\n<script>\n${engine}\n</script>\n<script>\n(function () {\n'use strict';\nconst PintoraEngine = window.PintoraEngine;\n${app}\n})();\n</script>`;
const fragment = `<title>Pintora</title>\n<link rel="stylesheet" href="${fonts}">\n<style>\n${css}\n</style>\n${body}\n${script}\n`;
const full = `<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="color-scheme" content="light dark">\n<title>Pintora</title>\n<link rel="stylesheet" href="${fonts}">\n<style>\n${css}\n</style>\n</head>\n<body>\n${body}\n${script}\n</body>\n</html>\n`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'pintora.html'), full);
writeFileSync(join(root, 'dist', 'pintora.artifact.html'), fragment);
console.log('built', (full.length / 1024).toFixed(0) + ' KB');
