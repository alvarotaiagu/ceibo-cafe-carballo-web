/* Ceibo · Café de especialidad — movimiento y utilidades.
   GSAP/ScrollTrigger/Lenis cargan de un CDN; si fallan (bloqueador, red),
   nada de lo de abajo puede romper el contenido: la flor aparece abierta,
   los textos visibles, el mapa y el teléfono funcionan. Por eso los estados
   "ocultos" del CSS viven bajo html.has-motion, que solo se activa aquí. */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gsapReady = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
  const motion = gsapReady && !reduce;
  const html = document.documentElement;
  if (gsapReady) gsap.registerPlugin(ScrollTrigger);
  if (motion) html.classList.add("has-motion");

  /* ---------- Utilidades ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const navH = () => parseFloat(getComputedStyle(html).getPropertyValue("--nav-h")) * 16 || 72;

  /* origen de transformación exacto para un elemento SVG: GSAP mide los
     "px" del transformOrigin desde la esquina del bbox, así que se convierte
     un punto local (lx, ly) a ese sistema. Evita el problema clásico de
     "transformOrigin mide sobre el bbox" en grupos anidados. */
  function originAt(el, lx, ly) {
    const bb = el.getBBox();
    return (lx - bb.x) + "px " + (ly - bb.y) + "px";
  }

  /* ---------- División en caracteres (accesible) ---------- */
  function splitChars(el) {
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.innerHTML = "";
    const words = text.split(/\s+/);
    const chars = [];
    words.forEach((word, i) => {
      const ws = document.createElement("span");
      ws.className = "split-word";
      ws.setAttribute("aria-hidden", "true");
      Array.from(word).forEach((ch) => {
        const cs = document.createElement("span");
        cs.className = "split-char";
        cs.textContent = ch;
        ws.appendChild(cs);
        chars.push(cs);
      });
      el.appendChild(ws);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return chars;
  }
  const splitMap = new Map();
  if (motion) $$("[data-split-char]").forEach((el) => splitMap.set(el, splitChars(el)));

  /* ---------- Aviso de cookies ---------- */
  (function initCookieBanner() {
    const banner = $(".cookie-banner");
    const ack = $(".cookie-ack");
    if (!banner || !ack) return;
    const KEY = "ceibo-cookie-ack";
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch (e) {}
    if (!seen) banner.hidden = false;
    ack.addEventListener("click", () => {
      banner.hidden = true;
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
    });
  })();

  /* ---------- Menú móvil ---------- */
  const toggle = $(".nav-toggle");
  const navMovil = $(".nav-movil");
  function closeNav() {
    if (!toggle || !navMovil) return;
    toggle.setAttribute("aria-expanded", "false");
    navMovil.hidden = true;
  }
  if (toggle && navMovil) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      navMovil.hidden = open;
    });
  }

  /* ---------- Mapa bajo demanda (sin API key, sin cookies hasta el clic) ---------- */
  (function initMapConsent() {
    const btn = $(".map-consent");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const q = encodeURIComponent("Ceibo Café de especialidad, Rúa Camiño Novo 18, 15100 Carballo");
      const iframe = document.createElement("iframe");
      iframe.src = "https://www.google.com/maps?q=" + q + "&output=embed";
      iframe.title = "Mapa: Ceibo, Rúa Camiño Novo 18, Carballo";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.setAttribute("allowfullscreen", "");
      btn.replaceWith(iframe);
    });
  })();

  /* ---------- Botón flotante de llamada ---------- */
  (function initCallFab() {
    const fab = $(".call-fab");
    const hero = $(".hero");
    if (!fab || !hero || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(([entry]) => {
      fab.classList.toggle("is-visible", !entry.isIntersecting);
    }, { threshold: 0.15 }).observe(hero);
  })();

  /* ---------- Cabecera con sombra al hacer scroll ---------- */
  const cabecera = $(".cabecera");
  function onScrollHeader() {
    if (cabecera) cabecera.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Lenis ---------- */
  let lenis = null;
  if (motion && typeof Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- Cortina de entrada (preloader) ----------
     Orquestación: el tallo crece, el glifo se descubre de abajo arriba, la
     palabra sube desde una máscara, la línea se abre y el pie asienta su
     letter-spacing. Después el panel se levanta con un borde curvo y el
     contenido de dentro sube un poco más rápido (paralaje) para que el
     corte no parezca una persiana.

     Dos momentos distintos, y son distintos a propósito:
       · alAbrirse(fn) → cuando EMPIEZA a levantarse, para que la página ya
         esté viva cuando asoma (el hero arranca aquí, no después).
       · retirar()     → cuando termina: quita el nodo, devuelve el scroll y
         refresca ScrollTrigger, que midió con overflow:hidden.
     Se retira SIEMPRE: sin GSAP, con reduced-motion o si algo falla a mitad
     (red de seguridad), porque una cortina que se queda tapa el sitio entero. */
  const cortina = (function initCortina() {
    const el = $("[data-cortina]");
    const espera = [];
    let abierta = false;
    let fuera = false;

    function abrir() {
      if (abierta) return;
      abierta = true;
      espera.splice(0).forEach((fn) => { try { fn(); } catch (e) {} });
    }
    function retirar() {
      abrir();
      if (fuera) return;
      fuera = true;
      if (el) el.hidden = true;
      html.classList.remove("cortina-activa");
      if (lenis) lenis.start();
      if (gsapReady) ScrollTrigger.refresh();
    }

    const api = { alAbrirse: (fn) => (abierta ? fn() : espera.push(fn)) };
    if (!el || !motion) { retirar(); return api; }

    html.classList.add("cortina-activa");
    if (lenis) lenis.stop();

    const lienzo = $(".cortina__lienzo", el);
    const glifo = $(".cortina__glifo", el);
    const tallo = $(".cortina__tallo", el);
    const marca = $(".cortina__marca span", el);
    const linea = $(".cortina__linea", el);
    const pie = $(".cortina__pie", el);
    const borde = $(".cortina__borde", el);
    const SUBE = 1.25; /* segundo en el que arranca el levantamiento */

    const tl = gsap.timeline({ onComplete: retirar });
    if (tallo) tl.to(tallo, { scaleY: 1, duration: 0.62, ease: "power2.out" }, 0);
    if (glifo) tl.to(glifo, { clipPath: "inset(0% 0 0 0)", duration: 0.8, ease: "power2.inOut" }, 0.1);
    /* el estado inicial es un translateY(108%) de CSS: GSAP lo lee del matrix
       como "y: 103px", no como yPercent, así que hay que poner a cero LAS DOS
       o la palabra se queda fuera de la máscara y no aparece nunca. */
    if (marca) tl.to(marca, { y: 0, yPercent: 0, duration: 0.9, ease: "expo.out" }, 0.42);
    if (linea) tl.to(linea, { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, 0.7);
    if (pie) tl.to(pie, { opacity: 1, letterSpacing: "0.34em", duration: 0.85, ease: "power2.out" }, 0.72);

    tl.add(abrir, SUBE);
    if (lienzo) tl.to(lienzo, { yPercent: -16, opacity: 0, duration: 0.6, ease: "power2.in" }, SUBE);
    if (borde) tl.to(borde, { scaleY: 0.1, duration: 1.0, ease: "expo.inOut" }, SUBE);
    tl.to(el, { yPercent: -100, duration: 1.0, ease: "expo.inOut" }, SUBE);

    setTimeout(retirar, 5000);
    return api;
  })();

  /* ---------- Indicador de progreso: tallo lateral (escritorio) y flor en la
     cabecera (móvil). Listener de scroll propio (sin GSAP) para que funcione
     también sin CDN y con reduced-motion; el CSS decide cuál se ve. ---------- */
  (function initIndicador() {
    const SECCIONES = [
      { el: $(".hero"), href: "#inicio", nombre: "Inicio" },
      { el: $("#ceibo"), href: "#ceibo", nombre: "La flor" },
      { el: $("#carta"), href: "#carta", nombre: "Carta" },
      { el: $("#especialidad"), href: "#especialidad", nombre: "Café" },
      { el: $("#manana"), href: "#manana", nombre: "Una mañana" },
      { el: $("#resenas"), href: "#resenas", nombre: "Reseñas" },
      { el: $("#instagram"), href: "#instagram", nombre: "Instagram" },
      { el: $("#contacto"), href: "#contacto", nombre: "Contacto" }
    ].filter((s) => s.el);
    const tallo = $(".tallo-nav");
    const flor = $(".cab-flor");
    const rotulo = $(".cab-seccion");
    if (!SECCIONES.length || (!tallo && !flor)) return;
    const NS = "http://www.w3.org/2000/svg";

    /* nudos del tallo: <a> con hoja + flor + nombre, situados en proporción
       al inicio de cada sección sobre el scroll total */
    const nudos = [];
    if (tallo) {
      SECCIONES.forEach((s) => {
        const a = document.createElement("a");
        a.className = "tallo-nudo";
        a.href = s.href;
        a.setAttribute("aria-label", s.nombre);
        a.innerHTML = '<svg viewBox="-6 -12 32 24" aria-hidden="true"><circle r="9" fill="transparent"/>' +
          '<path class="hoja" d="M0 0 C4 -8 14 -8 20 0 C14 8 4 8 0 0 Z"/>' +
          '<path class="flor" d="M0 0 C2 -8 10 -14 18 -11 C22 -10 21 -5 16 -3 C11 0 5 0 0 0 Z"/></svg>' +
          '<span class="tallo-nombre">' + s.nombre + "</span>";
        tallo.appendChild(a);
        nudos.push(a);
      });
      tallo.hidden = false;
    }

    /* pétalos de la flor de la cabecera: uno por sección, en un <g> girado
       (el giro va en el <g> porque el transform CSS del pétalo pisaría el
       atributo transform si estuviera en el mismo elemento) */
    const petalos = [];
    if (flor) {
      SECCIONES.forEach((s, i) => {
        const g = document.createElementNS(NS, "g");
        g.setAttribute("transform", "rotate(" + (-90 + i * (360 / SECCIONES.length)) + ")");
        const p = document.createElementNS(NS, "path");
        p.setAttribute("d", "M0 0 C-4 -6 -4 -14 0 -18 C4 -14 4 -6 0 0 Z");
        g.appendChild(p);
        flor.appendChild(g);
        petalos.push(p);
      });
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("r", "2.6");
      flor.appendChild(c);
    }

    let offsets = [];
    let max = 1;
    function medir() {
      max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      offsets = SECCIONES.map((s) => s.el.getBoundingClientRect().top + window.scrollY);
      nudos.forEach((a, i) => { a.style.top = (Math.min(1, offsets[i] / max) * 100).toFixed(2) + "%"; });
    }
    let activo = -1;
    function pintar() {
      const y = window.scrollY;
      const p = Math.min(1, Math.max(0, y / max));
      if (tallo) tallo.style.setProperty("--p", p.toFixed(4));
      let act = 0;
      offsets.forEach((o, i) => { if (o <= y + window.innerHeight * 0.42) act = i; });
      if (y + window.innerHeight >= document.documentElement.scrollHeight - 2) act = SECCIONES.length - 1;
      if (act === activo) return;
      activo = act;
      nudos.forEach((a, i) => {
        a.classList.toggle("es-activo", i === act);
        a.classList.toggle("es-pasado", i < act);
        if (i === act) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
      petalos.forEach((pt, i) => pt.classList.toggle("abierto", i <= act));
      if (rotulo) {
        rotulo.style.opacity = "0";
        setTimeout(() => { rotulo.textContent = SECCIONES[act].nombre; rotulo.style.opacity = "1"; }, reduce ? 0 : 180);
      }
    }
    let pendiente = false;
    function onScroll() {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => { pendiente = false; pintar(); });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { medir(); activo = -1; pintar(); });
    window.addEventListener("load", () => { medir(); activo = -1; pintar(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { medir(); activo = -1; pintar(); });
    medir();
    pintar();
  })();

  /* anclas: desplazamiento suave (con Lenis si está) y cierre del menú */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeNav();
      const offset = -navH();
      if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 });
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce ? "auto" : "smooth" });
      history.replaceState(null, "", id);
    });
  });

  /* ---------- Sin movimiento: valores finales y fin ---------- */
  if (!motion) {
    $$("[data-contador]").forEach((el) => { el.textContent = el.dataset.contador; });
    return;
  }

  /* ---------- Hero: la flor se abre ---------- */
  (function initHeroFlower() {
    const lamina = $(".flor-lamina");
    const heroTitle = $(".hero-titulo");
    const heroReveals = $$(".hero [data-reveal]");
    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.15, paused: true });

    if (lamina) {
      const tallo = $(".tallo", lamina);
      const hojas = $$(".hoja-abre", lamina);
      const flores = $$(".flor", lamina).sort((a, b) => +a.dataset.i - +b.dataset.i).map((f) => $(".flor-abre", f));
      const ests = flores.map((f) => $(".flor-est", f)).filter(Boolean);

      flores.forEach((f) => gsap.set(f, { transformOrigin: originAt(f, 0, 0), scale: 0.12, rotation: -38, opacity: 0 }));
      ests.forEach((e) => gsap.set(e, { transformOrigin: originAt(e, 2, -2), rotation: -55 }));
      hojas.forEach((h) => gsap.set(h, { transformOrigin: originAt(h, 0, 0), scale: 0, opacity: 0 }));

      if (tallo) tl.to(tallo, { strokeDashoffset: 0, duration: 1.7, ease: "power2.inOut" }, 0);
      tl.to(hojas, { scale: 1, opacity: 1, duration: 1.0, stagger: 0.16, ease: "back.out(1.4)" }, 0.45);
      /* los pétalos se despliegan uno a uno, de la base a la punta, 1,1 s cada uno */
      tl.to(flores, { scale: 1, rotation: 0, opacity: 1, duration: 1.1, stagger: 0.13, ease: "power3.out" }, 0.7);
      tl.to(ests, { rotation: 0, duration: 1.0, stagger: 0.13, ease: "power2.out" }, 0.95);
      /* vaivén muy lento, como si le diera el aire; no es un bucle llamativo */
      tl.add(() => {
        gsap.to(lamina, { rotation: 1.1, transformOrigin: "35% 100%", duration: 5.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
      });
    }

    if (heroTitle && splitMap.has(heroTitle)) {
      tl.to(splitMap.get(heroTitle), { opacity: 1, y: 0, rotation: 0, duration: 1.2, stagger: 0.09, ease: "power3.out" }, 0.3);
    }
    tl.to(heroReveals, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1 }, 0.9);

    /* la flor no empieza a abrirse hasta que la cortina se levanta: así lo
       primero que se ve al descubrirse la página ya está en movimiento */
    cortina.alAbrirse(() => tl.play());
  })();

  /* ---------- Char-reveal de los demás titulares ---------- */
  splitMap.forEach((chars, el) => {
    if (el.closest(".hero")) return;
    gsap.to(chars, {
      opacity: 1, y: 0, rotation: 0, duration: 1.05, ease: "power3.out",
      stagger: { each: 0.028, from: "start" },
      scrollTrigger: { trigger: el, start: "top 86%", once: true }
    });
  });

  /* ---------- Reveals genéricos ---------- */
  $$("[data-reveal]").forEach((el) => {
    if (el.closest(".hero")) return;
    gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  });

  /* ---------- Pétalos que caen entre secciones (ligados al scroll) ---------- */
  $$(".petalo").forEach((p, i) => {
    const sec = p.closest("section") || p.parentElement;
    const base = [0, 160, -20, 120, 40][i % 5];
    gsap.fromTo(p, { y: -40, rotation: base - 10 }, {
      y: 320, rotation: base + 16, ease: "none",
      scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: 1.2 }
    });
  });

  /* ---------- Separadores: el tallo se dibuja y la hoja brota ---------- */
  $$(".tallo-sep").forEach((sep) => {
    const linea = $(".tallo-linea", sep);
    const hoja = $(".tallo-hoja", sep);
    if (hoja) gsap.set(hoja, { scale: 0, transformOrigin: "0% 50%" });
    const tl = gsap.timeline({ scrollTrigger: { trigger: sep, start: "top 92%", end: "bottom 40%", scrub: 0.8 } });
    if (linea) tl.to(linea, { strokeDashoffset: 0, ease: "none", duration: 1 });
    if (hoja) tl.to(hoja, { scale: 1, duration: 0.45, ease: "back.out(2)" }, 0.5);
  });

  /* ---------- Carta: cada rama se abre como una flor (stagger radial) ---------- */
  $$(".rama").forEach((rama) => {
    const centro = $(".rama-centro", rama);
    const lineas = $$(".rama-tallos line", rama);
    const cards = $$(".petalo-card", rama);
    gsap.set(centro, { scale: 0.6, opacity: 0 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: rama, start: "top 72%", once: true } });
    tl.to(centro, { scale: 1, opacity: 1, duration: 1.0, ease: "back.out(1.3)" });
    if (lineas.length) tl.to(lineas, { strokeDashoffset: 0, duration: 0.9, stagger: 0.08, ease: "power2.out" }, 0.3);
    tl.to(cards, { opacity: 1, scale: 1, duration: 1.0, stagger: 0.11, ease: "back.out(1.4)" }, 0.5);
  });

  /* ---------- Una mañana: sticky-stack; la tarjeta que queda atrás se encoge.
     Solo escala, sin opacidad: si la tarjeta delantera se vuelve translúcida
     se leen a través de ella los títulos de las que quedaron pegadas detrás. ---------- */
  const pasos = $$(".manana-paso");
  pasos.forEach((li, i) => {
    const next = pasos[i + 1];
    if (!next) return;
    const card = $(".manana-card", li);
    gsap.to(card, {
      scale: 0.94, ease: "none",
      scrollTrigger: { trigger: next, start: "top bottom", end: "top top+=160", scrub: true }
    });
  });

  /* ---------- Contador de reseñas ---------- */
  $$("[data-contador]").forEach((el) => {
    const fin = parseInt(el.dataset.contador, 10) || 0;
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: "top 85%", once: true,
      onEnter: () => gsap.to(obj, { v: fin, duration: 1.8, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(obj.v); } })
    });
  });

  /* ---------- Botones magnéticos (solo con puntero fino) ---------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$("[data-magnetic]").forEach((btn) => {
      const xTo = gsap.quickTo(btn, "x", { duration: 0.6, ease: "power3" });
      const yTo = gsap.quickTo(btn, "y", { duration: 0.6, ease: "power3" });
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      btn.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- Enlace activo en la navegación ---------- */
  const navLinks = $$(".nav a");
  navLinks.forEach((a) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    ScrollTrigger.create({
      trigger: target, start: "top 50%", end: "bottom 50%",
      onToggle: (self) => a.classList.toggle("is-active", self.isActive)
    });
  });

  /* fuentes e imágenes cambian alturas: recalcular */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
