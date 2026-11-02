/* Livro de aberturas da Abertura Italiana.
 * Cada linha: nome, peso (frequência aproximada na elite) e lances em SAN.
 * O peso decide com que frequência o adversário escolhe cada continuação:
 * imita a forma como os jogadores de topo respondem à Italiana.
 * Linhas com peso 0 só servem para reconhecer e comentar (armadilhas). */
const ITALIAN_LINES = [
  // ---------- Giuoco Pianissimo (a escolha moderna da elite) ----------
  { name: 'Giuoco Pianissimo: 5...d6 6.O-O a6', w: 10,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O a6 a4 Ba7 Re1 O-O h3 h6 Nbd2 Re8 b4 Be6 Bxe6 Rxe6' },
  { name: 'Giuoco Pianissimo: 5...d6 6.O-O O-O', w: 7,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 a4 Ba7 h3 h6 Nbd2 Re8 Nf1 Be6 Bxe6 Rxe6 Ng3' },
  { name: 'Giuoco Pianissimo: 5...O-O', w: 7,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 O-O O-O d6 a4 a5 Re1 h6 h3 Be6 Nbd2' },
  { name: 'Giuoco Pianissimo: 6...d5', w: 4,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 O-O O-O d5 exd5 Nxd5 Re1' },
  { name: 'Giuoco Pianissimo: 5...a6', w: 6,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 a6 O-O d6 a4 Ba7 Re1 O-O h3 h6 Nbd2 Re8 b4' },
  { name: 'Giuoco Piano: 4.d3', w: 4,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3 a6 a4 Ba7 Re1 O-O' },
  { name: 'Giuoco Piano: 4.O-O', w: 2,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 d3 d6 c3 O-O' },
  // ---------- Giuoco Piano clássico (5.d4) ----------
  { name: 'Giuoco Piano: 7.Bd2', w: 4,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3 Nce7 O-O O-O Rfe1 c6' },
  { name: 'Ataque Møller', w: 2,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O Bxc3 d5 Bf6 Re1 Ne7 Rxe4 d6 Bg5 Bxg5 Nxg5' },
  // ---------- Gambito Evans ----------
  { name: 'Gambito Evans: 5...Ba5 6.d4 exd4', w: 2,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O Nge7 cxd4 d5 exd5 Nxd5' },
  { name: 'Gambito Evans: Defesa Lasker', w: 2,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 d6 Qb3 Qd7 dxe5 Bb6' },
  { name: 'Gambito Evans: 5...Be7 (Kasparov–Anand, Riga 1995)', w: 2,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Be7 d4 Na5 Be2 exd4 Qxd4 Nf6 e5 Nc6 Qh4 Nd5 Qg3 g6 O-O Nb6 c4 d6 Rd1 Nd7 Bh6 Ncxe5 Nxe5 Nxe5 Nc3 f6 c5 Nf7 cxd6 cxd6 Qe3 Nxh6 Qxh6 Bf8 Qe3+ Kf7 Nd5 Be6 Nf4 Qe7 Re1' },
  { name: 'Gambito Evans recusado', w: 1,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6 a4 a6 Nc3 Nf6' },
  // ---------- Defesa dos Dois Cavalos ----------
  { name: 'Dois Cavalos: 4.d3 Bc5', w: 8,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O O-O Re1 a6 a4 Ba7 h3 h6 Nbd2' },
  { name: 'Dois Cavalos: 4.d3 Be7', w: 5,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 a4 Na5 Ba2 c5 c3' },
  { name: 'Dois Cavalos: 4.Ng5 linha principal', w: 4,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6 d4 exd3 Nxd3 Qc7' },
  { name: 'Ataque Fried Liver', w: 1,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Nb4' },
  { name: 'Ataque Lolli', w: 1,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 d4' },
  { name: 'Contra-ataque Traxler: 5.Bxf7+', w: 1,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Bxf7+ Ke7 Bd5 Rf8' },
  { name: 'Contra-ataque Traxler: 5.Nxf7', w: 1,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Nxf7 Bxf2+ Kxf2 Nxe4+' },
  { name: 'Dois Cavalos: Ataque Moderno 5.O-O', w: 2,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5 Bxd5 Qxd5 Nc3 Qa5 Nxe4 Be6 Neg5 O-O-O Nxe6 fxe6 Rxe6' },
  { name: 'Dois Cavalos: Ataque Moderno 5.e5', w: 2,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Be7' },
  { name: 'Italiana dos Quatro Cavalos', w: 1,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Nc3 Nxe4 Nxe4 d5 Bd3 dxe4 Bxe4 Bd6' },
  // ---------- Outras defesas ----------
  { name: 'Defesa Húngara', w: 2,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Be7 d4 d6 d5 Nb8 Bd3 Nf6 c4 O-O' },
  { name: 'Defesa Húngara: 4.O-O', w: 1,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Be7 O-O Nf6 d3 d6 c3 O-O' },
  { name: 'Gambito Blackburne-Shilling', w: 1,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxd4 exd4 c3' },
  { name: 'Armadilha Blackburne-Shilling', w: 0,
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5 Qg5 Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3#' },
];

/* Nome da abertura por prefixo (o prefixo mais longo ganha). */
const OPENING_NAMES = {
  'e4': 'Abertura do Peão do Rei',
  'e4 e5': 'Jogo Aberto',
  'e4 e5 Nf3 Nc6': 'Jogo Aberto: 2...Nc6',
  'e4 e5 Nf3 Nc6 Bc4': 'Abertura Italiana',
  'e4 e5 Nf3 Nc6 Bc4 Bc5': 'Giuoco Piano',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3': 'Giuoco Piano: 4.c3',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3': 'Giuoco Pianissimo',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4': 'Giuoco Piano clássico (5.d4)',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3': 'Ataque Møller',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 d3': 'Giuoco Pianissimo (4.d3)',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O': 'Giuoco Piano (4.O-O)',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4': 'Gambito Evans',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4': 'Gambito Evans aceite',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6': 'Gambito Evans recusado',
  'e4 e5 Nf3 Nc6 Bc4 Nf6': 'Defesa dos Dois Cavalos',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d3': 'Dois Cavalos: 4.d3 (moderno)',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5': 'Dois Cavalos: 4.Ng5',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5': 'Dois Cavalos: linha principal (5...Na5)',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7': 'Ataque Fried Liver',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 d4': 'Ataque Lolli',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5': 'Contra-ataque Traxler',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d4': 'Dois Cavalos: Ataque Moderno',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Nc3': 'Italiana dos Quatro Cavalos',
  'e4 e5 Nf3 Nc6 Bc4 Be7': 'Defesa Húngara',
  'e4 e5 Nf3 Nc6 Bc4 Nd4': 'Gambito Blackburne-Shilling',
};

/* Comentários de treinador por lance: chave = sequência completa até ao lance comentado. */
const BOOK_NOTES = {
  'e4': 'Ocupa o centro, controla d5 e f5 e abre caminho à dama e ao bispo de f1.',
  'e4 e5': 'A resposta simétrica clássica. Disputa o centro de igual para igual.',
  'e4 e5 Nf3': 'Desenvolve com ameaça: ataca o peão de e5.',
  'e4 e5 Nf3 Nc6': 'Defende e5 desenvolvendo uma peça. O lance mais natural.',
  'e4 e5 Nf3 Nc6 Bc4': 'A Italiana. O bispo aponta a f7, o ponto mais fraco das pretas (só o rei o defende). É das aberturas mais antigas (Greco, séc. XVII) e voltou à elite nos anos 2010 como alternativa à muralha Berlinense da Espanhola. Carlsen, Caruana, Giri, So e Nepomniachtchi jogam-na com regularidade.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5': 'Giuoco Piano. A resposta clássica e a mais frequente na elite: o bispo espelha o branco e aponta a f2.',
  'e4 e5 Nf3 Nc6 Bc4 Nf6': 'Defesa dos Dois Cavalos. Mais combativa: ataca e4 já. Quem a joga aceita complicações se as brancas responderem 4.Ng5.',
  'e4 e5 Nf3 Nc6 Bc4 Be7': 'Defesa Húngara. Sólida mas passiva: evita a teoria à custa de alguma liberdade. Rara na elite.',
  'e4 e5 Nf3 Nc6 Bc4 Nd4': 'Blackburne-Shilling. Duvidosa: 4.Nxd4! dá vantagem às brancas. Cuidado com 4.Nxe5?? Qg5!, que ganha material e pode acabar em mate.',
  'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxd4': 'A refutação correta: troca e depois c3 ou O-O. As brancas ficam com um centro melhor.',
  'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5': 'Ganancioso. Depois de 4...Qg5! as pretas atacam o cavalo e g2 ao mesmo tempo.',
  'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5 Qg5': 'Ataque duplo a e5 e g2. Agora 5.Nxf7?? perde: 5...Qxg2 6.Rf1 Qxe4+ 7.Be2 Nf3#.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3': 'Prepara d4 e cria uma retirada em c2/b3 para o bispo. É o plano central típico da Italiana.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6': 'Contra-ataca e4. Com o peão em c3, o cavalo de b1 já não pode defender e4 a partir de c3.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3': 'Giuoco Pianissimo, a escolha moderna da elite. Em vez de abrir já o centro, as brancas mantêm a tensão e manobram: Re1, Nbd2-f1-g3, a4, h3. Partidas longas e estratégicas, a especialidade de Carlsen.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6': 'Estrutura sólida. Mantém e5 e prepara ...a6/...Ba7 ou ...O-O.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 a6': '...a6 prepara ...Ba7: o bispo fica a salvo de d4 e de b4-b5, e as pretas podem jogar ...b5 mais tarde.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 O-O': 'Roque rápido. Mantém a opção ...d5 para libertar o jogo.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 O-O O-O d5': 'Rutura imediata no centro. As pretas aceitam um jogo mais aberto para ganhar atividade.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O a6 a4': 'a4 ganha espaço na ala da dama e trava ...b5. É um lance-chave do plano moderno.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O a6 a4 Ba7': 'O bispo recua para a diagonal a7-g1, longe de ataques, e continua a apontar a f2.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O a6 a4 Ba7 Re1 O-O h3': 'h3 tira a casa g4 ao bispo e ao cavalo preto. Prepara Nbd2-f1-g3 sem a cravada ...Bg4.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 a4 Ba7 h3 h6 Nbd2 Re8 Nf1': 'A manobra clássica: o cavalo vai a g3 para controlar f5 e apoiar d4 mais tarde.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4': 'O ataque central clássico. Abre o jogo enquanto o rei preto ainda não rocou.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4': 'Praticamente obrigatório: depois de 5...Bb6? 6.dxe5 as brancas ganham espaço com tempo.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+': 'Xeque para desorganizar o desenvolvimento branco antes que o centro avance com e5.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2': 'Linha sólida: troca bispos e mantém o centro.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5': 'O golpe libertador clássico: as pretas desfazem o centro branco antes que se torne perigoso.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3': 'Ataque Møller: as brancas entregam o peão e4 para ganhar tempo contra o rei preto. Muito agudo.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O Bxc3 d5': 'O ponto do Møller: d5 ataca o cavalo de c6 e abre a coluna e para a torre.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4': 'Gambito Evans: entrega um peão para ganhar tempo com c3 e d4. Kasparov recuperou-o nos anos 90 e venceu Anand com ele em Riga, 1995.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4': 'Aceitar é a resposta mais testada. Recusar com 4...Bb6 também é jogável.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3': 'Ganha tempo sobre o bispo e prepara d4.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5': 'A retirada mais popular: mantém a cravada potencial sobre c3.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Be7': 'A retirada sólida que Anand escolheu contra Kasparov em 1995.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 d6': 'Defesa Lasker: as pretas devolvem material para simplificar.',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d3': 'A abordagem moderna: sólida e sem a teoria aguda de 4.Ng5. É a escolha habitual de Carlsen e Caruana contra os Dois Cavalos.',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5': 'Ataque direto a f7. Viola o princípio de não mover a mesma peça duas vezes, mas é muito exigente para as pretas.',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5': 'A única boa defesa: bloqueia a diagonal do bispo.',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5': 'A linha principal: as pretas entregam um peão em troca de desenvolvimento e do par de bispos.',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5': 'Natural mas arriscado. 6.d4! (Lolli) ou 6.Nxf7!? (Fried Liver) deixam as pretas a sofrer.',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7': 'Fried Liver: sacrifica o cavalo para arrastar o rei preto para o centro.',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 d4': 'Ataque Lolli: abre o centro antes de sacrificar. Considerado mais forte que o Fried Liver.',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5': 'Traxler: as pretas ignoram a ameaça a f7 e contra-atacam f2. Caos total; exige cálculo preciso dos dois lados.',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d4': 'Ataque Moderno: abre o centro de imediato. Leva a jogo tático com o rei preto ainda no centro.',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Nc3': 'Italiana dos Quatro Cavalos. Cuidado com o truque ...Nxe4! seguido de ...d5 (garfo).',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Nc3 Nxe4': 'O truque do garfo: se 5.Nxe4, então 5...d5 ataca bispo e cavalo e as pretas recuperam a peça.',
};

const Book = (() => {
  const tree = {};
  for (const L of ITALIAN_LINES) {
    const mv = L.moves.split(/\s+/).map(strip);
    for (let i = 0; i < mv.length; i++) {
      const key = mv.slice(0, i).join(' ');
      const node = (tree[key] = tree[key] || {});
      const c = (node[mv[i]] = node[mv[i]] || { w: 0, lines: [] });
      c.w += L.w;
      if (!c.lines.includes(L.name)) c.lines.push(L.name);
    }
  }
  function strip(s) { return s.replace(/[+#?!]/g, ''); }
  function keyOf(sans) { return sans.map(strip).join(' '); }
  function candidates(key) {
    const node = tree[key];
    if (!node) return [];
    const list = Object.entries(node).map(([san, c]) => ({ san, w: c.w, lines: c.lines }));
    const total = list.reduce((s, c) => s + c.w, 0);
    list.forEach(c => {
      c.pct = total ? Math.round((100 * c.w) / total) : Math.round(100 / list.length);
      c.note = note(key, c.san);
    });
    return list.sort((a, b) => b.w - a.w);
  }
  function pick(key) {
    const list = candidates(key);
    if (!list.length) return null;
    const total = list.reduce((s, c) => s + c.w, 0);
    if (!total) return list[Math.floor(Math.random() * list.length)].san;
    let r = Math.random() * total;
    for (const c of list) { if ((r -= c.w) <= 0) return c.san; }
    return list[0].san;
  }
  const NOTES = {};
  for (const k of Object.keys(BOOK_NOTES)) NOTES[strip(k)] = BOOK_NOTES[k];
  function note(key, san) { return NOTES[(key ? key + ' ' : '') + strip(san)] || ''; }
  function name(key) {
    const parts = key ? key.split(' ') : [];
    for (let i = parts.length; i > 0; i--) {
      const k = parts.slice(0, i).join(' ');
      if (OPENING_NAMES[k]) return OPENING_NAMES[k];
    }
    return '';
  }
  return { keyOf, candidates, pick, note, name, strip, lines: ITALIAN_LINES };
})();

if (typeof module !== 'undefined') module.exports = { Book, ITALIAN_LINES, BOOK_NOTES };
