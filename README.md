# Pintora

[Español](#español) · [English](#english)

## Español

Editor de imágenes con capas, selecciones, pinceles, filtros y modos de mezcla.
Funciona como página suelta en el navegador y como aplicación de escritorio con Electron.

### Uso rápido

- Abre `dist/pintora.html` en un navegador moderno (no necesita servidor).
- `npm run build` regenera `dist/` a partir de `src/`.
- `npm test` ejecuta los tests del motor y de formatos (Node 20 o superior).
- `npm run test:ui` reconstruye `dist/` y ejecuta las 31 pruebas de interfaz en Electron.
- `npm run test:app` reconstruye `dist/` y ejecuta las 4 pruebas exclusivas del ejecutable Electron.
- `npm run test:all` encadena los tests unitarios, los de interfaz y los del ejecutable.
- `npm start` abre la app de escritorio sin empaquetar.

### Qué incluye

- Capas con opacidad, visibilidad, bloqueo de transparencia, máscaras y 35 modos de mezcla.
- Capas con tamaño y posición propios: importa una imagen como capa sin recortarla, muévela total o
  parcialmente fuera del lienzo y pinta con sus coordenadas locales.
- Selecciones rectangular, elíptica, libre, por color y varita mágica, con modos de combinación.
- 22 herramientas: pintura, retoque (clonar, sobreexponer, manchar, desenfocar/enfocar),
  selección, recorte, degradado, texto, trazado vectorial, zoom y mano.
- 20 filtros, incluido un editor de curvas por canales (RGB, R, G, B).
- Histograma por canales con luminancia media.
- Texto rasterizado, historial con deshacer/rehacer y guías de selección animadas.
- Interfaz en español e inglés, con menús, modos de mezcla, filtros, opciones, atajos y mensajes traducidos;
  la preferencia se conserva en `Ver → Idioma`.
- Autoguardado en el navegador y recuperación de la sesión anterior al arrancar.
- Panel de capas adaptativo: en pantalla completa los botones quedan dentro de su panel y en vistas
  estrechas los paneles pasan a un desplegable.

### Formatos

- **Abrir:** PNG, JPEG, WebP, GIF (primer fotograma), BMP y SVG rasterizado según el navegador;
  TIFF; PSD con sus capas; XCF con capas RGBA; y proyectos `.pintora.json`.
- **Exportar:** PNG (con transparencia), JPEG, WebP, TIFF de 8 o 16 bits, GIF animado (una capa
  visible por fotograma), PSD y XCF con capas RGBA.
- **PSD:** importa capas, opacidad, visibilidad y los modos de mezcla equivalentes; exporta el
  documento con sus capas. Cada capa conserva su rectángulo (posición y tamaño) al importar y exportar.
- **Proyecto:** `.pintora.json`, versión 4, con capas (incluidos sus límites y trazados), máscaras, selección,
  profundidad de 8/16 bits, búfer de 16 bits, perfil ICC y colores.

El espacio de trabajo es de 8 bits por canal por defecto y se puede cambiar a 16 bits. La composición y
el proyecto conservan 16 bits; el TIFF de 16 bits se importa y exporta con un perfil ICC opcional,
pero las herramientas de píxeles, los filtros y las selecciones siguen trabajando sobre el búfer de 8 bits.
Los XCF de 16 bits se convierten al importar y el XCF exportado es RGBA de 8 bits. Los trazados son
vectoriales y editables en el documento, se rasterizan para pintar y se exportan a SVG. La gestión ICC
admite perfiles RGB de matriz/TRC; los perfiles basados solo en LUT se rechazan con un mensaje claro.
El XCF exportado conserva capas, opacidad, visibilidad, desplazamiento y modo de mezcla.
El XCF v001 exportado se ha validado con GIMP 3.2.8: se abre como 32×24 px con las capas `Fondo` y
`Capa propia` (opacidades 1,0 y 0,65), y exporta un PNG de 32×24.

### Pruebas

| Comando | Qué comprueba |
|---|---|
| `npm test` | Motor, composición, selecciones, filtros, historial y formatos. |
| `npm run test:ui` | Interfaz sobre el HTML construido en Electron: 31 casos, viewports de 1440×900, 1920×1080 y 800×700, botones, capas, herramientas, selección mágica, temas, trazados vectoriales, XCF, idioma y exportaciones con guardado simulado. |
| `npm run test:app` | Ejecutable Electron real: ventana de producción, descargas reales (incluido XCF) a una carpeta temporal, apertura desde disco, IndexedDB, autoguardado y recuperación. |
| `npm run test:all` | Las tres suites anteriores en orden. |

La suite `test:app` usa la misma configuración de ventana que `electron/main.js` a través de
`electron/window.js`. Intercepta las descargas reales de Electron, sin `window.claude`, para no abrir
diálogos nativos. No automatiza el selector nativo de archivos ni el portapapeles del sistema; esas
comprobaciones son manuales y están descritas en [docs/PRUEBAS.md](docs/PRUEBAS.md).

### Estructura

- `src/engine.js`: motor sin DOM (mezcla, selecciones, pincel, filtros, curvas, histograma,
  documento e historial).
- `src/formats.js`: conversión sin DOM entre el modelo y PSD, TIFF (8 y 16 bits), GIF y XCF.
- `src/app-core.js`: estado, vista, render, importar/exportar, portapapeles, autoguardado, texto.
- `src/app-tools.js`: herramientas y entrada de puntero.
- `src/app-ui.js`: diálogos, paneles, menús, atajos y arranque.
- `src/app.css`, `src/body.html`: estilos y estructura.
- `src/vendor.js`: librerías externas que se empaquetan en el HTML.
- `build.mjs`: une todo en un solo HTML.
- `electron/main.js`: ciclo de vida de la aplicación de escritorio.
- `electron/window.js`: configuración compartida de la ventana nativa.
- `test/engine.test.js`, `test/formats.test.js`: tests del motor y de los formatos.
- `test-ui/run.cjs`, `test-ui/suite.js`: suite de interfaz con guardado simulado.
- `test-app/run.cjs`: suite exclusiva del ejecutable, con descargas y persistencia reales.

### Iconos

El logotipo está en `build/icon.svg`. `npm run icons` lo rasteriza y regenera `build/icon.png`
(512 px), `build/icon-32.png`, `build/icon-180.png` y `build/icon.ico` (16–256 px). Electron usa
`dist/icon.png` y electron-builder toma `build/icon.ico` para el ejecutable de Windows. El HTML
incrusta el favicon SVG y los PNG de 32 y 180 px, así que la página sigue siendo un solo archivo.

### Empaquetado

```text
npm install
npm run dist:win     # instalador NSIS y versión portable en release/
```

También hay `dist:mac` y `dist:linux`. Las librerías de formato (`ag-psd`, `utif`, `omggif`,
`gifenc`) se empaquetan dentro del HTML con esbuild desde `src/vendor.js`.

### Documentación

- [Pruebas y verificación manual](docs/PRUEBAS.md)

### Licencia

Las fórmulas de los modos de mezcla y la composición siguen el comportamiento del código fuente
de GIMP 3 (GPL). Distribuye Pintora bajo GPL-3.0-or-later e incluye el código fuente con cualquier
versión compilada. Pintora no está afiliado a GIMP ni al proyecto GNOME.

## English

[Español](#español) · [English](#english)

Image editor with layers, selections, brushes, filters and blend modes. It runs as a standalone
page in the browser and as an Electron desktop application.

### Quick start

- Open `dist/pintora.html` in a modern browser (no server required).
- `npm run build` regenerates `dist/` from `src/`.
- `npm test` runs the engine and format tests (Node 20 or newer).
- `npm run test:ui` rebuilds `dist/` and runs the 31 interface tests in Electron.
- `npm run test:app` rebuilds `dist/` and runs the 4 executable-only Electron tests.
- `npm run test:all` runs the unit, interface and executable suites in order.
- `npm start` opens the desktop app without packaging it.

### What it includes

- Layers with opacity, visibility, transparency lock, masks and 35 blend modes.
- Layers with their own size and position: import an image as a layer without cropping it, move it
  fully or partially outside the canvas and paint in local layer coordinates.
- Rectangular, elliptical, freehand, colour and magic-wand selections, with combination modes.
- 22 tools: painting, retouching (clone, dodge/burn, smudge, blur/sharpen), selection, crop,
  gradient, text, vector path, zoom and hand.
- 20 filters, including a per-channel curves editor (RGB, R, G, B).
- Per-channel histogram with mean luminance.
- Rasterised text, undo/redo history and animated selection outlines.
- Spanish and English interface, with menus, blend modes, filters, options, shortcuts and messages
  translated; the preference is stored from `View → Language`.
- Browser autosave and recovery of the previous session on startup.
- Adaptive layer panel: at full size the layer buttons stay inside their panel; in narrow views the
  panels switch to a collapsible drawer.

### Formats

- **Open:** PNG, JPEG, WebP, GIF (first frame), BMP and browser-rasterised SVG; TIFF; PSD with its
  layers; XCF with RGBA layers; and `.pintora.json` projects.
- **Export:** PNG (with transparency), JPEG, WebP, 8-bit or 16-bit TIFF, animated GIF (one frame
  per visible layer), PSD and XCF with RGBA layers.
- **PSD:** imports layers, opacity, visibility and equivalent blend modes; exports the document with
  its layers. Each layer keeps its rectangle (position and size) on import and export.
- **Project:** `.pintora.json`, version 4, with layers (including their bounds and paths), masks,
  selection, 8/16-bit depth, 16-bit buffer, ICC profile and colours.

The working space is 8 bits per channel by default and can be switched to 16 bits. Compositing and
the project preserve 16 bits; 16-bit TIFF is imported and exported with an optional embedded ICC
profile, but pixel tools, filters and selections still operate on the 8-bit buffer. 16-bit XCF files are converted on import and
exported XCF is 8-bit RGBA. Paths are vectorial and editable in the document, are rasterised for painting
and can be exported to SVG. ICC management supports RGB matrix/TRC profiles; LUT-only profiles are
rejected with a clear message. Exported XCF keeps layers, opacity, visibility, offsets and blend mode.
The exported v001 XCF has been validated with GIMP 3.2.8: it opens as 32×24 px with the `Fondo` and
`Capa propia` layers (opacities 1.0 and 0.65) and exports a 32×24 PNG.

### Tests

| Command | What it checks |
|---|---|
| `npm test` | Engine, compositing, selections, filters, history and formats. |
| `npm run test:ui` | Interface on the built HTML in Electron: 31 cases, 1440×900, 1920×1080 and 800×700 viewports, buttons, layers, tools, magic selection, themes, vector paths, XCF, language and exports with a simulated save dialog. |
| `npm run test:app` | Real Electron executable: production window, real downloads (including XCF) to a temporary folder, opening files from disk, IndexedDB, autosave and recovery. |
| `npm run test:all` | All three suites in order. |

`test:app` uses the same window configuration as `electron/main.js` through `electron/window.js`.
It intercepts real Electron downloads, without `window.claude`, so no native dialogs appear. It does
not automate the native file picker or the system clipboard; those checks are manual and are
documented in [docs/PRUEBAS.md](docs/PRUEBAS.md).

### Project layout

- `src/engine.js`: DOM-free engine (blending, selections, brush, filters, curves, histogram, document
  and history).
- `src/formats.js`: DOM-free conversion between the model and PSD, 8/16-bit TIFF, GIF and XCF.
- `src/app-core.js`: state, view, rendering, import/export, clipboard, autosave and text.
- `src/app-tools.js`: tools and pointer input.
- `src/app-ui.js`: dialogs, panels, menus, shortcuts and boot.
- `src/app.css`, `src/body.html`: styles and structure.
- `src/vendor.js`: third-party libraries bundled into the HTML.
- `build.mjs`: combines everything into one HTML file.
- `electron/main.js`: desktop application lifecycle.
- `electron/window.js`: shared native window configuration.
- `test/engine.test.js`, `test/formats.test.js`: engine and format tests.
- `test-ui/run.cjs`, `test-ui/suite.js`: interface suite with a simulated save dialog.
- `test-app/run.cjs`: executable-only suite with real downloads and persistence.

### Icons

The logo lives in `build/icon.svg`. `npm run icons` rasterises it and regenerates `build/icon.png`
(512 px), `build/icon-32.png`, `build/icon-180.png` and `build/icon.ico` (16–256 px). Electron uses
`dist/icon.png` and electron-builder uses `build/icon.ico` for the Windows executable. The HTML embeds
the SVG favicon and the 32 and 180 px PNGs, so the page remains a single file.

### Packaging

```text
npm install
npm run dist:win     # NSIS installer and portable build in release/
```

`dist:mac` and `dist:linux` are also available. Format libraries (`ag-psd`, `utif`, `omggif`,
`gifenc`) are bundled into the HTML by esbuild from `src/vendor.js`.

### Documentation

- [Tests and manual verification](docs/PRUEBAS.md)

### License

Blend-mode formulas and layer compositing follow the behaviour of the GIMP 3 source code (GPL).
Distribute Pintora under GPL-3.0-or-later and include the source code with any compiled build.
Pintora is not affiliated with GIMP or the GNOME project.
