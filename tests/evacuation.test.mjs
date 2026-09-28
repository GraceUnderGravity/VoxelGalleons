import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {BUILDINGS,TOWN_ROADS} from '../dist/settlements.js';
import {ISLANDS,shoreDistance,terrainHeight} from '../dist/geography.js';
import {makeTownBuilding} from '../dist/town-models.js';
import {createState,step,fireBroadside,devAction} from '../dist/simulation.js';
import {ABANDON_CHANCE,crewResolve,evacuateTown,abandonShip,updateEvacuation,waterClear,rowboatRoute,landingFor,fortGatePoint,updateFortGates} from '../dist/evacuation.js';
import {TownLife,rowingStroke,makeLifeboat} from '../dist/town-life.js';

test('each town has distinct useful buildings, clear streets and level foundations',()=>{
 for(const island of ISLANDS.filter(i=>i.port)){
  const list=BUILDINGS.filter(b=>b.islandSeed===island.seed);assert.ok(new Set(list.map(b=>b.type)).size>=7);
  for(const b of list){
   for(const other of list.filter(o=>o.id>b.id))assert.ok(b.maxX<=other.minX||other.maxX<=b.minX||b.maxZ<=other.minZ||other.maxZ<=b.minZ,`${b.id} overlaps ${other.id}`);
   const box=new THREE.Box3().setFromObject(makeTownBuilding(b));assert.ok(box.max.y<=b.height+.01);assert.ok(box.max.x<=b.w/2+.45&&box.min.x>=-b.w/2-.45);
   for(const sx of [-1,1])for(const sz of [-1,1])assert.ok(Math.abs(terrainHeight(island,b.x-island.x+sx*b.w/2,b.z-island.z+sz*b.d/2)-b.y)<.001);
   for(const r of TOWN_ROADS)assert.ok(b.localX+b.w/2<Math.min(r.ax,r.bx)-r.width/2||b.localX-b.w/2>Math.max(r.ax,r.bx)+r.width/2||b.localZ+b.d/2<Math.min(r.az,r.bz)-r.width/2||b.localZ-b.d/2>Math.max(r.az,r.bz)+r.width/2);
  }
 }
});

test('a real building hit evacuates residents once along dry paths around solid buildings',()=>{
 const s=createState();s.started=true;s.enemies=[];s.forts=[];const b=s.buildings.find(b=>b.type==='warehouse'),island=ISLANDS.find(i=>i.seed===b.islandSeed);
 s.projectiles=[{x:b.x,z:b.maxZ+.1,y:b.y+1.5,vx:0,vz:-30,vy:0,life:2,damage:3,owner:'player'}];step(s,.05);assert.ok(s.civilians.length>=b.residents);const count=s.civilians.length;evacuateTown(s,b);assert.equal(s.civilians.length,count);
 for(const p of s.civilians){assert.ok(p.path.length>3);for(const q of p.path){assert.ok(shoreDistance(island,q.x-island.x,q.z-island.z)<-3);assert.ok(!s.buildings.some(o=>q.x>o.minX&&q.x<o.maxX&&q.z>o.minZ&&q.z<o.maxZ));}}
 const initial=s.civilians.map(p=>({x:p.x,z:p.z}));for(let i=0;i<100;i++)updateEvacuation(s,.05);assert.ok(s.civilians.some((p,i)=>Math.hypot(p.x-initial[i].x,p.z-initial[i].z)>4));
 const scene=new THREE.Scene(),life=new TownLife(scene);life.update(s,.016,1);assert.ok(life.people.count>0);for(let i=0;i<2400;i++)updateEvacuation(s,.05);life.update(s,.016,2);assert.ok(s.civilians.length>0);assert.ok(s.civilians.every(p=>p.journeys>0));assert.ok(new Set(s.civilians.map(p=>`${p.path.at(-1).x},${p.path.at(-1).z}`)).size>s.civilians.length*.7);assert.ok(life.people.count>0);life.clear();assert.equal(life.people.count,0);assert.equal(createState().civilians.length,0);
});

test('abandonment is rare, checked once below 28% hull, stops guns and scuttles once',()=>{
 let willing=0;for(let seed=0;seed<10000;seed++)if(crewResolve(seed,0)<ABANDON_CHANCE)willing++;assert.ok(willing>1000&&willing<1400);
 const s=createState(),e=s.enemies[0];s.forts=[];s.enemies=[e];s.started=true;e.abandonRoll=0;e.hull=e.maxHull*.5;assert.equal(abandonShip(s,e),false);e.cooldown=0;fireBroadside(s,'starboard',e);assert.ok(s.salvos.length);
 e.hull=e.maxHull*.25;assert.equal(abandonShip(s,e),true);const boats=s.rowboats.length;assert.equal(fireBroadside(s,'starboard',e),false);assert.ok(!s.salvos.some(g=>g.owner===e.id));assert.equal(abandonShip(s,e),false);assert.equal(s.rowboats.length,boats);
 for(let i=0;i<500;i++)step(s,.05);assert.equal(e.hull,0);assert.equal(s.events.filter(e=>e.type==='sunk').length,1);assert.equal(s.sunk,1);assert.equal(s.gold,300);
 const t=createState(),stubborn=t.enemies[0];stubborn.hull=20;stubborn.abandonRoll=.9;assert.equal(abandonShip(t,stubborn),false);stubborn.abandonRoll=0;assert.equal(abandonShip(t,stubborn),false);
});

test('occupied boats avoid islands, land survivors at an intact navy harbour and clear',()=>{
 const s=createState(),e=s.enemies[2];e.hull=30;e.abandonRoll=0;assert.equal(abandonShip(s,e),true);assert.equal(s.rowboats.length,2);
 for(const b of s.rowboats){assert.equal(b.crew,4);assert.equal(ISLANDS.find(i=>i.seed===b.portSeed).kind,'navy-fort');for(let j=1;j<b.path.length;j++){const a=b.path[j-1],c=b.path[j];for(let k=0;k<=10;k++)assert.ok(waterClear(a.x+(c.x-a.x)*k/10,a.z+(c.z-a.z)*k/10,1));}}
 const fx=new TownLife(new THREE.Scene());fx.update(s,.05,1);assert.equal(fx.boats.size,2);assert.ok(fx.people.count>=64);
 for(let i=0;i<12000&&s.rescuedCrew<8;i++)updateEvacuation(s,.05);assert.equal(s.rescuedCrew,8);assert.equal(s.events.filter(e=>e.type==='crew-landed').length,2);
 for(let i=0;i<1500;i++)updateEvacuation(s,.05);fx.update(s,.05,2);assert.equal(s.rowboats.length,0);assert.equal(fx.boats.size,0);fx.clear();
});

test('escape crews skip destroyed forts and dev previews use the same evacuation behavior',()=>{
 const s=createState();s.forts.forEach(f=>f.hull=0);assert.equal(devAction(s,'evacuate'),true);assert.ok(s.civilians.length);assert.equal(devAction(s,'abandon'),true);assert.ok(s.rowboats.length);assert.ok(s.rowboats.every(b=>ISLANDS.find(i=>i.seed===b.portSeed).kind==='settlement'));
 const port=ISLANDS[1],route=rowboatRoute({x:0,z:0},port);assert.ok(route);const end=route.at(-1),landing=landingFor(port);assert.equal(end.x,landing.x);assert.equal(end.z,landing.z);
});

test('rowers have inboard handles and synchronized drive, blade lift and feathered recovery',()=>{
 const boat=makeLifeboat();assert.equal(boat.userData.oars.length,4);
 for(const side of [-1,1]){const catchPose=rowingStroke(0,side),finish=rowingStroke(.579/.64,side),recovery=rowingStroke(.79/.64,side);assert.ok(catchPose.drive&&finish.drive);assert.ok(!recovery.drive);assert.ok(side*catchPose.yaw>side*finish.yaw);assert.ok(side*recovery.roll>side*catchPose.roll);assert.ok(recovery.feather<.01);assert.ok(catchPose.lean>finish.lean);}
 for(const {pivot,side}of boat.userData.oars){const shaft=pivot.children[0];assert.ok(shaft.position.x*side-shaft.scale.x/2<-.78,'the oar extends inboard to the rower’s hands');}
 const s=createState();s.enemies[0].hull=20;s.enemies[0].abandonRoll=0;abandonShip(s,s.enemies[0]);const life=new TownLife(new THREE.Scene());life.update(s,.05,1);assert.ok(life.people.count>=64);life.clear();
});

test('fort gates open for arriving people, stay clear during passage, and close afterward',()=>{
 const s=createState(),port=ISLANDS[1],fort=s.forts.find(f=>f.islandSeed===port.seed),gate=fortGatePoint(port),p={id:1,islandSeed:port.seed,x:gate.x,z:gate.z+5,delay:0};s.civilians=[p];
 for(let j=0;j<20;j++)updateFortGates(s,.05);assert.equal(fort.gateOpen,1);p.z=gate.z-1;for(let j=0;j<100;j++)updateFortGates(s,.05);assert.equal(fort.gateOpen,1);
 p.z=gate.z-5;for(let j=0;j<80;j++)updateFortGates(s,.05);assert.equal(fort.gateOpen,0);fort.hull=0;for(let j=0;j<20;j++)updateFortGates(s,.05);assert.equal(fort.gateOpen,1);
});

test('rescued navy crew disembark and walk through the gate into the courtyard',()=>{
 const s=createState(),port=ISLANDS[1],dock=landingFor(port),gate=fortGatePoint(port);s.rowboats=[{id:1,portSeed:port.seed,crew:4,x:dock.x,z:dock.z,angle:0,path:[dock],index:0,age:0,arrivalAge:0,arrived:false,speed:0}];
 for(let j=0;j<600;j++)updateEvacuation(s,.05);assert.equal(s.rescuedCrew,4);assert.equal(s.civilians.length,4);assert.ok(s.civilians.every(p=>p.inFort&&p.z<gate.z-2));assert.equal(s.forts.find(f=>f.islandSeed===port.seed).gateOpen,0);
});
