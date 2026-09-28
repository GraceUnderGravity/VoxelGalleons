import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {seaState,setWeather,WEATHER_PRESETS,surfaceHeight,wavePose,waveScale} from '../dist/sea-state.js';
import {ShipWake} from '../dist/wake.js';import {SHIP_CLASSES} from '../dist/ship-classes.js';
import {createState,setSails,step} from '../dist/simulation.js';
import {BowWaves} from '../dist/bow-waves.js';

test('weather controls clamp values and tempest changes actual wave height and ship motion',()=>{
 const saved={...seaState};try{setWeather(WEATHER_PRESETS.calm);const calm=surfaceHeight(0,0,4);setWeather(WEATHER_PRESETS.tempest);const storm=surfaceHeight(0,0,4);assert.ok(Math.abs(storm)>Math.abs(calm)*5);const ship={x:0,z:0,angle:0};let maximumMotion=0;for(let i=0;i<1200;i++){const pose=wavePose(ship,SHIP_CLASSES.galleon,i/60);maximumMotion=Math.max(maximumMotion,Math.abs(pose.pitch)+Math.abs(pose.roll));}assert.ok(maximumMotion>.01&&maximumMotion<.09);setWeather({waves:50,rain:-2,wind:NaN});assert.equal(seaState.waves,3);assert.equal(seaState.rain,0);assert.equal(seaState.wind,2.8);}finally{setWeather(saved);}
});

test('large ships resist storm roll and turn slowly through each swell at every heading',()=>{
 const saved={...seaState};try{
  setWeather(WEATHER_PRESETS.tempest);
  const results={};
  for(const id of ['sloop','brig','frigate','galleon']){
   const spec=SHIP_CLASSES[id];let sum=0,count=0,peak=0,rate=0;
   for(const angle of [0,.6,1.2,1.8,2.4]){
    const ship={x:0,z:0,angle};let previous=0;
    for(let i=0;i<1800;i++){
     const pose=wavePose(ship,spec,i/60);
     if(i>180){sum+=pose.roll**2;count++;peak=Math.max(peak,Math.abs(pose.roll));rate=Math.max(rate,Math.abs(pose.roll-previous)*60);}
     previous=pose.roll;
    }
   }
   results[id]={rms:Math.sqrt(sum/count),peak,rate};
  }
  assert.ok(results.sloop.rms>results.brig.rms&&results.brig.rms>results.frigate.rms&&results.frigate.rms>results.galleon.rms);
  assert.ok(results.galleon.rms<results.sloop.rms*.45);
  assert.ok(results.galleon.peak<3*Math.PI/180,'galleon storm roll should stay below three degrees');
  assert.ok(results.galleon.rate<2.5*Math.PI/180,'galleon must not flick from side to side');
 }finally{setWeather(saved);}
});

test('a sudden squall does not snap hull attitude, and frame rates produce the same slow response',()=>{
 const saved={...seaState};try{
  setWeather(WEATHER_PRESETS.calm);const ship={x:0,z:0,angle:1.2};
  for(let i=0;i<=600;i++)wavePose(ship,SHIP_CLASSES.galleon,i/60);
  const before={...wavePose(ship,SHIP_CLASSES.galleon,10)};
  setWeather(WEATHER_PRESETS.tempest);const next=wavePose(ship,SHIP_CLASSES.galleon,10+1/60);
  assert.ok(Math.abs(next.roll-before.roll)<.0006&&Math.abs(next.pitch-before.pitch)<.0006);
  assert.ok(Math.abs(next.y-before.y)<.015);
  const run=hz=>{const body={x:0,z:0,angle:1.1};let pose;for(let i=0;i<=hz*30;i++){body.x=i/hz*2;pose=wavePose(body,SHIP_CLASSES.galleon,i/hz);}return{...pose};};
  const slow=run(30),fast=run(144);
  assert.ok(Math.abs(slow.roll-fast.roll)<.001&&Math.abs(slow.pitch-fast.pitch)<.001);
  assert.ok(Math.abs(slow.y-fast.y)<.025);
 }finally{setWeather(saved);}
});

test('changing hull or teleporting resets old angular motion without affecting another ship',()=>{
 const saved={...seaState};try{
  setWeather(WEATHER_PRESETS.tempest);const a={x:0,z:0,angle:0},b={x:0,z:0,angle:0};
  for(let i=0;i<600;i++)wavePose(a,SHIP_CLASSES.sloop,i/60);
  const fresh=wavePose(b,SHIP_CLASSES.galleon,10);assert.equal(fresh.roll,0);assert.equal(fresh.pitch,0);
  const changed=wavePose(a,SHIP_CLASSES.galleon,10);assert.equal(changed.roll,0);assert.equal(changed.pitch,0);
  for(let i=601;i<1200;i++)wavePose(a,SHIP_CLASSES.galleon,i/60);
  a.x=180;const moved=wavePose(a,SHIP_CLASSES.galleon,20);assert.equal(moved.roll,0);assert.equal(moved.pitch,0);
 }finally{setWeather(saved);}
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
test('bow spray comes from advancing into crests, stops at rest and remains bounded during a tempest',()=>{
 const saved={...seaState};try{
  setWeather(WEATHER_PRESETS.tempest);const spec=SHIP_CLASSES.galleon,ship={x:0,z:0,angle:0,vx:0,vz:-6,speed:6},spray=new BowWaves();let hits=0,last=-1;
  for(let i=0;i<1800;i++){const time=i/60;ship.z=-time*6;const event=spray.update(ship,spec,wavePose(ship,spec,time),time);if(event){hits++;assert.ok(event.strength>0&&event.strength<=2.2);assert.ok(time-last>=.11);last=time;}}
  assert.ok(hits>10&&hits<180);
  ship.vz=ship.speed=0;for(let i=1800;i<2100;i++){const time=i/60;assert.equal(spray.update(ship,spec,wavePose(ship,spec,time),time),null);}
 }finally{setWeather(saved);}
});
