# Plano: converter os jogos (artifacts) para Roblox

Os jogos originais são artifacts HTML/JavaScript no claude.ai. Cada um é reescrito em Luau como
projeto Rojo em `roblox/<jogo>/`, com multijogador e com os problemas da conversão tornados vantagens.

## Estado

- Rojo 7.4.4 instalado no PC (Windows) via Rokit; versão fixada em `roblox/rokit.toml`.
- Plugin do Rojo: `roblox/instalar-plugin.ps1` (o `rojo plugin install` falhou por não encontrar o Studio no registo).
- `roblox/teste-rojo/`: projeto mínimo para confirmar a ligação (peça verde + mensagens `[teste-rojo]` no Output).
- Plugin do Rojo 7.4.4 instalado em `%LOCALAPPDATA%\Roblox\Plugins\Rojo.rbxm` (29/10/2026).
- MCP do Studio: o servidor `Roblox/studio-rust-mcp-server` foi descontinuado; usa-se o MCP que vem
  dentro do Studio (Assistant › … › Manage MCP Servers › Enable Studio as MCP server), configurado
  para o Claude Code em `.mcp.json` na raiz do repositório.
- `roblox/shared/`: base comum feita (Remotes, Fase, UI, Util, GestorRondas, DadosJogador, Estatisticas).
- `roblox/gobble-royale/`: 1.ª versão completa, compila com `rojo build`; falta testar no Studio.

## Base comum (`roblox/shared/`)

- Rondas e lobby, gravação com DataStore, RemoteEvents, tabelas de pontuação, UI base.
- Servidor autoritário: o cliente só manda inputs; pontos, acertos e dinheiro decidem-se no servidor.
- Tabelas de dados dos jogos (armas, cartas, clubes, mapas) passam para ModuleScripts.
- Som: o WebAudio sintetizado não existe no Roblox; usar áudio da biblioteca ou carregado.
- Controlos: `ProximityPrompt` em vez de "carrega E"; telemóvel e consola de graça.

## Ordem de trabalho

1. Base comum
2. Gobble Royale
3. NO REFUNDS (obrigatório)
4. Afiado, depois Backline (mesmo código)
5. Restantes pela ordem abaixo

## Jogos

| # | Jogo | Artifact | No Roblox | Multijogador | Problema → vantagem |
|---|------|----------|-----------|--------------|---------------------|
| 1 | Gobble Royale | https://claude.ai/artifact/JFSjubvgDSStXPtacXvYXp | Arena 3D, jogador é uma bola que cresce, monstros NPC | 20–30 por servidor, rondas de 5 min | Comida só visual no cliente (aguenta mais gente); escolha de poder vira estratégia contra pessoas |
| 2 | Pinta e Esconde | https://claude.ai/artifact/C7rLwjjeA7eRuHkRjtHdQx | Salas de peças coloridas; pipeta por raycast pinta cada parte do boneco; poses | 1 caçador vs 4–8 escondidos, roda | Pintura por partes é mais rápida; caçador em 1.ª pessoa dá tensão |
| 3 | Frontline Zero | https://claude.ai/artifact/6vLUbbqfUbF5Ci9mpEFu4r | Mapa gerado do ASCII `TOP_HALF`; armas e streaks como tabelas | TDM 6v6, FFA 8; servidor valida acertos | Bots preenchem lugares vazios (nunca há servidores mortos) |
| 4 | Afiado | https://claude.ai/artifact/4a5xXJTCSDPrpjghxo9w3e | Pavilhão em metros passa direto; estações com `ProximityPrompt` (`HoldDuration`) | Cooperativo 1–4, pedidos escalam | Em grupo nascem funções |
| 5 | Backline | https://claude.ai/artifact/ASoY8Jub8hssMmM6Q4dAV3 | Mesmo código do Afiado, cenário de palco | Equipa de roadies; opção: um jogador é músico | 4 pistas gravadas: cada avaria cala mesmo o instrumento |
| 6 | Splat Stack | https://claude.ai/artifact/No8WbtUDLFaZez8AmAht72 | Obby; ao morrer o corpo vira peça fixa | Cooperativo e corrida | Corpos colidem só para a equipa e expiram |
| 7 | NO REFUNDS | https://claude.ai/artifact/GCQVzNoua8u3Gw1MjGpf6Y | Tabelas para ModuleScripts; cartas em ScreenGui; escritório 3D | Modo festa online: quem liga, vítima com papel secreto, espectadores apostam | Vales/documentos fictícios em vez de cartões-presente e SSN; falas pré-definidas em vez de chat livre |
| 8 | Ragdoll Dunk | https://claude.ai/artifact/AqxLSwdNRcNMV9V1fbNx1i | 3D com câmara de lado e movimento num plano; ragdoll com `BallSocketConstraint` | 1v1, 2v2 | Quem tem a bola é dono da física (`SetNetworkOwner`) |
| 9 | Neon Horde | https://claude.ai/artifact/GorySqmHPFvKeznn8vWQ96 | Câmara de cima, inimigos movidos com `BulkMoveTo` | Cooperativo até 4, XP partilhado | Menos inimigos mas mais fortes; reviver colegas |
| 10 | Farol | https://claude.ai/artifact/ESwiGYtxrT7NX5k5to94in | Ilha 3D à noite, feixe `SpotLight` com cone | Até 4: feixe, sirene, óleo, reparações | Funções obrigam a comunicar |
| 11 | Borough '89 | https://claude.ai/artifact/1zLEaNt639Z8LBUjWnjwcw | Cidade gerada pelo código do mapa existente; `VehicleSeat`; `StreamingEnabled` | Cidade partilhada, polícias vs ladrões | Geração por código em vez de construir à mão |
| 12 | Pibe del Cerro | https://claude.ai/artifact/WZvi5KdenbwAerDevXwkZT | Já 3D; bairro, autocarro, chivitos | Roleplay com empregos e economia | Estilo cartoon sem sangue; tema único para a América Latina |
| 13 | Penalty Nations + Nations Free Kick | https://claude.ai/artifact/2vZcYAsrE82k6UVceDfUWh · https://claude.ai/artifact/M4sytCbyzyAf6R8H7SvsuF | Um jogo "Nations Cup" com penáltis e livres | 1v1 remata/defende; torneio do servidor | Ranking e torneio; sem logos oficiais |
| 14 | Run a Motel With Your Friends | https://claude.ai/artifact/F1fikAjvwyCwuZZwut5yeF | Fachada de dia mantém-se | 4 online | Negócio de noite passa a motel assombrado (o original é proibido no Roblox) |
| 15 | GAFFER Rebuild | https://claude.ai/artifact/WEVMkoD98efzgnX4ocQqtw | UI em ScreenGui, carreira em DataStore | Liga partilhada, transferências entre jogadores | Clubes fictícios em vez de nomes reais |
| 16 | Sombras de 1947 | https://claude.ai/artifact/H9dcx3jPKhVZg2YXTgCePx | Cenas do crime 3D, interrogatórios | 2–4 detetives, pistas divididas | Obriga a falar para resolver |
| 17 | Em Cena | https://claude.ai/artifact/5jx4GYwowCDGFnDUzQ9sov | Tycoon de estúdio de Hollywood (ação, comédia) | Estúdios rivais, jogadores como atores | Tema adulto trocado; mecânicas mantidas |

Fora: ONE e ONE Admin (app de encontros), Plano do crime (documento).
