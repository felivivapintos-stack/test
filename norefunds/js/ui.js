// DeskOS window manager, taskbar, toasts and modals.
(function (NR) {
  'use strict';
  const el = NR.el;
  NR.apps = {};
  const wins = new Map(); // appId -> {node, body, app}
  let z = 10;

  NR.registerApp = (id, app) => { NR.apps[id] = Object.assign({ id, w: 420, h: 360 }, app); };

  NR.isMobile = () => window.innerWidth < 760;

  NR.openApp = function (id, arg) {
    const app = NR.apps[id];
    if (!app) return null;
    if (app.locked && app.locked()) { NR.toast(app.lockedMsg || 'Locked.', 'warn'); return null; }
    let w = wins.get(id);
    if (w) { w.node.hidden = false; focus(w); app.render(w.body, arg, w); renderTasks(); return w; }
    const area = NR.$('#windows');
    const W = Math.min(app.w, window.innerWidth - 20), H = Math.min(app.h, window.innerHeight - 50);
    const n = wins.size;
    const left = NR.clamp(110 + n * 26 + (app.x || 0), 0, window.innerWidth - W);
    const top = NR.clamp(20 + n * 22 + (app.y || 0), 0, window.innerHeight - 36 - H);
    const body = el('div.wbody');
    const node = el('div.window', { style: { left: left + 'px', top: top + 'px', width: W + 'px', height: H + 'px' } },
      el('div.titlebar', el('span', app.icon), el('span.t', app.title),
        el('button', { title: 'Minimize', onclick: (e) => { e.stopPropagation(); node.hidden = true; renderTasks(); } }, '_'),
        el('button', { title: 'Maximize', onclick: (e) => { e.stopPropagation(); node.classList.toggle('max'); } }, '□'),
        el('button', { title: 'Close', onclick: (e) => { e.stopPropagation(); NR.closeApp(id); } }, '✕')),
      body, el('div.resize'));
    if (NR.isMobile()) node.classList.add('max');
    w = { id, node, body, app };
    wins.set(id, w);
    area.append(node);
    drag(node, node.querySelector('.titlebar'), false);
    drag(node, node.querySelector('.resize'), true);
    node.addEventListener('pointerdown', () => focus(w));
    focus(w);
    app.render(body, arg, w);
    renderTasks();
    NR.sfx('click');
    return w;
  };

  NR.closeApp = function (id) {
    const w = wins.get(id);
    if (!w) return;
    if (w.app.onClose) w.app.onClose();
    w.node.remove();
    wins.delete(id);
    renderTasks();
  };
  NR.refreshApp = function (id, arg) { const w = wins.get(id); if (w && !w.node.hidden) w.app.render(w.body, arg, w); };
  let refreshing = false;
  NR.refreshAll = function () {
    if (refreshing) return;
    refreshing = true;
    try { for (const w of wins.values()) if (!w.node.hidden && w.app.live) w.app.render(w.body, undefined, w); } finally { refreshing = false; }
  };
  NR.isOpen = (id) => wins.has(id) && !wins.get(id).node.hidden;
  NR.shakeApp = (id) => { const w = wins.get(id); if (w) { w.node.classList.remove('shake'); void w.node.offsetWidth; w.node.classList.add('shake'); } };
  NR.closeAll = () => { for (const id of [...wins.keys()]) NR.closeApp(id); };

  function focus(w) {
    for (const o of wins.values()) o.node.classList.add('inactive');
    w.node.classList.remove('inactive');
    w.node.style.zIndex = ++z;
    renderTasks(w.id);
  }

  function drag(node, handle, resize) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.tagName === 'BUTTON' || node.classList.contains('max')) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, r = node.getBoundingClientRect();
      const move = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (resize) { node.style.width = Math.max(240, r.width + dx) + 'px'; node.style.height = Math.max(120, r.height + dy) + 'px'; }
        else {
          node.style.left = NR.clamp(r.left + dx, -r.width + 80, window.innerWidth - 80) + 'px';
          node.style.top = NR.clamp(r.top + dy, 0, window.innerHeight - 60) + 'px';
        }
      };
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  function renderTasks(activeId) {
    const t = NR.$('#tasks');
    if (!t) return;
    t.replaceChildren(...[...wins.values()].map((w) => el('button', {
      class: (activeId === w.id || (!activeId && !w.node.classList.contains('inactive'))) && !w.node.hidden ? 'active' : '',
      onclick: () => { if (w.node.hidden || w.node.classList.contains('inactive')) { w.node.hidden = false; focus(w); } else { w.node.hidden = true; renderTasks(); } },
    }, w.app.icon + ' ' + w.app.title)));
  }

  // ------------------------------------------------------------- icons
  NR.renderIcons = function () {
    const box = NR.$('#icons');
    box.replaceChildren(...Object.values(NR.apps).filter((a) => !a.hidden && !(a.locked && a.locked() && a.hideLocked)).map((a) => {
      const badge = a.badge ? a.badge() : 0;
      return el('button.icon', { ondblclick: () => NR.openApp(a.id), onclick: () => { if (NR.isMobile() || NR.settings.singleClick !== false) NR.openApp(a.id); } },
        el('span.ic', a.icon), a.title, badge ? el('span.badge', badge) : null);
    }));
  };

  // ------------------------------------------------------------- toasts
  NR.toast = function (text, kind = '') {
    const t = el('div.toast.' + (kind || 'x'), text);
    NR.$('#toasts').append(t);
    setTimeout(() => t.remove(), 4200);
  };
  NR.on('toast', (d) => NR.toast(d.text, d.kind));

  // ------------------------------------------------------------- modals
  NR.modal = function (title, content, buttons = []) {
    const ov = NR.$('#overlay');
    const close = () => { ov.hidden = true; ov.replaceChildren(); };
    const box = el('div.modal', el('div.titlebar', el('span.t', title)),
      el('div.mb', content, buttons.length ? el('div.row', { style: { justifyContent: 'flex-end', marginTop: '12px', flexWrap: 'wrap' } },
        buttons.map((b) => el('button', { class: b.cls || '', onclick: () => { if (b.keep !== true) close(); b.fn && b.fn(); } }, b.label))) : null));
    ov.replaceChildren(box);
    ov.hidden = false;
    return { close, box };
  };
  NR.modalOpen = () => !NR.$('#overlay').hidden;

  // ------------------------------------------------------------- start menu
  NR.toggleStart = function (force) {
    const m = NR.$('#start-menu');
    const show = force != null ? force : m.hidden;
    if (!show) { m.hidden = true; return; }
    const item = (label, fn) => el('button', { onclick: () => { m.hidden = true; fn(); } }, label);
    m.replaceChildren(el('div.side', 'DeskOS 98'), el('div.items',
      ...Object.values(NR.apps).filter((a) => !a.hidden).map((a) => item(a.icon + ' ' + a.title, () => NR.openApp(a.id))),
      el('hr'),
      item('⏭ End shift early', () => {
        if (NR.call) return NR.toast('Finish your call first.', 'warn');
        NR.modal('End shift?', el('p', 'Clock out now? Unredeemed codes expire.'), [{ label: 'Cancel' }, { label: 'Clock out', cls: 'primary', fn: NR.forceEndDay }]);
      }),
      item('💾 Save & quit to title', () => { NR.save(); location.reload(); })));
    m.hidden = false;
  };
})(window.NR);
