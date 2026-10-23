// Online multiplayer: Scammers vs Baiters, joined with a room code.
//
// Networking is peer-to-peer WebRTC (PeerJS). The free public PeerJS server is
// only used to find each other by code; game data and voice then flow directly
// between players. Star topology for data: the host is the referee (rounds,
// votes, scores) and relays messages. The caller's device runs the call itself
// and streams snapshots to everyone; the victim and spectators send their
// tokens, chaos cards, predictions and votes from their own devices. Voice is
// a full mesh of audio calls.
(function (NR) {
  'use strict';
  const el = NR.el;
  const PREFIX = 'norefunds-v1-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const PAY_SECS = 90;

  // ---------------------------------------------------------------- content
  NR.MP_OBJECTIVES = [
    'Make the caller say the word "pineapple".',
    'Get the caller to tell you their "real" first name.',
    'Make them repeat their badge or ID number three times.',
    'Talk about your personal detail for 30 seconds without being cut off.',
    'Pretend the line is breaking up at least twice.',
    'Put the caller on hold to "find your glasses" — twice.',
    'Get the caller to hum or sing the hold music.',
    'Convince the caller that you once worked at the same company.',
    'Ask the caller for help with an unrelated problem (your TV remote, your crossword…).',
    'Get the caller to give you a "case number" and then read it back wrong.',
    'Make the caller laugh out loud.',
    'Spell your own name wrong and make them correct you.',
    'Get the caller to agree to call you back "next Tuesday".',
    'Make the caller explain what a "gift card" is.',
  ];

  NR.MP_TOKENS = {
    objection: { icon: '🛑', name: 'Objection!', say: '"Hold on, that doesn\'t make sense!"', desc: 'Kills their momentum: trust −8, suspicion +8.', eff: { trust: -8, susp: 8 } },
    prove: { icon: '✋', name: 'Prove it!', say: '"Prove it. Give me something official."', desc: 'Their next card must be Fake Proof, or suspicion +15.', eff: { demand: { name: 'Prove it', tactics: ['proof'], susp: 15 } } },
    what: { icon: '👂', name: 'What? Say again', say: '"Sorry, what? Say that again… slowly."', desc: 'They must repeat their last line. You stay on longer (+2 patience).', eff: { patience: 2 } },
    doorbell: { icon: '🔔', name: 'Someone\'s at the door', say: '"Hold on, someone\'s at the door…"', desc: 'Wipes their pressure and their next card is weaker (×0.6).', eff: { press: -40, nextMult: 0.6 } },
    cry: { icon: '😭', name: 'Start crying', say: '(sob loudly)', desc: 'Their next card must be Sympathize or Calm Down, or suspicion +12.', eff: { demand: { name: 'Comfort me', tactics: ['empathy', 'reassure'], susp: 12 } } },
    family: { icon: '👨‍👩‍👧', name: 'My son is here', say: '"My son just got home. He wants a word."', desc: 'Suspicion +12; their next card must be Pull Rank, or +10 more.', eff: { susp: 12, demand: { name: 'Talk to my son', tactics: ['authority'], susp: 10 } } },
    greedy: { icon: '🤑', name: 'What\'s in it for me?', say: '"And what do I get out of this?"', desc: 'Their next card must be Dangle Prize or Butter Up, or suspicion +10.', eff: { demand: { name: 'What\'s in it for me', tactics: ['prize', 'flattery'], susp: 10 } } },
    confused: { icon: '🤷', name: 'Total confusion', say: '"I don\'t understand ANY of this."', desc: 'Their next card is half as effective.', eff: { nextMult: 0.5 } },
  };

  NR.MP_CHAOS = [
    { icon: '🐕', name: 'Barking dog', line: '🐕 A dog starts barking on the victim\'s end. Caller: talk louder! (patience −1)', eff: { patience: -1 } },
    { icon: '👔', name: 'Boss walks by', line: '👔 Vance is standing right behind the caller. Their next card is half as effective.', eff: { nextMult: 0.5 } },
    { icon: '🚨', name: 'Sirens outside', line: '🚨 Sirens outside the victim\'s window. Suspicion +10.', eff: { susp: 10 } },
    { icon: '📶', name: 'Bad signal', line: '📶 The line crackles. Caller: repeat your last line out loud. (patience −1)', eff: { patience: -1 } },
    { icon: '☕', name: 'Coffee spill', line: '☕ Coffee all over the script! The caller\'s hand is reshuffled.', eff: { redraw: true } },
    { icon: '🍀', name: 'Lucky break', line: '🍀 The victim just saw a scary news story about hackers. Trust +8.', eff: { trust: 8 } },
    { icon: '🦜', name: 'Parrot', line: '🦜 A parrot repeats the caller\'s last word. Loudly. Suspicion +5.', eff: { susp: 5 } },
    { icon: '📺', name: 'TV warning', line: '📺 The victim\'s TV is running a segment on phone scams! Suspicion +12.', eff: { susp: 12 } },
    { icon: '⚡', name: 'Power flicker', line: '⚡ The lights flicker and the victim gets jumpy. Pressure +15.', eff: { press: 15 } },
  ];

  const CUE_LEGEND = [['😍', 'WON OVER', 'warm, trusting, eager to help'], ['🙂', 'GOING ALONG', 'cooperative, a little unsure'], ['😒', 'PUT OFF', 'annoyed, cold'],
    ['🤨', 'VERY SUSPICIOUS', 'openly doubting them'], ['😤', 'LOSING PATIENCE', 'about to hang up'], ['✅', 'AGREES', 'say yes to what they asked'],
    ['❌', 'REFUSES', 'say no, push back'], ['💳', 'AGREES TO PAY', 'read your cards out loud']];

  const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  const fmtSecs = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
  const secsLeft = (deadline) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

  // Every secret about a victim, derived only from the victim code.
  NR.mpData = function (code) {
    const norm = normCode(code);
    NR.seed(NR.hashStr('nr-party:' + norm));
    const baiter = NR.chance(0.35);
    const v = NR.makeVictim({ baiter: false, baiterRate: 0 });
    const amount = Math.max(100, Math.round((v.savings * 0.3) / 50) * 50);
    const denoms = [500, 250, 200, 100];
    const values = [];
    let left = amount;
    while (left >= 100 && values.length < 4) { const d = denoms.find((x) => x <= left); values.push(d); left -= d; }
    const brand = NR.pick(NR.GIFT_BRANDS);
    const cards = values.map((value) => ({ type: 'gift', brand, value, code: NR.giftCode(), spoken: '🔒 ask the victim', baiter, human: true, from: `${v.first} ${v.last}`, tries: 0, done: false }));
    const objective = NR.pick(NR.MP_OBJECTIVES);
    const tokens = NR.shuffle(Object.keys(NR.MP_TOKENS)).slice(0, 3);
    NR.seed((Date.now() ^ 0x5bd1e995) >>> 0);
    return { code: norm, v, baiter, cards, amount: values.reduce((a, b) => a + b, 0), objective, brand, tokens };
  };

  function traitGuide(tr) {
    const t = NR.TRAITS[tr];
    const strong = [], weak = [];
    for (const [id, m] of Object.entries(t.mods)) {
      if (!NR.TACTICS[id] || NR.TACTICS[id].special) continue;
      if (m >= 1.4) strong.push(NR.TACTICS[id].name); else if (m <= 0.6) weak.push(NR.TACTICS[id].name);
    }
    return { label: t.label, reveal: t.reveal, strong, weak };
  }

  // ---------------------------------------------------------------- network
  const net = { peer: null, host: false, conns: new Map(), hostConn: null, me: null, seen: {}, lastHost: 0 };
  let S = null;  // replicated public state (everyone)
  let H = null;  // referee state (host only)
  let mine = null; // the call I am running as caller
  NR.mpCode = () => (S && S.code) || null;
  NR.mp = () => ({ S, H, net, mine });

  const nameOf = (id) => { const p = S && S.players.find((x) => x.id === id); return p ? p.name : '???'; };

  function failModal(title, why) {
    NR.modal(title, el('div', el('p', why),
      el('p.muted', 'Multiplayer needs an internet connection and a normal browser tab (it can\'t run inside some embedded previews). Open index.html, or the game\'s web page, in Chrome, Edge or Firefox.')),
    [{ label: 'OK', cls: 'primary', fn: () => location.reload() }]);
  }

  function peerError(e, code) {
    const type = e && e.type;
    if (type === 'peer-unavailable') return failModal('Room not found', `There's no open game with code ${code}. Check the code and that the host is still on the lobby screen.`);
    if (type === 'browser-incompatible') return failModal('Browser not supported', 'This browser doesn\'t support WebRTC.');
    if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') return failModal('Can\'t reach the matchmaking server', 'The connection to the free PeerJS server failed.');
    failModal('Connection problem', `${type || 'Unknown error'}${e && e.message ? ': ' + e.message : ''}`);
  }

  function sendToHost(msg) {
    if (net.host) hostRecv(msg, net.me);
    else if (net.hostConn && net.hostConn.open) net.hostConn.send(msg);
  }
  function sendTo(id, msg) {
    if (id === net.me) clientRecv(msg);
    else { const c = net.conns.get(id); if (c && c.open) c.send(msg); }
  }
  function broadcast(msg) {
    for (const c of net.conns.values()) if (c.open) c.send(msg);
    clientRecv(msg);
  }

  function askName(title, codeInput, then) {
    const name = el('input#mp-name', { type: 'text', maxlength: 16, value: NR.store.get('mpName', ''), placeholder: 'Your name', style: { width: '100%' } });
    const code = codeInput ? el('input#mp-code', { type: 'text', maxlength: 8, value: codeInput === true ? '' : codeInput, placeholder: 'CODE', autocomplete: 'off',
      style: { font: '900 28px var(--mono)', letterSpacing: '6px', width: '100%', textAlign: 'center', textTransform: 'uppercase' } }) : null;
    const go = () => {
      const n = name.value.trim().slice(0, 16);
      if (!n) { NR.toast('Type your name.', 'warn'); return; }
      const c = code ? normCode(code.value) : null;
      if (code && c.length < 4) { NR.toast('Type the room code.', 'warn'); return; }
      NR.store.set('mpName', n);
      NR.$('#overlay').hidden = true;
      then(n, c);
    };
    NR.modal(title, el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
      el('label', { for: 'mp-name' }, 'Your name'), name,
      code ? el('label', { for: 'mp-code' }, 'Room code') : null, code,
      el('p.muted', 'Everyone plays on their own device. Voice chat is built in (or use Discord).')),
    [{ label: 'Cancel' }, { label: codeInput ? 'Join' : 'Create room', cls: 'primary', keep: true, fn: go }]);
    setTimeout(() => (code && !code.value ? code : name).focus(), 0);
  }

  function connecting(text) { NR.modal('Connecting…', el('p', text)); }

  NR.mpHostDialog = () => askName('🌐 Host a game', false, (name) => hostRoom(name, 0));
  NR.mpJoinDialog = (prefill) => askName('🔑 Join a game', prefill || true, (name, code) => joinRoom(name, code));

  function newPeer(id) {
    if (typeof Peer === 'undefined') { failModal('Multiplayer unavailable', 'The networking library didn\'t load.'); return null; }
    return id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });
  }

  function hostRoom(name, attempt) {
    const code = newCode();
    connecting(`Creating room ${code}…`);
    const peer = newPeer(PREFIX + code);
    if (!peer) return;
    let opened = false;
    peer.on('open', (id) => {
      opened = true;
      net.peer = peer; net.host = true; net.me = id;
      H = {
        code, players: [{ id, name }], phase: 'lobby', laps: 1, roundSecs: 300, round: 0,
        scores: { [id]: 0 }, stats: { [id]: blankStats() }, history: [], cur: null,
      };
      peer.on('connection', (conn) => {
        conn.on('open', () => { net.conns.set(conn.peer, conn); net.seen[conn.peer] = Date.now(); });
        conn.on('data', (d) => { net.seen[conn.peer] = Date.now(); if (d && d.t === 'pong') return; hostRecv(d, conn.peer); });
        conn.on('close', () => playerLeft(conn.peer));
      });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* ignore */ } });
      NR.voice.listen(peer);
      enterDesktop();
      publish();
      // Heartbeat: drop players whose connection died without a clean close.
      setInterval(() => {
        const now = Date.now();
        for (const [id, conn] of net.conns) {
          if (conn.open) conn.send({ t: 'ping' });
          if (now - (net.seen[id] || now) > 12000) { try { conn.close(); } catch (e) { /* ignore */ } playerLeft(id); }
        }
      }, 3000);
    });
    peer.on('error', (e) => {
      if (e.type === 'unavailable-id' && attempt < 3) { peer.destroy(); hostRoom(name, attempt + 1); return; }
      if (!opened) peerError(e); else NR.toast('Network: ' + e.type, 'warn');
    });
  }

  function joinRoom(name, code) {
    connecting(`Joining room ${code}…`);
    const peer = newPeer();
    if (!peer) return;
    let joined = false;
    peer.on('open', (id) => {
      net.peer = peer; net.me = id;
      const conn = peer.connect(PREFIX + code, { reliable: true });
      net.hostConn = conn;
      conn.on('open', () => {
        joined = true; net.lastHost = Date.now();
        conn.send({ t: 'hello', name });
        NR.voice.listen(peer);
        const watch = setInterval(() => { if (Date.now() - net.lastHost > 15000) { clearInterval(watch); hostGone(); } }, 3000);
      });
      conn.on('data', (d) => { net.lastHost = Date.now(); if (d && d.t === 'ping') { conn.send({ t: 'pong' }); return; } clientRecv(d); });
      conn.on('close', () => { if (joined) hostGone(); });
      setTimeout(() => { if (!joined) peerError({ type: 'peer-unavailable' }, code); }, 12000);
    });
    peer.on('error', (e) => { if (!joined) { joined = true; peerError(e, code); } else NR.toast('Network: ' + e.type, 'warn'); });
  }

  let gone = false;
  function hostGone() {
    if (gone) return;
    gone = true;
    NR.voice.stop();
    NR.modal('Game over', el('p', 'The host left the game.'), [{ label: 'Title screen', cls: 'primary', fn: () => location.reload() }]);
  }

  let entered = false;
  function enterDesktop() {
    if (entered) return;
    entered = true;
    NR.newGame('mp');
    NR.G.clockedIn = true;
    NR.G.cash = 0;
    NR.$('#overlay').hidden = true;
    NR.$('#boot').hidden = true;
    NR.$('#desktop').hidden = false;
    NR.closeAll();
    NR.renderIcons();
    NR.emit('update');
    NR.openApp('phone');
    setInterval(callerTick, 500);
  }

  // Leave cleanly when the tab closes, so nobody waits for a timeout.
  window.addEventListener('pagehide', () => {
    if (!net.peer) return;
    try {
      if (net.host) { for (const c of net.conns.values()) if (c.open) c.send({ t: 'hostLeft' }); }
      else if (net.hostConn && net.hostConn.open) net.hostConn.send({ t: 'bye' });
    } catch (e) { /* ignore */ }
  });

  // ---------------------------------------------------------------- host: referee
  const blankStats = () => ({ redeemed: 0, victimPts: 0, baitPts: 0, predPts: 0, chaos: 0, gullible: 0 });
  const totalRounds = () => H.players.length * H.laps;

  function publicState() {
    const c = H.cur;
    return {
      t: 'state', code: H.code, hostId: net.me, players: H.players, phase: H.phase, round: H.round, total: totalRounds(), laps: H.laps, roundSecs: H.roundSecs,
      scores: H.scores, lastSnap: H.lastSnap || null,
      cur: c ? {
        callerId: c.callerId, victimId: c.victimId, specIds: c.specIds, vcode: c.vcode,
        chaos: c.chaos, tokensUsed: c.tokensUsed, preds: c.preds, votes: c.votes,
        reveal: H.phase === 'vote' || H.phase === 'results' ? c.reveal : null, lines: c.lines || null, left: c.left || null,
      } : null,
      awards: H.awards || null,
    };
  }
  function publish() { broadcast(publicState()); }

  function hostRecv(msg, from) {
    const c = H.cur;
    switch (msg.t) {
      case 'hello': {
        if (H.phase !== 'lobby') { const conn = net.conns.get(from); if (conn) { conn.send({ t: 'full', why: 'This game has already started.' }); setTimeout(() => conn.close(), 300); } return; }
        if (H.players.length >= 8) { const conn = net.conns.get(from); if (conn) { conn.send({ t: 'full', why: 'This room is full (8 players).' }); setTimeout(() => conn.close(), 300); } return; }
        let name = String(msg.name || 'Player').slice(0, 16);
        while (H.players.some((p) => p.name === name)) name += '*';
        H.players.push({ id: from, name });
        H.scores[from] = 0; H.stats[from] = blankStats();
        publish();
        break;
      }
      case 'bye': if (from !== net.me) { const conn = net.conns.get(from); if (conn) conn.close(); playerLeft(from); } break;
      case 'settings': if (from === net.me && H.phase === 'lobby') { H.laps = msg.laps; H.roundSecs = msg.roundSecs; publish(); } break;
      case 'start': if (from === net.me && H.players.length >= 2 && (H.phase === 'lobby' || H.phase === 'final')) { if (H.phase === 'final') H.laps++; else H.round = 0; startRound(); } break;
      case 'pred': if (c && H.phase === 'pre' && c.specIds.includes(from)) { c.preds[from] = { ...c.preds[from], [msg.k]: msg.v }; publish(); } break;
      case 'snap':
        if (c && from === c.callerId && (H.phase === 'pre' || H.phase === 'call')) {
          if (H.phase === 'pre') { H.phase = 'call'; H.lastSnap = msg; publish(); }
          H.lastSnap = msg;
          for (const [id, conn] of net.conns) if (id !== from && conn.open) conn.send(msg);
          if (from !== net.me) clientRecv(msg);
        }
        break;
      case 'token': {
        const tok = NR.MP_TOKENS[msg.id];
        if (c && H.phase === 'call' && from === c.victimId && tok && !c.tokensUsed[msg.id] && NR.mpData(c.vcode).tokens.includes(msg.id)) {
          c.tokensUsed[msg.id] = true;
          sendTo(c.callerId, { t: 'applyToken', id: msg.id, who: nameOf(from) });
          publish();
        }
        break;
      }
      case 'chaos':
        if (c && H.phase === 'call' && c.chaos[from] && !c.chaos[from].used) {
          c.chaos[from].used = true;
          H.stats[from].chaos++;
          sendTo(c.callerId, { t: 'applyChaos', idx: c.chaos[from].idx, who: nameOf(from) });
          publish();
        }
        break;
      case 'callDone':
        if (c && from === c.callerId && H.phase === 'call') { c.done = msg; openVote(); }
        break;
      case 'vote':
        if (c && H.phase === 'vote' && from !== c.victimId && H.players.some((p) => p.id === from)) {
          c.votes[from] = !!msg.yes;
          const voters = H.players.filter((p) => p.id !== c.victimId);
          if (voters.every((p) => p.id in c.votes)) finishRound();
          else publish();
        }
        break;
      case 'closeVote': if (from === net.me && c && H.phase === 'vote') finishRound(); break;
      case 'next':
        if (from === net.me && H.phase === 'results') {
          H.round++;
          if (H.round >= totalRounds()) finalResults(); else startRound();
        }
        break;
      default: break;
    }
  }

  function startRound() {
    const ids = H.players.map((p) => p.id);
    const n = ids.length;
    const callerId = ids[H.round % n];
    const lapOff = (Math.floor(H.round / n) % (n - 1)) + 1;
    const victimId = ids[(H.round % n + lapOff) % n];
    const specIds = ids.filter((id) => id !== callerId && id !== victimId);
    H.cur = {
      callerId, victimId, specIds, vcode: newCode(), tokensUsed: {}, votes: {},
      preds: Object.fromEntries(specIds.map((id) => [id, {}])),
      chaos: Object.fromEntries(specIds.map((id) => { const idx = Math.floor(Math.random() * NR.MP_CHAOS.length); return [id, { idx, icon: NR.MP_CHAOS[idx].icon, name: NR.MP_CHAOS[idx].name, used: false }]; })),
    };
    H.lastSnap = null;
    H.phase = 'pre';
    publish();
  }

  function openVote() {
    const c = H.cur, d = NR.mpData(c.vcode);
    c.reveal = { victim: nameOf(c.victimId), character: `${d.v.first} ${d.v.last}, ${d.v.age}`, baiter: d.baiter,
      traits: d.v.traits.map((t) => NR.TRAITS[t].label), objective: d.objective, outcome: c.done ? c.done.outcome : 'dropped' };
    H.phase = 'vote';
    publish();
  }

  function finishRound() {
    const c = H.cur, d = NR.mpData(c.vcode), done = c.done || { outcome: 'dropped', turns: 0, real: 0, bait: 0, frozen: 0 };
    const voters = Object.values(c.votes);
    const objectiveDone = voters.length > 0 && voters.filter(Boolean).length * 2 > voters.length;
    const lines = [], delta = {};
    const add = (id, pts, why, stat) => {
      if (!pts) return;
      delta[id] = (delta[id] || 0) + pts;
      lines.push(`${nameOf(id)} ${pts >= 0 ? '+' : ''}${pts} — ${why}`);
      if (stat && H.stats[id]) H.stats[id][stat] += pts;
    };
    const caller = c.callerId, victim = c.victimId;
    if (done.real) { add(caller, Math.round(done.real / 10), `redeemed ${NR.money(done.real)}`); H.stats[caller].redeemed += done.real; }
    if (done.bait) { add(caller, -50 * done.bait, `redeemed ${done.bait} fake card(s)`); H.stats[caller].gullible += done.bait; add(victim, 60 * done.bait, 'baited the caller', 'baitPts'); }
    if (done.outcome === 'reported') { add(caller, 50, 'unmasked the scambaiter'); add(victim, -30, 'got caught baiting', 'victimPts'); }
    if (done.outcome === 'falsereport') { add(caller, -30, 'accused an innocent victim'); add(victim, 20, 'falsely accused', 'victimPts'); }
    if (['hangup', 'bored'].includes(done.outcome)) add(victim, 40, 'didn\'t fall for it', 'victimPts');
    if (done.turns) add(victim, done.turns * 3, `wasted ${done.turns} turns`, 'victimPts');
    if (done.frozen && !d.baiter) add(victim, 20 * done.frozen, `stalled until ${done.frozen} card(s) froze`, 'victimPts');
    if (objectiveDone) add(victim, 40, 'secret objective: ' + d.objective, 'victimPts');
    const paid = done.outcome === 'paid' && done.real > 0;
    for (const [id, pr] of Object.entries(c.preds)) {
      if (pr.role && (pr.role === 'baiter') === d.baiter) add(id, 15, 'called the victim\'s role', 'predPts');
      if (pr.pays != null && pr.pays === paid) add(id, 10, `predicted the money ${paid ? 'would' : 'wouldn\'t'} flow`, 'predPts');
    }
    for (const [id, pts] of Object.entries(delta)) H.scores[id] = (H.scores[id] || 0) + pts;
    c.lines = lines.length ? lines : ['No points this round.'];
    if (!objectiveDone) c.lines.push(`The group voted the objective ${voters.length ? 'failed' : '(no votes)'}.`);
    H.history.push({ lines: c.lines });
    H.phase = 'results';
    publish();
  }

  function finalResults() {
    const best = (stat) => {
      const [id, val] = Object.entries(H.stats).filter(([pid]) => H.players.some((p) => p.id === pid)).sort((a, b) => b[1][stat] - a[1][stat])[0] || [];
      return id && val[stat] > 0 ? id : null;
    };
    H.awards = [
      ['💰', 'Top Closer', best('redeemed'), (id) => `${NR.money(H.stats[id].redeemed)} redeemed`],
      ['🎭', 'Best Victim', best('victimPts'), (id) => `${H.stats[id].victimPts} pts as a victim`],
      ['😈', 'Bait Master', best('baitPts'), (id) => `${H.stats[id].baitPts} pts from fake cards`],
      ['🔮', 'The Oracle', best('predPts'), (id) => `${H.stats[id].predPts} pts from predictions`],
      ['🌪️', 'Agent of Chaos', best('chaos'), (id) => `${H.stats[id].chaos} chaos cards thrown`],
      ['🤡', 'Most Gullible Scammer', best('gullible'), (id) => `redeemed ${H.stats[id].gullible} fake card(s)`],
    ].filter((a) => a[2]).map(([icon, title, id, why]) => [icon, title, nameOf(id), why(id)]);
    H.phase = 'final';
    H.cur = null;
    publish();
  }

  function playerLeft(id) {
    net.conns.delete(id);
    if (!H || !H.players.some((p) => p.id === id)) return;
    const name = nameOf(id);
    H.players = H.players.filter((p) => p.id !== id);
    NR.voice.drop(id);
    NR.toast(`${name} left the game.`, 'warn');
    const c = H.cur;
    if (H.players.length < 2) { H.phase = 'lobby'; H.cur = null; publish(); return; }
    if (c && (id === c.callerId || id === c.victimId) && ['pre', 'call', 'vote'].includes(H.phase)) {
      c.lines = [`${name} disconnected — round cancelled, no points.`];
      c.left = true;
      H.phase = 'results';
    } else if (c) {
      c.specIds = c.specIds.filter((x) => x !== id);
      delete c.preds[id]; delete c.chaos[id]; delete c.votes[id];
      if (H.phase === 'vote') {
        const voters = H.players.filter((p) => p.id !== c.victimId);
        if (voters.every((p) => p.id in c.votes)) { finishRound(); return; }
      }
    }
    publish();
  }

  // ---------------------------------------------------------------- everyone
  let lastPhase = null, lastRound = null;
  function clientRecv(msg) {
    switch (msg.t) {
      case 'state': {
        const prev = S;
        S = msg;
        // Keep the freshest call snapshot: a direct snap beats the copy inside state.
        if (msg.phase === 'pre' || msg.phase === 'lobby') S.snap = null;
        else if (prev && prev.round === msg.round && prev.snap) S.snap = prev.snap;
        else S.snap = msg.lastSnap ? { ...msg.lastSnap, at: Date.now() } : null;
        enterDesktop();
        NR.voice.sync(S);
        const changed = S.phase !== lastPhase || S.round !== lastRound;
        lastPhase = S.phase; lastRound = S.round;
        if (changed && S.phase === 'pre') { mine = null; NR.call = null; NR.G.pending = []; NR.closeApp('redeem'); NR.closeApp('remote'); NR.sfx('ring'); }
        renderModal(changed);
        if (changed) NR.openApp('phone'); else NR.refreshApp('phone');
        NR.emit('update');
        break;
      }
      case 'snap':
        if (S && S.cur && S.cur.callerId === net.me) return;
        if (S) { S.snap = { ...msg, at: Date.now() }; NR.refreshApp('phone'); }
        break;
      case 'applyToken': {
        const t = NR.MP_TOKENS[msg.id];
        if (mine && t) { mine.call.effect({ ...t.eff, line: `${t.icon} ${msg.who} plays ${t.name} ${t.say} — ${t.desc}` }); NR.sfx('popup'); afterCallChange(); }
        break;
      }
      case 'applyChaos': {
        const ch = NR.MP_CHAOS[msg.idx];
        if (mine && ch) { mine.call.effect({ ...ch.eff, line: `${ch.line} (thrown by ${msg.who})` }); NR.sfx('popup'); afterCallChange(); }
        break;
      }
      case 'hostLeft': hostGone(); break;
      case 'full':
        NR.modal('Can\'t join', el('p', msg.why), [{ label: 'OK', cls: 'primary', fn: () => location.reload() }]);
        break;
      default: break;
    }
  }

  // ---------------------------------------------------------------- caller side
  function dial(scamId) {
    if (!S || !S.cur || S.cur.callerId !== net.me || S.phase !== 'pre' || mine) return;
    const data = NR.mpData(S.cur.vcode);
    const c = new NR.Call(data.v, scamId, { upgrades: {}, deck: NR.STARTER_DECK, handSize: 4 });
    c.human = { baiter: data.baiter, cards: data.cards };
    c.amount = data.amount;
    c.ctx.amount = NR.money(data.amount);
    c.ctx.gift = data.brand;
    c.cue = ['PICKS UP — say hello!', '📞', 'ok'];
    mine = { call: c, data, deadline: Date.now() + S.roundSecs * 1000, payDeadline: null, payFrozen: false, real: 0, bait: 0, frozen: 0 };
    NR.call = c;
    c.say('sys', `📞 ${nameOf(S.cur.victimId)} picks up as ${data.v.first} ${data.v.last}. Say your line out loud, then play the card that matches it.`);
    NR.sfx('pickup');
    NR.refreshApp('phone');
    sendSnap();
  }

  function snapOf() {
    const c = mine.call, v = c.v;
    return {
      t: 'snap', state: c.state, outcome: c.outcome, trust: c.trust, susp: c.susp, patience: Math.max(0, c.patience), maxPatience: c.maxPatience,
      press: Math.round(c.press), stage: c.stage, scamId: c.scamId, cue: c.cue, demand: c.demand || null, nextMult: c.nextMult || null,
      victim: { first: v.first, last: v.last, age: v.age, city: v.city, female: v.female, known: v.known.map((t) => NR.TRAITS[t].label), count: v.traits.length, detail: v.detailKnown ? v.detail.text : null },
      log: c.log.slice(-40), turns: c.turns,
      remain: secsLeft(mine.deadline), payRemain: mine.payDeadline && !mine.payFrozen ? secsLeft(mine.payDeadline) : null,
      cardsLeft: c.human.cards.filter((x) => !x.done).length, real: mine.real, bait: mine.bait,
    };
  }
  function sendSnap() { if (mine) sendToHost(snapOf()); }
  function afterCallChange() { NR.refreshApp('phone'); sendSnap(); }

  NR.on('callChanged', (c) => { if (mine && c === mine.call) sendSnap(); });
  NR.on('callEnded', (c) => { if (mine && c === mine.call) setTimeout(afterCallChange, 0); });
  NR.on('redeemed', (hit) => {
    if (!mine || !hit.human) return;
    if (hit.baiter) mine.bait++; else mine.real += hit.value;
    sendSnap();
  });

  function callerTick() {
    if (!mine) { tickTimerText(); return; }
    const c = mine.call, now = Date.now();
    if (['talk', 'cashier', 'store'].includes(c.state) && now >= mine.deadline) {
      c.effect({ line: '⏰ Time\'s up! The victim has had enough and hangs up.', cue: ['HANGS UP', '📵', 'bad'] });
      c.patience = 0; c.checkEnd();
      NR.sfx('hangup');
      afterCallChange();
    }
    if ((c.state === 'reading' || c.outcome === 'paid') && !mine.payDeadline) { mine.payDeadline = now + PAY_SECS * 1000; sendSnap(); }
    if (mine.payDeadline && !mine.payFrozen && now >= mine.payDeadline) {
      mine.payFrozen = true;
      for (const card of c.human.cards) if (!card.done) { card.done = true; card.lost = true; mine.frozen++; }
      if (mine.frozen) { NR.toast(`🧊 The bank froze ${mine.frozen} card(s)!`, 'bad'); NR.sfx('error'); }
      if (c.state === 'reading') c.finishPayment();
      NR.refreshApp('redeem');
      afterCallChange();
    }
    tickTimerText();
  }

  function endMyRound() {
    if (!mine) return;
    const c = mine.call;
    if (c.state !== 'done') c.hangUp();
    for (const card of c.human.cards) if (!card.done) { card.done = true; card.lost = true; }
    sendSnap();
    sendToHost({ t: 'callDone', outcome: c.outcome, turns: c.turns, real: mine.real, bait: mine.bait, frozen: mine.frozen });
  }

  // ---------------------------------------------------------------- timers & bars
  function timerOf() {
    if (mine) {
      const c = mine.call;
      if (mine.payDeadline && !mine.payFrozen) return [`🧊 Cards freeze in ${fmtSecs(secsLeft(mine.payDeadline))}`, 'ptimer pay'];
      if (['talk', 'cashier', 'store'].includes(c.state)) { const s = secsLeft(mine.deadline); return [`⏱ ${fmtSecs(s)}`, 'ptimer' + (s <= 30 ? ' low' : '')]; }
      return ['', 'ptimer'];
    }
    const sn = S && S.snap;
    if (!sn) return ['', 'ptimer'];
    const gone = Math.floor((Date.now() - sn.at) / 1000);
    if (sn.payRemain != null) return [`🧊 Cards freeze in ${fmtSecs(sn.payRemain - gone)}`, 'ptimer pay'];
    if (['talk', 'cashier', 'store'].includes(sn.state)) { const s = sn.remain - gone; return [`⏱ ${fmtSecs(s)}`, 'ptimer' + (s <= 30 ? ' low' : '')]; }
    return ['', 'ptimer'];
  }
  function tickTimerText() { const t = NR.$('#mp-timer'); if (t) { const [text, cls] = timerOf(); t.textContent = text; t.className = cls; } }
  const timerEl = () => { const [text, cls] = timerOf(); return el('span#mp-timer', { class: cls }, text); };

  function cueBanner(cue, who) {
    const [text, icon, cls] = cue || ['ON THE LINE', '📞', 'ok'];
    return el('div', { class: 'cue ' + cls }, el('span.ci', icon), el('span', el('small', `🎭 ${who}, act: `), text));
  }
  function warnings(sn) {
    const live = sn.state !== 'done';
    return [
      sn.demand && live ? el('span.pwarn', `⚠ Demand: ${sn.demand.name} — next card must be ${sn.demand.tactics.map((t) => NR.TACTICS[t].name).join(' or ')} (+${sn.demand.susp} suspicion otherwise)`) : null,
      sn.nextMult && live ? el('span.pwarn', `⚠ Next card ×${sn.nextMult}`) : null,
    ];
  }

  // The bar above the caller's call screen.
  NR.mpCallBar = function (c) {
    if (!mine || mine.call !== c || !S || !S.cur) return null;
    const used = Object.keys(S.cur.tokensUsed || {}).length;
    const chaosLeft = Object.values(S.cur.chaos || {}).filter((x) => !x.used).length;
    return el('div.partybar', cueBanner(c.cue, nameOf(S.cur.victimId)), ...warnings({ state: c.state, demand: c.demand, nextMult: c.nextMult }), timerEl(),
      el('div.prow.muted', `🎭 Victim tokens left: ${3 - used} · 🌪️ Chaos cards in the room: ${chaosLeft}`));
  };

  // ---------------------------------------------------------------- views
  function scoreboard() {
    const rows = S.players.map((p) => [p, S.scores[p.id] || 0]).sort((a, b) => b[1] - a[1]);
    return el('table.list', el('tr', el('th', 'Player'), el('th', 'Points')),
      ...rows.map(([p, s], i) => el('tr', el('td', (i === 0 && s > 0 ? '👑 ' : '') + p.name + (p.id === net.me ? ' (you)' : '') + (p.id === S.hostId ? ' ⭐' : '')), el('td', el('b', s)))));
  }

  function voiceBar() {
    const v = NR.voice;
    return el('div.row', { style: { flexWrap: 'wrap', margin: '6px 0' } },
      v.on ? el('button', { onclick: () => { v.toggleMute(); NR.refreshApp('phone'); } }, v.muted ? '🔇 Unmute mic' : '🎙 Mute mic')
        : el('button.primary', { onclick: () => v.start().then(() => NR.refreshApp('phone')) }, '🎙 Join voice chat'),
      el('span.muted', v.on ? `Voice: connected to ${v.count()} player(s)${v.micDenied ? ' — listening only (no mic)' : ''}. Caller and victim sound like a phone line during calls.` : 'Built-in voice chat — or use Discord.'));
  }

  function lobbyView() {
    const isHost = net.host;
    const link = location.href.split(/[?#]/)[0] + '?join=' + S.code;
    const laps = el('select#mp-laps', { disabled: !isHost, onchange: () => sendToHost({ t: 'settings', laps: +laps.value, roundSecs: +mins.value }) },
      ...[1, 2, 3].map((n) => el('option', { value: n, selected: S.laps === n }, `${n} lap${n > 1 ? 's' : ''}`)));
    const mins = el('select#mp-mins', { disabled: !isHost, onchange: () => sendToHost({ t: 'settings', laps: +laps.value, roundSecs: +mins.value }) },
      ...[[180, '3 min'], [300, '5 min'], [480, '8 min']].map(([s, l]) => el('option', { value: s, selected: S.roundSecs === s }, l)));
    return el('div',
      el('h3', '🌐 Lobby'),
      el('div.lobby-code', el('span.muted', 'Room code'), el('b', S.code)),
      el('p.muted', 'Friends join with "🔑 Join a game with a code", or with this link: ', el('span.mono', { style: { userSelect: 'all', wordBreak: 'break-all' } }, link)),
      el('button', { onclick: () => { try { navigator.clipboard.writeText(link).then(() => NR.toast('Link copied.', 'good'), () => NR.toast('Copy failed — select the link.', 'warn')); } catch (e) { NR.toast('Copy failed — select the link.', 'warn'); } } }, '📋 Copy invite link'),
      voiceBar(),
      el('h3', `Players (${S.players.length}/8)`), scoreboard(),
      el('div.row', { style: { marginTop: '8px', flexWrap: 'wrap' } }, el('label', { for: 'mp-laps' }, 'Length'), laps, el('label', { for: 'mp-mins' }, 'Round timer'), mins),
      isHost ? el('button.primary', { style: { marginTop: '10px' }, disabled: S.players.length < 2, onclick: () => sendToHost({ t: 'start' }) }, S.players.length < 2 ? 'Waiting for players…' : '▶ Start game')
        : el('p', '⏳ Waiting for the host to start…'),
      el('details', { style: { marginTop: '10px' } }, el('summary', 'How to play'), el('ul',
        el('li', 'Each round one player is the caller and another plays a secret victim. Everyone else predicts and throws chaos.'),
        el('li', 'Some victims are secretly scambaiters with fake gift cards.'),
        el('li', 'Caller: say your line out loud, then play the matching card. Victim: act out the banner and use your tokens.'))));
  }

  function victimSheet(d, compact) {
    const v = d.v;
    const guides = v.traits.map(traitGuide);
    return el('div.victim-sheet' + (compact ? '.compact' : ''),
      el('div', { class: 'role ' + (d.baiter ? 'baiter' : 'real') }, d.baiter ? '😈 SECRET SCAMBAITER' : '🎭 REAL VICTIM'),
      el('h2', `${v.first} ${v.last}, ${v.age}`), el('div.muted', v.city),
      el('p', d.baiter
        ? 'You only PRETEND to be gullible. Waste their time, act a little too eager, and get them to redeem your fake cards. If they press 🚩 Baiter!, you lose points.'
        : 'You are a real, trusting person. Follow the banner — it tells you how each line landed.'),
      el('h3', 'Your personality'),
      ...guides.map((g) => el('div.trait', el('b', g.label), ` — your character ${g.reveal}.`,
        g.strong.length ? el('div', '👍 Falls for: ' + g.strong.join(', ')) : null,
        g.weak.length ? el('div', '👎 Hates: ' + g.weak.join(', ')) : null)),
      el('p', '📌 Bring this up when they ask about your life: ', el('b', v.detail.text)),
      el('h3', '🎯 Secret objective'), el('p.objective', d.objective),
      el('h3', `🎁 Your ${d.brand} cards`),
      el('p.muted', d.baiter ? 'These are FAKE — but they look real. Read them confidently. Every one they redeem is +60 for you.'
        : `Only read these once the banner says 💳 AGREES TO PAY. Read them truthfully — but nobody said fast. They freeze after ${PAY_SECS} seconds: +20 for you per frozen card.`),
      el('div.cards', ...d.cards.map((c) => el('div.gcard', el('span', NR.money(c.value)), el('b.mono', c.code)))),
      el('details', el('summary', '🎭 Reading the banner'),
        el('table.cues', ...CUE_LEGEND.map(([i, t, how]) => el('tr', el('td', i), el('td', el('b', t)), el('td', how))))));
  }

  function watchView(sn, me) {
    const cur = S.cur;
    const scam = NR.SCAMS[sn.scamId];
    const log = el('div.transcript.panel', { style: { maxHeight: '220px' } }, ...sn.log.map((m) =>
      m.who === 'fx' ? el('div.fx', { html: m.text }) : el('div', { class: `msg ${m.who}` }, m.who === 'you' && m.tag ? el('span.tagline', m.tag) : null, m.text)));
    setTimeout(() => { log.scrollTop = log.scrollHeight; }, 0);
    const meters = el('div.watch-meters',
      el('div.meter', el('div.row', el('span.grow', 'Trust'), el('b', sn.trust)), el('div.bar', el('div', { style: { width: sn.trust + '%', background: 'var(--trust)' } }))),
      el('div.meter', el('div.row', el('span.grow', 'Suspicion'), el('b', sn.susp)), el('div.bar', el('div', { style: { width: sn.susp + '%', background: 'var(--susp)' } }))),
      el('div.muted', `Patience ${sn.patience}/${sn.maxPatience} · ${scam.name}: ${scam.stages.map((s, i) => (i < sn.stage ? '✓' : i === sn.stage ? '▶' : '·') + ' ' + s.name).join('  ')}`));
    const actions = el('div.prow');
    if (me === 'victim') {
      const d = NR.mpData(cur.vcode);
      actions.append(el('b', '🃏 Your tokens:'), ...d.tokens.map((id) => {
        const t = NR.MP_TOKENS[id];
        return el('button.ptoken.big', { disabled: sn.state === 'done' || cur.tokensUsed[id], title: t.desc, onclick: () => sendToHost({ t: 'token', id }) }, `${t.icon} ${t.name}`, el('small', t.say));
      }));
    } else if (me === 'spec' && cur.chaos[net.me]) {
      const ch = cur.chaos[net.me];
      actions.append(el('b', '🌪️ Your chaos card:'), el('button.pchaos.big', { disabled: sn.state === 'done' || ch.used, onclick: () => sendToHost({ t: 'chaos' }) }, `${ch.icon} ${ch.name}`, el('small', ch.used ? 'used' : 'Throw it in!')));
    }
    const status = sn.state === 'done' ? el('p', `Call over (${sn.outcome}). ${sn.cardsLeft ? `${sn.cardsLeft} card(s) still to redeem.` : ''} Waiting for ${nameOf(cur.callerId)} to end the round.`)
      : sn.state === 'reading' ? el('p', el('b', '💳 Paying!'), ` ${nameOf(cur.victimId)} reads the cards; ${nameOf(cur.callerId)} types them in.`) : null;
    return el('div',
      el('div.partybar', cueBanner(sn.cue, nameOf(cur.victimId)), ...warnings(sn), timerEl(), actions.children.length ? actions : null),
      el('div', { style: { margin: '6px 0' } }, el('b', `${sn.victim.first} ${sn.victim.last}, ${sn.victim.age}`), el('span.muted', ` · ${sn.victim.city} · known: ${sn.victim.known.join(', ') || 'nothing yet'}`)),
      meters, status, log);
  }

  NR.mpPanel = function (body) {
    if (!S) { body.replaceChildren(el('p.muted', 'Connecting…')); return; }
    if (S.phase === 'lobby') { body.replaceChildren(lobbyView()); return; }
    const cur = S.cur;
    if (!cur) { body.replaceChildren(el('h3', '🏆 Game over'), voiceBar(), scoreboard(), net.host ? el('button.primary', { onclick: () => sendToHost({ t: 'start' }) }, '▶ Play another lap') : el('p.muted', 'Waiting for the host…')); return; }
    const me = cur.callerId === net.me ? 'caller' : cur.victimId === net.me ? 'victim' : 'spec';
    const head = el('div',
      el('h3', `Round ${S.round + 1}/${S.total}: 📞 ${nameOf(cur.callerId)} vs 🎭 ${nameOf(cur.victimId)}`),
      el('div.role-pill.' + me, me === 'caller' ? '📞 You are the CALLER' : me === 'victim' ? '🎭 You are the VICTIM' : '👀 You are a SPECTATOR'));
    let main;
    if (me === 'caller') {
      if (!mine && S.phase === 'pre') {
        const scams = Object.keys(NR.SCAMS).filter((s) => !NR.SCAMS[s].elderlyOnly);
        const sel = el('select#mp-scam', ...scams.map((s) => el('option', { value: s }, `${NR.SCAMS[s].name} — ${NR.SCAMS[s].blurb}`)));
        main = el('div', el('p', `Pick your script. You know nothing about ${nameOf(cur.victimId)}'s character — Chit-Chat to find weak spots, and watch out for baiters.`),
          el('div.row', sel, el('button.primary', { onclick: () => dial(sel.value) }, `📞 Call ${nameOf(cur.victimId)}`)));
      } else if (mine) {
        const pend = mine.call.human.cards.filter((x) => !x.done).length;
        main = el('div', NR.mpCallBar(mine.call),
          el('p', `Call over (${mine.call.outcome}). `, pend ? `${pend} card(s) left — ${nameOf(cur.victimId)} reads them out; type them into 🎁 Redeem before they freeze.` : ''),
          S.phase === 'call' ? el('div.row', pend ? el('button', { onclick: () => NR.openApp('redeem') }, '🎁 Open Redeem') : null, el('button.primary', { onclick: endMyRound }, '🏁 End round & reveal')) : el('p.muted', 'Round over.'));
      } else main = el('p.muted', 'Round over.');
    } else if (S.phase === 'pre') {
      if (me === 'victim') main = el('div', el('p', el('b', 'Get into character!'), ` ${nameOf(cur.callerId)} is choosing a script. Your sheet is secret — keep your screen to yourself.`), victimSheet(NR.mpData(cur.vcode)));
      else {
        const pr = cur.preds[net.me] || {};
        const b = (k, val, label) => el('button', { class: pr[k] === val ? 'on' : '', onclick: () => sendToHost({ t: 'pred', k, v: val }) }, label);
        main = el('div', el('h3', '🔮 Your prediction'), el('p.muted', 'Is the victim real or a secret baiter? Will the money flow? (+15 / +10)'),
          el('div.row.preds', b('role', 'real', '🎭 Real'), b('role', 'baiter', '😈 Baiter'), el('span', ' '), b('pays', true, '💰 Pays'), b('pays', false, '🛡 Holds out')),
          cur.chaos[net.me] ? el('p', `Your chaos card this round: ${cur.chaos[net.me].icon} `, el('b', cur.chaos[net.me].name), ' — use it during the call.') : null,
          el('p.muted', `⏳ Waiting for ${nameOf(cur.callerId)} to dial…`));
      }
    } else if (S.snap) {
      main = el('div', watchView(S.snap, me), me === 'victim' ? el('details', { style: { marginTop: '8px' } }, el('summary', '📄 My secret sheet'), victimSheet(NR.mpData(cur.vcode), true)) : null);
    } else main = el('p.muted', '⏳ Waiting…');
    body.replaceChildren(head, main, voiceBar(), el('h3', { style: { marginTop: '10px' } }, 'Scoreboard'), scoreboard(),
      el('details', { style: { marginTop: '10px' } }, el('summary', 'How scoring works'), el('ul',
        el('li', 'Caller: +1 per $10 redeemed · +50 for unmasking a baiter · −30 for a false accusation · −50 per fake card redeemed.'),
        el('li', 'Victim: +3 per turn · +40 if the caller fails · +40 secret objective (group vote) · +60 per fake card redeemed · +20 per real card that freezes · −30 if unmasked.'),
        el('li', `Spectators: +15 for calling real/baiter, +10 for calling the money. Cards freeze ${PAY_SECS}s after the victim agrees to pay.`))));
  };

  // Phase pop-ups: reveal + vote, round results, final awards.
  function renderModal(changed) {
    const cur = S.cur;
    if (S.phase === 'vote' && cur && cur.reveal) {
      const r = cur.reveal;
      const canVote = cur.victimId !== net.me && !(net.me in cur.votes);
      const waiting = S.players.filter((p) => p.id !== cur.victimId && !(p.id in cur.votes)).map((p) => p.name);
      const btns = canVote ? [{ label: '👎 No', fn: () => sendToHost({ t: 'vote', yes: false }) }, { label: '👍 Yes!', cls: 'primary', fn: () => sendToHost({ t: 'vote', yes: true }) }]
        : net.host ? [{ label: 'Close the vote', keep: true, fn: () => sendToHost({ t: 'closeVote' }) }] : [];
      NR.modal('The reveal', el('div',
        el('p', el('b', r.victim), ' was playing ', el('b', r.character), ' — ',
          r.baiter ? el('b', { style: { color: 'var(--bad)' } }, '😈 a SECRET SCAMBAITER') : el('b', { style: { color: 'var(--good)' } }, '🎭 a real victim'), '.'),
        el('p', 'Traits: ', r.traits.join(', ')),
        el('p', 'Secret objective: ', el('i', r.objective)),
        canVote ? el('p', el('b', 'Did they pull it off?')) : el('p.muted', waiting.length ? `Waiting for votes: ${waiting.join(', ')}` : 'Counting votes…')), btns);
      return;
    }
    if (S.phase === 'results' && cur) {
      const last = S.round + 1 >= S.total;
      NR.modal('Round results', el('div', el('ul', ...(cur.lines || []).map((t) => el('li', t))), scoreboard()),
        net.host ? [{ label: last ? 'Final results' : 'Next round', cls: 'primary', fn: () => sendToHost({ t: 'next' }) }] : [{ label: 'OK (waiting for host)' }]);
      return;
    }
    if (S.phase === 'final' && changed) {
      const rows = S.players.map((p) => [p, S.scores[p.id] || 0]).sort((a, b) => b[1] - a[1]);
      NR.sfx('cash');
      NR.modal('🏆 Final results', el('div', { style: { textAlign: 'center' } }, el('div.big', `${rows[0][0].name} wins!`),
        el('div.awards', ...(S.awards || []).map(([icon, title, who, why]) => el('div.award', el('span.ai', icon), el('div', el('b', title), el('div', who), el('small.muted', why))))),
        scoreboard()),
      net.host ? [{ label: 'Title screen', fn: () => location.reload() }, { label: 'Play another lap', cls: 'primary', fn: () => sendToHost({ t: 'start' }) }] : [{ label: 'OK' }]);
      return;
    }
    if (changed && S.phase === 'pre' && cur) {
      const me = cur.callerId === net.me ? 'caller' : cur.victimId === net.me ? 'victim' : 'spec';
      NR.modal(`Round ${S.round + 1} of ${S.total}`, el('div', { style: { textAlign: 'center' } },
        el('p', { style: { fontSize: '18px' } }, '📞 ', el('b', nameOf(cur.callerId)), ' calls 🎭 ', el('b', nameOf(cur.victimId))),
        el('div.role-pill.' + me, me === 'caller' ? '📞 You are the CALLER' : me === 'victim' ? '🎭 You are the VICTIM — read your secret sheet' : '👀 You are a SPECTATOR — make your prediction')),
      [{ label: 'Let\'s go', cls: 'primary' }]);
      return;
    }
    if (['pre', 'call', 'lobby'].includes(S.phase) && changed) NR.$('#overlay').hidden = true;
  }

  // ---------------------------------------------------------------- voice
  // Full mesh of audio calls. The peer with the smaller id dials, the other
  // answers. Caller and victim get a telephone band-pass filter during calls.
  NR.voice = (() => {
    const calls = new Map(); // peerId -> { call, audio, src, dry, wet }
    let stream = null, silent = null, ctx = null, peer = null;
    const v = { on: false, muted: false, micDenied: false };
    function audioCtx() { if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; ctx = C ? new C() : null; } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; }
    function silentStream() {
      if (silent) return silent;
      const c = audioCtx();
      silent = c ? c.createMediaStreamDestination().stream : new MediaStream();
      return silent;
    }
    function attach(id, remote) {
      const entry = calls.get(id) || {};
      if (entry.audio) entry.audio.remove();
      // Chrome only feeds WebRTC audio into WebAudio while an element plays it.
      const audio = el('audio', { autoplay: true, playsinline: true });
      audio.muted = true; audio.srcObject = remote;
      document.body.append(audio);
      const c = audioCtx();
      if (c) {
        const src = c.createMediaStreamSource(remote);
        const dry = c.createGain(), wet = c.createGain();
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
        src.connect(dry); dry.connect(c.destination);
        src.connect(hp); hp.connect(lp); lp.connect(wet); wet.connect(c.destination);
        wet.gain.value = 0;
        Object.assign(entry, { audio, src, dry, wet });
      } else { audio.muted = false; Object.assign(entry, { audio }); }
      calls.set(id, entry);
      v.applyFilters();
      NR.refreshApp('phone');
    }
    function wire(call) {
      const entry = calls.get(call.peer) || {};
      entry.call = call;
      calls.set(call.peer, entry);
      call.on('stream', (remote) => attach(call.peer, remote));
      call.on('close', () => v.drop(call.peer));
      call.on('error', () => v.drop(call.peer));
    }
    v.listen = (p) => {
      peer = p;
      p.on('call', (call) => { call.answer(stream || silentStream()); wire(call); });
    };
    // Calls are always open (silent until you join). Joining resumes audio
    // playback and swaps the silent track for the microphone on every call.
    v.start = async () => {
      audioCtx();
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
      catch (e) { stream = null; v.micDenied = true; NR.toast('No microphone — you can still listen.', 'warn'); }
      v.on = true;
      const track = stream && stream.getAudioTracks()[0];
      if (track) {
        for (const entry of calls.values()) {
          const pc = entry.call && entry.call.peerConnection;
          if (pc) pc.getSenders().forEach((s) => { if (s.track && s.track.kind === 'audio') s.replaceTrack(track); });
        }
      }
      v.sync(S);
    };
    v.sync = (state) => {
      if (!peer || !state) return;
      const ids = state.players.map((p) => p.id).filter((id) => id !== net.me);
      for (const id of [...calls.keys()]) if (!ids.includes(id)) v.drop(id);
      for (const id of ids) if (!calls.has(id) && net.me < id) wire(peer.call(id, stream || silentStream()));
      v.applyFilters();
    };
    v.applyFilters = () => {
      const cur = S && S.cur;
      const phoneLine = cur && S.phase === 'call' ? [cur.callerId, cur.victimId] : [];
      for (const [id, e] of calls) {
        if (!e.wet) continue;
        const on = phoneLine.includes(id);
        e.wet.gain.value = on ? 1.6 : 0;
        e.dry.gain.value = on ? 0 : 1;
      }
    };
    v.toggleMute = () => { v.muted = !v.muted; if (stream) stream.getAudioTracks().forEach((t) => { t.enabled = !v.muted; }); };
    v.drop = (id) => { const e = calls.get(id); if (!e) return; try { e.call && e.call.close(); } catch (er) { /* ignore */ } if (e.audio) e.audio.remove(); calls.delete(id); };
    v.stop = () => { for (const id of [...calls.keys()]) v.drop(id); if (stream) stream.getTracks().forEach((t) => t.stop()); v.on = false; };
    v.count = () => [...calls.values()].filter((e) => e.audio).length;
    return v;
  })();
})(window.NR);
