import { describe, it, expect } from 'vitest';
import {
  evaluateCubicBezierPoint,
  evaluateCubicBezierTangent,
  getArrowheadTriangle,
  computeStraightEdgeGeometry,
  computeCurvedEdgeGeometry,
  computeSelfLoopGeometry,
  getEdgeBoundingBox,
} from './edge/edge-geometry';

describe('Edge Geometry Utilities', () => {
  it('evaluates cubic Bezier points and tangents', () => {
    const curve = {
      start: { x: 0, y: 0 },
      control1: { x: 0, y: 100 },
      control2: { x: 100, y: 100 },
      end: { x: 100, y: 0 },
    };

    const midPoint = evaluateCubicBezierPoint(curve, 0.5);
    expect(midPoint.x).toBeCloseTo(50, 1);
    expect(midPoint.y).toBeCloseTo(75, 1);

    const startTangent = evaluateCubicBezierTangent(curve, 0);
    expect(startTangent.tangent.x).toBeCloseTo(0, 1);
    expect(startTangent.tangent.y).toBeCloseTo(1, 1);

    const endTangent = evaluateCubicBezierTangent(curve, 1.0);
    expect(endTangent.tangent.x).toBeCloseTo(0, 1);
    expect(endTangent.tangent.y).toBeCloseTo(-1, 1);
  });

  it('calculates rotated arrowhead triangle vertices', () => {
    const tip = { x: 100, y: 100 };
    const angle = 0; // Pointing right along positive X axis
    const triangle = getArrowheadTriangle(tip, angle, 12, 8);

    // Tip at (100, 100)
    expect(triangle[0]).toEqual({ x: 100, y: 100 });

    // Base left X = 100 - 12 = 88
    expect(triangle[1].x).toBe(88);
    expect(triangle[1].y).toBe(104); // 100 + 4
    expect(triangle[2].x).toBe(88);
    expect(triangle[2].y).toBe(96); // 100 - 4
  });

  it('computes straight edge path geometry with node perimeter clipping', () => {
    const sourceCenter = { x: 0, y: 0 };
    const sourceRadius = 32;
    const targetCenter = { x: 200, y: 0 };
    const targetRadius = 32;

    const geometry = computeStraightEdgeGeometry(
      sourceCenter,
      sourceRadius,
      targetCenter,
      targetRadius
    );

    // Start clipped at (32, 0)
    expect(geometry.curve.start.x).toBe(32);
    expect(geometry.curve.start.y).toBe(0);

    // End clipped at (168, 0)
    expect(geometry.curve.end.x).toBe(168);
    expect(geometry.curve.end.y).toBe(0);

    expect(geometry.arrowheadTip.x).toBe(168);
    expect(geometry.arrowheadAngle).toBe(0);

    // Midpoint label anchor
    expect(geometry.labelAnchor.x).toBe(100);
    expect(geometry.labelAnchor.y).toBe(0);
  });

  it('computes curved edge geometry for multi-edges with lateral displacement', () => {
    const sourceCenter = { x: 0, y: 0 };
    const targetCenter = { x: 200, y: 0 };

    const geometry1 = computeCurvedEdgeGeometry(sourceCenter, 32, targetCenter, 32, 1);
    const geometry2 = computeCurvedEdgeGeometry(sourceCenter, 32, targetCenter, 32, -1);

    expect(geometry1.labelAnchor.y).not.toBe(0);
    expect(geometry2.labelAnchor.y).not.toBe(0);

    // Symmetrical lateral displacements
    expect(geometry1.labelAnchor.y).toBeCloseTo(-geometry2.labelAnchor.y, 1);
  });

  it('computes self-loop arc geometry projecting upward from node top', () => {
    const sourceCenter = { x: 100, y: 100 };
    const geometry = computeSelfLoopGeometry(sourceCenter, 32);

    expect(geometry.isSelfLoop).toBe(true);
    expect(geometry.labelAnchor.y).toBeLessThan(100 - 32); // Above node
  });

  it('computes bounding box for edge paths', () => {
    const geometry = computeStraightEdgeGeometry(
      { x: 0, y: 0 },
      32,
      { x: 200, y: 0 },
      32
    );

    const bounds = getEdgeBoundingBox(geometry);
    expect(bounds.minX).toBeLessThan(0);
    expect(bounds.maxX).toBeGreaterThan(200);
  });
});
