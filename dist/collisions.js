import {SHIP_CLASSES} from './ship-classes.js';
import {coastRadius} from './geography.js';

// Convex waterline hulls include the gunwale and gun projection, but not overhanging canvas.
export function hullPolygon(ship){
 const c=SHIP_CLASSES[ship.shipClass||'brig'],w=c.width*.5+.38,L=c.length,co=Math.cos(ship.angle),si=Math.sin(ship.angle);
 const points=[[0,-L*.52],[w*.63,-L*.41],[w,-L*.19],[w,L*.20],[w*.78,L*.51],[-w*.78,L*.51],[-w,L*.20],[-w,-L*.19],[-w*.63,-L*.41]];
 return points.map(([x,z])=>({x:ship.x+co*x-si*z,z:ship.z+si*x+co*z}));
}
const project=(points,n)=>{let min=Infinity,max=-Infinity;for(const p of points){const d=p.x*n.x+p.z*n.z;min=Math.min(min,d);max=Math.max(max,d);}return{min,max};};
export function closestHullPoint(ship,point){
 const polygon=hullPolygon(ship);let best=null,distance=Infinity;
 for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz))),p={x:a.x+dx*t,z:a.z+dz*t},d=Math.hypot(point.x-p.x,point.z-p.z);if(d<distance){distance=d;best=p;}}
 return best;
}
export function resolveShoreContact(ship,island){
 const c=SHIP_CLASSES[ship.shipClass||'brig'];if(Math.hypot(ship.x-island.x,ship.z-island.z)>island.r*1.23+c.length*.6+1)return false;
 let hit=false;
 for(let pass=0;pass<5;pass++){
  const polygon=hullPolygon(ship),samples=polygon.flatMap((p,i)=>{const q=polygon[(i+1)%polygon.length];return[p,{x:(p.x+q.x)/2,z:(p.z+q.z)/2}];});let deepest=0,n=null;
  for(const p of samples){const x=p.x-island.x,z=p.z-island.z,d=Math.hypot(x,z),penetration=coastRadius(island,Math.atan2(z,x))+.65-d;if(penetration>deepest){deepest=penetration;n={x:d?x/d:1,z:d?z/d:0};}}
  if(!n)break;ship.x+=n.x*(deepest+.025);ship.z+=n.z*(deepest+.025);hit=true;
 }
 return hit;
}
export function hullContact(a,b){
 const ca=SHIP_CLASSES[a.shipClass||'brig'],cb=SHIP_CLASSES[b.shipClass||'brig'];if(Math.hypot(a.x-b.x,a.z-b.z)>(ca.length+cb.length)*.58)return null;
 const pa=hullPolygon(a),pb=hullPolygon(b);let depth=Infinity,normal;
 for(const polygon of [pa,pb])for(let i=0;i<polygon.length;i++){
  const p=polygon[i],q=polygon[(i+1)%polygon.length],length=Math.hypot(q.x-p.x,q.z-p.z),n={x:-(q.z-p.z)/length,z:(q.x-p.x)/length},aa=project(pa,n),bb=project(pb,n);
  if(aa.max<=bb.min||bb.max<=aa.min)return null;
  const positive=aa.max-bb.min,negative=bb.max-aa.min,d=Math.min(positive,negative);if(d<depth){depth=d;normal=positive<negative?n:{x:-n.x,z:-n.z};}
 }
 // Opposed stem contacts use their shared centreline; choosing one sloping bow
 // face would create an arbitrary sideways kick in an otherwise head-on crash.
 const dx=b.x-a.x,dz=b.z-a.z,lateral=Math.abs(dx*Math.cos(a.angle)+dz*Math.sin(a.angle));
 if(Math.abs(Math.cos(a.angle-b.angle))>.96&&lateral<Math.min(ca.width,cb.width)*.12&&Math.hypot(dx,dz)>Math.min(ca.length,cb.length)*.55){
  const length=Math.hypot(dx,dz);normal={x:dx/length,z:dz/length};const aa=project(pa,normal),bb=project(pb,normal);depth=aa.max-bb.min;
 }
 const tangent={x:-normal.z,z:normal.x},aa=project(pa,normal),bb=project(pb,normal);
 const faceA=pa.filter(p=>aa.max-(p.x*normal.x+p.z*normal.z)<.04),faceB=pb.filter(p=>p.x*normal.x+p.z*normal.z-bb.min<.04),ta=project(faceA,tangent),tb=project(faceB,tangent);
 const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x)),along=(clamp((ta.min+ta.max)/2,tb.min,tb.max)+clamp((tb.min+tb.max)/2,ta.min,ta.max))/2,across=(aa.max+bb.min)/2;
 return{depth,normal,point:{x:normal.x*across+tangent.x*along,z:normal.z*across+tangent.z*along}};
}
function properties(body){const c=SHIP_CLASSES[body.shipClass||'brig'];return{mass:c.mass,inertia:c.mass*(c.length*c.length+c.width*c.width)/12};}
export function resolveShipContacts(bodies,islands=[]){
 const impacts=new Map();
 // Position separation is unconditional, including while impact damage is on cooldown.
 for(let iteration=0;iteration<7;iteration++){
 for(const body of bodies)for(const island of islands)resolveShoreContact(body,island);
 for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
  const a=bodies[i],b=bodies[j],contact=hullContact(a,b);if(!contact)continue;
  const {normal:n,point:p,depth}=contact,A=properties(a),B=properties(b),ia=1/A.mass,ib=1/B.mass;
  a.x-=n.x*(depth+.035)*ia/(ia+ib);a.z-=n.z*(depth+.035)*ia/(ia+ib);b.x+=n.x*(depth+.035)*ib/(ia+ib);b.z+=n.z*(depth+.035)*ib/(ia+ib);
  const ra={x:p.x-a.x,z:p.z-a.z},rb={x:p.x-b.x,z:p.z-b.z};
  const av={x:(a.vx||0)-(a.angularVelocity||0)*ra.z,z:(a.vz||0)+(a.angularVelocity||0)*ra.x},bv={x:(b.vx||0)-(b.angularVelocity||0)*rb.z,z:(b.vz||0)+(b.angularVelocity||0)*rb.x};
  const closing=-((bv.x-av.x)*n.x+(bv.z-av.z)*n.z);if(closing<=0)continue;
  const ar=ra.x*n.z-ra.z*n.x,br=rb.x*n.z-rb.z*n.x,impulse=closing*1.10/(ia+ib+ar*ar/A.inertia+br*br/B.inertia);
  a.vx=(a.vx||0)-impulse*n.x*ia;a.vz=(a.vz||0)-impulse*n.z*ia;b.vx=(b.vx||0)+impulse*n.x*ib;b.vz=(b.vz||0)+impulse*n.z*ib;
  a.angularVelocity=Math.max(-.35,Math.min(.35,(a.angularVelocity||0)-ar*impulse/A.inertia));b.angularVelocity=Math.max(-.35,Math.min(.35,(b.angularVelocity||0)+br*impulse/B.inertia));
  const tx=-n.z,tz=n.x,slide=((bv.x-av.x)*tx+(bv.z-av.z)*tz),friction=Math.max(-impulse*.24,Math.min(impulse*.24,slide/(ia+ib)));
  a.vx+=friction*tx*ia;a.vz+=friction*tz*ia;b.vx-=friction*tx*ib;b.vz-=friction*tz*ib;
  for(const body of [a,b])body.speed=Math.max(0,body.vx*Math.sin(body.angle)-body.vz*Math.cos(body.angle));
  const key=i+':'+j,old=impacts.get(key);if(!old||old.speed<closing)impacts.set(key,{a,b,speed:closing,point:p,normal:n});
 }
 }
 return [...impacts.values()];
}
