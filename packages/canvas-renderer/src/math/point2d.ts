/**
 * Point2D & Vector2D continuous mathematical primitives for Project Zero Canvas Engine.
 * Formally defined in docs/09_Canvas_Engine_Specification.md (Section 2).
 */

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface Vector2D {
  readonly x: number;
  readonly y: number;
}

export function createPoint(x: number, y: number): Point2D {
  return { x, y };
}

export function createVector(x: number, y: number): Vector2D {
  return { x, y };
}

export function addPoints(p1: Point2D, p2: Point2D): Point2D {
  return { x: p1.x + p2.x, y: p1.y + p2.y };
}

export function subtractPoints(p1: Point2D, p2: Point2D): Vector2D {
  return { x: p1.x - p2.x, y: p1.y - p2.y };
}

export function scaleVector(v: Vector2D, scale: number): Vector2D {
  return { x: v.x * scale, y: v.y * scale };
}

export function distanceBetween(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceSquaredBetween(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return dx * dx + dy * dy;
}

export function lerpPoint(p1: Point2D, p2: Point2D, t: number): Point2D {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}

export function dotProduct(v1: Vector2D, v2: Vector2D): number {
  return v1.x * v2.x + v1.y * v2.y;
}

export function vectorLength(v: Vector2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalizeVector(v: Vector2D): Vector2D {
  const len = vectorLength(v);
  if (len === 0) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
}

/**
 * Calculates the shortest orthogonal distance from a point P to a line segment AB.
 */
export function pointToSegmentDistance(p: Point2D, a: Point2D, b: Point2D): number {
  return Math.sqrt(pointToSegmentDistanceSquared(p, a, b));
}

/**
 * Calculates the squared shortest orthogonal distance from a point P to a line segment AB.
 */
export function pointToSegmentDistanceSquared(p: Point2D, a: Point2D, b: Point2D): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;

  const abLenSq = abx * abx + aby * aby;
  if (abLenSq < 1e-10) {
    return apx * apx + apy * apy;
  }

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
  const projX = a.x + t * abx;
  const projY = a.y + t * aby;

  const dx = p.x - projX;
  const dy = p.y - projY;
  return dx * dx + dy * dy;
}
