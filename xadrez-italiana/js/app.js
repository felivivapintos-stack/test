/* Treinador da Italiana: fluxo da partida, scan obrigatório, penalizações e interface. */
(() => {
  const $ = id => document.getElementById(id);
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const VS = '︎';

  let engine = null;
  const enginePromise = loadEngine(msg => { $('engineStatus').textContent = msg; }).then(e => {
    engine = e;
    $('engineStatus').textContent = 'Motor: ' + e.name + (e.strong ? '' : ' (o Stockfish não carregou; análise mais fraca)');
    return e;
  });

  const S = {
    game: new Chess(), userColor: 'w', level: 11, movetime: 1000,
    scanned: false, scanning: false, scanCursor: null, scanFlags: { danger: [], prey: [] },
    records: [], inspected: new Set(), warnings: 0, discipline: 100, lockUntil: 0,
    busy: false, over: true, selected: null, targets: [], turnStart: 0, turnWarnings: 0,
    pre: null, lastPost: null, openingName: '', result: null, hoverSq: null, dwellTimer: null,
  };

  /* ---------------- Motor (avaliações do ponto de vista das brancas) ---------------- */
  function terminal(g) {
    if (g.in_checkmate()) return { cp: g.turn() === 'w' ? -10000 : 10000, mate: 0, best: null, pv: [] };
    return { cp: 0, mate: null, best: null, pv: [] };
  }
  async function analyzeW(fen, opts) {
    const g = new Chess(fen);
    if (g.game_over()) return terminal(g);
    const e = engine || await enginePromise;
    const r = await e.analyze(fen, opts || { movetime: S.movetime, skill: 20 });
    const sign = g.turn() === 'w' ? 1 : -1;
    return { cp: r.cp * sign, mate: r.mate, best: r.best, pv: r.pv };
  }

  /* ---------------- Tabuleiro ---------------- */
  const boardEl = $('board');
  function orientation() { return S.userColor; }
  function squareList() {
    const out = [];
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const file = orientation() === 'w' ? col : 7 - col;
      const rank = orientation() === 'w' ? 7 - row : row;
      out.push(String.fromCharCode(97 + file) + (rank + 1));
    }
    return out;
  }
  function render() {
    const g = S.game;
    const hist = g.history({ verbose: true });
    const last = hist[hist.length - 1];
    const sqs = squareList();
    const checkSq = g.in_check() ? Geo.pieces(g, g.turn()).find(p => p.type === 'k').sq : null;
    const attacked = S.hoverSq && g.get(S.hoverSq) ? Geo.attacksFrom(g, S.hoverSq) : [];
    boardEl.innerHTML = sqs.map((sq, i) => {
      const [x, y] = Geo.xy(sq);
      const light = (x + y) % 2 === 1;
      const p = g.get(sq);
      const cls = ['sq', light ? 'l' : 'd'];
      if (last && (last.from === sq || last.to === sq)) cls.push('last');
      if (S.selected === sq) cls.push('sel');
      if (checkSq === sq) cls.push('check');
      if (S.targets.includes(sq)) cls.push('target', p ? 'has' : '');
      if (attacked.includes(sq)) cls.push('att');
      if (S.missingFlash && S.missingFlash.includes(sq)) cls.push('missing');
      if (S.scanned && S.scanFlags.danger.includes(sq)) cls.push('danger');
      if (S.scanned && S.scanFlags.prey.includes(sq)) cls.push('prey');
      if (S.scanCursor === sq) cls.push('scanning');
      const row = Math.floor(i / 8), col = i % 8;
      let inner = '';
      if (col === 0) inner += `<span class="coord r">${sq[1]}</span>`;
      if (row === 7) inner += `<span class="coord f">${sq[0]}</span>`;
      if (p) inner += `<span class="pc ${p.color}">${GLYPH[p.type]}${VS}</span>`;
      if (p && S.inspected.has(sq) && isUserTurn() && !S.scanned) inner += '<span class="seen"></span>';
      return `<div class="${cls.join(' ')}" data-sq="${sq}">${inner}</div>`;
    }).join('');
    renderScan();
  }
  function isUserTurn() { return !S.over && !S.busy && S.game.turn() === S.userColor; }
  function allPieceSquares() { return Geo.pieces(S.game).map(p => p.sq); }
  function renderScan() {
    const all = allPieceSquares();
    const seen = isUserTurn() ? all.filter(sq => S.inspected.has(sq)).length : 0;
    $('scanCount').textContent = `${seen}/${all.length}`;
    const m = $('meter');
    m.firstElementChild.style.width = (all.length ? (100 * seen) / all.length : 0) + '%';
    m.classList.toggle('full', S.scanned && isUserTurn());
    const btn = $('scanBtn');
    btn.disabled = !isUserTurn() || S.scanning || S.scanned;
    btn.textContent = S.scanned && isUserTurn() ? 'Scan feito ✓' : S.scanning ? 'A fazer scan…' : 'Fazer scan';
  }
  function squareFromEvent(e) {
    const r = boardEl.getBoundingClientRect();
    const col = Math.floor(((e.clientX - r.left) / r.width) * 8);
    const row = Math.floor(((e.clientY - r.top) / r.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return squareList()[row * 8 + col];
  }

  /* ---------------- Scan (inspeção obrigatória) ---------------- */
  function describePiece(sq) {
    const g = S.game, p = g.get(sq);
    if (!p) return '';
    const enemy = p.color === 'w' ? 'b' : 'w';
    const att = Geo.attacksFrom(g, sq);
    const hits = att.filter(s => g.get(s) && g.get(s).color === enemy).map(s => PIECE_NAME[g.get(s).type] + ' ' + s);
    const def = Geo.attackers(g, sq, p.color).map(a => PIECE_NAME[a.type] + ' ' + a.sq);
    const by = Geo.attackers(g, sq, enemy).map(a => PIECE_NAME[a.type] + ' ' + a.sq);
    const nm = PIECE_NAME[p.type];
    const color = p.color === 'w' ? (FEM[p.type] ? 'branca' : 'branco') : (FEM[p.type] ? 'preta' : 'preto');
    const mine = p.color === S.userColor;
    let danger = '';
    if (p.type !== 'k' && by.length && (!def.length || Math.min(...Geo.attackers(g, sq, enemy).map(a => PIECE_VAL[a.type])) < PIECE_VAL[p.type]))
      danger = mine ? ' · <b style="color:var(--blunder)">EM PERIGO</b>' : ' · <b style="color:var(--ok)">ALVO POSSÍVEL</b>';
    return `<b>${nm[0].toUpperCase() + nm.slice(1)} ${color} em ${sq}</b>${danger}<br>` +
      `Ataca: ${hits.length ? hits.join(', ') : 'nenhuma peça'} · Defendid${art(p.type)} por: ${def.length ? def.join(', ') : '—'} · Atacad${art(p.type)} por: ${by.length ? by.join(', ') : '—'}`;
  }
  function inspect(sq) {
    if (!S.game.get(sq)) return;
    $('pieceInfo').innerHTML = describePiece(sq);
  }

  /* Um único scan por lance: percorre todas as peças e resume o perigo. */
  async function doScan() {
    if (!isUserTurn() || S.scanning || S.scanned) return;
    S.scanning = true;
    S.missingFlash = null;
    const me = S.userColor, opp = me === 'w' ? 'b' : 'w';
    // ordem: primeiro as peças do adversário (ameaças), depois as tuas
    const order = Geo.pieces(S.game, opp).concat(Geo.pieces(S.game, me)).map(p => p.sq);
    const step = Math.max(25, Math.round(1200 / order.length));
    for (const sq of order) {
      if (!S.scanning) return;
      S.scanCursor = sq;
      S.inspected.add(sq);
      render();
      await sleep(step);
    }
    S.scanCursor = null;
    S.scanning = false;
    S.scanned = true;
    const g = S.game;
    const danger = Geo.hanging(g, me);
    const prey = Geo.hanging(g, opp);
    S.scanFlags = { danger: danger.map(p => p.sq), prey: prey.map(p => p.sq) };
    const list = (arr, who) => arr.map(p => `${PIECE_NAME[p.type]} ${p.sq} (atacad${art(p.type)} por ${p.att.map(a => PIECE_NAME[a.type] + ' ' + a.sq).join(', ')}${p.def.length ? '' : ', sem defesa'})`).join('; ');
    const inCheck = g.in_check();
    const checks = (() => { // xeques que o adversário teria se fosse a vez dele
      const parts = g.fen().split(' '); parts[1] = opp; parts[3] = '-';
      const t = new Chess(parts.join(' '));
      return t.moves({ verbose: true }).filter(m => m.san.includes('+')).map(m => m.san);
    })();
    let html = '<b>Resultado do scan</b><br>';
    html += inCheck ? '<b style="color:var(--blunder)">Estás em xeque.</b><br>' : '';
    html += danger.length ? `<span style="color:var(--blunder)">⚠ Tuas peças em perigo:</span> ${list(danger)}<br>` : 'Nenhuma peça tua em perigo imediato.<br>';
    html += prey.length ? `<span style="color:var(--ok)">◎ Alvos no adversário:</span> ${list(prey)}<br>` : 'Nenhuma peça do adversário pendurada.<br>';
    html += checks.length ? `Xeques que o adversário tem disponíveis: ${checks.slice(0, 6).join(', ')}. Pensa se o teu lance os torna perigosos.` : 'O adversário não tem xeques disponíveis.';
    $('pieceInfo').innerHTML = html;
    setStatus('Scan feito. Agora pensa e joga. O scan não vê tudo: verifica também o que o teu lance muda.');
    render();
  }

  function penalize() {
    S.warnings++; S.turnWarnings++;
    S.discipline = Math.max(0, S.discipline - 10);
    S.missingFlash = allPieceSquares();
    setTimeout(() => { S.missingFlash = null; render(); }, 1800);
    let msg = `Aviso n.º ${S.warnings}: tentaste jogar sem fazer o scan. Um campeão olha para o tabuleiro inteiro antes de tocar numa peça. −10 de disciplina.`;
    if (S.warnings >= 3) {
      const secs = Math.min(30, 5 * (S.warnings - 2));
      S.lockUntil = Date.now() + secs * 1000;
      msg += ` Tabuleiro bloqueado ${secs} s.`;
      runLock();
    }
    toast(msg, 5000);
    const fb = $('feedback');
    fb.insertAdjacentHTML('afterbegin', `<div class="fb warn"><b>Aviso ${S.warnings}</b> · ${msg}</div>`);
    updateStats();
    render();
  }
  function runLock() {
    const lock = $('lock');
    lock.hidden = false;
    const tick = () => {
      const left = Math.ceil((S.lockUntil - Date.now()) / 1000);
      if (left <= 0) { lock.hidden = true; return; }
      $('lockSecs').textContent = left;
      setTimeout(tick, 250);
    };
    tick();
  }

  /* ---------------- Interação com o rato / toque ---------------- */
  let drag = null;
  boardEl.addEventListener('pointermove', e => {
    const sq = squareFromEvent(e);
    if (drag && drag.ghost) { drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px'; }
    if (drag && !drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) startGhost(e);
    if (e.pointerType === 'mouse' && sq !== S.hoverSq) hover(sq);
  });
  boardEl.addEventListener('pointerleave', () => { if (!drag) hover(null); });
  function hover(sq) {
    clearTimeout(S.dwellTimer);
    S.hoverSq = sq && S.game.get(sq) ? sq : null;
    render();
    if (S.hoverSq) {
      const target = S.hoverSq;
      S.dwellTimer = setTimeout(() => { if (S.hoverSq === target) inspect(target); }, 120);
    }
  }
  boardEl.addEventListener('pointerdown', e => {
    const sq = squareFromEvent(e);
    if (!sq) return;
    const p = S.game.get(sq);
    if (e.pointerType !== 'mouse' && p) inspect(sq);
    if (!isUserTurn()) return;
    if (S.selected && S.targets.includes(sq)) { attemptMove(S.selected, sq); return; }
    if (p && p.color === S.userColor) {
      select(sq);
      drag = { from: sq, x: e.clientX, y: e.clientY, ghost: null };
      boardEl.setPointerCapture(e.pointerId);
    } else {
      select(null);
    }
  });
  boardEl.addEventListener('pointerup', e => {
    if (!drag) return;
    const sq = squareFromEvent(e);
    const d = drag; drag = null;
    if (d.ghost) d.ghost.remove();
    render();
    if (sq && sq !== d.from && S.targets.includes(sq)) attemptMove(d.from, sq);
  });
  function startGhost(e) {
    const p = S.game.get(drag.from);
    if (!p) return;
    const g = document.createElement('span');
    g.className = 'pc ghost ' + p.color;
    g.textContent = GLYPH[p.type] + VS;
    g.style.fontSize = boardEl.getBoundingClientRect().width * 0.1 + 'px';
    g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px';
    document.body.appendChild(g);
    drag.ghost = g;
  }
  function select(sq) {
    S.selected = sq;
    S.targets = sq ? S.game.moves({ square: sq, verbose: true }).map(m => m.to) : [];
    render();
  }

  /* ---------------- Fluxo da partida ---------------- */
  function setStatus(t) { $('statusLine').textContent = t; }
  function updateStats() {
    $('warnCount').textContent = S.warnings;
    $('warnCount').classList.toggle('bad', S.warnings > 0);
    $('discipline').textContent = S.discipline;
    $('discipline').classList.toggle('bad', S.discipline < 70);
    const errs = S.records.filter(r => r.color === S.userColor && ['mistake', 'blunder'].includes(r.cls)).length;
    $('errCount').textContent = errs;
    $('errCount').classList.toggle('bad', errs > 0);
    const key = Book.keyOf(S.game.history());
    const nm = Book.name(key);
    if (nm) S.openingName = nm;
    $('openingName').textContent = S.openingName || (S.records.length ? 'Fora da Italiana' : 'Abertura Italiana');
    const mat = Geo.pieces(S.game).reduce((s, p) => s + (p.type === 'k' ? 0 : (p.color === S.userColor ? 1 : -1) * PIECE_VAL[p.type]), 0);
    $('botInfo').textContent = mat > 0 ? '+' + mat : '';
    $('topInfo').textContent = mat < 0 ? '+' + -mat : '';
  }

  function startGame(opts) {
    Object.assign(S, {
      game: new Chess(), userColor: opts.color, level: opts.level, movetime: opts.movetime,
      records: [], inspected: new Set(), warnings: 0, discipline: 100, lockUntil: 0, busy: false, over: false,
      selected: null, targets: [], pre: null, lastPost: null, openingName: '', result: null, missingFlash: null,
    });
    $('topName').textContent = 'Adversário (' + COLOR_NAME[S.userColor === 'w' ? 'b' : 'w'] + ')';
    $('botName').textContent = 'Tu (' + COLOR_NAME[S.userColor] + ')';
    $('feedback').innerHTML = '<p class="rule">Aqui aparece a análise de cada lance teu.</p>';
    $('masters').innerHTML = '<p class="rule">Comentários de teoria aparecem enquanto a partida estiver no livro.</p>';
    $('resignBtn').disabled = false; $('pgnBtn').disabled = false;
    $('lock').hidden = true;
    updateStats(); renderMoves(); render();
    if (S.userColor === 'w') beginUserTurn(); else opponentMove();
  }

  function beginUserTurn() {
    S.busy = false;
    S.inspected = new Set();
    S.missingFlash = null;
    S.scanned = false; S.scanning = false; S.scanCursor = null;
    S.scanFlags = { danger: [], prey: [] };
    $('pieceInfo').textContent = 'Carrega em «Fazer scan» (ou tecla S) antes de jogar. Passa o rato numa peça para ver os detalhes dela.';
    S.turnStart = Date.now();
    S.turnWarnings = 0;
    const fen = S.game.fen();
    S.pre = analyzeW(fen);
    const prevOpp = S.records[S.records.length - 1];
    if (prevOpp && prevOpp.color !== S.userColor) S.pre.then(pre => finishOppRecord(prevOpp, pre));
    setStatus('A tua vez. Primeiro o scan, depois o lance.');
    render();
  }

  function attemptMove(from, to) {
    if (!isUserTurn()) return;
    if (Date.now() < S.lockUntil) { toast('Ainda estás penalizado. Aproveita para fazer o scan e pensar.'); return; }
    if (!S.scanned) { select(null); penalize(); return; }
    const fenBefore = S.game.fen();
    const keyBefore = Book.keyOf(S.game.history());
    const m = S.game.move({ from, to, promotion: 'q' });
    select(null);
    if (!m) return;
    afterUserMove(m, fenBefore, keyBefore);
  }

  function undevelopedMinors(fen, color) {
    const g = new Chess(fen);
    const home = color === 'w' ? { b1: 'n', g1: 'n', c1: 'b', f1: 'b' } : { b8: 'n', g8: 'n', c8: 'b', f8: 'b' };
    return Object.entries(home).filter(([sq, t]) => { const p = g.get(sq); return p && p.type === t && p.color === color; }).length;
  }

  async function afterUserMove(m, fenBefore, keyBefore) {
    S.busy = true;
    S.scanned = false;
    S.hoverSq = null;
    render();
    setStatus('O treinador está a analisar o teu lance…');
    const thinkMs = Date.now() - S.turnStart;
    const fenAfter = S.game.fen();
    const pre = await S.pre;
    const post = await analyzeW(fenAfter);
    S.lastPost = post;
    const me = S.userColor;
    const uci = m.from + m.to + (m.promotion || '');
    const cands = Book.candidates(keyBefore);
    const cand = cands.find(c => c.san === Book.strip(m.san));
    const inBook = !!(cand && cand.w > 0);
    const isBest = pre.best === uci;
    const drop = isBest ? 0 : Math.max(0, winPct(pre.cp, me) - winPct(post.cp, me));
    const moveNo = parseInt(fenBefore.split(' ')[5], 10);
    const rec = {
      color: me, san: m.san, uci, from: m.from, to: m.to, piece: m.piece, captured: m.captured,
      fenBefore, fenAfter, moveNo, evalBefore: pre.cp, evalAfter: post.cp, drop, inBook,
      bookNote: cand ? cand.note : '', bookAlt: !inBook && cands.length ? cands.filter(c => c.w > 0) : null,
      bestSan: uciToSan(fenBefore, pre.best), bestPv: pre.pv, postPv: post.pv,
      preMate: pre.mate > 0 ? pre.mate : null, postMate: post.mate > 0 ? post.mate : null,
      thinkMs, warnings: S.turnWarnings,
      movedTwice: S.records.some(r => r.color === me && r.to === m.from) && undevelopedMinors(fenBefore, me) >= 2,
    };
    if (rec.bookAlt && !rec.bookAlt.length) rec.bookAlt = null;
    rec.cls = classify(drop, isBest, inBook);
    rec.acc = inBook ? 100 : moveAccuracy(drop);
    const prevOpp = [...S.records].reverse().find(r => r.color !== me);
    const ex = explainMove(rec, prevOpp);
    rec.lines = ex.lines; rec.tags = ex.tags;
    if (cand && cand.w === 0 && cand.note) rec.lines.unshift(cand.note);
    S.records.push(rec);
    showFeedback(rec);
    renderMoves(); updateStats(); render();
    if (S.game.game_over()) return endGame();
    opponentMove();
  }

  function finishOppRecord(rec, pre) {
    if (rec.done) return;
    const opp = rec.color;
    rec.evalAfter = pre.cp;
    rec.drop = Math.max(0, winPct(rec.evalBefore, opp) - winPct(pre.cp, opp));
    rec.cls = classify(rec.drop, false, rec.inBook);
    rec.acc = rec.inBook ? 100 : moveAccuracy(rec.drop);
    rec.done = true;
    renderMoves();
  }

  async function opponentMove() {
    S.busy = true;
    render();
    setStatus('O adversário está a pensar…');
    const fenBefore = S.game.fen();
    const key = Book.keyOf(S.game.history());
    const cands = Book.candidates(key);
    if (!S.lastPost) S.lastPost = await analyzeW(fenBefore);
    const evalBefore = S.lastPost.cp;
    let move = null, inBook = false;
    const bookSan = cands.length ? Book.pick(key) : null;
    if (bookSan) {
      move = S.game.moves({ verbose: true }).find(m => Book.strip(m.san) === bookSan);
      inBook = !!move && (cands.find(c => c.san === bookSan) || {}).w > 0;
      await sleep(450);
    }
    if (!move) {
      const e = engine || await enginePromise;
      const r = await e.analyze(fenBefore, { movetime: Math.min(S.movetime, 900), skill: S.level });
      const best = r.best;
      move = best && S.game.moves({ verbose: true }).find(m => m.from === best.slice(0, 2) && m.to === best.slice(2, 4) && (!m.promotion || m.promotion === (best[4] || 'q')));
      if (!move) move = S.game.moves({ verbose: true })[0];
    }
    const m = S.game.move(move);
    const rec = {
      color: S.game.turn() === 'w' ? 'b' : 'w', san: m.san, from: m.from, to: m.to, piece: m.piece, captured: m.captured,
      fenBefore, fenAfter: S.game.fen(), moveNo: parseInt(fenBefore.split(' ')[5], 10),
      evalBefore, evalAfter: evalBefore, drop: 0, inBook, bookNote: Book.note(key, m.san), cls: inBook ? 'book' : 'good', acc: 100, tags: [],
    };
    S.records.push(rec);
    S.lastPost = null;
    showMasters(key, cands, m.san, rec);
    renderMoves(); updateStats();
    if (S.game.game_over()) { finishOppRecord(rec, terminal(S.game)); return endGame(); }
    beginUserTurn();
  }

  function endGame(resigned) {
    const g = S.game;
    let winner = null, reason = '';
    if (resigned) { winner = S.userColor === 'w' ? 'b' : 'w'; reason = 'desistência'; }
    else if (g.in_checkmate()) { winner = g.turn() === 'w' ? 'b' : 'w'; reason = 'xeque-mate'; }
    else if (g.in_stalemate()) reason = 'afogamento';
    else if (g.in_threefold_repetition()) reason = 'repetição tripla';
    else if (g.insufficient_material()) reason = 'material insuficiente';
    else reason = 'regra dos 50 lances';
    S.result = { winner, reason };
    S.over = true; S.busy = false;
    $('resignBtn').disabled = true;
    setStatus('Partida terminada (' + reason + ').');
    render();
    const rep = buildReport(S);
    saveHistory({ date: new Date().toISOString(), color: S.userColor, result: rep.resultText, accuracy: Math.round(rep.accuracy), warnings: S.warnings, opening: S.openingName });
    setTimeout(() => showReport(buildReport(S)), 700);
  }

  /* ---------------- Painéis ---------------- */
  function feedbackHtml(rec) {
    const c = CLS[rec.cls];
    const num = rec.moveNo + (rec.color === 'w' ? '.' : '...');
    const extra = rec.warnings ? ` · <span style="color:var(--blunder)">${rec.warnings} aviso(s) de scan</span>` : '';
    return `<div class="fb ${c.css}"><div class="head"><span class="san">${num}${rec.san}</span><span class="pill ${c.css}">${c.label}</span>` +
      `<span class="rule">${(rec.thinkMs / 1000).toFixed(1)} s${extra}</span></div><ul>${(rec.lines || []).map(l => `<li>${l}</li>`).join('')}</ul></div>`;
  }
  function showFeedback(rec) {
    $('feedback').innerHTML = feedbackHtml(rec);
    if (['blunder', 'mistake'].includes(rec.cls)) toast(`${CLS[rec.cls].label}: ${rec.san}. Não há volta atrás. Joga com as consequências.`, 4000);
  }
  function showMasters(key, cands, playedSan, rec) {
    const el = $('masters');
    if (!cands.length) {
      if (rec.inBook === false && S.records.length < 30)
        el.innerHTML = '<p class="rule">A partida já saiu do livro. O adversário joga agora com o motor.</p>';
      return;
    }
    const played = Book.strip(playedSan);
    el.innerHTML = `<p class="rule">Na elite, nesta posição, joga-se:</p>` + cands.filter(c => c.w > 0).slice(0, 5).map(c =>
      `<div class="cand"><span class="mono" style="min-width:56px;font-weight:${c.san === played ? 700 : 400}">${c.san}${c.san === played ? ' ◂' : ''}</span>` +
      `<span class="bar"><i style="width:${c.pct}%"></i></span><span class="mono rule">${c.pct}%</span></div>`).join('') +
      (rec.bookNote ? `<p><b>${playedSan}</b>: ${rec.bookNote}</p>` : '') +
      (cands.find(c => c.san === played) ? `<p class="rule">Linha: ${cands.find(c => c.san === played).lines.slice(0, 2).join(' · ')}</p>` : '');
  }
  function renderMoves() {
    const el = $('moves');
    let html = '';
    const recs = S.records;
    const startBlack = recs.length && recs[0].color === 'b';
    let i = 0, n = 1;
    const cell = (r, idx) => r ? `<button data-i="${idx}" class="c-${r.cls}">${r.san}${r.cls && CLS[r.cls] && ['inacc', 'mistake', 'blunder'].includes(r.cls) ? CLS[r.cls].sym : ''}</button>` : '<span></span>';
    if (startBlack) { html += `<span class="n">1.</span><span>…</span>${cell(recs[0], 0)}`; i = 1; n = 2; }
    for (; i < recs.length; i += 2, n++) html += `<span class="n">${n}.</span>${cell(recs[i], i)}${cell(recs[i + 1], i + 1)}`;
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }
  $('moves').addEventListener('click', e => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    const r = S.records[+b.dataset.i];
    if (r.color === S.userColor && r.lines) $('feedback').innerHTML = feedbackHtml(r);
    else $('feedback').innerHTML = `<div class="fb ${CLS[r.cls].css}"><div class="head"><span class="san">${r.moveNo}${r.color === 'w' ? '.' : '...'}${r.san}</span><span class="pill ${CLS[r.cls].css}">${CLS[r.cls].label}</span><span class="rule">adversário</span></div><ul><li>${r.bookNote || (r.done ? `Avaliação (brancas): ${fmtEval(r.evalBefore)} → ${fmtEval(r.evalAfter)}.` : 'Lance do adversário.')}</li></ul></div>`;
  });

  function showReport(R) {
    const el = $('report');
    const pct = v => Math.round(v) + '%';
    const trend = R.trend == null ? '' : ` · ${R.trend >= 0 ? '+' : ''}${Math.round(R.trend)} pontos face à tua média recente`;
    el.innerHTML = `
      <div class="label">Análise do treinador</div>
      <h2>${R.resultText} por ${R.reason}</h2>
      <div class="big"><span class="acc mono">${pct(R.accuracy)}</span><span>de precisão${trend}<br><span class="rule">Adversário: ${pct(R.oppAcc)} · tempo médio por lance: ${R.avgThink.toFixed(1)} s</span></span></div>
      <div class="counts">
        <span class="pill book">${R.counts.book} teoria</span><span class="pill best">${R.counts.best} melhores</span><span class="pill good">${R.counts.good} bons</span>
        <span class="pill inacc">${R.counts.inacc} imprecisões</span><span class="pill mistake">${R.counts.mistake} erros</span><span class="pill blunder">${R.counts.blunder} erros graves</span>
      </div>
      <section><h3>Veredicto</h3><p class="verdict">${R.verdict}</p></section>
      <section><h3>A abertura</h3><p>${R.opening}</p></section>
      ${R.key.length ? `<section><h3>Momentos críticos</h3>${R.key.map(r => `<div class="moment ${r.cls}"><b class="mono">${r.moveNo}${r.color === 'w' ? '.' : '...'}${r.san}</b> <span class="pill ${CLS[r.cls].css}">${CLS[r.cls].label}</span><ul>${r.lines.slice(0, 4).map(l => `<li>${l}</li>`).join('')}</ul></div>`).join('')}</section>` : ''}
      <section><h3>Precisão por fase</h3><div class="tablewrap"><table><tr><th>Fase</th><th>Lances</th><th>Precisão</th><th>Erros</th></tr>${R.phaseRows.map(p => `<tr><td>${p.n}</td><td class="mono">${p.moves}</td><td class="mono">${pct(p.acc)}</td><td class="mono">${p.err}</td></tr>`).join('')}</table></div></section>
      <section><h3>Disciplina de scan</h3><p>${R.warnings ? `${R.warnings} aviso(s) por tentares jogar sem olhar para todas as peças. Pontuação de disciplina: <b>${R.discipline}/100</b>. ` : 'Zero avisos. Pontuação de disciplina: <b>100/100</b>. '}O scan não é burocracia: a maioria dos erros graves acontece em peças para as quais não olhaste.</p></section>
      <section><h3>Padrões que vi</h3><ul>${R.patterns.map(p => `<li>${p}</li>`).join('')}</ul>${R.oppErrs ? `<p class="rule">O adversário cometeu ${R.oppErrs} erro(s) relevante(s).</p>` : ''}</section>
      <section><h3>Plano de treino</h3><ol>${R.plan.map(([t, d]) => `<li><b>${t}.</b> ${d}</li>`).join('')}</ol></section>
      ${R.hist.length > 1 ? `<section><h3>Últimas partidas</h3><div class="tablewrap"><table><tr><th>Data</th><th>Cor</th><th>Resultado</th><th>Precisão</th><th>Avisos</th></tr>${R.hist.slice(-6).reverse().map(h => `<tr><td>${new Date(h.date).toLocaleDateString('pt-PT')}</td><td>${h.color === 'w' ? 'Brancas' : 'Pretas'}</td><td>${h.result}</td><td class="mono">${h.accuracy}%</td><td class="mono">${h.warnings}</td></tr>`).join('')}</table></div></section>` : ''}
      <div class="controls"><button class="btn primary" id="againBtn">Nova partida</button><button class="btn" id="closeRep">Ver o tabuleiro</button></div>`;
    $('reportOverlay').hidden = false;
    $('againBtn').onclick = () => { $('reportOverlay').hidden = true; $('setup').hidden = false; };
    $('closeRep').onclick = () => { $('reportOverlay').hidden = true; };
  }

  /* ---------------- Utilidades ---------------- */
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  let toastTimer = null;
  function toast(msg, ms) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2500);
  }

  /* ---------------- Controlos ---------------- */
  const atime = $('atime');
  atime.oninput = () => { $('atimeVal').textContent = (+atime.value).toFixed(1); };
  $('scanBtn').onclick = doScan;
  document.addEventListener('keydown', e => {
    if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) doScan();
  });
  $('setupForm').addEventListener('submit', e => {
    e.preventDefault();
    const color = document.querySelector('input[name=color]:checked').value;
    $('setup').hidden = true;
    startGame({ color, level: +$('level').value, movetime: Math.round(+atime.value * 1000) });
  });
  $('newBtn').onclick = () => {
    if (!S.over && S.records.length) { toast('Termina ou desiste da partida atual primeiro.'); return; }
    $('reportOverlay').hidden = true; $('setup').hidden = false;
  };
  let resignArmed = false;
  $('resignBtn').onclick = () => {
    if (S.over) return;
    if (!resignArmed) { resignArmed = true; $('resignBtn').textContent = 'Confirmar desistência'; setTimeout(() => { resignArmed = false; $('resignBtn').textContent = 'Desistir'; }, 3000); return; }
    resignArmed = false; $('resignBtn').textContent = 'Desistir';
    endGame(true);
  };
  $('pgnBtn').onclick = () => {
    const pgn = S.game.pgn();
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = pgn; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (_) {} ta.remove(); toast('PGN copiado.'); };
    if (navigator.clipboard) navigator.clipboard.writeText(pgn).then(() => toast('PGN copiado.'), fallback); else fallback();
  };

  render();
  window.__treinador = S; // útil para depuração
})();
