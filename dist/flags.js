import * as THREE from './vendor/three.module.js';
const textures=new Map();
function flagTexture(navy){
  if(textures.has(navy))return textures.get(navy);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=320;const c=canvas.getContext('2d');
  if(navy){
    c.fillStyle='#923f36';c.fillRect(0,0,512,320);c.fillStyle='#273e57';c.fillRect(0,0,242,156);
    c.save();c.beginPath();c.rect(0,0,242,156);c.clip();c.strokeStyle='#e7e1cb';c.lineWidth=28;c.beginPath();c.moveTo(0,0);c.lineTo(242,156);c.moveTo(242,0);c.lineTo(0,156);c.stroke();c.fillStyle='#ece5ce';c.fillRect(99,0,44,156);c.fillRect(0,56,242,44);c.fillStyle='#a5453a';c.fillRect(109,0,24,156);c.fillRect(0,66,242,24);c.restore();
  }else{
    c.fillStyle='#1e2725';c.fillRect(0,0,512,320);c.strokeStyle='#e9e4d0';c.lineWidth=16;c.lineCap='round';
    for(const [a,b,d,e]of [[162,221,346,121],[162,121,346,221]]){c.beginPath();c.moveTo(a,b);c.lineTo(d,e);c.stroke();for(const [x,y]of [[a,b],[d,e]]){c.fillStyle='#e9e4d0';c.beginPath();c.arc(x-6,y,11,0,Math.PI*2);c.arc(x+5,y+5,10,0,Math.PI*2);c.fill();}}
    c.fillStyle='#ebe6d2';c.beginPath();c.ellipse(256,137,53,55,0,0,Math.PI*2);c.fill();c.fillRect(226,166,60,35);c.fillStyle='#1e2725';
    for(const x of [236,276]){c.beginPath();c.ellipse(x,140,13,16,x<256?.25:-.25,0,Math.PI*2);c.fill();}c.beginPath();c.moveTo(256,156);c.lineTo(248,174);c.lineTo(264,174);c.fill();for(let x=236;x<284;x+=12)c.fillRect(x,184,3,18);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;textures.set(navy,texture);return texture;
}
export function createMastFlag({height,z=0,navy=false,pennant=false,phase=0,scale=1}){
  const group=new THREE.Group();const staffHeight=(pennant?1.65:2.15)*scale,top=height+staffHeight;
  const staff=new THREE.Mesh(new THREE.CylinderGeometry(.065*scale,.095*scale,staffHeight+.3,8),new THREE.MeshStandardMaterial({color:'#9e7a45',roughness:1}));staff.position.set(0,height+staffHeight/2-.08,z);staff.castShadow=true;group.add(staff);
  const finial=new THREE.Mesh(new THREE.SphereGeometry(.11*scale,8,6),new THREE.MeshStandardMaterial({color:'#d7b878',roughness:.75}));finial.position.set(0,top,z);group.add(finial);
  const width=(pennant?2.7:2.65)*scale,heightFlag=(pennant?.60:1.55)*scale,positions=[],uvs=[],indices=[],columns=30,rows=12;
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){const u=i/columns,v=j/rows,clothHeight=pennant?heightFlag*(1-u*.95):heightFlag;positions.push(-.1-u*width,top-.18-v*clothHeight-.12*u,z);uvs.push(u,1-v);if(i<columns&&j<rows){const a=j*(columns+1)+i,b=a+columns+1;indices.push(a,b,a+1,a+1,b,b+1);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const uniform={value:phase},windUniform={value:1};const mat=new THREE.MeshStandardMaterial({map:pennant?null:flagTexture(navy),color:pennant?'#dab576':'#ffffff',roughness:.95,side:THREE.DoubleSide});
  const patch=shader=>{shader.uniforms.flagTime=uniform;shader.uniforms.flagWind=windUniform;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float flagTime;uniform float flagWind;').replace('#include <begin_vertex>','#include <begin_vertex>\nfloat freeEdge=pow(uv.x,.8);transformed.z+=sin(uv.x*7.5-flagTime*3.2+uv.y*.7)*freeEdge*.26*flagWind;transformed.y+=sin(uv.x*5.5-flagTime*2.1)*freeEdge*.045*flagWind;');};
  mat.onBeforeCompile=patch;mat.customProgramCacheKey=()=> 'mast-flag';const cloth=new THREE.Mesh(geometry,mat);cloth.castShadow=true;cloth.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});cloth.customDepthMaterial.onBeforeCompile=patch;cloth.customDepthMaterial.customProgramCacheKey=()=> 'mast-flag-depth';group.add(cloth);
  let displayedNavy=navy,targetNavy=navy,hoistStart=null,lastTime=0;
  const applyColours=value=>{if(!pennant)mat.map=flagTexture(value);else mat.color.set(value?'#b16050':'#323638');displayedNavy=value;};
  group.userData.setNavy=value=>{
    if(pennant){applyColours(value);return;}
    if(value!==targetNavy){targetNavy=value;hoistStart=lastTime;}
  };
  group.userData.update=(time,wind=1)=>{
    uniform.value=time+phase;windUniform.value=wind;lastTime=time;
    if(hoistStart!==null){const t=Math.min(1,Math.max(0,(time-hoistStart)/1.15));cloth.position.y=-1.6*scale*Math.sin(t*Math.PI);if(t>=.5&&displayedNavy!==targetNavy)applyColours(targetNavy);if(t===1){hoistStart=null;cloth.position.y=0;}}
  };return group;
}
