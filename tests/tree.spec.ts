import {test,expect} from '@playwright/test';

test('visible icon tree enforces dependencies and persists purchases after defeat and reload', async ({page}) => {
 await page.goto('/');await page.getByRole('dialog').waitFor();
 await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords}=await import('/src/game/save.ts');
  const w=new World(800,700,emptyRecords());w.coins=140;(w as any).persistRecords();
 });
 await page.reload();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 const tree=page.locator('.skill-panel');await expect(tree).toBeVisible();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect(page.locator('[data-upgrade="wide"]')).toHaveAttribute('aria-disabled','true');
 await page.locator('[data-upgrade="buffer"]').click();
 await expect(page.locator('[data-upgrade="wide"]')).toHaveAttribute('aria-disabled','false');
 await page.locator('[data-upgrade="wide"]').click();
 await expect(tree).toContainText('2/19');
 const data=await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {loadRecords}=await import('/src/game/save.ts');
  const w=new World(800,700,loadRecords());w.resume();
  for(let i=0;i<3;i++)(w as any).applyMiss();w.restart();
  return {wide:w.levels.wide,buffer:w.levels.buffer,coins:w.coins,saved:loadRecords().tree};
 });
 expect(data).toMatchObject({wide:1,buffer:1,coins:0,saved:{wide:1,buffer:1}});
 await page.reload();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 await expect(page.locator('[data-upgrade="wide"] .skill-level')).toHaveText('1/2');
});

test('wide pickup is locked at start and mobile group mode requires the same skill',async({page})=>{
 await page.goto('/');await page.getByRole('dialog').waitFor();
 const result=await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords}=await import('/src/game/save.ts');const {createItem}=await import('/src/game/item.ts');
  const w=new World(800,700,emptyRecords());w.resume();const y=w.layout.belt.y+40;w.items=[createItem('red',180,y,50)];
  const locked=w.pointerDown(180,y,2);const requested=w.treeRequested;w.coins=140;
  const bypass=w.tryBuy('wide');const root=w.tryBuy('buffer');const wide=w.tryBuy('wide');
  w.treeRequested=false;w.pointerDown(w.layout.groupButton.x+10,w.layout.groupButton.y+10);const mode=w.groupMode;
  const acquired=w.pointerDown(180,y);
  return {locked,requested,bypass,root,wide,mode,acquired,count:w.groupGrab?.entries.length};
 });
 expect(result).toEqual({locked:false,requested:true,bypass:false,root:true,wide:true,mode:true,acquired:true,count:1});
});

test('magnetic aim and early unloading have distinct effects and unloading cannot pay twice',async({page})=>{
 await page.goto('/');await page.getByRole('dialog').waitFor();
 const result=await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords}=await import('/src/game/save.ts');const {createItem}=await import('/src/game/item.ts');const {INPUT}=await import('/src/config.ts');
  const w=new World(800,700,emptyRecords());w.resume();w.coins=500;w.tryBuy('buffer');w.tryBuy('wide');w.tryBuy('magnet');w.tryBuy('unload');
  const item=createItem('red',170,w.layout.belt.y+40,50),slot=w.layout.bins[0];w.items=[item];
  w.pointerDown(item.x,item.y);w.pointerUp(slot.x-30,slot.y+slot.height/2+INPUT.dragLift);
  const accepted=w.sortedCount===1&&w.bins[0].filled===1;
  w.bins[0].filled=8;const before=w.coins;w.pointerDown(slot.x+20,slot.y+30);w.pointerDown(slot.x+20,slot.y+30);
  return {accepted,unload:w.coins-before,filled:w.bins[0].filled,sets:w.records.progression.totalSets};
 });
 expect(result).toEqual({accepted:true,unload:8,filled:0,sets:0});
});

test('twin autosort reserves capacity, earns lower pay and does not farm combos',async({page})=>{
 await page.goto('/');await page.getByRole('dialog').waitFor();
 const result=await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords}=await import('/src/game/save.ts');const {createItem}=await import('/src/game/item.ts');
  const w=new World(800,700,emptyRecords());w.resume();w.coins=400;w.tryBuy('auto');w.tryBuy('batch');w.bins[0].filled=7;
  const y=w.layout.belt.y+40;w.items=[createItem('red',300,y,50),createItem('red',400,y,50),createItem('blue',200,y,50)];
  const before=w.coins;(w as any).runAutoSort(5);const flights=w.items.filter(i=>i.state==='flying').length;
  const reserved=w.bins[0].filled;(w as any).updateFlights(.5);
  return {flights,reserved,earned:w.coins-before,combo:w.combo,manual:w.records.progression.totalSorted};
 });
 expect(result).toEqual({flights:2,reserved:8,earned:2,combo:0,manual:0});
});

test('return belt rescues only one overflow per recharge and cooldown survives pause and reload',async({page})=>{
 await page.goto('/');await page.getByRole('dialog').waitFor();
 const result=await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords,loadRecords}=await import('/src/game/save.ts');const {createItem}=await import('/src/game/item.ts');
  const w=new World(800,700,emptyRecords());w.resume();w.coins=600;w.tryBuy('auto');w.tryBuy('batch');w.tryBuy('recycle');
  const end=w.layout.belt.x+w.layout.belt.width+w.layout.itemSize;
  w.items=[createItem('red',end,w.layout.belt.y+40,50),createItem('blue',end,w.layout.belt.y+40,50)];w.update(.1);
  w.pause();w.update(10);const restored=new World(800,700,loadRecords());
  return {lives:w.lives,remaining:w.items.filter(i=>i.type==='red').length,cooldown:restored.rescueCooldown,skill:restored.levels.recycle};
 });
 expect(result).toEqual({lives:2,remaining:1,cooldown:25,skill:1});
});

test('service window creates bounded respite after a set and its timer does not run during pause',async({page})=>{
 await page.goto('/');await page.getByRole('dialog').waitFor();
 const result=await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords}=await import('/src/game/save.ts');
  const w=new World(800,700,emptyRecords());w.resume();w.coins=300;w.tryBuy('auto');w.tryBuy('pulse');const normal=w.pace.speed;
  w.bins.forEach(b=>b.filled=b.capacity);(w as any).tryDump();const slowed=w.pace.speed;
  w.pause();w.update(10);const paused=w.pulseRemaining;w.resume();w.update(6.1);
  return {ratio:slowed/normal,paused,remaining:w.pulseRemaining,normalAgain:w.pace.speed===normal};
 });
 expect(result).toEqual({ratio:.75,paused:6,remaining:0,normalAgain:true});
});


for (const viewport of [{width:1280,height:720},{width:320,height:568},{width:568,height:320},{width:320,height:320}]) {
 test(`tree stays in the playfield and icons can be reached at ${viewport.width}x${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/');await page.getByRole('button',{name:'Начать сортировку',exact:true}).click();
  await expect(page.locator('.skill-panel')).toBeVisible();
  await expect(page.locator('.skill-node')).toHaveCount(12);
  await expect(page.locator('.tree-open')).toHaveCount(0);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const node=page.locator('[data-upgrade="type"]');await node.scrollIntoViewIfNeeded();await node.hover();
  await expect(page.getByRole('tooltip')).toContainText('Новые материалы');
  const geometry=await page.evaluate(async()=>{
   const {computeLayout}=await import('/src/game/layout.ts');
   const canvas=document.querySelector('canvas')!.getBoundingClientRect();
   const l=computeLayout(canvas.width,canvas.height,['red','blue','yellow','green','purple','orange']);
   const t=document.querySelector('.skill-panel')!.getBoundingClientRect();
   const p=document.querySelector('.skill-popover')!.getBoundingClientRect();
   const separate=(a:any,b:any)=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y;
   return {panelInside:t.left>=0&&t.top>=0&&t.right<=innerWidth&&t.bottom<=innerHeight,
    noOverlap:[l.belt,...l.bins,l.groupButton].every(r=>separate(r,l.tree)),
    tooltipInside:p.left>=0&&p.top>=0&&p.right<=innerWidth&&p.bottom<=innerHeight};
  });
  expect(geometry).toEqual({panelInside:true,noOverlap:true,tooltipInside:true});
 });
}

test('hover shows name, effect, cost and prerequisite; keyboard can inspect locked skills',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Начать сортировку',exact:true}).click();
 await page.locator('[data-upgrade="buffer"]').hover();
 await expect(page.getByRole('tooltip')).toContainText('Разделители');
 await expect(page.getByRole('tooltip')).toContainText('Цена: 40');
 await page.locator('[data-upgrade="magnet"]').focus();
 await expect(page.getByRole('tooltip')).toContainText('Нужно: Широкий захват ур. 1');
 await page.keyboard.press('Escape');await expect(page.getByRole('tooltip')).not.toBeVisible();
 await expect(page.locator('.skill-panel')).toBeVisible();
});

test('touch opens a pinned tooltip, buys only through its button, and resumes on outside tap',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();await page.goto('/');await page.getByRole('dialog').waitFor();
 await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords}=await import('/src/game/save.ts');
  const w=new World(390,844,emptyRecords());w.coins=140;(w as any).persistRecords();
 });
 await page.reload();await page.getByRole('button',{name:'Продолжить',exact:true}).tap();
 await page.locator('[data-upgrade="buffer"]').tap();
 await expect(page.getByRole('tooltip')).toContainText('Разделители');
 let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('sortup-session-v1')!));
 expect(state.levels.buffer).toBe(0);expect(state.coins).toBe(140);
 await page.locator('.skill-buy').tap();
 await expect(page.locator('[data-upgrade="buffer"] .skill-level')).toHaveText('1/2');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('sortup-session-v1')!).coins);
 await page.waitForTimeout(1000);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sortup-session-v1')!).coins)).toBe(before);
 await page.locator('.skill-close').tap();await expect(page.getByRole('tooltip')).not.toBeVisible();
 await expect(page.locator('.skill-panel')).toBeVisible();
 await context.close();
});


test('mobile tree scrolls with a real horizontal touch gesture without scrolling the page',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();await page.goto('/');await page.getByRole('button',{name:'Начать сортировку',exact:true}).tap();
 const box=(await page.locator('.skill-scroll').boundingBox())!;
 const cdp=await context.newCDPSession(page);
 const y=box.y+box.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width-30,y}]});
 for(let step=1;step<=8;step++){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width-30-step*32,y}]});
  await page.waitForTimeout(20);
 }
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect.poll(()=>page.locator('.skill-scroll').evaluate(e=>e.scrollLeft)).toBeGreaterThan(100);
 expect(await page.evaluate(()=>({x:scrollX,y:scrollY}))).toEqual({x:0,y:0});
 await expect(page.locator('.skill-panel')).toBeVisible();await context.close();
});
