# Publicar os jogos: lista e pacotes prontos

Os pacotes estão em `dist/<plataforma>/<jogo>.zip` e as capas em `capas/<plataforma>/`.
Para os gerar de novo depois de mudar um jogo: `python3 build.py`.

Regra base: **cada jogo vai para um só portal de anúncios** (CrazyGames *ou* GameMonetize).
Os portais não gostam de ver o mesmo jogo noutros sítios, e assim não competes contigo próprio.
O itch.io e a venda de código podem coexistir com tudo.

---

## 1. A lista: o melhor de cada plataforma

### CrazyGames (tráfego alto, revisão exigente, paga melhor)
Querem jogos acabados, com boa primeira impressão e sessões longas.

| # | Jogo | Porquê |
|---|---|---|
| **1** | **Frontline Zero** | FPS no browser é das categorias mais jogadas no CrazyGames. Já tem o SDK ligado. |
| **2** | **Borough '89** | Condução e perseguições em mundo aberto, também muito procurado. Já tem anúncios recompensados ("perde a polícia", "recupera o dinheiro"). |
| **3** | **Neon Horde** | Survivor-like: género em alta, runs de 10 minutos e progressão permanente que faz voltar. |
| 4 | GAFFER | Já está preparado para o CrazyGames, mas usa nomes reais de clubes e da Premier League. Tens de os trocar antes de submeter. |
| 5 | Gobble Royale | Bom .io-like, mas tiraste-o do repositório, por isso deixei-o de fora. |
| 6 | Pibe del Cerro | Ambicioso, mas pesado (cerca de 20 MB de mapas e texturas) e só em espanhol. |

### GameMonetize (entra fácil, paga pouco por jogada, vive de volume)
Querem jogos curtos, que se percebem em 5 segundos e funcionam bem no telemóvel.

| # | Jogo | Porquê |
|---|---|---|
| **1** | **Ragdoll Dunk** | Física engraçada, partidas rápidas, 1 ou 2 jogadores. Tem anúncio recompensado para duplicar moedas. |
| **2** | **Splat Stack** | Puzzle-platformer com 24 níveis e controlos táteis. Tem "saltar nível" com anúncio, o formato ideal. |
| **3** | **Penalty Nations** | Futebol e penáltis vendem sempre. Tem 96 seleções, com anúncio de "segunda oportunidade". |
| 4 | Nations Free Kick | Ótimo, mas é o mesmo motor do Penalty. Fica para a venda de código. |
| 5 | Farol | Bom conceito, mas é um protótipo curto. |

### itch.io (venda direta ou "paga o que quiseres", aceita temas adultos e jogos de nicho)
O público do itch.io gosta de jogos com personalidade, narrativa e humor.

| # | Jogo | Porquê |
|---|---|---|
| **1** | **NO REFUNDS** | Sátira de um call center de burlas: original, com humor, e o tipo de jogo que se partilha. |
| **2** | **Sombras de 1947** | Policial noir com investigação e júri. Narrativo, ideal para o público do itch. |
| **3** | **Run a Motel With Your Friends** | Gestão com humor negro em 3D. Tem temas adultos (acompanhantes, contrabando), por isso só cabe no itch, marcado como 18+. |
| 4 | Afiado / Backline | Simuladores originais em português, bons para "paga o que quiseres". |
| 5 | Em Cena | Tem conteúdo sexual. Só no itch, marcado como adulto, se quiseres mesmo publicá-lo. |

### Venda do código (Gumroad, itch.io ou CodeCanyon)
Vende-se melhor código bem organizado e fácil de adaptar a outro tema ("reskin").

| # | Jogo | Preço sugerido | Porquê |
|---|---|---|---|
| **1** | **Nations Free Kick** | 29 € | Motor de torneio completo, 96 seleções, textos num só ficheiro (fácil de traduzir), SDK de portal incluído. |
| **2** | **Splat Stack** | 19 € | Código limpo e modular, níveis em ASCII fáceis de editar, simulação determinística. |
| **3** | **Neon Horde** | 15 € | Survivor-like é o tipo de template mais procurado. É um único ficheiro, fácil de mexer. |
| 4 | Pibe del Cerro | | Motor de mundo aberto em Three.js com mapas reais. Os dados do OpenStreetMap exigem atribuição (licença ODbL), por isso precisa de mais trabalho antes. |

Nota: vender o código de um jogo que também está num portal é normal (o jogo publicado serve de
demo). O risco é aparecerem clones, por isso não vendas o código dos jogos que te dão mais dinheiro.

---

## 2. O que foi feito em cada pacote

- **CrazyGames:** adicionado o script do SDK v3. Os jogos já tinham o código para o usar
  (início/pausa de jogo, anúncios, gravação na nuvem).
- **GameMonetize:** adicionado `gamemonetize-shim.js`, um adaptador que faz o SDK do
  GameMonetize parecer o da CrazyGames para o jogo, sem mexer no código. Testei os casos
  "anúncio visto", "sem anúncio disponível" e "erro". Em todos o jogo continua.
- **itch.io:** o jogo tal como está, num zip pronto a carregar.
- **Código:** fonte completa com `README.md` (em inglês, para compradores) e `LICENSE.txt`
  (licença comercial: podem usar e publicar, mas não revender o código).

Os 12 pacotes foram abertos num browser sem erros.

---

## 3. Passo a passo por plataforma

### CrazyGames
1. Cria conta em developer.crazygames.com.
2. "Submit game", tipo HTML5, e carrega o zip de `dist/crazygames/`.
3. Capas: usa as três de `capas/crazygames/` (horizontal, vertical e quadrada).
4. Começa em "Basic Launch" (sem anúncios) e, se as métricas forem boas, passa a "Full Launch"
   com receita. Os jogos já lidam com os anúncios desligados na fase básica.

### GameMonetize
1. Cria conta em gamemonetize.com e adiciona um jogo novo no painel.
2. Copia o **Game ID** que o painel te dá.
3. Cola o ID no `gamemonetize-ids.json`, à frente do nome do jogo, e corre `python3 build.py`.
4. Carrega o zip de `dist/gamemonetize/` e a miniatura de `capas/gamemonetize/`.
5. Confirma na documentação deles que o SDK continua a ser `api.gamemonetize.com/sdk.js` com
   `sdk.showBanner()`. Foi isso que usei.

### itch.io
1. Cria conta em itch.io, "Upload new project", tipo **HTML**.
2. Carrega o zip e marca "This file will be played in the browser".
3. Tamanho do ecrã: 1280x720, com "Fullscreen button" e "Mobile friendly" (exceto o Motel).
4. Preço: "No payments" com doações, ou "$0 or donate". Para o Motel e o Sombras podes
   experimentar 2–3 €.
5. Motel: em "Content" marca a classificação adulta.

### Venda do código
- **itch.io** ou **Gumroad**: carrega o zip de `dist/codigo/` como ficheiro para download, com
  preço, e põe o link do jogo jogável na descrição.
- **CodeCanyon**: pedem documentação mais longa e uma demo online. Começa pelo itch ou Gumroad.
- Põe o teu nome no `LICENSE.txt` (troca `{AUTHOR}` pelo teu nome).

---

## 4. Textos para as páginas

### Frontline Zero (CrazyGames)
**Title:** Frontline Zero
**Short:** Fast military FPS in your browser. Team Deathmatch and Free-for-All against bots.
**Description:** Drop into fast rounds of Team Deathmatch or Free-for-All against smart bots.
Pick your loadout, aim down sights, throw grenades and climb the scoreboard before the clock
runs out. No download, no account: just click and play.
**Controls:** WASD move, mouse aim, left click fire, right click aim down sights, Shift sprint,
Space jump, C crouch/slide, R reload, Q swap weapon, G grenade, Tab scores. Kill streaks:
3 = UAV, 5 = Air Strike, 7 = Attack Drone.
**Tags:** shooter, fps, military, 3d, multiplayer-style, bots

### Borough '89 (CrazyGames)
**Title:** Borough '89
**Short:** Steal a car, outrun the cops, own 1989 New York.
**Description:** Three bosses, three boroughs and a city that never sleeps. Drift through neon
streets, take jobs, escape police chases and build your street cred from Midtown to the top.
Earn achievements, upgrade your career and make the city yours.
**Controls:** WASD/arrows drive, Space drift, Shift nitro, F fire, Q switch weapon,
E car/phone, M map, Esc pause. Keys can be rebound. Gamepad supported.
**Tags:** driving, car, police chase, open world, retro, top-down

### Neon Horde (CrazyGames)
**Title:** Neon Horde
**Short:** Survive ten minutes against an endless neon swarm.
**Description:** Your weapons fire on their own. You move, dodge and choose upgrades. Stack
weapons, level up and break four titans. Spend gold between runs on permanent boosts and go
further every time.
**Controls:** WASD/arrows or drag to move, 1-2-3 pick upgrades, Esc pause.
**Tags:** survivor, roguelike, bullet hell, arcade, upgrades

### Ragdoll Dunk (GameMonetize)
**Title:** Ragdoll Dunk
**Description:** Floppy ragdoll basketball! Jump, shoot and dunk with wobbly physics. Play solo,
against the CPU or with a friend on the same keyboard. Complete daily challenges, earn coins and
unlock gear in the locker.
**Controls:** Solo: A/D or arrows move, W or Space jump, F or J shoot. 2 players: P1 A/D move,
W jump, F shoot, G pass; P2 arrows move, Up jump, K shoot, L pass. Touch supported.
**Category:** Sports. **Tags:** basketball, ragdoll, physics, 2 player

### Splat Stack (GameMonetize)
**Title:** Splat Stack
**Description:** A jelly platformer where every death becomes a block. Die in the right place,
stack your splats into stairs, jam saws and reach the door. 24 levels, 3 stars each and skins to
unlock.
**Controls:** Arrows or A/D move, Up/W/Space jump, R restart, Esc pause. On-screen buttons on
mobile.
**Category:** Puzzle. **Tags:** platformer, puzzle, jelly, brain

### Penalty Nations (GameMonetize)
**Title:** Penalty Nations
**Description:** Pick one of 96 nations and fight through a 48-team tournament, one penalty
shoot-out at a time. Aim, time your power, then dive to save. Groups, knockouts and sudden death
all the way to the trophy.
**Controls:** Mouse or touch to aim and shoot, tap to dive. Keyboard: arrows aim, hold Space to
shoot; to save, arrows move the glove and Space dives.
**Category:** Sports. **Tags:** football, soccer, penalty, world cup

### NO REFUNDS (itch.io)
**Tagline:** A satirical scam call-center sim.
**Description:** Welcome to Totally Legit Solutions LLC: "your problem is our opportunity".
Build your script deck, read your marks, hit quota... and live with it. A dark comedy about the
people on the other end of the line. Story mode, endless shift and a daily challenge.
**Genre:** Simulation. **Tags:** satire, dark-comedy, card-game, narrative

### Sombras de 1947 (itch.io, em português)
**Frase:** Los Angeles, 1947. Ninguém te diz se acertaste.
**Descrição:** És detetive na polícia de Los Angeles em 1947. Examina pistas, interroga
testemunhas que mentem, recusa (ou aceita) envelopes e monta o processo para o júri. Cada
suspeito tem o seu feitio: aprende a lê-los antes de acusar. O júri só condena com motivo,
oportunidade e prova material.
**Género:** Mistério. **Tags:** noir, detective, investigação, português

### Run a Motel With Your Friends (itch.io, 18+, em português)
**Frase:** Chega a 1 milhão em 7 dias sem que o xerife desconfie.
**Descrição:** Desert Rose Motel, Route 66, Novo México. De dia: lençóis lavados e café
queimado. De noite: o poker na receção, o camião do contrabando, os telefonemas da Família e um
jacaré chamado Bubba que come o que lhe atirarem. Gestão com humor negro em 3D.
**Género:** Simulação. **Tags:** management, dark-humor, 3d, adulto
