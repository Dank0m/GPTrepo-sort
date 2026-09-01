import { LAYOUT, PALETTE } from "../config/balance.ts";
import { roundRectPath } from "../utils/math.ts";
import type { Level } from "../game/Level.ts";
import type { Playfield } from "../game/LevelGenerator.ts";

export function drawHud(
  ctx: CanvasRenderingContext2D,
  playfield: Playfield,
  level: Level,
): void {
  const headerH = playfield.h * LAYOUT.headerRatio;
  const pad = playfield.w * 0.06;

  ctx.save();
  roundRectPath(ctx, playfield.x, playfield.y, playfield.w, headerH, 0);
  ctx.fillStyle = PALETTE.header;
  ctx.fill();

  ctx.fillStyle = PALETTE.onOverlay;
  ctx.font = `800 ${Math.round(headerH * 0.38)}px ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`LEVEL ${level.number}`, playfield.x + pad, playfield.y + headerH * 0.42);

  const barX = playfield.x + pad;
  const barW = playfield.w - pad * 2;
  const barY = playfield.y + headerH * 0.7;
  const barH = Math.max(6, headerH * 0.12);
  const ratio = level.total() === 0 ? 0 : level.sortedCount() / level.total();

  roundRectPath(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fillStyle = "rgba(244, 238, 248, 0.18)";
  ctx.fill();
  if (ratio > 0) {
    roundRectPath(ctx, barX, barY, Math.max(barH, barW * ratio), barH, barH / 2);
    ctx.fillStyle = PALETTE.accent;
    ctx.fill();
  }
  ctx.restore();
}
