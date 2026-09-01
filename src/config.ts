/** Current development phase. PHASE 1: objects on the belt, no input or economy. */
export const PHASE = 1;

export const GAME_TITLE = "Sort & Upgrade";

export const ITEM_TYPES = ["red", "blue", "yellow"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_STATE = {
  OnBelt: "onBelt",
  InHand: "inHand",
  InBin: "inBin",
} as const;
export type ItemState = (typeof ITEM_STATE)[keyof typeof ITEM_STATE];

export const BIN_CAPACITY = 8;

export const BELT = {
  /** CSS pixels per second along the belt (left → right). */
  speed: 140,
  spawnInterval: 0.85,
  minGap: 64,
} as const;

export const COLORS = {
  background: "#12141a",
  table: "#181c26",
  panel: "#1c2030",
  title: "#f4f1ea",
  muted: "#9aa3b5",
  accent: "#e8c84c",
  debug: "#b8f0c2",
  belt: "#2a2f3c",
  beltEdge: "#3d4456",
  beltStripe: "#3a4154",
  item: {
    red: "#e85d4c",
    blue: "#4c8fe8",
    yellow: "#e8c84c",
  },
  itemDark: {
    red: "#b53d30",
    blue: "#2f63b0",
    yellow: "#b8941f",
  },
} as const;
