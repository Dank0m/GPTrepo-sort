import { BELT, BIN_CAPACITY, ITEM_STATE, ITEM_TYPES, type ItemType } from "../config.ts";
import { createBin, type Bin } from "./bin.ts";
import { createItem, type Item } from "./item.ts";
import { computeLayout, type PlayfieldLayout } from "./layout.ts";

export class World {
  items: Item[] = [];
  readonly bins: Bin[];
  layout: PlayfieldLayout;
  elapsed = 0;
  private spawnTimer: number = BELT.spawnInterval;

  constructor(width: number, height: number) {
    this.layout = computeLayout(width, height);
    this.bins = ITEM_TYPES.map((type) => createBin(type, BIN_CAPACITY));
  }

  resize(width: number, height: number): void {
    this.layout = computeLayout(width, height);
    const belt = this.layout.belt;
    const centerY = belt.y + belt.height / 2;
    for (const item of this.items) {
      item.size = this.layout.itemSize;
      if (item.state === ITEM_STATE.OnBelt) {
        item.y = centerY;
      }
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.moveBelt(dt);
    this.spawnTimer += dt;
    if (this.canSpawn()) {
      this.spawnItem();
      this.spawnTimer = 0;
    }
  }

  private moveBelt(dt: number): void {
    const belt = this.layout.belt;
    const centerY = belt.y + belt.height / 2;
    const endX = belt.x + belt.width + this.layout.itemSize;

    for (const item of this.items) {
      if (item.state !== ITEM_STATE.OnBelt) {
        continue;
      }
      item.x += BELT.speed * dt;
      item.y = centerY;
    }

    this.items = this.items.filter(
      (item) => item.state !== ITEM_STATE.OnBelt || item.x < endX,
    );
  }

  private canSpawn(): boolean {
    if (this.spawnTimer < BELT.spawnInterval) {
      return false;
    }
    const belt = this.layout.belt;
    const spawnX = belt.x - this.layout.itemSize * 0.35;
    return this.items.every((item) => {
      if (item.state !== ITEM_STATE.OnBelt) {
        return true;
      }
      return item.x - spawnX >= BELT.minGap;
    });
  }

  private spawnItem(): void {
    const type = randomType();
    const belt = this.layout.belt;
    const size = this.layout.itemSize;
    const x = belt.x - size * 0.35;
    const y = belt.y + belt.height / 2;
    this.items.push(createItem(type, x, y, size));
  }
}

function randomType(): ItemType {
  const index = Math.floor(Math.random() * ITEM_TYPES.length);
  return ITEM_TYPES[index] ?? "red";
}
