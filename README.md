# Pintora

[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Canvas](https://img.shields.io/badge/Canvas-2D-E34F26)](https://developer.mozilla.org/docs/Web/API/Canvas_API)
[![Electron](https://img.shields.io/badge/Electron-escritorio-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![GPL-3.0](https://img.shields.io/badge/Licencia-GPL--3.0--or--later-blue)](LICENSE)

[Español](#español) · [English](#english)

---

## Español

### Índice

- [Descripción](#descripción)
- [Demo](#demo)
- [Inicio rápido](#inicio-rápido)
- [Qué incluye](#qué-incluye)
- [Formatos](#formatos)
- [Profundidad de color y ICC](#profundidad-de-color-e-icc)
- [Limitaciones actuales](#limitaciones-actuales)
- [Pruebas](#pruebas)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Iconos](#iconos)
- [Empaquetado](#empaquetado)
- [GitHub Pages](#github-pages)
- [Licencia](#licencia)

### Descripción

**Pintora** es un editor de imágenes con **capas, selecciones, pinceles, filtros y modos de mezcla**. Funciona como una página autónoma en el navegador (un único HTML) y como aplicación de escritorio con **Electron**. Está escrito en JavaScript sin framework y no necesita servidor.

### Demo

**Pruébalo:** <https://albertoortiz.is-a.dev/pintora/>

### Inicio rápido

| Comando | Qué hace |
|---|---|
| Abrir `dist/pintora.html` | Usar el editor en el navegador, sin servidor |
| `npm run build` | Regenerar `dist/` desde `src/` |
| `npm run build:pages` | Regenerar `dist/` y copiar la app a `docs/` |
| `npm start` | Abrir la app de escritorio sin empaquetar |
| `npm test` | 66 pruebas unitarias (motor, formatos, ICC, trazados) |
| `npm run test:ui` | 31 pruebas de interfaz en Electron |
| `npm run test:app` | 4 pruebas del ejecutable real |
| `npm run test:all` | Las tres suites en orden |

Requiere **Node.js 20** o superior y npm. Las suites de Electron necesitan sesión gráfica; en Linux sin escritorio, ejecútalas con `xvfb-run`.

### Qué incluye

- **Capas** con opacidad, visibilidad, bloqueo de transparencia, máscaras y **35 modos de mezcla**.
- **8 o 16 bits por canal**, con composición y proyectos que conservan 16 bits.
- **Capas con tamaño y posición propios**: importa una imagen sin recortarla, muévela total o parcialmente fuera del lienzo y pinta en sus coordenadas locales.
- **Selecciones** rectangular, elíptica, libre, por color y varita mágica, con modos de combinación.
- **22 herramientas**: pintura, retoque (clonar, sobreexponer, manchar, desenfocar/enfocar), selección, recorte, degradado, texto, trazado vectorial, zoom y mano.
- **20 filtros**, incluido un editor de curvas por canales (RGB, R, G, B).
- **Histograma** por canales con luminancia media.
- **Texto rasterizado**, historial con deshacer/rehacer y guías de selección animadas.
- **Interfaz en español e inglés**, con menús, filtros, opciones, atajos y mensajes traducidos; la preferencia se guarda en `Ver → Idioma`.
- **Autoguardado** en el navegador y recuperación de la sesión anterior al arrancar.
- **Panel de capas adaptativo**: a pantalla completa los botones quedan dentro del panel; en vistas estrechas los paneles pasan a un desplegable.

### Formatos

**Abrir**

- PNG, JPEG, WebP, GIF (primer fotograma), BMP y SVG rasterizado según el navegador.
- TIFF de 8 o 16 bits.
- PSD con sus capas.
- XCF con capas RGBA de 8 o 16 bits.
- Proyectos `.pintora.json`.

**Exportar**

- PNG con transparencia, JPEG y WebP.
- TIFF de 8 o 16 bits.
- GIF animado (una capa visible por fotograma).
- PSD y XCF con capas RGBA de 8 o 16 bits.

**Detalles**

- **PSD**: importa capas, opacidad, visibilidad y los modos de mezcla equivalentes; exporta el documento con sus capas. Cada capa conserva su rectángulo de posición y tamaño.
- **Proyecto**: `.pintora.json`, versión 4, con capas (límites y trazados incluidos), máscaras, selección, profundidad de 8/16 bits, búfer de 16 bits, perfil ICC y colores.
- **Trazados**: vectoriales y editables, se rasterizan para pintar y se exportan a SVG.

### Profundidad de color e ICC

El espacio de trabajo es de **8 bits por canal** por defecto y puede cambiarse a 16. La composición y el proyecto conservan 16 bits; el TIFF de 16 bits se importa y exporta con un perfil ICC opcional, pero **las herramientas de píxeles, los filtros y las selecciones siguen trabajando sobre el búfer de 8 bits**.

- Los XCF de 16 bits se convierten al espacio de trabajo al importar.
- Al exportar, un documento de 8 bits genera un XCF `v001` y uno de 16 bits genera un XCF `v011` con precisión `U16_GAMMA`; ambos conservan capas, opacidad, visibilidad, desplazamiento y modo de mezcla.
- La gestión ICC admite perfiles RGB de matriz/TRC; los perfiles basados solo en LUT se rechazan con un mensaje claro.
- El XCF `v001` de 8 bits se ha validado con **GIMP 3.2.8**: se abre como 32×24 px con las capas `Fondo` y `Capa propia` (opacidades 1,0 y 0,65) y exporta un PNG de 32×24. El XCF `v011` de 16 bits carga en GIMP 3.2.8 y la prueba de formatos comprueba su precisión.

### Limitaciones actuales

- Las herramientas de píxeles, los filtros y las selecciones trabajan sobre el búfer de 8 bits; el 16 bits nativo en esas operaciones sigue pendiente.
- Los perfiles ICC RGB de matriz/TRC se convierten a sRGB; los basados solo en LUT se rechazan.
- La validación con GIMP del XCF de 16 bits cubre la carga; la exportación PNG desde GIMP para ese archivo no está automatizada.

### Pruebas

| Comando | Qué comprueba |
|---|---|
| `npm test` | 66 pruebas unitarias: motor, composición, selecciones, filtros, historial, ICC, trazados y formatos |
| `npm run test:ui` | Interfaz sobre el HTML construido: 31 casos, viewports 1440×900, 1920×1080 y 800×700, botones, capas, herramientas, varita mágica, temas, trazados, XCF, idioma y exportaciones con guardado simulado |
| `npm run test:app` | Ejecutable Electron real: ventana de producción, descargas reales (incluido XCF) a una carpeta temporal, apertura desde disco, IndexedDB, autoguardado y recuperación |
| `npm run test:all` | Las tres suites en orden |

`test:app` usa la misma configuración de ventana que `electron/main.js` mediante `electron/window.js`, e intercepta las descargas para no abrir diálogos nativos. **No** automatiza el selector nativo de archivos ni el portapapeles del sistema: esas comprobaciones son manuales y están en [docs/PRUEBAS.md](docs/PRUEBAS.md).

### Estructura del proyecto

| Ruta | Contenido |
|---|---|
| `src/engine.js` | Motor sin DOM: mezcla, selecciones, pincel, filtros, curvas, histograma, documento e historial |
| `src/formats.js` | Conversión sin DOM entre el modelo y PSD, TIFF (8/16 bits), GIF y XCF |
| `src/icc.js` | Conversión de perfiles ICC RGB de matriz/TRC a sRGB |
| `src/i18n.js` | Traducción de la interfaz al inglés |
| `src/paths.js` | Geometría, *hit testing* y serialización SVG de trazados |
| `src/app-core.js` | Estado, vista, render, importar/exportar, portapapeles, autoguardado y texto |
| `src/app-tools.js` | Herramientas y entrada de puntero |
| `src/app-ui.js` | Diálogos, paneles, menús, atajos y arranque |
| `src/app.css`, `src/body.html` | Estilos y estructura |
| `src/vendor.js` | Librerías externas empaquetadas en el HTML |
| `build.mjs` | Une todo en un solo HTML |
| `electron/main.js`, `electron/window.js` | Ciclo de vida y configuración de la ventana nativa |
| `test/` | Pruebas unitarias del motor, formatos, ICC y trazados |
| `test-ui/`, `test-app/` | Suites de interfaz y del ejecutable |
| `docs/` | App publicada en GitHub Pages y guía de pruebas |

### Iconos

El logotipo está en `build/icon.svg`. `npm run icons` lo rasteriza y regenera `build/icon.png` (512 px), `build/icon-32.png`, `build/icon-180.png` y `build/icon.ico` (16–256 px). Electron usa `dist/icon.png` y electron-builder toma `build/icon.ico` para el ejecutable de Windows. El HTML incrusta el favicon SVG y los PNG de 32 y 180 px, así que la página sigue siendo un solo archivo.

### Empaquetado

```bash
npm install
npm run dist:win     # instalador NSIS y portable en release/
npm run dist:mac     # DMG
npm run dist:linux   # AppImage
```

Las librerías de formato (`ag-psd`, `utif`, `omggif`, `gifenc` y `@theprogrammingiantpanda/xcfreader`) se empaquetan dentro del HTML con esbuild desde `src/vendor.js`.

### GitHub Pages

`npm run build:pages` reconstruye `dist/` y copia la aplicación a `docs/index.html`. En GitHub, abre **Settings → Pages**, elige **Deploy from a branch**, la rama `master` y la carpeta `/docs`. La app quedará en `https://<usuario>.github.io/pintora/`.

### Licencia

**GNU General Public License v3.0 o posterior (GPL-3.0-or-later)**, según `package.json` y este README. Las fórmulas de los modos de mezcla y la composición siguen el comportamiento del código fuente de **GIMP 3** (GPL): distribuye Pintora bajo GPL-3.0-or-later e incluye el código fuente con cualquier versión compilada.

> [!IMPORTANT]
> El archivo `LICENSE` del repositorio contiene el texto de la **licencia MIT**, en contradicción con `package.json` (`GPL-3.0-or-later`) y con este README. Dado que parte del comportamiento deriva de GIMP, la opción coherente es sustituir `LICENSE` por el texto completo de GPL-3.0. Hasta que se corrija, trata el proyecto como GPL-3.0-or-later.

Pintora no está afiliado a GIMP ni al proyecto GNOME.

---

## English

### Table of contents

- [Overview](#overview)
- [Demo](#demo)
- [Quick start](#quick-start)
- [What it includes](#what-it-includes)
- [Formats](#formats)
- [Colour depth and ICC](#colour-depth-and-icc)
- [Current limitations](#current-limitations)
- [Tests](#tests)
- [Project layout](#project-layout)
- [Icons](#icons)
- [Packaging](#packaging)
- [GitHub Pages](#github-pages)
- [License](#license)

### Overview

**Pintora** is an image editor with **layers, selections, brushes, filters and blend modes**. It runs as a standalone page in the browser (a single HTML file) and as an **Electron** desktop app. It is written in framework-free JavaScript and needs no server.

### Demo

**Try it:** <https://albertoortiz.is-a.dev/pintora/>

### Quick start

| Command | What it does |
|---|---|
| Open `dist/pintora.html` | Use the editor in the browser, no server needed |
| `npm run build` | Regenerate `dist/` from `src/` |
| `npm run build:pages` | Rebuild `dist/` and copy the app to `docs/` |
| `npm start` | Open the desktop app without packaging |
| `npm test` | 66 unit tests (engine, formats, ICC, paths) |
| `npm run test:ui` | 31 interface tests in Electron |
| `npm run test:app` | 4 tests against the real executable |
| `npm run test:all` | All three suites in order |

Requires **Node.js 20** or later and npm. The Electron suites need a graphical session; on headless Linux, run them with `xvfb-run`.

### What it includes

- **Layers** with opacity, visibility, transparency lock, masks and **35 blend modes**.
- **8 or 16 bits per channel**, with compositing and projects that preserve 16 bits.
- **Layers with their own size and position**: import an image without cropping it, move it fully or partially outside the canvas and paint in its local coordinates.
- **Selections**: rectangular, elliptical, freehand, colour and magic wand, with combination modes.
- **22 tools**: painting, retouching (clone, dodge/burn, smudge, blur/sharpen), selection, crop, gradient, text, vector path, zoom and hand.
- **20 filters**, including a per-channel curves editor (RGB, R, G, B).
- **Histogram** per channel with mean luminance.
- **Rasterised text**, undo/redo history and animated selection outlines.
- **Spanish and English interface**, with menus, filters, options, shortcuts and messages translated; the preference is stored from `View → Language`.
- **Autosave** in the browser and recovery of the previous session on start-up.
- **Adaptive layer panel**: at full size the buttons stay inside the panel; in narrow views the panels switch to a collapsible drawer.

### Formats

**Open**

- PNG, JPEG, WebP, GIF (first frame), BMP and browser-rasterised SVG.
- 8- or 16-bit TIFF.
- PSD with its layers.
- XCF with 8- or 16-bit RGBA layers.
- `.pintora.json` projects.

**Export**

- PNG with transparency, JPEG and WebP.
- 8- or 16-bit TIFF.
- Animated GIF (one frame per visible layer).
- PSD and XCF with 8- or 16-bit RGBA layers.

**Details**

- **PSD**: imports layers, opacity, visibility and equivalent blend modes; exports the document with its layers. Each layer keeps its position and size rectangle.
- **Project**: `.pintora.json`, version 4, with layers (bounds and paths included), masks, selection, 8/16-bit depth, 16-bit buffer, ICC profile and colours.
- **Paths**: vectorial and editable, rasterised for painting and exportable to SVG.

### Colour depth and ICC

The workspace is **8 bits per channel** by default and can be switched to 16. Compositing and the project preserve 16 bits; 16-bit TIFF is imported and exported with an optional ICC profile, but **pixel tools, filters and selections still operate on the 8-bit buffer**.

- 16-bit XCF files are converted to the workspace on import.
- On export, an 8-bit document produces a `v001` XCF and a 16-bit document produces a `v011` XCF with `U16_GAMMA` precision; both keep layers, opacity, visibility, offsets and blend mode.
- ICC handling supports RGB matrix/TRC profiles; LUT-only profiles are rejected with a clear message.
- The 8-bit `v001` XCF has been validated with **GIMP 3.2.8**: it opens as 32×24 px with the `Fondo` and `Capa propia` layers (opacities 1.0 and 0.65) and exports a 32×24 PNG. The 16-bit `v011` XCF loads in GIMP 3.2.8 and the format test checks its precision.

### Current limitations

- Pixel tools, filters and selections operate on the 8-bit buffer; native 16-bit support for those operations is still pending.
- RGB ICC matrix/TRC profiles are converted to sRGB; LUT-only profiles are rejected.
- GIMP validation of the 16-bit XCF covers loading; PNG export from GIMP for that file is not automated.

### Tests

| Command | What it checks |
|---|---|
| `npm test` | 66 unit tests: engine, compositing, selections, filters, history, ICC, paths and formats |
| `npm run test:ui` | Interface on the built HTML: 31 cases, 1440×900, 1920×1080 and 800×700 viewports, buttons, layers, tools, magic wand, themes, paths, XCF, language and exports with a simulated save dialog |
| `npm run test:app` | Real Electron executable: production window, real downloads (including XCF) to a temp folder, opening files from disk, IndexedDB, autosave and recovery |
| `npm run test:all` | All three suites in order |

`test:app` uses the same window configuration as `electron/main.js` through `electron/window.js`, and intercepts downloads so no native dialogs appear. It does **not** automate the native file picker or the system clipboard: those checks are manual and documented in [docs/PRUEBAS.md](docs/PRUEBAS.md).

### Project layout

| Path | Contents |
|---|---|
| `src/engine.js` | DOM-free engine: blending, selections, brush, filters, curves, histogram, document and history |
| `src/formats.js` | DOM-free conversion between the model and PSD, TIFF (8/16-bit), GIF and XCF |
| `src/icc.js` | RGB matrix/TRC ICC profile conversion to sRGB |
| `src/i18n.js` | English interface translation |
| `src/paths.js` | Path geometry, hit testing and SVG serialisation |
| `src/app-core.js` | State, view, rendering, import/export, clipboard, autosave and text |
| `src/app-tools.js` | Tools and pointer input |
| `src/app-ui.js` | Dialogs, panels, menus, shortcuts and boot |
| `src/app.css`, `src/body.html` | Styles and structure |
| `src/vendor.js` | Third-party libraries bundled into the HTML |
| `build.mjs` | Combines everything into one HTML file |
| `electron/main.js`, `electron/window.js` | Desktop lifecycle and native window configuration |
| `test/` | Unit tests for engine, formats, ICC and paths |
| `test-ui/`, `test-app/` | Interface and executable suites |
| `docs/` | GitHub Pages build and the testing guide |

### Icons

The logo lives in `build/icon.svg`. `npm run icons` rasterises it and regenerates `build/icon.png` (512 px), `build/icon-32.png`, `build/icon-180.png` and `build/icon.ico` (16–256 px). Electron uses `dist/icon.png` and electron-builder uses `build/icon.ico` for the Windows executable. The HTML embeds the SVG favicon and the 32 and 180 px PNGs, so the page remains a single file.

### Packaging

```bash
npm install
npm run dist:win     # NSIS installer and portable build in release/
npm run dist:mac     # DMG
npm run dist:linux   # AppImage
```

The format libraries (`ag-psd`, `utif`, `omggif`, `gifenc` and `@theprogrammingiantpanda/xcfreader`) are bundled into the HTML by esbuild from `src/vendor.js`.

### GitHub Pages

`npm run build:pages` rebuilds `dist/` and copies the app to `docs/index.html`. On GitHub, open **Settings → Pages**, choose **Deploy from a branch**, branch `master` and folder `/docs`. The app will be at `https://<user>.github.io/pintora/`.

### License

**GNU General Public License v3.0 or later (GPL-3.0-or-later)**, per `package.json` and this README. Blend-mode formulas and layer compositing follow the behaviour of the **GIMP 3** source code (GPL): distribute Pintora under GPL-3.0-or-later and include the source code with any compiled build.

> [!IMPORTANT]
> The repository's `LICENSE` file contains the **MIT** licence text, contradicting `package.json` (`GPL-3.0-or-later`) and this README. Since part of the behaviour derives from GIMP, the consistent option is to replace `LICENSE` with the full GPL-3.0 text. Until that is fixed, treat the project as GPL-3.0-or-later.

Pintora is not affiliated with GIMP or the GNOME project.
