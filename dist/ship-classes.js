export const SHIP_CLASSES = {
  sloop: {name:'Sloop',title:'The Sea Wren',role:'A nimble coastal raider',masts:1,cannons:6,hull:70,speed:14,turn:1.14,damage:7,length:14,width:4.14,mass:.65,description:'A single mast, sweeping fore-and-aft canvas, and a shallow hull. Outrun heavy ships and strike from their blind side.'},
  brig: {name:'Brig',title:'The Black Finch',role:'The versatile privateer',masts:2,cannons:12,hull:100,speed:11.5,turn:.92,damage:6,length:18,width:5.22,mass:1,description:'Two square-rigged masts over a compact gun deck. A balanced choice for cargo hunting and close naval duels.'},
  frigate: {name:'Frigate',title:'The Providence',role:'A fast, formidable hunter',masts:3,cannons:24,hull:135,speed:10.5,turn:.76,damage:5.3,length:27,width:5.63,mass:1.45,description:'A long, lean hull, three lofty masts, and a continuous battery. Strong broadsides with speed to choose the fight.'},
  galleon: {name:'Galleon',title:'The Black Pearl',role:'The queen of the sea',masts:3,cannons:28,hull:180,speed:9.2,turn:.64,damage:5,length:24,width:6.64,mass:2.1,description:'Tarred black timbers, weathered dark canvas, and a lantern-lit stern gallery. Heavy guns and stout timbers reward a patient captain.'}
};

// Keep construction measurements separate so rigging, guns and collision hulls
// use one common scale, for both pirate and navy ships.
const fleetScale={sloop:.80,brig:.95,frigate:1,galleon:1.20};
for(const [id,c] of Object.entries(SHIP_CLASSES)){
  c.modelLength=c.length;c.modelWidth=c.width;c.modelScale=fleetScale[id];
  c.length*=c.modelScale;c.width*=c.modelScale;
}
