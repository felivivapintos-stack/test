// Copies the game into desktop/app/ for packaging, without the CrazyGames SDK (web-only, needs the network).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const game = join(here, '..');
const out = join(here, 'app');
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
cpSync(join(game, 'src'), join(out, 'src'), { recursive: true });
cpSync(join(game, 'style.css'), join(out, 'style.css'));
const html = readFileSync(join(game, 'index.html'), 'utf8')
  .replace(/\s*<script src="https:\/\/sdk\.crazygames\.com[^"]*"><\/script>/, '');
if (html.includes('crazygames')) throw new Error('CrazyGames SDK tag still in index.html');
writeFileSync(join(out, 'index.html'), html);
console.log('game copied to', out);
