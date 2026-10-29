#!/usr/bin/env python3
"""Publica jogos HTML5 no itch.io e prepara o pacote para o CrazyGames.

Uso:
    python3 publicar/publicar.py                 # todos os jogos de jogos.json
    python3 publicar/publicar.py meu-jogo        # só um jogo
    python3 publicar/publicar.py --so-verificar  # valida e empacota, não envia nada

itch.io: envio automático com o butler (precisa de BUTLER_API_KEY).
CrazyGames: não tem API pública de envio; o script valida a build, cria o
.zip pronto a carregar e mostra o link do portal de developers.
"""

import argparse
import json
import os
import platform
import shutil
import stat
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
DIST = AQUI / "dist"
FERRAMENTAS = AQUI / ".ferramentas"
PORTAL_CRAZYGAMES = "https://developer.crazygames.com/"

# Limites indicativos do CrazyGames (confirmar em https://docs.crazygames.com/requirements/).
CG_TAMANHO_MAX_MB = 250
CG_FICHEIROS_MAX = 1500


def erro(msg):
    print(f"  ✗ {msg}")


def ok(msg):
    print(f"  ✓ {msg}")


def aviso(msg):
    print(f"  ! {msg}")


def carregar_config(caminho):
    with open(caminho, encoding="utf-8") as f:
        cfg = json.load(f)
    if not cfg.get("jogos"):
        sys.exit(f"{caminho}: não há jogos em \"jogos\".")
    return cfg


def verificar_build(jogo, pasta):
    """Devolve True se a build parece um jogo HTML5 válido."""
    if not pasta.is_dir():
        erro(f"pasta da build não existe: {pasta}")
        return False
    if not (pasta / "index.html").is_file():
        erro("falta index.html na raiz da pasta da build")
        return False
    ficheiros = [p for p in pasta.rglob("*") if p.is_file()]
    total_mb = sum(p.stat().st_size for p in ficheiros) / 1024 / 1024
    ok(f"index.html encontrado; {len(ficheiros)} ficheiros, {total_mb:.1f} MB")
    if total_mb > CG_TAMANHO_MAX_MB:
        aviso(f"maior que {CG_TAMANHO_MAX_MB} MB: o CrazyGames pode recusar")
    if len(ficheiros) > CG_FICHEIROS_MAX:
        aviso(f"mais de {CG_FICHEIROS_MAX} ficheiros: o CrazyGames pode recusar")
    return True


def criar_zip(pasta, destino):
    destino.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(pasta.rglob("*")):
            if p.is_file() and not p.name.startswith("."):
                z.write(p, p.relative_to(pasta).as_posix())
    return destino


def obter_butler():
    """Usa o butler do PATH ou descarrega-o para publicar/.ferramentas."""
    existente = shutil.which("butler")
    if existente:
        return existente
    sistema = {"Linux": "linux", "Darwin": "darwin", "Windows": "windows"}[platform.system()]
    nome = "butler.exe" if sistema == "windows" else "butler"
    binario = FERRAMENTAS / nome
    if binario.exists():
        return str(binario)
    url = f"https://broth.itch.zone/butler/{sistema}-amd64/LATEST/archive/default"
    print(f"  … a descarregar o butler de {url}")
    FERRAMENTAS.mkdir(parents=True, exist_ok=True)
    arquivo = FERRAMENTAS / "butler.zip"
    urllib.request.urlretrieve(url, arquivo)
    with zipfile.ZipFile(arquivo) as z:
        z.extractall(FERRAMENTAS)
    arquivo.unlink()
    binario.chmod(binario.stat().st_mode | stat.S_IEXEC)
    return str(binario)


def publicar_itch(jogo, pasta, versao):
    itch = jogo.get("itch")
    if not itch:
        aviso("sem \"itch\" na configuração; a saltar o itch.io")
        return True
    if not os.environ.get("BUTLER_API_KEY"):
        erro("BUTLER_API_KEY não definida (https://itch.io/user/settings/api-keys)")
        return False
    canal = itch.get("canal", "html5")
    alvo = f"{itch['utilizador']}/{itch['jogo']}:{canal}"
    cmd = [obter_butler(), "push", str(pasta), alvo]
    if versao:
        cmd += ["--userversion", versao]
    print(f"  … butler push → {alvo}")
    if subprocess.run(cmd).returncode != 0:
        erro("o butler falhou")
        return False
    ok(f"publicado em https://{itch['utilizador']}.itch.io/{itch['jogo']}")
    return True


def preparar_crazygames(jogo, pasta):
    if not jogo.get("crazygames", True):
        return True
    destino = criar_zip(pasta, DIST / f"{jogo['id']}-crazygames.zip")
    ok(f"pacote CrazyGames: {destino.relative_to(RAIZ)}")
    print(f"    carregar em {PORTAL_CRAZYGAMES} (envio manual; o CrazyGames não tem API)")
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("jogos", nargs="*", help="ids dos jogos a publicar (por omissão: todos)")
    ap.add_argument("--config", default=str(AQUI / "jogos.json"))
    ap.add_argument("--versao", help="versão a mostrar no itch.io (por omissão: a do jogos.json)")
    ap.add_argument("--so-verificar", action="store_true", help="não envia nada para o itch.io")
    args = ap.parse_args()

    cfg = carregar_config(args.config)
    base = Path(args.config).resolve().parent
    jogos = cfg["jogos"]
    if args.jogos:
        ids = {j["id"] for j in jogos}
        desconhecidos = set(args.jogos) - ids
        if desconhecidos:
            sys.exit(f"jogos desconhecidos: {', '.join(sorted(desconhecidos))}")
        jogos = [j for j in jogos if j["id"] in args.jogos]

    falhas = []
    for jogo in jogos:
        print(f"\n▶ {jogo.get('nome', jogo['id'])}")
        pasta = (base / jogo["pasta"]).resolve()
        if not verificar_build(jogo, pasta):
            falhas.append(jogo["id"])
            continue
        preparar_crazygames(jogo, pasta)
        if not args.so_verificar:
            versao = args.versao or jogo.get("versao")
            if not publicar_itch(jogo, pasta, versao):
                falhas.append(jogo["id"])

    print()
    if falhas:
        sys.exit(f"Falhou: {', '.join(falhas)}")
    print("Tudo feito.")


if __name__ == "__main__":
    main()
