import "./style.css";
import { Game } from "./game/Game.ts";

const canvas = document.querySelector("#game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Canvas #game not found");
}

const game = new Game(canvas);
game.start();
