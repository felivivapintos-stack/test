#!/bin/sh
# Packs the files CrazyGames needs into dist/gobble-royale.zip (no tools, no docs).
set -e
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist
zip -qr dist/gobble-royale.zip index.html style.css src fonts
ls -l dist/gobble-royale.zip
