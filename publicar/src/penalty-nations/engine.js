// Tournament rules only. No DOM.
// [id, name, scoreboard code, shirt, shorts, rating 0-100, region]
// Ratings are a rough playing-strength guide: they drive the CPU, the stars and the draw.
const DATA=[
// Europe
['FR','France','FRA','#214b99','#f3f3f1',92,'EU'],['ES','Spain','ESP','#da2833','#1f2f6b',93,'EU'],['EN','England','ENG','#e9eef5','#214674',90,'EU'],['PT','Portugal','POR','#be263a','#146d47',89,'EU'],
['DE','Germany','GER','#f0f0e9','#252525',87,'EU'],['NL','Netherlands','NED','#ee7927','#202f52',86,'EU'],['IT','Italy','ITA','#2373c6','#efefef',84,'EU'],['BE','Belgium','BEL','#ad2039','#171d1b',83,'EU'],
['HR','Croatia','CRO','#e73e49','#ffffff',82,'EU'],['DK','Denmark','DEN','#c62a40','#ffffff',79,'EU'],['CH','Switzerland','SUI','#d32842','#ffffff',79,'EU'],['AT','Austria','AUT','#c42c42','#ffffff',78,'EU'],
['NO','Norway','NOR','#c02b3c','#263c71',78,'EU'],['TR','Türkiye','TUR','#e9e9e9','#cc3044',77,'EU'],['SE','Sweden','SWE','#f7d117','#1d4fa0',76,'EU'],['PL','Poland','POL','#eeeeee','#ce3442',75,'EU'],
['UA','Ukraine','UKR','#e9d34a','#3071a3',75,'EU'],['RS','Serbia','SRB','#c8202f','#1d3b75',74,'EU'],['CZ','Czechia','CZE','#d7141a','#ffffff',74,'EU'],['RU','Russia','RUS','#c4202f','#ffffff',74,'EU'],
['HU','Hungary','HUN','#c8102e','#ffffff',73,'EU'],['SC','Scotland','SCO','#203559','#eeeeed',72,'EU'],['GR','Greece','GRE','#f4f6f8','#1c5aa6',72,'EU'],['SK','Slovakia','SVK','#f2f2f2','#1f3a93',71,'EU'],
['RO','Romania','ROU','#f5d000','#1a3a8a',71,'EU'],['SI','Slovenia','SVN','#f3f3f3','#2e8b57',70,'EU'],['WA','Wales','WAL','#d0202e','#b01a28',70,'EU'],['GE','Georgia','GEO','#f4f4f4','#d0202e',70,'EU'],
['IE','Republic of Ireland','IRL','#169b62','#ffffff',69,'EU'],['BA','Bosnia and Herzegovina','BIH','#1e3d8f','#ffffff',67,'EU'],['AL','Albania','ALB','#d0202e','#151515',66,'EU'],['IS','Iceland','ISL','#1c4fa0','#ffffff',65,'EU'],
['NI','Northern Ireland','NIR','#2a8a3e','#ffffff',64,'EU'],['FI','Finland','FIN','#ffffff','#1d3d7a',64,'EU'],['IL','Israel','ISR','#f4f6f8','#1d4fa3',63,'EU'],['MK','North Macedonia','MKD','#d0202e','#f4c430',61,'EU'],
['BG','Bulgaria','BUL','#ffffff','#1f8a4c',60,'EU'],
// South America
['AR','Argentina','ARG','#84cdeb','#1b2a4a',93,'SA'],['BR','Brazil','BRA','#f3d343','#1f4fa8',90,'SA'],['UY','Uruguay','URU','#7ecae2','#182a38',84,'SA'],['CO','Colombia','COL','#f2d741','#23365d',83,'SA'],
['EC','Ecuador','ECU','#f2d038','#273263',78,'SA'],['PY','Paraguay','PAR','#d94046','#1d3b8f',75,'SA'],['CL','Chile','CHI','#d52b1e','#1a3a7a',73,'SA'],['PE','Peru','PER','#f5f5f5','#d91023',70,'SA'],
['VE','Venezuela','VEN','#7a1f2b','#ffffff',70,'SA'],['BO','Bolivia','BOL','#1f8f4c','#ffffff',60,'SA'],
// Africa
['MA','Morocco','MAR','#c9253e','#196141',83,'AF'],['SN','Senegal','SEN','#ffffff','#267c51',80,'AF'],['NG','Nigeria','NGA','#22a35a','#0e5c34',77,'AF'],['CI','Ivory Coast','CIV','#ef8e30','#f1f1e7',76,'AF'],
['DZ','Algeria','ALG','#f1f3e9','#267245',75,'AF'],['EG','Egypt','EGY','#d53242','#171c20',74,'AF'],['CM','Cameroon','CMR','#1f8f4c','#d0202e',74,'AF'],['TN','Tunisia','TUN','#f1eeee','#cf3443',72,'AF'],
['GH','Ghana','GHA','#eeeeeb','#252627',71,'AF'],['ML','Mali','MLI','#2d9b4f','#f4d03f',71,'AF'],['ZA','South Africa','RSA','#e4c83c','#286742',70,'AF'],['CD','DR Congo','COD','#1f6fd1','#d0202e',70,'AF'],
['BF','Burkina Faso','BFA','#20904a','#ffffff',69,'AF'],['CV','Cape Verde','CPV','#2450ae','#ffffff',66,'AF'],['GN','Guinea','GUI','#d0202e','#f4d03f',66,'AF'],['ZM','Zambia','ZAM','#1f9a50','#e6782e',64,'AF'],
['AO','Angola','ANG','#d0202e','#151515',62,'AF'],['TG','Togo','TOG','#f4d03f','#1f8f4c',58,'AF'],
// Asia and Oceania
['JP','Japan','JPN','#2845a1','#f1f4fc',82,'AS'],['KR','South Korea','KOR','#e84855','#23222e',78,'AS'],['IR','Iran','IRN','#f5f5ef','#ae2332',76,'AS'],['AU','Australia','AUS','#eed84b','#286942',75,'AS'],
['SA','Saudi Arabia','KSA','#297957','#f2f2eb',70,'AS'],['UZ','Uzbekistan','UZB','#f0f3f6','#2e72a0',70,'AS'],['QA','Qatar','QAT','#8b1f48','#eeeeea',69,'AS'],['JO','Jordan','JOR','#dc393d','#faf4ef',67,'AS'],
['IQ','Iraq','IRQ','#f3f3f3','#2e8b57',67,'AS'],['AE','United Arab Emirates','UAE','#f4f4f4','#d0202e',65,'AS'],['NZ','New Zealand','NZL','#efefef','#171b1c',64,'AS'],['CN','China','CHN','#d0202e','#ffffff',62,'AS'],
['ID','Indonesia','IDN','#d0202e','#f3f3f3',60,'AS'],['TH','Thailand','THA','#2b4aa0','#ffffff',58,'AS'],['VN','Vietnam','VIE','#d82a2a','#f2d43a',58,'AS'],['KP','North Korea','PRK','#d0202e','#d0202e',55,'AS'],
['MY','Malaysia','MAS','#f4d03f','#151515',55,'AS'],['KW','Kuwait','KUW','#1f5fb0','#ffffff',54,'AS'],['IN','India','IND','#1f5fb0','#ffffff',50,'AS'],
// North and Central America, Caribbean
['US','United States','USA','#f3f5f5','#193554',80,'NA'],['MX','Mexico','MEX','#208659','#ece5d6',79,'NA'],['CA','Canada','CAN','#df3445','#1d2328',77,'NA'],['CR','Costa Rica','CRC','#d0202e','#1d3d8f',68,'NA'],
['PA','Panama','PAN','#dc343c','#2b3981',68,'NA'],['JM','Jamaica','JAM','#efd34a','#258453',65,'NA'],['HN','Honduras','HON','#ffffff','#1d4fa0',63,'NA'],['CW','Curaçao','CUW','#2652ad','#eecf43',61,'NA'],
['HT','Haiti','HAI','#26439c','#d22e42',60,'NA'],['SV','El Salvador','SLV','#1d4fa0','#ffffff',58,'NA'],['TT','Trinidad and Tobago','TRI','#d0202e','#151515',57,'NA'],['CU','Cuba','CUB','#d0202e','#ffffff',48,'NA']
];
export const REGIONS=['EU','SA','AF','AS','NA'];
export const TEAMS=DATA.map(([id,name,code,shirt,shorts,rating,region],i)=>({id,name,code,shirt,shorts,rating,region,stars:starsFor(rating),keeper:keeperColour(shirt,i)}));
function starsFor(r){return r>=88?5:r>=80?4:r>=72?3:r>=64?2:1;}
// Goalkeepers wear a colour that contrasts with the outfield shirt.
function keeperColour(shirt,i){
 const options=['#f2c230','#ff7a30','#8a4fd8','#22c87a','#ff4f9a','#26b6e8','#c7f03b'];
 const rgb=[1,3,5].map(k=>parseInt(shirt.slice(k,k+2),16));
 const dist=c=>{const o=[1,3,5].map(k=>parseInt(c.slice(k,k+2),16));return Math.hypot(...o.map((v,k)=>v-rgb[k]));};
 const ranked=options.filter(c=>dist(c)>150);return (ranked.length?ranked:options)[i%(ranked.length||options.length)];
}
const BY_ID=new Map(TEAMS.map(t=>[t.id,t]));
export const team=id=>BY_ID.get(id);
export const flagSrc=id=>`assets/flags/${id}.svg`;
export function random(s){s.rng=(Math.imul(1664525,s.rng)+1013904223)>>>0;return s.rng/4294967296;}
function shuffle(a,s){for(let i=a.length-1;i>0;i--){let j=Math.floor(random(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
// 48 of the 95 nations qualify: the player's nation, the 32 strongest others,
// and 15 more drawn with a bias towards stronger sides, so every run differs.
export function createTournament(id,seed=Date.now()>>>0){
 if(!team(id))throw Error('Invalid team');
 const s={version:2,player:id,rng:seed,groups:[],results:[],round:0,stage:0,bracket:[],history:[],status:'playing'};
 const others=TEAMS.filter(t=>t.id!==id).sort((a,b)=>b.rating-a.rating);
 const field=[team(id),...others.slice(0,32)],pool=others.slice(32);
 while(field.length<48){let total=pool.reduce((n,t)=>n+t.rating-40,0),pick=random(s)*total,i=0;while(i<pool.length-1&&(pick-=pool[i].rating-40)>0)i++;field.push(pool.splice(i,1)[0]);}
 field.sort((a,b)=>b.rating-a.rating||a.id.localeCompare(b.id));
 s.teams=field.map(t=>t.id);
 const pots=[0,1,2,3].map(p=>shuffle(field.slice(p*12,p*12+12).map(t=>t.id),s));
 for(let i=0;i<12;i++)s.groups.push(pots.map(p=>p[i]));
 return s;
}
export function standings(s,group){let rows=group.map(id=>({id,played:0,points:0,gf:0,ga:0,gd:0}));for(const m of s.results){if(!group.includes(m.a)||!group.includes(m.b))continue;const a=rows.find(x=>x.id===m.a),b=rows.find(x=>x.id===m.b);a.played++;b.played++;a.gf+=m.x;a.ga+=m.y;b.gf+=m.y;b.ga+=m.x;a.points+=m.x>m.y?3:m.x===m.y?1:0;b.points+=m.y>m.x?3:m.x===m.y?1:0;}rows.forEach(x=>x.gd=x.gf-x.ga);return rows.sort(compare);}
export function compare(a,b){return b.points-a.points||b.gd-a.gd||b.gf-a.gf||a.id.localeCompare(b.id);}
export const SCHEDULE=[[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]];
export const playerGroup=s=>s.groups.findIndex(g=>g.includes(s.player));
export function nextMatch(s){if(s.status!=='playing')return null;if(s.stage===0){const gi=playerGroup(s),g=s.groups[gi];const pair=SCHEDULE[s.round].find(p=>p.some(i=>g[i]===s.player));return {a:s.player,b:g[pair.find(i=>g[i]!==s.player)],stage:0,group:gi,round:s.round};}let pair=s.bracket.find(p=>p.includes(s.player));return pair?{a:s.player,b:pair.find(id=>id!==s.player),stage:s.stage}:null;}
const scoreChance=id=>.55+team(id).rating*.003;
export function simulated(s,a,b,knock=false){let x=0,y=0;const pa=scoreChance(a),pb=scoreChance(b);for(let i=0;i<5;i++){x+=random(s)<pa?1:0;y+=random(s)<pb?1:0;}if(knock){while(x===y){x+=random(s)<pa?1:0;y+=random(s)<pb?1:0;}}return {a,b,x,y};}
export function finishMatch(s,x,y){const m=nextMatch(s);if(!m||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0)throw Error('Invalid result');if(s.stage>0&&x===y)throw Error('Knockout draw');s.history.push({...m,x,y,stage:s.stage});if(s.stage===0){for(const g of s.groups)for(const p of SCHEDULE[s.round]){let a=g[p[0]],b=g[p[1]];s.results.push(a===s.player?{a,b,x,y}:b===s.player?{a,b,x:y,y:x}:simulated(s,a,b));}s.round++;if(s.round===3){const tables=s.groups.map(g=>standings(s,g));const thirds=tables.map(t=>t[2]).sort(compare).slice(0,8);const winners=tables.map(t=>t[0]).sort(compare);const runners=tables.map(t=>t[1]).sort(compare);const qualified=[...winners,...runners,...thirds].map(x=>x.id);s.qualified=qualified;s.stage=1;if(!qualified.includes(s.player)){s.status='eliminated';return s;}let high=qualified.slice(0,16),low=qualified.slice(16).reverse();s.bracket=high.map(id=>{let i=low.findIndex(other=>!s.groups.some(g=>g.includes(id)&&g.includes(other)));if(i<0)i=0;return [id,low.splice(i,1)[0]];});}}else{let winners=s.bracket.map(([a,b])=>{if(a===s.player||b===s.player)return x>y?s.player:m.b;let r=simulated(s,a,b,true);return r.x>r.y?a:b;});s.knockoutLog??=[];s.knockoutLog.push({stage:s.stage,pairs:s.bracket,winners});if(x<y){s.status='eliminated';return s;}if(s.stage===5){s.status='champion';return s;}s.bracket=[];for(let i=0;i<winners.length;i+=2)s.bracket.push(winners.slice(i,i+2));s.stage++;}return s;}
export function shootoutFinished(a,b,group=false){const x=a.filter(Boolean).length,y=b.filter(Boolean).length;if(group)return a.length>=5&&b.length>=5;if(a.length<=5&&b.length<=5){if(x>y+Math.max(0,5-b.length)||y>x+Math.max(0,5-a.length))return true;}return a.length>=5&&a.length===b.length&&x!==y;}
