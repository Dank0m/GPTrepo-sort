import type { LevelConfig } from "../config/levels.ts";
import type { Container } from "./Container.ts";
import type { Item } from "./Item.ts";

export class Level {
  readonly number: number;
  readonly config: LevelConfig;
  readonly items: Item[];
  readonly containers: Container[];

  constructor(args: {
    number: number;
    config: LevelConfig;
    items: Item[];
    containers: Container[];
  }) {
    this.number = args.number;
    this.config = args.config;
    this.items = args.items;
    this.containers = args.containers;
  }

  remaining(): number {
    return this.items.filter((item) => !item.sorted).length;
  }

  sortedCount(): number {
    return this.items.filter((item) => item.sorted).length;
  }

  total(): number {
    return this.items.length;
  }

  isComplete(): boolean {
    return this.items.length > 0 && this.items.every((item) => item.sorted);
  }

  itemAt(x: number, y: number): Item | null {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      if (item && !item.sorted && item.contains(x, y)) return item;
    }
    return null;
  }

  containerAt(x: number, y: number): Container | null {
    return this.containers.find((container) => container.contains(x, y)) ?? null;
  }

  clearHighlights(): void {
    for (const container of this.containers) container.highlight = false;
  }
}
