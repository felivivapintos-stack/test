/* O treinador: geometria do tabuleiro, explicação de erros e relatório final. */
const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const PIECE_NAME = { p: 'peão', n: 'cavalo', b: 'bispo', r: 'torre', q: 'dama', k: 'rei' };
const FEM = { r: true, q: true };
const art = t => (FEM[t] ? 'a' : 'o');
const teu = t => (FEM[t] ? 'a tua' : 'o teu');
const COLOR_NAME = { w: 'brancas', b: 'pretas' };

const Geo = {
  xy(sq) { return [sq.charCodeAt(0) - 97, +sq[1] - 1]; },
  sq(x, y) { return String.fromCharCode(97 + x) + (y + 1); },
  in(x, y) { return x >= 0 && x < 8 && y >= 0 && y < 8; },
  /* Casas atacadas pela peça em sq (ignora cravadas; para no primeiro obstáculo). */
  attacksFrom(g, sq) {
    const p = g.get(sq);
    if (!p) return [];
    const [x, y] = Geo.xy(sq);
    const out = [];
    const step = (dx, dy, slide) => {
      let cx = x + dx, cy = y + dy;
      while (Geo.in(cx, cy)) {
        const s = Geo.sq(cx, cy);
        out.push(s);
        if (!slide || g.get(s)) break;
        cx += dx; cy += dy;
      }
    };
    const D = [[1, 1], [1, -1], [-1, 1], [-1, -1]], O = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    switch (p.type) {
      case 'p': { const d = p.color === 'w' ? 1 : -1; [[1, d], [-1, d]].forEach(([dx, dy]) => step(dx, dy, false)); break; }
      case 'n': [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([dx, dy]) => step(dx, dy, false)); break;
      case 'b': D.forEach(([dx, dy]) => step(dx, dy, true)); break;
      case 'r': O.forEach(([dx, dy]) => step(dx, dy, true)); break;
      case 'q': D.concat(O).forEach(([dx, dy]) => step(dx, dy, true)); break;
      case 'k': D.concat(O).forEach(([dx, dy]) => step(dx, dy, false)); break;
    }
    return out;
  },
  pieces(g, color) {
    const out = [];
    for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
      const s = Geo.sq(x, y), p = g.get(s);
      if (p && (!color || p.color === color)) out.push({ sq: s, type: p.type, color: p.color });
    }
    return out;
  },
  attackers(g, target, color) {
    return Geo.pieces(g, color).filter(p => Geo.attacksFrom(g, p.sq).includes(target));
  },
  /* Peças de `color` em perigo: atacadas e indefesas, ou atacadas por peça de menor valor. */
  hanging(g, color) {
    const enemy = color === 'w' ? 'b' : 'w';
    return Geo.pieces(g, color).filter(p => p.type !== 'k').map(p => {
      const att = Geo.attackers(g, p.sq, enemy), def = Geo.attackers(g, p.sq, color);
      if (!att.length) return null;
      const minAtt = Math.min(...att.map(a => PIECE_VAL[a.type]));
      if (!def.length || minAtt < PIECE_VAL[p.type]) return { ...p, att, def };
      return null;
    }).filter(Boolean);
  },
};

/* ---------- Avaliação ---------- */
function winPct(cpWhite, color) {
  const cp = Math.max(-2000, Math.min(2000, color === 'w' ? cpWhite : -cpWhite));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}
function moveAccuracy(drop) {
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, drop)) - 3.1669));
}
function fmtEval(cpWhite) {
  if (Math.abs(cpWhite) >= 9000) {
    const n = Math.round((10000 - Math.abs(cpWhite)) / 10);
    return (cpWhite > 0 ? '+M' : '−M') + Math.max(1, n);
  }
  const v = cpWhite / 100;
  return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
}
const CLS = {
  book: { label: 'Teoria', sym: '📖', css: 'book' },
  best: { label: 'Melhor lance', sym: '★', css: 'best' },
  good: { label: 'Bom', sym: '✓', css: 'good' },
  inacc: { label: 'Imprecisão', sym: '?!', css: 'inacc' },
  mistake: { label: 'Erro', sym: '?', css: 'mistake' },
  blunder: { label: 'Erro grave', sym: '??', css: 'blunder' },
};
function classify(drop, isBest, isBook) {
  if (isBook) return 'book';
  if (drop >= 30) return 'blunder';
  if (drop >= 18) return 'mistake';
  if (drop >= 9) return 'inacc';
  if (isBest) return 'best';
  return 'good';
}

/* uci -> SAN numa posição */
function uciToSan(fen, uci) {
  if (!uci) return '';
  const g = new Chess(fen);
  const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
  return m ? m.san : uci;
}
function pvToSan(fen, pv, max) {
  const g = new Chess(fen);
  const out = [];
  for (const u of pv.slice(0, max || 6)) {
    const turn = g.turn(), num = g.history().length;
    const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' });
    if (!m) break;
    const fm = parseInt(g.fen().split(' ')[5], 10) - (turn === 'b' ? 1 : 0);
    out.push(turn === 'w' ? fm + '.' + m.san : (out.length === 0 ? fm + '...' + m.san : m.san));
    void num;
  }
  return out.join(' ');
}

/* ---------- Explicação de um lance do jogador ---------- */
function explainMove(rec, prevOpp) {
  const me = rec.color, opp = me === 'w' ? 'b' : 'w';
  const lines = [];
  const tags = [];
  const gBefore = new Chess(rec.fenBefore);
  const gAfter = new Chess(rec.fenAfter);
  const bad = rec.cls === 'inacc' || rec.cls === 'mistake' || rec.cls === 'blunder';

  if (rec.cls === 'book') {
    lines.push(rec.bookNote || 'Lance de teoria: é o que os jogadores de topo jogam aqui.');
    return { lines, tags };
  }

  if (bad) {
    const pov = v => (me === 'w' ? v : -v);
    lines.push(`Avaliação do teu lado: ${fmtEval(pov(rec.evalBefore))} → ${fmtEval(pov(rec.evalAfter))}. Perdeste ${Math.round(rec.drop)}% de probabilidade de ganhar.`);
    if (rec.bestSan && rec.bestSan !== rec.san)
      lines.push(`Melhor era <b>${rec.bestSan}</b>. Continuação: ${pvToSan(rec.fenBefore, rec.bestPv, 5)}.`);
  }

  // 1) Mate concedido
  if (rec.postMate != null && rec.postMate > 0) {
    lines.push(`Isto permite mate em ${rec.postMate}: ${pvToSan(rec.fenAfter, rec.postPv, rec.postMate * 2)}.`);
    tags.push('mate_allowed');
  }
  // 2) Resposta do adversário (refutação)
  if (bad && rec.postPv && rec.postPv.length) {
    const reply = rec.postPv[0];
    const gr = new Chess(rec.fenAfter);
    const m = gr.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] || 'q' });
    if (m) {
      let txt = `A resposta que deves temer é <b>${m.san}</b>`;
      if (m.captured) { txt += `, que captura ${teu(m.captured)} ${PIECE_NAME[m.captured]} em ${m.to}`; tags.push('lost_material'); }
      if (gr.in_check()) txt += (m.captured ? ' com xeque' : ', com xeque');
      // garfo / ataque duplo
      const targets = Geo.attacksFrom(gr, m.to).map(s => gr.get(s)).map((p, i) => p && p.color === me ? { p, s: Geo.attacksFrom(gr, m.to)[i] } : null)
        .filter(t => t && (t.p.type === 'k' || PIECE_VAL[t.p.type] > PIECE_VAL[m.piece] || !Geo.attackers(gr, t.s, me).length));
      if (targets.length >= 2) {
        txt += `. É um ataque duplo: ${targets.map(t => PIECE_NAME[t.p.type] + ' em ' + t.s).join(' e ')}`;
        tags.push('fork');
      }
      if (/x?f7|x?f2/.test(m.san) && /[NB]/.test(m.san[0]))
        lines.push('Clássico da Italiana: o ponto f7 (ou f2) é o alvo. Só o rei o defende, e é aí que o bispo de c4 e o cavalo de g5 batem.');
      lines.push(txt + '.');
    }
  }
  // 3) Peças penduradas depois do lance
  const hang = Geo.hanging(gAfter, me);
  if (bad && hang.length) {
    const h = hang.sort((a, b) => PIECE_VAL[b.type] - PIECE_VAL[a.type])[0];
    const by = h.att.map(a => PIECE_NAME[a.type] + ' ' + a.sq).join(', ');
    lines.push(`${teu(h.type)[0].toUpperCase() + teu(h.type).slice(1)} ${PIECE_NAME[h.type]} em ${h.sq} ficou em perigo: atacad${art(h.type)} por ${by}${h.def.length ? '' : ' e sem defesa'}. O scan antes de jogar existe para apanhar isto.`);
    tags.push('hanging');
  }
  // 4) Oportunidade perdida
  if (bad && rec.preMate != null && rec.preMate > 0) {
    lines.push(`Tinhas mate em ${rec.preMate} com ${pvToSan(rec.fenBefore, rec.bestPv, rec.preMate * 2)}.`);
    tags.push('missed_mate');
  } else if (bad && rec.bestSan && rec.bestSan.includes('x')) {
    const gb = new Chess(rec.fenBefore);
    const bm = gb.move(rec.bestSan);
    const recapture = bm && Geo.attackers(gb, bm.to, opp).length > 0;
    if (bm && bm.captured && PIECE_VAL[bm.captured] >= 3 && (!recapture || PIECE_VAL[bm.captured] > PIECE_VAL[bm.piece])) {
      lines.push(`Havia uma captura forte: ${rec.bestSan} ganha ${art(bm.captured)} ${PIECE_NAME[bm.captured]}.`);
      tags.push('missed_tactic');
    }
  }
  if (bad && prevOpp && prevOpp.drop >= 18) {
    lines.push(`O adversário tinha errado no lance anterior (${prevOpp.san}). Era a altura de castigar; deixaste passar.`);
    tags.push('missed_punish');
  }

  // 5) Princípios de abertura (só fora da teoria e nos primeiros 12 lances)
  const moveNo = rec.moveNo;
  if (!rec.inBook && moveNo <= 12) {
    const p = rec.piece;
    const castled = rec.san.startsWith('O-O');
    if (p === 'q' && moveNo <= 7 && !rec.captured) {
      lines.push('Princípio: não tires a dama cedo. Na Italiana ela fica bem em e2 ou b3 depois do desenvolvimento; antes disso é um alvo que te faz perder tempos.');
      tags.push('early_queen');
    }
    if (p === 'k' && !castled) {
      lines.push('Moveste o rei sem rocar. Perdeste o roque e o rei fica no centro, exatamente onde a Italiana quer abrir linhas.');
      tags.push('king_walk');
    }
    if (p === 'p' && rec.from[0] === 'f' && ((me === 'w' && rec.to === 'f3') || (me === 'b' && rec.to === 'f6'))) {
      lines.push(me === 'b'
        ? '...f6 enfraquece a diagonal a2-g8, precisamente a do bispo branco de c4. Nunca na Italiana sem um motivo concreto.'
        : 'f3 tira a casa natural ao cavalo e enfraquece a diagonal g1-a7, onde aponta o bispo preto de c5.');
      tags.push('f_pawn');
    }
    if (p === 'n' && /^[ah]/.test(rec.to)) {
      lines.push('Cavalo na borda controla metade das casas. Na Italiana os cavalos querem f3/c3 (ou f6/c6) e depois g3/g6 via d2-f1.');
      tags.push('rim_knight');
    }
    if (rec.movedTwice && !rec.captured && !castled) {
      lines.push('Moveste a mesma peça duas vezes ainda com peças por desenvolver. Cada tempo conta na abertura.');
      tags.push('tempo');
    }
  }
  if (rec.bookAlt && rec.bookAlt.length) {
    const alt = rec.bookAlt.slice(0, 3).map(c => `<b>${c.san}</b> (${c.pct}%)`).join(', ');
    lines.push(`Saíste da teoria. Os jogadores de topo jogam aqui ${alt}.${rec.bookAlt[0].note ? ' ' + rec.bookAlt[0].note : ''}`);
    tags.push('left_book');
  }
  if (!lines.length) {
    if (rec.cls === 'best') lines.push('O lance do motor. Exatamente o que um campeão jogaria.');
    else lines.push('Lance sólido. Mantém a avaliação.');
  }
  if (rec.thinkMs < 3000 && bad) { lines.push('Jogaste em menos de 3 segundos. A pressa custou-te caro.'); tags.push('hasty'); }
  return { lines, tags };
}

/* Fase da partida a partir da posição */
function phaseOf(rec) {
  if (rec.moveNo <= 12) return 'opening';
  const g = new Chess(rec.fenBefore);
  const mat = Geo.pieces(g).filter(p => p.type !== 'k' && p.type !== 'p').reduce((s, p) => s + PIECE_VAL[p.type], 0);
  return mat <= 26 ? 'endgame' : 'middlegame';
}

/* ---------- Relatório final ---------- */
function buildReport(S) {
  const mine = S.records.filter(r => r.color === S.userColor);
  const theirs = S.records.filter(r => r.color !== S.userColor);
  const acc = arr => arr.length ? arr.reduce((s, r) => s + r.acc, 0) / arr.length : 0;
  const count = c => mine.filter(r => r.cls === c).length;
  const accuracy = acc(mine);
  const oppAcc = acc(theirs);
  const phases = { opening: [], middlegame: [], endgame: [] };
  mine.forEach(r => phases[phaseOf(r)].push(r));
  const allTags = mine.flatMap(r => r.tags || []);
  const tagN = t => allTags.filter(x => x === t).length;
  const bookPlies = (() => { let n = 0; for (const r of S.records) { if (r.inBook) n++; else break; } return n; })();
  const firstUserDev = mine.find(r => !r.inBook);
  const avgThink = mine.length ? mine.reduce((s, r) => s + r.thinkMs, 0) / mine.length / 1000 : 0;
  const castledAt = mine.find(r => r.san.startsWith('O-O'));
  const key = mine.filter(r => ['blunder', 'mistake', 'inacc'].includes(r.cls)).sort((a, b) => b.drop - a.drop).slice(0, 3);
  const res = S.result;
  const won = res.winner === S.userColor, lost = res.winner && res.winner !== S.userColor;

  // Veredicto
  let verdict;
  if (accuracy >= 90) verdict = 'Partida de nível muito alto. Jogaste com a precisão de quem se prepara a sério. Agora o trabalho é manter isto quando a posição ficar desconfortável.';
  else if (accuracy >= 80) verdict = 'Boa partida, com momentos de verdadeira qualidade. Mas os campeões não se distinguem pelos bons lances; distinguem-se por não oferecerem nada. Ofereceste.';
  else if (accuracy >= 65) verdict = 'Partida irregular. Tens ideias, mas falta disciplina. Os erros que cometeste não são de conhecimento; são de atenção. E atenção treina-se.';
  else if (accuracy >= 45) verdict = 'Partida fraca. Não me interessa o resultado, interessa-me o processo, e o processo falhou: lances jogados sem verificar ameaças e peças largadas.';
  else verdict = 'Partida muito fraca. Vamos ser francos: assim não se evolui. Volta ao básico: antes de cada lance, pergunta o que o adversário ameaça.';
  if (won && accuracy < 65) verdict += ' Ganhaste, mas não te enganes: o adversário errou mais do que tu. Contra alguém forte, esta partida estava perdida.';
  if (lost && accuracy >= 80) verdict += ' Perdeste, mas o nível esteve lá. Uma ou duas decisões mudaram tudo. Estuda-as.';
  if (S.warnings === 0) verdict += ' Disciplina de scan perfeita: olhaste para todas as peças em todos os lances. É assim.';
  else if (S.warnings >= 3) verdict += ` E ${S.warnings} avisos por jogares sem olhar para todas as peças. Isso é inaceitável num jogador que quer evoluir.`;

  // Abertura
  let opening = `Abertura: <b>${S.openingName || 'fora da Italiana'}</b>. `;
  opening += `A partida esteve na teoria durante ${Math.ceil(bookPlies / 2)} lance(s). `;
  if (firstUserDev && firstUserDev.bookAlt && firstUserDev.bookAlt.length)
    opening += `Saíste do livro no lance ${firstUserDev.moveNo} com <b>${firstUserDev.san}</b>; a elite joga ${firstUserDev.bookAlt.slice(0, 2).map(c => '<b>' + c.san + '</b>').join(' ou ')}. `;
  const oA = acc(phases.opening);
  if (phases.opening.length) opening += `Precisão na abertura: ${Math.round(oA)}%. `;
  if (oA >= 85) opening += 'Saíste da abertura com uma posição saudável. É isso que se pede.';
  else if (oA >= 65) opening += 'Algumas imprecisões cedo. Na Italiana, a ordem dos lances (c3 antes de d4, h3 antes de Nbd2-f1-g3) importa muito.';
  else opening += 'A abertura correu mal. Antes de mais partidas, estuda a linha principal até ao lance 12 e percebe o porquê de cada lance.';
  if (!castledAt && mine.length >= 10) opening += ' E não rocaste. Na Italiana, o centro abre-se depressa; rei no centro é rei em perigo.';
  else if (castledAt && castledAt.moveNo > 10) opening += ` Rocaste tarde (lance ${castledAt.moveNo}).`;

  // Fases
  const phaseRows = [['Abertura', phases.opening], ['Meio-jogo', phases.middlegame], ['Final', phases.endgame]]
    .filter(([, a]) => a.length).map(([n, a]) => ({ n, acc: acc(a), err: a.filter(r => ['blunder', 'mistake'].includes(r.cls)).length, moves: a.length }));

  // Padrões
  const patterns = [];
  if (tagN('hanging')) patterns.push(`Deixaste peças em perigo ${tagN('hanging')} vez(es). É o erro mais caro do xadrez e o mais fácil de evitar.`);
  if (tagN('fork')) patterns.push(`Caíste em ${tagN('fork')} ataque(s) duplo(s). Antes de jogar, procura as casas de onde o cavalo ou a dama adversária atacam duas peças.`);
  if (tagN('missed_tactic') + tagN('missed_mate')) patterns.push(`Perdeste ${tagN('missed_tactic') + tagN('missed_mate')} oportunidade(s) tática(s). Um campeão procura sempre xeques, capturas e ameaças, por esta ordem.`);
  if (tagN('missed_punish')) patterns.push(`O adversário errou e não castigaste ${tagN('missed_punish')} vez(es). Depois de cada lance dele, pergunta: o que mudou? O que ficou fraco?`);
  if (tagN('hasty')) patterns.push(`${tagN('hasty')} erro(s) jogado(s) em menos de 3 segundos. A pressa é inimiga.`);
  if (tagN('early_queen') + tagN('king_walk') + tagN('f_pawn') + tagN('rim_knight') + tagN('tempo')) patterns.push('Violaste princípios de abertura (dama cedo, rei a andar, peões f, cavalos na borda ou tempos perdidos).');
  if (tagN('mate_allowed')) patterns.push('Permitiste um mate. Verifica sempre a segurança do teu rei antes de atacar.');
  const oppErrs = theirs.filter(r => ['blunder', 'mistake'].includes(r.cls)).length;
  if (!patterns.length) patterns.push('Sem padrões de erro repetidos. Excelente consistência.');

  // Plano de treino
  const plan = [];
  if (tagN('hanging') || S.warnings) plan.push(['Rotina de verificação', 'Antes de cada lance: (1) o que ameaça o adversário? (2) que peças minhas estão indefesas? (3) xeques, capturas e ameaças, minhas e dele. Faz isto mesmo em partidas rápidas até ser automático.']);
  if (tagN('fork') || tagN('missed_tactic') || tagN('missed_mate')) plan.push(['Tática diária', '20 problemas por dia de garfos, cravadas e ataques descobertos. Resolve sem mexer as peças e só confirma no fim.']);
  if (phases.opening.length && oA < 80) plan.push(['Teoria da Italiana', 'Joga 10 partidas seguidas só com o Giuoco Pianissimo (4.c3 Nf6 5.d3). Depois de cada uma, compara com as linhas do livro deste treinador.']);
  if (tagN('missed_punish')) plan.push(['Castigar erros', 'Depois de cada lance adversário, escreve mentalmente o que ele deixou de controlar. Analisa partidas de Kasparov com o Gambito Evans para ver como se pune a lentidão.']);
  if (phases.endgame.length && acc(phases.endgame) < 75) plan.push(['Finais', 'Estuda finais de torres (Lucena e Philidor) e finais de peões com oposição. Um campeão converte vantagens no final.']);
  if (tagN('hasty')) plan.push(['Ritmo', 'Em posições críticas (capturas, xeques, rutura central) para pelo menos 30 segundos. Usa as mãos debaixo da mesa até teres decidido.']);
  plan.push(['Planos-tipo da Italiana', 'Com brancas: c3 e d3, depois Re1, h3, Nbd2-f1-g3 e a4. A rutura d4 só quando estiver preparada. Com pretas: ...a6/...Ba7, ...h6 para evitar Bg5/Ng5 e a rutura ...d5 no momento certo.']);

  // Histórico
  const hist = loadHistory();
  const prev = hist.slice(-6, -1);
  const trend = prev.length ? accuracy - prev.reduce((s, h) => s + h.accuracy, 0) / prev.length : null;

  const resultText = res.winner ? (won ? 'Vitória' : 'Derrota') : 'Empate';
  return {
    resultText, reason: res.reason, accuracy, oppAcc, verdict, opening, phaseRows, patterns, plan, key,
    counts: { blunder: count('blunder'), mistake: count('mistake'), inacc: count('inacc'), best: count('best'), book: count('book'), good: count('good') },
    warnings: S.warnings, discipline: S.discipline, avgThink, oppErrs, trend, hist,
  };
}

/* ---------- Histórico (localStorage, opcional) ---------- */
const HIST_KEY = 'treinador-italiana-historico';
function loadHistory() { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (_) { return []; } }
function saveHistory(entry) {
  try { const h = loadHistory(); h.push(entry); localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(-50))); } catch (_) {}
}
