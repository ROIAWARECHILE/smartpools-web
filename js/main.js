/* Smart Pools — coreografía de la página
   Curva firma: "pool" (salida rápida, llegada muy suave). Scrubs en "none". */
(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase, Flip);
  CustomEase.create('pool', 'M0,0 C0.22,1 0.36,1 1,1');
  gsap.defaults({ ease: 'pool' });
  ScrollTrigger.config({ ignoreMobileResize: true });

  var q = function (s, el) { return (el || document).querySelector(s); };
  var qa = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var water = window.SmartWater || { state: { zoom: 0, rise: 0 }, hero: { ok: false, readyPromise: Promise.resolve(false) }, boostBubbles: function () {} };

  /* ---------------- configuración ----------------
     El número de WhatsApp va sin "+" ni espacios. */
  var CONFIG = {
    phone: '+56 9 5312 9916',
    whatsapp: '56953129916',
    // Endpoint que recibe el formulario (por ejemplo https://formspree.io/f/xxxxxxx).
    // Si queda vacío, el formulario arma el mensaje y lo abre en WhatsApp.
    formEndpoint: ''
  };
  function waUrl(text) {
    return 'https://wa.me/' + CONFIG.whatsapp + (text ? '?text=' + encodeURIComponent(text) : '');
  }
  qa('a[href^="https://wa.me/"]').forEach(function (a) {
    if (!a.classList.contains('modal__wa')) a.href = waUrl(a.classList.contains('wa') ? 'Hola, quiero cotizar una piscina de fibra de vidrio.' : '');
  });
  qa('a[href^="tel:"]').forEach(function (a) { a.href = 'tel:' + CONFIG.phone.replace(/\s/g, ''); a.textContent = CONFIG.phone; });
  qa('.wa-link').forEach(function (a) { a.textContent = CONFIG.phone; });

  /* ---------------- scroll suave ---------------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  function heroGated() { return document.documentElement.classList.contains('is-gated'); }
  var heroDescend = null; // la define el bloque del hero

  function scrollToTarget(target) {
    if (heroGated() && heroDescend) { heroDescend(function () { scrollToTarget(target); }); return; }
    if (lenis) lenis.scrollTo(target, { offset: typeof target === 'number' ? 0 : -8, duration: 1.6, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------------- menú móvil ---------------- */
  var body = document.body;
  var burger = q('.nav__burger');
  var menu = q('#menu');
  var menuOpen = false;
  var menuTl = gsap.timeline({ paused: true })
    .set(menu, { visibility: 'visible' })
    .fromTo(menu, { clipPath: 'circle(0% at calc(100% - 38px) 38px)' }, { clipPath: 'circle(150% at calc(100% - 38px) 38px)', duration: 0.7, ease: 'power3.inOut' })
    .from(qa('.menu__links a, .menu .btn'), { y: 30, autoAlpha: 0, duration: 0.5, stagger: 0.05 }, 0.3);
  function setMenu(open) {
    menuOpen = open;
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.setAttribute('aria-hidden', String(!open));
    if (open) { menuTl.timeScale(1).play(); if (lenis) lenis.stop(); }
    else { menuTl.timeScale(1.6).reverse(); if (lenis && !heroGated()) lenis.start(); }
  }
  burger.addEventListener('click', function () { setMenu(!menuOpen); });

  // anclas internas con scroll suave
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.closest('.modal')) return;
    var id = a.getAttribute('href');
    var el = id.length > 1 ? q(id) : null;
    if (!el) return;
    e.preventDefault();
    if (menuOpen) setMenu(false);
    scrollToTarget(id === '#inicio' ? 0 : el);
  });

  /* ---------------- hero: video de la inmersión ---------------- */
  var heroEl = q('.hero');
  // el video del descenso solo en pantallas horizontales; en vertical, foto real con texto
  var videoHero = !window.matchMedia('(max-width: 760px), (orientation: portrait) and (max-width: 1100px)').matches;
  var seqEl = q('.seq');
  var vid = q('.seq__video');
  var poster = q('.seq__poster');
  var bgDeep = q('.seq__bg--deep');
  var hots = qa('.hot');
  var SEQ_RATIO = 1280 / 720;
  function fitSeq() {
    // escritorio: el video entero (contain) con el mismo cuadro desenfocado de fondo; vertical: cover
    var W = heroEl.clientWidth, H = heroEl.clientHeight, w, h;
    var portrait = W < H;
    if ((W / H > SEQ_RATIO) !== portrait) { h = H; w = H * SEQ_RATIO; } else { w = W; h = W / SEQ_RATIO; }
    seqEl.style.width = w + 'px'; seqEl.style.height = h + 'px';
    seqEl.style.left = (W - w) / 2 + 'px'; seqEl.style.top = (H - h) / 2 + 'px';
  }
  fitSeq();
  window.addEventListener('resize', fitSeq);
  var curPhase = '';
  function setPhase(ph) {
    if (ph === curPhase) return;
    curPhase = ph;
    hots.forEach(function (a) { a.classList.toggle('is-live', a.dataset.ph === 'all' || a.dataset.ph === ph); });
  }
  setPhase('surface');
  var heroReadyPromise = new Promise(function (res) {
    var first = videoHero ? poster : q('.hero__m-bg');
    if (first.complete) res(); else { first.addEventListener('load', res, { once: true }); first.addEventListener('error', res, { once: true }); }
  });

  /* ---------------- catálogo de modelos ---------------- */
  // Medidas, tamaños y precios tomados de las fichas técnicas (láminas) de Smart Pools.
  // prices: [Proyecto Estándar, Proyecto Con Bordes, Proyecto Climatizado], valores "desde" con IVA.
  // Fotos en assets/modelos/<slug>-N-card|full.webp
  var MODELS = [
{ slug: 'los-roques', name: 'Los Roques', badge: 'Más vendido', size: 'XL', cat: ['xl'], W: 3.4, L: 10, Dmin: 1.2, D: 1.8, prices: [4990000, 6790000, 8690000], photos: 2,
      eyebrow: 'Tamaño XL · rectangular con escalera de esquina',
      desc: 'Diseño equilibrado y funcional.', long: 'Diseño equilibrado, elegante y funcional. La escalera de esquina deja libre el largo completo para nadar.',
      features: ['Escalera de esquina integrada', 'Banca de descanso', 'Zona de nado libre', 'Preparada para luz LED'] },
{ slug: 'praia', name: 'Praia', size: 'XL', cat: ['xl'], W: 4.0, L: 12, Dmin: 0.9, D: 2.0, prices: [7490000, 9490000, 11890000], photos: 4,
      eyebrow: 'Tamaño XL · la más amplia',
      desc: 'Mayor amplitud para disfrutar en familia.', long: 'Nuestro formato más amplio, pensado para disfrutar en familia y para nadar largo sin interrupciones.',
      features: ['12 metros de largo', 'Escalera de ancho completo', 'Zona profunda de 2,0 m', 'Playa de entrada de 0,9 m'] },
{ slug: 'dubai', name: 'Dubai', badge: 'Con spa', size: 'XL', cat: ['xl', 'diseno'], W: 3.5, L: 10, Dmin: 0.7, D: 1.8, prices: [5490000, 7290000, 9190000], photos: 3,
      eyebrow: 'Tamaño XL · piscina + spa circular',
      desc: 'Piscina y spa circular en una sola pieza.', long: 'Un formato distintivo: la zona de nado rectangular se une a un spa circular con banca, todo en una sola pieza de fibra.',
      features: ['Spa circular integrado', 'Banca perimetral en el spa', 'Escalera de ancho completo', 'Preparada para hidromasaje'] },
{ slug: 'ipanema', name: 'Ipanema', size: 'XL', cat: ['xl'], W: 3.4, L: 10.5, Dmin: 1.3, D: 2.0, prices: [5990000, 7790000, 9690000], photos: 6,
      eyebrow: 'Tamaño XL · la más larga',
      desc: 'Diseño versátil para distintos proyectos.', long: 'Versátil y fácil de integrar en distintos tipos de proyecto, con escalera frontal y una zona de juego poco profunda.',
      features: ['10,5 metros de largo', 'Escalera frontal', 'Zona profunda de 2,0 m', 'Banca de descanso'] },
{ slug: 'santorini', name: 'Santorini', size: 'L', cat: ['familiares'], W: 3.3, L: 7.5, Dmin: 1.1, D: 1.7, prices: [4990000, 6490000, 8290000], photos: 5,
      eyebrow: 'Tamaño L · con banca lateral',
      desc: 'Escalera y banca lateral para descansar.', long: 'Una escalera lateral que se convierte en banca a lo largo de un costado: perfecta para conversar dentro del agua sin ocupar la zona de nado.',
      features: ['Banca lateral continua', 'Escalera integrada', 'Zona de nado libre', 'Preparada para luz LED'] },
{ slug: 'mykonos', name: 'Mykonos', size: 'M', cat: ['familiares'], W: 3.0, L: 6.0, Dmin: 1.1, D: 1.6, prices: [3790000, 4990000, 6490000], photos: 3,
      eyebrow: 'Tamaño M · con escalera amplia',
      desc: 'Escalera amplia para entrar con calma.', long: 'Una escalera amplia de peldaños anchos y una banca de descanso hacen de Mykonos una piscina cómoda para toda la familia.',
      features: ['Escalera de peldaños anchos', 'Banca de descanso', 'Fondo con pendiente suave', 'Preparada para luz LED'] },
{ slug: 'catalonia', name: 'Catalonia', size: 'L', cat: ['familiares'], W: 3.4, L: 8.0, Dmin: 1.2, D: 1.7, prices: [4390000, 5890000, 7690000], photos: 5,
      eyebrow: 'Tamaño L · rectangular clásica',
      desc: 'La rectangular clásica, con escalera frontal.', long: 'Líneas rectas y escalera frontal de ancho completo. Un clásico que combina con cualquier estilo de jardín.',
      features: ['Escalera frontal de ancho completo', 'Zona de nado libre', 'Fondo con pendiente suave', 'Preparada para luz LED'] },
{ slug: 'krabi', name: 'Krabi', size: 'L', cat: ['familiares'], W: 3.4, L: 8.0, Dmin: 1.0, D: 1.8, prices: [4690000, 6190000, 7990000], photos: 4,
      eyebrow: 'Tamaño L · con escalera lateral',
      desc: 'Escalera lateral que libera el largo.', long: 'La escalera va en un costado, así el largo completo queda libre para nadar. Una banca en el extremo invita a quedarse.',
      features: ['Escalera lateral', 'Banca en el extremo', 'Zona de nado libre', 'Preparada para luz LED'] },
{ slug: 'tulum', name: 'Tulum', size: 'M', cat: ['familiares'], W: 3.0, L: 6.0, Dmin: 1.2, D: 1.7, prices: [3690000, 4890000, 6390000], photos: 2,
      eyebrow: 'Tamaño M · proporción equilibrada',
      desc: 'Proporción justa para patios medianos.', long: 'Pensada para patios medianos: 6 m de largo, escalera frontal y una banca para descansar al sol.',
      features: ['Escalera frontal con banca', 'Zona de nado libre', 'Fondo con pendiente suave', 'Preparada para luz LED'] },
{ slug: 'buzios', name: 'Buzios', size: 'M', cat: ['familiares'], W: 3.0, L: 5.5, Dmin: 1.2, D: 1.6, prices: [3590000, 4690000, 6190000], photos: 3,
      eyebrow: 'Tamaño M · compacta y cómoda',
      desc: 'Compacta por fuera, amplia por dentro.', long: 'Aprovecha cada metro: 5,5 m de largo con escalera frontal de peldaños anchos y una zona central despejada. Cabe en la mayoría de los patios.',
      features: ['Escalera frontal', 'Banca de descanso', 'Zona de nado libre', 'Preparada para luz LED'] },
{ slug: 'mancora', name: 'Mancora', size: 'L', cat: ['familiares', 'diseno'], W: 3.4, L: 7.4, Dmin: 1.0, D: 1.6, prices: [4590000, 5890000, 7690000], photos: 5,
      eyebrow: 'Tamaño L · forma libre',
      desc: 'Curvas suaves con zona de descanso redonda.', long: 'Una forma libre con un extremo redondeado que funciona como zona de descanso. Se integra de manera natural al jardín.',
      features: ['Extremo circular de descanso', 'Escalera integrada', 'Curvas suaves', 'Preparada para luz LED'] },
{ slug: 'floripa', name: 'Floripa', size: 'L', cat: ['familiares', 'diseno'], W: 3.3, L: 8.3, Dmin: 0.8, D: 1.7, prices: [4990000, 6490000, 8290000], photos: 5,
      eyebrow: 'Tamaño L · doble espacio',
      desc: 'Zona de nado y zona de descanso circular.', long: 'Dos espacios en una pieza: un tramo recto para nadar y una zona circular más baja para descansar y para los niños.',
      features: ['Zona circular de descanso', 'Escalera de ancho completo', 'Dos profundidades', 'Preparada para hidromasaje'] },
{ slug: 'maui', name: 'Maui', size: 'S', cat: ['compactas'], W: 2.5, L: 4.0, Dmin: 1.2, D: 1.2, prices: [2990000, 3790000, 5290000], photos: 5,
      eyebrow: 'Tamaño S · con escalera y banca',
      desc: 'Compacta con escalera y banca de descanso.', long: 'Un formato compacto de 4 × 2,5 m que no renuncia a nada: escalera de esquina, banca de descanso y profundidad uniforme de 1,2 m.',
      features: ['Escalera de esquina', 'Banca de descanso', 'Zona central despejada', 'Preparada para luz LED'] },
{ slug: 'rio', name: 'Rio', size: 'M', cat: ['familiares'], W: 3.4, L: 7.0, Dmin: 1.2, D: 1.75, prices: [3990000, 5390000, 7190000], photos: 5,
      eyebrow: 'Tamaño M · rectangular',
      desc: 'Rectangular de 7 m con escalera frontal.', long: 'Rectangular, sencilla y eficiente: 7 m de largo y 1,75 m en la zona profunda. La escalera frontal de ancho completo deja el resto libre para nadar.',
      features: ['Escalera frontal de ancho completo', 'Zona de nado libre', 'Fondo plano', 'Preparada para luz LED'] },
{ slug: 'san-alfonso', name: 'San Alfonso', size: 'S', cat: ['compactas'], W: 2.5, L: 5.0, Dmin: 1.1, D: 1.35, prices: [3290000, 4390000, 5990000], photos: 5,
      eyebrow: 'Tamaño S · para patios pequeños',
      desc: 'Pensada para patios pequeños.', long: 'La solución para patios pequeños: entra donde otras no caben, con escalera frontal y una banca para sentarse a conversar.',
      features: ['Escalera frontal', 'Banca de descanso', 'Fondo plano', 'Preparada para luz LED'] },
{ slug: 'camboriu', name: 'Camboriu', size: 'S', cat: ['compactas'], W: 2.5, L: 3.5, Dmin: 1.1, D: 1.5, prices: [2990000, 3790000, 5290000], photos: 5,
      eyebrow: 'Tamaño S · la más pequeña rectangular',
      desc: 'La rectangular más pequeña de la familia.', long: 'Nuestra rectangular más pequeña: 3,5 × 2,5 m. Ideal para refrescarse, para los niños y para patios donde el espacio manda.',
      features: ['Escalera integrada', 'Fondo plano', 'Instalación rápida', 'Preparada para luz LED'] },
{ slug: 'ibiza', name: 'Ibiza', badge: 'Spa', size: 'S', cat: ['compactas', 'diseno'], W: 2.5, L: 2.5, Dmin: 1.0, D: 1.0, prices: [1990000, 2790000, 3990000], photos: 5,
      eyebrow: 'Tamaño S · spa octogonal',
      desc: 'Spa octogonal de 2,5 m con banca perimetral.', long: 'Un spa octogonal de 2,5 × 2,5 m y 1 m de profundidad, con banca perimetral y escalones interiores. Para relajarse, conversar y, si quieres, sumar hidromasaje.',
      features: ['Banca perimetral', 'Escalones interiores', 'Preparada para hidromasaje', 'Preparada para climatización'] }
  ];
  MODELS.forEach(function (m) {
    m.img = 'assets/modelos/' + m.slug + '-1-card.webp';
    m.gallery = [];
    for (var k = 1; k <= m.photos; k++) m.gallery.push('assets/modelos/' + m.slug + '-' + k);
  });
  var INITIAL_CARDS = 8;
  var ICON = {
    W: '<svg viewBox="0 0 24 24"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>',
    L: '<svg viewBox="0 0 24 24"><path d="M12 4v16M8 4h8M8 20h8"/></svg>',
    D: '<svg viewBox="0 0 24 24"><path d="M12 3v9M8.5 8.5 12 12l3.5-3.5M4 16.5c1.4.9 2.6.9 4 0s2.6-.9 4 0 2.6.9 4 0 2.6-.9 4 0M4 20.5c1.4.9 2.6.9 4 0s2.6-.9 4 0 2.6.9 4 0 2.6-.9 4 0"/></svg>',
    S: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h4M7 14h7"/></svg>'
  };
  var ARROW = '<svg class="i-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var fmt0 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
  var fmt1 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var fmt2 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function clp(v) { return '$' + fmt0.format(v); }
  var SIZE_NAME = { S: 'Compacta', M: 'Mediana', L: 'Grande', XL: 'Extra grande' };
  function clp(v) { return '$' + fmt0.format(v); }
  var SIZE_NAME = { S: 'Compacta', M: 'Mediana', L: 'Grande', XL: 'Extra grande' };
  function clp(v) { return '$' + fmt0.format(v); }
  var SIZE_NAME = { S: 'Compacta', M: 'Mediana', L: 'Grande', XL: 'Extra grande' };
  function meters(v) { return (v >= 10 && Number.isInteger(v) ? String(v) : fmt1.format(v)) + ' m'; }
  function specRow(icon, val, label) {
    return '<div class="spec2"><span class="spec2__i">' + ICON[icon] + '</span><span><b>' + val + '</b><small>' + label + '</small></span></div>';
  }
  function specs(m) {
    return specRow('W', meters(m.W), 'Ancho') + specRow('L', meters(m.L), 'Largo') + specRow('D', meters(m.D), 'Profundidad');
  }

  var grid = q('.cat__grid');
  var select = q('.form__model');
  var showAll = false;
  MODELS.forEach(function (m, i) {
    var a = document.createElement('article');
    a.className = 'mcard' + (i === 0 ? ' is-active' : '');
    a.dataset.i = i;
    a.dataset.cat = m.cat.join(' ');
    if (i >= INITIAL_CARDS) a.style.display = 'none';
    a.innerHTML =
      '<div class="mcard__img"><img src="' + m.img + '" srcset="' + m.img.replace('-1-card.webp', '-1-card-sm.webp') + ' 450w, ' + m.img + ' 900w" sizes="(max-width: 760px) 92vw, (max-width: 1100px) 44vw, 300px" alt="Piscina ' + m.name + '" loading="lazy" width="900" height="600"></div>' +
      '<div class="mcard__body">' +
        '<div class="mcard__top"><h3>' + m.name + '</h3><span class="badge badge--size">' + m.size + '</span>' + (m.badge ? '<span class="badge">' + m.badge + '</span>' : '') +
        '<button type="button" class="mcard__go" aria-label="Ver ficha de ' + m.name + '">' + ARROW + '</button></div>' +
        '<p>' + m.desc + '</p>' +
        '<p class="mcard__price"><small>Desde</small> ' + clp(m.prices[0]) + '</p>' +
        '<a class="mcard__quote" href="#contacto" data-model="' + m.name + '">Cotizar este modelo ' + ARROW + '</a>' +
        '<div class="mcard__specs">' + specs(m) + '</div>' +
      '</div>';
    grid.appendChild(a);
    var o = document.createElement('option');
    o.value = m.name; o.textContent = m.name;
    select.appendChild(o);
  });
  q('.cat__all .cat__all-n').textContent = MODELS.length;

  // modelo destacado
  var featImg = q('.feat__img'), featTitle = q('.feat__title'), featBadge = q('.feat__badge'),
      featDesc = q('.feat__desc'), featSpecs = q('.feat__specs'), dotsEl = q('.feat__dots');
  var featIdx = 0;
  var FEATURED = [0, 1, 2, 11, 16];   // los que rotan arriba
  FEATURED.forEach(function (i, k) {
    var d = document.createElement('button');
    d.type = 'button';
    d.setAttribute('aria-label', 'Ver ' + MODELS[i].name);
    d.innerHTML = '<i></i>';
    if (k === 0) d.classList.add('is-active');
    d.addEventListener('click', function () { setFeatured(i); restartAuto(); });
    dotsEl.appendChild(d);
    var pre = new Image(); pre.src = MODELS[i].img;
  });
  fillFeatured(MODELS[0]);

  function fillFeatured(m) {
    featTitle.textContent = m.name;
    featBadge.textContent = m.badge || '';
    featBadge.hidden = !m.badge;
    featDesc.textContent = m.long;
    featSpecs.innerHTML = specs(m);
    q('.feat__price').innerHTML = '<small>Proyecto estándar desde</small>' + clp(m.prices[0]);
    featImg.src = m.img;
    featImg.alt = 'Piscina ' + m.name;
  }
  function setFeatured(i) {
    if (i === featIdx) return;
    featIdx = i;
    var m = MODELS[i];
    qa('button', dotsEl).forEach(function (d, k) { d.classList.toggle('is-active', FEATURED[k] === i); });
    qa('.mcard').forEach(function (c) { c.classList.toggle('is-active', Number(c.dataset.i) === i); });
    if (reduce) { fillFeatured(m); return; }
    gsap.timeline()
      .to('.feat__info > :not(.feat__dots)', { autoAlpha: 0, x: -16, duration: 0.25, stagger: 0.03, ease: 'power2.in' }, 0)
      .to(featImg, { autoAlpha: 0, scale: 0.94, duration: 0.35, ease: 'power2.in' }, 0)
      .add(function () { fillFeatured(m); })
      .fromTo(featImg, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.9 })
      .fromTo('.feat__info > :not(.feat__dots)', { autoAlpha: 0, x: 16 }, { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.05 }, '<0.1');
  }
  // rota solo mientras la sección está a la vista y nadie la está mirando con el mouse
  var autoTimer = null, catVisible = false, hovering = false;
  function restartAuto() {
    clearTimeout(autoTimer);
    if (reduce || !catVisible || hovering || modalOpen) return;
    autoTimer = setTimeout(function () {
      var k = FEATURED.indexOf(featIdx);
      setFeatured(FEATURED[(k + 1) % FEATURED.length]);
      restartAuto();
    }, 6000);
  }
  q('.cat__top').addEventListener('pointerenter', function () { hovering = true; clearTimeout(autoTimer); });
  q('.cat__top').addEventListener('pointerleave', function () { hovering = false; restartAuto(); });

  grid.addEventListener('click', function (e) {
    var qlink = e.target.closest('.mcard__quote');
    if (qlink) { var sel = q('.form__model'); if (sel) sel.value = qlink.dataset.model; return; }
    var card = e.target.closest('.mcard');
    if (card) openModal(Number(card.dataset.i));
  });
  q('.feat__cta').addEventListener('click', function () { openModal(featIdx); });

  // filtros con Flip
  var chips = q('.chips');
  var pill = document.createElement('span');
  pill.className = 'chips__pill';
  chips.prepend(pill);
  function placePill(chip, animate) {
    var v = { x: chip.offsetLeft, y: chip.offsetTop - 4, width: chip.offsetWidth };
    if (animate && !reduce) gsap.to(pill, { x: v.x, y: v.y, width: v.width, duration: 0.5, ease: 'power3.inOut' });
    else gsap.set(pill, v);
  }
  placePill(q('.chip.is-active'), false);
  window.addEventListener('resize', function () { placePill(q('.chip.is-active'), false); });
  function currentFilter() { return q('.chip.is-active').dataset.filter; }
  function layoutCards(f) {
    var cards = qa('.mcard');
    var state = Flip.getState(cards);
    var shown = 0;
    cards.forEach(function (c, i) {
      var on = (f === 'all' || c.dataset.cat.split(' ').indexOf(f) !== -1) && (showAll || f !== 'all' || i < INITIAL_CARDS);
      c.style.display = on ? '' : 'none';
      if (on) shown++;
    });
    q('.cat__empty').hidden = shown > 0;
    q('.cat__all').hidden = showAll || f !== 'all';
    if (reduce) { ScrollTrigger.refresh(); return; }
    Flip.from(state, {
      duration: 0.6, ease: 'power3.inOut', absolute: true, scale: true,
      onEnter: function (els) { return gsap.fromTo(els, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.03 }); },
      onLeave: function (els) { return gsap.to(els, { autoAlpha: 0, scale: 0.9, duration: 0.35 }); },
      onComplete: function () { ScrollTrigger.refresh(); }
    });
  }
  function applyFilter(chip) {
    if (!chip || chip.classList.contains('is-active')) return;
    qa('.chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
    placePill(chip, true);
    layoutCards(chip.dataset.filter);
  }
  chips.addEventListener('click', function (e) { applyFilter(e.target.closest('.chip')); });
  q('.cat__all').addEventListener('click', function (e) {
    e.preventDefault();
    showAll = true;
    layoutCards(currentFilter());
  });

  /* ---------------- ficha de modelo ---------------- */
  var modal = q('#modelo-modal');
  var modalOpen = false, modalIdx = 0, modalPhoto = 0, lastFocus = null;
  var mImg = q('.modal__img'), mBadge = q('.modal__badge'), mEyebrow = q('.modal__eyebrow'), mTitle = q('.modal__title'),
      mDesc = q('.modal__desc'), mSpecs = q('.modal__specs'), mFeat = q('.modal__features'), mWa = q('.modal__wa'),
      mPrev = q('.modal__prev'), mNext = q('.modal__next'), mThumbs = q('.modal__thumbs');
  function setPhoto(k, animate) {
    var m = MODELS[modalIdx];
    modalPhoto = k;
    qa('button', mThumbs).forEach(function (b, i) { b.classList.toggle('is-active', i === k); });
    if (animate && !reduce) {
      gsap.timeline()
        .to(mImg, { autoAlpha: 0, scale: 1.03, duration: 0.2, ease: 'power2.in' })
        .add(function () { mImg.src = m.gallery[k] + '-full.webp'; })
        .to(mImg, { autoAlpha: 1, scale: 1, duration: 0.5 });
    } else {
      mImg.src = m.gallery[k] + '-full.webp';
    }
  }
  function fillModal(i) {
    var m = MODELS[i];
    modalIdx = i;
    mImg.alt = 'Piscina ' + m.name;
    mBadge.textContent = m.badge || ''; mBadge.hidden = !m.badge;
    mEyebrow.textContent = m.eyebrow;
    mTitle.textContent = m.name;
    mDesc.textContent = m.long;
    mSpecs.innerHTML = specRow('W', meters(m.W), 'Ancho') + specRow('L', meters(m.L), 'Largo') +
      specRow('D', m.Dmin === m.D ? meters(m.D) : meters(m.Dmin) + ' – ' + meters(m.D), 'Profundidad') + specRow('S', 'Tamaño ' + m.size, SIZE_NAME[m.size]);
    mFeat.innerHTML = m.features.map(function (f) { return '<li>' + f + '</li>'; }).join('');
    qa('.modal__tier', modal).forEach(function (t, k) { t.querySelector('b').textContent = clp(m.prices[k]); });
    qa('.modal__tier', modal).forEach(function (t, k) { t.querySelector('b').textContent = clp(m.prices[k]); });
    qa('.modal__tier', modal).forEach(function (t, k) { t.querySelector('b').textContent = clp(m.prices[k]); });
    mWa.href = waUrl('Hola, me interesa el modelo ' + m.name + ' (' + meters(m.L) + ' × ' + meters(m.W) + ', tamaño ' + m.size + '). ¿Me pueden enviar una cotización?');
    mPrev.querySelector('span').textContent = MODELS[(i + MODELS.length - 1) % MODELS.length].name;
    mNext.querySelector('span').textContent = MODELS[(i + 1) % MODELS.length].name;
    mThumbs.innerHTML = m.gallery.map(function (g, k) {
      return '<button type="button" class="' + (k === 0 ? 'is-active' : '') + '" aria-label="Foto ' + (k + 1) + ' de ' + m.name + '"><img src="' + g + '-card.webp" alt="" loading="lazy"></button>';
    }).join('');
    mThumbs.hidden = m.gallery.length < 2;
    setPhoto(0, false);
    m.gallery.forEach(function (g) { var pre = new Image(); pre.src = g + '-full.webp'; });
  }
  mThumbs.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) setPhoto(qa('button', mThumbs).indexOf(b), true);
  });
  function openModal(i) {
    fillModal(i);
    if (!modalOpen) {
      modalOpen = true;
      lastFocus = document.activeElement;
      body.classList.add('modal-open');
      modal.setAttribute('aria-hidden', 'false');
      if (lenis) lenis.stop();
      clearTimeout(autoTimer);
      gsap.timeline()
        .set(modal, { visibility: 'visible' })
        .to('.modal__backdrop', { autoAlpha: 1, duration: 0.4 }, 0)
        .to('.modal__card', { autoAlpha: 1, y: 0, scale: 1, duration: reduce ? 0 : 0.6 }, 0.05)
        .from('.modal__body > *', { y: 16, autoAlpha: 0, duration: reduce ? 0 : 0.5, stagger: 0.05 }, 0.2);
      q('.modal__close').focus();
    }
  }
  function swapModal(i) {
    if (reduce) { fillModal(i); return; }
    gsap.timeline()
      .to('.modal__media, .modal__body > *', { autoAlpha: 0, y: -10, duration: 0.2, ease: 'power2.in' })
      .add(function () { fillModal(i); })
      .to('.modal__media, .modal__body > *', { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.04 });
  }
  function closeModal() {
    if (!modalOpen) return;
    modalOpen = false;
    body.classList.remove('modal-open');
    modal.setAttribute('aria-hidden', 'true');
    if (lenis && !heroGated()) lenis.start();
    gsap.timeline()
      .to('.modal__card', { autoAlpha: 0, y: 30, scale: 0.96, duration: reduce ? 0 : 0.35, ease: 'power2.in' }, 0)
      .to('.modal__backdrop', { autoAlpha: 0, duration: 0.35 }, 0.05)
      .set(modal, { visibility: 'hidden' });
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    restartAuto();
  }
  qa('[data-close]', modal).forEach(function (el) { el.addEventListener('click', closeModal); });
  mPrev.addEventListener('click', function () { swapModal((modalIdx + MODELS.length - 1) % MODELS.length); });
  mNext.addEventListener('click', function () { swapModal((modalIdx + 1) % MODELS.length); });
  q('.modal__quote').addEventListener('click', function (e) {
    e.preventDefault();
    select.value = MODELS[modalIdx].name;
    closeModal();
    setTimeout(function () { scrollToTarget(q('#contacto')); }, 250);
  });
  document.addEventListener('keydown', function (e) {
    if (!modalOpen) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight') mNext.click();
    if (e.key === 'ArrowLeft') mPrev.click();
    if (e.key === 'Tab') {
      var f = qa('button, a[href], input, select, textarea', modal).filter(function (el) { return !el.hidden && el.offsetParent !== null; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------- preguntas frecuentes ---------------- */
  qa('.qa').forEach(function (d) {
    var body = d.querySelector('.qa__body');
    d.querySelector('summary').addEventListener('click', function (e) {
      if (reduce) return;
      e.preventDefault();
      if (d.open) {
        gsap.to(body, { height: 0, autoAlpha: 0, duration: 0.35, ease: 'power2.inOut', onComplete: function () { d.open = false; gsap.set(body, { clearProps: 'all' }); } });
      } else {
        d.open = true;
        gsap.from(body, { height: 0, autoAlpha: 0, duration: 0.45, ease: 'power3.out', clearProps: 'all' });
      }
    });
  });

  /* ---------------- formulario de cotización (2 pasos) ---------------- */
  var form = q('.form');
  var errBox = document.createElement('p');
  errBox.className = 'form__error';
  errBox.setAttribute('role', 'alert');
  var actions = q('.form__actions'); actions.parentNode.insertBefore(errBox, actions);
  var steps = qa('.form__step'), stepTabs = qa('.form__steps span'), progress = q('.form__progress');
  function goStep(n) {
    steps.forEach(function (st) { var on = Number(st.dataset.step) === n; st.hidden = !on; st.classList.toggle('is-on', on); });
    stepTabs.forEach(function (t, k) { t.classList.toggle('is-on', k < n); });
    progress.textContent = 'Paso ' + n + ' de 2';
    var first = q('.form__step[data-step="' + n + '"] input:not([type="radio"]), .form__step[data-step="' + n + '"] select');
    if (first && n === 2) first.focus();
  }
  // celular: solo dígitos, con espacio a la mitad (1234 5678)
  var tel = form.elements.telefono;
  tel.addEventListener('input', function () {
    var d = tel.value.replace(/\D/g, '');
    if (d.length > 8 && d.indexOf('569') === 0) d = d.slice(3);
    if (d.length > 8 && d.charAt(0) === '9') d = d.slice(1);
    d = d.slice(0, 8);
    tel.value = d.length > 4 ? d.slice(0, 4) + ' ' + d.slice(4) : d;
  });
  var RULES = {
    comuna: function (v) { return v.length >= 2; },
    nombre: function (v) { return v.length >= 2; },
    telefono: function (v) { return v.replace(/\D/g, '').length === 8; },
    correo: function (v) { return v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  };
  function check(name) {
    var input = form.elements[name];
    var ok = RULES[name](input.value.trim());
    input.closest('.field').classList.toggle('is-invalid', !ok);
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }
  // se valida al salir del campo, nunca mientras se escribe; una vez marcado, se limpia al corregir
  Object.keys(RULES).forEach(function (n) {
    var input = form.elements[n];
    input.addEventListener('blur', function () { if (input.value.trim() !== '' || n !== 'correo') check(n); });
    input.addEventListener('input', function () { if (input.closest('.field').classList.contains('is-invalid')) check(n); });
  });
  function shake(els) { gsap.fromTo(els, { x: 0 }, { keyframes: { x: [-8, 8, -6, 6, 0] }, duration: 0.4, ease: 'none' }); }
  q('.form__next').addEventListener('click', function () {
    if (!check('comuna')) { shake(form.elements.comuna.closest('.field')); form.elements.comuna.focus(); return; }
    goStep(2);
  });
  q('.form__back').addEventListener('click', function () { goStep(1); });
  function radio(name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
  var lastText = '';
  function showDone(title, msg, text) {
    q('.form__done-title').textContent = title;
    q('.form__done-msg').textContent = msg;
    q('.form__done-wa').href = waUrl(text);
    q('.form__done-mail').href = 'mailto:contacto@smartpools.cl?subject=' + encodeURIComponent('Cotización de piscina') + '&body=' + encodeURIComponent(text);
    var done = q('.form__done');
    gsap.timeline()
      .to(done, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' })
      .fromTo(qa('.form__done circle, .form__done path'), { drawSVG: 0 }, { drawSVG: '100%', duration: 0.6, stagger: 0.15, ease: 'power2.inOut' }, 0.1)
      .from('.form__done p, .form__done-ctas, .form__again', { y: 12, autoAlpha: 0, duration: 0.5, stagger: 0.1 }, 0.5);
  }
  q('.form__again').addEventListener('click', function () {
    form.reset();
    goStep(1);
    gsap.to('.form__done', { autoAlpha: 0, duration: 0.3 });
    form.elements.modelo.focus();
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.elements.empresa.value) return;   // honeypot: lo llenan los bots
    errBox.classList.remove('is-on');
    var bad = [];
    ['nombre', 'telefono', 'correo'].forEach(function (n) { if (!check(n)) bad.push(form.elements[n].closest('.field')); });
    var consent = form.elements.acepta;
    consent.closest('.check').classList.toggle('is-invalid', !consent.checked);
    if (!consent.checked) bad.push(consent.closest('.check'));
    if (bad.length) {
      errBox.textContent = consent.checked ? 'Revisa los campos marcados.' : 'Revisa los campos marcados y acepta el uso de tus datos para poder responderte.';
      errBox.classList.add('is-on');
      shake(bad);
      (bad[0].querySelector('input') || bad[0]).focus();
      return;
    }
    var data = {
      nombre: form.elements.nombre.value.trim(), telefono: '+56 9 ' + form.elements.telefono.value.trim(),
      correo: form.elements.correo.value.trim(), comuna: form.elements.comuna.value.trim(),
      modelo: form.elements.modelo.value || 'Aún no lo sé', proyecto: radio('proyecto') || 'Aún no lo sé',
      acceso: radio('acceso') || 'No sé', mensaje: form.elements.mensaje.value.trim()
    };
    var text = 'Hola, quiero cotizar una piscina.\n' +
      'Nombre: ' + data.nombre + '\nCelular: ' + data.telefono + (data.correo ? '\nCorreo: ' + data.correo : '') +
      '\nComuna: ' + data.comuna + '\nModelo: ' + data.modelo + '\nProyecto: ' + data.proyecto +
      '\nAcceso para camión o grúa: ' + data.acceso + (data.mensaje ? '\nComentarios: ' + data.mensaje : '');
    var first = data.nombre.split(' ')[0];
    if (CONFIG.formEndpoint) {
      form.classList.add('is-sending');
      fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); showDone('¡Gracias, ' + first + '!', 'Recibimos tu solicitud y te contactaremos muy pronto. Si quieres, adelántanos fotos de tu patio por WhatsApp.', text); })
        .catch(function () { errBox.textContent = 'No pudimos enviar el formulario. Inténtalo de nuevo o escríbenos por WhatsApp.'; errBox.classList.add('is-on'); })
        .then(function () { form.classList.remove('is-sending'); });
    } else {
      // sin servidor: la solicitud viaja por WhatsApp, con el correo como alternativa
      window.open(waUrl(text), '_blank', 'noopener');
      showDone('¡Listo, ' + first + '!', 'Abrimos WhatsApp con tu solicitud escrita: solo falta tocar enviar. Si no se abrió, usa este botón.', text);
    }
  });

  qa('[data-tier]').forEach(function (a) {
    a.addEventListener('click', function () { var r = form.querySelector('input[name="proyecto"][value="' + a.dataset.tier + '"]'); if (r) r.checked = true; });
  });

  /* ---------------- barra fija de cotización (celular) ---------------- */
  var mbar = q('.mbar');
  if (mbar && 'IntersectionObserver' in window) {
    var heroIn = true, contactIn = false;
    var syncBar = function () { mbar.classList.toggle('is-on', !heroIn && !contactIn); };
    new IntersectionObserver(function (es) { heroIn = es[0].isIntersecting; syncBar(); }, { rootMargin: '0px 0px -40% 0px' }).observe(q('.hero'));
    new IntersectionObserver(function (es) { contactIn = es[0].isIntersecting; syncBar(); }, { threshold: 0.15 }).observe(q('.contact'));
  }

  /* ---------------- loader + arranque ---------------- */
  var loader = q('.loader');
  var wave = q('.loader__wave');
  var pctEl = q('.loader__pct');
  var prog = { v: 0 };
  var waveLoop = gsap.to(wave, { x: -640, duration: 2.6, ease: 'none', repeat: -1 });
  function renderLoader() {
    pctEl.textContent = Math.round(prog.v) + '%';
    gsap.set(wave, { y: 100 - prog.v * 1.2 });
  }
  renderLoader();
  function bump(to) { gsap.to(prog, { v: Math.max(prog.v, to), duration: 0.7, ease: 'power2.out', overwrite: true, onUpdate: renderLoader }); }
  bump(12);

  var fontsReady = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { bump(45); });
  var heroReady = heroReadyPromise.then(function () { bump(85); });
  var timeout = new Promise(function (res) { setTimeout(res, 4500); });

  Promise.race([Promise.all([fontsReady, heroReady]), timeout]).then(function () {
    build();
    if (reduce) {
      loader.remove();
      body.classList.remove('is-loading');
      gsap.set('.wa', { scale: 1 });
      return;
    }
    gsap.timeline()
      .to(prog, { v: 100, duration: 0.5, ease: 'power2.out', onUpdate: renderLoader })
      .to(loader, { yPercent: -100, duration: 1, ease: 'power3.inOut' }, '+=0.15')
      .add(function () { body.classList.remove('is-loading'); if (lenis && !heroGated()) lenis.start(); if (videoHero) { try { if (window.matchMedia('(max-width: 900px)').matches) vid.src = 'assets/video/inmersion-sd.mp4'; vid.preload = 'auto'; vid.load(); } catch (e) {} } }, '-=0.5')
      .add(heroIntro(), '-=0.55')
      .to('.wa', { scale: 1, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.6')
      .add(function () { waveLoop.kill(); loader.remove(); });
  });

  function heroIntro() {
    return gsap.timeline()
      .from('.seq', { scale: 1.06, autoAlpha: 0, duration: 1.4, ease: 'power2.out' }, 0)
      .from('.nav', { autoAlpha: 0, duration: 0.9 }, 0.5);
  }

  /* ---------------- todas las animaciones de scroll ---------------- */
  function build() {
    var mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', function () {

      /* ---- HERO: un solo scroll reproduce el video del descenso hasta el fondo ---- */
      var nav = q('.nav');
      var SURFACE_UNTIL = 3.0, DEEP_FROM = 4.4, RELEASE_AT = 5.0; // segundos del video
      function rateAt(t) { return t < 3.1 ? 2.4 : t < 4.6 ? 1.5 : 1.6; } // velocidad por tramo
      var descended = false, moving = false, topSince = null, afterDescend = null, rafId = null;
      function gate(on) {
        document.documentElement.classList.toggle('is-gated', on);
        if (lenis) { if (on) lenis.stop(); else lenis.start(); }
      }
      function atTop() { return (lenis ? lenis.scroll : window.scrollY) < 4; }
      function phaseAt(t) { return t < SURFACE_UNTIL ? 'surface' : t >= DEEP_FROM ? 'deep' : 'mid'; }
      function finishDescent() {
        if (!moving) return;
        descended = true; moving = false; gate(false); topSince = performance.now();
        if (afterDescend) { var cb = afterDescend; afterDescend = null; cb(); }
      }
      function tick() {
        var t = vid.currentTime;
        var r = rateAt(t); if (vid.playbackRate !== r) vid.playbackRate = r;
        setPhase(phaseAt(t));
        bgDeep.style.opacity = Math.max(0, Math.min(1, (t - 3.2) / 1.2));
        if (moving && t >= RELEASE_AT) finishDescent();
        if (!vid.paused && !vid.ended) rafId = requestAnimationFrame(tick); else rafId = null;
      }
      function descend(cb) {
        if (descended) { if (cb) cb(); return; }
        if (cb) afterDescend = cb;
        if (moving) return;
        moving = true; gate(true);
        vid.playbackRate = rateAt(vid.currentTime);
        var reveal = function () { gsap.to(poster, { autoAlpha: 0, duration: 0.3, overwrite: true }); };
        if ('requestVideoFrameCallback' in vid) vid.requestVideoFrameCallback(reveal); else vid.addEventListener('playing', reveal, { once: true });
        var pr = vid.play();
        if (pr && pr.catch) pr.catch(function () { finishDescent(); }); // si el navegador no deja reproducir, se libera el scroll
        if (!rafId) rafId = requestAnimationFrame(tick);
        gsap.delayedCall(9, finishDescent); // seguro por si el video tarda demasiado en cargar
      }
      function ascend() {
        if (moving || !descended) return;
        moving = true; gate(true);
        gsap.to(poster, { autoAlpha: 1, duration: 0.9, ease: 'power2.inOut', overwrite: true });
        gsap.to(bgDeep, { opacity: 0, duration: 0.9, ease: 'power2.inOut' });
        gsap.delayedCall(0.95, function () {
          vid.pause(); vid.currentTime = 0; setPhase('surface');
          descended = false; moving = false;
        });
      }
      vid.addEventListener('ended', finishDescent);
      heroDescend = descend;
      if (videoHero) gate(true); // la página no baja hasta que el visitante haga su primer scroll
      else { descended = true; heroDescend = null; }
      function restingAtTop() { return descended && !moving && atTop() && topSince !== null && performance.now() - topSince > 400; }
      gsap.ticker.add(function () {
        if (atTop()) { if (topSince === null) topSince = performance.now(); } else topSince = null;
      });
      window.addEventListener('wheel', function (e) {
        if (menuOpen || modalOpen) return;
        if (!descended && atTop()) { e.preventDefault(); if (e.deltaY > 6) descend(); }
        else if (restingAtTop() && e.deltaY < -6) { e.preventDefault(); ascend(); }
      }, { passive: false });
      var touchY = null;
      window.addEventListener('touchstart', function (e) { touchY = e.touches[0].clientY; }, { passive: true });
      window.addEventListener('touchmove', function (e) {
        if (touchY === null || menuOpen || modalOpen) return;
        var dy = touchY - e.touches[0].clientY;
        if (!descended && atTop()) { if (dy > 24) { touchY = null; descend(); } }
        else if (restingAtTop() && dy < -40) { touchY = null; ascend(); }
      }, { passive: true });
      window.addEventListener('keydown', function (e) {
        if (menuOpen || modalOpen || e.target.closest('input, textarea, select')) return;
        var down = ['ArrowDown', 'PageDown', 'End', ' '].indexOf(e.key) >= 0, up = ['ArrowUp', 'PageUp', 'Home'].indexOf(e.key) >= 0;
        if (!descended && atTop() && down) { e.preventDefault(); descend(); }
        else if (restingAtTop() && up) { e.preventDefault(); ascend(); }
      });
      // la nav real se esconde mientras el video (que trae su propio menú) está en pantalla
      // (el hero es sticky, así que se mide con la sección siguiente, que sí está en el flujo normal)
      ScrollTrigger.create({
        trigger: '.cat', start: 'top 40px', end: 'max',
        onToggle: function (st) { nav.classList.toggle('nav--inhero', videoHero && !st.isActive && !menuOpen); },
        onRefresh: function (st) { nav.classList.toggle('nav--inhero', videoHero && !st.isActive && !menuOpen); }
      });
      if (videoHero && !window.matchMedia('(max-width: 960px)').matches) nav.classList.add('nav--inhero');

      ScrollTrigger.create({
        trigger: '.cat', start: 'top top',
        onEnter: function () { heroEl.classList.add('is-covered'); if (!vid.paused) vid.pause(); },
        onLeaveBack: function () { heroEl.classList.remove('is-covered'); if (descended && !vid.ended) { var pr2 = vid.play(); if (pr2 && pr2.catch) pr2.catch(function () {}); } }
      });

      /* ---- SALIDA DEL AGUA: "Nuestros modelos" sube sobre el fondo de la piscina ---- */
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.cat', start: 'top bottom', end: 'top 10%', scrub: 0.5 }
      })
        .fromTo('.seq', { scale: 1, filter: 'blur(0px) brightness(1)' }, { scale: 1.12, filter: 'blur(14px) brightness(.72)', duration: 1 }, 0)
        .fromTo('.seq__back', { filter: 'blur(26px) brightness(.92)' }, { filter: 'blur(40px) brightness(.6)', duration: 1 }, 0)
        .to('.hero__exit', { autoAlpha: 0.55, duration: 1 }, 0)
        .fromTo('.cat__wave', { scaleY: 1.8, yPercent: 100 }, { scaleY: 1, yPercent: 0, duration: 0.6, ease: 'power1.out' }, 0);
      // burbujas que suben mientras la sección aparece
      gsap.utils.toArray('.bubbles span').forEach(function (b) {
        var d = parseFloat(getComputedStyle(b).getPropertyValue('--d')) || 0;
        gsap.timeline({ scrollTrigger: { trigger: '.cat', start: 'top bottom', end: 'top 20%', scrub: 0.8 } })
          .fromTo(b, { y: 0, opacity: 0 }, { opacity: 0.9, duration: 0.15 }, d * 0.4)
          .to(b, { y: function () { return -window.innerHeight * (0.7 + d * 0.5); }, x: (d - 0.5) * 60, duration: 0.85 - d * 0.3, ease: 'power1.in' }, d * 0.4)
          .to(b, { opacity: 0, duration: 0.15 }, 0.85 - d * 0.3 + d * 0.4 - 0.15);
      });

      /* ---- MODELOS ---- */
      var ch = SplitText.create('.cat__top .cat__h2 > span', { type: 'words', mask: 'words', aria: 'none' });
      var ctl = gsap.timeline({ scrollTrigger: { trigger: '.cat', start: 'top 70%' } });
      ctl.from('.cat__top .cat__eyebrow', { autoAlpha: 0, y: 14, duration: 0.8 }, 0)
         .from(ch.words, { yPercent: 110, duration: 1.1, stagger: 0.05 }, 0.1)
         .from('.cat__lead, .chips', { autoAlpha: 0, y: 24, duration: 0.9, stagger: 0.08 }, 0.4)
         .from('.feat__visual', { autoAlpha: 0, y: 40, scale: 0.94, duration: 1.4 }, 0.2)
         .from('.feat__info > *', { autoAlpha: 0, x: 30, duration: 0.8, stagger: 0.06 }, 0.5);
      gsap.from('.perks li', {
        autoAlpha: 0, y: 30, duration: 0.8, stagger: 0.08,
        scrollTrigger: { trigger: '.perks', start: 'top 85%' }
      });
      gsap.from('.perk__icon', { scale: 0.5, duration: 0.8, stagger: 0.08, ease: 'back.out(1.8)', scrollTrigger: { trigger: '.perks', start: 'top 85%' } });
      var lh = SplitText.create('.cat__listhead .cat__h2', { type: 'words', mask: 'words' });
      gsap.timeline({ scrollTrigger: { trigger: '.cat__listhead', start: 'top 80%' } })
        .from('.cat__listhead .cat__eyebrow', { autoAlpha: 0, y: 14, duration: 0.8 }, 0)
        .from(lh.words, { yPercent: 110, duration: 1, stagger: 0.05 }, 0.1)
        .from('.cat__listhead .btn', { autoAlpha: 0, x: 20, duration: 0.8 }, 0.3);
      gsap.from('.mcard', { autoAlpha: 0, y: 60, duration: 1, stagger: 0.1, scrollTrigger: { trigger: '.cat__grid', start: 'top 85%' } });
      ScrollTrigger.create({
        trigger: '.cat__top', start: 'top bottom', end: 'bottom top',
        onToggle: function (s) { catVisible = s.isActive; restartAuto(); }
      });
    });

    /* ---- VENTAJAS: scroll horizontal (escritorio) ---- */
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', function () {
      var track = q('.adv__track');
      var dist = function () { return Math.max(0, track.scrollWidth - document.documentElement.clientWidth); };
      var hTween = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: '.adv', start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: true, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      gsap.to('.adv__progress span', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: '.adv', start: 'top top', end: function () { return '+=' + dist(); }, scrub: true, invalidateOnRefresh: true }
      });
      qa('.adv__card').forEach(function (card) {
        var icon = card.querySelectorAll('.adv__icon path, .adv__icon circle');
        if (icon.length) {
          gsap.fromTo(icon, { drawSVG: 0 }, {
            drawSVG: '100%', duration: 1.3, ease: 'power2.inOut', stagger: 0.15,
            scrollTrigger: { trigger: card, containerAnimation: hTween, start: 'left 88%', toggleActions: 'play none none reverse' }
          });
        }
        gsap.from(card.querySelectorAll('h3, p, .adv__cta-text, .btn'), {
          y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.08,
          scrollTrigger: { trigger: card, containerAnimation: hTween, start: 'left 85%', toggleActions: 'play none none reverse' }
        });
      });
      gsap.from('.adv__head > div > *', { y: 40, autoAlpha: 0, duration: 1, stagger: 0.1, scrollTrigger: { trigger: '.adv', start: 'top 70%' } });
    });

    mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', function () {
      qa('.adv__icon').forEach(function (icon) {
        gsap.fromTo(icon.querySelectorAll('path, circle'), { drawSVG: 0 }, { drawSVG: '100%', duration: 1.3, ease: 'power2.inOut', stagger: 0.15, scrollTrigger: { trigger: '.adv__track', start: 'top 80%' } });
      });
    });

    /* ---- FIBRA: vista explotada de las capas ---- */
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      var layers = qa('.layer');
      var items = qa('.layers__list li');
      var counter = q('.layers__counter-now');
      var scene = q('.layers__scene');
      var gap = function () { return scene.offsetWidth * 0.16; };
      var active = -1;
      function setActive(i) {
        if (i === active) return;
        active = i;
        items.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });
        layers.forEach(function (l, k) { l.classList.toggle('is-active', k === i + 1); });
        counter.textContent = '0' + Math.max(1, i + 1);
      }
      // posición de cada capa respecto al centro del apilado (arriba +, abajo -)
      var mid = (layers.length - 1) / 2;
      var slot = function (i) { return layers.length - 1 - i - mid; };
      gsap.set(layers, { z: function (i) { return slot(i) * 4; } });
      var ltl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: { trigger: '.layers', start: 'top top', end: '+=320%', pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true },
        onUpdate: function () {
          var t = ltl.time(), idx = -1;
          for (var k = 0; k < 5; k++) if (t >= ltl.labels['l' + k] - 0.05) idx = k;
          setActive(idx);
        }
      });
      ltl
        .fromTo('.layers__scene', { rotateX: 0, scale: 0.8 }, { rotateX: 56, scale: 1, duration: 1 }, 0)
        .fromTo('.layers__stack', { rotateZ: 0 }, { rotateZ: -36, duration: 1 }, 0)
        .to(layers, { z: function (i) { return slot(i) * gap(); }, duration: 1.2, stagger: 0.03 }, 0.8)
        .to('.layer--water', { z: function () { return slot(0) * gap() + 60; }, autoAlpha: 0.25, duration: 0.6 }, 1.7);
      for (var k = 0; k < 5; k++) {
        var at = 2.2 + k * 0.7;
        ltl.addLabel('l' + k, at);
        ltl.to(layers[k + 1], { x: -30, y: -30, duration: 0.35 }, at)
           .to(layers[k + 1], { x: 0, y: 0, duration: 0.35 }, at + 0.55);
      }
      ltl.to({}, { duration: 0.4 });
      gsap.from('.layers__copy > *:not(ol)', { y: 40, autoAlpha: 0, duration: 1, stagger: 0.1, scrollTrigger: { trigger: '.layers', start: 'top 60%' } });
      return function () { setActive(-1); };
    });
    if (reduce) qa('.layers__list li').forEach(function (li) { li.classList.add('is-active'); });

    /* ---- GARANTÍA + TESTIMONIOS ---- */
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      var th = SplitText.create('.trust .h2', { type: 'words', mask: 'words' });
      gsap.timeline({ scrollTrigger: { trigger: '.trust', start: 'top 70%' } })
        .from('.trust .eyebrow', { autoAlpha: 0, y: 14, duration: 0.8 }, 0)
        .from(th.words, { yPercent: 110, duration: 1.1, stagger: 0.05 }, 0.1);
      gsap.from('.pillar', { autoAlpha: 0, y: 50, duration: 1, stagger: 0.12, scrollTrigger: { trigger: '.trust__pillars', start: 'top 82%' } });
      gsap.fromTo('.pillar svg path, .pillar svg circle', { drawSVG: 0 }, { drawSVG: '100%', duration: 1.4, stagger: 0.1, ease: 'power2.inOut', scrollTrigger: { trigger: '.trust__pillars', start: 'top 82%' } });
      qa('.pillar [data-count]').forEach(function (el) {
        var to = Number(el.dataset.count), o = { v: 0 };
        el.textContent = '0';
        gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v); }, scrollTrigger: { trigger: '.trust__pillars', start: 'top 82%', once: true } });
      });
      gsap.from('.review', { autoAlpha: 0, y: 40, rotate: function (i) { return i % 2 ? 1.5 : -1.5; }, duration: 1, stagger: 0.12, scrollTrigger: { trigger: '.reviews', start: 'top 85%' } });
    });

    /* ---- PREGUNTAS FRECUENTES ---- */
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      var qh = SplitText.create('.faq .h2', { type: 'words', mask: 'words' });
      gsap.timeline({ scrollTrigger: { trigger: '.faq', start: 'top 70%' } })
        .from('.faq .eyebrow', { autoAlpha: 0, y: 14, duration: 0.8 }, 0)
        .from(qh.words, { yPercent: 110, duration: 1.1, stagger: 0.05 }, 0.1)
        .from('.faq__lead, .faq__cta', { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.1 }, 0.4);
      gsap.from('.qa', { autoAlpha: 0, y: 30, duration: 0.8, stagger: 0.07, scrollTrigger: { trigger: '.faq__list', start: 'top 85%' } });
    });

    /* ---- PROCESO: del sol al agua. El boceto a lápiz se vuelve agua, una gota recorre el camino y llena la piscina ---- */
    var pwrap = q('.process__wrap');
    var psvg = q('.process__line');
    var path = q('.process__path'), pathBg = q('.process__path-bg'), pathFlow = q('.process__path-flow');
    var dropG = q('.process__drop'), flowClip = q('.process__flowclip'), waterClip = q('.process__waterclip');
    var sunG = q('.process__sun'), raysG = q('.process__rays'), poolG = q('.process__pool');
    var poolRim = q('.process__pool-rim'), poolWater = q('.process__pool-water'), poolLabel = q('.process__pool-label');
    var steps = qa('.step');
    var PAD_BOTTOM = 170, poolTop = 0, poolH = 0;
    var ns = 'http://www.w3.org/2000/svg';
    for (var r = 0; r < 8; r++) {
      var ln = document.createElementNS(ns, 'line');
      ln.setAttribute('x1', 0); ln.setAttribute('y1', -19); ln.setAttribute('x2', 0); ln.setAttribute('y2', -25);
      ln.setAttribute('transform', 'rotate(' + r * 45 + ')');
      raysG.appendChild(ln);
    }
    function buildPath() {
      var mobile = window.innerWidth <= 760;
      PAD_BOTTOM = mobile ? 150 : 170;
      var h = pwrap.offsetHeight - PAD_BOTTOM;
      var w = mobile ? 48 : 160, cx = w / 2, amp = mobile ? 14 : 60, seg = 6, sh = h / seg;
      var d = 'M' + cx + ' 0';
      for (var i = 0; i < seg; i++) {
        var dir = i % 2 ? -1 : 1, y0 = i * sh;
        d += ' C' + (cx + dir * amp) + ' ' + (y0 + sh * 0.33) + ' ' + (cx + dir * amp) + ' ' + (y0 + sh * 0.66) + ' ' + cx + ' ' + (y0 + sh);
      }
      psvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      psvg.style.height = h + 'px';
      path.setAttribute('d', d); pathBg.setAttribute('d', d); pathFlow.setAttribute('d', d);
      q('#process-grad').setAttribute('y2', h);
      flowClip.setAttribute('width', w + 400);
      sunG.setAttribute('transform', 'translate(' + cx + ' ' + (-34) + ')');
      var pw = mobile ? 44 : 84; poolH = mobile ? 22 : 36; poolTop = h + 22;
      poolG.setAttribute('transform', 'translate(0 0)');
      poolRim.setAttribute('x', cx - pw / 2); poolRim.setAttribute('y', poolTop); poolRim.setAttribute('width', pw); poolRim.setAttribute('height', poolH);
      poolWater.setAttribute('x', cx - pw / 2 + 3); poolWater.setAttribute('y', poolTop + 3); poolWater.setAttribute('width', pw - 6); poolWater.setAttribute('height', poolH - 6);
      waterClip.setAttribute('width', w + 400); waterClip.setAttribute('y', poolTop + poolH); waterClip.setAttribute('height', 0);
      poolLabel.setAttribute('x', cx); poolLabel.setAttribute('y', poolTop + poolH + 34);
      qa('.process__splash circle').forEach(function (c, k) { c.setAttribute('cx', cx + (k - 1) * 14); c.setAttribute('cy', poolTop + 2); });
      dropG.setAttribute('transform', 'translate(' + cx + ' 0)');
    }
    buildPath();
    ScrollTrigger.addEventListener('refreshInit', buildPath);

    mm.add('(prefers-reduced-motion: no-preference)', function () {
      // sol que gira despacio y gota que hace ondas
      gsap.to(raysG, { rotation: 360, duration: 40, ease: 'none', repeat: -1, svgOrigin: '0 0' });
      gsap.to(sunG, { scale: 1.06, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 50%' });
      qa('.process__ripple').forEach(function (c, k) {
        gsap.fromTo(c, { attr: { r: 6 }, opacity: 0.7 }, { attr: { r: 24 }, opacity: 0, duration: 1.8, repeat: -1, ease: 'power1.out', delay: k * 0.9 });
      });
      var splashTl = gsap.timeline({ paused: true })
        .to('.process__splash circle', { attr: { cy: '-=26' }, opacity: 1, duration: 0.35, stagger: 0.06, ease: 'power2.out' })
        .to('.process__splash circle', { attr: { cy: '+=26' }, opacity: 0, duration: 0.4, stagger: 0.06, ease: 'power2.in' }, 0.3)
        .to(poolLabel, { opacity: 1, duration: 0.5 }, 0.2);
      var splashed = false;
      gsap.fromTo(path, { drawSVG: '0%' }, {
        drawSVG: '100%', ease: 'none',
        scrollTrigger: {
          trigger: pwrap, start: 'top 65%', end: 'bottom 65%', scrub: true, invalidateOnRefresh: true,
          onUpdate: function (s) {
            var p = s.progress;
            var len = path.getTotalLength();
            var pt = path.getPointAtLength(len * Math.min(1, p / 0.9)); // la gota llega al final un poco antes y cae a la piscina
            var dropY = p < 0.9 ? pt.y : pt.y + (p - 0.9) / 0.1 * 22;
            dropG.setAttribute('transform', 'translate(' + pt.x + ' ' + dropY + ')');
            flowClip.setAttribute('height', Math.max(0, pt.y));
            // la piscina se llena en el último tramo
            var fill = Math.max(0, Math.min(1, (p - 0.78) / 0.2));
            waterClip.setAttribute('y', poolTop + poolH - fill * poolH); waterClip.setAttribute('height', fill * poolH);
            // cada paso se "enciende" cuando la gota lo alcanza
            var wrapTop = pwrap.getBoundingClientRect().top;
            steps.forEach(function (st) {
              var y = st.getBoundingClientRect().top - wrapTop + st.offsetHeight * 0.4;
              st.classList.toggle('is-done', pt.y >= y);
            });
            if (p >= 0.985 && !splashed) { splashed = true; splashTl.restart(); }
            else if (p < 0.9 && splashed) { splashed = false; splashTl.pause(0); gsap.set(poolLabel, { opacity: 0 }); }
          }
        }
      });
      qa('.step').forEach(function (step, i) {
        gsap.from(step, {
          x: window.innerWidth > 760 ? (i % 2 ? 50 : -50) : 30, autoAlpha: 0, duration: 1,
          scrollTrigger: { trigger: step, start: 'top 72%', toggleActions: 'play none none reverse' }
        });
      });
      gsap.from('.process__head > *', { y: 40, autoAlpha: 0, duration: 1, stagger: 0.1, scrollTrigger: { trigger: '.process', start: 'top 70%' } });
    });

    /* ---- INSPIRACIÓN: columnas con parallax y fotos que se abren ---- */
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      qa('.gallery__col').forEach(function (col) {
        var s = Number(col.dataset.speed) || 0;
        gsap.fromTo(col, { yPercent: s }, { yPercent: -s, ease: 'none', scrollTrigger: { trigger: '.gallery__cols', start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      qa('.shot').forEach(function (shot) {
        gsap.fromTo(shot, { clipPath: 'inset(16% 12% 16% 12% round 20px)' }, { clipPath: 'inset(0% 0% 0% 0% round 20px)', ease: 'none', scrollTrigger: { trigger: shot, start: 'top 100%', end: 'top 50%', scrub: true } });
        gsap.fromTo(shot.querySelector('img'), { scale: 1.3 }, { scale: 1.02, ease: 'none', scrollTrigger: { trigger: shot, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      var gh = SplitText.create('.gallery .h2', { type: 'words', mask: 'words' });
      gsap.from(gh.words, { yPercent: 110, duration: 1.1, stagger: 0.05, scrollTrigger: { trigger: '.gallery', start: 'top 70%' } });
      gsap.from('.gallery .eyebrow', { autoAlpha: 0, y: 14, duration: 0.9, scrollTrigger: { trigger: '.gallery', start: 'top 70%' } });

      // marquee: más rápido cuando haces scroll
      var mq = gsap.to('.marquee__track', { xPercent: -50, duration: 30, ease: 'none', repeat: -1 });
      var boost = 0;
      ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onUpdate: function (s) { boost = Math.min(6, Math.abs(s.getVelocity()) / 300); } });
      var tick = function () { boost *= 0.93; mq.timeScale(1 + boost); };
      gsap.ticker.add(tick);
      return function () { gsap.ticker.remove(tick); };
    });

    /* ---- CONTACTO + FOOTER ---- */
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      gsap.fromTo('.contact__bg', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
      var ch = SplitText.create('.contact .h2', { type: 'words', mask: 'words' });
      var ctl = gsap.timeline({ scrollTrigger: { trigger: '.contact', start: 'top 60%' } });
      ctl.from('.contact .eyebrow', { autoAlpha: 0, y: 14, duration: 0.8 }, 0)
         .from(ch.words, { yPercent: 110, duration: 1.1, stagger: 0.05 }, 0.1)
         .from('.contact__lead, .contact__data li', { autoAlpha: 0, y: 24, duration: 0.9, stagger: 0.07 }, 0.4)
         .from('.form', { autoAlpha: 0, y: 50, duration: 1.1 }, 0.3)
         .from('.form .field, .form__submit', { autoAlpha: 0, y: 18, duration: 0.7, stagger: 0.05 }, 0.6);

      var fw = q('.footer__wave');
      gsap.set(fw, { y: 150 });
      gsap.to(fw, { x: -200, duration: 4, ease: 'none', repeat: -1 });
      gsap.to(fw, { y: 52, duration: 2.4, ease: 'power2.out', scrollTrigger: { trigger: '.footer', start: 'top 85%' } });
    });

    // (se crean al final para que midan después de los pins de arriba)
    // profundidad
    var depthFill = q('.depth__fill'), depthVal = q('.depth__value');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (s) {
        depthFill.style.transform = 'scaleY(' + s.progress.toFixed(4) + ')';
        depthVal.textContent = fmt2.format(s.progress * 1.8) + ' m';
      }
    });

    // nav: se vuelve sólida al dejar el hero y se esconde al bajar
    var nav = q('.nav');
    ScrollTrigger.create({
      trigger: '.cat', start: 'top 80px',
      onEnter: function () { nav.classList.add('nav--solid'); },
      onLeaveBack: function () { nav.classList.remove('nav--solid'); }
    });
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (s) {
        var hide = s.direction === 1 && s.scroll() > window.innerHeight * 2.4 && !menuOpen;
        nav.classList.toggle('nav--hidden', hide);
      }
    });
    // nav clara sobre las secciones claras
    var lightCount = 0;
    ['.cat', '.adv', '.cmp', '.process', '.faq'].forEach(function (sel) {
      var sec = q(sel);
      var trg = sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec;
      ScrollTrigger.create({
        trigger: trg, start: 'top 40px', end: 'bottom 40px',
        onToggle: function (s) {
          lightCount = Math.max(0, lightCount + (s.isActive ? 1 : -1));
          nav.classList.toggle('nav--light', lightCount > 0);
        }
      });
    });

    // las fotos lazy pueden cambiar alturas: recalcular al terminar de cargar
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
})();
