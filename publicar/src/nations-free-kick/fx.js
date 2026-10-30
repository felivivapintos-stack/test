// Lightweight screen-space particles: confetti, camera flashes and grass/spark bursts.
export class Particles{
 constructor(){this.list=[];}
 get active(){return this.list.length>0;}
 clear(){this.list.length=0;}
 confetti(w,h,colors,count=140,fromTop=true){
  for(let i=0;i<count;i++){
   const fromSide=!fromTop&&i%2;
   this.list.push({kind:'confetti',x:fromTop?Math.random()*w:(fromSide?w+10:-10),y:fromTop?-20-Math.random()*h*.4:h*(.3+Math.random()*.4),
    vx:fromTop?(Math.random()-.5)*60:(fromSide?-1:1)*(250+Math.random()*350),vy:fromTop?80+Math.random()*120:-(200+Math.random()*300),
    rot:Math.random()*6,vr:(Math.random()-.5)*10,size:5+Math.random()*7,color:colors[i%colors.length],life:0,max:3.2+Math.random()*1.8,wobble:Math.random()*6});
  }
 }
 flashes(w,top,bottom,count=1){
  for(let i=0;i<count;i++)this.list.push({kind:'flash',x:Math.random()*w,y:top+Math.random()*(bottom-top),life:0,max:.09+Math.random()*.08,size:1.5+Math.random()*2.5});
 }
 burst(x,y,colors,count=18,speed=180){
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=speed*(.4+Math.random()*.8);
   this.list.push({kind:'spark',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-speed*.4,life:0,max:.45+Math.random()*.35,size:1.5+Math.random()*2.5,color:colors[i%colors.length]});}
 }
 update(dt){
  dt=Math.min(.05,dt);
  for(const p of this.list){p.life+=dt;
   if(p.kind==='confetti'){p.vy+=(p.vy<160?260:30)*dt;p.vx*=1-1.8*dt;p.x+=(p.vx+Math.sin(p.life*3+p.wobble)*40)*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;}
   else if(p.kind==='spark'){p.vy+=520*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  }
  this.list=this.list.filter(p=>p.life<p.max);
 }
 draw(c){
  for(const p of this.list){const k=p.life/p.max;
   if(p.kind==='confetti'){c.save();c.globalAlpha=Math.min(1,(1-k)*3);c.translate(p.x,p.y);c.rotate(p.rot);c.scale(1,Math.cos(p.life*7+p.wobble));c.fillStyle=p.color;c.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);c.restore();}
   else if(p.kind==='flash'){const r=p.size*(1+k*3),g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r*4);g.addColorStop(0,`rgba(255,255,255,${1-k})`);g.addColorStop(.25,`rgba(220,235,255,${(1-k)*.5})`);g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(p.x-r*4,p.y-r*4,r*8,r*8);}
   else{c.globalAlpha=1-k;c.fillStyle=p.color;c.beginPath();c.arc(p.x,p.y,p.size*(1-k*.5),0,Math.PI*2);c.fill();c.globalAlpha=1;}
  }
 }
}
