import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createState,step} from '../dist/simulation.js';
import {ISLANDS,terrainHeight} from '../dist/geography.js';
import {townOrigin} from '../dist/settlements.js';
import {personHeight,groundImpact,killPerson,abandonShip,rowerPosition,updateEvacuation,hitPeople} from '../dist/evacuation.js';
import {TownLife} from '../dist/town-life.js';import {GroundScars} from '../dist/ground-scars.js';

function fixture(){const s=createState(),i=ISLANDS[0],o=townOrigin(i);s.enemies=[];s.forts=[];s.started=true;s.collected=new Set(Array.from({length:9},(_,i)=>i));const p={id:1,islandSeed:i.seed,x:i.x+o.x,z:i.z+o.z+2,angle:0,age:3,safeAge:0,delay:0,phase:0,speed:0,path:[],index:0};s.civilians=[p];return{s,p};}
test('a swept cannonball kills an exposed person and the fallen voxel body clears later',()=>{
 const {s,p}=fixture(),y=personHeight(p)+1;s.projectiles=[{x:p.x-1,y,z:p.z,vx:35,vz:0,vy:0,life:2,owner:'player',damage:2.8}];step(s,.05);assert.equal(p.dead,true);assert.equal(s.projectiles.length,0);assert.equal(s.events.filter(e=>e.type==='npc-hit').length,1);
 const x=p.x,z=p.z;for(let n=0;n<10;n++)updateEvacuation(s,.05);assert.equal(p.x,x);assert.equal(p.z,z);const life=new TownLife(new THREE.Scene());life.update(s,.05,2);assert.ok(life.people.count);assert.equal(killPerson(s,{person:p},{x,y,z}),false);for(let n=0;n<260;n++)updateEvacuation(s,.05);life.update(s,.05,3);assert.equal(s.civilians.length,0);assert.equal(life.people.count,0);
});
test('a wall intercepts round shot before a civilian behind it',()=>{
 const {s,p}=fixture(),b=s.buildings.find(b=>b.type==='warehouse');p.x=b.x;p.z=b.minZ-1;s.projectiles=[{x:b.x,y:b.y+1,z:b.maxZ+.1,vx:0,vz:-100,vy:0,life:2,owner:'player',damage:3}];step(s,.05);assert.ok(!p.dead);assert.ok(s.events.some(e=>e.type==='building-hit'));assert.ok(!s.events.some(e=>e.type==='npc-hit'));
});
test('ground impacts leave bounded terrain marks, kill only nearby exposed people and alarm survivors',()=>{
 const {s,p}=fixture(),i=ISLANDS[0],y=terrainHeight(i,p.x-i.x,p.z-i.z),survivor={...p,id:2,x:p.x+4,path:[{x:p.x+4,z:p.z}],checkDanger:9};s.civilians.push(survivor);
 s.projectiles=[{x:p.x+.65,z:p.z,y:y+.3,vx:0,vz:0,vy:-12,life:1,owner:'player',damage:3}];step(s,.05);assert.ok(s.events.some(e=>e.type==='ground-hit'));assert.ok(p.dead);assert.ok(!survivor.dead);assert.ok(s.groundThreats.length);assert.ok(s.civilians.length>2,'nearby buildings evacuate after a ground strike');
 const marks=new GroundScars(new THREE.Scene());for(let j=0;j<100;j++)marks.impact({x:p.x,y,z:p.z});assert.equal(marks.marks.length,80);const positions=marks.marks[0].geometry.attributes.position;for(let j=0;j<positions.count;j++)assert.ok(Math.abs(positions.getY(j)-terrainHeight(i,positions.getX(j)-i.x,positions.getZ(j)-i.z))<.08);marks.clear();assert.equal(marks.marks.length,0);
});
test('rowboat crew can be hit and only surviving rowers reach harbour',()=>{
 const s=createState(),e=s.enemies[0];e.hull=20;e.abandonRoll=0;abandonShip(s,e);const b=s.rowboats[0],p=rowerPosition(b,0,0),hit=hitPeople(s,{x:p.x-.6,y:p.y+.5,z:p.z},{x:p.x+.6,y:p.y+.5,z:p.z},0);assert.ok(hit?.npc.boat);killPerson(s,hit.npc,p);assert.equal(b.lostCrew.size,1);
 for(let j=0;j<10000&&s.rescuedCrew<3;j++)updateEvacuation(s,.05);assert.equal(s.rescuedCrew,3);assert.equal(s.events.filter(e=>e.type==='crew-landed')[0].count,3);
});
