import "./style.css";
import { App } from "./core/app.ts";
import { yandexService } from "./services/YandexService.ts";

const canvas = document.querySelector("#game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Canvas #game not found");
}

const boot = async (): Promise<void> => {
  await yandexService.init();
  const records = await yandexService.loadGame();
  const app = new App(canvas, records);
  app.start();
  yandexService.ready();
  if (!document.hidden) {
    yandexService.gameplayStart();
  }
};

void boot();
