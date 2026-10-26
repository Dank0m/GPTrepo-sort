import { BIN_CAPACITY, ECONOMY, type ItemType } from "../config.ts";
import { activeTypes, emptyLevels, sanitizeLevels, type UpgradeLevels } from "./upgrades.ts";
import { emptyProgression, sanitizeProgression, type Progression } from "./progression.ts";

export type Records = {
  economyVersion: 2;
  tree: UpgradeLevels;
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

/** Old runaway coin balances/scores cannot be carried into the new economy. Mastery remains. */
export function sanitizeRecords(raw: unknown): Records {
  const parsed = raw && typeof raw === "object" ? raw as Partial<Records> : {};
  return {
    economyVersion: 2,
    tree: sanitizeLevels(parsed.economyVersion === 2 ? parsed.tree : null),
    bestCoins: parsed.economyVersion === 2 ? counter(parsed.bestCoins) : 0,
    bestCombo: counter(parsed.bestCombo), gamesPlayed: counter(parsed.gamesPlayed),
    progression: sanitizeProgression(parsed.progression),
  };
}
export function loadRecords(): Records {
  try { return sanitizeRecords(JSON.parse(localStorage.getItem(KEY) || "null")); }
  catch { return emptyRecords(); }
}

export function saveRecords(records: Records): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    /* ignore quota / private mode */
  }
}

export function emptyRecords(): Records {
  return { economyVersion: 2, tree: emptyLevels(), bestCoins: 0, bestCombo: 0, gamesPlayed: 0, progression: emptyProgression() };
}

/** Session progress is local to this device; permanent records also use SDK cloud saves. */
export type SessionSave = {
  version: 2;
  rescueCooldown: number;
  pulseRemaining: number;
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
  if (!data || data.version !== 2 || (data.status !== "playing" && data.status !== "over")) return null;
  const rawLevels = object(data.levels);
  if (!rawLevels) return null;
  const levels = sanitizeLevels(rawLevels);
  const bins: Partial<Record<ItemType, number>> = {};
  const rawBins = object(data.bins) ?? {};
  for (const type of activeTypes(levels)) bins[type] = Math.min(BIN_CAPACITY, counter(rawBins[type]));
  const combo = counter(data.combo);
  return {
    version: 2,
    rescueCooldown: Math.min(25, counter(data.rescueCooldown)),
    pulseRemaining: Math.min(6, counter(data.pulseRemaining)),
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
