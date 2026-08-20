import { describe, it, expect, beforeEach } from 'vitest';
import { SnapEngine } from './interaction/snap-engine';
import { StateNode } from './state/state-node';

describe('SnapEngine & Smart Alignment Guide Engine (Section 3.1 & 21)', () => {
  let snapEngine: SnapEngine;

  const nodeA: StateNode = { id: 'node_a', label: 'q0', x: 100, y: 100, radius: 32 };
  const nodeB: StateNode = { id: 'node_b', label: 'q1', x: 300, y: 100, radius: 32 };
  const nodeC: StateNode = { id: 'node_c', label: 'q2', x: 100, y: 400, radius: 32 };

  beforeEach(() => {
    snapEngine = new SnapEngine({
      enabled: true,
      snapToGrid: true,
      snapToNodes: true,
      gridPitch: 20,
      snapThreshold: 6,
    });
  });

  it('snaps coordinates to grid lines when within 6px threshold', () => {
    // Target (103, 198) -> nearest grid multiples are (100, 200)
    const result = snapEngine.evaluateSnap(103, 198, null, []);
    expect(result.snappedX).toBe(true);
    expect(result.snappedY).toBe(true);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it('does not snap if distance exceeds threshold (> 6px)', () => {
    // Target (108, 192) -> distance 8px to 100/200, 12px to 120/180
    const result = snapEngine.evaluateSnap(108, 192, null, []);
    expect(result.snappedX).toBe(false);
    expect(result.snappedY).toBe(false);
    expect(result.x).toBe(108);
    expect(result.y).toBe(192);
  });

  it('detects horizontal and vertical collinearity with reference nodes and generates smart guides', () => {
    // Dragging a new node near y = 100 (aligned with nodeA and nodeB) and x = 100 (aligned with nodeA and nodeC)
    const result = snapEngine.evaluateSnap(102, 98, 'new_node', [nodeA, nodeB, nodeC]);
    expect(result.snappedX).toBe(true);
    expect(result.snappedY).toBe(true);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);

    const guides = result.guides;
    expect(guides.length).toBeGreaterThanOrEqual(2);

    const vGuide = guides.find((g) => g.type === 'vertical');
    const hGuide = guides.find((g) => g.type === 'horizontal');
    expect(vGuide).toBeDefined();
    expect(vGuide?.position).toBe(100);
    expect(hGuide).toBeDefined();
    expect(hGuide?.position).toBe(100);
  });

  it('skips the dragged node itself when evaluating reference nodes', () => {
    // Dragging nodeA at (100, 100); should not snap to its own position if no other node at (100, 100)
    const result = snapEngine.evaluateSnap(102, 102, 'node_a', [nodeA]);
    // Grid snap may kick in for (100, 100)
    expect(result.guides.length).toBe(0);
  });

  it('returns raw coordinates when snap engine is disabled', () => {
    snapEngine.setEnabled(false);
    const result = snapEngine.evaluateSnap(103, 98, null, [nodeA]);
    expect(result.snappedX).toBe(false);
    expect(result.snappedY).toBe(false);
    expect(result.x).toBe(103);
    expect(result.y).toBe(98);
    expect(result.guides.length).toBe(0);
  });
});
