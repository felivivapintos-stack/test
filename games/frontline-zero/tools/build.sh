#!/bin/sh
# Packs the files CrazyGames needs into dist/frontline-zero.zip (no tools, no docs).
set -e
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist
zip -qr dist/frontline-zero.zip index.html style.css src
ls -l dist/frontline-zero.zip
