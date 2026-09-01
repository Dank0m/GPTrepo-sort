import {
  ADS,
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
import { type Records } from "./save.ts";
import { createBin, type Bin } from "./bin.ts";
import { Fx } from "./fx.ts";
import { hitBin, hitItem, pointInRect } from "./hit.ts";
import { createItem, type Item } from "./item.ts";
import { dumpOfferUi as makeDumpOfferUi, gameOverUi as makeGameOverUi, hitRect, type DumpOfferUi, type GameOverUi } from "./adLayout.ts";
import { computeLayout, type PlayfieldLayout } from "./layout.ts";
import { strings, toggleLocale } from "../i18n/locale.ts";
import { adService, type AdHost } from "../services/AdService.ts";
import { yandexService } from "../services/YandexService.ts";
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

export type DumpOffer = {
  bonus: number;
  remaining: number;
};

export class World implements AdHost {
  items: Item[] = [];
  bins: Bin[] = [];
  layout: PlayfieldLayout;
  elapsed = 0;
  grabbed: Item | null = null;
  hoverBinType: ItemType | null = null;
  hoverUpgrade: UpgradeId | null = null;
  hoverFreeCoins = false;
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
  records: Records;
  beatBestCoins = false;
  beatBestCombo = false;
  adsPlaying = false;
  continueUsedThisSession = false;
  dumpOffer: DumpOffer | null = null;
  private spawnTimer = 0;
  private autoTimer = 0;
  private continueHold = 0;
  private continueHoldAt = 0;

  constructor(width: number, height: number, records: Records) {
    this.records = records;
    this.layout = computeLayout(width, height, activeTypes(this.levels), {
      freeCoins: adService.available,
    });
    this.resetSession();
  }

  restart(): void {
    if (this.status === "over") {
      this.records.gamesPlayed += 1;
      this.persistRecords();
    }
    this.resetSession();
    yandexService.gameplayStart();
  }

  pause(): void {
    if (this.adsPlaying || this.dumpOffer || this.paused || this.status !== "playing") {
      return;
    }
    this.paused = true;
    if (this.grabbed) {
      this.returnToBelt(this.grabbed);
      this.grabbed = null;
      this.hoverBinType = null;
    }
    sfx.hush();
    yandexService.gameplayStop();
  }

  resume(): void {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    sfx.unlock();
    if (this.status === "playing" && !this.adsPlaying) {
      yandexService.gameplayStart();
    }
  }

  togglePause(): void {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  resize(width: number, height: number): void {
    this.layout = computeLayout(width, height, activeTypes(this.levels), {
      freeCoins: adService.available,
    });
    this.snapBeltItems();
  }

  beginAd(): void {
    this.adsPlaying = true;
    if (this.grabbed) {
      this.returnToBelt(this.grabbed);
      this.grabbed = null;
      this.hoverBinType = null;
    }
  }

  endAd(): void {
    this.adsPlaying = false;
  }

  isPlayable(): boolean {
    return this.status === "playing" && !this.paused && !this.adsPlaying;
  }

  showContinue(): boolean {
    return this.status === "over" && !this.continueUsedThisSession && adService.canShow("continue");
  }

  showFreeCoins(): boolean {
    return adService.available;
  }

  /** Seconds left in the Continue breathing room. Belt does not move. */
  continueGraceLeft(): number {
    return Math.max(0, this.continueHold);
  }

  get beltFrozen(): boolean {
    return this.continueGraceLeft() > 0;
  }

  freeCoinsReady(): boolean {
    return (
      this.status === "playing" &&
      !this.paused &&
      !this.dumpOffer &&
      !this.adsPlaying &&
      adService.canShow("freeCoins")
    );
  }

  freeCoinsCooldown(): number {
    return adService.cooldownLeft();
  }

  gameOverUi(width: number, height: number): GameOverUi {
    return makeGameOverUi(width, height, {
      continue: this.showContinue(),
      record: this.beatBestCoins || this.beatBestCombo,
    });
  }

  dumpOfferUi(width: number, height: number): DumpOfferUi | null {
    if (!this.dumpOffer || this.adsPlaying) {
      return null;
    }
    return makeDumpOfferUi(width, height);
  }

  update(dt: number): void {
    if (this.adsPlaying) {
      return;
    }
    this.elapsed += dt;
    this.fx.update(dt);
    if (this.feedback && this.elapsed >= this.feedback.until) {
      this.feedback = null;
    }
    if (this.shopPulse && this.elapsed >= this.shopPulse.until) {
      this.shopPulse = null;
    }
    if (this.paused) {
      return;
    }
    if (this.continueHold > 0) {
      const now = performance.now();
      const step = (now - this.continueHoldAt) / 1000;
      this.continueHoldAt = now;
      if (step > 0 && step <= ADS.continueHoldMaxStep) {
        this.continueHold = Math.max(0, this.continueHold - step);
      }
      this.rescueBeltAfterContinue();
      return;
    }
    this.updateFlights(dt);
    if (this.dumpOffer) {
      this.dumpOffer.remaining -= dt;
      if (this.dumpOffer.remaining <= 0) {
        this.dumpOffer = null;
      }
      return;
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
    if (this.adsPlaying) {
      return false;
    }
    if (pointInRect(x, y, this.layout.mute)) {
      sfx.toggle();
      if (!this.paused && !sfx.muted && this.status === "playing") {
        sfx.unlock();
      }
      return false;
    }
    if (pointInRect(x, y, this.layout.lang)) {
      toggleLocale();
      return false;
    }
    if (pointInRect(x, y, this.layout.pause) && this.status === "playing" && !this.dumpOffer) {
      this.togglePause();
      return false;
    }
    if (this.status === "over") {
      const ui = this.gameOverUi(this.layout.width, this.layout.height);
      if (hitRect(x, y, ui.continueBtn)) {
        void this.watchContinue();
        return false;
      }
      if (this.showContinue() && !hitRect(x, y, ui.restartBtn)) {
        return false;
      }
      this.restart();
      return false;
    }
    if (this.dumpOffer) {
      const ui = this.dumpOfferUi(this.layout.width, this.layout.height);
      if (hitRect(x, y, ui?.doubleBtn)) {
        void this.watchDumpDouble();
        return false;
      }
      if (hitRect(x, y, ui?.dismissBtn)) {
        this.dumpOffer = null;
        return false;
      }
      return false;
    }
    if (this.paused) {
      this.resume();
      return false;
    }
    sfx.unlock();
    if (this.layout.freeCoins && pointInRect(x, y, this.layout.freeCoins)) {
      if (this.freeCoinsReady()) {
        void this.watchFreeCoins();
      } else {
        sfx.play("reject");
      }
      return false;
    }
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
    this.hoverFreeCoins = Boolean(this.layout.freeCoins && pointInRect(x, y, this.layout.freeCoins));
    if (!this.grabbed || this.status !== "playing" || this.paused || this.dumpOffer || this.adsPlaying) {
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
      if (this.beltFrozen) {
        this.returnToBelt(held);
        return;
      }
      this.setFeedback(slot.type, "wrong");
      this.fx.burst(held.x, held.y, COLORS.dropBad, 10);
      this.fx.float(slot.x + slot.width / 2, slot.y + slot.height * 0.35, strings().miss, COLORS.dropBad, 28, 1.1);
      this.removeItem(held);
      this.applyMiss();
      return;
    }

    if (bin.filled >= bin.capacity) {
      this.setFeedback(slot.type, "full");
      this.fx.float(slot.x + slot.width / 2, slot.y, strings().binFull, COLORS.gold);
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
    this.layout = computeLayout(this.layout.width, this.layout.height, activeTypes(this.levels), {
      freeCoins: adService.available,
    });
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
    this.layout = computeLayout(this.layout.width, this.layout.height, activeTypes(this.levels), {
      freeCoins: adService.available,
    });
    this.grabbed = null;
    this.hoverBinType = null;
    this.hoverUpgrade = null;
    this.hoverFreeCoins = false;
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
    this.adsPlaying = false;
    this.continueUsedThisSession = false;
    this.continueHold = 0;
    this.continueHoldAt = 0;
    this.dumpOffer = null;
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
    if (this.beltFrozen) {
      this.combo = 0;
      this.lastGain = 0;
      return;
    }
    this.combo = 0;
    this.lastGain = 0;
    this.lives -= 1;
    this.fx.miss();
    if (this.lives <= 0) {
      this.lives = 0;
      this.status = "over";
      this.grabbed = null;
      this.dumpOffer = null;
      this.commitRecords();
      yandexService.gameplayStop();
      sfx.play("over");
    } else {
      sfx.play("bad");
    }
  }

  private commitRecords(): void {
    this.beatBestCoins = this.coins > this.records.bestCoins;
    this.beatBestCombo = this.maxCombo > this.records.bestCombo;
    if (this.beatBestCoins) {
      this.records.bestCoins = this.coins;
    }
    if (this.beatBestCombo) {
      this.records.bestCombo = this.maxCombo;
    }
    this.persistRecords();
  }

  private persistRecords(): void {
    void yandexService.saveGame(this.records);
  }

  private grantBonus(amount: number): void {
    this.coins += amount;
    this.lastGain = amount;
    this.fx.float(this.layout.width / 2, this.layout.belt.y - 8, `+${amount}`, COLORS.gold, 32, 1.2);
    sfx.play("buy");
  }

  private continueWithLife(): void {
    this.lives = 1;
    this.status = "playing";
    this.continueUsedThisSession = true;
    this.paused = false;
    this.adsPlaying = false;
    this.continueHold = ADS.continueHoldSeconds;
    this.continueHoldAt = performance.now();
    this.rescueBeltAfterContinue();
    this.fx.float(this.layout.width / 2, this.layout.belt.y - 10, strings().plusLife, COLORS.heart, 28, 1.2);
    sfx.unlock();
    yandexService.gameplayStart();
  }

  /** Pack items from the spawn side and leave the exit empty. */
  private rescueBeltAfterContinue(): void {
    const belt = this.layout.belt;
    const half = this.layout.itemSize * 0.5;
    const gap = minGap(this.levels);
    const spawnX = belt.x + half;
    const safeEnd = belt.x + belt.width * 0.4;
    const onBelt = this.items
      .filter((item) => item.state === ITEM_STATE.OnBelt)
      .sort((a, b) => a.x - b.x);
    let cursor = spawnX;
    for (const item of onBelt) {
      if (cursor <= safeEnd) {
        item.x = cursor;
        cursor += gap;
      } else {
        item.x = spawnX;
      }
      item.y = belt.y + belt.height / 2;
    }
  }

  private async watchContinue(): Promise<void> {
    if (!this.showContinue()) {
      return;
    }
    const result = await adService.show("continue", this);
    if (result === "rewarded") {
      this.continueWithLife();
      this.persistRecords();
    }
  }

  private async watchDumpDouble(): Promise<void> {
    const bonus = this.dumpOffer?.bonus ?? 0;
    if (!this.dumpOffer || bonus <= 0) {
      return;
    }
    this.dumpOffer = null;
    const result = await adService.show("dumpDouble", this);
    if (result === "rewarded") {
      this.grantBonus(bonus);
      this.persistRecords();
    }
  }

  private async watchFreeCoins(): Promise<void> {
    if (!this.freeCoinsReady()) {
      return;
    }
    const result = await adService.show("freeCoins", this);
    if (result === "rewarded") {
      this.grantBonus(ADS.freeCoins);
      this.persistRecords();
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
      item.y = centerY;
      if (this.beltFrozen) {
        kept.push(item);
        continue;
      }
      item.x += speed * dt;
      if (item.x >= endX) {
        this.setFeedback(null, "overflow");
        this.fx.float(belt.x + belt.width - 40, belt.y + belt.height / 2, strings().overflow, COLORS.dropBad, 26, 1.1);
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
    const candidate = this.rightmostSortable();
    if (!candidate) {
      return;
    }
    const bin = this.bins.find((entry) => entry.type === candidate.type);
    if (!bin || bin.filled >= bin.capacity) {
      return;
    }
    this.beginAutoSort(candidate, bin);
  }

  /** Closest to the belt exit (right). Ignores grab/fly; uses live X after the player moves items. */
  private rightmostSortable(): Item | null {
    let best: Item | null = null;
    for (const item of this.items) {
      if (item.state !== ITEM_STATE.OnBelt) {
        continue;
      }
      const bin = this.bins.find((entry) => entry.type === item.type);
      if (!bin || bin.filled >= bin.capacity) {
        continue;
      }
      if (!best || item.x > best.x) {
        best = item;
      }
    }
    return best;
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
    if (adService.available) {
      this.dumpOffer = { bonus, remaining: ADS.dumpOfferSeconds };
    }
  }

  private canSpawn(): boolean {
    if (this.status !== "playing" || this.beltFrozen) {
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
