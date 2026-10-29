# Frontline Zero

**FPS militar de rondas rápidas para PC (Windows), para competir com o Call of Duty mais recente
no que um jogo pequeno consegue ganhar: instala em segundos (~100 MB em vez de 150 GB), corre em
qualquer PC, até portáteis fracos, e é grátis.** Jogo original: sem nomes, armas, mapas ou marcas da Activision.

## Versão PC (Windows)
O jogo é agora, antes de tudo, **um jogo de PC**: uma app de Windows (`desktop/`, Electron) com o mesmo motor.

- **Descarregar:** Releases do GitHub → `frontline-zero-latest` →
  `Frontline-Zero-Setup-<versão>.exe` (instalador, cria atalho) ou `Frontline-Zero-Portable-<versão>.exe` (corre sem instalar).
  O workflow `.github/workflows/frontline-zero.yml` compila-os num Windows do GitHub Actions a cada alteração.
- O Windows SmartScreen pode avisar "editor desconhecido" (o .exe não está assinado): *Mais informações → Executar mesmo assim*.
- Só no PC: ecrã inteiro real (**F11**), rato em modo *raw input* (sem aceleração do Windows), qualidade gráfica
  Low/Medium/High/Ultra, FPS ilimitados (desliga o V-Sync, reinicia o jogo), contador de FPS, botão de sair, sem anúncios.
  Funciona sem internet; o progresso fica guardado no PC.
- Desenvolver: `cd desktop && npm install && npm start` (copia o jogo para `desktop/app/` sem o SDK do CrazyGames e abre a janela).
  `npm run dist` gera os .exe (num Windows; no Linux é preciso o Wine).

A versão browser continua a existir (`index.html`, para o CrazyGames). Para jogá-la localmente:
`python3 -m http.server` nesta pasta e abre `http://localhost:8000`.

## Plano

### Onde o COD atual é forte e o que copiamos (a sensação, não o conteúdo)
| COD | Frontline Zero |
|---|---|
| Tiro instantâneo (hitscan), headshots, hitmarkers com som | ✅ hitscan com dispersão, cabeça ×1,5–2,5, hitmarker + "ding" de kill |
| Movimento: sprint, slide, salto por cima de cobertura | ✅ sprint, slide (agachar a correr), salto que galga barreiras baixas |
| Mira (ADS) com zoom e menos dispersão | ✅ ADS com tempo por arma, zoom de mira de sniper |
| Killstreaks | ✅ UAV (3), Ataque aéreo (5), Drone de ataque (7) — automáticos |
| Team Deathmatch 6v6, Free-for-All | ✅ os dois, com bots (sem servidor, sem lag, sem esperar lobby) |
| Mapas de 3 corredores | ✅ mapa simétrico (rotação 180°) com 3 corredores e cobertura |
| Progressão: níveis desbloqueiam armas | ✅ XP por kill/headshot/vitória, 5 armas principais a desbloquear |
| Vida que regenera, minimapa com pontos vermelhos ao disparar | ✅ |

### Onde ganhamos ao COD
- **0 instalação, 0 conta, < 200 KB.** Clica e estás no jogo.
- **Corre em portáteis fracos e telemóveis**: renderizador WebGL2 próprio só com caixas (estilo
  Krunker/Shell Shockers, os FPS mais jogados no CrazyGames), sem texturas.
- **Partidas de 5 minutos** e respawn em 3 s: a cada sessão de 10 minutos jogas 2 partidas.
- Bots com 3 níveis de dificuldade: não há "sweats" nem batota.

### Arquitetura (igual ao Gobble Royale)
```
index.html, style.css   página, HUD, menus, controlos táteis
src/data.js             armas, killstreaks, níveis, nomes
src/map.js              mapa em ASCII → grelha de alturas, colisão, raycast 3D, caminhos (BFS)
src/sim.js              regras, movimento, tiro, granadas, killstreaks, IA dos bots (sem DOM)
src/render.js           WebGL2: mapa estático, soldados em caixas, arma na mão, partículas
src/audio.js            sons sintetizados com WebAudio
src/platform.js         SDK v3 do CrazyGames + gravação do progresso
src/main.js             ciclo de jogo, rato/teclado/toque, HUD, menus, opções de PC
desktop/                app Windows: main.cjs (janela, ecrã inteiro, FPS), preload.cjs (ponte), prepare.mjs
tools/test.mjs          joga partidas só com bots sem browser e verifica que nada parte
tools/build.sh          zip para enviar ao CrazyGames
tools/artifact.py       página única para ver como artifact
```

### Fases
1. ✅ **Núcleo jogável**: mapa, movimento, 6 armas, bots, TDM/FFA, HUD, killstreaks, progressão.
2. ⏳ Afinar com `tools/test.mjs`: dificuldade dos bots, tempo para matar, spawns.
3. ⏳ Mais mapas (um pequeno estilo "Shipment", um grande), modo Kill Confirmed, perks.
4. ⏳ Polimento: animações de recarregar, sons melhores, capas e vídeo para o CrazyGames.
5. ⏳ Multijogador real (WebSocket/WebRTC) — só se o jogo pegar; a simulação já está separada do DOM.

## Como se joga
- **Rato** para olhar (clica no jogo para prender o cursor), **WASD** para andar.
- **Clique esquerdo** dispara, **direito** mira (ADS). **Shift** corre, **Espaço** salta,
  **C/Ctrl** agacha (a correr = slide), **R** recarrega, **1/2/Q** troca de arma, **G** granada,
  **Tab** placar, **Esc** pausa.
- Telemóvel: joystick à esquerda, arrasta à direita para olhar, botões de disparar/mirar/saltar/agachar/recarregar.
- Killstreaks: 3 kills seguidas = UAV (inimigos no minimapa), 5 = ataque aéreo no maior grupo de
  inimigos, 7 = drone que dispara sozinho durante 20 s.

## Testar e publicar
- `node tools/test.mjs [partidas] [dificuldade 0..1]` joga partidas só com bots (TDM e FFA) e falha se houver
  NaN, corpos dentro de paredes, chão inalcançável, partidas sem fim ou bots que nunca lutam. Mostra kills/min,
  precisão e kills por arma para afinar o equilíbrio.
- `?debug` no URL expõe `window.fz` (partida, jogador, renderizador) para testes com Playwright.
- `sh tools/build.sh` → `dist/frontline-zero.zip` (~40 KB) para o [CrazyGames Developer Portal](https://developer.crazygames.com/).
- `python3 tools/artifact.py` → `dist/artifact.html`, uma página única sem o SDK.

### Estado do equilíbrio (Regular, 6v6)
~50 kills/min no total, precisão dos bots 26–45% conforme a dificuldade, partidas TDM de ~2,5 min até 75.
É mais frenético do que um TDM do COD (mapa pequeno, 12 jogadores) — de propósito para o browser,
mas é o primeiro número a afinar na fase 2.
