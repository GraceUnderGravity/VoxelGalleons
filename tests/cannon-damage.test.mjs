import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createState,step,fireBroadside,disableCannon,repair,PORT} from '../dist/simulation.js';
import {SHIP_CLASSES,gunStations} from '../dist/ship-classes.js';import {wavePose} from '../dist/sea-state.js';
import {Voxels} from '../dist/models.js';import {DamageModel,BattleDebris} from '../dist/battle-damage.js';
import {harborApproach} from '../dist/geography.js';

test('a direct cannon hit disables the struck gun and cancels its pending discharge',()=>{
 const s=createState();Object.assign(s,{x:0,z:0,angle:0,started:true});s.enemies=[];s.forts=[];
 const g=gunStations('galleon')[5],pose=wavePose(s,SHIP_CLASSES.galleon,.016);fireBroadside(s,'starboard');assert.equal(s.salvos.length,25);
 s.projectiles=[{x:g.beam+.3,z:-g.along,y:pose.y+g.muzzleY,vx:-30,vz:0,vy:0,life:2,owner:0,damage:3}];step(s,.016);
 assert.ok(s.disabledGuns.has('1:5'));assert.ok(!s.salvos.some(g=>g.side===1&&g.gun===5));assert.ok(s.events.some(e=>e.type==='gun-disabled'));
 s.cooldown=0;s.salvos=[];fireBroadside(s,'starboard');assert.equal(s.salvos.length,24);s.cooldown=0;s.salvos=[];fireBroadside(s,'port');assert.equal(s.salvos.length,25);
});
test('an empty battery cannot fire and port repairs restore cannons even with a full hull',()=>{
 const s=createState();for(let i=0;i<25;i++)disableCannon(s,s,`1:${i}`);assert.equal(disableCannon(s,s,'1:0'),false);assert.equal(fireBroadside(s,'starboard'),false);
 Object.assign(s,harborApproach(PORT),{gold:100,hull:100});assert.equal(repair(s),true);assert.equal(s.disabledGuns.size,0);assert.equal(s.gold,0);assert.equal(fireBroadside(s,'starboard'),true);assert.equal(s.salvos.length,25);
});
test('destroyed supports detach an intact gun, which falls and clears on entering the sea',()=>{
 const v=new Voxels();v.tag='support:1:0';v.box(0,2,0,1.2,.2,.8,'#6b563e');v.tag='gun:1:0';v.box(0,2.5,0,1.2,.3,.3,'#343c39');v.tag=null;v.box(-.7,2,0,.5,.2,.8,'#776041');
 const model=v.build(),fx=new BattleDebris(new THREE.Scene()),damage=new DamageModel(model),gun=damage.guns.get('1:0');assert.equal(damage.unsupportedGuns().length,0);
 damage.hide(gun.supports[0]);assert.deepEqual(damage.unsupportedGuns(),['1:0']);damage.disableGun('1:0',fx);assert.equal(fx.fallenGuns.length,1);assert.ok(gun.parts.every(p=>p.hidden));
 damage.disableGun('1:0',fx);assert.equal(fx.fallenGuns.length,1);for(let i=0;i<300;i++)fx.update(1/60,i/60);assert.equal(fx.fallenGuns.length,0);
 damage.reset();assert.equal(damage.unsupportedGuns().length,0);assert.ok(damage.parts.every(p=>!p.hidden));
 for(const p of gun.anchors)damage.hide(p);assert.deepEqual(damage.unsupportedGuns(),['1:0'],'a surviving carriage plank must still connect to the deck');
});
