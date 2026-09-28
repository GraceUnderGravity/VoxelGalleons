const separation=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function hoistPirateColours(s){
  if(s.status!=='playing')return false;
  const disguised=s.colours==='navy';s.colours='pirate';
  for(const e of [...s.enemies,...s.forts]){
    if(e.hull<=0||separation(e,s)>110)continue;
    if(!e.alerted&&disguised){e.surprisedUntil=s.time+3.5;e.cooldown=Math.max(e.cooldown,3.5);}
    e.alerted=true;
  }
  if(disguised)s.events.push({type:'colours',navy:false});
  return disguised;
}
export function toggleColours(s){
  if(s.status!=='playing')return false;
  if(s.colours==='navy')hoistPirateColours(s);
  else {s.colours='navy';s.events.push({type:'colours',navy:true});}
  return true;
}
export function recognizesPirate(s,e){
  if(e.hull<=0)return false;
  if(s.colours!=='navy'&&separation(e,s)<95)e.alerted=true;
  return !!e.alerted;
}
