# Gobble Royale (Roblox)

Conversão do artifact https://claude.ai/artifact/JFSjubvgDSStXPtacXvYXp para Roblox, multijogador.

## Como ficou

- Arena 3D (480 × 480 studs), cada jogador é uma bola com olhos que cresce ao comer.
- Rondas de 5 minutos, 15 s de intervalo, 10 s de resultados. Últimos 30 s: frenesi dourado.
- Bots com a IA original preenchem a arena até 16 blobs; saem quando entram pessoas.
- Quem é comido renasce pequeno ao fim de 3 s, com escudo de 3 s, e mantém os poderes.
- Ao subir de nível aparecem 3 poderes **sem pausar o jogo** (teclas 1/2/3, D-pad ou toque):
  escolher depressa e bem passa a ser estratégia contra pessoas.
- Moedas, vitórias, recordes, skins e melhorias permanentes gravados com DataStore.

## Controlos

- PC: o blob segue o rato (ou WASD/setas); Espaço ou clique = dash.
- Telemóvel: arrastar em qualquer sítio; botão ⚡ = dash.
- Comando: manípulo esquerdo; A ou R2 = dash.

## Como está feito

- `src/server/Sim.luau` — porto do `sim.js` original, autoritário no servidor (30 passos/s).
- `src/server/Main.server.luau` — rondas (via `shared/GestorRondas`), rede, loja, gravação, bots.
- `src/shared/Protocolo.luau` — estado em buffers: 12 bytes por blob, a 15 envios/s.
- `src/client/Render.luau` — desenha tudo com peças locais. **A comida só existe no cliente como
  visual**: o servidor manda só números (comida nova / comida comida), por isso aguenta muita gente.
- O íman já não arrasta migalhas no servidor (isso obrigava a enviar a posição de cada migalha):
  aumenta o alcance de comer e o cliente anima a migalha a voar para a boca.

## Testar

1. Num terminal nesta pasta: `rojo serve`
2. No Studio, sítio vazio (Baseplate): **Plugins › Rojo › Connect**.
3. **Play**. A ronda começa ao fim de 15 s.
4. Para testar multijogador: **Test › Clients and Servers › 2 Players › Start**.

Para gravar moedas no Studio: o sítio tem de estar publicado e **Home › Game Settings › Security ›
Enable Studio Access to API Services** ligado. Sem isso funciona em modo memória (aviso no Output).

## Por fazer

- Sons: `Config.SONS` está vazio; escolher áudios da biblioteca do Roblox.
- Ícone, miniaturas e publicação (máx. 30 jogadores por servidor em Game Settings › Places).
