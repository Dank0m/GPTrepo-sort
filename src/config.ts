/** Current development phase. PHASE 5: UI polish, feedback, sound. */
export const PHASE = 5;

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
  /** Lift the grabbed item above the pointer so a finger does not cover it. */
  dragLift: 34,
  feedbackSeconds: 0.4,
} as const;

export const AUTO_SORT = {
  /** Seconds for an auto-sorted item to fly into its bin. */
  flySeconds: 1.5,
  /** Arc height in CSS pixels. */
  hop: 42,
} as const;

export const ECONOMY = {
  coinValue: 10,
  startLives: 3,
  /** Jackpot when every bin is full, then fills reset. Scales with type count. */
  dumpBonus: (typeCount: number) => 120 * typeCount * typeCount,
} as const;

export const UPGRADE_IDS = ["speed", "value", "type", "auto", "buffer"] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];

export const UPGRADES: Record<
  UpgradeId,
  { label: string; max: number; costs: readonly number[] }
> = {
  speed: { label: "Скорость", max: 4, costs: [30, 60, 120, 240] },
  value: { label: "Ценность", max: 3, costs: [40, 80, 160] },
  type: { label: "Тип", max: 3, costs: [80, 160, 320] },
  auto: { label: "Автосорт", max: 3, costs: [50, 100, 200] },
  buffer: { label: "Буфер", max: 3, costs: [25, 50, 100] },
};

export function nextUpgradeCost(id: UpgradeId, level: number): number | null {
  const def = UPGRADES[id];
  if (level >= def.max) {
    return null;
  }
  return def.costs[level] ?? null;
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
