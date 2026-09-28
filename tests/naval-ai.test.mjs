import test from 'node:test';
import assert from 'node:assert/strict';
import {navalHelm,broadsideClear} from '../dist/naval-ai.js';
import {SHIP_CLASSES} from '../dist/ship-classes.js';
import {createState,step,fireBroadside,changeShipClass} from '../dist/simulation.js';
import {toggleColours,recognizesPirate} from '../dist/colours.js';

const ship=(extra={})=>({id:0,shipClass:'galleon',x:0,z:70,angle:0,hull:180,vx:0,vz:-4,speed:4,homeX:0,homeZ:70,...extra});
function advance(e,target,dt=.05){const h=navalHelm(e,target,[e,target],[],0),mass=SHIP_CLASSES[e.shipClass].mass;e.angularVelocity=(e.angularVelocity||0)+(h.turn-(e.angularVelocity||0))*Math.min(1,dt*1.25/Math.sqrt(mass));e.angle+=e.angularVelocity*dt;e.speed+=(h.speed-e.speed)*dt*(h.evade?1.1:.65)/mass;e.vx+=(Math.sin(e.angle)*e.speed-e.vx)*dt*1.6/mass;e.vz+=(-Math.cos(e.angle)*e.speed-e.vz)*dt*1.6/mass;e.x+=e.vx*dt;e.z+=e.vz*dt;return h;}
test('a bow-on approach turns early, stays apart and obtains a clear broadside for every class',()=>{
 for(const shipClass of Object.keys(SHIP_CLASSES)){
  const e=ship({shipClass}),target=ship({id:'player',z:0,vz:0,speed:0});let minimum=Infinity,opportunities=0;
  for(let i=0;i<2400;i++){advance(e,target);minimum=Math.min(minimum,Math.hypot(e.x,e.z));if(broadsideClear(e,target,[e,target],[]))opportunities++;}
  assert.ok(minimum>27,`${shipClass} minimum separation ${minimum}`);assert.ok(opportunities>150,`${shipClass} has ${opportunities} firing opportunities`);
 }
});
test('closing bows cause early braking and a turn while both hulls still have clearance',()=>{
 const e=ship({z:60,vz:-7,speed:7}),target=ship({id:'player',z:0,angle:Math.PI,vz:6,speed:6});const h=navalHelm(e,target,[e,target],[],0);assert.equal(h.mode,'give-way');assert.ok(h.speed<2.1);assert.ok(Math.abs(h.turn)>.1);
});
test('ships maneuver into gun range alongside a moving target without crossing its hull',()=>{
 const target=ship({id:'player',z:0,vz:-3,speed:3}),e=ship({x:35,z:60});let shots=0,closest=1000;
 for(let i=0;i<2000;i++){target.z-=.15;advance(e,target);closest=Math.min(closest,Math.hypot(e.x-target.x,e.z-target.z));if(broadsideClear(e,target,[e,target],[]))shots++;}
 assert.ok(closest>28,`closest ${closest}`);assert.ok(shots>100,`shots ${shots}`);
});
test('broadside guns wait for bearing, distance and a clear line past friendly ships and land',()=>{
 const e=ship({x:0,z:0}),t=ship({id:'player',x:40,z:0});assert.equal(broadsideClear(e,t,[e,t],[]),true);
 assert.equal(broadsideClear(e,{...t,x:0,z:-40},[e],[]),false);
 assert.equal(broadsideClear(e,{...t,x:70},[e],[]),false);
 assert.equal(broadsideClear(e,t,[e,t,ship({id:2,x:20,z:0})],[]),false);
 assert.equal(broadsideClear(e,t,[e,t],[{x:20,z:0,r:10,seed:3}]),false);
});
test('an unaware navy patrol ignores a false ensign, and revealing colours gives one surprise window',()=>{
 const s=createState();s.x=0;s.z=0;s.time=20;s.enemies=[ship({x:37,z:0,vz:0,speed:0,cooldown:0})];s.forts=[];
 toggleColours(s);assert.equal(s.colours,'navy');assert.equal(recognizesPirate(s,s.enemies[0]),false);s.started=true;
 for(let i=0;i<20;i++)step(s,.05);assert.equal(s.salvos.length,0);assert.equal(s.events.some(e=>e.type==='order'),false);
 toggleColours(s);const e=s.enemies[0],surprise=e.surprisedUntil;assert.equal(s.colours,'pirate');assert.equal(e.alerted,true);assert.ok(surprise>s.time+3);
 toggleColours(s);assert.equal(recognizesPirate(s,e),true);toggleColours(s);assert.equal(e.surprisedUntil,surprise);
});
test('firing reveals the ship before any gun discharges; changing ship keeps flags and witnesses',()=>{
 const s=createState();s.x=0;s.z=0;s.enemies=[ship({x:40,z:0,cooldown:0})];s.forts=[];toggleColours(s);fireBroadside(s);assert.equal(s.colours,'pirate');assert.equal(s.projectiles.length,0);assert.equal(s.enemies[0].alerted,true);assert.equal(s.enemies[0].surprisedUntil,3.5);
 toggleColours(s);changeShipClass(s,'sloop');assert.equal(s.colours,'navy');assert.equal(s.enemies[0].alerted,true);
});
test('far away witnesses do not learn your identity through the whole world',()=>{
 const s=createState();s.x=0;s.z=0;s.enemies=[ship({z:180})];s.forts=[];toggleColours(s);toggleColours(s);assert.equal(s.enemies[0].alerted,undefined);
});
test('live simulation trades naval broadsides without deliberate ramming',()=>{
 const s=createState();Object.assign(s,{x:0,z:0,started:true,time:13});s.forts=[];s.enemies=[ship({x:60,z:0,angle:-Math.PI/2,vx:-3,vz:0,cooldown:0,homeX:60,homeZ:0})];let cannons=0,collisions=0;
 for(let i=0;i<1800;i++){step(s,.05);cannons+=s.events.filter(e=>e.type==='cannon'&&e.enemy).length;collisions+=s.events.filter(e=>e.collision).length;s.hull=100;s.events=[];}
 assert.ok(cannons>=28,`enemy fired ${cannons} guns`);assert.equal(collisions,0);
});
test('forts respect a false ensign but remember hostile acts',()=>{
 const s=createState();s.x=0;s.z=0;s.forts=[{id:'test',x:40,z:0,hull:100,cooldown:0}];s.enemies=[];toggleColours(s);assert.equal(recognizesPirate(s,s.forts[0]),false);fireBroadside(s);assert.equal(s.forts[0].alerted,true);toggleColours(s);assert.equal(recognizesPirate(s,s.forts[0]),true);
});
