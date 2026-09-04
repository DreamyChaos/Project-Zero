/**
 * 2D Bounding Box primitives and spatial region calculations.
 * Formally defined in docs/09_Canvas_Engine_Specification.md (Section 2, 3 & 15).
 */

import { Point2D } from './point2d';

export interface BoundingBox2D {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
}

export function createBoundingBox(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): BoundingBox2D {
  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

export function createEmptyBoundingBox(): BoundingBox2D {
  return createBoundingBox(0, 0, 0, 0);
}

export function expandBoundingBox(
  box: BoundingBox2D,
  margin: number
): BoundingBox2D {
  return createBoundingBox(
    box.minX - margin,
    box.minY - margin,
    box.maxX + margin,
    box.maxY + margin
  );
}

export function boundingBoxFromPoints(points: ReadonlyArray<Point2D>): BoundingBox2D {
  if (points.length === 0) {
    return createEmptyBoundingBox();
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  return createBoundingBox(minX, minY, maxX, maxY);
}

export function containsPoint(box: BoundingBox2D, point: Point2D): boolean {
  return (
    point.x >= box.minX &&
    point.x <= box.maxX &&
    point.y >= box.minY &&
    point.y <= box.maxY
  );
}

export function intersectsBoundingBox(
  b1: BoundingBox2D,
  b2: BoundingBox2D
): boolean {
  return !(
    b1.maxX < b2.minX ||
    b1.minX > b2.maxX ||
    b1.maxY < b2.minY ||
    b1.minY > b2.maxY
  );
}

export function mergeBoundingBoxes(
  b1: BoundingBox2D,
  b2: BoundingBox2D
): BoundingBox2D {
  return createBoundingBox(
    Math.min(b1.minX, b2.minX),
    Math.min(b1.minY, b2.minY),
    Math.max(b1.maxX, b2.maxX),
    Math.max(b1.maxY, b2.maxY)
  );
}
