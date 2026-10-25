import { test, expect } from '@playwright/test';

test('a complete run grows through all shifts without purchases, restores pace, then resets on restart', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  const result=await page.evaluate(async () => {
    const { World }=await import('/src/game/world.ts');
    const { emptyRecords,loadRecords }=await import('/src/game/save.ts');
    const { INPUT }=await import('/src/config.ts');
    let w=new World(390,844,emptyRecords());
    w.resume();
    const initial=w.pace;
    const stages=[w.shift.stage];
    let restored=false;
    for(let t=0;t<500 && w.sortedCount<185;t+=.05) {
      w.update(.05);
      const item=w.items.find(i=>i.state==='onBelt' && i.x>=w.layout.belt.x+i.size/2);
      if(item) {
        const slot=w.layout.bins.find(b=>b.type===item.type)!;
        w.pointerDown(item.x,item.y);
        w.pointerUp(slot.x+slot.width/2,slot.y+slot.height/2+INPUT.dragLift);
        if(stages.at(-1)!==w.shift.stage)stages.push(w.shift.stage);
      }
      if(w.sortedCount===60&&!restored) {
        const before=w.pace;
        w=new World(390,844,loadRecords());
        restored=w.paused&&w.shift.stage===4&&w.pace.speed===before.speed;
        w.resume();
      }
    }
    const final={sorted:w.sortedCount,stage:w.shift.stage,levels:w.levels,lives:w.lives,pace:w.pace,sets:w.records.progression.totalSets};
    w.status='over';
    w.restart();
    return {initial,stages,restored,final,restarted:w.shift.stage};
  });
  expect(result.stages).toEqual([1,2,3,4,5,6,7,8,9,10]);
  expect(result.restored).toBe(true);
  expect(result.final.sorted).toBe(185);
  expect(result.final.levels).toEqual({speed:0,value:0,type:0,auto:0,buffer:0});
  expect(result.final.lives).toBe(3);
  expect(result.final.sets).toBeGreaterThan(0);
  expect(result.final.pace.speed).toBeGreaterThan(result.initial.speed);
  expect(result.final.pace.interval).toBeLessThan(result.initial.interval);
  expect(result.restarted).toBe(1);
});

test('waiting, pausing and resizing never advance a shift; GUI shows automatic difficulty rules', async ({ page }) => {
  await page.goto('/');
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('Каждые 20');
  await page.getByRole('button',{name:'Начать сортировку',exact:true}).click();
  const result=await page.evaluate(async()=>{
    const { World }=await import('/src/game/world.ts');
    const { emptyRecords }=await import('/src/game/save.ts');
    const w=new World(800,700,emptyRecords());
    w.update(300);
    w.resize(320,568);
    return {stage:w.shift.stage,sorted:w.sortedCount};
  });
  expect(result).toEqual({stage:1,sorted:0});
  await page.getByRole('button',{name:/Мой прогресс/}).click();
  await expect(dialog).toContainText('Смена 1 / 10');
});
