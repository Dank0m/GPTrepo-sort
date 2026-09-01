import { COLORS, GAME_TITLE, PHASE, type ItemType } from "../config.ts";
import type { CanvasSurface } from "../core/canvas.ts";
import { drawDebugOverlay } from "../debug/overlay.ts";
import type { Bin } from "../game/bin.ts";
import type { Item } from "../game/item.ts";
import type { BinLayout, PlayfieldLayout, Rect } from "../game/layout.ts";
import type { World } from "../game/world.ts";

const TYPE_LABEL: Record<ItemType, string> = {
  red: "Red",
  blue: "Blue",
  yellow: "Yellow",
};

export function drawScene(
  surface: CanvasSurface,
  world: World,
  fps: number,
): void {
  const { ctx, cssWidth: w, cssHeight: h } = surface;
  const layout = world.layout;

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, w, h);

  drawTable(ctx, layout);
  drawTitle(ctx, w);
  drawBelt(ctx, layout.belt, world.elapsed);
  drawBins(ctx, layout.bins, world.bins);
  drawItems(ctx, world.items);
  drawDebugOverlay(ctx, surface, fps, world.items.length);
}

function drawTable(ctx: CanvasRenderingContext2D, layout: PlayfieldLayout): void {
  ctx.fillStyle = COLORS.table;
  ctx.fillRect(0, layout.belt.y - 28, layout.width, layout.height);
}

function drawTitle(ctx: CanvasRenderingContext2D, width: number): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = COLORS.title;
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText(GAME_TITLE, width / 2, 16);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(`PHASE ${PHASE} — лента слева направо, без сортировки`, width / 2, 42);
}

function drawBelt(ctx: CanvasRenderingContext2D, belt: Rect, elapsed: number): void {
  roundRect(ctx, belt.x, belt.y, belt.width, belt.height, 14);
  ctx.fillStyle = COLORS.belt;
  ctx.fill();
  ctx.strokeStyle = COLORS.beltEdge;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  roundRect(ctx, belt.x, belt.y, belt.width, belt.height, 14);
  ctx.clip();

  const stripeW = 28;
  const shift = (elapsed * 140) % (stripeW * 2);
  ctx.fillStyle = COLORS.beltStripe;
  ctx.globalAlpha = 0.45;
  for (let x = belt.x - stripeW * 2 + shift; x < belt.x + belt.width + stripeW; x += stripeW * 2) {
    ctx.beginPath();
    ctx.moveTo(x, belt.y);
    ctx.lineTo(x + 16, belt.y);
    ctx.lineTo(x + 16 - belt.height * 0.35, belt.y + belt.height);
    ctx.lineTo(x - belt.height * 0.35, belt.y + belt.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBins(
  ctx: CanvasRenderingContext2D,
  layouts: BinLayout[],
  bins: Bin[],
): void {
  for (const slot of layouts) {
    const bin = bins.find((entry) => entry.type === slot.type);
    const filled = bin?.filled ?? 0;
    const capacity = bin?.capacity ?? slot.capacity;
    const color = COLORS.item[slot.type];

    roundRect(ctx, slot.x, slot.y, slot.width, slot.height, 12);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    const mouthH = 18;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(slot.x + 8, slot.y, slot.width - 16, mouthH);
    ctx.globalAlpha = 1;

    const iconX = slot.x + slot.width / 2;
    const iconY = slot.y + slot.height * 0.46;
    drawTypeShape(ctx, slot.type, iconX, iconY, Math.min(36, slot.width * 0.28));

    ctx.fillStyle = COLORS.title;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(TYPE_LABEL[slot.type], iconX, slot.y + slot.height - 22);

    ctx.fillStyle = COLORS.muted;
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(`${filled} / ${capacity}`, iconX, slot.y + slot.height - 8);
  }
}

function drawItems(ctx: CanvasRenderingContext2D, items: Item[]): void {
  for (const item of items) {
    drawTypeShape(ctx, item.type, item.x, item.y, item.size * 0.5);
  }
}

function drawTypeShape(
  ctx: CanvasRenderingContext2D,
  type: ItemType,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.save();
  ctx.fillStyle = COLORS.item[type];
  ctx.strokeStyle = COLORS.itemDark[type];
  ctx.lineWidth = 2;

  if (type === "red") {
    roundRect(ctx, x - radius, y - radius, radius * 2, radius * 2, 6);
    ctx.fill();
    ctx.stroke();
  } else if (type === "blue") {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y + radius * 0.85);
    ctx.lineTo(x - radius, y + radius * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
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
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}
