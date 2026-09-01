export type LoopHandlers = {
  update: (dt: number) => void;
  render: () => void;
};

const MAX_DT_SECONDS = 0.1;

/** requestAnimationFrame loop with clamped delta time and FPS tracking. */
export class GameLoop {
  private running = false;
  private rafId = 0;
  private lastTimestamp = 0;
  private fps = 0;
  private frames = 0;
  private fpsWindow = 0;

  constructor(private readonly handlers: LoopHandlers) {}

  get framesPerSecond(): number {
    return this.fps;
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.lastTimestamp = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (timestamp: number): void => {
    if (!this.running) {
      return;
    }

    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }

    let dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    if (dt > MAX_DT_SECONDS) {
      dt = MAX_DT_SECONDS;
    }

    this.frames += 1;
    this.fpsWindow += dt;
    if (this.fpsWindow >= 0.5) {
      this.fps = this.frames / this.fpsWindow;
      this.frames = 0;
      this.fpsWindow = 0;
    }

    this.handlers.update(dt);
    this.handlers.render();
    this.rafId = requestAnimationFrame(this.tick);
  };
}
