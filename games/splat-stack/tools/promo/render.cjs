// Renders the CrazyGames covers (PNG) and promo videos (MP4, no sound) into an output folder.
// Usage: node tools/promo/render.cjs <outDir>   (needs ffmpeg and a static server on :8765 at games/splat-stack)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');

const OUT = path.resolve(process.argv[2] || 'store');
const URL = 'http://localhost:8765/tools/promo/promo.html';
const inputs = JSON.parse(fs.readFileSync(path.join(__dirname, 'inputs.json'), 'utf8'));
const ORDER = [1, 7, 6];
const COVER_HOLD = 60; // frames: the cover opens the video for one second

const save = (file, dataUrl) => fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  page.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.goto(URL);
  await page.waitForFunction(() => window.promoReady);

  const covers = { landscape: [1920, 1080], portrait: [800, 1200], square: [800, 800] };
  for (const [name, [w, h]] of Object.entries(covers)) {
    save(path.join(OUT, `cover-${name}-${w}x${h}.png`), await page.evaluate(([w, h, n]) => window.promo.cover(w, h, n), [w, h, name]));
    console.log('cover', name);
  }

  const videos = { landscape: [1920, 1080], portrait: [1080, 1620] };
  for (const [name, [w, h]] of Object.entries(videos)) {
    const dir = path.join(OUT, `frames-${name}`);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    let n = 0;
    const coverUrl = await page.evaluate(([w, h, n]) => window.promo.cover(w, h, n), [w, h, name]);
    for (let i = 0; i < COVER_HOLD; i++) save(path.join(dir, `f${String(n++).padStart(5, '0')}.png`), coverUrl);
    await page.evaluate(([w, h, m, o]) => window.promo.video(w, h, m, o), [w, h, inputs, ORDER]);
    for (;;) {
      const url = await page.evaluate(() => window.promo.frame());
      if (!url) break;
      save(path.join(dir, `f${String(n++).padStart(5, '0')}.jpg`), url);
    }
    // Mixed png/jpg names: convert the cover frames to jpg so ffmpeg reads one sequence.
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.png'))) {
      execSync(`ffmpeg -loglevel error -y -i "${path.join(dir, f)}" -q:v 2 "${path.join(dir, f.replace('.png', '.jpg'))}"`);
      fs.rmSync(path.join(dir, f));
    }
    const mp4 = path.join(OUT, `video-${name}-${w}x${h}.mp4`);
    execSync(`ffmpeg -loglevel error -y -framerate 60 -i "${dir}/f%05d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 20 -preset slow -movflags +faststart -an "${mp4}"`);
    fs.rmSync(dir, { recursive: true });
    console.log('video', name, (n / 60).toFixed(1) + 's', (fs.statSync(mp4).size / 1e6).toFixed(1) + 'MB');
  }
  await browser.close();
})();
