import { COLORS, UPGRADES, nextUpgradeCost, type UpgradeId } from "../config.ts";
import { pointInRect } from "../game/hit.ts";
import type { World } from "../game/world.ts";

export function drawShop(ctx: CanvasRenderingContext2D, world: World): void {
  for (const button of world.layout.shopButtons) {
    const level = world.levels[button.id];
    const def = UPGRADES[button.id];
    const cost = nextUpgradeCost(button.id, level);
    const hovered = world.hoverUpgrade === button.id;
    const maxed = cost === null;
    const canBuy = cost !== null && world.coins >= cost;

    roundRect(ctx, button.x, button.y, button.width, button.height, 10);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();
    ctx.strokeStyle = canBuy ? COLORS.gold : hovered ? COLORS.title : COLORS.beltEdge;
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.stroke();

    const cx = button.x + button.width / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.title;
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillText(def.label, cx, button.y + button.height * 0.28);

    ctx.fillStyle = COLORS.muted;
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(`${level}/${def.max}`, cx, button.y + button.height * 0.52);

    ctx.fillStyle = maxed ? COLORS.muted : canBuy ? COLORS.gold : COLORS.dropBad;
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillText(maxed ? "MAX" : `${cost}`, cx, button.y + button.height * 0.76);
  }
}

export function shopCursor(world: World, x: number, y: number): boolean {
  return world.layout.shopButtons.some((button) => pointInRect(x, y, button));
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

export type { UpgradeId };
