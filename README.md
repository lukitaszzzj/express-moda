# Express Moda · web demo

Sitio estático de una sola página para **Express Moda** (expressmoda.com.ar), tienda de indumentaria para mujer y hombre con locales en Mar del Plata y Villa Crespo. Replica la estructura y las funciones de la tienda real (menú por categorías, catálogo, ficha, carrito, newsletter) con un rediseño editorial propio. No tiene backend: todo lo que necesita estado se simula en el navegador con `localStorage`.

Sin frameworks ni build step. HTML, CSS y JavaScript vanilla; la única dependencia externa es Google Fonts.

## Estructura

```
index.html          Marquee, header con mega menús, hero, bloques Mujer/Hombre,
                    "En base a tu última búsqueda", catálogo, footer, modales y overlays
styles.css          Estilos mobile first. Todo el movimiento usa solo transform y opacity
main.js             Header y menús, capas (modales, drawer, overlays), catálogo con filtros
                    y hash, ficha, carrito, recomendados, newsletter, animaciones
data/products.json  Los 64 productos del catálogo
assets/img/         Logo, foto de campaña, fotos de producto (dos por prenda, < 300 KB)
assets/img/pagos/   Badges SVG de medios de pago
```

Todas las rutas son relativas, así que el sitio funciona en la raíz de un dominio o dentro de un subdirectorio.

## Ver en local

El catálogo se carga con `fetch` desde `data/products.json`, así que hay que servir la carpeta con un servidor estático (abrir `index.html` directo con `file://` no carga los productos):

```bash
python -m http.server 8080
```

```bash
npx serve .
```

## Publicar en GitHub Pages

1. Creá un repositorio en GitHub y subí este proyecto a la rama `main`:

   ```bash
   git remote add origin https://github.com/USUARIO/REPO.git
   git push -u origin main
   ```

2. En el repositorio, entrá a **Settings → Pages**.
3. En **Build and deployment**, elegí **Source: Deploy from a branch**.
4. En **Branch**, seleccioná `main` y la carpeta **/ (root)**. Guardá.
5. En uno o dos minutos el sitio queda en `https://USUARIO.github.io/REPO/`.

## Publicar en Vercel

1. Entrá a [vercel.com](https://vercel.com) y elegí **Add New → Project**.
2. Importá el repositorio de GitHub.
3. En la configuración del proyecto:
   - **Framework Preset:** Other
   - **Build Command:** vacío (no hay build)
   - **Output Directory:** vacío o `.` (la raíz del repo)
   - **Install Command:** vacío
4. Hacé clic en **Deploy**. Cada push a `main` vuelve a publicar automáticamente.

## Cómo funciona

- **URL con hash.** `#catalogo`, `#catalogo/mujer`, `#catalogo/mujer/jeans`, `#catalogo/feria/hombre` filtran el catálogo; `#p/<slug>` abre la ficha de un producto y el botón atrás la cierra.
- **Feria** son las prendas con precio promocional (como la sección Feria de la tienda), filtrables por género.
- **Carrito.** Drawer con cantidad editable, subtotal y barra hacia el envío gratis ($100.000). "Finalizar compra" muestra el aviso de demo con link a la tienda.
- **"En base a tu última búsqueda"** aparece después de ver una ficha: 4 productos de la misma subcategoría (sin el visto), completados con el mismo género.
- **Claves en `localStorage`:** `em_cart` (carrito), `em_lastViewed` y `em_recent` (últimos vistos), `em_newsletter` (email suscripto). Todo se lee y escribe dentro de try/catch.

## Cómo editar el contenido

- **Productos:** editá `data/products.json`. Campos por producto: `id`, `slug`, `nombre`, `genero` (`mujer`/`hombre`), `subcategoria` (uno de los nombres del menú), `precio`, `precioHasta` (null salvo rangos), `precioPromo` (null si no hay), `colores`, `talles`, `fotos` (rutas relativas), `descripcion`, `urlTienda`.
- **Fotos nuevas:** guardalas en `assets/img/` con el slug del producto, por debajo de 300 KB.
- **Placeholders a reemplazar:** `[EMAIL]` (modal de contacto y footer), `[INSTAGRAM]` (footer; también el `href="#instagram"`), `[HORARIO]` (modal de contacto y de locales).
- **Medios de pago:** los badges de `assets/img/pagos/` son ilustrativos; reemplazalos por los logos oficiales si los tenés.

## Accesibilidad y movimiento

- Con `prefers-reduced-motion: reduce` la página queda completamente estática.
- Modales, drawer y overlays atrapan el foco, se cierran con Escape y con clic afuera, y devuelven el foco al botón que los abrió.
- Todas las imágenes tienen `alt`, los botones tienen nombre accesible y la navegación funciona por teclado.
- Sin JavaScript se ven el hero, los bloques y el footer; el catálogo interactivo avisa que necesita JavaScript.
