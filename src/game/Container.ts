import { PALETTE, SHAPE_COLORS, type ShapeId } from "../config/balance.ts";
import { pointInRect, roundRectPath, type Rect } from "../utils/math.ts";
import type { Item } from "./Item.ts";

export class Container {
  readonly typeId: number;
  readonly shape: ShapeId;
  readonly rect: Rect;
  highlight = false;

  constructor(args: { typeId: number; shape: ShapeId; rect: Rect }) {
    this.typeId = args.typeId;
    this.shape = args.shape;
    this.rect = args.rect;
  }

  contains(px: number, py: number): boolean {
    return pointInRect(px, py, this.rect);
  }

  accepts(item: Item): boolean {
    return item.typeId === this.typeId;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = this.rect;
    const color = SHAPE_COLORS[this.shape];
    ctx.save();
    roundRectPath(ctx, x, y, width, height, 22);
    ctx.fillStyle = this.highlight ? "rgba(108, 92, 231, 0.16)" : "rgba(255, 255, 255, 0.72)";
    ctx.strokeStyle = this.highlight ? color.fill : PALETTE.fieldShadow;
    ctx.lineWidth = this.highlight ? 4 : 3;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color.fill;
    ctx.beginPath();
    const cx = x + width / 2;
    const cy = y + height * 0.42;
    const r = Math.min(width, height) * 0.18;
    icon(ctx, this.shape, cx, cy, r);
    ctx.fill();

    ctx.fillStyle = PALETTE.muted;
    ctx.font = `700 ${Math.round(height * 0.14)}px ui-rounded, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label(this.shape), cx, y + height * 0.78);
    ctx.restore();
  }
}

function label(shape: ShapeId): string {
  switch (shape) {
    case "circle":
      return "КРУГ";
    case "square":
      return "КВАДРАТ";
    case "triangle":
      return "ТРЕУГ.";
    case "diamond":
      return "РОМБ";
    case "star":
      return "ЗВЕЗДА";
  }
}

function icon(
  ctx: CanvasRenderingContext2D,
  shape: ShapeId,
  cx: number,
  cy: number,
  r: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  switch (shape) {
    case "circle":
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      break;
    case "square": {
      const s = r * 1.6;
      roundRectPath(ctx, -s / 2, -s / 2, s, s, 6);
      break;
    }
    case "triangle":
      ctx.moveTo(0, -r);
      ctx.lineTo(r, r * 0.85);
      ctx.lineTo(-r, r * 0.85);
      ctx.closePath();
      break;
    case "diamond":
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      break;
    case "star": {
      let rot = -Math.PI / 2;
      const step = Math.PI / 5;
      ctx.moveTo(Math.cos(rot) * r, Math.sin(rot) * r);
      for (let i = 0; i < 5; i += 1) {
        rot += step;
        ctx.lineTo(Math.cos(rot) * r * 0.42, Math.sin(rot) * r * 0.42);
        rot += step;
        ctx.lineTo(Math.cos(rot) * r, Math.sin(rot) * r);
      }
      ctx.closePath();
      break;
    }
  }
  ctx.restore();
}
