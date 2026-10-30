import {keeperPose,canSave,SHOT_MS} from './keeper.js';
import {strikerSprite,keeperSprite} from './sprites.js';
// Original Canvas 2D artwork. The renderer reads match state, never decides results.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
function line(c,x,y,xx,yy,color,width=1){c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function poly(c,p,fill,stroke,width=1){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);c.fillStyle=color;c.fill();}
function gradient(c,x,y,xx,yy,stops){const g=c.createLinearGradient(x,y,xx,yy);stops.forEach(([p,v])=>g.addColorStop(p,v));return g;}
// One pinhole camera, in metres: goal 7.32 × 2.44, spot 11m away.
export function composition(w,h){
 const gw=Math.min(w*.86,h*.70),gh=gw/3,base=h*.44,spotY=h*.65,scale=gw/7.32;
 const horizon=base-(spotY-base),cameraHeight=(base-horizon)/scale;
 const project=(x,z,height=0)=>{const k=22/(22-z);return {x:w*.5+x*scale*k,y:horizon+(cameraHeight-height)*scale*k,scale:scale*k};};
 const bp=project(0,11,.11),pp=project(-.74,14.25);
 return {goal:{x:(w-gw)/2,y:base-gh,w:gw,h:gh},ball:{x:bp.x,y:bp.y,r:bp.scale*.11},player:{x:pp.x,y:pp.y,height:pp.scale*1.82},keeperHeight:scale*1.88,horizon,project,t:smooth((w/h-.72)/.7)};
}
let stadiumArt=null,stadiumReady=false;
export const stadiumLoaded=new Promise(resolve=>{
 if(typeof Image==='undefined')return resolve();
 stadiumArt=new Image();stadiumArt.decoding='async';stadiumArt.onload=()=>{stadiumReady=true;resolve();};stadiumArt.onerror=resolve;stadiumArt.src=new URL('./assets/stadium-night.webp',import.meta.url).href;
});
export function createScene(canvas){if(!canvas)return null;const ctx=canvas.getContext('2d');if(!ctx)return null;const sc={canvas,ctx,w:0,h:0,bg:null,goal:null,dpr:0,artReady:false};resizeScene(sc);return sc;}
export function resizeScene(sc){
 if(!sc?.canvas||!sc.ctx)return false;const r=sc.canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;
 const w=r.width,h=r.height,dpr=Math.min(window.devicePixelRatio||1,2);
 const artReady=stadiumReady;
 if(sc.bg&&sc.goal&&sc.w===w&&sc.h===h&&sc.dpr===dpr&&sc.artReady===artReady)return true;
 Object.assign(sc,{w,h,dpr,artReady,netCache:null,vignette:null,...composition(w,h)});sc.canvas.width=Math.round(w*dpr);sc.canvas.height=Math.round(h*dpr);
 const bg=document.createElement('canvas');bg.width=sc.canvas.width;bg.height=sc.canvas.height;const c=bg.getContext('2d');if(!c)return false;c.setTransform(dpr,0,0,dpr,0,0);stadium(c,sc);sc.bg=bg;return true;
}
function stadium(c,s){
 const {w,h,goal:g,project:P}=s,base=g.y+g.h;
 c.fillStyle=gradient(c,0,0,0,base,[[0,'#071223'],[.55,'#203346'],[1,'#4c6572']]);c.fillRect(0,0,w,h);
 // Art is a distant stadium plate only. Gameplay uses the common camera below.
 if(s.artReady){
  const sourceH=stadiumArt.naturalHeight*.65;
  c.drawImage(stadiumArt,0,0,stadiumArt.naturalWidth,sourceH,0,0,w,base-h*.012);
  c.fillStyle=gradient(c,0,0,0,base,[[0,'#08162818'],[.8,'#07172a12'],[1,'#192b3380']]);c.fillRect(0,0,w,base);
 }else{
  for(let tier=0;tier<3;tier++){
   const top=base*(.12+tier*.265),bh=base*.22;
   c.fillStyle=['#16273a','#223646','#304456'][tier];c.fillRect(0,top,w,bh);
   for(let row=0;row<10;row++)for(let col=0;col<180;col++){
    const hash=Math.abs(Math.sin(col*28.7+row*39.8+tier*200));
    c.fillStyle=['#71848d','#bbc3bf','#233a50','#b34e47','#7d916c'][Math.floor(hash*4.99)];
    c.fillRect(col*w/180,top+row*bh/10,w/260,bh/18);
   }
   line(c,0,top+bh,w,top+bh,'#a5b9bc',2);
  }
 }
 // Floodlight spill and dark apron place the pitch in front of the spectators.
 c.fillStyle='#0c1a23';c.fillRect(0,base-h*.026,w,h*.026);
 c.fillStyle=gradient(c,0,base,0,h,[[0,'#3a653d'],[.3,'#477c42'],[.7,'#558746'],[1,'#3b6b38']]);c.fillRect(0,base,w,h-base);
 // Mowing bands are metres apart and expand through the same projection.
 for(let z=0;z<21;z+=1.7){const y=P(0,z).y,yy=Math.min(h,P(0,z+1.7).y);c.fillStyle=Math.round(z/1.7)%2?'#c4e58909':'#092b1915';c.fillRect(0,y,w,yy-y);}
 let seed=817;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<480;i++){
  const x=random()*w,y=base+random()*(h-base),depth=(y-base)/(h-base),r=8+depth*42;
  const patch=c.createRadialGradient(x,y,0,x,y,r);patch.addColorStop(0,i%2?'#b9c17b0d':'#173e2310');patch.addColorStop(1,'#446d3600');c.fillStyle=patch;c.fillRect(x-r,y-r,r*2,r*2);
 }
 for(let i=0;i<28000;i++){
  const x=random()*w,y=base+random()*(h-base),depth=(y-base)/(h-base),length=.3+depth*2.1;
  line(c,x,y,x+(random()-.5)*length,y-length,i%3?'#bbcb8c27':'#173f292e',.3+depth*.35);
 }
 // Small wear around the penalty mark, without an artificial brown crater.
 const mark=P(0,11);for(let i=0;i<100;i++){const a=random()*Math.PI*2,r=random()*.23,p=P(Math.cos(a)*r,11+Math.sin(a)*r);oval(c,p.x,p.y,.45+random(),.3,'#b9ac7830');}

 const fieldLine=(a,b)=>{const p=P(...a),q=P(...b);line(c,p.x,p.y,q.x,q.y,'#ecf1ddd0',Math.max(1,w*.0014));};
 fieldLine([-34,0],[34,0]);
 // Regulation goal area 18.32 × 5.5m, penalty area 40.32 × 16.5m.
 for(const [width,depth] of [[18.32,5.5],[40.32,16.5]]){fieldLine([-width/2,0],[-width/2,depth]);fieldLine([width/2,0],[width/2,depth]);fieldLine([-width/2,depth],[width/2,depth]);}
 // Penalty arc: a 9.15m radius about the 11m mark, only outside the area.
 c.beginPath();let started=false;for(let i=0;i<=120;i++){const a=Math.PI*i/120,z=11+Math.sin(a)*9.15;if(z<16.5)continue;const p=P(Math.cos(a)*9.15,z);if(!started){c.moveTo(p.x,p.y);started=true;}else c.lineTo(p.x,p.y);}c.strokeStyle='#eff4dbad';c.lineWidth=Math.max(1,w*.0014);c.stroke();
 const spot=P(0,11);oval(c,spot.x,spot.y,spot.scale*.075,spot.scale*.018,'#eef3dc');
 // Gentle optical falloff without darkening the target or the ball.
 const light=c.createRadialGradient(w*.52,base,0,w*.5,h*.6,Math.max(w,h)*.75);light.addColorStop(0,'#ffffff00');light.addColorStop(.6,'#061f2210');light.addColorStop(1,'#03152066');c.fillStyle=light;c.fillRect(0,base,w,h-base);
 poly(c,[[g.x,base],[g.x+g.w,base],[g.x+g.w+w*.018,base+h*.015],[g.x+w*.035,base+h*.015]],'#041f2938');
 // The net is drawn each frame, so the actual mesh can deform on impact.

}
// LED boards along the goal line: scrolling text behind a dot-matrix mask.
let ledPattern=null;
function boards(c,s,time,board){
 const {w,h,goal:g}=s,base=g.y+g.h,bh=h*.026,top=base-bh;
 c.save();c.beginPath();c.rect(0,top,w,bh);c.clip();
 c.fillStyle='#04090d';c.fillRect(0,top,w,bh);
 const flash=!!board?.flash,text=(board?.text||'PENALTY NATIONS')+'   •   ';
 c.font=`800 ${Math.round(bh*.78)}px 'Barlow Condensed','Arial Narrow',sans-serif`;c.textBaseline='middle';c.textAlign='left';
 const tw=Math.max(1,c.measureText(text).width),offset=(time*(flash?.2:.045))%tw;
 const colors=flash?(Math.floor(time/160)%2?['#caff5b','#ffffff']:['#ffffff','#caff5b']):board?.colors||['#caff5b','#e8f4ff'];
 c.shadowColor=flash?'#caff5b':'#9fd0ff';c.shadowBlur=flash?bh*.6:bh*.25;
 for(let x=-offset,i=0;x<w;x+=tw,i++){c.fillStyle=colors[i%colors.length];c.fillText(text,x,top+bh*.56);}
 c.shadowBlur=0;
 if(!ledPattern){const p=document.createElement('canvas');p.width=p.height=3;const pc=p.getContext('2d');pc.fillStyle='#04090dcc';pc.fillRect(2,0,1,3);pc.fillRect(0,2,3,1);ledPattern=c.createPattern(p,'repeat');}
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
 const point=(u,v,depth=1)=>{
  const sag=.07*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
  const hit=impact?netDisplacement(u,v,impact.age,impact.x,impact.y):0;
  return P((u-.5)*7.32,-1.8*depth-hit*depth,2.44*(1-v)-sag*depth);
 };
 const stroke=(points,color,width)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.stroke();};
 const tl=point(0,0),tr=point(1,0),br=point(1,1),bl=point(0,1);
 poly(c,[[tl.x,tl.y],[tr.x,tr.y],[br.x,br.y],[bl.x,bl.y]],'#071c1711');
 // Approximately 12cm mesh; restrained contrast rather than a white wall.
 const cols=61,rows=20,thick=Math.max(.45,g.w/1100);
 for(let i=0;i<=cols;i++){
  const u=i/cols;stroke(Array.from({length:rows+1},(_,j)=>point(u,j/rows)),'#eef2eb65',thick);
  stroke(Array.from({length:9},(_,j)=>point(u,0,j/8)),'#e7ecea80',thick);
 }
 for(let j=0;j<=rows;j++)for(const u of [0,1])stroke(Array.from({length:9},(_,k)=>point(u,j/rows,k/8)),'#e5ece877',thick);
 for(let j=0;j<=rows;j++)stroke(Array.from({length:cols+1},(_,i)=>point(i/cols,j/rows)),'#e5e9e568',thick);
 for(let k=0;k<=8;k++){
  const z=k/8;stroke(Array.from({length:cols+1},(_,i)=>point(i/cols,0,z)),'#e4eae86a',thick);
  for(const u of [0,1])stroke(Array.from({length:rows+1},(_,j)=>point(u,j/rows,z)),'#d9e4df65',thick);
 }
 stroke([tl,tr,br,bl,tl],'#cad7d788',Math.max(1,g.w/600));
}
function goalFront(c,s){
 const g=s.goal,p=g.w*.12/7.32;
 c.lineCap='round';c.lineJoin='round';
 // Cylindrical white aluminium, constant regulation diameter in world scale.
 for(const [x,y,xx,yy] of [[g.x,g.y+g.h,g.x,g.y],[g.x,g.y,g.x+g.w,g.y],[g.x+g.w,g.y,g.x+g.w,g.y+g.h]]){
  line(c,x+p*.3,y+p*.25,xx+p*.3,yy+p*.25,'#08232677',p*1.28);
  const horizontal=y===yy;
  const shade=gradient(c,x-p*.5,y-p*.5,horizontal?x-p*.5:x+p*.5,horizontal?y+p*.5:y-p*.5,[[0,'#faffff'],[.3,'#f5f7f6'],[.65,'#c3c9c6'],[1,'#737f79']]);
  line(c,x,y,xx,yy,shade,p);
  line(c,x-p*.2,y-p*.15,xx-p*.2,yy-p*.15,'#ffffffad',p*.18);
 }
 for(const x of [g.x,g.x+g.w])oval(c,x,g.y+g.h+p*.25,p*.8,p*.22,'#102d2365');
}
// Original articulated artwork: human proportions, tapered limbs and shaped fabric.
function athlete(c,x,y,height,kit,{run=0,kick=0,dive=0,rotation=0,front=false,idle=0,reaction=0,contact=false,skinTone=0,diveSide=1}={}){
 c.save();c.translate(x,y);c.scale(height/100,height/100);c.translate(0,-50);c.rotate(rotation);c.translate(0,50);c.lineCap='round';c.lineJoin='round';
 const skin=gradient(c,-14,-80,19,-35,skinTone?[[0,'#b98260'],[.4,'#8b553e'],[1,'#4b3029']]:[[0,'#e5b491'],[.4,'#ba8665'],[1,'#694c3c']]);
 const cloth=(color,a=-14,b=15)=>gradient(c,a,0,b,0,[[0,'#14252c'],[.25,color],[.52,color],[1,'#132632']]);
 const shirt=cloth(kit.shirt),shorts=cloth(kit.shorts),stride=Math.sin(run*Math.PI*5)*9;
 const crouch=front?(1-dive)*2.5:0,lean=kick*5+idle,spread=dive*18+reaction*12;
 // Tapered sections retain volume at any animation angle, unlike uniform strokes.
 function segment(a,b,r1,r2,color){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;poly(c,[[a[0]+nx*r1,a[1]+ny*r1],[b[0]+nx*r2,b[1]+ny*r2],[b[0]-nx*r2,b[1]-ny*r2],[a[0]-nx*r1,a[1]-ny*r1]],color);oval(c,a[0],a[1],r1,r1,color);oval(c,b[0],b[1],r2,r2,color);line(c,a[0]-r1*.3,a[1],b[0]-r2*.3,b[1],'#ffffff16',.8);}
 function boot(f,side){c.save();c.translate(...f);c.rotate(side*.06-kick*(side>0?.35:0));c.beginPath();c.moveTo(-3,-3);c.quadraticCurveTo(0,-5,3,-2);c.lineTo(7.5,.1);c.quadraticCurveTo(9,2.2,6,2.7);c.lineTo(-3.5,2.7);c.closePath();c.fillStyle=front?'#151c24':'#f56b31';c.fill();line(c,-3,2.5,7,2.5,'#1c2c30',1.2);line(c,1,-1,4,.5,'#709b9a',1);c.restore();}
 const lk=[-6-stride*.38-(front?3:0),-26+crouch],lf=[-8-stride-(front?6:0),-1],rk=[6+stride*.45+kick*6+(front?3:0),-26-kick*5+crouch],rf=[8+stride+kick*6+(front?6:0),-1-kick*18];
 if(contact&&!front){rf[0]=8;rf[1]=-2;rk[0]=7;rk[1]=-26;lf[0]=-7;lf[1]=0;}
 // Far leg precedes the near leg; socks leave a visible knee and calf transition.
 for(const [hip,knee,foot,side] of [[[5,-47+crouch],rk,rf,1],[[-5,-47+crouch],lk,lf,-1]]){
 segment(hip,knee,5.4,3.5,skin);segment(knee,foot,3.2,1.8,skin);
 const sock=[mix(knee[0],foot[0],.25),mix(knee[1],foot[1],.25)];segment(sock,foot,3.2,2.1,cloth(front?kit.shirt:kit.shorts));line(c,sock[0]-2,sock[1]+1,sock[0]+2,sock[1]+1,'#e4e8ce',1);boot(foot,side);
 }
 poly(c,[[-10,-55+crouch],[10,-55+crouch],[11,-39+crouch],[3,-38+crouch],[0,-47+crouch],[-2,-38+crouch],[-11,-39+crouch]],shorts,'#15282a70',.7);
 line(c,-8,-53+crouch,8,-53+crouch,'#ffffff32',.7);line(c,0,-50+crouch,1,-43+crouch,'#0d17273b',.8);line(c,-9,-48+crouch,-8,-40+crouch,'#ecedd046',1.2);
 c.save();c.translate(lean,crouch-idle*.5);
 const armLift=dive*25+reaction*24,swing=stride*.35;
 const ls=[-10,-80],le=[-15-spread*.45,-67-armLift*.5+swing],lh=[-13-spread,-56-armLift+swing];
 const rs=[10,-80],re=[16+spread*.45,-67-armLift*.5-swing],rh=[17+spread,-57-armLift-swing];
 if(front&&dive){for(const elbow of [le,re]){elbow[0]=mix(elbow[0],diveSide*4,dive);elbow[1]=mix(elbow[1],-103,dive);}for(const hand of [lh,rh]){hand[0]=mix(hand[0],diveSide*4,dive);hand[1]=mix(hand[1],-126,dive);}}
 for(const [shoulder,elbow,hand] of [[rs,re,rh],[ls,le,lh]]){
 segment(shoulder,elbow,3.8,2.7,skin);segment(elbow,hand,2.7,1.8,skin);
 const sleeve=[mix(shoulder[0],elbow[0],front?.9:.52),mix(shoulder[1],elbow[1],front?.9:.52)];segment(shoulder,sleeve,4.5,3.5,shirt);
 if(front){segment(hand,[hand[0]+Math.sign(hand[0])*1.5,hand[1]+2],2.7,3,'#e4eadd');line(c,hand[0]-2,hand[1]-2,hand[0]+2,hand[1]-2,'#263d46',1.8);}else{oval(c,hand[0],hand[1]+1.6,1.9,3,skin);line(c,hand[0]+1.5,hand[1],hand[0]+2,hand[1]+2,'#9d674d',.6);}
 }
 // Curved shoulders, narrower waist, draped hem and asymmetrical fabric creases.
 c.beginPath();c.moveTo(-4,-85);c.quadraticCurveTo(-8,-84,-12,-81);c.lineTo(-10,-69);c.quadraticCurveTo(-8,-62,-9.5,-54);c.quadraticCurveTo(0,-51,10,-54);c.lineTo(8.7,-67);c.lineTo(12,-80);c.quadraticCurveTo(8,-84,4,-85);c.closePath();c.fillStyle=shirt;c.fill();c.strokeStyle='#10252b80';c.lineWidth=.6;c.stroke();
 poly(c,[[-10,-78],[-7,-75],[-6.8,-59],[-8,-55]],'#ffffff18');poly(c,[[7,-78],[9,-72],[7,-57],[3,-55]],'#091c272c');
 for(const [a,b,cc,d] of [[-7,-60,-2,-58],[3,-64,8,-66],[-6,-55,0,-54],[4,-71,8,-72]])line(c,a,b,cc,d,'#ffffff25',.7);
 line(c,-8,-54,8,-54,'#101e293b',.7);
 // Neck, ears, jaw, and a smaller head (roughly one eighth of total height).
 segment([0,-85],[.7,-88],2.6,2.4,skin);
 poly(c,[[-4.6,-94],[-3.9,-88.9],[-1,-86.8],[2.8,-87.2],[5,-91],[4,-97],[-3,-98]],skin);
 oval(c,-4.4,-92,1.1,1.8,'#c6906b');oval(c,4.3,-92,1,1.7,'#b78260');
 c.beginPath();c.moveTo(-4.8,-92);c.lineTo(-5,-96);c.quadraticCurveTo(-4,-101,1,-100);c.quadraticCurveTo(6,-100,5,-94);c.lineTo(3.5,-91.5);c.lineTo(3.4,-96);c.quadraticCurveTo(-1,-94.5,-3.6,-96);c.lineTo(-3.7,-91);c.closePath();c.fillStyle='#242521';c.fill();line(c,-3,-98,2,-98.8,'#64604a',.6);
 if(front){line(c,-3,-92.5,-1,-92.7,'#312b25',.65);line(c,1.4,-92.7,3,-92.3,'#312b25',.65);line(c,.4,-92,.8,-89.6,'#8d5b40',.6);line(c,-.9,-88.5,1.9,-88.5,'#714b39',.6);poly(c,[[-3.5,-84],[0,-81],[4,-84]],'#18343b');c.fillStyle='#f8efd1';c.font='bold 5px Arial';c.textAlign='center';c.fillText('1',0,-69);poly(c,[[5,-79],[7,-79],[7,-76],[6,-75],[5,-76]],'#e8eac7');}
 else{poly(c,[[-3.8,-94],[3.7,-94],[3,-89],[-2,-88]],'#282820');line(c,-4,-84,0,-83,'#eee4c4',1);line(c,0,-83,4,-84,'#eee4c4',1);const rgb=parseInt(kit.shirt.slice(1),16);c.fillStyle=((rgb>>16)*.299+((rgb>>8)&255)*.587+(rgb&255)*.114)>165?'#143943':'#fff8e4';c.textAlign='center';c.font='bold 13px Arial';c.fillText('10',0,-61);line(c,-4,-58,4,-58,'#ffffff40',.6);}
 // Shirt piping, seams and small folds read as fabric rather than flat shapes.
 line(c,-9,-71,-8,-58,'#ffffff26',.5);line(c,8,-71,7,-58,'#07182150',.7);
 for(let i=0;i<5;i++)line(c,-5+i*2,-75,-6+i*2,-73,'#ffffff0c',.5);
 c.restore();c.restore();
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
  const ref=Math.abs(n[1])>.9?[1,0,0]:[0,1,0];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  let u=cross(n,ref),l=Math.hypot(...u);u=u.map(a=>a/l);const v=cross(n,u);
  const vertices=Array.from({length:5},(_,j)=>{const t=j*Math.PI*2/5+index*.19;return rotate(n.map((a,k)=>a*Math.cos(.29)+(u[k]*Math.cos(t)+v[k]*Math.sin(t))*Math.sin(.29)));});
  return {normal:rotate(n),vertices};
 }).sort((a,b)=>a.normal[2]-b.normal[2]);
 for(const face of mapped){if(face.normal[2]<-.12)continue;
  const coords=face.vertices.map(([xx,yy])=>[xx*r,yy*r]);
  poly(c,coords,'#24323b','#768482',Math.max(.2,r*.028));
  // Fine embossed seams connect neighbouring panels over the white shell.
  for(const [xx,yy,zz] of face.vertices)if(zz>0){line(c,xx*r,yy*r,xx*r*1.13,yy*r*1.13,'#a9b4b07a',Math.max(.2,r*.022));}
 }
 const light=c.createRadialGradient(-r*.4,-r*.55,r*.02,r*.18,r*.3,r*1.25);
 light.addColorStop(0,'#ffffff78');light.addColorStop(.42,'#ffffff00');light.addColorStop(.77,'#06182128');light.addColorStop(1,'#03151bba');oval(c,0,0,r,r,light);
 c.restore();
}
function ring(c,x,y,r,color,progress=1,flat=1){c.save();c.translate(x,y);c.scale(1,flat);oval(c,0,0,r,r,color+'24');c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();c.arc(0,0,r,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);c.stroke();oval(c,0,0,2,2,color);c.restore();}
// Exported for meaningful trajectory and contact checks.
export function shotPose(s,shot,time){
 const elapsed=(time-shot.at)*SHOT_MS/(shot.duration??SHOT_MS),run=clamp(elapsed/360),flight=clamp((elapsed-360)/500);
 const tx=(shot.x-.5)*7.32,height=(1-shot.y)*2.44;
 // Project a world-space trajectory. Low strikes stay low, high strikes rise.
 // Bend: the ball bows outwards mid-flight and curls back onto its target (zero at both ends).
 const bow=(shot.bend??0)*Math.sin(Math.PI*flight),x=tx*flight+bow;
 const z=11*(1-flight),arc=.035*Math.sin(Math.PI*flight),p=s.project(x,z,.11+(height-.11)*flight+arc);
 const ground=s.project(x,z);return {...p,r:p.scale*.11,shadowY:ground.y,elapsed,run,flight};
}
function keeper(c,s,d,time,recover,color){
 const g=s.goal,H=s.keeperHeight,base=g.y+g.h,pose=keeperPose(d,time),q=pose.extension*(1-recover),dir=Math.sign((d?.x??.5)-.5)||1;
 const rotation=dir*mix(.85,1.53,clamp(d?.y??.65))*q;
 // Solve the leading glove's location from the identical collision target.
 const hx=mix(dir*(17+18*q),dir*4,q),hy=mix(-57-25*q,-126,q);
 const gloveX=(hx*Math.cos(rotation)-(hy+50)*Math.sin(rotation))*H/100;
 const gloveY=(-50+hx*Math.sin(rotation)+(hy+50)*Math.cos(rotation))*H/100;
 const targetX=g.x+pose.x*g.w,targetY=g.y+pose.y*g.h;
 const kx=mix(s.w*.5,targetX-gloveX,q),ky=mix(base,targetY-gloveY,q);
 oval(c,kx+H*.1,base+s.h*.003,H*(.22+.15*q),H*.025,'#061b2670');
 if(!keeperSprite(c,s,d,time,pose,recover,color))athlete(c,kx,ky,H,{shirt:color||'#46b3b7',shorts:'#152a35'},{front:true,dive:q,rotation,idle:q?0:Math.sin(time*.003)*.45,skinTone:1,diveSide:dir});
 return {x:targetX,y:targetY};
}
// The resting net is identical every frame, so it is drawn once and reused.
function restingNet(c,s){
 if(!s.netCache){const n=document.createElement('canvas');n.width=s.canvas.width;n.height=s.canvas.height;const nc=n.getContext('2d');nc.setTransform(s.dpr,0,0,s.dpr,0,0);goalBack(nc,s,null);s.netCache=n;}
 c.drawImage(s.netCache,0,0,s.w,s.h);
}
export function renderScene(s,m,time,kit,opts={}){
 if(!resizeScene(s)||!s.bg||!s.goal)return false;const {ctx:c,w,h,goal:g,ball:b,player:p}=s;c.setTransform(s.dpr,0,0,s.dpr,0,0);c.drawImage(s.bg,0,0,w,h);
 boards(c,s,time,opts.board);
 const shot=m?.shot,def=m?.phase.startsWith('defend')||(m?.phase==='result'&&m.lastAttacker==='cpu');
 const result=m?.phase==='result',recover=result?smooth((time-m.since-500)/650):0;
 const d=def?m?.dive:shot?.dive;
 const elapsed=shot?(time-shot.at)*SHOT_MS/(shot.duration??SHOT_MS):0;
 const run=shot?clamp(elapsed/360):0;
 const visualSaved=shot&&(shot.saved||(def&&canSave(m?.dive,shot,shot.at+(shot.duration??SHOT_MS))));
 const impactAge=elapsed-SHOT_MS-65;
 if(shot?.goal&&!visualSaved&&impactAge>=0&&impactAge<=1300)goalBack(c,s,{x:clamp(shot.x),y:clamp(shot.y),age:impactAge});else restingNet(c,s);
 // A planted left foot and the right boot meet the stationary ball at 360ms.
 const contact=s.project(-.10,11.12),contactH=contact.scale*1.82;
 const travel=run*.72+smooth(run)*.28;
 const px=mix(p.x,contact.x-contactH*.08,travel),py=mix(p.y,contact.y,travel),ph=mix(p.height,contactH,travel);
 const swing=shot?Math.sin(clamp((elapsed-260)/310)*Math.PI):0;
 const exactContact=shot&&Math.abs(elapsed-360)<32;
 // Depth order: net, keeper, shooter, ball, front posts.
 keeper(c,s,d,time,recover,opts.keeperColor);
 oval(c,px+ph*.07,py+ph*.008,ph*.22,ph*.023,'#08242b65');
 if(!strikerSprite(c,px,py,ph,kit,shot?elapsed:null,result&&shot?.goal,b,time))athlete(c,px,py,ph,kit,{run:run<1?run:0,kick:swing,contact:exactContact,idle:Math.sin(time*.002)*.2,reaction:result&&shot?.goal?Math.sin(clamp((time-m.since)/850)*Math.PI)*.45:0});
 if(m?.phase==='aim'){
  // Free aim. While charging, the outer ring shows the real scatter for the current power.
  const tx=g.x+m.aimX*g.w,ty=g.y+m.aimY*g.h,inGoal=m.aimX>=0&&m.aimX<=1&&m.aimY>=0&&m.aimY<=1;
  const charging=m.hold!==null,power=m.power??0,color=!inGoal?'#ff967c':charging?(m.powerZone==='sweet'?'#caff5b':m.powerZone==='over'?'#ff967c':'#ffd34d'):'#eaf6ff';
  ring(c,b.x,b.y+b.r,Math.max(16,w*.04),color,charging?Math.min(1,power):1,.24);
  c.save();c.setLineDash([Math.max(3,w*.004),Math.max(5,w*.007)]);c.lineDashOffset=-time*.03;c.globalAlpha=.5;
  c.beginPath();c.moveTo(b.x,b.y);c.quadraticCurveTo((b.x+tx)/2,Math.min(b.y,ty)-h*.04,tx,ty);c.strokeStyle=color;c.lineWidth=Math.max(1.2,w*.0016);c.stroke();c.restore();
  const R=Math.max(9,w*.012);
  if(charging&&m.spread){c.save();c.globalAlpha=.85;c.beginPath();c.ellipse(tx,ty,m.spread*g.w,m.spread*1.3*g.h,0,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=Math.max(1.5,w*.002);c.setLineDash([6,5]);c.stroke();c.fillStyle=color+'1c';c.fill();c.restore();}
  ring(c,tx,ty,R*(1+Math.sin(time*.012)*.08),color);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])line(c,tx+dx*R*.55,ty+dy*R*.55,tx+dx*R*1.5,ty+dy*R*1.5,color,Math.max(1.5,w*.0018));
 }
 // Defence: the taker's tell flashes where the ball is heading; the glove marks the player's choice.
 if(def&&m.tellAt!=null&&time>=m.tellAt&&m.phase!=='result'){
  const k=clamp((time-m.tellAt)/180),fade=1-clamp((time-m.tellAt-m.tellShow)/200),tx=g.x+m.tell.x*g.w,ty=g.y+m.tell.y*g.h;
  if(fade>0){c.save();c.globalAlpha=fade;const R=Math.max(14,m.tell.r*g.w);
   c.beginPath();c.arc(tx,ty,R*(1.6-.6*k),0,Math.PI*2);c.fillStyle='#fff3a01f';c.fill();c.strokeStyle='#fff3a0';c.lineWidth=Math.max(2,w*.003);c.stroke();
   c.beginPath();c.arc(tx,ty,R*.25,0,Math.PI*2);c.fillStyle='#fff3a0';c.fill();c.restore();}
 }
 if(def&&m.phase!=='result'&&m.cursor){const cx=g.x+m.cursor.x*g.w,cy=g.y+m.cursor.y*g.h,R=Math.max(7,w*.009);c.save();c.globalAlpha=m.dive?.4:.9;ring(c,cx,cy,R,'#9fe3ff');c.restore();}
 let bp={...b,shadowY:b.y+b.r,flight:0};
 if(shot){bp=shotPose(s,shot,time);
  if(bp.flight===1){
   const settle=clamp((bp.elapsed-SHOT_MS)/600),saved=shot.saved||(def&&canSave(m?.dive,shot,shot.at+(shot.duration??SHOT_MS)));
   if(saved){const z=settle*3,x=(shot.x-.5)*7.32+Math.sign(.5-shot.x)*settle*1.4,height=Math.max(.11,(1-shot.y)*2.44*(1-settle)-settle*settle*.5),q=s.project(x,z,height);bp={...bp,...q,r:q.scale*.11,shadowY:s.project(x,z).y};}
   else if(shot.goal){
    const age=Math.max(0,bp.elapsed-SHOT_MS)/1000;
    // The ball reaches the rear mesh, loses speed, then drops and rebounds inside.
    const depth=age<.065?age/ .065*1.8:1.8+Math.sin(Math.min(1,(age-.065)/.22)*Math.PI)*.22-Math.min(.65,Math.max(0,age-.285)*1.1);
    const initial=Math.max(.11,(1-shot.y)*2.44),fallAge=Math.max(0,age-.065);
    const height=Math.max(.11,initial-4.905*fallAge*fallAge);
    const q=s.project((shot.x-.5)*7.32,-depth,height);bp={...bp,...q,r:q.scale*.11,shadowY:s.project((shot.x-.5)*7.32,-depth).y};
   }
   else if(shot.post){
    // Off the woodwork: the ball rebounds towards the spot and bounces down.
    const side=Math.sign(shot.x-.5)||1,x=(clamp(shot.x,-.02,1.02)-.5)*7.32-side*settle*1.6,z=settle*6.5;
    const h0=Math.max(.11,(1-clamp(shot.y,-.03,1))*2.44),height=.11+Math.abs(Math.cos(settle*Math.PI*1.6))*(h0-.11)*Math.pow(1-settle,1.4);
    const q=s.project(x,z,height);bp={...bp,...q,r:q.scale*.11,shadowY:s.project(x,z).y};
   }
   else{const q=s.project((shot.x-.5)*7.32,-settle*7,Math.max(.11,(1-shot.y)*2.44-settle*settle*2));bp={...bp,...q,r:q.scale*.11,shadowY:s.project(0,-settle*7).y};}
  }
  // Motion trail while the ball is in the air.
  if(bp.flight>0&&bp.flight<1){for(let k=5;k>=1;k--){const tp=shotPose(s,shot,time-k*16*(shot.duration??SHOT_MS)/SHOT_MS);if(tp.flight<=0)continue;c.globalAlpha=.16*(1-k/6);oval(c,tp.x,tp.y,tp.r*(1-k*.07),tp.r*(1-k*.07),'#f4fbff');}c.globalAlpha=1;}
 }
 oval(c,bp.x+bp.r*.25,bp.shadowY,bp.r*1.1,bp.r*.24,'#061d2b65');ball(c,bp.x,bp.y,bp.r,shot?Math.max(0,bp.elapsed-360)*.017:0);
 goalFront(c,s);
 grade(c,s,time);
 return true;
}
// Broadcast look: drifting floodlight haze over the stands and a soft vignette, cached per size.
function grade(c,s,time){
 const {w,h,goal:g}=s,base=g.y+g.h;
 c.save();c.globalCompositeOperation='lighter';
 for(const [fx,phase] of [[.12,0],[.88,2.1],[.5,4.2]]){const x=w*fx+Math.sin(time*.00021+phase)*w*.04,y=h*.05,r=w*.32;const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(190,220,255,.10)');gr.addColorStop(1,'rgba(190,220,255,0)');c.fillStyle=gr;c.fillRect(x-r,0,r*2,base);}
 c.restore();
 if(!s.vignette){const v=document.createElement('canvas');v.width=s.canvas.width;v.height=s.canvas.height;const vc=v.getContext('2d');vc.setTransform(s.dpr,0,0,s.dpr,0,0);
  const gr=vc.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.35,w*.5,h*.5,Math.max(w,h)*.78);gr.addColorStop(0,'rgba(0,8,6,0)');gr.addColorStop(1,'rgba(0,8,6,.5)');vc.fillStyle=gr;vc.fillRect(0,0,w,h);s.vignette=v;}
 c.drawImage(s.vignette,0,0,w,h);
}
