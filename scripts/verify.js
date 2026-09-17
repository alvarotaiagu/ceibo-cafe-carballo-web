/* Verificación de la web de Ceibo con Playwright.
   Requiere un servidor local:  python -m http.server 8993  (en la raíz del proyecto)
   Uso: NODE_PATH=/c/Users/alvar/node_modules node scripts/verify.js
   Escribe screenshots/ y scripts/verify-report.json; sale con código 1 si falla algo. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.CEIBO_URL || 'http://127.0.0.1:8993/';
const RAIZ = path.join(__dirname, '..');
const CAPS = path.join(RAIZ, 'screenshots');
fs.mkdirSync(CAPS, { recursive: true });

const resultados = [];
const ok = (nombre, valor, detalle) => {
  resultados.push({ prueba: nombre, ok: !!valor, detalle: detalle === undefined ? null : detalle });
  console.log((valor ? 'OK  ' : 'FAIL') + ' ' + nombre + (detalle !== undefined ? '  ' + JSON.stringify(detalle) : ''));
};

async function nuevaPagina(browser, opciones = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...opciones });
  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
  page.errores = errores;
  return page;
}

const irA = async (page, sel, margen = 100) => {
  await page.evaluate(({ sel, margen }) => {
    const el = document.querySelector(sel);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - margen, behavior: 'instant' });
  }, { sel, margen });
  await page.waitForTimeout(1800);
};

/* scroll "humano" a trozos para que Lenis/ScrollTrigger disparen todo */
const bajarDespacio = async (page, hasta) => {
  const total = hasta || await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += 500) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
    await page.waitForTimeout(160);
  }
};

(async () => {
  const browser = await chromium.launch();

  /* ================= 0 · cortina de entrada (preloader) ================= */
  {
    const page = await nuevaPagina(browser);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    /* nada de tiempos absolutos: el CDN puede tardar y la cortina arranca
       cuando main.js se ejecuta, no cuando carga el DOM. Se muestrea el
       estado real cada 60 ms y se comprueba la SECUENCIA. */
    const traza = await page.evaluate(() => new Promise((res) => {
      const m = [];
      const t0 = performance.now();
      const tic = () => {
        const c = document.querySelector('[data-cortina]');
        const sp = document.querySelector('.cortina__marca span').getBoundingClientRect();
        const cj = document.querySelector('.cortina__marca').getBoundingClientRect();
        m.push({
          t: Math.round(performance.now() - t0),
          armada: document.documentElement.classList.contains('has-motion'),
          top: Math.round(c.getBoundingClientRect().top),
          fuera: c.hidden,
          palabraFuera: sp.top >= cj.bottom - 2,
          pie: parseFloat(getComputedStyle(document.querySelector('.cortina__pie')).opacity)
        });
        if (c.hidden || m.length > 120) return res(m);
        setTimeout(tic, 60);
      };
      tic();
    }));
    const armados = traza.filter((f) => f.armada);
    const t0 = await page.evaluate(() => ({
      glifo: !!document.querySelector('.cortina__glifo'),
      borde: !!document.querySelector('.cortina__borde')
    }));
    ok('cortina: al cargar cubre la ventana entera y bloquea el scroll', traza[0].top === 0 && !traza[0].fuera, traza[0]);
    ok('cortina: lleva glifo y borde curvo', t0.glifo && t0.borde, t0);
    ok('cortina: la palabra empieza fuera de su máscara y luego sube a su sitio (yPercent + y a cero)',
      armados.some((f) => f.palabraFuera) && armados.some((f) => !f.palabraFuera), armados.slice(0, 4));
    ok('cortina: el pie se enciende', armados.some((f) => f.pie > 0.5), Math.max.apply(null, armados.map((f) => f.pie)));
    ok('cortina: se levanta hacia arriba antes de irse (top negativo)', traza.some((f) => f.top < -40), Math.min.apply(null, traza.map((f) => f.top)));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(CAPS, '21-cortina.png') });
    const enPie = await page.evaluate(() => ({
      fuera: document.querySelector('[data-cortina]').hidden,
      flor: Array.from(document.querySelectorAll('.flor .flor-abre')).filter((g) => parseFloat(getComputedStyle(g).opacity) > 0.95).length
    }));
    ok('cortina: el hero espera (con la cortina puesta la flor no se ha abierto)', enPie.fuera || enPie.flor === 0, enPie);

    await page.waitForTimeout(4000);
    const t2 = await page.evaluate(() => ({
      fuera: document.querySelector('[data-cortina]').hidden,
      display: getComputedStyle(document.querySelector('[data-cortina]')).display,
      bloqueo: document.documentElement.classList.contains('cortina-activa'),
      flor: Array.from(document.querySelectorAll('.flor .flor-abre')).filter((g) => parseFloat(getComputedStyle(g).opacity) > 0.95).length
    }));
    ok('cortina: se retira y [hidden] gana a display:grid', t2.fuera && t2.display === 'none', t2);
    ok('cortina: devuelve el scroll', !t2.bloqueo, t2);
    ok('cortina: al irse, la flor del hero ya se ha abierto sola', t2.flor === 10, t2.flor);
    ok('cortina: sin errores de consola', page.errores.length === 0, page.errores);
    await page.close();
  }

  /* ================= 1 · portada: flor que se abre, hero, marquee ================= */
  {
    const page = await nuevaPagina(browser);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const inicio = await page.evaluate(() => {
      const f = document.querySelectorAll('.flor .flor-abre');
      const op = Array.from(f).map((g) => parseFloat(getComputedStyle(g).opacity));
      return { motion: document.documentElement.classList.contains('has-motion'), flores: f.length, cerradas: op.filter((o) => o < 0.5).length };
    });
    ok('hero: html.has-motion activo con GSAP', inicio.motion);
    ok('hero: la lámina tiene 10 flores', inicio.flores === 10, inicio.flores);
    ok('hero: al cargar la mayoría de flores aún no se han abierto (se abren una a una)', inicio.cerradas >= 5, inicio.cerradas);
    await page.screenshot({ path: path.join(CAPS, '01-hero-abriendose.png') });
    await page.waitForTimeout(3200);
    const fin = await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('.flor .flor-abre'));
      const abiertas = f.filter((g) => parseFloat(getComputedStyle(g).opacity) > 0.95).length;
      const tallo = document.querySelector('.tallo');
      const off = parseFloat(getComputedStyle(tallo).strokeDashoffset);
      const chars = Array.from(document.querySelectorAll('.hero-titulo .split-char'));
      const visibles = chars.filter((c) => parseFloat(getComputedStyle(c).opacity) > 0.95).length;
      const cta = document.querySelector('.hero-cta');
      return { abiertas: abiertas + '/' + f.length, tallo: off, chars: visibles + '/' + chars.length, cta: parseFloat(getComputedStyle(cta).opacity) };
    });
    ok('hero: todas las flores abiertas tras ~3,5 s', fin.abiertas === '10/10', fin.abiertas);
    ok('hero: el tallo terminó de dibujarse', Math.abs(fin.tallo) < 0.01, fin.tallo);
    ok('hero: char-reveal del titular completado', fin.chars === '5/5', fin.chars);
    ok('hero: CTAs visibles', fin.cta > 0.95, fin.cta);
    await page.screenshot({ path: path.join(CAPS, '02-hero-abierta.png') });

    /* accesibilidad del titular dividido */
    const aria = await page.getAttribute('.hero-titulo', 'aria-label');
    ok('hero: el h1 conserva aria-label tras dividirlo en letras', aria === 'Ceibo', aria);

    /* marquee en movimiento */
    const m1 = await page.evaluate(() => getComputedStyle(document.querySelector('.marquee-pista')).transform);
    await page.waitForTimeout(600);
    const m2 = await page.evaluate(() => getComputedStyle(document.querySelector('.marquee-pista')).transform);
    ok('marquee: se mueve', m1 !== m2);

    /* magnetic: el botón se desplaza hacia el ratón y vuelve */
    const btn = await page.$('.hero-cta .btn--rojo');
    const bb = await btn.boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await page.mouse.move(bb.x + bb.width - 6, bb.y + 6, { steps: 6 });
    await page.waitForTimeout(500);
    const mag = await page.evaluate(() => getComputedStyle(document.querySelector('.hero-cta .btn--rojo')).transform);
    await page.mouse.move(10, 500);
    await page.waitForTimeout(900);
    const mag2 = await page.evaluate(() => getComputedStyle(document.querySelector('.hero-cta .btn--rojo')).transform);
    ok('magnetic: el CTA se desplaza con el puntero', mag !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(mag), mag);
    ok('magnetic: vuelve a su sitio al salir', /matrix\(1, 0, 0, 1, 0, 0\)|none/.test(mag2) || /matrix\(1, 0, 0, 1, -?0\.\d+, -?0\.\d+\)/.test(mag2), mag2);

    /* cookies: aparece, el botón cierra y persiste */
    ok('cookies: el banner se muestra la primera vez', await page.isVisible('.cookie-banner'));
    await page.click('.cookie-ack');
    await page.waitForTimeout(200);
    ok('cookies: el botón "Entendido" lo oculta de verdad', !(await page.isVisible('.cookie-banner')));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    ok('cookies: no reaparece tras recargar', !(await page.isVisible('.cookie-banner')));
    ok('portada: sin errores de consola', page.errores.length === 0, page.errores);
    await page.close();
  }

  /* ================= 2 · recorrido completo: pétalos, ramas, sticky, contador, mapa ================= */
  {
    const page = await nuevaPagina(browser);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => { try { localStorage.setItem('ceibo-cookie-ack', '1'); } catch (e) {} });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(4200);

    /* pétalo ligado al scroll: su y cambia al desplazarse y NO cambia quieto */
    const petY = async () => page.evaluate(() => {
      const m = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.petalo--1')).transform);
      return Math.round(m.f);
    });
    await irA(page, '#ceibo', 600);
    const p1 = await petY();
    await page.waitForTimeout(700);
    const p1b = await petY();
    await irA(page, '#ceibo', 0);
    const p2 = await petY();
    ok('pétalos: ligados al scroll (cambia al bajar, quieto si no se baja)', p1 !== p2 && p1 === p1b, { antes: p1, quieto: p1b, despues: p2 });
    await page.screenshot({ path: path.join(CAPS, '03-ceibo-flor.png') });

    /* separador tallo: dibujado tras pasar */
    await irA(page, '#carta', 300);
    const tallo = await page.evaluate(() => {
      const l = document.querySelector('.tallo-sep .tallo-linea');
      const h = document.querySelector('.tallo-sep .tallo-hoja');
      return { linea: parseFloat(getComputedStyle(l).strokeDashoffset), hoja: getComputedStyle(h).transform };
    });
    ok('separador: el tallo se dibujó', tallo.linea < 0.05, tallo.linea);
    ok('separador: la hoja brotó (scale > 0)', !/matrix\(0, 0, 0, 0/.test(tallo.hoja) && tallo.hoja !== 'none', tallo.hoja);

    /* ramas radiales: 6 pétalos alrededor del centro, abiertos, en anillo */
    await irA(page, '.rama--cafe', 120);
    await page.waitForTimeout(2600);
    const rama = await page.evaluate(() => {
      const r = document.querySelector('.rama--cafe .rama-radial').getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const cards = Array.from(document.querySelectorAll('.rama--cafe .petalo-card'));
      const dist = cards.map((c) => { const b = c.getBoundingClientRect(); return Math.round(Math.hypot(b.left + b.width / 2 - cx, b.top + b.height / 2 - cy)); });
      const op = cards.map((c) => parseFloat(getComputedStyle(c).opacity));
      const centro = getComputedStyle(document.querySelector('.rama--cafe .rama-centro'));
      return { n: cards.length, dist, minOp: Math.min(...op), centroOp: parseFloat(centro.opacity), color: centro.backgroundColor };
    });
    ok('carta: la rama Café tiene 6 pétalos', rama.n === 6, rama.n);
    ok('carta: los pétalos están en anillo (distancias al centro parecidas)', Math.max(...rama.dist) - Math.min(...rama.dist) < 12, rama.dist);
    ok('carta: los pétalos se abrieron (opacidad 1)', rama.minOp > 0.95, rama.minOp);
    ok('carta: el centro de la rama Café es rojo', rama.color === 'rgb(155, 27, 27)', rama.color);
    await page.screenshot({ path: path.join(CAPS, '04-carta-rama-cafe.png') });
    await irA(page, '.rama--matcha', 120);
    await page.waitForTimeout(2600);
    const matcha = await page.evaluate(() => getComputedStyle(document.querySelector('.rama--matcha .rama-centro')).backgroundColor);
    ok('carta: la rama Matcha cambia a verde', matcha === 'rgb(126, 143, 90)', matcha);
    await page.screenshot({ path: path.join(CAPS, '05-carta-rama-matcha.png') });

    /* sticky-stack: el primer paso queda fijo mientras entra el segundo */
    await irA(page, '.manana-paso:nth-child(2)', 400);
    const st = await page.evaluate(() => {
      const a = document.querySelector('.manana-paso:nth-child(1)').getBoundingClientRect();
      const b = document.querySelector('.manana-paso:nth-child(2)').getBoundingClientRect();
      const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) * 16;
      return { topA: Math.round(a.top), topB: Math.round(b.top), nav, escalaA: getComputedStyle(document.querySelector('.manana-paso:nth-child(1) .manana-card')).transform };
    });
    ok('sticky-stack: el paso 1 queda pegado bajo la cabecera', st.topA >= st.nav && st.topA < st.nav + 60, st);
    ok('sticky-stack: el paso 2 entra por debajo', st.topB > st.topA + 40, st);
    /* el último paso también se pega, con los tres anteriores aún apilados detrás */
    await page.evaluate(() => {
      const li = document.querySelector('.manana-paso:last-child');
      const top = parseFloat(getComputedStyle(li).top);
      window.scrollTo({ top: li.getBoundingClientRect().top + window.scrollY - top, behavior: 'instant' });
    });
    await page.waitForTimeout(1200);
    const pila = await page.evaluate(() => Array.from(document.querySelectorAll('.manana-card')).map((c) => Math.round(c.getBoundingClientRect().top)));
    ok('sticky-stack: el paso 4 se pega y los tres anteriores siguen apilados detrás', pila[3] > pila[2] && pila[2] > pila[1] && pila[1] > pila[0] && pila[0] > 60, pila);
    /* al seguir bajando, la pila sale entera: la penúltima no asoma por encima de la última */
    let asoma = 0;
    for (let paso = 0; paso < 12; paso++) {
      await page.evaluate(() => window.scrollBy({ top: 60, behavior: 'instant' }));
      await page.waitForTimeout(120);
      const t = await page.evaluate(() => Array.from(document.querySelectorAll('.manana-card')).map((c) => Math.round(c.getBoundingClientRect().top)));
      asoma = Math.max(asoma, t[3] - t[2]);
    }
    ok('sticky-stack: al salir, la penúltima tarjeta no sube por encima de la última (diferencia ≤ escalón de 22 px)', asoma <= 26, asoma);
    await page.screenshot({ path: path.join(CAPS, '06-manana-sticky.png') });

    /* indicador de escritorio: tallo que crece, nudo activo y navegación */
    await irA(page, '#manana', 60);
    await page.waitForTimeout(900);
    const ind = await page.evaluate(() => {
      const nav = document.querySelector('.tallo-nav');
      const nudos = Array.from(nav.querySelectorAll('.tallo-nudo'));
      return {
        visible: getComputedStyle(nav).display !== 'none' && !nav.hidden,
        nudos: nudos.length,
        p: parseFloat(nav.style.getPropertyValue('--p')),
        activo: nudos.findIndex((n) => n.classList.contains('es-activo')),
        pasados: nudos.filter((n) => n.classList.contains('es-pasado')).length,
        nombre: nudos.find((n) => n.classList.contains('es-activo')).getAttribute('aria-label'),
        florVisible: parseFloat(getComputedStyle(nudos.find((n) => n.classList.contains('es-activo')).querySelector('.flor')).transform.split(',')[0].replace('matrix(', '')) > 0.9,
        tops: nudos.map((n) => parseFloat(n.style.top))
      };
    });
    ok('indicador: el tallo lateral se ve en escritorio con un nudo por sección', ind.visible && ind.nudos === 8, ind);
    ok('indicador: el tallo ha crecido en proporción al scroll (0 < p < 1)', ind.p > 0.3 && ind.p < 0.9, ind.p);
    ok('indicador: en "Una mañana" el nudo activo es el 5º, los 4 anteriores son capullos y su flor está abierta', ind.activo === 4 && ind.pasados === 4 && ind.nombre === 'Una mañana' && ind.florVisible, ind);
    ok('indicador: los nudos van en orden de arriba abajo', ind.tops.every((t, i) => i === 0 || t > ind.tops[i - 1]), ind.tops);
    /* la barra crece como un único tramo continuo (scaleY), no como un guión repetido */
    const barra = await page.evaluate(() => {
      const crece = document.querySelector('.tallo-nav-crece');
      const nav = document.querySelector('.tallo-nav');
      const r = crece.getBoundingClientRect();
      const navR = nav.getBoundingClientRect();
      const p = parseFloat(nav.style.getPropertyValue('--p'));
      return { altoReal: Math.round(r.height), altoEsperado: Math.round(navR.height * p), top: Math.round(r.top), navTop: Math.round(navR.top) };
    });
    ok('indicador: la barra verde es un único tramo continuo cuya altura coincide con el progreso (no un guión repetido)', Math.abs(barra.altoReal - barra.altoEsperado) < 3 && Math.abs(barra.top - barra.navTop) < 3, barra);
    await page.screenshot({ path: path.join(CAPS, '06b-indicador-tallo.png') });
    await page.click('.tallo-nudo[href="#carta"]');
    await page.waitForTimeout(2200);
    const enCarta = await page.evaluate(() => Math.abs(document.querySelector('#carta').getBoundingClientRect().top - 72) < 60);
    ok('indicador: clic en un nudo lleva a su sección', enCarta);

    /* contador */
    await irA(page, '#resenas', 100);
    await page.waitForTimeout(2600);
    const cont = await page.textContent('.contador');
    ok('reseñas: el contador llega a 27', cont.trim() === '27', cont);
    await page.screenshot({ path: path.join(CAPS, '07-resenas.png') });

    /* mapa: no hay iframe hasta el clic */
    await irA(page, '#contacto', 100);
    await page.waitForTimeout(1500);
    ok('mapa: sin iframe antes del clic', (await page.$$('.mapa iframe')).length === 0);
    await page.click('.map-consent');
    await page.waitForTimeout(800);
    const src = await page.getAttribute('.mapa iframe', 'src');
    ok('mapa: el clic crea el iframe de Google Maps sin API key', !!src && src.includes('google.com/maps?q=') && src.includes('output=embed') && !src.includes('key='), src);
    await page.screenshot({ path: path.join(CAPS, '08-contacto-mapa.png') });

    /* toda la página, para revisar a ojo */
    await page.evaluate(() => window.scrollTo(0, 0));
    await bajarDespacio(page);
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(CAPS, '09-pagina-completa.png'), fullPage: true });

    /* nada oculto por un reveal que nunca disparó */
    const ocultos = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-reveal], .petalo-card, .split-char')).filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.9).map((el) => el.className || el.tagName).slice(0, 8);
    });
    ok('recorrido: nada se quedó invisible tras bajar toda la página', ocultos.length === 0, ocultos);
    ok('recorrido: sin errores de consola', page.errores.length === 0, page.errores);
    await page.close();
  }

  /* ================= 3 · reduced-motion: flor abierta, sin GSAP ocultando nada ================= */
  {
    const page = await nuevaPagina(browser, { reducedMotion: 'reduce' });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const rm = await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('.flor .flor-abre'));
      const abiertas = f.filter((g) => parseFloat(getComputedStyle(g).opacity) > 0.95 && (getComputedStyle(g).transform === 'none')).length;
      const ocultos = Array.from(document.querySelectorAll('[data-reveal], .petalo-card, h2')).filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.9).length;
      return { motion: document.documentElement.classList.contains('has-motion'), abiertas: abiertas + '/' + f.length, ocultos, marquee: getComputedStyle(document.querySelector('.marquee-pista')).animationName, contador: document.querySelector('.contador').textContent };
    });
    ok('reduced-motion: no se activa has-motion', !rm.motion);
    ok('reduced-motion: la flor aparece ya abierta', rm.abiertas === '10/10', rm.abiertas);
    ok('reduced-motion: nada oculto', rm.ocultos === 0, rm.ocultos);
    ok('reduced-motion: marquee parado', rm.marquee === 'none', rm.marquee);
    ok('reduced-motion: el contador muestra 27 directamente', rm.contador === '27', rm.contador);
    const rmC = await page.evaluate(() => { const c = document.querySelector('[data-cortina]'); return { display: getComputedStyle(c).display, hidden: c.hidden }; });
    ok('reduced-motion: la cortina no llega a verse', rmC.display === 'none', rmC);
    await page.screenshot({ path: path.join(CAPS, '10-reduced-motion.png') });
    await page.close();
  }

  /* ================= 4 · sin GSAP (CDN caído): todo visible ================= */
  {
    const page = await nuevaPagina(browser);
    await page.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/, (r) => r.abort());
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const sin = await page.evaluate(() => ({
      motion: document.documentElement.classList.contains('has-motion'),
      h1: parseFloat(getComputedStyle(document.querySelector('.hero-titulo')).opacity),
      flores: Array.from(document.querySelectorAll('.flor .flor-abre')).every((g) => parseFloat(getComputedStyle(g).opacity) > 0.95),
      contador: document.querySelector('.contador').textContent
    }));
    ok('sin CDN: contenido visible y flor abierta', !sin.motion && sin.h1 === 1 && sin.flores && sin.contador === '27', sin);
    await page.click('.map-consent');
    await page.waitForTimeout(300);
    const sinC = await page.evaluate(() => ({ hidden: document.querySelector('[data-cortina]').hidden, display: getComputedStyle(document.querySelector('[data-cortina]')).display }));
    ok('sin CDN: la cortina se retira igual (no deja el sitio tapado)', sinC.hidden && sinC.display === 'none', sinC);
    ok('sin CDN: el mapa sigue funcionando', (await page.$$('.mapa iframe')).length === 1);
    await page.close();
  }

  /* ================= 5 · móvil 400 px: ramas en lista, sin scroll horizontal, menú ================= */
  {
    const page = await nuevaPagina(browser, { viewport: { width: 400, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => { try { localStorage.setItem('ceibo-cookie-ack', '1'); } catch (e) {} });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(4200);
    await page.screenshot({ path: path.join(CAPS, '11-movil-hero.png') });
    const ancho = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, ventana: window.innerWidth }));
    ok('móvil 400: sin scroll horizontal', ancho.scroll <= ancho.ventana + 1, ancho);
    await bajarDespacio(page);
    const lista = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.rama--cafe .petalo-card'));
      const tops = cards.map((c) => Math.round(c.getBoundingClientRect().top + window.scrollY));
      const ordenados = tops.every((t, i) => i === 0 || t > tops[i - 1]);
      const tallos = getComputedStyle(document.querySelector('.rama--cafe .rama-tallos')).display;
      const op = Math.min(...cards.map((c) => parseFloat(getComputedStyle(c).opacity)));
      return { ordenados, tallos, op, anchoCard: Math.round(cards[0].getBoundingClientRect().width) };
    });
    ok('móvil 400: la rama pasa de radial a lista (pétalos uno bajo otro)', lista.ordenados && lista.tallos === 'none', lista);
    ok('móvil 400: los pétalos de la lista son visibles y anchos', lista.op > 0.95 && lista.anchoCard > 300, lista);
    const ancho2 = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, ventana: window.innerWidth }));
    ok('móvil 400: sigue sin scroll horizontal tras bajar', ancho2.scroll <= ancho2.ventana + 1, ancho2);
    await irA(page, '#carta', 60);
    await page.screenshot({ path: path.join(CAPS, '12-movil-carta-lista.png') });
    /* indicador móvil: flor en la cabecera con un pétalo por sección, el tallo oculto */
    await irA(page, '#manana', 60);
    await page.waitForTimeout(1200);
    const cab = await page.evaluate(() => ({
      tallo: getComputedStyle(document.querySelector('.tallo-nav')).display,
      petalos: document.querySelectorAll('.cab-flor path').length,
      abiertos: document.querySelectorAll('.cab-flor path.abierto').length,
      rotulo: document.querySelector('.cab-seccion').textContent,
      florVisible: getComputedStyle(document.querySelector('.cab-flor')).display !== 'none',
      ancho: document.querySelector('.cabecera').scrollWidth <= window.innerWidth
    }));
    ok('móvil 400: el tallo lateral no se muestra', cab.tallo === 'none', cab.tallo);
    ok('móvil 400: la flor de la cabecera tiene 8 pétalos y en "Una mañana" hay 5 abiertos', cab.florVisible && cab.petalos === 8 && cab.abiertos === 5, cab);
    ok('móvil 400: la cabecera muestra el nombre de la sección y no desborda', cab.rotulo === 'Una mañana' && cab.ancho, cab);
    await page.screenshot({ path: path.join(CAPS, '12b-movil-cabecera-flor.png') });
    /* reseñas a una columna y a todo el ancho */
    await irA(page, '#resenas', 60);
    await page.waitForTimeout(1200);
    const res = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.resena')).map((c) => c.getBoundingClientRect());
      const cifra = document.querySelector('.resenas-cifra').getBoundingClientRect();
      return { anchoMin: Math.round(Math.min(...cards.map((r) => r.width))), izq: Math.round(cards[0].left), cifraIzq: Math.round(cifra.left), ventana: window.innerWidth };
    });
    ok('móvil 400: las reseñas ocupan todo el ancho, bajo la cifra, sin columna vacía a la izquierda', res.anchoMin >= res.ventana - 40 && res.izq === res.cifraIzq, res);
    await page.screenshot({ path: path.join(CAPS, '12c-movil-resenas.png') });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.click('.nav-toggle');
    await page.waitForTimeout(300);
    ok('móvil 400: el menú se abre', await page.isVisible('.nav-movil'));
    await page.click('.nav-movil a[href="#contacto"]');
    await page.waitForTimeout(2200);
    const enContacto = await page.evaluate(() => Math.abs(document.querySelector('#contacto').getBoundingClientRect().top) < 140);
    ok('móvil 400: el enlace del menú lleva a Contacto y cierra el menú', enContacto && !(await page.isVisible('.nav-movil')), enContacto);
    await page.screenshot({ path: path.join(CAPS, '13-movil-contacto.png') });
    ok('móvil: sin errores de consola', page.errores.length === 0, page.errores);
    await page.close();
  }

  /* ================= 6 · rendimiento: tareas largas durante la apertura de la flor ================= */
  {
    const page = await nuevaPagina(browser);
    await page.addInitScript(() => {
      window.__long = [];
      try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { window.__long = []; });
    await page.waitForTimeout(3800);
    const largas = await page.evaluate(() => window.__long);
    ok('rendimiento: sin tareas largas > 100 ms durante la animación de apertura (medido desde fonts.ready)', largas.filter((d) => d > 100).length === 0, largas);
    await page.close();
  }

  await browser.close();
  const fallos = resultados.filter((r) => !r.ok);
  fs.writeFileSync(path.join(__dirname, 'verify-report.json'), JSON.stringify({ fecha: new Date().toISOString(), base: BASE, total: resultados.length, fallos: fallos.length, resultados }, null, 2));
  console.log('\n' + (resultados.length - fallos.length) + '/' + resultados.length + ' pruebas OK');
  process.exit(fallos.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
