/**
 * Homogenous 3x3 Transformation Matrix math module.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 2).
 *
 * Matrix layout representing 2D affine transformations:
 * | a  c  e |
 * | b  d  f |
 * | 0  0  1 |
 *
 * Array representation (column-major or row-major consistent tuple):
 * [a, b, c, d, e, f] where e=tx, f=ty.
 */

import { Point2D } from './point2d';
import { BoundingBox2D, createBoundingBox } from './bounding-box';

export type Matrix3x3 = readonly [number, number, number, number, number, number];

export const IDENTITY_MATRIX: Matrix3x3 = [1, 0, 0, 1, 0, 0];

export function createIdentityMatrix(): Matrix3x3 {
  return [1, 0, 0, 1, 0, 0];
}

export function createTranslationMatrix(tx: number, ty: number): Matrix3x3 {
  return [1, 0, 0, 1, tx, ty];
}

export function createScaleMatrix(sx: number, sy: number = sx): Matrix3x3 {
  return [sx, 0, 0, sy, 0, 0];
}

export function createScaleAroundPointMatrix(
  scale: number,
  anchor: Point2D
): Matrix3x3 {
  // Translate to origin, scale, translate back
  // T(anchor.x, anchor.y) * S(scale) * T(-anchor.x, -anchor.y)
  const e = anchor.x * (1 - scale);
  const f = anchor.y * (1 - scale);
  return [scale, 0, 0, scale, e, f];
}

export function multiplyMatrix(m1: Matrix3x3, m2: Matrix3x3): Matrix3x3 {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;

  const a = a1 * a2 + c1 * b2;
  const b = b1 * a2 + d1 * b2;
  const c = a1 * c2 + c1 * d2;
  const d = b1 * c2 + d1 * d2;
  const e = a1 * e2 + c1 * f2 + e1;
  const f = b1 * e2 + d1 * f2 + f1;

  return [a, b, c, d, e, f];
}

export function determinantMatrix(m: Matrix3x3): number {
  const [a, b, c, d] = m;
  return a * d - b * c;
}

export function invertMatrix(m: Matrix3x3): Matrix3x3 {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;

  if (Math.abs(det) < 1e-12) {
    // Singular matrix fallback: return identity
    return IDENTITY_MATRIX;
  }

  const invDet = 1.0 / det;
  const invA = d * invDet;
  const invB = -b * invDet;
  const invC = -c * invDet;
  const invD = a * invDet;
  const invE = (c * f - d * e) * invDet;
  const invF = (b * e - a * f) * invDet;

  return [invA, invB, invC, invD, invE, invF];
}

export function transformPoint(m: Matrix3x3, p: Point2D): Point2D {
  const [a, b, c, d, e, f] = m;
  return {
    x: a * p.x + c * p.y + e,
    y: b * p.x + d * p.y + f,
  };
}

export function transformBoundingBox(
  m: Matrix3x3,
  box: BoundingBox2D
): BoundingBox2D {
  const p1 = transformPoint(m, { x: box.minX, y: box.minY });
  const p2 = transformPoint(m, { x: box.maxX, y: box.minY });
  const p3 = transformPoint(m, { x: box.minX, y: box.maxY });
  const p4 = transformPoint(m, { x: box.maxX, y: box.maxY });

  const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
  const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
  const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
  const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);

  return createBoundingBox(minX, minY, maxX, maxY);
}
