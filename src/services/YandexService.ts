import { loadRecords, saveRecords, type Records } from "../game/save.ts";
import { sanitizeProgression, mergeProgression } from "../game/progression.ts";

export type GameSave = Records;

type RewardedCallbacks = {
  onOpen?: () => void;
  onRewarded?: () => void;
  onClose?: (wasShown: boolean) => void;
  onError?: (error: unknown) => void;
};

type FullscreenCallbacks = {
  onClose?: (wasShown: boolean) => void;
  onError?: (error: unknown) => void;
};

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type YaPlayer = {
  isAuthorized?: boolean;
  setData: (data: Record<string, unknown>, flush?: boolean) => Promise<unknown>;
  getData: (keys?: string[]) => Promise<Record<string, unknown>>;
};

type Ysdk = {
  adv: {
    showRewardedVideo: (opts: { callbacks: RewardedCallbacks }) => void;
    showFullscreenAdv: (opts: { callbacks: FullscreenCallbacks }) => void;
  };
  features?: {
    LoadingAPI?: { ready: () => void };
    GameplayAPI?: { start: () => void; stop: () => void };
  };
  environment?: { i18n?: { lang?: string } };
  deviceInfo?: { type?: "desktop" | "mobile" | "tablet" | "tv"; isMobile?: () => boolean; isTablet?: () => boolean };
  screen?: { fullscreen?: { status?: string; request: () => Promise<void> } };
  on?: (event: "game_api_pause" | "game_api_resume", callback: () => void) => void;
  getPlayer: (opts?: { scopes?: boolean }) => Promise<YaPlayer>;
  getStorage?: () => Promise<StorageLike>;
};

type YaGamesNamespace = {
  init: () => Promise<Ysdk>;
};

const SAVE_KEY = "sortup-records";
const SCRIPT_WAIT_MS = 8000;
const CLOUD_SAVE_INTERVAL_MS = 5000;

function yaGames(): YaGamesNamespace | undefined {
  return (window as Window & { YaGames?: YaGamesNamespace }).YaGames;
}

function safeCounter(raw: unknown): number {
  return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(raw))) : 0;
}

function asRecords(raw: unknown): Records | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw as Partial<Records>;
  const bestCoins = safeCounter(data.bestCoins);
  const bestCombo = safeCounter(data.bestCombo);
  const gamesPlayed = safeCounter(data.gamesPlayed);
  if (bestCoins === 0 && bestCombo === 0 && gamesPlayed === 0 && !("bestCoins" in data)) {
    return null;
  }
  return { bestCoins, bestCombo, gamesPlayed, progression: sanitizeProgression(data.progression) };
}

function mergeRecords(a: Records, b: Records): Records {
  return {
    bestCoins: Math.max(a.bestCoins, b.bestCoins),
    bestCombo: Math.max(a.bestCombo, b.bestCombo),
    gamesPlayed: Math.max(a.gamesPlayed, b.gamesPlayed),
    progression: mergeProgression(a.progression, b.progression),
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForYaGames(ms: number): Promise<YaGamesNamespace | undefined> {
  const started = Date.now();
  let sdk = yaGames();
  while (!sdk && Date.now() - started < ms) {
    await wait(50);
    sdk = yaGames();
  }
  return sdk;
}

function loadScript(src: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      void waitForYaGames(timeoutMs).then(() => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    const timer = window.setTimeout(() => resolve(), timeoutMs);
    script.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      script.remove();
      resolve();
    };
    document.head.appendChild(script);
  });
}

export class YandexService {
  available = false;
  platformPaused = false;
  private ysdk: Ysdk | null = null;
  private gameplayOn = false;
  private markedReady = false;
  private cloud: "player" | "storage" | "local" = "local";
  private storage: StorageLike | null = null;
  private player: YaPlayer | null = null;
  private readonly pauseHandlers = new Set<() => void>();
  private readonly resumeHandlers = new Set<() => void>();
  private pendingSave: GameSave | null = null;
  private saveTimer: number | null = null;
  private saving = false;
  private lastCloudSave = 0;
  private fullscreenPending = false;

  onPlatformPause(handler: () => void): () => void {
    this.pauseHandlers.add(handler);
    return () => { this.pauseHandlers.delete(handler); };
  }

  onPlatformResume(handler: () => void): () => void {
    this.resumeHandlers.add(handler);
    return () => { this.resumeHandlers.delete(handler); };
  }

  async init(): Promise<void> {
    let api = yaGames();
    if (!api) {
      await loadScript("/sdk.js", SCRIPT_WAIT_MS);
      api = yaGames();
    }
    if (!api) {
      this.available = false;
      this.cloud = "local";
      return;
    }
    try {
      this.ysdk = await api.init();
      this.available = true;
      this.ysdk.on?.("game_api_pause", () => {
        this.platformPaused = true;
        this.gameplayStop();
        for (const handler of this.pauseHandlers) handler();
      });
      this.ysdk.on?.("game_api_resume", () => {
        this.platformPaused = false;
        for (const handler of this.resumeHandlers) handler();
      });
      await this.bindCloud();
      window.addEventListener("pagehide", () => { void this.flushSave(); });
    } catch {
      this.ysdk = null;
      this.available = false;
      this.cloud = "local";
    }
  }

  ready(): void {
    if (!this.ysdk || this.markedReady) {
      return;
    }
    this.markedReady = true;
    this.ysdk.features?.LoadingAPI?.ready();
  }

  gameplayStart(): void {
    if (!this.ysdk || this.gameplayOn || document.hidden || this.platformPaused) {
      return;
    }
    this.ysdk.features?.GameplayAPI?.start();
    this.gameplayOn = true;
  }

  gameplayStop(): void {
    if (!this.ysdk || !this.gameplayOn) {
      return;
    }
    this.ysdk.features?.GameplayAPI?.stop();
    this.gameplayOn = false;
  }

  /** Call directly from Start/Continue or a fullscreen button, never from boot. */
  async requestFullscreen(): Promise<void> {
    const device = this.ysdk?.deviceInfo;
    const mobile = device?.type
      ? device.type === "mobile" || device.type === "tablet"
      : Boolean(device?.isMobile?.() || device?.isTablet?.() ||
        (navigator.maxTouchPoints > 0 && window.matchMedia("(pointer: coarse)").matches));
    const doc = document as Document & { webkitFullscreenElement?: Element };
    if (!mobile || document.hidden || this.fullscreenPending || document.fullscreenElement ||
      doc.webkitFullscreenElement || this.ysdk?.screen?.fullscreen?.status === "on" ||
      navigator.userActivation?.isActive === false) return;

    this.fullscreenPending = true;
    try {
      const sdkFullscreen = this.ysdk?.screen?.fullscreen;
      if (sdkFullscreen?.request) {
        try {
          await sdkFullscreen.request();
          return;
        } catch {
          // A denied/unsupported platform request may still have a native fallback.
        }
      }
      const element = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void | Promise<void> };
      if (element.requestFullscreen) {
        await element.requestFullscreen({ navigationUI: "hide" });
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      }
    } catch {
      // Permission, iframe policy or browser support must never block play.
    } finally {
      this.fullscreenPending = false;
    }
  }

  async showRewardedAd(): Promise<{ rewarded: boolean }> {
    if (!this.ysdk) {
      return { rewarded: false };
    }
    return new Promise((resolve) => {
      let settled = false;
      let rewarded = false;
      const finish = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve({ rewarded });
      };
      try {
        this.ysdk!.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => {
              if (!settled) rewarded = true;
            },
            onClose: () => finish(),
            onError: () => finish(),
          },
        });
      } catch {
        finish();
      }
    });
  }

  async showInterstitial(): Promise<void> {
    if (!this.ysdk) {
      return;
    }
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };
      try {
        this.ysdk!.adv.showFullscreenAdv({
          callbacks: {
            onClose: () => finish(),
            onError: () => finish(),
          },
        });
      } catch {
        finish();
      }
    });
  }

  async saveGame(data: GameSave): Promise<void> {
    // Local progress is durable immediately; only remote writes are coalesced.
    saveRecords(data);
    if (!this.ysdk) return;
    this.pendingSave = JSON.parse(JSON.stringify(data)) as GameSave;
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null || this.saving || !this.pendingSave) return;
    const delay = Math.max(250, CLOUD_SAVE_INTERVAL_MS - (Date.now() - this.lastCloudSave));
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.flushSave();
    }, delay);
  }

  private async flushSave(): Promise<void> {
    if (this.saving || !this.pendingSave || !this.ysdk) return;
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const data = this.pendingSave;
    this.pendingSave = null;
    this.saving = true;
    this.lastCloudSave = Date.now();
    try {
      if (this.cloud === "player" && this.player) {
        await this.player.setData({ ...data });
      } else if (this.cloud === "storage") {
        const storage = this.storage ?? (await this.ysdk.getStorage?.());
        if (storage) {
          this.storage = storage;
          storage.setItem(SAVE_KEY, JSON.stringify(data));
        }
      }
    } catch {
      // The local copy remains available. Retry the latest state, never a stale write.
      this.pendingSave ??= data;
    } finally {
      this.saving = false;
      this.scheduleSave();
    }
  }

  async loadGame(): Promise<GameSave> {
    const local = loadRecords();
    if (!this.ysdk) {
      return local;
    }
    try {
      if (this.cloud === "player" && this.player) {
        const raw = await this.player.getData(["bestCoins", "bestCombo", "gamesPlayed", "progression"]);
        const cloud = asRecords(raw);
        if (!cloud) {
          return local;
        }
        const merged = mergeRecords(local, cloud);
        saveRecords(merged);
        if (JSON.stringify(merged) !== JSON.stringify(cloud)) {
          await this.saveGame(merged);
        }
        return merged;
      }
      if (this.cloud === "storage") {
        const storage = this.storage ?? (await this.ysdk.getStorage?.());
        if (!storage) {
          return local;
        }
        this.storage = storage;
        const cloud = asRecords(JSON.parse(storage.getItem(SAVE_KEY) || "null"));
        if (!cloud) {
          return local;
        }
        const merged = mergeRecords(local, cloud);
        saveRecords(merged);
        return merged;
      }
    } catch {
      return local;
    }
    return local;
  }

  getLanguage(): string {
    const lang = this.ysdk?.environment?.i18n?.lang;
    if (lang && lang.length > 0) {
      return lang;
    }
    return "ru";
  }

  unlockAchievement(_id: string): void {
    /* Phase 7 stub — no Yandex achievements console */
  }

  listAchievements(): string[] {
    return [];
  }

  private async bindCloud(): Promise<void> {
    if (!this.ysdk) {
      this.cloud = "local";
      return;
    }
    try {
      this.player = await this.ysdk.getPlayer({ scopes: false });
      if (this.player) {
        this.cloud = "player";
        return;
      }
    } catch {
      this.player = null;
    }
    try {
      if (this.ysdk.getStorage) {
        this.storage = await this.ysdk.getStorage();
        this.cloud = "storage";
        return;
      }
    } catch {
      this.storage = null;
    }
    this.cloud = "local";
  }
}

export const yandexService = new YandexService();
