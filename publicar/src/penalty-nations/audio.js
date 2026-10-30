// Stadium audio. Recorded CC0 samples (assets/sfx, see CREDITS.txt) for the crowd, whistle,
// kick and woodwork; small synthesised sounds for the UI. If a sample fails to load, the
// matching synthesised fallback plays instead.
let ctx=null,master=null,crowdGain=null,crowdFilter=null,noiseBuffer=null,muted=false,externalMute=false,ducked=false;
const PREF='penalty-nations.muted';
const FILES={crowd:'crowd-loop.wav',roar:'goal-roar.wav',roar2:'goal-roar2.wav',groan:'crowd-groan.wav',whistle:'whistle.wav',kick:'kick.wav',post:'post.wav'};
const raw={},buffers={};
try{muted=localStorage.getItem(PREF)==='1';}catch{}
// Fetch the files early (no AudioContext needed); decoding happens on the first gesture.
export const audioLoaded=Promise.all(Object.entries(FILES).map(([k,f])=>fetch(new URL('./assets/sfx/'+f,import.meta.url)).then(r=>r.ok?r.arrayBuffer():null).then(b=>{raw[k]=b;}).catch(()=>{})));
export const isMuted=()=>muted;
function level(){return muted||externalMute||ducked?0:1;}
function applyLevel(){if(master&&ctx)master.gain.setTargetAtTime(level()*.9,ctx.currentTime,.05);}
export function setMuted(v){muted=v;try{localStorage.setItem(PREF,v?'1':'0');}catch{}applyLevel();}
export function setExternalMute(v){externalMute=!!v;applyLevel();}
export function duck(v){ducked=!!v;applyLevel();}
// Browsers only allow audio after a gesture; the first pointer/key press unlocks it.
export function unlock(){
 if(!ctx){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{ctx=new AC();}catch{return;}
  master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
  const len=ctx.sampleRate*2;noiseBuffer=ctx.createBuffer(1,len,ctx.sampleRate);const d=noiseBuffer.getChannelData(0);
  let b0=0,b1=0,b2=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;b0=.99765*b0+w*.099;b1=.963*b1+w*.2965;b2=.57*b2+w*1.0526;d[i]=(b0+b1+b2+w*.1848)*.2;}
  crowdFilter=ctx.createBiquadFilter();crowdFilter.type='lowpass';crowdFilter.frequency.value=2600;
  crowdGain=ctx.createGain();crowdGain.gain.value=.3;crowdFilter.connect(crowdGain);crowdGain.connect(master);
  audioLoaded.then(decodeAll);
 }
 if(ctx.state==='suspended')ctx.resume();applyLevel();
}
async function decodeAll(){
 await Promise.all(Object.entries(raw).map(async([k,b])=>{if(!b)return;try{buffers[k]=await ctx.decodeAudioData(b.slice(0));}catch{}}));
 startCrowd();
}
function startCrowd(){
 let src;
 if(buffers.crowd){src=ctx.createBufferSource();src.buffer=buffers.crowd;src.loop=true;}
 else{src=noise();crowdGain.gain.value=.06;}
 src.connect(crowdFilter);src.start(0,Math.random()*(buffers.crowd?.duration||1));
}
function noise(){const s=ctx.createBufferSource();s.buffer=noiseBuffer;s.loop=true;s.loopStart=Math.random();return s;}
function env(g,t,peak,attack,decay){g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(peak,t+attack);g.gain.exponentialRampToValueAtTime(0.0001,t+attack+decay);}
function burst({freq=1000,q=1,type='bandpass',peak=.3,attack=.005,decay=.2,sweep=null,delay=0}){
 const t=ctx.currentTime+delay,s=noise(),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type=type;f.frequency.setValueAtTime(freq,t);f.Q.value=q;if(sweep)f.frequency.exponentialRampToValueAtTime(sweep,t+attack+decay);
 s.connect(f);f.connect(g);g.connect(master);env(g,t,peak,attack,decay);s.start(t);s.stop(t+attack+decay+.05);
}
function tone({freq,type='sine',peak=.2,attack=.005,decay=.3,slide=null,delay=0}){
 const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+attack+decay);
 o.connect(g);g.connect(master);env(g,t,peak,attack,decay);o.start(t);o.stop(t+attack+decay+.05);
}
// Play a recorded sample; returns false when it is not available so a fallback can run.
function sample(name,{gain=1,rate=1,delay=0}={}){
 const b=buffers[name];if(!b)return false;
 const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;s.playbackRate.value=rate*(1+(Math.random()-.5)*.04);g.gain.value=gain;s.connect(g);g.connect(master);s.start(ctx.currentTime+delay);return true;
}
// The ambience swells with the moment and settles back.
function crowd(peak,hold){
 if(!crowdGain)return;const t=ctx.currentTime,base=buffers.crowd?.3:.06;
 crowdGain.gain.cancelScheduledValues(t);crowdGain.gain.setTargetAtTime(base*peak,t,.08);crowdGain.gain.setTargetAtTime(base,t+hold,.9);
}
const SOUNDS={
 click(){tone({freq:900,type:'triangle',peak:.08,decay:.05});},
 select(){tone({freq:660,type:'triangle',peak:.08,decay:.08});tone({freq:990,type:'triangle',peak:.06,decay:.1,delay:.05});},
 whistle(){if(!sample('whistle',{gain:.45}))for(const f of [2650,2950])tone({freq:f,peak:.04,decay:.35});},
 kick(){if(!sample('kick',{gain:1})){tone({freq:160,slide:45,peak:.55,decay:.18});burst({freq:2500,q:.8,peak:.25,decay:.04});}},
 net(){burst({freq:2200,q:.7,peak:.18,attack:.01,decay:.35,sweep:900});burst({freq:500,q:1,peak:.1,attack:.01,decay:.25});},
 glove(){if(!sample('kick',{gain:.9,rate:.62}))tone({freq:120,slide:60,peak:.3,decay:.12});burst({freq:500,type:'lowpass',q:.7,peak:.3,decay:.1});},
 post(){if(!sample('post',{gain:.95}))for(const [f,p] of [[523,.18],[1367,.1],[2210,.07]])tone({freq:f,peak:p,decay:1.1});},
 roar(){crowd(2.2,2);if(!sample(Math.random()<.6?'roar':'roar2',{gain:.85}))burst({freq:900,q:.4,peak:.18,attack:.15,decay:1.8});},
 groan(){crowd(1.3,.8);if(!sample('groan',{gain:.9}))burst({freq:600,q:1.2,peak:.16,attack:.1,decay:1.2,sweep:250});},
 gasp(){crowd(1.6,.6);sample('groan',{gain:.6,rate:1.12});},
 victory(){[523,659,784,1047].forEach((f,i)=>tone({freq:f,type:'triangle',peak:.1,decay:.35,delay:i*.12}));crowd(2.4,3);sample('roar',{gain:.7,delay:.1});},
 defeat(){[392,330,262].forEach((f,i)=>tone({freq:f,type:'triangle',peak:.08,decay:.45,delay:i*.18}));sample('groan',{gain:.6});},
 swoosh(){burst({freq:600,q:.8,peak:.12,attack:.08,decay:.25,sweep:3000});}
};
export function play(name){if(!ctx||level()===0)return;try{SOUNDS[name]?.();}catch{}}
