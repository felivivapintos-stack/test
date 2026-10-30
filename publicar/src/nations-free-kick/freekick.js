// Free-kick rules and ball flight. No DOM. World units are metres: goal line z=0, goal centre x=0,
// h is height above the grass. Outcomes are decided here when the ball is struck; the renderer only draws them.
import {shotSpread,opponentTarget,createDive} from './keeper.js';
export const GOAL_W=7.32,GOAL_H=2.44,BALL_R=.11,WALL_GAP=9.15,MAN_W=.6,WALL_H=1.84,JUMP_H=.4,JUMP_MS=540,RUN_MS=430;
export const SWEET=.8,SWEET_LOW=.66,SWEET_HIGH=.94,POWER_MAX=1.3,BOW=2.5;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

// A free-kick spot: distance and angle to goal, and a wall that covers the near post.
// Later rounds move the ball further out and add men to the wall.
export function createSpot(stage=0,index=0,rng=Math.random){
 const dist=18.5+rng()*7.5+stage*.75+Math.min(3,Math.max(0,index-4)*.7);
 const angle=(rng()-.5)*.66;
 const bx=Math.sin(angle)*dist,bz=Math.cos(angle)*dist;
 const side=Math.abs(bx)>1.2?Math.sign(bx):(rng()<.5?-1:1);
 const men=Math.round(clamp(3+(1-Math.abs(angle)/.33)*1.3+stage*.25+(rng()-.5)*1.2,3,5));
 const uw=WALL_GAP/dist,wz=bz*(1-uw);
 // The outer man lines up just outside the near post, seen from the ball.
 const outer=bx+(side*GOAL_W/2-bx)*uw+side*.3,inner=outer-side*men*MAN_W;
 return {bx,bz,dist,angle,side,men,uw,wz,wx0:Math.min(outer,inner),wx1:Math.max(outer,inner),id:Math.round(rng()*1e9)};
}
export const MENU_SPOT={bx:-3.4,bz:21.6,dist:21.87,angle:-.156,side:-1,men:4,uw:WALL_GAP/21.87,wz:21.6*(1-WALL_GAP/21.87),id:-1};
{const s=MENU_SPOT,outer=s.bx+(-GOAL_W/2-s.bx)*s.uw-.3;s.wx0=outer;s.wx1=outer+s.men*MAN_W;}
export const manX=(sp,i)=>sp.wx0+(i+.5)*MAN_W;

// Ball centre along the flight, u from 0 (struck) to 1 (goal line). Curl bows the path sideways and
// brings it back onto the target; the arc lifts it over the wall and lets it dip.
export function pathPoint(sp,shot,u){
 const tx=(shot.x-.5)*GOAL_W,ty=Math.max(BALL_R,(1-shot.y)*GOAL_H),q=4*u*(1-u);
 const bow=(shot.curl||0)*BOW*sp.dist/22;
 return {x:sp.bx+(tx-sp.bx)*u+bow*q,z:sp.bz*(1-u),h:BALL_R+(ty-BALL_R)*u+(shot.arc||0)*q};
}
export function jumpHeight(jumpAt,t){const k=(t-jumpAt)/JUMP_MS;return k>0&&k<1?JUMP_H*Math.sin(Math.PI*k):0;}
// Does the line to this target run into the wall? Then the ball has to go over it.
export function covered(sp,x,y,curl){const p=pathPoint(sp,{x,y,curl,arc:0},sp.uw);return p.x>sp.wx0-.55&&p.x<sp.wx1+.55;}
// The arc that just clears the wall at a typical jump. A path that bends round the wall needs very little.
export function arcNeeded(sp,x,y,curl){
 const base=.28+sp.dist*.012;
 if(!covered(sp,x,y,curl))return base;
 const p=pathPoint(sp,{x,y,curl,arc:0},sp.uw);
 return Math.max(base,(WALL_H+JUMP_H*.7+BALL_R+.04-p.h)/(4*sp.uw*(1-sp.uw)));
}
// Release window on the power meter. Going over the wall needs a firm, precise strike;
// bending round it leaves more room for error.
export const OVER_LOW=.79;
export const sweetZone=(sp,x,y,curl)=>covered(sp,x,y,curl)?{lo:OVER_LOW,hi:SWEET_HIGH}:{lo:SWEET_LOW,hi:SWEET_HIGH};
export const flightMs=(sp,power,arc)=>Math.round(sp.dist/(19+Math.min(power,1.1)*11)*1000*(1+arc*.05));

// Strike the ball. Release power sets the arc: low and it hits the wall, high and it rises over the bar.
export function strike(sp,{aimX,aimY,curl,power,jumpAt,pace=1,rng=Math.random}){
 const spread=shotSpread(power),a=rng()*Math.PI*2,r=spread*Math.sqrt(rng());
 let x=aimX+Math.cos(a)*r,y=aimY+Math.sin(a)*r*1.3;
 y-=Math.max(0,power-SWEET_HIGH)*1.7;
 y+=Math.max(0,.5-power)*.35;
 const over=covered(sp,aimX,aimY,curl),arc=arcNeeded(sp,aimX,aimY,curl)*clamp(power/(over?OVER_LOW:SWEET),.3,1.3);
 const shot={x,y,curl:curl+(rng()-.5)*.08,arc,power,jumpAt,flight:Math.round(flightMs(sp,power,arc)*pace)};
 const w=pathPoint(sp,shot,sp.uw),top=WALL_H+jumpHeight(jumpAt,RUN_MS+shot.flight*sp.uw);
 shot.wall=w.x>sp.wx0-BALL_R&&w.x<sp.wx1+BALL_R&&w.h<top+BALL_R*.5;
 if(shot.wall){shot.hit={x:w.x,h:Math.min(w.h,top-.15)};return shot;}
 const inGoal=x>=0&&x<=1&&y>=0&&y<=1;
 shot.inGoal=inGoal;
 shot.post=!inGoal&&x>=-.035&&x<=1.035&&y>=-.06&&y<=1;
 shot.bar=shot.post&&y<0&&x>=0&&x<=1;
 shot.over=!inGoal&&!shot.post&&y<0;
 shot.weak=power<.5;
 return shot;
}
// CPU taker: picks a corner, sometimes bends it round the wall, and is less precise when weaker.
// Defending difficulty by stage (0 groups … 5 final), tuned by simulation for a player reacting in 0.45-0.7s:
// about 1-2 goals conceded per match in the groups, 1-3 up to the quarter-finals, 2-4 in the semis and final.
// pace slows the CPU's flight, tell is the delay (ms after contact) before the ring flashes, noise is how vague it is,
// speed is how fast your keeper dives.
export const DEFEND=[
 {pace:1.02,tell:0,noise:.04,speed:1.05},   // groups: ~1.5 goals conceded
 {pace:1.0,tell:30,noise:.045,speed:1},     // round of 32: ~1.9
 {pace:1.0,tell:50,noise:.05,speed:1},      // round of 16: ~2.0
 {pace:.99,tell:70,noise:.05,speed:1},      // quarter-finals: ~2.2
 {pace:.97,tell:150,noise:.065,speed:1},    // semi-finals: ~3.1
 {pace:.96,tell:170,noise:.07,speed:1}      // final: ~3.3
];
export function cpuStrike(sp,{stage=0,rating=75,jumpAt,pace=DEFEND[stage].pace,rng=Math.random}){
 const t=opponentTarget(stage,rating,rng);
 const straight=pathPoint(sp,{x:t.x,y:t.y,curl:0,arc:0},sp.uw).x;
 const covered=straight>sp.wx0-.55&&straight<sp.wx1+.55;
 let curl;
 if(covered&&rng()<.4)curl=(straight<(sp.wx0+sp.wx1)/2?-1:1)*(.65+rng()*.35);
 else curl=(rng()-.5)*1.3;
 const miss=.045+clamp(90-rating,0,40)*.003;
 const x=clamp(t.x+(rng()-.5)*2*miss,-.04,1.04),y=clamp(t.y+(rng()-.5)*2*miss,.02,.98),zone=sweetZone(sp,x,y,curl);
 const noise=clamp(.05+(86-rating)*.0045-stage*.004,.035,.16);
 // Over the wall, takers keep it as low as they dare so it dips in time: a slight under-hit hits the wall.
 const aim=zone.lo>SWEET_LOW?zone.lo+.025:(zone.lo+zone.hi)/2;
 const power=aim+(rng()+rng()+rng()-1.5)*noise*1.5;
 // CPU shots travel a little slower than yours, so a human keeper has time to read the flight and get across.
 return strike(sp,{aimX:x,aimY:y,curl,power,jumpAt,pace,rng});
}
// CPU goalkeeper: it cannot guess a free kick, it reacts to the ball. It reads the flight once the ball
// is clear of the wall (later when it came over the top or bends a lot) and then has to get across in time,
// so the top corners beat it and anything near it is saved.
export function cpuKeeperDive(sp,shot,{rating=75,stage=0,contact=0},rng=Math.random){
 const hidden=covered(sp,shot.x,shot.y,shot.curl),bend=Math.abs(shot.curl);
 const react=170-(rating-75)*3-stage*10+(hidden?shot.flight*sp.uw*.6:0)+bend*160+rng()*120;
 const err=.025+bend*.05+(hidden?.015:0)+(1-rating/100)*.04;
 const tx=clamp(shot.x+(rng()-.5)*2*err,.02,.98),ty=clamp(shot.y+(rng()-.5)*2.4*err,.04,.97);
 const arrival=contact+shot.flight,seen=contact+react;
 const d=createDive(tx,ty,seen,{who:'fk'});
 d.at=Math.max(seen,arrival-d.duration-90);
 return d;
}

// Where the ball is at a given time since the run-up began (world units).
// After the goal line it follows the outcome: net, parry, woodwork or into the crowd.
export function ballAt(sp,shot,t){
 const flight=(t-RUN_MS)/shot.flight;
 if(flight<=0)return {x:sp.bx,z:sp.bz,h:BALL_R,flight:0,spin:0};
 const spin=Math.max(0,t-RUN_MS)*.017;
 if(shot.wall&&flight>=sp.uw){
  const k=clamp((t-RUN_MS-shot.flight*sp.uw)/900),side=Math.sign(shot.hit.x-(sp.wx0+sp.wx1)/2)||1;
  const h=BALL_R+Math.abs(Math.cos(k*Math.PI*1.6))*(shot.hit.h-BALL_R)*Math.pow(1-k,1.4);
  return {x:shot.hit.x+side*k*1.6,z:sp.wz+.3+k*5,h,flight:1,spin:spin*.4,after:k};
 }
 if(flight<1){const p=pathPoint(sp,shot,flight);return {...p,flight,spin};}
 const end=pathPoint(sp,shot,1),age=t-RUN_MS-shot.flight,settle=clamp(age/650);
 if(shot.saved){
  const z=settle*3,x=end.x+Math.sign(.5-shot.x)*settle*1.6;
  return {x,z,h:Math.max(BALL_R,end.h*(1-settle)-settle*settle*.5),flight:1,spin,after:settle};
 }
 if(shot.goal){
  const a=age/1000,depth=a<.065?a/.065*1.8:1.8+Math.sin(Math.min(1,(a-.065)/.22)*Math.PI)*.22-Math.min(.65,Math.max(0,a-.285)*1.1);
  const fall=Math.max(0,a-.065);
  return {x:end.x,z:-depth,h:Math.max(BALL_R,end.h-4.905*fall*fall),flight:1,spin,after:settle};
 }
 if(shot.post){
  const side=Math.sign(shot.x-.5)||1,x=(clamp(shot.x,-.02,1.02)-.5)*GOAL_W-side*settle*1.6;
  const h0=Math.max(BALL_R,(1-clamp(shot.y,-.03,1))*GOAL_H);
  return {x,z:settle*6.5,h:BALL_R+Math.abs(Math.cos(settle*Math.PI*1.6))*(h0-BALL_R)*Math.pow(1-settle,1.4),flight:1,spin,after:settle};
 }
 return {x:end.x+(end.x-sp.bx)/sp.dist*settle*6,z:-settle*7,h:Math.max(BALL_R,end.h+settle*.8-settle*settle*2.2),flight:1,spin,after:settle};
}
// When the shot is finished, for the match clock.
export const shotEnd=(sp,shot)=>RUN_MS+(shot.wall?shot.flight*sp.uw+650:shot.flight);
