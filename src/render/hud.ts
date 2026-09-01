import { COLORS, ECONOMY } from "../config.ts";
import type { World } from "../game/world.ts";

export function drawHud(ctx: CanvasRenderingContext2D, world: World, width: number): void {
  const panelW = 168;
  const panelH = 86;
  const x = width - panelW - 12;
  const y = 12;

  ctx.save();
  ctx.fillStyle = COLORS.panel;
  ctx.globalAlpha = 0.9;
  roundRect(ctx, x, y, panelW, panelH, 10);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillStyle = COLORS.gold;
  ctx.fillText(`Монеты  ${world.coins}`, x + 12, y + 12);

  ctx.fillStyle = COLORS.title;
  ctx.font = "13px system-ui, sans-serif";
  const comboLabel = world.combo > 0 ? `Комбо  ×${world.combo}` : "Комбо  —";
  ctx.fillText(comboLabel, x + 12, y + 34);
  if (world.lastGain > 0 && world.combo > 0) {
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(`+${world.lastGain}`, x + 118, y + 34);
  }

  ctx.fillStyle = COLORS.heart;
  ctx.font = "13px system-ui, sans-serif";
  const hearts = "♥".repeat(world.lives) + "♡".repeat(Math.max(0, ECONOMY.startLives - world.lives));
  ctx.fillText(`Жизни  ${hearts}`, x + 12, y + 56);
  ctx.restore();
}

export function drawGameOver(ctx: CanvasRenderingContext2D, world: World, width: number, height: number): void {
  if (world.status !== "over") {
    return;
  }
  ctx.save();
  ctx.fillStyle = "rgba(10, 12, 18, 0.72)";
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.title;
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText("GAME OVER", width / 2, height / 2 - 28);
  ctx.fillStyle = COLORS.gold;
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText(`Монеты: ${world.coins}`, width / 2, height / 2 + 6);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("Нажми, чтобы начать снова", width / 2, height / 2 + 36);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}
