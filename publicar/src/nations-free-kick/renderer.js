import {keeperPose,canSave} from './keeper.js';
import {strikerSprite,keeperSprite,wallSprite} from './sprites.js';
import {GOAL_W,GOAL_H,BALL_R,MAN_W,WALL_H,RUN_MS,MENU_SPOT,manX,pathPoint,arcNeeded,jumpHeight,ballAt} from './freekick.js';
// Original Canvas 2D artwork. The renderer reads match state, never decides results.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const ACCENT='#ff9a2e';
function line(c,x,y,xx,yy,color,width=1){c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function poly(c,p,fill,stroke,width=1){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);c.fillStyle=color;c.fill();}
function gradient(c,x,y,xx,yy,stops){const g=c.createLinearGradient(x,y,xx,yy);stops.forEach(([p,v])=>g.addColorStop(p,v));return g;}

// Broadcast camera behind the ball, square to the goal line so the goal frame stays a rectangle.
// It slides sideways to frame both the goal and the ball, and pulls back on narrow screens.
const CAM_BACK=12,CAM_H=4;
export function composition(w,h,sp){
 const cz=sp.bz+CAM_BACK,taker={x:sp.bx-1.0,z:sp.bz+1.5};
 const pts=[[-GOAL_W/2-.4,0],[GOAL_W/2+.4,0],[sp.bx-.5,sp.bz],[sp.bx+.5,sp.bz],[sp.wx0-.3,sp.wz],[sp.wx1+.3,sp.wz]];
 const spread=cx=>{let lo=Infinity,hi=-Infinity;for(const [x,z] of pts){const a=(x-cx)/(cz-z);lo=Math.min(lo,a);hi=Math.max(hi,a);}return [lo,hi];};
 let a=-12,b=12;for(let i=0;i<40;i++){const m=(a+b)/2,[lo,hi]=spread(m);if(lo+hi>0)a=m;else b=m;}
 const cx=(a+b)/2,[lo,hi]=spread(cx),half=Math.max(-lo,hi);
 // Crossbar below the scoreboard, ball in the lower third.
 const portrait=w/h<.95,yt=Math.max(h*(portrait?.24:.2),76),yb=h*(portrait?.76:.8);
 const fv=(yb-yt)/((CAM_H-BALL_R)/CAM_BACK-(CAM_H-GOAL_H)/cz),fh=w*.47/half,f=Math.min(fv,fh);
 // When the width limits the zoom, centre the smaller picture vertically.
 const span=f*((CAM_H-BALL_R)/CAM_BACK-(CAM_H-GOAL_H)/cz);
 const top=f<fv?yt+((yb-yt)-span)*.55:yt,horizon=top-(CAM_H-GOAL_H)*f/cz;
 const project=(x,z,height=0)=>{const k=f/Math.max(.4,cz-z);return {x:w*.5+(x-cx)*k,y:horizon+(CAM_H-height)*k,scale:k};};
 const gl=project(-GOAL_W/2,0,GOAL_H),gr=project(GOAL_W/2,0,0),bp=project(sp.bx,sp.bz,BALL_R),tp=project(taker.x,taker.z);
 return {goal:{x:gl.x,y:gl.y,w:gr.x-gl.x,h:gr.y-gl.y},ball:{x:bp.x,y:bp.y,r:bp.scale*BALL_R},player:{x:tp.x,y:tp.y,height:tp.scale*1.82},keeperHeight:f/cz*1.88,horizon,project,cam:{cx,cz,f}};
}
let stadiumArt=null,stadiumReady=false;
export const stadiumLoaded=new Promise(resolve=>{
 if(typeof Image==='undefined')return resolve();
 stadiumArt=new Image();stadiumArt.decoding='async';stadiumArt.onload=()=>{stadiumReady=true;resolve();};stadiumArt.onerror=resolve;stadiumArt.src=new URL('./assets/stadium-night.webp',import.meta.url).href;
});
export function createScene(canvas,spot=MENU_SPOT){if(!canvas)return null;const ctx=canvas.getContext('2d');if(!ctx)return null;const sc={canvas,ctx,w:0,h:0,bg:null,goal:null,dpr:0,artReady:false,spot};resizeScene(sc);return sc;}
export function setSpot(sc,spot){if(sc)sc.spot=spot;}
export function resizeScene(sc){
 if(!sc?.canvas||!sc.ctx)return false;const r=sc.canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;
 const w=r.width,h=r.height,dpr=Math.min(window.devicePixelRatio||1,2),artReady=stadiumReady,spot=sc.spot||MENU_SPOT;
 if(sc.bg&&sc.goal&&sc.w===w&&sc.h===h&&sc.dpr===dpr&&sc.artReady===artReady&&sc.builtFor===spot)return true;
 Object.assign(sc,{w,h,dpr,artReady,builtFor:spot,netCache:null,vignette:null,...composition(w,h,spot)});sc.canvas.width=Math.round(w*dpr);sc.canvas.height=Math.round(h*dpr);
 const bg=sc.bg&&sc.bg.width===sc.canvas.width&&sc.bg.height===sc.canvas.height?sc.bg:document.createElement('canvas');bg.width=sc.canvas.width;bg.height=sc.canvas.height;const c=bg.getContext('2d');if(!c)return false;c.setTransform(dpr,0,0,dpr,0,0);stadium(c,sc,spot);sc.bg=bg;return true;
}
function stadium(c,s,sp){
 const {w,h,goal:g,project:P,cam}=s,base=g.y+g.h,zMax=cam.cz-.6;
 c.fillStyle=gradient(c,0,0,0,base,[[0,'#060c1c'],[.55,'#1b2a44'],[1,'#3f5470']]);c.fillRect(0,0,w,h);
 // The stadium photo is a distant backdrop only: cover-fitted above the goal line.
 if(s.artReady){
  const sw=stadiumArt.naturalWidth,sh=stadiumArt.naturalHeight*.65,k=Math.max(w/sw,base/sh),dw=sw*k,dh=sh*k;
  c.drawImage(stadiumArt,0,0,sw,sh,(w-dw)/2,base-dh,dw,dh);
  c.fillStyle=gradient(c,0,0,0,base,[[0,'#0a10283a'],[.8,'#0a142a14'],[1,'#1a243a80']]);c.fillRect(0,0,w,base);
 }else{
  for(let tier=0;tier<3;tier++){
   const top=base*(.12+tier*.265),bh=base*.22;
   c.fillStyle=['#161f3a','#202c48','#2c3a58'][tier];c.fillRect(0,top,w,bh);
   for(let row=0;row<10;row++)for(let col=0;col<180;col++){const hash=Math.abs(Math.sin(col*28.7+row*39.8+tier*200));c.fillStyle=['#71848d','#bbc3bf','#233a50','#b34e47','#7d916c'][Math.floor(hash*4.99)];c.fillRect(col*w/180,top+row*bh/10,w/260,bh/18);}
  }
 }
 c.fillStyle='#0b1424';c.fillRect(0,base-g.h*.12,w,g.h*.12);
 c.fillStyle=gradient(c,0,base,0,h,[[0,'#3a653d'],[.3,'#477c42'],[.7,'#558746'],[1,'#3b6b38']]);c.fillRect(0,base,w,h-base);
 // Mowing bands, metres apart, through the same projection.
 for(let z=0;z<zMax;z+=2.2){const y=P(0,z).y,yy=Math.min(h,P(0,Math.min(zMax,z+2.2)).y);c.fillStyle=Math.round(z/2.2)%2?'#c4e58909':'#092b1915';c.fillRect(0,y,w,yy-y);}
 let seed=817;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<380;i++){const x=random()*w,y=base+random()*(h-base),depth=(y-base)/(h-base),r=8+depth*42;const patch=c.createRadialGradient(x,y,0,x,y,r);patch.addColorStop(0,i%2?'#b9c17b0d':'#173e2310');patch.addColorStop(1,'#446d3600');c.fillStyle=patch;c.fillRect(x-r,y-r,r*2,r*2);}
 for(let i=0;i<16000;i++){const x=random()*w,y=base+random()*(h-base),depth=(y-base)/(h-base),length=.3+depth*2.1;line(c,x,y,x+(random()-.5)*length,y-length,i%3?'#bbcb8c27':'#173f292e',.3+depth*.35);}
 // Pitch markings: goal line, 5.5m and 16.5m boxes, penalty mark and arc. Sampled so lines near the camera clip cleanly.
 const lw=Math.max(1,g.w*.006);
 const fieldLine=(a,b,color='#ecf1ddd0')=>{c.beginPath();let on=false;for(let i=0;i<=24;i++){const x=mix(a[0],b[0],i/24),z=mix(a[1],b[1],i/24);if(z>zMax){on=false;continue;}const p=P(x,z);on?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);on=true;}c.strokeStyle=color;c.lineWidth=lw;c.stroke();};
 fieldLine([-40,0],[40,0]);
 for(const [width,depth] of [[18.32,5.5],[40.32,16.5]]){fieldLine([-width/2,0],[-width/2,depth]);fieldLine([width/2,0],[width/2,depth]);fieldLine([-width/2,depth],[width/2,depth]);}
 c.beginPath();let started=false;for(let i=0;i<=120;i++){const a=Math.PI*i/120,z=11+Math.sin(a)*9.15;if(z<16.5||z>zMax)continue;const p=P(Math.cos(a)*9.15,z);if(!started){c.moveTo(p.x,p.y);started=true;}else c.lineTo(p.x,p.y);}c.strokeStyle='#eff4dbad';c.lineWidth=lw;c.stroke();
 const spot=P(0,11);oval(c,spot.x,spot.y,spot.scale*.11,spot.scale*.03,'#eef3dc');
 // Vanishing spray: an arc round the ball and a line in front of the wall's feet.
 const spray='#ffffffb0';
 c.beginPath();for(let i=0;i<=40;i++){const a=Math.PI*2*i/40,p=P(sp.bx+Math.cos(a)*.42,sp.bz+Math.sin(a)*.42);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.setLineDash([3,4]);c.strokeStyle=spray;c.lineWidth=Math.max(1,lw*1.2);c.stroke();c.setLineDash([]);
 if(sp.wx0!==undefined){const a=P(sp.wx0-.5,sp.wz+.55),b=P(sp.wx1+.5,sp.wz+.55);c.setLineDash([5,4]);line(c,a.x,a.y,b.x,b.y,spray,Math.max(1.2,lw*1.6));c.setLineDash([]);}
 for(let i=0;i<70;i++){const a=random()*Math.PI*2,r=random()*.3,p=P(sp.bx+Math.cos(a)*r,sp.bz+Math.sin(a)*r);oval(c,p.x,p.y,.45+random(),.3,'#b9ac7830');}
 const light=c.createRadialGradient(w*.52,base,0,w*.5,h*.6,Math.max(w,h)*.75);light.addColorStop(0,'#ffffff00');light.addColorStop(.6,'#061a2610');light.addColorStop(1,'#03102066');c.fillStyle=light;c.fillRect(0,base,w,h-base);
 poly(c,[[g.x,base],[g.x+g.w,base],[g.x+g.w+g.w*.04,base+g.h*.05],[g.x+g.w*.08,base+g.h*.05]],'#041f2938');
}
// LED boards along the goal line: scrolling text behind a dot-matrix mask.
let ledPattern=null;
function boards(c,s,time,board){
 const {w,goal:g}=s,base=g.y+g.h,bh=Math.max(8,g.h*.16),top=base-bh;
 c.save();c.beginPath();c.rect(0,top,w,bh);c.clip();
 c.fillStyle='#04070f';c.fillRect(0,top,w,bh);
 const flash=!!board?.flash,text=(board?.text||'NATIONS FREE KICK')+'   •   ';
 c.font=`800 ${Math.round(bh*.78)}px 'Barlow Condensed','Arial Narrow',sans-serif`;c.textBaseline='middle';c.textAlign='left';
 const tw=Math.max(1,c.measureText(text).width),offset=(time*(flash?.2:.045))%tw;
 const colors=flash?(Math.floor(time/160)%2?[ACCENT,'#ffffff']:['#ffffff',ACCENT]):board?.colors||[ACCENT,'#e8f4ff'];
 c.shadowColor=flash?ACCENT:'#9fd0ff';c.shadowBlur=flash?bh*.6:bh*.25;
 for(let x=-offset,i=0;x<w;x+=tw,i++){c.fillStyle=colors[i%colors.length];c.fillText(text,x,top+bh*.56);}
 c.shadowBlur=0;
 if(!ledPattern){const p=document.createElement('canvas');p.width=p.height=3;const pc=p.getContext('2d');pc.fillStyle='#04070fcc';pc.fillRect(2,0,1,3);pc.fillRect(0,2,3,1);ledPattern=c.createPattern(p,'repeat');}
 c.fillStyle=ledPattern;c.fillRect(0,top,w,bh);
 c.fillStyle='#ffffff18';c.fillRect(0,top,w,1);
 c.restore();
}
// Metre-based box net: fixed front edge, sagging rear mesh and travelling impact.
export function netDisplacement(u,v,age,ix,iy){
 if(age<0||age>1300)return 0;
 const radius=Math.hypot((u-ix)*7.32,(v-iy)*2.44),t=age/1000;
 const local=Math.exp(-radius*radius/1.1)*(1-Math.exp(-t*32))*Math.exp(-t*5.5);
 const wave=Math.exp(-Math.pow(radius-t*5,2)/.3)*Math.sin(t*19-radius*3)*Math.exp(-t*3.8);
 return (local*.48+wave*.07)*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
}
function goalBack(c,s,impact=null){
 const P=s.project,g=s.goal;
 const point=(u,v,depth=1)=>{const sag=.07*Math.sin(Math.PI*u)*Math.sin(Math.PI*v),hit=impact?netDisplacement(u,v,impact.age,impact.x,impact.y):0;return P((u-.5)*7.32,-1.8*depth-hit*depth,2.44*(1-v)-sag*depth);};
 const stroke=(points,color,width)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.stroke();};
 const tl=point(0,0),tr=point(1,0),br=point(1,1),bl=point(0,1);
 poly(c,[[tl.x,tl.y],[tr.x,tr.y],[br.x,br.y],[bl.x,bl.y]],'#071c1711');
 // A coarser mesh than real life: the goal is further away here, so 40 columns read better than 60.
 const cols=40,rows=14,thick=Math.max(.45,g.w/900);
 for(let i=0;i<=cols;i++){const u=i/cols;stroke(Array.from({length:rows+1},(_,j)=>point(u,j/rows)),'#eef2eb60',thick);stroke(Array.from({length:7},(_,j)=>point(u,0,j/6)),'#e7ecea78',thick);}
 for(let j=0;j<=rows;j++)for(const u of [0,1])stroke(Array.from({length:7},(_,k)=>point(u,j/rows,k/6)),'#e5ece870',thick);
 for(let j=0;j<=rows;j++)stroke(Array.from({length:cols+1},(_,i)=>point(i/cols,j/rows)),'#e5e9e560',thick);
 for(let k=0;k<=6;k++){const z=k/6;stroke(Array.from({length:cols+1},(_,i)=>point(i/cols,0,z)),'#e4eae865',thick);for(const u of [0,1])stroke(Array.from({length:rows+1},(_,j)=>point(u,j/rows,z)),'#d9e4df60',thick);}
 stroke([tl,tr,br,bl,tl],'#cad7d788',Math.max(1,g.w/600));
}
function goalFront(c,s){
 const g=s.goal,p=Math.max(2,g.w*.12/7.32);
 c.lineCap='round';c.lineJoin='round';
 for(const [x,y,xx,yy] of [[g.x,g.y+g.h,g.x,g.y],[g.x,g.y,g.x+g.w,g.y],[g.x+g.w,g.y,g.x+g.w,g.y+g.h]]){
  line(c,x+p*.3,y+p*.25,xx+p*.3,yy+p*.25,'#08232677',p*1.28);
  const horizontal=y===yy;
  const shade=gradient(c,x-p*.5,y-p*.5,horizontal?x-p*.5:x+p*.5,horizontal?y+p*.5:y-p*.5,[[0,'#faffff'],[.3,'#f5f7f6'],[.65,'#c3c9c6'],[1,'#737f79']]);
  line(c,x,y,xx,yy,shade,p);line(c,x-p*.2,y-p*.15,xx-p*.2,yy-p*.15,'#ffffffad',p*.18);
 }
 for(const x of [g.x,g.x+g.w])oval(c,x,g.y+g.h+p*.25,p*.8,p*.22,'#102d2365');
}
// One defender in the wall, facing the ball: hands protecting, slight lean, shading from the floodlights.
const SKIN=[['#e5b491','#ba8665','#694c3c'],['#c99572','#9a6a4c','#5a3c2c'],['#a8714f','#7d4f37','#3d271c'],['#8b553e','#6a3c2a','#3a2219']];
const HAIR=['#1d1b18','#2b2118','#3a2a1c','#141414','#5a4126'];
function wallMan(c,x,y,H,kit,i,lift,brace){
 c.save();c.translate(x,y);c.scale(H/100,H/100);c.lineCap='round';c.lineJoin='round';
 const tone=SKIN[(i*7+3)%SKIN.length],skin=gradient(c,-12,0,12,0,[[0,tone[2]],[.35,tone[0]],[.7,tone[1]],[1,tone[2]]]);
 const cloth=(color)=>gradient(c,-13,0,13,0,[[0,'#0b1422'],[.22,color],[.6,color],[1,'#0c1626']]);
 const shirt=cloth(kit.shirt),shorts=cloth(kit.shorts),tuck=lift*6;
 const seg=(a,b,r1,r2,color)=>{const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;poly(c,[[a[0]+nx*r1,a[1]+ny*r1],[b[0]+nx*r2,b[1]+ny*r2],[b[0]-nx*r2,b[1]-ny*r2],[a[0]-nx*r1,a[1]-ny*r1]],color);oval(c,a[0],a[1],r1,r1,color);oval(c,b[0],b[1],r2,r2,color);};
 // Legs together, knees tuck as the wall jumps.
 for(const s of [-1,1]){
  const hip=[s*5,-49],knee=[s*(5.2-tuck*.2),-27+tuck],foot=[s*6.5,-2+tuck*1.6];
  seg(hip,knee,5.6,3.8,skin);seg(knee,foot,3.6,2.1,skin);
  seg([mix(knee[0],foot[0],.18),mix(knee[1],foot[1],.18)],foot,3.7,2.4,cloth(kit.shorts));
  c.save();c.translate(...foot);c.beginPath();c.ellipse(s*.6,1.4,4.6,2.4,0,0,Math.PI*2);c.fillStyle='#10161e';c.fill();c.restore();
 }
 poly(c,[[-11,-57],[11,-57],[12.2,-38],[2,-37],[0,-44],[-2,-37],[-12.2,-38]],shorts,'#0a142070',.7);
 // Torso.
 c.beginPath();c.moveTo(-5,-86);c.quadraticCurveTo(-11,-85,-14,-80.5);c.lineTo(-11.5,-67);c.quadraticCurveTo(-10.5,-60,-11.2,-55.5);c.quadraticCurveTo(0,-53,11.2,-55.5);c.quadraticCurveTo(10.5,-60,11.5,-67);c.lineTo(14,-80.5);c.quadraticCurveTo(11,-85,5,-86);c.closePath();c.fillStyle=shirt;c.fill();c.strokeStyle='#0a142080';c.lineWidth=.6;c.stroke();
 poly(c,[[-13,-79],[-9,-76],[-8.5,-60],[-10.5,-57]],'#ffffff14');poly(c,[[9,-78],[12,-73],[9.5,-58],[5,-56]],'#0a18282c');
 c.beginPath();c.moveTo(-4.4,-86);c.quadraticCurveTo(0,-81.5,4.4,-86);c.strokeStyle=kit.shorts;c.lineWidth=1.6;c.stroke();
 // Arms: hands crossed low to protect, or raised and bent when bracing at the top of the jump.
 for(const s of [-1,1]){
  const sh=[s*12.5,-79],el=[s*(14.5-brace*2),-64-brace*6],hand=[s*(3.4+brace*3),-50-brace*22];
  seg(sh,el,3.9,3,skin);seg(el,hand,3,2.2,skin);seg(sh,[mix(sh[0],el[0],.45),mix(sh[1],el[1],.45)],4.6,3.9,shirt);
  oval(c,hand[0],hand[1],2.6,2.9,tone[1]);
 }
 // Head and neck.
 seg([0,-86],[0,-89],2.8,2.6,skin);
 oval(c,0,-93.2,4.9,6.2,tone[0]);oval(c,1.6,-92.5,2.6,5.2,tone[1]+'90');
 oval(c,-4.8,-92.8,1.1,1.8,tone[1]);oval(c,4.8,-92.8,1.1,1.8,tone[1]);
 c.beginPath();c.moveTo(-5,-93);c.quadraticCurveTo(-5.6,-100.6,0,-100.4);c.quadraticCurveTo(5.6,-100.6,5,-93);c.quadraticCurveTo(3,-97.8,0,-97.6);c.quadraticCurveTo(-3,-97.8,-5,-93);c.fillStyle=HAIR[i%HAIR.length];c.fill();
 line(c,-2.6,-93.4,-1.2,-93.4,'#1d1612',.8);line(c,1.2,-93.4,2.6,-93.4,'#1d1612',.8);line(c,-1.3,-89.6,1.3,-89.6,'#5d382a',.7);
 c.restore();
}
function drawWall(c,s,sp,kit,time,jumpAt){
 const P=s.project,lift=jumpAt==null?0:jumpHeight(jumpAt,time);
 const k=lift/.4,order=Array.from({length:sp.men},(_,i)=>i).sort((a,b)=>Math.abs(manX(sp,b))-Math.abs(manX(sp,a)));
 for(const i of order){
  const x=manX(sp,i)+(i%2?.04:-.04),ground=P(x,sp.wz),feet=P(x,sp.wz,lift*(.94+(i%3)*.04)),H=ground.scale*(1.8+((i*5)%3)*.04);
  oval(c,ground.x,ground.y,H*.17*(1-k*.35),H*.022,'#06182470');
  if(!wallSprite(c,feet.x,feet.y,H,kit,i))wallMan(c,feet.x,feet.y,H,kit,i,k,k);
 }
}
// Panels rotate on a sphere; illumination stays fixed under the floodlights.
const PHI=(1+Math.sqrt(5))/2;
const panelCenters=[];
for(const a of [-1,1])for(const b of [-PHI,PHI])for(const v of [[0,a,b],[a,b,0],[b,0,a]]){const l=Math.hypot(...v);panelCenters.push(v.map(n=>n/l));}
function ball(c,x,y,r,spin){
 c.save();c.translate(x,y);c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.clip();
 oval(c,0,0,r,r,'#eef0eb');
 const rotate=([xx,yy,zz])=>{const a=spin,b=.35,xa=xx*Math.cos(a)+zz*Math.sin(a),za=zz*Math.cos(a)-xx*Math.sin(a);return [xa,yy*Math.cos(b)-za*Math.sin(b),za*Math.cos(b)+yy*Math.sin(b)];};
 const mapped=panelCenters.map((n,index)=>{
  const ref=Math.abs(n[1])>.9?[1,0,0]:[0,1,0],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  let u=cross(n,ref),l=Math.hypot(...u);u=u.map(a=>a/l);const v=cross(n,u);
  const vertices=Array.from({length:5},(_,j)=>{const t=j*Math.PI*2/5+index*.19;return rotate(n.map((a,k)=>a*Math.cos(.29)+(u[k]*Math.cos(t)+v[k]*Math.sin(t))*Math.sin(.29)));});
  return {normal:rotate(n),vertices};
 }).sort((a,b)=>a.normal[2]-b.normal[2]);
 for(const face of mapped){if(face.normal[2]<-.12)continue;poly(c,face.vertices.map(([xx,yy])=>[xx*r,yy*r]),'#1d2a3d','#768482',Math.max(.2,r*.028));}
 const light=c.createRadialGradient(-r*.4,-r*.55,r*.02,r*.18,r*.3,r*1.25);
 light.addColorStop(0,'#ffffff78');light.addColorStop(.42,'#ffffff00');light.addColorStop(.77,'#06182128');light.addColorStop(1,'#03151bba');oval(c,0,0,r,r,light);
 c.restore();
}
function ring(c,x,y,r,color,progress=1,flat=1){c.save();c.translate(x,y);c.scale(1,flat);oval(c,0,0,r,r,color+'24');c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();c.arc(0,0,r,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);c.stroke();oval(c,0,0,2,2,color);c.restore();}
function keeper(c,s,d,time,recover,color){
 const g=s.goal,H=s.keeperHeight,base=g.y+g.h,pose=keeperPose(d,time),q=pose.extension*(1-recover),dir=Math.sign((d?.x??.5)-.5)||1;
 oval(c,g.x+pose.x*g.w+H*.1,base+H*.012,H*(.22+.15*q),H*.025,'#061b2670');
 keeperSprite(c,s,d,time,pose,recover,color);
}
function restingNet(c,s){
 if(!s.netCache){const n=document.createElement('canvas');n.width=s.canvas.width;n.height=s.canvas.height;const nc=n.getContext('2d');nc.setTransform(s.dpr,0,0,s.dpr,0,0);goalBack(nc,s,null);s.netCache=n;}
 c.drawImage(s.netCache,0,0,s.w,s.h);
}
// Shot time for the taker's sprite: the run-up is compressed to its 360ms contact frame.
const strikerTime=t=>t<RUN_MS?t*360/RUN_MS:360+(t-RUN_MS)*.8;
export function renderScene(s,m,time,kit,opts={}){
 if(!resizeScene(s)||!s.bg||!s.goal)return false;
 const {ctx:c,w,h,goal:g,ball:b,player:p}=s,sp=s.spot||MENU_SPOT,P=s.project;c.setTransform(s.dpr,0,0,s.dpr,0,0);c.drawImage(s.bg,0,0,w,h);
 boards(c,s,time,opts.board);
 const shot=m?.shot,def=m&&(m.phase.startsWith('defend')||(m.phase==='result'&&m.lastAttacker==='cpu'));
 const result=m?.phase==='result',recover=result?smooth((time-m.since-700)/650):0;
 const t=shot?time-shot.at:0,d=def?m.dive:shot?.dive;
 const arrival=shot?RUN_MS+shot.flight:0,visualSaved=shot&&!shot.wall&&(shot.saved||(def&&canSave(m.dive,shot,shot.at+arrival)));
 const view=shot?{...shot,saved:visualSaved,goal:shot.goal&&!visualSaved}:null;
 const impactAge=t-arrival-65;
 if(view?.goal&&impactAge>=0&&impactAge<=1300)goalBack(c,s,{x:clamp(shot.x),y:clamp(shot.y),age:impactAge});else restingNet(c,s);
 const bw=shot?ballAt(sp,view,t):{x:sp.bx,z:sp.bz,h:BALL_R,flight:0,spin:0};
 const bp=P(bw.x,bw.z,bw.h),shadow=P(bw.x,bw.z),r=bp.scale*BALL_R;
 const drawBall=()=>{
  if(shot&&bw.flight>0&&bw.flight<1&&!(shot.wall&&bw.after)){for(let k=5;k>=1;k--){const q=ballAt(sp,view,t-k*18);if(q.flight<=0)continue;const tp=P(q.x,q.z,q.h);c.globalAlpha=.15*(1-k/6);oval(c,tp.x,tp.y,tp.scale*BALL_R*(1-k*.06),tp.scale*BALL_R*(1-k*.06),'#f4fbff');}c.globalAlpha=1;}
  oval(c,shadow.x+r*.25,shadow.y,r*1.1,r*.24,'#061d2b65');ball(c,bp.x,bp.y,r,bw.spin);
 };
 // Depth order: net, ball in the net, posts, keeper, ball between goal and wall, wall, taker, ball before the wall.
 const inNet=bw.z<0,beyondWall=bw.z<sp.wz;
 if(inNet)drawBall();
 goalFront(c,s);
 keeper(c,s,d,time,recover,opts.keeperColor);
 if(!inNet&&beyondWall)drawBall();
 drawWall(c,s,sp,opts.wallKit||{shirt:'#eef1f5',shorts:'#1d2b4a'},t,shot?shot.jumpAt:null);
 // The taker approaches from behind and to the left; the boot meets the ball at contact.
 const contact=P(sp.bx-.10,sp.bz+.12),contactH=contact.scale*1.82,run=shot?clamp(t/RUN_MS):0,travel=run*.72+smooth(run)*.28;
 const px=mix(p.x,contact.x-contactH*.08,travel),py=mix(p.y,contact.y,travel),ph=mix(p.height,contactH,travel);
 oval(c,px+ph*.07,py+ph*.008,ph*.22,ph*.023,'#08242b65');
 strikerSprite(c,px,py,ph,kit,shot?strikerTime(t):null,result&&shot?.goal,b,time);
 if(!inNet&&!beyondWall)drawBall();
 if(m?.phase==='aim')aimOverlay(c,s,sp,m,time);
 // Defence: a flash marks where the ball is heading; the glove shows the player's choice.
 if(def&&m.tellAt!=null&&time>=m.tellAt&&m.phase!=='result'){
  const k=clamp((time-m.tellAt)/180),fade=1-clamp((time-m.tellAt-m.tellShow)/200),tx=g.x+m.tell.x*g.w,ty=g.y+m.tell.y*g.h;
  if(fade>0){c.save();c.globalAlpha=fade;const R=Math.max(12,m.tell.r*g.w);
   c.beginPath();c.arc(tx,ty,R*(1.6-.6*k),0,Math.PI*2);c.fillStyle='#fff3a01f';c.fill();c.strokeStyle='#fff3a0';c.lineWidth=Math.max(2,w*.003);c.stroke();
   c.beginPath();c.arc(tx,ty,R*.25,0,Math.PI*2);c.fillStyle='#fff3a0';c.fill();c.restore();}
 }
 if(def&&m.phase!=='result'&&m.cursor){const cx=g.x+m.cursor.x*g.w,cy=g.y+m.cursor.y*g.h,R=Math.max(7,g.w*.03);c.save();c.globalAlpha=m.dive?.4:.9;ring(c,cx,cy,R,'#9fe3ff');c.restore();}
 grade(c,s,time);
 return true;
}
// Aim: target in the goal, the curled path the ball will take at a clean strike, and the scatter while charging.
function aimOverlay(c,s,sp,m,time){
 const {w,goal:g,project:P}=s,tx=g.x+m.aimX*g.w,ty=g.y+m.aimY*g.h,inGoal=m.aimX>=0&&m.aimX<=1&&m.aimY>=0&&m.aimY<=1;
 const charging=m.hold!==null,power=m.power??0,color=!inGoal?'#ff967c':charging?(m.powerZone==='sweet'?ACCENT:m.powerZone==='over'?'#ff967c':'#ffd34d'):'#eaf6ff';
 const ideal={x:m.aimX,y:m.aimY,curl:m.curl,arc:arcNeeded(sp,m.aimX,m.aimY,m.curl)};
 const b=P(sp.bx,sp.bz,BALL_R);ring(c,b.x,P(sp.bx,sp.bz).y,Math.max(14,b.scale*.55),color,charging?Math.min(1,power):1,.26);
 c.save();c.lineCap='round';
 const dot=Math.max(1.6,g.w*.007);
 const head=(time*.02)%35;
 for(let i=1;i<=34;i++){const u=i/35,q=pathPoint(sp,ideal,u),pp=P(q.x,q.z,q.h),size=dot*(1.2-u*.5)*(1+Math.max(0,1-Math.abs(i-head)/3)*.7);
  c.globalAlpha=(u>sp.uw?.35:.8)*(1-u*.3);oval(c,pp.x,pp.y,size,size,color);}
 c.restore();
 const R=Math.max(8,g.w*.035);
 if(charging&&m.spread){c.save();c.globalAlpha=.85;c.beginPath();c.ellipse(tx,ty,m.spread*g.w,m.spread*1.3*g.h,0,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=Math.max(1.5,w*.002);c.setLineDash([6,5]);c.stroke();c.fillStyle=color+'1c';c.fill();c.restore();}
 ring(c,tx,ty,R*(1+Math.sin(time*.012)*.08),color);
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])line(c,tx+dx*R*.55,ty+dy*R*.55,tx+dx*R*1.5,ty+dy*R*1.5,color,Math.max(1.5,w*.0018));
}
// Broadcast look: drifting floodlight haze over the stands and a soft vignette, cached per size.
function grade(c,s,time){
 const {w,h,goal:g}=s,base=g.y+g.h;
 c.save();c.globalCompositeOperation='lighter';
 for(const [fx,phase] of [[.12,0],[.88,2.1],[.5,4.2]]){const x=w*fx+Math.sin(time*.00021+phase)*w*.04,y=h*.05,r=w*.32;const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(200,215,255,.10)');gr.addColorStop(1,'rgba(200,215,255,0)');c.fillStyle=gr;c.fillRect(x-r,0,r*2,base);}
 c.restore();
 if(!s.vignette){const v=document.createElement('canvas');v.width=s.canvas.width;v.height=s.canvas.height;const vc=v.getContext('2d');vc.setTransform(s.dpr,0,0,s.dpr,0,0);
  const gr=vc.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.35,w*.5,h*.5,Math.max(w,h)*.78);gr.addColorStop(0,'rgba(0,4,12,0)');gr.addColorStop(1,'rgba(0,4,12,.5)');vc.fillStyle=gr;vc.fillRect(0,0,w,h);s.vignette=v;}
 c.drawImage(s.vignette,0,0,w,h);
}
