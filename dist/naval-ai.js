import {SHIP_CLASSES} from './ship-classes.js';
import {coastRadius} from './geography.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const angle=(x,z)=>Math.atan2(x,-z);
const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

// A tangent approach establishes a gun-bearing course before entering cannon range.
// Keep the chosen passing side through the whole engagement, including reloads.
export function navalHelm(e,target,ships,islands,time,hostile=true){
  const spec=SHIP_CLASSES[e.shipClass],dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz)||.001;
  let hx,hz,speed=3.1,mode='patrol';
  if(hostile&&d<125){
    const rx=dx/d,rz=dz/d;
    if(!e.passingSide){const clockwise=angle(-rz,rx);e.passingSide=Math.abs(delta(clockwise,e.angle))<Math.abs(delta(clockwise+Math.PI,e.angle))?1:-1;}
    const range=34+spec.width*.35+SHIP_CLASSES[target.shipClass].width*.35;
    const radial=clamp((d-range)/21,-1.6,1.1),targetSpeed=Math.hypot(target.vx||0,target.vz||0);
    if(targetSpeed>1.2){
      // Sailing targets are met on a parallel flank. Circling a moving centre
      // would eventually take a ship across the target's bow.
      const fx=target.vx/targetSpeed,fz=target.vz/targetSpeed,rightX=-fz,rightZ=fx;
      if(!e.flank)e.flank=Math.sign((e.x-target.x)*rightX+(e.z-target.z)*rightZ)||e.passingSide;
      const slotX=target.x+rightX*range*e.flank,slotZ=target.z+rightZ*range*e.flank;
      hx=target.vx+(slotX-e.x)*.14;hz=target.vz+(slotZ-e.z)*.14;
    }else{hx=(-rz*e.passingSide+rx*radial)*3.5;hz=(rx*e.passingSide+rz*radial)*3.5;}
    speed=clamp(Math.hypot(hx,hz),2.3,5.6);
    mode=d<range-8?'open-range':d>range+12?'approach':'broadside';
  }else{
    const phase=time*.025+Number(e.id||0);hx=(e.homeX??e.x)+Math.sin(phase)*24-e.x;hz=(e.homeZ??e.z)+Math.cos(phase)*24-e.z;
  }
  let desired=angle(hx,hz),evade=false;
  // Predict closest approach using both ships' momentum, not just present distance.
  for(const other of ships){
    if(other===e||other.hull<=0)continue;
    const ox=other.x-e.x,oz=other.z-e.z,sep=Math.hypot(ox,oz)||.001;
    const rvx=(other.vx||0)-(e.vx||0),rvz=(other.vz||0)-(e.vz||0),v2=rvx*rvx+rvz*rvz;
    const ahead=clamp(-(ox*rvx+oz*rvz)/(v2||1),0,9);
    const closest=Math.hypot(ox+rvx*ahead,oz+rvz*ahead);
    const clearance=(spec.length+SHIP_CLASSES[other.shipClass].length)*.46+5;
    if(sep<clearance+8||(ahead>.1&&closest<clearance&&sep<85)){
      const bearing=angle(ox,oz),side=Math.sign(Math.sin(bearing-e.angle))||e.passingSide||1;
      const away=bearing-side*(sep<clearance?2.05:1.65);
      // Braking gives the large hull time to turn without losing its existing drift.
      desired=away;
      speed=Math.cos(bearing-e.angle)<-.3?5.6:Math.min(speed,sep<clearance?1.2:2.0);
      evade=true;mode='give-way';
    }
  }
  for(const island of islands){
    const ix=e.x-island.x,iz=e.z-island.z,dist=Math.hypot(ix,iz),a=Math.atan2(iz,ix);
    const radius=coastRadius(island,a)+spec.length*.5+5;
    const futureX=ix+Math.sin(desired)*22,futureZ=iz-Math.cos(desired)*22;
    if(dist<radius||Math.hypot(futureX,futureZ)<coastRadius(island,Math.atan2(futureZ,futureX))+spec.length*.5+5){
      const outward=angle(ix,iz),offset=dist<radius?.55:1.15;
      const left=outward-offset,right=outward+offset;
      desired=Math.abs(delta(left,desired))<Math.abs(delta(right,desired))?left:right;
      speed=Math.min(speed,2.7);evade=true;mode='clear-shoal';
    }
  }
  // Reduce sail while making a large alteration of course. No pivoting on the spot.
  const error=delta(desired,e.angle);speed*=clamp(1-Math.abs(error)*.23,.35,1);
  return {heading:desired,speed,turn:clamp(error*.65,-.26*spec.turn,.26*spec.turn),mode,evade};
}

export function broadsideClear(e,target,ships,islands){
  const dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz);
  if(d<22||d>53||Math.abs(Math.sin(angle(dx,dz)-e.angle))<.94)return false;
  const obstructed=(x,z,r)=>{const t=((x-e.x)*dx+(z-e.z)*dz)/(d*d);return t>.05&&t<.98&&Math.hypot(x-e.x-dx*t,z-e.z-dz*t)<r;};
  for(const other of ships)if(other!==e&&other!==target&&other.hull>0&&obstructed(other.x,other.z,SHIP_CLASSES[other.shipClass].length*.52+2))return false;
  for(const i of islands){for(let n=1;n<12;n++){const t=n/12,x=e.x+dx*t-i.x,z=e.z+dz*t-i.z;if(Math.hypot(x,z)<coastRadius(i,Math.atan2(z,x))+1)return false;}}
  return true;
}
