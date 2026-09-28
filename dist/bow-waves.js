import {surfaceHeight} from './sea-state.js';

// Spray follows the meeting of moving hull and water, not a repeating timer.
export class BowWaves{
 constructor(){this.ships=new WeakMap();}
 update(ship,spec,pose,time){
  const fx=Math.sin(ship.angle),fz=-Math.cos(ship.angle),along=spec.length*.45;
  const x=ship.x+fx*along,z=ship.z+fz*along,water=surfaceHeight(x,z,time),bow=pose.y+along*Math.sin(pose.pitch+(ship.pitch||0));
  const depth=water-bow,speed=Math.hypot(ship.vx||0,ship.vz||0);
  let last=this.ships.get(ship);
  if(!last||time<last.time||Math.hypot(ship.x-last.x,ship.z-last.z)>spec.length*2){last={time,depth,next:time+.2,x:ship.x,z:ship.z};this.ships.set(ship,last);return null;}
  const dt=time-last.time;if(dt<=0)return null;
  const closing=(depth-last.depth)/dt;last.time=time;last.depth=depth;last.x=ship.x;last.z=ship.z;
  if(speed<1.8||depth<-.12||time<last.next)return null;
  const strength=Math.min(2.2,Math.max(0,depth*.65+closing*.18))*Math.min(1,speed/5);
  if(strength<.16)return null;
  last.next=time+.12+1/(12+strength*25);
  return {x,z,y:water+.12,fx,fz,strength,speed,beam:spec.width*.21,slam:closing>1.3&&depth>.12};
 }
}
