import * as THREE from './vendor/three.module.js';
import {seaState} from './sea-state.js';

export function weatherAt(time){
 const squall=.5+.5*Math.sin(time*.025-.45),gust=.5+.5*Math.sin(time*.73)*Math.sin(time*.19);
 const wind=seaState.wind*(.8+gust*.4);
 // A north-easterly blows southwest: negative world X, positive world Z.
 // Transport velocity is shared by fresh powder, fire smoke and old battle haze.
 return {rain:seaState.rain*(.7+squall*.3),wind,windX:-Math.SQRT1_2*wind*1.9,windZ:Math.SQRT1_2*wind*1.9,light:1.95-seaState.rain*squall*.75+Math.sin(time*.09)*.10,mist:.0017+seaState.rain*squall*.0010};
}

// Multisampled HDR scene, half-resolution bloom, then restrained cinematic grading.
export class Atmosphere{
 constructor(renderer,scene){
  this.renderer=renderer;this.scene=scene;
  this.target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
  this.bloomA=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});this.bloomB=this.bloomA.clone();
  this.screen=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  this.blur=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{source:{value:null},stepUV:{value:new THREE.Vector2()},extract:{value:1}},vertexShader,fragmentShader:`varying vec2 vUv;uniform sampler2D source;uniform vec2 stepUV;uniform float extract;
  vec3 sampleLight(vec2 uv){vec3 c=texture2D(source,uv).rgb;if(extract>.5)c*=smoothstep(.55,1.4,max(c.r,max(c.g,c.b)));return c;}
  void main(){vec3 c=sampleLight(vUv)*.227027;c+=(sampleLight(vUv+stepUV*1.3846)+sampleLight(vUv-stepUV*1.3846))*.316216;c+=(sampleLight(vUv+stepUV*3.2307)+sampleLight(vUv-stepUV*3.2307))*.07027;gl_FragColor=vec4(c,1.);}`});
  this.grade=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:this.target.texture},bloom:{value:this.bloomA.texture},time:{value:0}},vertexShader,fragmentShader:`varying vec2 vUv;uniform sampler2D source;uniform sampler2D bloom;uniform float time;
  void main(){vec3 col=texture2D(source,vUv).rgb+texture2D(bloom,vUv).rgb*.21;
   float lum=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(lum),col,.84);
   col*=mix(vec3(.76,.91,1.06),vec3(1.045,1.01,.92),smoothstep(.08,.8,lum));
   float edge=length((vUv-.5)*vec2(1.,.83));col*=1.-smoothstep(.24,.72,edge)*.20;
   gl_FragColor=vec4(col,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   float grain=fract(sin(dot(gl_FragCoord.xy+floor(time*12.),vec2(12.9898,78.233)))*43758.5453)-.5;
   gl_FragColor.rgb+=grain*.0025;
  }`});
  this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.grade);this.quad.frustumCulled=false;this.screen.add(this.quad);
  const geometry=new THREE.InstancedBufferGeometry(),plane=new THREE.PlaneGeometry(1,1);geometry.index=plane.index;geometry.attributes.position=plane.attributes.position;geometry.attributes.uv=plane.attributes.uv;
  const seeds=new Float32Array(1050*3);for(let i=0;i<seeds.length;i++)seeds[i]=(Math.sin(i*127.1+4)*43758.5453)%1;
  geometry.setAttribute('dropSeed',new THREE.InstancedBufferAttribute(seeds,3));geometry.instanceCount=1050;
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,toneMapped:false,uniforms:{time:{value:0},center:{value:new THREE.Vector3()},strength:{value:.5},gust:{value:1}},vertexShader:`attribute vec3 dropSeed;uniform float time,strength,gust;uniform vec3 center;varying vec2 vUv;varying float fade;
   void main(){vUv=uv;vec3 p=vec3(mod(dropSeed.x*100.-time*3.*gust+100.,140.)-70.,mod(dropSeed.y*50.-time*29.+100.,50.),mod(dropSeed.z*100.+time*2.*gust+100.,140.)-70.);p.xz+=center.xz;
    vec4 mv=viewMatrix*vec4(p,1.);vec3 fall=(viewMatrix*vec4(-.16*gust,-1.,.10*gust,0.)).xyz;vec2 dir=normalize(fall.xy);mv.xy+=dir*position.y*(.85+fract(dropSeed.x*12.)*.8)+vec2(-dir.y,dir.x)*position.x*.07;
    fade=strength*.65*smoothstep(0.,3.,p.y)*(1.-smoothstep(36.,50.,p.y));gl_Position=projectionMatrix*mv;
   }`,fragmentShader:'varying vec2 vUv;varying float fade;void main(){float alpha=sin(vUv.y*3.14159)*fade;gl_FragColor=vec4(.48,.62,.73,alpha);}'});
  this.rain=new THREE.Mesh(geometry,material);this.rain.frustumCulled=false;this.rain.renderOrder=7;scene.add(this.rain);
  scene.fog=new THREE.FogExp2('#172b39',.0022);
 }
 resize(w,h){const ratio=this.renderer.getPixelRatio();this.target.setSize(Math.round(w*ratio),Math.round(h*ratio));this.bloomA.setSize(Math.ceil(w*ratio/2),Math.ceil(h*ratio/2));this.bloomB.setSize(this.bloomA.width,this.bloomA.height);}
 update(time,center){const weather=weatherAt(time),u=this.rain.material.uniforms;u.time.value=time;u.center.value.copy(center);u.strength.value=weather.rain;u.gust.value=weather.wind;this.scene.fog.density=weather.mist;this.grade.uniforms.time.value=time;return weather;}
 render(scene,camera){const r=this.renderer;r.setRenderTarget(this.target);r.render(scene,camera);
  this.quad.material=this.blur;this.blur.uniforms.source.value=this.target.texture;this.blur.uniforms.extract.value=1;this.blur.uniforms.stepUV.value.set(2/this.target.width,0);r.setRenderTarget(this.bloomB);r.render(this.screen,this.camera);
  this.blur.uniforms.source.value=this.bloomB.texture;this.blur.uniforms.extract.value=0;this.blur.uniforms.stepUV.value.set(0,2/this.bloomB.height);r.setRenderTarget(this.bloomA);r.render(this.screen,this.camera);
  this.quad.material=this.grade;r.setRenderTarget(null);r.render(this.screen,this.camera);
 }
}
