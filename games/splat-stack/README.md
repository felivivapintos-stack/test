# Splat Stack

**Cada morte deixa um bloco.** Splat Stack é um jogo de plataformas com uma geleia, feito para o
CrazyGames. Quando a geleia morre, o corpo fica onde caiu, como um bloco sólido. Usas esses blocos
para atravessar espinhos e lava, e empilha-los para subir paredes altas demais para saltar.

Para jogar localmente: `python3 -m http.server` nesta pasta e abre `http://localhost:8000`.

## Porquê este jogo: o que a pesquisa mostrou (outubro de 2026)

Os jogos mais jogados na página inicial do [Poki](https://poki.com/) são Level Devil, Smash Karts,
Subway Surfers, Blocky Blast Puzzle e Drive Mad. No [CrazyGames](https://www.crazygames.com/), os mais
populares incluem Shell Shockers, Geometry Dash, Moto X3M, Smash Karts e Bouncemasters.

O estudo do próprio Poki sobre jogos de carros ([blog do Poki, set. 2026](https://poki.com/blog/game-intelligence-car-games))
diz que o Drive Mad, com 23% de todas as partidas de jogos de carros, ganha por ser "simples,
engraçado e caótico". Também recomeça na hora, e "falhar faz parte da diversão". O Level Devil, hoje
o n.º 1 no Poki, usa a mesma fórmula, com armadilhas que gozam com o jogador.

O que os sucessos virais têm em comum:

| Padrão | Exemplos | O que o Splat Stack faz |
|---|---|---|
| Jogar em menos de 1 segundo, sem menu | Drive Mad, Level Devil | Abre logo no nível 1 (ou no próximo por acabar) |
| Níveis curtos, repetir na hora | Level Devil, Geometry Dash | Um ecrã por nível, renasce em 0,4 s, R recomeça |
| Falhar é engraçado, não castiga | Drive Mad, Level Devil | Cada morte deixa um bloco útil, mais uma piada |
| Armadilhas que gozam com o jogador | Level Devil | Espinhos escondidos, espinhos que caem, blocos que desabam, porta que foge |
| Setas mais um botão, funciona no telemóvel | Stickman Hook, Subway Surfers | Setas + salto, com botões táteis no telemóvel |
| Progressão e motivos para voltar | Blocky Blast, Retro Bowl | 3 estrelas por nível (mortes vs par), 9 skins desbloqueadas com estrelas |

**A novidade:** no Level Devil, morrer só te ensina alguma coisa. No Splat Stack, morrer também
constrói o caminho. O par (o mínimo de mortes necessário) faz de cada nível um pequeno puzzle:
*onde* deves morrer?

## Como se joga

- 24 níveis em 4 mundos: Jelly Meadow, Saw Factory, Lava Works e Devil's Den.
- Espinhos e lava matam, e o bloco que deixas fica pousado por cima deles.
- Os espinhos escondidos saltam quando te aproximas. Os espinhos do teto caem quando passas por baixo.
- Os blocos rachados desabam depois de os pisares. As molas lançam-te alto.
- As serras andam num percurso e **encravam num cadáver**: param e deixam de cortar. Quando não há espaço para as saltar, morres à frente delas e passas.
- A porta tímida foge para um sítio mais difícil da primeira vez que te aproximas.
- Estrelas: ★★★ se as tuas mortes forem iguais ou inferiores ao par, ★★ até par + 3, senão ★.

## Prova de que todos os níveis se conseguem acabar

`node tools/solve.mjs` faz uma pesquisa sobre a simulação do próprio jogo (`src/sim.js` é
determinística e não usa o DOM). Acaba todos os níveis e encontra o mínimo de mortes de cada um.
O `par` em `src/levels.js` é comparado com esse resultado. Corre-o depois de mudares qualquer nível.
Além disso, verifica que:
- quando o par é maior do que o mínimo, existe mesmo uma rota com exatamente esse número de mortes;
- os níveis marcados `tutorial` (só o Jam Session) podem ser ganhos a andar em frente, de propósito;
- `SOLVE_STEP=10 node tools/solve.mjs` repete a prova a ritmo humano (6 decisões por segundo), para apanhar níveis que só se passam com timing ao frame;
- nenhum nível se ganha só a segurar uma tecla (→, → + salto ou saltos ritmados).

## Integração com o CrazyGames (`src/platform.js`)

- SDK v3: `https://sdk.crazygames.com/crazygames-sdk-v3.js`, iniciado com um limite de 4 segundos.
  O jogo funciona sem o SDK (localmente, noutros sites ou com bloqueador de anúncios).
- `loadingStart`/`loadingStop` no arranque. `gameplayStart` enquanto se joga um nível,
  `gameplayStop` na pausa, nos menus, no fim do nível e durante anúncios.
- `happytime` ao acabar um nível com 3 estrelas e no fim de cada mundo.
- Anúncio **midgame** só entre níveis: a partir do nível 3, de 2 em 2 níveis, no máximo um a cada 2 minutos.
- Anúncio **rewarded**: aparece um botão "Skip" depois de muitas mortes. O nível só é saltado
  quando o anúncio acaba (`adFinished`).
- O som é desligado durante os anúncios e respeita a definição `muteAudio` do CrazyGames.
- O progresso é guardado com `SDK.data` (conta CrazyGames), com `localStorage` como alternativa.
- Sem imagens nem áudio externos (todo o som é sintetizado). As fontes Fredoka (títulos, números, botões) e Outfit (textos) vêm dentro do jogo em `fonts/`. O pacote tem cerca de 85 KB.

## Publicar no CrazyGames

1. `sh tools/build.sh` cria `dist/splat-stack.zip` (index.html, style.css, src/, fonts/).
2. No [CrazyGames Developer Portal](https://developer.crazygames.com/), cria o jogo como HTML5 e envia o zip.
3. Testa na pré-visualização deles com `?crazygames_sandbox=1` (anúncios falsos).
4. Material de submissão: descrição, controlos (setas/WASD + Espaço/W/↑, R recomeça, Esc pausa) e
   capas (imagens e vídeo). O vídeo da capa deve mostrar uma morte a virar ponte, porque isso explica
   o jogo em 3 segundos.

## Estrutura

```
index.html, style.css   página, HUD, menus, controlos táteis
fonts/                  Fredoka e Outfit (woff2, licença SIL OFL)
src/sim.js              física e regras determinísticas (partilhadas com o solucionador)
src/levels.js           os 24 níveis em ASCII
src/render.js           desenho em canvas, partículas, skins
src/audio.js            efeitos e música sintetizados com WebAudio
src/platform.js         SDK v3 do CrazyGames + gravação do progresso
src/main.js             ciclo de jogo, controlos, menus, anúncios
tools/solve.mjs         solucionador que prova os níveis e o par
tools/build.sh          zip para enviar
```

## Material da loja

`store/` tem as capas, os vídeos de pré-visualização e `store/SUBMISSION.md` com os passos e os textos
para o formulário do CrazyGames. Para os voltar a gerar depois de mudar o jogo (precisa de ffmpeg):

```
python3 -m http.server 8765 &                                          # nesta pasta
SOLVE_STEP=10 node tools/promo/record-inputs.mjs 1 7 6 > tools/promo/inputs.json
node tools/promo/render.cjs store
```
