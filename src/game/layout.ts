import { BIN_CAPACITY, UPGRADE_IDS, type ItemType, type UpgradeId } from "../config.ts";

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

export type ShopButtonLayout = Rect & {
  id: UpgradeId;
};

export type PlayfieldLayout = {
  width: number;
  height: number;
  hud: Rect;
  mute: Rect;
  pause: Rect;
  lang: Rect;
  belt: Rect;
  bins: BinLayout[];
  shop: Rect;
  shopButtons: ShopButtonLayout[];
  freeCoins: Rect | null;
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
  options: { freeCoins?: boolean } = {},
): PlayfieldLayout {
  const pad = clamp(Math.min(width, height) * 0.04, 10, 28);
  const narrow = width < 560;
  const headerH = clamp(height * 0.1, 56, 80);

  const hud: Rect = {
    x: pad,
    y: pad * 0.45,
    width: Math.max(80, width - pad * 2),
    height: headerH,
  };
  const muteSize = 36;
  const mute: Rect = {
    x: hud.x + hud.width - muteSize,
    y: hud.y + 8,
    width: muteSize,
    height: muteSize,
  };
  const pause: Rect = {
    x: mute.x - 8 - muteSize,
    y: mute.y,
    width: muteSize,
    height: muteSize,
  };
  const langW = 104;
  const lang: Rect = {
    x: pause.x - 8 - langW,
    y: mute.y,
    width: langW,
    height: muteSize,
  };

  const shopRows = narrow ? 2 : 1;
  const shopHeight =
    shopRows === 2 ? clamp(height * 0.2, 108, 148) : clamp(height * 0.135, 72, 96);
  const shop: Rect = {
    x: pad,
    y: height - pad - shopHeight,
    width: Math.max(80, width - pad * 2),
    height: shopHeight,
  };

  const playTop = hud.y + hud.height + pad * 0.35;
  const playBottom = shop.y - pad * 0.7;
  const playH = Math.max(120, playBottom - playTop);
  const manyTypes = types.length >= 5;

  const beltHeight = clamp(playH * (manyTypes ? 0.22 : 0.3), 52, 108);
  const belt: Rect = {
    x: pad,
    y: playTop + playH * 0.06,
    width: Math.max(80, width - pad * 2),
    height: beltHeight,
  };

  const binCount = Math.max(1, types.length);
  const binAreaTop = belt.y + belt.height + pad * 0.7;
  const binAreaH = Math.max(72, shop.y - binAreaTop - pad * 0.45);
  const rows = binCount >= 5 ? 2 : 1;
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

  const shopButtons = layoutShopButtons(shop, shopRows, Boolean(options.freeCoins));

  return {
    width,
    height,
    hud,
    mute,
    pause,
    lang,
    belt,
    bins,
    shop,
    shopButtons: shopButtons.upgrades,
    freeCoins: shopButtons.freeCoins,
    itemSize: clamp(beltHeight * 0.58, 34, 64),
    narrow,
  };
}

function layoutShopButtons(
  shop: Rect,
  rows: number,
  showFreeCoins: boolean,
): { upgrades: ShopButtonLayout[]; freeCoins: Rect | null } {
  const gap = 8;
  if (rows === 1) {
    const count = UPGRADE_IDS.length + (showFreeCoins ? 1 : 0);
    const buttonW = (shop.width - gap * (count - 1)) / count;
    const upgrades = UPGRADE_IDS.map((id, index) => ({
      id,
      x: shop.x + index * (buttonW + gap),
      y: shop.y,
      width: buttonW,
      height: shop.height,
    }));
    const freeCoins = showFreeCoins
      ? {
          x: shop.x + UPGRADE_IDS.length * (buttonW + gap),
          y: shop.y,
          width: buttonW,
          height: shop.height,
        }
      : null;
    return { upgrades, freeCoins };
  }

  const rowH = (shop.height - gap) / 2;
  const top = UPGRADE_IDS.slice(0, 3);
  const bottom = UPGRADE_IDS.slice(3);
  const upgrades = [
    ...rowOf(top, shop.x, shop.y, shop.width, rowH, gap),
    ...rowOf(bottom, shop.x, shop.y + rowH + gap, shop.width, rowH, gap, showFreeCoins ? 1 : 0),
  ];
  let freeCoins: Rect | null = null;
  if (showFreeCoins) {
    const slots = bottom.length + 1;
    const buttonW = (shop.width - gap * (slots - 1)) / slots;
    freeCoins = {
      x: shop.x + bottom.length * (buttonW + gap),
      y: shop.y + rowH + gap,
      width: buttonW,
      height: rowH,
    };
  }
  return { upgrades, freeCoins };
}

function rowOf(
  ids: readonly UpgradeId[],
  x: number,
  y: number,
  width: number,
  height: number,
  gap: number,
  extraSlots = 0,
): ShopButtonLayout[] {
  const slots = ids.length + extraSlots;
  const buttonW = (width - gap * (slots - 1)) / slots;
  return ids.map((id, index) => ({
    id,
    x: x + index * (buttonW + gap),
    y,
    width: buttonW,
    height,
  }));
}
