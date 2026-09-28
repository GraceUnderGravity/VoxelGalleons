import {ISLANDS,harborLocal,shoreDistance,terrainHeight} from './geography.js';
import {TOWN_PLOTS} from './town-plots.js';

export const TOWN_ROADS=[{ax:0,az:-33,bx:0,bz:14,width:2.5},...[-22,-10,2].map(z=>({ax:-26,az:z,bx:26,bz:z,width:1.8})),...[-11,11].map(x=>({ax:x,az:-30,bx:x,bz:13,width:1.6}))];
export const townOrigin=island=>{const p=harborLocal(island);return{x:p.x,z:p.z-16};};
export function onTownRoad(x,z){return TOWN_ROADS.some(r=>x>=Math.min(r.ax,r.bx)-r.width/2&&x<=Math.max(r.ax,r.bx)+r.width/2&&z>=Math.min(r.az,r.bz)-r.width/2&&z<=Math.max(r.az,r.bz)+r.width/2);}
// A working quay, market square, civic centre and homes share one collision plan.
export function settlementBuildings(island){
 if(island.kind==='navy-fort')return [];
 const origin=townOrigin(island),market=island.kind==='black-market',buildings=[];
 let seed=845+island.seed*137;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function add(type,x,z,w,d,color,roof){
  if(shoreDistance(island,x+origin.x,z+origin.z)>-5)return;
  const y=terrainHeight(island,x+origin.x,z+origin.z),height=type==='chapel'?9.4:type==='stall'?3.1:['tavern','manor'].includes(type)?7.4:type==='warehouse'?6.4:5.4;
  const maxHull=type==='stall'?16:type==='chapel'?70:['warehouse','manor'].includes(type)?65:type==='tavern'?50:34;
  const names={house:'Cottage',warehouse:market?'Contraband store':'Cargo warehouse',tavern:market?'Smuggler’s tavern':'Waterfront tavern',chapel:'Parish church',manor:market?'Safe house':island.kind==='pirate-port'?'Council house':'Governor’s residence',chandlery:'Ship’s chandlery',shipwright:'Boatwright’s workshop',cooper:'Cooper’s workshop',customs:'Harbour office',stall:'Fish market'};
  const minGround=Math.min(...[-1,1].flatMap(sx=>[-1,1].map(sz=>terrainHeight(island,x+origin.x+sx*w/2,z+origin.z+sz*d/2))));
  buildings.push({id:`building-${island.seed}-${buildings.length}`,islandSeed:island.seed,type,
   name:names[type],localX:x,localZ:z,x:island.x+origin.x+x,z:island.z+origin.z+z,y,w,d,height,color,roof,maxHull,foundationDepth:Math.max(.45,y-minGround+.3),
   residents:type==='stall'?3:type==='warehouse'?4:type==='tavern'?7:type==='chapel'?5:4,
   flammable:['warehouse','chandlery','shipwright','cooper','tavern'].includes(type)||type==='house'&&buildings.length%3===1,
   minX:island.x+origin.x+x-w/2-.45,maxX:island.x+origin.x+x+w/2+.45,
   minZ:island.z+origin.z+z-d/2-.65,maxZ:island.z+origin.z+z+d/2+.65,minY:Math.min(y-.16,minGround),maxY:y+height});
 }
 for(const [role,x,z,w,d]of TOWN_PLOTS){const type=market&&role==='chapel'?'warehouse':role,colors=market?['#a28c68','#b29a75','#827e63']:['#ddd0ae','#c8c8ae','#c1cdb4','#d2b49a','#c5c4a9'];add(type,x,z,w,d,colors[Math.floor(random()*colors.length)],market?['#635e52','#7d6756'][Math.floor(random()*2)]:['#a66647','#936246','#aa7651'][Math.floor(random()*3)]);}
 return buildings;
}
export const BUILDINGS=ISLANDS.flatMap(settlementBuildings);

export function landHeightAt(x,z){
 for(const island of ISLANDS){const lx=x-island.x,lz=z-island.z;if(Math.abs(lx)>island.r*1.23||Math.abs(lz)>island.r*1.23)continue;if(shoreDistance(island,lx,lz)<0)return terrainHeight(island,lx,lz);}
 return -Infinity;
}

export function segmentBox(from,to,box){
 let enter=0,exit=1;
 for(const [axis,low,high]of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']]){
  const delta=to[axis]-from[axis];
  if(Math.abs(delta)<1e-9){if(from[axis]<box[low]||from[axis]>box[high])return null;continue;}
  let a=(box[low]-from[axis])/delta,b=(box[high]-from[axis])/delta;if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);exit=Math.min(exit,b);if(enter>exit)return null;
 }
 return enter;
}

export function firstLandHit(from,to,buildings){
 let closest=null;
 for(const building of buildings){
  // A destroyed building leaves a low rubble obstacle instead of an invisible wall.
  const box=building.hull>0?building:{...building,maxY:building.y+.65};
  const t=segmentBox(from,to,box);if(t!==null&&(!closest||t<closest.t))closest={t,building};
 }
 const length=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z),samples=Math.max(1,Math.ceil(length/.4));
 for(let i=0;i<=samples;i++){
  const t=i/samples;if(closest&&t>=closest.t)break;
  const x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t,z=from.z+(to.z-from.z)*t;
  if(y<=landHeightAt(x,z)){closest={t,building:null};break;}
 }
 return closest;
}
