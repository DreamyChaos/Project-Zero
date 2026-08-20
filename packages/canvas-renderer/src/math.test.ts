import { describe, it, expect } from 'vitest';
import {
  createPoint,
  createVector,
  addPoints,
  subtractPoints,
  distanceBetween,
  lerpPoint,
  normalizeVector,
} from './math/point2d';
import {
  createBoundingBox,
  expandBoundingBox,
  boundingBoxFromPoints,
  containsPoint,
  intersectsBoundingBox,
  mergeBoundingBoxes,
} from './math/bounding-box';
import {
  createIdentityMatrix,
  createTranslationMatrix,
  createScaleMatrix,
  multiplyMatrix,
  invertMatrix,
  transformPoint,
  transformBoundingBox,
} from './math/matrix3x3';

describe('Math Primitives', () => {
  describe('Point2D & Vector2D', () => {
    it('creates points and vectors correctly', () => {
      const p = createPoint(10, 20);
      expect(p.x).toBe(10);
      expect(p.y).toBe(20);

      const v = createVector(-5, 15);
      expect(v.x).toBe(-5);
      expect(v.y).toBe(15);
    });

    it('performs point arithmetic and distance calculations', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(3, 4);

      expect(addPoints(p1, p2)).toEqual({ x: 3, y: 4 });
      expect(subtractPoints(p2, p1)).toEqual({ x: 3, y: 4 });
      expect(distanceBetween(p1, p2)).toBe(5);
    });

    it('interpolates points linearly', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(100, 200);

      expect(lerpPoint(p1, p2, 0.5)).toEqual({ x: 50, y: 100 });
      expect(lerpPoint(p1, p2, 0)).toEqual({ x: 0, y: 0 });
      expect(lerpPoint(p1, p2, 1)).toEqual({ x: 100, y: 200 });
    });

    it('normalizes vectors', () => {
      const v = createVector(0, 5);
      expect(normalizeVector(v)).toEqual({ x: 0, y: 1 });

      const zero = createVector(0, 0);
      expect(normalizeVector(zero)).toEqual({ x: 0, y: 0 });
    });
  });

  describe('BoundingBox2D', () => {
    it('calculates dimensions and center correctly', () => {
      const box = createBoundingBox(-10, -20, 30, 40);
      expect(box.width).toBe(40);
      expect(box.height).toBe(60);
      expect(box.centerX).toBe(10);
      expect(box.centerY).toBe(10);
    });

    it('expands bounding box by margin', () => {
      const box = createBoundingBox(0, 0, 10, 10);
      const expanded = expandBoundingBox(box, 5);

      expect(expanded.minX).toBe(-5);
      expect(expanded.minY).toBe(-5);
      expect(expanded.maxX).toBe(15);
      expect(expanded.maxY).toBe(15);
    });

    it('creates bounding box from points', () => {
      const box = boundingBoxFromPoints([
        { x: 10, y: -5 },
        { x: -20, y: 30 },
        { x: 5, y: 15 },
      ]);

      expect(box.minX).toBe(-20);
      expect(box.minY).toBe(-5);
      expect(box.maxX).toBe(10);
      expect(box.maxY).toBe(30);
    });

    it('evaluates point containment and box intersections', () => {
      const box1 = createBoundingBox(0, 0, 10, 10);
      const box2 = createBoundingBox(5, 5, 15, 15);
      const box3 = createBoundingBox(20, 20, 30, 30);

      expect(containsPoint(box1, { x: 5, y: 5 })).toBe(true);
      expect(containsPoint(box1, { x: 15, y: 5 })).toBe(false);

      expect(intersectsBoundingBox(box1, box2)).toBe(true);
      expect(intersectsBoundingBox(box1, box3)).toBe(false);
    });

    it('merges bounding boxes', () => {
      const b1 = createBoundingBox(0, 0, 10, 10);
      const b2 = createBoundingBox(-5, 5, 15, 20);
      const merged = mergeBoundingBoxes(b1, b2);

      expect(merged.minX).toBe(-5);
      expect(merged.minY).toBe(0);
      expect(merged.maxX).toBe(15);
      expect(merged.maxY).toBe(20);
    });
  });

  describe('Matrix3x3', () => {
    it('performs identity and translation matrix transforms', () => {
      const identity = createIdentityMatrix();
      const pt = createPoint(15, 25);
      expect(transformPoint(identity, pt)).toEqual({ x: 15, y: 25 });

      const translation = createTranslationMatrix(10, -5);
      expect(transformPoint(translation, pt)).toEqual({ x: 25, y: 20 });
    });

    it('performs scale matrix transforms', () => {
      const scale = createScaleMatrix(2, 3);
      const pt = createPoint(10, 10);
      expect(transformPoint(scale, pt)).toEqual({ x: 20, y: 30 });
    });

    it('multiplies matrices correctly', () => {
      const t = createTranslationMatrix(100, 50);
      const s = createScaleMatrix(2, 2);
      const combined = multiplyMatrix(t, s);

      const pt = createPoint(10, 10);
      // S * P then T = (20+100, 20+50) = (120, 70)
      expect(transformPoint(combined, pt)).toEqual({ x: 120, y: 70 });
    });

    it('inverts non-singular matrices with precision error < 0.0001', () => {
      const t = createTranslationMatrix(123.45, -67.89);
      const s = createScaleMatrix(2.5, 2.5);
      const matrix = multiplyMatrix(t, s);

      const inv = invertMatrix(matrix);
      const pOriginal = createPoint(42.5, -18.75);

      const pScreen = transformPoint(matrix, pOriginal);
      const pBack = transformPoint(inv, pScreen);

      expect(Math.abs(pBack.x - pOriginal.x)).toBeLessThan(0.0001);
      expect(Math.abs(pBack.y - pOriginal.y)).toBeLessThan(0.0001);
    });

    it('transforms bounding boxes', () => {
      const box = createBoundingBox(0, 0, 10, 10);
      const matrix = multiplyMatrix(createTranslationMatrix(50, 50), createScaleMatrix(2, 2));

      const transformed = transformBoundingBox(matrix, box);
      expect(transformed.minX).toBe(50);
      expect(transformed.minY).toBe(50);
      expect(transformed.maxX).toBe(70);
      expect(transformed.maxY).toBe(70);
    });
  });
});
