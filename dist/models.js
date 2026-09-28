import * as THREE from './vendor/three.module.js';
const cube=new THREE.BoxGeometry(1,1,1),mats=new Map();
function material(color){if(!mats.has(color))mats.set(color,new THREE.MeshLambertMaterial({color}));return mats.get(color);}
export class Voxels{constructor(){this.parts=new Map();}box(x,y,z,w,h,d,color,rx=0,ry=0,rz=0){if(!this.parts.has(color))this.parts.set(color,[]);this.parts.get(color).push({x,y,z,w,h,d,rx,ry,rz,tag:this.tag});}build(){const g=new THREE.Group(),o=new THREE.Object3D();g.userData.taggedParts=new Map();for(const [color,parts]of this.parts){const m=new THREE.InstancedMesh(cube,material(color),parts.length);parts.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.rotation.set(p.rx,p.ry,p.rz);o.scale.set(p.w,p.h,p.d);o.updateMatrix();m.setMatrixAt(i,o.matrix);if(p.tag){if(!g.userData.taggedParts.has(p.tag))g.userData.taggedParts.set(p.tag,[]);g.userData.taggedParts.get(p.tag).push({mesh:m,index:i});}});m.castShadow=true;m.receiveShadow=true;g.add(m);}return g;}}
export function makeCargo(variant=0){
 const group=new THREE.Group(),v=new Voxels(),wood=['#806142','#98734b','#a27c50','#8c6945','#ad8758'],iron='#41463d',ropeMat=new THREE.MeshStandardMaterial({color:'#b5a077',roughness:1});
 function rope(points,r=.035,closed=true){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed,'catmullrom',.03),mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,40,r,5,closed),ropeMat);mesh.castShadow=true;group.add(mesh);}
 function crate(cx,cz,w=1.9,h=1.5,d=1.65,y=.1){
  v.box(cx,y+h/2,cz,w,h,d,'#594936');
  for(let j=0;j<5;j++){const x=cx-w/2+(j+.5)*w/5,z=cz-d/2+(j+.5)*d/5;
   v.box(x,y+h+.04,cz,w/5-.025,.10,d,wood[(j+variant)%5]);
   for(const side of [-1,1]){v.box(x,y+h/2,cz+side*d/2,w/5-.025,h-.04,.085,wood[(j+2+variant)%5]);v.box(cx+side*w/2,y+h/2,z,.085,h-.04,d/5-.02,wood[(j+3+variant)%5]);}
  }
  for(const sx of [-1,1])for(const sz of [-1,1]){v.box(cx+sx*(w/2-.075),y+h/2,cz+sz*d/2,.16,h+.12,.16,'#b28b56');for(const yy of [.14,h-.12])v.box(cx+sx*(w/2-.08),y+yy,cz+sz*(d/2+.09),.20,.19,.035,iron);}
  for(const side of [-1,1]){for(const yy of [.1,h-.1])v.box(cx,y+yy,cz+side*(d/2+.10),w+.12,.15,.10,'#9b7648');
   v.box(cx,y+h/2,cz+side*(d/2+.17),.14,Math.hypot(w*.80,h*.74),.10,'#b59662',0,0,-Math.atan2(w*.80,h*.74));
   for(const x of [-w*.32,w*.32])for(const yy of [.13,h-.13])v.box(cx+x,y+yy,cz+side*(d/2+.165),.055,.055,.035,iron);
  }
  // Rope lashings follow the lid, sides and submerged base.
  for(const x of [-w*.28,w*.28])rope([[cx+x,y-.06,cz-d/2-.14],[cx+x,y+h+.12,cz-d/2-.14],[cx+x,y+h+.12,cz+d/2+.14],[cx+x,y-.06,cz+d/2+.14]]);
  // Small painted skull mark on the top planks, built from crisp wooden-scale pixels.
  const mark=['01110','11111','10101','11111','01110','01010'];
  mark.forEach((row,j)=>[...row].forEach((bit,i)=>{if(bit==='1')v.box(cx+(i-2)*.075,y+h+.102,cz+(j-2.5)*.075,.072,.015,.072,'#d6ccb0');}));
 }
 function barrel(x,z,tilt=1.45){
  const b=new THREE.Group(),staves=new Voxels(),height=1.65;
  for(let j=0;j<5;j++){const t=(j+.5)/5,rad=.43+Math.sin(t*Math.PI)*.12;for(let i=0;i<14;i++){const a=i/14*Math.PI*2;staves.box(Math.sin(a)*rad,(t-.5)*height,Math.cos(a)*rad,.23,height/5-.008,.11,wood[(i+variant)%5],0,a);}}
  for(const y of [-.67,-.40,.40,.67]){const rad=.46+(.67-Math.abs(y))*.22;const ring=new THREE.Mesh(new THREE.TorusGeometry(rad,.041,4,14),material(iron));ring.rotation.x=Math.PI/2;ring.position.y=y;b.add(ring);}
  for(const side of [-1,1]){const lid=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.07,14),material('#92714a'));lid.position.y=side*.8;b.add(lid);for(let j=-2;j<=2;j++)staves.box(j*.15,side*.844,0,.018,.014,.72,'#614e36');}
  staves.box(.02,0,.60,.17,.17,.09,'#635038');b.add(staves.build());b.position.set(x,.43,z);b.rotation.set(.15,variant*.55,tilt);group.add(b);
 }
 // Half-submerged wreck planks support lashed stores rather than a gold chest.
 for(let j=0;j<5;j++)v.box(-.1,-.18,(j-2)*.44,3.1+(j%3)*.25,.18,.40,j%2?'#6c5740':'#826647',0,(j-2)*.025,0);
 if(variant%3===0){crate(-.45,0,1.8,1.42,1.65);barrel(1.15,.25,.16);}
 else if(variant%3===1){barrel(-.65,0);barrel(.65,.1);rope([[-1.1,.3,-1],[-1.1,1.05,0],[1.2,1.05,0],[1.2,.3,-1]],.05);}
 else {crate(-.50,-.15,1.65,1.35,1.7);v.box(1.05,.37,.20,.95,1.05,1.20,'#b9b39a');for(const z of [-.16,.54])rope([[.53,-.12,z],[.53,.94,z],[1.57,.94,z],[1.57,-.12,z]],.043);barrel(.9,-1.1);}
 group.add(v.build());group.userData.cargoType=['Merchant stores','Rum barrels','Salvaged provisions'][variant%3];return group;
}
export function makeShadow(w=9,h=22){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;void main(){float a=(1.-smoothstep(.2,.5,length((v-.5)*vec2(1.,.85))))*.3;gl_FragColor=vec4(.015,.17,.16,a);}'}));m.rotation.x=-Math.PI/2;m.position.y=-.1;return m;}
