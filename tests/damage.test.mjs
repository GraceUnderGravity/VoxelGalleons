import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {Voxels} from '../dist/models.js';
import {DamageModel,BattleDebris} from '../dist/battle-damage.js';
import {createState,step} from '../dist/simulation.js';

function hull(){const v=new Voxels();for(let j=0;j<10;j++)for(let i=0;i<9;i++)v.box(3,1+j*.3,-1.2+i*.3,.25,.28,.28,'#b48a50');v.box(0,9,0,.25,8,.25,'#927041');const g=v.build();g.userData.flags=[];return g;}
test('a rotated ship loses geometry at the world impact and repairs restore it exactly',()=>{
 const ship=hull();ship.position.set(30,0,-15);ship.rotation.y=.7;const damage=new DamageModel(ship),scene=new THREE.Scene(),fx=new BattleDebris(scene);scene.add(ship);ship.updateMatrixWorld(true);
 const impact=ship.localToWorld(new THREE.Vector3(3,2.5,0));damage.impact(impact,fx,new THREE.Vector3(1,0,0));assert.ok(damage.parts.some(p=>p.hidden));assert.ok(fx.items.length>0);assert.ok(fx.items.every(p=>p.x===impact.x&&p.z===impact.z));
 damage.reset();const actual=new THREE.Matrix4();for(const p of damage.parts){p.mesh.getMatrixAt(p.index,actual);assert.deepEqual(actual.elements,p.matrix.elements);assert.equal(p.hidden,false);}
});
test('destruction lists the hull, breaks its mast, sinks fully, and can reset',()=>{
 const ship=hull(),scene=new THREE.Scene(),fx=new BattleDebris(scene),damage=new DamageModel(ship);scene.add(ship);damage.destroy(fx,{vx:2,vz:1});const fragments=fx.items.length;damage.destroy(fx);assert.equal(fx.items.length,fragments);
 for(let i=0;i<240;i++){ship.position.set(0,0,0);ship.rotation.set(0,0,0);damage.update(1/60,i/60);}assert.ok(damage.brokenMast);assert.ok(ship.rotation.z>.1);assert.ok(ship.position.y<-2);
 for(let i=0;i<480;i++){ship.position.set(0,0,0);ship.rotation.set(0,0,0);damage.update(1/60,i/60);}assert.equal(ship.visible,false);damage.reset();assert.equal(ship.visible,true);assert.equal(damage.brokenMast,null);assert.ok(damage.parts.every(p=>!p.hidden));
});
test('wooden wreckage settles on waves and eventually clears',()=>{const fx=new BattleDebris(new THREE.Scene());fx.burst(new THREE.Vector3(0,2,0));for(let i=0;i<360;i++)fx.update(1/60,i/60);assert.ok(fx.items.some(p=>p.afloat&&!p.stone));for(let i=0;i<600;i++)fx.update(1/60,6+i/60);assert.equal(fx.items.length,0);});
test('impact events identify the damaged ship or fort and carry a 3D hit position',()=>{
 const s=createState();s.started=true;s.x=0;s.z=0;s.enemies=[];s.forts=[{id:'fort-test',x:24,z:0,hull:210,maxHull:210,cooldown:999,staticFort:true}];s.projectiles=[{x:16,z:0,y:6.2,vy:0,vx:23,vz:0,life:1,owner:'player',damage:24}];step(s,.016);const hit=s.events.find(e=>e.type==='hit');assert.equal(hit.target,'fort-test');assert.equal(hit.fort,true);assert.equal(hit.y,6.2);assert.equal(s.forts[0].hull,186);
});
test('a coastal fort emits destruction debris in world space after its island is moved',()=>{
 const island=new THREE.Group();island.position.set(100,0,-90);const fort=hull();fort.position.set(25,0,11);island.add(fort);fort.userData.damageRoot=fort;
 const damage=new DamageModel(fort,{fort:true}),fx=new BattleDebris(new THREE.Scene());damage.destroy(fx);
 assert.ok(fx.items.length>0);assert.ok(fx.items.every(p=>p.x===125&&p.z===-79));
});
