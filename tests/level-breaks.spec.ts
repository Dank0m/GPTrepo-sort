import { test, expect } from '@playwright/test';

test('the twentieth manual sort pauses the whole world, limits shopping to breaks and restores it after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать сортировку', exact: true }).waitFor();
  const result = await page.evaluate(async () => {
    const { World } = await import('/src/game/world.ts');
    const { emptyRecords, loadRecords } = await import('/src/game/save.ts');
    const { createItem } = await import('/src/game/item.ts');
    const { INPUT } = await import('/src/config.ts');
    localStorage.removeItem('sortup-session-v1');
    const w = new World(900, 700, emptyRecords());
    w.resume(); w.coins = 200;
    const blocked = w.tryBuy('value');
    Object.assign(w.levels, { buffer: 1, wide: 1 }); w.records.tree = { ...w.levels };
    w.sortedCount = 19; w.rescueCooldown = 17; w.pulseRemaining = 4;
    const y = w.layout.belt.y + 35;
    const items = [createItem('red', 180, y, 40), createItem('blue', 220, y, 40), createItem('yellow', 260, y, 40)];
    w.items = items;
    w.pointerDown(220, y, 2);
    const slot = w.layout.bins[0];
    w.pointerUp(slot.x + slot.width / 2, slot.y + slot.height / 2 + INPUT.dragLift);
    const boundary = { count: w.sortedCount, break: w.intermission, paused: w.paused, completed: w.completedLevel,
      returned: w.items.map(item => item.state), grabbed: w.grabbed, group: w.groupGrab };
    const snapshot = () => JSON.stringify({ elapsed: w.elapsed, coins: w.coins, lives: w.lives,
      rescue: w.rescueCooldown, pulse: w.pulseRemaining, items: w.items, count: w.sortedCount });
    const before = snapshot();
    w.resume(); w.togglePause(); w.pointerDown(50, 50); w.update(100);
    const frozen = snapshot() === before;
    const bought = w.tryBuy('value');
    const restored = new World(900, 700, loadRecords());
    const saved = { break: restored.intermission, level: restored.levels.value, completed: restored.completedLevel };
    restored.continueLevel();
    const continued = { break: restored.intermission, playable: restored.isPlayable(), purchaseBlocked: !restored.tryBuy('value') };
    return { blocked, boundary, frozen, bought, saved, continued };
  });
  expect(result).toEqual({
    blocked: false,
    boundary: { count: 20, break: true, paused: true, completed: 1, returned: ['onBelt', 'onBelt'], grabbed: null, group: null },
    frozen: true, bought: true,
    saved: { break: true, level: 1, completed: 1 },
    continued: { break: false, playable: true, purchaseBlocked: true },
  });
});

test('simultaneous autosort arrivals stop at the exact level boundary and finish only after Next', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать сортировку', exact: true }).waitFor();
  const result = await page.evaluate(async () => {
    const { World } = await import('/src/game/world.ts');
    const { emptyRecords, loadRecords } = await import('/src/game/save.ts');
    const { createItem } = await import('/src/game/item.ts');
    localStorage.removeItem('sortup-session-v1');
    const w = new World(900, 700, emptyRecords()); w.resume();
    Object.assign(w.levels, { auto: 1, batch: 1 }); w.records.tree = { ...w.levels };
    w.sortedCount = 19;
    const y = w.layout.belt.y + 35;
    w.items = [createItem('red', 250, y, 40), createItem('blue', 210, y, 40)];
    (w as any).runAutoSort(5);
    w.update(.5);
    const boundary = { count: w.sortedCount, break: w.intermission, flights: w.items.filter(item => item.state === 'flying').length };
    const loaded = new World(900, 700, loadRecords());
    const restored = { break: loaded.intermission, counts: loaded.bins.map(bin => bin.filled), flights: loaded.items.length };
    w.continueLevel(); w.update(.01);
    return { boundary, restored, afterNext: { count: w.sortedCount, break: w.intermission, flights: w.items.filter(item => item.state === 'flying').length } };
  });
  expect(result).toEqual({ boundary: { count: 20, break: true, flights: 1 },
    restored: { break: true, counts: [1, 0, 0], flights: 0 },
    afterNext: { count: 21, break: false, flights: 0 } });
});

test('a coincident full-set ad offer waits behind the break and survives reload without replaying income', async ({ page }) => {
  await page.goto('/?mockAds=1');
  await page.getByRole('button', { name: 'Начать сортировку', exact: true }).waitFor();
  const result = await page.evaluate(async () => {
    const { World } = await import('/src/game/world.ts');
    const { emptyRecords, loadRecords, loadSession } = await import('/src/game/save.ts');
    const { createItem } = await import('/src/game/item.ts');
    const { INPUT } = await import('/src/config.ts');
    localStorage.removeItem('sortup-session-v1');
    const w = new World(900, 700, emptyRecords()); w.resume(); w.sortedCount = 19;
    w.bins.forEach(bin => { bin.filled = bin.capacity; }); w.bins[0].filled--;
    const item = createItem('red', 160, w.layout.belt.y + 35, 40); w.items = [item];
    const slot = w.layout.bins[0];
    w.pointerDown(item.x, item.y); w.pointerUp(slot.x + slot.width / 2, slot.y + slot.height / 2 + INPUT.dragLift);
    const session = loadSession()!;
    const hidden = w.dumpOfferUi(900, 700) === null;
    const restored = new World(900, 700, loadRecords()), coins = restored.coins;
    restored.update(60);
    const stopped = { break: restored.intermission, remaining: restored.dumpOffer?.remaining, coins: restored.coins };
    restored.continueLevel();
    const shown = restored.dumpOfferUi(900, 700) !== null;
    restored.update(6);
    return { saved: { break: session.intermission, bonus: session.pendingDumpBonus }, hidden,
      stopped: { ...stopped, unchangedCoins: stopped.coins === coins }, shown, unchangedCoins: restored.coins === coins, offered: restored.dumpOffer !== null };
  });
  expect(result.saved).toEqual({ break: true, bonus: 36 });
  expect(result.hidden).toBe(true);
  expect(result.stopped).toMatchObject({ break: true, remaining: 5, unchangedCoins: true });
  expect(result.shown).toBe(true); expect(result.unchangedCoins).toBe(true); expect(result.offered).toBe(false);
});

test('platform resume, canvas input and restart cannot skip Next; breaks continue past the difficulty cap', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать сортировку', exact: true }).waitFor();
  const result = await page.evaluate(async () => {
    const { World } = await import('/src/game/world.ts');
    const { emptyRecords } = await import('/src/game/save.ts');
    const { createItem } = await import('/src/game/item.ts');
    const { INPUT } = await import('/src/config.ts');
    const { yandexService } = await import('/src/services/YandexService.ts');
    localStorage.removeItem('sortup-session-v1');
    const w = new World(900, 700, emptyRecords()); w.resume();
    const sort = () => {
      const item = createItem('red', 160, w.layout.belt.y + 35, 40); w.items = [item];
      const slot = w.layout.bins[0];
      w.pointerDown(item.x, item.y); w.pointerUp(slot.x + slot.width / 2, slot.y + slot.height / 2 + INPUT.dragLift);
    };
    w.sortedCount = 199; sort();
    const tenth = { completed: w.completedLevel, shift: w.shift.stage, break: w.intermission };
    w.pauseForPlatform(); w.resumeFromPlatform(); w.resume(); w.restart(); w.pointerDown(50, 80);
    yandexService.platformPaused = true; w.continueLevel();
    const blocked = w.intermission && w.sortedCount === 200;
    yandexService.platformPaused = false; w.continueLevel();
    w.sortedCount = 219; sort();
    return { tenth, blocked, eleventh: { completed: w.completedLevel, shift: w.shift.stage, break: w.intermission } };
  });
  expect(result).toEqual({ tenth: { completed: 10, shift: 10, break: true }, blocked: true,
    eleventh: { completed: 11, shift: 10, break: true } });
});
