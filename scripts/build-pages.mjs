// Copies the standalone app into docs/ so GitHub Pages can serve it directly.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const docs = join(root, 'docs');

mkdirSync(docs, { recursive: true });
copyFileSync(join(root, 'dist', 'pintora.html'), join(docs, 'index.html'));
writeFileSync(join(docs, '.nojekyll'), '');
console.log('pages: docs/index.html');
