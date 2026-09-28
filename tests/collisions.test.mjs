import test from 'node:test';
import assert from 'node:assert/strict';
import {hullContact,resolveShipContacts,resolveShoreContact,hullPolygon} from '../dist/collisions.js';
import {ISLANDS,shoreDistance,coastRadius} from '../dist/geography.js';
import {SHIP_CLASSES} from '../dist/ship-classes.js';
import {createState,step,fireBroadside} from '../dist/simulation.js';
const boat=(id,x,z,angle=0,vx=0,vz=0)=>({id,shipClass:'galleon',x,z,angle,vx,vz,speed:Math.hypot(vx,vz),hull:180});
test('hulls separate at every heading, including stationary ships already overlapping',()=>{
 for(let i=0;i<24;i++){const a=boat(0,0,0),b=boat(1,2,3,i*Math.PI/12);assert.ok(hullContact(a,b));resolveShipContacts([a,b]);assert.equal(hullContact(a,b),null,`heading ${i}`);}
});
test('bow-to-bow collision stops forward motion without merging',()=>{
 const a=boat(0,0,10,0,0,-9),b=boat(1,0,-10,Math.PI,0,7);const impacts=resolveShipContacts([a,b]);assert.equal(hullContact(a,b),null);assert.ok(impacts[0].speed>15);assert.ok(a.vz>-2);assert.ok(b.vz<1);
});
test('glancing impacts deflect hulls and heavier ships move less',()=>{
 const a=boat(0,0,0,0,0,-7),b=boat(1,4,-5,Math.PI/2,-5,0);b.shipClass='sloop';const impacts=resolveShipContacts([a,b]);assert.ok(impacts.length);assert.equal(hullContact(a,b),null);assert.ok(Math.abs(a.angularVelocity)+Math.abs(b.angularVelocity)>.001);assert.ok(Math.hypot(a.x,a.z)<Math.hypot(b.x-4,b.z+5));
});
test('a cluster of four hulls separates without residual overlaps',()=>{
 const ships=[boat(0,0,0),boat(1,3,1,.5),boat(2,-3,1,-.5),boat(3,1,8,1.2)];resolveShipContacts(ships);for(let i=0;i<ships.length;i++)for(let j=i+1;j<ships.length;j++)assert.equal(hullContact(ships[i],ships[j]),null,`${i}/${j}`);
});
test('a crash damages both ships once and separation continues during cooldown',()=>{
 const s=createState();s.started=true;s.x=0;s.z=10;s.angle=0;s.vz=-9;s.speed=9;s.throttle=3;s.forts=[];const e=boat(0,0,-10,Math.PI,0,7);Object.assign(e,{cooldown:999,homeX:0,homeZ:-10,maxHull:180});s.enemies=[e];step(s,.016);assert.ok(s.hull<100&&s.hull>85);assert.ok(e.hull<180&&e.hull>155);assert.equal(hullContact(s,e),null);assert.equal(s.events.filter(e=>e.collision).length,2);const before=s.hull;s.x=e.x;s.z=e.z;step(s,.016);assert.equal(hullContact(s,e),null);assert.equal(s.hull,before);
});
test('navy ships use class hull strengths and a full same-class broadside cannot erase one',()=>{
 const s=createState();for(const e of s.enemies)assert.equal(e.hull,SHIP_CLASSES[e.shipClass].hull);
 for(const id of Object.keys(SHIP_CLASSES)){const c=SHIP_CLASSES[id],state=createState(id);fireBroadside(state);const volley=state.salvos.reduce((sum,g)=>sum+g.damage,0);assert.ok(volley<=c.hull*.5,`${id}: ${volley} / ${c.hull}`);}
});

test('bows and sterns stop at the actual shoreline instead of extending onto land',()=>{for(const island of ISLANDS)for(let i=0;i<12;i++){const a=i*Math.PI/6,ship=boat(0,island.x+Math.cos(a)*coastRadius(island,a),island.z+Math.sin(a)*coastRadius(island,a),a);assert.equal(resolveShoreContact(ship,island),true);for(const p of hullPolygon(ship))assert.ok(shoreDistance(island,p.x-island.x,p.z-island.z)>.2);}});
