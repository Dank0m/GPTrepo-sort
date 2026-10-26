import { TREE_TEXT } from "./tree.ts";
import type { ItemType, UpgradeId } from "../config.ts";

export type Locale = "ru" | "en";

export type Strings = {
  rescued: string;
  groupCount: (count: number) => string;
  groupHelp: string;
  shift: (stage: number) => string;
  nextShift: (count: number) => string;
  finalShift: string;
  shiftHint: string;
  progress: string;
  mastery: string;
  rankUp: string;
  missionDone: string;
  dailyTitle: string;
  dailyHint: string;
  missionNames: Record<"sort" | "combo" | "set", string>;
  play: string;
  continueGame: string;
  howToPlay: string;
  permanentHint: string;
  startingBonus: string;
  earned: string;
  allDone: string;
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
  miss: string;
  binFull: string;
  overflow: string;
  kept: (n: number) => string;
  types: Record<ItemType, string>;
  upgrades: Record<UpgradeId, string>;
};

export const STRINGS: Record<Locale, Strings> = {
  ru: {
    rescued: "Возврат!",
    groupCount: (count) => `Группа: ${count}`,
    groupHelp: "Открой широкий захват в дереве: ПКМ переносит группу фигур. В контейнер попадут подходящие, остальные вернутся без штрафа.",
    shift: (stage) => `Смена ${stage}`,
    nextShift: (count) => `До следующей смены: ${count} фигур`,
    finalShift: "Максимальный темп — удержи рекорд!",
    shiftHint: "Ты управляешь сортировочной линией. Каждые 20 верных сортировок поток ускоряется — до 10-й смены. Рост сложности не требует покупок или рекламы.",
    progress: "Мой прогресс",
    mastery: "Мастерство",
    rankUp: "Новый уровень мастерства!",
    missionDone: "Задание выполнено!",
    dailyTitle: "Задания дня",
    dailyHint: "Новые задания в 00:00 UTC. Награды начисляются сразу.",
    missionNames: { sort: "Отсортируй 30 фигур вручную", combo: "12 фигур подряд вручную без ошибок", set: "Собери полный набор контейнеров" },
    play: "Начать сортировку",
    continueGame: "Продолжить",
    howToPlay: "Тяни фигуры в контейнеры той же формы. Серия без ошибок растит комбо. Заполни все контейнеры — получи джекпот! Монеты трать в дереве улучшений. Навыки сохраняются после проигрыша.",
    permanentHint: "Ручная сортировка даёт +2 XP, полный набор +20 XP. Уровень и задания сохраняются между партиями. За пропущенные дни штрафов нет.",
    startingBonus: "Монет на старте каждой партии",
    earned: "Получено",
    allDone: "Все задания выполнены! Следующие — завтра.",
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
    upgrades: TREE_TEXT.ru.names,
  },
  en: {
    rescued: "Returned!",
    groupCount: (count) => `Group: ${count}`,
    groupHelp: "Unlock Wide pickup in the tree to right-drag a group. Matching shapes enter the bin; the others return to the belt without a penalty.",
    shift: (stage) => `Shift ${stage}`,
    nextShift: (count) => `${count} shapes to the next shift`,
    finalShift: "Top pace — keep your record going!",
    shiftHint: "Run your own sorting line. Every 20 correct sorts speed up the conveyor, up to shift 10. Difficulty grows without purchases or ads.",
    progress: "My progress",
    mastery: "Mastery",
    rankUp: "Mastery level up!",
    missionDone: "Mission complete!",
    dailyTitle: "Daily missions",
    dailyHint: "New missions at 00:00 UTC. Rewards are granted instantly.",
    missionNames: { sort: "Sort 30 shapes by hand", combo: "12 manual sorts without a miss", set: "Fill every bin for a full set" },
    play: "Start sorting",
    continueGame: "Continue",
    howToPlay: "Drag shapes into matching bins. Keep a clean streak to grow your combo. Fill every bin for a jackpot! Spend coins in the upgrade tree. Skills persist after defeat.",
    permanentHint: "Manual sorting earns +2 XP, a full set +20 XP. Levels and missions persist between runs. No penalty for missed days.",
    startingBonus: "Starting coins in every run",
    earned: "Earned",
    allDone: "All missions complete! More tomorrow.",
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
    upgrades: TREE_TEXT.en.names,
  },
};
