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
- **🎉 Grupo — Scammers vs Baiters (2–8 jogadores):** juntem-se numa chamada de voz (Discord) e partilhem o ecrã do anfitrião. Em cada ronda, um jogador é o burlão e outro é a vítima. A vítima abre o jogo no telemóvel (botão **📱 I'm the victim** ou o link terminado em `#victim`), mete o código que aparece no ecrã e recebe uma ficha secreta: personagem, traços, um objetivo secreto e os seus cartões-presente. Algumas vítimas são, em segredo, **scambaiters** com cartões falsos. Não há servidor: os dois aparelhos geram a mesma personagem a partir do código.
  - **Toda a gente joga em todas as rondas:**
    - quem está de fora faz **previsões** (vítima real ou baiter? o dinheiro vai passar?);
    - cada espectador recebe uma **carta de caos** (cão a ladrar, chefe a passar, sirenes…) e escolhe quando a usar.
  - **A vítima tem 3 fichas de reação** ("Prova-o!", "O meu filho chegou", "Começar a chorar"…). Algumas obrigam o burlão a responder com a tática certa.
  - **A faixa de reação** no ecrã partilhado diz à vítima como representar (😍 CONQUISTADA, 🤨 MUITO DESCONFIADA, 💳 ACEITA PAGAR…).
  - **Ritmo:** cada chamada tem temporizador (3/5/8 min). Depois de a vítima aceitar pagar, os cartões congelam ao fim de 90 s, e as vítimas reais ganham pontos por ler devagar.
  - **No fim**, há prémios (Melhor Vigarista, Melhor Vítima, Mestre do Baiting, Oráculo, Agente do Caos, Burlão Mais Ingénuo). Se a página recarregar, a festa pode ser retomada.

## Opcional
- **Vozes:** o TTS do próprio browser (grátis, offline).
- **Microfone:** reconhecimento de voz do browser; nada é gravado.
- **Vítimas com IA:** em Definições, mete a tua chave da API da Anthropic e o Claude improvisa as respostas a partir das tuas palavras exatas. As regras de jogo continuam a decidir os números.
- **Mods:** JSON com guiões, traços, cartas e falas novas (exemplo em [`mods/utility-shutoff.json`](mods/utility-shutoff.json)). São só dados e não executam código.

## Para quem desenvolve
```
node tools/sim.js 4000                                      # equilíbrio: milhares de chamadas simuladas
NODE_PATH=$(npm root -g) node tools/smoke.js /tmp/shots     # joga um dia no Chromium e tira screenshots
NODE_PATH=$(npm root -g) node tools/story-test.js witness   # campanha completa (plain | witness | kingpin)
NODE_PATH=$(npm root -g) node tools/party-test.js /tmp/shots # modo de grupo com dois browsers (anfitrião + telemóvel)
```
Arquitetura: `js/data.js` (conteúdo) · `js/engine.js` (regras, sem DOM) · `js/game.js` (dia, economia) · `js/story.js` (campanha) · `js/ui.js` + `js/apps.js` (DeskOS) · `js/main.js` (fluxo) · `js/audio.js` (sons sintetizados, TTS) · `js/llm.js` (IA opcional) · `js/mods.js` · `js/party.js` (modo de grupo).

Plano e análise do concorrente: [`PLANO.md`](PLANO.md) · Estratégia de mercado e roadmap: [`ESTRATEGIA.md`](ESTRATEGIA.md).

> Sátira. As marcas são fictícias. Se alguém alguma vez te pedir cartões-presente ao telefone, desliga: é burla. Sempre.
