import * as THREE from './vendor/three.module.js';
import {DamageModel} from './battle-damage.js';
import {seeded} from './simulation.js';
import {landHeightAt} from './settlements.js';

export class BuildingDamage extends DamageModel{
 constructor(model){super(model);this.data=model.userData.building;this.falling=[];this.elapsed=-1;this.dummy=new THREE.Object3D();this.tint=new THREE.Color();}
 impact(point,effects,direction){
  this.model.updateWorldMatrix(true,true);this.localImpact(this.model.worldToLocal(point.clone()),1.25);
  effects.burst(point,{stone:true,count:15,direction,power:.7});effects.burst(point,{count:9,direction,power:.7});
 }
 sync(ratio){
  this.ratio=Math.max(0,Math.min(1,ratio));const stage=Math.floor((1-this.ratio)*3);
  if(stage>this.stage){this.stage=stage;for(const p of this.parts){if(p.hidden||p.center.y<.4)continue;this.changed.add(p);p.mesh.setColorAt(p.index,this.tint.setScalar(1-stage*.10));p.mesh.instanceColor.needsUpdate=true;}}
 }
 destroy(effects){
  if(this.elapsed>=0)return;this.elapsed=0;const r=seeded(this.data.islandSeed*719+this.parts.length);
  for(const p of this.parts){
   if(p.hidden||p.center.y<.38)continue;
   this.changed.add(p);const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),size=new THREE.Vector3();p.matrix.decompose(position,rotation,size);
   // Roof tiles fall as separate pieces; the perimeter settles into a low ruin.
   const target=new THREE.Vector3(position.x*.85+(r()-.5)*1.3,0,position.z*.85+(r()-.5)*1.3);
   target.y=Math.max(.04,landHeightAt(this.data.x+target.x,this.data.z+target.z)-this.data.y)+.12+r()*.34;
   const finalRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler((r()-.5)*1.3,r()*Math.PI,(r()-.5)*1.3));
   this.falling.push({p,position,rotation,size,target,finalRotation,delay:r()*.45,duration:.65+Math.sqrt(Math.max(0,position.y))*.45});
  }
  this.model.userData.flags?.forEach(flag=>flag.visible=false);
  const point=new THREE.Vector3(this.data.x,this.data.y+1.8,this.data.z);
  effects.burst(point,{stone:true,count:30,power:.8});effects.burst(point,{count:18,power:.8});
 }
 update(dt){
  if(this.elapsed<0||!this.falling.length)return;this.elapsed+=dt;
  for(const part of this.falling){
   const t=Math.max(0,Math.min(1,(this.elapsed-part.delay)/part.duration)),fall=t*t;
   this.dummy.position.lerpVectors(part.position,part.target,fall);
   this.dummy.quaternion.slerpQuaternions(part.rotation,part.finalRotation,fall);this.dummy.scale.copy(part.size);
   this.dummy.updateMatrix();part.p.mesh.setMatrixAt(part.p.index,this.dummy.matrix);part.p.mesh.instanceMatrix.needsUpdate=true;
   part.p.mesh.setColorAt(part.p.index,this.tint.setScalar(1-t*.30));part.p.mesh.instanceColor.needsUpdate=true;
  }
  if(this.elapsed>3.5)this.falling.length=0;
 }
 reset(){super.reset();this.falling.length=0;this.elapsed=-1;}
}
