import { ECONOMY, UPGRADE_IDS, UPGRADES, nextUpgradeCost } from '../src/config.ts';
import { emptyLevels, sortReward, upgradeUnlocked } from '../src/game/upgrades.ts';
import { emptyProgression, advanceProgression } from '../src/game/progression.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
const now=Date.parse('2026-10-25T12:00:00Z');
function scenario(count:number,maxed=false,withDaily=true) {
 const levels=emptyLevels();if(maxed)for(const id of UPGRADE_IDS)levels[id]=UPGRADES[id].max;
 const progress=emptyProgression(now);if(!withDaily)progress.daily.claimed=['sort','combo','set'];
 let earned=0,wallet=0,wideAt:number|null=null;const buys:{sort:number;id:string;cost:number}[]=[];
 const strategy=['buffer','wide'] as const;
 const types=maxed?6:3;
 for(let i=1;i<=count;i++){
  let reward=sortReward(levels,i);reward+=advanceProgression(progress,{kind:'sort',combo:i,manual:true},now).coins;
  if(i%(8*types)===0){reward+=ECONOMY.dumpBonus(types);reward+=advanceProgression(progress,{kind:'set'},now).coins;}
  earned+=reward;wallet+=reward;
  if(!maxed)for(const id of strategy){
   const cost=nextUpgradeCost(id,levels[id]);
   if(levels[id]===0&&cost!==null&&upgradeUnlocked(id,levels)&&wallet>=cost){wallet-=cost;levels[id]++;buys.push({sort:i,id,cost});if(id==='wide')wideAt=i;}
  }
 }
 return {correctSorts:count,earned,wallet,wideAt,buys};
}
const result={
 assumptions:'Perfect manual sorting, balanced bin types, no rewarded ads, daily rewards at most once; this is an income model, not measured player retention.',
 base:[24,120,600].map(n=>scenario(n)),
 dailyAlreadyClaimed:scenario(120,false,false),
 maxTree:[120,600].map(n=>scenario(n,true)),
 totalTreeCost:UPGRADE_IDS.reduce((sum,id)=>sum+UPGRADES[id].costs.reduce((a,b)=>a+b,0),0),
 old120:120*121/2*10+5*1080+600,
 old600:600*601/2*10+25*1080+600,
 limits:{manualBase3Max4:true,manualAllSkillsMax8:true,automaticMax2:true,fullSet36to72:true,dailyTotal75:true,restartCarryCap20:true,masteryStartCap10:true},
};
mkdirSync('docs',{recursive:true});writeFileSync('docs/economy-report.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
