"""Inline all CSS/JS into one HTML file (for hosting as a single page).
Usage: python3 tools/build-single.py OUT.html [--fragment]
--fragment drops <!doctype>/<html>/<head>/<body> for hosts that add their own."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
css = (root / 'css/style.css').read_text()
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')
def js(m):
    return '<script>\n' + (root / m.group(1)).read_text().replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script src="(js/[\w./-]+)"></script>', js, html)
if '--fragment' in sys.argv:
    html = re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>\s*', '', html, flags=re.I)
    html = re.sub(r'<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', '', html)
    html = html.replace('</head>', '').replace('<body>', '').replace('</body>', '').replace('</html>', '')
pathlib.Path(sys.argv[1]).write_text(html)
print('wrote', sys.argv[1], len(html), 'bytes')
