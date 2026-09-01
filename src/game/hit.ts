import type { Item } from "./item.ts";
import type { BinLayout, Rect } from "./layout.ts";

export function pointInRect(x: number, y: number, rect: Rect): boolean {
  return (
    x >= rect.x &&
    y >= rect.y &&
    x <= rect.x + rect.width &&
    y <= rect.y + rect.height
  );
}

export function hitItem(
  items: Item[],
  x: number,
  y: number,
  padding: number,
): Item | undefined {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (!item) {
      continue;
    }
    const r = item.size * 0.5 + padding;
    const dx = x - item.x;
    const dy = y - item.y;
    if (dx * dx + dy * dy <= r * r) {
      return item;
    }
  }
  return undefined;
}

export function hitBin(
  bins: BinLayout[],
  x: number,
  y: number,
): BinLayout | undefined {
  return bins.find((bin) => pointInRect(x, y, bin));
}
