import { ITEM_STATE, type ItemState, type ItemType } from "../config.ts";

export type ItemFly = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  duration: number;
};

export type Item = {
  id: number;
  type: ItemType;
  state: ItemState;
  x: number;
  y: number;
  size: number;
  fly: ItemFly | null;
};

let nextItemId = 1;

export function createItem(
  type: ItemType,
  x: number,
  y: number,
  size: number,
): Item {
  const id = nextItemId;
  nextItemId += 1;
  return {
    id,
    type,
    state: ITEM_STATE.OnBelt,
    x,
    y,
    size,
    fly: null,
  };
}
