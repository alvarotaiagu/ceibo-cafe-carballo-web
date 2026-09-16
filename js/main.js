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
    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.15 });

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
