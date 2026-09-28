import {TOWN_PLOTS} from './town-plots.js';
export const ISLANDS=[
 {x:-90,z:-70,r:46,name:'NASSAU',kind:'pirate-port',port:true,repairCost:100,seed:0,peak:13},
 {x:78,z:-100,r:43,name:'FORT CROWN',kind:'navy-fort',seed:1,peak:19},
 {x:125,z:104,r:64,name:'CROOKED HARBOUR',kind:'settlement',port:true,repairCost:100,seed:2,peak:24},
 {x:-145,z:130,r:54,name:'SMUGGLER’S COVE',kind:'black-market',port:true,repairCost:75,seed:3,peak:21},
 {x:0,z:-225,r:57,name:'SALT KEY',kind:'settlement',port:true,repairCost:100,seed:4,peak:16},
 {x:232,z:-90,r:46,name:'EASTWATCH',kind:'navy-fort',seed:5,peak:23}
];
export const PORT=ISLANDS[0];
export function coastRadius(island,angle){const i=island.seed;return island.r*(1+.12*Math.sin(angle*3+i*1.37)+.065*Math.sin(angle*7+i*.61)+.027*Math.sin(angle*13+i*2));}
export function shoreDistance(island,x,z){return Math.hypot(x,z)-coastRadius(island,Math.atan2(z,x));}
export function shoreAtX(island,x){let z=island.r;for(let i=0;i<8;i++)z-=shoreDistance(island,x,z);return z;}
export function harborLocal(island){const x=island.kind==='black-market'?-island.r*.22:island.r*.08;return{x,z:shoreAtX(island,x)};}
export function harborApproach(island){const p=harborLocal(island);return{x:island.x+p.x,z:island.z+p.z+24};}
export function fortLocal(island){return{x:island.r*.66,z:island.r*.25};}
export function fortPosition(island){const p=fortLocal(island);return{x:island.x+p.x,z:island.z+p.z};}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function rawTerrainHeight(island,x,z){
 const d=shoreDistance(island,x,z),depth=-d;
 if(d>0)return -.30-d*.24;
 if(depth<4)return -.30+depth*.18;
 const r=island.r,seed=island.seed;
 let h=.42+(1-Math.exp(-(depth-4)/5))*(2.25+Math.sin(x*.16+seed)*.48+Math.cos(z*.19)*.36);
 // Broad inland ridges leave a low southern waterfront for towns and beaches.
 const hill=Math.exp(-((x+r*.17)**2/(r*.39)**2+(z+r*.25)**2/(r*.34)**2));
 const ridge=Math.exp(-((x-r*.32)**2/(r*.25)**2+(z+r*.30)**2/(r*.51)**2));
 h+=(island.peak||15)*(hill*.9+ridge*.57)*smooth((depth-6)/14);
 if(island.kind==='navy-fort'){const p=fortLocal(island),blend=1-smooth((Math.hypot(x-p.x,z-p.z)-10)/6);h=h*(1-blend)+2.3*blend;}
 return h;
}
const terraces=new WeakMap();
export function terrainHeight(island,x,z){
 const base=rawTerrainHeight(island,x,z);if(island.kind==='navy-fort'||shoreDistance(island,x,z)>-3)return base;
 if(!terraces.has(island)){const shore=harborLocal(island);terraces.set(island,TOWN_PLOTS.map(([,px,pz,w,d])=>({x:px+shore.x,z:pz+shore.z-16,w,d})).filter(p=>shoreDistance(island,p.x,p.z)<-5).map(p=>({...p,y:rawTerrainHeight(island,p.x,p.z)})));}
 for(const p of terraces.get(island)){const edge=Math.max(Math.abs(x-p.x)-p.w/2,Math.abs(z-p.z)-p.d/2);if(edge<1.8){const blend=1-smooth((edge-.6)/1.2);return base*(1-blend)+p.y*blend;}}
 return base;
}
