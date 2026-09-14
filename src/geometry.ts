export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = Size & { left: number; top: number };
export const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

/** Geometry is relative to decoded, orientation-normalized pixels, never the viewport. */
export function imageRect(image: Size, frame: Size, focus?: Point): Rect {
  if (![image.width, image.height, frame.width, frame.height].every(n => Number.isFinite(n) && n > 0)) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const scale = Math.min(frame.width / image.width, frame.height / image.height) * (focus ? 2.2 : 1);
  const width = image.width * scale;
  const height = image.height * scale;
  const axis = (size: number, container: number, position: number) => size <= container
    ? (container - size) / 2
    : clamp(container / 2 - position * size, container - size, 0);
  return {
    width, height,
    left: focus ? axis(width, frame.width, focus.x) : (frame.width - width) / 2,
    top: focus ? axis(height, frame.height, focus.y) : (frame.height - height) / 2,
  };
}

export function toNormalized(point: Point, rect: Rect): Point | null {
  if (!rect.width || !rect.height || point.x < rect.left || point.x > rect.left + rect.width || point.y < rect.top || point.y > rect.top + rect.height) return null;
  return { x: clamp((point.x - rect.left) / rect.width), y: clamp((point.y - rect.top) / rect.height) };
}

export const toViewport = (point: Point, rect: Rect): Point => ({ x: rect.left + point.x * rect.width, y: rect.top + point.y * rect.height });
