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
