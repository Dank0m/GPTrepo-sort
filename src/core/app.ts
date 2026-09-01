import { CanvasSurface } from "./canvas.ts";
import { GameLoop } from "./loop.ts";
import { drawPhase0Frame } from "../debug/overlay.ts";

export class App {
  private readonly surface: CanvasSurface;
  private readonly loop: GameLoop;

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });
    this.bindResize();
  }

  start(): void {
    this.surface.resize();
    this.loop.start();
  }

  private bindResize(): void {
    window.addEventListener("resize", () => {
      this.surface.resize();
    });
    window.addEventListener("orientationchange", () => {
      this.surface.resize();
    });
    window.visualViewport?.addEventListener("resize", () => {
      this.surface.resize();
    });
  }

  private update(_dt: number): void {
    // PHASE 0: no simulation, no gameplay systems.
  }

  private render(): void {
    this.surface.resize();
    drawPhase0Frame(this.surface, this.loop.framesPerSecond);
  }
}
