import * as THREE from './vendor/three.module.js';
let fabricTexture;
function fabric(){
  if(fabricTexture)return fabricTexture;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f1efdf';ctx.fillRect(0,0,512,512);
  // Broad canvas gores, narrow stitched seams, and almost imperceptible woven threads.
  for(let x=0;x<512;x+=64){ctx.fillStyle=x%128===0?'rgba(156,141,102,.045)':'rgba(255,255,240,.05)';ctx.fillRect(x,0,64,512);ctx.fillStyle='rgba(148,137,105,.18)';ctx.fillRect(x,0,1.2,512);ctx.fillStyle='rgba(255,255,245,.32)';ctx.fillRect(x+2,0,1,512);}
  ctx.fillStyle='rgba(139,126,96,.025)';for(let y=0;y<512;y+=3)ctx.fillRect(0,y,512,.6);
  ctx.strokeStyle='rgba(160,141,101,.25)';ctx.lineWidth=4;ctx.strokeRect(2,2,508,508);
  fabricTexture=new THREE.CanvasTexture(canvas);fabricTexture.colorSpace=THREE.SRGBColorSpace;fabricTexture.anisotropy=8;return fabricTexture;
}
export function clothController({color='#f5f1dc',weathering=0}={}){return{color,uniforms:{clothTime:{value:0},clothWind:{value:.5},clothDamage:{value:weathering}},setDamage(value){this.uniforms.clothDamage.value=Math.max(weathering,Math.min(1,value));},update(time,sails=1){this.uniforms.clothTime.value=time;this.uniforms.clothWind.value=.4+sails*.8;}};}
function finish(positions,uvs,indices,controller,axis='z'){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({map:fabric(),color:controller.color,roughness:.93,metalness:0,side:THREE.DoubleSide});
  const deformation=`#include <begin_vertex>
    float u=uv.x*2.-1.,t=uv.y;
    float flex=sin(t*3.14159265)*(.5+.5*(1.-u*u));
    float gust=sin(clothTime*.95+position.y*.28+position.z*.31)*.13;
    float ripple=sin(t*8.-clothTime*2.0+u*2.4)*.033;
    transformed.${axis}+=(gust+ripple)*flex*clothWind;
    transformed.y+=sin(clothTime*2.2+u*3.5)*.025*sin(t*3.14159265)*clothWind;
  `;
  const patch=shader=>{
    Object.assign(shader.uniforms,controller.uniforms);
    shader.uniforms.sailSeed={value:Math.abs(Math.sin(positions[1]*12.37+positions[2]*5.81))};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float clothTime;uniform float clothWind;varying vec2 battleUv;').replace('#include <begin_vertex>',deformation+'\nbattleUv=uv;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float clothDamage;uniform float sailSeed;varying vec2 battleUv;').replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      float fray=sin(battleUv.x*119.)*.014+sin(battleUv.y*137.)*.011;
      vec2 shift=vec2(sailSeed-.5,sin(sailSeed*17.))*.19;
      float hole=min(length((battleUv-vec2(.31,.43)-shift)*vec2(1.,1.3)),length((battleUv-vec2(.69,.64)+shift)*vec2(1.25,1.)));
      float split=length((battleUv-vec2(.49,.23)-shift)*vec2(.65,2.2));
      if(clothDamage>.03&&(hole+fray<clothDamage*.135||split+fray<max(0.,clothDamage-.35)*.19||battleUv.y>1.-clothDamage*(.045+.065*sin(battleUv.x*37.)*sin(battleUv.x*37.))))discard;
    `).replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=1.-clothDamage*.18;');
  };
  material.onBeforeCompile=patch;material.customProgramCacheKey=()=>`canvas-cloth-${axis}`;
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});mesh.customDepthMaterial.onBeforeCompile=patch;mesh.customDepthMaterial.customProgramCacheKey=()=>`canvas-cloth-depth-${axis}`;
  return mesh;
}
export function squareCanvas({z,top,width,height},controller){
  const positions=[],uvs=[],indices=[],columns=40,rows=26;
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const u=i/columns*2-1,t=j/rows,taper=1-.095*t;
    const x=u*width*.5*taper;
    const y=top-height*t+Math.pow(Math.abs(u),2)*.34*t;
    const belly=Math.pow(Math.sin(t*Math.PI),.88)*(1.15+width*.025)*(1-.22*Math.pow(Math.abs(u),2));
    const fold=Math.sin(u*16.0)*.018*Math.sin(t*Math.PI);
    positions.push(x,y,z-.18-belly-fold);uvs.push(i/columns,t);
    if(j<rows&&i<columns){const a=j*(columns+1)+i,b=a+columns+1;indices.push(a,b,a+1,a+1,b,b+1);}
  }
  return finish(positions,uvs,indices,controller);
}
export function triangularCanvas(a,b,c,controller,bulge=.45){
  const positions=[],uvs=[],indices=[],n=30,lookup=[];
  for(let i=0;i<=n;i++){lookup[i]=[];for(let j=0;j<=n-i;j++){
    const u=i/n,v=j/n,w=1-u-v;lookup[i][j]=positions.length/3;
    positions.push(a[0]*w+b[0]*u+c[0]*v-bulge*27*u*v*w,a[1]*w+b[1]*u+c[1]*v,a[2]*w+b[2]*u+c[2]*v);uvs.push(u,v);
  }}
  for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){indices.push(lookup[i][j],lookup[i+1][j],lookup[i][j+1]);if(j<n-i-1)indices.push(lookup[i+1][j],lookup[i+1][j+1],lookup[i][j+1]);}
  return finish(positions,uvs,indices,controller,'x');
}
// A single continuous gaff sail keeps its four edges attached to mast, gaff and boom.
export function quadrilateralCanvas(a,b,c,d,controller,bulge=.65){
  const positions=[],uvs=[],indices=[],nx=36,ny=30;
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
    const u=i/nx,t=j/ny;
    for(let axis=0;axis<3;axis++)positions.push((a[axis]*(1-u)+b[axis]*u)*(1-t)+(d[axis]*(1-u)+c[axis]*u)*t-(axis===0?Math.sin(u*Math.PI)*Math.sin(t*Math.PI)*bulge:0));
    uvs.push(u,t);if(i<nx&&j<ny){const k=j*(nx+1)+i,n=k+nx+1;indices.push(k,n,k+1,k+1,n,n+1);}
  }
  return finish(positions,uvs,indices,controller,'x');
}
