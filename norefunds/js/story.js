// Campaign: 10 days, recurring characters, news about your victims, endings.
(function (NR) {
  'use strict';
  const el = NR.el;
  const BOSS = 'Victor Vance (Boss)';
  const MOM = 'Mom';
  const NADIA = 'n.reyes@protonmail.example';

  function mail(G, from, subj, body, extra = {}) {
    G.mail.push(Object.assign({ id: NR.uid('m') + '_' + G.mail.length, from, subj, body, day: G.day, read: false }, extra));
  }
  function news(G, head, body, section) { G.news.push({ day: G.day, head, body, section, read: false }); }

  // Mail delivered at the start of each day.
  const DAY_MAIL = {
    1(G) {
      mail(G, BOSS, 'Welcome to Totally Legit Solutions', `Welcome aboard, Desk 7.

The rules are simple:
1. Hit your daily quota. Miss it twice and you're gone.
2. You keep ${NR.CUT * 100}% of what you bring in. The rest is "operating costs".
3. Don't get us raided.

Today you have two scripts: Tech Support and SSN Suspension. Open the Phone, pick a lead, read the room.
The Employee Handbook is on your desktop. Read it. Or don't. I only care about the number.

— V.V.`);
      mail(G, MOM, 'proud of you!!', `Sweetie, Nana told the whole church you got a job in "customer service"! She says you were always so good on the phone.

Call her sometime, ok? She gets lonely since Grandpa passed.

Love, Mom ❤️`);
    },
    2(G) {
      mail(G, BOSS, 'New script: Refund Error', `The Refund Error script is live. Get them on AnyDusk, open their bank, "inspect element", add a zero. Then cry. They always pay back the difference.

Also there's a special lead today: a retired teacher named Pemberton. Lives alone. Easy money.`);
    },
    3(G) {
      mail(G, BOSS, 'Card Terminal is live', 'Sweepstakes script is unlocked. They read a card number, you charge it in the Card Terminal. Mind the checksum, the bank flags bad numbers.');
      mail(G, NADIA, 'we need to talk (delete this after)', `It's Nadia. Desk 6. The one with the broken chair.

I'm not who Vance thinks I am. I'm a reporter, and I've spent four months inside this place. I need proof of who's really behind it — the money, the bribes, the accounts.

You have access to the shared drive. I don't.

I'm not asking you to quit. I'm asking you to take three pictures before this is over.

— N.`, { actions: [{ id: 'nadia_in', label: 'I\'m in.' }, { id: 'nadia_out', label: 'Leave me out of this.' }] });
    },
    4(G) {
      mail(G, BOSS, 'Two new scripts', 'Bank Fraud Dept and Grandkid in Jail are unlocked. The grandkid one only works on old folks. Cry a little. Sniffle. Say "please don\'t tell Mom".');
    },
    5(G) {
      mail(G, BOSS, 'The auditors are coming', 'The people I answer to are visiting. Quotas go up. If you\'re a weak link, I will cut you.');
      mail(G, MOM, 'Nana got a weird call', `Nana said someone called her saying her computer had a virus! She hung up, thank God. These scammers are disgusting. People like that should rot in jail.

You'd know about this stuff with your job, right? Can you call her and explain how to stay safe? She trusts you more than anyone.`);
    },
    6(G) {
      mail(G, BOSS, 'Big fish', 'Fresh leads from a "partner". Some of them are in Ocala. Rich retirees. Don\'t be squeamish.');
    },
    7(G) {
      mail(G, 'Det. Ray Okafor — Cyber Crimes', 'We know about Desk 7', `This is Detective Okafor. We've been watching Totally Legit Solutions for a while.

The people at the bottom of these operations always do the most time. The people at the top always walk.

If you have something that changes that, you know who to talk to.`);
    },
    8(G) {
      mail(G, BOSS, 'A returning customer', 'One of your old marks is back in the lead list. Pemberton. Some people never learn.');
    },
    9(G) {
      mail(G, BOSS, 'An offer', `You're good at this. Better than I expected.

The floor manager job is open. You'd run all twelve desks. You'd take a cut of everybody.
All you have to do is tomorrow's quota, and say yes.`, { actions: [{ id: 'promo_yes', label: 'Accept the promotion' }, { id: 'promo_no', label: 'Decline' }] });
    },
    10(G) {
      mail(G, BOSS, 'Last day of the quarter', 'Biggest quota of the year. Nobody goes home until it\'s done.');
      if (G.flags.nadiaIn) {
        mail(G, NADIA, 'tonight', `Tonight is the night. If you have the three files, send them. The story runs tomorrow, and Okafor gets the rest.

You'll walk away with nothing. But you'll walk away.`, { actions: [{ id: 'send', label: 'Send the evidence' }, { id: 'nosend', label: 'Not yet' }] });
      }
    },
  };

  const CONSEQ = ['can no longer afford her blood pressure medication', 'had to cancel a trip to see the grandkids', 'has stopped answering the phone entirely', 'was saving it for a new hearing aid', 'is now behind on rent', 'had been saving it for the funeral', 'had to tell the family, which was the worst part'];
  const QUOTES = ['He sounded so nice. So polite.', 'I feel so stupid.', 'I just wanted to help that young man keep his job.', 'I can\'t sleep anymore.', 'He knew my dog\'s name.', 'I\'m too ashamed to tell my daughter.'];
  const SCAM_NAMES = { tech: 'tech support', gov: 'Social Security', refund: 'refund', prize: 'sweepstakes', bank: 'bank fraud', grandkid: '"grandparent"' };

  NR.story = {
    init(G) {
      if (G.mode !== 'story') { mail(G, BOSS, 'Endless shift', 'No story. No mercy. Quotas keep rising until you break.'); return; }
      DAY_MAIL[1](G);
    },

    dayStart(G) {
      if (G.mode !== 'story' || G.day === 1) return;
      const f = DAY_MAIL[G.day];
      if (f && !G.flags['mail' + G.day]) { G.flags['mail' + G.day] = true; f(G); }
    },

    // Story victims injected into the lead list.
    nextLead(G) {
      if (G.mode !== 'story') return null;
      const add = (key, opts) => {
        if (G.flags[key] || G.leads.some((l) => l.story && l.story.key === key)) return null;
        G.flags[key] = 'queued';
        return NR.makeVictim(opts);
      };
      if (G.day === 2) {
        const v = add('harold', { age: 74, traits: ['elderly', 'lonely', 'polite'], baiter: false, city: 'Dayton, OH', story: { key: 'harold', tag: 'Lives alone', scam: 'tech' } });
        if (v) { v.first = 'Harold'; v.last = 'Pemberton'; v.female = false; v.title = 'Mr. Pemberton'; v.detail = { kind: 'hobby', key: 'chess', text: 'teaching chess at the library' }; v.voice = { pitch: 0.75, rate: 0.85 }; return v; }
      }
      if (G.day === 6) {
        const v = add('nana', { age: 81, traits: ['elderly', 'lonely', 'technophobe'], baiter: false, city: 'Ocala, FL', story: { key: 'nana', tag: 'Ocala lead', scam: 'tech', warn: true } });
        if (v) { v.first = 'Rosa'; v.last = 'Delgado'; v.female = true; v.title = 'Mrs. Delgado'; v.savings = 5200; v.detail = { kind: 'family', key: 'customer service', text: 'my grandchild — the one with the new customer service job' }; v.voice = { pitch: 1.15, rate: 0.8 }; return v; }
      }
      if (G.day === 8 && G.flags.harold === 'scammed') {
        const v = add('harold2', { age: 74, traits: ['elderly', 'skeptic'], baiter: true, city: 'Dayton, OH', story: { key: 'harold2', tag: 'Returning customer', scam: 'tech' } });
        if (v) { v.first = 'Harold'; v.last = 'Pemberton'; v.female = false; v.title = 'Mr. Pemberton'; v.voice = { pitch: 0.75, rate: 0.9 }; return v; }
      }
      return null;
    },

    callEnded(G, c) {
      const s = c.v.story;
      if (s && s.key === 'harold') G.flags.harold = c.outcome === 'paid' ? 'scammed' : 'spared';
      if (s && s.key === 'nana') {
        if (c.outcome === 'paid') { G.flags.nana = 'scammed'; G.conscience += 25; NR.achieve('nomercy', true); }
        else if (c.outcome === 'warned') { G.flags.nana = 'warned'; G.conscience -= 10; }
        else G.flags.nana = 'dropped';
      }
      if (s && s.key === 'harold2' && c.outcome !== 'paid') {
        c.log.push({ who: 'them', text: 'You took eleven hundred dollars from me. I spent a month learning how you people work. Now I waste your time, every day, so you can\'t do it to someone else.', tag: 'tell' });
      }
      if (c.outcome === 'paid' && !c.v.baiter) {
        G.conscience += (c.v.traits.includes('elderly') ? 2 : 1) + (c.v.traits.includes('lonely') ? 1 : 0) + c.amount / 600;
      }
    },

    endOfDay(G, review) {
      // News about today's victims (the press finds about half of them).
      const today = G.victims.filter((v) => v.day === G.day);
      const covered = today.filter((v) => (v.story ? true : NR.chance(0.5))).slice(0, 2);
      for (const v of covered) {
        const role = v.age >= 65 ? NR.pick(['retiree', 'grandmother', 'widow', 'veteran', 'retired teacher']) : NR.pick(['nurse', 'mechanic', 'single parent', 'shop owner']);
        if (v.story && v.story.key === 'harold') {
          news(G, `Retired Dayton teacher loses ${NR.money(v.amount)} in tech support scam`, `Harold Pemberton, 74, taught chess at the public library for 30 years. "I'm a retired schoolteacher, I should have known," he said. "He was so patient with me. He let me talk about my students." Pemberton says he's now determined to "learn everything about how these people work."`);
          continue;
        }
        if (v.story && v.story.key === 'nana') {
          news(G, `Ocala grandmother, 81, loses ${NR.money(v.amount)} — "he knew things only family knows"`, `Rosa Delgado was told her computer was infected. "The voice was so kind," she said. "It reminded me of my grandchild. I almost said their name." Her family has set up a fundraiser.`);
          continue;
        }
        news(G, `${v.age}-year-old ${v.city.split(',')[0]} ${role} loses ${NR.money(v.amount)} to ${SCAM_NAMES[v.scam]} scam`,
          `${v.name} ${NR.pick(CONSEQ)}. "${NR.pick(QUOTES)}" ${NR.pick(NR.TIPS)}`);
      }
      if (G.heat >= 60) news(G, 'Police: phone-scam ring "close to being shut down"', 'The Cyber Crimes unit says several call centers are under surveillance. Detective Ray Okafor: "We are very close."', 'Crime');
      if (G.stats.baitersFell && !G.flags.baiterNews) { G.flags.baiterNews = true; news(G, 'Internet "scambaiter" posts hilarious call with scam center', 'The video, titled "Desk 7 tries to scam a parrot", has 2 million views.', 'Viral'); }
      if (review.grade === 'S') NR.achieve('sgrade', true);
    },

    mailAction(m, id) {
      const G = NR.G;
      if (id === 'nadia_in') { G.flags.nadiaIn = true; NR.toast('📁 Shared Drive unlocked on your desktop.', 'warn'); NR.renderIcons(); }
      if (id === 'nadia_out') G.flags.nadiaIn = false;
      if (id === 'promo_yes') { G.flags.promo = true; NR.toast('Vance: "Good. Now prove it."', 'warn'); }
      if (id === 'promo_no') G.flags.promo = false;
      if (id === 'send') {
        if (G.evidence >= 3) { G.flags.witness = true; NR.toast('📤 Evidence sent. There is no going back now.', 'good'); }
        else { m.done = false; NR.toast(`You only have ${G.evidence}/3 files. Get them from the Shared Drive.`, 'warn'); }
      }
      NR.save(); NR.emit('update');
    },

    // Which ending applies after the review of the last day (or null to continue).
    ending(G, review) {
      if (G.mode === 'story' && review.day >= 10 && G.flags.witness) return 'witness';
      if (review.fired) return 'fired';
      if (G.mode !== 'story' || review.day < 10) return null;
      if (G.flags.promo && review.made) return 'kingpin';
      if (G.heat >= 70) return 'fugitive';
      return 'walkaway';
    },
  };

  NR.on('callEnded', (c) => { if (NR.G) NR.story.callEnded(NR.G, c); });

  // ------------------------------------------------------------ endings text
  NR.ENDINGS = {
    fired: { title: 'FIRED', icon: '📦', text: (G) => `Security walks you out with a cardboard box. ${NR.money(G.cash)} in your pocket. Totally Legit Solutions hires your replacement before you reach the bus stop.` },
    busted: { title: 'BUSTED', icon: '🚔', text: (G) => `The door comes off its hinges. Detective Okafor reads you your rights while Vance's car pulls away from the back exit. The desk workers always do the most time. ${G.victims.length} victims will testify.` },
    witness: { title: 'WITNESS', icon: '📰', text: (G) => `The story runs on the front page: "INSIDE THE SCAM FACTORY". Vance is arrested at the airport with three passports. You testify. You lose everything you made — but for the first time in ten days you sleep through the night.${G.flags.nana === 'warned' ? ' Nana calls to say she\'s proud of you. This time you deserve it.' : ''}` },
    kingpin: { title: 'KINGPIN', icon: '👑', text: (G) => `Floor manager. Twelve desks. A cut of everyone. You made ${NR.money(G.gross)} for the company and the company made you.${G.flags.nana === 'scammed' ? ' At the family fundraiser for Nana, you donate fifty dollars. Nobody suspects a thing. That\'s the worst part.' : ''} The phones never stop ringing.` },
    fugitive: { title: 'FUGITIVE', icon: '🧳', text: (G) => `The heat is too much. You take your ${NR.money(G.cash)} and get on a bus with no destination. Every time a phone rings, you flinch.` },
    walkaway: { title: 'WALK AWAY', icon: '🚪', text: (G) => `You finish the quarter, take your ${NR.money(G.cash)}, and never come back. You're not caught. You're not proud. You change your number. Sometimes you read the news and look for names you remember.` },
  };

  // ------------------------------------------------------------ Shared Drive
  const FILES = [
    { id: 'ledger', day: 3, name: 'ledger_REAL.xlsx', desc: 'The real books: every desk, every victim, every dollar — and where it goes.' },
    { id: 'bribes', day: 5, name: 'Re: Re: "donations".eml', desc: 'Vance paying a police captain to look away.' },
    { id: 'offshore', day: 7, name: 'accounts_cayman.pdf', desc: 'Offshore accounts in the name of Vance\'s "investors".' },
  ];
  NR.registerApp('drive', {
    title: 'Shared Drive', icon: '📁', w: 520, h: 360, live: true,
    hideLocked: true, locked: () => !(NR.G && NR.G.flags.nadiaIn), lockedMsg: 'Access denied.',
    render(body) {
      const G = NR.G;
      G.flags.files = G.flags.files || {};
      body.replaceChildren(el('h3', '📁 \\\\TLS-SERVER\\boss\\private'),
        el('p.muted', `Evidence collected: ${G.evidence}/3. Each screenshot raises heat, and Vance sometimes walks by…`),
        el('table.list', ...FILES.map((f) => el('tr', el('td', '📄 ' + (G.day >= f.day ? f.name : '(locked until day ' + f.day + ')')), el('td.muted', G.day >= f.day ? f.desc : ''),
          el('td', G.flags.files[f.id] ? el('span.tag.good', 'captured') : el('button', { disabled: G.day < f.day || !G.clockedIn, onclick: () => {
            if (NR.chance(0.25)) {
              G.heat += 6;
              NR.toast('👀 Vance walks past your desk. You alt-tab just in time. (Heat +6, try again)', 'bad');
            } else {
              G.flags.files[f.id] = true; G.evidence++; G.heat += 4;
              NR.toast(`📸 Captured ${f.name} (${G.evidence}/3)`, 'good');
            }
            NR.save(); NR.emit('update'); NR.refreshApp('drive');
          } }, '📸 Screenshot'))))));
    },
  });
})(window.NR);
