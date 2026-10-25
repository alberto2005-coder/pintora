# Pintora

Editor de imágenes con capas, selecciones, pinceles, filtros y modos de mezcla.
Funciona en el navegador y se empaqueta como aplicación de escritorio con Electron.

## Uso rápido
- Abre `dist/pintora.html` en cualquier navegador moderno (no necesita servidor).
- `npm run build` regenera `dist/` a partir de `src/`.
- `npm test` ejecuta los tests del motor (Node 20 o superior).

## Generar el .exe (en un PC con Node)
```
npm install
npm run dist:win     # instalador NSIS y versión portable en release/
```
También hay `dist:mac` y `dist:linux`. `npm start` abre la app de escritorio sin empaquetar.

## Librerías y entorno
- Node 20+ (`npm install` instala todo lo de `package.json`).
- Librerías del editor (se empaquetan dentro del HTML con esbuild): `ag-psd` (PSD), `utif` (TIFF), `omggif` y `gifenc` (GIF).
- Para añadir otra: `npm install nombre`, impórtala en `src/vendor.js`, añádela a `window.PintoraLibs` y ejecuta `npm run build`.
- Entorno de Python opcional para herramientas de apoyo (comparar resultados con GIMP, generar imágenes de prueba):
  `python3 -m venv .venv`, luego `source .venv/bin/activate` (en Windows: `.venv\\Scripts\\activate`) y `pip install -r requirements.txt`.
  Para añadir una librería de Python: `pip install nombre` y `pip freeze > requirements.txt`.

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

## Licencia
Las fórmulas de los modos de mezcla y la composición siguen el comportamiento del código fuente
de GIMP 3 (GPL). Distribuye Pintora bajo GPL-3.0-or-later e incluye el código fuente con cualquier
versión compilada. Pintora no está afiliado a GIMP ni al proyecto GNOME.

## Pendiente
XCF, trazados vectoriales, 16 bits por canal, perfiles ICC, varias imágenes a la vez, curvas, manchar y deformaciones.
