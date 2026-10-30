// Original pre-rendered athletes. Canvas articulation is retained as a fallback.
const banks={striker:[],keeper:[]},tints=new Map(),loads=[];
// A small mesh deformation lowers the striking boot to the planted-foot plane.
// It acts on the photographed leg, retaining texture, anatomy and the upper body.
function groundKick(source){
 const w=source.width,h=source.height,out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d');
 const warp=(x,y)=>{const u=x/w,v=y/h,weight=Math.exp(-Math.pow((u-.90)/.20,2)-Math.pow((v-.734)/.125,2))*Math.max(0,Math.min(1,(u-.56)/.16));return [x-w*.08*weight,y+h*.22*weight];};
 const triangle=(src,dst)=>{
  const [a,b,d]=src,[A,B,D]=dst,det=(b[0]-a[0])*(d[1]-a[1])-(d[0]-a[0])*(b[1]-a[1]);
  const ax=((B[0]-A[0])*(d[1]-a[1])-(D[0]-A[0])*(b[1]-a[1]))/det;
  const bx=((D[0]-A[0])*(b[0]-a[0])-(B[0]-A[0])*(d[0]-a[0]))/det;
  const ay=((B[1]-A[1])*(d[1]-a[1])-(D[1]-A[1])*(b[1]-a[1]))/det;
  const by=((D[1]-A[1])*(b[0]-a[0])-(B[1]-A[1])*(d[0]-a[0]))/det;
  c.save();c.beginPath();dst.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
  c.transform(ax,ay,bx,by,A[0]-ax*a[0]-bx*a[1],A[1]-ay*a[0]-by*a[1]);c.drawImage(source,0,0);c.restore();
 };
 for(let y=0;y<18;y++)for(let x=0;x<16;x++){
  const a=[x*w/16,y*h/18],b=[(x+1)*w/16,y*h/18],d=[x*w/16,(y+1)*h/18],e=[(x+1)*w/16,(y+1)*h/18];
  for(const points of [[a,b,d],[b,e,d]])triangle(points,points.map(p=>warp(...p)));
 }return out;
}

if(typeof Image!=='undefined')for(const name of Object.keys(banks))for(let n=0;n<8;n++){
 const image=new Image();const item={image,ready:false};
 loads.push(new Promise(resolve=>{image.onload=()=>{item.ready=true;resolve();};image.onerror=resolve;}));
 image.src=new URL(`./assets/${name}-${n}.png`,import.meta.url).href;banks[name].push(item);
}
export const spritesReady=Promise.all(loads);
const rgb=hex=>{const v=hex.replace('#','');return (v.length===3?v.split('').map(x=>x+x).join(''):v).match(/../g).map(x=>parseInt(x,16));};
function remember(key,value){if(tints.size>=64)tints.delete(tints.keys().next().value);tints.set(key,value);return value;}
function tinted(item,index,kit){
 const key='s'+index+kit.shirt+kit.shorts;if(tints.has(key))return tints.get(key);
 const image=item.image,w=image.naturalWidth,h=image.naturalHeight,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.drawImage(image,0,0);const pixels=c.getImageData(0,0,w,h),shirt=rgb(kit.shirt),shorts=rgb(kit.shorts);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,d=pixels.data;if(d[i+3]<12)continue;const [r,g,b]=[d[i],d[i+1],d[i+2]];
  const blue=b>r*1.22&&b>g*.95&&b-r>20;
  const darkShorts=y>h*.43&&y<h*.65&&Math.max(r,g,b)-Math.min(r,g,b)<22&&Math.max(r,g,b)<90;
  if(blue||darkShorts){const color=blue?shirt:shorts,lum=blue?(r*.2+g*.4+b*.4)/120:(r+g+b)/135;for(let j=0;j<3;j++)d[i+j]=Math.min(255,color[j]*lum);}
 }
 c.putImageData(pixels,0,0);return remember(key,index===4?groundKick(canvas):canvas);
}
// Goalkeeper jersey: only the teal shirt and socks change; skin, gloves and shorts stay.
function tintedKeeper(item,index,color){
 const key='k'+index+color;if(tints.has(key))return tints.get(key);
 const image=item.image,w=image.naturalWidth,h=image.naturalHeight,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.drawImage(image,0,0);const pixels=c.getImageData(0,0,w,h),target=rgb(color),d=pixels.data;
 for(let i=0;i<d.length;i+=4){if(d[i+3]<12)continue;const r=d[i],g=d[i+1],b=d[i+2];
  if(b>r*1.25&&g>r*1.05&&b-r>25){const lum=(r*.2+g*.4+b*.4)/125;for(let j=0;j<3;j++)d[i+j]=Math.min(255,target[j]*lum);}}
 c.putImageData(pixels,0,0);return remember(key,canvas);
}
// Pre-tint every frame so the first kick never stalls on pixel work.
export function warmKit(kit,keeperColor){
 banks.striker.forEach((item,i)=>{if(item.ready&&kit)tinted(item,i,kit);});
 if(keeperColor)banks.keeper.forEach((item,i)=>{if(item.ready)tintedKeeper(item,i,keeperColor);});
}
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
// Short, aligned transitions avoid visible pose popping and root teleportation.
function blendFrames(c,from,to,t,draw){
 c.save();if(from===to||t>=1)draw(to);else{draw(from);c.globalAlpha=t;draw(to);}c.restore();
}
export function strikerSprite(c,x,y,H,kit,elapsed=null,celebrate=false,ball=null,time=0){
 const e=elapsed??0,stages=[0,90,185,280,360,470,650];
 let index=elapsed===null?0:1;
 for(let i=1;i<stages.length;i++)if(e>=stages[i]-55)index=i;
 if(celebrate&&e>1100)index=7;
 const previous=index===7?6:Math.max(0,index-1),start=index===7?1100:stages[index]??0;
 const t=elapsed===null?1:smooth((e-start+55)/55);
 if(!banks.striker[index]?.ready||!banks.striker[previous]?.ready)return false;
 // Foot anchor, rather than the centre of each differently cropped image.
 const anchors=[[.49,1],[.48,1],[.50,1],[.90,1],[.70,.956],[.68,1],[.49,1],[.5,1]];
 const breathe=elapsed===null?Math.sin(time*.0024)*H*.0018:0;
 const step=e<280?Math.sin(e/90*Math.PI)*H*.009*(1-e/360):0;
 const follow=smooth((e-400)/220),settle=smooth((e-720)/320);
 const lean=(follow-settle)*.026;
 c.save();c.translate(x,y);c.rotate(lean);
 blendFrames(c,previous,index,t,i=>{
  const image=tinted(banks.striker[i],i,kit),scale=H/image.height;
  c.drawImage(image,-image.width*scale*anchors[i][0],-H*anchors[i][1]-step-breathe,image.width*scale,H+breathe);
 });c.restore();return true;
}
export function keeperSprite(c,s,d,time,pose,recover,color=null){
 const q=pose.extension*(1-recover),dir=Math.sign((d?.x??.5)-.5)||1,H=s.keeperHeight,g=s.goal;
 const central=Math.abs((d?.x??.5)-.5)<.13;
 const diveIndex=central?6:dir<0?(d.y<.48?2:3):(d.y<.48?4:5);
 const index=q<.17?0:q<.38?1:diveIndex;
 if(!banks.keeper[index]?.ready)return false;
 const diveBlend=smooth((q-.28)/.23),load=smooth(q/.28);
 const grips={2:[.064,.156],3:[.05,.85],4:[.934,.176],5:[.965,.838],6:[.50,.08]};
 // Both images follow one continuous root during the launch and landing.
 const idle=Math.sin(time*.003)*H*.002,weight=Math.sin(time*.0017)*H*.013*(1-load);
 const draw=i=>{
  const item=banks.keeper[i],image=color?tintedKeeper(item,i,color):item.image,w=item.image.naturalWidth,h=item.image.naturalHeight;
  if(i===7){const height=H*.70,scale=height/h;const x=mix(g.x+pose.x*g.w,s.w*.5,recover);c.drawImage(image,x-w*scale*.5,g.y+g.h-height,w*scale,height);return;}
  if(i<2){const scale=H/h,compress=1-load*.055;
   c.drawImage(image,s.w*.5+weight+dir*q*H*.08-w*scale*.5,g.y+g.h-H*compress+idle,w*scale,H*compress);return;}
  const scale=H/Math.max(w,h)*(central?1.18:1.08),grip=grips[i];
  const tx=g.x+pose.x*g.w,ty=g.y+pose.y*g.h;
  const landed=smooth(Math.max(0,(time-(d?.at??time))*(d?.speed??1)-(d?.duration??0)-60)/300);
  const restX=mix(tx,s.w*.5,recover),restY=mix(ty,g.y+g.h-H*.06,landed);
  const dx=restX-w*grip[0]*scale,dy=restY-h*grip[1]*scale;
  // Small torso roll after landing; glove stays the animation/collision anchor.
  c.save();c.translate(restX,restY);c.rotate(dir*(landed*.055-recover*.12));
  c.drawImage(image,dx-restX,dy-restY,w*scale,h*scale);c.restore();
 };
 if(recover>0&&banks.keeper[7]?.ready){if(recover<.65)blendFrames(c,diveIndex,7,smooth(recover/.65),draw);else blendFrames(c,7,0,smooth((recover-.65)/.35),draw);}
 else if(index===0)draw(0);
 else if(index===1)blendFrames(c,0,1,smooth((q-.13)/.14),draw);
 else blendFrames(c,1,index,diveBlend,draw);
 return true;
}
