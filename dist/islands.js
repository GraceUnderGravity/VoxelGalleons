import * as THREE from './vendor/three.module.js';
import {Voxels} from './models.js';
import {seeded} from './simulation.js';
import {coastRadius,terrainHeight,shoreDistance,harborLocal,fortLocal,shoreAtX} from './geography.js';
import {createMastFlag} from './flags.js';
import {settlementBuildings,TOWN_ROADS,onTownRoad} from './settlements.js';
import {makeTownBuilding} from './town-models.js';

const trunkGeometry=new THREE.CylinderGeometry(.78,1,1,6),rockGeometry=new THREE.DodecahedronGeometry(1,0),barrelGeometry=new THREE.CylinderGeometry(.43,.4,1,10);
const leafGeometry=(()=>{const pos=[],indices=[];for(let i=0;i<=9;i++){const t=i/9,z=t*4.2,y=Math.sin(t*Math.PI)*.65-t*t*.8,w=Math.sin(t*Math.PI)*.40;pos.push(-w,y,z,0,y+.09,z,w,y,z);if(i<9){const a=i*3,b=a+3;indices.push(a,b,a+1,a+1,b,b+1,a+1,b+1,a+2,a+2,b+1,b+2);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();return g;})();
class Batches{
 constructor(){this.groups=new Map();}
 add(geometry,color,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){const key=geometry.uuid+color;if(!this.groups.has(key))this.groups.set(key,{geometry,color,items:[]});this.groups.get(key).items.push({x,y,z,sx,sy,sz,rx,ry,rz});}
 build(){const group=new THREE.Group(),o=new THREE.Object3D();for(const {geometry,color,items}of this.groups.values()){const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1,side:geometry===leafGeometry?THREE.DoubleSide:THREE.FrontSide}),items.length);items.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.scale.set(p.sx,p.sy,p.sz);o.rotation.set(p.rx,p.ry,p.rz);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}return group;}
}
export function makeIsland(island){
 const group=new THREE.Group(),random=seeded(845+island.seed*137),batches=new Batches(),buildingModels=[],gateModels=[];let props=new Voxels();
 const shore=harborLocal(island),origin=island.kind==='navy-fort'?fortLocal(island):{x:shore.x,z:shore.z-16};
 const color=new THREE.Color(),positions=[],colors=[],indices=[],segments=128,rings=52;
 for(let ring=0;ring<=rings;ring++)for(let i=0;i<=segments;i++){
   const angle=i/segments*Math.PI*2,radius=coastRadius(island,angle)*ring/rings*1.24,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,y=terrainHeight(island,x,z),depth=-shoreDistance(island,x,z);
   positions.push(x,y,z);
   if(depth<.8)color.set('#b8ae7c');else if(depth<3.7)color.set('#dfcd9a');else if(depth<5.1)color.set('#a8ab70');else if(y>island.peak*.78)color.set('#818571');else color.set(['#71854c','#7e9153','#879654','#697e48'][Math.min(3,Math.floor((Math.sin(x*.24)*Math.cos(z*.21)*.5+.5)*3.99))]);
   color.multiplyScalar(.985+random()*.03);colors.push(color.r,color.g,color.b);
   if(ring<rings&&i<segments){const a=ring*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,a+1,b+1,b);}
 }
 const terrainGeometry=new THREE.BufferGeometry();terrainGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));terrainGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeometry.setIndex(indices);terrainGeometry.computeVertexNormals();
 const terrain=new THREE.Mesh(terrainGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));terrain.castShadow=true;terrain.receiveShadow=true;group.add(terrain);
 const occupied=[];
 function ground(x,z){return terrainHeight(island,x+origin.x,z+origin.z);}
 function land(x,z){return terrainHeight(island,x,z);}
 function house(x,z,w=4.5,d=4,color='#d9cba8',roof='#a76546'){
   const y=ground(x,z),h=2.5;occupied.push({x,z,r:Math.max(w,d)*.8});
   props.box(x,y+.12,z,w+.45,.55,d+.45,'#b3aa87');
   // Separate blocks and hollow walls let round shot tear actual holes in a house.
   for(let row=0;row<5;row++){
    const nx=Math.ceil(w/.65),nz=Math.ceil(d/.65);
    for(const side of [-1,1]){
     for(let n=0;n<nx;n++)props.box(x-w/2+(n+.5)*w/nx,y+.55+row*.5,z+side*(d/2-.14),w/nx-.02,.48,.28,color);
     for(let n=0;n<nz;n++)props.box(x+side*(w/2-.14),y+.55+row*.5,z-d/2+(n+.5)*d/nz,.28,.48,d/nz-.02,color);
    }
   }
   for(const sx of [-1,1])props.box(x+sx*(w/2-.13),y+1.55,z+d/2+.03,.18,2.6,.16,'#776042');
   props.box(x,y+1.2,z+d/2+.08,.88,1.8,.16,'#62513b');props.box(x,y+.23,z+d/2+.5,1.6,.25,.85,'#bcb291');
   for(const sx of [-1,1]){const wx=x+sx*w*.3;props.box(wx,y+1.85,z+d/2+.05,.70,.81,.11,'#385348');props.box(wx,y+1.82,z+d/2+.13,.06,.8,.08,'#ccb98b');props.box(wx,y+1.8,z+d/2+.14,.75,.06,.09,'#ccb98b');}
   const slope=.45,panelWidth=(w/2+.42)/Math.cos(slope);
   for(const side of [-1,1])for(let row=0;row<4;row++)for(let tile=0;tile<Math.ceil((d+.8)/.65);tile++){
    const along=(row+.5)/4-.5,n=Math.ceil((d+.8)/.65);
    props.box(x+side*w/4+along*panelWidth*Math.cos(slope),y+h+.82-along*panelWidth*Math.sin(side*slope),z-(d+.8)/2+(tile+.5)*(d+.8)/n,panelWidth/4-.015,.18,(d+.8)/n-.02,roof,0,0,-side*slope);
   }
   for(let k=0;k<5;k++){const ww=w*(1-k/5);props.box(x,y+h+.33+k*.18,z+d/2-.06,ww,.19,.16,color);props.box(x,y+h+.33+k*.18,z-d/2+.06,ww,.19,.16,color);}
   props.box(x,y+h+1.34,z,.25,.19,d+.94,'#b67b52');
   for(let zt=z-d/2;zt<z+d/2+.5;zt+=.42)for(const side of [-1,1])props.box(x+side*w/4,y+h+.94,zt,panelWidth,.07,.085,'#b77b55',0,0,-side*slope);
   props.box(x-w*.27,y+h+1.6,z-d*.26,.55,1.3,.62,'#c7b995');
 }
 function building(data){
  const model=makeTownBuilding(data);model.position.set(data.localX,data.y,data.localZ);buildingModels.push(model);
  occupied.push({x:data.localX,z:data.localZ,r:Math.max(data.w,data.d)*.65});
 }
 function dock(x,start,end,width=3){
   for(let z=start;z<end;z+=.37)props.box(x,.68,z,width,.20,.34,z%1>.5?'#937448':'#a58451');
   for(let z=start+.5;z<end;z+=2.2)for(const side of [-1,1]){props.box(x+side*(width/2+.14),.14,z,.27,2.25,.29,'#695338');props.box(x+side*(width/2+.14),1.26,z,.36,.13,.37,'#9e7c47');}
   props.box(x,.34,(start+end)/2,.22,.35,end-start,'#635039');
 }
 function crate(x,z,y=ground(x,z)+.55){props.box(x,y,z,.95,.9,.9,'#a17b46');for(const a of [-.33,.33]){props.box(x+a,y,z,.09,.95,.95,'#705633');props.box(x,y+a,z+.47,1,.08,.06,'#6d5634');}}
 function palm(x,z,scale=1){
   const y=land(x,z),height=(4.8+random()*2.2)*scale,lean=(random()-.5)*.9,angle=random()*Math.PI*2;
   for(let i=0;i<9;i++){const t=i/9,bend=t*t*.95*scale;batches.add(trunkGeometry,i%2?'#9d8354':'#8d744b',x+Math.sin(angle)*bend,y+height*(t+.055),z+Math.cos(angle)*bend,.17*scale,height/9+.04,.17*scale,Math.cos(angle)*lean*.17,0,-Math.sin(angle)*lean*.17);}
   const tx=x+Math.sin(angle)*.95*scale,tz=z+Math.cos(angle)*.95*scale;
   for(let leaf=0;leaf<8;leaf++)batches.add(leafGeometry,leaf%2?'#46734b':'#5d844e',tx,y+height,tz,scale,scale,scale,0,angle+leaf*Math.PI/4,0);
   batches.add(rockGeometry,'#75643a',tx,y+height-.15,tz,.3,.25,.3);
 }
 function fort(){
   const y=2.3,stone='#a6a58e',cap='#c5bda0';occupied.push({x:0,z:0,r:12});
   props.box(0,y+.12,0,16,.45,13.5,'#aaa389');
   for(const side of [-1,1]){
     // Individual courses leave ragged masonry breaches when cannonballs strike.
     for(let row=0;row<6;row++){
       for(let n=0;n<15;n++){const z=-6.1+n*.87;props.box(side*7.3,y+.34+row*.65,z,1.4,.63,.85,row%2?stone:'#9a9b85');}
       for(let n=0;n<17;n++){const x=-7.02+n*.87;if(side===1&&Math.abs(x)<1.28&&row<4)continue;props.box(x,y+.34+row*.65,side*5.8,.85,.63,1.4,row%2?stone:'#9a9b85');}
     }
     for(let n=-6.2;n<=6.2;n+=.85)props.box(side*7.3,y+4.0,n,1.8,.32,.83,cap);
     for(let n=-7.2;n<=7.2;n+=.85)props.box(n,y+4.0,side*5.8,.83,.32,1.8,cap);
     for(let n=-6;n<=6;n+=1.4){props.box(n,y+4.5,side*5.8,.7,.65,1.4,cap);props.box(side*7.3,y+4.5,n,1.4,.65,.7,cap);}
   }
   for(const sx of [-1,1])for(const sz of [-1,1]){
     props.box(sx*7.3,y+1.95,sz*5.8,4.3,3.9,4.3,stone,0,Math.PI/4);props.box(sx*7.3,y+4.03,sz*5.8,4.6,.28,4.6,cap,0,Math.PI/4);
     for(let j=-1;j<=1;j++){props.box(sx*7.3+j*.85,y+4.48,sz*7.8,.55,.7,.7,cap);}
     props.box(sx*7.7,y+4.46,sz*6.1,1.1,.38,.85,'#785c37');props.box(sx*8.0,y+4.82,sz*6.5,.36,.38,1.65,'#394440',0,Math.atan2(sx,sz));
   }
   // Open a real doorway in the southern curtain wall, with inward swinging leaves.
   for(const side of [-1,1]){const door=new Voxels();for(let j=0;j<5;j++)door.box(-side*(j+.5)*1.20/5,1.26,0,.235,2.48,.18,j%2?'#66543a':'#786342');for(const yy of [.4,1.2,2.1])door.box(-side*.6,yy,-.12,1.18,.10,.065,'#414b45');const leaf=door.build();leaf.position.set(side*1.22,y,6.6);leaf.userData.side=side;gateModels.push(leaf);}
   props.box(-1.45,y+1.45,6.68,.4,2.9,.6,cap);props.box(1.45,y+1.45,6.68,.4,2.9,.6,cap);props.box(0,y+2.98,6.7,3.3,.6,.65,cap);
   for(let i=0;i<9;i++)props.box(-4.6,y+.3+i*.4,3.9-i*.48,1.5,.25,.51,'#b8b094');
   house(0,-2.2,6.1,3.8,'#cbbf9d','#965f43');
   props.box(0,y+3.5,-2.2,.17,6,.17,'#8d744b');const flag=createMastFlag({height:y+6,z:-2.2,navy:true,scale:1.3});group.add(flag);group.userData.flags=[flag];
   const edge=shoreAtX(island,origin.x)-origin.z;dock(0,edge-4,edge+12,3.2);
 }
 if(island.kind==='navy-fort')fort();
 else{
   const market=island.kind==='black-market';
   settlementBuildings(island).forEach(building);
   function path(ax,az,bx,bz,width=1.8){const n=Math.ceil(Math.hypot(bx-ax,bz-az)/.8);for(let i=0;i<=n;i++){const t=i/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t;if(shoreDistance(island,x+origin.x,z+origin.z)<-3)props.box(x,ground(x,z)+.035,z,width,.07,.95,'#b9aa7b');}}
   TOWN_ROADS.forEach(r=>path(r.ax,r.az,r.bx,r.bz,r.width));
   // A small public square connects the quay to the residential lanes.
   props.box(0,ground(0,2)+.06,2,5,.12,4.1,'#b9ac84');
   for(const side of [-1,1]){props.box(side*1.7,ground(side*1.7,2)+.46,2,.35,.9,2,'#93977e');props.box(side*1.7,ground(side*1.7,2)+.95,2,.5,.14,2.2,'#c1b691');}
   // Waterfront warehouse, market awnings, and a cooper's yard.

   const dockX=0,dockStart=12,dockEnd=30;dock(dockX,dockStart,dockEnd,3.4);dock(dockX+8,dockStart+2,dockEnd-5,2.6);props.box(4,.69,dockEnd-6,12,.22,2.8,'#947348');
   for(let j=0;j<6;j++){const x=dockX+(j%2?-.8:.7),z=dockStart+j*.95;crate(x,z,1.2);}
   for(let j=0;j<7;j++){const x=-8+random()*16,z=8+random()*4;if(shoreDistance(island,x,z)<-3)batches.add(barrelGeometry,'#8c7145',x+origin.x,ground(x,z)+.5,z+origin.z,1,1,1);}
   if(market){
     const y=ground(-5.5,-4);const flag=createMastFlag({height:y+7.4,z:-4,navy:false,scale:1.1});flag.position.x=-5.5;group.add(flag);group.userData.flags=[flag];
   }else if(island.kind==='pirate-port'){
     const flag=createMastFlag({height:ground(5.8,-16)+7.6,z:-16,navy:false,scale:1.1});flag.position.x=5.8;group.add(flag);group.userData.flags=[flag];
   }
   // Lamps and a derrick at the working quay.
   props.box(dockX+1.4,2.55,dockEnd-2,.19,4,.19,'#665339');props.box(dockX+.7,4.1,dockEnd-2,1.5,.17,.18,'#8a6e42');props.box(dockX+.15,3.68,dockEnd-2,.30,.5,.30,'#e1bc78');
   props.box(dockX-1.2,2.65,dockStart+2,.25,4,.25,'#745937');props.box(dockX-.15,4.1,dockStart+2,2.5,.24,.24,'#8b6a3d',0,0,-.18);
 }
 // Groves, low tropical canopy and limestone outcrops give the islands depth.
 const foliage=['#426b43','#4e7545','#5c7e49','#6a8950'];
 const attempts=Math.floor(island.r*island.r*.15);
 for(let i=0;i<attempts;i++){
   const angle=random()*Math.PI*2,d=Math.sqrt(random())*island.r*1.08,x=Math.cos(angle)*d,z=Math.sin(angle)*d;
   if(shoreDistance(island,x,z)>-5||occupied.some(o=>Math.hypot(x-o.x-origin.x,z-o.z-origin.z)<o.r+2)||onTownRoad(x-origin.x,z-origin.z))continue;
   const h=land(x,z),scale=.70+random()*.45;
   if(i%3===0&&h<island.peak*.78)palm(x,z,scale);
   else if(i%5===0&&h>island.peak*.60){const r=1.2+random()*2.3;batches.add(rockGeometry,'#92947a',x,h+r*.30,z,r,r*.65,r*.8,0,random()*6,0);}
   else {const r=1+random()*1.8;batches.add(trunkGeometry,'#796344',x,h+r*.5,z,.16,r,.16);for(let j=0;j<3;j++)batches.add(rockGeometry,foliage[(i+j)%4],x+(j-1)*r*.48,h+r*(1+j*.14),z+Math.sin(j*2)*r*.4,r*.9,r*.68,r*.9,0,random()*6,0);}
 }
 for(let i=0;i<90;i++){
   const angle=random()*Math.PI*2,d=coastRadius(island,angle)+random()*2-1,x=Math.cos(angle)*d,z=Math.sin(angle)*d;
   if(island.kind==='navy-fort'?z>origin.z&&Math.abs(x-origin.x)<6:z>island.r*.45&&Math.abs(x-shore.x)<22)continue;
   const scale=.6+random()*2.3;batches.add(rockGeometry,i%2?'#8c9585':'#a5aa94',x,land(x,z)+scale*.25,z,scale*1.3,scale*.8,scale,random()*.3,random()*Math.PI,random()*.3);
 }
 const structures=props.build(),town=new THREE.Group();town.add(structures,...buildingModels,...gateModels);town.position.set(origin.x,0,origin.z);town.userData.damageRoot=structures;group.userData.buildings=buildingModels;group.userData.gates=gateModels;
 town.userData.flags=group.userData.flags||[];for(const flag of town.userData.flags)town.add(flag);
 for(const model of buildingModels){const b=model.userData.building;model.userData.flags=(island.kind==='pirate-port'&&b.type==='manor'||island.kind==='black-market'&&b.type==='tavern')?town.userData.flags:[];}
 if(island.kind==='navy-fort')group.userData.fortModel=town;
 group.userData.damageRoot=structures;group.userData.labelOffset={x:origin.x,z:origin.z};group.add(town,batches.build());group.position.set(island.x,0,island.z);return group;
}
