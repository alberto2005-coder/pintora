# Pintora

Editor de imágenes con capas, selecciones, pinceles, filtros y modos de mezcla.
Funciona como página suelta en el navegador y como aplicación de escritorio con Electron.

## Uso rápido

- Abre `dist/pintora.html` en un navegador moderno (no necesita servidor).
- `npm run build` regenera `dist/` a partir de `src/`.
- `npm test` ejecuta los tests del motor y de formatos (Node 20 o superior).
- `npm run test:ui` reconstruye `dist/` y ejecuta la suite de interfaz en Electron; `npm run test:all` encadena ambas.
- `npm start` abre la app de escritorio sin empaquetar.

## Qué incluye

- Capas con opacidad, visibilidad, bloqueo de transparencia, máscaras y 35 modos de mezcla.
- Selecciones rectangular, elíptica, libre, por color y varita mágica, con modos de combinación.
- 21 herramientas: pintura, retoque (clonar, sobreexponer, manchar, desenfocar/enfocar),
  selección, recorte, degradado, texto, zoom y mano.
- 20 filtros, incluido un editor de curvas por canales (RGB, R, G, B).
- Histograma por canales con luminancia media.
- Texto rasterizado, historial con deshacer/rehacer y guías de selección animadas.
- Autoguardado en el navegador y recuperación de la sesión anterior al arrancar.

## Formatos

- **Abrir:** PNG, JPEG, WebP, GIF (primer fotograma), BMP y SVG rasterizado según el navegador;
  TIFF; PSD con sus capas; y proyectos `.pintora.json`.
- **Exportar:** PNG (con transparencia), JPEG, WebP, TIFF y GIF animado (una capa visible por fotograma).
- **PSD:** importa capas, opacidad, visibilidad y los modos de mezcla equivalentes; exporta el
  documento con sus capas. Cada capa conserva su rectángulo (posición y tamaño) al importar y exportar.
- **Proyecto:** `.pintora.json`, versión 3, con capas (incluidos sus límites), máscaras, selección y colores.

Las capas tienen tamaño y posición propios: puedes importar una imagen como capa sin recortarla,
moverla total o parcialmente fuera del lienzo y pintar en ella con sus coordenadas locales.
El panel de capas se adapta a la altura disponible: en pantalla completa los botones de capa quedan
dentro de su panel y en vistas estrechas los paneles pasan a un desplegable.

XCF, 16 bits por canal y perfiles ICC todavía no están implementados.

## Estructura

- `src/engine.js`: motor sin DOM (mezcla, selecciones, pincel, filtros, curvas, histograma,
  documento e historial).
- `src/formats.js`: conversión sin DOM entre el modelo y PSD, TIFF y GIF.
- `src/app-core.js`: estado, vista, render, importar/exportar, portapapeles, autoguardado, texto.
- `src/app-tools.js`: herramientas y entrada de puntero.
- `src/app-ui.js`: diálogos, paneles, menús, atajos y arranque.
- `src/app.css`, `src/body.html`: estilos y estructura.
- `src/vendor.js`: librerías externas que se empaquetan en el HTML.
- `build.mjs`: une todo en un solo HTML.
- `electron/main.js`: ventana de escritorio.
- `test/engine.test.js`, `test/formats.test.js`: tests del motor y de los formatos.
- `test-ui/run.cjs`, `test-ui/suite.js`: 27 pruebas de interfaz sobre el HTML construido, con ventana
  Electron oculta, captura de errores y viewports de 1440×900, 1920×1080 y 800×700. Comprueban
  menús, herramientas, paneles desplegables, botones de capa, capas con límites, pintura, selección
  mágica, texto, filtros, transformaciones, temas y exportaciones reales a PNG, JPEG, WebP, TIFF y GIF.

## Iconos

El logotipo está en `build/icon.svg`. `npm run icons` lo rasteriza y regenera `build/icon.png`
(512 px), `build/icon-32.png`, `build/icon-180.png` y `build/icon.ico` (16–256 px). Electron usa
`dist/icon.png` y electron-builder toma `build/icon.ico` para el ejecutable de Windows. El HTML
incrusta el favicon SVG y los PNG de 32 y 180 px, así que la página sigue siendo un solo archivo.

## Empaquetado

```
npm install
npm run dist:win     # instalador NSIS y versión portable en release/
```

También hay `dist:mac` y `dist:linux`. Las librerías de formato (`ag-psd`, `utif`, `omggif`,
`gifenc`) se empaquetan dentro del HTML con esbuild desde `src/vendor.js`.

## Licencia

Las fórmulas de los modos de mezcla y la composición siguen el comportamiento del código fuente
de GIMP 3 (GPL). Distribuye Pintora bajo GPL-3.0-or-later e incluye el código fuente con cualquier
versión compilada. Pintora no está afiliado a GIMP ni al proyecto GNOME.
