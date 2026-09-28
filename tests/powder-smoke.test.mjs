import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {PowderSmoke,SMOKE_LIMITS,POWDER_WIND} from '../dist/powder-smoke.js';
import {seeded} from '../dist/simulation.js';
import {weatherAt} from '../dist/atmosphere.js';
import {seaState,setWeather} from '../dist/sea-state.js';
const make=()=>new PowderSmoke(new THREE.Scene(),{random:seeded(1715)});
const tick=(fx,seconds)=>{for(let i=0;i<seconds*60;i++)fx.update(1/60);};
const shot={x:20,y:3,z:40,dx:1,dz:0};

test('a cannon discharge makes a brief flash, directional exhaust and a persistent cloud',()=>{
 const fx=make();fx.fire(shot);assert.equal(fx.puffs.length,7);assert.equal(fx.haze.length,1);assert.ok(fx.embers.length>0);assert.ok(fx.lights.some(l=>l.intensity>0));
 tick(fx,.25);assert.ok(fx.puffs.slice(0,4).every(p=>p.x>21));tick(fx,1);assert.equal(fx.embers.length,0);assert.ok(fx.puffs.some(p=>p.alpha>.2));
 tick(fx,23);assert.ok(fx.haze.length>0);assert.ok(fx.haze.some(p=>p.alpha>.025));assert.ok(fx.lights.every(l=>l.intensity===0));
 tick(fx,30);assert.equal(fx.haze.length+fx.puffs.length+fx.embers.length,0);assert.equal(fx.smokeMesh.geometry.instanceCount,0);
});
test('nearby broadsides build density and the haze stays in world space while drifting with wind',()=>{
 const fx=make();fx.fire(shot);const first=fx.haze[0],startX=first.x,startZ=first.z;for(let i=0;i<14;i++)fx.fire({...shot,z:40+(i%7)*.6});
 assert.ok(fx.haze.length<4);assert.ok(first.dose>1);tick(fx,5);assert.ok(first.alpha>.2);assert.ok(Math.abs(first.x-startX-POWDER_WIND.x*5)<1e-6);assert.ok(Math.abs(first.z-startZ-POWDER_WIND.z*5)<1e-6);
 shot.x+=100;tick(fx,1);assert.ok(first.x<startX);shot.x-=100;
});
test('pausing freezes clouds and restart clears lights and both render batches',()=>{
 const fx=make();fx.fire(shot);tick(fx,2);const before=JSON.stringify([fx.puffs,fx.haze,fx.embers]);fx.update(0);assert.equal(JSON.stringify([fx.puffs,fx.haze,fx.embers]),before);
 fx.clear();assert.equal(fx.puffs.length+fx.haze.length+fx.embers.length,0);assert.equal(fx.smokeMesh.geometry.instanceCount,0);assert.equal(fx.fireMesh.geometry.instanceCount,0);assert.ok(fx.lights.every(l=>l.intensity===0));
});
test('sustained multi-ship cannon fire stays within fixed GPU and particle budgets',()=>{
 const fx=make();for(let i=0;i<600;i++)fx.fire({x:i*8,y:3,z:i%4*20,dx:1,dz:0});fx.update(.016);
 assert.ok(fx.puffs.length<=SMOKE_LIMITS.puffs);assert.ok(fx.haze.length<=SMOKE_LIMITS.haze);assert.ok(fx.embers.length<=SMOKE_LIMITS.embers);assert.equal(fx.smokeMesh.geometry.instanceCount,fx.puffs.length+fx.haze.length);
 tick(fx,50);assert.equal(fx.haze.length+fx.puffs.length+fx.embers.length,0);
});
test('solid shot impacts create dust without another muzzle flash',()=>{const fx=make();fx.impact({x:1,y:4,z:2},{stone:true});assert.ok(fx.puffs.length>0);assert.equal(fx.embers.length,0);assert.equal(fx.haze.length,0);});
test('older smoke stretches into thin wind-aligned wisps instead of dense compact clumps',()=>{
 const fx=make();fx.fire(shot);tick(fx,2);const p=fx.puffs[6],width=p.sx,alpha=p.alpha;tick(fx,6);
 assert.ok(p.sx>width*2);assert.ok(p.alpha<alpha*.5);assert.ok(p.sx/p.sy>1.8);assert.equal(p.dx,fx.wind.x);assert.equal(p.dz,fx.wind.z);
});
test('live wind carries muzzle smoke and haze, and a wind reversal bends existing clouds',()=>{
 const calm=make(),windy=make();calm.wind={x:0,z:0};windy.wind={x:-4,z:4};calm.fire(shot);windy.fire(shot);tick(calm,4);tick(windy,4);
 assert.ok(windy.puffs[0].x<calm.puffs[0].x-10);assert.ok(windy.puffs[0].z>calm.puffs[0].z+10);
 assert.ok(windy.haze[0].x<calm.haze[0].x-15);assert.ok(windy.puffs[0].sx>calm.puffs[0].sx);
 const x=windy.haze[0].x;windy.wind={x:4,z:-4};tick(windy,2);assert.ok(windy.haze[0].x>x+7.9);assert.ok(windy.puffs[0].vx>0);
 windy.burn({x:0,y:4,z:0});assert.equal(windy.puffs.at(-1).vx,4);assert.equal(windy.puffs.at(-1).vz,-4);
});
test('weather wind has the HUD north-easterly direction and stronger gusts transport smoke faster',()=>{
 const saved={...seaState};try{setWeather({wind:0});assert.equal(Math.abs(weatherAt(10).windX),0);setWeather({wind:.6});const calm=weatherAt(10);setWeather({wind:3});const strong=weatherAt(10);assert.ok(strong.windX<0&&strong.windZ>0);assert.equal(strong.windX,-strong.windZ);assert.ok(Math.abs(strong.windX/calm.windX-5)<1e-8);}finally{setWeather(saved);}
});
