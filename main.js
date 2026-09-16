/* ==========================================================
   Express Moda — main.js
   Vanilla JS, sin dependencias. Si algo falla al iniciar, se quita
   la clase .js del <html> y la página queda estática pero completa.
   Todo lo que necesita estado (carrito, últimos vistos, newsletter)
   se guarda en localStorage, siempre dentro de try/catch.
   ========================================================== */

(function () {
  'use strict';

  var html = document.documentElement;
  var EM = { products: [], byId: {}, bySlug: {}, reduce: false, menuOpen: false };
  var mqReduce = null;
  var revealNow = function (el) { el.classList.add('is-visible'); };
  var observeReveal = function (el) { el.classList.add('is-visible'); };
  var resetParallax = function () {};

  // El arranque está al final del archivo (init), después de todas las definiciones.
  function init() {
    try {
      html.classList.add('js-ready');
      mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      EM.reduce = !!(mqReduce && mqReduce.matches);

      splitHeroTitle();
      setupReveal();
      setupParallax();
      setupMarquee();
      setupWhatsApp();
      setupHeader();
      setupLayers();
      setupSearch();
      setupGiftcards();
      setupListing();
      setupProduct();
      setupCart();
      setupRecs();
      setupNuevo();
      setupPending();
      setupContact();
      setupLocales();
      setupNewsletter();
      setupRouter();
      watchMotionPreference();
      loadProducts();
    } catch (err) {
      html.classList.remove('js');
      if (window.console) { console.error('Express Moda: se desactivó el movimiento por un error.', err); }
    }
  }

  /* ---------- Utilidades ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function fmt(n) {
    return '$' + Math.round(n).toLocaleString('es-AR');
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function slugify(s) {
    return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

  function rangeText(list) {
    if (!list || !list.length) { return 'Consultar'; }
    if (list.length <= 2) { return list.join(', '); }
    return list[0] + ' a ' + list[list.length - 1];
  }

  function storageGet(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* modo privado o sin espacio */ }
  }

  function focusables(root) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), summary', root)
      // getClientRects y no offsetParent: offsetParent es null en elementos position: fixed.
      .filter(function (el) { return el.getClientRects().length > 0 || el === document.activeElement; });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('script')); };
      document.head.appendChild(s);
    });
  }

  /* ---------- WhatsApp: el número sale de config.js ---------- */

  var CONFIG = window.EM_CONFIG || {};
  var WA_NUMBER = String(CONFIG.whatsapp || '5492235197367').replace(/\D/g, '');

  function waUrl(text) {
    return 'https://wa.me/' + WA_NUMBER + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  // En el celular se navega directo al link para que se abra la app de WhatsApp;
  // en desktop se abre en otra pestaña (WhatsApp Web o la app de escritorio).
  function openWhatsApp(text) {
    var url = waUrl(text);
    var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (touch) { window.location.href = url; return; }
    var win = window.open(url, '_blank');
    if (win) { win.opener = null; } else { window.location.href = url; }
  }

  function setupWhatsApp() {
    $$('[data-wa]').forEach(function (a) {
      a.href = a.hasAttribute('data-wa-plain') ? waUrl('') : waUrl(CONFIG.whatsappMensaje || '');
      var label = a.getAttribute('data-wa-label');
      if (label !== null && CONFIG.whatsappVisible) { a.textContent = label + CONFIG.whatsappVisible; }
    });
  }

  /* ---------- Hero: título palabra por palabra ---------- */

  function splitHeroTitle() {
    var title = $('.hero__title');
    if (!title || EM.reduce) { return; }

    var fullText = title.textContent.replace(/\s+/g, ' ').trim();
    var frag = document.createDocumentFragment();
    var index = 0;

    Array.prototype.forEach.call(title.childNodes, function (node) {
      var italic = node.nodeType === 1 && node.tagName === 'EM';
      var words = node.textContent.split(/\s+/).filter(Boolean);
      words.forEach(function (word) {
        var outer = document.createElement(italic ? 'em' : 'span');
        var inner = document.createElement('span');
        outer.className = italic ? 'w w--em' : 'w';
        inner.textContent = word;
        inner.style.setProperty('--i', index++);
        outer.appendChild(inner);
        frag.appendChild(outer);
        frag.appendChild(document.createTextNode(' '));
      });
    });

    title.setAttribute('aria-label', fullText);
    title.textContent = '';
    title.appendChild(frag);
    title.classList.add('is-split');
  }

  /* ---------- Aparición escalonada al entrar en pantalla ---------- */

  function setupReveal() {
    var items = $$('.reveal');

    if (EM.reduce || !('IntersectionObserver' in window)) {
      items.forEach(revealNow);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      var k = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.style.setProperty('--i', k++);
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });

    revealNow = function (el) {
      io.unobserve(el);
      el.classList.add('is-visible');
    };
    observeReveal = function (el) { io.observe(el); };
  }

  /* ---------- Parallax (solo transform, en requestAnimationFrame) ---------- */

  function setupParallax() {
    var layers = $$('[data-parallax]');
    if (!layers.length) { return; }

    var metrics = layers.map(function (el) {
      return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.3, top: 0, height: 0, spare: 0 };
    });
    var vh = window.innerHeight;
    var ticking = false;
    var active = !EM.reduce;

    function measure() {
      vh = window.innerHeight;
      var y = window.pageYOffset;
      metrics.forEach(function (m) {
        var box = m.el.parentElement.getBoundingClientRect();
        m.top = box.top + y;
        m.height = box.height;
        m.spare = Math.max(0, (m.el.offsetHeight - box.height) / 2);
      });
    }

    function update() {
      ticking = false;
      if (!active) { return; }
      var y = window.pageYOffset;
      metrics.forEach(function (m) {
        if (y + vh < m.top || y > m.top + m.height) { return; }
        var center = m.top + m.height / 2 - (y + vh / 2);
        var offset = -center * m.speed;
        if (m.spare) { offset = Math.max(-m.spare, Math.min(m.spare, offset)); }
        m.el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    }

    function onScroll() {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(update);
    }

    resetParallax = function () {
      active = false;
      metrics.forEach(function (m) { m.el.style.transform = ''; });
    };

    if (!active) { return; }

    measure();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); onScroll(); });
    window.addEventListener('load', function () { measure(); onScroll(); });
  }

  /* ---------- Marquee superior: botón de pausa y altura real del bloque fijo ---------- */

  function setupMarquee() {
    var promo = $('.promo');
    var toggle = promo && $('.promo__toggle', promo);
    var top = $('.site-top');

    if (toggle) {
      toggle.addEventListener('click', function () {
        var paused = promo.classList.toggle('is-paused');
        toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
        toggle.setAttribute('aria-label', (paused ? 'Reanudar' : 'Pausar') + ' el movimiento de los beneficios');
      });
    }

    // El bloque fijo puede crecer (mensajes en varias líneas con movimiento reducido):
    // se publica su altura real para que el hero y los anclajes no queden tapados.
    if (top) {
      var publish = function () { html.style.setProperty('--top-h', top.offsetHeight + 'px'); };
      publish();
      if ('ResizeObserver' in window) { new ResizeObserver(publish).observe(top); }
      window.addEventListener('resize', publish);
      window.addEventListener('load', publish);
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(publish); }
    }
  }

  /* ---------- Header: mega menús y menú móvil ---------- */

  function setupHeader() {
    var nav = $('.nav');
    // "Mujer", "Hombre" y "Feria" son links al listado; las subcategorías se abren con hover
    // o con el botón de la flecha (teclado y pantallas táctiles).
    var megaBtns = $$('.nav__item--mega > .nav__toggle');
    var hoverTimer = null;
    var canHover = function () { return window.matchMedia && window.matchMedia('(hover: hover)').matches; };

    function setMega(btn, open) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.parentElement.classList.toggle('is-open', open);
      if (panel) { panel.classList.toggle('is-open', open); }
    }

    function closeAll(except) {
      megaBtns.forEach(function (b) { if (b !== except) { setMega(b, false); } });
    }

    megaBtns.forEach(function (btn) {
      var item = btn.parentElement;

      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        closeAll(btn);
        setMega(btn, open);
      });

      item.addEventListener('mouseenter', function () {
        if (!canHover()) { return; }
        clearTimeout(hoverTimer);
        closeAll(btn);
        setMega(btn, true);
      });

      item.addEventListener('mouseleave', function () {
        if (!canHover()) { return; }
        hoverTimer = setTimeout(function () { setMega(btn, false); }, 180);
      });

      item.addEventListener('focusout', function (e) {
        if (!item.contains(e.relatedTarget)) { setMega(btn, false); }
      });
    });

    if (nav) {
      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) { closeAll(); }
      });
      document.addEventListener('click', function (e) {
        if (!nav.contains(e.target)) { closeAll(); }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') { return; }
      var openBtn = megaBtns.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0];
      if (openBtn) { closeAll(); openBtn.focus(); }
    });

    // Menú móvil: cada categoría es un link y su flecha despliega las subcategorías.
    $$('.acc__toggle').forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var list = document.getElementById(toggle.getAttribute('aria-controls'));
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (list) { list.hidden = !open; }
      });
    });

    var burger = $('.burger');
    var menu = $('#mobile-menu');
    if (!burger || !menu) { return; }

    function setMenu(open) {
      EM.menuOpen = open;
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.classList.toggle('is-open', open);
      updateLock();
    }
    EM.closeMenu = function () { if (EM.menuOpen) { setMenu(false); } };

    burger.addEventListener('click', function () { setMenu(!EM.menuOpen); });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a, button[data-modal]')) { setMenu(false); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && EM.menuOpen) { setMenu(false); burger.focus(); }
    });
    if (window.matchMedia) {
      var mqDesktop = window.matchMedia('(min-width: 1100px)');
      var onDesktop = function (e) { if (e.matches) { setMenu(false); } };
      if (mqDesktop.addEventListener) { mqDesktop.addEventListener('change', onDesktop); }
      else if (mqDesktop.addListener) { mqDesktop.addListener(onDesktop); }
    }
  }

  function updateLock() {
    document.body.classList.toggle('is-locked', EM.menuOpen || Layers.stack.length > 0);
  }

  /* ---------- Capas: modales, overlays y drawer (foco atrapado, Escape, clic afuera) ---------- */

  var Layers = {
    stack: [],
    open: function (el, opts) {
      if (!el || el.classList.contains('is-open')) { return; }
      var opener = document.activeElement;
      if (EM.closeMenu) { EM.closeMenu(); }
      el.hidden = false;
      void el.offsetWidth; // fuerza el reflow para que la transición arranque
      el.classList.add('is-open');
      this.stack.push({ el: el, opener: opener, onClose: opts && opts.onClose });
      updateLock();
      var target = $('[data-autofocus]', el) || focusables(el)[0] || el;
      window.setTimeout(function () { if (target && target.focus) { target.focus(); } }, 60);
    },
    close: function (el) {
      var idx = -1;
      this.stack.forEach(function (l, i) { if (l.el === el) { idx = i; } });
      if (idx < 0) { return; }
      var layer = this.stack.splice(idx, 1)[0];
      el.classList.remove('is-open');
      // data-persist: capas que siguen visibles al cerrarse (los filtros son columna fija en desktop).
      var done = function () { if (!el.hasAttribute('data-persist')) { el.hidden = true; } };
      if (EM.reduce) { done(); } else { window.setTimeout(done, 400); }
      updateLock();
      if (layer.onClose) { layer.onClose(); }
      if (layer.opener && layer.opener.focus && document.contains(layer.opener)) { layer.opener.focus(); }
    },
    top: function () { return this.stack[this.stack.length - 1]; },
    isOpen: function (el) { return this.stack.some(function (l) { return l.el === el; }); }
  };

  function closeLayer(el) {
    if (!el) { return; }
    if (el.id === 'product' && EM.closeProduct) { EM.closeProduct(); return; }
    Layers.close(el);
  }

  function trapFocus(container, e) {
    var f = focusables(container);
    if (!f.length) { e.preventDefault(); return; }
    var first = f[0];
    var last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) {
      e.preventDefault(); first.focus();
    }
  }

  function setupLayers() {
    document.addEventListener('click', function (e) {
      var closer = e.target.closest('[data-close]');
      if (closer) {
        closeLayer(closer.closest('.modal, .overlay, .drawer-wrap, .lfilters'));
        return;
      }
      var modalBtn = e.target.closest('[data-modal]');
      if (modalBtn) { Layers.open(document.getElementById(modalBtn.getAttribute('data-modal'))); return; }
      var overlayBtn = e.target.closest('[data-overlay]');
      if (overlayBtn) { Layers.open(document.getElementById(overlayBtn.getAttribute('data-overlay'))); return; }
      var drawerBtn = e.target.closest('[data-drawer]');
      if (drawerBtn && EM.openCart) { EM.openCart(); }
    });

    document.addEventListener('keydown', function (e) {
      var top = Layers.top();
      if (!top) { return; }
      if (e.key === 'Escape') { e.preventDefault(); closeLayer(top.el); }
      else if (e.key === 'Tab') { trapFocus(top.el, e); }
    });

    // Cuenta simulada: no envía nada.
    var accountForm = $('#form-cuenta');
    if (accountForm) {
      accountForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var note = $('#cuenta-note');
        if (note) { note.textContent = 'Demo: no se envió nada. Para ingresar de verdad, usá el link a la tienda oficial.'; }
      });
    }
  }

  /* ---------- Datos: data/products.json ---------- */

  function loadProducts() {
    if (!window.fetch) { return; }
    window.fetch('data/products.json')
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); })
      .then(function (list) {
        EM.products = list;
        list.forEach(function (p) { EM.byId[p.id] = p; EM.bySlug[p.slug] = p; });
        document.dispatchEvent(new CustomEvent('em:products'));
      })
      .catch(function (err) {
        if (window.console) { console.error('No se pudo cargar data/products.json', err); }
        document.dispatchEvent(new CustomEvent('em:products-error'));
      });
  }

  /* ---------- Tarjeta de producto (compartida por catálogo, búsqueda y recomendados) ---------- */

  function priceHtml(p, big) {
    var range = p.precioHasta ? ' a ' + fmt(p.precioHasta) : '';
    if (p.precioPromo) {
      return '<s class="price--old"><span class="visually-hidden">Antes</span> ' + fmt(p.precio) + range + '</s> ' +
        '<strong class="price--promo"><span class="visually-hidden">Ahora</span> ' + fmt(p.precioPromo) + '</strong>' +
        (big ? '' : ' <span class="card__promo">Promo</span>');
    }
    return '<strong class="price">' + fmt(p.precio) + range + '</strong>';
  }

  function cardHtml(p, i) {
    var needsChoice = p.colores.length > 1 || p.talles.length > 1;
    return '<li class="card reveal" data-id="' + esc(p.id) + '" data-gender="' + esc(p.genero) + '" style="--i:' + (i || 0) + '">' +
      '<a class="card__media" href="#p/' + esc(p.slug) + '" tabindex="-1" aria-hidden="true">' +
        '<img src="' + esc(p.fotos[0]) + '" alt="" width="768" height="1024" loading="lazy" decoding="async">' +
        '<span class="card__tag">' + esc(cap(p.genero)) + '</span>' +
      '</a>' +
      '<div class="card__body">' +
        '<h3 class="card__name"><a href="#p/' + esc(p.slug) + '">' + esc(p.nombre) + '</a></h3>' +
        '<p class="card__sub">' + esc(p.subcategoria) + '</p>' +
        '<p class="card__price">' + priceHtml(p) + '</p>' +
        '<dl class="card__meta">' +
          '<div><dt>Colores</dt><dd>' + esc(p.colores.join(', ')) + '</dd></div>' +
          '<div><dt>Talles</dt><dd>' + esc(rangeText(p.talles)) + '</dd></div>' +
        '</dl>' +
        '<button class="btn btn--card" type="button" data-add="' + esc(p.id) + '"' + (needsChoice ? ' data-choose="1"' : '') + '>' +
          'Agregar al carrito<span class="visually-hidden">: ' + esc(p.nombre) + '</span>' +
        '</button>' +
      '</div>' +
    '</li>';
  }

  function renderCards(container, list, animate) {
    container.innerHTML = list.map(cardHtml).join('');
    var cards = $$('.card', container);
    cards.forEach(function (card, i) {
      card.classList.toggle('is-offset', i % 2 === 1);
      if (animate && !EM.reduce) { observeReveal(card); } else { card.classList.add('is-visible', 'is-settled'); }
    });
    return cards;
  }
  EM.renderCards = renderCards;

  // Muestra de inmediato lo que ya está dentro del viewport (tras un scroll instantáneo
  // el observer puede no disparar hasta el próximo frame).
  function revealInView() {
    var vh = window.innerHeight;
    var k = 0;
    $$('.reveal:not(.is-visible)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        el.style.setProperty('--i', k++);
        revealNow(el);
      }
    });
  }

  // "Agregar al carrito" en tarjetas: con más de un color o talle se abre la ficha para elegir.
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add]');
    if (!btn) { return; }
    var p = EM.byId[btn.getAttribute('data-add')];
    if (!p) { return; }
    if (btn.hasAttribute('data-choose') || !EM.addToCart) {
      window.location.hash = '#p/' + p.slug;
      return;
    }
    EM.addToCart(p, p.colores[0] || null, p.talles[0] || null, 1);
  });

  /* ---------- Búsqueda ---------- */

  function setupSearch() {
    var overlay = $('#search');
    var input = $('#search-input');
    var results = $('#search-results');
    var status = $('#search-status');
    if (!overlay || !input || !results) { return; }
    var timer = null;

    function run() {
      var raw = input.value.trim();
      var q = norm(raw);
      if (!q) {
        results.innerHTML = '';
        status.textContent = 'Escribí para buscar entre todas las prendas.';
        return;
      }
      var terms = q.split(/\s+/);
      var hits = EM.products.filter(function (p) {
        var hay = norm(p.nombre + ' ' + p.subcategoria + ' ' + p.genero);
        return terms.every(function (t) { return hay.indexOf(t) !== -1; });
      });
      renderCards(results, hits, false);
      status.textContent = hits.length
        ? hits.length + (hits.length === 1 ? ' resultado' : ' resultados') + ' para "' + raw + '"'
        : 'Sin resultados para "' + raw + '". Probá con otra palabra, por ejemplo jeans o camisa.';
    }

    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(run, 120);
    });
    document.addEventListener('em:products', function () { if (input.value) { run(); } });
    document.addEventListener('em:products-error', function () {
      status.textContent = 'No se pudo cargar el catálogo. Abrí la web desde un servidor (ver README).';
    });
    // Al abrir la ficha desde un resultado, se cierra la búsqueda.
    results.addEventListener('click', function (e) {
      if (e.target.closest('a[href^="#p/"], [data-add]')) { Layers.close(overlay); }
    });
  }

  /* ---------- Vistas: home y listado comparten la misma página ---------- */

  var BASE_TITLE = document.title;

  var Views = {
    current: 'home',

    // Devuelve true si cambió de vista.
    show: function (name) {
      var home = document.getElementById('home');
      var listing = document.getElementById('catalogo');
      if (!home || !listing || this.current === name) { return false; }
      this.current = name;
      home.hidden = name !== 'home';
      listing.hidden = name !== 'listing';
      if (name === 'home') { document.title = BASE_TITLE; }
      // Parallax y bloque fijo vuelven a medir con la vista nueva.
      window.dispatchEvent(new Event('resize'));
      return true;
    }
  };

  /* ---------- Listado: un solo componente para Mujer, Hombre, Feria y subcategorías ---------- */

  var SUBCATS = {
    mujer: ['Remeras y tops', 'Blusas y camisas', 'Sacos y blazer', 'Buzos y sweaters', 'Camperas y abrigos', 'Polleras y shorts', 'Jeans', 'Pantalones y calzas', 'Vestidos y monos'],
    hombre: ['Chombas y remeras', 'Camisas', 'Buzos y sweaters', 'Pantalones y bermudas', 'Jeans', 'Camperas, abrigos y sacos', 'Accesorios y complementos']
  };
  var GENEROS = ['todos', 'mujer', 'hombre', 'feria'];
  var GENERO_LABEL = { todos: 'Todas las prendas', mujer: 'Mujer', hombre: 'Hombre', feria: 'Feria' };
  var ORDENES = ['destacados', 'az', 'za', 'precio-asc', 'precio-desc'];
  var SIZE_ORDER = ['XS', 'S', 'SM', 'M', 'ML', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];

  function sizeRank(t) {
    var s = String(t).toUpperCase();
    if (/^\d+$/.test(s)) { return [0, parseInt(s, 10)]; }
    var i = SIZE_ORDER.indexOf(s);
    return i !== -1 ? [1, i] : [2, 0];
  }

  function compareSizes(a, b) {
    var ra = sizeRank(a);
    var rb = sizeRank(b);
    return (ra[0] - rb[0]) || (ra[1] - rb[1]) || String(a).localeCompare(String(b), 'es');
  }

  function unitPrice(p) { return p.precioPromo || p.precio; }

  var Listing = {
    state: { genero: 'todos', sub: null },
    filters: { talles: [], colores: [], stock: false, orden: 'destacados' },
    scopeList: [],
    rendered: false,
    timer: null,

    init: function () {
      this.el = document.getElementById('catalogo');
      this.grid = document.getElementById('grid');
      if (!this.el || !this.grid) { return; }
      this.title = document.getElementById('listing-title');
      this.crumbs = document.getElementById('listing-crumbs');
      this.chips = document.getElementById('chips');
      this.count = document.getElementById('catalog-count');
      this.status = document.getElementById('filter-status');
      this.panel = document.getElementById('filtros');
      this.openBtn = document.getElementById('filters-open');
      this.badge = document.getElementById('filters-count');
      this.tallesEl = document.getElementById('f-talles');
      this.coloresEl = document.getElementById('f-colores');
      this.stockEl = document.getElementById('f-stock');
      this.sortEl = document.getElementById('sort');
      this.applyBtn = document.getElementById('f-apply');
      var self = this;

      this.tallesEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-value]');
        if (b) { self.toggle('talles', b.getAttribute('data-value')); }
      });
      this.coloresEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-value]');
        if (b) { self.toggle('colores', b.getAttribute('data-value')); }
      });
      this.stockEl.addEventListener('change', function () {
        self.filters.stock = self.stockEl.checked;
        self.refresh();
      });
      this.sortEl.addEventListener('change', function () {
        self.filters.orden = ORDENES.indexOf(self.sortEl.value) !== -1 ? self.sortEl.value : 'destacados';
        self.refresh();
      });
      document.getElementById('f-clear').addEventListener('click', function () {
        self.clear();
        self.refresh();
      });
      this.grid.addEventListener('click', function (e) {
        if (e.target.closest('[data-clear-filters]')) { self.clear(); self.refresh(); }
      });

      // En mobile los filtros son un panel con foco atrapado; en desktop, una columna fija.
      this.openBtn.addEventListener('click', function () { self.openPanel(); });
      if (window.matchMedia) {
        var mq = window.matchMedia('(min-width: 900px)');
        var onDesktop = function (e) { if (e.matches) { Layers.close(self.panel); } };
        if (mq.addEventListener) { mq.addEventListener('change', onDesktop); } else if (mq.addListener) { mq.addListener(onDesktop); }
      }

      document.addEventListener('em:products-error', function () {
        self.grid.innerHTML = '<li class="catalog__empty">No se pudo cargar el catálogo. Abrí la web desde un servidor local o publicada (ver README).</li>';
      });
    },

    openPanel: function () {
      var dialog = $('.lfilters__panel', this.panel);
      var btn = this.openBtn;
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      btn.setAttribute('aria-expanded', 'true');
      Layers.open(this.panel, {
        onClose: function () {
          dialog.removeAttribute('role');
          dialog.removeAttribute('aria-modal');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    },

    // Feria = prendas con precio promocional; su "subcategoría" es el género.
    chipOptions: function (genero) {
      if (genero === 'feria') { return [{ value: 'mujer', label: 'Mujer' }, { value: 'hombre', label: 'Hombre' }]; }
      return (SUBCATS[genero] || []).map(function (n) { return { value: n, label: n }; });
    },

    scope: function (state) {
      return EM.products.filter(function (p) {
        if (state.genero === 'feria') { return !!p.precioPromo && (!state.sub || p.genero === state.sub); }
        if (state.genero !== 'todos' && p.genero !== state.genero) { return false; }
        return !state.sub || p.subcategoria === state.sub;
      });
    },

    // Talle, color y stock se cruzan por variante: "Negro, talle 28, con stock" pide
    // que exista esa combinación con stock, no cada cosa por separado.
    matches: function (p) {
      var f = this.filters;
      var hasT = f.talles.length > 0;
      var hasC = f.colores.length > 0;
      if (!hasT && !hasC) { return !f.stock || p.hayStock !== false; }
      var inT = function (t) { return t != null && f.talles.indexOf(norm(t)) !== -1; };
      var inC = function (c) { return c != null && f.colores.indexOf(norm(c)) !== -1; };
      if (!p.variantes || !p.variantes.length) {
        return (!hasT || p.talles.some(inT)) && (!hasC || p.colores.some(inC)) && (!f.stock || p.hayStock !== false);
      }
      return p.variantes.some(function (v) {
        return (!hasT || inT(v.talle)) && (!hasC || inC(v.color)) && (!f.stock || v.stock);
      });
    },

    sorted: function (list) {
      var orden = this.filters.orden;
      var byName = function (a, b) { return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }); };
      var out = list.slice();
      if (orden === 'az') { out.sort(byName); }
      else if (orden === 'za') { out.sort(function (a, b) { return byName(b, a); }); }
      else if (orden === 'precio-asc') { out.sort(function (a, b) { return (unitPrice(a) - unitPrice(b)) || byName(a, b); }); }
      else if (orden === 'precio-desc') { out.sort(function (a, b) { return (unitPrice(b) - unitPrice(a)) || byName(a, b); }); }
      return out;
    },

    toggle: function (kind, key) {
      var list = this.filters[kind];
      var i = list.indexOf(key);
      if (i === -1) { list.push(key); } else { list.splice(i, 1); }
      this.refresh();
    },

    clear: function () {
      this.filters.talles = [];
      this.filters.colores = [];
      this.filters.stock = false;
    },

    activeCount: function () {
      return this.filters.talles.length + this.filters.colores.length + (this.filters.stock ? 1 : 0);
    },

    hashFor: function (state) {
      var h = '#catalogo';
      if (state.genero !== 'todos') { h += '/' + state.genero; }
      if (state.sub) { h += '/' + (state.genero === 'feria' ? state.sub : slugify(state.sub)); }
      return h;
    },

    fromHash: function (hash) {
      var parts = hash.replace(/^#catalogo\/?/, '').split('/').filter(Boolean);
      var genero = GENEROS.indexOf(parts[0]) !== -1 ? parts[0] : 'todos';
      var sub = null;
      if (parts[1]) {
        this.chipOptions(genero).forEach(function (o) {
          var key = genero === 'feria' ? o.value : slugify(o.value);
          if (key === parts[1]) { sub = o.value; }
        });
      }
      return { genero: genero, sub: sub };
    },

    renderHead: function () {
      var st = this.state;
      var self = this;
      var gLabel = GENERO_LABEL[st.genero];
      var subLabel = st.sub ? (st.genero === 'feria' ? 'Feria de ' + st.sub : st.sub) : null;
      this.title.textContent = subLabel || gLabel;
      document.title = (subLabel ? subLabel + (st.genero === 'feria' ? '' : ' de ' + st.genero) : gLabel) + ' · Express Moda';

      var crumbs = [{ label: 'Inicio', href: '#inicio' }];
      crumbs.push(st.genero === 'todos' ? { label: 'Catálogo' } : { label: gLabel, href: this.hashFor({ genero: st.genero, sub: null }) });
      if (st.sub) { crumbs.push({ label: st.genero === 'feria' ? cap(st.sub) : st.sub }); }
      crumbs[crumbs.length - 1].href = null;
      this.crumbs.innerHTML = crumbs.map(function (c) {
        return '<li>' + (c.href ? '<a href="' + c.href + '">' + esc(c.label) + '</a>' : '<span aria-current="page">' + esc(c.label) + '</span>') + '</li>';
      }).join('');

      var chips = st.genero === 'todos'
        ? ['mujer', 'hombre', 'feria'].map(function (g) { return { label: GENERO_LABEL[g], href: '#catalogo/' + g, current: false }; })
        : [{ label: 'Todo', href: this.hashFor({ genero: st.genero, sub: null }), current: !st.sub }].concat(
            this.chipOptions(st.genero).map(function (o) {
              return { label: o.label, href: self.hashFor({ genero: st.genero, sub: o.value }), current: st.sub === o.value };
            }));
      var hadFocus = this.chips.contains(document.activeElement);
      this.chips.innerHTML = chips.map(function (c) {
        return '<li><a class="chip" href="' + c.href + '"' + (c.current ? ' aria-current="page"' : '') + '>' + esc(c.label) + '</a></li>';
      }).join('');
      if (hadFocus) {
        var current = $('[aria-current="page"]', this.chips);
        if (current) { current.focus({ preventScroll: true }); }
      }
    },

    // Opciones de talle y color de la categoría actual.
    renderOptions: function () {
      var talles = {};
      var colores = {};
      this.scopeList.forEach(function (p) {
        p.talles.forEach(function (t) { var k = norm(t); if (!talles[k]) { talles[k] = t; } });
        p.colores.forEach(function (c) { var k = norm(c); if (!colores[k]) { colores[k] = cap(c); } });
      });
      var tKeys = Object.keys(talles).sort(function (a, b) { return compareSizes(talles[a], talles[b]); });
      var cKeys = Object.keys(colores).sort(function (a, b) { return a.localeCompare(b, 'es'); });
      this.filters.talles = this.filters.talles.filter(function (k) { return !!talles[k]; });
      this.filters.colores = this.filters.colores.filter(function (k) { return !!colores[k]; });
      var button = function (key, label) {
        return '<button class="opt" type="button" data-value="' + esc(key) + '" aria-pressed="false">' + esc(label) + '</button>';
      };
      this.tallesEl.innerHTML = tKeys.length ? tKeys.map(function (k) { return button(k, talles[k]); }).join('') : '<p class="fgroup__empty">Sin talles en esta categoría.</p>';
      this.coloresEl.innerHTML = cKeys.length ? cKeys.map(function (k) { return button(k, colores[k]); }).join('') : '<p class="fgroup__empty">Sin colores en esta categoría.</p>';
    },

    syncControls: function (n) {
      var f = this.filters;
      $$('[data-value]', this.tallesEl).forEach(function (b) {
        b.setAttribute('aria-pressed', f.talles.indexOf(b.getAttribute('data-value')) !== -1 ? 'true' : 'false');
      });
      $$('[data-value]', this.coloresEl).forEach(function (b) {
        b.setAttribute('aria-pressed', f.colores.indexOf(b.getAttribute('data-value')) !== -1 ? 'true' : 'false');
      });
      this.stockEl.checked = f.stock;
      this.sortEl.value = f.orden;
      var active = this.activeCount();
      this.badge.textContent = active ? '(' + active + ')' : '';
      this.openBtn.setAttribute('aria-label', 'Filtrar' + (active ? ', ' + active + (active === 1 ? ' filtro activo' : ' filtros activos') : ''));
      if (n != null) { this.applyBtn.textContent = n ? 'Ver ' + n + (n === 1 ? ' prenda' : ' prendas') : 'Sin resultados'; }
    },

    describeFilters: function () {
      var f = this.filters;
      var parts = [];
      var label = function (el, key) { var b = $('[data-value="' + key + '"]', el); return b ? b.textContent : key; };
      var self = this;
      if (f.talles.length) { parts.push((f.talles.length === 1 ? 'talle ' : 'talles ') + f.talles.map(function (k) { return label(self.tallesEl, k); }).join(', ')); }
      if (f.colores.length) { parts.push((f.colores.length === 1 ? 'color ' : 'colores ') + f.colores.map(function (k) { return label(self.coloresEl, k).toLowerCase(); }).join(', ')); }
      if (f.stock) { parts.push('solo con stock'); }
      return parts.length ? ', ' + parts.join(', ') : '';
    },

    apply: function (state, opts) {
      opts = opts || {};
      if (GENEROS.indexOf(state.genero) === -1) { state.genero = 'todos'; }
      var valid = this.chipOptions(state.genero).some(function (o) { return o.value === state.sub; });
      if (!valid) { state.sub = null; }
      var changed = !this.rendered || state.genero !== this.state.genero || state.sub !== this.state.sub;
      this.state = state;
      // Al cambiar de categoría los filtros arrancan de cero; el orden elegido se mantiene.
      if (changed) { this.clear(); }

      this.renderHead();
      this.scopeList = this.scope(state);
      this.renderOptions();
      this.rendered = true;

      if (opts.updateHash && window.history && window.history.replaceState) {
        var h = this.hashFor(state);
        if (window.location.hash !== h) { window.history.replaceState(null, '', h); }
      }

      this.draw({ animate: opts.animate });

      if (opts.scroll) {
        window.scrollTo({ top: 0, behavior: opts.instant || EM.reduce ? 'instant' : 'smooth' });
        if (opts.instant) { window.requestAnimationFrame(revealInView); }
      }
      if (opts.focus && !this.el.contains(document.activeElement)) {
        this.title.focus({ preventScroll: true });
      }
    },

    refresh: function () {
      this.draw({ animate: true });
    },

    draw: function (opts) {
      var self = this;
      var list = this.sorted(this.scopeList.filter(function (p) { return self.matches(p); }));
      var n = list.length;
      var text = n + (n === 1 ? ' prenda' : ' prendas');
      this.syncControls(n);
      this.count.textContent = text;
      this.status.textContent = 'Mostrando ' + text + this.describeFilters();

      var grid = this.grid;
      var draw = function () {
        if (n) {
          renderCards(grid, list, !EM.reduce);
        } else {
          grid.innerHTML = '<li class="catalog__empty">No hay prendas con estos filtros. ' +
            '<button class="link-btn" type="button" data-clear-filters>Limpiar filtros</button></li>';
        }
        grid.classList.remove('is-switching');
      };

      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      if (!opts || !opts.animate || EM.reduce) {
        draw();
      } else {
        grid.classList.add('is-switching');
        this.timer = setTimeout(function () { self.timer = null; draw(); }, 240);
      }
    }
  };

  function setupListing() {
    Listing.init();
  }

  /* ---------- Ficha de producto (#p/slug) ---------- */

  var Product = {
    current: null,
    sel: { color: null, talle: null, qty: 1 },
    pendingSlug: null,

    init: function () {
      this.el = document.getElementById('product');
      this.inner = document.getElementById('pd');
      if (!this.el || !this.inner) { return; }
      var self = this;

      this.inner.addEventListener('click', function (e) {
        var thumb = e.target.closest('[data-foto]');
        if (thumb) { self.showPhoto(parseInt(thumb.getAttribute('data-foto'), 10)); return; }
        var opt = e.target.closest('[data-opt]');
        if (opt) { self.choose(opt.getAttribute('data-opt'), opt.getAttribute('data-value')); return; }
        var qty = e.target.closest('[data-qty]');
        if (qty) { self.setQty(self.sel.qty + parseInt(qty.getAttribute('data-qty'), 10)); return; }
        if (e.target.closest('[data-pd-add]')) { self.add(); }
      });

      document.addEventListener('em:products', function () {
        if (self.pendingSlug) { var s = self.pendingSlug; self.pendingSlug = null; self.open(s); }
      });

      EM.openProduct = function (slug) { self.open(slug); };
      EM.closeProduct = function () { self.close(); };
      EM.closeProductIfOpen = function () { if (Layers.isOpen(self.el)) { self.hide(); } };
    },

    open: function (slug) {
      var p = EM.bySlug[slug];
      if (!p) {
        if (!EM.products.length) { this.pendingSlug = slug; }
        return;
      }
      this.current = p;
      this.sel = {
        color: p.colores.length === 1 ? p.colores[0] : null,
        talle: p.talles.length === 1 ? p.talles[0] : null,
        qty: 1
      };
      this.render();
      if (!Layers.isOpen(this.el)) { Layers.open(this.el); }
      this.el.scrollTop = 0;
      rememberViewed(p);
    },

    // Cierre pedido por el usuario (X, Escape): vuelve atrás en el historial si la ficha
    // se abrió navegando dentro de la web; si se entró directo por link, reemplaza el hash.
    close: function () {
      if (EM.hashBeforeProduct != null) {
        window.history.back();
      } else {
        // Entrada directa por link: se saca el hash y queda la vista que había debajo.
        if (window.history.replaceState) { window.history.replaceState(null, '', window.location.pathname + window.location.search); }
        this.hide();
      }
    },

    hide: function () {
      if (!Layers.isOpen(this.el)) { return; }
      var p = this.current;
      Layers.close(this.el);
      this.current = null;
      document.dispatchEvent(new CustomEvent('em:product-closed', { detail: p }));
    },

    render: function () {
      var p = this.current;
      var sel = this.sel;
      var price = p.precioPromo || p.precio;
      var thumbs = p.fotos.length > 1
        ? '<ul class="pd__thumbs">' + p.fotos.map(function (f, i) {
            return '<li><button class="pd__thumb" type="button" data-foto="' + i + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '" aria-label="Foto ' + (i + 1) + ' de ' + p.fotos.length + '">' +
              '<img src="' + esc(f) + '" alt="" width="240" height="320" loading="lazy" decoding="async"></button></li>';
          }).join('') + '</ul>'
        : '';
      var group = function (kind, label, values, chosen) {
        if (!values.length) { return ''; }
        return '<div class="pd__group">' +
          '<p class="pd__label" id="pd-' + kind + '-label">' + label + ' <span>' + (chosen ? esc(chosen) : 'Elegí una opción') + '</span></p>' +
          '<div class="opts" role="group" aria-labelledby="pd-' + kind + '-label">' +
            values.map(function (v) {
              return '<button class="opt" type="button" data-opt="' + kind + '" data-value="' + esc(v) + '" aria-pressed="' + (chosen === v ? 'true' : 'false') + '">' + esc(v) + '</button>';
            }).join('') +
          '</div></div>';
      };

      this.inner.innerHTML =
        '<div class="pd__gallery">' +
          '<div class="pd__main"><img id="pd-main" src="' + esc(p.fotos[0]) + '" alt="' + esc(p.nombre) + '" width="768" height="1024" decoding="async"></div>' +
          thumbs +
        '</div>' +
        '<div class="pd__info">' +
          '<p class="eyebrow">' + esc(cap(p.genero)) + ' · ' + esc(p.subcategoria) + '</p>' +
          '<h2 class="pd__name" id="pd-name">' + esc(p.nombre) + '</h2>' +
          '<p class="pd__price">' + priceHtml(p, true) + (p.precioPromo ? ' <span class="card__promo">Promo</span>' : '') + '</p>' +
          '<p class="pd__installments">3 cuotas sin interés de ' + fmt(price / 3) + '</p>' +
          group('color', 'Color', p.colores, sel.color) +
          group('talle', 'Talle', p.talles, sel.talle) +
          '<div class="pd__group">' +
            '<p class="pd__label" id="pd-qty-label">Cantidad</p>' +
            '<div class="qty" role="group" aria-labelledby="pd-qty-label">' +
              '<button type="button" data-qty="-1" aria-label="Restar una unidad">&minus;</button>' +
              '<output id="pd-qty" aria-live="polite">' + sel.qty + '</output>' +
              '<button type="button" data-qty="1" aria-label="Sumar una unidad">+</button>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn--dark btn--block pd__add" type="button" data-pd-add>Agregar al carrito</button>' +
          '<p class="pd__hint" id="pd-hint" aria-live="polite"></p>' +
          '<p class="pd__desc">' + esc(p.descripcion) + '</p>' +
          '<a class="pd__store" href="' + esc(p.urlTienda) + '" target="_blank" rel="noopener">Ver en la tienda online</a>' +
        '</div>';
    },

    showPhoto: function (i) {
      var p = this.current;
      if (!p || !p.fotos[i]) { return; }
      var main = document.getElementById('pd-main');
      if (main) { main.src = p.fotos[i]; }
      $$('[data-foto]', this.inner).forEach(function (b) {
        b.setAttribute('aria-pressed', parseInt(b.getAttribute('data-foto'), 10) === i ? 'true' : 'false');
      });
    },

    choose: function (kind, value) {
      this.sel[kind] = value;
      var label = document.getElementById('pd-' + kind + '-label');
      if (label) { label.querySelector('span').textContent = value; }
      $$('[data-opt="' + kind + '"]', this.inner).forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-value') === value ? 'true' : 'false');
      });
      this.hint('');
    },

    setQty: function (n) {
      this.sel.qty = Math.max(1, Math.min(10, n));
      var out = document.getElementById('pd-qty');
      if (out) { out.textContent = this.sel.qty; }
    },

    hint: function (text) {
      var el = document.getElementById('pd-hint');
      if (el) { el.textContent = text; }
    },

    add: function () {
      var p = this.current;
      if (!p) { return; }
      if (p.colores.length && !this.sel.color) { this.hint('Elegí un color para agregar la prenda.'); return; }
      if (p.talles.length && !this.sel.talle) { this.hint('Elegí un talle para agregar la prenda.'); return; }
      if (!EM.addToCart) { this.hint('El carrito todavía no está disponible.'); return; }
      EM.addToCart(p, this.sel.color, this.sel.talle, this.sel.qty);
      this.hint('');
    }
  };

  function rememberViewed(p) {
    storageSet('em_lastViewed', { id: p.id, genero: p.genero, subcategoria: p.subcategoria });
    var recent = storageGet('em_recent', []);
    recent = [p.id].concat(recent.filter(function (id) { return id !== p.id; })).slice(0, 8);
    storageSet('em_recent', recent);
  }

  function setupProduct() {
    Product.init();
  }

  /* ---------- Carrito simulado (persiste en localStorage) ---------- */

  var Cart = {
    KEY: 'em_cart',
    FREE_SHIPPING: 100000,
    items: [],

    init: function () {
      this.el = document.getElementById('cart');
      this.body = document.getElementById('cart-body');
      this.badge = document.getElementById('cart-badge');
      this.button = $('[data-drawer="cart"]');
      this.subtotalEl = document.getElementById('cart-subtotal');
      this.shipEl = document.getElementById('ship');
      this.shipText = document.getElementById('ship-text');
      this.shipFill = document.getElementById('ship-fill');
      this.checkout = document.getElementById('cart-checkout');
      if (!this.el || !this.body) { return; }
      var self = this;

      var saved = storageGet(this.KEY, []);
      this.items = Array.isArray(saved) ? saved.filter(function (it) {
        return it && typeof it.id === 'string' && it.qty > 0;
      }) : [];

      this.body.addEventListener('click', function (e) {
        var qty = e.target.closest('[data-cart-qty]');
        if (qty) {
          var i = parseInt(qty.getAttribute('data-index'), 10);
          self.setQty(i, self.items[i].qty + parseInt(qty.getAttribute('data-cart-qty'), 10));
          return;
        }
        var rm = e.target.closest('[data-cart-remove]');
        if (rm) { self.remove(parseInt(rm.getAttribute('data-cart-remove'), 10)); }
      });

      if (this.checkout) {
        this.checkout.addEventListener('click', function () {
          if (!self.items.length) { return; }
          Layers.open(document.getElementById('modal-demo'));
        });
      }

      document.addEventListener('em:products', function () {
        // Descarta ítems guardados cuyo producto ya no está en el catálogo.
        var before = self.items.length;
        self.items = self.items.filter(function (it) { return !!EM.byId[it.id]; });
        if (self.items.length !== before) { self.save(); }
        self.render();
      });

      EM.addToCart = function (p, color, talle, qty) { self.add(p, color, talle, qty); };
      EM.openCart = function () { self.open(); };
      this.render();
    },

    save: function () { storageSet(this.KEY, this.items); },

    lines: function () {
      // index es la posición real en this.items: los botones editan ese ítem y no otro.
      return this.items.map(function (it, i) {
        return { item: it, product: EM.byId[it.id], index: i };
      }).filter(function (l) { return !!l.product; });
    },

    unit: function (p) { return p.precioPromo || p.precio; },

    subtotal: function () {
      var self = this;
      return this.lines().reduce(function (sum, l) { return sum + self.unit(l.product) * l.item.qty; }, 0);
    },

    count: function () {
      return this.items.reduce(function (n, it) { return n + it.qty; }, 0);
    },

    add: function (p, color, talle, qty) {
      qty = Math.max(1, parseInt(qty, 10) || 1);
      var found = null;
      this.items.forEach(function (it) {
        if (it.id === p.id && it.color === color && it.talle === talle) { found = it; }
      });
      if (found) { found.qty = Math.min(10, found.qty + qty); }
      else { this.items.push({ id: p.id, color: color, talle: talle, qty: qty }); }
      this.save();
      this.render();
      this.bump();
      this.open();
    },

    setQty: function (index, qty) {
      if (!this.items[index]) { return; }
      if (qty <= 0) { this.remove(index); return; }
      this.items[index].qty = Math.min(10, qty);
      this.save();
      this.render();
    },

    remove: function (index) {
      this.items.splice(index, 1);
      this.save();
      this.render();
    },

    open: function () {
      Layers.open(this.el);
    },

    bump: function () {
      if (!this.badge || EM.reduce) { return; }
      var b = this.badge;
      b.classList.add('is-bump');
      window.setTimeout(function () { b.classList.remove('is-bump'); }, 350);
    },

    render: function () {
      var self = this;
      var count = this.count();
      if (this.badge) {
        this.badge.textContent = count;
        this.badge.classList.toggle('is-empty', count === 0);
      }
      if (this.button) {
        this.button.setAttribute('aria-label', 'Carrito, ' + count + (count === 1 ? ' producto' : ' productos'));
      }

      var lines = this.lines();
      if (!lines.length) {
        this.body.innerHTML = '<div class="drawer__empty"><p>Tu carrito está vacío.</p><a class="btn btn--dark" href="#catalogo" data-close>Ver el catálogo</a></div>';
      } else {
        this.body.innerHTML = '<ul class="cart-list">' + lines.map(function (l) {
          var p = l.product;
          var it = l.item;
          var meta = [it.color, it.talle ? 'Talle ' + it.talle : null].filter(Boolean).join(' · ');
          return '<li class="cart-item">' +
            '<img class="cart-item__img" src="' + esc(p.fotos[0]) + '" alt="" width="90" height="120" loading="lazy" decoding="async">' +
            '<div class="cart-item__body">' +
              '<p class="cart-item__name">' + esc(p.nombre) + '</p>' +
              (meta ? '<p class="cart-item__meta">' + esc(meta) + '</p>' : '') +
              '<div class="cart-item__row">' +
                '<div class="qty qty--sm" role="group" aria-label="Cantidad de ' + esc(p.nombre) + '">' +
                  '<button type="button" data-cart-qty="-1" data-index="' + l.index + '" aria-label="Restar una unidad">&minus;</button>' +
                  '<output>' + it.qty + '</output>' +
                  '<button type="button" data-cart-qty="1" data-index="' + l.index + '" aria-label="Sumar una unidad">+</button>' +
                '</div>' +
                '<span class="cart-item__price">' + fmt(self.unit(p) * it.qty) + '</span>' +
              '</div>' +
              '<button class="link-btn cart-item__remove" type="button" data-cart-remove="' + l.index + '">Quitar<span class="visually-hidden"> ' + esc(p.nombre) + '</span></button>' +
            '</div>' +
          '</li>';
        }).join('') + '</ul>';
      }

      var subtotal = this.subtotal();
      if (this.subtotalEl) { this.subtotalEl.textContent = fmt(subtotal); }
      var missing = this.FREE_SHIPPING - subtotal;
      if (this.shipEl && this.shipText && this.shipFill) {
        var ok = subtotal > 0 && missing <= 0;
        this.shipEl.classList.toggle('is-ok', ok);
        this.shipText.textContent = ok ? 'Tenés envío gratis' : 'Te faltan ' + fmt(Math.max(0, missing)) + ' para el envío gratis';
        this.shipFill.style.setProperty('--p', Math.min(1, subtotal / this.FREE_SHIPPING).toFixed(3));
      }
      if (this.checkout) {
        this.checkout.disabled = !lines.length;
        this.checkout.setAttribute('aria-disabled', lines.length ? 'false' : 'true');
      }
      document.dispatchEvent(new CustomEvent('em:cart'));
    }
  };

  function setupCart() {
    Cart.init();
  }

  /* ---------- "En base a tu última búsqueda" ---------- */

  var Recs = {
    init: function () {
      this.el = document.getElementById('recs');
      this.grid = document.getElementById('recs-grid');
      this.note = document.getElementById('recs-note');
      if (!this.el || !this.grid) { return; }
      var self = this;
      document.addEventListener('em:products', function () { self.update(); });
      document.addEventListener('em:product-closed', function () { self.update(); });
    },

    picks: function (last) {
      var same = EM.products.filter(function (p) {
        return p.id !== last.id && p.genero === last.genero && p.subcategoria === last.subcategoria;
      });
      var out = same.slice(0, 4);
      if (out.length < 4) {
        var fill = EM.products.filter(function (p) {
          return p.id !== last.id && p.genero === last.genero && out.indexOf(p) === -1;
        });
        out = out.concat(fill.slice(0, 4 - out.length));
      }
      return out;
    },

    update: function () {
      var last = storageGet('em_lastViewed', null);
      if (!last || !last.id || !EM.products.length) { this.el.hidden = true; return; }
      var list = this.picks(last);
      if (!list.length) { this.el.hidden = true; return; }
      var seen = EM.byId[last.id];
      if (this.note) {
        this.note.textContent = seen
          ? 'Porque viste ' + seen.nombre + ' · ' + cap(seen.genero) + ', ' + seen.subcategoria
          : 'Porque viste ' + cap(last.genero) + ', ' + last.subcategoria;
      }
      this.el.hidden = false;
      // Si el foco estaba en una tarjeta que se va a redibujar, se pasa al título de la sección.
      var hadFocus = this.grid.contains(document.activeElement) || document.activeElement === document.body;
      renderCards(this.grid, list, true);
      var title = document.getElementById('recs-title');
      if (hadFocus && title && !Layers.stack.length) {
        title.setAttribute('tabindex', '-1');
        title.focus({ preventScroll: true });
      }
    }
  };

  function setupRecs() {
    Recs.init();
  }

  /* ---------- Lo nuevo: últimas prendas agregadas a la tienda ---------- */

  // "nuevo" en data/products.json es la posición en el orden de la tienda (más nuevo primero).
  function setupNuevo() {
    var grid = document.getElementById('nuevo-grid');
    if (!grid) { return; }
    document.addEventListener('em:products', function () {
      var list = EM.products
        .filter(function (p) { return p.nuevo; })
        .sort(function (a, b) { return a.nuevo - b.nuevo; })
        .slice(0, 8);
      renderCards(grid, list, true);
    });
    document.addEventListener('em:products-error', function () {
      grid.innerHTML = '<li class="catalog__empty">No se pudieron cargar las prendas. Abrí la web desde un servidor local o publicada (ver README).</li>';
    });
  }

  /* ---------- Recordatorio de carrito (solo si hay productos) ---------- */

  var Pending = {
    init: function () {
      this.el = document.getElementById('pendiente');
      this.list = document.getElementById('pendiente-list');
      this.sum = document.getElementById('pendiente-sum');
      if (!this.el || !this.list) { return; }
      var self = this;
      document.addEventListener('em:cart', function () { self.render(); });
      this.render();
    },

    render: function () {
      var lines = Cart.lines();
      if (!lines.length) {
        this.el.hidden = true;
        this.list.innerHTML = '';
        return;
      }
      var units = lines.reduce(function (n, l) { return n + l.item.qty; }, 0);
      this.sum.textContent = 'Tenés ' + units + (units === 1 ? ' producto' : ' productos') + ' en el carrito por ' + fmt(Cart.subtotal()) + '.';
      var shown = lines.slice(0, 4);
      this.list.innerHTML = shown.map(function (l) {
        var p = l.product;
        var it = l.item;
        var meta = [it.color, it.talle ? 'Talle ' + it.talle : null, it.qty > 1 ? it.qty + ' unidades' : null].filter(Boolean).join(' · ');
        var name = p.slug ? '<a href="#p/' + esc(p.slug) + '">' + esc(p.nombre) + '</a>' : esc(p.nombre);
        return '<li class="pending__item">' +
          '<img src="' + esc(p.fotos[0]) + '" alt="" width="90" height="120" loading="lazy" decoding="async">' +
          '<div class="pending__info">' +
            '<p class="pending__name">' + name + '</p>' +
            (meta ? '<p class="pending__meta">' + esc(meta) + '</p>' : '') +
            '<p class="pending__price">' + fmt(Cart.unit(p) * it.qty) + '</p>' +
          '</div>' +
        '</li>';
      }).join('') + (lines.length > shown.length
        ? '<li class="pending__more">Y ' + (lines.length - shown.length) + ' más en el carrito</li>'
        : '');
      this.el.hidden = false;
    }
  };

  function setupPending() {
    Pending.init();
  }

  /* ---------- Gift cards (mismos montos e imágenes que expressmoda.com.ar/gift-cards1) ---------- */

  // Se registran en EM.byId para que el carrito las reconozca igual que a una prenda.
  var GIFTCARDS = [120000, 90000, 70000, 50000, 30000].map(function (monto) {
    return {
      id: 'giftcard-' + monto,
      slug: null,
      giftcard: true,
      nombre: 'GiftCard ' + fmt(monto),
      precio: monto,
      precioHasta: null,
      precioPromo: null,
      colores: [],
      talles: [],
      fotos: ['assets/img/giftcards/giftcard-' + monto + '.webp']
    };
  });

  function setupGiftcards() {
    GIFTCARDS.forEach(function (g) { EM.byId[g.id] = g; });
    var grid = document.getElementById('giftcards-grid');
    var modal = document.getElementById('modal-giftcards');
    if (!grid || !modal) { return; }

    grid.innerHTML = GIFTCARDS.map(function (g) {
      return '<li class="gc-card">' +
        '<div class="gc-card__media"><img src="' + esc(g.fotos[0]) + '" alt="" width="800" height="1120" loading="lazy" decoding="async"></div>' +
        '<h3 class="gc-card__name">' + esc(g.nombre) + '</h3>' +
        '<p class="gc-card__price">' + fmt(g.precio) + '</p>' +
        '<button class="btn btn--card btn--block" type="button" data-gift="' + esc(g.id) + '">' +
          'Agregar al carrito<span class="visually-hidden">: ' + esc(g.nombre) + '</span>' +
        '</button>' +
      '</li>';
    }).join('');

    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-gift]');
      var card = btn && EM.byId[btn.getAttribute('data-gift')];
      if (!card || !EM.addToCart) { return; }
      Layers.close(modal);
      EM.addToCart(card, null, null, 1);
    });
  }

  /* ---------- Contacto: formulario que abre WhatsApp con el mensaje armado ---------- */

  function setupContact() {
    var form = document.getElementById('contact-form');
    var note = document.getElementById('contact-note');
    if (!form || !note) { return; }
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var defaultNote = note.textContent;

    var fields = {
      nombre: function (v) { return v ? '' : 'Ingresá tu nombre.'; },
      mail: function (v) {
        if (!v) { return 'Ingresá tu mail.'; }
        return EMAIL.test(v) ? '' : 'Revisá el mail: tiene que ser como nombre@dominio.com.';
      },
      telefono: function (v) {
        if (!v) { return 'Ingresá tu teléfono.'; }
        return /^[\d\s()+-]+$/.test(v) && v.replace(/\D/g, '').length >= 6 ? '' : 'Revisá el teléfono: usá solo números, espacios, guiones o +.';
      },
      mensaje: function (v) { return v ? '' : 'Contanos en qué te podemos ayudar.'; }
    };

    function input(name) { return form.elements[name]; }

    function validate(name) {
      var el = input(name);
      var msg = fields[name](el.value.trim());
      var error = document.getElementById(el.id + '-error');
      if (error) { error.textContent = msg; }
      if (msg) { el.setAttribute('aria-invalid', 'true'); } else { el.removeAttribute('aria-invalid'); }
      return !msg;
    }

    Object.keys(fields).forEach(function (name) {
      var el = input(name);
      el.addEventListener('blur', function () { if (el.value.trim() || el.hasAttribute('aria-invalid')) { validate(name); } });
      el.addEventListener('input', function () { if (el.hasAttribute('aria-invalid')) { validate(name); } });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      Object.keys(fields).forEach(function (name) {
        if (!validate(name) && !firstInvalid) { firstInvalid = input(name); }
      });
      if (firstInvalid) {
        note.textContent = 'Revisá los campos marcados para poder enviar.';
        note.classList.add('is-error');
        firstInvalid.focus();
        return;
      }
      var value = function (name) { return input(name).value.trim(); };
      var text = 'Hola! Te escribo desde la web de Express Moda.\n\n' +
        'Nombre: ' + value('nombre') + '\n' +
        'Mail: ' + value('mail') + '\n' +
        'Teléfono: ' + value('telefono') + '\n' +
        'Mensaje: ' + value('mensaje');
      note.classList.remove('is-error');
      note.textContent = 'Abrimos WhatsApp con tu mensaje. Si no se abrió, escribinos al ' + (CONFIG.whatsappVisible || WA_NUMBER) + '.';
      openWhatsApp(text);
    });

    form.addEventListener('reset', function () { note.textContent = defaultNote; });
  }

  /* ---------- Nuestros locales: mapa de Google Maps con un marcador por local ---------- */

  // La clave se lee de maps-config.js, que genera scripts/maps-config.mjs desde .env o
  // desde las variables de entorno de Vercel. El mapa se carga recién al abrir el modal.
  var Locales = {
    map: null,
    info: null,
    markers: {},
    state: 'idle', // idle | loading | ready | failed
    pending: null,

    init: function () {
      this.modal = document.getElementById('modal-locales');
      // Google Maps vacía su contenedor al crear el mapa: el aviso vive fuera del lienzo.
      this.mapEl = document.getElementById('locales-map');
      this.msg = document.getElementById('locales-map-msg');
      if (!this.modal || !this.mapEl || !this.msg) { return; }
      this.wrap = this.mapEl.parentElement;
      var self = this;

      this.stores = $$('#locales-list [data-store]').map(function (li) {
        return {
          id: li.getAttribute('data-store'),
          li: li,
          name: $('.store__name', li).textContent,
          addr: $('.store__addr', li).textContent,
          city: $('.store__city', li).textContent,
          lat: parseFloat(li.getAttribute('data-lat')),
          lng: parseFloat(li.getAttribute('data-lng'))
        };
      });

      document.addEventListener('click', function (e) {
        if (e.target.closest('[data-modal="modal-locales"]')) { self.load(); }
      });
      this.modal.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-map-store]');
        if (btn) { self.focusStore(btn.getAttribute('data-map-store')); }
      });

      // Google llama a esta función si la clave es inválida o no tiene la API habilitada.
      window.gm_authFailure = function () {
        self.fail('La clave de Google Maps no es válida o no tiene habilitada la Maps JavaScript API. Las direcciones están en la lista.');
      };
    },

    load: function () {
      if (this.state !== 'idle') { return; }
      this.state = 'loading';
      var self = this;
      loadScript('maps-config.js')
        .then(function () {
          if (!window.EM_MAPS_KEY) { throw new Error('sin-clave'); }
          return self.loadApi(window.EM_MAPS_KEY);
        })
        .then(function (libs) { self.build(libs); })
        .catch(function (err) {
          self.fail(err && err.message === 'sin-clave'
            ? 'El mapa no está disponible porque falta configurar la clave de Google Maps. Las direcciones están en la lista.'
            : 'No se pudo cargar Google Maps. Revisá la conexión; las direcciones están en la lista.');
        });
    },

    loadApi: function (key) {
      return new Promise(function (resolve, reject) {
        var ready = function () {
          var maps = window.google && window.google.maps;
          if (!maps) { reject(new Error('api')); return; }
          if (!maps.importLibrary) { resolve({ Map: maps.Map, InfoWindow: maps.InfoWindow, Marker: maps.Marker, LatLngBounds: maps.LatLngBounds }); return; }
          Promise.all([maps.importLibrary('maps'), maps.importLibrary('marker'), maps.importLibrary('core')])
            .then(function (l) { resolve({ Map: l[0].Map, InfoWindow: l[0].InfoWindow, Marker: l[1].Marker, LatLngBounds: l[2].LatLngBounds }); })
            .catch(reject);
        };
        if (window.google && window.google.maps) { ready(); return; }
        window.__emMapsReady = ready;
        var s = document.createElement('script');
        s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) +
          '&callback=__emMapsReady&loading=async&language=es&region=AR';
        s.async = true;
        s.onerror = function () { reject(new Error('red')); };
        document.head.appendChild(s);
      });
    },

    build: function (libs) {
      var self = this;
      this.msg.hidden = true;
      this.map = new libs.Map(this.mapEl, {
        center: { lat: this.stores[0].lat, lng: this.stores[0].lng },
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        clickableIcons: false
      });
      this.info = new libs.InfoWindow();
      var bounds = new libs.LatLngBounds();
      this.stores.forEach(function (store) {
        var position = { lat: store.lat, lng: store.lng };
        var marker = new libs.Marker({ position: position, map: self.map, title: store.name });
        marker.addListener('click', function () { self.openInfo(store); });
        self.markers[store.id] = marker;
        bounds.extend(position);
      });
      this.map.fitBounds(bounds, 48);
      this.state = 'ready';
      if (this.pending) { var id = this.pending; this.pending = null; this.focusStore(id); }
    },

    openInfo: function (store) {
      var box = document.createElement('div');
      box.className = 'map-info';
      [['strong', store.name], ['span', store.addr], ['span', store.city]].forEach(function (part) {
        var node = document.createElement(part[0]);
        node.textContent = part[1];
        box.appendChild(node);
      });
      this.info.setContent(box);
      this.info.open({ anchor: this.markers[store.id], map: this.map });
      this.stores.forEach(function (s) { s.li.classList.toggle('is-active', s === store); });
    },

    focusStore: function (id) {
      var store = this.stores.filter(function (s) { return s.id === id; })[0];
      if (!store) { return; }
      if (this.state === 'failed') {
        // Sin mapa, el botón abre la ubicación en Google Maps (en el celular, en la app).
        window.open('https://www.google.com/maps/search/?api=1&query=' + store.lat + ',' + store.lng, '_blank', 'noopener');
        return;
      }
      if (this.state !== 'ready') { this.pending = id; this.load(); return; }
      this.map.panTo({ lat: store.lat, lng: store.lng });
      this.map.setZoom(16);
      this.openInfo(store);
      // En mobile el mapa queda arriba de la lista: se lo trae a la vista.
      this.wrap.scrollIntoView({ block: 'nearest', behavior: EM.reduce ? 'auto' : 'smooth' });
    },

    fail: function (text) {
      this.state = 'failed';
      this.pending = null;
      this.map = null;
      // Si Google ya había dibujado algo (clave inválida), se limpia y queda solo el aviso.
      this.mapEl.innerHTML = '';
      this.wrap.classList.add('is-failed');
      this.msg.hidden = false;
      this.msg.textContent = text;
    }
  };

  function setupLocales() {
    Locales.init();
  }

  /* ---------- Newsletter (simulado, guarda el email en localStorage) ---------- */

  function setupNewsletter() {
    var form = document.getElementById('nl-form');
    var input = document.getElementById('nl-email');
    var msg = document.getElementById('nl-msg');
    var year = document.getElementById('footer-year');
    if (year) { year.textContent = String(new Date().getFullYear()); }
    if (!form || !input || !msg) { return; }

    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var saved = storageGet('em_newsletter', null);
    if (saved && saved.email) {
      msg.textContent = '¡Listo! Ya estás suscripto.';
      msg.className = 'nl__msg is-ok';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();
      if (!EMAIL.test(value)) {
        msg.textContent = 'Ingresá un email válido, por ejemplo nombre@dominio.com.';
        msg.className = 'nl__msg is-error';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      storageSet('em_newsletter', { email: value, at: new Date().toISOString() });
      input.removeAttribute('aria-invalid');
      input.value = '';
      msg.textContent = '¡Listo! Ya estás suscripto.';
      msg.className = 'nl__msg is-ok';
    });
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid')) { input.removeAttribute('aria-invalid'); msg.textContent = ''; msg.className = 'nl__msg'; }
    });
  }

  /* ---------- Router por hash: home, #catalogo/... (listado) y #p/slug (ficha) ---------- */

  function setupRouter() {
    var isListing = function (hash) { return /^#catalogo(\/|$)/.test(hash); };

    function route(opts) {
      opts = opts || {};
      var hash = window.location.hash || '';
      var pm = hash.match(/^#p\/([a-z0-9-]+)$/);
      if (pm) {
        // La ficha se abre encima de la vista que haya (home o listado).
        if (EM.openProduct) { EM.openProduct(pm[1]); }
        return;
      }
      if (EM.closeProductIfOpen) { EM.closeProductIfOpen(); }

      if (isListing(hash)) {
        var next = Listing.fromHash(hash);
        var switched = Views.show('listing');
        if (!EM.products.length) { return; } // se resuelve en em:products
        var same = Listing.rendered && next.genero === Listing.state.genero && next.sub === Listing.state.sub;
        // Al cerrar una ficha el listado se queda como estaba: sin scroll ni redibujar.
        if (opts.fromProduct && same && !switched) { return; }
        Listing.apply(next, {
          animate: !switched && !opts.initial,
          scroll: !same || switched || opts.scroll,
          instant: switched || opts.initial,
          focus: !opts.initial
        });
        return;
      }

      if (Views.show('home')) {
        var target = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
        var home = document.getElementById('home');
        if (target && home && home.contains(target)) { target.scrollIntoView(); } else { window.scrollTo(0, 0); }
      }
    }

    // Entrada directa a un listado: se muestra la vista desde el principio, sin pasar por la home.
    if (isListing(window.location.hash)) { Views.show('listing'); }

    window.addEventListener('hashchange', function (e) {
      var isProduct = /^#p\//.test(window.location.hash);
      var oldHash = '';
      try { oldHash = new URL(e.oldURL).hash; } catch (err) { oldHash = ''; }
      var fromProduct = /^#p\//.test(oldHash);
      if (isProduct && EM.hashBeforeProduct == null) {
        EM.hashBeforeProduct = oldHash || '#inicio';
      } else if (!isProduct) {
        EM.hashBeforeProduct = null;
      }
      route({ fromProduct: fromProduct });
    });

    document.addEventListener('em:products', function () {
      var hash = window.location.hash;
      if (isListing(hash)) {
        route({ initial: true });
        // Con fuentes e imágenes cargadas se vuelve arriba por si el navegador restauró el scroll.
        window.addEventListener('load', function () { if (isListing(window.location.hash)) { window.scrollTo(0, 0); } });
      } else if (/^#p\//.test(hash)) {
        route({});
      }
    });

    // Un link al hash actual no dispara hashchange: se resuelve a mano (vuelve arriba del listado).
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#catalogo"]');
      if (a && a.getAttribute('href') === window.location.hash) {
        e.preventDefault();
        route({ scroll: true });
      }
    });
  }

  /* ---------- Si el usuario cambia "reducir movimiento" en medio de la visita ---------- */

  function watchMotionPreference() {
    if (!mqReduce) { return; }
    var onChange = function (e) {
      EM.reduce = e.matches;
      if (!EM.reduce) {
        html.classList.add('motion-settled');
        var title = $('.hero__title');
        if (title && !title.classList.contains('is-split')) { title.classList.add('is-split'); }
        return;
      }
      $$('.reveal').forEach(revealNow);
      resetParallax();
    };
    if (mqReduce.addEventListener) { mqReduce.addEventListener('change', onChange); }
    else if (mqReduce.addListener) { mqReduce.addListener(onChange); }
  }

  init();
})();
