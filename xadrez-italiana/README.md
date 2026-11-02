# Treinador da Italiana

Software de treino de xadrez focado na **Abertura Italiana** (1.e4 e5 2.Nf3 Nc6 3.Bc4).

## O que faz

- **Adversário que joga como a elite.** Enquanto a partida está na teoria, o adversário escolhe
  as respostas com as frequências aproximadas dos jogadores de topo: Giuoco Pianissimo
  (o sistema de Carlsen, Caruana, Giri, So…), Giuoco Piano clássico, Ataque Møller,
  Gambito Evans (incluindo Kasparov–Anand, Riga 1995), Dois Cavalos (4.d3, 4.Ng5, 4.d4,
  Fried Liver, Lolli, Traxler), Húngara e Blackburne-Shilling. Cada lance de teoria vem
  comentado. Depois do livro, joga o Stockfish com a força que escolheres.
- **Análise de cada lance teu.** Classificação (teoria, melhor, bom, imprecisão, erro, erro grave),
  avaliação, o melhor lance com a continuação, a resposta do adversário que te castiga,
  peças penduradas, garfos, oportunidades perdidas, princípios de abertura violados e o que a
  elite joga quando sais do livro.
- **Sem voltar atrás.** Não existe botão para anular lances. Vives com as consequências.
- **Scan obrigatório.** Antes de cada lance tens de fazer um scan (botão «Fazer scan» ou tecla S).
  O scan percorre todas as peças, primeiro as do adversário e depois as tuas, e mostra as tuas
  peças em perigo, os alvos no adversário e os xeques que ele tem disponíveis. Passar o rato
  numa peça mostra o que ela ataca, quem a defende e quem a ataca. Se tentares jogar sem o
  scan: aviso, −10 pontos de disciplina e, a partir do 3.º aviso, o tabuleiro bloqueia
  (5 s, 10 s, … até 30 s).
- **Relatório do treinador no fim.** Precisão, veredicto, análise da abertura, momentos
  críticos, precisão por fase, disciplina de scan, padrões de erro, plano de treino
  personalizado e evolução face às partidas anteriores (guardadas no navegador).

## Como usar

O Stockfish corre num Web Worker, que os navegadores não permitem a partir de `file://`.
Serve a pasta com um servidor local:

```bash
cd xadrez-italiana
python3 -m http.server 8000
# abre http://localhost:8000
```

Se o Stockfish não carregar, a aplicação usa um motor interno mais simples (o estado aparece
no canto superior direito).

## Estrutura

| Ficheiro | Conteúdo |
|---|---|
| `index.html` | Interface e estilos |
| `js/book.js` | Livro de aberturas: linhas, frequências da elite e comentários |
| `js/engine.js` | Stockfish (WebAssembly → asm.js → CDN) e motor de recurso |
| `js/coach.js` | Deteção de padrões táticos, explicações e relatório final |
| `js/app.js` | Fluxo da partida, scan obrigatório e penalizações |
| `vendor/` | chess.js 0.10.3 (BSD) e Stockfish.js 10.0.2 (GPLv3) |
