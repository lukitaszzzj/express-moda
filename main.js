/* ==========================================================
   Express Moda — main.js
   Vanilla JS, sin dependencias. Si algo falla, se quita la clase
   .js del <html> y la página queda estática pero completa.
   ========================================================== */

(function () {
  'use strict';

  var html = document.documentElement;
  var mqReduce = null;
  var reduce = false;
  var revealNow = function (el) { el.classList.add('is-visible'); };
  var resetParallax = function () {};

  try {
    // Le avisa al script inline del head que main.js sí se ejecutó.
    html.classList.add('js-ready');
    mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    reduce = !!(mqReduce && mqReduce.matches);

    splitHeroTitle();
    setupReveal();
    setupParallax();
    setupMarquee();
    setupCatalog();
    watchMotionPreference();
  } catch (err) {
    html.classList.remove('js');
    if (window.console) { console.error('Express Moda: se desactivó el movimiento por un error.', err); }
  }

  /* ---------- Hero: título palabra por palabra ---------- */

  function splitHeroTitle() {
    var title = document.querySelector('.hero__title');
    if (!title) { return; }
    if (reduce) { return; }

    var fullText = title.textContent.replace(/\s+/g, ' ').trim();
    var frag = document.createDocumentFragment();
    var index = 0;

    Array.prototype.forEach.call(title.childNodes, function (node) {
      var italic = node.nodeType === 1 && node.tagName === 'EM';
      var words = node.textContent.split(/\s+/).filter(Boolean);
      words.forEach(function (word) {
        // Las palabras en cursiva conservan su <em>: el énfasis sobrevive aunque falle el resto.
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
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!items.length) { return; }

    if (reduce || !('IntersectionObserver' in window)) {
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
  }

  /* ---------- Parallax (solo transform, en requestAnimationFrame) ---------- */

  function setupParallax() {
    var layers = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!layers.length) { return; }

    var metrics = layers.map(function (el) {
      return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.3, top: 0, height: 0, spare: 0 };
    });
    var vh = window.innerHeight;
    var ticking = false;
    var active = !reduce;

    function measure() {
      vh = window.innerHeight;
      var y = window.pageYOffset;
      metrics.forEach(function (m) {
        var box = m.el.parentElement.getBoundingClientRect();
        m.top = box.top + y;
        m.height = box.height;
        // Margen disponible antes de que la capa deje ver los bordes.
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

  /* ---------- Marquee: botón de pausa ---------- */

  function setupMarquee() {
    var benefits = document.querySelector('.benefits');
    var toggle = benefits && benefits.querySelector('.marquee__toggle');
    if (!toggle) { return; }

    toggle.addEventListener('click', function () {
      var paused = benefits.classList.toggle('is-paused');
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      toggle.setAttribute('aria-label', (paused ? 'Reanudar' : 'Pausar') + ' el movimiento de los beneficios');
    });
  }

  /* ---------- Catálogo: filtros con transición ---------- */

  function setupCatalog() {
    var grid = document.getElementById('grid');
    if (!grid) { return; }

    var buttons = Array.prototype.slice.call(document.querySelectorAll('.filter'));
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
    var status = document.getElementById('filter-status');
    var labels = { todos: 'prendas en total', mujer: 'prendas de mujer', hombre: 'prendas de hombre' };
    var current = 'todos';
    var timer = null;
    var settleTimer = null;

    function hideCard(card) {
      card.hidden = true;
      card.classList.remove('is-leaving', 'is-visible', 'is-settled');
    }

    function setOffsets() {
      var k = 0;
      cards.forEach(function (card) {
        if (card.hidden) { card.classList.remove('is-offset'); return; }
        card.classList.toggle('is-offset', k % 2 === 1);
        k++;
      });
    }

    function setButtons(filter) {
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-filter') === filter ? 'true' : 'false');
      });
    }

    function announce(filter, count) {
      if (status) { status.textContent = 'Mostrando ' + count + ' ' + labels[filter]; }
    }

    function applyFilter(filter, animate) {
      if (!labels[filter]) { filter = 'todos'; }
      if (filter === current && !timer) { return; }
      current = filter;
      setButtons(filter);

      var toShow = cards.filter(function (c) { return filter === 'todos' || c.getAttribute('data-gender') === filter; });
      var toHide = cards.filter(function (c) { return toShow.indexOf(c) === -1; });
      announce(filter, toShow.length);

      if (timer) { clearTimeout(timer); timer = null; }
      if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }

      // Si un filtro anterior todavía estaba animando, las tarjetas que ahora se quedan
      // no pueden seguir "yéndose", y tampoco vuelven a animar su entrada.
      toShow.forEach(function (c) {
        if (c.classList.contains('is-leaving')) {
          c.classList.remove('is-leaving');
          if (!c.hidden) { revealNow(c); c.classList.add('is-settled'); }
        }
      });

      if (!animate || reduce) {
        toHide.forEach(hideCard);
        toShow.forEach(function (c) { c.hidden = false; revealNow(c); });
        setOffsets();
        grid.style.minHeight = '';
        return;
      }

      // Fase 1: las que se van se desvanecen. Se fija la altura para evitar un salto brusco
      // mientras unas salen y otras entran.
      grid.style.minHeight = grid.offsetHeight + 'px';
      var leaving = [];
      toHide.forEach(function (c) {
        if (c.hidden) { return; }
        if (c.classList.contains('is-visible')) {
          c.classList.add('is-leaving');
          leaving.push(c);
        } else {
          // Nunca llegó a mostrarse (estaba fuera de pantalla): se oculta sin destello.
          hideCard(c);
        }
      });

      timer = setTimeout(function () {
        timer = null;
        leaving.forEach(hideCard);
        var entering = [];
        toShow.forEach(function (c) {
          if (c.hidden) {
            c.hidden = false;
            c.classList.remove('is-visible', 'is-settled');
            entering.push(c);
          }
        });
        setOffsets();
        // Fase 2: las nuevas entran escalonadas en el siguiente frame.
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            entering.forEach(function (c, i) {
              c.style.setProperty('--i', i);
              revealNow(c);
            });
            // La altura reservada se libera cuando ya nada se mueve.
            settleTimer = setTimeout(function () {
              settleTimer = null;
              grid.style.minHeight = '';
              entering.forEach(function (c) { c.classList.add('is-settled'); });
            }, 800 + entering.length * 70);
          });
        });
      }, 300);
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { applyFilter(b.getAttribute('data-filter'), true); });
    });

    Array.prototype.forEach.call(document.querySelectorAll('a[data-filter]'), function (link) {
      link.addEventListener('click', function () {
        applyFilter(link.getAttribute('data-filter'), true);
      });
    });

    var hash = window.location.hash.replace('#', '');
    if (hash === 'mujer' || hash === 'hombre') {
      applyFilter(hash, false);
      var catalog = document.getElementById('catalogo');
      if (catalog) { catalog.scrollIntoView(); }
    }

    setOffsets();
  }

  /* ---------- Si el usuario cambia "reducir movimiento" en medio de la visita ---------- */

  function watchMotionPreference() {
    if (!mqReduce) { return; }
    var onChange = function (e) {
      reduce = e.matches;
      if (!reduce) {
        // Volver a animar todo lo que ya está en pantalla sería un parpadeo: se deja quieto.
        html.classList.add('motion-settled');
        var title = document.querySelector('.hero__title');
        if (title && !title.classList.contains('is-split')) { title.classList.add('is-split'); }
        return;
      }
      Array.prototype.forEach.call(document.querySelectorAll('.reveal'), revealNow);
      resetParallax();
    };
    if (mqReduce.addEventListener) { mqReduce.addEventListener('change', onChange); }
    else if (mqReduce.addListener) { mqReduce.addListener(onChange); }
  }
})();
