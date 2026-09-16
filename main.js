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
      setupHeader();
      setupLayers();
      setupSearch();
      setupCatalog();
      setupProduct();
      setupCart();
      setupRecs();
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

  /* ---------- Catálogo: filtros por género y subcategoría, sincronizados con el hash ---------- */

  var SUBCATS = {
    mujer: ['Remeras y tops', 'Blusas y camisas', 'Sacos y blazer', 'Buzos y sweaters', 'Camperas y abrigos', 'Polleras y shorts', 'Jeans', 'Pantalones y calzas', 'Vestidos y monos'],
    hombre: ['Chombas y remeras', 'Camisas', 'Buzos y sweaters', 'Pantalones y bermudas', 'Jeans', 'Camperas, abrigos y sacos', 'Accesorios y complementos']
  };
  var GENEROS = ['todos', 'mujer', 'hombre', 'feria'];

  var Catalog = {
    state: { genero: 'todos', sub: null },
    timer: null,

    init: function () {
      this.grid = document.getElementById('grid');
      this.chips = document.getElementById('chips');
      this.count = document.getElementById('catalog-count');
      this.status = document.getElementById('filter-status');
      this.buttons = $$('.filter[data-genero]');
      if (!this.grid) { return; }
      var self = this;

      this.buttons.forEach(function (b) {
        b.addEventListener('click', function () {
          self.apply({ genero: b.getAttribute('data-genero'), sub: null }, { animate: true });
        });
      });

      if (this.chips) {
        this.chips.addEventListener('click', function (e) {
          var chip = e.target.closest('.chip');
          if (!chip) { return; }
          var value = chip.getAttribute('data-sub');
          var sub = self.state.sub === value ? null : value;
          self.apply({ genero: self.state.genero, sub: sub }, { animate: true });
        });
      }

      document.addEventListener('em:products-error', function () {
        self.grid.innerHTML = '<li class="catalog__empty">No se pudo cargar el catálogo. Abrí la web desde un servidor local o publicada (ver README).</li>';
      });
    },

    // Feria = prendas con precio promocional; su "subcategoría" es el género.
    chipOptions: function (genero) {
      if (genero === 'feria') { return [{ value: 'mujer', label: 'Mujer' }, { value: 'hombre', label: 'Hombre' }]; }
      var names = genero === 'todos' ? SUBCATS.mujer.concat(SUBCATS.hombre) : (SUBCATS[genero] || []);
      var seen = {};
      return names.filter(function (n) { if (seen[n]) { return false; } seen[n] = true; return true; })
        .map(function (n) { return { value: n, label: n }; });
    },

    filtered: function (state) {
      return EM.products.filter(function (p) {
        if (state.genero === 'feria') {
          return !!p.precioPromo && (!state.sub || p.genero === state.sub);
        }
        if (state.genero !== 'todos' && p.genero !== state.genero) { return false; }
        return !state.sub || p.subcategoria === state.sub;
      });
    },

    describe: function (state, n) {
      var text = n + (n === 1 ? ' prenda' : ' prendas');
      if (state.genero === 'feria') {
        text += ' en Feria' + (state.sub ? ' de ' + state.sub : '');
      } else {
        if (state.genero !== 'todos') { text += ' de ' + state.genero; }
        if (state.sub) { text += ' en ' + state.sub; }
      }
      return text;
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

    renderChips: function () {
      if (!this.chips) { return; }
      var state = this.state;
      this.chips.innerHTML = this.chipOptions(state.genero).map(function (o) {
        var on = state.sub === o.value;
        return '<button class="chip" type="button" data-sub="' + esc(o.value) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(o.label) + '</button>';
      }).join('');
    },

    apply: function (state, opts) {
      opts = opts || {};
      if (!this.grid) { return; }
      if (GENEROS.indexOf(state.genero) === -1) { state.genero = 'todos'; }
      var valid = this.chipOptions(state.genero).some(function (o) { return o.value === state.sub; });
      if (!valid) { state.sub = null; }
      this.state = state;

      this.buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-genero') === state.genero ? 'true' : 'false');
      });
      this.renderChips();

      var list = this.filtered(state);
      var text = this.describe(state, list.length);
      if (this.count) { this.count.textContent = text; }
      if (this.status) { this.status.textContent = 'Mostrando ' + text; }

      if (opts.updateHash !== false && window.history && window.history.replaceState) {
        var h = this.hashFor(state);
        if (window.location.hash !== h) { window.history.replaceState(null, '', h); }
      }

      var grid = this.grid;
      var draw = function () {
        if (list.length) {
          renderCards(grid, list, !EM.reduce);
        } else {
          grid.innerHTML = '<li class="catalog__empty">No hay prendas con ese filtro. Probá con otra categoría.</li>';
        }
        grid.classList.remove('is-switching');
      };

      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      if (opts.animate === false || EM.reduce) {
        draw();
      } else {
        grid.classList.add('is-switching');
        var self = this;
        this.timer = setTimeout(function () { self.timer = null; draw(); }, 240);
      }

      if (opts.scroll) {
        var section = document.getElementById('catalogo');
        if (section) { section.scrollIntoView({ block: 'start', behavior: opts.instant ? 'instant' : 'smooth' }); }
        if (opts.instant) { window.requestAnimationFrame(revealInView); }
      }
    }
  };

  function setupCatalog() {
    Catalog.init();
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
        if (window.history.replaceState) { window.history.replaceState(null, '', '#catalogo'); }
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

      document.addEventListener('em:products', function () { self.render(); });

      EM.addToCart = function (p, color, talle, qty) { self.add(p, color, talle, qty); };
      EM.openCart = function () { self.open(); };
      this.render();
    },

    save: function () { storageSet(this.KEY, this.items); },

    lines: function () {
      return this.items.map(function (it) {
        return { item: it, product: EM.byId[it.id] };
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
        this.body.innerHTML = '<ul class="cart-list">' + lines.map(function (l, i) {
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
                  '<button type="button" data-cart-qty="-1" data-index="' + i + '" aria-label="Restar una unidad">&minus;</button>' +
                  '<output>' + it.qty + '</output>' +
                  '<button type="button" data-cart-qty="1" data-index="' + i + '" aria-label="Sumar una unidad">+</button>' +
                '</div>' +
                '<span class="cart-item__price">' + fmt(self.unit(p) * it.qty) + '</span>' +
              '</div>' +
              '<button class="link-btn cart-item__remove" type="button" data-cart-remove="' + i + '">Quitar<span class="visually-hidden"> ' + esc(p.nombre) + '</span></button>' +
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
      renderCards(this.grid, list, true);
    }
  };

  function setupRecs() {
    Recs.init();
  }

  /* ---------- Router por hash: #catalogo/..., #p/slug ---------- */

  function setupRouter() {
    function route(opts) {
      opts = opts || {};
      var hash = window.location.hash || '';
      var pm = hash.match(/^#p\/([a-z0-9-]+)$/);
      if (pm) {
        if (EM.openProduct) { EM.openProduct(pm[1]); }
        return;
      }
      if (EM.closeProductIfOpen) { EM.closeProductIfOpen(); }
      if (/^#catalogo/.test(hash)) {
        Catalog.apply(Catalog.fromHash(hash), { animate: opts.animate !== false, scroll: opts.scroll !== false, instant: !!opts.instant, updateHash: false });
      }
    }

    window.addEventListener('hashchange', function (e) {
      var isProduct = /^#p\//.test(window.location.hash);
      if (isProduct && EM.hashBeforeProduct == null) {
        try { EM.hashBeforeProduct = new URL(e.oldURL).hash || '#inicio'; } catch (err) { EM.hashBeforeProduct = '#inicio'; }
      } else if (!isProduct) {
        EM.hashBeforeProduct = null;
      }
      route({ scroll: !isProduct });
    });

    document.addEventListener('em:products', function () {
      if (/^#catalogo/.test(window.location.hash)) {
        // Al entrar con un link profundo el scroll es instantáneo: el suave se pierde
        // mientras todavía cargan fuentes e imágenes. Se repite al terminar la carga.
        route({ scroll: true, animate: false, instant: true });
        window.addEventListener('load', function () {
          if (/^#catalogo/.test(window.location.hash)) { route({ scroll: true, animate: false, instant: true }); }
        });
      } else {
        Catalog.apply({ genero: 'todos', sub: null }, { animate: false, updateHash: false });
        if (/^#p\//.test(window.location.hash)) { route({}); }
      }
    });

    // Un link al hash actual no dispara hashchange: se resuelve a mano.
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
