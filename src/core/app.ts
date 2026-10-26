import { CanvasSurface } from "./canvas.ts";
import { UpgradeTree } from "../ui/UpgradeTree.ts";
import { ProgressPanel } from "../ui/ProgressPanel.ts";
import { yandexService } from "../services/YandexService.ts";
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
  private readonly progressPanel: ProgressPanel;
  private readonly upgradeTree: UpgradeTree;

  constructor(canvas: HTMLCanvasElement, records: Records) {
    this.surface = new CanvasSurface(canvas);
    this.world = new World(window.innerWidth, window.innerHeight, records);
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });
    this.upgradeTree = new UpgradeTree(this.world, canvas);
    this.progressPanel = new ProgressPanel(this.world, canvas);
    yandexService.onPlatformPause(() => this.world.pauseForPlatform());
    yandexService.onPlatformResume(() => this.world.resumeFromPlatform(!this.progressPanel.isOpen && !this.upgradeTree.isOpen));
    this.bindResize();
    this.bindPointer();
    this.bindKeys();
    this.bindFocus();
  }

  start(): void {
    this.surface.resize();
    this.world.resize(this.surface.cssWidth, this.surface.cssHeight);
    this.render();
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

    let activePointer: number | null = null;
    canvas.addEventListener("pointerdown", (event) => {
      if (activePointer !== null) return;
      const point = canvasPoint(canvas, event);
      if (this.world.pointerDown(point.x, point.y, event.button)) {
        activePointer = event.pointerId;
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = "grabbing";
        event.preventDefault();
      }
    });

    canvas.addEventListener("pointermove", (event) => {
      if (activePointer !== null && event.pointerId !== activePointer) return;
      const point = canvasPoint(canvas, event);
      this.world.pointerMove(point.x, point.y);
      if (!this.world.grabbed) {
        canvas.style.cursor = shopCursor(this.world, point.x, point.y) ? "pointer" : "grab";
      }
    });

    const release = (event: PointerEvent): void => {
      if (event.pointerId !== activePointer) return;
      activePointer = null;
      if (this.world.grabbed) {
        const point = canvasPoint(canvas, event);
        this.world.pointerUp(point.x, point.y);
      }
      canvas.style.cursor = "grab";
    };

    canvas.addEventListener("pointerup", release);
    const cancel = (event: PointerEvent): void => {
      if (event.pointerId !== activePointer) return;
      activePointer = null;
      this.world.pointerCancel();
      canvas.style.cursor = "grab";
    };
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("lostpointercapture", cancel);
  }

  private bindKeys(): void {
    window.addEventListener("keydown", (event) => {
      if (this.progressPanel.isOpen || this.upgradeTree.isOpen) return;
      if (import.meta.env.DEV && (event.key === "d" || event.key === "D")) {
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
      if (yandexService.available || this.world.adsPlaying || yandexService.platformPaused) {
        this.world.pauseForPlatform();
      } else {
        this.world.pause();
      }
    };
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        onHidden();
      } else {
        this.world.resumeFromPlatform(!this.progressPanel.isOpen && !this.upgradeTree.isOpen);
      }
    });
    window.addEventListener("blur", onHidden);
    window.addEventListener("focus", () => this.world.resumeFromPlatform(!this.progressPanel.isOpen && !this.upgradeTree.isOpen));
  }

  private update(dt: number): void {
    if (this.world.treeRequested) {
      this.world.treeRequested = false;
      // Locked group pickup never opens the shop during a level.
    }
    this.world.update(dt);
  }

  private render(): void {
    if (this.surface.resize()) {
      this.world.resize(this.surface.cssWidth, this.surface.cssHeight);
    }
    drawScene(this.surface, this.world, this.loop.framesPerSecond);
    this.progressPanel.update();
    if (this.world.intermission && !this.progressPanel.isOpen) this.upgradeTree.open();
    this.upgradeTree.update();
  }
}
