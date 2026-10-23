# NO REFUNDS

**Um simulador satírico de um call center de burlas.** Dez dias, um headset e um baralho de mentiras. Lês as tuas vítimas, cumpres a quota, foges à polícia e descobres que tipo de pessoa és quando ninguém está a ver.

Corre no browser, offline, sem instalar nada: abre `index.html`.

## Como se joga
1. **Telefone:** escolhe uma *lead* e um guião (Suporte Técnico, Segurança Social, Reembolso, Sorteio, Banco, Neto Preso).
2. **Cartas:** em cada turno jogas uma tática (Assustar, Autoridade, Empatia, Tecno-palavreado…). A **confiança** sobe e a **desconfiança** também; cada carta gasta **paciência**.
3. **Traços escondidos:** cada vítima tem 2–3 traços (Idosa, Solitária, Cética, Percebe de Informática…). A conversa de circunstância revela-os. As cartas mostram o multiplicador contra o que já sabes.
4. **Combos:** Assustar → Acalmar (polícia bom / polícia mau), Conversa → Empatia (*rapport*), Autoridade → Pressa…
5. **Improviso:** escreve, ou diz ao 🎤, a tua própria fala antes de jogar a carta. Se encaixar na carta, ganhas ×1,25; se usares o nome da vítima ou um detalhe pessoal que descobriste, ganhas bónus.
6. **🎯 Pedir:** a % mostrada é a probabilidade real de avançar o guião.
7. **Pagamento:** a vítima vai à loja (cuidado com o caixa), lê-te os códigos e tu introduze-los no **Redeem**. Os idosos ouvem mal ("B ou 8?"). Os cartões bancários passam no **Terminal** com o checksum de Luhn.
8. **Scambaiters** fazem-se passar por vítimas para te gravar. Desmascara-os com 🚩.
9. **Calor policial:** acima de 100 há rusga, e tens de destruir as provas a tempo.
10. **Noite:** gasta a tua parte na **DeskMart** em objetos para a secretária (os *jokers*) e em cartas novas, ou desfaz-te das más.

## Modos
- **História (10 dias):** o chefe Vance, a jornalista Nadia, o professor Harold, a tua avó Rosa, o detetive Okafor. Seis finais.
- **Turno infinito:** as quotas sobem até tu partires.
- **Desafio diário:** a mesma *seed* para toda a gente, 3 dias, melhor pontuação.
- **🌐 Multiplayer online — Scammers vs Baiters (2–8 jogadores):** cada pessoa joga no seu aparelho (PC ou telemóvel). O anfitrião cria a sala e recebe um **código de 5 letras**; os outros entram com **🔑 Join a game with a code** ou com o link de convite (`…/index.html?join=CÓDIGO`).
  - **Em cada ronda:** um jogador faz a chamada e outro é a vítima, com uma ficha secreta (personagem, traços, objetivo secreto, cartões-presente). Algumas vítimas são, em segredo, **scambaiters** com cartões falsos.
  - **A vítima** carrega nas suas **fichas de reação** ("Prova-o!", "Começar a chorar"…) e segue a **faixa** que lhe diz como representar.
  - **Os espectadores** fazem **previsões** e lançam a sua **carta de caos**.
  - **Voz incluída** entre todos, com efeito de linha telefónica para o burlão e a vítima durante a chamada (ou usem o Discord).
  - **Temporizadores** de chamada (3/5/8 min) e de pagamento (90 s); a votação do objetivo é feita por todos; **prémios** no fim.
  - **Como funciona:** WebRTC peer-to-peer (PeerJS). O servidor público e gratuito do PeerJS só serve para os jogadores se encontrarem pelo código; os dados e a voz vão diretamente entre eles. O anfitrião é o árbitro das rondas e dos pontos. Precisa de internet e de um separador normal do browser.

## Opcional
- **Microfone:** reconhecimento de voz do browser; nada é gravado.
- **Vítimas com IA:** em Definições, mete a tua chave da API da Anthropic e o Claude improvisa as respostas a partir das tuas palavras exatas. As regras de jogo continuam a decidir os números.
- **Mods:** JSON com guiões, traços, cartas e falas novas (exemplo em [`mods/utility-shutoff.json`](mods/utility-shutoff.json)). São só dados e não executam código.

## Para quem desenvolve
```
node tools/sim.js 4000                                      # equilíbrio: milhares de chamadas simuladas
NODE_PATH=$(npm root -g) node tools/smoke.js /tmp/shots     # joga um dia no Chromium e tira screenshots
NODE_PATH=$(npm root -g) node tools/story-test.js witness   # campanha completa (plain | witness | kingpin)
NODE_PATH=$(npm root -g) node tools/mp-test.js /tmp/shots    # multiplayer online: 3 browsers entram por código e jogam uma volta
```
Arquitetura: `js/data.js` (conteúdo) · `js/engine.js` (regras, sem DOM) · `js/game.js` (dia, economia) · `js/story.js` (campanha) · `js/ui.js` + `js/apps.js` (DeskOS) · `js/main.js` (fluxo) · `js/audio.js` (sons sintetizados) · `js/llm.js` (IA opcional) · `js/mods.js` · `js/multiplayer.js` (multiplayer online e voz) · `js/vendor/peerjs.min.js` (PeerJS 1.5.5, MIT).

Plano e análise do concorrente: [`PLANO.md`](PLANO.md) · Estratégia de mercado e roadmap: [`ESTRATEGIA.md`](ESTRATEGIA.md).

> Sátira. As marcas são fictícias. Se alguém alguma vez te pedir cartões-presente ao telefone, desliga: é burla. Sempre.
