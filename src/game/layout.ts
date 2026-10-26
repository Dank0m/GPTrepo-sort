import { BIN_CAPACITY, type ItemType } from "../config.ts";

export type Rect = { x: number; y: number; width: number; height: number };
export type BinLayout = Rect & { type: ItemType; capacity: number };
export type PlayfieldLayout = {
  width: number; height: number;
  hud: Rect; progress: Rect; mute: Rect; pause: Rect; lang: Rect;
  belt: Rect; bins: BinLayout[]; shop: Rect; groupButton: Rect;
  tree: Rect; treeSide: boolean;
  itemSize: number; narrow: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeLayout(width: number, height: number, types: readonly ItemType[]): PlayfieldLayout {
  const short = height < 400;
  const pad = short ? 8 : clamp(Math.min(width, height) * .04, 10, 28);
  const narrow = width < 560;
  const headerH = short ? (narrow ? 64 : 44) : narrow ? 104 : clamp(height * .1, 64, 80);
  const hud = { x: pad, y: pad * .45, width: Math.max(80, width - pad * 2), height: headerH };
  const muteSize = short ? 30 : 36;
  const mute = { x: hud.x + hud.width - muteSize, y: hud.y + (narrow ? (short ? 32 : 58) : 8), width: muteSize, height: muteSize };
  const pause = { ...mute, x: mute.x - 8 - muteSize };
  const langW = short ? 88 : 104;
  const lang = { ...mute, x: pause.x - 8 - langW, width: langW };
  const progress = { x: pad, y: hud.y + hud.height + (short ? 4 : 8), width: hud.width, height: short ? 30 : 50 };
  const playTop = progress.y + progress.height + (short ? 4 : pad * .35);
  const treeSide = width >= 1000 && height >= 560;
  const treeWidth = 244;
  const treeHeight = short ? 72 : 112;
  const tree: Rect = treeSide
    ? { x: width - pad - treeWidth, width: treeWidth, height: Math.min(190, height - playTop - pad), y: height - pad - Math.min(190, height - playTop - pad) }
    : { x: pad, y: height - pad - treeHeight, width: width - 2 * pad, height: treeHeight };
  const contentWidth = treeSide ? tree.x - 12 - pad : width - 2 * pad;
  const footerH = short ? 28 : 36;
  const shop = { x: pad, y: (treeSide ? height - pad : tree.y - 6) - footerH, width: contentWidth, height: footerH };
  const groupButton = { ...shop, width: Math.min(180, contentWidth) };
  const playBottom = shop.y - (short ? 4 : 8);
  const playH = Math.max(64, playBottom - playTop);
  const beltHeight = clamp(playH * .27, short ? 30 : 44, short ? 46 : 94);
  const belt = { x: pad, y: playTop + (short ? 0 : 8), width: width - 2 * pad, height: beltHeight };
  const binAreaTop = belt.y + belt.height + (short ? 4 : 12);
  const binAreaH = Math.max(30, shop.y - binAreaTop - (short ? 4 : 8));
  const rows = types.length >= 5 && binAreaH >= 84 ? 2 : 1;
  const cols = Math.ceil(Math.max(1, types.length) / rows);
  const gap = narrow ? 6 : 12;
  const rowGap = 6;
  const binHeight = (binAreaH - rowGap * (rows - 1)) / rows;
  const binWidth = Math.min(160, (contentWidth - gap * (cols - 1)) / cols);
  const bins = types.map((type, index) => {
    const row = Math.floor(index / cols), col = index % cols;
    const inRow = row === rows - 1 ? types.length - row * cols : cols;
    const rowWidth = inRow * binWidth + (inRow - 1) * gap;
    return { type, x: pad + (contentWidth - rowWidth) / 2 + col * (binWidth + gap), y: binAreaTop + row * (binHeight + rowGap), width: binWidth, height: binHeight, capacity: BIN_CAPACITY };
  });
  return { width, height, hud, progress, mute, pause, lang, belt, bins, shop, groupButton, tree, treeSide, itemSize: clamp(beltHeight * .58, 26, 54), narrow };
}
