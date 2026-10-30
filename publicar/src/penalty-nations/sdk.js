// CrazyGames SDK v3 wrapper. Every call is a safe no-op when the SDK is absent
// (other portals, offline, local file), so the game never depends on it.
let SDK=null,env='disabled',playing=false;
function loadScript(src,timeout){
 return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;const timer=setTimeout(()=>reject(Error('timeout')),timeout);s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);reject(Error('load'));};document.head.append(s);});
}
export async function init(){
 try{
  if(!window.CrazyGames?.SDK)await loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js',3500);
  SDK=window.CrazyGames?.SDK??null;if(!SDK)return;
  await Promise.race([SDK.init(),new Promise((_,r)=>setTimeout(()=>r(Error('init timeout')),3500))]);
  env=SDK.environment||'disabled';
 }catch{SDK=null;env='disabled';}
}
export const active=()=>!!SDK&&env!=='disabled';
const call=fn=>{if(!active())return;try{fn(SDK);}catch{}};
export const loadingStart=()=>call(s=>s.game.loadingStart());
export const loadingStop=()=>call(s=>s.game.loadingStop());
export function gameplayStart(){if(playing)return;playing=true;call(s=>s.game.gameplayStart());}
export function gameplayStop(){if(!playing)return;playing=false;call(s=>s.game.gameplayStop());}
export const happytime=()=>call(s=>s.game.happytime());
export function muteSetting(){try{return active()?!!SDK.game.settings?.muteAudio:false;}catch{return false;}}
export function onSettingsChange(cb){call(s=>s.game.addSettingsChangeListener(settings=>cb(settings)));}
// Resolves true when the ad completed (rewarded) or simply finished (midgame).
export function ad(type,{onStart}={}){
 return new Promise(resolve=>{
  if(!active())return resolve(false);
  const wasPlaying=playing;gameplayStop();
  let done=false;const finish=ok=>{if(done)return;done=true;if(wasPlaying)gameplayStart();resolve(ok);};
  try{SDK.ad.requestAd(type,{adStarted:()=>onStart?.(),adFinished:()=>finish(true),adError:()=>finish(false)});}catch{finish(false);}
 });
}
export const rewardedAvailable=()=>active();
// Progress: CrazyGames cloud data when available, localStorage otherwise.
export const storage={
 get(key){try{if(active()&&SDK.data)return SDK.data.getItem(key);}catch{}try{return localStorage.getItem(key);}catch{return null;}},
 set(key,value){try{if(active()&&SDK.data){SDK.data.setItem(key,value);return;}}catch{}try{localStorage.setItem(key,value);}catch{}}
};
