import { SHAPE_COLORS, type ShapeId } from "../config/balance.ts";
import { roundRectPath } from "../utils/math.ts";

export class Item {
  readonly typeId: number;
  readonly shape: ShapeId;
  readonly size: number;

  x: number;
  y: number;
  originX: number;
  originY: number;
  dragging = false;
  sorted = false;

  constructor(args: {
    typeId: number;
    shape: ShapeId;
    x: number;
    y: number;
    size: number;
  }) {
    this.typeId = args.typeId;
    this.shape = args.shape;
    this.x = args.x;
    this.y = args.y;
    this.originX = args.x;
    this.originY = args.y;
    this.size = args.size;
  }

  contains(px: number, py: number): boolean {
    const r = this.size / 2;
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= r * r;
  }

  snapToOrigin(): void {
    this.x = this.originX;
    this.y = this.originY;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const r = this.size / 2;
    const colors = SHAPE_COLORS[this.shape];
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.dragging) {
      ctx.shadowColor = "rgba(43, 33, 64, 0.35)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
    }
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    drawShape(ctx, this.shape, r);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawShape(ctx: CanvasRenderingContext2D, shape: ShapeId, r: number): void {
  switch (shape) {
    case "circle":
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      break;
    case "square": {
      const s = r * 1.55;
      roundRectPath(ctx, -s / 2, -s / 2, s, s, 10);
      break;
    }
    case "triangle":
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.95, r * 0.82);
      ctx.lineTo(-r * 0.95, r * 0.82);
      ctx.closePath();
      break;
    case "diamond":
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      break;
    case "star":
      starPath(ctx, 5, r, r * 0.42);
      break;
  }
}

function starPath(
  ctx: CanvasRenderingContext2D,
  spikes: number,
  outer: number,
  inner: number,
): void {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.moveTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
  for (let i = 0; i < spikes; i += 1) {
    rot += step;
    ctx.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
    rot += step;
    ctx.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
  }
  ctx.closePath();
}
