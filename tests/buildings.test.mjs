import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {BUILDINGS,firstLandHit,landHeightAt} from '../dist/settlements.js';
import {createState,step} from '../dist/simulation.js';
import {ISLANDS} from '../dist/geography.js';
import {makeIsland} from '../dist/islands.js';
import {BuildingDamage} from '../dist/building-damage.js';
import {BattleDebris} from '../dist/battle-damage.js';

const fresh=()=>{const s=createState();Object.assign(s,{x:0,z:0,started:true});s.enemies=[];s.forts=[];return s;};
const round=(s,b,{owner='player',damage=5,y=b.y+1.5}={})=>{s.projectiles.push({x:b.x,z:b.maxZ+.1,y,vx:0,vz:-30,vy:0,life:2,damage,owner});step(s,.05);};

test('town geometry and simulation share each building location and bounds',()=>{
 const island=makeIsland(ISLANDS[2]);island.updateMatrixWorld(true);
 const list=BUILDINGS.filter(b=>b.islandSeed===ISLANDS[2].seed);assert.equal(island.userData.buildings.length,list.length);
 for(const model of island.userData.buildings){
  const b=list.find(b=>b.id===model.userData.building.id),p=model.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(p.x-b.x)<1e-6&&Math.abs(p.y-b.y)<1e-6&&Math.abs(p.z-b.z)<1e-6);
  const box=new THREE.Box3().setFromObject(model);assert.ok(box.min.x>=b.minX-.01&&box.max.x<=b.maxX+.01);assert.ok(box.max.y<=b.maxY+.01);
 }
 assert.ok(BUILDINGS.some(b=>b.flammable)&&BUILDINGS.some(b=>!b.flammable));
});

test('round shot damages only the first building, creates exact impact events, and collapses once',()=>{
 const s=fresh(),b=s.buildings.find(b=>b.type==='house'&&!b.flammable);
 const otherHealth=s.buildings.filter(x=>x!==b).map(b=>b.hull);round(s,b);
 assert.equal(b.hull,b.maxHull-5);assert.equal(s.projectiles.length,0);
 const hit=s.events.find(e=>e.type==='building-hit');assert.equal(hit.target,b.id);assert.ok(Math.abs(hit.z-b.maxZ)<1e-8);
 assert.deepEqual(s.buildings.filter(x=>x!==b).map(b=>b.hull),otherHealth);
 for(let i=0;i<12;i++)round(s,b);
 assert.equal(b.hull,0);assert.equal(s.events.filter(e=>e.type==='building-destroyed').length,1);assert.equal(s.gold,0);assert.equal(s.sunk,0);
 assert.ok(createState().buildings.every(b=>b.hull===b.maxHull&&b.fireRemaining===0));
});

test('both factions hit buildings, shots above roofs pass, and ruins only block low shots',()=>{
 const s=fresh(),b=s.buildings.find(b=>b.type==='house'&&!b.flammable);round(s,b,{owner:0});assert.equal(b.hull,b.maxHull-5);
 const from={x:b.x,y:b.maxY+2,z:b.maxZ+3},to={...from,z:b.minZ-3};assert.equal(firstLandHit(from,to,[b]),null);
 b.hull=0;assert.equal(firstLandHit({x:b.x,z:b.maxZ+.01,y:b.y+2},{x:b.x,z:b.minZ-.01,y:b.y+2},[b]),null);
 const low=firstLandHit({x:b.x,y:b.y+.5,z:b.maxZ+.01},{x:b.x,y:b.y+.5,z:b.minZ},[b]);assert.equal(low.building.id,b.id);
});

test('island terrain stops cannonballs before they can tunnel through the hillside',()=>{
 const i=ISLANDS[0],from={x:i.x,y:1,z:i.z+25},to={x:i.x,y:1,z:i.z-25},hit=firstLandHit(from,to,[]);assert.ok(hit&&hit.building===null);
 const s=fresh();s.projectiles=[{...from,vx:0,vz:-30,vy:0,life:2,owner:'player',damage:5}];step(s,.05);assert.equal(s.projectiles.length,0);assert.ok(s.events.some(e=>e.type==='ground-hit'));
});

test('walls break locally, roof tiles collapse into persistent ruins, and restart restores every piece',()=>{
 const island=makeIsland(ISLANDS[2]),model=island.userData.buildings.find(m=>m.userData.building.type==='house'),b=model.userData.building;
 const damage=new BuildingDamage(model),fx=new BattleDebris(new THREE.Scene());
 damage.impact(new THREE.Vector3(b.x,b.y+1.5,b.z+b.d/2),fx,new THREE.Vector3(0,0,-1));assert.ok(damage.parts.some(p=>p.hidden));assert.ok(fx.items.some(p=>p.stone)&&fx.items.some(p=>!p.stone));
 const roof=damage.parts.find(p=>p.center.y>3.5&&!p.hidden),matrix=new THREE.Matrix4();damage.destroy(fx);const count=fx.items.length;damage.destroy(fx);assert.equal(fx.items.length,count);
 damage.update(.4);roof.mesh.getMatrixAt(roof.index,matrix);assert.ok(matrix.elements[13]<=roof.center.y);
 for(let i=0;i<240;i++)damage.update(1/60);roof.mesh.getMatrixAt(roof.index,matrix);assert.ok(matrix.elements[13]<1);assert.equal(model.visible,true);
 const ruin=[...matrix.elements];damage.update(10);roof.mesh.getMatrixAt(roof.index,matrix);assert.deepEqual(matrix.elements,ruin);
 damage.reset();for(const p of damage.parts){p.mesh.getMatrixAt(p.index,matrix);assert.deepEqual(matrix.elements,p.matrix.elements);assert.equal(p.hidden,false);}
});

test('flammable stores sometimes ignite, fire damages over time and expires after collapse',()=>{
 let fires=0;
 for(let n=0;n<30;n++){const s=fresh();s.buildingImpactSequence=n;const b=s.buildings.find(b=>b.flammable);round(s,b);if(b.fireRemaining>0)fires++;}
 assert.ok(fires>0&&fires<30,'ignition should be a chance, not every hit');
 const sustained=fresh(),fuel=sustained.buildings.find(b=>b.flammable);round(sustained,fuel,{damage:fuel.maxHull*.42});assert.ok(fuel.fireRemaining>0,'sustained bombardment must ignite surviving fuel stores');
 const s=fresh(),b=s.buildings.find(b=>b.flammable);b.hull=5;b.fireRemaining=35;
 for(let i=0;i<1200;i++)step(s,1/60);
 assert.equal(b.hull,0);assert.equal(b.fireRemaining,0);assert.equal(s.events.filter(e=>e.type==='building-destroyed').length,1);
 const masonry=s.buildings.find(b=>!b.flammable);for(let n=0;n<4;n++)round(s,masonry,{damage:1});assert.equal(masonry.fireRemaining,0);
});

test('building debris lands on the island instead of falling through to sea level',()=>{
 const b=BUILDINGS.find(b=>b.type==='house'),fx=new BattleDebris(new THREE.Scene());fx.burst(new THREE.Vector3(b.x,b.y+2,b.z),{stone:true,count:20,power:.1});
 for(let i=0;i<120;i++)fx.update(1/60,i/60);assert.ok(fx.items.some(p=>p.grounded));
 for(const p of fx.items.filter(p=>p.grounded))assert.ok(p.y>=landHeightAt(p.x,p.z));
});
