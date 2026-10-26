import type { UpgradeId } from '../config.ts';

/** Original monochrome pictograms. Each skill has a distinct silhouette. */
export const SKILL_ICONS: Record<UpgradeId, string> = {
  buffer: '<path d="M5 4v16M19 4v16M9 8l-3 4 3 4m6-8 3 4-3 4"/>',
  wide: '<path d="M3 9V4h5m8 0h5v5M3 15v5h5m8 0h5v-5"/><rect x="8" y="9" width="4" height="5" rx="1"/><circle cx="16" cy="13" r="2"/>',
  magnet: '<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4ZM6 8h4m4 0h4"/>',
  unload: '<path d="M4 5h16v10h-5l-3 5-3-5H4Zm8 2v6m-3-3 3 3 3-3"/>',
  speed: '<path d="M4 17a9 9 0 1 1 16 0M12 13l5-5M6 13h1m10 0h1M9 6l1 2"/><circle cx="12" cy="13" r="2"/>',
  auto: '<path d="M4 20h16M7 20v-6l5-5-2-5m2 5 6 3m0 0 2-3m-2 3 1 4"/><circle cx="12" cy="9" r="2"/><circle cx="7" cy="14" r="2"/>',
  batch: '<rect x="3" y="9" width="7" height="9" rx="1"/><rect x="14" y="9" width="7" height="9" rx="1"/><path d="M6 3v4m12-4v4M4 5l2 2 2-2m8 0 2 2 2-2"/>',
  pulse: '<path d="M2 12h5l3-7 4 14 3-7h5"/>',
  recycle: '<path d="M5 8a8 8 0 1 1-1 8M5 3v5h5M9 12h6m-3-3 3 3-3 3"/>',
  value: '<path d="m12 3 8 9-8 9-8-9Z"/><path d="m8 12 3 3 5-6"/>',
  combo: '<path d="m13 2-8 12h6l-1 8 9-13h-7Z"/>',
  type: '<rect x="3" y="4" width="7" height="7" rx="1"/><circle cx="17" cy="8" r="4"/><path d="m8 14 5 7H3Zm9 0 4 4-4 4-4-4Z"/>',
};

export const SIDE_POINTS: Record<UpgradeId, [number, number]> = {
  buffer: [44, 58], wide: [146, 58], magnet: [248, 58], unload: [120, 150], speed: [44, 150],
  auto: [44, 244], batch: [146, 244], recycle: [248, 244], pulse: [95, 334],
  value: [146, 420], combo: [44, 492], type: [248, 492],
};
export const STRIP_POINTS: Record<UpgradeId, [number, number]> = {
  buffer: [36, 26], wide: [110, 26], magnet: [184, 26], unload: [110, 88], speed: [36, 88],
  auto: [278, 26], batch: [352, 26], recycle: [426, 26], pulse: [315, 88],
  value: [520, 26], combo: [483, 88], type: [557, 88],
};
