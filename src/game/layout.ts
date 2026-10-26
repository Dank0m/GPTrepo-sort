import { BIN_CAPACITY, type ItemType } from "../config.ts";

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
  hud: Rect;
  progress: Rect;
  mute: Rect;
  pause: Rect;
  lang: Rect;
  belt: Rect;
  bins: BinLayout[];
  shop: Rect;
  treeButton: Rect;
  groupButton: Rect;
  itemSize: number;
  narrow: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeLayout(
  width: number,
  height: number,
  types: readonly ItemType[],
): PlayfieldLayout {
  const short = height < 400;
  const pad = short ? 8 : clamp(Math.min(width, height) * 0.04, 10, 28);
  const narrow = width < 560;
  const headerH = short ? (narrow ? 90 : 56) : narrow ? 104 : clamp(height * 0.1, 64, 80);

  const hud: Rect = {
    x: pad,
    y: pad * 0.45,
    width: Math.max(80, width - pad * 2),
    height: headerH,
  };
  const muteSize = short ? 32 : 36;
  const mute: Rect = {
    x: hud.x + hud.width - muteSize,
    y: hud.y + (narrow ? (short ? 50 : 58) : 8),
    width: muteSize,
    height: muteSize,
  };
  const pause: Rect = {
    x: mute.x - 8 - muteSize,
    y: mute.y,
    width: muteSize,
    height: muteSize,
  };
  const langW = short ? 92 : 104;
  const lang: Rect = {
    x: pause.x - 8 - langW,
    y: mute.y,
    width: langW,
    height: muteSize,
  };

  const shopHeight = short ? 44 : 56;
  const shop: Rect = {
    x: pad,
    y: height - pad - shopHeight,
    width: Math.max(80, width - pad * 2),
    height: shopHeight,
  };

  const progress: Rect = { x: pad, y: hud.y + hud.height + (short ? 4 : 8), width: hud.width, height: short ? 40 : 50 };
  const playTop = progress.y + progress.height + pad * 0.35;
  const playBottom = shop.y - pad * 0.7;
  const playH = Math.max(short ? 64 : 120, playBottom - playTop);
  const manyTypes = types.length >= 5;

  const beltHeight = clamp(playH * (manyTypes ? 0.22 : 0.3), short ? 36 : 52, short ? 64 : 108);
  const belt: Rect = {
    x: pad,
    y: playTop + playH * 0.06,
    width: Math.max(80, width - pad * 2),
    height: beltHeight,
  };

  const binCount = Math.max(1, types.length);
  const binAreaTop = belt.y + belt.height + pad * 0.7;
  const binAreaH = Math.max(short ? 32 : 72, shop.y - binAreaTop - pad * 0.45);
  const rows = binCount >= 5 && !(short && narrow) ? 2 : 1;
  const cols = Math.ceil(binCount / rows);
  const gap = narrow ? 8 : 12;
  const rowGap = 8;
  const binHeight = (binAreaH - rowGap * (rows - 1)) / rows;
  const binWidth = Math.min(160, (belt.width - gap * (cols - 1)) / cols);

  const bins: BinLayout[] = types.map((type, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const inRow = row === rows - 1 ? binCount - row * cols : cols;
    const rowWidth = inRow * binWidth + (inRow - 1) * gap;
    const rowX = belt.x + (belt.width - rowWidth) / 2;
    return {
      type,
      x: rowX + col * (binWidth + gap),
      y: binAreaTop + row * (binHeight + rowGap),
      width: binWidth,
      height: binHeight,
      capacity: BIN_CAPACITY,
    };
  });

  const treeButton: Rect = { ...shop, width: shop.width * .62 - 4 };
  const groupButton: Rect = { ...shop, x: shop.x + shop.width * .62 + 4, width: shop.width * .38 - 4 };

  return {
    width,
    height,
    hud,
    progress,
    mute,
    pause,
    lang,
    belt,
    bins,
    shop,
    treeButton,
    groupButton,
    itemSize: clamp(beltHeight * 0.58, 34, 64),
    narrow,
  };
}
