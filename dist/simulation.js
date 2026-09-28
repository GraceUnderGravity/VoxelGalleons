import {crewResolve,abandonShip,evacuateTown,updateEvacuation,hitPeople,killPerson,groundImpact} from './evacuation.js';
import {aimCannon,SHOT_GRAVITY} from './gunnery.js';
import {surfaceHeight,wavePose} from './sea-state.js';
import {navalHelm,broadsideClear} from './naval-ai.js';
import {hoistPirateColours,recognizesPirate} from './colours.js';
import { SHIP_CLASSES,gunStations } from './ship-classes.js';
import {resolveShipContacts,closestHullPoint,resolveShoreContact} from './collisions.js';
import {upgradeEffects,grantUpgrade,purchaseUpgrade,UPGRADES} from './upgrades.js';
import {ISLANDS,PORT,coastRadius,harborApproach,fortPosition} from './geography.js';
import {BUILDINGS,firstLandHit,segmentBox} from './settlements.js';
export {ISLANDS,PORT} from './geography.js';
export const WORLD_LIMIT=320;
export const RELOAD_TIME=6.2;
export const CARGO=[{x:12,z:37},{x:-15,z:-21},{x:78,z:-18},{x:-73,z:43},{x:12,z:115},{x:176,z:-15},{x:-162,z:-62},{x:0,z:-119},{x:-180,z:18}];
export function seeded(seed=1715){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function angleDelta(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
export function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
export function headingTo(a,b){return Math.atan2(b.x-a.x,-(b.z-a.z));}
export function waveHeight(x,z,t){return surfaceHeight(x,z,t);}
export function disableCannon(s,body,id){
 const [side,index]=id.split(':').map(Number),spec=SHIP_CLASSES[body.shipClass];if(![-1,1].includes(side)||!Number.isInteger(index)||index<0||index>=spec.cannons/2)return false;
 body.disabledGuns??=new Set();if(body.disabledGuns.has(id))return false;body.disabledGuns.add(id);
 const owner=body===s?'player':body.id;s.salvos=s.salvos.filter(g=>g.owner!==owner||`${g.side}:${g.gun}`!==id);
 s.events.push({type:'gun-disabled',target:owner,gun:id});return true;
}
export function createState(shipClass='galleon',voyageSeed=1715){
  return {civilians:[],rowboats:[],civilianSequence:0,boatSequence:0,rescuedCrew:0,colours:'pirate',shipClass,...harborApproach(PORT),angle:1.98,speed:0,vx:0,vz:0,angularVelocity:0,rudder:0,heel:0,heelVelocity:0,pitch:0,throttle:0,hull:100,gold:0,cargo:0,sunk:0,cooldown:0,time:0,damageGrace:0,status:'playing',started:false,target:null,collected:new Set(),upgrades:{},cannonRefit:false,forts:ISLANDS.filter(i=>i.kind==='navy-fort').map(i=>({id:'fort-'+i.seed,islandSeed:i.seed,...fortPosition(i),hull:210,maxHull:210,cooldown:8,staticFort:true,angle:0})),salvos:[],shotSequence:0,collisionCooldowns:{},
    buildingImpactSequence:0,buildings:BUILDINGS.map(b=>({...b,hull:b.maxHull,fireRemaining:0})),enemies:[{id:0,abandonRoll:crewResolve(voyageSeed,0),shipClass:'brig',x:55,z:24,angle:-1.4,hull:100,maxHull:100,cooldown:5,homeX:55,homeZ:24},{id:1,abandonRoll:crewResolve(voyageSeed,1),shipClass:'frigate',x:-65,z:100,angle:.5,hull:135,maxHull:135,cooldown:8,homeX:-65,homeZ:100},{id:2,abandonRoll:crewResolve(voyageSeed,2),shipClass:'galleon',x:0,z:-120,angle:2.3,hull:180,maxHull:180,cooldown:9,homeX:0,homeZ:-120}],projectiles:[],events:[]};
}
export function setSails(s,value){if(s.status!=='playing')return;s.throttle=Math.max(0,Math.min(3,value));if(s.throttle>0)s.started=true;if(s.throttle===0)s.target=null;}
export function steerTo(s,x,z){if(s.status!=='playing'||!Number.isFinite(x)||!Number.isFinite(z))return false;s.started=true;s.target={x:Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,x)),z:Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,z))};s.throttle=3;return true;}
export function nearPort(s){return distance(s,harborApproach(PORT))<21;}
export function nearestHarbor(s){return ISLANDS.filter(i=>i.port&&distance(s,harborApproach(i))<21).sort((a,b)=>distance(s,harborApproach(a))-distance(s,harborApproach(b)))[0]||null;}
export function repair(s){const port=nearestHarbor(s);if(s.status!=='playing'||!port||s.gold<port.repairCost||s.hull>=100&&!s.disabledGuns?.size)return false;s.gold-=port.repairCost;s.hull=100;s.disabledGuns=new Set();s.events.push({type:'repair'});return true;}
export function changeShipClass(s,id){if(!Object.hasOwn(SHIP_CLASSES,id)||s.status!=='playing')return false;s.shipClass=id;s.disabledGuns=new Set();s.speed=0;s.vx=0;s.vz=0;s.angularVelocity=0;s.heel=0;s.heelVelocity=0;s.throttle=0;s.target=null;s.salvos=s.salvos.filter(b=>b.owner!=='player');return true;}

// A broadside is an order to the crews. The galleon's fifty guns use a longer ripple.
export function fireBroadside(s,side='auto',owner=s){
  if(s.status!=='playing'||owner.cooldown>0||owner.abandoned)return false;if(owner===s)hoistPirateColours(s);s.started=true;
  const spec=SHIP_CLASSES[owner===s?s.shipClass:(owner.shipClass||'brig')];
  let direction=side==='port'?-1:1;
  if(side==='auto'){
    const targets=owner===s?[...s.enemies,...s.forts].filter(e=>e.hull>0):[s];
    const nearest=targets.reduce((best,e)=>!best||distance(owner,e)<distance(owner,best)?e:best,null);
    if(nearest)direction=Math.sign(Math.sin(headingTo(owner,nearest)-owner.angle))||1;
  }
  if(owner.disabledGuns?.size&&gunStations(owner.shipClass).every((_,i)=>owner.disabledGuns.has(`${direction}:${i}`)))return false;
  const random=seeded(1715+(s.shotSequence++)*733+Math.floor(s.time*100));
  const shots=spec.cannons/2,stations=gunStations(owner.shipClass||'brig'),duration=spec.broadsideDuration||1,order=Array.from({length:shots},(_,i)=>i);
  for(let i=shots-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  order.forEach((gun,index)=>{if(!owner.disabledGuns?.has(`${direction}:${gun}`))s.salvos.push({owner:owner===s?'player':owner.id,side:direction,gun,shots,...stations[gun],damage:owner===s?spec.damage*upgradeEffects(s).damage:spec.damage*.60,recoil:spec.name==='Galleon'?14/25:1,fireAt:s.time+.035+index*((duration-.15)/Math.max(1,shots-1))+random()*.10,seed:Math.floor(random()*1e8)});});
  owner.cooldown=owner===s?RELOAD_TIME*upgradeEffects(s).reload:9;
  s.events.push({type:'order',enemy:owner!==s});return true;
}
function discharge(s,gun){
  const owner=gun.owner==='player'?s:[...s.enemies,...s.forts].find(e=>e.id===gun.owner&&e.hull>0);if(!owner||owner.abandoned||owner.disabledGuns?.has(`${gun.side}:${gun.gun}`))return;
  const random=seeded(gun.seed),a=gun.fixedAngle??(owner.angle+gun.side*Math.PI/2);
  const x=gun.fixedX??(owner.x+Math.sin(owner.angle)*gun.along+Math.sin(a)*gun.beam),z=gun.fixedZ??(owner.z-Math.cos(owner.angle)*gun.along-Math.cos(a)*gun.beam);
  // Independent lateral spread, barrel elevation, and powder charge. Movement worsens aim.
  const spread=.065+(owner.speed||3)/14*.045+Math.abs(owner.heel||0)*.35;
  const aim=a+(random()+random()-1)*spread*1.5,velocity=20.5+random()*5;
  const pose=owner.staticFort?null:wavePose(owner,SHIP_CLASSES[owner.shipClass||'brig'],s.seaTime??s.time);
  const muzzleY=gun.muzzleY+(pose?pose.y+gun.along*Math.sin(pose.pitch)+gun.side*gun.beam*Math.sin(pose.roll):0);
  const elevation=owner.staticFort?{vy:-1.6-random()*.6,elevation:0}:aimCannon(s,owner,{x,y:muzzleY,z,dx:Math.sin(aim),dz:-Math.cos(aim),speed:velocity},random);
  s.projectiles.push({x,z,y:muzzleY,vx:Math.sin(aim)*velocity+(owner.vx||0)*.30,vz:-Math.cos(aim)*velocity+(owner.vz||0)*.30,vy:elevation.vy,life:2.8,owner:gun.owner,damage:gun.damage});
  s.events.push({type:'cannon',x,z,y:muzzleY,dx:Math.sin(a),dz:-Math.cos(a),elevation:elevation.elevation,side:gun.side,enemy:owner!==s,gun:gun.gun,owner:gun.owner});
  if(owner===s){const mass=SHIP_CLASSES[s.shipClass].mass,recoil=gun.recoil??1;s.vx-=Math.sin(a)*.045*recoil/mass;s.vz-=Math.cos(a)*-.045*recoil/mass;s.heelVelocity+=gun.side*.007*recoil/mass;}
}
function hitHull(b,target,from,seaTime){
  if(target.staticFort)return segmentBox(from,b,{minX:target.x-9.2,maxX:target.x+9.2,minZ:target.z-9.2,maxZ:target.z+9.2,minY:1.2,maxY:7.6});
  const pose=wavePose(target,SHIP_CLASSES[target.shipClass||'brig'],seaTime);
  const spec=SHIP_CLASSES[target.shipClass||'brig'];
  // First contact along the entire 3D flight segment, including hull heave and heel.
  const rx=spec.width*.5+.22,rz=spec.length*.43;
  const local=p=>{const across=(p.x-target.x)*Math.cos(target.angle)+(p.z-target.z)*Math.sin(target.angle),along=(p.x-target.x)*Math.sin(target.angle)-(p.z-target.z)*Math.cos(target.angle);return{x:across/rx,z:along/rz,y:p.y-pose.y-along*Math.sin(pose.pitch)-across*Math.sin(pose.roll)};};
  const a=local(from),c=local(b),dx=c.x-a.x,dz=c.z-a.z,dy=c.y-a.y,A=dx*dx+dz*dz,B=2*(a.x*dx+a.z*dz),C=a.x*a.x+a.z*a.z-1;
  let enter=0,exit=1;
  if(A<1e-12){if(C>0)return null;}else{const discriminant=B*B-4*A*C;if(discriminant<0)return null;const root=Math.sqrt(discriminant);enter=Math.max(enter,(-B-root)/(2*A));exit=Math.min(exit,(-B+root)/(2*A));}
  if(Math.abs(dy)<1e-9){if(a.y<-.2||a.y>4.8*spec.modelScale)return null;}else{let lo=(-.2-a.y)/dy,hi=(4.8*spec.modelScale-a.y)/dy;if(lo>hi)[lo,hi]=[hi,lo];enter=Math.max(enter,lo);exit=Math.min(exit,hi);}
  return enter<=exit?enter:null;
}
function hitCannons(to,target,from,time){
 if(target.staticFort)return null;const spec=SHIP_CLASSES[target.shipClass],pose=wavePose(target,spec,time);
 const local=p=>{const x=(p.x-target.x)*Math.cos(target.angle)+(p.z-target.z)*Math.sin(target.angle),z=(p.x-target.x)*Math.sin(target.angle)-(p.z-target.z)*Math.cos(target.angle);return{x,z,y:p.y-pose.y-z*Math.sin(pose.pitch)-x*Math.sin(pose.roll)};};
 const a=local(from),b=local(to),stations=gunStations(target.shipClass);let nearest=null;
 for(const side of [-1,1])for(const [i,gun] of stations.entries()){
  const id=`${side}:${i}`;if(target.disabledGuns?.has(id))continue;
  const x=side*(gun.beam-.42*spec.modelScale),r=.40*spec.modelScale;
  const t=segmentBox(a,b,{minX:x-.64*spec.modelScale,maxX:x+.64*spec.modelScale,minY:gun.muzzleY-r,maxY:gun.muzzleY+r,minZ:gun.along-r,maxZ:gun.along+r});
  if(t!==null&&(!nearest||t<nearest.t))nearest={t,gun:id};
 }
 return nearest;
}
function sinkEnemy(s,e){if(e.wreckAge!==undefined)return;e.wreckAge=0;e.speed*=.35;e.vx=(e.vx||0)*.35;e.vz=(e.vz||0)*.35;s.sunk++;s.gold+=300;s.events.push({type:'sunk',id:e.id,x:e.x,z:e.z});}
function collapseBuilding(s,building){building.fireRemaining=Math.min(12,building.fireRemaining||0);s.events.push({type:'building-destroyed',target:building.id,name:building.name,x:building.x,y:building.y,z:building.z});}
export function step(s,dt,input={}){
  if(s.status!=='playing')return;if(!s.started){if(input.left||input.right)s.started=true;else return;}
  dt=Math.min(.05,Math.max(0,dt));s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);s.damageGrace=Math.max(0,s.damageGrace-dt);
  const spec=SHIP_CLASSES[s.shipClass],upgrades=upgradeEffects(s);let turn=(input.right?1:0)-(input.left?1:0),destinationDistance=Infinity;
  if(turn)s.target=null;
  if(s.target){destinationDistance=distance(s,s.target);if(destinationDistance<3.8&&s.speed<3.8){s.target=null;s.throttle=0;s.anchorDrag=1.4;}else{const diff=angleDelta(headingTo(s,s.target),s.angle);turn=Math.max(-1,Math.min(1,diff*1.5-s.angularVelocity*2));}}
  // The rudder and hull have inertia; the ship keeps its momentum through a turn.
  s.rudder+=(turn-s.rudder)*Math.min(1,dt*3.5*upgrades.handling/Math.sqrt(spec.mass));
  const desiredTurn=s.rudder*spec.turn*upgrades.handling*.78*(.14+Math.min(1,s.speed/8)*.56);
  s.angularVelocity+=(desiredTurn-s.angularVelocity)*Math.min(1,dt*2.2/Math.sqrt(spec.mass));
  s.angle+=s.angularVelocity*dt;
  const wind=.83+.17*Math.cos(s.angle+.7);
  const desiredSpeed=Math.min(s.throttle/3*spec.speed*upgrades.speed*wind,destinationDistance*.24);if(s.throttle>0)s.anchorDrag=0;
  const acceleration=(desiredSpeed-s.speed)*(.78/spec.mass+(s.throttle===0?.18:0)+(s.anchorDrag||0));s.speed+=acceleration*dt;
  s.vx+=(Math.sin(s.angle)*s.speed-s.vx)*Math.min(1,dt*(2.4/spec.mass+(s.anchorDrag||0)));
  s.vz+=(-Math.cos(s.angle)*s.speed-s.vz)*Math.min(1,dt*(2.4/spec.mass+(s.anchorDrag||0)));
  s.x+=s.vx*dt;s.z+=s.vz*dt;
  const targetHeel=Math.max(-.12,Math.min(.12,-s.angularVelocity*s.speed*.045));
  s.heelVelocity+=((targetHeel-s.heel)*2.8-s.heelVelocity*1.8)*dt;s.heel+=s.heelVelocity*dt;
  s.pitch+=(-acceleration*.025-s.pitch)*dt*.8;
  for(const island of ISLANDS){if(resolveShoreContact(s,island)){if(s.speed>3&&s.damageGrace===0){s.hull-=6;s.damageGrace=2;s.events.push({type:'reef'});}s.speed=0;s.vx=0;s.vz=0;s.throttle=0;s.target=null;}}
  if(Math.abs(s.x)>WORLD_LIMIT||Math.abs(s.z)>WORLD_LIMIT){s.x=Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,s.x));s.z=Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,s.z));s.throttle=0;s.target=null;s.speed=0;s.vx=0;s.vz=0;s.events.push({type:'edge'});}
  CARGO.forEach((c,i)=>{if(!s.collected.has(i)&&distance(s,c)<7){s.collected.add(i);s.cargo++;s.gold+=150;s.hull=Math.min(100,s.hull+6);s.events.push({type:'cargo',x:c.x,z:c.z});}});
  for(const e of s.enemies){
    if(e.hull<=0){e.wreckAge=(e.wreckAge||0)+dt;e.vx=(e.vx||0)*Math.exp(-dt*.65);e.vz=(e.vz||0)*Math.exp(-dt*.65);e.x+=e.vx*dt;e.z+=e.vz*dt;continue;}e.cooldown=Math.max(0,e.cooldown-dt);
    abandonShip(s,e);
    if(e.abandoned){e.scuttleTime+=dt;e.speed=(e.speed||0)*Math.exp(-dt);e.vx=(e.vx||0)*Math.exp(-dt);e.vz=(e.vz||0)*Math.exp(-dt);e.x+=e.vx*dt;e.z+=e.vz*dt;if(e.scuttleTime>4)e.hull=Math.max(0,e.hull-e.scuttleHull*dt/14);if(e.hull===0)sinkEnemy(s,e);continue;}
    const hostile=recognizesPirate(s,e),helm=navalHelm(e,s,[s,...s.enemies],ISLANDS,s.time,hostile),mass=SHIP_CLASSES[e.shipClass].mass;
    e.tactic=helm.mode;
    e.angularVelocity=(e.angularVelocity||0)+(helm.turn-(e.angularVelocity||0))*Math.min(1,dt*1.25/Math.sqrt(mass));
    e.angle+=e.angularVelocity*dt;
    e.speed=(e.speed||0)+(helm.speed-(e.speed||0))*dt*(helm.evade?1.1:.65)/mass;
    e.vx=(e.vx||0)+(Math.sin(e.angle)*e.speed-(e.vx||0))*dt*1.6/mass;
    e.vz=(e.vz||0)+(-Math.cos(e.angle)*e.speed-(e.vz||0))*dt*1.6/mass;e.x+=e.vx*dt;e.z+=e.vz*dt;
    for(const island of ISLANDS){if(resolveShoreContact(e,island)){e.vx*=.4;e.vz*=.4;e.speed*=.7;}}
    if(hostile&&e.cooldown===0&&s.time>(e.surprisedUntil||0)&&broadsideClear(e,s,s.enemies,ISLANDS))fireBroadside(s,'auto',e);

  }
  const bodies=[s,...s.enemies.filter(e=>e.hull>0||(e.wreckAge??99)<3.4)];
  for(const impact of resolveShipContacts(bodies,ISLANDS)){
    const {a,b,speed,point,normal}=impact,key=[a===s?'player':a.id,b===s?'player':b.id].sort().join(':');
    if(speed<.7||(s.collisionCooldowns[key]||0)>s.time)continue;s.collisionCooldowns[key]=s.time+1.35;
    for(const [body,other,sign]of [[a,b,-1],[b,a,1]]){
      if(body.hull<=0)continue;if(body!==s&&other===s)body.alerted=true;const c=SHIP_CLASSES[body.shipClass],otherMass=SHIP_CLASSES[other.shipClass].mass;
      const damage=Math.min(22,(speed-.45)*1.8*Math.sqrt(otherMass/c.mass));body.hull-=body===s?damage*100/(c.hull*upgrades.hull):damage;
      const p=closestHullPoint(body,point);s.events.push({type:'hit',target:body===s?'player':body.id,x:p.x,y:body.shipClass==='sloop'?1.9:2.7,z:p.z,dx:normal.x*sign,dz:normal.z*sign,collision:true,impactSpeed:speed,enemy:body!==s});
      if(body!==s&&body.hull<=0)sinkEnemy(s,body);
    }
  }
  for(const fort of s.forts){if(fort.hull<=0)continue;fort.cooldown=Math.max(0,fort.cooldown-dt);if(recognizesPirate(s,fort)&&distance(s,fort)<61&&s.time>12&&s.time>(fort.surprisedUntil||0)&&fort.cooldown===0)fireFort(s,fort);}
  for(const body of [s,...s.enemies])wavePose(body,SHIP_CLASSES[body.shipClass],s.seaTime??s.time);
  for(const building of s.buildings){
   if(!(building.fireRemaining>0))continue;
   building.fireRemaining=Math.max(0,building.fireRemaining-dt);
   if(building.hull>0){building.hull=Math.max(0,building.hull-dt*1.25);if(building.hull===0)collapseBuilding(s,building);}
  }
  const pending=[];for(const gun of s.salvos){if(gun.fireAt<=s.time)discharge(s,gun);else pending.push(gun);}s.salvos=pending;
  const alive=[];
  for(const b of s.projectiles){const from={x:b.x,y:b.y??2,z:b.z};b.x+=b.vx*dt;b.z+=b.vz*dt;b.y=(b.y??2)+(b.vy||0)*dt;b.vy=(b.vy||0)-SHOT_GRAVITY*dt;b.life-=dt;let hit=false;
    let contact=firstLandHit(from,b,s.buildings),target=null;const person=hitPeople(s,from,b,s.seaTime??s.time);if(person&&(!contact||person.t<contact.t))contact=person;
    const targets=b.owner==='player'?[...s.enemies,...s.forts].filter(e=>e.hull>0):[s];
    for(const candidate of targets){let t=hitHull(b,candidate,from,s.seaTime??s.time),gun=null;const cannon=hitCannons(b,candidate,from,s.seaTime??s.time);if(cannon&&(t===null||cannon.t<=t)){t=cannon.t;gun=cannon.gun;}if(t!==null&&(!contact||t<contact.t)){contact={t,gun};target=candidate;}}
    if(contact){
     b.x=from.x+(b.x-from.x)*contact.t;b.y=from.y+(b.y-from.y)*contact.t;b.z=from.z+(b.z-from.z)*contact.t;hit=true;
     if(contact.npc)killPerson(s,contact.npc,b);
     else if(target){if(target!==s)target.alerted=true;target.hull-=b.owner==='player'?(b.damage||24):(b.damage||5)*100/(spec.hull*upgrades.hull);s.events.push({type:'hit',target:target===s?'player':target.id,x:b.x,z:b.z,y:b.y,dx:b.vx,dz:b.vz,fort:!!target.staticFort,enemy:target!==s});if(contact.gun)disableCannon(s,target,contact.gun);if(target!==s&&target.hull<=0){if(target.staticFort){s.gold+=400;s.events.push({type:'fort-silenced',id:target.id,x:target.x,z:target.z});}else sinkEnemy(s,target);}}
     else{
      const building=contact.building,standing=building?.hull>0;
      if(standing){building.hull=Math.max(0,building.hull-(b.damage??5));evacuateTown(s,building);}
      s.events.push({type:standing?'building-hit':'ground-hit',target:building?.id,x:b.x,y:b.y,z:b.z,dx:b.vx,dz:b.vz});if(!standing)groundImpact(s,b);
      if(standing&&building.hull===0)collapseBuilding(s,building);
      else if(standing&&building.flammable&&!(building.fireRemaining>0)){
       const r=seeded(9271+(s.buildingImpactSequence++)*733+building.islandSeed*173+Math.floor(s.time*100));
       if(r()<.35||building.hull<building.maxHull*.60){building.fireRemaining=28+r()*12;s.events.push({type:'building-ignited',target:building.id,name:building.name});}
      }
     }
    }
    if(!hit&&b.life>0&&b.y>waveHeight(b.x,b.z,s.seaTime??s.time)-.2)alive.push(b);else if(!hit)s.events.push({type:'splash',x:b.x,z:b.z});
  }s.projectiles=alive;
  updateEvacuation(s,dt);
  if(s.hull<=0){s.hull=0;s.status='lost';s.events.push({type:'lost'});}else if(s.cargo>=5&&s.sunk>=2&&nearPort(s)){s.status='won';s.gold+=1000;s.events.push({type:'won'});}
}

export function buyUpgrade(s,id){return purchaseUpgrade(s,id,!!nearestHarbor(s));}
export function buyCannonRefit(s){return nearestHarbor(s)?.kind==='black-market'&&!s.cannonRefit?buyUpgrade(s,'powder'):false;}
export function devAction(s,action,id){
 if(s.status!=='playing')return false;
 if(action==='gold')s.gold+=1000;
 else if(action==='repair'){s.hull=100;s.disabledGuns=new Set();s.events.push({type:'repair'});}
 else if(action==='upgrade')return grantUpgrade(s,id);
 else if(action==='max'){for(const key of Object.keys(UPGRADES))while(grantUpgrade(s,key)){};}
 else if(action==='reset'){s.upgrades={};s.cannonRefit=false;}
 else if(action==='evacuate'){const port=nearestHarbor(s)||PORT,b=s.buildings.filter(b=>b.islandSeed===port.seed&&b.hull>0).sort((a,b)=>distance(a,s)-distance(b,s))[0];if(!b)return false;s.started=true;evacuateTown(s,b);}
 else if(action==='abandon'){const e=s.enemies.filter(e=>e.hull>0&&!e.abandoned).sort((a,b)=>distance(a,s)-distance(b,s))[0];if(!e)return false;e.hull=Math.min(e.hull,e.maxHull*.25);s.started=true;if(!abandonShip(s,e,{force:true}))return false;}
 else if(action==='harbor'){const port=ISLANDS.find(i=>i.port&&i.seed===Number(id));if(!port)return false;Object.assign(s,harborApproach(port),{speed:0,vx:0,vz:0,angularVelocity:0,throttle:0,target:null});}
 else return false;
 return true;
}

function fireFort(s,fort){
 const random=seeded(Math.floor(s.time*100)+fort.islandSeed*19),stations=[];
 for(const sx of [-1,1])for(const sz of [-1,1]){const x=fort.x+sx*8.2,z=fort.z+sz*6.9;if((s.x-fort.x)*sx+(s.z-fort.z)*sz>0)stations.push({x,z});}
 stations.forEach((p,index)=>s.salvos.push({owner:fort.id,gun:index,fixedX:p.x,fixedZ:p.z,fixedAngle:headingTo(p,s),muzzleY:7.1,damage:3.5,fireAt:s.time+.05+index*.22+random()*.12,seed:Math.floor(random()*1e8)}));fort.cooldown=9.5;
}

