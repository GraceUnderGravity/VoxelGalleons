import test from 'node:test';import assert from 'node:assert/strict';
import {aimCannon,GUN_ELEVATION,SHOT_GRAVITY} from '../dist/gunnery.js';
import {createState,fireBroadside,step} from '../dist/simulation.js';
import {SHIP_CLASSES} from '../dist/ship-classes.js';
import {wavePose} from '../dist/sea-state.js';

test('upper galleon guns depress to hit a low sloop instead of sailing over its hull',()=>{
 const s=createState();Object.assign(s,{x:0,z:0,angle:0,time:2});const target={id:8,shipClass:'sloop',x:30,z:0,angle:0,hull:70};s.enemies=[target];
 const muzzle={x:5,y:5,z:0,dx:1,dz:0,speed:23},aim=aimCannon(s,s,muzzle,()=>.5);assert.equal(aim.target,8);assert.ok(aim.vy<0);
 const t=(30-SHIP_CLASSES.sloop.width*.5-5)/23,impactY=5+aim.vy*t-.5*SHOT_GRAVITY*t*t,oldY=5+.72*t-.5*SHOT_GRAVITY*t*t,pose=wavePose(target,SHIP_CLASSES.sloop,2);
 assert.ok(impactY>pose.y+.1&&impactY<pose.y+2,'aimed shot reaches the wooden hull');assert.ok(oldY>pose.y+3.8,'old fixed elevation passed above the low ship');
});
test('both sides compensate for range within modest elevation limits and retain vertical scatter',()=>{
 const s=createState('sloop');Object.assign(s,{x:40,z:0,angle:0,time:2});const e={id:2,shipClass:'galleon',x:0,z:0,angle:0,hull:180},m={x:5,y:5,z:0,dx:1,dz:0,speed:23};
 assert.equal(aimCannon(s,e,m,()=>.5).target,'player');const low=aimCannon(s,e,m,()=>0),high=aimCannon(s,e,m,()=>1);assert.notEqual(low.vy,high.vy);
 for(const x of [9,15,30,55]){s.x=x;const shot=aimCannon(s,e,m,()=>.5);assert.ok(shot.elevation>=GUN_ELEVATION.min&&shot.elevation<=GUN_ELEVATION.max);}
 s.x=50;const far=aimCannon(s,e,{...m,y:1},()=>.5);assert.ok(far.vy>0,'longer range needs positive elevation against gravity');
});
test('ships outside a gun lane do not redirect manual shots at shore buildings',()=>{
 const s=createState();s.enemies=[{id:1,shipClass:'sloop',hull:70,x:25,z:40,angle:0}];const m={x:0,y:4,z:0,dx:1,dz:0,speed:23};assert.equal(aimCannon(s,s,m,()=>.5).target,null);s.enemies[0].x=-25;s.enemies[0].z=0;assert.equal(aimCannon(s,s,m,()=>.5).target,null);
});
test('live broadside shots use adjustable elevation without changing damage or the volley window',()=>{
 const s=createState();Object.assign(s,{x:0,z:0,angle:0,started:true});s.forts=[];s.enemies=[{id:0,shipClass:'sloop',x:30,z:0,angle:0,hull:70,maxHull:70,cooldown:999,homeX:30,homeZ:0,abandonRoll:1}];
 fireBroadside(s,'starboard');assert.equal(s.salvos.reduce((n,g)=>n+g.damage,0),69.99999999999997);
 for(let i=0;i<95;i++)step(s,1/60);const fired=s.events.filter(e=>e.type==='cannon'&&e.owner==='player');assert.equal(fired.length,25);assert.ok(fired.some(e=>e.elevation<-.04));assert.ok(fired.every(e=>e.elevation>=GUN_ELEVATION.min&&e.elevation<=GUN_ELEVATION.max));
});
