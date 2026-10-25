/** Permanent, offline-first progression. Calendar missions use UTC and never require a streak. */
export type MissionId = "sort" | "combo" | "set";

export type Progression = {
  version: 1;
  xp: number;
  totalSorted: number;
  totalSets: number;
  daily: {
    day: string;
    sorted: number;
    bestCombo: number;
    sets: number;
    claimed: MissionId[];
  };
};

export type ProgressEvent =
  | { kind: "sort"; combo: number; manual: boolean }
  | { kind: "set" };

export type Mission = {
  id: MissionId;
  current: number;
  target: number;
  done: boolean;
  rewardXp: number;
  rewardCoins: number;
};

const DEFINITIONS = [
  { id: "sort", field: "sorted", target: 30, rewardXp: 75, rewardCoins: 150 },
  { id: "combo", field: "bestCombo", target: 12, rewardXp: 100, rewardCoins: 200 },
  { id: "set", field: "sets", target: 1, rewardXp: 125, rewardCoins: 250 },
] as const;

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value)))
    : 0;
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function emptyProgression(now = Date.now()): Progression {
  return {
    version: 1,
    xp: 0,
    totalSorted: 0,
    totalSets: 0,
    daily: { day: utcDay(now), sorted: 0, bestCombo: 0, sets: 0, claimed: [] },
  };
}

export function sanitizeProgression(raw: unknown, now = Date.now()): Progression {
  const result = emptyProgression(now);
  const data = object(raw);
  result.xp = count(data.xp);
  result.totalSorted = count(data.totalSorted);
  result.totalSets = count(data.totalSets);
  const daily = object(data.daily);
  if (daily.day === result.daily.day) {
    result.daily.sorted = count(daily.sorted);
    result.daily.bestCombo = count(daily.bestCombo);
    result.daily.sets = count(daily.sets);
    const claimed = Array.isArray(daily.claimed) ? daily.claimed : [];
    // Completed missions in a partially damaged save must not award twice on reload.
    result.daily.claimed = DEFINITIONS
      .filter((mission) => claimed.includes(mission.id) || result.daily[mission.field] >= mission.target)
      .map((mission) => mission.id);
  }
  return result;
}

/** Merge monotonically; never sum snapshots or replay calendar rewards. */
export function mergeProgression(a: unknown, b: unknown, now = Date.now()): Progression {
  const left = sanitizeProgression(a, now);
  const right = sanitizeProgression(b, now);
  return sanitizeProgression({
    version: 1,
    xp: Math.max(left.xp, right.xp),
    totalSorted: Math.max(left.totalSorted, right.totalSorted),
    totalSets: Math.max(left.totalSets, right.totalSets),
    daily: {
      day: left.daily.day,
      sorted: Math.max(left.daily.sorted, right.daily.sorted),
      bestCombo: Math.max(left.daily.bestCombo, right.daily.bestCombo),
      sets: Math.max(left.daily.sets, right.daily.sets),
      claimed: [...left.daily.claimed, ...right.daily.claimed],
    },
  }, now);
}

export function rankInfo(xp: number): {
  level: number;
  current: number;
  needed: number;
  startingCoins: number;
} {
  const safeXp = count(xp);
  const level = 1 + Math.floor(Math.sqrt(safeXp / 100));
  const previous = 100 * (level - 1) ** 2;
  const next = 100 * level ** 2;
  return {
    level,
    current: safeXp - previous,
    needed: next - previous,
    startingCoins: Math.min(100, (level - 1) * 10),
  };
}

export function dailyMissions(progress: Progression): Mission[] {
  return DEFINITIONS.map((mission) => ({
    id: mission.id,
    current: Math.min(mission.target, progress.daily[mission.field]),
    target: mission.target,
    done: progress.daily.claimed.includes(mission.id),
    rewardXp: mission.rewardXp,
    rewardCoins: mission.rewardCoins,
  }));
}

/** Mutates the save in one operation; callers persist after each award/event. */
export function advanceProgression(
  progress: Progression,
  event: ProgressEvent,
  now = Date.now(),
): { coins: number; completed: MissionId[]; rankUp: boolean } {
  Object.assign(progress, sanitizeProgression(progress, now));
  const before = rankInfo(progress.xp).level;
  const result = { coins: 0, completed: [] as MissionId[], rankUp: false };
  if (event.kind === "sort") {
    if (!event.manual) return result;
    progress.xp = count(progress.xp + 2);
    progress.totalSorted = count(progress.totalSorted + 1);
    progress.daily.sorted = count(progress.daily.sorted + 1);
    progress.daily.bestCombo = Math.max(progress.daily.bestCombo, count(event.combo));
  } else {
    progress.xp = count(progress.xp + 20);
    progress.totalSets = count(progress.totalSets + 1);
    progress.daily.sets = count(progress.daily.sets + 1);
  }
  for (const mission of DEFINITIONS) {
    if (progress.daily[mission.field] < mission.target || progress.daily.claimed.includes(mission.id)) {
      continue;
    }
    progress.daily.claimed.push(mission.id);
    progress.xp = count(progress.xp + mission.rewardXp);
    result.coins += mission.rewardCoins;
    result.completed.push(mission.id);
  }
  result.rankUp = rankInfo(progress.xp).level > before;
  return result;
}
