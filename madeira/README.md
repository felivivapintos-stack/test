# Base: Madeira

A app passa a ser construída sobre o [Madeira](https://github.com/willfaust/Madeira)
(GPL-3.0-or-later + Madeira Converter Exception). O workflow
`.github/workflows/madeira.yml` compila-o de raiz num Mac do GitHub Actions, sem
precisares de um Mac:

1. `llvm-ios` — LLVM compilado para iOS (usado pelo compilador de shaders do DXMT). Fica em cache.
2. `app` — clona o Madeira na revisão `MADEIRA_REF` com os submódulos (forks de Wine, FEX,
   DXMT), aplica os nossos patches (`patches/*.patch`), compila as bibliotecas nativas com
   os scripts do próprio Madeira (`build/*/build.sh`) e gera o `.ipa` (configuração Debug,
   a única que o Madeira usa para correr jogos).

As nossas alterações ficam em `patches/`, para ser fácil atualizar para versões novas do
Madeira. Como o Madeira é GPL-3.0, tudo o que distribuirmos tem de continuar open source,
com as licenças e avisos originais.

## Estado da compilação (14/10/2026)
| Passo | Estado |
|---|---|
| LLVM para iOS | ✅ (em cache) |
| GnuTLS, FFmpeg, FreeType | ✅ |
| FEX (FEXCore + alocador + externos) | ✅ |
| Wine iOS: ntdll (37/37), wineserver (46/46), win32u | ✅ |
| DXMT (87/87) + conversor de shaders | ✅ |
| Emparelhamento remoto (Rust) | ✅ |
| App: compilação Swift/Obj-C | ✅ |
| App: ligação final | ✅ (funções de terminfo em `tools/terminfo_stubs.c`) |
| `.ipa` | ✅ publicado em Releases → `pcemu-latest` (`PCEmu.ipa`) |
| Teste no iPhone | ⏳ |

Entradas não documentadas do Madeira que o workflow cria: `wine/build-macos` (Wine
configurado para macOS, só cabeçalhos gerados), a `libwineserver.a` base
(`tools/wineserver-base.sh`), os cabeçalhos dos shaders do airconv e as bibliotecas
`JemallocLibs`/externas do FEX.

O repositório é público (minutos ilimitados no GitHub Actions).
