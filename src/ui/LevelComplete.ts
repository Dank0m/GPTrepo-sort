import { PALETTE } from "../config/balance.ts";
import { roundRectPath } from "../utils/math.ts";
import type { Playfield } from "../game/LevelGenerator.ts";

export function drawLevelComplete(
  ctx: CanvasRenderingContext2D,
  playfield: Playfield,
  levelNumber: number,
): void {
  ctx.save();
  roundRectPath(ctx, playfield.x, playfield.y, playfield.w, playfield.h, 28);
  ctx.fillStyle = PALETTE.overlay;
  ctx.fill();

  const cx = playfield.x + playfield.w / 2;
  const cy = playfield.y + playfield.h * 0.42;

  ctx.fillStyle = PALETTE.onOverlay;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(playfield.w * 0.09)}px ui-rounded, system-ui, sans-serif`;
  ctx.fillText("УРОВЕНЬ ПРОЙДЕН", cx, cy);

  ctx.font = `600 ${Math.round(playfield.w * 0.045)}px ui-rounded, system-ui, sans-serif`;
  ctx.fillStyle = "rgba(244, 238, 248, 0.78)";
  ctx.fillText(`Уровень ${levelNumber}`, cx, cy + playfield.h * 0.07);
  ctx.fillText("Нажми, чтобы продолжить", cx, cy + playfield.h * 0.14);
  ctx.restore();
}

export function drawLoading(ctx: CanvasRenderingContext2D, playfield: Playfield): void {
  ctx.save();
  roundRectPath(ctx, playfield.x, playfield.y, playfield.w, playfield.h, 28);
  ctx.fillStyle = PALETTE.header;
  ctx.fill();

  const cx = playfield.x + playfield.w / 2;
  const cy = playfield.y + playfield.h * 0.46;
  ctx.fillStyle = PALETTE.onOverlay;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(playfield.w * 0.08)}px ui-rounded, system-ui, sans-serif`;
  ctx.fillText("SORT & UPGRADE", cx, cy);
  ctx.font = `600 ${Math.round(playfield.w * 0.04)}px ui-rounded, system-ui, sans-serif`;
  ctx.fillStyle = "rgba(244, 238, 248, 0.7)";
  ctx.fillText("Загрузка…", cx, cy + playfield.h * 0.08);
  ctx.restore();
}
