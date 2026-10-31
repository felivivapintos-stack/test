#!/usr/bin/env python3
"""Builds the upload packages for every platform into dist/.

    python3 build.py

src/<game>/ holds each game as exported from its claude.ai artifact. Per platform:
  crazygames   adds the CrazyGames SDK v3 script tag (the games already call it)
  gamemonetize adds shared/gamemonetize-shim.js with the game's ID from gamemonetize-ids.json
  itch         the game as is
  codigo       full source + README + licence, for selling the code
"""
import json
import re
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).parent
SRC, SHARED, BUILD, DIST = ROOT / 'src', ROOT / 'shared', ROOT / 'build', ROOT / 'dist'

PLATFORMS = {
    'crazygames': ['frontline-zero', 'borough-89', 'neon-horde'],
    # Ranked by potential on GameMonetize (see GUIA.md).
    'gamemonetize': ['ragdoll-dunk', 'penalty-nations', 'gobble-royale', 'splat-stack', 'neon-horde',
                     'nations-free-kick', 'borough-89', 'frontline-zero', 'no-refunds',
                     'pinta-e-esconde', 'farol', 'sombras-1947', 'afiado', 'backline'],
    'itch': ['no-refunds', 'sombras-1947', 'motel'],
    'codigo': ['nations-free-kick', 'splat-stack', 'neon-horde'],
}

CG_TAG = '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>'
GM_TAG = '<script src="gamemonetize-shim.js"></script>'

# Games with no ad calls of their own: the functions that start a natural break (new round,
# day, case or night) get an ad before them through window.portalBreak (see the shim).
GM_BREAKS = {
    'no-refunds': ['dayIntro'],
    'sombras-1947': ['briefing'],
    'afiado': ['startGame'],
    'backline': ['startShow'],
    'pinta-e-esconde': ['huntLevel', 'partyRound'],
    'farol': ['start', 'nextNight'],
}
# Text that only makes sense on claude.ai (the Steam pitch under Farol, Afiado and Backline)
# is removed for the portal.
HIDE_PITCH = ('</head>', '<style>article{display:none!important}</style></head>')
GM_PATCHES = {
    'afiado': [HIDE_PITCH],
    'backline': [HIDE_PITCH],
    'farol': [
        ('<span>Protótipo jogável · a versão Steam teria 30 noites, 4 ilhas e um faroleiro com história.</span>', '<span></span>'),
        HIDE_PITCH,
    ],
}


def add_break(html, fn):
    pattern = re.compile(r'(function ' + fn + r'\(([^)]*)\)\s*\{)')
    if len(pattern.findall(html)) != 1:
        raise SystemExit(f'expected exactly one "function {fn}(" to hook')
    gate = f'if(window.portalBreak&&window.portalBreak(()=>{fn}.apply(this,arguments)))return;'
    return pattern.sub(lambda m: m.group(1) + gate, html)

# claude.ai wraps every published page in its own skeleton. When the game ships a full
# document of its own, that skeleton is dropped so the page is a single clean document.
WRAPPER = re.compile(r'^<!doctype html><html><head>.*?</head><body>\s*(?=<!doctype html>)', re.S | re.I)


def clean_index(html):
    m = WRAPPER.match(html)
    if not m:
        return html
    html = html[m.end():]
    return re.sub(r'\s*</body></html>\s*$', '\n', html, flags=re.I)


def inject_head(html, tag):
    m = re.search(r'<meta charset[^>]*>', html, re.I) or re.search(r'<head[^>]*>', html, re.I)
    return html[:m.end()] + '\n' + tag + html[m.end():]


def build(platform, game):
    out = BUILD / platform / game
    shutil.copytree(SRC / game, out)
    index = out / 'index.html'
    html = clean_index(index.read_text(encoding='utf-8'))
    # Games whose sdk.js loads the CrazyGames script on its own don't need the tag.
    if platform == 'crazygames' and 'sdk.crazygames.com' not in html and not (out / 'sdk.js').exists():
        html = inject_head(html, CG_TAG)
    if platform == 'gamemonetize':
        html = inject_head(html, GM_TAG)
        for fn in GM_BREAKS.get(game, []):
            html = add_break(html, fn)
        for old, new in GM_PATCHES.get(game, []):
            if html.count(old) != 1:
                raise SystemExit(f'{game}: patch text not found exactly once: {old[:40]}')
            html = html.replace(old, new)
        game_id = json.loads((ROOT / 'gamemonetize-ids.json').read_text())[game]
        shim = (SHARED / 'gamemonetize-shim.js').read_text(encoding='utf-8')
        (out / 'gamemonetize-shim.js').write_text(shim.replace('COLA_AQUI_O_GAME_ID', game_id), encoding='utf-8')
    index.write_text(html, encoding='utf-8')
    extra = ROOT / 'textos' / platform / game
    if platform == 'codigo' and extra.exists():
        shutil.copytree(extra, out, dirs_exist_ok=True)
    return out


def zip_dir(folder, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in sorted(folder.rglob('*')):
            if f.is_file():
                z.write(f, f.relative_to(folder))


def main():
    shutil.rmtree(BUILD, ignore_errors=True)
    shutil.rmtree(DIST, ignore_errors=True)
    for platform, games in PLATFORMS.items():
        for game in games:
            folder = build(platform, game)
            target = DIST / platform / f'{game}.zip'
            zip_dir(folder, target)
            print(f'{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
