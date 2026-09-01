import type { Rect } from "./layout.ts";

export type GameOverUi = {
  box: Rect;
  continueBtn: Rect | null;
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
  opts: { continue: boolean; record: boolean },
): GameOverUi {
  const boxW = Math.min(360, width - 40);
  const boxH = opts.continue ? (opts.record ? 318 : 298) : opts.record ? 228 : 208;
  const box: Rect = {
    x: (width - boxW) / 2,
    y: (height - boxH) / 2,
    width: boxW,
    height: boxH,
  };
  if (!opts.continue) {
    return {
      box,
      continueBtn: null,
      restartBtn: {
        x: box.x + 24,
        y: box.y + boxH - 52,
        width: boxW - 48,
        height: 36,
      },
    };
  }
  const btnW = boxW - 48;
  const continueBtn: Rect = {
    x: box.x + 24,
    y: box.y + boxH - 118,
    width: btnW,
    height: 52,
  };
  const restartBtn: Rect = {
    x: box.x + 24,
    y: box.y + boxH - 56,
    width: btnW,
    height: 36,
  };
  return { box, continueBtn, restartBtn };
}

export function dumpOfferUi(width: number, height: number): DumpOfferUi {
  const boxW = Math.min(340, width - 36);
  const boxH = 148;
  const box: Rect = {
    x: (width - boxW) / 2,
    y: height * 0.38 + 84,
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
