import { test, expect } from "@playwright/test";

test('records and paid upgrades survive reload before game over', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  const first = await page.evaluate(async () => {
    const { World } = await import('/src/game/world.ts');
    const { emptyRecords, loadRecords, loadSession } = await import('/src/game/save.ts');
    const { createItem } = await import('/src/game/item.ts');
    const { INPUT } = await import('/src/config.ts');
    const w = new World(800, 700, emptyRecords());
    w.resume();
    for (let i = 0; i < 4; i++) {
      const item = createItem('red', 160, w.layout.belt.y + 30, w.layout.itemSize);
      w.items.push(item);
      w.pointerDown(item.x, item.y);
      const slot = w.layout.bins[0];
      w.pointerUp(slot.x + slot.width/2, slot.y + slot.height/2 + INPUT.dragLift);
    }
    w.coins=60; // Fixed purchase budget; income has its own economy tests.
    const bought = w.tryBuy('value');
    return { bought, record: loadRecords(), session: loadSession() };
  });
  expect(first.bought).toBe(true);
  expect(first.record.bestCoins).toBe(15);
  expect(first.record.bestCombo).toBe(4);
  expect(first.session).toMatchObject({ coins: 15, combo: 4, maxCombo: 4, lives: 3, levels: { value: 1 }, bins: { red: 4 }, status: 'playing' });
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  const restored = await page.evaluate(async () => {
    const { World } = await import('/src/game/world.ts');
    const { loadRecords } = await import('/src/game/save.ts');
    const w = new World(800, 700, loadRecords());
    return { coins: w.coins, combo: w.combo, value: w.levels.value, red: w.bins[0].filled,
      paused: w.paused, restored: w.restoredSession, items: w.items.length, beatCoins: w.beatBestCoins, beatCombo: w.beatBestCombo };
  });
  expect(restored).toEqual({ coins: 15, combo: 4, value: 1, red: 4, paused: true, restored: true, items: 0, beatCoins: true, beatCombo: true });
});

test('jackpot and daily reward are durable and do not pay a second time on reconstruction', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  const result = await page.evaluate(async () => {
    const { World } = await import('/src/game/world.ts');
    const { emptyRecords, loadRecords, loadSession } = await import('/src/game/save.ts');
    const w = new World(800, 700, emptyRecords());
    w.resume();
    w.bins.forEach(b => { b.filled = b.capacity; });
    (w as any).tryDump();
    const saved = loadSession();
    const restored = new World(800, 700, loadRecords());
    return { coins: w.coins, savedCoins: saved?.coins, restoredCoins: restored.coins,
      sets: restored.records.progression.totalSets, claimed: restored.records.progression.daily.claimed,
      filled: restored.bins.map(b => b.filled), record: restored.records.bestCoins };
  });
  expect(result).toEqual({ coins: 66, savedCoins: 66, restoredCoins: 66, sets: 1, claimed: ['set'], filled: [0, 0, 0], record: 66 });
});

test('in-flight autosort reservations are excluded from session progress', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  const result = await page.evaluate(async () => {
    const { World } = await import('/src/game/world.ts');
    const { emptyRecords, loadRecords, loadSession } = await import('/src/game/save.ts');
    const { createItem } = await import('/src/game/item.ts');
    const { INPUT } = await import('/src/config.ts');
    const w = new World(800, 700, emptyRecords());
    w.resume();
    const flying = createItem('red', 160, w.layout.belt.y + 30, w.layout.itemSize);
    w.items.push(flying);
    (w as any).beginAutoSort(flying, w.bins[0]);
    const held = createItem('blue', 260, w.layout.belt.y + 30, w.layout.itemSize);
    w.items.push(held);
    w.pointerDown(held.x, held.y);
    const slot = w.layout.bins[1];
    w.pointerUp(slot.x + slot.width/2, slot.y + slot.height/2 + INPUT.dragLift);
    const saved = loadSession();
    const restored = new World(800, 700, loadRecords());
    return { live: w.bins.map(b => b.filled), saved: saved?.bins, restored: restored.bins.map(b => b.filled), sorted: restored.sortedCount };
  });
  expect(result).toEqual({ live: [1, 1, 0], saved: { red: 0, blue: 1, yellow: 0 }, restored: [0, 1, 0], sorted: 1 });
});

test('game over and restart persist exactly one completed game and preserve record flags', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  const result = await page.evaluate(async () => {
    const { World } = await import('/src/game/world.ts');
    const { emptyRecords, loadRecords, loadSession } = await import('/src/game/save.ts');
    const w = new World(800, 700, emptyRecords());
    w.resume();
    w.coins = 500;
    (w as any).persistRecords();
    w.coins = 100;
    for (let i = 0; i < 3; i++) (w as any).applyMiss();
    const over = new World(800, 700, loadRecords());
    const old = { status: over.status, lives: over.lives, games: over.records.gamesPlayed, beat: over.beatBestCoins, best: over.records.bestCoins };
    over.restart();
    return { old, restarted: loadSession(), games: over.records.gamesPlayed };
  });
  expect(result.old).toEqual({ status: 'over', lives: 0, games: 1, beat: true, best: 500 });
  expect(result.restarted).toMatchObject({ status: 'playing', lives: 3, coins: 10, combo: 0, beatBestCoins: false });
  expect(result.games).toBe(1);
});

test('malformed session data cannot introduce invalid upgrades, bins, money or lives', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  const result = await page.evaluate(async () => {
    const { sanitizeSession, loadSession } = await import('/src/game/save.ts');
    localStorage.setItem('sortup-session-v1', '{not valid JSON');
    const invalid = loadSession();
    const normalized = sanitizeSession({ version: 2, status: 'playing', coins: Infinity, combo: -2, maxCombo: 4,
      manualCombo: 99, lives: 999, levels: { speed: 99, value: NaN, type: 2, auto: -3, buffer: '2' },
      bins: { red: 999, blue: -2, purple: 1, orange: 8 }, sortedCount: null });
    return { invalid, wrongVersion: sanitizeSession({ version: 1 }), normalized };
  });
  expect(result.invalid).toBeNull();
  expect(result.wrongVersion).toBeNull();
  expect(result.normalized).toMatchObject({ coins: 0, combo: 0, maxCombo: 4, manualCombo: 0, lives: 3,
    levels: { speed: 0, value: 0, type: 0, auto: 0, buffer: 0 },
    bins: { red: 8, blue: 0, yellow: 0 }, sortedCount: 0 });
  expect(result.normalized?.bins).not.toHaveProperty('orange');
});

test('platform resume restores only a running game and waits until an ad closes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  const result = await page.evaluate(async () => {
    const { World } = await import('/src/game/world.ts');
    const { emptyRecords } = await import('/src/game/save.ts');
    const w = new World(800, 700, emptyRecords());
    w.resume();
    w.pauseForPlatform();
    w.pauseForPlatform(); // Duplicate notifications must retain the original running state.
    w.resumeFromPlatform();
    const running = !w.paused;
    w.pause();
    w.pauseForPlatform();
    w.resumeFromPlatform();
    const manualPause = w.paused;
    w.resume();
    w.beginAd();
    w.pauseForPlatform();
    w.resumeFromPlatform();
    const waitingForClose = w.paused;
    w.endAd();
    const resumedAfterClose = !w.paused;
    w.beginAd();
    w.pauseForPlatform();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    w.endAd();
    const stayedHidden = w.paused;
    delete (document as any).hidden;
    w.resumeFromPlatform();
    return { running, manualPause, waitingForClose, resumedAfterClose, stayedHidden, resumedOnReturn: !w.paused };
  });
  expect(result).toEqual({ running: true, manualPause: true, waitingForClose: true, resumedAfterClose: true, stayedHidden: true, resumedOnReturn: true });
});
