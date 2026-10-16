#!/bin/sh
# Packs the files CrazyGames needs into dist/splat-stack.zip (no tools, no docs).
set -e
cd "$(dirname "$0")/.."
mkdir -p dist && rm -f dist/splat-stack.zip
zip -qr dist/splat-stack.zip index.html style.css src fonts
ls -l dist/splat-stack.zip
