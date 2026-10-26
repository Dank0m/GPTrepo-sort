import {test,expect} from '@playwright/test';

test('tree UI enforces dependencies and money, persists wide pickup across defeat and reload',async({page})=>{
 await page.goto('/');await page.getByRole('dialog').waitFor();
 await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords}=await import('/src/game/save.ts');
  const w=new World(800,700,emptyRecords());w.coins=140;(w as any).persistRecords();
 });
 await page.reload();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 await page.getByRole('button',{name:'Улучшения',exact:true}).click();
 const tree=page.getByRole('dialog');await expect(tree).toContainText('Контроль ленты');
 await expect(page.locator('[data-upgrade="wide"]')).toBeDisabled();
 await page.locator('[data-upgrade="buffer"]').click();
 await expect(page.locator('[data-upgrade="wide"]')).toBeEnabled();
 await page.locator('[data-upgrade="wide"]').click();
 await expect(tree).toContainText('Монеты: 0');
 await page.getByRole('button',{name:'К игре',exact:true}).click();
 const data=await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {loadRecords}=await import('/src/game/save.ts');
  const w=new World(800,700,loadRecords());w.resume();
  for(let i=0;i<3;i++)(w as any).applyMiss();w.restart();
  return {wide:w.levels.wide,buffer:w.levels.buffer,coins:w.coins,saved:loadRecords().tree};
 });
 expect(data).toMatchObject({wide:1,buffer:1,coins:0,saved:{wide:1,buffer:1}});
 await page.reload();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 await page.getByRole('button',{name:'Улучшения',exact:true}).click();
 await expect(page.locator('[data-upgrade="wide"]').locator('..')).toContainText('1/2');
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

for(const viewport of [{width:320,height:568},{width:568,height:320}]){
 test(`tree can be scrolled and closed at ${viewport.width}x${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/');await page.getByRole('button',{name:'Начать сортировку',exact:true}).click();
  await page.getByRole('button',{name:'Улучшения',exact:true}).click();
  const nodes=page.locator('.tree-node');await expect(nodes).toHaveCount(12);await nodes.last().scrollIntoViewIfNeeded();
  await expect(nodes.last()).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
 });
}
