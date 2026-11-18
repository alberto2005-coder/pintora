// Copies the standalone app into docs/ so GitHub Pages can serve it directly.
// Tambien inyecta el bloque SEO para que un rebuild no lo pierda.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const docs = join(root, 'docs');

const TITLE = 'Pintora, editor de pintura e ilustración en el navegador';
const H1 = 'Pintora: editor de pintura e ilustración en el navegador';
const SR_ONLY =
  'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;' +
  'clip:rect(0 0 0 0);white-space:nowrap;border:0';

const DESC =
  'Editor de pintura digital gratis en el navegador: pinceles, capas, paleta de color e historial. ' +
  'Crea ilustraciones y exporta tus imágenes sin instalar nada.';

const SEO = `    <meta name="description" content="${DESC}">
    <link rel="canonical" href="https://albertoortiz.is-a.dev/pintora/">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="author" content="Alberto Ortiz">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Pintora">
    <meta property="og:locale" content="es_ES">
    <meta property="og:title" content="${TITLE}">
    <meta property="og:description" content="${DESC}">
    <meta property="og:url" content="https://albertoortiz.is-a.dev/pintora/">
    <meta property="og:image" content="https://albertoortiz.is-a.dev/pintora/og-image.jpg">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="Interfaz de Pintora con la barra de herramientas, el lienzo y el panel de capas y color">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${TITLE}">
    <meta name="twitter:description" content="${DESC}">
    <meta name="twitter:image" content="https://albertoortiz.is-a.dev/pintora/og-image.jpg">
    <meta name="twitter:image:alt" content="Interfaz de Pintora con la barra de herramientas, el lienzo y el panel de capas y color">

    <link rel="icon" href="favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
    <link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">

    <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Pintora",
  "url": "https://albertoortiz.is-a.dev/pintora/",
  "image": "https://albertoortiz.is-a.dev/pintora/og-image.jpg",
  "description": "Editor de pintura digital en el navegador con pinceles, capas, paleta de color, historial y exportacion de imagenes.",
  "applicationCategory": "DesignApplication",
  "operatingSystem": "Web",
  "inLanguage": "es",
  "isAccessibleForFree": true,
  "author": {
    "@type": "Person",
    "name": "Alberto Ortiz",
    "url": "https://albertoortiz.is-a.dev/"
  }
}
    </script>
`;

mkdirSync(docs, { recursive: true });
copyFileSync(join(root, 'dist', 'pintora.html'), join(docs, 'index.html'));

const page = join(docs, 'index.html');
let html = readFileSync(page, 'utf8');

// titulo definitivo
html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${TITLE}</title>`);

// fuera iconos en data URI (pesan ~700 KB) y el resto de iconos antiguos
html = html.replace(/\s*<link[^>]*rel="[^"]*icon[^"]*"[^>]*>/gi, '');

// bloque SEO
if (!html.includes('name="description"')) {
  html = html.replace('</head>', SEO + '</head>');
}

// encabezado accesible
if (!/<h1[\s>]/i.test(html)) {
  html = html.replace(/(<body\b[^>]*>)/i, `$1\n  <h1 style="${SR_ONLY}">${H1}</h1>`);
}

writeFileSync(page, html);
writeFileSync(join(docs, '.nojekyll'), '');
console.log('pages: docs/index.html');
