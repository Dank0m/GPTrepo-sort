import { COLORS } from '../config.ts';
import { pointInRect } from '../game/hit.ts';
import type { World } from '../game/world.ts';
import { currentLocale } from '../i18n/locale.ts';
import { TREE_TEXT } from '../i18n/tree.ts';
export function drawShop(ctx: CanvasRenderingContext2D,world:World):void {
 const t=TREE_TEXT[currentLocale()];
 for(const [rect,title,detail] of [
  [world.layout.treeButton,t.open,`${t.coins}: ${world.coins}`],
  [world.layout.groupButton,world.levels.wide?(world.groupMode?t.active:t.off):t.groupLocked,world.levels.wide?(currentLocale()==='ru'?'Нажми для переключения':'Tap to toggle'):t.open],
 ] as const){
  ctx.save();ctx.beginPath();ctx.roundRect(rect.x,rect.y,rect.width,rect.height,10);ctx.fillStyle=COLORS.panel;ctx.fill();ctx.strokeStyle=COLORS.gold;ctx.lineWidth=2;ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=COLORS.title;ctx.font='700 13px system-ui';ctx.fillText(title,rect.x+rect.width/2,rect.y+rect.height*.35,rect.width-12);
  ctx.fillStyle=COLORS.muted;ctx.font='11px system-ui';ctx.fillText(detail,rect.x+rect.width/2,rect.y+rect.height*.74,rect.width-12);ctx.restore();
 }
}
export function shopCursor(world:World,x:number,y:number):boolean {
 return [world.layout.treeButton,world.layout.groupButton,world.layout.mute,world.layout.pause,world.layout.lang].some(rect=>pointInRect(x,y,rect));
}
