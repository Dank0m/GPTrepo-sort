import type { ItemType } from "../config.ts";

export type Bin = {
  type: ItemType;
  filled: number;
  capacity: number;
};

export function createBin(type: ItemType, capacity: number): Bin {
  return { type, filled: 0, capacity };
}
