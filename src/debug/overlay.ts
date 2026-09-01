import type { CanvasSurface } from "../core/canvas.ts";
import { COLORS, GAME_TITLE, PHASE } from "../config.ts";

export function drawPhase0Frame(
  surface: CanvasSurface,
  fps: number,
): void {
  const { ctx, cssWidth: w, cssHeight: h } = surface;

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = COLORS.title;
  ctx.font = "600 32px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(GAME_TITLE, w / 2, h / 2 - 18);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText(`PHASE ${PHASE} — bootstrap`, w / 2, h / 2 + 18);

  drawDebugOverlay(ctx, surface, fps);
}

function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  surface: CanvasSurface,
  fps: number,
): void {
  const { cssWidth, cssHeight, bufferWidth, bufferHeight, dpr } = surface.metrics;
  const lines = [
    `FPS  ${fps.toFixed(0)}`,
    `CSS  ${cssWidth}×${cssHeight}`,
    `BUF  ${bufferWidth}×${bufferHeight}`,
    `DPR  ${dpr.toFixed(2)}`,
    `PHASE ${PHASE}`,
  ];

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

  const padding = 10;
  const lineHeight = 16;
  const boxW = 168;
  const boxH = padding * 2 + lines.length * lineHeight;

  ctx.fillStyle = COLORS.panel;
  ctx.globalAlpha = 0.88;
  ctx.fillRect(12, 12, boxW, boxH);
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLORS.debug;
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i]!, 12 + padding, 12 + padding + i * lineHeight);
  }
  ctx.restore();
}
