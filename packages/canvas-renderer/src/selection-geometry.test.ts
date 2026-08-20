import { describe, it, expect } from 'vitest';
import {
  getSelectionBoundingBox,
  getSelectionOutlineGeometry,
  getFocusIndicatorGeometry,
  normalizeMarqueeRect,
} from './interaction/selection-geometry';
import { StateNode } from './state/state-node';

describe('Selection & Focus Geometry Subsystem', () => {
  const nodeA: StateNode = { id: 'q0', label: 'q0', x: 0, y: 0, radius: 32 };
  const nodeB: StateNode = { id: 'q1', label: 'q1', x: 200, y: 100, radius: 32 };

  it('calculates enclosing bounding box for multi-node selection', () => {
    expect(getSelectionBoundingBox([])).toBeNull();

    const box = getSelectionBoundingBox([nodeA, nodeB]);
    expect(box).toBeDefined();
    expect(box?.minX).toBeLessThanOrEqual(-32);
    expect(box?.maxX).toBeGreaterThanOrEqual(232);
    expect(box?.minY).toBeLessThanOrEqual(-32);
    expect(box?.maxY).toBeGreaterThanOrEqual(132);
  });

  it('computes 3px primary accent selection outline geometry', () => {
    const outline = getSelectionOutlineGeometry(nodeA);
    expect(outline.center).toEqual({ x: 0, y: 0 });
    expect(outline.radius).toBe(32);
    expect(outline.strokeWidth).toBe(3);
  });

  it('computes 4px offset high-contrast keyboard focus indicator geometry', () => {
    const focusGeom = getFocusIndicatorGeometry(nodeA);
    expect(focusGeom.center).toEqual({ x: 0, y: 0 });
    expect(focusGeom.offset).toBe(4);
    expect(focusGeom.innerRadius).toBe(36);
    expect(focusGeom.outerRadius).toBe(38);
  });

  it('normalizes drag rectangles with positive and negative coordinates cleanly', () => {
    const rectPositive = normalizeMarqueeRect(10, 20, 100, 200);
    expect(rectPositive.minX).toBe(10);
    expect(rectPositive.minY).toBe(20);
    expect(rectPositive.maxX).toBe(100);
    expect(rectPositive.maxY).toBe(200);
    expect(rectPositive.width).toBe(90);
    expect(rectPositive.height).toBe(180);

    const rectNegative = normalizeMarqueeRect(100, 200, 10, 20);
    expect(rectNegative.minX).toBe(10);
    expect(rectNegative.minY).toBe(20);
    expect(rectNegative.maxX).toBe(100);
    expect(rectNegative.maxY).toBe(200);
    expect(rectNegative.width).toBe(90);
    expect(rectNegative.height).toBe(180);
  });
});
