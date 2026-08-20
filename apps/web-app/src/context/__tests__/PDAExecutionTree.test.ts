import { describe, it, expect } from 'vitest';
import { executePDA } from '@project-zero/core-solver';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('PDA Execution & Branch Tree Test Suite (Phase 16 Requirements)', () => {
  const pdaNodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
    { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
  ];

  const pdaEdges: TransitionEdge[] = [
    { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / AZ0' },
    { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, A / AA' },
    { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b, A / ε' },
    { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'b, A / ε' },
    { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'ε, Z0 / Z0' },
  ];

  it('1. PDA Execution returns valid result and produces branch tree telemetry', () => {
    const res = executePDA({ nodes: pdaNodes, edges: pdaEdges }, 'ab', { initialStackSymbol: 'Z0' });
    expect(res.isAccepted).toBe(true);
    expect(res.branchTree).toBeDefined();
    expect(res.branchTree?.totalNodes).toBeGreaterThan(0);
    expect(res.branchTree?.root.stateId).toBe('q0');
  });

  it('2. Stack operations correctly update stackAfter snapshot at each step', () => {
    const res = executePDA({ nodes: pdaNodes, edges: pdaEdges }, 'ab', { initialStackSymbol: 'Z0' });
    expect(res.steps.length).toBeGreaterThan(1);
    expect(res.steps[0].stackAfter).toEqual(['Z0']);
    expect(res.steps[1].stackAfter).toEqual(['Z0', 'A']);
  });

  it('3. Terminal rejection handles invalid or un-transitioned configurations', () => {
    const res = executePDA({ nodes: pdaNodes, edges: pdaEdges }, '999', { initialStackSymbol: 'Z0' });
    expect(res.isAccepted).toBe(false);
    expect(res.branchTree).toBeDefined();
  });
});
