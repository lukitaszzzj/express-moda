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

  try {
    html.classList.add('js-ready');
    mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    EM.reduce = !!(mqReduce && mqReduce.matches);

    splitHeroTitle();
    setupReveal();
    setupParallax();
    setupMarquee();
    setupHeader();
    setupLayers();
    setupSearch();
    setupCatalog();
    watchMotionPreference();
    loadProducts();
  } catch (err) {
    html.classList.remove('js');
    if (window.console) { console.error('Express Moda: se desactivó el movimiento por un error.', err); }
  }

  /* ---------- Utilidades ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function fmt(n) {
    return '$' + Math.round(n).toLocaleString('es-AR');
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
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
      .filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
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
      else { window.addEventListener('resize', publish); }
    }
  }

  /* ---------- Header: mega menús y menú móvil ---------- */

  function setupHeader() {
    var nav = $('.nav');
    var megaBtns = $$('.nav__item--mega > .nav__link');
    var hoverTimer = null;
    var canHover = function () { return window.matchMedia && window.matchMedia('(hover: hover)').matches; };

    function setMega(btn, open) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
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

    // Menú móvil
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
      var done = function () { el.hidden = true; };
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
        closeLayer(closer.closest('.modal, .overlay, .drawer-wrap'));
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

  /* ---------- Catálogo (estático, con los filtros Todos / Mujer / Hombre) ---------- */

  function setupCatalog() {
    var grid = document.getElementById('grid');
    if (!grid) { return; }

    var buttons = $$('.filter');
    var cards = $$('.card', grid);
    var status = document.getElementById('filter-status');
    var labels = { todos: 'prendas en total', mujer: 'prendas de mujer', hombre: 'prendas de hombre' };
    var current = 'todos';
    var timer = null;

    function setOffsets() {
      var k = 0;
      cards.forEach(function (card) {
        if (card.hidden) { card.classList.remove('is-offset'); return; }
        card.classList.toggle('is-offset', k % 2 === 1);
        k++;
      });
    }

    function applyFilter(filter, animate) {
      if (!labels[filter]) { filter = 'todos'; }
      current = filter;
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-filter') === filter ? 'true' : 'false');
      });
      var toShow = cards.filter(function (c) { return filter === 'todos' || c.getAttribute('data-gender') === filter; });
      if (status) { status.textContent = 'Mostrando ' + toShow.length + ' ' + labels[filter]; }
      if (timer) { clearTimeout(timer); timer = null; }

      var swap = function () {
        cards.forEach(function (c) {
          var show = toShow.indexOf(c) !== -1;
          if (c.hidden && show) { c.classList.remove('is-visible', 'is-settled'); }
          c.hidden = !show;
        });
        setOffsets();
        toShow.forEach(function (c, i) { c.style.setProperty('--i', i); revealNow(c); });
        grid.classList.remove('is-switching');
      };

      if (!animate || EM.reduce) { swap(); return; }
      grid.classList.add('is-switching');
      timer = setTimeout(function () { timer = null; swap(); }, 260);
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { applyFilter(b.getAttribute('data-filter'), true); });
    });
    $$('a[data-filter]').forEach(function (link) {
      link.addEventListener('click', function () { applyFilter(link.getAttribute('data-filter'), true); });
    });

    var hash = window.location.hash.replace('#', '');
    var m = hash.match(/^catalogo\/(mujer|hombre)/);
    if (m) {
      applyFilter(m[1], false);
      var catalog = document.getElementById('catalogo');
      if (catalog) { catalog.scrollIntoView(); }
    }
    setOffsets();
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
})();
