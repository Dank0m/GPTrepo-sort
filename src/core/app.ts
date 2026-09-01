import { CanvasSurface } from "./canvas.ts";
import { GameLoop } from "./loop.ts";
import { World } from "../game/world.ts";
import { drawScene } from "../render/scene.ts";

export class App {
  private readonly surface: CanvasSurface;
  private readonly loop: GameLoop;
  private readonly world: World;

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
    this.world = new World(window.innerWidth, window.innerHeight);
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });
    this.bindResize();
  }

  start(): void {
    this.surface.resize();
    this.world.resize(this.surface.cssWidth, this.surface.cssHeight);
    this.loop.start();
  }

  private bindResize(): void {
    const onResize = (): void => {
      this.surface.resize();
      this.world.resize(this.surface.cssWidth, this.surface.cssHeight);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
  }

  private update(dt: number): void {
    this.world.update(dt);
  }

  private render(): void {
    if (this.surface.resize()) {
      this.world.resize(this.surface.cssWidth, this.surface.cssHeight);
    }
    drawScene(this.surface, this.world, this.loop.framesPerSecond);
  }
}
