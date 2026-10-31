# Publicar os jogos: lista e pacotes prontos

Os pacotes estão em `dist/<plataforma>/<jogo>.zip` e as capas em `capas/<plataforma>/`.
Para os gerar de novo depois de mudar um jogo: `python3 build.py`.

Regra base: **cada jogo vai para um só portal de anúncios** (CrazyGames *ou* GameMonetize).
Os portais não gostam de ver o mesmo jogo noutros sítios, e assim não competes contigo próprio.
O itch.io e a venda de código podem coexistir com tudo. Se puseres tudo no GameMonetize (secção
1), os jogos da lista da CrazyGames deixam de ser opção lá.

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

### GameMonetize: todos os jogos, por potencial
Entra fácil, paga pouco por jogada e vive de volume, por isso compensa pôr lá tudo o que for
aceitável. O que mais conta: perceber-se em 5 segundos, funcionar no telemóvel e estar em inglês.
Os 15 pacotes estão em `dist/gamemonetize/`, por esta ordem de prioridade.

| # | Jogo | Potencial | Porquê |
|---|---|---|---|
| **1** | **Ragdoll Dunk** | Alto | Física engraçada, partidas curtas, 1 ou 2 jogadores, tátil. Anúncio recompensado para duplicar moedas. |
| **2** | **Penalty Nations** | Alto | Futebol vende sempre. 96 seleções, "segunda oportunidade" com anúncio. |
| **3** | **Gobble Royale** | Alto | .io de comer e crescer: o género mais jogado nestes portais. Rondas de 3 minutos. |
| **4** | **Splat Stack** | Alto | Puzzle-platformer com 24 níveis e "saltar nível" com anúncio. |
| **5** | **Neon Horde** | Médio-alto | Survivor-like viciante. Joga-se com o dedo. |
| **6** | **Nations Free Kick** | Médio-alto | Irmão do Penalty Nations. Os dois juntos apanham mais pesquisas de futebol. |
| **7** | **Borough '89** | Médio | Carros e polícia atraem muito, mas pede teclado ou comando. |
| **8** | **Frontline Zero** | Médio | FPS é procurado, mas quase só em computador. |
| **9** | **NO REFUNDS** | Médio-baixo | Original e com humor, mas tem muito texto e sessões longas. |
| **10** | **Pinta e Esconde** (Paint and Hide) | Médio | Ideia simples e divertida, com modo para 2 jogadores. Já traduzido para inglês. |
| **11** | **Farol** | Médio-baixo | Bonito e rápido de perceber, mas curto. Já traduzido para inglês. |
| **12** | **Sombras de 1947** | Baixo | Muito texto e ainda em português. Rende mais no itch.io. |
| **13** | **Afiado** | Baixo | 3D, só teclado e rato. Já traduzido para inglês. |
| **14** | **Backline** | Baixo | Igual ao Afiado, com tema de concerto. Já traduzido para inglês. |
| **15** | **Run a Motel With Your Friends** | Incerto | Gestão 3D com humor negro, traduzido para inglês. Tem temas adultos (rede de acompanhantes): o GameMonetize pode recusá-lo ou retirá-lo. Submetido na versão fiel, por escolha tua. |

**Não preparados para o GameMonetize:**
- **Em Cena**: tem conteúdo sexual explícito, que os portais de anúncios recusam. Fica para o
  itch.io marcado como 18+.
- **GAFFER** e **GAFFER Rebuild**: usam nomes reais de clubes e da Premier League. Primeiro é
  preciso trocá-los por nomes inventados.
- **Pibe del Cerro**: cerca de 20 MB, só teclado e só em espanhol. Dá mais trabalho a preparar do
  que é provável que renda lá.
- **ONE**, **ONE Admin** e **Plano do crime**: não são jogos.

Traduções: o Pinta e Esconde, o Farol, o Afiado e o Backline já foram passados para inglês
(`python3 translate.py <jogo>` aplica `traducoes/<jogo>.json` ao original em `originais-pt/`).
O Run a Motel também já está em inglês. O Sombras de 1947 fica para depois: cerca de 60% já
está traduzido em `traducoes/sombras-1947.en*.txt`, mas ainda não foi aplicado ao jogo.

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
  GameMonetize parecer o da CrazyGames para o jogo, sem mexer no código. Também corta o som
  durante os anúncios, como o GameMonetize exige. Nos 6 jogos que não tinham anúncios (NO REFUNDS,
  Sombras, Afiado, Backline, Pinta e Esconde, Farol), o build põe um anúncio antes de cada novo
  dia, caso, jogo, nível ou noite, no máximo um a cada 2 minutos. No Farol, Afiado e Backline
  esconde o texto do pitch para a Steam, que não faz sentido num portal. Testei com um SDK
  simulado: o anúncio aparece e o jogo continua a seguir.
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

### Run a Motel With Your Friends (itch.io 18+ e GameMonetize)
**Tagline:** Reach a million in 7 days before the sheriff gets suspicious.
**Description:** Desert Rose Motel, Route 66, New Mexico. By day: fresh sheets and burnt coffee.
By night: back-room poker, the smuggling truck, calls from the Family and an alligator named Bubba
who eats whatever you throw him. A darkly comic 3D management game for 1 to 4 players on one
screen.
**Controls:** WASD + E (or arrows + Enter, IJKL + O, numpad + 0, gamepad). Esc pause.
**Genre:** Simulation. **Tags:** management, dark-humor, 3d, local-multiplayer

### Gobble Royale (GameMonetize)
**Title:** Gobble Royale
**Description:** Eat smaller monsters, run from bigger ones and pick a new power every level.
Three-minute rounds against 11 rivals: grow to the top of the food chain before the clock runs out.
**Controls:** Mouse or finger to move, Space or click to dash.
**Category:** .io. **Tags:** io, eat and grow, arcade, monsters

### Nations Free Kick (GameMonetize)
**Title:** Nations Free Kick
**Description:** 96 nations, one wall in your way. Bend it round the wall or lift it over, then
swap roles and save the CPU's shot. A full tournament from the groups to the final.
**Controls:** Mouse or touch to aim, set the curl and hold for power; tap to save. Keyboard:
arrows aim, Q/E curl, hold Space to shoot.
**Category:** Sports. **Tags:** football, soccer, free kick, world cup

### Neon Horde, Borough '89, Frontline Zero, NO REFUNDS (GameMonetize)
Usa os textos das secções da CrazyGames e do itch.io acima.

### Paint and Hide / Pinta e Esconde (GameMonetize)
**Title:** Paint and Hide
**Description:** Paint your white figure with the colours of the room and stand still. The seeker
has 20 seconds and 3 shots to find you. Hunt mode against the computer, or Party mode for two
players on the same screen.
**Category:** Puzzle. **Tags:** hide and seek, painting, 2 player, casual

### Farol (GameMonetize)
**Title:** Farol (Lighthouse)
**Description:** One island, one beam of light. Guide ships to the harbour and burn the creatures
of the deep, but your beam cannot do both at once. Pick an upgrade every dawn and survive the
nights.
**Controls:** Mouse or finger to aim the beam, Space for the foghorn.
**Category:** Arcade. **Tags:** lighthouse, defense, roguelite, survival

### Sombras de 1947 (GameMonetize)
**Title:** Sombras de 1947 (Shadows of 1947)
**Description:** Noir detective episodes in 1947 Los Angeles. Examine clues, question witnesses
who lie and build the case for the jury. (Game text in Portuguese.)
**Category:** Puzzle. **Tags:** detective, mystery, noir, story

### Afiado (GameMonetize)
**Title:** Afiado: Hockey Kit Manager
**Description:** You are the equipment manager of the weakest hockey team in the league. Sticks
break, skates go blunt, helmets come loose: fix the gear on the bench before your team plays a
man down.
**Controls:** WASD walk, mouse look, E pick up/use.
**Category:** Sports. **Tags:** hockey, 3d, first person, repair

### Backline (GameMonetize)
**Title:** Backline: Roadie Rush
**Description:** You are the roadie of a touring band. Strings snap, drumheads tear, batteries
die: run backstage, fix the gear and get it back on stage before the crowd cools down.

**Controls:** WASD walk, mouse look, E pick up/use.
**Category:** Simulation. **Tags:** music, concert, 3d, first person, repair

