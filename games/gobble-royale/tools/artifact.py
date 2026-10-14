#!/usr/bin/env python3
"""Bundles the game into one self-contained HTML page (dist/artifact.html) for a Claude artifact.

Inlines the CSS, the fonts (as data URIs) and the JS modules, and drops the CrazyGames SDK
(the artifact sandbox blocks it; the game runs fine without it)."""
import base64, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
css = (root / 'style.css').read_text()
for name in ('fredoka', 'outfit'):
    b64 = base64.b64encode((root / 'fonts' / f'{name}.woff2').read_bytes()).decode()
    css = css.replace(f'url("fonts/{name}.woff2")', f'url("data:font/woff2;base64,{b64}")')

js = []
for mod in ('data', 'sim', 'render', 'audio', 'platform', 'main'):
    src = (root / 'src' / f'{mod}.js').read_text()
    src = re.sub(r'^import .*?;\n', '', src, flags=re.M)
    src = re.sub(r'^export \{[^}]*\};?\n', '', src, flags=re.M)
    src = re.sub(r'^export (?=const|let|function|class|async)', '', src, flags=re.M)
    js.append(f'// ---- {mod}.js ----\n{src}')

html = (root / 'index.html').read_text()
body = html.split('<body>', 1)[1].rsplit('</body>', 1)[0]
body = re.sub(r'<script type="module" src="src/main.js"></script>\n?', '', body)
out = f'''<title>Gobble Royale</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Eat smaller monsters, run from bigger ones, pick a power every level.">
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
