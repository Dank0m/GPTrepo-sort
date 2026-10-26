/** Current development phase. PHASE 7: SDK layer, optional rewarded ads, cloud save. */
export const PHASE = 7;

export const ADS = {
  dumpOfferSeconds: 5,
  mockDelayMs: 650,
} as const;

export const GAME_TITLE = "Sort & Upgrade";

export const ITEM_TYPES = ["red", "blue", "yellow", "green", "purple", "orange"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export const BASE_TYPES: ItemType[] = ["red", "blue", "yellow"];
export const EXTRA_TYPES: ItemType[] = ["green", "purple", "orange"];

export const TYPE_LABEL: Record<ItemType, string> = {
  red: "Квадрат",
  blue: "Круг",
  yellow: "Треуг.",
  green: "Ромб",
  purple: "Звезда",
  orange: "Гекс",
};

export const ITEM_STATE = {
  OnBelt: "onBelt",
  InHand: "inHand",
  InBin: "inBin",
  Flying: "flying",
} as const;
export type ItemState = (typeof ITEM_STATE)[keyof typeof ITEM_STATE];

export const BIN_CAPACITY = 8;

export const BELT = {
  /** CSS pixels per second along the belt (left → right). */
  speed: 140,
  spawnInterval: 0.85,
  minGap: 64,
} as const;

export const INPUT = {
  /** Extra hit padding around an item, CSS pixels. */
  grabPadding: 14,
  groupRadius: 110,
  /** Lift the grabbed item above the pointer so a finger does not cover it. */
  dragLift: 34,
  feedbackSeconds: 0.4,
} as const;

export const AUTO_SORT = {
  /** Seconds for an auto-sorted item to fly into its bin. */
  flySeconds: 0.45,
  /** Arc height in CSS pixels. */
  hop: 42,
} as const;

export const ECONOMY = {
  coinValue: 3,
  startLives: 3,
  rebirthKeep: 0.1,
  rebirthCap: 20,
  dumpBonus: (typeCount: number) => 12 * typeCount,
} as const;

export const UPGRADE_IDS = ["buffer", "wide", "magnet", "unload", "speed", "auto", "batch", "pulse", "recycle", "value", "combo", "type"] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];
export type UpgradeBranch = "control" | "automation" | "orders";
export type UpgradeDefinition = {
  max: number; costs: readonly number[]; branch: UpgradeBranch;
  requires?: { id: UpgradeId; level: number };
};

export const UPGRADES: Record<UpgradeId, UpgradeDefinition> = {
  buffer: { max: 2, costs: [40, 140], branch: "control" },
  wide: { max: 2, costs: [100, 180], branch: "control", requires: { id: "buffer", level: 1 } },
  magnet: { max: 1, costs: [130], branch: "control", requires: { id: "wide", level: 1 } },
  unload: { max: 1, costs: [110], branch: "control", requires: { id: "buffer", level: 1 } },
  speed: { max: 1, costs: [150], branch: "control", requires: { id: "buffer", level: 2 } },
  auto: { max: 2, costs: [130, 260], branch: "automation" },
  batch: { max: 1, costs: [170], branch: "automation", requires: { id: "auto", level: 1 } },
  pulse: { max: 1, costs: [120], branch: "automation", requires: { id: "auto", level: 1 } },
  recycle: { max: 1, costs: [230], branch: "automation", requires: { id: "batch", level: 1 } },
  value: { max: 2, costs: [45, 180], branch: "orders" },
  combo: { max: 2, costs: [90, 180], branch: "orders", requires: { id: "value", level: 1 } },
  type: { max: 3, costs: [120, 220, 360], branch: "orders", requires: { id: "value", level: 1 } },
};

export function nextUpgradeCost(id: UpgradeId, level: number): number | null {
  return UPGRADES[id].costs[level] ?? null;
}

export const COLORS = {
  background: "#12141a",
  table: "#181c26",
  panel: "#1c2030",
  title: "#f4f1ea",
  muted: "#9aa3b5",
  accent: "#e8c84c",
  debug: "#b8f0c2",
  dropOk: "#5dcc7a",
  dropBad: "#e85d4c",
  gold: "#e8c84c",
  heart: "#e85d4c",
  belt: "#2a2f3c",
  beltEdge: "#3d4456",
  beltStripe: "#3a4154",
  item: {
    red: "#e85d4c",
    blue: "#4c8fe8",
    yellow: "#e8c84c",
    green: "#5dcc7a",
    purple: "#c07cff",
    orange: "#e8943a",
  },
  itemDark: {
    red: "#b53d30",
    blue: "#2f63b0",
    yellow: "#b8941f",
    green: "#2f8f4a",
    purple: "#7a3fb8",
    orange: "#b86a1c",
  },
} as const;
