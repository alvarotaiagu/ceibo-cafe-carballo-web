/* Hojas de contacto de Pexels para elegir fotografia a mano (Ceibo).
   Pexels bloquea el headless "limpio": un navegador nuevo por consulta,
   UA realista y ~9 s de espera. Se recogen las URL y se monta una hoja
   de contacto local que si se captura bien.
   Uso: NODE_PATH=/c/Users/alvar/node_modules node scripts/contact_sheets.js [consulta...] */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'contact_sheets');
fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const CONSULTAS = process.argv.slice(2).length ? process.argv.slice(2) : [
  'matcha latte top view',
  'focaccia sliced wooden board',
  'cookies baking paper top view',
  'coffee cup top view morning light marble',
  'red flower small vase table',
  'cake slice plate morning light',
  'toast avocado breakfast table',
];

const hoja = (titulo, fotos) => `<!DOCTYPE html><meta charset="utf-8">
<style>
 body{margin:0;background:#111;color:#0f0;font:12px/1.3 monospace}
 h1{color:#fff;font:600 16px monospace;padding:10px 12px;margin:0}
 .g{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:0 12px 12px}
 figure{margin:0;background:#000}
 img{width:100%;height:170px;object-fit:cover;display:block}
 figcaption{padding:3px 5px;background:#000;color:#0f0;font-weight:700}
</style><h1>${titulo}</h1><div class="g">
${fotos.map(f => `<figure><img src="${f.src}"><figcaption>${f.id}</figcaption></figure>`).join('\n')}
</div>`;

(async () => {
  for (const q of CONSULTAS) {
    const slug = q.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const browser = await chromium.launch();
    const page = await browser.newPage({ userAgent: UA, viewport: { width: 1600, height: 1200 } });
    let fotos = [];
    try {
      await page.goto('https://www.pexels.com/search/' + encodeURIComponent(q) + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(9000);
      await page.mouse.wheel(0, 2500); await page.waitForTimeout(3000);
      fotos = await page.evaluate(() => {
        const out = new Map();
        document.querySelectorAll('img[src*="images.pexels.com/photos/"]').forEach(img => {
          const m = img.src.match(/photos\/(\d+)\//); if (!m) return;
          if (!out.has(m[1])) out.set(m[1], { id: m[1], src: img.src.replace(/\?.*$/, '?auto=compress&cs=tinysrgb&w=400') });
        });
        return [...out.values()];
      });
    } catch (e) { console.log('fallo', q, e.message); }
    await browser.close();
    console.log(q, '->', fotos.length);
    const html = path.join(OUT, slug + '.html');
    fs.writeFileSync(html, hoja(q, fotos.slice(0, 25)));
    const b2 = await chromium.launch();
    const p2 = await b2.newPage({ viewport: { width: 1600, height: 1000 } });
    await p2.goto('file:///' + html.split(String.fromCharCode(92)).join('/'));
    await p2.waitForTimeout(6000);
    await p2.screenshot({ path: path.join(OUT, slug + '.png'), fullPage: true });
    await b2.close();
  }
})();
