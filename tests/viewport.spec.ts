import { test, expect } from '@playwright/test';

for (const viewport of [{ width:2560,height:1080 }, { width:800,height:1800 }]) {
  test(`desktop active field is bounded and pointer coordinates stay aligned ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button',{name:'Начать сортировку',exact:true}).click();
    const dimensions = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas')!;
      const rect = canvas.getBoundingClientRect();
      const band = document.querySelector('.progress-strip')!.getBoundingClientRect();
      const { canvasPoint } = await import('/src/core/pointer.ts');
      const p = canvasPoint(canvas,new PointerEvent('pointermove',{clientX:rect.left+123,clientY:rect.top+99}));
      return { ratio:Math.max(rect.width,rect.height)/Math.min(rect.width,rect.height),edge:rect.width===innerWidth||rect.height===innerHeight, centered:rect.left===(innerWidth-rect.width)/2&&rect.top===(innerHeight-rect.height)/2,bandInside:band.left>=rect.left&&band.right<=rect.right,point:p };
    });
    expect(dimensions.ratio).toBeLessThanOrEqual(2);
    expect(dimensions.edge).toBe(true);
    expect(dimensions.centered).toBe(true);
    expect(dimensions.bandInside).toBe(true);
    expect(dimensions.point).toEqual({x:123,y:99});
    await page.getByRole('button',{name:/Мой прогресс/}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
}

test('320px hint text is constrained to belt width', async ({ page }) => {
  await page.setViewportSize({ width:320,height:568 });
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    (window as any).__hintWidth = null;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
      if (text.startsWith('Перетащи')) (window as any).__hintWidth = maxWidth;
      return maxWidth === undefined ? original.call(this,text,x,y) : original.call(this,text,x,y,maxWidth);
    };
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Начать сортировку',exact:true}).click();
  await expect.poll(() => page.evaluate(() => (window as any).__hintWidth)).not.toBeNull();
  const maxWidth = await page.evaluate(() => (window as any).__hintWidth);
  expect(maxWidth).toBeGreaterThan(0);
  expect(maxWidth).toBeLessThan(320);
});

for (const viewport of [{ width:568,height:320 }, { width:560,height:320 }, { width:320,height:320 }]) {
  test(`short viewport keeps six bins, shop and reward controls separate at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?mockAds=1');
    await page.getByRole('button',{name:'Начать сортировку',exact:true}).click();
    const geometry = await page.evaluate(async () => {
      const { computeLayout } = await import('/src/game/layout.ts');
      const { dumpOfferUi, gameOverUi } = await import('/src/game/adLayout.ts');
      const l = computeLayout(innerWidth,innerHeight,['red','blue','yellow','green','purple','orange'],{freeCoins:true});
      const offer = dumpOfferUi(innerWidth,innerHeight);
      const gameOver = gameOverUi(innerWidth,innerHeight,{record:true});
      const all = [l.hud,l.progress,l.belt,...l.bins,l.treeButton,l.groupButton,offer.box,offer.doubleBtn,offer.dismissBtn,gameOver.box,gameOver.restartBtn];
      const band = document.querySelector('.progress-strip')!;
      return {
        inside: all.every(r => r.x>=0&&r.y>=0&&r.x+r.width<=innerWidth&&r.y+r.height<=innerHeight),
        noOverlap: l.progress.y+l.progress.height<=l.belt.y && l.bins.every(b=>b.y>=l.belt.y+l.belt.height&&b.y+b.height<=l.shop.y),
        usableBins: l.bins.every(b=>b.width>=40&&b.height>=30),
        stripFits:band.scrollHeight<=band.clientHeight,
      };
    });
    expect(geometry).toEqual({inside:true,noOverlap:true,usableBins:true,stripFits:true});
  });
}

test('fixed ad money control is absent even when rewarded SDK is available',async({page})=>{
 await page.goto('/?mockAds=1');
 await page.getByRole('button',{name:'Начать сортировку',exact:true}).click();
 const rendered=await page.evaluate(async()=>{
  const {World}=await import('/src/game/world.ts');const {emptyRecords}=await import('/src/game/save.ts');const {drawShop}=await import('/src/render/shop.ts');
  const w=new World(568,320,emptyRecords());const ctx=document.createElement('canvas').getContext('2d')!;const labels:string[]=[];
  ctx.fillText=(text)=>{labels.push(text);};drawShop(ctx,w);
  return {labels,legacy:(w.layout as any).freeCoins,buttons:(w.layout as any).shopButtons};
 });
 expect(rendered.labels.join(' ')).not.toMatch(/500|реклам|FREE COINS/);
 expect(rendered.legacy).toBeUndefined();expect(rendered.buttons).toBeUndefined();
 await page.getByRole('button',{name:'Улучшения',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Дерево улучшений');
});
