import {
  BELT,
  BIN_CAPACITY,
  INPUT,
  ITEM_STATE,
  ITEM_TYPES,
  type ItemType,
} from "../config.ts";
import { createBin, type Bin } from "./bin.ts";
import { hitBin, hitItem } from "./hit.ts";
import { createItem, type Item } from "./item.ts";
import { computeLayout, type PlayfieldLayout } from "./layout.ts";

export type DropKind = "correct" | "wrong" | "full";

export type DropFeedback = {
  binType: ItemType;
  kind: DropKind;
  until: number;
};

export class World {
  items: Item[] = [];
  readonly bins: Bin[];
  layout: PlayfieldLayout;
  elapsed = 0;
  grabbed: Item | null = null;
  hoverBinType: ItemType | null = null;
  feedback: DropFeedback | null = null;
  lastDrop: DropKind | "none" = "none";
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
    if (this.feedback && this.elapsed >= this.feedback.until) {
      this.feedback = null;
    }
    this.moveBelt(dt);
    this.spawnTimer += dt;
    if (this.canSpawn()) {
      this.spawnItem();
      this.spawnTimer = 0;
    }
  }

  pointerDown(x: number, y: number): boolean {
    if (this.grabbed) {
      return true;
    }
    const onBelt = this.items.filter((item) => item.state === ITEM_STATE.OnBelt);
    const hit = hitItem(onBelt, x, y, INPUT.grabPadding);
    if (!hit) {
      return false;
    }
    hit.state = ITEM_STATE.InHand;
    hit.x = x;
    hit.y = y;
    this.grabbed = hit;
    this.hoverBinType = hitBin(this.layout.bins, x, y)?.type ?? null;
    return true;
  }

  pointerMove(x: number, y: number): void {
    if (!this.grabbed) {
      return;
    }
    this.grabbed.x = x;
    this.grabbed.y = y;
    this.hoverBinType = hitBin(this.layout.bins, x, y)?.type ?? null;
  }

  pointerUp(x: number, y: number): void {
    const held = this.grabbed;
    if (!held) {
      return;
    }
    this.grabbed = null;
    this.hoverBinType = null;

    const slot = hitBin(this.layout.bins, x, y);
    if (!slot) {
      this.returnToBelt(held);
      return;
    }

    const bin = this.bins.find((entry) => entry.type === slot.type);
    if (!bin) {
      this.returnToBelt(held);
      return;
    }

    if (held.type !== slot.type) {
      this.setFeedback(slot.type, "wrong");
      this.returnToBelt(held);
      return;
    }

    if (bin.filled >= bin.capacity) {
      this.setFeedback(slot.type, "full");
      this.returnToBelt(held);
      return;
    }

    bin.filled += 1;
    held.state = ITEM_STATE.InBin;
    this.items = this.items.filter((item) => item.id !== held.id);
    this.setFeedback(slot.type, "correct");
  }

  pointerCancel(): void {
    if (!this.grabbed) {
      return;
    }
    this.returnToBelt(this.grabbed);
    this.grabbed = null;
    this.hoverBinType = null;
  }

  private setFeedback(binType: ItemType, kind: DropKind): void {
    this.lastDrop = kind;
    this.feedback = {
      binType,
      kind,
      until: this.elapsed + INPUT.feedbackSeconds,
    };
  }

  private returnToBelt(item: Item): void {
    const belt = this.layout.belt;
    item.state = ITEM_STATE.OnBelt;
    item.size = this.layout.itemSize;
    item.y = belt.y + belt.height / 2;
    const half = item.size * 0.5;
    item.x = Math.min(belt.x + belt.width - half, Math.max(belt.x + half, item.x));
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

    this.items = this.items.filter((item) => {
      if (item.state === ITEM_STATE.InHand) {
        return true;
      }
      return item.state !== ITEM_STATE.OnBelt || item.x < endX;
    });
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
