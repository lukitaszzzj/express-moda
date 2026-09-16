# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Web estática para **Express Moda** (expressmoda.com.ar), tienda de ropa femenina y masculina de Argentina con locales en Mar del Plata y Villa Crespo. Replica la estructura y funciones de la tienda real de Tienda Nube (menú por categorías, listados con filtros, ficha, carrito, gift cards, contacto, locales, newsletter) con un rediseño editorial propio. **No tiene backend**: carrito, últimos vistos y newsletter se simulan con `localStorage`, siempre dentro de try/catch. Publicado en https://express-moda.vercel.app (proyecto Vercel `express-moda`, output en la raíz, build `node scripts/maps-config.mjs` definido en `vercel.json`), conectado a https://github.com/lukitaszzzj/express-moda: **cada push a `main` despliega a producción**, así que no pushear a `main` cambios sin verificar. `.vercelignore` deja fuera del sitio `CLAUDE.md`, el README, `.claude`, `.vercel` y `.env*`. **Ningún link del menú, footer o home lleva a expressmoda.com.ar** (quedan a propósito: "Ver en la tienda online" en la ficha y "Ingresar en la tienda oficial" en Mi cuenta).

## Stack y comandos

- `index.html` + `styles.css` + `main.js` + `config.js` + `data/products.json` + `assets/img/`. Sin frameworks, bundler ni npm. Dependencias externas: Google Fonts y, solo al abrir "Nuestros locales", la Maps JavaScript API.
- No hay tests ni linter. Chequeo rápido de sintaxis: `node --check main.js`.
- El catálogo se carga con `fetch`, así que para probar hay que servir la carpeta: `python -m http.server 8080` (hay una config en `.claude/launch.json`, ignorada por git). Con `file://` no cargan los productos.
- Clave de Google Maps: `GOOGLE_MAPS_API_KEY` en `.env` (local) o en las variables de entorno de Vercel. `node scripts/maps-config.mjs` genera `maps-config.js` (ignorado por git). **Nunca escribir la clave en el código, en `.env.example` ni en commits.**
- Verificación manual obligatoria antes de dar algo por terminado (checklist al final).

## Restricciones duras (no negociables)

- **Rutas relativas siempre** (`assets/img/x.webp`, `data/products.json`; nunca `/assets/...`).
- **Movimiento solo con `transform` y `opacity`.** Nunca animar `width`, `height`, `top`, `left`, `margin`. La barra de envío gratis usa `transform: scaleX`.
- **`prefers-reduced-motion: reduce`** deja la página totalmente estática (bloque al final de `styles.css` + `EM.reduce` en JS).
- Las animaciones de entrada solo existen bajo `html.js`; el inline script del `<head>` la agrega y la quita si `main.js` no marca `js-ready` en 4 s. Sin JS el hero y los bloques se ven; el catálogo muestra un `<noscript>`.
- Accesibilidad: alt en todas las imágenes, contraste AA, teclado, `aria-label`, foco atrapado en modales/drawer/overlays/panel de filtros, cierre con X, Escape y clic afuera.
- **No inventar datos**: direcciones, teléfonos, mails, textos, precios e imágenes salen de expressmoda.com.ar (o de la API de la tienda). Si falta algo, preguntar. Los 8 productos originales mantienen los datos exactos del brief (nombres con acentos, colores, talles, precios).
- Mobile first: breakpoints 600, 760, 900 y 1100 (el menú de escritorio aparece a partir de 1100; los filtros pasan a columna fija a partir de 900).

## Datos de negocio

- WhatsApp (el de expressmoda.com.ar): `+54 9 223 519-7367`, en `config.js` (`whatsapp: '5492235197367'`). Los links con `data-wa` toman el número de ahí al iniciar (botón flotante, footer, modal de contacto); el formulario de contacto abre `wa.me` con nombre, mail, teléfono y mensaje.
- Contacto (Local 18 Mar del Plata, expressmoda.com.ar/contacto): WhatsApp 92235197367, teléfono 223 519-7367, atenciononline@expressmoda.com.ar, San Martin 2419 - Mar del Plata.
- Marquee superior, dos mensajes exactos: "3 CUOTAS sin interés y 6 a partir de $150.000 de compra" y "ENVÍO GRATIS a partir de $100.000". Envío gratis en el carrito: subtotal ≥ $100.000.
- Menú: Mujer · Hombre · Feria (link al listado + mega menú) · Gift cards (modal) · Contacto (modal) · Uniformes (modal) · Nuestros locales (modal).
- Subcategorías exactas. Mujer: Remeras y tops · Blusas y camisas · Sacos y blazer · Buzos y sweaters · Camperas y abrigos · Polleras y shorts · Jeans · Pantalones y calzas · Vestidos y monos. Hombre: Chombas y remeras · Camisas · Buzos y sweaters · Pantalones y bermudas · Jeans · Camperas, abrigos y sacos · Accesorios y complementos. Feria: Mujer · Hombre (= prendas con `precioPromo`).
- Locales (expressmoda.com.ar/mas-locales): Paseo Aldrey Shopping (Sarmiento 2685, Local 107), Los Gallegos Shopping (Rivadavia 3050, Local 12), Güemes (Castelli 1302), Peatonal (San Martin 2419), Centro (Rivadavia 2882/90), todos en Mar del Plata, y CABA (Av. Cordoba 4644). Coordenadas geocodificadas con OpenStreetMap desde esas direcciones (`data-lat`/`data-lng` en `index.html`).
- Gift cards (expressmoda.com.ar/gift-cards1): $120.000, $90.000, $70.000, $50.000 y $30.000, con el texto "¿Cómo la comprás?" copiado tal cual (incluye erratas del original, como "Selecccionás").
- Uniformes (expressmoda.com.ar/mas-uniformes-empresas): título, texto y banner copiados tal cual.
- Footer, columna Contacto: placeholders `[EMAIL]` e `[INSTAGRAM]` (sin tocar por pedido).
- Hero: "Moda para mujer y hombre, desde hace tres generaciones" · botón "Ver catálogo" (lleva a `#catalogo`, todas las prendas).

## Arquitectura

- **`data/products.json`**: 72 productos (64 originales + las 8 más nuevas de la tienda, marcadas con `nuevo` 1–8). Campos: `id`, `slug`, `nombre`, `genero`, `subcategoria`, `precio`, `precioHasta` (null salvo rango), `precioPromo` (null si no hay), `colores`, `talles`, `fotos` (2 rutas), `descripcion`, `urlTienda`, `hayStock` (alguna variante con stock en la tienda) y `variantes` (`{color, talle, stock}`, solo combinaciones cuyo color y talle figuran en la prenda). Variantes y stock salen del JSON de producto que cada ficha de la tienda embebe en su payload de Next.js; los scripts quedaron fuera del repo. Es una foto del stock al 16/09/2026.
- **Vistas**: `index.html` tiene `#home` (hero, Mujer/Hombre, recomendados, "Lo nuevo", recordatorio de carrito) y `#catalogo` (listado). `Views.show()` alterna entre las dos; la ficha (`#p/slug`) se abre encima de la que esté.
- **`main.js`** es una IIFE con módulos: `Layers` (pila de modales/overlays/drawer/panel de filtros con foco atrapado; `data-close`, `data-modal`, `data-overlay`, `data-drawer`; `data-persist` evita el `hidden` al cerrar), `Views`, `Listing` (un solo listado para todas las categorías: estado `{genero, sub}`, filtros `{talles, colores, stock, orden}`, `hashFor`/`fromHash`, `matches` cruza talle/color/stock por variante), `Product` (ficha, cierra con `history.back()` si se navegó dentro de la web), `Cart` (`em_cart`, dispara `em:cart`), `Recs` (`em_lastViewed`, `em_recent`), `Pending` (recordatorio de carrito), `setupNuevo`, `GIFTCARDS`/`setupGiftcards` (se registran en `EM.byId` para que el carrito las acepte), `setupContact` (validación + WhatsApp), `Locales` (carga `maps-config.js` y la API de Maps al abrir el modal; sin clave muestra aviso y "Ver en el mapa" abre Google Maps), newsletter (`em_newsletter`), header (mega menús con hover y flecha `.nav__toggle`, menú móvil con link + flecha), búsqueda, parallax, reveal. Eventos internos: `em:products`, `em:products-error`, `em:product-closed`, `em:cart`. **El arranque (`init()`) está al final del archivo** porque los módulos son `var` con objetos literales: no moverlo arriba.
- **Hash**: `#catalogo[/genero[/sub-slug]]`, `#catalogo/feria[/mujer|hombre]` abren el listado; `#inicio` o vacío, la home; `#p/slug`, la ficha. Los chips del listado son links a esos hashes.
- **Tarjeta compartida** (`cardHtml`) para listado, búsqueda, recomendados y "Lo nuevo". "Agregar al carrito" abre la ficha si hay más de un color o talle.
- **Dirección de arte**: hueso `#f4f1ea`, tinta `#111111`, índigo `#1f3a5f`, óxido `#a8471f`; Fraunces (display) + Manrope (cuerpo); eyebrow en mayúsculas + título con una palabra en cursiva. Hero partido en desktop porque la foto de campaña trae texto impreso en su tercio derecho. Los modales anchos usan `.modal__panel--wide`.

## Checklist de verificación antes de terminar

1. Servir la carpeta y abrir en desktop (1440) y en ancho de celular (375).
2. El marquee corre, se pausa con su botón y no tapa el header; el hero queda debajo del bloque fijo.
3. Clic en Mujer, Hombre y Feria abre su listado; hover o flecha despliega subcategorías y cada una abre el listado filtrado.
4. En un listado: filtros de talle, color y stock, orden A–Z, Z–A, menor y mayor precio, "Limpiar filtros" y el caso sin resultados. En 375, el panel de filtros abre y cierra con X, Escape y clic afuera.
5. Abrir una ficha, elegir color y talle, agregar: badge, drawer, subtotal y barra de envío gratis correctos. Recargar: el carrito sigue y la home muestra el recordatorio; con el carrito vacío no aparece.
6. Gift cards, contacto (validación y link de WhatsApp con los 4 datos), uniformes, locales, búsqueda y cuenta abren y cierran con X, clic afuera y Escape.
7. Newsletter valida el email y confirma.
8. Sin errores en consola, sin rutas absolutas (`grep -n 'href="/\|src="/' index.html` vacío), ningún link del menú/footer/home a expressmoda.com.ar y con `prefers-reduced-motion` la página queda estática.
