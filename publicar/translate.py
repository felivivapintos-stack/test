#!/usr/bin/env python3
"""Applies an English translation to a game in src/.

    python3 translate.py <game>

Reads traducoes/<game>.json, a {"Portuguese text": "English text"} map, applies it to the
Portuguese original in originais-pt/<game>/index.html and writes src/<game>/index.html.
Single words are only replaced where they stand
alone as a string or text node (between quotes or tags), so code that happens to contain the
same word is left alone. Entries that match nothing are listed at the end.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent


def apply(html, mapping):
    missing = []
    # Longest first, so a sentence is replaced before a shorter phrase inside it.
    for pt, en in sorted(mapping.items(), key=lambda kv: -len(kv[0])):
        # English contractions (I'm, can't) would close a single-quoted JS string, so they
        # use the typographic apostrophe, which is safe in any kind of string.
        # When the Portuguese text has no straight quote of its own, every straight quote in the
        # English is an apostrophe (sheriffs', I'm); otherwise only the ones between letters are.
        en = en.replace("'", '’') if "'" not in pt else re.sub(r"(?<=[A-Za-z])'(?=[A-Za-z])", '’', en)
        if ' ' in pt.strip() or len(pt) >= 12 or "'" in pt or '"' in pt:
            n = html.count(pt)
            html = html.replace(pt, en)
        else:
            pattern = re.compile(r'(?<=[>\'"`}])(\s*)' + re.escape(pt) + r'(\s*)(?=[<\'"`$])')
            html, n = pattern.subn(lambda m: m.group(1) + en + m.group(2), html)
        if not n:
            missing.append(pt)
    return html, missing


def main():
    game = sys.argv[1]
    mapping = json.loads((ROOT / 'traducoes' / f'{game}.json').read_text(encoding='utf-8'))
    # <game>.extra.json holds hand-written replacements of raw code (gendered word endings,
    # single-word labels) that fragments.py cannot isolate.
    extra = ROOT / 'traducoes' / f'{game}.extra.json'
    if extra.exists():
        mapping.update(json.loads(extra.read_text(encoding='utf-8')))
    original = ROOT / 'originais-pt' / game / 'index.html'
    index = ROOT / 'src' / game / 'index.html'
    html, missing = apply(original.read_text(encoding='utf-8'), mapping)
    # A fragment can be missing only because a longer string that contained it was already
    # translated, so this is a warning to read, not an error.
    if missing:
        print(f'{len(missing)} not found (check they were inside a longer translated string):')
        for m in missing[:20]:
            print('  ', m[:100])
    html = re.sub(r'<html lang="pt[^"]*"', '<html lang="en"', html, count=1)
    index.write_text(html, encoding='utf-8')
    print(f'{game}: {len(mapping)} strings translated')


if __name__ == '__main__':
    main()
