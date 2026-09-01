import { clamp } from "../utils/math.ts";
import type { Item } from "./Item.ts";
import type { Level } from "./Level.ts";
import type { Playfield } from "./LevelGenerator.ts";

const LIFT = 36;

export class DragController {
  private pointerId: number | null = null;
  private item: Item | null = null;

  get active(): boolean {
    return this.item !== null;
  }

  get capturedId(): number | null {
    return this.pointerId;
  }

  down(
    pointerId: number,
    x: number,
    y: number,
    level: Level,
    playfield: Playfield,
  ): boolean {
    if (this.pointerId !== null) return false;
    const item = level.itemAt(x, y);
    if (!item) return false;
    this.pointerId = pointerId;
    this.item = item;
    item.dragging = true;
    this.place(item, x, y, playfield);
    this.updateHighlight(level, item);
    return true;
  }

  move(pointerId: number, x: number, y: number, level: Level, playfield: Playfield): void {
    if (pointerId !== this.pointerId || !this.item) return;
    this.place(this.item, x, y, playfield);
    this.updateHighlight(level, this.item);
  }

  up(pointerId: number, level: Level): "sorted" | "returned" | "none" {
    if (pointerId !== this.pointerId || !this.item) return "none";
    const item = this.item;
    const container = level.containerAt(item.x, item.y);
    level.clearHighlights();
    item.dragging = false;
    this.item = null;
    this.pointerId = null;

    if (container && container.accepts(item)) {
      item.sorted = true;
      return "sorted";
    }
    item.snapToOrigin();
    return "returned";
  }

  cancel(pointerId: number, level: Level): void {
    if (pointerId !== this.pointerId || !this.item) return;
    this.item.dragging = false;
    this.item.snapToOrigin();
    this.item = null;
    this.pointerId = null;
    level.clearHighlights();
  }

  private place(item: Item, x: number, y: number, playfield: Playfield): void {
    const r = item.size / 2;
    item.x = clamp(x, playfield.x + r, playfield.x + playfield.w - r);
    item.y = clamp(y - LIFT, playfield.y + r, playfield.y + playfield.h - r);
  }

  private updateHighlight(level: Level, item: Item): void {
    const over = level.containerAt(item.x, item.y);
    for (const container of level.containers) {
      container.highlight = over === container;
    }
  }
}
