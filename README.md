# Pintora

Editor de imágenes con capas, selecciones, pinceles, filtros y modos de mezcla.
Funciona como página suelta en el navegador y como aplicación de escritorio con Electron.

## Uso rápido

- Abre `dist/pintora.html` en un navegador moderno (no necesita servidor).
- `npm run build` regenera `dist/` a partir de `src/`.
- `npm test` ejecuta los tests del motor y de formatos (Node 20 o superior).
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
  documento con sus capas. Las capas se guardan al tamaño del lienzo (sin recortar su rectángulo original).
- **Proyecto:** `.pintora.json`, versión 2, con capas, máscaras, selección y colores.

XCF, 16 bits por canal, perfiles ICC y capas con tamaño propio todavía no están implementados.

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
