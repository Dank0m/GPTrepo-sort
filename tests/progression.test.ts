import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  advanceProgression,
  dailyMissions,
  emptyProgression,
  mergeProgression,
  rankInfo,
  sanitizeProgression,
} from "../src/game/progression.ts";

const TODAY = Date.parse("2026-10-25T23:59:59Z");
const TOMORROW = Date.parse("2026-10-26T00:00:00Z");
const manual = (combo = 1) => ({ kind: "sort" as const, combo, manual: true });

test("old and absent saves start safely with today's missions", () => {
  for (const raw of [null, undefined, {}, { bestCoins: 500 }, [], "bad"]) {
    assert.deepEqual(sanitizeProgression(raw, TODAY), emptyProgression(TODAY));
  }
});

test("damaged counters, invalid daily data, and unknown claim IDs are repaired", () => {
  const progress = sanitizeProgression({
    xp: Infinity, totalSorted: -1, totalSets: 3.8,
    daily: { day: "2026-10-25", sorted: NaN, bestCombo: "12", sets: -2, claimed: ["bad", "sort", "sort"] },
  }, TODAY);
  assert.equal(progress.xp, 0);
  assert.equal(progress.totalSorted, 0);
  assert.equal(progress.totalSets, 3);
  assert.deepEqual(progress.daily, { day: "2026-10-25", sorted: 0, bestCombo: 0, sets: 0, claimed: ["sort"] });
});

test("manual sorts earn XP; automatic sorts cannot farm manual missions", () => {
  const progress = emptyProgression(TODAY);
  for (let i = 0; i < 40; i++) advanceProgression(progress, { kind: "sort", combo: 40, manual: false }, TODAY);
  assert.equal(progress.xp, 0);
  assert.equal(progress.totalSorted, 0);
  advanceProgression(progress, manual(3), TODAY);
  assert.equal(progress.xp, 2);
  assert.equal(progress.totalSorted, 1);
  assert.equal(progress.daily.bestCombo, 3);
});

test("30 sorts award one daily reward even across a save round trip", () => {
  let progress = emptyProgression(TODAY);
  for (let i = 0; i < 29; i++) {
    assert.equal(advanceProgression(progress, manual(), TODAY).coins, 0);
  }
  assert.deepEqual(advanceProgression(progress, manual(), TODAY), { coins: 25, completed: ["sort"], rankUp: true });
  assert.equal(progress.xp, 135);
  progress = sanitizeProgression(JSON.parse(JSON.stringify(progress)), TODAY);
  assert.equal(advanceProgression(progress, manual(), TODAY).coins, 0);
  assert.equal(progress.xp, 137);
});

test("combo and full-set missions award their exact advertised XP and coins once", () => {
  const progress = emptyProgression(TODAY);
  assert.equal(advanceProgression(progress, manual(12), TODAY).coins, 20);
  assert.equal(progress.xp, 102);
  assert.deepEqual(advanceProgression(progress, { kind: "set" }, TODAY).completed, ["set"]);
  assert.equal(progress.xp, 247);
  assert.equal(progress.totalSets, 1);
  assert.equal(advanceProgression(progress, { kind: "set" }, TODAY).coins, 0);
  assert.equal(progress.xp, 267);
});

test("one action may finish two missions and pays both exactly once", () => {
  const progress = emptyProgression(TODAY);
  progress.daily.sorted = 29;
  const result = advanceProgression(progress, manual(12), TODAY);
  assert.deepEqual(result.completed, ["sort", "combo"]);
  assert.equal(result.coins, 45);
  assert.equal(progress.xp, 177);
});

test("UTC midnight rotates missions without removing permanent XP or requiring a streak", () => {
  const progress = emptyProgression(TODAY);
  advanceProgression(progress, { kind: "set" }, TODAY);
  const yesterdayXp = progress.xp;
  assert.equal(advanceProgression(progress, { kind: "set" }, TOMORROW).coins, 30);
  assert.equal(progress.xp, yesterdayXp + 145);
  assert.equal(progress.totalSets, 2);
  assert.equal(progress.daily.day, "2026-10-26");
  assert.equal(progress.daily.sets, 1);
});

test("loading yesterday or a future day resets only daily data", () => {
  const progress = emptyProgression(TODAY);
  advanceProgression(progress, manual(12), TODAY);
  for (const now of [TOMORROW, TODAY - 86400000]) {
    const loaded = sanitizeProgression(progress, now);
    assert.equal(loaded.xp, 102);
    assert.equal(loaded.totalSorted, 1);
    assert.deepEqual(loaded.daily.claimed, []);
    assert.equal(loaded.daily.sorted, 0);
  }
});

test("loading a completed partial save seals missions without granting another reward", () => {
  const progress = sanitizeProgression({
    xp: 500,
    daily: { day: "2026-10-25", sorted: 30, bestCombo: 12, sets: 1 },
  }, TODAY);
  assert.equal(progress.xp, 500);
  assert.deepEqual(progress.daily.claimed, ["sort", "combo", "set"]);
  assert.equal(advanceProgression(progress, manual(20), TODAY).coins, 0);
  assert.equal(progress.xp, 502);
});

test("ranks have quadratic thresholds and a bounded starting bonus", () => {
  assert.deepEqual(rankInfo(0), { level: 1, current: 0, needed: 100, startingCoins: 0 });
  assert.equal(rankInfo(99).level, 1);
  assert.deepEqual(rankInfo(100), { level: 2, current: 0, needed: 300, startingCoins: 2 });
  assert.equal(rankInfo(399).level, 2);
  assert.deepEqual(rankInfo(400), { level: 3, current: 0, needed: 500, startingCoins: 4 });
  assert.equal(rankInfo(100000).startingCoins, 10);
  assert.deepEqual(rankInfo(NaN), rankInfo(0));
});

test("merging local/cloud uses maxima and union, never summing or replaying rewards", () => {
  const local = emptyProgression(TODAY);
  const cloud = emptyProgression(TODAY);
  advanceProgression(local, manual(12), TODAY);
  advanceProgression(cloud, { kind: "set" }, TODAY);
  const merged = mergeProgression(local, cloud, TODAY);
  assert.equal(merged.xp, 145);
  assert.equal(merged.totalSorted, 1);
  assert.equal(merged.totalSets, 1);
  assert.deepEqual(merged.daily.claimed, ["combo", "set"]);
  assert.equal(advanceProgression(merged, manual(12), TODAY).coins, 0);
  assert.equal(advanceProgression(merged, { kind: "set" }, TODAY).coins, 0);
  assert.deepEqual(mergeProgression(merged, merged, TODAY), merged);
});

test("merging another day's cloud data retains lifetime progress but only today's missions", () => {
  const old = emptyProgression(TODAY);
  advanceProgression(old, { kind: "set" }, TODAY);
  const current = emptyProgression(TOMORROW);
  advanceProgression(current, manual(), TOMORROW);
  const merged = mergeProgression(old, current, TOMORROW);
  assert.equal(merged.xp, 145);
  assert.equal(merged.totalSets, 1);
  assert.equal(merged.daily.sorted, 1);
  assert.equal(merged.daily.sets, 0);
  assert.deepEqual(merged.daily.claimed, []);
});

test("mission view clamps progress and preserves displayed reward amounts", () => {
  const progress = emptyProgression(TODAY);
  advanceProgression(progress, manual(40), TODAY);
  const missions = dailyMissions(progress);
  assert.deepEqual(missions[1], { id: "combo", current: 12, target: 12, done: true, rewardXp: 100, rewardCoins: 20 });
  assert.equal(missions[0].done, false);
  assert.equal(missions[0].current, 1);
  assert.equal(missions[2].target, 1);
});
