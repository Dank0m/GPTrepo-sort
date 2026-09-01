import "./style.css";
import { App } from "./core/app.ts";

const canvas = document.querySelector("#game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Canvas #game not found");
}

const app = new App(canvas);
app.start();
