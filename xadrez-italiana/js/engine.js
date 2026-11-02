/* Motor de análise.
 * 1) Stockfish 10 num Web Worker (ficheiro local, ou CDN através de um blob).
 * 2) Se não for possível, um motor simples em JavaScript (mais fraco). */
const SF_WASM = 'vendor/stockfish.wasm.js';
const SF_LOCAL = 'vendor/stockfish.js';
const SF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';

class StockfishEngine {
  constructor(worker) {
    this.w = worker;
    this.listeners = [];
    this.chain = Promise.resolve();
    this.name = 'Stockfish 10';
    this.kind = '';
    this.strong = true;
    worker.onmessage = e => {
      const line = typeof e.data === 'string' ? e.data : '';
      this.listeners.slice().forEach(l => l(line));
    };
  }
  send(cmd) { this.w.postMessage(cmd); }
  waitFor(pred, timeout) {
    return new Promise((resolve, reject) => {
      const l = line => { if (pred(line)) { off(); resolve(line); } };
      const off = () => { this.listeners = this.listeners.filter(x => x !== l); clearTimeout(t); };
      const t = setTimeout(() => { off(); reject(new Error('timeout')); }, timeout);
      this.listeners.push(l);
    });
  }
  async handshake() {
    const errored = new Promise((_, rej) => { this.w.onerror = () => rej(new Error('worker error')); });
    const ok = this.waitFor(l => l === 'uciok', 20000);
    this.send('uci');
    await Promise.race([ok, errored]);
    this.send('setoption name Hash value 64');
    const ready = this.waitFor(l => l === 'readyok', 20000);
    this.send('isready');
    await ready;
  }
  analyze(fen, opts) {
    const job = this.chain.then(() => this._analyze(fen, opts || {}));
    this.chain = job.catch(() => {});
    return job;
  }
  _analyze(fen, { movetime = 800, skill = 20 }) {
    return new Promise(resolve => {
      let last = null;
      const l = line => {
        if (line.startsWith('info') && line.includes(' score ') && line.includes(' pv ') &&
            !line.includes('bound') && !/ multipv [2-9]/.test(line)) last = line;
        else if (line.startsWith('bestmove')) {
          this.listeners = this.listeners.filter(x => x !== l);
          clearTimeout(guard);
          resolve(parseResult(last, line));
        }
      };
      this.listeners.push(l);
      const guard = setTimeout(() => this.send('stop'), movetime + 8000);
      this.send('setoption name Skill Level value ' + skill);
      this.send('position fen ' + fen);
      this.send('go movetime ' + movetime);
    });
  }
}

function parseResult(info, bestLine) {
  const best = (bestLine.split(/\s+/)[1] || '').trim();
  const r = { best: best === '(none)' ? null : best, cp: 0, mate: null, pv: [] };
  if (info) {
    const m = info.match(/ score (cp|mate) (-?\d+)/);
    if (m) {
      if (m[1] === 'cp') r.cp = parseInt(m[2], 10);
      else { r.mate = parseInt(m[2], 10); r.cp = (r.mate > 0 ? 1 : -1) * (10000 - Math.abs(r.mate) * 10); }
    }
    const pv = info.match(/ pv (.+)$/);
    if (pv) r.pv = pv[1].trim().split(/\s+/);
  }
  if (!r.pv.length && r.best) r.pv = [r.best];
  return r;
}

/* ---------- Motor de recurso (alfa-beta simples sobre chess.js) ---------- */
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const PST = {
  p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
      0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
      -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
      -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
      -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
      0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
      -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
};

class SimpleEngine {
  constructor() { this.name = 'motor interno (simplificado)'; this.strong = false; }
  async handshake() {}
  analyze(fen, opts) {
    return new Promise(resolve => setTimeout(() => resolve(this._search(fen, opts || {})), 10));
  }
  evaluate(g) {
    const b = g.board();
    let s = 0;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (!p) continue;
      const idx = p.color === 'w' ? r * 8 + f : (7 - r) * 8 + f;
      const v = VAL[p.type] + PST[p.type][idx];
      s += p.color === 'w' ? v : -v;
    }
    return g.turn() === 'w' ? s : -s;
  }
  order(moves) {
    return moves.sort((a, b) => (b.captured ? VAL[b.captured] - VAL[a.piece] / 10 : -1) - (a.captured ? VAL[a.captured] - VAL[b.piece] / 10 : -1));
  }
  quiesce(g, alpha, beta, depth) {
    const stand = this.evaluate(g);
    if (stand >= beta) return beta;
    if (alpha < stand) alpha = stand;
    if (depth <= 0) return alpha;
    for (const m of this.order(g.moves({ verbose: true }).filter(m => m.captured))) {
      g.move(m);
      const sc = -this.quiesce(g, -beta, -alpha, depth - 1);
      g.undo();
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  negamax(g, depth, alpha, beta, ply) {
    if (g.in_checkmate()) return -100000 + ply;
    if (g.in_draw() || g.in_stalemate()) return 0;
    if (depth === 0) return this.quiesce(g, alpha, beta, 4);
    for (const m of this.order(g.moves({ verbose: true }))) {
      g.move(m);
      const sc = -this.negamax(g, depth - 1, -beta, -alpha, ply + 1);
      g.undo();
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  _search(fen, { skill = 20 }) {
    const g = new Chess(fen);
    const moves = this.order(g.moves({ verbose: true }));
    if (!moves.length) return { best: null, cp: g.in_checkmate() ? -10000 : 0, mate: g.in_checkmate() ? 0 : null, pv: [] };
    const scored = [];
    for (const m of moves) {
      g.move(m);
      let sc = -this.negamax(g, 1, -1e9, 1e9, 1);
      g.undo();
      scored.push({ m, sc, pick: sc + (skill < 20 ? (Math.random() - 0.5) * (20 - skill) * 30 : 0) });
    }
    scored.sort((a, b) => b.sc - a.sc);
    const top = scored[0];
    const chosen = skill < 20 ? scored.slice().sort((a, b) => b.pick - a.pick)[0] : top;
    const uci = m => m.from + m.to + (m.promotion || '');
    let cp = top.sc, mate = null;
    if (Math.abs(cp) > 90000) { const n = Math.ceil((100000 - Math.abs(cp)) / 2); mate = cp > 0 ? n : -n; cp = (cp > 0 ? 1 : -1) * (10000 - n * 10); }
    // pv: lance escolhido + melhor resposta (para explicar ameaças)
    g.move(top.m);
    const replies = this.order(g.moves({ verbose: true }));
    let bestReply = null, br = -1e9;
    for (const r of replies) { g.move(r); const s = -this.quiesce(g, -1e9, 1e9, 3); g.undo(); if (s > br) { br = s; bestReply = r; } }
    g.undo();
    return { best: uci(chosen.m), cp: Math.round(cp), mate, pv: [uci(top.m)].concat(bestReply ? [uci(bestReply)] : []) };
  }
}

async function loadEngine(onStatus) {
  const attempts = [
    ['WebAssembly', () => new Worker(SF_WASM)],
    ['local', () => new Worker(SF_LOCAL)],
    ['CDN', () => new Worker(URL.createObjectURL(new Blob([`importScripts('${SF_CDN}');`], { type: 'application/javascript' })))],
  ];
  for (const [label, make] of attempts) {
    let w = null;
    try {
      onStatus && onStatus('A carregar Stockfish (' + label + ')…');
      w = make();
      const eng = new StockfishEngine(w);
      await eng.handshake();
      eng.name += label === 'WebAssembly' ? ' (WebAssembly)' : '';
      return eng;
    } catch (e) {
      try { w && w.terminate(); } catch (_) {}
    }
  }
  return new SimpleEngine();
}
