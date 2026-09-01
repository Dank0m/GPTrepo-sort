import {
  BELT,
  BIN_CAPACITY,
  ECONOMY,
  INPUT,
  ITEM_STATE,
  ITEM_TYPES,
  type ItemType,
} from "../config.ts";
import { createBin, type Bin } from "./bin.ts";
import { hitBin, hitItem } from "./hit.ts";
import { createItem, type Item } from "./item.ts";
import { computeLayout, type PlayfieldLayout } from "./layout.ts";

export type DropKind = "correct" | "wrong" | "full" | "overflow";
export type SessionStatus = "playing" | "over";

export type DropFeedback = {
  binType: ItemType | null;
  kind: DropKind;
  until: number;
};

export class World {
  items: Item[] = [];
  bins: Bin[] = [];
  layout: PlayfieldLayout;
  elapsed = 0;
  grabbed: Item | null = null;
  hoverBinType: ItemType | null = null;
  feedback: DropFeedback | null = null;
  lastDrop: DropKind | "none" = "none";
  coins = 0;
  combo = 0;
  lives: number = ECONOMY.startLives;
  status: SessionStatus = "playing";
  lastGain = 0;
  private spawnTimer: number = BELT.spawnInterval;

  constructor(width: number, height: number) {
    this.layout = computeLayout(width, height);
    this.resetSession();
  }

  restart(): void {
    this.resetSession();
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
    if (this.status !== "playing") {
      return;
    }
    this.moveBelt(dt);
    this.spawnTimer += dt;
    if (this.canSpawn()) {
      this.spawnItem();
      this.spawnTimer = 0;
    }
  }

  pointerDown(x: number, y: number): boolean {
    if (this.status === "over") {
      this.restart();
      return false;
    }
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
    if (!this.grabbed || this.status !== "playing") {
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
    if (this.status !== "playing") {
      this.returnToBelt(held);
      return;
    }

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
      this.removeItem(held);
      this.applyMiss();
      return;
    }

    if (bin.filled >= bin.capacity) {
      this.setFeedback(slot.type, "full");
      this.returnToBelt(held);
      return;
    }

    bin.filled += 1;
    held.state = ITEM_STATE.InBin;
    this.removeItem(held);
    this.applyCorrect();
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

  private resetSession(): void {
    this.items = [];
    this.bins = ITEM_TYPES.map((type) => createBin(type, BIN_CAPACITY));
    this.grabbed = null;
    this.hoverBinType = null;
    this.feedback = null;
    this.lastDrop = "none";
    this.coins = 0;
    this.combo = 0;
    this.lives = ECONOMY.startLives;
    this.status = "playing";
    this.lastGain = 0;
    this.elapsed = 0;
    this.spawnTimer = BELT.spawnInterval;
  }

  private applyCorrect(): void {
    this.combo += 1;
    this.lastGain = ECONOMY.coinValue * this.combo;
    this.coins += this.lastGain;
  }

  private applyMiss(): void {
    this.combo = 0;
    this.lastGain = 0;
    this.lives -= 1;
    if (this.lives <= 0) {
      this.lives = 0;
      this.status = "over";
      this.grabbed = null;
    }
  }

  private setFeedback(binType: ItemType | null, kind: DropKind): void {
    this.lastDrop = kind;
    this.feedback = {
      binType,
      kind,
      until: this.elapsed + INPUT.feedbackSeconds,
    };
  }

  private removeItem(item: Item): void {
    this.items = this.items.filter((entry) => entry.id !== item.id);
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
    const kept: Item[] = [];

    for (const item of this.items) {
      if (item.state === ITEM_STATE.InHand) {
        kept.push(item);
        continue;
      }
      if (item.state !== ITEM_STATE.OnBelt) {
        continue;
      }
      if (this.status !== "playing") {
        kept.push(item);
        continue;
      }
      item.x += BELT.speed * dt;
      item.y = centerY;
      if (item.x >= endX) {
        this.setFeedback(null, "overflow");
        this.applyMiss();
        continue;
      }
      kept.push(item);
    }

    this.items = kept;
  }

  private canSpawn(): boolean {
    if (this.status !== "playing") {
      return false;
    }
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
