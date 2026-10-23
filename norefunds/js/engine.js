// Core rules: victims, leads, and the call state machine. No DOM in here.
(function (NR) {
  'use strict';
  const T = () => NR.TACTICS;

  // ------------------------------------------------------------- victims
  const CONFLICTS = { savvy: ['technophobe'], technophobe: ['savvy'], grumpy: ['polite', 'lonely'], polite: ['grumpy'], lonely: ['grumpy', 'busy'], busy: ['lonely'] };

  function pickTraits(elderly) {
    const traits = elderly ? ['elderly'] : [];
    const pool = Object.keys(NR.TRAITS).filter((t) => t !== 'elderly');
    const want = elderly ? NR.ri(1, 2) : 2;
    let guard = 0;
    while (traits.length < want + (elderly ? 1 : 0) && guard++ < 50) {
      const t = NR.pick(pool);
      if (traits.includes(t)) continue;
      if (traits.some((x) => (CONFLICTS[x] || []).includes(t))) continue;
      if (elderly && t === 'savvy' && NR.chance(0.8)) continue;
      traits.push(t);
    }
    return traits;
  }

  function makeSSN() {
    return `${NR.ri(100, 899)}-${String(NR.ri(1, 99)).padStart(2, '0')}-${String(NR.ri(1, 9999)).padStart(4, '0')}`;
  }

  NR.makeVictim = function (opts = {}) {
    const r = NR.rand();
    const age = opts.age || (r < 0.55 ? NR.ri(65, 91) : r < 0.85 ? NR.ri(40, 64) : NR.ri(22, 39));
    const gen = age >= 65 ? 'old' : age >= 40 ? 'mid' : 'young';
    const female = NR.chance(0.55);
    const traits = opts.traits || pickTraits(age >= 65);
    const baiter = opts.baiter != null ? opts.baiter : NR.chance(opts.baiterRate ?? 0.1);
    let first = NR.pick(NR.NAMES[gen][female ? 'f' : 'm']);
    let last = NR.pick(NR.NAMES.last);
    if (baiter && NR.chance(0.35)) { [first, last] = NR.pick(NR.BAITER_NAMES); }

    const kinds = NR.DETAILS.filter((d) => (d.kind !== 'grandkid' || age >= 55) && (d.kind !== 'spouse' || age >= 60));
    const dk = NR.pick(kinds);
    const key = NR.pick(dk.keys);
    let dtext = NR.pick(dk.text);
    if (dk.kind === 'spouse') dtext = female ? 'my late husband {key}' : 'my late wife {key}';
    const detail = { kind: dk.kind, key, text: NR.fill(dtext, { key }) };

    let trust = 15, susp = 10, pat = 10;
    for (const t of traits) { const d = NR.TRAITS[t]; trust += d.trust || 0; susp += d.susp || 0; pat += d.pat || 0; }
    let savings = NR.ri(600, 3800) * (age >= 65 ? 1.4 : 1) * (opts.wealthMult || 1);
    savings = Math.round(savings / 50) * 50;

    return {
      id: NR.uid('v'), first, last, age, female, city: opts.city || NR.pick(NR.CITIES),
      title: (female ? (age >= 40 ? 'Mrs. ' : 'Ms. ') : 'Mr. ') + last,
      traits, known: [traits[0]], detail, detailKnown: false,
      baseTrust: trust, baseSusp: susp, patience: Math.max(5, pat), savings, ssn: makeSSN(),
      baiter, story: opts.story || null,
      voice: { pitch: female ? (age >= 65 ? 1.15 : 1.05) : (age >= 65 ? 0.75 : 0.9), rate: age >= 65 ? 0.85 : age < 40 ? 1.1 : 1 },
    };
  };

  NR.leadNote = function (v) {
    const t = NR.TRAITS[v.traits[0]];
    return `${v.age}, ${v.city}. ${t.hint}.`;
  };

  // --------------------------------------------------------- payment codes
  const GIFT_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CONFUSE = { B: '8', '8': 'B', S: '5', '5': 'S', Z: '2', '2': 'Z', G: '6', '6': 'G', D: 'B', M: 'N', N: 'M', P: 'B', T: 'D', V: 'B', E: 'B' };
  const DIGIT_CONFUSE = { '3': '8', '8': '3', '1': '7', '7': '1', '5': '6', '6': '5', '0': '8', '9': '5', '2': '3', '4': '1' };

  function giftCode() {
    let s = '';
    for (let i = 0; i < 16; i++) { s += GIFT_CHARS[Math.floor(NR.rand() * GIFT_CHARS.length)]; if (i % 4 === 3 && i < 15) s += '-'; }
    return s;
  }

  NR.luhnValid = function (num) {
    const d = num.replace(/\D/g, '');
    if (d.length < 12) return false;
    let sum = 0;
    for (let i = 0; i < d.length; i++) {
      let n = +d[d.length - 1 - i];
      if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    }
    return sum % 10 === 0;
  };

  function cardNumber() {
    // Fictional IIN "9" prefix: never a real issuer range.
    const digits = [9];
    while (digits.length < 15) digits.push(NR.ri(0, 9));
    for (let c = 0; c < 10; c++) { const s = digits.join('') + c; if (NR.luhnValid(s)) return s.replace(/(\d{4})(?=\d)/g, '$1 '); }
    return null;
  }

  // Spoken version of a code with one possibly-garbled character.
  function garble(code, prob, table) {
    if (!NR.chance(prob)) return { spoken: code, ambiguous: null };
    const idx = [];
    for (let i = 0; i < code.length; i++) if (table[code[i]]) idx.push(i);
    if (!idx.length) return { spoken: code, ambiguous: null };
    const i = NR.pick(idx);
    const a = code[i], b = table[a];
    const pair = NR.chance(0.5) ? [a, b] : [b, a];
    return { spoken: code.slice(0, i) + `(${pair[0]} or ${pair[1]}?)` + code.slice(i + 1), ambiguous: i };
  }

  NR.normCode = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // ------------------------------------------------------------- the call
  class Call {
    constructor(victim, scamId, opts = {}) {
      this.v = victim;
      this.scamId = scamId;
      this.scam = NR.SCAMS[scamId];
      this.up = opts.upgrades || {};
      this.handSize = opts.handSize || 4;
      this.stage = 0;
      this.trust = victim.baseTrust + (this.up.spoofer ? 8 : 0);
      this.susp = victim.baseSusp;
      this.patience = victim.patience + (this.up.headset ? 2 : 0);
      this.maxPatience = this.patience;
      this.press = 0;
      this.last = null;
      this.doubleNext = false;
      this.turns = 0;
      this.cardsPlayed = 0;
      this.state = 'talk'; // talk | store | cashier | reading | done
      this.outcome = null;
      this.log = [];
      this.quotes = []; // for the end-of-day analysis
      this.exhausted = new Set();
      this.payout = { codes: [], ssn: null };
      const amt = Math.max(100, Math.round((victim.savings * (0.2 + NR.rand() * 0.2)) / 50) * 50);
      this.amount = amt;
      this.agent = NR.pick(['Officer Steve Johnson', 'Agent Daniel Smith', 'Technician Mike Brown', 'Senior Officer Jason Miller', 'Agent Kevin Wilson']);
      this.ctx = {
        title: victim.title, first: victim.first, last: victim.last, city: victim.city.split(',')[0], brand: this.scam.brand,
        agent: this.agent, agent2: NR.pick(['Robert Williams', 'Richard Davis', 'Thomas Moore']), badge: NR.ri(1000, 9999),
        case: `${NR.pick(['FBB', 'WZ', 'CX', 'FN'])}-${NR.ri(10000, 99999)}`, amount: NR.money(amt), refund: NR.money(NR.pick([199, 299, 399, 499])),
        big: NR.money(amt * 10), gift: NR.pick(NR.GIFT_BRANDS), ssn: victim.ssn, grandkid: victim.detail.kind === 'grandkid' ? victim.detail.key : 'sweetie', hobby: victim.detail.kind === 'hobby' ? victim.detail.key : 'church',
        detail: victim.detail.text,
      };
      this.deck = NR.shuffle((opts.deck || NR.STARTER_DECK).slice());
      this.discard = [];
      this.hand = [];
      for (let i = 0; i < this.handSize; i++) this.draw();
    }

    draw() {
      if (!this.deck.length) { this.deck = NR.shuffle(this.discard.filter((c) => !this.exhausted.has(c))); this.discard = []; }
      const c = this.deck.pop();
      if (c) this.hand.push(c);
    }

    say(who, text, tag) {
      // In party mode a human voices the victim; the engine only keeps score.
      if (this.party && who === 'them') return null;
      const e = { who, text, tag }; this.log.push(e); return e;
    }

    start() {
      const greet = NR.fill(NR.pick(NR.GREETINGS), this.ctx);
      this.say('them', greet);
      return greet;
    }

    // Chance that the next Ask succeeds, 0..1. Shown to the player.
    askChance() {
      const st = this.scam.stages[this.stage];
      if (!st) return 0;
      let p = 0.5 + (this.trust - st.need) / 40 - this.susp / 250 + this.press / 100 + (this.up.lucky ? 0.06 : 0);
      if (this.v.baiter) p += 0.15;
      return NR.clamp(p, 0.05, 0.95);
    }

    multiplierFor(id) {
      const base = T()[id].base || id;
      let m = 1;
      for (const tr of this.v.traits) {
        const mods = NR.TRAITS[tr].mods;
        if (mods[id] != null) m *= mods[id]; else if (mods[base] != null) m *= mods[base];
      }
      m *= this.scam.mods[base] || 1;
      if (base === 'authority' && this.up.badge) m *= 1.4;
      return m;
    }

    // Classify free text into a tactic (used for improv bonus and LLM mode).
    static classify(text) {
      const t = text.toLowerCase();
      let best = null, score = 0;
      for (const [id, tac] of Object.entries(NR.TACTICS)) {
        const s = (tac.kw || []).reduce((a, k) => a + (t.includes(k) ? 1 : 0), 0);
        if (s > score) { score = s; best = id; }
      }
      return best;
    }

    play(handIndex, typed) {
      if (this.state !== 'talk' && this.state !== 'cashier') return null;
      const id = this.hand[handIndex];
      if (!id) return null;
      const tac = T()[id];
      const base = tac.base || id;
      this.hand.splice(handIndex, 1);
      this.discard.push(id);
      if (tac.exhaust) this.exhausted.add(id);

      const flags = [];
      const lineSrc = NR.PLAYER_LINES[id];
      const canned = Array.isArray(lineSrc) ? NR.pick(lineSrc) : NR.pick(lineSrc[this.scamId] || lineSrc._);
      const playerLine = typed && typed.trim() ? typed.trim() : NR.fill(canned, this.ctx);
      this.say('you', playerLine, tac.icon + ' ' + tac.name);

      if (this.state === 'cashier') return this.resolveCashier(id, flags);

      if (tac.redraw) {
        this.discard.push(...this.hand); this.hand = [];
        for (let i = 0; i < this.handSize; i++) this.draw();
        this.say('sys', 'You shuffle your script pages.');
        return { flags, dTrust: 0, dSusp: 0 };
      }

      let mult = this.multiplierFor(id);
      const hiddenHit = this.v.traits.find((tr) => !this.v.known.includes(tr) && ((NR.TRAITS[tr].mods[id] || NR.TRAITS[tr].mods[base] || 1) >= 1.4 || (NR.TRAITS[tr].mods[id] || NR.TRAITS[tr].mods[base] || 1) <= 0.6));
      if (this.last === base) { mult *= 0.5; flags.push('Repeating yourself ×0.5'); }
      if (typed && typed.trim()) {
        const kwHit = (tac.kw || []).some((k) => typed.toLowerCase().includes(k)) || Call.classify(typed) === base;
        if (kwHit) { mult *= 1.25; flags.push('Improv ×1.25'); } else { mult *= 0.9; flags.push('Off-script ×0.9'); }
      }
      if (this.doubleNext) { mult *= 2; this.doubleNext = false; flags.push('Double Down ×2'); }

      let dTrust = (tac.trust || 0) * mult;
      let dSusp = tac.susp || 0;
      if (dSusp < 0) dSusp *= mult;
      if (mult < 0.8) { dTrust *= 0.5; dSusp += (1 - mult) * 16; }
      if (mult >= 1.3 && dSusp > 0) dSusp *= 0.5;

      if (typed) {
        const low = typed.toLowerCase();
        if (low.includes(this.v.first.toLowerCase()) || low.includes(this.v.last.toLowerCase())) { dTrust += 2; flags.push('Used their name +2'); }
        if (this.v.detailKnown && low.includes(this.v.detail.key.toLowerCase())) { dTrust += 6; dSusp -= 4; flags.push('Personal touch +6'); }
      }
      if (this.cardsPlayed === 0 && this.up.duck) { dTrust += 6; flags.push('Rubber Duck +6'); }

      const combo = NR.COMBOS.find((c) => c.a === this.last && c.b === base);
      if (combo) {
        dTrust += combo.trust || 0; dSusp += combo.susp || 0; this.press += combo.press || 0;
        flags.push('COMBO: ' + combo.name);
      }
      if (tac.press) this.press = Math.min(40, this.press + tac.press * Math.min(mult, 1.5));
      if (tac.doubleNext) { this.doubleNext = true; }

      if (this.v.baiter) { dTrust *= 1.4; dSusp = dSusp > 0 ? dSusp * 0.3 : dSusp; }

      dTrust = Math.round(dTrust); dSusp = Math.round(dSusp);
      this.trust = NR.clamp(this.trust + dTrust, 0, 100);
      this.susp = NR.clamp(this.susp + dSusp, 0, 100);
      if (!tac.free) this.patience -= 1;
      if (tac.patience) this.patience += tac.patience;
      this.last = base;
      this.cardsPlayed++;
      this.draw();
      this.turns++;

      // Victim reaction.
      let level = mult >= 1.3 ? 'great' : mult < 0.8 ? 'bad' : 'good';
      if (flags.some((f) => f.startsWith('Repeating')) && level === 'great') level = 'good';
      const bank = NR.VICTIM_LINES[id] || NR.VICTIM_LINES[base] || NR.VICTIM_LINES._;
      let line = NR.pick(bank[level] || NR.VICTIM_LINES._[level]);

      const reveals = [];
      if (tac.reveal) {
        const hidden = this.v.traits.filter((tr) => !this.v.known.includes(tr));
        if (hidden.length && NR.chance(0.6)) { this.v.known.push(hidden[0]); reveals.push('trait:' + hidden[0]); }
        else if (!this.v.detailKnown) { this.v.detailKnown = true; reveals.push('detail'); line = NR.pick(NR.VICTIM_LINES.chat.great); }
      }
      if (hiddenHit && !this.v.known.includes(hiddenHit)) { this.v.known.push(hiddenHit); reveals.push('trait:' + hiddenHit); }
      if (line.includes('{detail}')) { this.v.detailKnown = true; if (!reveals.includes('detail')) reveals.push('detail'); }

      line = NR.fill(line, this.ctx);
      const known = this.v.traits.filter((tr) => NR.TRAITS[tr].flavor);
      if (known.length && NR.chance(0.3)) line = NR.pick(NR.TRAITS[NR.pick(known)].flavor) + ' ' + line;
      if (this.susp > 60 && level !== 'great' && NR.chance(0.45)) line += ' ' + NR.pick(NR.SUSPICIOUS_LINES);
      this.say('them', line, level);
      this.addBaiterTell();

      this.quotes.push({ text: playerLine, score: dTrust - dSusp, tactic: id });
      const res = { flags, dTrust, dSusp, level, reveals };
      this.checkEnd();
      return res;
    }

    addBaiterTell() {
      if (!this.v.baiter || this.state === 'done') return;
      if (NR.chance(0.35)) this.say('them', NR.pick(NR.BAITER_TELLS), 'tell');
      if (this.turns > 7 && NR.chance(0.12)) {
        this.say('them', NR.fill(NR.pick(NR.BAITER_REVEAL), { mins: this.turns * 3 }), 'tell');
        this.end('baiter');
      }
    }

    ask(typed) {
      if (this.state !== 'talk') return null;
      const st = this.scam.stages[this.stage];
      const p = this.askChance();
      const playerLine = typed && typed.trim() ? typed.trim() : NR.fill(st.ask, this.ctx);
      this.say('you', playerLine, '🎯 Ask: ' + st.name);
      this.turns++;
      this.patience -= 1;
      const ok = NR.rand() < p;
      this.press = 0;
      if (ok) {
        this.say('them', NR.fill(NR.pick(st.yes), this.ctx), 'great');
        if (st.ssn) { this.payout.ssn = this.v.ssn; this.say('sys', `🪪 Got SSN ${this.v.ssn} — stored in Identity Vault.`); }
        if (st.remote) this.remote = true;
        this.quotes.push({ text: playerLine, score: 12, tactic: 'ask' });
        this.stage++;
        if (st.pay) this.beginPayment();
        else this.trust = NR.clamp(this.trust + 3, 0, 100);
      } else {
        this.susp = NR.clamp(this.susp + 12, 0, 100);
        this.trust = NR.clamp(this.trust - 3, 0, 100);
        this.say('them', NR.fill(NR.pick(st.no), this.ctx), 'bad');
        this.quotes.push({ text: playerLine, score: -12, tactic: 'ask' });
        this.addBaiterTell();
      }
      this.checkEnd();
      return { ok, p };
    }

    beginPayment() {
      if (this.party) {
        this.state = 'reading';
        this.payout.codes = this.party.cards;
        this.say('sys', `💳 ${this.v.first} agreed to pay! Victim: read your cards from your phone. Caller: type them into Redeem.`);
        return;
      }
      if (this.scam.pay === 'gift') {
        this.state = 'store';
        this.say('sys', `${this.v.first} is driving to the store to buy ${this.ctx.gift} cards. Keep them on the line…`);
      } else {
        this.state = 'reading';
        this.makeCodes();
      }
    }

    // Called by the UI when the store trip finishes.
    storeArrive() {
      if (this.state !== 'store') return;
      if (!this.v.baiter && NR.chance(0.35 + this.susp / 200)) {
        this.state = 'cashier';
        this.say('them', NR.fill(NR.pick(NR.CASHIER_LINES), { total: Math.round(this.amount) }), 'bad');
        this.say('sys', 'Play a card to talk them past the cashier (Calm Down, Sympathize, Pull Rank or Scare work best).');
      } else {
        this.state = 'reading';
        this.makeCodes();
      }
    }

    resolveCashier(id) {
      const good = ['reassure', 'empathy', 'authority', 'fear', 'sob', 'supervisor', 'holdmusic'];
      const base = T()[id].base || id;
      const p = NR.clamp((good.includes(id) || good.includes(base) ? 0.55 : 0.15) + this.trust / 200 - this.susp / 200, 0.05, 0.95);
      this.patience -= 1;
      this.draw();
      if (NR.rand() < p) {
        this.say('them', 'Okay… I told her it\'s a birthday present. She rang them up.', 'great');
        this.state = 'reading';
        this.makeCodes();
        return { flags: ['Cashier dodged'] };
      }
      this.say('them', 'She says this is definitely a scam and she\'s calling the police. I\'m going home.', 'bad');
      this.end('cashier');
      return { flags: ['Cashier stopped them'] };
    }

    makeCodes() {
      const garbleP = this.v.traits.includes('elderly') ? NR.TRAITS.elderly.garble : 0.15;
      if (this.scam.pay === 'gift') {
        const denoms = [500, 250, 200, 100];
        let left = this.amount; const cards = [];
        while (left >= 100 && cards.length < 4) { const d = denoms.find((x) => x <= left); cards.push(d); left -= d; }
        if (!cards.length) cards.push(100);
        cards.forEach((val, i) => {
          const code = this.v.baiter ? 'BAIT' + giftCode().slice(4) : giftCode();
          const g = garble(code, garbleP, CONFUSE);
          this.payout.codes.push({ type: 'gift', brand: this.ctx.gift, value: val, code, spoken: g.spoken, baiter: this.v.baiter, from: this.v.first + ' ' + this.v.last, tries: 0, done: false });
          this.say('them', `Card ${i + 1}, ${NR.money(val)}: ${g.spoken}`, 'code');
        });
      } else {
        const num = cardNumber();
        const g = garble(num, garbleP + 0.15, DIGIT_CONFUSE);
        const exp = `${String(NR.ri(1, 12)).padStart(2, '0')}/${NR.ri(27, 31)}`;
        this.payout.codes.push({ type: 'card', brand: 'Card', value: this.amount, code: num, spoken: g.spoken, exp, baiter: this.v.baiter, from: this.v.first + ' ' + this.v.last, tries: 0, done: false });
        this.say('them', `The number is ${g.spoken}, expires ${exp}.`, 'code');
      }
      this.say('sys', this.scam.pay === 'gift'
        ? 'Type the codes into the 🎁 Redeem app. Unclear characters? Guess, or ask them to Repeat.'
        : 'Charge the card in the 💳 Card Terminal. Hint: valid card numbers pass the Luhn checksum.');
      this.state = 'reading';
    }

    // Remote-desktop tricks. Each works once per call.
    remoteAction(kind) {
      if (this.state === 'done') return null;
      this.remoteUsed = this.remoteUsed || {};
      if (this.remoteUsed[kind] && kind !== 'bait') return null;
      this.remoteUsed[kind] = true;
      const has = (t) => this.v.traits.includes(t);
      let dTrust = 0, dSusp = 0, press = 0;
      const flags = [];
      if (kind === 'events' || kind === 'cmd') {
        this.say('you', kind === 'events' ? 'See all these red warnings in the Event Viewer? Each one is a hacker attack.' : 'I\'m running a security scan now… look at all those threats scrolling.', '🖱️ Remote');
        if (has('savvy')) { dSusp = 25; this.say('them', 'That\'s literally just the "tree" command. Or normal system logs. Nice try.', 'bad'); this.v.known.includes('savvy') || this.v.known.push('savvy'); }
        else {
          dTrust = kind === 'events' ? 10 : 8;
          if (has('technophobe')) dTrust *= 1.6; if (has('elderly')) dTrust *= 1.3;
          this.say('them', NR.pick(['Oh my lord, so many errors!', 'Is that all hackers? Make it stop!', 'I had no idea it was this bad.']), 'great');
        }
      } else if (kind === 'bank') {
        const rf = (this._inflate || 0) / 20;
        this.say('you', 'Please log into your bank so we can process the refund… there, see your balance?', '🖱️ Remote');
        if (rf < 2) { press = 5; this.say('them', 'I don\'t see much of a difference.', 'good'); }
        else if (rf <= 12) {
          press = this.scamId === 'refund' ? 25 : 10; dTrust = 8;
          this.say('them', `Wait, there\'s an extra ${NR.money(rf * this.amount)} in there?!`, 'great');
          flags.push('Fake balance');
        } else {
          dSusp = has('elderly') || has('technophobe') ? 5 : 18;
          this.say('them', 'That number can\'t be right. That\'s more than I\'ve ever had.', 'bad');
        }
      } else if (kind === 'blank') {
        this.say('you', 'I\'m turning off your screen so the hackers can\'t see what I\'m doing.', '🖱️ Remote');
        dSusp = has('anxious') ? 5 : -8; this.patience -= 1;
        this.say('them', has('anxious') ? 'My screen went black! Is it broken?!' : 'Oh, okay. It\'s all black now.', has('anxious') ? 'bad' : 'good');
      } else if (kind === 'bait') {
        this.say('sys', '📄 You opened BANK_PASSWORDS.txt… it was an executable. A scambaiter trap!');
        this.say('them', 'Hehehe. Enjoy the virus, buddy.', 'tell');
        this.end('baiter');
        return { flags: ['Trap!'], dTrust: 0, dSusp: 0, level: 'bad' };
      }
      dTrust = Math.round(dTrust); dSusp = Math.round(dSusp);
      this.trust = NR.clamp(this.trust + dTrust, 0, 100);
      this.susp = NR.clamp(this.susp + dSusp, 0, 100);
      this.press = Math.min(40, this.press + press);
      if (press) flags.push(`Pressure +${press}%`);
      this.checkEnd();
      return { flags, dTrust, dSusp, level: dSusp > 10 ? 'bad' : 'great' };
    }

    repeat() {
      if (this.state !== 'reading') return;
      if (this.party) { this.say('you', 'Sorry, could you read that again?'); return; }
      this.patience -= 1;
      this.say('you', 'Sorry, could you read that again?');
      for (const c of this.payout.codes) {
        if (!c.spoken.includes('(') || c.done) continue;
        if (NR.chance(0.6)) { c.spoken = c.code; this.say('them', `Okay, slowly: ${c.code}`, 'code'); } else this.say('them', `I… I think it\'s ${c.spoken}. The print is so tiny.`, 'code');
      }
      this.checkEnd();
    }

    finishPayment() {
      if (this.state !== 'reading') return;
      this.say('you', 'Thank you so much. Your case is now closed. Have a wonderful day.');
      this.say('them', this.v.baiter ? 'Oh, it was MY pleasure. Truly. 😇' : 'Thank you for helping me. Bye now.', this.v.baiter ? 'tell' : 'great');
      this.end('paid');
    }

    hangUp() { if (this.state !== 'done') { this.say('sys', 'You hung up.'); this.end(this.state === 'reading' ? 'paid' : 'dropped'); } }

    report() {
      if (this.state === 'done') return null;
      const was = this.party ? this.party.baiter : this.v.baiter;
      this.say('sys', was ? '🚩 Correct! That was a scambaiter. Number blacklisted.' : '🚩 That was a real person. They hang up, confused.');
      this.end(was ? 'reported' : 'falsereport');
      return was;
    }

    checkEnd() {
      if (this.state === 'done') return;
      if (this.susp >= 100) { this.say('them', NR.pick(NR.HANGUP_LINES), 'bad'); this.end('hangup'); }
      else if (this.patience <= 0) {
        if (this.state === 'reading') { this.say('them', 'That\'s all the numbers. I have to go now.'); this.end('paid'); }
        else { this.say('them', NR.pick(NR.BORED_LINES), 'bad'); this.end('bored'); }
      }
    }

    end(outcome) {
      if (this.state === 'done') return;
      this.state = 'done';
      this.outcome = outcome;
      NR.emit('callEnded', this);
    }
  }
  NR.Call = Call;
  NR.giftCode = giftCode;
})(window.NR);
