import { BIN_CAPACITY, ITEM_TYPES, type ItemType } from "../config.ts";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BinLayout = Rect & {
  type: ItemType;
  capacity: number;
};

export type PlayfieldLayout = {
  width: number;
  height: number;
  belt: Rect;
  bins: BinLayout[];
  itemSize: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeLayout(width: number, height: number): PlayfieldLayout {
  const pad = clamp(Math.min(width, height) * 0.045, 16, 36);
  const beltHeight = clamp(height * 0.18, 70, 118);
  const beltY = height * 0.34;
  const belt: Rect = {
    x: pad,
    y: beltY,
    width: Math.max(80, width - pad * 2),
    height: beltHeight,
  };

  const binCount = ITEM_TYPES.length;
  const binTop = belt.y + belt.height + pad * 1.4;
  const binHeight = clamp(height - binTop - pad, 88, 150);
  const gap = 14;
  const binWidth = Math.min(
    200,
    (belt.width - gap * (binCount - 1)) / binCount,
  );
  const rowWidth = binCount * binWidth + (binCount - 1) * gap;
  const rowX = belt.x + (belt.width - rowWidth) / 2;

  const bins: BinLayout[] = ITEM_TYPES.map((type, index) => ({
    type,
    x: rowX + index * (binWidth + gap),
    y: binTop,
    width: binWidth,
    height: binHeight,
    capacity: BIN_CAPACITY,
  }));

  return {
    width,
    height,
    belt,
    bins,
    itemSize: clamp(beltHeight * 0.58, 36, 64),
  };
}
