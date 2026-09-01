import { BASE_TYPES, EXTRA_TYPE, type ItemType, type UpgradeId } from "../config.ts";

export type UpgradeLevels = Record<UpgradeId, number>;

export function emptyLevels(): UpgradeLevels {
  return {
    speed: 0,
    value: 0,
    type: 0,
    auto: 0,
    buffer: 0,
  };
}

export function activeTypes(levels: UpgradeLevels): ItemType[] {
  return levels.type > 0 ? [...BASE_TYPES, EXTRA_TYPE] : [...BASE_TYPES];
}

export function beltSpeed(levels: UpgradeLevels): number {
  return 140 + 40 * levels.speed;
}

export function spawnInterval(levels: UpgradeLevels): number {
  return Math.max(0.45, 0.85 - 0.08 * levels.speed);
}

export function minGap(levels: UpgradeLevels): number {
  return 64 + 22 * levels.buffer;
}

export function coinValue(levels: UpgradeLevels): number {
  return 10 + 10 * levels.value;
}

export function autoInterval(levels: UpgradeLevels): number {
  if (levels.auto <= 0) {
    return 0;
  }
  return Math.max(0.9, 2.4 - 0.5 * (levels.auto - 1));
}
