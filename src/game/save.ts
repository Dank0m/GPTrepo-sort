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
