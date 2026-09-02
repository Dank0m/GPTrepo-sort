import type { ItemType, UpgradeId } from "../config.ts";

export type Locale = "ru" | "en";

export type Strings = {
  coins: string;
  coinsShort: string;
  record: string;
  recordShort: string;
  combo: string;
  hint: string;
  full: string;
  dumpTitle: string;
  dumpSubtitle: (types: number) => string;
  gameOver: string;
  newRecord: string;
  maxCombo: string;
  maxComboRecord: string;
  bestScore: string;
  tapRestart: string;
  pause: string;
  tapResume: string;
  doubleTitle: string;
  secondsLeft: (n: number) => string;
  watchAd: string;
  jackpotAgain: (bonus: number) => string;
  noThanks: string;
  adsPlaying: string;
  adsHint: string;
  wait: string;
  ad: string;
  freeCoins: string;
  freeCoinsShort: string;
  miss: string;
  binFull: string;
  overflow: string;
  kept: (n: number) => string;
  types: Record<ItemType, string>;
  upgrades: Record<UpgradeId, string>;
};

export const STRINGS: Record<Locale, Strings> = {
  ru: {
    coins: "Монеты",
    coinsShort: "Монеты",
    record: "Рекорд",
    recordShort: "рек.",
    combo: "Комбо",
    hint: "Перетащи фигуру в контейнер своего цвета",
    full: "ПОЛНО",
    dumpTitle: "ПОЛНЫЙ НАБОР",
    dumpSubtitle: (types) => `${types} типов · буфер сброшен`,
    gameOver: "Конец сессии",
    newRecord: "Новый рекорд!",
    maxCombo: "Макс. комбо",
    maxComboRecord: "рекорд",
    bestScore: "Лучший счёт",
    tapRestart: "Нажми, чтобы начать снова",
    pause: "Пауза",
    tapResume: "Нажми, чтобы продолжить",
    doubleTitle: "Удвоить награду",
    secondsLeft: (n) => `${n} с`,
    watchAd: "Посмотреть рекламу",
    jackpotAgain: (bonus) => `джекпот ещё раз  +${bonus}`,
    noThanks: "Нет",
    adsPlaying: "Реклама…",
    adsHint: "Награда придёт после просмотра",
    wait: "жди",
    ad: "реклама",
    freeCoins: "FREE COINS",
    freeCoinsShort: "Монеты",
    miss: "Мимо",
    binFull: "Полно",
    overflow: "Уехал",
    kept: (n) => `С собой  +${n}`,
    types: {
      red: "Квадрат",
      blue: "Круг",
      yellow: "Треуг.",
      green: "Ромб",
      purple: "Звезда",
      orange: "Гекс",
    },
    upgrades: {
      speed: "Скорость",
      value: "Ценность",
      type: "Тип",
      auto: "Автосорт",
      buffer: "Буфер",
    },
  },
  en: {
    coins: "Coins",
    coinsShort: "Coins",
    record: "Best",
    recordShort: "best",
    combo: "Combo",
    hint: "Drag each shape into the matching bin",
    full: "FULL",
    dumpTitle: "FULL SET",
    dumpSubtitle: (types) => `${types} types · bins cleared`,
    gameOver: "Session over",
    newRecord: "New best!",
    maxCombo: "Max combo",
    maxComboRecord: "record",
    bestScore: "Best score",
    tapRestart: "Tap to play again",
    pause: "Paused",
    tapResume: "Tap to resume",
    doubleTitle: "Double reward",
    secondsLeft: (n) => `${n}s`,
    watchAd: "Watch ad",
    jackpotAgain: (bonus) => `jackpot again  +${bonus}`,
    noThanks: "No",
    adsPlaying: "Ad…",
    adsHint: "The reward comes after the video",
    wait: "wait",
    ad: "ad",
    freeCoins: "FREE COINS",
    freeCoinsShort: "Coins",
    miss: "Miss",
    binFull: "Full",
    overflow: "Gone",
    kept: (n) => `Kept  +${n}`,
    types: {
      red: "Square",
      blue: "Circle",
      yellow: "Triangle",
      green: "Diamond",
      purple: "Star",
      orange: "Hex",
    },
    upgrades: {
      speed: "Speed",
      value: "Value",
      type: "Type",
      auto: "Autosort",
      buffer: "Buffer",
    },
  },
};
