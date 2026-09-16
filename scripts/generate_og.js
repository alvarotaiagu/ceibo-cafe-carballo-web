/* Imagen Open Graph (1200x630) de Ceibo, capturada con Playwright a partir
   de la lámina SVG del propio sitio (no hay rasterizador SVG en Python).
   Uso: NODE_PATH=/c/Users/alvar/node_modules node scripts/generate_og.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const flor = fs.readFileSync(path.join(__dirname, 'flor-inline.svg'), 'utf8');
const marca = fs.readFileSync(path.join(RAIZ, 'assets', 'img', 'brand', 'ceibo-marca.svg'), 'utf8');

const html = `<!DOCTYPE html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,0..100;1,9..144,300..700,0..100&family=Nunito:wght@600;700&display=swap" rel="stylesheet">
<style>
 body{margin:0;width:1200px;height:630px;background:#F6EFE4;color:#3A2A22;font-family:Nunito,sans-serif;position:relative;overflow:hidden}
 .luz{position:absolute;inset:0;background:radial-gradient(60% 70% at 85% 20%, rgba(255,250,240,.95), transparent 70%)}
 .txt{position:absolute;left:84px;top:110px}
 .marca{width:56px;height:56px;margin-bottom:26px}
 h1{font-family:Fraunces,serif;font-weight:400;font-variation-settings:"opsz" 144,"SOFT" 70;font-size:190px;line-height:.9;letter-spacing:-.035em;color:#9B1B1B;margin:0 0 0 -8px}
 .sub{font-family:Fraunces,serif;font-variation-settings:"opsz" 48,"SOFT" 40;font-size:40px;margin-top:22px}
 .sub b{color:#9B1B1B;font-weight:400}
 .bot{margin-top:14px;font-size:22px;color:#5A483D}
 .bot i{font-family:Fraunces,serif;color:#5C6B44}
 .badge{display:inline-block;margin-top:26px;border:1.5px solid rgba(58,42,34,.18);border-radius:999px;padding:10px 20px;font-weight:700;font-size:22px;background:rgba(251,247,240,.8)}
 .badge span{color:#9B1B1B}
 .lamina{position:absolute;right:60px;top:-10px;width:520px;transform:rotate(8deg)}
</style>
<div class="luz"></div>
<div class="txt">
  <div class="marca">${marca}</div>
  <h1>Ceibo</h1>
  <div class="sub">Café de especialidad <b>·</b> Carballo</div>
  <div class="bot"><i>Erythrina crista-galli.</i> El ceibo es una flor roja.</div>
  <div class="badge"><span>★</span> 4,9 · 27 reseñas en Google</div>
</div>
<div class="lamina">${flor}</div>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const out = path.join(RAIZ, 'assets', 'img', 'og-ceibo.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
  await browser.close();
  console.log('ok', out);
})();
