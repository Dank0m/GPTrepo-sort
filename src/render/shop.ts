import { COLORS } from '../config.ts';
import { pointInRect } from '../game/hit.ts';
import type { World } from '../game/world.ts';
import { currentLocale } from '../i18n/locale.ts';
import { TREE_TEXT } from '../i18n/tree.ts';

export function drawShop(ctx: CanvasRenderingContext2D, world: World): void {
  const t = TREE_TEXT[currentLocale()], r = world.layout.groupButton;
  const title = world.levels.wide ? (world.groupMode ? t.active : t.off) : t.groupLocked;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.width, r.height, 9);
  ctx.fillStyle = COLORS.panel; ctx.fill();
  ctx.strokeStyle = world.groupMode ? COLORS.gold : COLORS.beltEdge; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = world.levels.wide ? COLORS.title : COLORS.muted;
  ctx.font = '700 12px system-ui';
  ctx.fillText(title, r.x + r.width / 2, r.y + r.height / 2, r.width - 12);
  ctx.restore();
}
export function shopCursor(world: World, x: number, y: number): boolean {
  const controls = [world.layout.groupButton, world.layout.mute, world.layout.pause, world.layout.lang];
  if (world.status === 'over') controls.push(world.gameOverUi(world.layout.width, world.layout.height).restartBtn);
  const offer = world.dumpOfferUi(world.layout.width, world.layout.height);
  if (offer) controls.push(offer.doubleBtn, offer.dismissBtn);
  return controls.some(rect => pointInRect(x, y, rect));
}
