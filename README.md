# Express Moda · vidriera web

Sitio estático de una sola página para **Express Moda** (expressmoda.com.ar). No reemplaza la tienda en Tienda Nube: muestra 8 prendas y deriva toda consulta a WhatsApp.

Sin frameworks ni build step. HTML, CSS y JavaScript vanilla; la única dependencia externa es Google Fonts.

## Estructura

```
index.html      Las 4 secciones: Inicio, Catálogo, Quiénes somos, botón de WhatsApp, más el footer
styles.css      Estilos mobile first. Todo el movimiento usa solo transform y opacity
main.js         Título animado, parallax, aparición escalonada y filtros del catálogo
assets/img/     Logo, foto de campaña y fotos de producto (todas por debajo de 300 KB)
```

Todas las rutas son relativas (`assets/img/...`), así que el sitio funciona en la raíz de un dominio o dentro de un subdirectorio.

## Ver en local

Abrí `index.html` directo en el navegador o serví la carpeta con cualquier servidor estático:

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

Si más adelante usás un dominio propio, agregá un archivo `CNAME` en la raíz con el dominio y configurá el DNS según la guía de GitHub.

## Publicar en Vercel

1. Entrá a [vercel.com](https://vercel.com) y elegí **Add New → Project**.
2. Importá el repositorio de GitHub.
3. En la configuración del proyecto:
   - **Framework Preset:** Other
   - **Build Command:** dejarlo vacío (no hay build)
   - **Output Directory:** dejarlo vacío o `.` (la raíz del repo)
   - **Install Command:** dejarlo vacío
4. Hacé clic en **Deploy**. Cada push a `main` vuelve a publicar automáticamente.

## Cómo editar el contenido

- **Productos:** cada tarjeta es un `<li class="card">` en `index.html`. Nombre, precios, colores, talles y el link de WhatsApp están escritos ahí mismo. El mensaje del botón va codificado en la URL (`Hola!%20Quiero%20consultar%20por%20...`).
- **Filtro Mujer / Hombre:** depende del atributo `data-gender` de cada tarjeta.
- **Instagram:** en el footer el link muestra el placeholder `[INSTAGRAM]` y apunta a `#instagram`. Reemplazá el `href` por la URL del perfil y el texto por "Instagram".
- **Foto de Quiénes somos:** hoy usa una foto de campaña (`assets/img/nosotros.webp`). Para cambiarla, reemplazá el archivo o la ruta del `<img>` y actualizá `width` y `height`.
- **Fotos nuevas:** guardalas en `assets/img/`, con menos de 300 KB, y completá siempre `width`, `height` y `alt`.

## Accesibilidad y movimiento

- Con `prefers-reduced-motion: reduce` la página queda completamente estática.
- Sin JavaScript se ve todo el contenido; solo se pierden las animaciones y el filtro del catálogo (se muestran las 8 prendas).
- Todas las imágenes tienen `alt`, los botones tienen nombre accesible y la navegación funciona por teclado.
