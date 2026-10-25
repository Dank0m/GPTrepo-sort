import type { Rect } from "./layout.ts";

export type GameOverUi = {
  box: Rect;
  restartBtn: Rect;
};

export type DumpOfferUi = {
  box: Rect;
  doubleBtn: Rect;
  dismissBtn: Rect;
};

export function gameOverUi(
  width: number,
  height: number,
  opts: { record: boolean },
): GameOverUi {
  const boxW = Math.min(360, width - 40);
  const boxH = opts.record ? 228 : 208;
  const box: Rect = {
    x: (width - boxW) / 2,
    y: (height - boxH) / 2,
    width: boxW,
    height: boxH,
  };
  return {
    box,
    restartBtn: {
      x: box.x + 24,
      y: box.y + boxH - 52,
      width: boxW - 48,
      height: 36,
    },
  };
}

export function dumpOfferUi(width: number, height: number): DumpOfferUi {
  const boxW = Math.min(340, width - 36);
  const boxH = 148;
  const box: Rect = {
    x: (width - boxW) / 2,
    y: Math.max(8, Math.min(height * 0.38 + 84, height - boxH - 8)),
    width: boxW,
    height: boxH,
  };
  const doubleBtn: Rect = {
    x: box.x + 16,
    y: box.y + 58,
    width: boxW - 32,
    height: 44,
  };
  const dismissBtn: Rect = {
    x: box.x + 16,
    y: box.y + 108,
    width: boxW - 32,
    height: 28,
  };
  return { box, doubleBtn, dismissBtn };
}

export function hitRect(x: number, y: number, rect: Rect | null | undefined): boolean {
  if (!rect) {
    return false;
  }
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}
