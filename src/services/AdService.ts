import { ADS } from "../config.ts";
import { sfx } from "../audio/sfx.ts";
import { yandexService } from "./YandexService.ts";

export type AdGoal = "dumpDouble" | "freeCoins";
export type AdShowResult = "rewarded" | "skipped" | "unavailable";

export type AdHost = {
  beginAd(): void;
  endAd(): void;
  isPlayable(): boolean;
};

function mockAdsEnabled(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("mockAds") === "1";
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export class AdService {
  readonly mock = mockAdsEnabled();
  busy = false;
  cooldownUntil = 0;

  get available(): boolean {
    return this.mock || yandexService.available;
  }

  canShow(goal: AdGoal): boolean {
    if (!this.available || this.busy) {
      return false;
    }
    if (goal === "freeCoins" && Date.now() < this.cooldownUntil) {
      return false;
    }
    return true;
  }

  cooldownLeft(): number {
    return Math.max(0, (this.cooldownUntil - Date.now()) / 1000);
  }

  markFreeCoinsUsed(): void {
    this.cooldownUntil = Date.now() + ADS.freeCoinsCooldown * 1000;
  }

  async show(goal: AdGoal, host: AdHost): Promise<AdShowResult> {
    if (!this.canShow(goal)) {
      return "unavailable";
    }
    this.busy = true;
    host.beginAd();
    yandexService.gameplayStop();
    sfx.hush();

    let rewarded = false;
    try {
      if (this.mock) {
        await delay(ADS.mockDelayMs);
        rewarded = true;
      } else {
        const result = await yandexService.showRewardedAd();
        rewarded = result.rewarded;
      }
    } catch {
      rewarded = false;
    }

    this.busy = false;
    host.endAd();
    if (host.isPlayable()) {
      sfx.unlock();
      yandexService.gameplayStart();
    }

    if (rewarded && goal === "freeCoins") {
      this.markFreeCoinsUsed();
    }
    return rewarded ? "rewarded" : "skipped";
  }
}

export const adService = new AdService();
