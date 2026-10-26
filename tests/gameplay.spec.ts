import { test, expect } from "@playwright/test";

test('real pointer sorting, pause, and progress survive reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Начать сортировку', exact: true }).click();
  const layout = await page.evaluate(async () => {
    const { computeLayout } = await import('/src/game/layout.ts');
    const rect = document.querySelector('canvas')!.getBoundingClientRect();
    return computeLayout(rect.width, rect.height, ['red', 'blue', 'yellow']);
  });
  // Let the first shape move fully into the visible belt, then use a real pointer.
  await page.waitForTimeout(1800);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  const speed = await page.evaluate(async (layout) => {
    const { conveyorPace } = await import('/src/game/difficulty.ts');
    const { emptyLevels } = await import('/src/game/upgrades.ts');
    return conveyorPace(0,emptyLevels(),layout.belt.width,layout.itemSize).speed;
  }, layout);
  await page.mouse.move(layout.belt.x - layout.itemSize * .35 + speed * .95, layout.belt.y + layout.belt.height / 2);
  await page.mouse.down();
  const bin = layout.bins[0];
  await page.mouse.move(bin.x + bin.width / 2, bin.y + 80, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('sortup-records') || '{}').progression?.totalSorted)).toBe(1);
  await page.getByRole('button', { name: /Мой прогресс/ }).click();
  await expect(page.getByRole('dialog')).toContainText('1/30');
  await expect(page.getByRole('dialog')).toContainText('2 / 100 XP');
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText('1/30');
  await expect(page.getByRole('dialog')).toContainText('2 / 100 XP');
  expect(errors).toEqual([]);
});

test('world rules: correct, wrong, full bins, jackpot, game over, and permanent rank', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  const result = await page.evaluate(async () => {
    const { World } = await import('/src/game/world.ts');
    const { emptyRecords } = await import('/src/game/save.ts');
    const { createItem } = await import('/src/game/item.ts');
    const { INPUT } = await import('/src/config.ts');
    const w = new World(800, 700, emptyRecords());
    w.resume();
    function drop(type: 'red' | 'blue', slotIndex: number) {
      const item = createItem(type, 180, w.layout.belt.y + 30, w.layout.itemSize);
      w.items.push(item);
      w.pointerDown(item.x, item.y);
      const slot = w.layout.bins[slotIndex];
      w.pointerUp(slot.x + slot.width / 2, slot.y + slot.height / 2 + INPUT.dragLift);
    }
    drop('red', 0);
    const correct = { combo: w.combo, coins: w.coins, xp: w.records.progression.xp };
    drop('red', 1);
    const wrong = { combo: w.combo, lives: w.lives };
    w.bins[0].filled = w.bins[0].capacity;
    drop('red', 0);
    const full = { lives: w.lives, state: w.items.at(-1)?.state };
    w.bins.forEach(b => { b.filled = b.capacity; });
    w.bins[1].filled--;
    drop('blue', 1);
    const jackpot = { cleared: w.bins.every(b => b.filled === 0), sets: w.records.progression.totalSets, claimed: [...w.records.progression.daily.claimed] };
    drop('red', 1);
    drop('red', 1);
    const over = { status: w.status, games: w.records.gamesPlayed };
    w.restart();
    const restart = { status: w.status, games: w.records.gamesPlayed, xp: w.records.progression.xp };
    w.coins = 45;
    const before = w.coins;
    const bought = w.tryBuy("value");
    const upgrade = { bought, level: w.levels.value, spent: before - w.coins };
    return { correct, wrong, full, jackpot, over, restart, upgrade };
  });
  expect(result.correct).toEqual({ combo: 1, coins: 3, xp: 2 });
  expect(result.wrong).toEqual({ combo: 0, lives: 2 });
  expect(result.full).toEqual({ lives: 2, state: 'onBelt' });
  expect(result.jackpot).toEqual({ cleared: true, sets: 1, claimed: ['set'] });
  expect(result.over).toEqual({ status: 'over', games: 1 });
  expect(result.restart).toEqual({ status: 'playing', games: 1, xp: 149 });
  expect(result.upgrade).toEqual({ bought: true, level: 1, spent: 45 });
});

test('autosort does not farm manual XP; spawn avoids full bins; background freezes offers', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  const result = await page.evaluate(async () => {
    const { World } = await import('/src/game/world.ts');
    const { emptyRecords } = await import('/src/game/save.ts');
    const w = new World(800, 700, emptyRecords());
    w.resume();
    w.bins[0].filled = 8;
    w.bins[1].filled = 8;
    const random = Math.random;
    Math.random = () => 0;
    w.update(1);
    Math.random = random;
    const spawn = w.items[0].type;
    w.levels.auto = 1;
    w.update(2.5);
    w.update(.5);
    const xp = w.records.progression.totalSorted;
    w.dumpOffer = { bonus: 100, remaining: 5 };
    w.pause();
    w.update(2);
    return { spawn, xp, remaining: w.dumpOffer.remaining, paused: w.paused };
  });
  expect(result).toEqual({ spawn: 'yellow', xp: 0, remaining: 5, paused: true });
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 720 }]) {
  test(`responsive UI and keyboard dialog at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const start = dialog.getByRole('button', { name: 'Начать сортировку', exact: true });
    await start.click();
    await expect(dialog).not.toBeVisible();
    const band = page.getByRole('button', { name: /Мой прогресс/ });
    await band.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    const geometry = await page.evaluate(async () => {
      const { computeLayout } = await import('/src/game/layout.ts');
      const l = computeLayout(innerWidth, innerHeight, ['red','blue','yellow','green','purple','orange'], { freeCoins: true });
      return { inside: [l.hud, l.progress, l.belt, ...l.bins, l.treeButton,l.groupButton].every(r => r.x >= 0 && r.y >= 0 && r.x+r.width <= innerWidth+1 && r.y+r.height <= innerHeight+1), overlap: l.progress.y+l.progress.height > l.belt.y, scroll: document.documentElement.scrollWidth > innerWidth };
    });
    expect(geometry).toEqual({ inside: true, overlap: false, scroll: false });
  });
}

test('touch drag sorts a shape on a mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.addInitScript(() => { Math.random = () => 0; Element.prototype.requestFullscreen = async () => {}; });
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать сортировку', exact: true }).tap();
  const l = await page.evaluate(async () => {
    const { computeLayout } = await import('/src/game/layout.ts');
    const rect = document.querySelector('canvas')!.getBoundingClientRect();
    return computeLayout(rect.width, rect.height, ['red', 'blue', 'yellow']);
  });
  await page.waitForTimeout(1800);
  const speed = await page.evaluate(async (layout) => {
    const { conveyorPace } = await import('/src/game/difficulty.ts');
    const { emptyLevels } = await import('/src/game/upgrades.ts');
    return conveyorPace(0,emptyLevels(),layout.belt.width,layout.itemSize).speed;
  }, l);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: l.belt.x - l.itemSize * .35 + speed * .95, y: l.belt.y + l.belt.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: l.bins[0].x + l.bins[0].width/2, y: l.bins[0].y + 80 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('sortup-records') || '{}').progression?.totalSorted)).toBe(1);
  await context.close();
});
