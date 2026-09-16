# -*- coding: utf-8 -*-
"""Fotografia de la web de Ceibo: descarga, recorte y gradacion.

El brief pedia "fotografia original generada"; en este entorno no hay
herramienta de generacion de imagen, asi que la web combina:

  A) Fotos REALES del negocio, pasadas por el usuario (feed de Instagram
     @ceibocafe_ y ficha de Google), en scripts/photos_src/ceibo-*.jpg|webp:
       vasos1  ceibo-vasos-1.jpg   tres vasos con el logo, matcha y bebida rosa
       vasos2  ceibo-vasos-2.jpg   los mismos vasos, hielo, primer plano
       taza    ceibo-taza-roja.jpg taza roja con latte art (foto de la cuenta)
       local   ceibo-local.webp    interior del local (382 px, solo tamanos pequenos)

  B) Fotos de archivo Pexels (licencia comercial libre, sin atribucion
     obligatoria) elegidas a mano en hojas de contacto (scripts/contact_sheets)
     buscando "luz de manana, mesa clara, fondo limpio":
       matcha    Pexels #5946652   bol de matcha verde intenso entre dos manos
       focaccia  Pexels #38578720  focaccia cortada sobre tabla, fondo marmol
       galletas  Pexels #7679507   galletas sobre papel de horno, cenital
       taza2     Pexels #37242779  taza pequena sobre marmol, cenital, sin latte art
       manana    Pexels #13523793  taza con luz lateral de manana y sombras
       flor      Pexels #18936933  gerberas rojas en vaso de cristal junto a ventana
       bizcocho  Pexels #19498139  porcion de bizcocho de chocolate en plato claro
       tosta     Pexels #1843244   tosta en bandeja con florecilla, luz de manana
     NINGUNA de las B es de Ceibo y la web lo declara en cada pie de foto.

Gradacion por script (sin filtros CSS): balance de blancos gray-world suave,
curva en S leve, saturacion contenida, split-toning con sombras a marron cafe
#3A2A22 y luces a crema #F6EFE4, empujon calido en los medios altos, y los
verdes llevados hacia el verde matcha apagado #7E8F5A. Vineta muy leve y grano
fino. Salida en assets/img/photos/ a 1600 y 900 px + LQIP de 24 px.

Uso: python scripts/process_photos.py
"""
import base64
import concurrent.futures
import io
import os
import urllib.request

import numpy as np
from PIL import Image

RAIZ = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(os.path.dirname(__file__), "photos_src")
OUT = os.path.join(RAIZ, "assets", "img", "photos")
os.makedirs(OUT, exist_ok=True)

# nombre: (origen, proporcion ancho/alto, anclaje vertical 0..1, ancho maximo)
# origen = id de Pexels o nombre de archivo local en photos_src
PHOTOS = {
    "vasos1":   ("ceibo-vasos-1.jpg", 4 / 5, 0.55, 1200),
    "vasos2":   ("ceibo-vasos-2.jpg", 1 / 1, 0.50, 1200),
    "taza":     ("ceibo-taza-roja.jpg", 3 / 2, 0.50, 1200),
    "local":    ("ceibo-local.webp", 3 / 4, 0.50, 382),
    "matcha":   ("5946652", 4 / 5, 0.50, 1400),
    "focaccia": ("38578720", 4 / 3, 0.50, 1600),
    "galletas": ("7679507", 4 / 3, 0.50, 1600),
    "taza2":    ("37242779", 1 / 1, 0.50, 1400),
    "manana":   ("13523793", 3 / 2, 0.50, 1600),
    "flor":     ("18936933", 3 / 4, 0.40, 1300),
    "bizcocho": ("19498139", 4 / 3, 0.50, 1600),
    "tosta":    ("1843244", 3 / 2, 0.55, 1600),
}

CREMA = np.array([0xF6, 0xEF, 0xE4]) / 255.0
CAFE = np.array([0x3A, 0x2A, 0x22]) / 255.0
MATCHA = np.array([0x7E, 0x8F, 0x5A]) / 255.0
CALIDO = np.array([0xD9, 0x8C, 0x5A]) / 255.0
LUMA = np.array([0.299, 0.587, 0.114])
SATURACION = {"matcha": 0.86, "flor": 0.82, "vasos1": 0.9, "vasos2": 0.9, "taza": 0.84}
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")


def origen(nombre, src):
    if not src.isdigit():
        return os.path.join(SRC, src)
    destino = os.path.join(SRC, "%s-%s.jpg" % (nombre, src))
    if os.path.exists(destino) and os.path.getsize(destino) > 40000:
        return destino
    url = ("https://images.pexels.com/photos/%s/pexels-photo-%s.jpeg"
           "?auto=compress&cs=tinysrgb&w=2400" % (src, src))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(destino, "wb") as f:
        f.write(r.read())
    return destino


def recortar(im, prop, anclaje):
    w, h = im.size
    if w / h > prop:
        nw = int(round(h * prop))
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(round(w / prop))
        y = int(round((h - nh) * anclaje))
        im = im.crop((0, y, w, y + nh))
    return im


def gradar(a, nombre):
    medias = a.reshape(-1, 3).mean(0)
    a = np.clip(a * (medias.mean() / np.maximum(medias, 1e-4)) ** 0.45, 0, 1)
    a = np.clip(a * 1.03, 0, 1)
    a = np.clip(a + 0.4 * (a - 0.5) * (1 - np.abs(a - 0.5) * 2) * 0.5, 0, 1)
    l = a @ LUMA
    sat = SATURACION.get(nombre, 0.78)
    gris = np.repeat(l[..., None], 3, axis=2)
    a = np.clip(gris + (a - gris) * sat, 0, 1)
    # verdes hacia el matcha apagado de la paleta
    verdor = np.clip((a[..., 1] - (a[..., 0] + a[..., 2]) / 2) * 3.0, 0, 1)[..., None]
    a = np.clip(a * (1 - verdor * 0.35) + MATCHA * verdor * 0.35, 0, 1)
    sombras = np.clip((0.5 - l) * 2, 0, 1)[..., None]
    luces = np.clip((l - 0.55) * 2.2, 0, 1)[..., None]
    calidos = np.clip(1 - np.abs(l - 0.6) * 3.2, 0, 1)[..., None]
    a = np.clip(a * (1 - sombras * 0.18) + CAFE * sombras * 0.18, 0, 1)
    a = np.clip(a * (1 - luces * 0.22) + CREMA * luces * 0.22, 0, 1)
    a = np.clip(a * (1 - calidos * 0.06) + CALIDO * calidos * 0.06, 0, 1)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    a = np.clip(a * (1 - np.clip(r - 0.75, 0, None) * 0.18)[..., None], 0, 1)
    rng = np.random.default_rng(7)
    a = np.clip(a + rng.normal(0, 0.005, a.shape), 0, 1)
    return a


def procesar(nombre, cfg):
    src, prop, anclaje, ancho_max = cfg
    im = Image.open(origen(nombre, src)).convert("RGB")
    im = recortar(im, prop, anclaje)
    if im.width > ancho_max:
        im = im.resize((ancho_max, int(round(ancho_max / prop))), Image.LANCZOS)
    a = gradar(np.asarray(im).astype(np.float32) / 255.0, nombre)
    out = Image.fromarray((a * 255 + 0.5).astype(np.uint8))
    tam = []
    for ancho in sorted({min(ancho_max, 1600), min(ancho_max, 900)}, reverse=True):
        o = out if out.width <= ancho else out.resize((ancho, int(round(ancho / prop))), Image.LANCZOS)
        o.save(os.path.join(OUT, "%s-%d.jpg" % (nombre, ancho)), quality=82, optimize=True, progressive=True)
        tam.append(ancho)
    lq = out.resize((24, max(2, int(round(24 / prop)))), Image.LANCZOS)
    buf = io.BytesIO()
    lq.save(buf, "JPEG", quality=50)
    return nombre, tam, "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(4) as ex:
        res = list(ex.map(lambda kv: procesar(*kv), PHOTOS.items()))
    with open(os.path.join(os.path.dirname(__file__), "lqip.txt"), "w") as f:
        for nombre, tam, lq in res:
            f.write("%s %s %s\n" % (nombre, ",".join(map(str, tam)), lq))
            print(nombre, tam)
