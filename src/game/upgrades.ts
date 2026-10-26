import { BASE_TYPES, EXTRA_TYPES, UPGRADE_IDS, UPGRADES, type ItemType, type UpgradeId } from "../config.ts";

export type UpgradeLevels = Record<UpgradeId, number>;
export function emptyLevels(): UpgradeLevels {
  return Object.fromEntries(UPGRADE_IDS.map(id => [id, 0])) as UpgradeLevels;
}
export function sanitizeLevels(raw: unknown): UpgradeLevels {
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const levels = emptyLevels();
  for (const id of UPGRADE_IDS) {
    const n = data[id];
    levels[id] = typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(UPGRADES[id].max, Math.floor(n))) : 0;
  }
  for (const id of UPGRADE_IDS) {
    const required = UPGRADES[id].requires;
    if (required && levels[required.id] < required.level) levels[id] = 0;
  }
  return levels;
}
export function mergeLevels(a: UpgradeLevels, b: UpgradeLevels): UpgradeLevels {
  return sanitizeLevels(Object.fromEntries(UPGRADE_IDS.map(id => [id, Math.max(a[id], b[id])])));
}
export function upgradeUnlocked(id: UpgradeId, levels: UpgradeLevels): boolean {
  const required = UPGRADES[id].requires;
  return !required || levels[required.id] >= required.level;
}
export function activeTypes(levels: UpgradeLevels): ItemType[] {
  return [...BASE_TYPES, ...EXTRA_TYPES.slice(0, levels.type)];
}
export function beltSpeed(levels: UpgradeLevels): number { return 140 * (levels.speed ? .85 : 1); }
export function spawnInterval(_levels: UpgradeLevels): number { return .85; }
export function minGap(levels: UpgradeLevels): number { return 64 + 22 * levels.buffer; }
/** Integer, bounded combo bonus: +1 per ten manual sorts, capped at +1 / +2 / +3. */
export function sortReward(levels: UpgradeLevels, combo: number, manual = true): number {
  const base = 3 + levels.value;
  if (!manual) return Math.max(1, Math.floor(base / 2));
  return base + Math.min(1 + levels.combo, Math.floor(Math.max(0, combo - 1) / 10));
}
export function autoInterval(levels: UpgradeLevels): number {
  return levels.auto === 0 ? 0 : levels.auto === 1 ? 5 : 3.5;
}
