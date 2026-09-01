import type { CanvasSurface } from "../core/canvas.ts";
import { COLORS, PHASE } from "../config.ts";
import type { DropKind } from "../game/world.ts";

export function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  surface: CanvasSurface,
  fps: number,
  itemCount = 0,
  lastDrop: DropKind | "none" = "none",
): void {
  const { cssWidth, cssHeight, bufferWidth, bufferHeight, dpr } = surface.metrics;
  const lines = [
    `FPS  ${fps.toFixed(0)}`,
    `CSS  ${cssWidth}×${cssHeight}`,
    `BUF  ${bufferWidth}×${bufferHeight}`,
    `DPR  ${dpr.toFixed(2)}`,
    `PHASE ${PHASE}`,
    `ITEMS ${itemCount}`,
    `DROP ${lastDrop}`,
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
