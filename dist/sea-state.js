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
export function wavePose(ship,spec,time){
 const f={x:Math.sin(ship.angle),z:-Math.cos(ship.angle)},r={x:Math.cos(ship.angle),z:Math.sin(ship.angle)},l=spec.length*.32,w=spec.width*.65;
 const h=(x,z)=>surfaceHeight(x,z,time),bow=h(ship.x+f.x*l,ship.z+f.z*l),stern=h(ship.x-f.x*l,ship.z-f.z*l),port=h(ship.x-r.x*w,ship.z-r.z*w),starboard=h(ship.x+r.x*w,ship.z+r.z*w);
 return {y:(h(ship.x,ship.z)*.5+(bow+stern)*.25)*.88,pitch:Math.max(-.20,Math.min(.20,(bow-stern)/(l*2))),roll:Math.max(-.24,Math.min(.24,(starboard-port)/(w*2)))};
}
