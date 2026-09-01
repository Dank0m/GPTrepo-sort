export type LevelConfig = {
  level: number;
  seed: number;
  itemTypes: number;
  itemsPerType: number;
  shuffleAmount: number;
  difficulty: number;
  rewardMultiplier: number;
};

export function seedForLevel(level: number): number {
  return (Math.max(1, Math.floor(level)) * 2654435761) >>> 0;
}

/** Phase 1: playable configs only. Full difficulty curve is Phase 2. */
export function configForLevel(level: number): LevelConfig {
  const safe = Math.max(1, Math.floor(level));
  return {
    level: safe,
    seed: seedForLevel(safe),
    itemTypes: 2,
    itemsPerType: Math.min(5, 2 + Math.floor((safe - 1) / 2)),
    shuffleAmount: Math.min(0.6, 0.15 + safe * 0.04),
    difficulty: 1,
    rewardMultiplier: 1,
  };
}
