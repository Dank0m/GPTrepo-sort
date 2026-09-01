export type Point = {
  x: number;
  y: number;
};

export function canvasPoint(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.clientWidth / rect.width;
  const scaleY = canvas.clientHeight / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}
