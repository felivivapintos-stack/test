// All game content: tactics, traits, scams, lines, upgrades, story.
// Brands are fictional parodies. Modders: everything here is plain data.
(function (NR) {
  'use strict';

  // ---------------------------------------------------------------- tactics
  // trust/susp: base deltas. press: bonus to the next Ask. kw: keywords that
  // make a typed line count as this tactic (improv bonus).
  NR.TACTICS = {
    chat: { name: 'Chit-Chat', icon: '☕', trust: 4, susp: -3, reveal: true, desc: 'Small talk. May reveal a hidden trait or a personal detail.',
      kw: ['weather', 'how are you', 'family', 'day', 'nice', 'hobby', 'kids', 'grand', 'dog', 'cat', 'weekend', 'lovely'] },
    empathy: { name: 'Sympathize', icon: '🤝', trust: 7, susp: -4, desc: 'Show you care. Lowers guard.',
      kw: ['understand', 'sorry', 'i know', 'feel', 'worry', 'help you', 'here for you', 'difficult', 'hard'] },
    authority: { name: 'Pull Rank', icon: '🎖️', trust: 10, susp: 4, desc: 'Titles, badge numbers, official tone.',
      kw: ['officer', 'agent', 'badge', 'official', 'department', 'senior', 'certified', 'federal', 'supervisor', 'id number', 'licensed'] },
    fear: { name: 'Scare', icon: '😱', trust: 8, susp: 6, press: 10, desc: 'Threats and danger. Big push, big risk.',
      kw: ['arrest', 'warrant', 'hacker', 'virus', 'police', 'lose', 'danger', 'stolen', 'jail', 'frozen', 'lawsuit', 'compromised'] },
    urgency: { name: 'Rush', icon: '⏰', trust: 3, susp: 5, press: 15, desc: 'No time to think. Boosts your next Ask.',
      kw: ['now', 'today', 'immediately', 'hurry', 'quick', 'minutes', 'right away', 'deadline', 'urgent', 'before'] },
    jargon: { name: 'Techno-babble', icon: '💻', trust: 9, susp: 3, desc: 'Confuse them with tech words.',
      kw: ['ip', 'server', 'firewall', 'protocol', 'network', 'trojan', 'malware', 'router', 'encryption', 'system32', 'registry'] },
    reassure: { name: 'Calm Down', icon: '😌', trust: 2, susp: -10, desc: 'Defuse suspicion.',
      kw: ['relax', 'calm', 'safe', 'don\'t worry', 'no problem', 'normal', 'protected', 'guarantee', 'trust'] },
    flattery: { name: 'Butter Up', icon: '🧈', trust: 6, susp: 0, desc: 'Compliments work on the right ego.',
      kw: ['smart', 'clever', 'sharp', 'young', 'impressive', 'best', 'valued', 'special', 'great'] },
    prize: { name: 'Dangle Prize', icon: '🎁', trust: 8, susp: 3, desc: 'Money for nothing. Greedy folks bite.',
      kw: ['won', 'winner', 'prize', 'reward', 'refund', 'bonus', 'free', 'million', 'cash', 'check'] },
    proof: { name: 'Fake Proof', icon: '📄', trust: 12, susp: -3, desc: 'Case numbers and "evidence". Works on skeptics.',
      kw: ['case number', 'reference', 'record', 'file', 'document', 'confirm', 'verify', 'look it up', 'proof'] },
    // Shop-only specials
    supervisor: { name: 'Fake Supervisor', icon: '👔', trust: 15, susp: -6, exhaust: true, special: true, desc: 'Hand the call to "your manager". Once per call.', kw: ['manager', 'supervisor'] },
    holdmusic: { name: 'Hold Music', icon: '🎶', trust: 0, susp: -18, patience: -2, special: true, desc: 'Greensleeves heals all wounds. Costs patience.', kw: [] },
    sob: { name: 'Sob Story', icon: '😢', trust: 13, susp: -2, special: true, base: 'empathy', desc: 'Counts as Sympathize. Huge on soft hearts.', kw: ['my mother', 'my family', 'fired', 'please'] },
    double: { name: 'Double Down', icon: '✖️', trust: 0, susp: 2, special: true, doubleNext: true, desc: 'Your next card hits twice as hard.', kw: [] },
    redraw: { name: 'Shuffle Script', icon: '🔀', trust: 0, susp: 0, special: true, free: true, redraw: true, desc: 'Free: discard your hand, draw fresh.', kw: [] },
  };

  NR.STARTER_DECK = ['chat', 'chat', 'empathy', 'empathy', 'authority', 'authority', 'fear', 'urgency', 'urgency', 'jargon', 'reassure', 'reassure', 'proof'];

  // Combos: previous tactic -> current tactic.
  NR.COMBOS = [
    { a: 'fear', b: 'reassure', name: 'Good Cop / Bad Cop', trust: 8, susp: -4 },
    { a: 'chat', b: 'empathy', name: 'Rapport', trust: 6, susp: -2 },
    { a: 'authority', b: 'urgency', name: 'Pressure Cooker', press: 15 },
    { a: 'jargon', b: 'proof', name: 'Blinded by Science', trust: 8 },
    { a: 'flattery', b: 'prize', name: 'You Deserve This', trust: 8 },
    { a: 'proof', b: 'fear', name: 'Paper Trail', press: 12 },
  ];

  // ---------------------------------------------------------------- traits
  NR.TRAITS = {
    elderly: { label: 'Elderly', trust: 10, pat: 2, garble: 0.45, mods: { authority: 1.4, jargon: 1.4, fear: 1.2, chat: 1.3 },
      hint: 'Retired', reveal: 'is retired and a little hard of hearing', flavor: ['Oh my.', 'Speak up, dear.', 'Goodness.', 'Hold on, my hearing aid…'] },
    lonely: { label: 'Lonely', trust: 5, pat: 5, mods: { chat: 1.8, empathy: 1.8, sob: 1.5, urgency: 0.8 },
      hint: 'Lives alone', reveal: 'is lonely and loves having someone to talk to', flavor: ['It\'s nice to talk to someone.', 'Nobody calls anymore.'] },
    anxious: { label: 'Anxious', mods: { fear: 1.7, urgency: 1.4, reassure: 1.5, holdmusic: 1.3 },
      hint: 'Nervous type', reveal: 'panics easily', flavor: ['Oh no, oh no.', 'My heart is racing.'] },
    skeptic: { label: 'Skeptical', trust: -5, susp: 15, mods: { authority: 0.5, urgency: 0.5, fear: 0.6, proof: 1.7, prize: 0.5 },
      hint: 'Reads the fine print', reveal: 'doesn\'t trust anyone without proof', flavor: ['Hmm.', 'Says who?'] },
    savvy: { label: 'Tech-Savvy', susp: 10, mods: { jargon: 0.2, proof: 0.7 },
      hint: 'Works in IT', reveal: 'actually knows computers', flavor: ['Right…', 'That\'s not how that works.'] },
    technophobe: { label: 'Technophobe', mods: { jargon: 1.7, fear: 1.2 },
      hint: 'Hates computers', reveal: 'is terrified of computers', flavor: ['I don\'t understand these machines.', 'Is it the internet again?'] },
    greedy: { label: 'Greedy', mods: { prize: 1.9, flattery: 1.3 },
      hint: 'Enters every sweepstakes', reveal: 'can\'t resist free money', flavor: ['How much, exactly?', 'Ooh.'] },
    busy: { label: 'Busy', pat: -4, mods: { chat: 0.4, urgency: 1.4, empathy: 0.7, holdmusic: 0.5 },
      hint: 'Always in a hurry', reveal: 'has zero patience', flavor: ['Make it quick.', 'I have a meeting.'] },
    vain: { label: 'Vain', mods: { flattery: 1.8, chat: 1.1 },
      hint: 'Former pageant queen', reveal: 'loves compliments', flavor: ['Well, I do try.', 'People often say that.'] },
    obedient: { label: 'Rule-Follower', mods: { authority: 1.7, fear: 1.2, proof: 1.2 },
      hint: 'Retired civil servant', reveal: 'always does what officials say', flavor: ['Of course, officer.', 'Whatever is required.'] },
    grumpy: { label: 'Grumpy', trust: -10, mods: { flattery: 0.5, chat: 0.6, authority: 1.2, empathy: 0.7 },
      hint: 'Complains a lot', reveal: 'hates small talk', flavor: ['Hmph.', 'Get to the point.'] },
    polite: { label: 'Polite', pat: 3, mods: { empathy: 1.2, reassure: 1.2 },
      hint: 'Very nice person', reveal: 'is too polite to hang up', flavor: ['Oh, I\'m sorry.', 'Thank you so much.'] },
  };

  // ---------------------------------------------------------------- people
  NR.NAMES = {
    old: { f: ['Dorothy', 'Margaret', 'Gloria', 'Betty', 'Shirley', 'Mildred', 'Agnes', 'Doris', 'Edith', 'Phyllis', 'Rosa', 'Irene', 'Lorraine'],
      m: ['Harold', 'Walter', 'Eugene', 'Frank', 'Earl', 'Herbert', 'Norman', 'Lloyd', 'Clarence', 'Vernon', 'Stanley', 'Melvin'] },
    mid: { f: ['Linda', 'Karen', 'Debra', 'Brenda', 'Tammy', 'Denise', 'Lisa', 'Sheila', 'Pam', 'Donna'],
      m: ['Gary', 'Steve', 'Mark', 'Dale', 'Rick', 'Doug', 'Randy', 'Kevin', 'Todd', 'Bruce'] },
    young: { f: ['Brittany', 'Ashley', 'Megan', 'Kayla', 'Jasmine', 'Courtney'],
      m: ['Tyler', 'Jordan', 'Brandon', 'Dylan', 'Austin', 'Cody'] },
    last: ['Miller', 'Kowalski', 'Henderson', 'Pruitt', 'Abernathy', 'Duvall', 'Hobbs', 'Fenwick', 'Grubb', 'Whitaker', 'Pickett', 'Lund', 'Moretti',
      'Garza', 'Okafor', 'Nguyen', 'Brennan', 'Schultz', 'Mancini', 'Delgado', 'Bergstrom', 'Haskins', 'Pemberton', 'Vasquez', 'Krueger', 'Tran'],
  };
  NR.CITIES = ['Boca Raton, FL', 'Mesa, AZ', 'Toledo, OH', 'Duluth, MN', 'Fresno, CA', 'Scranton, PA', 'Sioux Falls, SD', 'Tulsa, OK', 'Bangor, ME',
    'Sun City, AZ', 'Wichita, KS', 'Lubbock, TX', 'Spokane, WA', 'Dayton, OH', 'Ocala, FL', 'Boise, ID', 'Peoria, IL', 'Reno, NV'];

  NR.DETAILS = [
    { kind: 'pet', keys: ['Biscuit', 'Peanut', 'Duchess', 'Mr. Whiskers', 'Rocky', 'Pickles', 'Muffin'], text: ['my dog {key}', 'my cat {key}', 'my parakeet {key}'] },
    { kind: 'grandkid', keys: ['Kyle', 'Madison', 'Josh', 'Emily', 'Tanner', 'Brianna', 'Danny'], text: ['my grandson {key}', 'my granddaughter {key}'] },
    { kind: 'hobby', keys: ['bingo', 'gardening', 'bowling', 'quilting', 'fishing', 'crosswords', 'church choir'], text: ['{key} on Tuesdays', 'my {key}'] },
    { kind: 'spouse', keys: ['Harold', 'Bernice', 'Walt', 'June', 'Ray', 'Carol'], text: ['my late husband {key}', 'my late wife {key}'] },
  ];

  NR.GIFT_BRANDS = ['Steem', 'Goggle Play', 'Pear Store', 'Targit', 'eBuy', 'Wallmert'];

  // ---------------------------------------------------------------- scams
  // Each stage: need = trust needed for a fair Ask; ask = your line; yes/no = victim replies.
  NR.SCAMS = {
    tech: {
      name: 'Tech Support', brand: 'Windoze Support', pay: 'gift', unlock: 1, mods: { jargon: 1.2, fear: 1.1 },
      blurb: 'Their PC "has a virus". Sell them a fix.',
      stages: [
        { name: 'Hook', need: 15, ask: 'We\'re getting error reports from your computer, {title}. It has been infected.', yes: ['Infected? Oh dear, what do I do?', 'I knew it was acting funny!'], no: ['My computer seems fine to me.', 'How would you know that?'] },
        { name: 'Remote In', need: 35, remote: true, ask: 'Please go to anydusk-dot-com and read me the nine-digit number so I can connect and fix it.', yes: ['Okay… it says 4-1-7… there, you should see my screen.', 'Alright, I clicked the green button.'], no: ['I\'m not letting a stranger into my computer.', 'My son said never to do that.'] },
        { name: 'Show Damage', need: 55, ask: 'See all those red errors? Hackers. Your bank details are exposed.', yes: ['Oh my God, all those errors!', 'Can you stop them?'], no: ['Those look like normal logs to me.', 'Hmm, I don\'t see hackers.'] },
        { name: 'Payment', need: 70, pay: true, ask: 'The lifetime firewall license is {amount}. For security we only accept {gift} gift cards.', yes: ['Gift cards… alright, if that\'s how it works.', 'Fine, I\'ll go to the store.'], no: ['Gift cards? That sounds like a scam.', 'No company asks for gift cards.'] },
      ],
    },
    gov: {
      name: 'SSN Suspension', brand: 'Federal Benefits Bureau', pay: 'gift', unlock: 1, mods: { authority: 1.2, fear: 1.2 },
      blurb: 'Their Social Security number "was used in a crime".',
      stages: [
        { name: 'Hook', need: 20, ask: 'Your Social Security number has been linked to money laundering in Texas, {title}.', yes: ['Laundering? I\'ve never even been to Texas!', 'There must be a mistake!'], no: ['That\'s ridiculous.', 'The government sends letters, not calls.'] },
        { name: 'Verify ID', need: 40, ssn: true, ask: 'To clear your name I need to verify your Social Security number.', yes: ['Alright… it\'s {ssn}.', 'Okay, it\'s {ssn}. Please help me.'], no: ['You should already have that.', 'I don\'t give that out on the phone.'] },
        { name: 'Warrant', need: 60, ask: 'There\'s an active warrant. Officers can be at your door within the hour unless we settle this.', yes: ['Please, I can\'t go to jail!', 'What do I need to do?'], no: ['Then send the officers. I\'ll wait.', 'Warrants don\'t work like that.'] },
        { name: 'Payment', need: 80, pay: true, ask: 'You must post a {amount} security bond in {gift} cards. It will be refunded after the investigation.', yes: ['Okay. Okay. I\'ll go right now.', 'I\'ll do anything to fix this.'], no: ['The government doesn\'t take gift cards!', 'I\'m calling my lawyer.'] },
      ],
    },
    refund: {
      name: 'Refund Error', brand: 'Amazin Customer Care', pay: 'gift', unlock: 2, mods: { prize: 1.3, jargon: 1.1 },
      blurb: 'An "accidental" refund they have to pay back.',
      stages: [
        { name: 'Hook', need: 15, ask: 'You\'re owed a {refund} refund for your Amazin subscription, {title}.', yes: ['Oh! A refund? Nice.', 'I did cancel something, I think.'], no: ['I never had a subscription.', 'Refunds come automatically.'] },
        { name: 'Remote In', need: 35, remote: true, ask: 'Our refund tool needs remote access. Go to anydusk-dot-com please.', yes: ['Okay, it\'s installed.', 'Alright, I clicked allow.'], no: ['Why would a refund need that?', 'No thanks.'] },
        { name: 'Over-Refund', need: 60, ask: 'Oh no — I typed an extra zero. We refunded you {big} by mistake! I could lose my job!', yes: ['Oh no, that\'s so much! How do I give it back?', 'Oh dear, I don\'t want you to get fired.'], no: ['Let me check my bank app first.', 'That\'s your problem, not mine.'] },
        { name: 'Payment', need: 75, pay: true, ask: 'The bank can\'t reverse it. Please return the {amount} difference with {gift} cards.', yes: ['Of course, it\'s only fair.', 'I\'ll get them now.'], no: ['I\'ll do it through my bank, thanks.', 'Something isn\'t right here.'] },
      ],
    },
    prize: {
      name: 'Sweepstakes', brand: 'Publishers Clearing Hut', pay: 'card', unlock: 3, mods: { prize: 1.4, flattery: 1.2 },
      blurb: 'They "won". There\'s just a small fee.',
      stages: [
        { name: 'Hook', need: 15, ask: 'Congratulations {title}! You\'ve won $2.5 million and a new car!', yes: ['WHAT? Really?!', 'I never win anything!'], no: ['I didn\'t enter anything.', 'Sure I did.'] },
        { name: 'Paperwork', need: 40, ask: 'I just need your full address and date of birth for the prize paperwork.', yes: ['Of course! Let me spell it out.', 'Sure, write this down…'], no: ['Mail it to me then.', 'Why do you need my birthday?'] },
        { name: 'Payment', need: 65, pay: true, ask: 'There\'s a {amount} processing and tax fee. I can take a card number right now.', yes: ['For two and a half million? Sure!', 'Let me get my card.'], no: ['Real prizes don\'t have fees.', 'Take it out of the winnings.'] },
      ],
    },
    bank: {
      name: 'Bank Fraud Dept', brand: 'First National Trust', pay: 'card', unlock: 4, mods: { authority: 1.1, fear: 1.2, proof: 1.2 },
      blurb: 'Pose as their bank\'s fraud team.',
      stages: [
        { name: 'Hook', need: 20, ask: 'This is fraud prevention. We blocked a {refund} charge at an electronics store in Miami. Was that you?', yes: ['No! That wasn\'t me!', 'Miami? I\'m in {city}!'], no: ['I\'ll call the number on my card.', 'Which card, exactly?'] },
        { name: 'Verify', need: 45, ask: 'To protect the account I need to verify you. Can you confirm your full name and ZIP code?', yes: ['Yes, of course, it\'s…', 'Sure, anything to stop them.'], no: ['You\'re the bank, you know that.', 'I don\'t like this.'] },
        { name: 'Card Number', need: 65, pay: true, ask: 'Read me the card number so I can freeze it and issue a new one.', yes: ['Okay, I have it here.', 'Freeze it please!'], no: ['My bank would never ask that.', 'I\'ll go to the branch.'] },
      ],
    },
    grandkid: {
      name: 'Grandkid in Jail', brand: 'your grandkid', pay: 'gift', unlock: 4, elderlyOnly: true, mods: { fear: 1.3, empathy: 1.4, urgency: 1.2, authority: 0.8 },
      blurb: 'Elderly only. "Grandma, it\'s me…"',
      stages: [
        { name: 'Hook', need: 25, ask: 'Grandma? It\'s me… I\'m in trouble. Please don\'t tell Mom.', yes: ['{grandkid}? Is that you? You sound different!', 'Sweetheart, what happened?'], no: ['Which grandchild is this?', 'You don\'t sound like any of mine.'] },
        { name: 'The Accident', need: 50, ask: 'I was in a car accident and they arrested me. I need bail money or I stay in jail.', yes: ['Oh no, oh my poor baby!', 'Are you hurt?'], no: ['Let me call your mother.', 'Put the police officer on, then.'] },
        { name: 'Payment', need: 70, pay: true, ask: 'The lawyer says bail is {amount}, and the court only takes {gift} cards. Please hurry!', yes: ['I\'ll go right now, honey.', 'Don\'t worry, Grandma\'s coming.'], no: ['Courts don\'t take gift cards.', 'I\'m calling your father.'] },
      ],
    },
  };

  // ---------------------------------------------------------------- lines
  // What YOU say when playing a tactic. Scam-specific first, generic fallback.
  NR.PLAYER_LINES = {
    chat: ['How are you doing today, {title}? Lovely weather over there?', 'Before we start — how is your family doing?', 'I hope I\'m not interrupting your day. What were you up to?', 'You sound like a very nice person. Do you have grandkids?'],
    empathy: ['I completely understand, {title}. This must be very stressful.', 'I know, I know. I\'d be worried too. I\'m here to help you.', 'You\'re not alone in this. We see this every day.'],
    authority: ['My name is {agent}, senior officer at {brand}, ID number {badge}.', 'I\'m a certified Level 3 specialist at {brand}. This is an official call.', 'This call is being recorded for legal purposes by {brand}.'],
    fear: { _: ['If we don\'t fix this today, you could lose everything.', 'Every minute we wait, it gets worse, {title}.'],
      tech: ['Hackers are inside your computer right now. They can see your bank account.'],
      gov: ['If this isn\'t resolved, a warrant will be issued for your arrest.'],
      bank: ['Someone is trying to empty your account as we speak.'],
      grandkid: ['They said I could be in here for months, Grandma!'],
      refund: ['If this isn\'t fixed I\'ll be fired, and you\'ll owe taxes on it!'],
      prize: ['If you don\'t claim it today, the prize goes to the next winner.'] },
    urgency: ['We need to do this right now, before the system locks.', 'I can only hold this case open for ten more minutes.', 'Please hurry, {title}, time is very important.'],
    jargon: ['Your IP is broadcasting on the dark web through a trojan in your registry.', 'Your firewall protocol is corrupted. The servers are showing 4,000 malware packets.', 'The encryption on your network router has been breached. Very serious.'],
    reassure: ['Don\'t worry, {title}, you\'re completely safe with me.', 'This is totally normal, we do this a hundred times a day.', 'Relax, I guarantee everything will be fine.'],
    flattery: ['You\'re clearly very sharp, {title}. Most people don\'t notice this.', 'You sound so young! I can tell you\'re smart.', 'Honestly, you\'re one of our most valued customers.'],
    prize: ['There\'s also a loyalty bonus for you when we finish, {title}.', 'Customers who complete this today get a $500 reward.', 'You\'ve been selected for a special cash-back reward.'],
    proof: ['Write down this case number: {case}. You can verify it.', 'I\'m looking at your file right now. It says {city}, correct?', 'I\'m sending you a confirmation reference: {case}.'],
    supervisor: ['Let me transfer you to my supervisor… Hello, this is Senior Manager {agent2}. I\'ll personally handle your case.'],
    holdmusic: ['Please hold one moment… ♪ Greensleeves ♪'],
    sob: ['{title}, honestly… if I don\'t close this case my boss will fire me, and my mother needs her medicine.'],
    double: ['Listen to me very carefully, {title}.'],
    redraw: ['Uh… let me rephrase that.'],
  };

  // Victim reactions by tactic and outcome (great / good / bad).
  NR.VICTIM_LINES = {
    chat: { great: ['Oh, it\'s so nice to chat! Let me tell you about {detail}…', 'Aren\'t you sweet! {detail} would love you.'], good: ['I\'m doing alright, thank you.', 'Oh, the usual. {detail} keeps me busy.'], bad: ['I don\'t have time for chit-chat.', 'Why are you asking me that?'] },
    empathy: { great: ['Thank you, you\'re so kind. Nobody listens to me anymore.', 'Oh, you really do understand.'], good: ['I appreciate that.', 'That\'s nice of you to say.'], bad: ['Don\'t patronize me.', 'I don\'t need your sympathy.'] },
    authority: { great: ['Yes sir, of course. I\'ll do what you say.', 'Oh! I didn\'t realize this was official.'], good: ['Alright, officer.', 'Okay… what do you need?'], bad: ['Anyone can say they\'re an officer.', 'What\'s your badge number again? I\'m writing it down.'] },
    fear: { great: ['Oh my God! What do I do? Please help me!', 'No, no, no! Tell me how to stop it!'], good: ['That\'s… that\'s scary.', 'Oh dear. Is it serious?'], bad: ['Are you threatening me?', 'Nice try. I\'m not scared.'] },
    urgency: { great: ['Okay, okay, I\'m hurrying!', 'Right now? Alright, tell me what to do!'], good: ['Alright, let\'s be quick then.', 'Okay, I\'m listening.'], bad: ['Why the rush? Slow down.', 'Real companies don\'t rush people.'] },
    jargon: { great: ['I don\'t understand any of that, but it sounds bad!', 'Trojan? Like the horse? Oh no.'], good: ['I see… I think.', 'Is that bad?'], bad: ['That\'s word salad. A trojan in the registry?', 'I work in IT. None of that is real.'] },
    reassure: { great: ['Oh, thank goodness. You\'re very calming.', 'Okay. I trust you.'], good: ['Alright, if you say so.', 'Okay…'], bad: ['That\'s exactly what a scammer would say.', 'You\'re not making me feel better.'] },
    flattery: { great: ['Oh stop it, you\'re making me blush!', 'Well, I am rather sharp, aren\'t I?'], good: ['Thank you, I suppose.', 'That\'s nice.'], bad: ['Flattery won\'t work on me.', 'Don\'t suck up.'] },
    prize: { great: ['A reward? For me? How much?!', 'Oh, I could really use that money.'], good: ['A bonus would be nice.', 'Oh, really?'], bad: ['Nothing is free.', 'Sounds too good to be true.'] },
    proof: { great: ['Okay, I wrote it down. That sounds legitimate.', 'Oh, you really do have my file.'], good: ['Alright, I have the number.', 'Fine, that seems official.'], bad: ['Anyone can make up a number.', 'I\'ll look that up myself, thank you.'] },
    holdmusic: { great: ['♪ Oh, I love this song… ♪', 'This music is so relaxing.'], good: ['Okay, I\'m holding.', 'Hello? Still there?'], bad: ['I\'m not waiting all day!', 'Ugh, hold music.'] },
    _: { great: ['Oh, yes, yes, of course!'], good: ['Okay.', 'Alright.'], bad: ['I don\'t like where this is going.', 'Hmm.'] },
  };

  NR.SUSPICIOUS_LINES = ['How do I know you\'re who you say you are?', 'This sounds like one of those scams on the news.', 'My daughter warned me about calls like this.', 'Can I call you back on an official number?'];
  NR.HANGUP_LINES = ['I\'m hanging up and calling the police.', 'Scammer! Don\'t call me again!', 'Shame on you. Goodbye.', 'I\'ve reported this number.'];
  NR.BORED_LINES = ['I\'ve had enough of this, I have things to do.', 'This is taking forever. Goodbye.', 'I\'m going to go now.'];
  NR.GREETINGS = ['Hello?', 'Yes, hello?', '{last} residence.', 'Who is this?', 'Hello, who\'s calling?', 'Yeah?'];
  NR.VOICEMAIL = ['"You\'ve reached the {last}s. Leave a message after the beep." (Voicemail)', '"The number you have dialed is not in service." (Dead lead)', '"Hi, this is {first}, I\'m probably at {hobby}. Leave a message!" (Voicemail)'];

  // Scambaiters: people pretending to be victims to waste your time.
  NR.BAITER_TELLS = [
    'Hold on, let me find my reading glasses… no, those are my swimming goggles.',
    'My computer says "Windows 95"… is that a problem?',
    'Could you spell your name again? Slowly. For my… notes.',
    'Sorry, my parrot is very loud today. SAY HELLO, CAPTAIN.',
    'Is this the same company that called my cousin Jim? He LOVED you guys.',
    'Oh, I\'m typing it in… into the… the box with the… numbers.',
    'One second, my microwave is beeping. Bear with me, it\'s an old microwave.',
    'Ooh, that\'s a lovely accent. Where are you calling from exactly?',
    'I have SO much money. Way too much, honestly.',
    'Hang on, I\'m driving. No wait, I\'m in the bath. Okay go on.',
  ];
  NR.BAITER_NAMES = [['Edna', 'Puddlesworth'], ['Gerald', 'Flapjack'], ['Myrtle', 'Wigglebottom'], ['Bartholomew', 'Snickett'], ['Ida', 'Grubbins']];
  NR.BAITER_REVEAL = ['Hahaha! You\'ve been on the phone with me for {mins} minutes. Greetings from the internet!', 'This call is being streamed live to 40,000 people. Say hi, chat!', 'I\'ve been recording this entire call. Have a terrible day!'];

  // Store visit: the cashier might intervene (this happens in real life).
  NR.CASHIER_LINES = ['The cashier is asking me why I need ${total} in gift cards… she says it might be a scam?', 'The young man at the register wants to know who I\'m buying these for.'];

  // ---------------------------------------------------------------- shop
  NR.UPGRADES = [
    { id: 'headset', name: 'Noise-Cancelling Headset', icon: '🎧', cost: 120, desc: 'Victims have +2 patience.' },
    { id: 'badge', name: 'Fake Badge', icon: '🪪', cost: 160, desc: 'Pull Rank is 40% stronger.' },
    { id: 'duck', name: 'Rubber Duck', icon: '🦆', cost: 90, desc: 'First card each call gives +6 trust.' },
    { id: 'spoofer', name: 'Caller ID Spoofer', icon: '📡', cost: 220, desc: 'Start every call with +8 trust.' },
    { id: 'vpn', name: 'VPN Subscription', icon: '🛡️', cost: 200, desc: 'Heat gain -35%.' },
    { id: 'leads', name: 'Premium Lead List', icon: '📒', cost: 260, desc: 'Leads are 35% wealthier.' },
    { id: 'coffee', name: 'Triple Espresso', icon: '☕', cost: 140, desc: 'Workday clock runs 20% slower.' },
    { id: 'detector', name: 'Baiter Radar', icon: '📻', cost: 180, desc: 'Scambaiter tells are highlighted.' },
    { id: 'hand', name: 'Second Monitor', icon: '🖥️', cost: 300, desc: 'Hand size +1.' },
    { id: 'lucky', name: 'Lucky Cat', icon: '🐈', cost: 240, desc: 'Every Ask gets +6% success.' },
  ];
  NR.CARD_SHOP = ['flattery', 'prize', 'proof', 'supervisor', 'holdmusic', 'sob', 'double', 'redraw', 'authority', 'fear', 'jargon', 'empathy'];
  NR.CARD_PRICES = { flattery: 60, prize: 70, proof: 80, supervisor: 160, holdmusic: 110, sob: 130, double: 150, redraw: 90, authority: 70, fear: 60, jargon: 60, empathy: 60 };

  // ---------------------------------------------------------------- days
  NR.QUOTAS = [600, 900, 1200, 1600, 2000, 2500, 3000, 3500, 4100, 4800];
  NR.CUT = 0.25; // share of each haul the player keeps

  NR.BOSS_LINES = {
    great: ['Excellent work. You are the shark I hired. Bonus is in your account.', 'Now THIS is a closer. Tomorrow, bigger fish.'],
    ok: ['Quota made. Barely. Don\'t get comfortable.', 'Adequate. My cousin\'s goat closes faster than you.'],
    miss: ['You missed quota. One more and you\'re out on the street.', 'Pathetic. Are you running a charity? Strike one.'],
    fired: ['Clear your desk. Security will escort you out.', 'You\'re fired. Leave the headset.'],
  };

  NR.TIPS = [
    'Real fact: no government agency or tech company will ever ask you to pay with gift cards.',
    'Real fact: if a caller pressures you to act "right now", hang up and call the official number yourself.',
    'Real fact: scammers spoof caller ID. A familiar number on your screen proves nothing.',
    'Real fact: never let a stranger remote into your computer, no matter what they say.',
    'Real fact: the "grandkid in jail" scam is common. Hang up and call your grandkid directly.',
    'Real fact: a "refund" that is too big is always a trick — your bank balance can be faked on screen.',
    'Real fact: cashiers are trained to spot gift-card scams. If one asks questions, listen.',
  ];
})(window.NR);
