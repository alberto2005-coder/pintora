# Qué le falta a Pintora para igualar a GIMP

Estado actual: Pintora 0.1 cubre el uso básico (capas, 35 modos de mezcla, selecciones, 19 herramientas, 19 filtros, máscaras, texto, historial, exportar PNG/JPEG/WebP). GIMP lleva casi 30 años de desarrollo, así que "igual al 100 %" es un objetivo a largo plazo. Esta lista está pensada para ir tachando.

Leyenda de esfuerzo: **S** = días, **M** = semanas, **L** = meses.

## 1. Formatos de archivo

- [ ] Leer y escribir `.xcf` (formato nativo de GIMP) — **L**
- [ ] Leer y escribir `.psd` (Photoshop) — **L**
- [ ] `.tiff` (varias páginas, 16 bits) — **M**
- [ ] `.gif` animado (importar y exportar) — **M**
- [ ] `.svg` (importar como imagen rasterizada) — **S**
- [ ] `.pdf` (importar páginas, exportar) — **M**
- [ ] RAW de cámara — **L**
- [ ] `.heic`, `.avif`, `.bmp`, `.ico` — **S** cada uno
- [ ] Metadatos EXIF, XMP e IPTC (leer, editar, conservar al exportar) — **M**
- [ ] Resolución y tamaño de impresión (ppp) — **S**

## 2. Color

- [ ] 16 bits por canal y 32 bits en coma flotante (HDR) — **L** (obliga a reescribir el motor sobre `Float32Array`)
- [ ] Gestión de color con perfiles ICC (asignar, convertir, incrustar al exportar) — **L**
- [ ] CMYK y prueba de impresión (soft proof) — **L**
- [ ] Modos de imagen: escala de grises e indexado (paleta) — **M**
- [ ] Canales por separado (R, G, B, alfa, canales personalizados) — **M**
- [ ] Histograma — **S**
- [ ] Editor de paletas y degradados — **M**

## 3. Capas

- [ ] Capas con tamaño y posición propios (hoy todas miden lo mismo que el lienzo, y mover una capa recorta lo que sale) — **L**
- [ ] Grupos de capas y modo "paso a través" — **M**
- [ ] Modos de mezcla antiguos (legacy) y modo de composición por capa — **S**
- [ ] Bloquear posición y píxeles — **S**
- [ ] Capas vinculadas — **S**
- [ ] Varias imágenes abiertas a la vez, en pestañas — **M**
- [ ] Capas de ajuste no destructivas y filtros editables — **L**

## 4. Herramientas que faltan

GIMP trae unas 50 herramientas distintas; Pintora tiene 19.

**Transformación**
- [ ] Escalar, rotar, sesgar y perspectiva con manipuladores en pantalla — **M**
- [ ] Transformación unificada y por cuadrícula — **M**
- [ ] Voltear como herramienta, alinear — **S**
- [ ] Deformación (warp), jaula (cage) y deformación por N puntos — **L**
- [ ] Rotación 3D — **L**

**Retoque**
- [ ] Manchar (smudge) — **S**
- [ ] Desenfocar y enfocar con pincel (convolve) — **S**
- [ ] Curar (heal) — **M**
- [ ] Clonado en perspectiva y clonado sin costuras — **M**

**Selección avanzada**
- [ ] Tijeras inteligentes — **M**
- [ ] Selección de primer plano — **L**
- [ ] Selección por pincel (paint select) — **M**
- [ ] Máscara rápida — **S**
- [ ] Editor de selección y guardar selección como canal — **S**

**Trazados y medición**
- [ ] Trazados (paths) con curvas Bézier, convertir a selección y trazar — **L**
- [ ] Medir distancias y ángulos — **S**
- [ ] Guías, reglas, imán (snap) y puntos de muestra — **M**

**Color**
- [ ] Curvas — **M**
- [ ] Balance de color, mezclador de canales, sombras y luces — **M**
- [ ] Herramientas de color con previsualización en el lienzo — **M**

## 5. Pinceles

- [ ] Editor de pinceles y formas basadas en imagen — **M**
- [ ] Dinámicas (presión, inclinación, velocidad, dirección) — **M**
- [ ] Patrones y relleno con patrón — **S**
- [ ] Suavizado del trazo y estabilizador — **S**
- [ ] Pintura simétrica (espejo, mandala, tileado) — **M**
- [ ] Pinceles MyPaint — **L**
- [ ] Tinta (ink) — **M**
- [ ] Pinceles animados (pipes) — **M**

## 6. Filtros y efectos

Pintora tiene 19; GIMP tiene cientos (GEGL).

- [ ] Reducción de ruido, desenfoque de lente, desenfoque radial y de zoom — **M**
- [ ] Resplandor (bloom), viñeta avanzada, óleo, dibujo animado, boceto — **M**
- [ ] Distorsión de lente, ondas, ondulación, remolino, pellizco — **M**
- [ ] Desplazamiento (displace), mosaico, tileado sin costuras — **M**
- [ ] Texturas y ruido procedural (Perlin, nubes, plasma) — **M**
- [ ] Sombras y luces, HDR tone mapping — **M**
- [ ] Filtros como capas editables (vista previa y reajuste posterior) — **L**

## 7. Texto

- [ ] Edición directamente sobre el lienzo (hoy se usa un diálogo) — **M**
- [ ] Estilos mezclados dentro de un mismo texto (negrita, color, tamaño por palabra) — **L**
- [ ] Texto sobre un trazado y texto en un trazado — **L**
- [ ] Justificado, kerning, tracking, subrayado, tachado — **M**
- [ ] Gestión de fuentes instaladas y fuentes propias — **M**

## 8. Interfaz y flujo de trabajo

- [ ] Paneles acoplables, movibles y personalizables — **L**
- [ ] Atajos de teclado configurables y preferencias — **M**
- [ ] Navegador de vista previa y vistas múltiples de la misma imagen — **M**
- [ ] Plantillas de imagen y recientes — **S**
- [ ] Pantalla completa y modos de vista (sin menús) — **S**
- [ ] Monitor de memoria y deshacer con volcado a disco — **M**
- [ ] Traducción a varios idiomas (hoy solo español) — **M**

## 9. Rendimiento

- [ ] Procesar en hilos (Web Workers) para no bloquear la interfaz — **M**
- [ ] Imágenes por teselas (tiles) para fotos enormes; hoy el límite es 8192 px por lado — **L**
- [ ] Aceleración por GPU (WebGL/WebGPU) en composición y filtros — **L**
- [ ] Recomposición parcial más fina al pintar sobre imágenes grandes — **M**

## 10. Extensibilidad

- [ ] Sistema de plugins — **L**
- [ ] Scripting (equivalente a Script-Fu y Python-fu) — **L**
- [ ] Procesamiento por lotes — **M**
- [ ] Línea de comandos para automatizar — **M**
- [ ] Animación y GIF por capas (equivalente a GAP) — **L**

---

## Orden recomendado

Para llegar al 90 % del uso diario antes de perseguir el 100 %:

1. Formatos: PSD, TIFF, GIF animado, SVG.
2. Capas con posición y tamaño propios, grupos y pestañas.
3. Curvas, balance de color y canales.
4. Herramientas de transformación con manipuladores.
5. Un motor de pincel más completo (dinámicas, formas, simetría).
6. Manchar, curar y selección por pincel.
7. Trazados y texto enriquecido.
8. 16 bits e ICC.
9. Rendimiento: hilos, teselas y GPU.

## Atajo posible: reutilizar GEGL y babl

GEGL (filtros y operaciones) y babl (formatos y color) son las librerías de GIMP y son de código abierto. Compilarlas a WebAssembly con Emscripten daría de golpe cientos de filtros, formatos de píxel de 16/32 bits y conversión de color con los mismos resultados que GIMP, en lugar de reescribirlos uno a uno.

- Ventaja: fidelidad exacta con GIMP en filtros, color y modos de mezcla.
- Coste: complejidad de compilación, tamaño de descarga y adaptar la interfaz a un motor basado en grafos.
- Estado: **no probado**. Hay que hacer una prueba de viabilidad corta antes de comprometerse.

## Licencia

Pintora sigue el comportamiento del código de GIMP (GPL). Cualquier versión compilada debe distribuirse bajo GPL-3.0-or-later con el código fuente disponible. Pintora no está afiliado a GIMP ni al proyecto GNOME.
