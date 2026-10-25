import { expect, test, type Page } from "@playwright/test";

async function fakeSdk(page: Page, storageOnly = false): Promise<void> {
  await page.route("**/sdk.js", route => route.fulfill({ contentType: "application/javascript", body: "" }));
  await page.addInitScript(({ storageOnly }) => {
    const state = window as any;
    state.__sdkCalls = [];
    state.__sdkEvents = {};
    state.__cloudWrites = [];
    state.__pendingWrites = [];
    state.__activeWrites = 0;
    state.__maxWrites = 0;
    state.__safeStorage = {};
    state.YaGames = {
      init: async () => ({
        environment: { i18n: { lang: "ru" } },
        on: (event: string, handler: () => void) => { state.__sdkEvents[event] = handler; },
        features: {
          LoadingAPI: { ready: () => state.__sdkCalls.push("ready") },
          GameplayAPI: {
            start: () => state.__sdkCalls.push("start"),
            stop: () => state.__sdkCalls.push("stop"),
          },
        },
        adv: {
          showRewardedVideo: ({ callbacks }: any) => { state.__rewardedCallbacks = callbacks; },
          showFullscreenAdv: ({ callbacks }: any) => callbacks.onClose(false),
        },
        getPlayer: async () => {
          if (storageOnly) throw new Error("Guest without player data");
          return {
            getData: async () => ({}),
            setData: (data: any) => new Promise<void>((resolve) => {
              state.__cloudWrites.push(JSON.parse(JSON.stringify(data)));
              state.__activeWrites++;
              state.__maxWrites = Math.max(state.__maxWrites, state.__activeWrites);
              state.__pendingWrites.push(() => { state.__activeWrites--; resolve(); });
            }),
          };
        },
        getStorage: async () => ({
          getItem: (key: string) => state.__safeStorage[key] ?? null,
          setItem: (key: string, value: string) => { state.__safeStorage[key] = value; },
        }),
      }),
    };
  }, { storageOnly });
}

async function loaded(page: Page): Promise<void> {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => (window as any).__sdkCalls.includes("ready"))).toBe(true);
}

test("ready is sent for the start menu; platform pause blocks gameplay until resumed", async ({ page }) => {
  await fakeSdk(page);
  await loaded(page);
  expect(await page.evaluate(() => (window as any).__sdkCalls)).toEqual(["ready"]);
  const calls = await page.evaluate(async () => {
    const { yandexService } = await import("/src/services/YandexService.ts");
    const state = window as any;
    let paused = 0;
    let resumed = 0;
    yandexService.onPlatformPause(() => paused++);
    yandexService.onPlatformResume(() => resumed++);
    yandexService.gameplayStart();
    state.__sdkEvents.game_api_pause();
    yandexService.gameplayStart(); // Must remain blocked while platform pause is active.
    state.__sdkEvents.game_api_resume();
    return { calls: state.__sdkCalls, paused, resumed, platformPaused: yandexService.platformPaused };
  });
  expect(calls).toEqual({ calls: ["ready", "start", "stop"], paused: 1, resumed: 1, platformPaused: false });
});

test("rewarded ad grants only onRewarded, never on close, error or a late callback", async ({ page }) => {
  await fakeSdk(page);
  await loaded(page);
  const results = await page.evaluate(async () => {
    const { yandexService } = await import("/src/services/YandexService.ts");
    const state = window as any;
    let promise = yandexService.showRewardedAd();
    const oldCallbacks = state.__rewardedCallbacks;
    oldCallbacks.onClose(false);
    oldCallbacks.onRewarded(); // A callback arriving after completion cannot change the result.
    const skipped = await promise;
    promise = yandexService.showRewardedAd();
    state.__rewardedCallbacks.onError(new Error("No inventory"));
    const failed = await promise;
    promise = yandexService.showRewardedAd();
    state.__rewardedCallbacks.onRewarded();
    state.__rewardedCallbacks.onRewarded();
    state.__rewardedCallbacks.onClose(true);
    return { skipped, failed, watched: await promise };
  });
  expect(results).toEqual({ skipped: { rewarded: false }, failed: { rewarded: false }, watched: { rewarded: true } });
});

test("cloud writes are serialized and coalesced while local progress is saved immediately", async ({ page }) => {
  await page.clock.install();
  await fakeSdk(page);
  await loaded(page);
  await page.evaluate(async () => {
    const { yandexService } = await import("/src/services/YandexService.ts");
    const { emptyRecords } = await import("/src/game/save.ts");
    await yandexService.saveGame({ ...emptyRecords(), bestCoins: 10 });
  });
  await page.clock.runFor(300);
  expect(await page.evaluate(() => (window as any).__cloudWrites.map((save: any) => save.bestCoins))).toEqual([10]);
  await page.evaluate(async () => {
    const { yandexService } = await import("/src/services/YandexService.ts");
    const { emptyRecords } = await import("/src/game/save.ts");
    await yandexService.saveGame({ ...emptyRecords(), bestCoins: 20 });
    await yandexService.saveGame({ ...emptyRecords(), bestCoins: 30 });
    (window as any).__pendingWrites.shift()();
  });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("sortup-records")!).bestCoins)).toBe(30);
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => (window as any).__cloudWrites.length)).toBe(1);
  await page.clock.runFor(4500);
  expect(await page.evaluate(() => ({
    values: (window as any).__cloudWrites.map((save: any) => save.bestCoins),
    concurrent: (window as any).__maxWrites,
  }))).toEqual({ values: [10, 30], concurrent: 1 });
  await page.evaluate(() => (window as any).__pendingWrites.shift()());
});

test("guest storage fallback persists progress when player data is unavailable", async ({ page }) => {
  await page.clock.install();
  await fakeSdk(page, true);
  await loaded(page);
  await page.evaluate(async () => {
    const { yandexService } = await import("/src/services/YandexService.ts");
    const { emptyRecords } = await import("/src/game/save.ts");
    const records = emptyRecords();
    records.bestCoins = 99;
    records.progression.totalSorted = 15;
    await yandexService.saveGame(records);
  });
  await page.clock.runFor(300);
  const restored = await page.evaluate(async () => {
    const { yandexService } = await import("/src/services/YandexService.ts");
    localStorage.removeItem("sortup-records");
    const records = await yandexService.loadGame();
    return { coins: records.bestCoins, sorted: records.progression.totalSorted };
  });
  expect(restored).toEqual({ coins: 99, sorted: 15 });
});

test("jackpot offer stops gameplay, timeout resumes it, platform pause blocks restart", async ({ page }) => {
  await fakeSdk(page);
  await loaded(page);
  const result = await page.evaluate(async () => {
    const { World } = await import("/src/game/world.ts");
    const { emptyRecords } = await import("/src/game/save.ts");
    const w = new World(800, 700, emptyRecords());
    w.resume();
    w.bins.forEach(bin => { bin.filled = bin.capacity; });
    (w as any).tryDump();
    const stopped = [...(window as any).__sdkCalls];
    w.pause();
    w.resume(); // Offer is still visible, so do not start gameplay.
    const stillStopped = [...(window as any).__sdkCalls];
    w.update(6);
    const resumed = [...(window as any).__sdkCalls];
    w.status = "over";
    (window as any).__sdkEvents.game_api_pause();
    w.restart();
    return { stopped, stillStopped, resumed, status: w.status };
  });
  expect(result).toEqual({
    stopped: ["ready", "start", "stop"],
    stillStopped: ["ready", "start", "stop"],
    resumed: ["ready", "start", "stop", "start"],
    status: "over",
  });
});
