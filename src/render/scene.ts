import { COLORS, GAME_TITLE, ITEM_STATE, TYPE_LABEL, type ItemType } from "../config.ts";
import type { CanvasSurface } from "../core/canvas.ts";
import { drawDebugOverlay } from "../debug/overlay.ts";
import { beltSpeed } from "../game/upgrades.ts";
import { drawGameOver, drawHint, drawHud } from "./hud.ts";
import { drawShop } from "./shop.ts";
import type { Item } from "../game/item.ts";
import type { BinLayout, PlayfieldLayout, Rect } from "../game/layout.ts";
import type { World } from "../game/world.ts";

export function drawScene(
  surface: CanvasSurface,
  world: World,
  fps: number,
): void {
  const { ctx, cssWidth: w, cssHeight: h } = surface;
  const layout = world.layout;

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(world.fx.offsetX, world.fx.offsetY);

  drawTable(ctx, layout);
  drawTitle(ctx, layout);
  drawBelt(ctx, layout.belt, world.elapsed, beltSpeed(world.levels));
  drawBins(ctx, layout.bins, world);
  drawItems(ctx, world.items);
  drawParticles(ctx, world);
  ctx.restore();

  drawShop(ctx, world);
  drawHud(ctx, world);
  drawHint(ctx, world);
  drawFloaters(ctx, world);

  if (world.fx.flash > 0) {
    ctx.fillStyle = `rgba(232, 93, 76, ${world.fx.flash * 0.42})`;
    ctx.fillRect(0, 0, w, h);
  }

  if (world.debug) {
    drawDebugOverlay(
      ctx,
      surface,
      fps,
      world.items.length,
      world.lastDrop,
      world.coins,
      world.combo,
      world.lives,
    );
  }
  drawGameOver(ctx, world, w, h);
}

function drawTable(ctx: CanvasRenderingContext2D, layout: PlayfieldLayout): void {
  ctx.fillStyle = COLORS.table;
  ctx.fillRect(0, layout.belt.y - 24, layout.width, layout.height);
}

function drawTitle(ctx: CanvasRenderingContext2D, layout: PlayfieldLayout): void {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = COLORS.muted;
  ctx.font = "600 12px ui-rounded, system-ui, sans-serif";
  ctx.fillText(GAME_TITLE, layout.hud.x + 4, layout.hud.y + layout.hud.height + 4);
}

function drawBelt(
  ctx: CanvasRenderingContext2D,
  belt: Rect,
  elapsed: number,
  speed: number,
): void {
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
  const shift = (elapsed * speed) % (stripeW * 2);
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
  world: World,
): void {
  for (const slot of layouts) {
    const bin = world.bins.find((entry) => entry.type === slot.type);
    const filled = bin?.filled ?? 0;
    const capacity = bin?.capacity ?? slot.capacity;
    const color = COLORS.item[slot.type];
    const hovering = world.hoverBinType === slot.type;
    const held = world.grabbed;
    const matchHover = hovering && held !== null && held.type === slot.type;
    const feedback = world.feedback?.binType === slot.type ? world.feedback : null;
    const full = filled >= capacity;

    roundRect(ctx, slot.x, slot.y, slot.width, slot.height, 14);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();

    const fillRatio = capacity > 0 ? Math.min(1, filled / capacity) : 0;
    if (fillRatio > 0) {
      ctx.save();
      roundRect(ctx, slot.x, slot.y, slot.width, slot.height, 14);
      ctx.clip();
      const fillH = slot.height * fillRatio;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(slot.x, slot.y + slot.height - fillH, slot.width, fillH);
      ctx.restore();
    }

    if (feedback) {
      ctx.fillStyle = feedback.kind === "correct" ? COLORS.dropOk : COLORS.dropBad;
      ctx.globalAlpha = 0.28;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (hovering && held) {
      ctx.fillStyle = matchHover ? COLORS.dropOk : COLORS.dropBad;
      ctx.globalAlpha = 0.18;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle =
      feedback?.kind === "correct" || matchHover
        ? COLORS.dropOk
        : feedback || (hovering && held)
          ? COLORS.dropBad
          : color;
    ctx.lineWidth = hovering || feedback ? 5 : 3;
    ctx.stroke();

    const iconX = slot.x + slot.width / 2;
    const iconY = slot.y + slot.height * 0.38;
    drawTypeShape(ctx, slot.type, iconX, iconY, Math.min(38, slot.width * 0.28));

    ctx.fillStyle = COLORS.title;
    ctx.font = `700 ${slot.width < 90 ? 11 : 14}px ui-rounded, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(TYPE_LABEL[slot.type], iconX, slot.y + slot.height - 22);

    ctx.fillStyle = full ? COLORS.gold : COLORS.muted;
    ctx.font = "12px ui-rounded, system-ui, sans-serif";
    ctx.fillText(full ? "ПОЛНО" : `${filled} / ${capacity}`, iconX, slot.y + slot.height - 8);
  }
}

function drawItems(ctx: CanvasRenderingContext2D, items: Item[]): void {
  const held: Item[] = [];
  for (const item of items) {
    if (item.state === ITEM_STATE.InHand) {
      held.push(item);
      continue;
    }
    drawTypeShape(ctx, item.type, item.x, item.y, item.size * 0.5);
  }
  for (const item of held) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    drawTypeShape(ctx, item.type, item.x, item.y, item.size * 0.6);
    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, world: World): void {
  for (const p of world.fx.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of world.fx.floaters) {
    const t = f.life / f.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.2);
    ctx.fillStyle = "#12141a";
    ctx.font = `800 ${f.size}px ui-rounded, system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#12141a";
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
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
  pathTypeShape(ctx, type, x, y, radius);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function pathTypeShape(
  ctx: CanvasRenderingContext2D,
  type: ItemType,
  x: number,
  y: number,
  radius: number,
): void {
  if (type === "red") {
    roundRect(ctx, x - radius, y - radius, radius * 2, radius * 2, 6);
  } else if (type === "blue") {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  } else if (type === "yellow") {
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y + radius * 0.85);
    ctx.lineTo(x - radius, y + radius * 0.85);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y);
    ctx.lineTo(x, y + radius);
    ctx.lineTo(x - radius, y);
    ctx.closePath();
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
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}
