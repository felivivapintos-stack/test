import {t,pick} from './i18n.js';
import {createDive,canSave,diveResult,shotSpread} from './keeper.js';
import {createScene,renderScene,setSpot,stadiumLoaded} from './renderer.js';
import {spritesReady,warmKit} from './sprites.js';
import {TEAMS,REGIONS,team,flagSrc,createTournament,standings,nextMatch,finishMatch,shootoutFinished,playerGroup} from './engine.js';
import {createSpot,strike,cpuStrike,DEFEND,cpuKeeperDive,sweetZone,shotEnd,RUN_MS,SWEET_LOW,POWER_MAX,GOAL_W} from './freekick.js';
import * as audio from './audio.js';
import * as sdk from './sdk.js';
import {Particles} from './fx.js';

const KEY='nations-free-kick.save.v1',SELECTED_KEY='nations-free-kick.team',COACH_KEY='nations-free-kick.coach';
const POWER_MS=950;
const app=document.querySelector('#app'),bgCanvas=document.querySelector('#bg'),fxCanvas=document.querySelector('#fx');
const $=s=>document.querySelector(s);
let selected='BR',cup=null,screen='loading',arena=null,last=0,clock=0,saved=null,bgScene=null,tab=null,filter='ALL';
let coach={shoot:0,save:0,curl:0};try{coach={...coach,...JSON.parse(localStorage.getItem(COACH_KEY)||'{}')};}catch{}
const menuFx=new Particles();
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

// ---------- Small view helpers ----------
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const flag=(id,cls='flag')=>`<img class="${cls}" src="${flagSrc(id)}" alt="" draggable="false">`;
const stars=n=>`<span class="stars" aria-label="${n} of 5 stars">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5-n)}</span>`;
const groupLetter=i=>String.fromCharCode(65+i);
const ink=hex=>{const v=parseInt(hex.slice(1),16);return ((v>>16)*.299+((v>>8)&255)*.587+(v&255)*.114)>165?'#10212a':'#ffffff';};
const matchLabel=m=>m.stage===0?`${t('group',{g:groupLetter(m.group)})} · ${t('matchday',{n:m.round+1})}`:t('stages')[m.stage];
const progressLabel=s=>{const m=nextMatch(s);return m?matchLabel(m):t('stages')[s.stage];};
const ICON={
 back:'<svg class="ico" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
 play:'<svg class="ico" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
 info:'<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.2"/></svg>',
 pause:'<svg class="ico" viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>',
 search:'<svg class="ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
 soundOn:'<svg class="ico" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 010 6M18 6.5a8 8 0 010 11"/></svg>',
 soundOff:'<svg class="ico" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
 curlL:'<svg class="ico" viewBox="0 0 24 24"><path d="M18 20C18 11 13 6 6 6"/><path d="M10 2.5L6 6l4 3.5"/></svg>',
 curlR:'<svg class="ico" viewBox="0 0 24 24"><path d="M6 20C6 11 11 6 18 6"/><path d="M14 2.5L18 6l-4 3.5"/></svg>'
};
const TROPHY=`<svg class="trophy-art" viewBox="0 0 200 240" aria-hidden="true"><defs><linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#7a4a0c"/><stop offset=".3" stop-color="#ffe9a3"/><stop offset=".5" stop-color="#f6c044"/><stop offset=".78" stop-color="#c98a1c"/><stop offset="1" stop-color="#6d420b"/></linearGradient></defs>
<path d="M54 34H26c0 36 16 54 38 56M146 34h28c0 36-16 54-38 56" fill="none" stroke="url(#gold)" stroke-width="11" stroke-linecap="round"/>
<path d="M48 16h104v44c0 44-24 76-52 80-28-4-52-36-52-80z" fill="url(#gold)"/>
<path d="M66 28c0 36 8 62 26 80" fill="none" stroke="#fff8" stroke-width="6" stroke-linecap="round"/>
<circle cx="100" cy="62" r="17" fill="#fff6"/><path d="M100 50l7 5-3 8h-8l-3-8z" fill="#7a4a0c66"/>
<path d="M86 138h28l7 34H79z" fill="url(#gold)"/><rect x="62" y="170" width="76" height="16" rx="4" fill="url(#gold)"/>
<rect x="50" y="186" width="100" height="36" rx="6" fill="#121c33"/><rect x="50" y="186" width="100" height="6" fill="#ff9a2e"/><rect x="70" y="200" width="60" height="10" rx="2" fill="#ffffff22"/></svg>`;
function kitSvg(tm){
 const shirt='M38 10L50 6Q60 14 70 6L82 10 108 30 96 48 86 42 86 78 34 78 34 42 24 48 12 30Z',shorts='M34 82H86L90 122H64L60 104 56 122H30Z';
 return `<svg class="kit" viewBox="0 0 120 130" aria-hidden="true"><path d="${shirt}" fill="${tm.shirt}" stroke="#00000055" stroke-width="1.5"/><path d="M60 9L82 10 108 30 96 48 86 42 86 78 60 78Z" fill="#000" opacity=".16"/><path d="M38 10L50 6 54 14 34 42 24 48 12 30Z" fill="#fff" opacity=".12"/><path d="M50 6Q60 18 70 6" fill="none" stroke="${tm.shorts}" stroke-width="4"/><path d="M108 30L96 48M12 30L24 48" stroke="${tm.shorts}" stroke-width="5"/><text x="60" y="62" text-anchor="middle" font-family="'Barlow Condensed',sans-serif" font-weight="800" font-size="28" fill="${ink(tm.shirt)}">10</text><path d="${shorts}" fill="${tm.shorts}" stroke="#00000055" stroke-width="1.5"/><path d="M60 82H86L90 122H64L60 104Z" fill="#000" opacity=".16"/></svg>`;
}
const soundBtn=()=>`<button class="icon-btn" data-action="sound" data-silent="1" aria-label="${audio.isMuted()?t('soundOff'):t('soundOn')}">${audio.isMuted()?ICON.soundOff:ICON.soundOn}</button>`;

// ---------- Persistence ----------
function loadSave(){try{const v=JSON.parse(sdk.storage.get(KEY));if(v?.version===2&&team(v.player)&&Array.isArray(v.groups)&&v.groups.length===12&&v.groups.flat().every(team))saved=v;}catch{}}
function persist(){const s=JSON.stringify(cup);sdk.storage.set(KEY,s);saved=JSON.parse(s);}
function saveCoach(){try{localStorage.setItem(COACH_KEY,JSON.stringify(coach));}catch{}}

// ---------- Screens ----------
function show(html,name){
 screen=name;document.body.dataset.screen=name;
 app.innerHTML=`<div class="screen screen-${name}">${html}</div>`;
 if(name!=='match'){arena=null;sdk.gameplayStop();}
}

function titleScreen(){
 const s=saved?.status==='playing'?saved:null;
 const ribbon=TEAMS.map(x=>flag(x.id)).join('');
 show(`<div class="top-corner">${soundBtn()}</div>
 <div class="title-wrap">
  <h1 class="logo" aria-label="Nations Free Kick"><span class="logo-kicker">${esc(t('subtitle'))}</span><span class="logo-1">NATIONS</span><span class="logo-2">FREE KICK</span></h1>
  <p class="tagline">${esc(t('tagline'))}</p>
  <div class="title-actions">
   ${s?`<button class="btn btn-primary btn-xl" data-action="resume">${ICON.play}<span class="btn-stack">${t('continue')}<small>${flag(s.player,'flag-sm')} ${esc(team(s.player).name)} · ${esc(progressLabel(s))}</small></span></button>
   <button class="btn btn-secondary" data-action="select">${t('newTournament')}</button>`
   :`<button class="btn btn-primary btn-xl" data-action="select">${ICON.play}<span>${t('play')}</span></button>`}
   <button class="btn btn-ghost" data-action="rules">${ICON.info}<span>${t('rules')}</span></button>
  </div>
 </div>
 <div class="title-stats"><div><b>${TEAMS.length}</b><span>${t('statNations')}</span></div><div><b>48</b><span>${t('statQualify')}</span></div><div><b>1</b><span>${t('statChampion')}</span></div></div>
 <div class="flag-ribbon" aria-hidden="true"><div class="flag-track">${ribbon}${ribbon}</div></div>`,'title');
}

function selectScreen(){
 show(`<header class="bar">
  <button class="icon-btn" data-action="title" aria-label="${t('back')}">${ICON.back}</button>
  <h2>${t('chooseNation')}</h2>
  <div class="bar-end">${soundBtn()}</div>
 </header>
 <div class="select-body">
  <aside class="showcase" id="showcase"></aside>
  <section class="picker">
   <div class="picker-tools">
    <label class="search">${ICON.search}<input id="search" placeholder="${t('search')}" aria-label="${t('search')}" autocomplete="off" spellcheck="false"></label>
    <div class="chips">${['ALL',...REGIONS].map(r=>`<button class="chip" data-action="filter" data-region="${r}" aria-pressed="${filter===r}">${r==='ALL'?t('all'):t('regions')[r]}</button>`).join('')}</div>
   </div>
   <div class="team-grid" id="teams"></div>
  </section>
 </div>`,'select');
 renderShowcase();renderTeamGrid();
 $('#search').oninput=renderTeamGrid;
}
function renderShowcase(){
 const tm=team(selected),el=$('#showcase');if(!el)return;
 el.style.cssText=`--c1:${tm.shirt};--c2:${tm.shorts}`;
 el.innerHTML=`<div class="showcase-art">${flag(tm.id,'flag-xl')}${kitSvg(tm)}</div>
 <div class="showcase-info"><span class="tier">${t('tiers')[tm.stars]} · ${t('regions')[tm.region]}</span><h3>${esc(tm.name)}</h3>${stars(tm.stars)}</div>
 <button class="btn btn-primary btn-xl" data-action="start">${ICON.play}<span>${t('enterPitch')}</span></button>`;
 el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
}
function renderTeamGrid(){
 const q=norm($('#search')?.value||'');
 const list=TEAMS.filter(x=>(filter==='ALL'||x.region===filter)&&norm(x.name).includes(q)).sort((a,b)=>b.rating-a.rating||a.name.localeCompare(b.name));
 $('#teams').innerHTML=list.map(x=>`<button class="team-card${x.id===selected?' selected':''}" data-action="pick" data-team="${x.id}" aria-pressed="${x.id===selected}" style="--c1:${x.shirt};--c2:${x.shorts}">${flag(x.id)}<span class="team-name">${esc(x.name)}</span>${stars(x.stars)}</button>`).join('')||`<p class="empty">${t('noTeams')}</p>`;
}

function hubScreen(){
 if(!cup)return titleScreen();if(cup.status!=='playing')return endingScreen();
 const me=team(cup.player),m=nextMatch(cup),op=team(m.b);
 const tabs=cup.stage===0?['group','results','all']:['bracket','results','all'];
 if(!tabs.includes(tab))tab=tabs[0];
 const tabName=k=>k==='group'?t('tabGroup',{g:groupLetter(playerGroup(cup))}):k==='results'?t('tabResults'):k==='all'?t('tabAll'):t('tabBracket');
 show(`<header class="bar">
  <button class="icon-btn" data-action="title" aria-label="${t('menu')}">${ICON.back}</button>
  <div class="bar-team">${flag(me.id)}<b>${esc(me.name)}</b></div>
  <ol class="stepper">${t('stages').map((n,i)=>`<li class="${i<cup.stage?'done':i===cup.stage?'now':''}"><i></i><span>${n}</span></li>`).join('')}</ol>
  <div class="bar-end"><button class="icon-btn" data-action="rules" aria-label="${t('rules')}">${ICON.info}</button>${soundBtn()}</div>
 </header>
 <div class="hub-body">
  <section class="next-card" style="--a:${me.shirt};--b:${op.shirt}">
   <div class="next-label"><span>${t('nextMatch')}</span><b>${esc(matchLabel(m))}</b></div>
   <div class="next-teams">
    <div class="side">${flag(me.id,'flag-lg')}<strong>${esc(me.name)}</strong>${stars(me.stars)}</div>
    <div class="vs">${t('vs')}</div>
    <div class="side">${flag(op.id,'flag-lg')}<strong>${esc(op.name)}</strong>${stars(op.stars)}</div>
   </div>
   <button class="btn btn-primary btn-xl" data-action="play">${ICON.play}<span>${cup.stage===5?t('playFinal'):t('playNow')}</span></button>
  </section>
  <section class="hub-panel">
   <div class="tabs" role="tablist">${tabs.map(k=>`<button role="tab" class="tab" data-action="tab" data-tab="${k}" aria-selected="${k===tab}">${tabName(k)}</button>`).join('')}</div>
   <div class="tab-body" id="tab-body"></div>
  </section>
 </div>`,'hub');
 renderTab();
 setTimeout(()=>{if(screen==='hub'){warmKit(me,me.keeper);warmKit(op,op.keeper);}},300);
}
function renderTab(){
 const el=$('#tab-body');if(!el)return;
 if(tab==='group')el.innerHTML=table(playerGroup(cup));
 else if(tab==='results')el.innerHTML=resultsList()||`<p class="empty">${t('noResults')}</p>`;
 else if(tab==='all')el.innerHTML=`<div class="all-groups">${cup.groups.map((g,i)=>`<div class="mini${g.includes(cup.player)?' mine':''}"><h4>${t('group',{g:groupLetter(i)})}</h4>${table(i,true)}</div>`).join('')}</div>`;
 else el.innerHTML=bracketTree();
 el.querySelector('.b-col.now .b-match.mine')?.scrollIntoView({block:'center',inline:'center'});
}
function table(gi,compact=false){
 const rows=standings(cup,cup.groups[gi]),h=t('tableHead');
 return `<table class="standings${compact?' compact':''}"><thead><tr><th></th><th>${h[0]}</th><th>${h[1]}</th><th>${h[2]}</th><th>${h[3]}</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="q${i}${r.id===cup.player?' you':''}"><td><span class="pos">${i+1}</span></td><td class="nation">${flag(r.id)}<span>${esc(compact?team(r.id).code:team(r.id).name)}</span></td><td>${r.played}</td><td>${r.gd>0?'+':''}${r.gd}</td><td><b>${r.points}</b></td></tr>`).join('')}</tbody></table>`;
}
function resultsList(){
 return cup.history.map(h=>{const res=h.x>h.y?'w':h.x<h.y?'l':'d';
  return `<div class="result-row"><span class="badge ${res}">${t(res==='w'?'win':res==='l'?'loss':'drawShort')}</span><span class="r-stage">${t('stages')[h.stage]}</span><span class="r-team">${flag(h.a)}<span>${esc(team(h.a).name)}</span></span><b class="r-score">${h.x}–${h.y}</b><span class="r-team right"><span>${esc(team(h.b).name)}</span>${flag(h.b)}</span></div>`;}).join('');
}
function bracketTree(){
 const cols=[];
 for(let st=1;st<=5;st++){
  const n=16>>(st-1),log=cup.knockoutLog?.find(k=>k.stage===st),pairs=log?log.pairs:st===cup.stage?cup.bracket:null,winners=log?.winners;
  const row=(id,i)=>id?`<div class="b-team${winners?winners[i]===id?' win':' lose':''}${id===cup.player?' you':''}">${flag(id)}<span>${team(id).code}</span></div>`:`<div class="b-team tbd"><span class="flag ph"></span><span>—</span></div>`;
  const cells=Array.from({length:n},(_,i)=>{const p=pairs?.[i];return `<div class="b-match${p?.includes(cup.player)?' mine':''}">${row(p?.[0],i)}${row(p?.[1],i)}</div>`;}).join('');
  cols.push(`<div class="b-col${st===cup.stage?' now':''}"><div class="b-head">${t('stages')[st]}</div><div class="b-cells">${cells}</div></div>`);
 }
 return `<div class="bracket">${cols.join('')}<div class="b-col final-col"><div class="b-head">&nbsp;</div><div class="b-cells"><div class="b-trophy">${TROPHY}</div></div></div></div>`;
}

function endingScreen(){
 const win=cup.status==='champion',me=team(cup.player),st=cup.stats||{kicks:0,goals:0,saves:0};
 const body=win?t('champBody'):cup.stage===1&&cup.history.length===3?t('groupOut'):t('outAt',{stage:t('stages')[cup.history.at(-1)?.stage||0]});
 show(`<div class="ending ${win?'won':'lost'}" style="--c1:${me.shirt};--c2:${me.shorts}">
  <div class="ending-art">${win?`<div class="rays"></div>${TROPHY}`:`<div class="lost-flag">${flag(me.id,'flag-xxl')}</div>`}</div>
  <div class="ending-text">
   <span class="eyebrow">${flag(me.id,'flag-sm')} ${esc(me.name)} · ${win?t('champEyebrow'):t('endEyebrow')}</span>
   <h1>${win?t('champTitle'):t('endTitle')}</h1>
   <p class="lead">${esc(body)}</p>
   ${st.kicks?`<p class="stat-line">${t('statsLine',st)}</p>`:''}
   <div class="campaign"><h4>${t('campaign')}</h4>${resultsList()}</div>
   <div class="ending-actions"><button class="btn btn-primary btn-xl" data-action="select">${ICON.play}<span>${t('newTournament')}</span></button><button class="btn btn-ghost" data-action="title">${t('menu')}</button></div>
  </div>
 </div>`,'ending');
 if(win){menuFx.confetti(innerWidth,innerHeight,[me.shirt,me.shorts,'#ffd34d','#ffffff'],240);sdk.happytime();audio.play('victory');}
}

// ---------- Modals ----------
function modal({title,body,actions=[],dismiss=true}){
 const el=document.createElement('div');el.className='modal-backdrop';
 el.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h3>${title}</h3><div class="modal-body">${body}</div><div class="modal-actions">${actions.map((a,i)=>`<button class="btn ${a.primary?'btn-primary':'btn-ghost'}" data-i="${i}">${a.label}</button>`).join('')}</div></div>`;
 const onKey=e=>{if(e.key==='Escape'&&dismiss){e.stopPropagation();close();}};
 const close=()=>{el.classList.add('out');document.removeEventListener('keydown',onKey,true);setTimeout(()=>el.remove(),160);};
 el.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b){close();actions[+b.dataset.i].onClick?.();}else if(dismiss&&e.target===el)close();});
 document.addEventListener('keydown',onKey,true);$('#modal-root').append(el);el.querySelector('.btn-primary')?.focus();
}
const rulesModal=()=>modal({title:t('rules'),body:t('rulesBody'),actions:[{label:t('close'),primary:true}]});

// ---------- Actions (event delegation) ----------
const ACTIONS={
 sound(){audio.setMuted(!audio.isMuted());document.querySelectorAll('[data-action="sound"]').forEach(b=>{b.innerHTML=audio.isMuted()?ICON.soundOff:ICON.soundOn;b.setAttribute('aria-label',audio.isMuted()?t('soundOff'):t('soundOn'));});audio.play('click');},
 rules:rulesModal,
 title:titleScreen,
 select:selectScreen,
 resume(){cup=JSON.parse(JSON.stringify(saved));hubScreen();},
 filter(el){filter=el.dataset.region;document.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',c===el));renderTeamGrid();},
 pick(el){
  selected=el.dataset.team;try{localStorage.setItem(SELECTED_KEY,selected);}catch{}
  document.querySelectorAll('.team-card').forEach(c=>{const on=c.dataset.team===selected;c.classList.toggle('selected',on);c.setAttribute('aria-pressed',on);});
  renderShowcase();audio.play('select');
  if(matchMedia('(max-width:700px)').matches)$('#showcase')?.scrollIntoView({behavior:'smooth',block:'nearest'});
 },
 start(){
  const go=()=>{cup=createTournament(selected);cup.stats={kicks:0,goals:0,saves:0,faced:0};persist();startMatch();};
  if(saved?.status==='playing')modal({title:t('replaceTitle'),body:`<p>${t('replaceBody',{team:`<b>${esc(team(saved.player).name)}</b>`})}</p>`,actions:[{label:t('cancel')},{label:t('replaceYes'),primary:true,onClick:go}]});
  else go();
 },
 tab(el){tab=el.dataset.tab;document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',b===el));renderTab();},
 play:()=>startMatch(),
 curl(el){setCurl(arena?arena.curl+(+el.dataset.dir)*.25:0);}
};
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-action]');
 if(el&&ACTIONS[el.dataset.action]){if(!el.dataset.silent)audio.play('click');ACTIONS[el.dataset.action](el,e);}
});
document.addEventListener('pointerdown',()=>audio.unlock(),{capture:true});
document.addEventListener('keydown',()=>audio.unlock(),{capture:true});

// ---------- Match ----------
// Both nations take their kicks from the same spots, so the duel is fair.
function spotFor(i){while(arena.spots.length<=i)arena.spots.push(createSpot(arena.match.stage,arena.spots.length));return arena.spots[i];}
function startMatch(retried=false){
 const m=nextMatch(cup);if(!m)return hubScreen();
 const A=team(m.a),B=team(m.b);
 warmKit(A,A.keeper);warmKit(B,B.keeper);
 arena={match:m,A,B,a:[],b:[],spots:[],phase:'intro',since:clock,hold:null,aimX:.82,aimY:.22,curl:0,zone:{lo:SWEET_LOW,hi:.94},power:0,powerZone:'low',spread:0,shot:null,toast:'',paused:false,history:[],cursor:{x:.5,y:.6},fx:new Particles(),retried,shakeAmp:0,shakeAt:0,flashUntil:0,boardFlashUntil:0,slowAt:null,zoom:1,stats:{kicks:0,goals:0,saves:0,faced:0}};
 show(`<div class="game-shell">
  <div class="match-top">
   <span class="match-label">${esc(matchLabel(m))} · ${m.stage===0?t('kicks5'):t('knockout')}</span>
   <div class="bar-end">${soundBtn()}<button class="icon-btn" id="pause" aria-label="${t('pause')}">${ICON.pause}</button></div>
  </div>
  <div class="arena" id="arena">
   <canvas id="field" tabindex="0" aria-label="${esc(t('instrShoot'))}"></canvas>
   <div class="scoreboard">
    <div class="sb-team"><i class="sb-color" style="background:${A.shirt}"></i>${flag(A.id)}<span>${A.code}</span></div>
    <div class="sb-score"><span id="score-a">0</span><span class="sb-sep"></span><span id="score-b">0</span></div>
    <div class="sb-team right"><span>${B.code}</span>${flag(B.id)}<i class="sb-color" style="background:${B.shirt}"></i></div>
    <div class="sb-dots" id="dots-a"></div><div></div><div class="sb-dots right" id="dots-b"></div>
   </div>
   <div class="spot-chip" id="spot-chip"></div>
   <div id="toast" class="toast" aria-live="polite"></div>
   <div id="coach" class="coach" hidden></div>
   <div class="game-caption">
    <div class="phase-label"><small id="phase-small"></small><span id="phase"></span></div>
    <div class="power-box"><span id="meter-label"></span><div class="power-track" id="power-track"><b class="zone"></b><i id="power"></i></div></div>
   </div>
   <div class="vs-intro" id="vs-intro">
    <div class="vs-half a" style="--c:${A.shirt};--c2:${A.shorts}">${flag(A.id,'flag-xl')}<b>${esc(A.name)}</b>${stars(A.stars)}</div>
    <div class="vs-half b" style="--c:${B.shirt};--c2:${B.shorts}">${flag(B.id,'flag-xl')}<b>${esc(B.name)}</b>${stars(B.stars)}</div>
    <div class="vs-mark">${t('vs')}</div>
    <div class="vs-label">${esc(matchLabel(m))}</div>
   </div>
  </div>
  <div class="controls-row">
   <div class="curl-box" id="curl-box">
    <span class="curl-label">${t('curl')}</span>
    <div class="curl-ctl"><button class="icon-btn" data-action="curl" data-dir="-1" aria-label="${t('curlLeft')}">${ICON.curlL}</button><div class="curl-track" id="curl-track"><i id="curl-knob"></i></div><button class="icon-btn" data-action="curl" data-dir="1" aria-label="${t('curlRight')}">${ICON.curlR}</button></div>
   </div>
   <div class="instruction"><strong id="instruction"></strong><span class="keys">${t('keys')}</span></div>
   <button class="btn btn-primary action-button" id="action"></button>
  </div>
 </div>`,'match');
 arena.scene=createScene($('#field'),spotFor(0));
 const canvas=$('#field');
 canvas.onpointerdown=e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);inputDown(e);};
 canvas.onpointermove=e=>pointAt(e);
 canvas.onpointerup=e=>{e.preventDefault();inputUp();};
 canvas.onpointercancel=()=>{if(arena?.phase==='aim')arena.hold=null;};
 canvas.onwheel=e=>{if(arena?.phase==='aim'&&arena.hold===null){e.preventDefault();setCurl(arena.curl+(e.deltaY>0?.25:-.25));}};
 const action=$('#action');
 action.onpointerdown=e=>{e.preventDefault();action.setPointerCapture(e.pointerId);inputDown();};
 action.onpointerup=e=>{e.preventDefault();inputUp();};
 action.onpointercancel=()=>{if(arena?.phase==='aim')arena.hold=null;};
 $('#pause').onclick=pause;
 setCurl(0);score();updateLabels();audio.play('swoosh');
 sdk.gameplayStart();
}
function setCurl(v){
 if(!arena||(arena.phase!=='aim'&&arena.phase!=='intro')||arena.hold!==null)return;
 arena.curl=clamp(Math.round(v*4)/4,-1,1);
 const knob=$('#curl-knob');if(knob){knob.style.left=(arena.curl+1)*50+'%';knob.className=arena.curl?'on':'';}
 if(arena.curl&&coach.curl<1){coach.curl++;saveCoach();}
}
function goalCoords(e){const r=$('#field').getBoundingClientRect(),sc=arena.scene,g=sc.goal;return {x:((e.clientX-r.left)/r.width*sc.w-g.x)/g.w,y:((e.clientY-r.top)/r.height*sc.h-g.y)/g.h};}
function pointAt(e){
 if(!arena||arena.paused||!arena.scene?.goal)return;
 const p=goalCoords(e);
 if(arena.phase==='aim'){arena.aimX=clamp(p.x,-.1,1.1);arena.aimY=clamp(p.y,-.12,1.02);}
 else if(arena.phase.startsWith('defend')&&!arena.dive)arena.cursor={x:clamp(p.x,-.05,1.05),y:clamp(p.y,-.05,1.05)};
}
function score(){
 if(!arena)return;$('#score-a').textContent=arena.a.filter(Boolean).length;$('#score-b').textContent=arena.b.filter(Boolean).length;
 for(const [side,arr] of [['a',arena.a],['b',arena.b]]){const recent=arr.length>5?arr.slice(5):arr;$('#dots-'+side).innerHTML=Array.from({length:Math.max(5,recent.length)},(_,i)=>`<i class="${i<recent.length?recent[i]?'goal':'miss':''}"></i>`).join('');}
}
function pulseScore(side){const el=$('#score-'+side);if(!el)return;el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}
function decisive(){
 const shooter=arena.phase==='aim'?'a':'b',group=arena.match.stage===0;
 const test=v=>shootoutFinished(shooter==='a'?[...arena.a,v]:arena.a,shooter==='b'?[...arena.b,v]:arena.b,group);
 return test(true)||test(false);
}
function showCoach(kind){
 const el=$('#coach');if(!el)return;
 const key=kind==='shoot'?(coach.shoot<2?'firstShot':coach.curl<1&&arena.a.length>=1?'firstCurl':null):kind==='save'&&coach.save<2?'firstSave':null;
 if(key){el.textContent=t(key);el.hidden=false;el.dataset.kind=kind;}else el.hidden=true;
}
function spotChip(sp){const el=$('#spot-chip');if(el)el.innerHTML=`<b>${Math.round(sp.dist)}m</b><span>${t('wallOf',{n:sp.men})}</span>`;}
function setPhase(p){
 const wasDecisive=arena.decisive;
 arena.phase=p;arena.since=clock;arena.hold=null;arena.toast='';arena.slowAt=null;arena.decisive=false;arena.power=0;arena.spread=0;
 if(p==='aim'||p==='defendWait'){
  const sp=spotFor(p==='aim'?arena.a.length:arena.b.length);arena.spot=sp;setSpot(arena.scene,sp);spotChip(sp);
  arena.shot=null;arena.dive=null;
 }
 if(p==='aim'){
  // Start on the far corner from the wall, so the first look at the goal already shows an open target.
  arena.aimX=arena.spot.side<0?.84:.16;arena.aimY=.24;updateZone();
  arena.decisive=decisive();audio.play('whistle');showCoach('shoot');
 }
 if(p==='defendWait'){
  const st=arena.match.stage;
  arena.tellAt=null;arena.cursor={x:.5,y:.6};arena.wait=1700+Math.random()*600;
  arena.decisive=decisive();audio.play('whistle');showCoach('save');
 }
 if(p==='flight')arena.decisive=wasDecisive;
 setCurl(arena.curl);
 updateLabels();
}
function updateLabels(){
 if(!arena||!$('#phase'))return;
 const def=arena.phase.startsWith('defend')||(arena.phase==='result'&&arena.lastAttacker==='cpu'),busy=['intro','flight','result','over'].includes(arena.phase);
 $('#phase').textContent=def?t('save'):t('shoot');
 const small=$('#phase-small');
 small.textContent=arena.decisive?t('decisive'):arena.a.length>=5&&arena.match.stage>0?t('suddenDeath'):def?t('protect'):t('yourTurn');
 small.classList.toggle('hot',!!arena.decisive);
 $('#instruction').textContent=def?t('instrSave'):t('instrShoot');
 $('#action').textContent=def?t('saveBtn'):t('holdBtn');$('#action').disabled=busy;
 $('#meter-label').textContent=def?t('meterReaction'):t('meterPower');
 $('#power-track').classList.toggle('defending',def);
 $('#curl-box').classList.toggle('off',def||busy);
 const toast=$('#toast');if(toast.dataset.html!==arena.toast){toast.dataset.html=arena.toast;toast.innerHTML=arena.toast;}
 $('#arena').classList.toggle('decisive',!!arena.decisive&&!busy);
}
function inputDown(e){
 if(!arena||arena.paused)return;
 if(arena.phase==='aim'){if(e)pointAt(e);arena.hold=clock;$('#coach').hidden=true;return;}
 if(!['defendWait','defendRun'].includes(arena.phase)||arena.dive)return;
 if(e)pointAt(e);
 // A dive before the ball is struck is ignored, not punished.
 if(!arena.shot||clock<arena.shot.at+RUN_MS)return;
 const c=arena.cursor;arena.dive=createDive(c.x,c.y,clock,{who:'player',speed:DEFEND[arena.match.stage].speed,hold:650});$('#coach').hidden=true;
 audio.play('swoosh');
}
function powerZone(p){const z=arena.zone;return p<z.lo?'low':p<=z.hi?'sweet':'over';}
// The release window follows the aim: narrow when the ball must go over the wall, wide when it bends round.
function updateZone(){
 const z=sweetZone(arena.spot,arena.aimX,arena.aimY,arena.curl),el=$('#power-track .zone');arena.zone=z;
 if(el&&el.dataset.lo!==String(z.lo)){el.dataset.lo=z.lo;el.style.left=z.lo/POWER_MAX*100+'%';el.style.width=(z.hi-z.lo)/POWER_MAX*100+'%';el.classList.toggle('tight',z.lo>SWEET_LOW);}
}
const jumpTime=()=>RUN_MS+60+Math.random()*200;
function inputUp(){
 if(!arena||arena.paused||arena.phase!=='aim'||arena.hold===null)return;
 const p=Math.min(POWER_MAX,(clock-arena.hold)/POWER_MS),sp=arena.spot;
 const shot=strike(sp,{aimX:arena.aimX,aimY:arena.aimY,curl:arena.curl,power:p,jumpAt:jumpTime()});
 shot.attacker='player';shot.at=clock;
 if(!shot.wall){
  // The keeper reacts to the flight: late when the ball comes over the wall or bends a lot.
  shot.dive=cpuKeeperDive(sp,{...shot,x:clamp(shot.x),y:clamp(shot.y)},{stage:arena.match.stage,rating:arena.B.rating,contact:clock+RUN_MS});
  shot.saved=!!shot.inGoal&&canSave(shot.dive,{x:shot.x,y:shot.y},clock+RUN_MS+shot.flight);
 }
 shot.goal=!!shot.inGoal&&!shot.saved;
 arena.shot=shot;arena.history.push(shot.x);
 if(coach.shoot<2){coach.shoot++;saveCoach();}
 setPhase('flight');
 if(shot.saved||shot.post||arena.decisive)arena.slowAt=clock+RUN_MS+shot.flight;
}
window.addEventListener('keydown',e=>{
 if(screen!=='match'||!arena||$('.modal-backdrop'))return;
 if(e.code==='Escape'){e.preventDefault();pause();return;}
 if(arena.paused||arena.phase==='over')return;
 if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
 if(e.code==='KeyQ'||e.code==='KeyZ')setCurl(arena.curl-.25);
 if(e.code==='KeyE'||e.code==='KeyX')setCurl(arena.curl+.25);
 const dx=e.code==='ArrowLeft'?-1:e.code==='ArrowRight'?1:0,dy=e.code==='ArrowUp'?-1:e.code==='ArrowDown'?1:0;
 if(arena.phase==='aim'&&(dx||dy)){arena.aimX=clamp(arena.aimX+dx*.07,-.1,1.1);arena.aimY=clamp(arena.aimY+dy*.09,-.12,1.02);}
 if(arena.phase.startsWith('defend')&&!arena.dive&&(dx||dy)){const c=arena.cursor;c.x=clamp(c.x+dx*.16,0,1);c.y=clamp(c.y+dy*.22,.05,.95);}
 if(e.code==='Space'&&!e.repeat)inputDown();
});
window.addEventListener('keyup',e=>{if(e.code==='Space'&&screen==='match'){e.preventDefault();inputUp();}});
function pause(){
 if(!arena||arena.phase==='over')return;
 if(arena.paused){arena.paused=false;$('#pause-overlay')?.remove();$('#arena')?.classList.remove('paused');sdk.gameplayStart();return;}
 arena.paused=true;arena.hold=null;$('#arena').classList.add('paused');sdk.gameplayStop();
 const overlay=document.createElement('div');overlay.className='result-overlay';overlay.id='pause-overlay';
 overlay.innerHTML=`<div class="result-box"><span class="eyebrow">${t('pausedSub')}</span><h2>${t('paused')}</h2><p>${t('pausedBody')}</p><div class="result-actions"><button class="btn btn-primary btn-xl" id="unpause">${ICON.play}<span>${t('resume')}</span></button><button class="btn btn-ghost" id="leave">${t('leave')}</button></div></div>`;
 $('#arena').append(overlay);$('#unpause').onclick=pause;$('#leave').onclick=hubScreen;$('#unpause').focus();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&arena&&!arena.paused&&!manual)pause();});
window.addEventListener('blur',()=>{if(arena&&!arena.paused&&screen==='match'&&!manual)pause();});

function shake(amount){arena.shakeAmp=amount;arena.shakeAt=performance.now();}
function goalPoint(x,y){const g=arena.scene.goal;return {x:g.x+clamp(x,-.02,1.02)*g.w,y:g.y+clamp(y,-.03,1)*g.h};}
function toastHtml(kind,good,sub){const label=t(kind);return `<div class="toast-inner ${kind} ${good?'good':'bad'}">${label}<small>${esc(sub)}</small></div>`;}
function completeKick(reason){
 const s=arena.shot,player=s.attacker==='player',arr=player?arena.a:arena.b;
 arr.push(s.goal);score();if(s.goal)pulseScore(player?'a':'b');
 arena.lastAttacker=s.attacker;
 const st=arena.stats;if(player){st.kicks++;if(s.goal)st.goals++;}else{st.faced++;if(s.saved||s.wall)st.saves++;}
 const kind=s.goal?'goal':s.wall?'wall':s.saved?'saved':s.bar?'bar':s.post?'post':s.over?'over':'wide';
 let sub;
 if(player)sub=s.goal?pick(Math.abs(s.curl)>=.5?'goalYouCurl':'goalYou'):s.wall?t(s.power<SWEET_LOW?'wallLow':'wallMsg'):s.saved?pick('savedThem'):s.post?t('postMsg'):s.weak?t('weak'):s.over?t('overMsg'):t('wideMsg');
 else sub=s.wall?t('wallYou'):s.saved?pick('savedYou'):!s.goal?t('theyMissed'):reason==='nodive'?t('noDive'):reason==='late'?t('lateMsg'):reason==='early'?t('earlyMsg'):reason==='wrong'?t('wrongMsg'):pick('goalThem');
 arena.toast=toastHtml(kind,player?s.goal:!s.goal,sub);
 arena.phase='result';arena.since=clock;updateLabels();
 const sc=arena.scene,p=goalPoint(s.x,s.y);
 if(s.goal){
  setTimeout(()=>audio.play('net'),60);shake(7);arena.flashUntil=clock+2200;arena.boardFlashUntil=clock+2600;
  if(player){audio.play('roar');arena.fx.confetti(sc.w,sc.h,[arena.A.shirt,arena.A.shorts,'#ffd34d','#ffffff'],120);}else audio.play('groan');
 }else if(s.saved){
  audio.play('glove');shake(4);arena.fx.burst(p.x,p.y,['#ffffff','#ffd9a8','#9fd8ff'],22,220);
  audio.play(player?'groan':'roar');
  if(!player){arena.flashUntil=clock+1400;arena.fx.confetti(sc.w,sc.h,[arena.A.shirt,arena.A.shorts,'#ffffff'],60);}
 }else if(s.post){audio.play('post');shake(10);arena.fx.burst(p.x,p.y,['#ffffff','#fff3b0'],16,260);audio.play('gasp');}
 else if(!s.wall)audio.play(player?'groan':'roar');
}
function matchOver(){
 arena.phase='over';sdk.gameplayStop();updateLabels();
 const x=arena.a.filter(Boolean).length,y=arena.b.filter(Boolean).length;
 if(x<y&&arena.match.stage>0&&!arena.retried&&sdk.rewardedAvailable())return secondChance(x,y);
 commitResult(x,y);
}
function scoreLine(x,y){return `<div class="big-score">${flag(arena.match.a,'flag-md')}<span>${x}</span><i>–</i><span>${y}</span>${flag(arena.match.b,'flag-md')}</div>`;}
function overlay(html){const el=document.createElement('div');el.className='result-overlay';el.innerHTML=`<div class="result-box">${html}</div>`;$('#arena').append(el);return el;}
function secondChance(x,y){
 const el=overlay(`<span class="eyebrow">${esc(matchLabel(arena.match))}</span><h2 class="bad">${t('defeat')}</h2>${scoreLine(x,y)}<h3>${t('secondTitle')}</h3><p>${t('secondBody')}</p><div class="result-actions"><button class="btn btn-primary btn-xl" id="retry">${ICON.play}<span>${t('secondYes')}</span></button><button class="btn btn-ghost" id="accept">${t('secondNo')}</button></div>`);
 audio.play('defeat');
 $('#retry').onclick=async()=>{const ok=await sdk.ad('rewarded',{onStart:()=>audio.duck(true)});audio.duck(false);if(ok)startMatch(true);else{el.remove();commitResult(x,y);}};
 $('#accept').onclick=()=>{el.remove();commitResult(x,y);};
}
function commitResult(x,y){
 const st=cup.stats??={kicks:0,goals:0,saves:0,faced:0};for(const k in arena.stats)st[k]=(st[k]||0)+arena.stats[k];
 finishMatch(cup,x,y);persist();
 const won=x>y,draw=x===y,m=arena.match;
 const msg=cup.status==='champion'?t('rChampion'):cup.status==='eliminated'?t('rOut'):m.stage===0?(won?t('rGroupWin'):draw?t('rGroupDraw'):t('rGroupLoss')):t('rKoWin');
 const btn=cup.status==='champion'?t('lift'):cup.status==='eliminated'?t('viewCampaign'):t('continue');
 overlay(`<span class="eyebrow">${esc(matchLabel(m))}</span><h2 class="${won?'good':draw?'':'bad'}">${won?t('victory'):draw?t('draw'):t('defeat')}</h2>${scoreLine(x,y)}<p>${msg}</p><div class="result-actions"><button class="btn btn-primary btn-xl" id="continue">${ICON.play}<span>${btn}</span></button></div>`);
 if(won){audio.play('victory');const sc=arena.scene;arena.fx.confetti(sc.w,sc.h,[arena.A.shirt,arena.A.shorts,'#ffd34d','#ffffff'],160);sdk.happytime();}else if(!draw)audio.play('defeat');
 $('#continue').focus();
 $('#continue').onclick=async()=>{
  if(cup.status==='playing'){$('#continue').disabled=true;await sdk.ad('midgame',{onStart:()=>audio.duck(true)});audio.duck(false);}
  hubScreen();
 };
}
function wallHit(){
 const s=arena.shot,sp=arena.spot,p=arena.scene.project(s.hit.x,sp.wz+.2,s.hit.h);
 audio.play('glove');audio.play(s.attacker==='player'?'groan':'roar');shake(5);
 arena.fx.burst(p.x,p.y,['#ffffff','#ffd9a8','#c9b98a'],18,200);
}
function tick(){
 if(!arena||arena.paused)return;
 const age=clock-arena.since,s=arena.shot;
 if(arena.phase==='intro'){if(age>1900){$('#vs-intro')?.remove();setPhase('aim');}return;}
 // Contact: kick sound and a puff of turf from the spot.
 if(s&&!s.kickSound&&clock-s.at>=RUN_MS){s.kickSound=true;audio.play('kick');const b=arena.scene.ball;arena.fx.burst(b.x,b.y+b.r,['#5d8f45','#7fae58','#c9b98a'],14,120);}
 if(s?.wall&&!s.wallSound&&clock-s.at>=RUN_MS+s.flight*arena.spot.uw){s.wallSound=true;wallHit();}
 if(arena.phase==='aim'){
  if(arena.hold===null)updateZone();
  const meter=$('#power');
  if(arena.hold===null){meter.style.width='0%';meter.className='';}
  else{
   const p=Math.min(POWER_MAX,(clock-arena.hold)/POWER_MS);arena.power=p;arena.powerZone=powerZone(p);arena.spread=shotSpread(p);
   meter.style.width=p/POWER_MAX*100+'%';meter.className=arena.powerZone;
   if(p>=POWER_MAX)inputUp();
  }
 }
 if(arena.phase==='flight'&&clock-s.at>shotEnd(arena.spot,s)){completeKick();return;}
 if(arena.phase==='result'&&age>1700){if(shootoutFinished(arena.a,arena.b,arena.match.stage===0))matchOver();else setPhase(arena.lastAttacker==='player'?'defendWait':'aim');return;}
 if(arena.phase==='defendWait'&&age>arena.wait){
  const st=arena.match.stage,B=arena.B,sp=arena.spot;
  const shot=cpuStrike(sp,{stage:st,rating:B.rating,jumpAt:jumpTime()});
  shot.attacker='cpu';shot.at=clock;shot.goal=!!shot.inGoal;
  arena.shot=shot;
  // The tell flashes once the ball has cleared the wall. Later rounds give less warning and a vaguer flash.
  const arrival=clock+RUN_MS+shot.flight,diff=DEFEND[st],noise=diff.noise;
  // The ring flashes as the ball is struck and stays until it arrives: the whole flight to react and point.
  // Later rounds show it a little later and less precisely.
  arena.tellAt=clock+RUN_MS+diff.tell;arena.tellShow=arrival-arena.tellAt;
  arena.tell={x:clamp(shot.x,-.05,1.05)+(Math.random()-.5)*noise*2,y:clamp(shot.y,-.05,1.05)+(Math.random()-.5)*noise*2.4,r:.035+noise*.6};
  if(shot.wall)arena.tellAt=null;
  arena.phase='defendRun';arena.since=clock;
  if(arena.decisive)arena.slowAt=arrival;
  return;
 }
 if(arena.phase==='defendRun'){
  const sp=arena.spot,end=shotEnd(sp,s),left=s.at+RUN_MS+s.flight-clock;
  $('#power').style.width=clamp(left/(RUN_MS+s.flight))*100+'%';$('#power').className='react';
  if(arena.dive&&!arena.slowAt&&s.inGoal&&canSave(arena.dive,s,s.at+RUN_MS+s.flight))arena.slowAt=s.at+RUN_MS+s.flight;
  if(clock-s.at>end){
   const reason=s.inGoal?diveResult(arena.dive,s,s.at+RUN_MS+s.flight):'off';
   s.saved=reason==='saved';s.goal=!!s.inGoal&&!s.saved;
   if(coach.save<2&&arena.dive){coach.save++;saveCoach();}
   completeKick(reason);
  }
 }
}
function timeScale(){if(!arena?.slowAt)return 1;const d=clock-arena.slowAt;return d>-170&&d<70?.3:1;}

// ---------- Drawing ----------
function drawMatch(real){
 const m=arena,def=m.phase.startsWith('defend')||(m.phase==='result'&&m.lastAttacker==='cpu');
 const kit=def?m.B:m.A,wallKit=def?m.A:m.B,keeperColor=def?m.A.keeper:m.B.keeper;
 const sa=m.a.filter(Boolean).length,sb=m.b.filter(Boolean).length;
 const board=clock<m.boardFlashUntil?{text:`${t('goal')}   ${t('goal')}`,flash:true}:{text:`${m.A.name.toUpperCase()}  ${sa} – ${sb}  ${m.B.name.toUpperCase()}   •   NATIONS FREE KICK`};
 renderScene(m.scene,m,clock,kit,{keeperColor,wallKit,board});
 const sc=m.scene;if(!sc?.goal)return;
 if(!m.paused){
  const flashRate=clock<m.flashUntil?.6:.04;
  if(Math.random()<flashRate)m.fx.flashes(sc.w,sc.h*.03,sc.goal.y+sc.goal.h-sc.goal.h*.2,clock<m.flashUntil?2:1);
  m.fx.update(real*timeScale()/1000);
 }
 m.fx.draw(sc.ctx);
 // Broadcast camera: a push towards the goal while the ball is in the air.
 const s=m.shot,airborne=s&&(m.phase==='flight'||m.phase==='defendRun')&&clock-s.at>RUN_MS+120&&!s.wall;
 const target=airborne||(m.phase==='result'&&clock-m.since<800&&!s?.wall)?1.1:1;
 m.zoom+=(target-m.zoom)*Math.min(1,real/260);
 const k=Math.max(0,1-(performance.now()-m.shakeAt)/380),amp=m.shakeAmp*k*k;
 const gx=sc.goal.x+sc.goal.w/2,gy=sc.goal.y+sc.goal.h*.7;
 sc.canvas.style.transformOrigin=`${gx}px ${gy}px`;
 sc.canvas.style.transform=amp>.2||m.zoom>1.002?`translate(${(Math.random()-.5)*amp}px,${(Math.random()-.5)*amp}px) scale(${(m.zoom+(amp>.2?.02:0)).toFixed(4)})`:'';
}
function drawBackground(){
 if(!bgScene)return;
 const id=cup&&(screen==='hub'||screen==='ending')?cup.player:selected,me=team(id);
 const rival=cup&&screen==='hub'&&nextMatch(cup)?team(nextMatch(cup).b):{shirt:'#eef1f5',shorts:'#1d2b4a',keeper:'#f2c230'};
 renderScene(bgScene,null,clock,me,{keeperColor:rival.keeper,wallKit:rival,board:{text:`${me.name.toUpperCase()}   •   NATIONS FREE KICK   •   ${t('subtitle').toUpperCase()}`}});
}
function drawMenuFx(real){
 const dpr=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight;
 if(fxCanvas.width!==Math.round(w*dpr)||fxCanvas.height!==Math.round(h*dpr)){fxCanvas.width=Math.round(w*dpr);fxCanvas.height=Math.round(h*dpr);}
 const c=fxCanvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 menuFx.update(real/1000);menuFx.draw(c);
}
let wasFx=false,manual=false;
function frame(time){
 requestAnimationFrame(frame);
 if(!manual)run(time);
}
// One frame of game time. In manual mode (video capture) the caller steps it explicitly.
function run(time){
 const real=Math.min(50,time-last||16);last=time;
 if((manual||!document.hidden)&&!arena?.paused)clock+=real*timeScale();
 if(screen==='match'&&arena){tick();if(arena)drawMatch(real);}
 else if(screen!=='loading')drawBackground();
 if(menuFx.active||wasFx){drawMenuFx(real);wasFx=menuFx.active;}
}

// ---------- Boot ----------
async function boot(){
 try{const s=localStorage.getItem(SELECTED_KEY);if(team(s))selected=s;}catch{}
 document.querySelector('.loading-text').textContent=t('loading');
 const bar=document.querySelector('#load-bar');let done=0;
 const sdkReady=sdk.init().then(()=>sdk.loadingStart());
 const flags=TEAMS.map(x=>new Promise(r=>{const i=new Image();i.onload=i.onerror=r;i.src=flagSrc(x.id);}));
 const fonts=document.fonts?Promise.all(['800 20px "Barlow Condensed"','700 20px "Barlow Condensed"','400 16px Inter','600 16px Inter','800 16px Inter'].map(f=>document.fonts.load(f).catch(()=>{}))):Promise.resolve();
 const tasks=[sdkReady,fonts,spritesReady,stadiumLoaded,audio.audioLoaded,...flags];
 tasks.forEach(p=>p.then(()=>{done++;bar.style.width=Math.round(done/tasks.length*100)+'%';}));
 await Promise.all(tasks);
 loadSave();
 audio.setExternalMute(sdk.muteSetting());sdk.onSettingsChange(s=>audio.setExternalMute(s.muteAudio));
 sdk.loadingStop();
 bgScene=createScene(bgCanvas);
 document.querySelector('.loading')?.classList.add('done');
 setTimeout(()=>document.querySelector('.loading')?.remove(),500);
 titleScreen();
}
requestAnimationFrame(frame);
// Testing aid: ?debugloop keeps the game ticking in hidden/throttled preview panes.
if(new URLSearchParams(location.search).has('debugloop')){setInterval(()=>{if(performance.now()-last>30)frame(performance.now());},16);window.__debug={load:c=>{cup=c;hubScreen();},get arena(){return arena;},get clock(){return clock;},shoot(power){if(arena?.phase!=='aim')return;arena.hold=clock-power*POWER_MS;inputUp();},
 // Video capture: freeze the loop, then step it frame by frame and drive the controls.
 manual(v){manual=v;last=performance.now();},step(ms){run(last+ms);},down:()=>inputDown(),up:()=>inputUp(),setCurl,score};}
boot();
