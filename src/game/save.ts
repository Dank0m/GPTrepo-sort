export type Records = {
  bestCoins: number;
  bestCombo: number;
  gamesPlayed: number;
};

const KEY = "sortup-records";

export function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyRecords();
    const parsed = JSON.parse(raw) as Partial<Records>;
    return {
      bestCoins: Math.max(0, Math.floor(Number(parsed.bestCoins) || 0)),
      bestCombo: Math.max(0, Math.floor(Number(parsed.bestCombo) || 0)),
      gamesPlayed: Math.max(0, Math.floor(Number(parsed.gamesPlayed) || 0)),
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
  return { bestCoins: 0, bestCombo: 0, gamesPlayed: 0 };
}
