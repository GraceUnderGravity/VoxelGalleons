import * as THREE from './vendor/three.module.js';
import {seeded,waveHeight} from './simulation.js';
const white=new THREE.Color('#ffffff');

// Physical timber, iron and masonry fragments, batched into one draw call.
export class BattleDebris{
 constructor(scene){this.items=[];this.rings=[];this.max=900;this.dummy=new THREE.Object3D();this.color=new THREE.Color();this.mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({roughness:1}),this.max);this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.count=0;this.mesh.castShadow=true;scene.add(this.mesh);this.scene=scene;}
 burst(point,{stone=false,count=22,direction=null,power=1}={}){
  for(let i=0;i<count&&this.items.length<this.max;i++){
   const a=Math.random()*Math.PI*2,v=(1.7+Math.random()*5)*power,plank=!stone&&i%4!==0;
   this.items.push({x:point.x,y:Math.max(.3,point.y),z:point.z,vx:Math.cos(a)*v+(direction?.x||0)*1.8,vy:2.5+Math.random()*5.5,vz:Math.sin(a)*v+(direction?.z||0)*1.8,sx:plank?.09+Math.random()*.12:.13+Math.random()*.30,sy:plank?.45+Math.random()*1.25:.15+Math.random()*.35,sz:plank?.08+Math.random()*.11:.12+Math.random()*.24,rx:Math.random()*6,ry:Math.random()*6,rz:Math.random()*6,spinX:(Math.random()-.5)*9,spinZ:(Math.random()-.5)*8,life:stone?3.5+Math.random()*2:8+Math.random()*6,max:14,stone,afloat:false,color:stone?(i%2?'#8c8b77':'#b7b197'):i%4===0?'#384139':i%3===0?'#d0ad72':i%2?'#967044':'#6e5030'});
  }
 }
 ring(x,z,size=4){const m=new THREE.Mesh(new THREE.RingGeometry(.975,1,128),new THREE.MeshBasicMaterial({color:'#d0e1c6',transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.06,z);this.scene.add(m);this.rings.push({mesh:m,x,z,size,age:0});}
 update(dt,time){
  let count=0;for(let i=this.items.length-1;i>=0;i--){const p=this.items[i];p.life-=dt;if(p.life<=0){this.items.splice(i,1);continue;}const water=waveHeight(p.x,p.z,time)-.10;
   if(!p.afloat){p.vy-=9.4*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.rx+=p.spinX*dt;p.rz+=p.spinZ*dt;if(p.y<water){p.afloat=true;p.vx*=.12;p.vz*=.12;p.rx=Math.PI/2;p.rz*=.1;if(p.stone)p.life=Math.min(p.life,.75);}}
   else{p.x+=p.vx*dt;p.z+=p.vz*dt;p.vx*=Math.exp(-dt*.3);p.vz*=Math.exp(-dt*.3);p.y=p.stone?water-(.75-p.life)*2:water+.035+Math.sin(time*1.5+p.x)*.025;p.rx=Math.PI/2+Math.sin(time+p.z)*.08;}
   this.dummy.position.set(p.x,p.y,p.z);this.dummy.rotation.set(p.rx,p.ry,p.rz);const fade=Math.min(1,p.life/1.5);this.dummy.scale.set(p.sx*fade,p.sy*fade,p.sz*fade);this.dummy.updateMatrix();this.mesh.setMatrixAt(count,this.dummy.matrix);this.mesh.setColorAt(count++,this.color.set(p.color));
  }this.mesh.count=count;this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;
  for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.age+=dt;r.mesh.position.y=waveHeight(r.x,r.z,time)+.02;r.mesh.scale.setScalar(r.size+r.age*2.5);r.mesh.material.opacity=Math.max(0,.16*(1-r.age/5));if(r.age>5){this.scene.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose();this.rings.splice(i,1);}}
 }
 clear(){this.items.length=0;this.mesh.count=0;for(const r of this.rings){this.scene.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose();}this.rings.length=0;}
}

export class DamageModel{
 constructor(model,{fort=false,width=6,length=24,deck=3.7,mainMastZ=.1}={}){
  this.model=model;this.fort=fort;this.width=width;this.length=length;this.deck=deck;this.mainMastZ=mainMastZ;this.parts=[];this.changed=new Set();this.hiddenObjects=[];this.stage=0;this.ratio=1;this.death=-1;this.brokenMast=null;this.effects=null;
  model.updateWorldMatrix(true,true);const inverse=model.matrixWorld.clone().invert(),matrix=new THREE.Matrix4(),size=new THREE.Vector3(),rotation=new THREE.Quaternion();
  const root=fort?model.userData.damageRoot:model;
  root.traverse(mesh=>{if(!mesh.isInstancedMesh)return;const relative=inverse.clone().multiply(mesh.matrixWorld);for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const local=relative.clone().multiply(matrix),center=new THREE.Vector3();local.decompose(center,rotation,size);this.parts.push({mesh,index:i,matrix:matrix.clone(),local,center,volume:Math.abs(size.x*size.y*size.z),hidden:false});}});
 }
 reset(){for(const p of this.changed){p.mesh.setMatrixAt(p.index,p.matrix);p.mesh.setColorAt(p.index,white);p.mesh.instanceMatrix.needsUpdate=true;if(p.mesh.instanceColor)p.mesh.instanceColor.needsUpdate=true;p.hidden=false;}this.changed.clear();for(const m of this.hiddenObjects)m.visible=true;this.hiddenObjects.length=0;if(this.brokenMast){this.model.remove(this.brokenMast);this.brokenMast=null;}this.model.visible=true;this.model.userData.cloth?.setDamage(0);this.model.userData.flags?.forEach(f=>f.visible=true);this.stage=0;this.ratio=1;this.death=-1;this.model.userData.sinking=0;}
 hide(p){if(p.hidden)return;p.hidden=true;this.changed.add(p);p.mesh.setMatrixAt(p.index,new THREE.Matrix4().makeScale(0,0,0));p.mesh.instanceMatrix.needsUpdate=true;}
 localImpact(point,radius=1.1){
  const nearby=this.parts.filter(p=>!p.hidden&&p.volume<(this.fort?8:3.8)&&p.center.distanceTo(point)<radius).sort((a,b)=>a.center.distanceTo(point)-b.center.distanceTo(point));
  for(const [i,p]of nearby.entries()){if(i<(this.fort?16:28)&&p.center.distanceTo(point)<radius*.80)this.hide(p);else{this.changed.add(p);p.mesh.setColorAt(p.index,new THREE.Color('#61594a'));p.mesh.instanceColor.needsUpdate=true;}}
 }
 impact(worldPoint,effects,direction){this.effects=effects;this.model.updateWorldMatrix(true,true);const local=this.model.worldToLocal(worldPoint.clone());this.localImpact(local,this.fort?1.8:1.25);effects.burst(worldPoint,{stone:this.fort,count:this.fort?30:24,direction});}
 sync(ratio){
  ratio=Math.max(0,Math.min(1,ratio));if(ratio>=.999&&this.ratio<.999)this.reset();this.ratio=ratio;this.model.userData.cloth?.setDamage((1-ratio)*.92);
  const stage=ratio<.22?3:ratio<.47?2:ratio<.76?1:0;
  while(this.stage<stage){this.stage++;const r=seeded(173+this.stage*93);for(let i=0;i<(this.fort?5:3);i++){const side=i%2?1:-1;this.localImpact(new THREE.Vector3(side*(this.fort?7.3:this.width/2),this.fort?4+r()*2.7:this.deck-.35,(r()-.5)*(this.fort?12:this.length*.73)),this.fort?1.5:1.0);}}
 }
 breakMast(){
  if(this.fort||this.brokenMast)return;
  const pivot=new THREE.Vector3(0,this.deck+.55,this.mainMastZ),group=new THREE.Group(),translate=new THREE.Matrix4().makeTranslation(-pivot.x,-pivot.y,-pivot.z);group.position.copy(pivot);
  const selected=this.parts.filter(p=>!p.hidden&&p.center.y>this.deck+2.8&&Math.abs(p.center.z-this.mainMastZ)<2.25),batches=new Map();
  for(const p of selected){if(!batches.has(p.mesh))batches.set(p.mesh,[]);batches.get(p.mesh).push(p);}
  for(const [source,parts]of batches){const m=new THREE.InstancedMesh(source.geometry,source.material,parts.length);parts.forEach((p,i)=>{m.setMatrixAt(i,translate.clone().multiply(p.local));this.hide(p);});m.castShadow=true;m.receiveShadow=true;group.add(m);}
  this.model.updateWorldMatrix(true,true);const inverse=this.model.matrixWorld.clone().invert(),objects=[];
  this.model.traverse(m=>{if(!m.isMesh||m.isInstancedMesh||!m.visible)return;m.geometry.computeBoundingBox();const relative=inverse.clone().multiply(m.matrixWorld),center=m.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(relative);if(center.y>this.deck+3&&Math.abs(center.z-this.mainMastZ)<2.6)objects.push({m,relative});});
  for(const {m,relative}of objects){const copy=m.clone();copy.customDepthMaterial=m.customDepthMaterial;copy.matrixAutoUpdate=false;copy.matrix.copy(translate.clone().multiply(relative));group.add(copy);m.visible=false;this.hiddenObjects.push(m);}
  this.model.add(group);this.brokenMast=group;
 }
 destroy(effects,velocity={}){
  if(this.death>=0)return;this.effects=effects;this.death=0;this.vx=velocity.vx||0;this.vz=velocity.vz||0;this.model.userData.sinking=.001;const position=this.model.localToWorld(new THREE.Vector3(0,this.fort?6:this.deck,0));effects.burst(position,{stone:this.fort,count:this.fort?70:42,power:1.35});
  if(this.fort){for(const p of this.parts){const remainingHeight=4.2+1.35*Math.sin(p.center.x*.71+p.center.z*.8)+.48*Math.cos(p.center.z*1.4);if(p.center.y>remainingHeight&&p.volume<8)this.hide(p);}this.model.userData.flags?.forEach(f=>f.visible=false);}
  else effects.ring(position.x,position.z,this.width*.8);
 }
 update(dt,time){
  if(this.death<0||this.fort)return;
  const previous=this.death;this.death+=dt;const t=this.death;
  if(previous<1.7&&t>=1.7){this.breakMast();const point=this.model.localToWorld(new THREE.Vector3(0,this.deck+6,this.mainMastZ));this.effects.burst(point,{count:27,power:.7});}
  if(previous<4.6&&t>=4.6){this.effects.ring(this.model.position.x,this.model.position.z,this.width*1.1);this.effects.burst(this.model.localToWorld(new THREE.Vector3(0,1,0)),{count:22,power:.5});}
  const drift=(1-Math.exp(-t*.5))*2;this.model.position.x+=this.vx*drift;this.model.position.z+=this.vz*drift;this.model.position.y-=Math.pow(Math.max(0,t-.7),1.7)*.45;
  this.model.rotation.z+=Math.min(1.12,t*t*.018);this.model.rotation.x+=Math.min(.32,t*.025);
  if(this.brokenMast){const fall=Math.max(0,Math.min(1,(t-1.7)/2.7));this.brokenMast.rotation.z=-fall*1.43;this.brokenMast.rotation.x=fall*.22;}
  this.model.visible=t<11;this.model.userData.sinking=t;
 }
}
