export type CanvasMetrics = {
  cssWidth: number;
  cssHeight: number;
  bufferWidth: number;
  bufferHeight: number;
  dpr: number;
};

/**
 * Full-window canvas with devicePixelRatio-aware backing store.
 * Drawing uses CSS pixels after setTransform.
 */
export class CanvasSurface {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  cssWidth = 1;
  cssHeight = 1;
  dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("Canvas 2D context is not available");
    }
    this.canvas = canvas;
    this.ctx = ctx;
  }

  get metrics(): CanvasMetrics {
    return {
      cssWidth: this.cssWidth,
      cssHeight: this.cssHeight,
      bufferWidth: this.canvas.width,
      bufferHeight: this.canvas.height,
      dpr: this.dpr,
    };
  }

  resize(): boolean {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssWidth = Math.max(1, Math.floor(window.innerWidth));
    const cssHeight = Math.max(1, Math.floor(window.innerHeight));
    const bufferWidth = Math.max(1, Math.floor(cssWidth * dpr));
    const bufferHeight = Math.max(1, Math.floor(cssHeight * dpr));

    const changed =
      this.cssWidth !== cssWidth ||
      this.cssHeight !== cssHeight ||
      this.dpr !== dpr ||
      this.canvas.width !== bufferWidth ||
      this.canvas.height !== bufferHeight;

    if (!changed) {
      return false;
    }

    this.dpr = dpr;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.canvas.width = bufferWidth;
    this.canvas.height = bufferHeight;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }
}
