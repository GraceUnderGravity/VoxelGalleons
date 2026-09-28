import * as THREE from './vendor/three.module.js';
import { Voxels } from './models.js';
import { clothController, squareCanvas, triangularCanvas } from './canvas-cloth.js';
import { createMastFlag } from './flags.js';
import { seeded } from './simulation.js';

// Fine-grained, hand-shaped voxel construction. Bow is -Z; the main deck is Y=3.7.
export function makeGalleon(navy=false){
  const random=seeded(navy?324:1715),v=new Voxels();
  const wood=navy?['#a57944','#ad814c','#b38750','#bb8e54','#986c3b']:['#414441','#454742','#494944','#4c4c46','#3d403e'];
  const darkWood=navy?['#685033','#735434','#7d5935']:['#262d2d','#2c3231','#333835'];
  const gold=navy?['#caa260','#d4ad69','#dfbb79','#b78d4e']:['#666860','#737268','#7a786b','#5b605a'];
  const navyPaint=navy?['#893d2e','#79372b','#994a32']:['#232c2e','#283133','#2c3536'];
  const pick=a=>a[Math.floor(random()*a.length)];
  const hullWidth=z=>{
    if(z<-6)return 4.15*Math.sqrt(Math.max(0,(z+11.6)/5.6));
    if(z>5.5)return 4.15-(z-5.5)*.26;
    return 4.15-Math.pow(z/12,2)*.25;
  };
  // Individual strakes follow both the hull's sheer and its curved cross-section.
  for(let iz=0;iz<48;iz++){
    const z=-11.15+iz*.45,half=hullWidth(z),sheer=Math.max(0,(-z-6)*.10)+Math.max(0,(z-4)*.075);
    for(let row=0;row<9;row++){
      const y=.10+row*.41+sheer,fullness=.43+.57*Math.sin((row+1)/10*Math.PI*.52),w=half*fullness;
      for(const side of [-1,1]){
        const color=row===3||row===4?pick(navyPaint):row===5||row===8?pick(gold):pick(wood);
        v.box(side*w,y,z,.46,.43,.47,color);
        if(row===5)v.box(side*(w+.16),y+.05,z,.18,.13,.47,pick(gold));
      }
      if(iz===0||iz===47)v.box(0,y,z,Math.max(.35,w*2),.43,.45,row===3||row===4?pick(navyPaint):pick(wood));
      if(row===0)v.box(0,y,z,w*2,.42,.46,pick(darkWood));
    }
    // Deck planks are inset in the hull; staggered joints avoid a checkerboard deck.
    for(let x=-half+.3;x<half-.15;x+=.38){
      v.box(x,3.62+sheer,z,.365,.16,.448,pick(wood));
    }
    for(const side of [-1,1]){
      v.box(side*(half+.02),4.09+sheer,z,.28,.18,.47,pick(gold));
      if(iz%2===0){v.box(side*half,3.91+sheer,z,.18,.63,.19,pick(darkWood));v.box(side*half,4.35+sheer,z,.26,.18,.27,pick(gold));}
    }
  }
  // Stem, gilded beakhead and the rising bow platform.
  for(let j=0;j<8;j++){v.box(0,.6+j*.47,-11.6-j*.055,.55,.5,.7,pick(wood));}
  for(let j=0;j<11;j++){const z=-10.9-j*.29;v.box(0,3.46+j*.08,z,.55,.22,.36,pick(gold));if(j<7)for(const side of [-1,1])v.box(side*(.82-j*.09),3.7+j*.08,z,.17,.25,.33,pick(gold));}
  v.box(0,4.28,-13.1,.25,.26,7.9,(navy?'#9e7640':'#4c524a'),-.18);
  v.box(0,4.27,-14.1,.39,.39,.21,(navy?'#d5b678':'#929381'));
  v.box(0,3.04,-12.9,.4,.66,.5,(navy?'#d6af62':'#717b6c'),-.25);
  v.box(0,3.60,-13.2,.38,.48,.4,(navy?'#e0bd72':'#85907e'));
  v.box(0,3.92,-13.28,.25,.24,.3,(navy?'#e9ca83':'#a3aa94'));
  if(navy){
  // Raised quarterdeck and an ornate, projecting stern gallery.
  for(let z=5.7;z<=10;z+=.4){const w=hullWidth(Math.min(z,10));v.box(0,4.34,z,w*1.95,1.28,.42,pick(darkWood));v.box(0,5.08,z,w*2.02,.2,.42,pick(wood));for(const side of [-1,1]){v.box(side*w,5.45,z,.24,.18,.42,pick(gold));if(Math.round(z*5)%4===0)v.box(side*w,5.31,z,.19,.52,.2,pick(gold));}}
  v.box(0,4.45,10.27,5.95,1.60,.34,'#705137');
  for(const y of [3.69,4.03,5.12,5.5])v.box(0,y,10.52,y===5.5?5.65:6.25,.16,.42,pick(gold));
  for(let j=-3;j<=3;j++){
    const x=j*.76;
    v.box(x,4.57,10.48,.53,.73,.13,'#243d39');
    v.box(x,4.59,10.57,.42,.59,.09,'#597b70');
    v.box(x-.28,4.57,10.64,.09,.86,.12,'#d6b675');v.box(x+.28,4.57,10.64,.09,.86,.12,'#d6b675');
    v.box(x,4.58,10.66,.06,.71,.09,'#c5a36a');v.box(x,4.58,10.67,.5,.07,.09,'#c5a36a');
    v.box(x,3.83,10.73,.24,.24,.2,'#ddb875',0,0,Math.PI/4);
  }
  for(const side of [-1,1]){
    for(let z=7;z<10;z+=.8){v.box(side*3.65,4.4,z,.12,.66,.47,'#547467');v.box(side*3.75,4.4,z,.1,.73,.07,'#cfad6b');}
    v.box(side*3.75,4.9,8.5,.25,.15,3.6,'#d4ae6d');
    // Lanterns, brackets and stern scrollwork.
    v.box(side*3.15,5.62,10.5,.18,.9,.2,'#604b32');v.box(side*3.15,6.06,10.5,.53,.16,.53,'#b28a4c');
    v.box(side*3.15,5.81,10.5,.4,.43,.4,'#f4d99b');v.box(side*3.15,5.53,10.5,.53,.15,.53,'#a08043');
    for(let j=0;j<4;j++)v.box(side*(2.65+j*.14),3.1+j*.24,10.35+j*.1,.24,.32,.3,pick(gold));
  }
  }else{
    // The Pearl's raised sterncastle: a low waist rising into a curved, glazed gallery.
    for(let z=5.7;z<=10;z+=.38){const w=hullWidth(Math.min(z,10)),rise=Math.max(0,z-7)*.22;
      v.box(0,4.34+rise/2,z,w*1.93,1.28+rise,.39,pick(darkWood));v.box(0,5.08+rise,z,w*1.98,.18,.39,pick(wood));
      for(const side of [-1,1]){v.box(side*w,5.55+rise,z,.17,.16,.39,pick(gold));v.box(side*w,5.32+rise,z,.10,.53,.12,pick(darkWood));}
    }
    v.box(0,5.10,10.28,6.20,2.6,.35,'#303837');
    for(const y of [3.9,4.14,6.30,6.52])v.box(0,y,10.57,6.6,.15,.46,pick(gold));
    // Tall arched windows, inset amber glass, dark mullions and carved pilasters.
    for(let j=-2;j<=2;j++){
      const x=j*1.13;v.box(x,5.16,10.50,.84,1.43,.12,'#17292b');
      v.box(x,5.10,10.60,.68,1.24,.05,'#68817b');
      for(const side of [-1,1])v.box(x+side*.46,5.15,10.67,.14,1.59,.16,'#62685f');
      for(let k=0;k<9;k++){const a=k/8*Math.PI;v.box(x+Math.cos(a)*.44,5.69+Math.sin(a)*.40,10.68,.16,.15,.18,'#74776a');}
      v.box(x,5.12,10.70,.07,1.25,.08,'#333d39');for(const y of [4.78,5.16,5.54])v.box(x,y,10.71,.80,.055,.07,'#3b4540');
      v.box(x,4.25,10.75,.29,.30,.26,'#646b62',0,0,Math.PI/4);
    }
    // Sloped gallery canopy; overlapping weathered boards follow its barrel curve.
    for(let j=-13;j<=13;j++){const x=j*.25,y=6.61+.35*(1-Math.pow(x/3.4,2));v.box(x,y,9.65,.26,.18,2.15,pick(wood),0,0,-x*.06);}
    for(const side of [-1,1]){
      for(let z=7.9;z<=10.25;z+=.48){v.box(side*3.52,5.22,z,.16,1.11,.35,'#4d6964');v.box(side*3.65,5.22,z,.13,1.30,.10,'#656c62');}
      for(const y of [4.45,5.92,6.12])v.box(side*3.65,y,9.07,.35,.16,3.15,pick(gold));
      // Long scroll brackets under projecting side galleries.
      for(let k=0;k<8;k++)v.box(side*(2.70+k*.13),3.25+k*.16,10.25,.22,.25,.43,pick(gold));
      // Paired stern lanterns, complete cages and pyramidal caps.
      const x=side*2.86;v.box(x,7.02,10.18,.17,1.2,.17,'#444d47');
      v.box(x,7.50,10.18,.64,.84,.64,'#c3b681');
      for(const sx of [-1,1])for(const sz of [-1,1])v.box(x+sx*.33,7.50,10.18+sz*.33,.065,1,.065,'#303a37');
      for(const y of [7.06,7.45,7.95])v.box(x,y,10.18,.81,.09,.81,'#656e60');
      for(let k=0;k<4;k++)v.box(x,8.02+k*.10,10.18,.77-k*.16,.12,.77-k*.16,'#545e53');
    }
    // A winged maiden beneath the long bowsprit, carved from weathered timber.
    v.box(0,3.52,-13.03,.42,1.16,.43,'#7e8275',-.36);v.box(0,4.21,-13.32,.35,.43,.36,'#999a87');
    for(const side of [-1,1])for(let k=0;k<7;k++){v.box(side*(.28+k*.14),3.99+k*.09,-12.96+k*.12,.19,.49-k*.025,.20,k%2?'#737d70':'#8a9080',-.6,side*.3,side*.65);}
    for(const side of [-1,1])v.box(side*.30,4.05,-13.46,.16,.62,.17,'#919584',-.8,0,side*.4);
  }
  // Seven gun ports and complete cannons on each side.
  for(const side of [-1,1])for(let i=0;i<7;i++){
    const z=-6+i*1.8,w=hullWidth(z);
    v.box(side*(w*.91+.15),2.41,z,.12,.70,.83,'#171f1e');
    v.box(side*(w*.91+.22),2.86,z,.65,.11,.87,pick(wood),0,0,side*.15);
    v.box(side*(w*.91+.43),2.46,z,1.12,.36,.38,'#343c39');
    v.box(side*(w*.91+.94),2.46,z,.12,.44,.46,'#424941');
    v.box(side*(w*.91+1.01),2.46,z,.04,.23,.24,'#131c1c');
    {v.box(side*(w-.8),3.88,z,.82,.35,.7,(navy?'#705031':'#49463b'));v.box(side*(w-.45),4.1,z,1.05,.25,.29,'#39413a');}
  }
  // Cargo hatches, gratings, stairs, bollards, coils, and a capstan.
  for(const z of [-3,3.6]){v.box(0,3.77,z,2.3,.18,1.6,(navy?'#644c2f':'#2b3430'));for(let i=-4;i<=4;i++)v.box(i*.23,3.89,z,.10,.11,1.47,(navy?'#b39459':'#70705e'));for(let j=-2;j<=2;j++)v.box(0,3.90,z+j*.25,2.1,.1,.09,(navy?'#9a7d45':'#505b4d'));}
  for(let i=0;i<6;i++)v.box(-1.8,3.7+i*.23,4.8+i*.21,1.05,.2,.25,(navy?'#c3a064':'#757565'));
  v.box(.8,5.45,8,.30,.70,.30,(navy?'#8d683a':'#494f44'));v.box(.8,5.8,8,1.13,.16,.17,(navy?'#c8a467':'#828575'));
  for(const [x,z]of [[2,-7],[-2,-7],[2.1,4],[-2,2]]){v.box(x,3.95,z,.64,.55,.63,(navy?'#886437':'#65624c'));v.box(x,4.13,z,.68,.08,.67,(navy?'#5f533a':'#3b453c'));v.box(x,3.80,z,.68,.08,.67,(navy?'#5f533a':'#3b453c'));}
  for(const [x,z]of [[2,8],[-2,8],[1,-8],[-1,-8]])v.box(x,z>5?5.36:3.93,z,.28,.52,.28,(navy?'#7c643d':'#646958'));
  const g=v.build();
  if(!navy){
    for(const mesh of g.children)if(mesh.material.color.getHexString()==='c3b681'){mesh.material=mesh.material.clone();mesh.material.emissive=new THREE.Color('#ffb95a');mesh.material.emissiveIntensity=2.3;}
    for(const side of [-1,1]){const light=new THREE.PointLight('#ffbd70',20,8,2);light.position.set(side*2.86,7.4,10.7);g.add(light);}
  }
  const rig=new THREE.Group(),ropeMat=new THREE.MeshLambertMaterial({color:'#5e5740'}),lightRope=new THREE.MeshLambertMaterial({color:'#a89771'});
  function beam(a,b,w,color=ropeMat){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),dir=bv.clone().sub(av);const m=new THREE.Mesh(new THREE.BoxGeometry(w,dir.length(),w),color);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());m.castShadow=true;rig.add(m);}
  const masts=[{z:-6.2,h:15.6,sails:[[12.0,8.8,4.9],[15,6.6,2.5]]},{z:.1,h:19.2,sails:[[12.9,10.7,5.8],[16.8,8.4,3.2],[19.0,5.8,1.8]]},{z:6.15,h:16.3,sails:[[11.5,8.0,4.2],[14.8,6.2,2.8]]}];
  const spars=new Voxels(),cloth=new THREE.Group(),clothMotion=clothController(navy?{}:{color:'#515a60',weathering:.24});
  for(const [mi,mast]of masts.entries()){
    const {z,h}=mast;
    for(let j=0;j<(h-3.5)/.4;j++){const y=3.5+j*.4,thick=y>h*.72?.24:.37;spars.box(0,y,z,thick,.42,thick,y%1>.75?(navy?'#d0ad70':'#737465'):(navy?'#94703e':'#4a4e45'));}
    const nest= mast.sails[0][0]+.45;spars.box(0,nest,z+.45,1.35,.16,.95,(navy?'#6d5431':'#333c36'));spars.box(0,nest+.13,z+.45,1.48,.12,1.06,(navy?'#bd975d':'#717765'));
    for(const [si,[top,width,height]] of mast.sails.entries()){
      const yardZ=z-.08;
      spars.box(0,top+.16,yardZ,width+1.25,.22,.24,(navy?'#9b723d':'#484e47'));
      for(const side of [-1,1]){spars.box(side*(width/2+.42),top+.16,yardZ,.2,.31,.34,(navy?'#d2b179':'#8b8c7b'));beam([side*(width/2+.6),top+.17,yardZ],[0,Math.min(h,top+2.3),z],.043,lightRope);}
      cloth.add(squareCanvas({z,top,width,height},clothMotion));
      for(const side of [-1,1])beam([side*width*.46,top-height+.3,z-.23],[side*2.8,3.95,z+1.2],.036,lightRope);
    }
    // Shrouds and ratlines stand aft of the sail, anchored to the channels and fighting top.
    for(const side of [-1,1]){
      for(let j=0;j<4;j++){
        beam([side*3.75,3.82,z+.35+j*.48],[side*.45,nest,z+.22+j*.20],.041);
        spars.box(side*3.75,3.75,z+.35+j*.48,.23,.26,.22,(navy?'#514733':'#3d453b'));
      }
      const steps=Math.floor((nest-3.9)/.34);
      for(let j=1;j<steps;j++){const t=j/steps,x=side*(3.75*(1-t)+.45*t),y=3.9+(nest-3.9)*t;
        beam([x,y,z+.35*(1-t)+.22*t],[x,y-.035,z+1.79*(1-t)+.82*t],.024,lightRope);
      }
    }
    if(mi===0)beam([0,h,z],[0,4.8,-16.5],.042);
    else beam([0,h,z],[0,masts[mi-1].h,masts[mi-1].z],.043);
    const flag=createMastFlag({height:h+.1,z,navy,pennant:mi!==1,phase:mi*1.7});
    if(!navy)flag.userData.setNavy(false);g.add(flag);(g.userData.flags??=[]).push(flag);
  }
  // Triangular headsail below the bowsprit stays, and a lateen sail aft.
  cloth.add(triangularCanvas([-.12,13.1,-6.5],[-.12,4.35,-15.7],[-.12,5.25,-6.5],clothMotion,.45));
  beam([0,13.7,-6.2],[0,4.3,-16.1],.045,lightRope);
  beam([0,4.3,-16.1],[0,2.1,-10.8],.055);
  cloth.add(triangularCanvas([.12,12.3,6.25],[.12,10.1,10.55],[.12,6.4,6.25],clothMotion,.4));
  beam([0,13.1,6.15],[0,9.6,10.6],.16,new THREE.MeshLambertMaterial({color:(navy?'#9e7944':'#596152')}));
  g.add(spars.build(),cloth,rig);g.userData.cloth=clothMotion;
  // Sailors make the deck's scale readable; keep them small beside the guns.
  const crew=new Voxels();
  for(const [x,z]of [[-2,-4],[2.3,-1],[-1.8,1.5],[1.7,7.6]]){const y=z>5?5.2:3.76;crew.box(x,y+.3,z,.29,.65,.27,navy?'#9a4f3a':'#426566');crew.box(x,y+.75,z,.29,.3,.29,'#c3a074');crew.box(x,y+.94,z,.54,.14,.4,'#313b2d');crew.box(x-.09,y-.02,z,.12,.18,.22,'#403c2c');crew.box(x+.09,y-.02,z,.12,.18,.22,'#403c2c');}
  g.add(crew.build());g.userData.sinking=0;g.scale.x=.80;
  g.userData.blackPearl=!navy;return g;
}

