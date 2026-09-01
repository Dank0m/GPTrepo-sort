import {
  AUTO_SORT,
  BIN_CAPACITY,
  COLORS,
  ECONOMY,
  INPUT,
  ITEM_STATE,
  nextUpgradeCost,
  type ItemType,
  type UpgradeId,
} from "../config.ts";
import { sfx } from "../audio/sfx.ts";
import { loadRecords, saveRecords, type Records } from "./save.ts";
import { createBin, type Bin } from "./bin.ts";
import { Fx } from "./fx.ts";
import { hitBin, hitItem, pointInRect } from "./hit.ts";
import { createItem, type Item } from "./item.ts";
import { computeLayout, type PlayfieldLayout } from "./layout.ts";
import {
  activeTypes,
  autoInterval,
  beltSpeed,
  coinValue,
  emptyLevels,
  minGap,
  spawnInterval,
  type UpgradeLevels,
} from "./upgrades.ts";

export type DropKind = "correct" | "wrong" | "full" | "overflow";
export type SessionStatus = "playing" | "over";

export type DropFeedback = {
  binType: ItemType | null;
  kind: DropKind;
  until: number;
};

export type ShopPulse = {
  id: UpgradeId;
  kind: "buy" | "reject";
  until: number;
};

export class World {
  items: Item[] = [];
  bins: Bin[] = [];
  layout: PlayfieldLayout;
  elapsed = 0;
  grabbed: Item | null = null;
  hoverBinType: ItemType | null = null;
  hoverUpgrade: UpgradeId | null = null;
  feedback: DropFeedback | null = null;
  lastDrop: DropKind | "none" = "none";
  coins = 0;
  combo = 0;
  maxCombo = 0;
  lives: number = ECONOMY.startLives;
  status: SessionStatus = "playing";
  lastGain = 0;
  levels: UpgradeLevels = emptyLevels();
  fx = new Fx();
  debug = false;
  shopPulse: ShopPulse | null = null;
  sortedCount = 0;
  paused = false;
  records: Records = loadRecords();
  beatBestCoins = false;
  beatBestCombo = false;
  private spawnTimer = 0;
  private autoTimer = 0;

  constructor(width: number, height: number) {
    this.layout = computeLayout(width, height, activeTypes(this.levels));
    this.resetSession();
  }

  restart(): void {
    this.resetSession();
  }

  pause(): void {
    if (this.paused || this.status !== "playing") {
      return;
    }
    this.paused = true;
    if (this.grabbed) {
      this.returnToBelt(this.grabbed);
      this.grabbed = null;
      this.hoverBinType = null;
    }
    sfx.hush();
  }

  resume(): void {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    sfx.unlock();
  }

  togglePause(): void {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  resize(width: number, height: number): void {
    this.layout = computeLayout(width, height, activeTypes(this.levels));
    this.snapBeltItems();
  }

  update(dt: number): void {
    if (this.paused) {
      return;
    }
    this.elapsed += dt;
    this.fx.update(dt);
    this.updateFlights(dt);
    if (this.feedback && this.elapsed >= this.feedback.until) {
      this.feedback = null;
    }
    if (this.shopPulse && this.elapsed >= this.shopPulse.until) {
      this.shopPulse = null;
    }
    if (this.status !== "playing") {
      return;
    }
    this.moveBelt(dt);
    this.runAutoSort(dt);
    this.spawnTimer += dt;
    if (this.canSpawn()) {
      this.spawnItem();
      this.spawnTimer = 0;
    }
  }

  pointerDown(x: number, y: number): boolean {
    if (pointInRect(x, y, this.layout.mute)) {
      sfx.toggle();
      if (!this.paused && !sfx.muted) {
        sfx.unlock();
      }
      return false;
    }
    if (pointInRect(x, y, this.layout.pause)) {
      this.togglePause();
      return false;
    }
    if (this.status === "over") {
      this.restart();
      return false;
    }
    if (this.paused) {
      this.resume();
      return false;
    }
    sfx.unlock();
    const upgrade = this.hitUpgrade(x, y);
    if (upgrade) {
      this.tryBuy(upgrade);
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
    this.placeGrabbed(hit, x, y);
    this.grabbed = hit;
    this.hoverBinType = hitBin(this.layout.bins, hit.x, hit.y)?.type ?? null;
    return true;
  }

  pointerMove(x: number, y: number): void {
    this.hoverUpgrade = this.hitUpgrade(x, y) ?? null;
    if (!this.grabbed || this.status !== "playing" || this.paused) {
      return;
    }
    this.placeGrabbed(this.grabbed, x, y);
    this.hoverBinType = hitBin(this.layout.bins, this.grabbed.x, this.grabbed.y)?.type ?? null;
  }

  pointerUp(x: number, y: number): void {
    const held = this.grabbed;
    if (!held) {
      return;
    }
    this.placeGrabbed(held, x, y);
    this.grabbed = null;
    this.hoverBinType = null;
    if (this.status !== "playing") {
      this.returnToBelt(held);
      return;
    }

    const slot = hitBin(this.layout.bins, held.x, held.y);
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
      this.fx.burst(held.x, held.y, COLORS.dropBad, 10);
      this.fx.float(slot.x + slot.width / 2, slot.y + slot.height * 0.35, "Мимо", COLORS.dropBad, 28, 1.1);
      this.removeItem(held);
      this.applyMiss();
      return;
    }

    if (bin.filled >= bin.capacity) {
      this.setFeedback(slot.type, "full");
      this.fx.float(slot.x + slot.width / 2, slot.y, "Полно", COLORS.gold);
      sfx.play("full");
      this.returnToBelt(held);
      return;
    }

    this.acceptItem(held, bin);
  }

  pointerCancel(): void {
    if (!this.grabbed) {
      return;
    }
    this.returnToBelt(this.grabbed);
    this.grabbed = null;
    this.hoverBinType = null;
  }

  tryBuy(id: UpgradeId): boolean {
    const cost = nextUpgradeCost(id, this.levels[id]);
    if (cost === null || this.coins < cost) {
      this.shopPulse = { id, kind: "reject", until: this.elapsed + 0.35 };
      sfx.play("reject");
      return false;
    }
    this.coins -= cost;
    this.levels[id] += 1;
    this.shopPulse = { id, kind: "buy", until: this.elapsed + 0.35 };
    this.syncBins();
    this.layout = computeLayout(this.layout.width, this.layout.height, activeTypes(this.levels));
    this.snapBeltItems();
    sfx.play("buy");
    return true;
  }

  hitUpgrade(x: number, y: number): UpgradeId | undefined {
    return this.layout.shopButtons.find((button) => pointInRect(x, y, button))?.id;
  }

  private placeGrabbed(item: Item, x: number, y: number): void {
    item.x = x;
    item.y = y - INPUT.dragLift;
  }

  private resetSession(): void {
    this.levels = emptyLevels();
    this.items = [];
    this.bins = [];
    this.syncBins();
    this.layout = computeLayout(this.layout.width, this.layout.height, activeTypes(this.levels));
    this.grabbed = null;
    this.hoverBinType = null;
    this.hoverUpgrade = null;
    this.feedback = null;
    this.lastDrop = "none";
    this.coins = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lives = ECONOMY.startLives;
    this.status = "playing";
    this.lastGain = 0;
    this.elapsed = 0;
    this.spawnTimer = 0;
    this.autoTimer = 0;
    this.shopPulse = null;
    this.sortedCount = 0;
    this.paused = false;
    this.beatBestCoins = false;
    this.beatBestCombo = false;
    this.fx.clear();
  }

  private syncBins(): void {
    const types = activeTypes(this.levels);
    const next: Bin[] = [];
    for (const type of types) {
      next.push(this.bins.find((bin) => bin.type === type) ?? createBin(type, BIN_CAPACITY));
    }
    this.bins = next;
  }

  private applyCorrect(): void {
    this.combo += 1;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.lastGain = coinValue(this.levels) * this.combo;
    this.coins += this.lastGain;
  }

  private applyMiss(): void {
    this.combo = 0;
    this.lastGain = 0;
    this.lives -= 1;
    this.fx.miss();
    if (this.lives <= 0) {
      this.lives = 0;
      this.status = "over";
      this.grabbed = null;
      this.commitRecords();
      sfx.play("over");
    } else {
      sfx.play("bad");
    }
  }

  private commitRecords(): void {
    this.records.gamesPlayed += 1;
    this.beatBestCoins = this.coins > this.records.bestCoins;
    this.beatBestCombo = this.maxCombo > this.records.bestCombo;
    if (this.beatBestCoins) {
      this.records.bestCoins = this.coins;
    }
    if (this.beatBestCombo) {
      this.records.bestCombo = this.maxCombo;
    }
    saveRecords(this.records);
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

  private snapBeltItems(): void {
    const belt = this.layout.belt;
    const centerY = belt.y + belt.height / 2;
    for (const item of this.items) {
      item.size = this.layout.itemSize;
      if (item.state === ITEM_STATE.OnBelt) {
        item.y = centerY;
      }
      if (item.state === ITEM_STATE.Flying && item.fly) {
        const slot = this.layout.bins.find((entry) => entry.type === item.type);
        if (slot) {
          item.fly.toX = slot.x + slot.width / 2;
          item.fly.toY = slot.y + slot.height * 0.38;
        }
      }
    }
  }

  private moveBelt(dt: number): void {
    const belt = this.layout.belt;
    const centerY = belt.y + belt.height / 2;
    const endX = belt.x + belt.width + this.layout.itemSize;
    const speed = beltSpeed(this.levels);
    const kept: Item[] = [];

    for (const item of this.items) {
      if (item.state === ITEM_STATE.InHand || item.state === ITEM_STATE.Flying) {
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
      item.x += speed * dt;
      item.y = centerY;
      if (item.x >= endX) {
        this.setFeedback(null, "overflow");
        this.fx.float(belt.x + belt.width - 40, belt.y + belt.height / 2, "Уехал", COLORS.dropBad, 26, 1.1);
        this.applyMiss();
        continue;
      }
      kept.push(item);
    }

    this.items = kept;
  }

  private runAutoSort(dt: number): void {
    const interval = autoInterval(this.levels);
    if (interval <= 0) {
      return;
    }
    this.autoTimer += dt;
    if (this.autoTimer < interval) {
      return;
    }
    this.autoTimer = 0;
    const candidate = this.items.find((item) => item.state === ITEM_STATE.OnBelt);
    if (!candidate) {
      return;
    }
    const bin = this.bins.find((entry) => entry.type === candidate.type);
    if (!bin || bin.filled >= bin.capacity) {
      return;
    }
    this.beginAutoSort(candidate, bin);
  }

  private beginAutoSort(item: Item, bin: Bin): void {
    const slot = this.layout.bins.find((entry) => entry.type === bin.type);
    if (!slot) {
      return;
    }
    bin.filled += 1;
    item.state = ITEM_STATE.Flying;
    item.fly = {
      fromX: item.x,
      fromY: item.y,
      toX: slot.x + slot.width / 2,
      toY: slot.y + slot.height * 0.38,
      t: 0,
      duration: AUTO_SORT.flySeconds,
    };
  }

  private updateFlights(dt: number): void {
    const finished: Item[] = [];
    for (const item of this.items) {
      if (item.state !== ITEM_STATE.Flying || !item.fly) {
        continue;
      }
      item.fly.t += dt / item.fly.duration;
      const u = Math.min(1, item.fly.t);
      const ease = 1 - (1 - u) ** 3;
      const hop = Math.sin(ease * Math.PI) * AUTO_SORT.hop;
      item.x = item.fly.fromX + (item.fly.toX - item.fly.fromX) * ease;
      item.y = item.fly.fromY + (item.fly.toY - item.fly.fromY) * ease - hop;
      if (u >= 1) {
        finished.push(item);
      }
    }
    for (const item of finished) {
      this.finishAutoSort(item);
    }
  }

  private finishAutoSort(item: Item): void {
    const bin = this.bins.find((entry) => entry.type === item.type);
    item.fly = null;
    if (!bin || this.status !== "playing") {
      this.removeItem(item);
      return;
    }
    this.completeSort(item, bin, false);
  }

  private acceptItem(item: Item, bin: Bin): void {
    bin.filled += 1;
    this.completeSort(item, bin, true);
  }

  private completeSort(item: Item, bin: Bin, fromHand: boolean): void {
    const slot = this.layout.bins.find((entry) => entry.type === bin.type);
    item.state = ITEM_STATE.InBin;
    this.removeItem(item);
    if (this.status !== "playing") {
      return;
    }
    this.applyCorrect();
    this.setFeedback(bin.type, "correct");
    this.sortedCount += 1;
    const cx = slot ? slot.x + slot.width / 2 : item.x;
    const cy = slot ? slot.y + slot.height * 0.35 : item.y;
    this.fx.burst(cx, cy, COLORS.item[bin.type], fromHand ? 14 : 18);
    this.fx.float(cx, cy - 8, `+${this.lastGain}`, COLORS.gold);
    sfx.play("ok", this.combo);
    this.tryDump();
  }

  private tryDump(): void {
    if (this.items.some((item) => item.state === ITEM_STATE.Flying)) {
      return;
    }
    if (this.bins.length === 0 || this.bins.some((bin) => bin.filled < bin.capacity)) {
      return;
    }
    const types = this.bins.length;
    const bonus = ECONOMY.dumpBonus(types);
    this.coins += bonus;
    this.lastGain = bonus;
    for (const bin of this.bins) {
      bin.filled = 0;
    }
    const hud = this.layout.hud;
    this.fx.celebrateDump(
      bonus,
      types,
      this.layout.bins.map((slot) => ({
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
        color: COLORS.item[slot.type],
      })),
      hud.x + 28,
      hud.y + hud.height * 0.42,
    );
    this.fx.float(this.layout.width / 2, this.layout.belt.y + this.layout.belt.height + 8, `+${bonus}`, COLORS.gold, 36, 1.4);
    sfx.play("dump");
  }

  private canSpawn(): boolean {
    if (this.status !== "playing") {
      return false;
    }
    if (this.spawnTimer < spawnInterval(this.levels)) {
      return false;
    }
    const belt = this.layout.belt;
    const spawnX = belt.x - this.layout.itemSize * 0.35;
    const gap = minGap(this.levels);
    return this.items.every((item) => {
      if (item.state !== ITEM_STATE.OnBelt) {
        return true;
      }
      return item.x - spawnX >= gap;
    });
  }

  private spawnItem(): void {
    const types = activeTypes(this.levels);
    const type = types[Math.floor(Math.random() * types.length)] ?? "red";
    const belt = this.layout.belt;
    const size = this.layout.itemSize;
    const x = belt.x - size * 0.35;
    const y = belt.y + belt.height / 2;
    this.items.push(createItem(type, x, y, size));
  }
}
