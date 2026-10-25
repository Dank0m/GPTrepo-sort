import { test, expect } from '@playwright/test';

async function ready(page:any) { await page.goto('/');await expect(page.getByRole('dialog')).toBeVisible(); }

test('wide grab moves only selected belt items, preserves spacing, and returns mixed/full-bin extras safely', async ({page})=>{
 await ready(page);
 const result=await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords}=await import('/src/game/save.ts');
  const {createItem}=await import('/src/game/item.ts');const {INPUT}=await import('/src/config.ts');
  const w=new World(800,700,emptyRecords());w.resume();const y=w.layout.belt.y+w.layout.belt.height/2;
  const a=createItem('red',180,y,50),b=createItem('red',250,y,50),c=createItem('blue',310,y,50),far=createItem('yellow',600,y,50);
  w.items=[a,b,c,far];w.bins[0].filled=7;
  const selected=w.pointerDown(240,y,2);const count=w.groupGrab?.entries.length;
  w.pointerMove(140,y);const spacing=b.x-a.x;const farX=far.x;
  const slot=w.layout.bins[0];w.pointerUp(slot.x+slot.width/2,slot.y+slot.height/2+INPUT.dragLift);
  return {selected,count,spacing,farX,filled:w.bins[0].filled,lives:w.lives,combo:w.combo,sorted:w.sortedCount,
   returned:w.items.filter(i=>i===b||i===c).map(i=>i.state),selection:w.groupGrab,held:w.grabbed};
 });
 expect(result).toEqual({selected:true,count:3,spacing:70,farX:600,filled:8,lives:3,combo:1,sorted:1,returned:['onBelt','onBelt'],selection:null,held:null});
});

test('pause, ad, resize and cancel release the whole group; right click never buys upgrades',async({page})=>{
 await ready(page);
 const result=await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords}=await import('/src/game/save.ts');const {createItem}=await import('/src/game/item.ts');
  const outcomes=[];
  for(const action of ['pause','ad','resize','cancel']){
   localStorage.removeItem('sortup-session-v1');const w=new World(800,700,emptyRecords());w.resume();
   const y=w.layout.belt.y+40;w.items=[createItem('red',150,y,50),createItem('blue',220,y,50)];
   w.pointerDown(180,y,2);
   if(action==='pause')w.pause();if(action==='ad')w.beginAd();if(action==='resize')w.resize(900,700);if(action==='cancel')w.pointerCancel();
   outcomes.push(w.groupGrab===null&&w.grabbed===null&&w.items.every(i=>i.state==='onBelt'));
  }
  localStorage.removeItem('sortup-session-v1');const w=new World(800,700,emptyRecords());w.resume();w.coins=1000;
  const shop=w.layout.shopButtons[0];w.pointerDown(shop.x+10,shop.y+10,2);
  return {outcomes,coins:w.coins,speed:w.levels.speed};
 });
 expect(result).toEqual({outcomes:[true,true,true,true],coins:1000,speed:0});
});

test('production reserves slots for queued and held shapes, and avoids extra figures for full buffers',async({page})=>{
 await ready(page);
 const result=await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords}=await import('/src/game/save.ts');const {createItem}=await import('/src/game/item.ts');
  const w=new World(800,700,emptyRecords());w.resume();w.bins[0].filled=7;
  w.items=[createItem('red',500,w.layout.belt.y+40,50)];
  Math.random=()=>0;w.update(1);
  const spawned=w.items.map(i=>i.type);
  w.items=[];w.bins.forEach(b=>b.filled=7);
  for(const bin of w.bins)w.items.push(createItem(bin.type,500,w.layout.belt.y+40,50));
  w.update(1);
  return {spawned,count:w.items.length,lives:w.lives};
 });
 expect(result).toEqual({spawned:['red','blue'],count:3,lives:3});
});

test('real right-button pointer events capture and sort multiple items without context menu',async({page})=>{
 await ready(page);
 await page.evaluate(async()=>{
  const {App}=await import('/src/core/app.ts');const {emptyRecords}=await import('/src/game/save.ts');const {createItem}=await import('/src/game/item.ts');
  document.querySelector('dialog')?.remove();document.querySelector('.progress-strip')?.remove();
  const canvas=document.createElement('canvas');canvas.style.zIndex='50';document.body.append(canvas);
  const app=new App(canvas,emptyRecords());app.start();document.querySelector('dialog')?.remove();
  const w=(app as any).world;w.resume();w.update=()=>{};
  const y=w.layout.belt.y+w.layout.belt.height/2;w.items=[createItem('red',180,y,50),createItem('red',250,y,50)];
  (window as any).__groupWorld=w;(window as any).__groupCanvas=canvas;
 });
 const positions=await page.evaluate(()=>{const w=(window as any).__groupWorld;const r=(window as any).__groupCanvas.getBoundingClientRect();return {x:r.x+215,y:r.y+w.layout.belt.y+w.layout.belt.height/2,dx:r.x+w.layout.bins[0].x+w.layout.bins[0].width/2,dy:r.y+w.layout.bins[0].y+w.layout.bins[0].height/2+34};});
 await page.mouse.move(positions.x,positions.y);await page.mouse.down({button:'right'});
 expect(await page.evaluate(()=>(window as any).__groupWorld.groupGrab?.entries.length)).toBe(2);
 await page.mouse.move(positions.dx,positions.dy,{steps:5});await page.mouse.up({button:'right'});
 expect(await page.evaluate(()=>({sorted:(window as any).__groupWorld.sortedCount,lives:(window as any).__groupWorld.lives,group:(window as any).__groupWorld.groupGrab}))).toEqual({sorted:2,lives:3,group:null});
});

test('right-drag back to the belt keeps spacing at the left boundary without sorting or penalties',async({page})=>{
 await ready(page);
 const result=await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords}=await import('/src/game/save.ts');const {createItem}=await import('/src/game/item.ts');
  const w=new World(800,700,emptyRecords());w.resume();const y=w.layout.belt.y+w.layout.belt.height/2;
  const a=createItem('red',220,y,50),b=createItem('blue',290,y,50);w.items=[a,b];
  w.pointerDown(250,y,2);w.pointerMove(20,y);w.pointerUp(20,y);
  return {spacing:b.x-a.x,leftInside:a.x-a.size/2>=w.layout.belt.x-1e-8,onBelt:w.items.every(i=>i.state==='onBelt'),sorted:w.sortedCount,lives:w.lives};
 });
 expect(result.spacing).toBeCloseTo(70,6);
 expect({...result,spacing:70}).toEqual({spacing:70,leftInside:true,onBelt:true,sorted:0,lives:3});
});
