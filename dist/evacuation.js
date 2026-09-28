import {ISLANDS,shoreDistance,terrainHeight,harborLocal,fortLocal,shoreAtX} from './geography.js';
import {BUILDINGS,townOrigin,onTownRoad,segmentBox} from './settlements.js';
import {SHIP_CLASSES} from './ship-classes.js';
import {surfaceHeight} from './sea-state.js';

export const ABANDON_CHANCE=.12;
export const EVACUATION_LIMITS={people:180,boats:12};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function crewResolve(seed,id){let n=Math.imul((seed+id*997)|0,1597334677);n^=n>>>16;return(n>>>0)/4294967296;}
const landGrids=new Map();
export function fortGatePoint(island){const p=fortLocal(island);return{x:island.x+p.x,z:island.z+p.z+6.6};}
function fortWallAt(island,x,z){if(island.kind!=='navy-fort')return false;const p=fortLocal(island),lx=x-island.x-p.x,lz=z-island.z-p.z;if(Math.abs(lx)<1.05&&lz>4.5)return false;return Math.abs(lx)<9.8&&Math.abs(lz)<8.2&&(Math.abs(lx)>5.8||Math.abs(lz)>4.5)||Math.abs(lx)<3.5&&lz> -4.5&&lz<.1;}
function grid({minX,minZ,maxX,maxZ,cell,walkable,cost=()=>1}){
 const nx=Math.ceil((maxX-minX)/cell)+1,nz=Math.ceil((maxZ-minZ)/cell)+1,valid=new Uint8Array(nx*nz),costs=new Float32Array(nx*nz);
 const point=i=>({x:minX+(i%nx)*cell,z:minZ+Math.floor(i/nx)*cell});
 for(let i=0;i<valid.length;i++){const p=point(i);valid[i]=walkable(p.x,p.z)?1:0;costs[i]=cost(p.x,p.z);}
 const nearest=p=>{let best=-1,score=Infinity;for(let i=0;i<valid.length;i++)if(valid[i]){const q=point(i),d=(q.x-p.x)**2+(q.z-p.z)**2;if(d<score){score=d;best=i;}}return best;};
 return{nx,nz,valid,costs,point,nearest,cell,walkable};
}
// A* on a bounded grid. Diagonal moves cannot cut across blocked corners.
function route(g,start,goal,danger=[]){
 const a=g.nearest(start),b=g.nearest(goal);if(a<0||b<0)return null;
 const scores=new Float64Array(g.valid.length).fill(Infinity),parent=new Int32Array(g.valid.length).fill(-1),closed=new Uint8Array(g.valid.length),risks=new Float32Array(g.valid.length).fill(-1),heap=[],end=g.point(b);
 function push(i,score){const priority=score+dist(g.point(i),end)/g.cell*.70;let n=heap.length;heap.push({i,score,priority});while(n){const p=(n-1)>>1;if(heap[p].priority<=priority)break;heap[n]=heap[p];n=p;}heap[n]={i,score,priority};}
 function pop(){const first=heap[0],last=heap.pop();if(heap.length){let n=0;while(n*2+1<heap.length){let c=n*2+1;if(c+1<heap.length&&heap[c+1].priority<heap[c].priority)c++;if(heap[c].priority>=last.priority)break;heap[n]=heap[c];n=c;}heap[n]=last;}return first;}
 scores[a]=0;push(a,0);
 while(heap.length){const current=pop(),i=current.i;if(closed[i]||current.score>scores[i]+.001)continue;closed[i]=1;if(i===b){const result=[];for(let j=b;j!==-1;j=parent[j])result.push(g.point(j));return result.reverse();}
  const x=i%g.nx,z=Math.floor(i/g.nx);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dz||x+dx<0||x+dx>=g.nx||z+dz<0||z+dz>=g.nz)continue;const j=i+dx+dz*g.nx;
   if(closed[j]||!g.valid[j]||dx&&dz&&(!g.valid[i+dx]||!g.valid[i+dz*g.nx]))continue;
   if(risks[j]<0){const point=g.point(j);risks[j]=danger.reduce((n,p)=>n+Math.max(0,1-dist(point,p)/18)*6,0);}const risk=risks[j];
   const score=scores[i]+Math.hypot(dx,dz)*(g.costs[j]+risk);if(score<scores[j]){scores[j]=score;parent[j]=i;push(j,score);}
  }
 }
 return null;
}
export function townGrid(island){
 if(landGrids.has(island.seed))return landGrids.get(island.seed);
 const list=BUILDINGS.filter(b=>b.islandSeed===island.seed),origin=townOrigin(island),r=island.r*1.15;
 const g=grid({minX:island.x-r,minZ:island.z-r,maxX:island.x+r,maxZ:island.z+r,cell:1.25,
  walkable:(x,z)=>shoreDistance(island,x-island.x,z-island.z)<-3&&!list.some(b=>x>b.minX-.38&&x<b.maxX+.38&&z>b.minZ-.38&&z<b.maxZ+.38)&&!fortWallAt(island,x,z),
  cost:(x,z)=>onTownRoad(x-island.x-origin.x,z-island.z-origin.z)?.72:1.3});landGrids.set(island.seed,g);return g;
}
export function escapeRoute(island,start,danger,seed,reserved=[]){
 const g=townGrid(island),angle=seed*2.399963,desired={x:start.x+Math.cos(angle)*24,z:start.z+Math.sin(angle)*24},candidates=[];
 const startSafety=Math.min(40,...danger.map(p=>dist(start,p))),offset=Math.abs(Math.imul(seed,733))%g.valid.length;
 for(let k=0;k<240;k++){const i=(offset+k*83)%g.valid.length;if(!g.valid[i])continue;const p=g.point(i),travel=dist(start,p),safety=Math.min(40,...danger.map(d=>dist(p,d)));
  if(travel<10||travel>36||safety<Math.min(23,startSafety+7)||reserved.some(q=>q&&dist(q,p)<2))continue;
  candidates.push({p,score:dist(p,desired)*.5+g.costs[i]*2-safety*.34});
 }
 candidates.sort((a,b)=>a.score-b.score);for(const {p}of candidates.slice(0,8)){const path=route(g,start,p,danger);if(path&&path.length>2)return path;}return null;
}
export function civilianRoute(building,threat,slot=0,reserved=[]){
 const island=ISLANDS.find(i=>i.seed===building.islandSeed),exit={x:building.x,z:building.maxZ+.7};return escapeRoute(island,exit,[threat],slot+Number(building.id.split('-').at(-1))*19+1,reserved);
}
export function evacuateTown(s,building,threat=building){
 s.civilians??=[];building.lastAttack=s.time;const nearby=s.buildings.filter(b=>b.islandSeed===building.islandSeed&&!b.evacuated&&dist(b,building)<15);
 let count=0;
 for(const b of nearby){b.lastAttack=s.time;b.evacuated=true;for(let j=0;j<b.residents&&s.civilians.length<EVACUATION_LIMITS.people;j++){
  const path=civilianRoute(b,threat,j,s.civilians.filter(p=>!p.dead).map(p=>p.path.at(-1)));if(!path)continue;const p=path[0],n=s.civilianSequence=(s.civilianSequence||0)+1;
  s.civilians.push({id:n,home:b.id,islandSeed:b.islandSeed,x:p.x,z:p.z,path,index:1,delay:j*.32+.08,speed:2.3+(n%5)*.16,phase:n*1.7,age:0,safeAge:0,angle:0,kind:'civilian',journeys:0,checkDanger:2+n%4});count++;
 }}
 if(count)s.events.push({type:'town-evacuating',count,name:building.name});return count;
}
export function waterClear(x,z,margin=2.8){return ISLANDS.every(i=>shoreDistance(i,x-i.x,z-i.z)>margin);}
let waterGrid;
function oceanGrid(){return waterGrid??=grid({minX:-330,minZ:-330,maxX:330,maxZ:330,cell:5,walkable:(x,z)=>waterClear(x,z,6.2)});}
export function landingFor(island){
 const p=island.kind==='navy-fort'?fortLocal(island):harborLocal(island),shore=shoreAtX(island,p.x);
 return{x:island.x+p.x,z:island.z+shore+(island.kind==='navy-fort'?14:16),shoreZ:island.z+shore};
}
export function rowboatRoute(start,island){const goal=landingFor(island),path=route(oceanGrid(),start,goal);if(!path)return null;
 // Exact launch and dock points may lie off-grid; validate the joining segments.
 const clear=(a,b)=>{const n=Math.max(1,Math.ceil(dist(a,b)));for(let i=0;i<=n;i++)if(!waterClear(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,1.4))return false;return true;};
 if(!clear(start,path[0])||!clear(path.at(-1),goal))return null;return[{x:start.x,z:start.z},...path,goal];
}
export function abandonShip(s,e,{force=false}={}){
 if(e.hull<=0||e.abandoned||e.abandonChecked&&!force)return false;
 if(!force&&e.hull/(e.maxHull||SHIP_CLASSES[e.shipClass].hull)>.28)return false;e.abandonChecked=true;
 if(!force&&(e.abandonRoll??1)>=ABANDON_CHANCE)return false;
 s.rowboats??=[];if(s.rowboats.length>=EVACUATION_LIMITS.boats)return false;
 const forts=ISLANDS.filter(i=>i.kind==='navy-fort'&&s.forts.some(f=>f.islandSeed===i.seed&&f.hull>0));
 const safe=forts.length?forts:ISLANDS.filter(i=>i.kind==='settlement'&&!s.buildings.some(b=>b.islandSeed===i.seed&&(b.fireRemaining>0||s.time-(b.lastAttack??-Infinity)<60)));
 safe.sort((a,b)=>dist(e,landingFor(a))-dist(e,landingFor(b)));
 const spec=SHIP_CLASSES[e.shipClass],side=Math.sign((e.x-s.x)*Math.cos(e.angle)+(e.z-s.z)*Math.sin(e.angle))||1;
 let launched=0;
 for(let n=0;n<(e.shipClass==='galleon'?2:1)&&s.rowboats.length<EVACUATION_LIMITS.boats;n++){
  const start={x:e.x+Math.cos(e.angle)*side*(spec.width*.5+1.8)+Math.sin(e.angle)*(n-.5)*5,z:e.z+Math.sin(e.angle)*side*(spec.width*.5+1.8)-Math.cos(e.angle)*(n-.5)*5};
  for(const port of safe){const path=rowboatRoute(start,port);if(!path)continue;s.rowboats.push({id:++s.boatSequence|| (s.boatSequence=1),shipId:e.id,portSeed:port.seed,crew:4,x:start.x,z:start.z,angle:e.angle,path,index:1,age:0,arrivalAge:0,arrived:false,speed:0});launched++;break;}
 }
 if(!launched)return false;e.abandoned=true;e.scuttleTime=0;e.scuttleHull=e.hull;e.tactic='abandoning ship';s.salvos=s.salvos.filter(g=>g.owner!==e.id);s.events.push({type:'ship-abandoned',id:e.id,boats:launched});return true;
}
function advance(p,dt){
 let budget=p.speed*dt;while(p.index<p.path.length&&budget>0){const goal=p.path[p.index],dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);if(d<.01){p.index++;continue;}p.angle=Math.atan2(dx,-dz);const step=Math.min(budget,d);p.x+=dx/d*step;p.z+=dz/d*step;budget-=step;if(step>=d-.001)p.index++;}
}
export function updateEvacuation(s,dt){
 updateFortGates(s,dt);
 const threats=new Map();for(const b of s.buildings)if(b.fireRemaining>0||s.time-(b.lastAttack??-Infinity)<50){if(!threats.has(b.islandSeed))threats.set(b.islandSeed,[]);threats.get(b.islandSeed).push(b);}
 s.groundThreats=(s.groundThreats||[]).filter(p=>s.time-p.time<50);for(const p of s.groundThreats){if(!threats.has(p.islandSeed))threats.set(p.islandSeed,[]);threats.get(p.islandSeed).push(p);}
 for(const p of s.civilians||[]){p.age+=dt;if(p.dead){p.deadAge=(p.deadAge||0)+dt;continue;}if(p.delay>0){p.delay-=dt;continue;}
  const island=ISLANDS.find(i=>i.seed===p.islandSeed),gate=island.kind==='navy-fort'?fortGatePoint(island):null,fort=gate?s.forts.find(f=>f.islandSeed===island.seed):null;
  if(gate&&fort?.hull>0&&fort.gateOpen<.8&&Math.abs(p.x-gate.x)<1.3&&Math.abs(p.z-gate.z)<1.5&&p.path[p.index]&&(p.path[p.index].z-gate.z)*(p.z-gate.z)<0)continue;
  advance(p,dt);if(gate&&p.fortResident!==undefined&&p.z<gate.z-1.8)p.inFort=true;const arrived=p.index>=p.path.length;if(arrived)p.safeAge+=dt;
  const danger=threats.get(p.islandSeed)||[];p.checkDanger=(p.checkDanger??4)-dt;
  const threatened=p.checkDanger<=0&&!p.dock&&danger.some(b=>dist(b,p)<12);
  if(arrived&&p.safeAge>1.5+p.id%4||threatened){const seed=p.id+(p.journeys||0)*47,path=p.inFort?route(townGrid(island),p,{x:gate.x+Math.sin(seed*2.4)*3.7,z:gate.z-3.6-(seed%3)*.6}):escapeRoute(island,p,danger,seed,(s.civilians||[]).filter(o=>o!==p&&!o.dead&&o.islandSeed===p.islandSeed).map(o=>o.path.at(-1)));p.checkDanger=4+p.id%3;
   if(path){p.path=path;p.index=0;p.safeAge=0;p.dock=false;p.journeys=(p.journeys||0)+1;p.speed=danger.length?2.3+p.id%5*.16:1.15+p.id%4*.12;}else if(arrived)p.safeAge=0;
  }
 }
 // Keep runners from stacking while using the same doorway or narrow lane.
 for(let i=0;i<(s.civilians||[]).length;i++)for(let j=i+1;j<s.civilians.length;j++){const a=s.civilians[i],b=s.civilians[j];if(a.dead||b.dead||a.islandSeed!==b.islandSeed||a.delay>0||b.delay>0||a.dock||b.dock)continue;const d=dist(a,b);if(d>=.55)continue;const dx=d>.001?(a.x-b.x)/d:Math.sin(a.id),dz=d>.001?(a.z-b.z)/d:Math.cos(a.id),push=Math.min(.05,dt*(.55-d)*3),g=townGrid(ISLANDS.find(i=>i.seed===a.islandSeed));for(const [p,sign]of [[a,1],[b,-1]]){const x=p.x+dx*push*sign,z=p.z+dz*push*sign;if(g.walkable(x,z)){p.x=x;p.z=z;}}}
 s.civilians=(s.civilians||[]).filter(p=>!p.dead||p.deadAge<12);
 for(const b of s.rowboats||[]){b.age+=dt;if(b.arrived){b.arrivalAge+=dt;continue;}const alive=b.crew-(b.lostCrew?.size||0);b.speed+=(2.6*Math.sqrt(alive/b.crew)-b.speed)*Math.min(1,dt*.8);advance(b,dt);if(!alive)b.derelictAge=(b.derelictAge||0)+dt;
  if(b.index>=b.path.length&&alive){b.arrived=true;const port=ISLANDS.find(i=>i.seed===b.portSeed),dock=landingFor(port);s.rescuedCrew=(s.rescuedCrew||0)+alive;
   for(let j=0;j<b.crew&&s.civilians.length<EVACUATION_LIMITS.people;j++){if(b.lostCrew?.has(j))continue;const path=[{x:dock.x,z:dock.z},{x:dock.x,z:dock.shoreZ-4}];if(port.kind==='navy-fort'){const gate=fortGatePoint(port);path.push({x:gate.x,z:gate.z+2},{x:gate.x,z:gate.z-2},{x:gate.x+(j%2-.5)*3,z:gate.z-3.8-(j%2)*.5});}s.civilians.push({id:++s.civilianSequence||(s.civilianSequence=1),islandSeed:port.seed,x:dock.x+(j%2-.5)*.45,z:dock.z,angle:0,path,index:1,age:0,safeAge:0,delay:j*.6,speed:1.7,phase:j,kind:'sailor',dock:true,fortResident:port.kind==='navy-fort'?port.seed:undefined});}
   s.events.push({type:'crew-landed',count:alive,port:port.name});
  }
 }
 s.rowboats=(s.rowboats||[]).filter(b=>b.arrivalAge<32&&(b.derelictAge||0)<30);
}
export function updateFortGates(s,dt){
 for(const fort of s.forts||[]){const island=ISLANDS.find(i=>i.seed===fort.islandSeed);if(!island)continue;const gate=fortGatePoint(island);
  const near=(s.civilians||[]).some(p=>!p.dead&&p.delay<=0&&p.islandSeed===island.seed&&((p.z>gate.z-.4&&dist(p,gate)<6.5)||Math.abs(p.x-gate.x)<1.7&&Math.abs(p.z-gate.z)<2.3));
  fort.gateHold=near?2.5:Math.max(0,(fort.gateHold||0)-dt);const target=fort.hull<=0||fort.gateHold>0?1:0;fort.gateOpen=clamp((fort.gateOpen||0)+Math.sign(target-(fort.gateOpen||0))*dt*1.5,0,1);
 }
}
export function personHeight(p){const i=ISLANDS.find(i=>i.seed===p.islandSeed),h=terrainHeight(i,p.x-i.x,p.z-i.z);return p.dock?Math.max(.82,h):h+.06;}
export function rowerPosition(boat,j,time){const side=j<2?-1:1,lx=side*.35,lz=(j%2? .68:-.68)-.22,cs=Math.cos(boat.angle),sn=Math.sin(boat.angle);return{x:boat.x+lx*cs-lz*sn,y:surfaceHeight(boat.x,boat.z,time)+.55,z:boat.z+lx*sn+lz*cs};}
export function hitPeople(s,from,to,time){
 let hit=null;const check=(p,data,height=1.65)=>{const t=segmentBox(from,to,{minX:p.x-.27,maxX:p.x+.27,minY:p.y+.12,maxY:p.y+height,minZ:p.z-.27,maxZ:p.z+.27});if(t!==null&&(!hit||t<hit.t))hit={t,npc:data};};
 for(const p of s.civilians||[])if(!p.dead&&p.delay<=0)check({...p,y:personHeight(p)},{person:p});
 for(const b of s.rowboats||[])if(!b.arrived)for(let j=0;j<b.crew;j++)if(!b.lostCrew?.has(j))check(rowerPosition(b,j,time),{boat:b,seat:j},1.0);
 return hit;
}
export function killPerson(s,npc,point){
 if(npc.person){if(npc.person.dead)return false;npc.person.dead=true;npc.person.deadAge=0;}
 else{const b=npc.boat;b.lostCrew??=new Set();if(b.lostCrew.has(npc.seat))return false;b.lostCrew.add(npc.seat);b.crewDeaths??={};b.crewDeaths[npc.seat]=b.age;}
 s.events.push({type:'npc-hit',x:point.x,y:point.y,z:point.z});return true;
}
export function groundImpact(s,point){
 const island=ISLANDS.find(i=>shoreDistance(i,point.x-i.x,point.z-i.z)<0);if(!island)return;
 s.groundThreats??=[];const existing=s.groundThreats.find(p=>dist(p,point)<4);if(existing)existing.time=s.time;else{s.groundThreats.push({...point,time:s.time,islandSeed:island.seed});if(s.groundThreats.length>24)s.groundThreats.shift();}
 for(const p of s.civilians||[])if(!p.dead&&p.delay<=0){if(dist(p,point)<1.25&&Math.abs(personHeight(p)-point.y)<1.5)killPerson(s,{person:p},point);else if(p.islandSeed===island.seed&&dist(p,point)<18)p.checkDanger=0;}
 const nearest=s.buildings.filter(b=>b.islandSeed===island.seed&&dist(b,point)<18).sort((a,b)=>dist(a,point)-dist(b,point))[0];if(nearest)evacuateTown(s,nearest,point);
}
