#!/usr/bin/env sh
# Gera dist/ (index.html com o SDK do CrazyGames + bg.jpg) a partir de game.html.
set -e
cd "$(dirname "$0")"
mkdir -p dist
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  printf '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n'
  printf '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n'
  printf '</head>\n<body>\n'
  cat game.html
  printf '\n</body>\n</html>\n'
} > dist/index.html
cp bg.jpg dist/bg.jpg
echo "dist/ pronto: index.html + bg.jpg (faz zip da pasta para o upload)"
