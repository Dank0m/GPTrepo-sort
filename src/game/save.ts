import { BIN_CAPACITY, ECONOMY, UPGRADE_IDS, UPGRADES, type ItemType } from "../config.ts";
import { activeTypes, emptyLevels, type UpgradeLevels } from "./upgrades.ts";
import { emptyProgression, sanitizeProgression, type Progression } from "./progression.ts";

export type Records = {
  bestCoins: number;
  bestCombo: number;
  gamesPlayed: number;
  progression: Progression;
};

const KEY = "sortup-records";

function counter(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))) : 0;
}

export function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyRecords();
    const parsed = JSON.parse(raw) as Partial<Records>;
    return {
      bestCoins: counter(parsed.bestCoins),
      bestCombo: counter(parsed.bestCombo),
      gamesPlayed: counter(parsed.gamesPlayed),
      progression: sanitizeProgression(parsed.progression),
    };
  } catch {
    return emptyRecords();
  }
}

export function saveRecords(records: Records): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    /* ignore quota / private mode */
  }
}

export function emptyRecords(): Records {
  return { bestCoins: 0, bestCombo: 0, gamesPlayed: 0, progression: emptyProgression() };
}

/** Session progress is local to this device; permanent records also use SDK cloud saves. */
export type SessionSave = {
  version: 1;
  coins: number;
  combo: number;
  maxCombo: number;
  manualCombo: number;
  lives: number;
  status: "playing" | "over";
  sortedCount: number;
  levels: UpgradeLevels;
  bins: Partial<Record<ItemType, number>>;
  beatBestCoins: boolean;
  beatBestCombo: boolean;
};

const SESSION_KEY = "sortup-session-v1";

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

/** Ignore unrecognized schemas and normalize every value before it reaches the world. */
export function sanitizeSession(raw: unknown): SessionSave | null {
  const data = object(raw);
  if (!data || data.version !== 1 || (data.status !== "playing" && data.status !== "over")) return null;
  const rawLevels = object(data.levels);
  if (!rawLevels) return null;
  const levels = emptyLevels();
  for (const id of UPGRADE_IDS) levels[id] = Math.min(UPGRADES[id].max, counter(rawLevels[id]));
  const bins: Partial<Record<ItemType, number>> = {};
  const rawBins = object(data.bins) ?? {};
  for (const type of activeTypes(levels)) bins[type] = Math.min(BIN_CAPACITY, counter(rawBins[type]));
  const combo = counter(data.combo);
  return {
    version: 1,
    coins: counter(data.coins),
    combo,
    maxCombo: Math.max(combo, counter(data.maxCombo)),
    manualCombo: Math.min(combo, counter(data.manualCombo)),
    lives: data.status === "over" ? 0 : Math.min(ECONOMY.startLives, Math.max(1, counter(data.lives))),
    status: data.status,
    sortedCount: counter(data.sortedCount),
    levels,
    bins,
    beatBestCoins: data.beatBestCoins === true,
    beatBestCombo: data.beatBestCombo === true,
  };
}

export function loadSession(): SessionSave | null {
  try {
    return sanitizeSession(JSON.parse(localStorage.getItem(SESSION_KEY) || "null"));
  } catch {
    return null;
  }
}

export function saveSession(session: SessionSave): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* Progress remains playable if storage is unavailable. */
  }
}
