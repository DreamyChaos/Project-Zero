import { describe, it, expect } from 'vitest';
import {
  getNodeRadius,
  getAcceptingRingRadius,
  getInitialMarkerTriangle,
  getNodeBoundingBox,
  containsPointInNode,
  wrapStateLabel,
  computeAdaptiveStateLayout,
} from './state/state-geometry';
import { StateNode, DEFAULT_NODE_RADIUS } from './state/state-node';

describe('State Geometry Utilities', () => {
  const baseNode: StateNode = {
    id: 'q0',
    label: 'q0',
    x: 100,
    y: 200,
  };

  it('calculates node radius and accepting inner ring radius', () => {
    expect(getNodeRadius(baseNode)).toBe(DEFAULT_NODE_RADIUS);

    const customNode: StateNode = { ...baseNode, radius: 40 };
    expect(getNodeRadius(customNode)).toBe(40);
    expect(getAcceptingRingRadius(40)).toBe(34);
  });

  it('preserves compact radius for standard short states', () => {
    expect(getNodeRadius({ id: 'q0', label: 'q0', x: 0, y: 0 })).toBe(DEFAULT_NODE_RADIUS);
    expect(getNodeRadius({ id: 'q1', label: 'q1', x: 0, y: 0 })).toBe(DEFAULT_NODE_RADIUS);
    expect(getNodeRadius({ id: 'A', label: 'A', x: 0, y: 0 })).toBe(DEFAULT_NODE_RADIUS);
  });

  it('adaptively wraps and scales radius for long subset and equivalence class labels', () => {
    const subsetLabel = '{q0,q2,q4,q6,q7,q8}';
    const lines = wrapStateLabel(subsetLabel);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe(subsetLabel);

    const layout = computeAdaptiveStateLayout(subsetLabel);
    expect(layout.radius).toBeGreaterThan(DEFAULT_NODE_RADIUS);
    expect(layout.lines.length).toBeGreaterThanOrEqual(2);

    const largeSubset = '{q0,q1,q2,q4,q5,q7,q8,q9,q10}';
    const largeLayout = computeAdaptiveStateLayout(largeSubset);
    expect(largeLayout.lines.length).toBeGreaterThanOrEqual(3);
    expect(largeLayout.radius).toBeGreaterThanOrEqual(layout.radius);
  });

  it('calculates initial marker triangle vertices correctly', () => {
    const center = { x: 100, y: 200 };
    const radius = 32;
    const triangle = getInitialMarkerTriangle(center, radius, 16);

    // Tip at (x - r, y) = (68, 200)
    expect(triangle[0]).toEqual({ x: 68, y: 200 });

    // Base left X = tipX - height = 68 - (sqrt(3)/2 * 16) ~ 68 - 13.856 = 54.144
    expect(triangle[1].x).toBeCloseTo(54.144, 2);
    expect(triangle[1].y).toBe(192); // 200 - 8
    expect(triangle[2].y).toBe(208); // 200 + 8
  });

  it('computes enclosing bounding boxes for normal, initial, and hovered state nodes', () => {
    const boxNormal = getNodeBoundingBox(baseNode);
    expect(boxNormal.centerX).toBe(100);
    expect(boxNormal.centerY).toBe(200);

    const initialNode: StateNode = { ...baseNode, isInitial: true };
    const boxInitial = getNodeBoundingBox(initialNode);
    expect(boxInitial.minX).toBeLessThan(boxNormal.minX);

    const hoveredNode: StateNode = { ...baseNode, isHovered: true };
    const boxHovered = getNodeBoundingBox(hoveredNode);
    expect(boxHovered.width).toBeGreaterThan(boxNormal.width);
  });

  it('evaluates point-in-circle containment correctly', () => {
    expect(containsPointInNode(baseNode, { x: 100, y: 200 })).toBe(true);
    expect(containsPointInNode(baseNode, { x: 120, y: 200 })).toBe(true);
    expect(containsPointInNode(baseNode, { x: 140, y: 200 })).toBe(false);
  });
});
