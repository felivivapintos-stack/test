# Splat Stack: submeter no CrazyGames

Tudo o que o formulário do CrazyGames pede está nesta pasta. Os textos para colar estão em inglês,
porque o site é internacional.

## Ficheiros

| Ficheiro | Para quê |
|---|---|
| `splat-stack.zip` | O jogo (HTML5). É o que se envia como build. |
| `cover-landscape-1920x1080.png` | Capa horizontal 16:9 |
| `cover-portrait-800x1200.png` | Capa vertical 2:3 |
| `cover-square-800x800.png` | Capa quadrada 1:1 |
| `video-landscape-1920x1080.mp4` | Vídeo de pré-visualização horizontal (19,8 s, sem som) |
| `video-portrait-1080x1620.mp4` | Vídeo de pré-visualização vertical (19,8 s, sem som) |

As capas só têm o título como texto, sem molduras nem logótipos. Os vídeos começam com a imagem da
capa e mostram gameplay real (níveis 1, 7 e 6), tal como o CrazyGames pede.

## Passos

1. Cria conta em https://developer.crazygames.com/ e escolhe **Submit a game** → **HTML5**.
2. Envia `splat-stack.zip`. O ficheiro de entrada é `index.html`.
3. Testa na pré-visualização do portal. Acrescenta `?crazygames_sandbox=1` ao endereço para ver
   anúncios de teste. Confirma que:
   - o jogo abre logo no nível 1;
   - entre níveis aparece um anúncio de teste a partir do nível 3;
   - o botão **Skip** só salta o nível depois de o anúncio acabar.
4. Preenche a página do jogo com os textos abaixo.
5. Carrega as 3 capas e os 2 vídeos.
6. Em **Mobile**, marca que funciona em telemóvel e tablet, na orientação horizontal (landscape).
7. Submete. O CrazyGames começa normalmente por um **Basic Launch** (teste com poucos jogadores) e
   decide depois se passa a **Full Launch**, conforme os números de jogo.

## Textos para o formulário

**Title**

Splat Stack

**Short description** (uma linha)

Every death leaves a block behind. Die in the right place, stack your corpses and reach the door.

**Description**

Splat Stack is a jelly platformer where failing is how you win. Every time your jelly dies, its body
stays behind as a solid block. Spike pit too wide? Jump in, and your corpse becomes the bridge. Wall too
tall? Stack yourself until you can climb it. Saw blade too fast to dodge? Blades jam on soft things.
Like you.

Each level has a par: the fewest deaths needed. Figure out where to die, beat the par and earn three
stars. Watch out for floors that lie, ceilings that fall and a door that gets shy when you come close.

- 24 handcrafted levels in 4 worlds: Jelly Meadow, Saw Factory, Lava Works and Devil's Den
- Your deaths are your tools: bridges over lava, stairs up walls, brakes for saws
- Instant restarts, short levels and a death counter you'll want to brag about
- 3 stars per level and 9 jelly skins to unlock
- Plays on desktop, phone and tablet

**Controls**

- Move: Arrow keys or A / D
- Jump: Space, W or Up arrow
- Restart level: R
- Pause: Esc or P
- Mobile: on-screen arrows and jump button
- Gamepad: left stick or D-pad, A to jump

**Category:** Platformer (alternativa: Puzzle)

**Tags:** platformer, puzzle, skill, physics, funny, jelly, 2d, levels, mobile, singleplayer

## O que o jogo já cumpre (para o Full Launch)

- SDK v3 do CrazyGames, com `gameplayStart`/`gameplayStop`, `loadingStart`/`loadingStop` e `happytime`.
- Anúncios só pelo SDK: midgame entre níveis e rewarded para saltar um nível.
- Som desligado durante anúncios. Respeita a opção de silenciar do CrazyGames.
- O jogo abre diretamente em gameplay, sem menus antes.
- Progresso guardado na conta CrazyGames (`SDK.data`), com alternativa local.
- Funciona sem SDK e com bloqueador de anúncios.
- Pacote de cerca de 90 KB, sem pedidos a outros sites.
- Conteúdo adequado a PEGI 12: violência de desenho animado, sem sangue.

## Ainda por confirmar no portal

- Não testei dentro do portal do CrazyGames, só com um SDK simulado. O passo 3 serve para isso.
- Os textos e as categorias podem ser ajustados pela equipa do CrazyGames durante a revisão.
