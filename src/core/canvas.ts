export type CanvasMetrics = {
  cssWidth: number;
  cssHeight: number;
  bufferWidth: number;
  bufferHeight: number;
  dpr: number;
};

/**
 * Centered active field (desktop aspect ratio at most 2:1), DPR-aware.
 * Drawing uses CSS pixels after setTransform.
 */
export class CanvasSurface {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  cssWidth = 1;
  cssHeight = 1;
  dpr = 1;
  offsetX = 0;
  offsetY = 0;

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
    const viewportWidth = Math.max(1, Math.floor(window.innerWidth));
    const viewportHeight = Math.max(1, Math.floor(window.innerHeight));
    const desktop = window.matchMedia("(pointer: fine)").matches;
    const cssWidth = desktop ? Math.min(viewportWidth, viewportHeight * 2) : viewportWidth;
    const cssHeight = desktop ? Math.min(viewportHeight, viewportWidth * 2) : viewportHeight;
    const offsetX = (viewportWidth - cssWidth) / 2;
    const offsetY = (viewportHeight - cssHeight) / 2;
    const bufferWidth = Math.max(1, Math.floor(cssWidth * dpr));
    const bufferHeight = Math.max(1, Math.floor(cssHeight * dpr));

    const changed =
      this.offsetX !== offsetX ||
      this.offsetY !== offsetY ||
      this.cssWidth !== cssWidth ||
      this.cssHeight !== cssHeight ||
      this.dpr !== dpr ||
      this.canvas.width !== bufferWidth ||
      this.canvas.height !== bufferHeight;

    if (!changed) {
      return false;
    }

    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.canvas.style.position = "fixed";
    this.canvas.style.left = `${offsetX}px`;
    this.canvas.style.top = `${offsetY}px`;
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
