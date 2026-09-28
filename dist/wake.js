import * as THREE from './vendor/three.module.js';
import {waveScale,waveGLSL,shelterGLSL} from './sea-state.js';
import {ISLANDS} from './geography.js';

// A connected ribbon records the stern's actual path. No billboard particles or tile spray.
export class ShipWake {
  constructor(scene){
    this.points=[];this.capacity=192;this.columns=12;this.previous=null;
    const count=this.capacity*(this.columns+1),positions=new Float32Array(count*3),uvs=new Float32Array(count*2),birth=new Float32Array(count),power=new Float32Array(count),indices=[];
    for(let i=0;i<this.capacity-1;i++)for(let j=0;j<this.columns;j++){const a=i*(this.columns+1)+j,b=a+this.columns+1;indices.push(a,b,a+1,a+1,b,b+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('birth',new THREE.BufferAttribute(birth,1).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('power',new THREE.BufferAttribute(power,1).setUsage(THREE.DynamicDrawUsage));geometry.setIndex(indices);geometry.setDrawRange(0,0);
    this.uniforms={time:{value:0},amplitude:{value:waveScale()},islands:{value:ISLANDS.map(i=>new THREE.Vector3(i.x,i.z,i.r))}};
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:this.uniforms,
      vertexShader:`uniform float time,amplitude;uniform vec3 islands[6];${waveGLSL}${shelterGLSL}attribute float birth;attribute float power;varying vec2 vUv;varying vec3 world;varying float born;varying float strength;void main(){vUv=uv;world=position;world.y=oceanHeight(world.xz,time)*amplitude*oceanShelter(world.xz)-.23+.065+amplitude*.028;born=birth;strength=power;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
      fragmentShader:`precision highp float;uniform float time;varying vec2 vUv;varying vec3 world;varying float born;varying float strength;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){float age=time-born,fade=pow(max(0.,1.-age/11.),1.9);float across=vUv.x*2.-1.;float turbulence=noise(world.xz*2.8+vec2(time*.12,-time*.09));float fine=noise(world.xz*8.5);float outer=exp(-pow((abs(across)-.70-.045*sin(vUv.y*.85+time*.35))/.14,2.));float churn=(1.-abs(across))*smoothstep(.38,.75,turbulence)*.28;float foam=(outer*(.35+turbulence*.65)+churn)*(.55+fine*.45);float edge=1.-smoothstep(.81,1.,abs(across));float alpha=foam*.38*fade*strength*edge;vec3 col=mix(vec3(.08,.16,.18),vec3(.33,.44,.46),clamp(foam+fade*.45,0.,1.));gl_FragColor=vec4(col,alpha);}`});
    this.mesh=new THREE.Mesh(geometry,material);this.mesh.frustumCulled=false;this.mesh.renderOrder=2;this.mesh.userData.waterSurface=true;scene.add(this.mesh);
  }
  clear(){this.points=[];this.previous=null;this.mesh.geometry.setDrawRange(0,0);}
  update(ship,spec,time,paused=false){
    this.uniforms.time.value=time;this.uniforms.amplitude.value=waveScale();const speed=Math.hypot(ship.vx??0,ship.vz??0)||ship.speed||0;
    const x=ship.x-Math.sin(ship.angle)*spec.length*.45,z=ship.z+Math.cos(ship.angle)*spec.length*.45;
    if(this.previous&&Math.hypot(x-this.previous.x,z-this.previous.z)>20)this.clear();
    if(!paused&&speed>.35&&(!this.previous||(time-this.previous.birth>=.08&&Math.hypot(x-this.previous.x,z-this.previous.z)>.08))){
      const point={x,z,angle:ship.angle,birth:time,power:Math.min(1,speed/6),width:spec.width*.39,distance:(this.previous?.distance||0)+(this.previous?Math.hypot(x-this.previous.x,z-this.previous.z):0)};
      this.points.unshift(point);this.previous=point;if(this.points.length>this.capacity-1)this.points.pop();
    }
    this.points=this.points.filter(p=>time-p.birth<11);
    const geometry=this.mesh.geometry,pos=geometry.attributes.position,uv=geometry.attributes.uv,birth=geometry.attributes.birth,power=geometry.attributes.power;
    const path=speed>.35&&this.points.length?[{x,z,angle:ship.angle,birth:time,power:Math.min(1,speed/6),width:spec.width*.39,distance:this.points[0].distance+Math.hypot(x-this.points[0].x,z-this.points[0].z)},...this.points]:this.points;
    path.forEach((p,i)=>{const age=time-p.birth,width=p.width+age*.35;for(let j=0;j<=this.columns;j++){const u=j/this.columns,sign=u*2-1,px=p.x+Math.cos(p.angle)*width*sign,pz=p.z+Math.sin(p.angle)*width*sign,index=i*(this.columns+1)+j;pos.setXYZ(index,px,0,pz);uv.setXY(index,u,p.distance);birth.setX(index,p.birth);power.setX(index,p.power);}});
    pos.needsUpdate=true;uv.needsUpdate=true;birth.needsUpdate=true;power.needsUpdate=true;geometry.setDrawRange(0,Math.max(0,path.length-1)*this.columns*6);
  }
}

