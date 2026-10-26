import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width:390, height:844 }, hasTouch:true, isMobile:true });

async function setup(page: Page, device: 'mobile' | 'tablet' | 'desktop', sdkMode: 'success' | 'on' | 'reject' | 'absent', nativeReject = false) {
  await page.addInitScript(({ device, sdkMode, nativeReject }) => {
    const w = window as any;
    w.__fullscreen = { sdk:0, native:0, done:0 };
    HTMLElement.prototype.requestFullscreen = async () => {
      w.__fullscreen.native++;
      if (nativeReject) throw new Error('Permission denied');
    };
    const fullscreen = { status: sdkMode === 'on' ? 'on' : 'off', request: async () => {
      w.__fullscreen.sdk++;
      if (sdkMode === 'reject') throw new Error('SDK fullscreen unavailable');
      fullscreen.status = 'on';
    } };
    w.YaGames = { init: async () => ({
      deviceInfo: { type:device },
      screen: sdkMode === 'absent' ? undefined : { fullscreen },
      environment: { i18n:{ lang:'ru' } },
      getPlayer: async () => ({ getData:async()=>({}), setData:async()=>{} }),
      features: { LoadingAPI:{ready:()=>{}}, GameplayAPI:{start:()=>{},stop:()=>{}} },
      adv: {showRewardedVideo:()=>{},showFullscreenAdv:()=>{}},
    }) };
  }, { device,sdkMode,nativeReject });
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(async () => {
    const { yandexService } = await import('/src/services/YandexService.ts');
    const button = document.createElement('button');
    button.textContent = 'Fullscreen test';
    button.onclick = () => { void yandexService.requestFullscreen().then(() => { (window as any).__fullscreen.done++; }); };
    document.querySelector('dialog[open]')!.append(button);
  });
}

test('mobile fullscreen waits for an explicit gesture, uses SDK, and skips an already fullscreen game', async ({ page }) => {
  await setup(page,'mobile','success');
  expect(await page.evaluate(() => (window as any).__fullscreen)).toEqual({ sdk:0,native:0,done:0 });
  await page.getByRole('button',{name:'Fullscreen test',exact:true}).click();
  await expect.poll(() => page.evaluate(() => (window as any).__fullscreen)).toEqual({ sdk:1,native:0,done:1 });
  await page.getByRole('button',{name:'Fullscreen test',exact:true}).click();
  await expect.poll(() => page.evaluate(() => (window as any).__fullscreen)).toEqual({ sdk:1,native:0,done:2 });
});

test('tablet SDK denial falls back to browser fullscreen without stopping play', async ({ page }) => {
  await setup(page,'tablet','reject');
  await page.getByRole('button',{name:'Fullscreen test',exact:true}).click();
  await expect.poll(() => page.evaluate(() => (window as any).__fullscreen)).toEqual({ sdk:1,native:1,done:1 });
});

test('missing SDK fullscreen uses browser support on touch devices', async ({ page }) => {
  await setup(page,'mobile','absent');
  await page.getByRole('button',{name:'Fullscreen test',exact:true}).click();
  await expect.poll(() => page.evaluate(() => (window as any).__fullscreen)).toEqual({ sdk:0,native:1,done:1 });
});

for (const scenario of [{ device:'desktop', mode:'success' }, { device:'mobile', mode:'on' }] as const) {
  test(`fullscreen skips ${scenario.device} device with SDK state ${scenario.mode}`, async ({ page }) => {
    await setup(page,scenario.device,scenario.mode);
    await page.getByRole('button',{name:'Fullscreen test',exact:true}).click();
    await expect.poll(() => page.evaluate(() => (window as any).__fullscreen)).toEqual({ sdk:0,native:0,done:1 });
  });
}

test('both fullscreen APIs rejecting is harmless and a later gesture can retry', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror',error=>errors.push(error.message));
  await setup(page,'mobile','reject',true);
  await page.getByRole('button',{name:'Fullscreen test',exact:true}).click();
  await expect.poll(() => page.evaluate(() => (window as any).__fullscreen)).toEqual({ sdk:1,native:1,done:1 });
  await page.getByRole('button',{name:'Fullscreen test',exact:true}).click();
  await expect.poll(() => page.evaluate(() => (window as any).__fullscreen)).toEqual({ sdk:2,native:2,done:2 });
  expect(errors).toEqual([]);
});

test('local mobile browser can request fullscreen without any Yandex SDK', async ({ page }) => {
  await page.route('**/sdk.js', route => route.fulfill({ status:404, body:'' }));
  await page.addInitScript(() => {
    (window as any).__nativeFullscreen = 0;
    HTMLElement.prototype.requestFullscreen = async () => { (window as any).__nativeFullscreen++; };
  });
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__nativeFullscreen)).toBe(0);
  await page.evaluate(async () => {
    const { yandexService } = await import('/src/services/YandexService.ts');
    const button = document.createElement('button');
    button.textContent = 'Local fullscreen test';
    button.onclick = () => { void yandexService.requestFullscreen(); };
    document.querySelector('dialog[open]')!.append(button);
  });
  await page.getByRole('button',{name:'Local fullscreen test',exact:true}).tap();
  await expect.poll(() => page.evaluate(() => (window as any).__nativeFullscreen)).toBe(1);
});
