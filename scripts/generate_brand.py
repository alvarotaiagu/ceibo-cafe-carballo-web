# -*- coding: utf-8 -*-
"""Marca de Ceibo: vectoriza el logo real (circulo granate + trazo blanco)
a partir del unico archivo disponible, el avatar de Instagram de 150 px
(scripts/photos_src/logo-ig-150.jpg). No hay potrace ni OpenCV en este
entorno: se escala la mascara blanca x6 con Lanczos, se sigue el contorno
(vecindad de Moore) de cada componente y de cada hueco, se simplifica
(Douglas-Peucker) y se suaviza con Catmull-Rom -> Bezier. Salida:

  assets/img/brand/ceibo-marca.svg   logo completo (circulo + trazo)
  assets/img/brand/ceibo-trazo.svg   solo el trazo blanco (para el pie)
  assets/img/brand/icon-{96,180,192,512}.png  favicons desde la mascara

Uso: python scripts/generate_brand.py
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(os.path.dirname(__file__), "photos_src", "logo-ig-150.jpg")
OUT = os.path.join(RAIZ, "assets", "img", "brand")
os.makedirs(OUT, exist_ok=True)

ROJO = "#9B1B1B"
ESCALA = 6
im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.float32)
h, w = a.shape[:2]
yy, xx = np.mgrid[0:h, 0:w]
cx, cy, r = w / 2 - 0.5, h / 2 - 0.5, min(w, h) / 2 - 2
dentro = (xx - cx) ** 2 + (yy - cy) ** 2 < r * r
# blanco = alta luminancia y poco croma; fuera del circulo no cuenta
blanco = (a.min(axis=2) > 140) & dentro
mask = Image.fromarray((blanco * 255).astype(np.uint8))
mask = mask.resize((w * ESCALA, h * ESCALA), Image.LANCZOS).filter(ImageFilter.GaussianBlur(3.2))
M = (np.asarray(mask) > 127)
H, W = M.shape
S = W  # lienzo cuadrado 900


def componentes(B):
    """etiqueta 4-conexa por inundacion; devuelve lista de mascaras."""
    vis = np.zeros_like(B, dtype=bool)
    comps = []
    ys, xs = np.nonzero(B)
    for y0, x0 in zip(ys, xs):
        if vis[y0, x0]:
            continue
        pila = [(y0, x0)]
        vis[y0, x0] = True
        px = []
        while pila:
            y, x = pila.pop()
            px.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < B.shape[0] and 0 <= nx < B.shape[1] and B[ny, nx] and not vis[ny, nx]:
                    vis[ny, nx] = True
                    pila.append((ny, nx))
        comps.append(px)
    return comps


def contorno(px_set, B):
    """Moore-neighbor tracing sobre el conjunto de pixeles de un componente."""
    ys = [p[0] for p in px_set]
    xs = [p[1] for p in px_set]
    # empieza en el pixel mas alto-izquierdo
    start = min(px_set)
    vec = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
    en = lambda y, x: 0 <= y < B.shape[0] and 0 <= x < B.shape[1] and B[y, x]
    p = start
    b = (start[0], start[1] - 1)  # backtrack: el de la izquierda (fondo)
    cont = [p]
    for _ in range(200000):
        # indice del vecino b respecto a p
        dy, dx = b[0] - p[0], b[1] - p[1]
        k = vec.index((dy, dx))
        encontrado = False
        for i in range(1, 9):
            v = vec[(k + i) % 8]
            q = (p[0] + v[0], p[1] + v[1])
            if en(*q):
                b = (p[0] + vec[(k + i - 1) % 8][0], p[1] + vec[(k + i - 1) % 8][1])
                p = q
                encontrado = True
                break
        if not encontrado:
            break
        if p == start:
            break
        cont.append(p)
    return [(x, y) for (y, x) in cont]


def dp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dmax, idx = 0, 0
    L = math.hypot(x2 - x1, y2 - y1) or 1e-9
    for i in range(1, len(pts) - 1):
        x0, y0 = pts[i]
        d = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / L
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return dp(pts[: idx + 1], eps)[:-1] + dp(pts[idx:], eps)
    return [pts[0], pts[-1]]


def dp_cerrado(c, eps):
    """un contorno cerrado se parte en dos mitades para que DP tenga cuerda."""
    n = len(c)
    a = dp(c[: n // 2 + 1], eps)
    b = dp(c[n // 2:] + [c[0]], eps)
    return a[:-1] + b[:-1]


def catmull_path(pts, escala=1.0):
    n = len(pts)
    P = [(x * escala, y * escala) for x, y in pts]
    d = "M %.1f %.1f" % P[0]
    for i in range(n):
        p0, p1, p2, p3 = P[(i - 1) % n], P[i], P[(i + 1) % n], P[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += " C %.1f %.1f %.1f %.1f %.1f %.1f" % (c1 + c2 + p2)
    return d + " Z"


trazos = []
for comp in componentes(M):
    if len(comp) < 400:
        continue
    c = contorno(comp, M)
    c = dp_cerrado(c, 5.0)
    trazos.append(c)
    # huecos: componentes del fondo encerrados en la caja del componente
    ys = [p[0] for p in comp]; xs = [p[1] for p in comp]
    y0, y1, x0, x1 = min(ys), max(ys), min(xs), max(xs)
    sub = ~M[y0:y1 + 1, x0:x1 + 1]
    for hueco in componentes(sub):
        # descarta los que tocan el borde de la caja (no son huecos)
        if any(y == 0 or y == sub.shape[0] - 1 or x == 0 or x == sub.shape[1] - 1 for y, x in hueco):
            continue
        if len(hueco) < 200:
            continue
        hc = contorno(hueco, sub)
        hc = dp_cerrado(hc, 5.0)
        trazos.append([(x + x0, y + y0) for x, y in hc])

VB = 900
esc = VB / S
paths = " ".join(catmull_path(t, esc) for t in trazos)
print("trazos:", len(trazos), "puntos:", sum(len(t) for t in trazos))

svg_marca = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900" role="img" aria-label="Ceibo">'
             '<circle cx="450" cy="450" r="450" fill="%s"/>'
             '<path fill="#FFFFFF" fill-rule="evenodd" d="%s"/></svg>' % (ROJO, paths))
open(os.path.join(OUT, "ceibo-marca.svg"), "w", encoding="utf-8").write(svg_marca)
svg_trazo = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900" role="img" aria-label="Ceibo">'
             '<path fill="currentColor" fill-rule="evenodd" d="%s"/></svg>' % paths)
open(os.path.join(OUT, "ceibo-trazo.svg"), "w", encoding="utf-8").write(svg_trazo)
open(os.path.join(os.path.dirname(__file__), "trazo-path.txt"), "w").write(paths)

# iconos PNG desde la mascara (sin rasterizador SVG en el entorno)
big = 1024
lienzo = Image.new("RGBA", (big, big), (0, 0, 0, 0))
d = ImageDraw.Draw(lienzo)
d.ellipse((0, 0, big - 1, big - 1), fill=ROJO)
m = Image.fromarray((M * 255).astype(np.uint8)).resize((big, big), Image.LANCZOS)
blanco_capa = Image.new("RGBA", (big, big), (255, 255, 255, 255))
lienzo.paste(blanco_capa, (0, 0), m)
for t in (96, 180, 192, 512):
    lienzo.resize((t, t), Image.LANCZOS).save(os.path.join(OUT, "icon-%d.png" % t), optimize=True)
print("ok")
