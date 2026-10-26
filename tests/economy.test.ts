import test from 'node:test';
import assert from 'node:assert/strict';
import {UPGRADE_IDS,UPGRADES,nextUpgradeCost,ECONOMY} from '../src/config.ts';
import {emptyLevels,sortReward,sanitizeLevels,upgradeUnlocked,mergeLevels} from '../src/game/upgrades.ts';
import {emptyProgression,advanceProgression} from '../src/game/progression.ts';
import {sanitizeRecords,sanitizeSession} from '../src/game/save.ts';

test('manual and automatic income stay bounded even at a million combo',()=>{
 const base=emptyLevels();
 assert.equal(sortReward(base,1),3);assert.equal(sortReward(base,10),3);assert.equal(sortReward(base,11),4);assert.equal(sortReward(base,1000000),4);
 const max={...base,value:2,combo:2};
 assert.equal(sortReward(max,1000000),8);assert.equal(sortReward(max,1000000,false),2);
 for(let combo=0;combo<10000;combo++)assert.ok(sortReward(max,combo)<=8);
});

test('dependency gates, exact prices and max levels are enforced by tree definitions',()=>{
 const levels=emptyLevels();assert.equal(upgradeUnlocked('wide',levels),false);
 levels.buffer=1;assert.equal(upgradeUnlocked('wide',levels),true);
 assert.equal(nextUpgradeCost('wide',0),100);assert.equal(nextUpgradeCost('wide',1),180);assert.equal(nextUpgradeCost('wide',2),null);
 let total=0;
 for(const id of UPGRADE_IDS){assert.equal(UPGRADES[id].costs.length,UPGRADES[id].max);total+=UPGRADES[id].costs.reduce((a,b)=>a+b,0);}
 assert.equal(total,2955);
 const invalid=sanitizeLevels({...levels,magnet:1,wide:0,auto:99,batch:1,recycle:1,value:Infinity});
 assert.equal(invalid.magnet,0);assert.equal(invalid.auto,2);assert.equal(invalid.recycle,1);assert.equal(invalid.value,0);
 const merged=mergeLevels({...emptyLevels(),buffer:1},{...emptyLevels(),buffer:2,wide:1});
 assert.equal(merged.buffer,2);assert.equal(merged.wide,1);
});

test('daily rewards, sets and restart money cannot swamp tree prices or be farmed by restarting',()=>{
 const p=emptyProgression();let income=0;
 for(let i=1;i<=30;i++)income+=advanceProgression(p,{kind:'sort',combo:i,manual:true}).coins;
 income+=advanceProgression(p,{kind:'set'}).coins;assert.equal(income,75);
 for(let i=0;i<100;i++)assert.equal(advanceProgression(p,{kind:'set'}).coins,0);
 assert.equal(ECONOMY.dumpBonus(3),36);assert.equal(ECONOMY.dumpBonus(6),72);
 assert.ok(8*3<ECONOMY.dumpBonus(3),'three early unloads pay less than one full set');
 let coins=1000000;
 for(let i=0;i<1000;i++)coins=10+Math.min(ECONOMY.rebirthCap,Math.floor(coins*ECONOMY.rebirthKeep));
 assert.ok(coins<40,'restarting without sorting cannot fund even the cheapest skill');
});

test('economy migration preserves mastery but rejects legacy money and free old upgrades',()=>{
 const r=sanitizeRecords({bestCoins:999999,bestCombo:30,gamesPlayed:4,progression:{xp:800}});
 assert.equal(r.bestCoins,0);assert.equal(r.bestCombo,30);assert.equal(r.progression.xp,800);assert.deepEqual(r.tree,emptyLevels());
 assert.equal(sanitizeSession({version:1,coins:999999,levels:{wide:2},status:'playing'}),null);
 const fresh=sanitizeRecords({...r,tree:{...emptyLevels(),buffer:1,wide:1},bestCoins:43});
 assert.equal(fresh.bestCoins,43);assert.equal(fresh.tree.wide,1);
});
