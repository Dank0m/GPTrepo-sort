import { CanvasSurface } from "./canvas.ts";
import { GameLoop } from "./loop.ts";
import { canvasPoint } from "./pointer.ts";
import { World } from "../game/world.ts";
import { drawScene } from "../render/scene.ts";
import { shopCursor } from "../render/shop.ts";
import type { Records } from "../game/save.ts";

export class App {
  private readonly surface: CanvasSurface;
  private readonly loop: GameLoop;
  private readonly world: World;

  constructor(canvas: HTMLCanvasElement, records: Records) {
    this.surface = new CanvasSurface(canvas);
    this.world = new World(window.innerWidth, window.innerHeight, records);
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });
    this.bindResize();
    this.bindPointer();
    this.bindKeys();
    this.bindFocus();
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

  private bindPointer(): void {
    const canvas = this.surface.canvas;
    canvas.style.cursor = "grab";
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    canvas.addEventListener("pointerdown", (event) => {
      const point = canvasPoint(canvas, event);
      if (this.world.pointerDown(point.x, point.y)) {
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = "grabbing";
        event.preventDefault();
      }
    });

    canvas.addEventListener("pointermove", (event) => {
      const point = canvasPoint(canvas, event);
      this.world.pointerMove(point.x, point.y);
      if (!this.world.grabbed) {
        canvas.style.cursor = shopCursor(this.world, point.x, point.y) ? "pointer" : "grab";
      }
    });

    const release = (event: PointerEvent): void => {
      if (this.world.grabbed) {
        const point = canvasPoint(canvas, event);
        this.world.pointerUp(point.x, point.y);
      }
      canvas.style.cursor = "grab";
    };

    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", () => {
      this.world.pointerCancel();
      canvas.style.cursor = "grab";
    });
  }

  private bindKeys(): void {
    window.addEventListener("keydown", (event) => {
      if (event.key === "d" || event.key === "D") {
        this.world.debug = !this.world.debug;
      }
      if (event.key === "Escape" || event.key === "p" || event.key === "P") {
        if (this.world.status === "playing") {
          this.world.togglePause();
        }
      }
    });
  }

  private bindFocus(): void {
    const onHidden = (): void => {
      this.world.pause();
    };
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        onHidden();
      }
    });
    window.addEventListener("blur", onHidden);
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
