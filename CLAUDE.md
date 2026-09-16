# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Web estática de una página para **Express Moda** (expressmoda.com.ar), tienda de ropa femenina y masculina de Argentina con locales en Mar del Plata y Villa Crespo. Replica la estructura y funciones de la tienda real de Tienda Nube (menú por categorías, catálogo, ficha, carrito, newsletter) con un rediseño editorial propio. **No tiene backend**: carrito, últimos vistos y newsletter se simulan con `localStorage`, siempre dentro de try/catch. Publicado en https://express-moda.vercel.app (proyecto Vercel `express-moda`, sin build, output en la raíz), conectado a https://github.com/lukitaszzzj/express-moda: **cada push a `main` despliega a producción**, así que no pushear a `main` cambios sin verificar. `.vercelignore` deja fuera del sitio `CLAUDE.md`, el README, `.claude`, `.vercel` y `.env*`.

## Stack y comandos

- `index.html` + `styles.css` + `main.js` + `data/products.json` + `assets/img/`. Sin frameworks, bundler ni npm. Única dependencia externa: Google Fonts.
- No hay tests ni linter. Chequeo rápido de sintaxis: `node --check main.js`.
- El catálogo se carga con `fetch`, así que para probar hay que servir la carpeta: `python -m http.server 8080` (hay una config en `.claude/launch.json`, ignorada por git). Con `file://` no cargan los productos.
- Verificación manual obligatoria antes de dar algo por terminado (checklist al final).

## Restricciones duras (no negociables)

- **Rutas relativas siempre** (`assets/img/x.webp`, `data/products.json`; nunca `/assets/...`).
- **Movimiento solo con `transform` y `opacity`.** Nunca animar `width`, `height`, `top`, `left`, `margin`. La barra de envío gratis usa `transform: scaleX`.
- **`prefers-reduced-motion: reduce`** deja la página totalmente estática (bloque al final de `styles.css` + `EM.reduce` en JS).
- Las animaciones de entrada solo existen bajo `html.js`; el inline script del `<head>` la agrega y la quita si `main.js` no marca `js-ready` en 4 s. Sin JS el hero y los bloques se ven; el catálogo muestra un `<noscript>`.
- Accesibilidad: alt en todas las imágenes, contraste AA, teclado, `aria-label`, foco atrapado en modales/drawer/overlays, cierre con Escape y clic afuera.
- Datos de los 8 productos originales exactamente como el brief (nombres con acentos, colores, talles, precios). Los demás vienen de la API de la tienda.
- Mobile first: breakpoints 600, 760, 900 y 1100 (el menú de escritorio aparece a partir de 1100).

## Datos de negocio

- WhatsApp `+54 9 11 2712 0131`. Link general: `https://wa.me/5491127120131?text=Hola!%20Vi%20la%20web%20de%20Express%20Moda%20y%20quiero%20hacer%20una%20consulta.` (botón flotante, modal de contacto y footer).
- Marquee superior, dos mensajes exactos: "3 CUOTAS sin interés y 6 a partir de $150.000 de compra" y "ENVÍO GRATIS a partir de $100.000". Envío gratis en el carrito: subtotal ≥ $100.000.
- Menú: Mujer · Hombre · Feria (mega menús) · Gift cards (`https://expressmoda.com.ar/gift-cards1/`) · Contacto (modal) · Uniformes (`https://expressmoda.com.ar/mas-uniformes-empresas/`) · Nuestros locales (modal).
- Subcategorías exactas. Mujer: Remeras y tops · Blusas y camisas · Sacos y blazer · Buzos y sweaters · Camperas y abrigos · Polleras y shorts · Jeans · Pantalones y calzas · Vestidos y monos. Hombre: Chombas y remeras · Camisas · Buzos y sweaters · Pantalones y bermudas · Jeans · Camperas, abrigos y sacos · Accesorios y complementos. Feria: Mujer · Hombre (= prendas con `precioPromo`).
- Locales: Güemes, Castelli 1302 (Mar del Plata) y Av. Córdoba 4644 (Villa Crespo, CABA). Contacto: San Martín 2419, Mar del Plata. Horarios y email: placeholders `[HORARIO]`, `[EMAIL]`. Instagram: placeholder `[INSTAGRAM]`.
- Hero: "Moda para mujer y hombre, desde hace tres generaciones" · botón "Ver catálogo".

## Arquitectura

- **`data/products.json`**: 64 productos (16 subcategorías, hasta 4 por cada una). Campos: `id`, `slug`, `nombre`, `genero`, `subcategoria`, `precio`, `precioHasta` (null salvo rango), `precioPromo` (null si no hay), `colores`, `talles`, `fotos` (2 rutas), `descripcion`, `urlTienda`. Se generó desde la API de la tienda (conector MCP de Tienda Nube de la sesión) más `curl` a cada ficha para las fotos; el script de merge quedó fuera del repo.
- **`main.js`** es una IIFE con módulos: `Layers` (pila de modales/overlays/drawer con foco atrapado; `data-close`, `data-modal`, `data-overlay`, `data-drawer`), `Catalog` (estado `{genero, sub}`, chips, `hashFor`/`fromHash`), `Product` (ficha, `#p/slug`, cierra con `history.back()` si se navegó dentro de la web), `Cart` (`em_cart`), `Recs` (`em_lastViewed`, `em_recent`), newsletter (`em_newsletter`), header (mega menús con hover/clic/teclado, menú móvil con `<details>`), búsqueda, parallax, reveal con IntersectionObserver. Eventos internos: `em:products`, `em:products-error`, `em:product-closed`. **El arranque (`init()`) está al final del archivo** porque los módulos son `var` con objetos literales: no moverlo arriba.
- **Hash**: `#catalogo[/genero[/sub-slug]]`, `#catalogo/feria[/mujer|hombre]`, `#p/slug`. Los links del mega menú, del menú móvil, de los bloques Mujer/Hombre y del footer usan esos hashes; el router los resuelve en `hashchange`.
- **Tarjeta compartida** (`cardHtml`) para catálogo, búsqueda y recomendados. "Agregar al carrito" abre la ficha si hay más de un color o talle.
- **Dirección de arte**: hueso `#f4f1ea`, tinta `#111111`, índigo `#1f3a5f`, óxido `#a8471f`; Fraunces (display) + Manrope (cuerpo). Hero partido en desktop porque la foto de campaña trae texto impreso en su tercio derecho.

## Checklist de verificación antes de terminar

1. Servir la carpeta y abrir en desktop (1440) y en ancho de celular (375).
2. El marquee corre, se pausa con su botón y no tapa el header; el hero queda debajo del bloque fijo.
3. Los tres mega menús abren (hover, clic, teclado) y cada subcategoría filtra el catálogo y scrollea a él.
4. Abrir una ficha, elegir color y talle, agregar: el badge sube, el drawer muestra el ítem, subtotal y barra de envío gratis correctos. Recargar: el carrito sigue.
5. Cerrar la ficha: aparece "En base a tu última búsqueda" con 4 productos de la misma subcategoría.
6. Búsqueda, cuenta, contacto y locales abren y cierran con clic afuera y con Escape.
7. Newsletter valida el email y confirma.
8. Sin errores en consola, sin rutas absolutas (`grep -n 'href="/\|src="/' index.html` vacío) y con `prefers-reduced-motion` la página queda estática.
