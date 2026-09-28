import {SHIP_CLASSES,gunStations} from './ship-classes.js';
import {wavePose} from './sea-state.js';

export const SHOT_GRAVITY=1.9;
export const GUN_ELEVATION={min:-14*Math.PI/180,max:12*Math.PI/180};
// Only elevation changes: the existing broadside direction and horizontal spread remain.
export function aimCannon(s,owner,muzzle,random=Math.random){
 const {x,y,z,dx,dz,speed}=muzzle,targets=owner===s?s.enemies:[s];let best=null;
 for(const target of targets){
  if(target.hull<=0)continue;const spec=SHIP_CLASSES[target.shipClass],fx=Math.sin(target.angle),fz=-Math.cos(target.angle);
  const extent=Math.hypot((fx*dx+fz*dz)*spec.length*.43,(-fz*dx+fx*dz)*spec.width*.5);
  let flight=Math.max(.12,((target.x-x)*dx+(target.z-z)*dz-extent*.65)/speed);
  const tx=target.x+(target.vx||0)*flight,tz=target.z+(target.vz||0)*flight,along=(tx-x)*dx+(tz-z)*dz,across=Math.abs((tx-x)*-dz+(tz-z)*dx);
  const halfWidth=Math.hypot((fx*-dz+fz*dx)*spec.length*.43,(-fz*-dz+fx*dx)*spec.width*.5);
  if(along<3||along>58||across>halfWidth+along*.035)continue;
  flight=Math.max(.12,(along-extent*.65)/speed);if(flight>2.8)continue;
  if(!best||along<best.along){const pose=wavePose(target,spec,s.seaTime??s.time),targetY=pose.y+gunStations(target.shipClass)[0].muzzleY*.77;best={target,along,flight,targetY};}
 }
 const fallback=.2+random()*1.05;if(!best)return{vy:fallback,elevation:Math.atan2(fallback,speed),target:null};
 const velocity=(best.targetY-y+.5*SHOT_GRAVITY*best.flight*best.flight)/best.flight;
 const elevation=Math.max(GUN_ELEVATION.min,Math.min(GUN_ELEVATION.max,Math.atan2(velocity,speed)+(random()+random()-1)*.025));
 return{vy:Math.tan(elevation)*speed,elevation,target:best.target===s?'player':best.target.id};
}
