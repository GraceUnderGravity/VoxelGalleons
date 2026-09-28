import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {seaState,setWeather,WEATHER_PRESETS,surfaceHeight,wavePose,waveScale} from '../dist/sea-state.js';
import {ShipWake} from '../dist/wake.js';import {SHIP_CLASSES} from '../dist/ship-classes.js';
import {createState,setSails,step} from '../dist/simulation.js';

test('weather controls clamp values and tempest changes actual wave height and ship motion',()=>{
 const saved={...seaState};try{setWeather(WEATHER_PRESETS.calm);const calm=surfaceHeight(0,0,4);setWeather(WEATHER_PRESETS.tempest);const storm=surfaceHeight(0,0,4);assert.ok(Math.abs(storm)>Math.abs(calm)*5);const pose=wavePose({x:0,z:0,angle:0},SHIP_CLASSES.galleon,4);assert.ok(Math.abs(pose.pitch)+Math.abs(pose.roll)>.04);assert.ok(Math.abs(pose.pitch)<=.2&&Math.abs(pose.roll)<=.24);setWeather({waves:50,rain:-2,wind:NaN});assert.equal(seaState.waves,3);assert.equal(seaState.rain,0);assert.equal(seaState.wind,2.8);}finally{setWeather(saved);}
});
test('the wake stays connected to the current stern and retains the full fade history at high speed',()=>{
 const wake=new ShipWake(new THREE.Scene()),spec=SHIP_CLASSES.sloop,ship={x:0,z:0,angle:0,vx:0,vz:-18,speed:18};let time=0;
 for(let i=0;i<1800;i++){time=i/60;ship.z=-time*18;wake.update(ship,spec,time);}
 assert.ok(wake.points.length<wake.capacity-2);assert.ok(time-wake.points.at(-1).birth>10.8);
 const pos=wake.mesh.geometry.attributes.position;assert.ok(Math.abs(pos.getZ(6)-(ship.z+spec.length*.45))<1e-4);assert.ok(wake.columns>=12);
 assert.equal(wake.uniforms.amplitude.value,waveScale());assert.equal(wake.uniforms.time.value,time);
 for(let j=0;j<=wake.columns;j++)assert.ok(Number.isFinite(pos.getX(j))&&Number.isFinite(pos.getZ(j)));
 ship.speed=ship.vz=0;wake.update(ship,spec,time+12);assert.equal(wake.mesh.geometry.drawRange.count,0);
});
test('teleporting does not stretch a wake across the chart',()=>{
 const wake=new ShipWake(new THREE.Scene()),ship={x:0,z:0,angle:0,speed:6,vz:-6};wake.update(ship,SHIP_CLASSES.brig,0);ship.z=-2;wake.update(ship,SHIP_CLASSES.brig,1);ship.x=200;wake.update(ship,SHIP_CLASSES.brig,2);assert.equal(wake.points.length,1);
});
test('galleon responds within one second and still coasts when sails are lowered',()=>{
 const s=createState();Object.assign(s,{x:0,z:0,angle:0,started:true,speed:7,vx:0,vz:-7});s.enemies=[];s.forts=[];setSails(s,3);
 for(let i=0;i<60;i++)step(s,1/60,{right:true});assert.ok(s.angle>.075);assert.ok(s.angle<.30);setSails(s,0);const before=s.speed;for(let i=0;i<300;i++)step(s,1/60);assert.ok(s.speed<before*.1);assert.ok(s.speed>0);
});
