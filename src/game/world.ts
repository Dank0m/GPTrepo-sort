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
import { loadSession, saveRecords, saveSession, type Records, type SessionSave } from "./save.ts";
import { advanceProgression, rankInfo, sanitizeProgression } from "./progression.ts";
import { conveyorPace, shiftDifficulty } from "./difficulty.ts";
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
  emptyLevels,
  sortReward,
  upgradeUnlocked,
  mergeLevels,
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
  groupGrab: { x: number; y: number; entries: { item: Item; dx: number; dy: number }[] } | null = null;
  hoverBinType: ItemType | null = null;
  hoverUpgrade: UpgradeId | null = null;
  groupMode = false;
  treeRequested = false;
  rescueCooldown = 0;
  pulseRemaining = 0;
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
  restoredSession = false;
  beatBestCoins = false;
  beatBestCombo = false;
  adsPlaying = false;
  dumpOffer: DumpOffer | null = null;
  private platformPausePending = false;
  private resumeAfterPlatform = false;
  private manualCombo = 0;
  private spawnTimer = 0;
  private autoTimer = 0;

  constructor(width: number, height: number, records: Records) {
    this.records = records;
    this.layout = computeLayout(width, height, activeTypes(this.levels));
    this.resetSession();
    const session = loadSession();
    if (session) this.restoreSession(session);
    this.paused = true;
  }

  get shift(): ReturnType<typeof shiftDifficulty> {
    return shiftDifficulty(this.sortedCount);
  }

  get pace(): ReturnType<typeof conveyorPace> {
    const pace = conveyorPace(this.sortedCount, this.levels, this.layout.belt.width, this.layout.itemSize);
    return { ...pace, speed: pace.speed * (this.pulseRemaining > 0 ? .75 : 1) };
  }

  restart(): void {
    if (document.hidden || yandexService.platformPaused) return;
    const kept = Math.min(ECONOMY.rebirthCap, Math.floor(this.coins * ECONOMY.rebirthKeep));
    if (this.status === "over") {
      this.persistRecords();
    }
    this.resetSession();
    this.restoredSession = false;
    this.coins += kept;
    if (kept > 0) {
      this.lastGain = kept;
      this.fx.float(
        this.layout.width / 2,
        this.layout.belt.y - 10,
        strings().kept(kept),
        COLORS.gold,
        28,
        1.3,
      );
    }
    this.persistRecords();
    yandexService.gameplayStart();
  }

  pause(): void {
    sfx.hush();
    yandexService.gameplayStop();
    if (this.paused || this.status !== "playing") return;
    this.paused = true;
    this.pointerCancel();
  }

  pauseForPlatform(): void {
    if (!this.platformPausePending) {
      this.resumeAfterPlatform = !this.paused && this.status === "playing";
      this.platformPausePending = true;
    }
    this.pause();
  }

  resumeFromPlatform(allowResume = true): void {
    if (!this.platformPausePending || this.adsPlaying || document.hidden || yandexService.platformPaused) return;
    this.platformPausePending = false;
    const shouldResume = this.resumeAfterPlatform;
    this.resumeAfterPlatform = false;
    if (shouldResume && allowResume) this.resume();
  }

  resume(): void {
    if (!this.paused || this.adsPlaying || document.hidden || yandexService.platformPaused) {
      return;
    }
    this.paused = false;
    sfx.unlock();
    if (this.isPlayable()) yandexService.gameplayStart();
  }

  togglePause(): void {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  resize(width: number, height: number): void {
    this.pointerCancel();
    this.layout = computeLayout(width, height, activeTypes(this.levels));
    this.snapBeltItems();
  }

  beginAd(): void {
    this.adsPlaying = true;
    this.pointerCancel();
  }

  endAd(): void {
    this.adsPlaying = false;
    this.resumeFromPlatform();
  }

  isPlayable(): boolean {
    return this.status === "playing" && !this.paused && !this.adsPlaying && !this.dumpOffer && !document.hidden && !yandexService.platformPaused;
  }

  gameOverUi(width: number, height: number): GameOverUi {
    return makeGameOverUi(width, height, {
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
    if (this.status !== "playing") return;
    this.updateFlights(dt);
    if (this.dumpOffer) {
      this.dumpOffer.remaining -= dt;
      if (this.dumpOffer.remaining <= 0) {
        this.closeDumpOffer();
      }
      return;
    }
    if (this.status !== "playing") {
      return;
    }
    this.rescueCooldown = Math.max(0, this.rescueCooldown - dt);
    this.pulseRemaining = Math.max(0, this.pulseRemaining - dt);
    this.moveBelt(dt);
    this.runAutoSort(dt);
    this.spawnTimer += dt;
    if (this.canSpawn()) {
      this.spawnItem();
      this.spawnTimer = 0;
    }
  }

  pointerDown(x: number, y: number, button = 0): boolean {
    if (button === 2) return this.grabGroup(x, y);
    if (button !== 0 || this.groupGrab) return false;
    if (this.adsPlaying || document.hidden || yandexService.platformPaused) {
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
      void yandexService.requestFullscreen();
      this.restart();
      return false;
    }
    if (this.paused) {
      this.resume();
      return false;
    }
    if (this.dumpOffer) {
      const ui = this.dumpOfferUi(this.layout.width, this.layout.height);
      if (hitRect(x, y, ui?.doubleBtn)) {
        void this.watchDumpDouble();
        return false;
      }
      if (hitRect(x, y, ui?.dismissBtn)) {
        this.closeDumpOffer();
        return false;
      }
      return false;
    }
    sfx.unlock();
    if (pointInRect(x, y, this.layout.tree)) return false;
    if (pointInRect(x, y, this.layout.groupButton)) {
      if (this.levels.wide) this.groupMode = !this.groupMode;
      else this.treeRequested = true;
      return false;
    }
    if (this.groupMode) return this.grabGroup(x, y);
    const clickedBin = hitBin(this.layout.bins, x, y);
    const full = this.bins.find(bin => bin.type === clickedBin?.type);
    if (this.levels.unload && full && full.filled === full.capacity) {
      full.filled = 0;
      this.grantBonus(8);
      this.persistRecords();
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
    if (this.groupGrab && this.isPlayable()) {
      this.groupGrab.x = x;
      this.groupGrab.y = y - INPUT.dragLift;
      for (const entry of this.groupGrab.entries) {
        entry.item.x = x + entry.dx;
        entry.item.y = y - INPUT.dragLift + entry.dy;
      }
      this.hoverBinType = hitBin(this.layout.bins, x, y - INPUT.dragLift)?.type ?? null;
      return;
    }
    if (!this.grabbed || this.status !== "playing" || this.paused || this.dumpOffer || this.adsPlaying) {
      return;
    }
    this.placeGrabbed(this.grabbed, x, y);
    this.hoverBinType = hitBin(this.layout.bins, this.grabbed.x, this.grabbed.y)?.type ?? null;
  }

  pointerUp(x: number, y: number): void {
    if (this.groupGrab) {
      this.pointerMove(x, y);
      const group = this.groupGrab;
      this.groupGrab = null;
      this.grabbed = null;
      this.hoverBinType = null;
      const slot = this.dropTarget(x, y - INPUT.dragLift, group.entries[0]?.item.type);
      const bin = this.bins.find(b => b.type === slot?.type);
      let room = bin ? bin.capacity - bin.filled : 0;
      const returned: Item[] = [];
      for (const { item } of group.entries) {
        if (this.isPlayable() && bin && item.type === bin.type && room > 0) {
          room--;
          this.acceptItem(item, bin);
        } else returned.push(item);
      }
      this.returnGroup(returned);
      return;
    }
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

    const slot = this.dropTarget(held.x, held.y, held.type);
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

  private grabGroup(x: number, y: number): boolean {
    if (!this.isPlayable() || this.grabbed || !pointInRect(x, y, this.layout.belt)) return false;
    if (!this.levels.wide) { this.treeRequested = true; return false; }
    const entries = this.items
      .filter(item => item.state === ITEM_STATE.OnBelt && Math.abs(item.x - x) <= this.groupRadius + item.size / 2)
      .map(item => ({ item, dx: item.x - x, dy: item.y - y }));
    if (!entries.length) return false;
    sfx.unlock();
    this.groupGrab = { x, y: y - INPUT.dragLift, entries };
    this.grabbed = entries[0].item;
    for (const { item } of entries) item.state = ITEM_STATE.InHand;
    this.pointerMove(x, y);
    return true;
  }

  private returnGroup(items: Item[]): void {
    if (!items.length) return;
    const belt = this.layout.belt;
    const left = Math.min(...items.map(item => item.x - this.layout.itemSize / 2));
    const right = Math.max(...items.map(item => item.x + this.layout.itemSize / 2));
    const shift = Math.max(belt.x - left, Math.min(0, belt.x + belt.width - right));
    for (const item of items) {
      item.x += shift;
      this.returnToBelt(item);
    }
  }

  pointerCancel(): void {
    if (this.groupGrab) {
      this.returnGroup(this.groupGrab.entries.map(entry => entry.item));
      this.groupGrab = null;
      this.grabbed = null;
      this.hoverBinType = null;
      return;
    }
    if (!this.grabbed) {
      return;
    }
    this.returnToBelt(this.grabbed);
    this.grabbed = null;
    this.hoverBinType = null;
  }

  tryBuy(id: UpgradeId): boolean {
    if (this.adsPlaying) return false;
    const cost = nextUpgradeCost(id, this.levels[id]);
    if (cost === null || this.coins < cost || !upgradeUnlocked(id, this.levels)) {
      this.shopPulse = { id, kind: "reject", until: this.elapsed + 0.35 };
      sfx.play("reject");
      return false;
    }
    this.coins -= cost;
    this.pointerCancel();
    this.levels[id] += 1;
    this.records.tree = { ...this.levels };
    this.shopPulse = { id, kind: "buy", until: this.elapsed + 0.35 };
    this.syncBins();
    this.layout = computeLayout(this.layout.width, this.layout.height, activeTypes(this.levels));
    this.snapBeltItems();
    sfx.play("buy");
    this.persistRecords();
    return true;
  }

  get groupRadius(): number { return this.levels.wide > 1 ? 150 : INPUT.groupRadius; }

  private dropTarget(x: number, y: number, type?: ItemType) {
    const direct = hitBin(this.layout.bins, x, y);
    if (direct || !this.levels.magnet || !type) return direct;
    return this.layout.bins.find(bin => bin.type === type &&
      Math.hypot(Math.max(bin.x - x, 0, x - bin.x - bin.width), Math.max(bin.y - y, 0, y - bin.y - bin.height)) <= 50);
  }

  private placeGrabbed(item: Item, x: number, y: number): void {
    item.x = x;
    item.y = y - INPUT.dragLift;
  }

  private resetSession(): void {
    this.levels = { ...this.records.tree };
    this.items = [];
    this.bins = [];
    this.syncBins();
    this.layout = computeLayout(this.layout.width, this.layout.height, activeTypes(this.levels));
    this.grabbed = null;
    this.groupGrab = null;
    this.hoverBinType = null;
    this.hoverUpgrade = null;
    this.groupMode = false;
    this.treeRequested = false;
    this.rescueCooldown = 0;
    this.pulseRemaining = 0;
    this.feedback = null;
    this.lastDrop = "none";
    this.records.progression = sanitizeProgression(this.records.progression);
    this.coins = rankInfo(this.records.progression.xp).startingCoins;
    this.combo = 0;
    this.manualCombo = 0;
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
    this.platformPausePending = false;
    this.resumeAfterPlatform = false;
    this.adsPlaying = false;
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

  private applyCorrect(manual: boolean): void {
    if (manual) this.combo += 1;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.lastGain = sortReward(this.levels, this.combo, manual);
    this.coins += this.lastGain;
  }

  private applyMiss(): void {
    this.combo = 0;
    this.manualCombo = 0;
    this.lastGain = 0;
    this.lives -= 1;
    this.fx.miss();
    if (this.lives <= 0) {
      this.lives = 0;
      this.pointerCancel();
      this.status = "over";
      this.grabbed = null;
      this.dumpOffer = null;
      this.records.gamesPlayed += 1;
      this.commitRecords();
      yandexService.gameplayStop();
      sfx.play("over");
    } else {
      sfx.play("bad");
      this.persistRecords();
    }
  }

  private commitRecords(): void {
    this.persistRecords();
  }

  private persistRecords(): void {
    if (this.coins > this.records.bestCoins) {
      this.records.bestCoins = this.coins;
      this.beatBestCoins = true;
    }
    if (this.maxCombo > this.records.bestCombo) {
      this.records.bestCombo = this.maxCombo;
      this.beatBestCombo = true;
    }
    saveRecords(this.records);
    saveSession({
      version: 2,
      rescueCooldown: this.rescueCooldown,
      pulseRemaining: this.pulseRemaining,
      coins: this.coins,
      combo: this.combo,
      maxCombo: this.maxCombo,
      manualCombo: this.manualCombo,
      lives: this.lives,
      status: this.status,
      sortedCount: this.sortedCount,
      levels: { ...this.levels },
      bins: Object.fromEntries(this.bins.map((bin) => [bin.type, Math.max(0, bin.filled -
        this.items.filter((item) => item.type === bin.type && item.state === ITEM_STATE.Flying).length)])),
      beatBestCoins: this.beatBestCoins,
      beatBestCombo: this.beatBestCombo,
    });
    void yandexService.saveGame(this.records);
  }

  private restoreSession(session: SessionSave): void {
    this.coins = session.coins;
    this.combo = session.combo;
    this.maxCombo = session.maxCombo;
    this.manualCombo = session.manualCombo;
    this.lives = session.lives;
    this.status = session.status;
    this.sortedCount = session.sortedCount;
    this.levels = mergeLevels(session.levels, this.records.tree);
    this.records.tree = { ...this.levels };
    this.rescueCooldown = session.rescueCooldown;
    this.pulseRemaining = session.pulseRemaining;
    this.beatBestCoins = session.beatBestCoins;
    this.beatBestCombo = session.beatBestCombo;
    this.syncBins();
    for (const bin of this.bins) bin.filled = session.bins[bin.type] ?? 0;
    this.resize(this.layout.width, this.layout.height);
    this.restoredSession = true;
  }

  private grantBonus(amount: number): void {
    this.coins += amount;
    this.lastGain = amount;
    this.fx.float(this.layout.width / 2, this.layout.belt.y - 8, `+${amount}`, COLORS.gold, 32, 1.2);
    sfx.play("buy");
  }

  private closeDumpOffer(): void {
    this.dumpOffer = null;
    if (this.isPlayable()) yandexService.gameplayStart();
  }

  private async watchDumpDouble(): Promise<void> {
    const bonus = this.dumpOffer?.bonus ?? 0;
    if (!this.dumpOffer || bonus <= 0) {
      return;
    }
    this.dumpOffer = null;
    const result = await adService.show("dumpDouble", this);
    if (this.isPlayable()) yandexService.gameplayStart();
    if (result === "rewarded") {
      this.grantBonus(bonus);
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
    const speed = this.pace.speed;
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
      item.x += speed * dt;
      if (item.x >= endX) {
        if (this.levels.recycle && this.rescueCooldown <= 0) {
          this.rescueCooldown = 25;
          item.x = belt.x + item.size / 2;
          kept.push(item);
          this.fx.float(item.x, belt.y, strings().rescued, COLORS.dropOk, 18);
          this.persistRecords();
          continue;
        }
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
    for (let i = 0; i < (this.levels.batch ? 2 : 1); i++) {
      const candidate = this.rightmostSortable();
      if (!candidate) break;
      const bin = this.bins.find(entry => entry.type === candidate.type);
      if (bin) this.beginAutoSort(candidate, bin);
    }
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
    this.applyCorrect(fromHand);
    this.setFeedback(bin.type, "correct");
    const previousStage = this.shift.stage;
    this.sortedCount += 1;
    if (this.shift.stage > previousStage) {
      this.fx.float(this.layout.width / 2, this.layout.belt.y + 20, strings().shift(this.shift.stage), COLORS.gold, 22, 1.7);
    }
    const cx = slot ? slot.x + slot.width / 2 : item.x;
    const cy = slot ? slot.y + slot.height * 0.35 : item.y;
    this.fx.burst(cx, cy, COLORS.item[bin.type], fromHand ? 14 : 18);
    this.fx.float(cx, cy - 8, `+${this.lastGain}`, COLORS.gold);
    sfx.play("ok", this.combo);
    if (fromHand) this.manualCombo += 1;
    this.advanceMastery({ kind: "sort", combo: this.manualCombo, manual: fromHand });
    this.tryDump();
    this.persistRecords();
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
    if (this.levels.pulse) this.pulseRemaining = 6;
    for (const bin of this.bins) {
      bin.filled = 0;
    }
    this.advanceMastery({ kind: "set" });
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
      yandexService.gameplayStop();
    }
    this.persistRecords();
  }

  private advanceMastery(event: Parameters<typeof advanceProgression>[1]): void {
    const reward = advanceProgression(this.records.progression, event);
    if (reward.coins > 0) this.grantBonus(reward.coins);
    if (reward.completed.length > 0 || reward.rankUp) {
      this.fx.float(this.layout.width / 2, this.layout.belt.y - 12,
        reward.rankUp ? strings().rankUp : strings().missionDone,
        COLORS.gold, 22, 2);
    }
  }

  private canSpawn(): boolean {
    if (this.status !== "playing") {
      return false;
    }
    if (this.spawnTimer < this.pace.interval) {
      return false;
    }
    const belt = this.layout.belt;
    const spawnX = belt.x - this.layout.itemSize * 0.35;
    const gap = this.pace.gap;
    return this.items.every((item) => {
      if (item.state !== ITEM_STATE.OnBelt) {
        return true;
      }
      return item.x - spawnX >= gap;
    });
  }

  private spawnItem(): void {
    const types = activeTypes(this.levels);
    // Avoid an unwinnable belt full of shapes whose bins are already full.
    const available = types.filter((type) => {
      const bin = this.bins.find((entry) => entry.type === type);
      const waiting = this.items.filter(item => item.type === type &&
        (item.state === ITEM_STATE.OnBelt || item.state === ITEM_STATE.InHand)).length;
      // Flying items already reserve a slot in bin.filled.
      return bin && bin.filled + waiting < bin.capacity;
    });
    if (!available.length) return;
    const type = available[Math.floor(Math.random() * available.length)] ?? "red";
    const belt = this.layout.belt;
    const size = this.layout.itemSize;
    const x = belt.x - size * 0.35;
    const y = belt.y + belt.height / 2;
    this.items.push(createItem(type, x, y, size));
  }
}
