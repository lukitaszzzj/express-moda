# Express Moda · web demo

Sitio estático para **Express Moda** (expressmoda.com.ar), tienda de indumentaria para mujer y hombre con locales en Mar del Plata y Villa Crespo. Replica la estructura y las funciones de la tienda real (menú por categorías, listados con filtros, ficha, carrito, gift cards, contacto, locales con mapa) con un rediseño editorial propio. No tiene backend: todo lo que necesita estado se simula en el navegador con `localStorage`.

Sin frameworks. HTML, CSS y JavaScript vanilla; las dependencias externas son Google Fonts y, solo en el modal de locales, la Maps JavaScript API de Google.

## Publicación

- **Sitio:** https://express-moda.vercel.app
- **Repositorio:** https://github.com/lukitaszzzj/express-moda
- **Deploy automático:** el proyecto `express-moda` de Vercel está conectado a este repo. Cada push a `main` publica en producción; los push a otras ramas generan una URL de preview.
- **Build:** `vercel.json` corre `node scripts/maps-config.mjs` (genera `maps-config.js` con la clave de Google Maps) y publica la raíz del repo.

```bash
git push origin main
```

## Estructura

```
index.html              Marquee, header con mega menús, home (hero, Mujer/Hombre, recomendados,
                        Lo nuevo, recordatorio de carrito), listado, footer, modales y overlays
styles.css              Estilos mobile first. Todo el movimiento usa solo transform y opacity
main.js                 Header, capas (modales, drawer, overlays, panel de filtros), vistas y router,
                        listado con filtros, ficha, carrito, gift cards, contacto, mapa de locales
config.js               Número de WhatsApp y mensaje general (se edita acá)
scripts/maps-config.mjs Genera maps-config.js con la clave de Google Maps (desde .env o Vercel)
vercel.json             Build command del deploy
.env.example            Plantilla del .env con la clave de Google Maps
data/products.json      Las 72 prendas del catálogo, con variantes y stock
assets/img/             Logo, foto de campaña, fotos de producto, uniformes (todas < 300 KB)
assets/img/giftcards/   Imágenes de las 5 gift cards
assets/img/pagos/       Badges SVG de medios de pago
```

Todas las rutas son relativas, así que el sitio funciona en la raíz de un dominio o dentro de un subdirectorio.

## Ver en local

El catálogo se carga con `fetch` desde `data/products.json`, así que hay que servir la carpeta con un servidor estático (abrir `index.html` directo con `file://` no carga los productos):

```bash
python -m http.server 8080
```

Para ver el mapa de locales, generá antes `maps-config.js` (ver la sección siguiente):

```bash
node scripts/maps-config.mjs
```

## Clave de Google Maps

El mapa de "Nuestros locales" usa la Maps JavaScript API. La clave nunca va en el código ni en el repo:

1. **En local:** copiá `.env.example` como `.env` y pegá la clave en `GOOGLE_MAPS_API_KEY=`. Después corré `node scripts/maps-config.mjs`. `.env` y `maps-config.js` están en `.gitignore`.
2. **En Vercel:** Settings → Environment Variables → agregá `GOOGLE_MAPS_API_KEY` para Production y Preview, y volvé a desplegar. El build genera `maps-config.js` con esa variable.
3. **En Google Cloud:** la Maps JavaScript API siempre expone la clave en el navegador, así que restringila en *APIs y servicios → Credenciales*: restricción de aplicaciones por **sitios web** (`https://express-moda.vercel.app/*`, `https://*-express-moda.vercel.app/*`, `http://localhost:8080/*`) y restricción de API a **Maps JavaScript API**.

Sin clave, el modal muestra la lista de locales con un aviso y cada botón "Ver en el mapa" abre la ubicación en Google Maps.

## Cómo funciona

- **URL con hash.** `#catalogo/mujer`, `#catalogo/mujer/jeans`, `#catalogo/hombre`, `#catalogo/feria`, `#catalogo/feria/hombre` abren el listado (la home se oculta); `#inicio` o sin hash vuelve a la home; `#p/<slug>` abre la ficha encima de la vista actual y el botón atrás la cierra.
- **Menú.** Clic en Mujer, Hombre o Feria abre su listado; hover (o la flecha, con teclado o en pantallas táctiles) despliega las subcategorías.
- **Listado.** Un solo componente para todas las categorías, con filtros por talle, color y "Solo con stock", y orden Destacados, A–Z, Z–A, menor y mayor precio. Talle, color y stock se cruzan por variante. En mobile los filtros se abren en un panel.
- **Feria** son las prendas con precio promocional, filtrables por género.
- **Lo nuevo** muestra las 8 prendas más nuevas de la tienda (campo `nuevo`).
- **Recordatorio de carrito.** Si el carrito tiene productos, la home muestra "No te olvides de finalizar tu compra" con los productos y un botón al carrito. Con el carrito vacío no aparece.
- **Carrito.** Drawer con cantidad editable, subtotal y barra hacia el envío gratis ($100.000). Acepta prendas y gift cards. "Finalizar compra" muestra el aviso de demo.
- **Contacto.** Datos del Local 18 de Mar del Plata y formulario (nombre, mail, teléfono, mensaje) con validación; "Enviar" abre WhatsApp con el mensaje armado (en el celular, la app).
- **Claves en `localStorage`:** `em_cart` (carrito), `em_lastViewed` y `em_recent` (últimos vistos), `em_newsletter` (email suscripto). Todo se lee y escribe dentro de try/catch.

## Cómo editar el contenido

- **WhatsApp:** `config.js` (`whatsapp`, `whatsappVisible`, `whatsappMensaje`). Lo usan el botón flotante, el footer, el modal de contacto y el formulario.
- **Productos:** `data/products.json`. Campos: `id`, `slug`, `nombre`, `genero` (`mujer`/`hombre`), `subcategoria` (uno de los nombres del menú), `precio`, `precioHasta` (null salvo rangos), `precioPromo` (null si no hay), `colores`, `talles`, `fotos` (rutas relativas), `descripcion`, `urlTienda`, `hayStock` (alguna variante con stock en la tienda), `variantes` (`{color, talle, stock}`) y, en las más nuevas, `nuevo` (1 = la más nueva).
- **Fotos nuevas:** guardalas en `assets/img/` con el slug del producto, por debajo de 300 KB.
- **Locales:** la lista está en el modal `#modal-locales` de `index.html`; cada `<li>` lleva `data-lat` y `data-lng` para el marcador.
- **Gift cards:** montos en `GIFTCARDS` (`main.js`) e imágenes en `assets/img/giftcards/`; los textos, en el modal `#modal-giftcards`.
- **Placeholders a reemplazar:** `[EMAIL]` e `[INSTAGRAM]` en la columna Contacto del footer (también el `href="#instagram"`).
- **Medios de pago:** los badges de `assets/img/pagos/` son ilustrativos; reemplazalos por los logos oficiales si los tenés.

## Accesibilidad y movimiento

- Con `prefers-reduced-motion: reduce` la página queda completamente estática.
- Modales, drawer, overlays y el panel de filtros atrapan el foco, se cierran con Escape, con la X y con clic afuera, y devuelven el foco al botón que los abrió.
- Todas las imágenes tienen `alt`, los botones tienen nombre accesible y la navegación funciona por teclado.
- Sin JavaScript se ven el hero, los bloques y el footer; el catálogo avisa que necesita JavaScript.
