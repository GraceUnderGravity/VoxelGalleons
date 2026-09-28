import * as THREE from './vendor/three.module.js';
import {clothController,squareCanvas,triangularCanvas,quadrilateralCanvas} from './canvas-cloth.js';
import {createMastFlag} from './flags.js';
import {Voxels} from './models.js';
import {makeGalleon} from './galleon.js';
import {SHIP_CLASSES} from './ship-classes.js';
import {seeded} from './simulation.js';

export function makeShipClass(id='galleon',navy=false){
  if(id==='galleon'){const model=makeGalleon(navy);model.scale.multiplyScalar(SHIP_CLASSES.galleon.modelScale);return model;}
  const c=SHIP_CLASSES[id],sloop=id==='sloop',frigate=id==='frigate',random=seeded(sloop?1141:frigate?2368:1219);
  const v=new Voxels(),rig=new Voxels(),cloth=new THREE.Group(),motion=clothController(),extras=new THREE.Group();
  const L=c.modelLength,half=c.modelWidth/2,deck=sloop?2.35:frigate?3.1:2.8,gunY=deck-.7;
  const wood=['#9d7140','#a77b47','#b48a50','#ae814a','#ba9057'],gold=['#ba955b','#c6a468','#d1b274'];
  const paint=navy?'#733d35':sloop?'#542f2c':frigate?'#193c3b':'#284848',wale=frigate?'#cec29a':sloop?'#c9a56b':'#c7a25b';
  const pick=a=>a[Math.floor(random()*a.length)];
  const width=z=>{const t=(z+L/2)/L;return half*Math.min(1,Math.pow(Math.max(.012,t/.24),.62),1-Math.max(0,t-.69)*1.02)*(1-.075*Math.pow((t-.47)*2,2));};
  const sheer=z=>Math.pow(Math.max(0,-z/L-.20),1.4)*2.3+Math.pow(Math.max(0,z/L-.22),1.3)*(sloop?.8:1.6);
  const guns=Array.from({length:c.cannons/2},(_,i)=>-L*.32+i*L*.64/(c.cannons/2-1));
  const axis=new THREE.Vector3(0,1,0),q=new THREE.Quaternion(),euler=new THREE.Euler();
  function rope(a,b,w=.028,color='#70674c',builder=rig){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av),p=av.clone().add(bv).multiplyScalar(.5);q.setFromUnitVectors(axis,d.clone().normalize());euler.setFromQuaternion(q);builder.box(p.x,p.y,p.z,w,d.length(),w,color,euler.x,euler.y,euler.z);}
  // Close-grained strakes follow a fine bow, rounded bilge and raked transom.
  const dz=.32,rows=11;
  for(let z=-L/2+.08;z<L/2;z+=dz){const w=width(z),rise=sheer(z);
    for(let j=0;j<rows;j++){const y=.05+j*(deck-.15)/(rows-1)+rise,t=j/(rows-1),wx=w*(.40+.60*Math.sin((.12+t*.88)*Math.PI/2))*(1-.035*t*t);
      for(const side of [-1,1]){const port=Math.abs(y-gunY)<.35&&guns.some(g=>Math.abs(z-g)<.37);if(!port)v.box(side*wx,y,z,.26,(deck-.15)/(rows-1)+.018,dz+.014,j<3?pick(wood):j<7?paint:j===7?wale:pick(wood));}
      if(j===0)v.box(0,y,z,wx*2,.22,dz+.018,'#674b30');
    }
    for(let x=-w+.18;x<w-.1;x+=.25)v.box(x,deck+rise,z,.238,.13,dz-.012,pick(wood));
    for(const side of [-1,1]){
      for(const y of [deck-.98,deck+.32])v.box(side*(w-.035),y+rise,z,.15,.11,dz+.01,y>deck?pick(gold):wale);
      if(Math.floor((z+L/2)/dz)%3===0)v.box(side*(w-.03),deck+.17+rise,z,.12,.53,.14,'#735936');
      v.box(side*(w-.03),deck+.48+rise,z,.18,.13,dz+.01,pick(gold));
    }
  }
  // Actual gun ports, inner carriages, banded muzzles and individual lids.
  for(const side of [-1,1])for(const z of guns){const w=width(z);
    v.box(side*(w-.18),gunY,z,.17,.71,.77,'#192520');
    for(const zz of [-.40,.40])v.box(side*(w+.035),gunY,z+zz,.13,.83,.10,wale);
    v.box(side*(w+.02),gunY-.39,z,.17,.11,.87,wale);
    v.box(side*(w+.11),gunY+.46,z,.55,.10,.85,pick(wood),0,0,side*.22);
    v.box(side*(w-.50),gunY-.05,z,.66,.36,.62,'#6a492c');
    v.box(side*(w+.13),gunY,z,.99,.23,.28,'#313c36');v.box(side*(w+.52),gunY,z,.10,.31,.34,'#575c4c');v.box(side*(w+.58),gunY,z,.02,.16,.19,'#121e1a');
    for(const zz of [-.31,.31])v.box(side*(w-.48),gunY-.22,z+zz,.20,.27,.13,'#4d432e');
  }
  // Raked stem, headrails, figurehead and bowsprit bindings.
  for(let j=0;j<9;j++)v.box(0,.32+j*.32,-L/2-.08-j*.022,.24,.34,.29,pick(wood));
  const bowspritTip=[0,deck+.88,-L/2-(sloop?4.4:5.2)];
  rope([0,deck+.15,-L*.36],bowspritTip,sloop?.17:.23,'#94703f');
  for(let k=0;k<4;k++)v.box(0,deck+.35+k*.10,-L/2-k*.6,.28,.24,.08,'#d3b47c',-.12);
  rope(bowspritTip,[0,.45,-L/2],.032);for(const side of [-1,1]){rope([side*.85,deck-.25,-L*.42],[side*.18,deck+.47,-L/2-2.1],.10,pick(gold));rope([side*.8,deck+.33,-L*.42],[side*.18,deck+.63,-L/2-2.1],.085,pick(gold));}
  if(!sloop){v.box(0,deck-.12,-L/2-.95,.22,.68,.25,'#d2b16b',-.3);v.box(0,deck+.27,-L/2-1.12,.24,.24,.29,'#e3c98a');}
  // A different stern silhouette for each class: low sloop, compact brig, long frigate gallery.
  const sternZ=L/2-.16,sternW=width(sternZ)*2,quarterStart=L*(sloop?.28:.24),quarterY=deck+(sloop?.43:frigate?1.04:.78);
  for(let z=quarterStart;z<sternZ+.12;z+=.32){const w=width(z);v.box(0,(deck+quarterY)/2,z,w*1.94,quarterY-deck,.33,paint);for(let x=-w+.13;x<w-.04;x+=.26)v.box(x,quarterY,z,.245,.14,.32,pick(wood));for(const side of [-1,1]){v.box(side*w,quarterY+.43,z,.16,.13,.34,pick(gold));if(Math.round(z/.32)%3===0)v.box(side*w,quarterY+.24,z,.10,.49,.12,pick(gold));}}
  const transom=sternZ+.20;
  v.box(0,deck-.25,transom,sternW,1.27,.24,paint,-.09);
  for(const y of [deck-.91,deck+.35,quarterY+.17])v.box(0,y,transom+.14,sternW+.18,.13,.28,pick(gold));
  const windows=sloop?3:frigate?7:5;
  for(let i=0;i<windows;i++){const x=(i-(windows-1)/2)*sternW/(windows+.3),w=sternW/(windows+1.4);
    v.box(x,deck-.19,transom+.15,w,.66,.10,'#274d49');v.box(x,deck-.16,transom+.23,w-.10,.47,.055,'#638276');
    for(const dx of [-w/2,w/2])v.box(x+dx,deck-.20,transom+.28,.07,.77,.09,pick(gold));v.box(x,deck-.15,transom+.29,.045,.62,.06,'#d4bb80');v.box(x,deck-.15,transom+.30,w,.047,.06,'#d4bb80');
  }
  if(frigate){for(const side of [-1,1]){v.box(side*sternW*.52,deck-.1,L*.42,.30,.85,L*.12,paint);v.box(side*sternW*.56,deck+.42,L*.42,.26,.13,L*.16,pick(gold));for(let z=L*.37;z<L*.49;z+=.48){v.box(side*sternW*.56,deck-.1,z,.08,.51,.30,'#57746b');v.box(side*sternW*.59,deck-.1,z+.18,.07,.66,.055,pick(gold));}}}
  for(const side of [-1,1]){const x=side*sternW*.45;v.box(x,quarterY+.52,transom,.11,.87,.12,'#514832');v.box(x,quarterY+.80,transom,.27,.36,.27,'#efd39a');v.box(x,quarterY+1.01,transom,.38,.10,.38,'#977545');}
  const stairX=-half*.48;for(let j=0;j<5;j++)v.box(stairX,deck+.07+j*(quarterY-deck)/5,quarterStart-.8+j*.18,.83,.12,.24,pick(gold));
  // Gratings, capstan, steering wheel, boats, anchors and deck fittings.
  for(const z of sloop?[-3.1,1.4]:[-L*.19,L*.11]){const w=sloop?1.1:1.65;v.box(0,deck+.1,z,w,.18,1.35,'#54482f');for(let x=-w/2+.08;x<w/2;x+=.19)v.box(x,deck+.22,z,.065,.085,1.24,'#b4955c');for(let zz=-.5;zz<=.5;zz+=.2)v.box(0,deck+.23,z+zz,w-.14,.08,.055,'#ad8a50');}
  const wheelZ=L*.35;v.box(.25,quarterY+.45,wheelZ,.16,.8,.16,'#805c33');
  const wheel=new THREE.Mesh(new THREE.TorusGeometry(sloop?.33:.43,.045,5,16),new THREE.MeshStandardMaterial({color:'#c3a16a',roughness:.9}));wheel.position.set(.25,quarterY+.84,wheelZ);extras.add(wheel);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,r=sloop?.44:.55;rope([.25,quarterY+.84,wheelZ],[.25+Math.sin(a)*r,quarterY+.84+Math.cos(a)*r,wheelZ],.055,'#b7935b');}
  v.box(0,deck+.35,-L*.32,.41,.62,.44,'#785737');for(const a of [0,Math.PI/2])v.box(0,deck+.61,-L*.32,1.45,.08,.10,'#b0925d',0,a);
  for(const side of [-1,1]){const x=side*width(-L*.37);rope([x,deck+.13,-L*.37],[x+side*.14,deck-1.30,-L*.35],.075,'#35433c');rope([x+side*.14,deck-1.30,-L*.35],[x+side*.40,deck-.96,-L*.35-.42],.095,'#35433c');rope([x+side*.14,deck-1.30,-L*.35],[x+side*.40,deck-.96,-L*.35+.42],.095,'#35433c');for(let j=0;j<4;j++)v.box(side*(half-.5),deck+.28,L*.16+j*.43,.60,.50,.37,j%2?'#887042':'#a7864c');}
  if(frigate){v.box(.15,deck+.25,2.5,1.05,.30,3.5,'#674c31');for(const side of [-1,1])v.box(.15+side*.52,deck+.51,2.5,.14,.35,3.45,'#c0a072');for(let z=1.1;z<4;z+=.5)v.box(.15,deck+.48,z,1.0,.08,.12,'#ae8b51');}
  const masts=sloop?[{z:-1.2,h:14.5,rows:[]}]:frigate?[{z:-7.1,h:18.4,rows:[[12.0,8.5,4.9],[15.7,6.6,2.9],[18.0,4.7,1.7]]},{z:.2,h:21.0,rows:[[13.1,10.1,5.8],[17.5,7.7,3.5],[20.6,5.2,2.2]]},{z:8.0,h:16.9,rows:[[12.4,6.8,4.3],[16.4,5.0,3.0]]}]:[{z:-4.35,h:15.2,rows:[[10.3,7.7,4.4],[13.4,5.8,2.5],[15.0,3.7,1.15]]},{z:3.65,h:17.0,rows:[[11.2,8.7,5.0],[14.7,6.6,2.8],[16.8,4.4,1.5]]}];
  for(const [mi,m]of masts.entries()){
    for(let y=deck;y<m.h;y+=.34){const t=(y-deck)/(m.h-deck),thick=(sloop?.28:.36)*(1-t*.55);rig.box(0,y,m.z,thick,.35,thick,Math.floor(y/.34)%7===0?'#c1a064':'#876139');}
    const nest=sloop?10.4:m.rows[0][0]+.47;
    if(!sloop){rig.box(0,nest,m.z+.32,1.15,.16,.90,'#755533');rig.box(0,nest+.12,m.z+.32,1.28,.10,1.01,'#b7955d');}
    for(const [top,w,h]of m.rows){rope([-w/2-.46,top+.12,m.z-.1],[w/2+.46,top+.12,m.z-.1],.18,'#98713d');for(const side of [-1,1]){v.box(side*(w/2+.35),top+.12,m.z-.1,.13,.25,.27,'#cfb077');rope([side*(w/2+.38),top+.13,m.z-.1],[0,Math.min(m.h,top+2.0),m.z],.026,'#a49672');rope([side*w*.455,top-h+.31,m.z-.2],[side*half*.90,deck+.35,m.z+.85],.026,'#a49672');}cloth.add(squareCanvas({z:m.z,top,width:w,height:h},motion));}
    const aft=sloop?-1:1;
    for(const side of [-1,1]){
      rig.box(side*(half+.03),deck-.16,m.z+aft*.95,.36,.12,2.0,'#6b5434');
      for(let j=0;j<4;j++){const z=m.z+aft*(.25+j*.45);v.box(side*half,deck+.10,z,.17,.22,.18,'#4c4735');rope([side*half,deck+.22,z],[side*.38,nest,m.z+aft*(.18+j*.16)],.03);}
      for(let y=deck+.48;y<nest;y+=.31){const t=(y-deck)/(nest-deck),x=side*(half*(1-t)+.38*t);rope([x,y,m.z+aft*(.25*(1-t)+.18*t)],[x,y-.025,m.z+aft*(1.6*(1-t)+.66*t)],.019,'#a18f69');}
    }
    rope([0,m.h,m.z],mi===0?bowspritTip:[0,masts[mi-1].h,masts[mi-1].z],.034);
  }
  if(sloop){
    const z=masts[0].z;cloth.add(quadrilateralCanvas([.12,11.55,z],[.12,13.0,5.5],[.12,3.55,6.0],[.12,3.3,z],motion,.78));
    rope([0,11.7,z],[0,13.13,5.65],.17,'#97703e');rope([0,3.28,z],[0,3.56,6.2],.17,'#97703e');rope([0,14.35,z],[0,13.13,5.65],.028);
    cloth.add(triangularCanvas([.10,14.0,z],[.10,13.08,5.42],[.10,11.83,z],motion,.24));
    cloth.add(triangularCanvas([-.1,11.8,z-.22],[-.1,deck+.82,-L/2-3.95],[-.1,deck+1.0,z-.28],motion,.44));rope([0,11.95,z],[0,deck+.82,-L/2-4.1],.027);
  }else{
    const fore=masts[0],last=masts.at(-1);
    cloth.add(triangularCanvas([-.1,fore.h-1.6,fore.z-.23],[-.1,deck+.82,-L/2-4.65],[-.1,deck+1.25,fore.z-.23],motion,.40));
    rope([0,fore.h-1.4,fore.z],[0,deck+.84,-L/2-4.8],.029);
    const endZ=L/2+.5;cloth.add(quadrilateralCanvas([.1,last.h-4.8,last.z+.18],[.1,last.h-3.6,endZ],[.1,quarterY+.6,endZ],[.1,quarterY+.45,last.z+.18],motion,.40));
    rope([0,last.h-4.7,last.z+.18],[0,last.h-3.5,endZ+.1],.13,'#95703f');rope([0,quarterY+.35,last.z],[0,quarterY+.6,endZ+.2],.12,'#95703f');
  }
  for(const [x,z]of [[-half*.47,-L*.2],[half*.48,L*.10],[half*.40,L*.36]]){const y=z>quarterStart?quarterY:deck;v.box(x,y+.29,z,.25,.58,.24,navy?'#8e4c3c':'#41615a');v.box(x,y+.7,z,.24,.26,.24,'#c6a478');v.box(x,y+.86,z,.44,.11,.33,'#30372b');}
  const group=v.build();group.scale.setScalar(c.modelScale);group.add(rig.build(),cloth,extras);group.userData.cloth=motion;group.userData.mainMastZ=masts[Math.min(1,masts.length-1)].z;group.userData.deckHeight=deck;
  group.userData.flags=masts.map((m,i)=>createMastFlag({height:m.h+.18,z:m.z,navy,pennant:i!==Math.min(1,masts.length-1),phase:i*1.7,scale:sloop?.85:1}));group.add(...group.userData.flags);group.userData.sinking=0;return group;
}

