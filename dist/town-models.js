import {Voxels} from './models.js';

// Every visible wall, tile and shop fitting remains an individual damageable voxel.
export function makeTownBuilding(b){
 const v=new Voxels(),{w,d,type,color,roof}=b,wood='#71583b',trim='#e0cda5',dark='#344840',iron='#414b43';
 const box=(x,y,z,sx,sy,sz,c=wood,rx=0,ry=0,rz=0)=>v.box(x,y,z,sx,sy,sz,c,rx,ry,rz);
 const tall=['tavern','manor'].includes(type),h=tall?4.8:type==='warehouse'?3.8:2.65;
 function wall(y,height,width=w,depth=d,c=color){for(let row=0;row<Math.ceil(height/.48);row++){const yy=y+(row+.5)*height/Math.ceil(height/.48);for(const side of [-1,1]){const nx=Math.ceil(width/.68),nz=Math.ceil(depth/.68);for(let j=0;j<nx;j++)box(-width/2+(j+.5)*width/nx,yy,side*(depth/2-.13),width/nx-.015,height/Math.ceil(height/.48)-.016,.26,c);for(let j=0;j<nz;j++)box(side*(width/2-.13),yy,-depth/2+(j+.5)*depth/nz,.26,height/Math.ceil(height/.48)-.016,depth/nz-.015,c);}}}
 function roofTiles(y,width=w,depth=d,c=roof,slope=.46){const span=width/2+.38,nz=Math.ceil((depth+.65)/.65);for(const side of [-1,1])for(let row=0;row<5;row++)for(let j=0;j<nz;j++){const x=(row+.5)*span/5;box(side*x,y+(span-x)*Math.tan(slope),-(depth+.65)/2+(j+.5)*(depth+.65)/nz,span/5/Math.cos(slope)+.015,.16,(depth+.65)/nz-.016,c,0,0,-side*slope);}for(let k=0;k<6;k++)for(const side of [-1,1])box(0,y+k*span*Math.tan(slope)/6,side*(depth/2-.04),width*(1-k/6),.25,.16,color);box(0,y+span*Math.tan(slope),0,.20,.2,depth+.8,trim);}
 function window(x,y,z=d/2+.025){box(x,y,z,.65,.85,.12,dark);for(const side of [-1,1])box(x+side*.44,y,z+.04,.22,.91,.1,type==='manor'?'#607e71':'#6e806d');box(x,y,z+.09,.06,.86,.07,trim);box(x,y,z+.10,.70,.06,.06,trim);box(x,y-.48,z+.03,.88,.11,.27,trim);}
 function barrel(x,z,y=.55){for(let j=0;j<5;j++)box(x,y+(j-2)*.19,z,.72-Math.abs(j-2)*.045,.18,.7-Math.abs(j-2)*.045,j===1||j===3?iron:'#947244');box(x,y+.5,z,.56,.06,.56,'#b08d59');}
 function sign(x,z,kind){box(x,2.6,z,.12,.9,.12);box(x+.55,2.92,z,1.2,.12,.13);box(x+.68,2.38,z,.96,.65,.17,'#3d594c');if(kind==='tavern'){box(x+.65,2.37,z+.10,.28,.36,.035,'#d7b766');box(x+.86,2.36,z+.10,.12,.24,.035,'#d7b766');}else{box(x+.67,2.38,z+.10,.09,.42,.04,'#dac59a');box(x+.67,2.31,z+.11,.45,.09,.04,'#dac59a');}}
 if(type==='stall'){
  for(const sx of [-1,1])for(const sz of [-1,1])box(sx*(w/2-.25),1.2,sz*(d/2-.25),.14,2.4,.14);
  for(let j=0;j<12;j++)box(-w/2+(j+.5)*w/12,2.35,0,w/12-.015,.13,d,j%2?'#a0ab87':'#d0bd8a',.06);
  box(0,.9,.35,w-.35,.15,1.1);for(let j=0;j<4;j++){box((j-1.5)*1.2,1.09,.35,.93,.20,.76,'#92764a');for(let k=0;k<3;k++)box((j-1.5)*1.2+(k-1)*.22,1.24,.35,.1,.08,.45,'#9baead',0,.15);}
 }else{
  const depth=Math.min(4,b.foundationDepth||.5);wall(-depth,depth+.25,w,d,'#9b9b84');box(0,.23,0,w+.24,.18,d+.24,'#bcb399');
  if(type==='shipwright'){
   for(const sx of [-1,1])for(const z of [-d/2+.25,0,d/2-.25])box(sx*(w/2-.2),1.65,z,.25,3.2,.25);wall(.35,1,w,d,'#877356');roofTiles(3.15,w,d,roof,.27);
   // Boat ribs and stacked timber beneath an open-sided workshop.
   for(let i=-3;i<=3;i++){box(0,.65,i*.47,1.8-Math.abs(i)*.26,.15,.18,'#bf9a60');for(const side of [-1,1])box(side*(.72-Math.abs(i)*.10),.95,i*.47,.13,.7,.15,'#ac854e',0,0,side*.3);}for(let j=0;j<5;j++)box(w*.32,.45+j*.18,0,.36,.14,d*.80,'#b38c54');
  }else{
   wall(.35,h);roofTiles(h+.42);
   box(0,1.25,d/2+.03,type==='warehouse'?2.5:.85,1.9,.12,type==='warehouse'?'#78613f':'#4e6356');
   for(const x of [-w*.31,w*.31])window(x,1.85);
   if(tall){for(const x of [-w*.31,0,w*.31])window(x,4.05);box(0,2.86,d/2+.29,w+.3,.17,.65);for(let j=0;j<8;j++)box(-w/2+(j+.5)*w/8,3.26,d/2+.50,.09,.7,.09);box(0,3.64,d/2+.5,w,.10,.12);for(const side of [-1,1])box(side*(w/2-.15),1.42,d/2+.42,.16,2.5,.17);}
   if(type==='tavern'){sign(-w*.40,d/2+.36,'tavern');barrel(w*.35,d*.16);}
   if(type==='warehouse'){for(const x of [-.62,.62])box(x,1.3,d/2+.14,.08,1.9,.06,iron);box(0,4.7,d/2+.25,.15,1.4,.16);box(0,5.3,d/2+.3,.18,.15,.55);box(0,3.9,d/2+.5,.05,2.5,.05,wood);for(const x of [-w*.32,w*.32])barrel(x,-d*.27);}
   if(type==='chandlery'){sign(-w*.38,d/2+.33,'anchor');for(let k=0;k<4;k++)box((k-1.5)*.7,.65,d/2+.38,.53,.52,.40,k%2?'#b8b397':'#927447');}
   if(type==='cooper'){for(let j=0;j<5;j++)barrel((j-2)*.88,d/2+.22,.55);}
   if(type==='customs'){box(0,2.45,d/2+.15,2,.42,.13,'#56776d');box(0,2.46,d/2+.23,.20,.25,.03,'#ddc58d');}
   if(type==='manor'){for(const side of [-1,1])box(side*(w/2-.2),2.5,d/2+.04,.31,4.6,.28,trim);box(0,5.02,d/2+.12,w+.15,.25,.35,trim);}
   if(type==='house'&&Number(b.id.split('-').at(-1))%2===0){for(let j=0;j<8;j++)box(-w/2+(j+.5)*w/8,2.2,d/2+.24,w/8-.02,.12,.67,j%2?'#829b87':'#c7ccb1',.12);}
   if(type==='chapel'){
    // Square bell tower rises from the rear of the nave; open bell chamber and cross.
    const tw=2.0,tz=-d/2+1.05;for(let row=0;row<12;row++)for(const side of [-1,1]){box(side*.88,3.8+row*.26,tz,.26,.25,tw,'#d4c9a7');box(0,3.8+row*.26,tz+side*.88,tw,.25,.26,'#d4c9a7');}
    for(const sx of [-1,1])for(const sz of [-1,1])box(sx*.8,7.2,tz+sz*.8,.24,1.45,.24,trim);box(0,7.8,tz,2.2,.22,2.2,roof);box(0,7.15,tz,.4,.55,.45,'#b49b59');box(0,8.45,tz,.12,1.2,.12,wood);box(0,8.7,tz,.7,.12,.12,wood);
   }else if(['house','tavern','manor'].includes(type)){box(-w*.26,h+1.12,-d*.24,.52,1.15,.57,'#b6b198');box(-w*.26,h+1.74,-d*.24,.67,.18,.7,'#d6c7a4');}
  }
 }
 const model=v.build();model.userData.building=b;return model;
}
