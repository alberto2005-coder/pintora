/* Pintora UI translation layer.
 * Spanish is the source language in the markup and code; English is applied at
 * the DOM boundary so dynamic panels, menus, dialogs and toasts share one path. */
(function (root) {
  'use strict';

  const EN = {
    /* Shell and static labels */
    'Menús': 'Menus', 'Deshacer': 'Undo', 'Rehacer': 'Redo', 'Cambiar tema': 'Change theme',
    'Paneles: color, capas, historial': 'Panels: colour, layers, history', 'Paneles': 'Panels',
    'Herramientas': 'Tools', 'Lienzo': 'Canvas', 'Suelta una imagen para abrirla': 'Drop an image to open it',
    'Color': 'Colour', 'Capas': 'Layers', 'Historial': 'History', 'Histograma': 'Histogram',
    'Saturación y brillo': 'Saturation and brightness', 'Tono': 'Hue', 'Color de fondo': 'Background colour',
    'Color de frente': 'Foreground colour', 'Color de fondo (clic para editar)': 'Background colour (click to edit)',
    'Color de frente (clic para editar)': 'Foreground colour (click to edit)',
    'Color hexadecimal': 'Hex colour', 'Intercambiar (X)': 'Swap (X)', 'Intercambiar colores': 'Swap colours',
    'Negro y blanco (D)': 'Black and white (D)', 'Colores por defecto': 'Default colours',
    'Modo de mezcla': 'Blend mode', 'Opacidad de capa': 'Layer opacity',
    'Bloquear transparencia': 'Lock transparency', 'Histograma de la imagen': 'Image histogram',
    'Zoom': 'Zoom', 'Descartar cambios': 'Discard changes', 'Recuperar la sesión anterior': 'Recover previous session',
    'Sin título': 'Untitled', 'Ajustar': 'Fit', 'Cerrar': 'Close', 'Cancelar': 'Cancel',
    'Aceptar': 'OK', 'Aplicar': 'Apply', 'Crear': 'Create', 'Exportar': 'Export', 'Escalar': 'Scale',
    'Recortar': 'Crop', 'Restaurar': 'Restore', 'Descartar': 'Discard',

    /* Menus */
    'Archivo': 'File', 'Edición': 'Edit', 'Selección': 'Selection', 'Ver': 'View',
    'Imagen': 'Image', 'Capa': 'Layer', 'Colores': 'Colours', 'Filtros': 'Filters', 'Ayuda': 'Help',
    'Nueva imagen…': 'New image…', 'Abrir…': 'Open…', 'Abrir como capas…': 'Open as layers…',
    'Guardar proyecto (.pintora.json)': 'Save project (.pintora.json)',
    'Guardar como PSD…': 'Save as PSD…', 'Guardar como XCF…': 'Save as XCF…',
    'Exportar como imagen…': 'Export as image…', 'Exportar como SVG…': 'Export as SVG…',
    'Cortar': 'Cut', 'Copiar': 'Copy', 'Pegar como capa nueva': 'Paste as new layer',
    'Borrar': 'Clear', 'Rellenar con el color de frente': 'Fill with foreground colour',
    'Rellenar con el color de fondo': 'Fill with background colour', 'Trazar selección…': 'Stroke selection…',
    'Todo': 'All', 'Nada': 'None', 'Invertir': 'Invert', 'Agrandar…': 'Grow…', 'Reducir…': 'Shrink…',
    'Difuminar bordes…': 'Feather edges…', 'Borde…': 'Border…',
    'Transparencia de la capa a selección': 'Layer transparency to selection',
    'Acercar': 'Zoom in', 'Alejar': 'Zoom out', 'Ajustar a la ventana': 'Fit to window',
    'Tamaño real (100 %)': 'Actual size (100%)', 'Mostrar selección': 'Show selection',
    'Mostrar cuadrícula (con zoom ≥ 300 %)': 'Show grid (zoom ≥ 300%)',
    'Tema: sistema': 'Theme: system', 'Tema: claro': 'Theme: light', 'Tema: oscuro': 'Theme: dark',
    'Idioma: Español': 'Language: Spanish', 'Idioma: English': 'Language: English',
    'Tamaño del lienzo…': 'Canvas size…', 'Escalar imagen…': 'Scale image…',
    'Recortar a la selección': 'Crop to selection', 'Voltear horizontalmente': 'Flip horizontally',
    'Voltear verticalmente': 'Flip vertically', 'Girar 90° a la derecha': 'Rotate 90° clockwise',
    'Girar 90° a la izquierda': 'Rotate 90° counter-clockwise', 'Girar 180°': 'Rotate 180°',
    'Aplanar imagen': 'Flatten image', 'Capa nueva…': 'New layer…', 'Duplicar capa': 'Duplicate layer',
    'Eliminar capa': 'Delete layer', 'Combinar hacia abajo': 'Merge down', 'Subir capa': 'Raise layer',
    'Bajar capa': 'Lower layer', 'Llevar al frente': 'Bring to front', 'Llevar al fondo': 'Send to back',
    'Máscara': 'Mask', 'Añadir máscara (blanca)': 'Add mask (white)',
    'Añadir máscara desde la selección': 'Add mask from selection',
    'Añadir máscara desde la transparencia': 'Add mask from transparency', 'Invertir máscara': 'Invert mask',
    'Mostrar máscara': 'Show mask', 'Aplicar máscara': 'Apply mask', 'Eliminar máscara': 'Remove mask',
    'Transformar': 'Transform', 'Voltear capa horizontalmente': 'Flip layer horizontally',
    'Voltear capa verticalmente': 'Flip layer vertically', 'Girar y escalar…': 'Rotate and scale…',
    'Desplazar…': 'Offset…', 'Editar texto…': 'Edit text…', 'Repetir último filtro': 'Repeat last filter',
    'Atajos de teclado': 'Keyboard shortcuts', 'Acerca de Pintora': 'About Pintora',
    'Trazado vectorial': 'Vector path', 'Nuevo trazado': 'New path', 'Exportar SVG…': 'Export SVG…',
    'Profundidad: 8 bits': 'Depth: 8-bit', 'Profundidad: 16 bits': 'Depth: 16-bit',
    'Convertir perfil ICC a sRGB…': 'Convert ICC profile to sRGB…', 'Grosor': 'Width',

    /* Blend modes and mode groups */
    'Disolver': 'Dissolve', 'Detrás': 'Behind', 'Solo aclarar': 'Lighten only',
    'Solo aclarar (luma)': 'Lighten only (luma)', 'Trama': 'Screen', 'Sobreexponer': 'Dodge',
    'Suma': 'Addition', 'Solo oscurecer': 'Darken only', 'Solo oscurecer (luma)': 'Darken only (luma)',
    'Multiplicar': 'Multiply', 'Subexponer': 'Burn', 'Quemado lineal': 'Linear burn',
    'Superponer': 'Overlay', 'Luz suave': 'Soft light', 'Luz fuerte': 'Hard light',
    'Luz intensa': 'Vivid light', 'Luz puntual': 'Pin light', 'Luz lineal': 'Linear light',
    'Mezcla fuerte': 'Hard mix', 'Diferencia': 'Difference', 'Exclusión': 'Exclusion',
    'Sustracción': 'Subtract', 'Extraer grano': 'Grain extract', 'Fusionar grano': 'Grain merge',
    'División': 'Divide', 'Tono HSV': 'HSV hue', 'Saturación HSV': 'HSV saturation',
    'Color HSL': 'HSL colour', 'Valor HSV': 'HSV value', 'Tono LCh': 'LCh hue',
    'Croma LCh': 'LCh chroma', 'Color LCh': 'LCh colour', 'Luminosidad LCh': 'LCh lightness',
    'Aclarar': 'Lighten', 'Oscurecer': 'Darken', 'Contraste': 'Contrast',
    'Inversión': 'Inversion', 'Componentes': 'Components',

    /* Filter groups, filters and their controls */
    'Brillo y contraste': 'Brightness and contrast', 'Brillo': 'Brightness',
    'Niveles': 'Levels', 'Entrada: negro': 'Input: black', 'Entrada: blanco': 'Input: white',
    'Salida: negro': 'Output: black', 'Salida: blanco': 'Output: white', 'Gamma': 'Gamma',
    'Tono y saturación': 'Hue and saturation', 'Saturación': 'Saturation', 'Luminosidad': 'Lightness',
    'Colorear': 'Colorize', 'Desaturar': 'Desaturate', 'Método': 'Method', 'Luminancia': 'Luminance',
    'Claridad': 'Lightness', 'Promedio': 'Average', 'Valor': 'Value', 'Posterizar': 'Posterize',
    'Mínimo': 'Minimum', 'Máximo': 'Maximum', 'Intensidad': 'Intensity', 'Estirar contraste': 'Auto contrast',
    'Curva': 'Curve', 'Desenfoque gaussiano': 'Gaussian blur', 'Radio (σ)': 'Radius (σ)',
    'Desenfoque de movimiento': 'Motion blur', 'Longitud': 'Length',
    'Tamaño del bloque': 'Block size', 'Enfocar (máscara de enfoque)': 'Sharpen (unsharp mask)',
    'Radio': 'Radius', 'Cantidad': 'Amount', 'Ruido RGB': 'RGB noise', 'Monocromo': 'Monochrome',
    'Semilla': 'Seed', 'Relieve': 'Emboss', 'Ángulo de luz': 'Light angle', 'Profundidad': 'Depth',
    'Detectar bordes': 'Detect edges', 'Viñeta': 'Vignette', 'Suavidad': 'Softness',
    'Desenfoque': 'Blur', 'Sombra paralela': 'Drop shadow', 'Desplazamiento X': 'Offset X',
    'Desplazamiento Y': 'Offset Y',

    /* Tools and options */
    'Selección rectangular': 'Rectangular selection', 'Selección elíptica': 'Elliptical selection',
    'Selección libre': 'Freehand selection', 'Varita mágica': 'Magic wand', 'Selección por color': 'Colour selection',
    'Mover': 'Move', 'Recortar': 'Crop', 'Lápiz': 'Pencil', 'Pincel': 'Brush', 'Borrador': 'Eraser',
    'Aerógrafo': 'Airbrush', 'Clonar': 'Clone', 'Sobreexponer / subexponer': 'Dodge / burn',
    'Desenfocar / enfocar': 'Blur / sharpen', 'Manchar': 'Smudge', 'Cubo': 'Bucket', 'Degradado': 'Gradient',
    'Cuentagotas': 'Eyedropper', 'Texto': 'Text', 'Mano': 'Hand', 'Cubo de pintura': 'Paint bucket',
    'Tamaño': 'Size', 'Dureza': 'Hardness', 'Opacidad': 'Opacity', 'Espaciado': 'Spacing', 'Flujo': 'Flow',
    'Exposición': 'Exposure', 'Umbral': 'Threshold', 'Muestra combinada': 'Sample merged',
    'Relleno': 'Fill', 'Modo': 'Mode', 'Forma': 'Shape', 'Colores': 'Colours',
    'Selección': 'Selection', 'Suavizado': 'Anti-alias', 'Modo de selección': 'Selection mode',
    'Reemplazar': 'Replace', 'Nueva': 'New', 'Añadir': 'Add', 'Restar': 'Subtract',
    'Intersección': 'Intersect', 'Intersecar': 'Intersect',
    'Lineal': 'Linear', 'Radial': 'Radial', 'Ángulo': 'Angle', 'Reflejo': 'Reflected', 'Rombo': 'Diamond',
    'Frente/fondo': 'Foreground/background', 'Frente a transparente': 'Foreground to transparent',
    'Desenfocar': 'Blur', 'Enfocar': 'Sharpen', 'Sobreexponer': 'Dodge', 'Subexponer': 'Burn',
    'Sombras': 'Shadows', 'Medios tonos': 'Midtones', 'Luces': 'Highlights',
    'Suavizar bordes': 'Anti-alias edges', 'Muestrear toda la imagen': 'Sample all layers',
    'Zona de color similar': 'Similar colour area', 'Toda la selección': 'Entire selection',
    'Bilineal': 'Bilinear', 'Cónico': 'Conical', 'Frente → fondo': 'Foreground → background',
    'Frente → transparente': 'Foreground → transparent', 'Contenido': 'Content', 'Rango': 'Range',
    'Muestra': 'Sample', 'Imagen completa': 'Merged image', 'Capa activa': 'Active layer',
    'Presión del lápiz': 'Pen pressure',
    'Capa': 'Layer', 'Máscara': 'Mask', 'Origen fijado. Ctrl+clic para cambiarlo.': 'Source set. Ctrl-click to change it.',
    'Ctrl+clic para fijar el origen.': 'Ctrl-click to set the source.', 'Modo': 'Mode',
    'Arrastra. Mayús = cuadrado al arrastrar, Alt = desde el centro. Un clic sin arrastrar quita la selección.': 'Drag. Shift = square, Alt = from centre. Click without dragging clears the selection.',
    'Arrastra. Mayús = círculo, Alt = desde el centro.': 'Drag. Shift = circle, Alt = from centre.',
    'Haz clic para poner puntos o arrastra a mano alzada. Enter, doble clic o clic en el primer punto cierran.': 'Click to add points or drag freehand. Enter, double-click or click the first point to close.',
    'Selecciona la zona contigua de color parecido.': 'Select the contiguous area of similar colour.',
    'Selecciona todos los píxeles de color parecido.': 'Select all pixels of similar colour.',
    'Arrastra. Mayús limita a un eje.': 'Drag. Shift constrains to one axis.',
    'Arrastra un marco, ajústalo y pulsa Enter.': 'Drag a frame, adjust it and press Enter.',
    'Trazo duro, sin suavizado.': 'Hard stroke, no anti-aliasing.', '[ y ] cambian el tamaño.': '[ and ] change the size.',
    'Borra hacia transparente.': 'Erase to transparency.', 'La pintura se acumula mientras mantienes pulsado.': 'Paint builds up while you hold the button.',
    'Ctrl+clic fija el origen y luego pinta.': 'Ctrl-click sets the source, then paint.',
    'Aclara u oscurece. Ctrl invierte el modo.': 'Lighten or darken. Ctrl inverts the mode.',
    'Pinta para desenfocar o enfocar la capa.': 'Paint to blur or sharpen the layer.',
    'Arrastra para arrastrar el color de la zona.': 'Drag to pull colour from the area.',
    'Clic acerca, Alt+clic aleja, arrastra para encuadrar un área.': 'Click to zoom in, Alt-click to zoom out, drag to frame an area.',
    'Arrastra para desplazar. También con la barra espaciadora.': 'Drag to pan. The space bar also works.',
    'Clic para añadir puntos; arrastra un punto para moverlo; Enter o doble clic cierra el trazado.': 'Click to add points; drag a point to move it; Enter or double-click closes the path.',
    'Arrastra de inicio a fin.': 'Drag from start to end.',
    'Clic = color de frente, Alt+clic = color de fondo.': 'Click = foreground colour, Alt-click = background colour.',
    'Haz clic en el lienzo para escribir. Clic sobre un texto lo edita.': 'Click the canvas to type. Click existing text to edit it.',
    'Ctrl+clic rellena con el color de fondo.': 'Ctrl-click fills with the background colour.',

    /* Dialogs */
    'Imagen nueva': 'New image', 'Plantilla': 'Preset', 'Ancho (px)': 'Width (px)', 'Alto (px)': 'Height (px)',
    'Personalizado': 'Custom', 'cuadrado': 'square', 'Capa nueva': 'New layer', 'Nombre': 'Name',
    'Transparente': 'Transparent', 'Blanco': 'White', 'Exportar imagen': 'Export image', 'Formato': 'Format',
    'Calidad': 'Quality', 'Fondo': 'Background', 'Fondo (JPEG)': 'Background (JPEG)', 'Sustituye la transparencia': 'Replaces transparency',
    'Fotograma GIF (ms)': 'GIF frame (ms)', 'Solo para GIF animado': 'Animated GIF only',
    'PNG (sin pérdida, con transparencia)': 'PNG (lossless, with transparency)',
    'GIF animado (una capa visible por fotograma)': 'Animated GIF (one visible layer per frame)',
    '1080 × 1080 (cuadrado)': '1080 × 1080 (square)', '2480 × 3508 (A4, 300 ppp)': '2480 × 3508 (A4, 300 dpi)',
    'TIFF 8 bits (sin pérdida)': '8-bit TIFF (lossless)', 'TIFF 16 bits (sin pérdida)': '16-bit TIFF (lossless)',
    'Escalar imagen': 'Scale image', 'Mantener proporción': 'Keep proportions', 'Tamaño del lienzo': 'Canvas size',
    'Anclaje': 'Anchor', 'El área nueva queda transparente': 'The new area is transparent',
    'Arriba izquierda': 'Top left', 'Arriba centro': 'Top centre', 'Arriba derecha': 'Top right',
    'Centro izquierda': 'Middle left', 'Centro': 'Centre', 'Centro derecha': 'Middle right',
    'Abajo izquierda': 'Bottom left', 'Abajo centro': 'Bottom centre', 'Abajo derecha': 'Bottom right',
    'Curvas': 'Curves', 'Canal': 'Channel', 'Rojo': 'Red', 'Verde': 'Green', 'Azul': 'Blue',
    'Editor de curva': 'Curve editor', 'Arrastra los puntos. Clic para añadir, clic derecho para quitar.': 'Drag the points. Click to add, right-click to remove.',
    'Restablecer canal': 'Reset channel', 'Editar texto': 'Edit text', 'Fuente': 'Font', 'Tamaño (px)': 'Size (px)',
    'Negrita': 'Bold', 'Cursiva': 'Italic', 'Alineación': 'Alignment', 'Izquierda': 'Left', 'Derecha': 'Right',
    'Interlineado': 'Line spacing', 'Sans-serif del sistema': 'System sans-serif', 'Serif del sistema': 'System serif',
    'Monoespaciada': 'Monospaced', 'Atajos de teclado': 'Keyboard shortcuts', 'Acerca de Pintora': 'About Pintora',
    'Girar y escalar capa': 'Rotate and scale layer', 'Ángulo (°)': 'Angle (°)', 'Escala (%)': 'Scale (%)',
    'Desplazar X': 'Offset X', 'Desplazar Y': 'Offset Y', 'Posición de la capa': 'Layer position',
    'X (px)': 'X (px)', 'Y (px)': 'Y (px)', 'Agrandar selección': 'Grow selection', 'Reducir selección': 'Shrink selection',
    'Píxeles': 'Pixels', 'Difuminar bordes': 'Feather edges', 'Radio (px)': 'Radius (px)',
    'Borde de la selección': 'Selection border', 'Grosor (px)': 'Width (px)', 'Trazar selección': 'Stroke selection',
    'No hay selección.': 'There is no selection.', 'No hay capa activa.': 'There is no active layer.',
    'La selección no toca la capa activa.': 'The selection does not touch the active layer.',
    'No puedes eliminar la única capa.': 'You cannot delete the only layer.', 'No hay capa debajo.': 'There is no layer below.',
    'La capa ya tiene máscara.': 'The layer already has a mask.', 'La capa no tiene máscara.': 'The layer has no mask.',
    'La capa activa no es de texto.': 'The active layer is not a text layer.',
    'Todavía no has aplicado ningún filtro.': 'You have not applied a filter yet.',
    'El portapapeles está vacío.': 'The clipboard is empty.', 'Copiado': 'Copied', 'Cortado': 'Cut',
    'Sesión restaurada': 'Session restored', 'Hay cambios sin guardar': 'There are unsaved changes',
    'La imagen actual tiene cambios sin guardar. Si continúas se perderán.': 'The current image has unsaved changes. If you continue they will be lost.',

    /* Status, history and file messages */
    'Estado inicial': 'Initial state', 'Imagen vacía': 'Empty image', 'Sin título': 'Untitled',
    'Ajustar': 'Fit', 'Selección': 'Selection', 'capas': 'layers', 'capa': 'layer',
    'Guardado: ': 'Saved: ', 'Proyecto abierto: ': 'Project opened: ', 'No se pudo abrir ': 'Could not open ',
    'No se pudo restaurar: ': 'Could not restore: ', 'El PSD no tiene un tamaño válido.': 'The PSD has an invalid size.',
    'El PSD no tiene capas de mapa de bits válidas.': 'The PSD has no valid bitmap layers.',
    'El PSD no tiene capas de mapa de bits.': 'The PSD has no bitmap layers.',
    'El TIFF no tiene páginas.': 'The TIFF has no pages.', 'Proyecto dañado': 'Damaged project',
    'No es un proyecto de Pintora': 'Not a Pintora project', 'El proyecto no tiene capas': 'The project has no layers',
    'El proyecto supera el tamaño máximo.': 'The project exceeds the maximum size.',
    'Una capa del proyecto tiene un tamaño no válido.': 'A project layer has an invalid size.',
    'Este navegador no puede exportar ': 'This browser cannot export ',
    'El archivo es demasiado grande para guardarlo aquí.': 'The file is too large to save here.',
    'No se pudo leer la imagen': 'Could not read the image', 'IndexedDB no disponible': 'IndexedDB is not available',
    'El XCF no tiene un tamaño válido.': 'The XCF has an invalid size.',
    'El XCF no tiene capas RGBA válidas.': 'The XCF has no valid RGBA layers.',
    'El XCF no tiene capas RGBA.': 'The XCF has no RGBA layers.',
    'El perfil ICC es demasiado pequeño.': 'The ICC profile is too small.',
    'Solo se admiten perfiles ICC RGB.': 'Only RGB ICC profiles are supported.',
    'La tabla de etiquetas ICC no es válida.': 'The ICC tag table is invalid.',
    'Falta el perfil ICC.': 'The ICC profile is missing.',
    'Ocultar capa': 'Hide layer', 'Mostrar capa': 'Show layer', 'Nombre de capa': 'Layer name',
    'Máscara de capa (clic para editarla)': 'Layer mask (click to edit)',
    'Añadir máscara de capa': 'Add layer mask', 'Nueva capa': 'New layer',
    'Sal de la edición de máscara (clic en la miniatura de la capa) para usar esto.': 'Exit mask editing (click the layer thumbnail) to use this.',
    'Haz primero una selección.': 'Make a selection first.', 'Origen del clonado fijado': 'Clone source set',
    'Ctrl+clic para elegir el origen del clonado.': 'Ctrl-click to choose the clone source.',
    'Esta capa no tiene máscara.': 'This layer has no mask.',
    'Estas herramientas solo pintan en la capa, no en la máscara.': 'These tools only paint on the layer, not on the mask.',
    'Cerrar trazado': 'Close path', 'Mover punto de trazado': 'Move path point',
    'Añadir punto de trazado': 'Add path point', 'Quitar punto de trazado': 'Remove path point',
    'Visibilidad de capa': 'Layer visibility', 'Renombrar capa': 'Rename layer', 'Modo de capa': 'Layer mode',
    'Mostrar/ocultar máscara': 'Show/hide mask', 'Transformar capa': 'Transform layer',
    'Mover capa': 'Move layer', 'Capa al frente': 'Layer to front', 'Capa al fondo': 'Layer to back',
    'Quitar selección': 'Clear selection', 'Invertir selección': 'Invert selection',
    'Alfa a selección': 'Alpha to selection', 'Seleccionar todo': 'Select all',
    'Añadir máscara': 'Add mask', 'Convertir perfil ICC': 'Convert ICC profile',
    'Abrir PSD como capa': 'Open PSD as layer', 'Abrir XCF como capa': 'Open XCF as layer',
    'Documento de 8 bits por canal': '8-bit per channel document',
    'Documento de 16 bits por canal': '16-bit per channel document',
    'Recortar lienzo': 'Crop canvas', 'Rotar imagen': 'Rotate image',
    'Negro de marfil': 'Ivory black', 'Blanco de titanio': 'Titanium white', 'Gris neutro': 'Neutral grey',
    'Rojo cadmio': 'Cadmium red', 'Carmín': 'Carmine', 'Rosa': 'Pink', 'Naranja cadmio': 'Cadmium orange',
    'Ocre amarillo': 'Yellow ochre', 'Amarillo limón': 'Lemon yellow', 'Verde esmeralda': 'Emerald green',
    'Verde oliva': 'Olive green', 'Turquesa': 'Turquoise', 'Azul cobalto': 'Cobalt blue',
    'Ultramar': 'Ultramarine', 'Violeta': 'Violet', 'Siena tostada': 'Burnt sienna', 'Sombra natural': 'Raw umber',

    /* Help and about */
    'Selección rectangular, elíptica, libre, varita mágica': 'Rectangular, elliptical and freehand selection, magic wand',
    'Mover · recortar': 'Move · crop',
    'Lápiz · pincel · borrador · aerógrafo': 'Pencil · brush · eraser · airbrush',
    'Clonar · sobreexponer/subexponer': 'Clone · dodge/burn', 'Manchar · desenfocar/enfocar': 'Smudge · blur/sharpen',
    'Cubo · degradado · cuentagotas · texto': 'Bucket · gradient · eyedropper · text',
    'Zoom · mano · desplazar temporalmente': 'Zoom · hand · temporary pan',
    'Reducir / aumentar el pincel': 'Decrease / increase brush size',
    'Intercambiar colores · negro y blanco': 'Swap colours · black and white',
    'Deshacer · rehacer': 'Undo · redo', 'Seleccionar todo · nada · invertir': 'Select all · none · invert',
    'Copiar · cortar · pegar como capa (Mayús fuerza el portapapeles del sistema)': 'Copy · cut · paste as layer (Shift forces the system clipboard)',
    'Borrar la selección': 'Clear the selection', 'Imagen nueva · abrir archivo': 'New image · open file',
    'Guardar proyecto · exportar imagen': 'Save project · export image',
    'Capa nueva · duplicar capa': 'New layer · duplicate layer',
    'Repetir último filtro · ajustar a la ventana': 'Repeat last filter · fit to window',
    'Zoom · desplazar': 'Zoom · pan', 'Zoom 100 % · 200 % · ajustar': 'Zoom 100% · 200% · fit',

    /* About and help */
    'Pintora 0.1.0 es un editor de imágenes independiente para navegador y escritorio. Reúne 22 herramientas, 20 filtros, 35 modos de mezcla, capas con opacidad, máscaras y tamaño y posición propios, selecciones, texto rasterizado, trazados vectoriales e historial con deshacer y rehacer.': 'Pintora 0.1.0 is an independent image editor for the browser and desktop. It brings together 22 tools, 20 filters, 35 blend modes, layers with opacity, masks and their own size and position, selections, rasterised text, vector paths and undo/redo history.',
    'Abre PNG, JPEG, WebP, TIFF de 8 o 16 bits, GIF, PSD y XCF con capas RGBA, y exporta además SVG. Los proyectos .pintora.json v4 conservan capas, límites, máscaras, selección, colores, trazados, perfil ICC y precisión de 16 bits. El autoguardado recupera la sesión anterior al volver a abrir la aplicación.': 'It opens PNG, JPEG, WebP, 8/16-bit TIFF, GIF, PSD and XCF with RGBA layers, and also exports SVG. .pintora.json v4 projects keep layers, bounds, masks, selection, colours, paths, ICC profile and 16-bit precision. Autosave recovers the previous session when you reopen the application.',
    'Las fórmulas de los modos de mezcla y la composición por capas siguen el comportamiento del código fuente de GIMP 3 (GPL). Pintora no está afiliado a GIMP ni al proyecto GNOME. Si distribuyes una versión compilada, hazlo bajo GPL-3.0-or-later y ofrece el código fuente.': 'Blend-mode formulas and layer compositing follow the behaviour of the GIMP 3 source code (GPL). Pintora is not affiliated with GIMP or the GNOME project. If you distribute a compiled build, do so under GPL-3.0-or-later and provide the source code.',
    'La interfaz está disponible en español e inglés. La composición y los proyectos conservan 16 bits, pero las herramientas de píxeles, los filtros y las selecciones trabajan sobre el búfer de 8 bits. Los trazados vectoriales se editan y exportan a SVG, y los perfiles ICC RGB con matrices/TRC se convierten a sRGB; los perfiles basados solo en LUT se rechazan para no aplicar una conversión incorrecta.': 'The interface is available in Spanish and English. Compositing and projects preserve 16 bits, but pixel tools, filters and selections work on the 8-bit buffer. Vector paths can be edited and exported to SVG, and RGB ICC profiles using matrices/TRC are converted to sRGB; profiles based only on LUTs are rejected rather than converted incorrectly.',
    'El perfil ICC usa una transformación LUT no compatible.': 'The ICC profile uses an unsupported LUT transform.', 'No se pudo aplicar el perfil ICC.': 'The ICC profile could not be applied.', 'Perfil ICC convertido: ': 'ICC profile converted: '
  };

  const PATTERNS = [
    [/^(.*) · (\d+) capas?$/, (m, head, n) => head + ' · ' + n + (n === '1' ? ' layer' : ' layers')],
    [/^(.+) \(([A-Za-z0-9+]+)\)$/, (m, label, key) => translate(label) + ' (' + key + ')'],
    [/^Recortado a (\d+) × (\d+) px$/, 'Cropped to $1 × $2 px'],
    [/^Color (#[0-9A-F]{6})$/, 'Colour $1'],
    [/^La cabecera ICC no es válida \((.+)\)$/, 'The ICC header is invalid ($1)'],
    [/^(.+) (#[0-9A-F]{6}) \(Alt\+clic = fondo\)$/i, (m, name, hex) => translate(name) + ' ' + hex + ' (Alt-click = background)'],
    [/^Hay cambios sin guardar de (.+?) \((.+)\)\.$/, 'There are unsaved changes from $1 ($2).'],
    [/^Tema: sistema$/, 'Theme: system'], [/^Tema: claro$/, 'Theme: light'], [/^Tema: oscuro$/, 'Theme: dark'],
    [/^Selección (\d+) × (\d+) en (-?\d+), (-?\d+)$/, 'Selection $1 × $2 at $3, $4'],
    [/^(\d+) capas?$/, (m, n) => n + (n === '1' ? ' layer' : ' layers')],
    [/^(\d+) × (\d+) px · (\d+) capas?$/, (m, w, h, n) => w + ' × ' + h + ' px · ' + n + (n === '1' ? ' layer' : ' layers')],
    [/^Guardado: (.+)$/, 'Saved: $1'], [/^Proyecto abierto: (.+)$/, 'Project opened: $1'],
    [/^No se pudo abrir (.+)$/, 'Could not open $1'], [/^No se pudo restaurar: (.+)$/, 'Could not restore: $1'],
    [/^PSD: (\d+) capas · (.+)$/, (m, n, size) => 'PSD: ' + n + ' layers · ' + size],
    [/^GIF: abierto el primer fotograma de (\d+)$/, 'GIF: opened the first of $1 frames'],
    [/^XCF: (\d+) capas · (.+)$/, (m, n, size) => 'XCF: ' + n + ' layers · ' + size],
    [/^Imagen (\d+) × (\d+) px\. El máximo es (\d+) × (\d+)\.$/, 'Image is $1 × $2 px. The maximum is $3 × $4.'],
    [/^La imagen mide (\d+) × (\d+) px\. El máximo es (\d+) × (\d+)\.$/, 'The image is $1 × $2 px. The maximum is $3 × $4.'],
    [/^Archivo: (.+)$/, 'File: $1'],
    [/^(\d+) px con alfa · luminancia media (.+)$/, '$1 px with alpha · mean luminance $2']
  ];

  let lang = 'es';
  let applying = false;
  let scheduled = false;
  const textMemory = new WeakMap();
  const attrMemory = new WeakMap();
  const SKIP = 'script,style,textarea,.name,[data-i18n-skip]';

  function translate(value) {
    if (lang !== 'en' || value === null || value === undefined) return value;
    const s = String(value);
    if (Object.prototype.hasOwnProperty.call(EN, s)) return EN[s];
    for (const [re, replacement] of PATTERNS) if (re.test(s)) return s.replace(re, replacement);
    return s.replace(/Mayús/g, 'Shift').replace(/\bSupr\b/g, 'Del').replace(/\bEspacio\b/g, 'Space').replace(/\brueda\b/g, 'wheel');
  }

  function skipped(node) {
    const el = node.nodeType === 1 ? node : node.parentElement;
    return !!(el && el.closest && el.closest(SKIP));
  }

  function translateTextNode(node) {
    if (skipped(node)) return;
    let rec = textMemory.get(node);
    if (!rec) { rec = { es: node.nodeValue, last: node.nodeValue }; textMemory.set(node, rec); }
    else if (node.nodeValue !== rec.last) { rec.es = node.nodeValue; }
    const wanted = lang === 'en' ? translate(rec.es) : rec.es;
    if (node.nodeValue !== wanted) node.nodeValue = wanted;
    rec.last = wanted;
  }

  function translateAttr(el, name) {
    if (skipped(el)) return;
    let rec = attrMemory.get(el);
    if (!rec) { rec = {}; attrMemory.set(el, rec); }
    const current = el.getAttribute(name);
    if (current === null) return;
    let slot = rec[name];
    if (!slot) { slot = rec[name] = { es: current, last: current }; }
    else if (current !== slot.last) slot.es = current;
    const wanted = lang === 'en' ? translate(slot.es) : slot.es;
    if (current !== wanted) el.setAttribute(name, wanted);
    slot.last = wanted;
  }

  function apply(rootNode) {
    if (typeof document === 'undefined') return;
    const node = rootNode || document.body;
    if (!node) return;
    applying = true;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let current;
    while ((current = walker.nextNode())) translateTextNode(current);
    for (const el of node.querySelectorAll('[title],[aria-label],[placeholder],[alt],[label]')) {
      for (const name of ['title', 'aria-label', 'placeholder', 'alt', 'label']) if (el.hasAttribute(name)) translateAttr(el, name);
    }
    if (node === document.body) document.documentElement.lang = lang;
    applying = false;
  }

  function schedule() {
    if (scheduled || applying || typeof requestAnimationFrame === 'undefined') return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; apply(); });
  }

  function setLanguage(next) {
    lang = next === 'en' ? 'en' : 'es';
    try { localStorage.setItem('pintora-lang', lang); } catch (e) { /* storage unavailable */ }
    apply();
    return lang;
  }

  function init() {
    try { lang = localStorage.getItem('pintora-lang') === 'en' ? 'en' : 'es'; } catch (e) { lang = 'es'; }
    apply();
    if (typeof MutationObserver !== 'undefined' && document.body) {
      new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder', 'alt', 'label'] });
    }
    return lang;
  }

  root.PintoraI18n = { get lang() { return lang; }, t: translate, apply, schedule, setLanguage, init, dictionary: EN };
})(typeof self !== 'undefined' ? self : this);