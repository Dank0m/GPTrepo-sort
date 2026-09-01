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
  belt: Rect;
  bins: BinLayout[];
  shop: Rect;
  shopButtons: ShopButtonLayout[];
  itemSize: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeLayout(
  width: number,
  height: number,
  types: readonly ItemType[],
): PlayfieldLayout {
  const pad = clamp(Math.min(width, height) * 0.045, 16, 36);
  const shopHeight = clamp(height * 0.14, 64, 88);
  const shop: Rect = {
    x: pad,
    y: height - pad - shopHeight,
    width: Math.max(80, width - pad * 2),
    height: shopHeight,
  };

  const beltHeight = clamp(height * 0.16, 64, 110);
  const beltY = height * 0.3;
  const belt: Rect = {
    x: pad,
    y: beltY,
    width: Math.max(80, width - pad * 2),
    height: beltHeight,
  };

  const binCount = Math.max(1, types.length);
  const binTop = belt.y + belt.height + pad * 1.1;
  const binHeight = clamp(shop.y - binTop - pad * 0.6, 80, 150);
  const gap = 12;
  const binWidth = Math.min(
    180,
    (belt.width - gap * (binCount - 1)) / binCount,
  );
  const rowWidth = binCount * binWidth + (binCount - 1) * gap;
  const rowX = belt.x + (belt.width - rowWidth) / 2;

  const bins: BinLayout[] = types.map((type, index) => ({
    type,
    x: rowX + index * (binWidth + gap),
    y: binTop,
    width: binWidth,
    height: binHeight,
    capacity: BIN_CAPACITY,
  }));

  const buttonGap = 8;
  const buttonW = (shop.width - buttonGap * (UPGRADE_IDS.length - 1)) / UPGRADE_IDS.length;
  const shopButtons: ShopButtonLayout[] = UPGRADE_IDS.map((id, index) => ({
    id,
    x: shop.x + index * (buttonW + buttonGap),
    y: shop.y,
    width: buttonW,
    height: shop.height,
  }));

  return {
    width,
    height,
    belt,
    bins,
    shop,
    shopButtons,
    itemSize: clamp(beltHeight * 0.58, 36, 64),
  };
}
