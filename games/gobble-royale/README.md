# Gobble Royale

**Come os mais pequenos, foge dos maiores, sê o maior quando o relógio chegar a zero.**
Gobble Royale é um jogo de comer e crescer (estilo Agar.io) com poderes à escolha a cada nível
(estilo Vampire Survivors), em rondas de 3 minutos contra 11 rivais. Feito para o CrazyGames.

Para jogar localmente: `python3 -m http.server` nesta pasta e abre `http://localhost:8000`.

## Porquê este jogo: o que a pesquisa mostrou (outubro de 2026)

- **Hypercasual e puzzle são mais de 99% do tempo jogado no CrazyGames** (abril de 2026: hypercasual
  ~79%, puzzle ~21%, mais de 93 milhões de visitas, sessão média ~30 min,
  [industry.co.id](https://www.industry.co.id/read/150924/5-rekomendasi-game-seru-di-crazy-games-buat-nemenin-weekend-kamu)).
- **Agar.io continua na lista "most popular"** da [página inicial do CrazyGames](https://www.crazygames.com/),
  ao lado de Shell Shockers, Geometry Dash, Moto X3M e Smash Karts.
- **Os .io mais jogados** ([crazygames.com/t/io](https://www.crazygames.com/t/io)): Bloxd.io, Openfront,
  Veck.io, FrontWars.io, Smash Karts, Miniblox, Paint to Hide!, Blombo.io, Hexanaut.io, Cubes 2048.io.
  Quase todos são "crescer/conquistar território" ou tiroteio.
- **Horde survival está em alta**: o [Stellar Swarm](https://www.crazygames.com/game/stellar-swarm)
  (abril de 2026) tem nota 9,4 com ~16 mil likes, com upgrades a cada nível e melhorias permanentes entre rondas.

| Padrão de sucesso | Exemplos | O que o Gobble Royale faz |
|---|---|---|
| Joga-se em menos de 1 segundo | Agar.io, Drive Mad | Abre já dentro da ronda, sem menu |
| Uma regra que se percebe sozinha | Agar.io, Hole.io | "Come os mais pequenos, foge dos maiores". Anel verde = comida, anel vermelho = foge |
| Escolher poderes a cada nível | Stellar Swarm, Vampire Survivors | 10 poderes, 3 à escolha por nível (teclas 1/2/3) |
| Rondas curtas com fim claro | Smash Karts, Shell Shockers | 3 minutos, ranking final, coroa para o n.º 1 |
| Clímax no fim | Battle royales | "Golden Frenzy": nos últimos 30 s chovem doces dourados e a música acelera |
| Funciona no telemóvel | Agar.io, Stellar Swarm | Joystick em qualquer sítio do ecrã + botão de dash; funciona em retrato e paisagem |
| Motivos para voltar | Stellar Swarm, Retro Bowl | Moedas → 10 monstros e 3 melhorias permanentes; recordes |

**A diferença:** no Agar.io só cresces. Aqui cada nível dá-te um poder (ímã, mandíbulas maiores,
dash mais rápido, caçador…), por isso cada ronda é uma "build" diferente. E não é preciso servidor:
os 11 rivais são bots com níveis de habilidade diferentes, o que o torna instantâneo e sem lag.

## Como se joga

- Rato (ou WASD/setas) para mover, **Espaço ou clique** para dar um dash (custa um bocadinho de massa).
- No telemóvel: arrasta em qualquer sítio para mover, ⚡ para o dash.
- Come doces, bichinhos (que fogem) e estrelas douradas. Come rivais 25% mais pequenos do que tu.
- **Espinhos verdes** magoam quem tem tamanho médio (perdes 22% da massa), mas os muito pequenos
  passam por eles e os muito grandes comem-nos. Esconde-te atrás deles!
- Os grandes derretem devagar e são mais lentos, por isso o líder pode ser apanhado.
- Seta dourada 👑 aponta para o líder; setas vermelhas avisam de perigo fora do ecrã.
- Dificuldade dinâmica: a primeira ronda é suave, os bots ficam mais espertos com cada ronda e vitória.

## Integração com o CrazyGames (`src/platform.js`)

- SDK v3 (`https://sdk.crazygames.com/crazygames-sdk-v3.js`), iniciado com limite de 4 s; o jogo funciona sem SDK.
- `loadingStart`/`loadingStop` no arranque, `gameplayStart`/`gameplayStop` na ronda, pausa, morte e anúncios.
- `happytime` ao ficar em 1.º lugar.
- **Midgame** só entre rondas, a partir da 3.ª ronda da sessão, no máximo um a cada 3 minutos.
- **Rewarded**: "Revive" (uma vez por ronda, volta com metade do tamanho) e "×2 moedas" no fim. Só paga em `adFinished`.
- Som desligado durante anúncios e respeita `muteAudio`. Pausa quando o separador fica escondido.
- Progresso guardado com `SDK.data` (conta CrazyGames) e `localStorage` como alternativa.
- Sem imagens nem áudio externos (som sintetizado com WebAudio). Pacote com ~95 KB.

## Equilíbrio

`node tools/balance.mjs [rondas]` joga rondas sem browser (a simulação em `src/sim.js` é determinística
e não usa o DOM) com o jogador conduzido pelo cérebro dos bots a vários níveis de habilidade, e mostra
taxa de vitórias, top 3, massa ao longo do tempo, etc. Também falha se houver NaN ou se uma ronda não acabar.
`CASES='[[0.7,0.15]]' node tools/balance.mjs 20` testa só uma combinação [habilidade, dificuldade].

## Publicar no CrazyGames

1. `sh tools/build.sh` cria `dist/gobble-royale.zip` (index.html, style.css, src/, fonts/).
2. No [CrazyGames Developer Portal](https://developer.crazygames.com/), cria o jogo como HTML5 e envia o zip.
3. Testa na pré-visualização com `?crazygames_sandbox=1` (anúncios falsos).
4. Material: descrição, controlos (rato/WASD, Espaço/clique = dash, 1-3 escolhem poder, Esc pausa) e capas.
   O vídeo da capa deve mostrar um "GULP!" a comer um rival e o Golden Frenzy.

## Estrutura

```
index.html, style.css   página, HUD, menus, controlos táteis
fonts/                  Fredoka e Outfit (woff2, licença SIL OFL)
src/sim.js              física, regras e IA dos bots (determinística, sem DOM)
src/data.js             poderes, monstros, melhorias, nomes dos bots
src/render.js           desenho em canvas, partículas, faces, setas
src/audio.js            efeitos e música sintetizados com WebAudio
src/platform.js         SDK v3 do CrazyGames + gravação do progresso
src/main.js             ciclo de jogo, controlos, menus, loja, anúncios
tools/balance.mjs       simulador de rondas para afinar o equilíbrio
tools/build.sh          zip para enviar
```
