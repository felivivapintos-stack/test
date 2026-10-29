#!/usr/bin/env python3
"""Bundles the game into one self-contained HTML page (dist/artifact.html) for a Claude artifact.

Inlines the CSS and the JS modules, and drops the CrazyGames SDK
(the artifact sandbox blocks it; the game runs fine without it)."""
import pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
css = (root / 'style.css').read_text()

js = []
for mod in ('data', 'map', 'sim', 'render', 'audio', 'platform', 'main'):
    src = (root / 'src' / f'{mod}.js').read_text()
    src = re.sub(r'^import [\s\S]*?;\n', '', src, flags=re.M)
    src = re.sub(r'^export \{[^}]*\};?\n', '', src, flags=re.M)
    src = re.sub(r'^export (?=const|let|function|class|async)', '', src, flags=re.M)
    js.append(f'// ---- {mod}.js ----\n{src}')

html = (root / 'index.html').read_text()
body = html.split('<body>', 1)[1].rsplit('</body>', 1)[0]
body = re.sub(r'<script type="module" src="src/main.js"></script>\n?', '', body)
out = f'''<meta charset="utf-8">
<title>Frontline Zero</title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Fast military FPS in the browser: Team Deathmatch and Free-for-All against bots.">
<style>
{css}
</style>
{body}
<script type="module">
{chr(10).join(js)}
</script>
'''
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'artifact.html').write_text(out)
print(root / 'dist' / 'artifact.html', len(out))
