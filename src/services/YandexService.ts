import { loadRecords, saveRecords, type Records } from "../game/save.ts";

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
  getPlayer: (opts?: { scopes?: boolean }) => Promise<YaPlayer>;
  getStorage?: () => Promise<StorageLike>;
};

type YaGamesNamespace = {
  init: () => Promise<Ysdk>;
};

const SAVE_KEY = "sortup-records";
const SCRIPT_WAIT_MS = 2800;

function yaGames(): YaGamesNamespace | undefined {
  return (window as Window & { YaGames?: YaGamesNamespace }).YaGames;
}

function asRecords(raw: unknown): Records | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw as Partial<Records>;
  const bestCoins = Math.max(0, Math.floor(Number(data.bestCoins) || 0));
  const bestCombo = Math.max(0, Math.floor(Number(data.bestCombo) || 0));
  const gamesPlayed = Math.max(0, Math.floor(Number(data.gamesPlayed) || 0));
  if (bestCoins === 0 && bestCombo === 0 && gamesPlayed === 0 && !("bestCoins" in data)) {
    return null;
  }
  return { bestCoins, bestCombo, gamesPlayed };
}

function mergeRecords(a: Records, b: Records): Records {
  return {
    bestCoins: Math.max(a.bestCoins, b.bestCoins),
    bestCombo: Math.max(a.bestCombo, b.bestCombo),
    gamesPlayed: Math.max(a.gamesPlayed, b.gamesPlayed),
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
  private ysdk: Ysdk | null = null;
  private gameplayOn = false;
  private markedReady = false;
  private cloud: "player" | "storage" | "local" = "local";
  private storage: StorageLike | null = null;
  private player: YaPlayer | null = null;

  async init(): Promise<void> {
    const tagged = Boolean(document.querySelector('script[src="/sdk.js"]'));
    let api = yaGames() ?? (await waitForYaGames(tagged ? 150 : 50));
    if (!api && !tagged) {
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
      await this.bindCloud();
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
    if (!this.ysdk || this.gameplayOn) {
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
              rewarded = true;
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
    saveRecords(data);
    if (!this.ysdk) {
      return;
    }
    try {
      if (this.cloud === "player" && this.player) {
        await this.player.setData({ ...data }, true);
        return;
      }
      if (this.cloud === "storage") {
        const storage = this.storage ?? (await this.ysdk.getStorage?.());
        if (storage) {
          this.storage = storage;
          storage.setItem(SAVE_KEY, JSON.stringify(data));
        }
      }
    } catch {
      /* keep localStorage copy */
    }
  }

  async loadGame(): Promise<GameSave> {
    const local = loadRecords();
    if (!this.ysdk) {
      return local;
    }
    try {
      if (this.cloud === "player" && this.player) {
        const raw = await this.player.getData(["bestCoins", "bestCombo", "gamesPlayed"]);
        const cloud = asRecords(raw);
        if (!cloud) {
          return local;
        }
        const merged = mergeRecords(local, cloud);
        if (merged.bestCoins !== cloud.bestCoins || merged.bestCombo !== cloud.bestCombo || merged.gamesPlayed !== cloud.gamesPlayed) {
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
        return mergeRecords(local, cloud);
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
