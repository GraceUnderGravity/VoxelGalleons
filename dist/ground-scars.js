import * as THREE from './vendor/three.module.js';
import {landHeightAt} from './settlements.js';

// Small earthen divots hug the terrain; bounded so long bombardments stay cheap.
export class GroundScars{
 constructor(scene){this.scene=scene;this.marks=[];this.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});}
 impact(point){
  if(!Number.isFinite(landHeightAt(point.x,point.z)))return;
  const positions=[],colors=[],indices=[],color=new THREE.Color(),n=12,radius=.85+Math.random()*.4;
  positions.push(point.x,landHeightAt(point.x,point.z)+.045,point.z);color.set('#5d5a43');colors.push(color.r,color.g,color.b);
  for(let j=0;j<n;j++){const angle=j/n*Math.PI*2,r=radius*(.73+Math.random()*.30),x=point.x+Math.cos(angle)*r,z=point.z+Math.sin(angle)*r,y=landHeightAt(x,z);positions.push(x,(Number.isFinite(y)?y:point.y)+.035,z);color.set(j%3?'#887654':'#a18b61');colors.push(color.r,color.g,color.b);indices.push(0,(j+1)%n+1,j+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mark=new THREE.Mesh(geometry,this.material);mark.receiveShadow=true;mark.renderOrder=1;this.scene.add(mark);this.marks.push(mark);
  if(this.marks.length>80){const old=this.marks.shift();this.scene.remove(old);old.geometry.dispose();}
 }
 clear(){for(const m of this.marks){this.scene.remove(m);m.geometry.dispose();}this.marks.length=0;}
}
