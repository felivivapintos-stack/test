#!/usr/bin/env python3
"""Translation helper for games with a lot of text.

    python3 fragments.py extract <game>   writes traducoes/<game>.pt.txt (numbered fragments)
    python3 fragments.py merge <game>     reads traducoes/<game>.en.txt, writes traducoes/<game>.json

Strings in the game are split on HTML tags and ${...} expressions, so only visible text is
translated and the code around it is never touched. Each line of the .pt.txt file is
"N<TAB>fragment". The .en.txt file holds the same numbers with the English text; a missing
number, or "=" as the text, keeps the fragment as it is (names, code that slipped through).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
SPLIT = re.compile(r'\$\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}|<[^<>]+>')
CODE = re.compile(r'=>|[;{}]|\bfunction\b|\?\.|\|\||&&|==|\bconst\b|\breturn\b|\.join\(|\.map\(|^\W*$')
WORDY = re.compile(r'[A-Za-zÀ-ú]{2,}')


def strings(html):
    found = []
    body = re.sub(r'<style.*?</style>', '', html, flags=re.S)
    found += re.findall(r'>([^<>]+)<', re.sub(r'<script.*?</script>', '', body, flags=re.S))
    found += re.findall(r'(?:aria-label|title|placeholder|alt)="([^"]+)"', html)
    for script in re.findall(r'<script[^>]*>(.*?)</script>', html, flags=re.S):
        script = re.sub(r'/\*.*?\*/', '', script, flags=re.S)
        script = re.sub(r'(?m)^\s*//.*$', '', script)
        for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`", script):
            found.append(next(g for g in m.groups() if g is not None))
    return found


def fragments(html):
    out = []
    for s in strings(html):
        for piece in SPLIT.split(s):
            t = piece.strip()
            if '\n' in t or len(t) < 2 or not WORDY.search(t) or CODE.search(t):
                continue
            if re.fullmatch(r'[\w.#\-]+', t) and not re.search(r'[À-ú]', t) and not t[0].isupper():
                continue  # identifiers, class names, ids
            if t.startswith(('http', 'data:')) or re.search(r'\d(px|rem|ms)\b|#[0-9a-f]{3,6}\b|rgba?\(', t):
                continue
            out.append(t)
    return list(dict.fromkeys(out))


def main():
    cmd, game = sys.argv[1], sys.argv[2]
    pt_file = ROOT / 'traducoes' / f'{game}.pt.txt'
    if cmd == 'extract':
        html = (ROOT / 'originais-pt' / game / 'index.html').read_text(encoding='utf-8')
        frags = fragments(html)
        pt_file.write_text(''.join(f'{i}\t{t}\n' for i, t in enumerate(frags)), encoding='utf-8')
        print(f'{len(frags)} fragments, {sum(map(len, frags))} chars -> {pt_file.relative_to(ROOT)}')
    elif cmd == 'merge':
        pt = dict(line.split('\t', 1) for line in pt_file.read_text(encoding='utf-8').splitlines())
        mapping = {}
        for path in sorted((ROOT / 'traducoes').glob(f'{game}.en*.txt')):
            for line in path.read_text(encoding='utf-8').splitlines():
                if '\t' not in line:
                    continue
                n, en = line.split('\t', 1)
                if en.strip() and en != '=' and n in pt and pt[n] != en:
                    mapping[pt[n]] = en
        (ROOT / 'traducoes' / f'{game}.json').write_text(json.dumps(mapping, ensure_ascii=False, indent=0), encoding='utf-8')
        print(f'{len(mapping)} of {len(pt)} fragments translated')


if __name__ == '__main__':
    main()
