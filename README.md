# Ceibo · Café de especialidad — landing

Sitio estático (HTML/CSS/JS, sin build), mismo *toolkit* técnico que las
webs hermanas del workspace (GSAP + ScrollTrigger, Lenis) pero con su
propia estructura de página y su propio lenguaje visual: **botánico**
(flor, pétalo, rama, tallo, luz de mañana). Primera plantilla del
workspace para el sector "cafetería de especialidad". Abrir con un servidor
estático (`python -m http.server 8993`); con `file://` no cargan bien las
fuentes ni `js/main.js`.

## Datos reales (confirmados por el usuario, usados tal cual)

- Nombre: Ceibo · Café de especialidad. Rúa Camiño Novo, 18, 15100
  Carballo (A Coruña). Teléfono 613 97 89 23 (cableado como `tel:` en el
  FAB y en `#contacto`).
- Google: 4,9 ★ sobre 27 reseñas. Está en el
  hero, en `#resenas` (contador) y en el `AggregateRating` del JSON-LD.
- Cuatro reseñas reales de Google (capturas pasadas por el usuario el
  2026-09-16), transcritas tal cual con nombres abreviados a petición del
  usuario (Bird, Jano A., Pilar M., Jon C.) y fecha aproximada por mes.
- Apertura el 1 de mayo de 2026; al frente Oriana Gisela Frare, vinculada a
  la hostelería de Carballo (fuente: Diario de Bergantiños). Se cita la
  apertura y el nombre, sin biografía.
- Formación de Oriana Gisela Frare (diplomas reales pasados por el usuario
  el 2026-09-17): Nestlé Jóvenes Baristas (Nestlé Professional / UTN.BA,
  mayo de 2022, Buenos Aires), Barista por el Centro Internacional de
  Coctelería (diciembre de 2022) y CSP Barista Skills–Foundation de la
  Specialty Coffee Association (certificado 786516, junio de 2025). Son
  cursos hechos en Buenos Aires, lo que hace más plausible el origen
  argentino, pero sigue sin ser una confirmación explícita; el sitio no
  menciona nacionalidad.
- Instagram `@ceibocafe_` (1.092 seguidores), enlazado en cabecera de
  sección, feed y pie.
- Horario: hay tres versiones distintas (Google / Instagram / Páxinas
  Galegas). Se usa la de Google como provisional, marcada
  `[HORARIO A CONFIRMAR CON LA DUEÑA]` en `#contacto` y reflejada en el
  `openingHoursSpecification` del JSON-LD.
- **Carta real** (foto de la carta de sala pasada por el usuario el
  2026-09-17), transcrita entera y con sus precios: 49 líneas repartidas en
  ocho grupos (Cafetería, Infusiones, Bebidas especiales calientes y frías,
  Focaccias, Tostadas, Dulces, Opciones sin gluten, Bebidas), más los tres
  extras de «Personalizá tu café» (leche vegetal +0,20 €, extra shot
  +0,50 €, café invitado del mes +0,70 €) y las cuatro promos de desayuno y
  merienda (Ceibo 9 €, Clásico 6 €, Dulce 6 €, Mixto 6,50 €). Ya no queda
  ningún `[PRECIO PENDIENTE]` ni `[PRODUCTO PENDIENTE]`.
  - Las tres ramas radiales muestran seis productos reales cada una; la
    carta completa va debajo, en `.pliego`, con las mismas tres columnas
    que la carta impresa (cafetería / bebidas especiales / para comer).
  - De la carta salen además cuatro datos que antes no estaban: los sellos
    **café de especialidad · opciones sin gluten · pet friendly** y el
    **«pide y retira en la barra»** (en `#carta` y en `#contacto`), los
    **tostadores seleccionados que rotan cada mes** (sostiene el principio
    de trazabilidad en `#especialidad`, sin nombrar ningún origen
    concreto) y el proveedor real de los *cinnamon rolls* (Zuccaro).
  - Rango de precios recalculado: de 1,50 € (espresso, agua) a 9 €
    (Promo Ceibo). Sustituye al «1–10 €» de Google en `#contacto` y en el
    `priceRange` del JSON-LD, que además gana `hasMenu` y `petsAllowed`.
  - Lo que sigue rotando (vitrina, infusión del mes, iced tea del día, café
    invitado del mes) se dice como tal al pie de la carta, sin inventar
    cuál es en cada momento.

## Lo que NO se recibió y no se inventó (placeholders visibles)

- Historia del nombre / de la dueña → `[HISTORIA PENDIENTE]` en "Por qué
  Ceibo" (`#ceibo`). Hay un comentario HTML justo debajo con el hueco
  previsto para UNA línea de origen si el cliente lo confirma; a fecha de
  entrega el origen argentino es plausible pero **no confirmado** y el
  sitio no lo menciona.
- Orígenes, fincas, tuestes y notas de cata de cada café → la carta de
  sala no los lista (solo dice que los tostadores rotan cada mes); no se
  inventa ninguno.
- Wifi, reservas, pedidos para llevar, proveedor de café, equipo → no se
  anuncian; `#contacto` lo dice explícitamente.
- Feed de Instagram → 6 huecos: 4 con fotos reales que pasó el cliente y 2
  marcados `[FOTO DEL FEED PENDIENTE]`. No se embebe la API.
- URL del botón "Sitio web" de Google → no confirmada; no se enlaza.

## Marca gráfica

El logo real (círculo granate + trazo blanco curvo, pétalo/vapor) llegó
solo como avatar de Instagram de 150 px. `scripts/generate_brand.py` lo
vectoriza (upscale Lanczos ×6, seguimiento de contorno Moore, Douglas-Peucker,
Catmull-Rom → Bézier) a `assets/img/brand/ceibo-marca.svg` y saca los
iconos PNG desde la misma máscara. Es una traza fiel, no una reinterpretación,
pero conviene pedir el vector original. El trazo **no** se usa como motivo
repetido: el motivo del sitio es la flor.

## Concepto: "Ceibo en flor"

- **Hero**: lámina botánica moderna del racimo de ceibo (*Erythrina
  crista-galli*) generada por `scripts/generate_flower.py` e inyectada
  inline entre `<!-- flor:start -->` y `<!-- flor:end -->`. Al cargar, el
  tallo se dibuja, brotan las hojas y las 10 flores se despliegan una a
  una (1,1 s cada una, `power3.out`, stagger 0,13 s); el estandarte de
  cada flor gira además sobre su bisagra. Sin canvas, sin partículas.
- **Pétalos que caen**: cinco `img.petalo` (assets/img/brand/petalo.svg),
  uno por sección, `translateY + rotate` ligados al scroll (`scrub`), no
  en bucle.
- **Carta en ramas**: cada rama es un círculo central con seis pétalos
  alrededor (`--a` por ítem, radio en `cqw` sobre la rama) y seis tallos
  finos en SVG; al entrar en pantalla el centro aparece, los tallos se
  dibujan y los pétalos se abren con stagger radial. La rama Matcha cambia
  `--acento` a verde. Por debajo de 760 px pasa a lista.
- **Cortina de entrada** (`.cortina`, *preloader* / curtain reveal): panel
  rojo en el que el glifo se descubre de abajo arriba con `clip-path`, un
  tallo crece, la palabra «Ceibo» sube desde una máscara y el pie asienta
  su `letter-spacing`; después el panel se levanta con `expo.inOut` y un
  **borde curvo** (SVG en `top:100%` que se aplana), mientras el contenido
  de dentro sube un 16 % más (paralaje). Dos enganches distintos:
  `alAbrirse()` arranca la flor del hero cuando la cortina EMPIEZA a subir
  —así la página ya está viva al asomar— y `retirar()` quita el nodo,
  devuelve el scroll y hace `ScrollTrigger.refresh()`. Se retira siempre:
  sin GSAP, con reduced-motion (ahí ni se pinta), con `<noscript>`, por
  `setTimeout` de seguridad y por un script inline del HTML por si
  `main.js` no carga.
- **Pliego de la carta completa** (`.pliego`): tres columnas *explícitas*
  en grid (una por `div.pliego-col`), no `columns` CSS. Con columnas
  automáticas el balanceo abría huecos de 200 px entre grupos tan
  dispares; además `.grupo` es un `<section>` y hereda el `padding` global
  de `section`, así que lo anula. 3 → 2 columnas a 1100 px, 1 columna a
  760 px.
- **Separadores**: tallo vertical con una hoja que se dibuja/brota con
  scrub (`.tallo-sep`).
- **Una mañana en Ceibo**: sticky-stack de cuatro pasos (el `<li>` es el
  sticky, el `margin-bottom` es el recorrido); la tarjeta que queda atrás
  se encoge un poco.
- **Indicador de progreso** (`initIndicador()` en `js/main.js`, sin GSAP):
  en escritorio un tallo lateral fijo (`.tallo-nav`) que crece con el
  scroll total, con un nudo por sección situado en proporción a su inicio;
  la hoja del nudo activo se abre en flor roja y muestra el nombre, las
  pasadas quedan como capullos, y cada nudo es un enlace. En móvil
  (≤ 1100 px) una flor en la cabecera (`.cab-flor`) con un pétalo por
  sección que se abre al completarla, más el nombre de la sección actual.
  Elegido por el usuario entre cinco bocetos (`bocetos/indicador-scroll.html`).
- Además: Lenis, char-reveal serif en todos los titulares, botones
  magnéticos, marquee lento en itálica, contador de reseñas.
- Paleta: crema #F6EFE4, rojo ceibo #9B1B1B, verde matcha #7E8F5A (solo
  rama matcha y hojas), marrón café #3A2A22. Modo claro siempre
  (`color-scheme: light only`); no hay tema oscuro a propósito.
- Tipografía: Fraunces (ópticas grandes, eje SOFT; itálicas para nombres
  de bebida) + Nunito.

## Fotografía

El brief pedía fotografía generada; en este entorno no hay herramienta de
generación de imagen. `scripts/process_photos.py` combina:

- **Reales del negocio** (pasadas por el usuario): tres vasos con el logo
  (dos fotos), taza roja con latte art, interior del local (382 px, solo
  a tamaños pequeños). Pies de foto: "Foto real de Ceibo".
- **Archivo Pexels** (licencia comercial libre) elegidas en hojas de
  contacto (`scripts/contact_sheets/`): bol de matcha #5946652, focaccia
  #38578720, galletas #7679507, taza cenital #37242779, taza con luz de
  mañana #13523793, gerberas rojas #18936933, bizcocho #19498139, tosta
  #1843244. Cada una lleva el pie "Foto de archivo (Pexels) · no es de
  Ceibo". `flor` y `tosta` están procesadas pero sin usar en la página.

Gradación por script: balance gray-world suave, curva S leve, saturación
contenida, verdes hacia el matcha apagado, split-toning sombras→café y
luces→crema, viñeta y grano finos. Salida 1600/900 px + LQIP en
`scripts/lqip.txt`.

## Técnica

- Mapa: `google.com/maps?q=<nombre+dirección>&output=embed`, sin API key,
  creado solo al pulsar `.map-consent` (coherente con "sin cookies de
  terceros").
- Aviso de cookies: `display:flex` solo en `:not([hidden])`, el botón
  cierra de verdad y persiste en `localStorage` (`ceibo-cookie-ack`).
- Reduced-motion y CDN caído: los estados ocultos del CSS viven bajo
  `html.has-motion`, que solo pone el JS si GSAP cargó y no hay
  reduced-motion; sin eso la flor aparece abierta y todo es visible.
- Orígenes de transformación SVG: `originAt()` en `js/main.js` convierte
  un punto local a los px-desde-bbox que espera GSAP, para que cada flor
  gire/escale exactamente desde su inserción en el tallo.
- OG image: `scripts/generate_og.js` (Playwright) a partir de la lámina.

## Verificación

`python -m http.server 8993` en la raíz y
`NODE_PATH=/c/Users/alvar/node_modules node scripts/verify.js`:
56 pruebas (apertura de la flor, indicador de progreso en escritorio y móvil, char-reveal, marquee, magnetic, cookies,
pétalos ligados al scroll, separadores, anillo de la carta y cambio a
verde, sticky-stack, contador, mapa bajo demanda, reduced-motion, sin CDN,
móvil 400 px sin scroll horizontal y ramas en lista, menú, longtasks).
Capturas en `screenshots/`, informe en `scripts/verify-report.json`.
