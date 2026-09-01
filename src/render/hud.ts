import { COLORS, ECONOMY } from "../config.ts";
import { sfx } from "../audio/sfx.ts";
import type { World } from "../game/world.ts";

export function drawHud(ctx: CanvasRenderingContext2D, world: World): void {
  const { hud, mute, narrow } = world.layout;

  ctx.save();
  roundRect(ctx, hud.x, hud.y, hud.width, hud.height, 14);
  ctx.fillStyle = COLORS.panel;
  ctx.globalAlpha = 0.94;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COLORS.beltEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const pad = 16;
  const cy = hud.y + hud.height * 0.42;
  ctx.textBaseline = "middle";

  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.gold;
  ctx.font = `700 ${narrow ? 16 : 18}px ui-rounded, system-ui, sans-serif`;
  ctx.fillText(narrow ? `${world.coins}` : `Монеты  ${world.coins}`, hud.x + pad, hud.y + hud.height * 0.38);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 ${narrow ? 11 : 12}px ui-rounded, system-ui, sans-serif`;
  ctx.fillText(
    narrow ? `рек. ${world.records.bestCoins}` : `Рекорд  ${world.records.bestCoins}`,
    hud.x + pad,
    hud.y + hud.height * 0.72,
  );

  ctx.textAlign = "center";
  ctx.fillStyle = world.combo > 0 ? COLORS.title : COLORS.muted;
  ctx.font = `700 ${narrow ? 15 : 17}px ui-rounded, system-ui, sans-serif`;
  const combo = world.combo > 0 ? `×${world.combo}` : "×0";
  ctx.fillText(narrow ? combo : `Комбо  ${combo}`, hud.x + hud.width * 0.48, cy);
  if (world.lastGain > 0 && world.combo > 0) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = "600 13px ui-rounded, system-ui, sans-serif";
    ctx.fillText(`+${world.lastGain}`, hud.x + hud.width * 0.5, hud.y + hud.height * 0.74);
  }

  ctx.textAlign = "right";
  ctx.fillStyle = COLORS.heart;
  ctx.font = `${narrow ? 16 : 18}px system-ui, sans-serif`;
  const hearts = "♥".repeat(world.lives) + "♡".repeat(Math.max(0, ECONOMY.startLives - world.lives));
  ctx.fillText(hearts, world.layout.pause.x - 10, cy);

  drawIconButton(ctx, world.layout.pause);
  drawPauseGlyph(ctx, world.layout.pause, world.paused);
  drawMute(ctx, world, mute);
  ctx.restore();
}

export function drawHint(ctx: CanvasRenderingContext2D, world: World): void {
  if (world.status !== "playing" || world.paused || world.sortedCount > 0 || world.elapsed > 7) {
    return;
  }
  const belt = world.layout.belt;
  ctx.save();
  ctx.globalAlpha = Math.min(1, 0.35 + world.elapsed * 0.2);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "600 14px ui-rounded, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("Перетащи фигуру в контейнер своего цвета", belt.x + belt.width / 2, belt.y - 8);
  ctx.restore();
}

export function drawGameOver(ctx: CanvasRenderingContext2D, world: World, width: number, height: number): void {
  if (world.status !== "over") {
    return;
  }
  ctx.save();
  ctx.fillStyle = "rgba(10, 12, 18, 0.78)";
  ctx.fillRect(0, 0, width, height);

  const boxW = Math.min(360, width - 40);
  const boxH = world.beatBestCoins || world.beatBestCombo ? 228 : 208;
  const x = (width - boxW) / 2;
  const y = (height - boxH) / 2;
  roundRect(ctx, x, y, boxW, boxH, 18);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.strokeStyle = COLORS.beltEdge;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.title;
  ctx.font = "800 26px ui-rounded, system-ui, sans-serif";
  ctx.fillText("Конец сессии", width / 2, y + 40);

  if (world.beatBestCoins) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = "800 16px ui-rounded, system-ui, sans-serif";
    ctx.fillText("Новый рекорд!", width / 2, y + 70);
  }

  ctx.fillStyle = COLORS.gold;
  ctx.font = "700 18px ui-rounded, system-ui, sans-serif";
  ctx.fillText(`Монеты  ${world.coins}`, width / 2, y + (world.beatBestCoins ? 98 : 88));

  ctx.fillStyle = COLORS.muted;
  ctx.font = "15px ui-rounded, system-ui, sans-serif";
  const comboLine = world.beatBestCombo
    ? `Макс. комбо  ×${world.maxCombo}  •  рекорд`
    : `Макс. комбо  ×${world.maxCombo}`;
  ctx.fillText(comboLine, width / 2, y + (world.beatBestCoins ? 126 : 118));
  ctx.fillText(`Лучший счёт  ${world.records.bestCoins}`, width / 2, y + (world.beatBestCoins ? 150 : 142));

  ctx.fillStyle = COLORS.title;
  ctx.font = "600 14px ui-rounded, system-ui, sans-serif";
  ctx.fillText("Нажми, чтобы начать снова", width / 2, y + boxH - 32);
  ctx.restore();
}

export function drawPause(ctx: CanvasRenderingContext2D, world: World, width: number, height: number): void {
  if (!world.paused || world.status !== "playing") {
    return;
  }
  ctx.save();
  ctx.fillStyle = "rgba(10, 12, 18, 0.72)";
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.title;
  ctx.font = "800 32px ui-rounded, system-ui, sans-serif";
  ctx.fillText("Пауза", width / 2, height / 2 - 18);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "600 15px ui-rounded, system-ui, sans-serif";
  ctx.fillText("Нажми, чтобы продолжить", width / 2, height / 2 + 18);
  ctx.restore();
}

function drawIconButton(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
): void {
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.strokeStyle = COLORS.beltEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawPauseGlyph(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  paused: boolean,
): void {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  ctx.fillStyle = COLORS.title;
  if (paused) {
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 8);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx - 6, cy + 8);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.fillRect(cx - 7, cy - 8, 5, 16);
  ctx.fillRect(cx + 2, cy - 8, 5, 16);
}

function drawMute(ctx: CanvasRenderingContext2D, world: World, mute: { x: number; y: number; width: number; height: number }): void {
  roundRect(ctx, mute.x, mute.y, mute.width, mute.height, 10);
  ctx.fillStyle = world.hoverUpgrade ? COLORS.panel : "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.strokeStyle = COLORS.beltEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const cx = mute.x + mute.width / 2;
  const cy = mute.y + mute.height / 2;
  ctx.fillStyle = COLORS.title;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 4);
  ctx.lineTo(cx - 2, cy - 4);
  ctx.lineTo(cx + 5, cy - 9);
  ctx.lineTo(cx + 5, cy + 9);
  ctx.lineTo(cx - 2, cy + 4);
  ctx.lineTo(cx - 8, cy + 4);
  ctx.closePath();
  ctx.fill();

  if (sfx.muted) {
    ctx.strokeStyle = COLORS.dropBad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 10);
    ctx.lineTo(cx + 10, cy + 10);
    ctx.stroke();
  } else {
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + 4, cy, 6, -0.6, 0.6);
    ctx.stroke();
  }
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
