import "./style.css";
import { App } from "./core/app.ts";
import { initLocale } from "./i18n/locale.ts";
import { yandexService } from "./services/YandexService.ts";

const canvas = document.querySelector("#game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Canvas #game not found");
}

const boot = async (): Promise<void> => {
  await yandexService.init();
  initLocale(yandexService.getLanguage());
  const records = await yandexService.loadGame();
  const app = new App(canvas, records);
  app.start();
  yandexService.ready();
};

void boot();
