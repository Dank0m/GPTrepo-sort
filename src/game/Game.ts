import { LAYOUT, PALETTE } from "../config/balance.ts";
import { CanvasSurface } from "../core/canvas.ts";
import { GameLoop } from "../core/loop.ts";
import { canvasPoint } from "../core/pointer.ts";
import { roundRectPath } from "../utils/math.ts";
import { DragController } from "./DragController.ts";
import { canEnter, GameState } from "./GameState.ts";
import { generateLevel, type Playfield } from "./LevelGenerator.ts";
import type { Level } from "./Level.ts";
import { drawHud } from "../ui/HUD.ts";
import { drawLevelComplete, drawLoading } from "../ui/LevelComplete.ts";

export class Game {
  private readonly surface: CanvasSurface;
  private readonly loop: GameLoop;
  private readonly drag = new DragController();

  private state: GameState = GameState.Loading;
  private playfield: Playfield = { x: 0, y: 0, w: 1, h: 1 };
  private level: Level | null = null;
  private levelNumber = 1;
  private loadTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });
    this.bindResize();
    this.bindPointer();
  }

  start(): void {
    this.surface.resize();
    this.layout();
    this.loop.start();
  }

  private tryEnter(next: GameState): boolean {
    if (!canEnter(this.state, next)) return false;
    this.state = next;
    return true;
  }

  private layout(): void {
    const w = this.surface.cssWidth;
    const h = this.surface.cssHeight;
    const aspect = LAYOUT.portraitAspect;
    let fieldH = h;
    let fieldW = fieldH * aspect;
    if (fieldW > w) {
      fieldW = w;
      fieldH = fieldW / aspect;
    }
    this.playfield = {
      x: (w - fieldW) / 2,
      y: (h - fieldH) / 2,
      w: fieldW,
      h: fieldH,
    };
    if (this.state === GameState.Playing) {
      this.level = generateLevel(this.levelNumber, this.playfield);
    }
  }

  private beginLevel(n: number): void {
    this.levelNumber = n;
    this.level = generateLevel(n, this.playfield);
    if (this.state !== GameState.Playing) {
      this.tryEnter(GameState.Playing);
    }
  }

  private bindResize(): void {
    const onResize = (): void => {
      this.surface.resize();
      this.layout();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
  }

  private bindPointer(): void {
    const canvas = this.surface.canvas;
    canvas.style.cursor = "grab";

    canvas.addEventListener("pointerdown", (event) => {
      const point = canvasPoint(canvas, event);
      if (this.state === GameState.LevelComplete) {
        this.beginLevel(this.levelNumber + 1);
        event.preventDefault();
        return;
      }
      if (this.state !== GameState.Playing || !this.level) return;
      if (this.drag.down(event.pointerId, point.x, point.y, this.level, this.playfield)) {
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = "grabbing";
        event.preventDefault();
      }
    });

    canvas.addEventListener("pointermove", (event) => {
      if (this.state !== GameState.Playing || !this.level) return;
      if (this.drag.capturedId !== null && event.pointerId !== this.drag.capturedId) return;
      const point = canvasPoint(canvas, event);
      this.drag.move(event.pointerId, point.x, point.y, this.level, this.playfield);
    });

    const release = (event: PointerEvent): void => {
      if (!this.level) return;
      const result = this.drag.up(event.pointerId, this.level);
      canvas.style.cursor = "grab";
      if (result === "sorted" && this.level.isComplete()) {
        this.tryEnter(GameState.LevelComplete);
      }
    };

    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", (event) => {
      if (this.level) this.drag.cancel(event.pointerId, this.level);
      canvas.style.cursor = "grab";
    });
  }

  private update(dt: number): void {
    if (this.state === GameState.Loading) {
      this.loadTimer += dt;
      if (this.loadTimer >= 0.35) {
        this.beginLevel(1);
      }
    }
  }

  private render(): void {
    const ctx = this.surface.ctx;
    const { cssWidth: w, cssHeight: h } = this.surface;

    ctx.fillStyle = PALETTE.page;
    ctx.fillRect(0, 0, w, h);

    const pf = this.playfield;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = 28;
    roundRectPath(ctx, pf.x, pf.y, pf.w, pf.h, 28);
    ctx.fillStyle = PALETTE.field;
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRectPath(ctx, pf.x, pf.y, pf.w, pf.h, 28);
    ctx.clip();

    if (this.state === GameState.Loading || !this.level) {
      drawLoading(ctx, pf);
      ctx.restore();
      return;
    }

    for (const container of this.level.containers) container.draw(ctx);

    const resting = this.level.items.filter((item) => !item.sorted && !item.dragging);
    const dragging = this.level.items.filter((item) => !item.sorted && item.dragging);
    for (const item of resting) item.draw(ctx);
    for (const item of dragging) item.draw(ctx);

    drawHud(ctx, pf, this.level);

    if (this.state === GameState.LevelComplete) {
      drawLevelComplete(ctx, pf, this.level.number);
    }
    ctx.restore();
  }
}
