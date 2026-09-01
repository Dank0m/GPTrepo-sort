import { yandexService } from "../services/YandexService.ts";
import { STRINGS, type Locale, type Strings } from "./strings.ts";

const KEY = "sortup-locale";

let locale: Locale = "ru";

export function currentLocale(): Locale {
  return locale;
}

export function strings(): Strings {
  return STRINGS[locale];
}

export function setLocale(next: Locale): void {
  locale = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = next;
}

export function toggleLocale(): Locale {
  const next: Locale = locale === "ru" ? "en" : "ru";
  setLocale(next);
  return next;
}

export function detectLocale(sdkLang?: string): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "ru" || saved === "en") {
      return saved;
    }
  } catch {
    /* ignore */
  }
  const raw = (sdkLang ?? (yandexService.getLanguage() || navigator.language || "ru")).toLowerCase();
  const code = raw.slice(0, 2);
  return code === "en" ? "en" : "ru";
}

export function initLocale(sdkLang?: string): Locale {
  setLocale(detectLocale(sdkLang));
  return locale;
}

export type { Locale, Strings };
export { STRINGS };
