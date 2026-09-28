import {ISLANDS,coastRadius} from './geography.js';
export const WEATHER_PRESETS={calm:{waves:.15,wind:.6,rain:0},squall:{waves:1.35,wind:1.4,rain:.55},tempest:{waves:3,wind:2.8,rain:1}};
export const seaState={...WEATHER_PRESETS.squall};
export function setWeather(values){for(const key of ['waves','wind','rain'])if(Number.isFinite(Number(values[key])))seaState[key]=Math.max(0,Math.min(key==='rain'?1:3,Number(values[key])));}
export function waveScale(){return .32+seaState.waves*1.6;}
export function waveShelter(x,z){let shore=1000;for(const i of ISLANDS){const dx=x-i.x,dz=z-i.z;shore=Math.min(shore,Math.hypot(dx,dz)-coastRadius(i,Math.atan2(dz,dx)));}const t=Math.max(0,Math.min(1,(shore-1)/23));return .15+.85*t*t*(3-2*t);}
// An irregular spectrum shares its exact coefficients between buoyancy and GLSL.
// No single wave dominates the whole view, even at chart zoom.
const spectrum=[
 [.116,.051,.160,.68,.4],[-.069,.173,.135,.81,2.1],[.223,.094,.110,.95,4.7],
 [-.153,.251,.090,1.07,1.2],[.387,.127,.073,1.20,3.6],[.103,.513,.050,1.39,5.3],
 [-.531,.403,.033,1.58,2.8],[.751,.337,.020,1.81,.8],[-.413,.941,.012,2.09,4.2]
];
export const maximumWaveAmplitude=spectrum.reduce((sum,w)=>sum+w[2],0);
export function surfaceHeight(x,z,t){
 let height=0;for(const [kx,kz,a,speed,phase] of spectrum)height+=a*Math.sin(x*kx+z*kz-t*speed+phase);
 return height*waveScale()*waveShelter(x,z);
}
const float=n=>Number(n).toFixed(4);
export const waveGLSL=`
 float oceanHeight(vec2 p,float t){return ${spectrum.map(([x,z,a,speed,phase])=>`${float(a)}*sin(p.x*${float(x)}+p.y*${float(z)}-t*${float(speed)}+${float(phase)})`).join('+')};}
 vec2 oceanSlope(vec2 p,float t){return ${spectrum.map(([x,z,a,speed,phase])=>`vec2(${float(x*a)},${float(z*a)})*cos(p.x*${float(x)}+p.y*${float(z)}-t*${float(speed)}+${float(phase)})`).join('+')};}
`;
export const shelterGLSL=`
 float oceanShelter(vec2 p){float shore=1000.;for(int i=0;i<6;i++){vec2 q=p-islands[i].xy;float a=atan(q.y,q.x),fi=float(i),coast=islands[i].z*(1.+.12*sin(a*3.+fi*1.37)+.065*sin(a*7.+fi*.61)+.027*sin(a*13.+fi*2.));shore=min(shore,length(q)-coast);}return .15+.85*smoothstep(1.,24.,shore);}
`;
const clamp=(value,limit)=>Math.max(-limit,Math.min(limit,value));

// Fit the water beneath the whole waterplane. A small crest cannot lift one
// corner of a heavy hull as if the ship were a floating crate.
export function hullWaveTarget(ship,spec,time){
 const fx=Math.sin(ship.angle),fz=-Math.cos(ship.angle),rx=Math.cos(ship.angle),rz=Math.sin(ship.angle);
 let weightSum=0,heightSum=0,pitchMoment=0,rollMoment=0,longMoment=0,beamMoment=0;
 for(const station of [-.43,-.23,0,.23,.43]){
  const along=station*spec.length,taper=1-Math.abs(station)*.85;
  for(const side of [-.42,0,.42]){
   const across=side*spec.width*taper,weight=taper*(side===0?1:.8);
   const height=surfaceHeight(ship.x+fx*along+rx*across,ship.z+fz*along+rz*across,time);
   weightSum+=weight;heightSum+=height*weight;
   pitchMoment+=height*along*weight;longMoment+=along*along*weight;
   rollMoment+=height*across*weight;beamMoment+=across*across*weight;
  }
 }
 const stability=Math.sqrt(spec.mass),meanHeight=heightSum/weightSum,underway=Math.min(1,Math.max(0,ship.speed||0)/spec.speed);
 const bowHeight=surfaceHeight(ship.x+fx*spec.length*.46,ship.z+fz*spec.length*.46,time);
 // Buoyancy builds under an advancing bow. The spring below delays the lift and
 // landing, so the hull shoulders through a crest instead of matching each bump.
 const bowLoad=Math.max(0,bowHeight-meanHeight)*underway;
 return {y:meanHeight+bowLoad*.10/stability,pitch:clamp((Math.atan(pitchMoment/longMoment)*.68+Math.atan(bowLoad/(spec.length*.46))*.24)/stability,.085/stability),roll:clamp(Math.atan(rollMoment/beamMoment)*.52/stability,.105/stability)};
}

const hullMotions=new WeakMap();
// Exact critically damped spring: gradual response without frame-rate-dependent
// bounce or resonance. Large hulls have slower angular responses and less heel.
function settle(position,velocity,target,frequency,dt){
 const offset=position-target,impulse=(velocity+frequency*offset)*dt,decay=Math.exp(-frequency*dt);
 return [target+(offset+impulse)*decay,(velocity-frequency*impulse)*decay];
}
export function wavePose(ship,spec,time){
 let motion=hullMotions.get(ship);
 const reset=!motion||motion.spec!==spec||time<motion.time||Math.hypot(ship.x-motion.x,ship.z-motion.z)>spec.length*2;
 if(!reset&&time===motion.time)return motion.pose;
 const target=hullWaveTarget(ship,spec,time);
 if(reset){
  motion={spec,time,x:ship.x,z:ship.z,pose:{y:target.y,pitch:0,roll:0},velocity:{y:0,pitch:0,roll:0}};
  hullMotions.set(ship,motion);return motion.pose;
 }
 const dt=Math.min(.1,Math.max(0,time-motion.time)),inertia=Math.pow(spec.mass,.28);
 for(const [axis,frequency] of [['y',2.8/inertia],['pitch',1.5/inertia],['roll',1.08/inertia]]){
  [motion.pose[axis],motion.velocity[axis]]=settle(motion.pose[axis],motion.velocity[axis],target[axis],frequency,dt);
 }
 motion.time=time;motion.x=ship.x;motion.z=ship.z;
 return motion.pose;
}
