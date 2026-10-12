# Projeto: camada de compatibilidade para jogos de PC em iOS / Android / tvOS

Ponto de partida para construir uma aplicação que corre jogos de Windows (x86-64, DirectX 11/12)
em dispositivos ARM64 (iPhone, iPad, Android e, mais tarde, Apple TV).

- [`docs/INVESTIGACAO.md`](docs/INVESTIGACAO.md) — o que existe hoje (Vapor, Madeira, Winlator…) e como funciona por dentro.
- [`docs/PLANO.md`](docs/PLANO.md) — arquitetura, fases, riscos e o que dá para fazer já.

Alvo: **iOS/iPadOS**. App em [`ios/`](ios/) — biblioteca, controlos, sessão Metal e JIT feitos; o motor Windows (Wine para iOS) ainda falta. Estado detalhado em [`docs/PLANO.md`](docs/PLANO.md); instalação em [`docs/INSTALAR-IOS.md`](docs/INSTALAR-IOS.md).
