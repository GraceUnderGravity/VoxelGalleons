export const UPGRADES={
 hull:{name:'Seasoned oak',category:'HULL',description:'Stronger ribs and reinforced planking.',costs:[250,500,850],effect:'+12% hull strength per level'},
 sails:{name:'Fine canvas',category:'SAILS',description:'Lighter, tightly woven sails hold the trade winds.',costs:[225,450,750],effect:'+5% sailing speed per level'},
 rigging:{name:'Master rigging',category:'HANDLING',description:'A tuned rudder and trained hands on the sheets.',costs:[200,400,650],effect:'+6% rudder response per level'},
 crews:{name:'Veteran gun crews',category:'GUNNERY',description:'Practised crews reload with fewer wasted movements.',costs:[300,600,900],effect:'6% shorter reload per level'},
 powder:{name:'Fine powder & shot',category:'ARMAMENT',description:'Consistent powder and carefully cast round shot.',costs:[400],effect:'+15% cannon damage'}
};
export function upgradeLevel(s,id){return Math.max(0,Math.min(UPGRADES[id]?.costs.length||0,Math.floor(s.upgrades?.[id]||0)));}
export function upgradeEffects(s){return{hull:1+upgradeLevel(s,'hull')*.12,speed:1+upgradeLevel(s,'sails')*.05,handling:1+upgradeLevel(s,'rigging')*.06,reload:1-upgradeLevel(s,'crews')*.06,damage:upgradeLevel(s,'powder')||s.cannonRefit?1.15:1};}
export function grantUpgrade(s,id){if(s.status!=='playing'||!Object.hasOwn(UPGRADES,id)||upgradeLevel(s,id)>=UPGRADES[id].costs.length)return false;s.upgrades??={};s.upgrades[id]=upgradeLevel(s,id)+1;if(id==='powder')s.cannonRefit=true;return true;}
export function purchaseUpgrade(s,id,atHarbor){if(!atHarbor||!Object.hasOwn(UPGRADES,id)||s.status!=='playing')return false;const cost=UPGRADES[id].costs[upgradeLevel(s,id)];if(cost===undefined||s.gold<cost)return false;if(!grantUpgrade(s,id))return false;s.gold-=cost;s.events.push({type:'upgrade',id});return true;}
