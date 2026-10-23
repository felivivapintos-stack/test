// Optional AI mode: the player brings their own Anthropic API key and the
// victim's replies are written live by Claude. The card rules still decide
// every number; the model only voices the outcome (plus a small nudge), so
// the game stays balanced and works identically when the API is down.
//
// Raw fetch on purpose: the game is a static page with no build step, so the
// npm SDK can't be imported.
(function (NR) {
  'use strict';
  const el = NR.el;
  const cfg = NR.store.get('llm', { enabled: false, key: '', model: 'claude-opus-5-5' });
  const save = () => NR.store.set('llm', cfg);

  const SCHEMA = {
    type: 'object',
    properties: {
      reply: { type: 'string', description: 'What the person says next, in character. 1-3 short spoken sentences.' },
      trust_nudge: { type: 'integer', description: 'Extra trust change from -5 to 5 based on how convincing the caller\'s exact words were.' },
      suspicion_nudge: { type: 'integer', description: 'Extra suspicion change from -5 to 5.' },
    },
    required: ['reply', 'trust_nudge', 'suspicion_nudge'],
    additionalProperties: false,
  };

  function persona(c) {
    const v = c.v;
    const traits = v.traits.map((t) => `${NR.TRAITS[t].label} (${NR.TRAITS[t].reveal})`).join('; ');
    return `You are voicing a character in NO REFUNDS, a satirical video game about a phone-scam call center. The player is the scam caller. You play the person who picked up the phone.

Character: ${v.first} ${v.last}, ${v.age}, from ${v.city}. Traits: ${traits}. Personal detail they might mention: ${v.detail.text}.
${v.baiter ? 'SECRET: this character is actually a scambaiter pretending to be a gullible victim to waste the caller\'s time. Play along a little too eagerly, and drop odd, funny hints (pets, slow typing, suspicious questions about where the caller is).' : ''}
The caller claims to be from "${c.scam.brand}" running the "${c.scam.name}" script, currently at the "${(c.scam.stages[c.stage] || c.scam.stages[c.scam.stages.length - 1]).name}" step.

Rules:
- Stay in character. Speak like a real person on the phone: short, natural, no stage directions, no emojis, no narration.
- The game engine has already decided how this line landed; your reply MUST match the given outcome (great = won over, good = going along, bad = put off or suspicious).
- Never give real-world scam instructions, real company names, or real card/SSN numbers. Brands in this world are fictional.
- Keep it PG-13 and funny where it fits.`;
  }

  async function voice(c, playerLine, outcome) {
    const history = c.log.filter((m) => m.who === 'you' || m.who === 'them').slice(-12)
      .map((m) => `${m.who === 'you' ? 'CALLER' : 'YOU'}: ${m.text}`).join('\n');
    const body = {
      model: cfg.model,
      max_tokens: 16000,
      system: persona(c),
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: `Call so far:\n${history}\n\nThe caller just said: "${playerLine}"\nOutcome decided by the game: ${outcome}. Trust is ${c.trust}/100, suspicion ${c.susp}/100.\nReply in character.` }],
    };
    const headers = {
      'content-type': 'application/json',
      'x-api-key': cfg.key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    // Server-side refusal fallback (not available for Haiku).
    if (!/haiku/.test(cfg.model)) { headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'; body.fallbacks = 'default'; }
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      let msg = res.status + '';
      try { const j = await res.json(); msg += ' ' + (j.error && j.error.message || ''); } catch (e) { /* ignore */ }
      if (res.status === 401) throw new Error('Invalid API key (401).');
      if (res.status === 429) throw new Error('Rate limited (429). Falling back to scripted lines.');
      throw new Error('API error ' + msg);
    }
    const data = await res.json();
    if (data.stop_reason === 'refusal') throw new Error('The model declined this line; using a scripted one.');
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    return JSON.parse(text);
  }

  NR.llm = {
    enabled: () => cfg.enabled && !!cfg.key,

    async play(c, i, typed) {
      const before = c.log.length;
      const res = c.play(i, typed);
      if (!res || c.state === 'done') return res;
      const added = c.log.slice(before);
      const playerEntry = added.find((m) => m.who === 'you');
      const reaction = added.find((m) => m.who === 'them' && m.tag !== 'tell');
      if (!playerEntry || !reaction) return res;
      try {
        const out = await voice(c, playerEntry.text, res.level || 'good');
        if (out && typeof out.reply === 'string' && out.reply.trim()) reaction.text = out.reply.trim().slice(0, 400);
        const tn = NR.clamp(Math.round(+out.trust_nudge || 0), -5, 5);
        const sn = NR.clamp(Math.round(+out.suspicion_nudge || 0), -5, 5);
        if (tn || sn) {
          c.trust = NR.clamp(c.trust + tn, 0, 100);
          c.susp = NR.clamp(c.susp + sn, 0, 100);
          res.dTrust += tn; res.dSusp += sn;
          res.flags.push('AI read your words');
          c.checkEnd();
        }
      } catch (e) {
        NR.toast('🤖 ' + e.message, 'warn');
      }
      return res;
    },

    settingsPanel() {
      const key = el('input', { type: 'password', placeholder: 'sk-ant-…', value: cfg.key, style: { width: '100%' }, onchange: (e) => { cfg.key = e.target.value.trim(); save(); } });
      const model = el('select', { onchange: (e) => { cfg.model = e.target.value; save(); } },
        ...[['claude-opus-5-5', 'Claude Opus 5.5 (best acting)'], ['claude-haiku-5-5', 'Claude Haiku 5.5 (much cheaper)']].map(([v, l]) => el('option', { value: v, selected: cfg.model === v }, l)));
      return el('div.panel', { style: { marginTop: '10px' } },
        el('h3', '🤖 AI victims (optional)'),
        el('p.muted', 'Bring your own Anthropic API key and every reply is improvised live by Claude, reacting to your exact words. The game is fully playable without it. Your key is stored only in this browser and is sent only to api.anthropic.com. You pay for usage on your own account.'),
        el('label.row', el('input', { type: 'checkbox', checked: cfg.enabled, onchange: (e) => { cfg.enabled = e.target.checked; save(); } }), 'Enable AI victims'),
        el('div', { style: { margin: '6px 0' } }, key),
        el('label.row', 'Model ', model));
    },
  };
})(window.NR);
