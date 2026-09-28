import * as THREE from './vendor/three.module.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a),0,1);return t*t*(3-2*t);};
export const SMOKE_LIMITS={puffs:720,haze:96,embers:220};
export const POWDER_WIND={x:-.52,z:.34};
const vertexShader=`
 attribute vec3 puffCenter;attribute vec4 puffShape;attribute vec4 puffState;attribute vec3 puffTint;attribute vec3 puffDirection;
 varying vec2 vUv;varying vec4 vState;varying vec3 vTint;varying float vSeed;
 #include <clipping_planes_pars_vertex>
 void main(){
  vUv=uv;vState=puffState;vTint=puffTint;vSeed=puffShape.w;
  vec4 mvPosition=viewMatrix*vec4(puffCenter,1.);
  float angle=puffShape.z;
  if(abs(puffState.w)>0.5){vec2 d=(viewMatrix*vec4(puffDirection,0.)).xy;angle=atan(d.y,d.x);}
  vec2 q=position.xy*puffShape.xy;float c=cos(angle),s=sin(angle);
  mvPosition.xy+=mat2(c,s,-s,c)*q;
  gl_Position=projectionMatrix*mvPosition;
  #include <clipping_planes_vertex>
 }`;
const fragmentShader=`
 precision highp float;
 uniform float smokeLight;
 varying vec2 vUv;varying vec4 vState;varying vec3 vTint;varying float vSeed;
 #include <clipping_planes_pars_fragment>
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){return noise(p)*.57+noise(p*2.04+8.3)*.28+noise(p*4.1+1.7)*.15;}
 void main(){
  #include <clipping_planes_fragment>
  vec2 q=(vUv-.5)*2.;float age=vState.x;
  if(vState.w>2.5){
   float height=q.x*.5+.5;
   float bend=sin(height*8.-age*15.+vSeed)*.12*height;
   float width=max(.045,.58*(1.-height));
   float body=1.-smoothstep(width*.38,width,abs(q.y-bend));
   float flicker=fbm(vec2(q.y*5.+vSeed,height*6.-age*9.));
   float alpha=body*smoothstep(0.,.15,height)*(1.-smoothstep(.7,1.,height))*(.55+.45*flicker)*vState.z;
   vec3 fire=mix(vec3(.94,.14,.015),vec3(1.,.61,.12),body*(1.-height*.65));
   if(alpha<.004)discard;gl_FragColor=vec4(fire,alpha);return;
  }
  if(vState.w>.5){
   float r=length(q*vec2(.80,1.35));float core=exp(-r*r*12.);float flame=exp(-r*r*4.5)*(1.-smoothstep(.6,1.,abs(q.x)));
   float alpha=(core+flame*.7)*vState.z;vec3 fire=mix(vec3(1.,.24,.035),vec3(1.,.94,.69),core);
   if(vState.w>1.5){alpha=exp(-dot(q*vec2(.62,2.),q*vec2(.62,2.))*6.)*vState.z;fire=vec3(1.,.63,.22);}
   if(alpha<.004)discard;gl_FragColor=vec4(fire,alpha);return;
  }
  // Overlapping lobes, rolling internal eddies and a feathered boundary.
  // No square texture edges, solid voxel cubes or expanding flat rings.
  vec2 drift=vec2(age*.11,-age*.16),p=q*2.65+vSeed;
  float coarse=fbm(p+drift),fine=noise(p*3.7-drift*.9);
  float radius=length(q*vec2(1.,1.05));
  float edge=1.-smoothstep(.43+coarse*.25,.79+coarse*.16,radius);
  float body=smoothstep(.13,.66,coarse*.78+fine*.22);
  float erosion=smoothstep(1.5,12.,age);
  float density=edge*mix(.38+body*.62,smoothstep(.27,.67,coarse*.78+fine*.22),erosion*.88);
  float lighting=clamp(.60+q.y*.15-q.x*.13+(coarse-.5)*.30,.36,.92);
  vec3 shadow=vTint*.57,lit=mix(vTint,vec3(.91,.90,.82),.28);
  vec3 color=mix(shadow,lit,lighting);
  color=mix(color,vec3(1.,.68,.29),exp(-age*13.)*.25);
  color*=smokeLight;float alpha=density*vState.z;
  if(alpha<.004)discard;gl_FragColor=vec4(color,alpha);
 }`;
function batch(scene,capacity,additive=false){
 const base=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();geometry.index=base.index;geometry.attributes.position=base.attributes.position;geometry.attributes.uv=base.attributes.uv;
 for(const [name,size]of [['puffCenter',3],['puffShape',4],['puffState',4],['puffTint',3],['puffDirection',3]])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size).setUsage(THREE.DynamicDrawUsage));
 geometry.instanceCount=0;const material=new THREE.ShaderMaterial({uniforms:{smokeLight:{value:1}},vertexShader,fragmentShader,transparent:true,depthTest:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,clipping:true,toneMapped:false});
 const mesh=new THREE.Mesh(geometry,material);mesh.name=additive?'Powder flashes and embers':'Drifting powder smoke';mesh.frustumCulled=false;mesh.renderOrder=additive?5:4;scene.add(mesh);return mesh;
}
function write(mesh,items){
 const a=mesh.geometry.attributes;
 items.forEach((p,i)=>{a.puffCenter.setXYZ(i,p.x,p.y,p.z);a.puffShape.setXYZW(i,p.sx,p.sy,p.rotation||0,p.seed);a.puffState.setXYZW(i,p.age,p.life,p.alpha,p.kind||0);a.puffTint.setXYZ(i,...p.tint);a.puffDirection.setXYZ(i,p.dx||0,p.dy||0,p.dz||0);});
 mesh.geometry.instanceCount=items.length;for(const attr of Object.values(a))if(attr.isInstancedBufferAttribute)attr.needsUpdate=true;
}

export class PowderSmoke{
 constructor(scene,{random=Math.random}={}){
  this.random=random;this.puffs=[];this.haze=[];this.embers=[];this.time=0;this.wind={...POWDER_WIND};
  this.smokeMesh=batch(scene,SMOKE_LIMITS.puffs+SMOKE_LIMITS.haze);this.fireMesh=batch(scene,SMOKE_LIMITS.embers,true);
  this.lights=Array.from({length:2},()=>{const l=new THREE.PointLight('#ffc777',0,14,2);scene.add(l);return l;});this.lightIndex=0;
 }
 puff(p){if(this.puffs.length>=SMOKE_LIMITS.puffs)this.puffs.shift();this.puffs.push({age:0,seed:this.random()*90,rotation:this.random()*6.28,...p});}
 ember(p){if(this.embers.length>=SMOKE_LIMITS.embers)this.embers.shift();this.embers.push({age:0,seed:this.random()*90,rotation:0,tint:[1,.65,.25],...p});}
 deposit(x,y,z){
  let cloud=this.haze.find(p=>Math.hypot(p.x-x,p.z-z)<5.5&&Math.abs(p.y-y)<3);
  if(cloud){cloud.dose=Math.min(7,cloud.dose+1);cloud.age=Math.min(cloud.age,5);cloud.life=38+this.random()*10;return;}
  if(this.haze.length>=SMOKE_LIMITS.haze)this.haze.shift();
  this.haze.push({x,y,z,age:0,life:38+this.random()*10,dose:1,size:3.2+this.random(),seed:this.random()*90,rotation:0,tint:[.64,.69,.69]});
 }
 fire(e){
  const r=this.random,d=Math.hypot(e.dx,e.dz)||1,dx=e.dx/d,dz=e.dz/d,y=e.y??2.5;
  // Hot, fast powder exhaust decelerates into cooler, pale rolling billows.
  for(let i=0;i<7;i++){
   const side=(r()-.5)*3.5,jet=i<4?6+r()*7:2+r()*3;
   this.puff({x:e.x+dx*(.3+r()*.7),y:y+(r()-.5)*.30,z:e.z+dz*(.3+r()*.7),vx:dx*jet-dz*side,vy:.45+r()*.7,vz:dz*jet+dx*side,life:i<4?6+r()*4:13+r()*6,size:.60+r()*.50,growth:i<4?.40:.52,opacity:i<4?.60:.27,tint:i%3?[.81,.82,.78]:[.61,.66,.65],drag:i<4?1.65:1.1});
  }
  this.deposit(e.x+dx*2.5,y+.25,e.z+dz*2.5);
  this.ember({x:e.x+dx*.65,y,z:e.z+dz*.65,vx:dx*5,vy:0,vz:dz*5,dx,dz,life:.16,size:3.5,kind:1});
  for(let i=0;i<5;i++){const side=(r()-.5)*3,speed=7+r()*8;this.ember({x:e.x+dx*.5,y:y+(r()-.5)*.3,z:e.z+dz*.5,vx:dx*speed-dz*side,vy:(r()-.35)*3,vz:dz*speed+dx*side,dx,dz,life:.24+r()*.28,size:.45+r()*.5,kind:2});}
  const light=this.lights[this.lightIndex++%2];light.position.set(e.x+dx,y+.5,e.z+dz);light.intensity=13;
 }
 impact(point,{stone=false,direction={x:0,z:0}}={}){
  const r=this.random,len=Math.hypot(direction.x,direction.z)||1;
  for(let i=0;i<5;i++){const angle=r()*6.28,speed=1+r()*3;this.puff({x:point.x,y:point.y??2.5,z:point.z,vx:Math.cos(angle)*speed+direction.x/len*.7,vy:.4+r(),vz:Math.sin(angle)*speed+direction.z/len*.7,life:4+r()*5,size:.45+r()*.5,growth:.18,opacity:.44,tint:stone?[.75,.73,.66]:[.57,.51,.41],drag:1.5});}
 }
 burn(point){const r=this.random;this.puff({x:point.x,y:point.y,z:point.z,vx:this.wind.x,vy:1+r()*.6,vz:this.wind.z,life:12+r()*6,size:.55+r()*.5,growth:.20,opacity:.36,tint:[.43,.44,.40],drag:.7});}
 flame(point,strength=1){const r=this.random;this.ember({x:point.x,y:point.y,z:point.z,vx:this.wind.x*.18,vy:.6+r()*.8,vz:this.wind.z*.18,dx:this.wind.x*.15,dy:1,dz:this.wind.z*.15,life:.45+r()*.3,size:(1.3+r()*.8)*strength,kind:3});}
 clear(){this.puffs.length=this.haze.length=this.embers.length=0;this.time=0;this.smokeMesh.geometry.instanceCount=this.fireMesh.geometry.instanceCount=0;this.lights.forEach(l=>l.intensity=0);}
 update(dt,camera){
  dt=clamp(dt,0,.1);this.time+=dt;const windSpeed=Math.hypot(this.wind.x,this.wind.z);
  for(const p of this.puffs){
   p.age+=dt;const drag=Math.exp(-dt*p.drag),shear=1+p.age*.065;
   const wx=this.wind.x*shear+Math.sin(p.seed+p.age*.35)*.4,wz=this.wind.z*shear+Math.cos(p.seed*.7+p.age*.28)*.4;
   p.vx=wx+(p.vx-wx)*drag;p.vz=wz+(p.vz-wz)*drag;p.vy+=(.16-p.vy)*(1-Math.exp(-dt*.65));
   p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.rotation+=dt*.035;p.kind=-1;p.dx=this.wind.x;p.dz=this.wind.z;
   const size=p.size+(1-Math.exp(-p.age*4))*.9+p.age*p.growth;p.sx=size*(2.1+Math.min(2,windSpeed)*.3+p.age*(.07+windSpeed*.025));p.sy=size*1.65;
   p.alpha=p.opacity*smooth(0,.09,p.age)*Math.exp(-p.age*.11)*(1-smooth(p.life*.30,p.life,p.age));
  }
  this.puffs=this.puffs.filter(p=>p.age<p.life);
  for(const p of this.haze){p.age+=dt;p.x+=this.wind.x*dt;p.z+=this.wind.z*dt;p.y+=(.035+Math.exp(-p.age*.2)*.06)*dt;
   p.size=Math.min(17,p.size+dt*.30);p.sx=p.size*(3.1+p.age*.025);p.sy=p.size*1.20;p.kind=-1;p.dx=this.wind.x;p.dz=this.wind.z;
   p.alpha=(.065+Math.min(6,p.dose)*.025)*smooth(.35,3,p.age)*(1-smooth(p.life*.30,p.life,p.age));
  }
  this.haze=this.haze.filter(p=>p.age<p.life);
  for(const p of this.embers){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.kind!==3)p.vy-=dt*5;const fade=1-p.age/p.life;p.alpha=Math.max(0,fade)*(p.kind===3?.48:p.kind===1?1.2:.9);p.sx=p.size*(p.kind===1?1+p.age*4:1);p.sy=p.sx*(p.kind===3?.65:p.kind===1?.48:.12);}
  this.embers=this.embers.filter(p=>p.age<p.life);
  this.lights.forEach(l=>{l.intensity*=Math.exp(-dt*28);if(l.intensity<.01)l.intensity=0;});
  // Sort inside the instanced batch so overlapping clouds blend correctly.
  const clouds=[...this.puffs,...this.haze];
  if(camera){const m=camera.matrixWorldInverse.elements;const depth=p=>m[2]*p.x+m[6]*p.y+m[10]*p.z;clouds.sort((a,b)=>depth(a)-depth(b));}
  write(this.smokeMesh,clouds);write(this.fireMesh,this.embers);
 }
}
