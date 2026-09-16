# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Vidriera estática de una sola página para **Express Moda** (expressmoda.com.ar), tienda de ropa femenina y masculina de Argentina, negocio familiar con locales en Mar del Plata y Villa Crespo. La tienda real corre en Tienda Nube y **esta web no la reemplaza**: su único objetivo es mostrar 8 productos y derivar toda consulta a WhatsApp. Se publica en GitHub Pages (rama `main`, carpeta raíz) o Vercel (sin build command, output en la raíz).

## Stack y comandos

- `index.html` + `styles.css` + `main.js` + `assets/img/`. Sin frameworks, sin bundler, sin npm, sin build step. Única dependencia externa permitida: Google Fonts.
- No hay tests ni linter. Para probar, servir la carpeta con cualquier servidor estático (por ejemplo `npx serve .` o `python -m http.server`) o abrir `index.html` directo.
- Verificación manual obligatoria antes de dar algo por terminado (ver checklist al final).

## Restricciones duras (no negociables)

- **Solo 4 secciones**: Inicio (hero + bloques Mujer/Hombre + barra de beneficios), Catálogo, Quiénes somos, botón flotante de WhatsApp. Más un footer mínimo. Nada de newsletter, carrito, login, buscador ni formularios.
- **Rutas relativas siempre** (`assets/img/x.jpg`, nunca `/assets/...`) para que funcione bajo subdirectorio en GitHub Pages.
- **Datos exactos**: precios, promos, colores, talles y número de WhatsApp tienen que coincidir carácter por carácter con la tabla de abajo. No inventar productos ni redondear precios.
- **Movimiento solo con `transform` y `opacity`**. Nunca animar `width`, `height`, `top`, `left`, `margin`.
- **`prefers-reduced-motion: reduce`** tiene que dejar la página totalmente estática y con todo el contenido visible.
- **Sin JS la página tiene que ser legible completa**: las tarjetas no pueden depender de IntersectionObserver para volverse visibles (el estado inicial oculto se aplica solo cuando JS agrega una clase al `<html>` o al `<body>`).
- Mobile first. Meta Lighthouse mobile: performance y accesibilidad > 90 con animaciones activas.
- Imágenes con `loading="lazy"` (salvo la del hero), `width`/`height` definidos, `alt` en todas, peso < 300 KB.

## Datos de negocio

WhatsApp: `+54 9 11 2712 0131`

- Botón flotante y footer: `https://wa.me/5491127120131?text=Hola!%20Vi%20la%20web%20de%20Express%20Moda%20y%20quiero%20hacer%20una%20consulta.`
- Desde una tarjeta: mismo número, mensaje `Hola! Quiero consultar por [nombre de la prenda].` codificado con `encodeURIComponent`.

Beneficios (marquee): Envío gratis en compras a partir de $100.000 · 3 cuotas sin interés · 6 cuotas sin interés en compras a partir de $150.000.

Título del hero: "Moda para mujer y hombre, desde hace tres generaciones". Botón: "Ver catálogo".

Quiénes somos (texto final, usar tal cual): "Tres generaciones dedicadas a la moda. Esa tradición familiar es nuestra garantía de calidad: cada prenda que vendemos, para mujer y hombre, pasa por el mismo criterio de siempre. Nos encontrás en Mar del Plata, en Villa Crespo (Buenos Aires) y en nuestra tienda online."

Footer: logo, Instagram (placeholder literal `[INSTAGRAM]`), y links a expressmoda.com.ar: tienda completa, Feria, Gift cards, Uniformes.

### Productos (ARS al 15/09/2026)

| Género | Nombre | Precio | Promo | Colores | Talles | Ficha en expressmoda.com.ar |
|---|---|---|---|---|---|---|
| Mujer | Jean Wide Leg I26 | $59.999 | $47.999 | Azul, Celeste, Negro, Óxido | 26 a 36 | /productos/jean-wide-leg-i26 |
| Mujer | Jean Flare I26 | $59.999 | $47.999 | Azul, Azul claro, Gris, Negro | 26 a 36 | /productos/jean-flare-i26 |
| Mujer | Vestido Citrino | $39.999 | — | Azul, Beige, Celeste | 1 a 4 | /productos/vestido-citrino |
| Mujer | Camisa Degas | $29.999 | — | Azul | 1 a 3 | /productos/camisa-degas |
| Hombre | Camisa de vestir Slim Dandy cuello abierto | $59.999 | $47.999 | Blanco, Celeste | 38 a 46 | /productos/camisa-vestir-slim-dandy-cuello-abierto |
| Hombre | Jean Regular Gabardina | $49.999 a $59.999 | $47.999 | Beige, Cemento, Marino, Negro, Tiza, Tostado | 40 a 60 | /productos/jean-regular-gabardina |
| Hombre | Chomba piqué Ibiza manga corta | $39.999 | — | Aero, Blanco, Celeste, Gris melange, Marino, Militar, Negro, Rojo | S a 4XL | /productos/chomba-pique-ibiza-manga-corta |
| Hombre | Camisaco Turín | $149.999 | $119.999 | Beige, Gris | S a XXL | /productos/camisaco-turin |

Las fotos de producto salen de la ficha de cada producto en la tienda real (columna de la derecha). Si una foto no se consigue, va un placeholder claramente marcado y se avisa al usuario.

## Arquitectura de la página

- **Catálogo**: los 8 productos viven como un array en `main.js` y se renderizan a la grilla, o están en el HTML con `data-gender="mujer|hombre"`. En cualquier caso el filtro Todos / Mujer / Hombre se resuelve con clases y transiciones de `opacity`/`transform` (las tarjetas no desaparecen de golpe). Los bloques Mujer/Hombre del hero enlazan a `#catalogo` y aplican el filtro correspondiente (por hash o `data-filter`).
- **Movimiento** (todo vanilla): Ken Burns en el hero, título que entra por palabras, botón con delay, parallax con `transform: translate3d` en scroll (hero y bloques Mujer/Hombre), marquee de beneficios continuo, tarjetas con aparición escalonada vía IntersectionObserver, zoom de foto + cambio de fondo en hover.
- **Dirección de arte**: look editorial, tipografía display grande, mucho aire, contraste fuerte, composiciones asimétricas. No replicar la plantilla de Tienda Nube. Del sitio original solo se toma el logo, las fotos y el tono (moda accesible). La paleta puede cambiar mientras el logo siga funcionando sobre ella.

## Checklist de verificación antes de terminar

1. Abrir la página en el navegador y probar los 3 filtros del catálogo.
2. Hacer clic en al menos dos botones de WhatsApp y confirmar que el mensaje prearmado es el correcto (incluye el nombre exacto de la prenda).
3. Sin errores en consola.
4. Probar con `prefers-reduced-motion` activo: nada se mueve, todo se lee.
5. Probar con JS desactivado: todo el contenido visible.
6. Confirmar que ninguna ruta en HTML/CSS/JS empieza con `/`.
7. Git inicializado con `.gitignore` y commit inicial hecho.
