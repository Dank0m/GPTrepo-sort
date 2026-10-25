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
