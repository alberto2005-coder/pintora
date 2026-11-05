# Pruebas / Tests

[Español](#español) · [English](#english)

## Español

### Comandos

```text
npm test          # motor, formatos y utilidades sin DOM
npm run test:ui   # interfaz en Electron con guardado simulado
npm run test:app  # ejecutable Electron con descargas y persistencia reales
npm run test:all  # las tres suites
```

`npm run test:ui` y `npm run test:app` reconstruyen `dist/pintora.html` antes de arrancar Electron.

### Cobertura automatizada

- **Unitarias:** composición por capas, 35 modos de mezcla, selecciones, máscaras, pincel, filtros,
  curvas, histograma, historial, PSD, TIFF y GIF.
- **Interfaz:** 27 casos sobre el HTML construido; menús, herramientas, botones de capa, paneles
  desplegables, capas con límites, máscaras, pintura, selección mágica, texto, filtros,
  transformaciones, temas, proyecto v3 y exportaciones con un `window.claude` simulado.
- **Ejecutable:** 4 casos con la ventana de producción de `electron/window.js`:
  1. Ventana nativa, menú propio, tamaño mínimo y ausencia de `window.claude`.
  2. Descargas reales del fallback del navegador para PNG, JPEG, WebP, TIFF, GIF, proyecto v3 y PSD.
  3. Apertura desde disco de los archivos descargados, incluidos PSD, TIFF, GIF, proyecto y apertura
     como capa.
  4. Autoguardado real en IndexedDB, cierre de la ventana y recuperación de la sesión.

Las descargas del ejecutable se interceptan con `session.on('will-download')` y se guardan en una
carpeta temporal. Esto evita abrir un diálogo nativo y permite comprobar los bytes reales, pero no
demuestra el comportamiento visual del selector de archivos del sistema.

### Pruebas manuales necesarias

Estas acciones dependen de la interfaz del sistema operativo o del entorno y no se automatizan:

- Abrir un archivo con el selector nativo de Windows, macOS o Linux.
- Arrastrar un archivo desde el Explorador o Finder.
- Copiar una imagen desde otra aplicación y pegarla en Pintora, y al revés.
- Aceptar, cancelar y sobrescribir en el diálogo nativo de guardado.
- Instalar el paquete NSIS o la versión portable y comprobar accesos directos, icono y arranque.
- Ejecutar con escalado de Windows al 125 % y 150 %, varios monitores, maximizar y restaurar.
- Arrancar sin conexión para comprobar la fuente de reserva y el funcionamiento offline.
- Revisar foco, tabulación y lectores de pantalla.

### Requisitos

Electron necesita una sesión gráfica. En Linux sin escritorio hay que ejecutar las suites dentro de
`xvfb-run` o un entorno equivalente. Los tests no modifican la carpeta de descargas del usuario:
`test:app` usa un directorio temporal y lo elimina al terminar.

### Criterio de aceptación

Una función compartida se considera correcta cuando pasa las pruebas unitarias y de interfaz. Una
función dependiente de la plataforma solo se considera verificada cuando además pasa `test:app` o la
comprobación manual correspondiente. El instalador empaquetado no se sustituye por `test:app`.

## English

### Commands

```text
npm test          # engine, formats and DOM-free utilities
npm run test:ui   # Electron interface with a simulated save dialog
npm run test:app  # Electron executable with real downloads and persistence
npm run test:all  # all three suites
```

`npm run test:ui` and `npm run test:app` rebuild `dist/pintora.html` before starting Electron.

### Automated coverage

- **Unit tests:** layer compositing, 35 blend modes, selections, masks, brush, filters, curves,
  histogram, history, PSD, TIFF and GIF.
- **Interface:** 27 cases on the built HTML; menus, tools, layer buttons, collapsible panels, layers
  with bounds, masks, painting, magic selection, text, filters, transforms, themes, v3 projects and
  exports with a simulated `window.claude`.
- **Executable:** 4 cases using the production window from `electron/window.js`:
  1. Native window, editor-owned menu, minimum size and absence of `window.claude`.
  2. Real browser-fallback downloads for PNG, JPEG, WebP, TIFF, GIF, v3 project and PSD.
  3. Opening the downloaded files from disk, including PSD, TIFF, GIF, project and open-as-layer.
  4. Real IndexedDB autosave, closing the window and recovering the session.

Executable downloads are intercepted with `session.on('will-download')` and written to a temporary
folder. This avoids a native dialog and verifies the real bytes, but it does not prove the visual
behaviour of the operating system file picker.

### Required manual tests

These actions depend on the operating system interface or environment and are not automated:

- Opening a file with the native Windows, macOS or Linux file picker.
- Dragging a file from Explorer or Finder.
- Copying an image from another application into Pintora and vice versa.
- Accepting, cancelling and overwriting in the native save dialog.
- Installing the NSIS or portable package and checking shortcuts, icon and startup.
- Running at 125% and 150% Windows scaling, multiple monitors, maximise and restore.
- Starting offline to check font fallback and offline operation.
- Reviewing focus, tab order and screen-reader support.

### Requirements

Electron needs a graphical session. On headless Linux, run the suites under `xvfb-run` or an
equivalent environment. The tests do not touch the user's Downloads folder: `test:app` uses a
temporary directory and removes it on exit.

### Acceptance rule

A shared feature is accepted when it passes the unit and interface tests. A platform-dependent
feature is only verified when it also passes `test:app` or the corresponding manual check. The
packaged installer is not replaced by `test:app`.
