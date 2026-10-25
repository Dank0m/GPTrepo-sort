import { ADS, COLORS, UPGRADES, nextUpgradeCost, type UpgradeId } from "../config.ts";
import { pointInRect } from "../game/hit.ts";
import type { World } from "../game/world.ts";
import { strings } from "../i18n/locale.ts";

export function drawShop(ctx: CanvasRenderingContext2D, world: World): void {
  for (const button of world.layout.shopButtons) {
    const level = world.levels[button.id];
    const def = UPGRADES[button.id];
    const cost = nextUpgradeCost(button.id, level);
    const hovered = world.hoverUpgrade === button.id;
    const pulse = world.shopPulse?.id === button.id ? world.shopPulse : null;
    const maxed = cost === null;
    const canBuy = cost !== null && world.coins >= cost;

    roundRect(ctx, button.x, button.y, button.width, button.height, 12);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();

    if (pulse?.kind === "reject") {
      ctx.fillStyle = COLORS.dropBad;
      ctx.globalAlpha = 0.22;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (pulse?.kind === "buy") {
      ctx.fillStyle = COLORS.gold;
      ctx.globalAlpha = 0.18;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = pulse?.kind === "reject"
      ? COLORS.dropBad
      : canBuy
        ? COLORS.gold
        : hovered
          ? COLORS.title
          : COLORS.beltEdge;
    ctx.lineWidth = hovered || pulse ? 3 : 2;
    ctx.stroke();

    const cx = button.x + button.width / 2;
    const compact = button.height < 64;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.title;
    ctx.font = `700 ${compact ? 11 : 13}px ui-rounded, system-ui, sans-serif`;
    ctx.fillText(strings().upgrades[button.id], cx, button.y + button.height * (compact ? 0.26 : 0.28), button.width - 12);

    ctx.fillStyle = COLORS.muted;
    ctx.font = `${compact ? 10 : 11}px ui-rounded, system-ui, sans-serif`;
    ctx.fillText(`${level}/${def.max}`, cx, button.y + button.height * 0.5);

    ctx.fillStyle = maxed ? COLORS.muted : canBuy ? COLORS.gold : COLORS.dropBad;
    ctx.font = `700 ${compact ? 11 : 13}px ui-rounded, system-ui, sans-serif`;
    ctx.fillText(maxed ? "MAX" : `${cost}`, cx, button.y + button.height * (compact ? 0.76 : 0.74));
  }

  drawFreeCoins(ctx, world);
}

function drawFreeCoins(ctx: CanvasRenderingContext2D, world: World): void {
  const button = world.layout.freeCoins;
  if (!button || !world.showFreeCoins()) {
    return;
  }
  const ready = world.freeCoinsReady();
  const wait = world.freeCoinsCooldown();
  const hovered = world.hoverFreeCoins;
  const compact = button.height < 64;

  roundRect(ctx, button.x, button.y, button.width, button.height, 12);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.strokeStyle = ready ? COLORS.gold : hovered ? COLORS.title : COLORS.beltEdge;
  ctx.lineWidth = hovered || ready ? 3 : 2;
  ctx.stroke();

  const cx = button.x + button.width / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.title;
  ctx.font = `700 ${compact ? 11 : 13}px ui-rounded, system-ui, sans-serif`;
  const t = strings();
  ctx.fillText(compact || button.width < 150 ? t.freeCoinsShort : t.freeCoins, cx, button.y + button.height * (compact ? 0.26 : 0.28), button.width - 12);

  if (wait > 0) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `${compact ? 10 : 11}px ui-rounded, system-ui, sans-serif`;
    ctx.fillText(formatCooldown(wait), cx, button.y + button.height * 0.5);
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 ${compact ? 11 : 13}px ui-rounded, system-ui, sans-serif`;
    ctx.fillText(t.wait, cx, button.y + button.height * (compact ? 0.76 : 0.74));
    return;
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = `${compact ? 10 : 11}px ui-rounded, system-ui, sans-serif`;
  ctx.fillText(t.ad, cx, button.y + button.height * 0.5);
  ctx.fillStyle = ready ? COLORS.gold : COLORS.muted;
  ctx.font = `700 ${compact ? 11 : 13}px ui-rounded, system-ui, sans-serif`;
  ctx.fillText(`+${ADS.freeCoins}`, cx, button.y + button.height * (compact ? 0.76 : 0.74));
}

function formatCooldown(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function shopCursor(world: World, x: number, y: number): boolean {
  if (
    pointInRect(x, y, world.layout.mute) ||
    pointInRect(x, y, world.layout.pause) ||
    pointInRect(x, y, world.layout.lang)
  ) {
    return true;
  }
  if (world.layout.freeCoins && pointInRect(x, y, world.layout.freeCoins)) {
    return true;
  }
  if (world.status === "over") {
    const ui = world.gameOverUi(world.layout.width, world.layout.height);
    return pointInRect(x, y, ui.restartBtn);
  }
  const dump = world.dumpOfferUi(world.layout.width, world.layout.height);
  if (dump && (pointInRect(x, y, dump.doubleBtn) || pointInRect(x, y, dump.dismissBtn))) {
    return true;
  }
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
