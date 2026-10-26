import type { World } from '../game/world.ts';
import { UPGRADE_IDS, UPGRADES, nextUpgradeCost, type UpgradeBranch } from '../config.ts';
import { currentLocale } from '../i18n/locale.ts';
import { TREE_TEXT } from '../i18n/tree.ts';
import { upgradeUnlocked } from '../game/upgrades.ts';

export class UpgradeTree {
 readonly dialog=document.createElement('dialog');
 private resumeOnClose=false;
 private readonly openButton=document.createElement('button');
 constructor(private readonly world: World, private readonly canvas: HTMLCanvasElement) {
  this.dialog.className='progress-dialog upgrade-tree';
  this.dialog.setAttribute('aria-labelledby','tree-title');
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
  this.dialog.addEventListener('keydown',e=>e.stopPropagation());
  this.dialog.addEventListener('contextmenu',e=>e.preventDefault());
  this.openButton.className='tree-open';
  this.openButton.addEventListener('click',()=>this.open());
  this.openButton.addEventListener('contextmenu',e=>e.preventDefault());
  document.body.append(this.openButton,this.dialog);
 }
 update():void {
  const r=this.world.layout.treeButton,canvas=this.canvas.getBoundingClientRect(),t=TREE_TEXT[currentLocale()];
  Object.assign(this.openButton.style,{left:`${canvas.left+r.x}px`,top:`${canvas.top+r.y}px`,width:`${r.width}px`,height:`${r.height}px`});
  this.openButton.textContent=`${t.open} · ${this.world.coins}`;
  this.openButton.setAttribute('aria-label',t.open);
  this.openButton.disabled=this.world.adsPlaying;
 }
 get isOpen():boolean {return this.dialog.open;}
 open():void {
  if(this.isOpen||this.world.adsPlaying)return;
  this.resumeOnClose=this.world.status === "playing" && !this.world.paused;this.world.pause();this.draw();this.dialog.showModal();
  this.dialog.querySelector<HTMLButtonElement>('.tree-close')?.focus();
 }
 close():void {this.dialog.close();if(this.resumeOnClose)this.world.resume();}
 private draw():void {
  const t=TREE_TEXT[currentLocale()];
  this.dialog.innerHTML=`<div class="row"><h1 id="tree-title">${t.title}</h1><button class="tree-close">${t.close}</button></div>
   <p class="tree-balance">${t.coins}: <strong>${this.world.coins}</strong></p><p class="daily-hint">${t.note}</p>
   <div class="tree-columns">${(['control','automation','orders'] as UpgradeBranch[]).map(branch=>`<section class="tree-branch"><h2>${t.branches[branch]}</h2>${UPGRADE_IDS.filter(id=>UPGRADES[id].branch===branch).map(id=>{
    const def=UPGRADES[id],level=this.world.levels[id],cost=nextUpgradeCost(id,level),unlocked=upgradeUnlocked(id,this.world.levels);
    return `<article class="tree-node ${def.requires?'child-node':''} ${unlocked?'':'node-locked'} ${cost===null?'node-owned':''}">
     <div class="row"><h3>${t.names[id]}</h3><span>${level}/${def.max}</span></div>
     <p>${t.descriptions[id]}</p>
     ${def.requires?`<small>↳ ${t.locked}: ${t.names[def.requires.id]} ${t.level} ${def.requires.level}</small>`:'<small>●</small>'}
     <button data-upgrade="${id}" ${cost===null||!unlocked||this.world.coins<cost?'disabled':''}>${cost===null?t.owned:`${t.buy} · ${cost}`}</button></article>`;
   }).join('')}</section>`).join('')}</div>`;
  this.dialog.querySelector('.tree-close')?.addEventListener('click',()=>this.close());
  for(const button of this.dialog.querySelectorAll<HTMLButtonElement>('[data-upgrade]')) {
   button.addEventListener('click',()=>{const scroll=this.dialog.scrollTop;this.world.tryBuy(button.dataset.upgrade as typeof UPGRADE_IDS[number]);this.draw();this.dialog.scrollTop=scroll;this.dialog.querySelector<HTMLButtonElement>(`[data-upgrade="${button.dataset.upgrade}"]`)?.focus({preventScroll:true});});
  }
 }
}
