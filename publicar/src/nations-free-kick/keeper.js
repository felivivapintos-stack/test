// Shared goalkeeper motion and collision model: visuals and outcomes use the same pose.
// Goal-normalised units: x 0..1 post to post, y 0 (crossbar) .. 1 (ground).
export const SHOT_MS=860;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
// How far a keeper can stretch from the set position. The top corners sit just outside
// the CPU keeper's envelope, so a well-placed corner is (almost) unstoppable.
// 'fk' is the CPU keeper at a free kick: set further back on his line, covering less of the frame.
const REACH={cpu:{rx:.415,ry:.6},fk:{rx:.37,ry:.55},player:{rx:.47,ry:.7}};
// Player shot accuracy: the further the release from the sweet spot, the wider the scatter.
export const SWEET=.8;
export function shotSpread(power){return .045+Math.abs(power-SWEET)*.35;}
export function shotDuration(power){return SHOT_MS*(1.15-.3*Math.min(1,power));}
function reachable(x,y,who){
 const r=REACH[who]||REACH.cpu,dx=(x-.5)/r.rx,dy=(y-.65)/r.ry,d=Math.hypot(dx,dy);
 return d<=1?{x,y}:{x:.5+dx/d*r.rx,y:.65+dy/d*r.ry};
}
export function createDive(x,y,at,{valid=true,speed=1,who='cpu',hold=300}={}){
 const p=reachable(clamp(x,-.1,1.1),clamp(y,-.1,1.1),who);
 const distance=Math.hypot((p.x-.5)*1.25,(p.y-.65)*.7);
 return {x:p.x,y:p.y,at,valid,speed,who,hold,duration:250+distance*410};
}
export function keeperPose(d,time){
 if(!d||time<d.at)return {x:.5,y:.65,extension:0};
 const age=(time-d.at)*(d.speed??1),q=smooth(age/d.duration),fall=clamp((age-d.duration-(d.hold??300)+120)/400);
 return {x:.5+(d.x-.5)*q,y:.65+(d.y-.65)*q+fall*.22,extension:q*(1-fall*.5)};
}
// Why a dive failed, or 'saved'. Used for both the collision and the feedback text.
export function diveResult(d,shot,arrival){
 if(shot.x<0||shot.x>1||shot.y<0||shot.y>1)return 'off';
 // A ball struck straight at the keeper hits his body, even if he never dived or has barely moved.
 const body=keeperPose(d&&d.valid?d:null,arrival);
 const blocked=Math.abs(body.x-shot.x)<.075&&shot.y>body.y-.42;
 if(!d||!d.valid)return blocked?'saved':'nodive';
 const age=(arrival-d.at)*(d.speed??1);
 if(age<d.duration*.78)return blocked?'saved':'late';
 if(age>d.duration+(d.hold??300))return 'early';
 const p=keeperPose(d,arrival);
 return Math.hypot((p.x-shot.x)/.105,(p.y-shot.y)/.18)<1?'saved':'wrong';
}
export const canSave=(d,shot,arrival)=>diveResult(d,shot,arrival)==='saved';
// CPU keeper facing the player. Better keepers, later rounds and repeated corners are read
// more often; a well-struck (fast) shot is read less often.
export function planCpuDive(shot,history,{stage=0,rating=75,power=.8,duration=SHOT_MS,at=0,readBonus=0},rng=Math.random){
 const recent=history.slice(-4),repeats=recent.filter(x=>Math.abs(x-shot.x)<.15).length;
 const quality=1-Math.min(1,Math.abs(power-.8)/.45);
 const read=clamp(.24+stage*.03+(rating-70)*.005+repeats*.08-quality*.14+readBonus,.1,.75);
 let x,y;
 if(rng()<read){const e=.06+(1-quality)*.06;x=shot.x+(rng()-.5)*e*2;y=shot.y+(rng()-.5)*e*2.4;}
 // A wrong guess commits to a side; the keeper rarely stays home.
 else{const side=rng();x=side<.45?.12+rng()*.2:side<.9?.68+rng()*.2:.44+rng()*.12;y=.25+rng()*.65;}
 const d=createDive(clamp(x,.02,.98),clamp(y,.04,.97),at,{who:'cpu'});
 d.at=at+Math.max(260,duration-d.duration-60-rng()*90);
 return d;
}
// Where a CPU taker aims. Strong takers pick the corners more often.
export function opponentTarget(stage,rating=75,rng=Math.random){
 const corner=rng()<clamp(.45+(rating-70)*.012+stage*.03,.35,.85);
 const x=corner?(rng()<.5?.07+rng()*.2:.73+rng()*.2):.3+rng()*.4;
 const y=rng()<.45?.1+rng()*.25:.6+rng()*.32;
 return {x,y};
}
