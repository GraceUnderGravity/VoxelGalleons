import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,step,fireBroadside,buyUpgrade,devAction,changeShipClass,nearestHarbor,ISLANDS,CARGO,WORLD_LIMIT,RELOAD_TIME,setSails} from '../dist/simulation.js';
import {UPGRADES,upgradeEffects,upgradeLevel} from '../dist/upgrades.js';
import {harborApproach,shoreDistance,fortLocal,terrainHeight} from '../dist/geography.js';
import {SHIP_CLASSES} from '../dist/ship-classes.js';
import {hullPolygon} from '../dist/collisions.js';
const atSea=(id='galleon')=>{const s=createState(id);Object.assign(s,{x:0,z:10,enemies:[],forts:[],started:true});return s;};
const tick=(s,n)=>{for(let i=0;i<n*60;i++)step(s,1/60);};

test('shop spends the displayed price, requires a harbour, and caps each upgrade',()=>{
 const s=createState();s.gold=250;assert.equal(buyUpgrade(s,'hull'),true);assert.equal(s.gold,0);assert.equal(upgradeLevel(s,'hull'),1);assert.equal(buyUpgrade(s,'hull'),false);assert.equal(buyUpgrade(s,'unknown'),false);
 s.gold=10000;Object.assign(s,{x:0,z:10});assert.equal(buyUpgrade(s,'sails'),false);Object.assign(s,harborApproach(ISLANDS[0]));
 for(const [id,u]of Object.entries(UPGRADES)){while(upgradeLevel(s,id)<u.costs.length){const before=s.gold,cost=u.costs[upgradeLevel(s,id)];assert.equal(buyUpgrade(s,id),true);assert.equal(s.gold,before-cost);}const before=s.gold;assert.equal(buyUpgrade(s,id),false);assert.equal(s.gold,before);}
});
test('developer grants work without gold and reset or survive ship changes as expected',()=>{
 const s=atSea();s.hull=60;s.cargo=2;assert.equal(devAction(s,'upgrade','hull'),true);assert.equal(s.gold,0);assert.equal(devAction(s,'upgrade','unknown'),false);
 devAction(s,'gold');assert.equal(s.gold,1000);devAction(s,'max');const levels={...s.upgrades};changeShipClass(s,'sloop');assert.deepEqual(s.upgrades,levels);assert.equal(s.hull,60);assert.equal(s.cargo,2);
 assert.equal(devAction(s,'upgrade','hull'),false);devAction(s,'repair');assert.equal(s.hull,100);devAction(s,'reset');assert.deepEqual(s.upgrades,{});assert.equal(s.cannonRefit,false);s.status='lost';assert.equal(devAction(s,'max'),false);assert.equal(buyUpgrade(s,'hull'),false);
});
test('upgrade effects change actual sailing, reload and incoming damage without free healing',()=>{
 const base=atSea(),up=atSea();devAction(up,'max');
 for(const s of [base,up]){s.angle=0;setSails(s,3);tick(s,8);}assert.ok(up.speed>base.speed*1.1);
 for(const s of [base,up]){s.cooldown=0;fireBroadside(s);assert.ok(s.salvos.every(g=>g.fireAt-s.time<=1));}
 assert.equal(base.cooldown,RELOAD_TIME);assert.ok(up.cooldown<base.cooldown*.85);assert.ok(up.salvos[0].damage<=base.salvos[0].damage*1.151);
 const plain=atSea(),armored=atSea();devAction(armored,'max');
 for(const s of [plain,armored]){s.projectiles=[{x:0,z:10,y:2,vx:1,vz:0,vy:0,life:1,owner:0,damage:10}];step(s,.016);}
 assert.ok(100-armored.hull<(100-plain.hull)*.75);assert.ok(upgradeEffects(up).speed<=1.15);
});
test('all new harbours fit every hull, and distant shores cannot open the shop',()=>{
 for(const island of ISLANDS.filter(i=>i.port))for(const id of Object.keys(SHIP_CLASSES)){
  const s=createState(id);devAction(s,'harbor',island.seed);assert.equal(nearestHarbor(s),island);
  for(let i=0;i<16;i++){s.angle=i*Math.PI/8;for(const p of hullPolygon(s))for(const land of ISLANDS)assert.ok(shoreDistance(land,p.x-land.x,p.z-land.z)>1,`${island.name} ${id}`);}
 }
 const s=createState();s.x=ISLANDS[0].x;s.z=ISLANDS[0].z-ISLANDS[0].r-10;assert.equal(nearestHarbor(s),null);
});
test('larger chart keeps cargo and patrol spawn hulls in open navigable water',()=>{
 const state=createState();
 for(const p of CARGO){assert.ok(Math.abs(p.x)<WORLD_LIMIT&&Math.abs(p.z)<WORLD_LIMIT);for(const i of ISLANDS)assert.ok(shoreDistance(i,p.x-i.x,p.z-i.z)>15);}
 for(const ship of [state,...state.enemies])for(const p of hullPolygon(ship))for(const i of ISLANDS)assert.ok(shoreDistance(i,p.x-i.x,p.z-i.z)>1);
 for(const island of ISLANDS.filter(i=>i.kind==='navy-fort')){const p=fortLocal(island);assert.equal(terrainHeight(island,p.x,p.z),2.3);assert.ok(-shoreDistance(island,p.x,p.z)<30);}
});
test('fleet dimensions and gun stations follow the same scale for either faction',()=>{
 assert.ok(SHIP_CLASSES.galleon.length>SHIP_CLASSES.frigate.length);assert.ok(SHIP_CLASSES.galleon.length>SHIP_CLASSES.sloop.length*2.5);
 for(const [id,c]of Object.entries(SHIP_CLASSES)){
  assert.equal(c.length,c.modelLength*c.modelScale);assert.equal(c.width,c.modelWidth*c.modelScale);
  const s=atSea(id);fireBroadside(s,'starboard');for(const gun of s.salvos){assert.ok(Math.abs(gun.along)<c.length*.4);assert.ok(gun.beam>c.width*.45&&gun.beam<c.width*.7);}
  const enemy={...s,id:77,shipClass:id,cooldown:0};s.salvos=[];fireBroadside(s,'starboard',enemy);assert.equal(s.salvos.length,c.cannons/2);
 }
});
