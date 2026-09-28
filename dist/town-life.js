import * as THREE from './vendor/three.module.js';
import {Voxels} from './models.js';
import {surfaceHeight} from './sea-state.js';
import {EVACUATION_LIMITS,personHeight} from './evacuation.js';

const cube=new THREE.BoxGeometry(1,1,1),wood=new THREE.MeshStandardMaterial({color:'#a68857',roughness:1});
export function rowingStroke(age,side=1){
 const phase=((age*.64)%1+1)%1,drive=phase<.58,t=drive?phase/.58:(phase-.58)/.42,ease=t*t*(3-2*t),lift=drive?0:Math.sin(t*Math.PI);
 return{drive,phase,sweep:drive?.58-1.16*ease:-.58+1.16*ease,yaw:side*(drive?.58-1.16*ease:-.58+1.16*ease),roll:side*(-.26+.42*lift),feather:Math.PI/2*(1-lift),lean:drive?.13-.29*ease:-.16+.29*ease};
}
export function makeLifeboat(){
 const v=new Voxels(),model=new THREE.Group();
 // Fine clinker planking, open thwarts, curved ends and a submerged keel.
 for(let j=-5;j<=5;j++){const z=j*.35,width=.80-Math.pow(Math.abs(j)/5,2)*.49;v.box(0,.01,z,width*2,.16,.37,'#68553b');for(const side of [-1,1])for(let row=0;row<3;row++)v.box(side*(width+row*.045),.13+row*.14,z,.14,.14,.38,row%2?'#ac8651':'#8e6c41');}
 v.box(0,-.14,0,.18,.22,3.9,'#63513a');for(const z of [-.90,.46,1.40])v.box(0,.36,z,1.55,.12,.30,'#b29059');v.box(0,.31,1.91,.7,.5,.14,'#8e6c41');v.box(0,.35,-1.93,.14,.64,.16,'#b99860');
 for(const side of [-1,1])for(let j=-5;j<=5;j++){const width=.80-Math.pow(Math.abs(j)/5,2)*.49;v.box(side*(width+.09),.54,j*.35,.19,.09,.36,'#c0a26b');}
 model.add(v.build());const oars=[];
 for(const side of [-1,1])for(const z of [-.68,.68]){const pivot=new THREE.Group();pivot.position.set(side*.88,.59,z);pivot.rotation.order='YXZ';const shaft=new THREE.Mesh(cube,wood);shaft.position.x=side*.58;shaft.scale.set(2.9,.055,.055);const blade=new THREE.Mesh(cube,wood);blade.position.x=side*2.05;blade.scale.set(.63,.07,.28);pivot.add(shaft,blade);model.add(pivot);oars.push({pivot,blade,side,z});}
 model.userData.oars=oars;model.userData.passengers=4;return model;
}
export class TownLife{
 constructor(scene){this.scene=scene;this.boats=new Map();this.matrix=new THREE.Object3D();this.color=new THREE.Color();this.count=0;this.time=0;const capacity=EVACUATION_LIMITS.people*12+EVACUATION_LIMITS.boats*4*20;
  this.people=new THREE.InstancedMesh(cube,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),capacity);this.people.name='Voxel townspeople and rowing crews';this.people.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.people.frustumCulled=false;this.people.castShadow=true;this.people.count=0;scene.add(this.people);
 }
 rower(model,oar,stroke,style){
  const {side,pivot,z}=oar,x=side*.35,seat=z-.22,y=.44,lean=stroke.lean,skin=['#c99c75','#9b694c','#deb78e','#775440'][style%4],shirt=style%2?'#9bada8':'#70898c';
  const add=(position,size,color,quaternion=new THREE.Quaternion())=>{this.matrix.position.copy(position);this.matrix.quaternion.copy(quaternion);this.matrix.scale.copy(size);this.matrix.updateMatrix();this.matrix.matrix.premultiply(model.matrixWorld);this.people.setMatrixAt(this.count,this.matrix.matrix);this.people.setColorAt(this.count++,this.color.set(color));};
  const box=(xx,yy,zz,w,h,d,color,rx=0)=>add(new THREE.Vector3(xx,yy,zz),new THREE.Vector3(w,h,d),color,new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,0,0)));
  const limb=(a,b,width,color)=>add(a.clone().add(b).multiplyScalar(.5),new THREE.Vector3(width,a.distanceTo(b),width),color,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize()));
  // Rowers sit on the thwarts facing aft. Hips stay planted; the upper body swings.
  box(x,y+.34,seat+lean,.40,.46,.24,shirt,lean*.7);box(x,y+.11,seat,.41,.11,.28,'#485956');box(x,y+.72,seat+lean*1.5,.28,.30,.27,skin);box(x,y+.9,seat+lean*1.5-.025,.32,.11,.26,'#53513e');
  for(const leg of [-1,1]){const hip=new THREE.Vector3(x+leg*.11,y+.04,seat),knee=new THREE.Vector3(x+leg*.11,y-.03,seat+.38),ankle=new THREE.Vector3(x+leg*.11,.11,seat+.47);limb(hip,knee,.16,'#505f5b');limb(knee,ankle,.15,'#505f5b');box(ankle.x,.08,ankle.z+.07,.19,.13,.27,'#473f34');}
  for(const arm of [-1,1]){
   const shoulder=new THREE.Vector3(x+arm*.21,y+.49,seat+lean*1.4),hand=new THREE.Vector3(-side*.78+arm*.095,0,0).applyEuler(pivot.rotation).add(pivot.position),axis=hand.clone().sub(shoulder),distance=axis.length();axis.normalize();
   const bend=new THREE.Vector3(arm*.6,-.25,-.6);bend.addScaledVector(axis,-bend.dot(axis)).normalize();const elbow=shoulder.clone().add(hand).multiplyScalar(.5).addScaledVector(bend,Math.sqrt(Math.max(.015,.38*.38-distance*distance*.25)));
   limb(shoulder,elbow,.13,shirt);limb(elbow,hand,.12,skin);box(hand.x,hand.y,hand.z,.14,.13,.14,skin);
  }
 }
 person(x,y,z,angle,phase,style,activity=1,fade=1,seated=false,fallen=0){
  const skin=['#c99c75','#9b694c','#deb78e','#775440'][style%4],shirt=['#a5a88b','#b9c2b4','#8c6461','#577b82','#bc9b68'][style%5],trousers=['#505c55','#686450','#454f57'][style%3],swing=Math.sin(phase)*(seated?.32:.56)*activity,scale=.95*fade,cs=Math.cos(angle),sn=Math.sin(angle);
  const part=(lx,ly,lz,w,h,d,color,rx=0)=>{if(this.count>=this.people.instanceMatrix.count)return;const px=lx*Math.cos(fallen)-ly*Math.sin(fallen),py=ly*Math.cos(fallen)+lx*Math.sin(fallen);this.matrix.position.set(x+(px*cs-lz*sn)*scale,y+py*scale,z+(px*sn+lz*cs)*scale);this.matrix.rotation.set(rx,-angle,fallen,'YXZ');this.matrix.scale.set(w*scale,h*scale,d*scale);this.matrix.updateMatrix();this.people.setMatrixAt(this.count,this.matrix.matrix);this.people.setColorAt(this.count++,this.color.set(color));};
  part(0,seated?.71:.91,0,.43,.51,.25,shirt);part(0,seated?.46:.67,0,.44,.08,.27,'#6f543d');part(0,seated?1.11:1.34,0,.28,.3,.27,skin);part(0,seated?1.29:1.51,.015,.32,.11,.30,'#594638');
  if(style%3===0){part(0,seated?1.30:1.52,0,.53,.08,.4,'#625441');part(0,seated?1.40:1.62,0,.32,.13,.28,'#625441');}
  for(const side of [-1,1]){
   part(side*.13,seated?.25:.34,seated?-.2:side*swing*.24,.17,.55,.19,trousers,seated?-.95:side*swing);
   part(side*.13,seated?.13:.08,seated?-.41:side*swing*.38-.03,.20,.14,.29,'#4b453b');
   part(side*.30,seated?.67:.87,seated?-.13:-side*swing*.21,.14,.46,.16,shirt,seated?-1.1+swing:-side*swing);
   part(side*.30,seated?.56:.61,seated?-.36:-side*swing*.33,.14,.13,.14,skin);
  }
 }
 update(s,dt,time){this.time+=dt;this.count=0;
  for(const p of s.civilians||[]){if(p.delay>0)continue;const running=!p.dead&&p.index<p.path.length,fade=p.dead?Math.min(1,(12-p.deadAge)/3):Math.min(1,p.age*3),fallen=p.dead?Math.min(1,p.deadAge/.45)*Math.PI/2:0;this.person(p.x,personHeight(p)+(p.dead?.19:running?Math.abs(Math.sin(p.age*8+p.phase))*.07:0),p.z,p.angle,p.age*(running?p.speed*3:2)+p.phase,p.id,running?1:.06,fade,false,fallen);}
  const active=new Set();
  for(const b of s.rowboats||[]){active.add(b.id);if(!this.boats.has(b.id)){const model=makeLifeboat();this.boats.set(b.id,model);this.scene.add(model);}const model=this.boats.get(b.id),y=surfaceHeight(b.x,b.z,time),cs=Math.cos(b.angle),sn=Math.sin(b.angle),pitch=(surfaceHeight(b.x+sn*1.5,b.z-cs*1.5,time)-surfaceHeight(b.x-sn*1.5,b.z+cs*1.5,time))/3;
   model.position.set(b.x,y+.08,b.z);model.rotation.set(Math.max(-.14,Math.min(.14,pitch)),-b.angle,Math.sin(time*1.3+b.id)*.025,'YXZ');model.scale.setScalar(b.arrived?Math.min(1,(32-b.arrivalAge)/4):1);
   model.userData.oars.forEach((oar,j)=>{const stroke=rowingStroke(b.age,oar.side);oar.pivot.rotation.y=b.lostCrew?.has(j)?0:stroke.yaw;oar.pivot.rotation.z=b.lostCrew?.has(j)?oar.side*.15:stroke.roll;oar.blade.rotation.x=stroke.feather;});
   model.updateMatrixWorld(true);if(!b.arrived)model.userData.oars.slice(0,b.crew).forEach((oar,j)=>{if(!b.lostCrew?.has(j))this.rower(model,oar,rowingStroke(b.age,oar.side),j);else{const age=b.age-b.crewDeaths[j];if(age<10){const pos=new THREE.Vector3(oar.side*.23,.36,oar.z-.22).applyMatrix4(model.matrixWorld);this.person(pos.x,pos.y,pos.z,b.angle,0,j,0,Math.min(1,(10-age)/3)*.72,true,Math.min(1,age/.5)*1.5);}}});
  }
  for(const [id,model]of this.boats)if(!active.has(id)){this.scene.remove(model);this.boats.delete(id);}
  this.people.count=this.count;this.people.instanceMatrix.needsUpdate=true;if(this.people.instanceColor)this.people.instanceColor.needsUpdate=true;
 }
 clear(){for(const model of this.boats.values())this.scene.remove(model);this.boats.clear();this.people.count=0;this.time=0;}
}
