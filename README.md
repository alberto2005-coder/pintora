# Pintora

Editor de imágenes con capas, selecciones, pinceles, filtros y modos de mezcla.
Funciona como página suelta en el navegador y como aplicación de escritorio con Electron.

## Uso rápido

- Abre `dist/pintora.html` en un navegador moderno (no necesita servidor).
- `npm run build` regenera `dist/` a partir de `src/`.
- `npm test` ejecuta los tests del motor (Node 20 o superior).
- `npm start` abre la app de escritorio sin empaquetar.

## Qué incluye

- Capas con opacidad, visibilidad, bloqueo de transparencia, máscaras y 35 modos de mezcla.
- Selecciones rectangular, elíptica, libre, por color y varita mágica, con modos de combinación.
- 19 herramientas de pintura, selección, transformación y vista.
- 19 filtros de color, desenfoque, mejora, distorsión y luz.
- Texto rasterizado, historial con deshacer/rehacer, guías de selección animadas.
- Proyecto propio `.pintora.json` que conserva capas y máscaras.

## Formatos

- **Abrir:** cualquier formato que decodifique el navegador (PNG, JPEG, WebP, GIF, BMP, SVG
  rasterizado) y proyectos `.pintora.json`. El GIF se abre en su primer fotograma.
- **Exportar:** PNG (con transparencia), JPEG y WebP.
- **Proyecto:** `.pintora.json`, con cada capa y máscara como PNG incrustado.

XCF, 16 bits por canal, perfiles ICC y capas con tamaño propio todavía no están implementados.

## Estructura

- `src/engine.js`: motor sin DOM (mezcla, selecciones, pincel, filtros, documento e historial).
- `src/app-core.js`: estado, vista, render, importar/exportar, portapapeles, texto, imagen de ejemplo.
- `src/app-tools.js`: herramientas y entrada de puntero.
- `src/app-ui.js`: diálogos, paneles, menús, atajos y arranque.
- `src/app.css`, `src/body.html`: estilos y estructura.
- `src/vendor.js`: librerías externas que se empaquetan en el HTML.
- `build.mjs`: une todo en un solo HTML.
- `electron/main.js`: ventana de escritorio.
- `test/engine.test.js`: tests del motor.

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
