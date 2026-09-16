# -*- coding: utf-8 -*-
"""Lamina botanica del ceibo (Erythrina crista-galli) en SVG: un racimo de
flores rojas a lo largo de un tallo curvo, con dos hojas trifoliadas en la
base. Estilo "lamina moderna": linea fina + relleno plano rojo, sin degradados.

Cada flor es un <g class="flor"> con la transformacion estatica (posicion,
giro, escala) y dentro un <g class="flor-abre"> cuyo origen local (0,0) es el
punto de insercion en el tallo: js/main.js lo anima (escala + giro) con ese
origen, y el petalo estandarte (.flor-est) gira ademas sobre su bisagra local
(2,-2). Con reduced-motion no se anima nada y la lamina aparece abierta.

Salidas:
  scripts/flor-inline.svg          se inyecta en index.html entre <!-- flor:start --> y <!-- flor:end -->
  assets/img/brand/ceibo-flor.svg  version independiente (abierta) por si se quiere reutilizar

Uso: python scripts/generate_flower.py   (reinyecta en index.html si existe)
"""
import math
import os
import re

RAIZ = os.path.join(os.path.dirname(__file__), "..")
ROJO, ROJO_2, ROJO_3, LINEA = "#9B1B1B", "#B12A2A", "#851515", "#5E0F10"
VERDE, VERDE_LINEA, TALLO = "#7E8F5A", "#5C6B44", "#6B7A4C"

P0, P1, P2, P3 = (206, 738), (176, 470), (440, 340), (476, 58)


def bez(t):
    u = 1 - t
    x = u**3 * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t**3 * P3[0]
    y = u**3 * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t**3 * P3[1]
    dx = 3 * u * u * (P1[0] - P0[0]) + 6 * u * t * (P2[0] - P1[0]) + 3 * t * t * (P3[0] - P2[0])
    dy = 3 * u * u * (P1[1] - P0[1]) + 6 * u * t * (P2[1] - P1[1]) + 3 * t * t * (P3[1] - P2[1])
    return x, y, math.degrees(math.atan2(dy, dx))


KEEL = "M0 2 C30 -4 76 -2 118 12 C128 16 126 26 116 27 C74 30 30 22 0 10 Z"
ALA = "M4 0 C34 -14 70 -16 96 -8 C70 2 36 6 4 4 Z"
EST = "M2 -2 C18 -46 62 -82 108 -66 C128 -59 126 -32 100 -20 C70 -6 34 -1 2 -2 Z"
EST_NERVIO = "M10 -8 C44 -34 78 -52 104 -58"
CALIZ = "M-8 -12 C-18 -4 -18 10 -8 16 L6 12 L8 -6 Z"
CAPULLO = "M0 0 C20 -14 60 -14 84 -2 C60 10 20 12 0 6 Z"
HOJA = "M0 0 C22 -34 78 -34 112 0 C78 34 22 34 0 0 Z"


def flor(i, x, y, ang, esc, capullo=False):
    g = ['<g class="flor" data-i="%d" transform="translate(%.1f %.1f) rotate(%.1f) scale(%.3f)">' % (i, x, y, ang, esc),
         '<g class="flor-abre">']
    sw = 1.7 / esc
    if capullo:
        g.append('<path class="flor-caliz" d="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round"/>' % (CALIZ, VERDE, VERDE_LINEA, sw))
        g.append('<path d="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round"/>' % (CAPULLO, ROJO_2, LINEA, sw))
    else:
        g.append('<path class="flor-est" d="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round"/>' % (EST, ROJO, LINEA, sw))
        g.append('<path class="flor-est-nervio" d="%s" fill="none" stroke="%s" stroke-width="%.2f" stroke-opacity=".45" stroke-linecap="round"/>' % (EST_NERVIO, LINEA, sw * 0.8))
        g.append('<path d="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round"/>' % (KEEL, ROJO_3, LINEA, sw))
        g.append('<path d="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round"/>' % (ALA, ROJO_2, LINEA, sw))
        g.append('<path class="flor-caliz" d="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round"/>' % (CALIZ, VERDE, VERDE_LINEA, sw))
    g.append("</g></g>")
    return "".join(g)


def hoja(x, y, ang, esc):
    partes = ['<g class="hoja" transform="translate(%.1f %.1f) rotate(%.1f) scale(%.3f)"><g class="hoja-abre">' % (x, y, ang, esc)]
    partes.append('<path d="M0 0 L60 0" stroke="%s" stroke-width="2.2" fill="none"/>' % TALLO)
    for rot, dx in ((0, 60), (-52, 46), (52, 46)):
        partes.append('<g transform="translate(%d 0) rotate(%d)">' % (dx, rot))
        partes.append('<path d="%s" fill="%s" stroke="%s" stroke-width="1.6" stroke-linejoin="round"/>' % (HOJA, VERDE, VERDE_LINEA))
        partes.append('<path d="M4 0 L106 0" stroke="%s" stroke-width="1.2" stroke-opacity=".5" fill="none"/>' % VERDE_LINEA)
        partes.append("</g>")
    partes.append("</g></g>")
    return "".join(partes)


elementos = []
elementos.append('<path class="tallo" d="M%d %d C%d %d %d %d %d %d" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round" pathLength="1"/>' % (P0 + P1 + P2 + P3 + (TALLO,)))
elementos.append(hoja(*bez(0.10)[:2], bez(0.10)[2] + 118, 0.78))
elementos.append(hoja(*bez(0.19)[:2], bez(0.19)[2] - 122, 0.68))

flores = [(0.30, 1, 1.00), (0.38, -1, 0.98), (0.46, 1, 0.94), (0.54, -1, 0.90),
          (0.62, 1, 0.84), (0.70, -1, 0.78), (0.78, 1, 0.70), (0.86, -1, 0.60),
          (0.93, 1, 0.50), (0.985, -1, 0.42)]
for i, (t, lado, esc) in enumerate(flores):
    x, y, tang = bez(t)
    # sale perpendicular al tallo y cae un poco (las flores del ceibo cuelgan)
    ang = tang + lado * 74 + 14
    elementos.append(flor(i, x, y, ang, esc, capullo=(i >= 8)))

cuerpo = "".join(elementos)
inline = ('<svg class="flor-lamina" viewBox="0 0 640 760" xmlns="http://www.w3.org/2000/svg" role="img" '
          'aria-labelledby="flor-titulo"><title id="flor-titulo">Lámina botánica: racimo de flores de ceibo</title>%s</svg>' % cuerpo)
open(os.path.join(os.path.dirname(__file__), "flor-inline.svg"), "w", encoding="utf-8").write(inline)
standalone = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 760">%s</svg>' % cuerpo
os.makedirs(os.path.join(RAIZ, "assets", "img", "brand"), exist_ok=True)
open(os.path.join(RAIZ, "assets", "img", "brand", "ceibo-flor.svg"), "w", encoding="utf-8").write(standalone)

# un solo petalo (estandarte) para los petalos que caen entre secciones
petalo = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -88 136 92"><path d="%s" fill="%s" stroke="%s" stroke-width="1.6" stroke-linejoin="round"/>'
          '<path d="%s" fill="none" stroke="%s" stroke-width="1.3" stroke-opacity=".45" stroke-linecap="round"/></svg>' % (EST, ROJO, LINEA, EST_NERVIO, LINEA))
open(os.path.join(RAIZ, "assets", "img", "brand", "petalo.svg"), "w", encoding="utf-8").write(petalo)

idx = os.path.join(RAIZ, "index.html")
if os.path.exists(idx):
    html = open(idx, encoding="utf-8").read()
    nuevo = re.sub(r"<!-- flor:start -->.*?<!-- flor:end -->", "<!-- flor:start -->" + inline + "<!-- flor:end -->", html, flags=re.S)
    if nuevo != html:
        open(idx, "w", encoding="utf-8").write(nuevo)
        print("inyectada en index.html")
print("ok", len(inline), "bytes")
