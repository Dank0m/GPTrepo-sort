import type { UpgradeLevels } from "./upgrades.ts";
import { beltSpeed, minGap, spawnInterval } from "./upgrades.ts";

export const SHAPES_PER_SHIFT = 20;
export const MAX_SHIFT = 10;

/** Escalate through successful play, never by waiting, ads or paying for upgrades. */
export function shiftDifficulty(sorted: number): {
  stage: number; completed: number; remaining: number; speedMultiplier: number; spawnMultiplier: number;
} {
  const count = Number.isFinite(sorted) ? Math.max(0, Math.floor(sorted)) : 0;
  const stage = Math.min(MAX_SHIFT, 1 + Math.floor(count / SHAPES_PER_SHIFT));
  return {
    stage,
    completed: stage === MAX_SHIFT ? SHAPES_PER_SHIFT : count % SHAPES_PER_SHIFT,
    remaining: stage === MAX_SHIFT ? 0 : SHAPES_PER_SHIFT - count % SHAPES_PER_SHIFT,
    speedMultiplier: 1 + (stage - 1) * 0.06,
    spawnMultiplier: 1 - (stage - 1) * 0.03,
  };
}

/** Similar travel time across screen widths; never spawn overlapping shapes. */
export function conveyorPace(sorted: number, levels: UpgradeLevels, beltWidth: number, itemSize: number): {
  speed: number; interval: number; gap: number;
} {
  const difficulty = shiftDifficulty(sorted);
  const scale = Math.max(0.15, beltWidth / 800);
  return {
    speed: beltSpeed(levels) * scale * difficulty.speedMultiplier,
    interval: Math.max(0.35, spawnInterval(levels) * difficulty.spawnMultiplier),
    gap: Math.max(minGap(levels) * scale, (itemSize + 12) * (1 + 0.15 * levels.buffer)),
  };
}
